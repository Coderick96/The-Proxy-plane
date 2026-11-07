export const BOARDS=['main','commander','sideboard','maybeboard','tokens'];
export const MAX_DECK_COPIES=1000;
const boardName=value=>{const s=value.toLowerCase().replace(/[\[\]:]/g,'').trim();return /^(commander|commanders|companion|companions)$/.test(s)?'commander':/^(sideboard|side board)$/.test(s)?'sideboard':/^(maybeboard|maybe board|considering|considerations)$/.test(s)?'maybeboard':/^tokens?$/.test(s)?'tokens':/^(main|mainboard|main deck|maindeck|deck)$/.test(s)?'main':null};
export function parseDeckList(text){
 if(typeof text!=='string'||text.length>200000)throw new Error('Use a decklist under 200,000 characters.');
 const entries=[],issues=[];let board='main';
 for(const [index,raw] of text.replace(/^\uFEFF/,'').split(/\r?\n/).entries()){
  let line=raw.trim();if(!line||line.startsWith('#'))continue;
  if(/^(creatures?|artifacts?|enchantments?|instants?|sorceries|lands?|planeswalkers?|battles?|spells?)(?:\s*\(\d+\))?:?$/i.test(line.replace(/[\[\]]/g,''))){board='main';continue;}
  const heading=boardName(line);if(heading){board=heading;continue;}
  if(line.startsWith('//')){const b=boardName(line.slice(2).trim().replace(/^\d+\s+/,''));if(b)board=b;continue;}
  if(/^(?:\/\/|https?:\/\/|<)/i.test(line)){issues.push({line:index+1,text:raw,message:'Expected a card line. Paste URLs in the URL tab.'});continue;}
  let rowBoard=board;if(/^SB:\s*/i.test(line)){rowBoard='sideboard';line=line.replace(/^SB:\s*/i,'');}
  if(/\*(?:CMDR|COMMANDER)\*/i.test(line))rowBoard='commander';
  line=line.replace(/\s+\*(?:F|E|CMDR|COMMANDER)\*/gi,'').replace(/\s+#!?[^\s]+/g,'').trim();
  let count=1;const qty=line.match(/^(\d+)\s*x?\s+(.+)$/i)||line.match(/^(\d+)x\s*(.+)$/i);if(qty){count=Number(qty[1]);line=qty[2].trim();}
  if(!Number.isInteger(count)||count<1||count>MAX_DECK_COPIES||/^\d+\s*$/.test(line)||!line){issues.push({line:index+1,text:raw,message:'Use a quantity from 1 to 1,000 followed by a card name.'});continue;}
  let set='',collector='';const printing=line.match(/\s+\(([a-z0-9]{2,8})\)(?:\s+([\w★†-]+))?$/i)||line.match(/\s+\[([a-z0-9]{2,8})(?::([\w★†-]+))?\]$/i);
  if(printing){set=printing[1].toLowerCase();collector=printing[2]||'';line=line.slice(0,printing.index).trim();}
  if(!line){issues.push({line:index+1,text:raw,message:'Card name is missing.'});continue;}
  entries.push({key:'line-'+index,line:index+1,name:line,count,board:rowBoard,set,collector});
 }
 if(entries.length>1000)throw new Error('Import at most 1,000 card lines at a time.');
 return {entries,issues};
}
export function validateEntries(entries){if(!Array.isArray(entries)||entries.length>1000)throw new Error('Invalid deck data.');return entries.map((e,i)=>{if(typeof e.name!=='string'||!e.name.trim()||e.name.length>300||!Number.isInteger(e.count)||e.count<1||e.count>1000||!BOARDS.includes(e.board))throw new Error('The deck contains an invalid card entry.');return {key:e.key||'row-'+i,name:e.name.trim(),count:e.count,board:e.board,set:typeof e.set==='string'?e.set.toLowerCase():'',collector:typeof e.collector==='string'?e.collector:'',...(e.scryfallId?{scryfallId:e.scryfallId}:{})}})}
const norm=s=>String(s||'').normalize('NFKC').replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim().toLowerCase();
function matchesName(card,name){return norm(card.name)===norm(name)||(card.card_faces||[]).some(f=>norm(f.name)===norm(name));}
const collectorKey=value=>String(value||'').replace(/^0+(?=\d)/,'');
export const deckIdentifier=e=>e.scryfallId?{id:e.scryfallId}:e.set&&e.collector?{set:e.set,collector_number:collectorKey(e.collector)}:e.set?{name:e.name,set:e.set}:{name:e.name};
export function matchDeckCard(entry,cards){return cards.find(c=>matchesName(c,entry.name)&&(!entry.scryfallId||c.id===entry.scryfallId)&&(!entry.set||c.set===entry.set)&&(!entry.collector||collectorKey(c.collector_number)===collectorKey(entry.collector)));}
export async function resolveDeck(entries,{fetcher=fetch,signal,onProgress=()=>{},wait=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const unique=[...new Map(entries.map(e=>[JSON.stringify(deckIdentifier(e)),deckIdentifier(e)])).values()],cards=[];
 for(let start=0;start<unique.length;start+=75){
  signal?.throwIfAborted();if(start){await wait(150);signal?.throwIfAborted();}
  const r=await fetcher('https://api.scryfall.com/cards/collection',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({identifiers:unique.slice(start,start+75)}),signal});
  const d=await r.json();if(!r.ok)throw new Error(r.status===429?'Scryfall rate limit reached. Wait before trying again.':d.details||'Scryfall could not resolve the deck.');if(!Array.isArray(d.data))throw new Error('Scryfall returned invalid card data.');cards.push(...d.data);onProgress(Math.min(start+75,unique.length),unique.length);
 }
 return entries.map(e=>({...e,card:matchDeckCard(e,cards)||null}));
}
export function deckQueueItems(rows,boards=['main','commander'],uuid=()=>crypto.randomUUID()){
 const selected=rows.filter(r=>boards.includes(r.board)&&r.selected!==false&&r.card);
 if(selected.some(r=>!Number.isInteger(r.count)||r.count<1||r.count>1000))throw new Error('Use whole-number quantities from 1 to 1,000.');
 const total=selected.reduce((n,r)=>n+r.count,0);if(total>MAX_DECK_COPIES)throw new Error('Import at most 1,000 copies at a time. Reduce quantities or selected sections.');
 return selected.flatMap(r=>{const candidate=r.card.card_faces?.[r.face||0],face=candidate?.image_uris?candidate:null;const image=face?.image_uris?.large||face?.image_uris?.normal||r.card.image_uris?.large||r.card.image_uris?.normal||'';if(!image)throw new Error('No printable image for '+r.name);return Array.from({length:r.count},()=>({id:uuid(),kind:'original',name:face?.name||r.card.name,image,source:r.card,set:r.card.set_name||r.card.set,collector:r.card.collector_number,deckBoard:r.board,deckFace:r.face||0}));});
}
export function deckText(entries){let board='';return entries.map(e=>{const heading=e.board!==board?'\n'+(e.board==='main'?'Deck':e.board[0].toUpperCase()+e.board.slice(1))+'\n':'';board=e.board;return heading+`${e.count} ${e.name}${e.set?' ('+e.set+')'+(e.collector?' '+e.collector:''):''}`}).join('\n').trim()}
