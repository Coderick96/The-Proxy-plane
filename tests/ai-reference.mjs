import assert from 'node:assert/strict';
import {MAX_AI_REFERENCE_CHARS,prepareAIReference} from '../src/aiReference.js';
const small='data:image/png;base64,AAAA';
assert.equal(await prepareAIReference(small),small);
for(const value of [null,'https://example.com/private.png','data:text/html;base64,AAAA','data:image/png;base64,not base64','x'.repeat(20*1024*1024+1)])await assert.rejects(prepareAIReference(value),/No credits were charged/);
assert(MAX_AI_REFERENCE_CHARS<3*1024*1024-10000);
console.log('PASS AI reference: unchanged small valid references, invalid/remote/oversized rejection before upload, request-size headroom.');
// Browser-client request safety is verified with small references (no canvas required).
const {api}=await import('../src/premiumApi.js');
const originalFetch=global.fetch;
let calls=0,sessionReads=0;
global.fetch=async()=>{calls++;return {ok:true,json:async()=>({ok:true})}};
try{
 const changing={auth:{getSession:async()=>({data:{session:{access_token:++sessionReads===1?'account-a':'account-b'}}})}};
 await assert.rejects(api(changing,'/api/ai/resketch',{source:small,prompt:'warmer light'}),e=>/account changed/.test(e.message)&&Boolean(e.operationId));
 assert.equal(calls,0);
 await assert.rejects(api(null,'/api/ai/resketch',{source:'https://invalid.example/reference.png'}),e=>/No credits were charged/.test(e.message)&&Boolean(e.operationId));
 assert.equal(calls,0);
 const stable={auth:{getSession:async()=>({data:{session:{access_token:'stable'}}})}};
 assert.deepEqual(await api(stable,'/api/ai/resketch',{source:small,prompt:'warmer light'}),{ok:true});assert.equal(calls,1);
 console.log('PASS resketch client: account-switch/preparation errors never fetch and retain operation IDs; stable requests proceed.');
}finally{global.fetch=originalFetch}

const {api:request}=await import('../src/premiumApi.js');
const savedFetch=global.fetch;
let operation;
global.fetch=async(_url,options)=>{operation=JSON.parse(options.body).operationId;return {ok:true,status:200,json:async()=>{throw new SyntaxError('Truncated stream')}}};
try{await assert.rejects(request(null,'/api/generate-art',{prompt:'Moonlit tower'}),error=>/interrupted/.test(error.message)&&error.operationId===operation);console.log('PASS interrupted HTTP-200 JSON streams reject and retain recovery operation ID.');}finally{global.fetch=savedFetch}
