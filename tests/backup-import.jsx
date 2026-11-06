import React,{act} from 'react';import {createRoot} from 'react-dom/client';import assert from 'node:assert/strict';import App from '../src/App.jsx';
import {validateBackup,mergeBackup} from '../src/backupImport.js';
async function run(){
 const record=(id,name)=>({id,name,frame:'modern',art:'',rules:'Private draft',visibility:'private',layers:{},customLayers:[]});
 const a=record('a-card','Account A private'),b=record('b-card','Account B private');
 const initial={projects:[a],printQueue:[{...a,id:'q1'}],collections:[],templates:[],versions:{},printProfiles:[],deckDraft:{text:'',url:''}};
 for(const invalid of [{projects:[null]},{projects:[a],printQueue:[null]},{collections:[null]},{templates:[{id:'t',name:'T',style:null}]},{versions:{x:[{id:'v',card:null}]}},{printProfiles:[{id:'p',name:'Broken'}]},{deckDraft:[]},{projects:[{...a,name:{bad:true}}]},{projects:[{...a,customLayers:[null]}]},{projects:[{...a,setSymbolSvg:{nodes:[null]}}]}])assert.throws(()=>validateBackup(invalid),/Invalid backup/);
 assert.throws(()=>validateBackup(JSON.parse('{"versions":{"__proto__":[]}}')),/reserved/);
 const restored=mergeBackup(initial,validateBackup({version:4,...initial,projects:[{...a,name:'Older version'},record('new','Imported')]}));assert.equal(restored.projects.length,2);assert.equal(restored.projects[0].name,a.name);assert.equal(restored.printQueue.length,1);
 assert.deepEqual(mergeBackup(restored,validateBackup(initial)),restored);
 const store=new Map([['account:a:projects',[a]],['account:b:projects',[b]],['account:a:printQueue',initial.printQueue]]);
 global.localStorage=window.localStorage;
 global.indexedDB={open(){const request={};const database={transaction(){const tx={objectStore(){return {get(key){const req={};queueMicrotask(()=>{req.result=store.get(key);req.onsuccess?.()});return req},put(value,key){store.set(key,structuredClone(value));queueMicrotask(()=>tx.oncomplete?.())}}}};return tx}};queueMicrotask(()=>{request.result=database;request.onsuccess?.()});return request}};
 let authCallback;const backend={auth:{getSession:async()=>({data:{session:{user:{id:'a'}}}}),onAuthStateChange(cb){authCallback=cb;return {data:{subscription:{unsubscribe(){}}}};}}};
 global.fetch=async()=>({ok:true,json:async()=>({})});
 const root=createRoot(document.getElementById('root'));await act(async()=>root.render(<App backend={backend}/>));
 const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text);
 const print=async()=>{await act(async()=>document.querySelector('.main-nav button:nth-child(7)').click());return document.querySelector('.projects-panel input[type=file]')};
 const start=(input,text)=>{Object.defineProperty(input,'files',{value:[{text}],configurable:true});input.dispatchEvent(new window.Event('change',{bubbles:true}));};
 // Reproduction 1: delayed read under A must never write B (or revive after B -> A).
 let resolve;let input=await print();await act(async()=>start(input,()=>new Promise(r=>resolve=r)));
 await act(async()=>authCallback('SIGNED_IN',{user:{id:'b'}}));const beforeB=structuredClone([...store]);
 await act(async()=>resolve(JSON.stringify({projects:[record('leak','Private A backup')]})));assert.deepEqual([...store],beforeB);assert(!document.body.textContent.includes('Private A backup'));
 await act(async()=>authCallback('SIGNED_IN',{user:{id:'a'}}));input=await print();await act(async()=>start(input,()=>new Promise(r=>resolve=r)));
 await act(async()=>authCallback('SIGNED_IN',{user:{id:'b'}}));await act(async()=>authCallback('SIGNED_IN',{user:{id:'a'}}));const beforeA=structuredClone([...store]);
 await act(async()=>resolve(JSON.stringify({projects:[record('stale','Stale A backup')]})));assert.deepEqual([...store],beforeA);
 // Reproduction 2: repeated restore keeps one project and one queue ID; removing it removes only it.
 input=await print();const backup={version:4,...initial,printQueue:[...initial.printQueue,{...a,id:'q2'}]};
 for(let i=0;i<2;i++)await act(async()=>start(input,async()=>JSON.stringify(backup)));
 assert.equal(store.get('account:a:projects').length,1);assert.equal(store.get('account:a:printQueue').length,2);
 await act(async()=>document.querySelector('.queue-item button[title=Remove]').click());assert.deepEqual(store.get('account:a:printQueue').map(c=>c.id),['q2']);
 // Reproduction 3: invalid late sections must not partially import valid earlier sections.
 const snapshot=structuredClone([...store]);
 for(const malformed of [{projects:[null]},{projects:[record('partial','Do not commit')],templates:[null]},{projects:[record('partial','Do not commit')],versions:[]},{projects:[{...a,layers:[]}]}]){
  await act(async()=>start(input,async()=>JSON.stringify(malformed)));assert.deepEqual([...store],snapshot);assert(document.body.textContent.includes('Invalid backup:'));assert(document.querySelector('.main-nav'));
 }
 // A newer file selection supersedes an older pending read in the same account.
 let oldRead;await act(async()=>start(input,()=>new Promise(r=>oldRead=r)));
 await act(async()=>start(input,async()=>JSON.stringify({projects:[record('latest','Latest selected file')]})));
 await act(async()=>oldRead(JSON.stringify({projects:[record('obsolete','Older selected file')]})));
 assert(store.get('account:a:projects').some(c=>c.id==='latest'));assert(!store.get('account:a:projects').some(c=>c.id==='obsolete'));
 // A subsequent valid legacy backup still imports; cancelled picker is harmless.
 await act(async()=>start(input,async()=>JSON.stringify({projects:[record('valid','Valid legacy restore')]})));assert(store.get('account:a:projects').some(c=>c.id==='valid'));
 Object.defineProperty(input,'files',{value:[],configurable:true});await act(async()=>input.dispatchEvent(new window.Event('change',{bubbles:true})));
 await act(async()=>root.unmount());console.log('Passed actual backup import account switch + A/B/A generation isolation, idempotent restore/conflict rule, unique queue removal, atomic nested validation and legacy recovery (simulated DOM).');
}run().catch(error=>{console.error(error);process.exitCode=1});
