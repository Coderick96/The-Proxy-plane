import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
const root=new URL('../',import.meta.url),outfile=new URL('node_modules/.cache/checkout-availability.cjs',root);
mkdirSync(new URL('node_modules/.cache/',root),{recursive:true});
await build({entryPoints:[new URL('./checkout-availability.jsx',import.meta.url).pathname],bundle:true,platform:'node',format:'cjs',outfile:outfile.pathname,external:['react','react-dom/client','node:assert/strict'],define:{'import.meta.env':'{}'}});
const result=spawnSync(process.execPath,['-r','./tests/setup.cjs',outfile.pathname],{cwd:root,stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
