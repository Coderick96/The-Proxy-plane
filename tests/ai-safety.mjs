import {durableAIFixture} from './ai-recovery-fixture.mjs';
import assert from 'node:assert/strict';
import {createApp} from '../server/index.js';
const events=[];let checks=[],generationFailure=false,seen=[],holdSafety=null;
const safeResult=decision=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({decision})}]}]});
const env={OPENAI_API_KEY:'test-only',OPENAI_SAFETY_MODEL:'gpt-4.1-mini'};
const services={configured:false,user:async req=>{if(req.headers.authorization!=='Bearer test')throw Object.assign(new Error('Sign in'),{status:401});return {id:'test-owner'}},access:async()=>({studio:true}),rpc:async(name,args)=>{events.push([name,args])},products:async()=>[],deckProducts:async()=>[]};
const fetcher=async(url,options)=>{
 const body=options.body instanceof FormData?null:JSON.parse(options.body);seen.push([url,body]);
 if(body?.text?.format?.name==='proxy_plane_ai_safety'){
  if(holdSafety){const hold=holdSafety;holdSafety=null;await hold;}
  const decision=checks.shift()||'allow';
  if(decision==='http_error')return {ok:false,json:async()=>({error:'unavailable'})};
  if(decision==='bad_shape')return {ok:true,json:async()=>({status:'completed',output:{}})};
  if(decision==='malformed')return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:'not JSON'}]}]})};
  if(decision==='refusal')return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'refusal',refusal:'no'}]}]})};
  if(decision==='incomplete')return {ok:true,json:async()=>({status:'incomplete',output:[]})};
  return {ok:true,json:async()=>safeResult(decision)};
 }
 if(generationFailure)return {ok:false,json:async()=>({error:{message:'Provider refused'}})};
 if(url.includes('/images/'))return {ok:true,json:async()=>({data:Array.from({length:3},()=>({b64_json:'AAAA'}))})};
 const value=body.text.format.name==='card_set'?{title:'Night guardians',lore:'Dark fantasy',cards:[Object.fromEntries(['name','mana','type','rules','flavor','power','toughness','color','rarity','artPrompt'].map(k=>[k,'Test']))]}:{summary:'Review',issues:[],suggestedRules:'Flying'};
 return {ok:true,json:async()=>({output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})};
};
services.rpc=durableAIFixture(services.rpc);
const server=createApp({env,services,fetcher}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
const req=async(path,body,token='test')=>{const r=await fetch(base+path,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()}};
const operations=[['/api/generate-art',{prompt:'Dark fantasy adult warrior, battle armor and dramatic shadows'}],['/api/ai/resketch',{prompt:'Make the haunted landscape more atmospheric',source:'data:image/png;base64,AAAA'}],['/api/ai/set',{prompt:'A gothic set with heroes rescuing children',count:1}],['/api/ai/review',{card:{name:'Night Watch',rules:'Flying'}}]];
try{
 for(const [path,body] of operations){
  events.length=0;seen=[];checks=['allow','allow'];const r=await req(path,body);assert.equal(r.status,200);assert.equal(seen.filter(([,b])=>b?.text?.format?.name==='proxy_plane_ai_safety').length,2);assert.equal(events.filter(e=>e[0]==='pp_spend_credits').length,1);assert.equal(events.find(e=>e[0]==='pp_spend_credits')[1].amount,1);assert(!events.some(e=>e[0]==='pp_refund_ai'));
  if(path.includes('resketch')){const input=seen[0][1].input[0].content;assert.equal(input.filter(c=>c.type==='input_image').length,1);assert(!input[0].text.includes('AAAA'));}
  for(const prohibited of ['child_abuse','pornography']){
   events.length=0;seen=[];checks=[prohibited];const rejected=await req(path,{...body,safetyDecision:'allow'});assert.equal(rejected.status,422);assert.equal(events.length,0);assert.equal(seen.length,1);assert(!rejected.body.images&&!rejected.body.cards);
   events.length=0;seen=[];checks=['allow',prohibited];const output=await req(path,body);assert.equal(output.status,422);assert(!output.body.images&&!output.body.cards);const spend=events.find(e=>e[0]==='pp_spend_credits'),refund=events.find(e=>e[0]==='pp_refund_ai');assert(spend&&refund);assert.equal(refund[1].charge_id,spend[1].operation);
  }
 }
 for(const failure of ['http_error','malformed','bad_shape','refusal','incomplete','invented_verdict']){
  events.length=0;checks=[failure];assert.equal((await req(...operations[0])).status,503);assert.equal(events.length,0);
  events.length=0;checks=['allow',failure];assert.equal((await req(...operations[0])).status,503);assert.equal(events.filter(e=>e[0]==='pp_refund_ai').length,1);
 }
 events.length=0;checks=['allow'];generationFailure=true;assert.equal((await req(...operations[0])).status,500);assert.equal(events.filter(e=>e[0]==='pp_refund_ai').length,1);generationFailure=false;
 // The account lock covers pending safety checks, not just generation.
 let release;holdSafety=new Promise(r=>release=r);checks=['allow','allow'];const pending=req(...operations[0]);
 // Wait for the request to enter the mocked provider, without a fixed sleep.
 for(let i=0;i<100&&!seen.at(-1)?.[1]?.text?.format?.name?.includes('ai_safety');i++)await new Promise(r=>setTimeout(r,5));
 assert.equal((await req(...operations[0])).status,429);release();assert.equal((await pending).status,200);
 events.length=0;assert.equal((await req(...operations[0],'invalid')).status,401);assert.equal(events.length,0);
 console.log('Passed all AI route input/output safety gates, reference and candidate image checks, targeted refusals, no input charge, exact output refunds, fail-closed provider errors, auth and concurrent-check lock (mock providers).');
}finally{await new Promise(r=>server.close(r))}
