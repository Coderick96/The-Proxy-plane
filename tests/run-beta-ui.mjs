import {build}from 'esbuild';import {spawnSync}from 'node:child_process';import {mkdirSync}from 'node:fs';
mkdirSync(new URL('../node_modules/.cache/',import.meta.url),{recursive:true});
await build({entryPoints:[new URL('./beta-ui.jsx',import.meta.url).pathname],bundle:true,platform:'node',format:'cjs',outfile:new URL('../node_modules/.cache/beta-tests.cjs',import.meta.url).pathname,loader:{'.css':'empty','.woff':'empty','.woff2':'empty','.ttf':'empty','.eot':'empty','.svg':'empty'},define:{'import.meta.env':'{}'},external:['react','react-dom/client','node:assert/strict']});
const r=spawnSync(process.execPath,['-r','./tests/setup.cjs','node_modules/.cache/beta-tests.cjs'],{stdio:'inherit',cwd:new URL('../',import.meta.url)});if(r.error)throw r.error;process.exitCode=r.status??1;
