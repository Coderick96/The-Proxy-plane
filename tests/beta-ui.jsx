import React,{act}from 'react';import {createRoot}from 'react-dom/client';import assert from 'node:assert/strict';import BetaGate from '../src/BetaGate.jsx';import BetaDesk from '../src/BetaDesk.jsx';
async function run(){
globalThis.localStorage=window.localStorage;
const root=createRoot(document.getElementById('root'));let callback,allowed=false;const calls=[];
const client={auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:fn=>{callback=fn;return {data:{subscription:{unsubscribe(){}}}}},signOut:async()=>callback('SIGNED_OUT',null)}};
const request=async(_client,path,body)=>{calls.push([path,body]);if(path==='/api/beta/status')return {enabled:true,allowed,owner:true,aiEnabled:false,testBilling:false};if(path==='/api/beta/roster')return {seats:[{slot:1,email:'tester@example.test',user_id:null}]};if(path==='/api/beta/feedback'&&!body)return {items:[]};return {id:'test-report',saved:true}};
const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent===text);
async function input(label,value){const node=[...document.querySelectorAll('label')].find(n=>n.textContent.startsWith(label)).querySelector('input,textarea,select');const proto=node.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:node.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype;await act(async()=>{Object.getOwnPropertyDescriptor(proto,'value').set.call(node,value);node.dispatchEvent(new window.Event(node.tagName==='SELECT'?'change':'input',{bubbles:true}))})}
await act(async()=>root.render(<BetaGate client={client} request={request} privateBeta/>));assert(document.body.textContent.includes('PRIVATE BETA'));assert(!document.querySelector('.app-shell'));
allowed=true;await act(async()=>button('Retry connection').click());await act(async()=>button('Beta desk · feedback').click());assert(document.body.textContent.includes('10 tester slots'));assert.equal(document.querySelectorAll('.beta-roster article').length,10);
await input('Title','Printing spacing issue');await input('Steps, expected','I selected custom spacing but it did not change.');await act(async()=>document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));assert.equal(calls.find(([p,b])=>p==='/api/beta/feedback'&&b)[1].title,'Printing spacing issue');assert(document.body.textContent.includes('Report saved'));
await act(async()=>root.render(<BetaDesk client={client} request={request} owner={false}/>));assert(!document.body.textContent.includes('10 tester slots'));assert(!document.body.textContent.includes('tester@example.test'));
await act(async()=>root.render(<BetaGate client={null} privateBeta/>));assert(document.body.textContent.includes('Account setup is incomplete'));assert(!document.querySelector('.app-shell'));
await act(async()=>root.unmount());console.log('Passed beta sign-in wall, 10-slot owner roster, private tester feedback form and missing-config closure (simulated DOM).');

}
run().catch(e=>{console.error(e);process.exitCode=1});
