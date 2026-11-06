import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const run=args=>{const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1)};
run(['tests/privacy.mjs']);
run(['tests/workspace-state.mjs']);
mkdirSync(new URL('../node_modules/.cache/',import.meta.url),{recursive:true});
for(const name of ['kingdom','account-workspace','backup-import','backing-ui','premium-ui','deck-ui','evolution-ui']){
 await build({entryPoints:[fileURLToPath(new URL('./'+name+'.jsx',import.meta.url))],bundle:true,platform:'node',format:'cjs',outfile:fileURLToPath(new URL('../node_modules/.cache/'+name+'-tests.cjs',import.meta.url)),loader:{'.css':'empty','.woff':'empty','.woff2':'empty','.ttf':'empty','.eot':'empty','.svg':'empty'},define:{'import.meta.env':'{}'},external:['react','react-dom/client','node:assert/strict']});
 run(['-r','./tests/setup.cjs','node_modules/.cache/'+name+'-tests.cjs']);
}
