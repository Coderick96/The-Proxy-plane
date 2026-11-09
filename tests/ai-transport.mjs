import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server/index.js';
import {sendAIJson,aiReferenceLimit} from '../server/aiTransport.js';
import {durableAIFixture} from './ai-recovery-fixture.mjs';
const events=[],stored=new Map();let imagesGenerated=0;
const baseRPC=async(name,args)=>{events.push([name,args]);return null};
const durable=durableAIFixture(baseRPC);
const services={configured:false,user:async req=>{const id=req.headers.authorization?.replace('Bearer ','');if(!['alice','bob'].includes(id))throw Object.assign(new Error('Sign in required'),{status:401});return {id}},access:async()=>({studio:true}),products:async()=>[],deckProducts:async()=>[],rpc:async(name,args)=>{
 if(name==='pp_ai_complete')stored.set(args.operation,{owner:args.owner,operationId:args.operation,kind:'art',state:'completed',result:args.payload});
 if(name==='pp_ai_results')return [...stored.values()].filter(x=>x.owner===args.owner&&(!args.operation||x.operationId===args.operation)).map(x=>args.operation?x:{operationId:x.operationId,kind:x.kind,state:x.state,hasResult:true});
 return durable(name,args);
}};
const fetcher=async(url)=>url.endsWith('/responses')?{ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:'{"decision":"allow"}'}]}]})}:{ok:true,json:async()=>{imagesGenerated++;return {data:Array.from({length:3},()=>({b64_json:'A'.repeat(2*1024*1024)}))}}};
const start=async mode=>{const server=createApp({env:{OPENAI_API_KEY:'mock-only',SERVERLESS_MODE:mode},services,fetcher}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));return {server,base:'http://127.0.0.1:'+server.address().port}};
const a=await start('true'),b=await start('false');
const request=(base,path,body,owner='alice')=>fetch(base+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+owner,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
const streamed=async response=>{
 assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/json; charset=utf-8');assert.equal(response.headers.get('content-length'),null);assert.match(response.headers.get('cache-control'),/private, no-store/);assert.equal(response.headers.get('transfer-encoding'),'chunked');
 const reader=response.body.getReader(),chunks=[];let length=0;for(;;){const {value,done}=await reader.read();if(done)break;chunks.push(Buffer.from(value));length+=value.length}assert(length>4.5*1024*1024);assert(chunks.length>1);return JSON.parse(Buffer.concat(chunks).toString());
};
try{
 const operationId=randomUUID(),body={operationId,prompt:'A moonlit fantasy tower'};
 const result=await streamed(await request(a.base,'/api/generate-art',body));assert.equal(result.images.length,3);assert.equal(result.operationId,operationId);assert.equal(imagesGenerated,1);assert.equal(events.filter(([n])=>n==='pp_spend_credits').length,1);
 const duplicate=await streamed(await request(a.base,'/api/generate-art',body));assert.deepEqual(duplicate,result);assert.equal(imagesGenerated,1);assert.equal(events.filter(([n])=>n==='pp_spend_credits').length,1);
 const recovered=await streamed(await request(a.base,'/api/ai/operations/'+operationId));assert.equal(recovered.result.images.length,3);
 assert.equal((await request(a.base,'/api/ai/operations/'+operationId,undefined,'bob')).status,404);assert.equal((await request(a.base,'/api/ai/operations/'+operationId,undefined,'invalid')).status,401);
 const list=await (await request(a.base,'/api/ai/operations')).json();assert.equal(list.operations.length,1);assert.equal(list.operations[0].result,undefined);
 const previous=events.filter(([n])=>n==='pp_spend_credits').length,oversized='data:image/png;base64,'+'A'.repeat(3*1024*1024+4);
 assert.equal((await request(a.base,'/api/ai/resketch',{prompt:'Make the moonlight warmer',source:oversized})).status,413);assert.equal(events.filter(([n])=>n==='pp_spend_credits').length,previous);assert.equal(imagesGenerated,1);
 assert.equal((await streamed(await request(a.base,'/api/ai/resketch',{prompt:'Warmer light',source:'data:image/png;base64,AAAA'}))).images.length,3);
 assert.equal((await streamed(await request(b.base,'/api/ai/resketch',{prompt:'Warmer light',source:oversized}))).images.length,3);
 const interrupted=await request(a.base,'/api/ai/operations/'+operationId);await interrupted.body.cancel();assert.equal((await request(a.base,'/api/health')).status,200);assert.equal((await streamed(await request(a.base,'/api/ai/operations/'+operationId))).result.images.length,3);
 let touched=false;const cycle={};cycle.self=cycle;await assert.rejects(sendAIJson({set(){touched=true}},cycle),/circular/i);assert.equal(touched,false);
 assert.equal(aiReferenceLimit({SERVERLESS_MODE:'true'}),3*1024*1024);assert.equal(aiReferenceLimit({}),10*1024*1024);
 console.log('PASS actual HTTP AI transport: >6 MiB streamed JSON/three choices, private headers, one credit/idempotent retry, owner-only recovery, metadata-only list, oversized serverless input rejected before charge, small input accepted, conventional limit preserved, disconnect recovery, serialization before headers (mock providers/RPC).');
}finally{await Promise.all([a.server,b.server].map(s=>new Promise(r=>s.close(r))))}
