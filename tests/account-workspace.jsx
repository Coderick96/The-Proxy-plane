import React,{act} from 'react';import {createRoot} from 'react-dom/client';import assert from 'node:assert/strict';import App from '../src/App.jsx';
async function run(){
 const uidA='account-a',uidB='account-b';const record=(id,name)=>({id,name,frame:'modern',art:'',rules:'Private draft',visibility:'private',layers:{},customLayers:[]});
 const guest=[record('guest','Guest artwork')],a=[record('a-card','Account A private card')],b=[record('b-card','Account B private card')];
 const store=new Map([['projects',guest],['account:'+uidA+':projects',a],['account:'+uidB+':projects',b]]);
 global.localStorage=window.localStorage;
 global.indexedDB={open(){const request={};const database={transaction(){const tx={objectStore(){return {get(key){const req={};queueMicrotask(()=>{req.result=store.get(key);req.onsuccess?.()});return req},put(value,key){store.set(key,structuredClone(value));queueMicrotask(()=>tx.oncomplete?.())}}}};return tx}};queueMicrotask(()=>{request.result=database;request.onsuccess?.()});return request}};
 let authCallback;
 const backend={auth:{
  getSession:async()=>({data:{session:{user:{id:uidA,email:'a@example.invalid'}}}}),
  onAuthStateChange(cb){authCallback=cb;return {data:{subscription:{unsubscribe(){}}}};}
 }};

 const root=createRoot(document.getElementById('root'));await act(async()=>root.render(<App backend={backend}/>));assert(document.body.textContent.includes('Account A private card'));assert(!document.body.textContent.includes('Account B private card'));assert(!document.body.textContent.includes('Guest artwork'));
 await act(async()=>authCallback('SIGNED_IN',{user:{id:uidB,email:'b@example.invalid'}}));assert(document.body.textContent.includes('Account B private card'));assert(!document.body.textContent.includes('Account A private card'));assert.equal(store.get('account:'+uidB+':projects')[0].name,'Account B private card');
 await act(async()=>authCallback('SIGNED_OUT',null));assert(document.body.textContent.includes('Guest artwork'));assert(!document.body.textContent.includes('Account B private card'));assert(!document.body.textContent.includes('Account A private card'));assert.equal(store.get('projects')[0].name,'Guest artwork');
 await act(async()=>authCallback('SIGNED_IN',{user:{id:uidA,email:'a@example.invalid'}}));assert(document.body.textContent.includes('Account A private card'));assert.equal(store.get('account:'+uidA+':projects')[0].name,'Account A private card');
 await act(async()=>root.unmount());console.log('Passed actual App auth-switch hydration: guest, Cardsmith A and Cardsmith B never cross-write or display each other’s local vaults.');
}run().catch(error=>{console.error(error);process.exitCode=1});
