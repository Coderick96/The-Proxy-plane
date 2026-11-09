import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import assert from 'node:assert/strict';
import App from '../src/App.jsx';
async function run(){
 const store=new Map();global.localStorage=window.localStorage;
 global.indexedDB={open(){const req={};const db={transaction(){const tx={objectStore(){return {get(k){const r={};queueMicrotask(()=>{r.result=store.get(k);r.onsuccess?.()});return r},put(v,k){store.set(k,structuredClone(v));queueMicrotask(()=>tx.oncomplete?.())}}}};return tx}};queueMicrotask(()=>{req.result=db;req.onsuccess?.()});return req}};
 const calls=[];let deferred=null,hold=false;
 const card=id=>({id,name:id,set:'blb',set_name:'Bloomburrow'});
 global.fetch=(url,options)=>{calls.push({url:String(url),options});if(hold)return new Promise(resolve=>{deferred=resolve});return Promise.resolve({ok:true,json:async()=>({data:[card('Matched card')],has_more:true,next_page:'https://api.scryfall.com/cards/search?q=set%3Ablb&page=2'})});};
 const root=createRoot(document.getElementById('root'));
 const click=async selector=>{const el=document.querySelector(selector);assert(el,selector);await act(async()=>el.click())};
 const button=async text=>{const el=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text);assert(el,text);await act(async()=>el.click())};
 const input=async(selector,value)=>{const el=document.querySelector(selector);assert(el);await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new window.Event('input',{bubbles:true}))});};
 const submit=async()=>{await act(async()=>document.querySelector('.library-search').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})))};
 try{
  await act(async()=>root.render(<App backend={null}/>));await click('.hamburger-btn');await click('.main-nav button:nth-child(2)');assert.equal(new URL(calls.at(-1).url).searchParams.get('q'),'game:paper');assert.equal(new URL(calls.at(-1).url).searchParams.get('unique'),'cards');assert.equal(document.querySelector('.card-search-filters').open,false);await click('.card-search-filters summary');assert.equal(document.querySelector('.card-search-filters').open,true);
  await act(async()=>{const s=document.querySelector('.card-set-fields select');s.value='blb';s.dispatchEvent(new window.Event('change',{bubbles:true}))});
  await button('Blue');await button('Rare');await button('Mythic rare');await submit();
  assert.equal(new URL(calls.at(-1).url).searchParams.get('q'),'set:blb (c:u) (r:rare or r:mythic)');
  await input('.searchbar input','t:dragon or t:angel');await submit();
  assert.equal(new URL(calls.at(-1).url).searchParams.get('q'),'(t:dragon or t:angel) set:blb (c:u) (r:rare or r:mythic)');
  // Editing filters cannot silently alter the loaded pagination query.
  await button('Green');await button('Load more cards');assert.equal(new URL(calls.at(-1).url).searchParams.get('q'),'set:blb');
  await input('.card-set-fields input','Bloomburrow');await button('Clear results');
  assert.equal(document.querySelector('.card-set-fields input').value,'');assert.equal(document.querySelector('.searchbar input').value,'');assert.equal(document.querySelector('.card-set-fields select').value,'');
  assert.equal(document.querySelectorAll('.card-filter-chip[aria-pressed=true]').length,0);
  await submit();assert.equal(new URL(calls.at(-1).url).searchParams.get('q'),'game:paper');
  hold=true;await submit();const pending=calls.at(-1);await button('Clear results');assert.equal(pending.options.signal.aborted,true);
  await act(async()=>deferred({ok:true,json:async()=>({data:[card('Stale card')],has_more:true,next_page:'https://api.scryfall.com/cards/search?page=2'})}));assert.equal(document.querySelectorAll('.result-card').length,0);assert(!document.body.textContent.includes('Stale card'));
  hold=false;await submit();hold=true;await button('Load more cards');const oldPage=deferred;await button('Clear results');hold=false;await submit();
  await act(async()=>oldPage({ok:true,json:async()=>({data:[card('Old page card')],has_more:false})}));assert(!document.body.textContent.includes('Old page card'));assert.equal(document.querySelectorAll('.result-card').length,1);
  await click('.card-search-filters summary');await button('Blue');await button('Reset filters');assert.equal(document.querySelectorAll('.card-filter-chip[aria-pressed=true]').length,0);
  console.log('PASS actual Card Library: filter-only/advanced queries, draft filters preserve loaded pagination, clear resets controls and aborts requests, stale search/page suppression, browse-all and reset (mock Scryfall).');
 }finally{await act(async()=>root.unmount())}
}
run().catch(error=>{console.error(error);process.exitCode=1});
