import assert from 'node:assert/strict';import {createApp}from '../server/index.js';import {createServices}from '../server/premium.js';
const owner='00000000-0000-4000-8000-000000000001',tester='00000000-0000-4000-8000-000000000002',outsider='00000000-0000-4000-8000-000000000003';
const env={BETA_MODE:'true',OWNER_USER_ID:owner,SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'test',OPENAI_API_KEY:'test',STRIPE_SECRET_KEY:'sk_live_mock',STRIPE_WEBHOOK_SECRET:'test',STRIPE_PRICE_PREMIUM_MONTHLY:'price_mock'};
let active=true,configured=true,aiCalls=0;const calls=[];
const admin={auth:{getUser:async token=>({data:{user:{owner,tester,outsider}[token]?{id:{owner,tester,outsider}[token],email:token+'@example.test'}:null},error:null})},rpc:async(name,args)=>{calls.push([name,args]);return {data:name==='pp_beta_status'?{enabled:true,configured,ownerId:owner}:name==='pp_beta_claim'?{allowed:args.owner===owner||args.owner===tester&&active,reason:'Not approved'}:name==='pp_access_for'?{policyVersion:30,credits:15}:null}},from(table){let payload;const chain={select(){return chain},order(){return chain},limit:async()=>({data:[]}),eq(){return chain},insert(v){payload=v;calls.push(['insert',table,payload]);return chain},update(v){calls.push(['update',table,v]);return chain},delete(){calls.push(['delete',table]);return chain},single:async()=>({data:{id:'10000000-0000-4000-8000-000000000001'}}),then(resolve,reject){return Promise.resolve({data:[]}).then(resolve,reject)}};return chain}};
const stripe={prices:{retrieve:async()=>{throw new Error('Beta must not retrieve live prices')}},checkout:{sessions:{create:async()=>{throw new Error('Beta must not checkout')}}}};
const services=createServices(env,{admin,stripe});const server=createApp({env,services,fetcher:async()=>{aiCalls++;throw new Error('AI must stay paused')}}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
const req=async(path,token='',body)=>{const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,body:await r.json()}};
try{
 assert.equal((await req('/api/health')).status,200);assert.deepEqual((await req('/api/beta/status')).body,{enabled:true,capacity:10,allowed:false});
 for(const path of['/api/premium/catalog','/api/deck-products','/api/beta/roster','/api/beta/feedback'])assert.equal((await req(path)).status,401);
 assert.equal((await req('/api/decks/import','',{url:'https://example.invalid'})).status,401);
 assert.equal((await req('/api/beta/status','outsider')).status,403);assert.equal((await req('/api/premium/access','outsider')).status,403);
 for(const [key,enabled,expected]of[['rk_test_mock','true',true],['sk_test_mock','true',true],['sk_live_mock','true',false],['rk_test_mock','false',false],['sk_test_','true',false]]){env.STRIPE_SECRET_KEY=key;env.BETA_TEST_BILLING=enabled;assert.equal((await req('/api/beta/status','tester')).body.testBilling,expected)}
 env.STRIPE_SECRET_KEY='sk_live_mock';delete env.BETA_TEST_BILLING;
 assert.equal((await req('/api/beta/status','tester')).body.allowed,true);assert.equal((await req('/api/beta/roster','tester')).status,403);
 assert.equal((await req('/api/beta/roster','owner')).status,200);assert.equal((await req('/api/beta/roster','owner',{slot:11,email:'test@example.test'})).status,400);
 assert.equal((await req('/api/beta/roster','owner',{slot:1,email:'test@example.test'})).status,200);assert(calls.some(([name,args])=>name==='pp_beta_set_seat'&&args.address==='test@example.test'));
 assert.equal((await req('/api/beta/feedback','tester',{category:'bug',title:'Broken preview',details:'Expected the preview to update.',user_id:owner})).status,200);assert.equal(calls.find(c=>c[0]==='insert')[2].user_id,tester);
 assert.equal((await req('/api/beta/feedback','tester',{category:'bug',title:'x',details:'short'})).status,400);
 assert.equal((await req('/api/beta/revoke','owner',{slot:1})).status,200);
 assert.equal((await req('/api/billing/checkout','tester',{product:'premium_monthly'})).status,403);assert.equal((await req('/api/billing/portal','tester',{})).status,403);
 const catalog=await req('/api/premium/catalog','tester');assert(catalog.body.products.every(p=>p.available===false));
 assert.equal((await req('/api/generate-art','tester',{prompt:'A moonlit landscape'})).status,503);assert.equal(aiCalls,0);assert(!calls.some(([name])=>name==='pp_spend_credits'));
 active=false;assert.equal((await req('/api/premium/access','tester')).status,403);configured=false;assert.equal((await req('/api/beta/status')).status,503);
 console.log('Passed beta HTTP admission, owner-only roster/inbox, server-owned feedback identity, immediate revocation, configuration failure closure, paused AI and live-purchase blocking (mock accounts/providers).');
}finally{await new Promise(r=>server.close(r))}
