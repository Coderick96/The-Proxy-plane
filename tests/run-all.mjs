import {spawnSync} from 'node:child_process';
const names=['card-backs','deck-import','print-output','ai-safety','credits-db','monthly-billing','premium-db','premium-server','premium-logic','evolution-db','deck-store-server','beta-db','beta-server','privacy','workspace-state','local-art-web','billing-test-mode','run-ui'];
const failures=[];
for(const name of names){
 console.log(`\n=== ${name} ===`);
 const result=spawnSync(process.execPath,[`tests/${name}.mjs`],{cwd:new URL('../',import.meta.url),stdio:'inherit',timeout:120000});
 if(result.error)console.error(result.error.message);
 if(result.status!==0)failures.push({name,status:result.status,signal:result.signal});
}
console.log('\nSuite summary:',failures.length?JSON.stringify(failures):`PASS (${names.length} groups)`);
process.exitCode=failures.length?1:0;
