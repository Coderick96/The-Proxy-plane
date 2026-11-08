"""Loopback-only image renderer. No OpenAI, billing or database credentials belong here."""
import base64
import hashlib
import gc
import io
import json
import os
from pathlib import Path
import re
import threading
import time

from cryptography.hazmat.primitives.serialization import load_pem_public_key
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from PIL import Image
import psutil
from profiles import choose_profile, dimensions, fallback_profile

ORIGIN = os.environ.get('PP_APP_ORIGIN', 'http://127.0.0.1:5173').rstrip('/')
CACHE = Path(os.environ.get('PP_ART_CACHE', str(Path.home() / '.proxy-plane' / 'art')))
CACHE.mkdir(parents=True, exist_ok=True)
DEFAULT_KEY = Path(__file__).resolve().parent.parent / '.local-art-keys' / 'public.pem'
KEY_PATH = os.environ.get('PP_ART_PUBLIC_KEY_FILE', str(DEFAULT_KEY) if DEFAULT_KEY.exists() else '')
PUBLIC_KEY = load_pem_public_key(Path(KEY_PATH).read_bytes()) if KEY_PATH else None
if PUBLIC_KEY is not None and not isinstance(PUBLIC_KEY, Ed25519PublicKey):
    raise RuntimeError('PP_ART_PUBLIC_KEY_FILE must contain an Ed25519 public key.')

app = FastAPI(docs_url=None, redoc_url=None)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=['127.0.0.1', 'localhost', 'testserver'])
app.add_middleware(CORSMiddleware, allow_origins=[ORIGIN], allow_methods=['GET', 'POST'],
                   allow_headers=['Content-Type', 'Authorization'])

@app.middleware('http')
async def private_network(request, call_next):
    response = await call_next(request)
    if request.headers.get('origin') == ORIGIN:
        response.headers['Access-Control-Allow-Private-Network'] = 'true'
    return response
lock = threading.Lock()
state_lock = threading.Lock()
jobs = {}
pipe = None
checker = None
extractor = None
active_model = None

def verify_ticket(ticket):
    if PUBLIC_KEY is None:
        raise HTTPException(503, 'Install the publisher public key before generating artwork.')
    try:
        body, signature = ticket.split('.')
        PUBLIC_KEY.verify(base64.urlsafe_b64decode(signature + '=' * (-len(signature) % 4)), body.encode())
        claims = json.loads(base64.urlsafe_b64decode(body + '=' * (-len(body) % 4)))
        valid = (claims['v'] == 1 and claims['aud'] == 'proxy-plane-local-art'
                 and claims['choices'] == 3 and time.time() < claims['exp']
                 and isinstance(claims['job'], str)
                 and re.fullmatch(r'[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}', claims['job'])
                 and isinstance(claims['prompt'], str) and 5 <= len(claims['prompt']) <= 4000
                 and claims['size'] in ['1024x1024', '1024x1536', '1536x1024'])
        if not valid:
            raise ValueError('Invalid claims')
        return claims
    except Exception:
        raise HTTPException(401, 'Invalid or expired artwork authorization. Retry in Proxy Plane.')

def hardware():
    import torch
    ram = psutil.virtual_memory().available / 1024**3
    if torch.cuda.is_available():
        free, total = torch.cuda.mem_get_info()
        # Cached model allocations belong to this renderer and can be reused/released.
        available = min(total, free + torch.cuda.memory_reserved())
        return dict(device='cuda', memoryGB=available / 1024**3, freeMemoryGB=free / 1024**3, name=torch.cuda.get_device_name(0))
    if torch.backends.mps.is_available():
        reusable = torch.mps.driver_allocated_memory() / 1024**3
        return dict(device='mps', memoryGB=ram+reusable, freeMemoryGB=ram, name='Apple Metal')
    return dict(device='cpu', memoryGB=ram, name='CPU (slow; minutes per image)')

@app.get('/health')
def health():
    if PUBLIC_KEY is None:
        return dict(ready=False, message='Install the publisher public key and restart the renderer. See LOCAL_ART_SETUP.md.')
    try:
        import torch
        import diffusers
        hw = hardware()
        if hw['device'] == 'cpu' and hw['memoryGB'] < 4:
            return dict(ready=False, message='Close other apps: CPU rendering needs at least 4 GB available RAM.')
        return dict(ready=PUBLIC_KEY is not None, hardware=hw, profile=choose_profile(hw['device'], hw['memoryGB']),
                    choices=3, busy=lock.locked(), message='Models download on first render; allow several GB of disk space.')
    except ImportError:
        return dict(ready=False, message='Install PyTorch and local-renderer/requirements.txt first.')

def load_pipeline(profile, device):
    global pipe, checker, extractor, active_model
    import torch
    from diffusers import StableDiffusionPipeline, StableDiffusionXLPipeline
    from diffusers.pipelines.stable_diffusion.safety_checker import StableDiffusionSafetyChecker
    from transformers import CLIPImageProcessor
    model_key = (profile['model'], device, profile['offload'])
    if active_model == model_key:
        return
    pipe = None
    active_model = None
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    dtype = torch.float32 if device == 'cpu' else torch.float16
    # Both models permit commercial use subject to their respective OpenRAIL licenses.
    base = 'stable-diffusion-v1-5/stable-diffusion-v1-5'
    model = 'stabilityai/stable-diffusion-xl-base-1.0' if profile['model'] == 'sdxl' else base
    cls = StableDiffusionXLPipeline if profile['model'] == 'sdxl' else StableDiffusionPipeline
    pipe = cls.from_pretrained(model, torch_dtype=dtype, use_safetensors=True)
    pipe.enable_attention_slicing()
    pipe.enable_vae_slicing()
    if profile['offload'] and device == 'cuda':
        pipe.enable_model_cpu_offload()
    else:
        pipe.to(device)
    # SDXL has no built-in checker; apply the same local checker to every output.
    checker = StableDiffusionSafetyChecker.from_pretrained(base, subfolder='safety_checker').to('cpu')
    extractor = CLIPImageProcessor.from_pretrained(base, subfolder='feature_extractor')
    active_model = model_key

def screen(image):
    import numpy as np
    import torch
    pixels = extractor(images=image, return_tensors='pt').pixel_values
    array = np.asarray(image, dtype=np.float32)[None, ...] / 255.0
    with torch.no_grad():
        _, flagged = checker(images=array, clip_input=pixels)
    if any(flagged):
        raise ValueError('Local image screening blocked this result. Use a different prompt or contact support about the credit.')

def render_one(claims, profile, device, index, source):
    import torch
    from diffusers import AutoPipelineForImage2Image
    load_pipeline(profile, device)
    width, height = dimensions(profile, claims['size'])
    seed = int(hashlib.sha256((claims['job'] + ':' + str(index)).encode()).hexdigest()[:8], 16)
    generator = torch.Generator(device='cpu').manual_seed(seed)
    args = dict(prompt='Original fantasy card illustration, detailed, no text, no frame. ' + claims['prompt'],
                negative_prompt='text, logo, watermark, explicit nudity, pornography, sexual content, child abuse',
                num_inference_steps=profile['steps'], generator=generator, guidance_scale=7.0,
                width=width, height=height)
    runner = pipe
    if source:
        raw = base64.b64decode(source.split(',', 1)[1], validate=True)
        with Image.open(io.BytesIO(raw)) as image:
            if image.width * image.height > 25_000_000:
                raise ValueError('Reference image is too large.')
            args['image'] = image.convert('RGB').resize((width, height))
        args['strength'] = 0.65
        runner = AutoPipelineForImage2Image.from_pipe(pipe)
        # Image-to-image derives dimensions from the resized reference.
        args.pop('width')
        args.pop('height')
    with torch.inference_mode():
        result = runner(**args)
    if getattr(result, 'nsfw_content_detected', None) and any(result.nsfw_content_detected):
        raise ValueError('Local image screening blocked this result. Try a different prompt.')
    image = result.images[0]
    screen(image)  # Fail closed if the classifier cannot run.
    output = io.BytesIO()
    image.save(output, format='PNG')
    return 'data:image/png;base64,' + base64.b64encode(output.getvalue()).decode()

def update(job, **values):
    with state_lock:
        jobs[job].update(values)

def run_job(claims, source):
    job = claims['job']
    try:
        hw = hardware()
        if hw['device'] == 'cpu' and hw['memoryGB'] < 4:
            raise ValueError('At least 4 GB available RAM is required. Close other apps and retry; your authorization is reusable.')
        profile = choose_profile(hw['device'], hw['memoryGB'])
        images = []
        for i in range(3):
            path = CACHE / f'{job}-{i}.json'
            if path.exists():
                images.append(json.loads(path.read_text()))
            else:
                retry_on_cpu = False
                try:
                    image = render_one(claims, profile, hw['device'], i, source)
                except RuntimeError as error:
                    if 'out of memory' not in str(error).lower():
                        raise
                    retry_on_cpu = True
                # Exit the except block first so the traceback releases the failed pipeline.
                if retry_on_cpu:
                    profile = fallback_profile()
                    hw['device'] = 'cpu'
                    image = render_one(claims, profile, 'cpu', i, source)
                temp = path.with_suffix('.tmp')
                temp.write_text(json.dumps(image))
                temp.replace(path)
                images.append(image)
            update(job, completed=i+1, profile=profile)
        update(job, status='complete', images=images, profile=profile)
    except Exception as error:
        update(job, status='failed', error=str(error)[:700] or 'Rendering failed. Retry without another credit.')
    finally:
        lock.release()

@app.post('/jobs')
async def start(request: Request):
    if request.headers.get('origin') != ORIGIN:
        raise HTTPException(403, 'Open the renderer through your configured Proxy Plane app.')
    if int(request.headers.get('content-length', '0')) > 11 * 1024 * 1024:
        raise HTTPException(413, 'Reference image is too large.')
    body = await request.json()
    claims = verify_ticket(body.get('ticket', ''))
    source = body.get('source')
    digest = hashlib.sha256(source.encode()).hexdigest() if isinstance(source, str) else None
    if digest != claims['sourceHash']:
        raise HTTPException(400, 'Reference image does not match the authorized request.')
    job = claims['job']
    with state_lock:
        previous = jobs.get(job)
        if previous and previous['status'] in ['running', 'complete']:
            return dict(job=job)
        if not lock.acquire(blocking=False):
            raise HTTPException(409, 'Another local batch is running. Wait, then retry without another credit.')
        # Keep only the active job in RAM; completed choices persist on disk.
        jobs.clear()
        jobs[job] = dict(status='running', completed=0)
    threading.Thread(target=run_job, args=(claims, source), daemon=True).start()
    return dict(job=job)

@app.get('/jobs/{job}')
def poll(job: str, request: Request):
    claims = verify_ticket(request.headers.get('authorization', '').removeprefix('Bearer '))
    if claims['job'] != job:
        raise HTTPException(403, 'Artwork authorization belongs to another job.')
    with state_lock:
        state = jobs.get(job)
        if state is None:
            raise HTTPException(404, 'Renderer restarted. Retry to resume saved choices without another credit.')
        return dict(state)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='127.0.0.1', port=8790)
