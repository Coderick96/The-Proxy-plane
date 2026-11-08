import {uuid as createUUID} from './uuid.js';
export const workspaceScope=user=>user?.id?`account:${user.id}:`:'';
export function cloneGuestWork(guestCards,guestCollections,cards,collections,uuid=()=>createUUID(),limit=1000){
 const copied=new Set(cards.map(c=>c.guestSourceId).filter(Boolean));const nextCollections=[...collections];const ids=new Map();
 for(const c of guestCollections){let existing=nextCollections.find(x=>x.guestSourceId===c.id);if(!existing){existing={id:uuid(),name:c.name,visibility:'private',guestSourceId:c.id};nextCollections.push(existing);}ids.set(c.id,existing.id);}
 const nextCards=guestCards.filter(c=>!copied.has(c.id)).map(c=>{const {artStoragePath,...rest}=c;return {...rest,id:uuid(),guestSourceId:c.id,collectionId:ids.get(c.collectionId)||null,visibility:'private',publishedAt:null,cloudOwnerId:null,savedAt:new Date().toISOString()};});
 const accepted=nextCards.slice(0,Math.max(0,limit-cards.length));return {cards:[...accepted,...cards],collections:nextCollections,added:accepted.length};
}
