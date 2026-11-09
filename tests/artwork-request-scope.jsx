import React,{act} from 'react';import {createRoot} from 'react-dom/client';import assert from 'node:assert/strict';import App from '../src/App.jsx';
async function run(){
 global.requestAnimationFrame=fn=>queueMicrotask(fn);global.localStorage=window.localStorage;const store=new Map(),pending=[];let change,user={id:'a'};
 global.indexedDB={open(){const r={};queueMicrotask(()=>{r.result={transaction(){const tx={objectStore(){return {get(k){const t={};queueMicrotask(()=>{t.result=store.get(k);t.onsuccess?.()});return t},put(v,k){store.set(k,structuredClone(v));queueMicrotask(()=>tx.oncomplete?.())}}}};return tx}};r.onsuccess?.()});return r}};
 const backend={auth:{getSession:async()=>({data:{session:{user,access_token:user.id}}}),onAuthStateChange:fn=>{change=fn;return {data:{subscription:{unsubscribe(){}}}}}},rpc:async()=>({data:[]})};
 global.fetch=async(path,options)=>{if(path==='/api/generate-art')return new Promise(resolve=>pending.push({resolve,body:JSON.parse(options.body),token:options.headers.Authorization}));return {ok:true,json:async()=>String(path).includes('/operations')?{operations:[]}:{credits:10}}};
 const root=createRoot(document.getElementById('root'));
 const renderUser=async id=>{user={id};await act(async()=>change('SIGNED_IN',{user,access_token:id}))};
 const begin=async()=>{await act(async()=>[...document.querySelectorAll('.plane-destination')].find(n=>n.textContent.includes('AI Art Studio')).click());const input=document.querySelector('.integrated-art-studio textarea');assert.equal(input.value,'','account changes clear private prompts');await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(input,'A private moonlit dragon');input.dispatchEvent(new window.Event('input',{bubbles:true}))});await act(async()=>document.querySelector('.integrated-art-studio>.primary').click())};
 const complete=async i=>{const job=pending[i];await act(async()=>job.resolve({ok:true,json:async()=>({operationId:job.body.operationId,images:Array(3).fill('data:image/png;base64,'+Buffer.from('owner-'+job.token).toString('base64'))})}))};
 try{
  await act(async()=>root.render(<App backend={backend}/>));await begin();assert.equal(pending.length,1);
  await renderUser('b');await begin();assert.equal(pending.length,2);await complete(0);assert(document.querySelector('.integrated-art-studio>.primary').disabled);assert.equal(document.querySelectorAll('.art-choice-grid img').length,0,'A result cannot enter B workspace');await complete(1);assert.equal(document.querySelectorAll('.art-choice-grid img').length,3);
  await renderUser('a');await begin();await renderUser('b');await renderUser('a');await begin();assert.equal(pending.length,4);await complete(2);assert(document.querySelector('.integrated-art-studio>.primary').disabled,'old A completion cannot clear new A busy state after A/B/A');assert.equal(document.querySelectorAll('.art-choice-grid img').length,0);await complete(3);assert.equal(document.querySelectorAll('.art-choice-grid img').length,3);
  console.log('PASS actual App AI requests: old account results cannot enter another account or clear its pending state; A/B/A stale completion cannot replace a new request.');
 }finally{await act(async()=>root.unmount())}
}
run().catch(e=>{console.error(e);process.exitCode=1});
