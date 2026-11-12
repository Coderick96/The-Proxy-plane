import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import assert from 'node:assert/strict';
import App from '../src/App.jsx';
import BetaGate from '../src/BetaGate.jsx';

const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const user=id=>({id,email:id+'@example.invalid'});
const session=id=>({user:user(id),access_token:'token-'+id});
const card=(id,name)=>({id,name,frame:'modern',art:'',rules:'Private draft',visibility:'private',layers:{},customLayers:[]});
const store=new Map([
 ['account:account-a:projects',[card('a-card','Account A private card')]],
 ['account:account-b:projects',[card('b-card','Account B private card')]],
]);
globalThis.localStorage=window.localStorage;
globalThis.indexedDB={open(){const request={};const database={transaction(){const tx={objectStore(){return {get(key){const req={};queueMicrotask(()=>{req.result=store.get(key);req.onsuccess?.()});return req},put(value,key){store.set(key,structuredClone(value));queueMicrotask(()=>tx.oncomplete?.())}}}};return tx}};queueMicrotask(()=>{request.result=database;request.onsuccess?.()});return request}};

function deferredClient(){
 let callback,resolve,reject,reads=0;
 const client={auth:{getSession:async()=>++reads===1?new Promise((yes,no)=>{resolve=yes;reject=no}):({data:{session:session('account-b')}}),onAuthStateChange(fn){callback=fn;return {data:{subscription:{unsubscribe(){}}}}}}};
 return {client,emit:()=>callback('SIGNED_IN',session('account-b')),resolve:()=>resolve({data:{session:session('account-a')}}),reject:()=>reject(new Error('Stale initial restore failure'))};
}
async function verifyApp(fail){
 const fixture=deferredClient(),root=createRoot(document.getElementById('root'));
 try{
  await act(async()=>{root.render(<App backend={fixture.client}/>);await tick()});
  await act(async()=>{fixture.emit();await tick()});
  assert(document.body.textContent.includes('Account B private card'),'Newer B session hydrates B workspace');
  await act(async()=>{fail?fixture.reject():fixture.resolve();await tick()});
  assert(document.body.textContent.includes('Account B private card'),'Late initial restore must not overwrite newer authenticated B');
  assert(!document.body.textContent.includes('Account A private card'),'Late initial A restore must not expose A private vault');
  assert(!document.body.textContent.includes('Could not restore your account session.'),'Stale initial errors must not replace current account state');
 }finally{await act(async()=>root.unmount())}
}
async function verifyGate(fail){
 const fixture=deferredClient(),root=createRoot(document.getElementById('root'));
 const request=async()=>({enabled:true,allowed:false});
 try{
  await act(async()=>{root.render(<BetaGate client={fixture.client} request={request} privateBeta googleEnabled={false} appleEnabled={false}/>);await tick()});
  await act(async()=>{fixture.emit();await tick()});
  assert(document.body.textContent.includes('Signed in as account-b@example.invalid'));
  await act(async()=>{fail?fixture.reject():fixture.resolve();await tick()});
  assert(document.body.textContent.includes('Signed in as account-b@example.invalid'),'Gate must retain newer B session');
  assert(!document.body.textContent.includes('Signed in as account-a@example.invalid'),'Gate must ignore stale initial A session');
  assert(!document.body.textContent.includes('Could not restore your session.'),'Gate must ignore a stale initial restore failure');
 }finally{await act(async()=>root.unmount())}
}
async function verifyRecoverySwitch(notify){
 let current='account-a',callback;
 const updates=[],client={auth:{getSession:async()=>({data:{session:session(current)}}),onAuthStateChange(fn){callback=fn;return {data:{subscription:{unsubscribe(){}}}}},updateUser:async body=>{updates.push({account:current,body});return {error:null}}}};
 const root=createRoot(document.getElementById('root'));
 try{
  await act(async()=>{root.render(<BetaGate client={client} request={async()=>({enabled:true,allowed:false})} privateBeta googleEnabled={false} appleEnabled={false}/>);await tick()});
  await act(async()=>{callback('PASSWORD_RECOVERY',session(current));await tick()});
  assert(document.body.textContent.includes('Reset your password'));
  for(const input of document.querySelectorAll('input[type=password]'))await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(input,'new-password-for-account-a');input.dispatchEvent(new window.Event('input',{bubbles:true}))});
  current='account-b';
  if(notify){
   await act(async()=>{callback('SIGNED_IN',session(current));await tick()});
   assert(!document.body.textContent.includes('Reset your password'),'An account switch must close the other account recovery form');
   assert(!document.querySelector('input[type=password]'),'Recovery password fields must be cleared/removed on identity switch');
  }else{
   await act(async()=>{document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await tick()});
  }
  assert.deepEqual(updates,[],'A recovery action for A must never update the current B account password');
 }finally{await act(async()=>root.unmount())}
}
async function run(){
 await verifyApp(false);await verifyApp(true);await verifyGate(false);await verifyGate(true);await verifyRecoverySwitch(true);await verifyRecoverySwitch(false);
 console.log('PASS App and beta gate restore ordering: newer B auth event wins over delayed initial A session or failed restore; no cross-account private vault display, recovery owner switch cancellation and silent-session mismatch denial (simulated DOM/providers).');
}
run().catch(error=>{console.error(error);process.exitCode=1});
