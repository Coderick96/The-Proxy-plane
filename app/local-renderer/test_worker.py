import base64
import importlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import unittest
import sys
import weakref
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
from profiles import choose_profile, dimensions

TEMP = tempfile.TemporaryDirectory()
PRIVATE = Ed25519PrivateKey.generate()
PUB = Path(TEMP.name) / 'public.pem'
PUB.write_bytes(PRIVATE.public_key().public_bytes(Encoding.PEM, PublicFormat.SubjectPublicKeyInfo))
os.environ['PP_ART_PUBLIC_KEY_FILE'] = str(PUB)
os.environ['PP_ART_CACHE'] = str(Path(TEMP.name) / 'cache')
import worker

def ticket(**overrides):
    claims = dict(v=1, aud='proxy-plane-local-art', job='00000000-0000-4000-a000-000000000001',
                  prompt='A moonlit mountain', size='1024x1536', sourceHash=None, choices=3, exp=int(time.time())+60)
    claims.update(overrides)
    body = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip('=')
    signature = base64.urlsafe_b64encode(PRIVATE.sign(body.encode())).decode().rstrip('=')
    return body+'.'+signature

class WorkerTests(unittest.TestCase):
    def test_cached_gpu_memory_is_reusable(self):
        gb = 1024**3
        fake = SimpleNamespace(cuda=SimpleNamespace(is_available=lambda:True,
            mem_get_info=lambda:(4*gb,16*gb),memory_reserved=lambda:8*gb,get_device_name=lambda index:'test GPU'))
        with patch.dict(sys.modules, {'torch':fake}):
            hw=worker.hardware()
            self.assertEqual(hw['memoryGB'],12)
            self.assertEqual(choose_profile(hw['device'],hw['memoryGB'])['model'],'sdxl')

    def test_oom_traceback_released_before_fallback(self):
        claims=worker.verify_ticket(ticket(job='00000000-0000-4000-a000-000000000003'))
        job=claims['job']
        class Allocation: pass
        seen=[]
        def render(claims,profile,device,index,source):
            if not seen:
                allocation=Allocation()
                seen.append(weakref.ref(allocation))
                raise RuntimeError('CUDA out of memory')
            self.assertIsNone(seen[0](),'The failed frame must not retain its allocation during fallback')
            self.assertEqual(device,'cpu')
            return 'data:image/png;base64,AAAA'
        worker.jobs[job]=dict(status='running',completed=0)
        self.assertTrue(worker.lock.acquire(blocking=False))
        with patch.object(worker,'hardware',return_value={'device':'cuda','memoryGB':12}),patch.object(worker,'render_one',side_effect=render):
            worker.run_job(claims,None)
        self.assertEqual(worker.jobs[job]['status'],'complete')
        self.assertEqual(len(worker.jobs[job]['images']),3)

    def test_profiles(self):
        self.assertEqual(choose_profile('cuda', 12)['model'], 'sdxl')
        self.assertTrue(choose_profile('cuda', 7)['offload'])
        self.assertEqual(choose_profile('cpu', 16)['model'], 'sd15')
        self.assertEqual(dimensions(choose_profile('cpu', 16), '1536x1024'), (768, 512))

    def test_ticket_validation(self):
        self.assertEqual(worker.verify_ticket(ticket())['choices'], 3)
        for value in [ticket(exp=0), ticket(choices=9), ticket(aud='wrong'), ticket(job='../../private'), ticket()+'x']:
            with self.assertRaises(worker.HTTPException):
                worker.verify_ticket(value)

    def test_node_python_signature_interoperability(self):
        script = "import {generateKeyPairSync} from 'node:crypto'; import {signArtTicket} from './server/localArt.js'; const {privateKey,publicKey}=generateKeyPairSync('ed25519'); console.log(JSON.stringify({key:publicKey.export({type:'spki',format:'pem'}),ticket:signArtTicket(privateKey,JSON.parse(process.argv[1]))}));"
        claims = worker.verify_ticket(ticket())
        output = subprocess.check_output(['node', '--input-type=module', '-e', script, json.dumps(claims)], cwd=Path(__file__).resolve().parent.parent, text=True)
        from cryptography.hazmat.primitives.serialization import load_pem_public_key
        signed = json.loads(output)
        with patch.object(worker, 'PUBLIC_KEY', load_pem_public_key(signed['key'].encode())):
            self.assertEqual(worker.verify_ticket(signed['ticket'])['job'], claims['job'])

    def test_batch_resume_origin_and_source(self):
        value = ticket()
        headers = {'Origin':worker.ORIGIN}
        auth = {'Authorization':'Bearer '+value}
        client = TestClient(worker.app)
        self.assertEqual(client.post('/jobs', json={'ticket':value}).status_code,403)
        self.assertEqual(client.post('/jobs', headers=headers, json={'ticket':value,'source':'wrong'}).status_code,400)
        calls=[]
        def render(claims, profile, device, index, source):
            calls.append(index)
            if index == 1 and calls.count(1) == 1:
                raise ValueError('simulated interruption')
            return 'data:image/png;base64,AAAA'
        with patch.object(worker,'hardware',return_value={'device':'cpu','memoryGB':16}), patch.object(worker,'render_one',side_effect=render):
            self.assertEqual(client.post('/jobs',headers=headers,json={'ticket':value}).status_code,200)
            job=worker.verify_ticket(value)['job']
            for _ in range(100):
                status=client.get('/jobs/'+job,headers=auth).json()
                if status['status']!='running': break
                time.sleep(.01)
            self.assertEqual(status['status'],'failed')
            self.assertEqual(status['completed'],1)
            # Simulate loss of in-memory state, preserving saved first choice.
            worker.jobs.clear()
            self.assertEqual(client.post('/jobs',headers=headers,json={'ticket':value}).status_code,200)
            for _ in range(100):
                status=client.get('/jobs/'+job,headers=auth).json()
                if status['status']!='running': break
                time.sleep(.01)
            self.assertEqual(status['status'],'complete')
            self.assertEqual(len(status['images']),3)
            self.assertEqual(calls.count(0),1)
            self.assertEqual(client.get('/jobs/'+job,headers={'Authorization':'Bearer '+ticket(job='00000000-0000-4000-a000-000000000002')}).status_code,403)

if __name__ == '__main__':
    unittest.main()
