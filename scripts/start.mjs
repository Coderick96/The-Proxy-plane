import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));let stopping=false;
const run=args=>spawn(process.execPath,args,{cwd:root,stdio:'inherit',env:process.env});
const server=run(['server/index.js']),web=run(['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort','--open']);
const stop=code=>{if(stopping)return;stopping=true;process.exitCode=code;server.kill();web.kill();setTimeout(()=>process.exit(code),300).unref()};
for(const child of [server,web]){child.on('error',e=>{console.error(e.message);stop(1)});child.on('exit',code=>stop(code||0))}
process.on('SIGINT',()=>stop(0));process.on('SIGTERM',()=>stop(0));
console.log('The Proxy Plane: editor + account/billing/AI server. Ctrl+C stops both.');
