import React,{act} from 'react';import {createRoot} from 'react-dom/client';import assert from 'node:assert/strict';import DeviceArtworkStudio from '../src/DeviceArtworkStudio.jsx';
async function run(){
 const root=createRoot(document.getElementById('root')),workers=[];let picked=[],cleared=0,fetches=0;
 const originalFetch=global.fetch;global.fetch=()=>{fetches++;throw Error('Device UI must not call inference/billing APIs')};
 global.ImageData=class{constructor(data,width,height){Object.assign(this,{data,width,height})}};
 const getContext=window.HTMLCanvasElement.prototype.getContext,toDataURL=window.HTMLCanvasElement.prototype.toDataURL;
 window.HTMLCanvasElement.prototype.getContext=()=>({putImageData(){}});window.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/png;base64,AAAA';
 class FakeWorker{constructor(){this.terminated=0;workers.push(this)}postMessage(job){this.job=job}terminate(){this.terminated++}send(data){this.onmessage?.({data:{id:this.job.id,...data}})}}
 const props={contextKey:'a:card',supportCheck:async()=>({supported:true,message:'GPU features detected'}),workerFactory:()=>new FakeWorker(),clearCache:async()=>cleared++,onPick:value=>picked.push(value)};
 const render=async extra=>{await act(async()=>root.render(<DeviceArtworkStudio {...props} {...extra}/>))};
 const input=async text=>{const el=document.querySelector('textarea');await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(el,text);el.dispatchEvent(new window.Event('input',{bubbles:true}))})};
 const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent===text);
 const click=async text=>{assert(button(text),text);await act(async()=>button(text).click())};
 const begin=async()=>{await input('A private fantasy dragon');if(!document.querySelector('input[type=checkbox]').checked)await act(async()=>document.querySelector('input[type=checkbox]').click());await click('Generate 3 choices on this device')};
 const results=()=>Array.from({length:3},(_,seed)=>({pixels:new Uint8ClampedArray(512*512*4),width:512,height:512,seed}));
 try{
  await render({});await input('A dragon');assert(button('Generate 3 choices on this device').disabled,'no model download without consent');assert.equal(workers.length,0);
  await begin();const first=workers[0];assert.equal(first.job.type,'generate');assert.equal(first.job.prompt,'A private fantasy dragon');assert.equal(fetches,0);
  await act(async()=>first.send({id:'wrong-job',type:'complete',images:results()}));assert.equal(document.querySelectorAll('.art-choice-grid img').length,0);
  await act(async()=>first.send({type:'progress',loaded:1,total:2,message:'Reading model…'}));assert.equal(document.querySelector('progress').value,1);
  await act(async()=>first.send({type:'complete',images:results()}));assert.equal(document.querySelectorAll('.art-choice-grid img').length,3);assert(first.terminated>0);await click('Use option 2');assert.equal(picked.length,1);
  await begin();const canceled=workers[1];await click('Cancel generation');assert(canceled.terminated>0);await act(async()=>canceled.send({type:'complete',images:results()}));assert.equal(document.querySelectorAll('.art-choice-grid img').length,0);assert.match(document.body.textContent,/Generation canceled/);
  await begin();const old=workers[2];await render({contextKey:'b:card'});assert(old.terminated>0);assert.equal(document.querySelector('textarea').value,'');assert(!document.querySelector('input[type=checkbox]').checked);await act(async()=>old.send({type:'complete',images:results()}));assert.equal(document.querySelectorAll('.art-choice-grid img').length,0);
  await begin();const invalid=workers[3];await act(async()=>invalid.send({type:'complete',images:[{}]}));assert(document.querySelector('[role=alert]'));assert.equal(document.querySelectorAll('.art-choice-grid img').length,0);
  await click('Remove downloaded model');assert.equal(cleared,1);assert.equal(fetches,0,'device UI never invokes cloud or credit APIs');
  await render({contextKey:'unsupported',supportCheck:async()=>({supported:false,message:'GPU unsupported'})});assert(button('Generate 3 choices on this device').disabled);assert.match(document.body.textContent,/GPU unsupported/);
  console.log('PASS device artwork UI: guest generation consent, three choices/apply, job IDs, bounded progress, cancel/late-result rejection, account/card privacy reset, invalid-output recovery, unsupported hardware and cache controls without API/credit calls (mock Worker/canvas).');
 }finally{global.fetch=originalFetch;window.HTMLCanvasElement.prototype.getContext=getContext;window.HTMLCanvasElement.prototype.toDataURL=toDataURL;await act(async()=>root.unmount())}
}
run().catch(e=>{console.error(e);process.exitCode=1});
