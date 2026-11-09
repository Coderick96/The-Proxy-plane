import {parseDeckList,validateEntries} from '../src/deckImport.js';
export function deckSource(value){
 let u;try{u=new URL(value)}catch{throw new Error('Paste a complete public deck URL, starting with https://.');}
 if(u.protocol!=='https:'||u.username||u.password||u.port)throw new Error('Use a public HTTPS deck URL without credentials or a custom port.');
 const host=u.hostname.replace(/^www\./,'');let match;
 if(host==='archidekt.com'&&(match=u.pathname.match(/^\/decks\/(\d+)(?:\/[^/]*)?\/?$/)))return {provider:'Archidekt',url:`https://archidekt.com/api/decks/${match[1]}/`,format:'archidekt'};
 if(host==='moxfield.com'&&(match=u.pathname.match(/^\/decks\/([A-Za-z0-9_-]{10,64})\/?$/)))return {provider:'Moxfield',url:`https://api2.moxfield.com/v2/decks/all/${match[1]}`,format:'moxfield'};
 if(host==='tappedout.net'&&(match=u.pathname.match(/^\/mtg-decks\/([A-Za-z0-9_-]{1,180})\/?$/)))return {provider:'TappedOut',url:`https://tappedout.net/mtg-decks/${match[1]}/?fmt=txt`,format:'text'};
 if(host==='mtggoldfish.com'&&(match=u.pathname.match(/^\/deck\/(?:download\/)?(\d+)\/?$/)))return {provider:'MTGGoldfish',url:`https://www.mtggoldfish.com/deck/download/${match[1]}`,format:'text'};
 throw new Error('Supported URLs: public Moxfield, Archidekt, TappedOut and MTGGoldfish decks. For other sites, export a text list and paste it in the List tab.');
}
const knownBoard=value=>/commander|companion/i.test(value)?'commander':/sideboard/i.test(value)?'sideboard':/maybe|consider/i.test(value)?'maybeboard':/token/i.test(value)?'tokens':null;
export function normalizeRemoteDeck(source,data){
 const entries=[];
 if(source.format==='archidekt'){
  if(data.private)throw new Error('This deck is private. Export its list yourself and use the List tab.');
  if(!Array.isArray(data.cards))throw new Error('Archidekt returned an unsupported deck format. Paste its text export instead.');
  const categories=new Map((data.categories||[]).map(c=>[c.name,c]));
  for(const [i,r] of data.cards.entries()){if(r.deletedAt)continue;const labels=r.categories||[];let board=labels.map(knownBoard).find(Boolean)||'main';if(board==='main'&&labels.length&&labels.every(n=>categories.get(n)?.includedInDeck===false))board='maybeboard';const c=r.card||{};entries.push({key:'arch-'+i,name:c.oracleCard?.name||c.name,count:r.quantity,board,set:c.edition?.editioncode||'',collector:c.collectorNumber||'',scryfallId:c.uid});}
 }else if(source.format==='moxfield'){
  if(data.visibility==='private')throw new Error('This deck is private. Use its text export instead.');
  let found=false;for(const [key,board] of [['mainboard','main'],['commanders','commander'],['companions','commander'],['sideboard','sideboard'],['maybeboard','maybeboard'],['tokens','tokens']]){const section=data[key]||data.boards?.[key]?.cards;if(!section)continue;found=true;for(const [i,r] of Object.values(section).entries()){const c=r.card||(board==='tokens'?r:{});entries.push({key:key+'-'+i,name:c.name,count:r.quantity??(board==='tokens'?1:undefined),board,set:c.set||'',collector:c.cn||c.collector_number||'',scryfallId:c.scryfall_id});}}
  if(!found)throw new Error('Moxfield returned an unsupported deck format. Paste its text export instead.');
 }
 return {title:typeof data.name==='string'?data.name.slice(0,160):source.provider+' deck',entries:validateEntries(entries),issues:[]};
}
export async function fetchDeck(value,{fetcher=fetch}={}){
 const source=deckSource(value);let r;try{r=await fetcher(source.url,{headers:{Accept:source.format==='text'?'text/plain':'application/json','User-Agent':'TheProxyPlane/2.3 (public deck import)'},redirect:'manual',signal:AbortSignal.timeout(15000)});}catch(e){if(e.name==='TimeoutError')throw e;throw new Error(`${source.provider} could not be reached. Paste its text export instead.`);}
 if(!r.ok)throw new Error(`${source.provider} could not provide this public deck (${r.status}). Private, removed or blocked decks can be imported using a pasted text export.`);
 let body='';if(r.body){const chunks=[];let bytes=0;for await(const chunk of r.body){bytes+=chunk.byteLength;if(bytes>2097152){await r.body.cancel?.().catch(()=>{});throw new Error('Deck response is too large. Use a text export.');}chunks.push(Buffer.from(chunk));}body=Buffer.concat(chunks).toString('utf8');}else body=await r.text();
 if(body.length>2097152||/^\s*</.test(body))throw new Error(`${source.provider} returned a webpage instead of a deck export. Use the List tab with its text export.`);
 if(source.format==='text'){const parsed=parseDeckList(body);return {provider:source.provider,title:source.provider+' deck',...parsed};}
 let data;try{data=JSON.parse(body)}catch{throw new Error('The deck site returned invalid data. Paste a text export instead.');}return {provider:source.provider,...normalizeRemoteDeck(source,data)};
}
