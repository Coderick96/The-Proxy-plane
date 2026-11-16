import {uuid} from './uuid.js';
export const PRINT_HISTORY_LIMIT=3;
export function rememberPrint(history,cards,settings,{id=uuid(),createdAt=new Date().toISOString()}={}){
 if(!cards.length)return history;
 const entry=structuredClone({id,createdAt,cards,settings});
 return [entry,...history].slice(0,PRINT_HISTORY_LIMIT);
}
export function printingImage(card,face=0){return card.card_faces?.[face]?.image_uris?.large||card.card_faces?.[face]?.image_uris?.normal||card.image_uris?.large||card.image_uris?.normal||'';}
export function replacePrinting(queue,id,printing,face=0){
 const image=printingImage(printing,face);
 if(!image)throw new Error('This printing has no printable image. Choose another printing.');
 return queue.map(card=>card.id===id?{...card,kind:'original',name:printing.card_faces?.[face]?.name||printing.name,image,source:printing,set:printing.set_name||printing.set||'',collector:printing.collector_number||'',faceIndex:face}:card);
}
