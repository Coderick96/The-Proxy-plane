import {FREE_ACCESS,ownsPack} from './premiumCatalog.js';
export function resolveBack(card, fallback={mode:'none'},assets={},access=FREE_ACCESS) {
 const own=card?.back;
 const back=own&&own.mode!=='inherit'?own:fallback;
 return back?.mode==='classic'?{mode:'classic',image:'/proxy-plane-back.svg'}:back?.mode==='pack'?{mode:'pack',image:ownsPack(access,back.pack)?assets[back.pack+'/'+back.design]||'':'',missing:!ownsPack(access,back.pack)||!assets[back.pack+'/'+back.design]}:back?.mode==='custom'&&back.image?{mode:'custom',image:access.studio?back.image:'',missing:!access.studio}:{mode:'none',image:''};
}
export function backSlot(slot,cols,rows,flip='long',landscape=false){
 const horizontal=(flip==='long')!==landscape;
 const row=Math.floor(slot/cols),col=slot%cols;
 return horizontal?row*cols+cols-1-col:(rows-1-row)*cols+col;
}
export function printPages(queue,layout,{output='fronts',back={mode:'none'},flip='long',landscape=false,assets={},access=FREE_ACCESS}={}){
 if(!layout.capacity)return [];
 const pages=[];
 for(let start=0;start<queue.length;start+=layout.capacity){
  const cards=queue.slice(start,start+layout.capacity);
  if(output!=='backs')pages.push({side:'front',sheet:start/layout.capacity+1,cards:cards.map((card,slot)=>({card,slot}))});
  if(output!=='fronts')pages.push({side:'back',sheet:start/layout.capacity+1,cards:cards.map((card,slot)=>({card,slot:backSlot(slot,layout.cols,layout.rows,flip,landscape),back:resolveBack(card,back,assets,access)}))});
 }
 return pages;
}
