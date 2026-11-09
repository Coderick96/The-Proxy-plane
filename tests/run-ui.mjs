import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
const root=new URL('../',import.meta.url);
mkdirSync(new URL('node_modules/.cache/',root),{recursive:true});
for(const name of ['kingdom','account-workspace','backup-import','backing-ui','premium-ui','deck-ui','evolution-ui','beta-ui','print-queue','print-spacing','homepage','library-faces','card-search-ui','auth-recovery','artwork-studio','artwork-request-scope','ai-recovery-ui']){
 const outfile=new URL(`node_modules/.cache/${name}-aggregate.cjs`,root);
 await build({entryPoints:[new URL(`./${name}.jsx`,import.meta.url).pathname],bundle:true,platform:'node',format:'cjs',outfile:outfile.pathname,loader:{'.css':'empty','.woff':'empty','.woff2':'empty','.ttf':'empty','.eot':'empty','.svg':'empty'},define:{'import.meta.env':'{}'},external:['react','react-dom/client','node:assert/strict']});
 const result=spawnSync(process.execPath,['-r','./tests/setup.cjs',outfile.pathname],{cwd:root,stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)process.exit(result.status??1);
}
