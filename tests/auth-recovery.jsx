import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import assert from 'node:assert/strict';
import App from '../src/App.jsx';

async function run(){
 globalThis.localStorage=window.localStorage;
 const user={id:'auth-recovery-user',email:'tester@example.invalid'};
 const card=(id,name)=>({id,name,frame:'modern',art:'',rules:'Private design',visibility:'private',layers:{},customLayers:[]});
 const store=new Map([
  ['projects',[card('guest-card','Guest-only creation')]],
  ['account:'+user.id+':projects',[card('private-card','Signed-in private creation')]]
 ]);
 globalThis.indexedDB={open(){const request={};const database={transaction(){const tx={objectStore(){return {
  get(key){const result={};queueMicrotask(()=>{result.result=store.get(key);result.onsuccess?.()});return result;},
  put(value,key){store.set(key,structuredClone(value));queueMicrotask(()=>tx.oncomplete?.());}
 }}};return tx;}};queueMicrotask(()=>{request.result=database;request.onsuccess?.()});return request;}};
 // All service responses are local fakes; this test does not contact Supabase or OAuth providers.
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async()=>({ok:true,json:async()=>({policyVersion:30,credits:10})});
 const button=text=>[...document.querySelectorAll('button')].find(node=>node.textContent.trim()===text);
 const accountButton=()=>document.querySelector('.account-btn');
 const submit=()=>document.querySelector('.account-modal form button[type="submit"]');
 async function input(selector,value){const node=document.querySelector(selector);assert(node,selector);await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new window.Event('input',{bubbles:true}));});}
 async function send(){await act(async()=>document.querySelector('.account-modal form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));}
 async function credentials(){await input('.account-modal input[type="email"]','tester@example.invalid');await input('.account-modal input[type="password"]','test-password-123');}
 let session=null,signinCalls=0,signupCalls=0,signoutCalls=0,rejectSignin,rejectSignup;
 const signinFailure=new Promise((_,reject)=>{rejectSignin=reject;});
 const signupFailure=new Promise((_,reject)=>{rejectSignup=reject;});
 const oauthCalls=[];
 const backend={auth:{
  getSession:async()=>({data:{session}}),
  onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
  signInWithPassword:async()=>{signinCalls++;if(signinCalls===1)return signinFailure;session={user,access_token:'test-session'};return {data:{user,session},error:null};},
  signUp:async()=>{signupCalls++;if(signupCalls===1)return signupFailure;return {data:{user,session:null},error:null};},
  signInWithOAuth:async({provider})=>{oauthCalls.push(provider);throw new Error(provider+' provider unavailable');},
  signOut:async()=>{signoutCalls++;if(signoutCalls===1)throw new Error('Signout connection lost');session=null;return {error:null};}
 }};
 let root=createRoot(document.getElementById('root'));
 try{
  await act(async()=>root.render(<App backend={backend}/>));
  assert(document.body.textContent.includes('Guest-only creation'));
  await act(async()=>accountButton().click());await credentials();await send();
  assert(submit().disabled,'Sign-in is disabled only while request is pending');
  await act(async()=>rejectSignin(new Error('Signin connection lost')));
  assert(!submit().disabled,'Rejected sign-in releases the submit button');
  assert(document.body.textContent.includes('Signin connection lost'),'Sign-in failure is visible');
  await send();assert.equal(signinCalls,2,'Sign-in can be retried');
  assert(!document.querySelector('.account-modal'),'Successful retry closes account dialog');
  assert(document.body.textContent.includes('Signed-in private creation'));
  assert(!document.body.textContent.includes('Guest-only creation'));
  await act(async()=>accountButton().click());await act(async()=>button('Sign out').click());
  assert(document.querySelector('.account-modal').textContent.includes(user.email),'Failed signout keeps account identity');
  assert(document.body.textContent.includes('Signout connection lost'));
  assert(document.body.textContent.includes('Signed-in private creation'),'Failed signout preserves signed-in workspace');
  assert(!document.body.textContent.includes('Guest-only creation'));
  await act(async()=>button('Sign out').click());assert.equal(signoutCalls,2);
  assert(document.body.textContent.includes('Guest-only creation'),'Successful signout returns to guest workspace');
  assert(!document.body.textContent.includes('Signed-in private creation'));
  await act(async()=>accountButton().click());await act(async()=>button('Create account').click());
  await credentials();await send();assert(submit().disabled);
  await act(async()=>rejectSignup(new Error('Signup connection lost')));
  assert(!submit().disabled,'Rejected signup releases the submit button');
  assert(document.body.textContent.includes('Signup connection lost'));
  await send();assert.equal(signupCalls,2,'Signup can be retried');assert(!submit().disabled);
  assert(document.body.textContent.includes('Check your email'),'Unverified signup does not silently sign in');
  assert(document.body.textContent.includes('Guest-only creation'));
  for(const provider of ['google','apple']){
   await act(async()=>button('Continue with '+(provider==='google'?'Google':'Apple')).click());
   assert(document.body.textContent.includes(provider+' provider unavailable'),'OAuth rejection is visible');
   assert(document.querySelector('.account-modal form'),'OAuth error leaves a recoverable login form');
  }
  assert.deepEqual(oauthCalls,['google','apple']);
  console.log('PASS actual App auth recovery: pending/rejected email sign-in and signup, successful retries, Google/Apple rejection, failed-signout identity/workspace retention and successful signout isolation (simulated DOM/providers).');
 }finally{await act(async()=>root.unmount());globalThis.fetch=originalFetch;}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
