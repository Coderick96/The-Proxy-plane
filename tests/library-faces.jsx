import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import assert from 'node:assert/strict';
import App from '../src/App.jsx';
async function run(){
const card={id:'double-faced',name:'Day // Night',set:'tst',set_name:'Fixture',card_faces:[{name:'Day',type_line:'Creature — Human',oracle_text:'Front rules',power:'1',toughness:'1',image_uris:{large:'https://example.invalid/day.png',art_crop:'https://example.invalid/day-art.png'}},{name:'Night',type_line:'Creature — Wolf',oracle_text:'Back rules',power:'3',toughness:'3',image_uris:{large:'https://example.invalid/night.png',art_crop:'https://example.invalid/night-art.png'}}]};
const store=new Map();
global.localStorage=window.localStorage;
global.indexedDB={open(){const req={};const db={transaction(){const tx={objectStore(){return {get(k){const r={};queueMicrotask(()=>{r.result=store.get(k);r.onsuccess?.()});return r},put(v,k){store.set(k,structuredClone(v));queueMicrotask(()=>tx.oncomplete?.())}}}};return tx}};queueMicrotask(()=>{req.result=db;req.onsuccess?.()});return req}};
global.fetch=async()=>({ok:true,json:async()=>({data:[card],has_more:false})});
const root=createRoot(document.getElementById('root'));
const click=async selector=>{const el=document.querySelector(selector);assert(el,selector);await act(async()=>el.click())};
try{
 await act(async()=>root.render(<App backend={null}/>));
 await click('.hamburger-btn');await click('.main-nav button:nth-child(2)');
 const search=document.querySelector('.searchbar input');
 await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(search,'Day');search.dispatchEvent(new window.Event('input',{bubbles:true}));});
 await act(async()=>document.querySelector('.searchbar').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));
 await click('.card-image-button');
 const select=document.querySelector('.selected-face select');assert(select);
 await act(async()=>{select.value='1';select.dispatchEvent(new window.Event('change',{bubbles:true}))});
 assert.match(document.querySelector('.selected-face img').src,/night.png$/);
 await click('.printings-actions .secondary');
 assert.equal(store.get('printQueue')[0].name,'Night');assert.match(store.get('printQueue')[0].image,/night.png$/);
 // The generic result buttons must always start from face zero, independent of selection.
 await click('.result-actions button:last-child');
 assert.equal(store.get('printQueue')[1].name,'Day');assert.match(store.get('printQueue')[1].image,/day.png$/);
 await click('.printings-actions .primary');
 assert.equal(store.get('draft').name,'Night');assert.equal(store.get('draft').power,'3');assert.match(store.get('draft').art,/night-art.png$/);
 console.log('PASS: library reverse-face preview, queue and editable import; result-grid actions do not inherit another selected face.');
}finally{await act(async()=>root.unmount())}

}
run().catch(error=>{console.error(error);process.exitCode=1});
