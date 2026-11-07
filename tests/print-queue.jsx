import React,{act,useState} from 'react';
import {createRoot} from 'react-dom/client';
import assert from 'node:assert/strict';
import PrintSheet from '../src/PrintSheet.jsx';
import {printPages} from '../src/cardBacks.js';
import {getLayout} from '../src/printSettings.js';
const layout=getLayout(8.5,11);let current;
function Harness(){const [cards,setCards]=useState([{id:'a',name:'Alpha'},{id:'b',name:'Beta'}]);current=cards;return printPages(cards,layout,{output:'both',back:{mode:'standard'}}).map((sheet,i)=><PrintSheet key={i} sheet={sheet} layout={layout} paperWidth={8.5} paperHeight={11} renderFront={c=><span>{c.name}</span>} onRemove={id=>setCards(q=>q.filter(c=>c.id!==id))}/>)}
async function run(){
const root=createRoot(document.getElementById('root'));await act(async()=>root.render(<Harness/>));
assert.equal(document.querySelectorAll('.print-cell').length,4);
await act(async()=>document.querySelector('[aria-label="Remove Alpha from print queue"]').click());
assert.deepEqual(current.map(c=>c.id),['b']);assert.equal(document.querySelectorAll('.print-cell').length,2);
assert.equal(document.querySelectorAll('[data-print-control]').length,2);
await act(async()=>document.querySelector('[data-print-control]').click());assert.equal(document.querySelectorAll('.paper').length,0);
await act(async()=>root.unmount());console.log('Queue UI passed: preview removal updates fronts, paired backs, and empty queue.');

}
run().catch(e=>{console.error(e);process.exitCode=1});
