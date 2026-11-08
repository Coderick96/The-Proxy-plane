from io import BytesIO
from secrets import randbits
from threading import Lock

MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
FORMATS = {
    "portrait": ((896, 1216), (750, 1050)),
    "landscape": ((1216, 832), (1050, 720)),
}


class CardArtRenderer:
    def __init__(self):
        self._lock = Lock()
        self._pipeline = None

    def _load(self):
        import torch
        from diffusers import StableDiffusionXLPipeline

        if torch.cuda.is_available():
            device = "cuda"
        elif torch.backends.mps.is_available():
            device = "mps"
        else:
            device = "cpu"
        options = {"torch_dtype": torch.float32, "use_safetensors": True}
        if device == "cuda":
            options.update(torch_dtype=torch.float16, variant="fp16")
        pipeline = StableDiffusionXLPipeline.from_pretrained(MODEL, **options)
        pipeline.enable_vae_tiling()
        if device == "cuda":
            pipeline.enable_model_cpu_offload()
        else:
            pipeline.to(device)
        return pipeline

    def generate(self, prompt, layout="portrait"):
        """Yield exactly three candidates as (seed, original PNG, card-size PNG)."""
        if not isinstance(prompt, str) or not 1 <= len(prompt.strip()) <= 400:
            raise ValueError("Enter a prompt between 1 and 400 characters.")
        if not isinstance(layout, str) or layout not in FORMATS:
            raise ValueError("Choose portrait or landscape.")
        return self._generate(prompt.strip(), layout)

    def _generate(self, prompt, layout):
        import torch
        from PIL import ImageOps, Image

        (width, height), card_size = FORMATS[layout]
        with self._lock:
            if self._pipeline is None:
                self._pipeline = self._load()
            first_seed = randbits(31)
            for index in range(3):
                seed = first_seed + index
                original = self._pipeline(
                    prompt,
                    negative_prompt="watermark, lettering, text, border, card frame",
                    width=width,
                    height=height,
                    num_inference_steps=35,
                    guidance_scale=7,
                    generator=torch.Generator(device="cpu").manual_seed(seed),
                ).images[0]
                card = ImageOps.fit(original, card_size, Image.Resampling.LANCZOS)
                with BytesIO() as full, BytesIO() as cropped:
                    original.save(full, "PNG")
                    card.save(cropped, "PNG", dpi=(300, 300))
                    yield seed, full.getvalue(), cropped.getvalue()
