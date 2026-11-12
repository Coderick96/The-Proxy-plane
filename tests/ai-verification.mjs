import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server/index.js';
const env={VERCEL_ENV:'preview',AI_VERIFICATION_ENABLED:'true',AI_VERIFICATION_SECRET:'v'.repeat(64),OPENAI_API_KEY:'fixture-private-key',OWNER_USER_ID:randomUUID(),AI_VERIFICATION_OPERATION_ID:randomUUID(),BETA_MODE:'true',BETA_AI_ENABLED:'true',BETA_CLOUD_AI_ENABLED:'false',AI_RECOVERY_SCHEDULER_VERIFIED:'true',SERVERLESS_MODE:'true'};
const events=[],operations=new Map();let providerCalls=0,imageCalls=0,safetyCalls=0,charges=0,refunds=0,providerFail=false;
const services={configured:true,user:async()=>{throw Error('Operator route must not impersonate an Auth session')},rpc:async(name,args)=>{
 events.push(name);
 if(name==='pp_beta_status')return{enabled:true,configured:true,ownerId:env.OWNER_USER_ID};
 if(name==='pp_ai_results')return operations.has(args.operation)?[{operationId:args.operation,...operations.get(args.operation)}]:[];
 if(name==='pp_ai_reconcile')return 0;
 if(name==='pp_ai_reserve'){if(operations.has(args.operation))return{fresh:false,...operations.get(args.operation)};charges++;operations.set(args.operation,{state:'running'});return{fresh:true,state:'running'}}
 if(name==='pp_ai_complete'){operations.set(args.operation,{state:'completed',result:args.payload});return args.payload}
 if(name==='pp_ai_fail'){refunds++;operations.set(args.operation,{state:'refunded'});return null}
 throw Error('Unexpected RPC '+name);
}};
const fetcher=async(url,options)=>{providerCalls++;
 if(url.includes('/models/'))return{ok:true,json:async()=>({id:decodeURIComponent(url.split('/').pop())})};
 if(url.endsWith('/responses')){safetyCalls++;return{ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:'{"decision":"allow"}'}]}]})}}
 if(url.endsWith('/images/generations')){imageCalls++;if(providerFail)throw Error(env.OPENAI_API_KEY);const body=JSON.parse(options.body);assert.equal(body.n,3);assert.equal(body.quality,'medium');assert(!body.prompt.includes('injected'));return{ok:true,json:async()=>({data:Array.from({length:3},()=>({b64_json:'AAAA'})),usage:{input_tokens:12,output_tokens:300,total_tokens:312}})}}
 throw Error('Unexpected provider URL');
};
const app=createApp({env,services,fetcher}),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
async function call(method='GET',token=env.AI_VERIFICATION_SECRET,body,path='/api/internal/ai/verify'){const r=await fetch(base+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});const value=await r.text();assert(!value.includes(env.OPENAI_API_KEY));assert(!value.includes(env.AI_VERIFICATION_SECRET));return{status:r.status,cache:r.headers.get('cache-control'),value:()=>JSON.parse(value)}}
try{
 for(const token of ['', 'wrong'])assert.equal((await call('POST',token,{})).status,401);
 assert.equal((await call('PUT')).status,405);assert.equal(providerCalls,0);assert.equal(events.length,0);
 env.VERCEL_ENV='production';assert.equal((await call()).status,404);env.VERCEL_ENV='preview';
 env.AI_VERIFICATION_ENABLED='false';assert.equal((await call()).status,404);env.AI_VERIFICATION_ENABLED='true';
 const ready=await call();assert.equal(ready.status,200);assert.equal(ready.cache,'private, no-store');assert.equal(ready.value().inferenceTested,false);assert.equal(events.length,0);assert.equal(imageCalls,0);
 assert.equal((await call('POST',undefined,{prompt:'injected',owner:randomUUID()})).status,400);assert.equal((await call('POST',undefined,{},'/api/internal/ai/verify?owner=other')).status,400);assert.equal(charges,0);
 const result=await call('POST',undefined,{},'/api/internal/ai/verify?path=internal%2Fai%2Fverify');assert.equal(result.status,200);assert.equal(result.value().choices,3);assert.equal(result.value().creditsSpent,1);assert.equal(result.value().replayed,false);assert(!('images' in result.value()));assert.equal(imageCalls,1);assert.equal(charges,1);assert.equal(safetyCalls,2);
 const calls=providerCalls;const replay=await call('POST',undefined,{});assert.equal(replay.status,200);assert.equal(replay.value().replayed,true);assert.equal(providerCalls,calls);assert.equal(charges,1);
 env.AI_VERIFICATION_OPERATION_ID=randomUUID();providerFail=true;const failure=await call('POST',undefined,{});assert.equal(failure.status,503);assert.equal(refunds,1);const failedCalls=providerCalls;assert.equal((await call('POST',undefined,{})).status,409);assert.equal(providerCalls,failedCalls);
 console.log('PASS Preview-only AI operator HTTP: strong auth, production/disabled denial, no override, nonbillable model probe, fixed three-choice/one-credit durable batch, metadata-only response, replay without provider calls and failure recovery (mock provider/DB).');
}finally{app.locals.stopAIRecovery?.();await new Promise(r=>server.close(r))}
