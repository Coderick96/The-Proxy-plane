import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import assert from 'node:assert/strict';
import AIRecovery from '../src/AIRecovery.jsx';
import {api} from '../src/premiumApi.js';
async function run(){
 const root=createRoot(document.getElementById('root')),originalFetch=global.fetch;
 let uid='a',recovered=[],deferList=null,deferResult=null;
 const calls=[];
 const client={auth:{getSession:async()=>({data:{session:{access_token:uid}}})}};
 const images=Array(3).fill('data:image/png;base64,AAAA');
 const response=value=>({ok:true,status:200,json:async()=>value});
 const records=()=>[{operationId:uid+'-private',kind:uid==='a'?'art':'set',state:'completed',createdAt:'2026-01-01T00:00:00Z'}];
 global.fetch=async(path,options)=>{
  calls.push({path,options});
  if(path==='/api/ai/operations')return deferList?deferList.promise:response({operations:records()});
  return deferResult?deferResult.promise:response({operationId:'a-private',kind:'art',state:'completed',result:{images}});
 };
 const render=async id=>{uid=id;await act(async()=>root.render(<AIRecovery client={client} user={id?{id}:null} onRecovered={value=>recovered.push(value)}/>))};
 const click=async text=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent===text);assert(button,text);await act(async()=>button.click())};
 try{
  await render(null);assert.equal(calls.length,0);assert.match(document.body.textContent,/Sign in/);
  await render('a');assert.match(document.body.textContent,/Artwork/);assert.equal(calls.length,1,'list metadata only, no eager result download');
  await click('Recover artwork choices');assert.deepEqual(recovered,[images]);assert(calls.every(c=>c.options.method==='GET'),'recovery does not create billable requests');
  const pending={};pending.promise=new Promise(resolve=>pending.resolve=resolve);deferResult=pending;
  const button=[...document.querySelectorAll('button')].find(b=>b.textContent==='Recover artwork choices');await act(async()=>button.click());
  await render('b');assert.match(document.body.textContent,/Card set/);assert(!document.body.textContent.includes('Artwork'));
  await act(async()=>pending.resolve(response({kind:'art',state:'completed',result:{images}})));assert.equal(recovered.length,1,'A result cannot apply after switch to B');deferResult=null;
  // An A→B→A cycle must also invalidate delayed A metadata.
  await render('a');const stale={};stale.promise=new Promise(resolve=>stale.resolve=resolve);deferList=stale;
  await click('Refresh recent requests');deferList=null;await render('b');await render('a');
  await act(async()=>stale.resolve(response({operations:[{operationId:'stale',kind:'review',state:'completed'}]})));
  assert(!document.body.textContent.includes('Rules review'),'stale A metadata is rejected after A/B/A');assert.match(document.body.textContent,/Artwork/);
  let payload;
  global.fetch=async(_path,options)=>{payload=JSON.parse(options.body);return response({images,operationId:payload.operationId})};
  const body={prompt:'Moonlit tower'};const result=await api(client,'/api/generate-art',body);assert.match(payload.operationId,/^[0-9a-f-]{36}$/);assert.equal(body.operationId,undefined);assert.equal(result.operationId,payload.operationId);
  global.fetch=async(_path,options)=>{payload=JSON.parse(options.body);throw new Error('Network offline')};
  await assert.rejects(api(client,'/api/generate-art',{prompt:'Moonlit tower'}),error=>error.message==='Network offline'&&error.operationId===payload.operationId);
  global.fetch=async(_path,options)=>{payload=JSON.parse(options.body);return {ok:false,status:503,json:async()=>{throw new SyntaxError('Not JSON')}}};
  await assert.rejects(api(client,'/api/generate-art',{prompt:'Moonlit tower'}),error=>error.status===503&&error.operationId===payload.operationId);
  global.fetch=async()=>({ok:false,status:409,json:async()=>({error:'Still running',operationId:'known-op'})});
  await assert.rejects(api(client,'/api/ai/operations/known-op'),error=>error.status===409&&error.operationId==='known-op');
  console.log('PASS AI recovery UI: metadata-first retrieval, no new charge, auth/A-B-A isolation, private result application, generated operation IDs and recoverable errors (simulated DOM/providers).');
 }finally{global.fetch=originalFetch;await act(async()=>root.unmount())}
}
run().catch(error=>{console.error(error);process.exitCode=1});
