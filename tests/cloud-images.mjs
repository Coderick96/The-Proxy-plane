import assert from 'node:assert/strict';
import {DEFAULT_IMAGE_MODEL,cloudImageConfig,generateCloudImages} from '../server/cloudImages.js';
import {createApp} from '../server/index.js';
import {durableAIFixture} from './ai-recovery-fixture.mjs';

const env={OPENAI_API_KEY:'fixture-secret-not-real'},prompt='A silver dragon above an ancient forest temple';
const outputs=()=>Array.from({length:3},()=>({b64_json:'AAAA'}));
const calls=[];
const provider=async(url,options)=>{calls.push({url,options});return{ok:true,json:async()=>({data:outputs(),usage:{input_tokens:12,output_tokens:300,total_tokens:312,input_tokens_details:{text_tokens:12,image_tokens:0,private:'omit'},output_tokens_details:{image_tokens:300,text_tokens:0},private:env.OPENAI_API_KEY}})}};
assert.deepEqual(cloudImageConfig(env),{model:DEFAULT_IMAGE_MODEL,quality:'medium'});
for(const quality of ['low','medium','high'])assert.equal(cloudImageConfig({...env,OPENAI_IMAGE_QUALITY:quality}).quality,quality);
for(const model of ['gpt-image-2.5-flare','gpt-image-2.5-sunburst','gpt-image-2.5-sunburst-2026-09-08'])assert.equal(cloudImageConfig({...env,OPENAI_IMAGE_MODEL:model}).model,model);
for(const bad of ['gpt-image-1','gpt-image-1.5','unrecognized'])assert.throws(()=>cloudImageConfig({...env,OPENAI_IMAGE_MODEL:bad}),e=>e.status===503);
for(const bad of ['auto','xhigh','max','MEDIUM'])assert.throws(()=>cloudImageConfig({...env,OPENAI_IMAGE_QUALITY:bad}),e=>e.status===503);

const generated=await generateCloudImages({env,prompt,fetcher:provider});
const json=JSON.parse(calls[0].options.body);
assert.equal(calls[0].url,'https://api.openai.com/v1/images/generations');
assert.equal(json.model,DEFAULT_IMAGE_MODEL);assert.equal(json.quality,'medium');assert.equal(json.output_format,'png');assert.equal(json.n,3);assert.equal(json.size,'1024x1536');
assert.equal(generated.images.length,3);assert(!JSON.stringify(generated).includes(env.OPENAI_API_KEY));assert.deepEqual(generated.usage,{input_tokens:12,output_tokens:300,total_tokens:312,input_tokens_details:{text_tokens:12,image_tokens:0},output_tokens_details:{image_tokens:300,text_tokens:0}});
const edited=await generateCloudImages({env:{...env,OPENAI_IMAGE_QUALITY:'low'},prompt,source:'data:image/png;base64,AAAA',fetcher:provider});
const form=calls[1].options.body;
assert.equal(calls[1].url,'https://api.openai.com/v1/images/edits');assert(form instanceof FormData);assert.equal(form.get('model'),DEFAULT_IMAGE_MODEL);assert.equal(form.get('quality'),'low');assert.equal(form.get('output_format'),'png');assert.equal(form.get('n'),'3');assert.equal(form.get('image[]').type,'image/png');assert.equal(edited.quality,'low');assert.equal(calls[1].options.headers['Content-Type'],undefined);
const failures=[
 async()=>{throw Error(env.OPENAI_API_KEY)},
 async()=>({ok:false,json:async()=>({error:{message:env.OPENAI_API_KEY}})}),
 async()=>({ok:true,json:async()=>{throw Error(env.OPENAI_API_KEY)}}),
 async()=>({ok:true,json:async()=>({data:outputs().slice(0,2)})}),
 async()=>({ok:true,json:async()=>({data:[{b64_json:'===='},...outputs().slice(0,2)]})})
];
for(const fetcher of failures)await assert.rejects(generateCloudImages({env,prompt,fetcher}),e=>!e.message.includes(env.OPENAI_API_KEY)&&/image service/.test(e.message));
const badUsage=await generateCloudImages({env,prompt,fetcher:async()=>({ok:true,json:async()=>({data:outputs(),usage:{input_tokens:-1,output_tokens:NaN,total_tokens:'312',private:env.OPENAI_API_KEY}})})});assert.equal(badUsage.usage,undefined);

// Exercise real local HTTP boundaries; provider and durable RPC implementation are explicit fixtures.
const events=[],httpCalls=[];
const services={configured:false,user:async()=>({id:'cloud-fixture-owner'}),access:async()=>({studio:true}),products:async()=>[],deckProducts:async()=>[]};
services.rpc=durableAIFixture(async(name,args)=>{events.push({name,args});return null});
let fail=false;
const fetcher=async(url,options)=>{
 httpCalls.push({url,options});
 if(url.endsWith('/responses'))return{ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:'{"decision":"allow"}'}]}]})};
 if(fail)throw Error(env.OPENAI_API_KEY);
 return provider(url,options);
};
const app=createApp({env,services,fetcher});const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
const base='http://127.0.0.1:'+server.address().port;
async function post(path,body){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return{status:r.status,body:await r.json()}}
try{
 for(const [path,body] of [['/api/generate-art',{prompt,quality:'max',model:'gpt-image-1'}],['/api/ai/resketch',{prompt,source:'data:image/png;base64,AAAA',quality:'xhigh'}]]){
  events.length=0;httpCalls.length=0;
  const r=await post(path,body);assert.equal(r.status,200);assert.equal(r.body.images.length,3);assert.equal(r.body.creditsSpent,1);assert.equal(r.body.model,DEFAULT_IMAGE_MODEL);assert.equal(r.body.quality,'medium');assert.equal(events.filter(x=>x.name==='pp_spend_credits').length,1);assert.equal(events.find(x=>x.name==='pp_spend_credits').args.amount,1);assert.equal(httpCalls.filter(x=>x.url.endsWith('/responses')).length,2);
 }
 for(const invalid of [{OPENAI_IMAGE_MODEL:'gpt-image-1'},{OPENAI_IMAGE_QUALITY:'auto'},{OPENAI_IMAGE_QUALITY:'max'}]){
  Object.assign(env,invalid);events.length=0;httpCalls.length=0;
  for(const path of ['/api/generate-art','/api/ai/resketch'])assert.equal((await post(path,{prompt,source:'data:image/png;base64,AAAA'})).status,503);
  assert.equal(events.length,0);assert.equal(httpCalls.length,0);delete env.OPENAI_IMAGE_MODEL;delete env.OPENAI_IMAGE_QUALITY;
 }
 events.length=0;fail=true;const failure=await post('/api/generate-art',{prompt});assert.equal(failure.status,500);assert(!JSON.stringify(failure.body).includes(env.OPENAI_API_KEY));assert.equal(events.filter(x=>x.name==='pp_spend_credits').length,1);assert.equal(events.filter(x=>x.name==='pp_refund_ai').length,1);
 // A configured key must not accidentally enable cloud while device AI stays enabled.
 fail=false;env.BETA_MODE='true';env.BETA_AI_ENABLED='true';env.OWNER_USER_ID='cloud-fixture-owner';
 const priorRpc=services.rpc;services.rpc=async(name,args)=>name==='pp_beta_status'?{enabled:true,configured:true,ownerId:env.OWNER_USER_ID}:priorRpc(name,args);
 for(const cloudFlag of [undefined,'false']){
  if(cloudFlag===undefined)delete env.BETA_CLOUD_AI_ENABLED;else env.BETA_CLOUD_AI_ENABLED=cloudFlag;
  events.length=0;httpCalls.length=0;
  for(const [path,body] of [['/api/generate-art',{prompt}],['/api/ai/resketch',{prompt,source:'data:image/png;base64,AAAA'}],['/api/ai/set',{prompt,count:1}],['/api/ai/review',{card:{rules:'Flying'}}]]){
   const paused=await post(path,body);assert.equal(paused.status,503);assert.match(paused.body.error,/Cloud AI generation is paused/);
  }
  assert.equal(events.length,0);assert.equal(httpCalls.length,0);
 }
 env.BETA_CLOUD_AI_ENABLED='true';assert.equal((await post('/api/generate-art',{prompt})).status,200);
 console.log('PASS current cloud image contracts: supported pinned model, explicit bounded quality, JSON/form PNG generation/edit, three choices/one credit, safety and usage preservation, invalid config before debit/provider call, generic transport errors and exact failure refund (mock provider/RPC, real local HTTP).');
}finally{app.locals.stopAIRecovery?.();await new Promise(resolve=>server.close(resolve))}
