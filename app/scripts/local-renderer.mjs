import {spawnSync,spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const windows=process.platform==='win32';
const python=fileURLToPath(new URL(windows?'../.venv/Scripts/python.exe':'../.venv/bin/python',import.meta.url));
const run=(exe,args)=>{const r=spawnSync(exe,args,{cwd:root,stdio:'inherit'});if(r.status!==0){console.error('Setup failed. Check Python 3.10–3.12 is installed and consult LOCAL_ART_SETUP.md.');process.exit(r.status||1);}};
if(process.argv.includes('--setup')){
 if(!existsSync(python))run(windows?'py':'python3',['-m','venv','.venv']);
 run(python,['-m','pip','install','--upgrade','pip']);
 run(python,['-m','pip','install','torch==2.8.0','torchvision==0.23.0']);
 run(python,['-m','pip','install','-r','local-renderer/requirements.txt']);
 console.log('Renderer dependencies installed. Run npm run local-art:start. NVIDIA users: check the CUDA wheel instructions in LOCAL_ART_SETUP.md.');
}else{
 if(!existsSync(python)){console.error('Run npm run local-art:setup first.');process.exit(1);}
 const child=spawn(python,['local-renderer/worker.py'],{cwd:root,stdio:'inherit',env:process.env});
 child.on('error',error=>{console.error(error.message);process.exitCode=1;});
 child.on('exit',code=>{process.exitCode=code||0;});
 process.on('SIGINT',()=>child.kill());
 process.on('SIGTERM',()=>child.kill());
}
