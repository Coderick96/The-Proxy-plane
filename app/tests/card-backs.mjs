import assert from 'node:assert/strict';
import {resolveBack,backSlot,printPages} from '../src/cardBacks.js';
import {getLayout} from '../src/printSettings.js';
const classic={mode:'classic'};
assert.equal(resolveBack({},classic).mode,'classic');
assert.equal(resolveBack({back:{mode:'inherit'}},classic).mode,'classic');
assert.equal(resolveBack({back:{mode:'none'}},classic).mode,'none');
assert(resolveBack({back:{mode:'custom',image:'private-upload'}},classic).missing);assert.equal(resolveBack({back:{mode:'custom',image:'private-upload'}},classic,{}, {studio:true}).image,'private-upload');
assert.equal(resolveBack({back:{mode:'custom'}},classic).mode,'none');
for(const landscape of [false,true])for(const flip of ['long','short']){
 const layout=getLayout(landscape?11:8.5,landscape?8.5:11);
 const slots=Array.from({length:layout.capacity},(_,i)=>backSlot(i,layout.cols,layout.rows,flip,landscape));
 assert.equal(new Set(slots).size,layout.capacity);
 for(let i=0;i<slots.length;i++)assert.equal(backSlot(slots[i],layout.cols,layout.rows,flip,landscape),i);
 const horizontal=(flip==='long')!==landscape;
 assert.equal(slots[0],horizontal?layout.cols-1:(layout.rows-1)*layout.cols);
 const queue=Array.from({length:layout.capacity+2},(_,i)=>({id:String(i),back:i===0?{mode:'none'}:undefined}));
 const pages=printPages(queue,layout,{output:'both',back:classic,flip,landscape});
 assert.deepEqual(pages.map(p=>p.side),['front','back','front','back']);
 assert.equal(pages[3].cards.length,2);
 for(let p=0;p<pages.length;p+=2)for(let i=0;i<pages[p].cards.length;i++){
  assert.equal(pages[p].cards[i].card.id,pages[p+1].cards[i].card.id);
  assert.equal(pages[p+1].cards[i].slot,slots[i]);
 }
 assert.equal(pages[1].cards[0].back.mode,'none');
 assert.equal(pages[1].cards[1].back.mode,'classic');
 assert.equal(pages[1].cards[2].back.mode,'classic');
 assert.equal(printPages(queue,layout).length,2);
 assert.deepEqual(printPages(queue,layout,{output:'backs'}).map(p=>p.side),['back','back']);
}
assert.deepEqual(printPages([],{capacity:9}),[]);
assert.deepEqual(printPages([{}],{capacity:0}),[]);
console.log('Passed backing inheritance/overrides, unsupported backing rejection, portrait/landscape edge mapping, paired partial sheets and fronts/backs-only page order.');
