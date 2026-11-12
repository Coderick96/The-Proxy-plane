import React,{act} from 'react';import {createRoot} from 'react-dom/client';import assert from 'node:assert/strict';
import PremiumDeckStore from '../src/PremiumDeckStore.jsx';import {PremiumContext} from '../src/PremiumContext.jsx';
const tick=()=>new Promise(r=>setTimeout(r,0)),session=id=>({user:{id},access_token:'token-'+id});
const button=name=>[...document.querySelectorAll('button')].find(x=>x.textContent===name);
async function run(){
 const oldFetch=global.fetch,OldURL=global.URL;let current=session('a'),callback,urls=0,releaseStorage,uploads=0;const requests=[];
 const client={auth:{getSession:async()=>({data:{session:current}}),onAuthStateChange:fn=>{callback=fn;return{data:{subscription:{unsubscribe(){}}}}}},storage:{from:()=>({uploadToSignedUrl:async()=>{uploads++;return new Promise(resolve=>{releaseStorage=()=>resolve({error:null})})}})}};
 global.URL=class extends OldURL{constructor(value,...rest){if(String(value).startsWith('https://checkout.stripe.com/')||String(value).startsWith('https://private.example/')){urls++;throw Error('Captured allowed destination')}super(value,...rest)}};
 global.fetch=async(path,options)=>{
  if(path==='/api/deck-products')return{ok:true,json:async()=>({decks:[{id:'deck',title:'Private deck',creator:'Creator',purchasable:true,memberAccess:true}]})};
  return new Promise((resolve,reject)=>requests.push({path,options,resolve:data=>resolve({ok:true,json:async()=>data}),reject}));
 };
 const draw=root=>root.render(<PremiumContext.Provider value={{client,access:{owner:true,ownedDecks:[],premium:false}}}><PremiumDeckStore/></PremiumContext.Provider>);
 const click=async name=>{await act(async()=>{button(name).click();await tick()})};
 const root=createRoot(document.getElementById('root'));
 try{
  await act(async()=>{draw(root);await tick()});await click('Download deck');assert.equal(requests[0].options.headers.Authorization,'Bearer token-a');
  await act(async()=>{root.unmount();requests[0].resolve({url:'https://private.example/a-signed'});await tick()});assert.equal(urls,0,'Unmounted download may not expose an old private URL');
  const second=createRoot(document.getElementById('root'));await act(async()=>{draw(second);await tick()});
  await act(async()=>{button('Buy this deck').click();button('Buy this deck').click();await tick()});assert.equal(requests.length,2,'Duplicate checkout must be locked');
  current=session('b');await act(async()=>{requests[1].resolve({url:'https://checkout.stripe.com/c/pay/a'});await tick()});assert.equal(urls,0,'Latest session protects even without auth callback');
  await act(async()=>{callback('SIGNED_IN',current);await tick()});await click('Download deck');
  await act(async()=>{current=session('a');callback('SIGNED_IN',current);current=session('b');callback('SIGNED_IN',current);await tick()});
  await act(async()=>{requests[2].resolve({url:'https://private.example/b-old-signed'});await tick()});assert.equal(urls,0,'A/B/A invalidates the original signed download');
  await click('Download deck');await act(async()=>{requests[3].resolve({url:'https://private.example/current-b'});await tick()});assert.equal(urls,1,'Stable eligible request reaches download URL validation');
  // Owner upload is a split operation. A completed Storage upload must not publish as a later account.
  const fileInput=document.querySelector('input[type=file]');Object.defineProperty(fileInput,'files',{configurable:true,value:[new window.File(['deck'],'qa.pdf',{type:'application/pdf'})]});
  await act(async()=>{fileInput.dispatchEvent(new window.Event('change',{bubbles:true}));[...document.querySelectorAll('input[type=checkbox]')].find(x=>x.parentElement.textContent.includes('hold the rights')).click()});
  await act(async()=>{document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));await tick()});assert.equal(requests[4].path,'/api/deck-products/upload');
  await act(async()=>{requests[4].resolve({bucket:'private-decks',path:'b/qa.pdf',token:'signed-token',ticket:'ticket'});await tick()});assert.equal(uploads,1);
  await act(async()=>{current=session('a');callback('SIGNED_IN',current);releaseStorage();await tick()});assert.equal(requests.length,5,'No publish API may follow an upload from an older account epoch');assert(!document.body.textContent.includes('Premium deck line published'));
  await click('Save home spotlight');assert.equal(requests[5].path,'/api/home/featured');await act(async()=>{current=session('b');callback('SIGNED_IN',current);requests[5].resolve({ok:true});await tick()});assert(!document.body.textContent.includes('Home restored to the three MTG staples.'));
  await act(async()=>second.unmount());
  console.log('PASS premium deck scope: stale private download/unmount, duplicate checkout, missing-event session recheck, A/B/A invalidation, stable download, split Storage-upload/publish account protection and stale owner spotlight response (simulated DOM/providers).');
 }finally{global.fetch=oldFetch;global.URL=OldURL}
}
run().catch(e=>{console.error(e);process.exitCode=1});
