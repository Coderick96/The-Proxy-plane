import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import assert from 'node:assert/strict';
import LiveSpacingPreview from '../src/LiveSpacingPreview.jsx';
import {getLayout} from '../src/printSettings.js';

async function run(){
 const root=createRoot(document.getElementById('root'));
 for(const bleed of [0,.0625,.125]){
  const layout=getLayout(8.5,11,.25,bleed);
  // Empty and populated queues both render the spacing map without violating
  // the immutable trim size. Previously the empty-cell pass omitted bleed.
  for(const sheet of [undefined,{side:'front',cards:[{slot:0,card:{id:'one'}}]}]){
   await act(async()=>root.render(<LiveSpacingPreview layout={layout} width={8.5} height={11} bleed={bleed} gap={0} onGap={()=>{}} sheet={sheet}/>));
   assert.equal(document.querySelectorAll('.spacing-map').length,1);
   assert.match(document.querySelector('output').textContent,new RegExp(`${layout.capacity} cards / sheet`));
   if(bleed){
    const trim=[...document.querySelectorAll('.spacing-map rect')].filter(r=>r.getAttribute('stroke')==='#7b8879');
    assert.equal(trim.length,sheet?1:layout.capacity);
    for(const rect of trim){assert.equal(rect.getAttribute('width'),'2.5');assert.equal(rect.getAttribute('height'),'3.5');}
   }
  }
 }
 await act(async()=>root.unmount());
 console.log('Spacing preview regression passed: empty/populated queues at no bleed, 1/16 and 1/8 inch bleed; trim remains 2.5 × 3.5 inches.');
}
run().catch(error=>{console.error(error);process.exitCode=1});
