import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import assert from 'node:assert/strict';
import PremiumShop from '../src/PremiumShop.jsx';
import {PremiumContext} from '../src/PremiumContext.jsx';
import {FREE_ACCESS} from '../src/premiumCatalog.js';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const button=()=>[...document.querySelectorAll('button')].find(x=>x.textContent==='Manage billing');
const session=id=>({user:{id},access_token:'token-'+id});
async function run(){
 const previousFetch=global.fetch,PreviousURL=global.URL;
 let current=session('a'),callback,redirects=0,unsubscribed=0;
 const requests=[];
 const client={auth:{getSession:async()=>({data:{session:current}}),onAuthStateChange:fn=>{callback=fn;return{data:{subscription:{unsubscribe(){unsubscribed++}}}}}}};
 global.URL=class extends PreviousURL{constructor(value,...rest){if(String(value).startsWith('https://billing.stripe.com/')){redirects++;throw new Error('Captured permitted billing redirect')}super(value,...rest)}};
 global.fetch=async(path,options)=>{
  if(path==='/api/premium/catalog')return {ok:true,json:async()=>({products:[],testMode:true})};
  return new Promise((resolve,reject)=>requests.push({options,resolve:d=>resolve({ok:true,json:async()=>d}),reject}));
 };
 const root=createRoot(document.getElementById('root'));
 const render=async()=>{await act(async()=>{root.render(<PremiumContext.Provider value={{access:FREE_ACCESS,client,refresh(){}}}><PremiumShop/></PremiumContext.Provider>);await tick()})};
 const click=async()=>{await act(async()=>{button().click();await tick()})};
 try{
  await render();await click();assert.equal(requests.length,1);assert.equal(requests[0].options.headers.Authorization,'Bearer token-a');
  // Navigating away must invalidate pending redirects, even with no auth event.
  await act(async()=>root.unmount());await act(async()=>{requests[0].resolve({url:'https://billing.stripe.com/p/session-a'});await tick()});assert.equal(redirects,0,'Unmounted shop must not consume an old account portal URL');
  const other=createRoot(document.getElementById('root'));
  await act(async()=>{other.render(<PremiumContext.Provider value={{access:FREE_ACCESS,client,refresh(){}}}><PremiumShop/></PremiumContext.Provider>);await tick()});
  await act(async()=>{button().click();button().click();await tick()});assert.equal(requests.length,2,'Double click creates one billing request');
  await act(async()=>{current=session('b');callback('SIGNED_IN',current);await tick()});assert.equal(button().disabled,false);
  await click();assert.equal(requests.length,3);assert.equal(requests[2].options.headers.Authorization,'Bearer token-b');
  await act(async()=>{requests[1].resolve({url:'https://billing.stripe.com/p/session-a'});await tick()});assert.equal(redirects,0);assert.equal(button().disabled,true,'Old completion must not clear new request busy state');
  await act(async()=>{requests[2].reject(new Error('Current billing failure'));await tick()});assert(document.body.textContent.includes('Current billing failure'));assert.equal(button().disabled,false);
  await act(async()=>{current=session('a');callback('SIGNED_IN',current);await tick()});await click();
  await act(async()=>{current=session('b');callback('SIGNED_IN',current);current=session('a');callback('SIGNED_IN',current);await tick()});
  await act(async()=>{requests[3].resolve({url:'https://billing.stripe.com/p/old-a'});await tick()});assert.equal(redirects,0,'A/B/A must invalidate the old A request');
  await click();await act(async()=>{requests[4].resolve({url:'https://billing.stripe.com/p/current-a'});await tick()});assert.equal(redirects,1,'Stable authenticated request reaches the approved Stripe URL boundary');
  await click();current=session('b');await act(async()=>{requests[5].resolve({url:'https://billing.stripe.com/p/a-without-event'});await tick()});assert.equal(redirects,1,'Session recheck also protects when no auth event was observed');
  await click();current=session('a');await act(async()=>{requests[6].reject(new Error('Previous account private failure'));await tick()});assert(!document.body.textContent.includes('Previous account private failure'));
  await act(async()=>{current=null;callback('SIGNED_OUT',null);await tick()});const count=requests.length;await click();assert.equal(requests.length,count);assert(document.body.textContent.includes('Sign in before continuing'));
  await act(async()=>other.unmount());assert.equal(unsubscribed,2);
  console.log('PASS billing UI scope: unmounted response ignored, duplicate clicks locked, frozen authenticated request, A/B/A invalidation, stale completion cannot clear newer busy state, current failure retry, stable approved URL, session recheck and logged-out denial (simulated DOM/providers).');
 }finally{global.fetch=previousFetch;global.URL=PreviousURL}
}
run().catch(error=>{console.error(error);process.exitCode=1});
