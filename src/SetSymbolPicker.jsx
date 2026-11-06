import React,{useState,useRef,useEffect} from 'react';
import seed from './setCatalog.json';
import {GENERIC_SYMBOLS,filterSets,normalizeSets} from './setSymbols.js';
import {parseSetSvg} from './setSvg.js';
import SetSymbol from './SetSymbol.jsx';
function initialCatalog(){try{const cached=JSON.parse(localStorage.getItem('pk-set-catalog')||'null');if(cached?.sets?.length){const sets=normalizeSets(cached.sets);if(sets.length)return sets;}}catch{}return seed.sets;}
export default function SetSymbolPicker({card,onChange}){
 const [sets,setSets]=useState(initialCatalog);const [query,setQuery]=useState('');const [type,setType]=useState('all');
 const [source,setSource]=useState(card.setSymbolId?.startsWith('mtg:')?'mtg':'generic');
 const [busy,setBusy]=useState(false);const [refreshing,setRefreshing]=useState(false);const [error,setError]=useState('');
 const request=useRef(0);const alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;request.current++}},[]);
 useEffect(()=>{request.current++;setBusy(false);setError('');if(!card.setSymbolId&&!card.setSymbolImage&&!card.setSymbol&&card.source?.startsWith('Scryfall import:')&&card.setCode){setSource('mtg');chooseSet(card.setCode.toLowerCase());}},[card.id]);
 const filtered=filterSets(sets,query,type);const types=[...new Set(sets.map(s=>s.set_type))].sort();
 async function refresh(){setRefreshing(true);setError('');try{
  let url='https://api.scryfall.com/sets',data=[],pages=0;
  while(url){const next=new URL(url);if(next.origin!=='https://api.scryfall.com'||next.pathname!=='/sets'||++pages>20)throw new Error('Unexpected catalog page.');
   const r=await fetch(url,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error('Could not refresh the catalog. Bundled/cached sets remain available.');const payload=await r.json();data.push(...payload.data||[]);url=payload.has_more?payload.next_page:null;if(url)await new Promise(resolve=>setTimeout(resolve,120));}
  const updated=normalizeSets(data);if(!updated.length)throw new Error('The set catalog was empty.');if(alive.current)setSets(updated);try{localStorage.setItem('pk-set-catalog',JSON.stringify({sets:updated,fetchedAt:new Date().toISOString()}));}catch{}
 }catch(e){if(alive.current)setError(e.message);}finally{if(alive.current)setRefreshing(false);}}
 async function chooseSet(code){if(!code)return;const set=sets.find(s=>s.code===code);if(!set)return;const id=++request.current;setBusy(true);setError('');try{
  const cacheKey=`pk-set-svg:${set.icon_svg_uri}`;let svg;
  try{const text=localStorage.getItem(cacheKey);if(text)svg=parseSetSvg(text);}catch{}
  if(!svg){const r=await fetch(set.icon_svg_uri,{headers:{Accept:'image/svg+xml'}});if(!r.ok)throw new Error('Could not download this symbol. Check your connection or choose an original symbol.');const text=await r.text();svg=parseSetSvg(text);try{localStorage.setItem(cacheKey,text);}catch{}}
  if(alive.current&&id===request.current)onChange(prev=>({...prev,setSymbolId:`mtg:${set.code}`,setSymbolName:set.name,setSymbolSvg:svg,setSymbolImage:'',setSymbol:'',setCode:set.code.toUpperCase()}));
 }catch(e){if(alive.current&&id===request.current)setError(e.message);}finally{if(alive.current&&id===request.current)setBusy(false);}}
 function chooseGeneric(id){const symbol=GENERIC_SYMBOLS.find(s=>s.id===id);if(!symbol)return;request.current++;setBusy(false);setError('');onChange(prev=>({...prev,setSymbolId:symbol.id,setSymbolName:symbol.name,setSymbolSvg:{viewBox:symbol.viewBox,nodes:symbol.nodes},setSymbolImage:'',setSymbol:''}));}
 function switchSource(value){request.current++;setBusy(false);setError('');setSource(value);}
 return <div className="set-symbol-picker">
  <label>Set symbol collection<select value={source} onChange={e=>switchSource(e.target.value)}><option value="mtg">Magic sets (Scryfall catalog)</option><option value="generic">The Proxy Plane original symbols</option></select></label>
  {source==='mtg'?<>
   <label>Search sets by name or code<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="e.g. Final Fantasy, FIC, Alpha…"/></label>
   <label>Set category<select value={type} onChange={e=>setType(e.target.value)}><option value="all">All categories</option>{types.map(t=><option key={t} value={t}>{t.replaceAll('_',' ')}</option>)}</select></label>
   <label>Choose MTG set<select value={card.setSymbolId?.startsWith('mtg:')?card.setSymbolId.slice(4):''} onChange={e=>chooseSet(e.target.value)}><option value="">Choose a set…</option>{card.setSymbolId?.startsWith('mtg:')&&!filtered.some(s=>s.code===card.setSymbolId.slice(4))&&<option value={card.setSymbolId.slice(4)}>{card.setSymbolName} (selected)</option>}{filtered.map(s=><option key={s.code} value={s.code}>{s.name} ({s.code.toUpperCase()})</option>)}</select></label>
   <p className="layer-note">{filtered.length} matching sets · {sets.length} in catalog. Some products share the same symbol. Selecting a set also updates the editable set code.</p>
   <button className="secondary" disabled={refreshing} onClick={refresh}>{refreshing?'Refreshing sets…':'Refresh set catalog'}</button>
  </>:<label>Choose an original symbol<select value={GENERIC_SYMBOLS.some(s=>s.id===card.setSymbolId)?card.setSymbolId:''} onChange={e=>chooseGeneric(e.target.value)}><option value="">Choose a symbol…</option>{GENERIC_SYMBOLS.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
  <div className="set-symbol-swatch"><SetSymbol card={card}/><span>{busy?'Loading selected symbol…':card.setSymbolName||'Current symbol'}<small>Rarity controls the symbol color. Layer color overrides take priority.</small></span></div>
  {error&&<p className="error-text" role="alert">{error}</p>}
 </div>;
}
