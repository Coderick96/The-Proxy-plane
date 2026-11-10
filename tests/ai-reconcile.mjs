import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createApp} from '../server/index.js';

const secret=randomBytes(32).toString('hex');
let calls=[],failure=null,result=2,userCalls=0,providerCalls=0;
const services={configured:true,user:async()=>{userCalls++;throw new Error('Cron must not authenticate as a user');},rpc:async(name,args)=>{calls.push({name,args});if(failure)throw failure;return result;}};
const baseEnv={BETA_MODE:'true',BETA_AI_ENABLED:'false',SERVERLESS_MODE:'true',CRON_SECRET:secret};
const servers=[];
async function start(env=baseEnv,service=services){
 const server=createApp({env,services:service,fetcher:async()=>{providerCalls++;throw new Error('Recovery must not call an inference provider');}}).listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));servers.push(server);return 'http://127.0.0.1:'+server.address().port;
}
const get=async(base,authorization,path='/api/internal/ai/reconcile')=>{
 const response=await fetch(base+path,{headers:authorization?{Authorization:authorization}:{}});const body=await response.json();
 assert.equal(response.headers.get('cache-control'),'private, no-store');return {response,body};
};
try{
 const base=await start();
 for(const auth of [undefined,'Bearer wrong','bearer '+secret,'Bearer '+secret+'x','Bearer '+secret.slice(1),'Basic '+secret]){
  const {response}=await get(base,auth);assert.equal(response.status,401);
 }
 assert.equal(calls.length,0);assert.equal(userCalls,0);
 const wrongMethod=await fetch(base+'/api/internal/ai/reconcile',{method:'POST',headers:{Authorization:'Bearer '+secret}});assert.equal(wrongMethod.status,405);assert.equal(wrongMethod.headers.get('allow'),'GET');assert.equal(calls.length,0);
 const head=await fetch(base+'/api/internal/ai/reconcile',{method:'HEAD',headers:{Authorization:'Bearer '+secret}});assert.equal(head.status,405);assert.equal(calls.length,0);
 let {response,body}=await get(base,'Bearer '+secret,'/api/internal/ai/reconcile?batch_size=999&owner=forged&operation=forged');
 assert.equal(response.status,200);assert.deepEqual(body,{ok:true,reconciled:2});assert.deepEqual(calls,[{name:'pp_ai_reconcile',args:{batch_size:20}}]);
 assert.equal(userCalls,0,'paused beta must not prevent recovery or require an account session');
 result=0;assert.deepEqual((await get(base,'Bearer '+secret)).body,{ok:true,reconciled:0});
 for(const invalid of [-1,21,null,{},'2']){result=invalid;const r=await get(base,'Bearer '+secret);assert.equal(r.response.status,503);assert.equal(r.response.headers.get('retry-after'),'60');assert(!JSON.stringify(r.body).includes(secret));}
 result=2;failure=new Error('Sensitive database detail '+secret);const failed=await get(base,'Bearer '+secret);assert.equal(failed.response.status,503);assert(!JSON.stringify(failed.body).includes(secret));assert(!JSON.stringify(failed.body).includes('Sensitive'));
 failure=null;
 for(const value of [undefined,'','short','x'.repeat(513),' '.repeat(32)]){
  const target=await start({...baseEnv,CRON_SECRET:value});const before=calls.length;assert.equal((await get(target,'Bearer '+secret)).response.status,503);assert.equal(calls.length,before);
 }
 const unconfigured=await start(baseEnv,{...services,configured:false});const before=calls.length;assert.equal((await get(unconfigured,'Bearer '+secret)).response.status,503);assert.equal(calls.length,before);
 assert.equal(providerCalls,0);assert.equal(userCalls,0);assert(calls.every(c=>c.name==='pp_ai_reconcile'&&c.args.batch_size===20));
 console.log('PASS scheduled AI recovery HTTP: independent constant-time secret auth, missing/weak config denial, paused-beta recovery before user gate, bounded service-only reconciliation, sanitized failures/private cache and no user/charge/provider calls. Operational scheduling not executed.');
}finally{await Promise.all(servers.map(server=>new Promise(resolve=>server.close(resolve))))}
