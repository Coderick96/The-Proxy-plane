import React,{useEffect,useRef,useState} from 'react';
import {IMPORT_FIELDS,importCardText} from './textImport.js';
import {SymbolText} from './SymbolText.jsx';
export default function TextImporter({cardId,onChange}){
 const [query,setQuery]=useState('');const [results,setResults]=useState([]);const [nextPage,setNextPage]=useState(null);const [selectedId,setSelectedId]=useState('');const [face,setFace]=useState(0);const [fields,setFields]=useState(()=>IMPORT_FIELDS.map(([id])=>id));const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');const request=useRef(null);
 useEffect(()=>{request.current?.abort();setResults([]);setSelectedId('');setNextPage(null);setBusy(false);setError('');setNotice('');return()=>request.current?.abort()},[cardId]);
 const selected=results.find(c=>c.id===selectedId);const data=selected?.card_faces?.[face]||selected;
 async function search(e,more=false){e?.preventDefault();if(!more&&!query.trim())return;request.current?.abort();const controller=new AbortController();request.current=controller;setBusy(true);setError('');setNotice('');if(!more){setResults([]);setSelectedId('');setNextPage(null);setFace(0);}
  const url=more?nextPage:`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query.trim())}&unique=cards&order=name`;
  try{const target=new URL(url);if(target.origin!=='https://api.scryfall.com'||target.pathname!=='/cards/search')throw new Error('Invalid search page.');const r=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});const payload=await r.json();if(!r.ok)throw new Error(payload.details||'Card search failed.');if(!Array.isArray(payload.data))throw new Error('Invalid search response.');if(controller.signal.aborted)return;setResults(old=>more?[...old,...payload.data.filter(c=>!old.some(o=>o.id===c.id))]:payload.data);setNextPage(payload.has_more?payload.next_page:null);
  }catch(e){if(!controller.signal.aborted)setError(e.message||'Could not search Scryfall.');}finally{if(request.current===controller)setBusy(false);}
 }
 function apply(){if(!selected||!fields.length)return;onChange(current=>importCardText(current,selected,face,fields));setNotice(`Imported selected text from ${data.name||selected.name}. Your design settings were preserved.`);}
 return <div className="text-importer">
 <p className="layer-note">Find a card and import its text, mana and stats into your current design. Artwork, frames, symbols, formatting and layer positions stay as you set them.</p>
 <form onSubmit={search}><label>Search Scryfall for card text<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Card name or Scryfall search…"/></label><button type="submit" className="secondary" disabled={busy||!query.trim()}>{busy?'Searching…':'Search cards'}</button></form>
 {results.length>0&&<><label>Card search results<select value={selectedId} onChange={e=>{setSelectedId(e.target.value);setFace(0);setNotice('')}}><option value="">Choose a card…</option>{results.map(card=><option key={card.id} value={card.id}>{card.name}</option>)}</select></label><p className="layer-note">{results.length} results loaded{nextPage?' · more available':''}</p>{nextPage&&<button type="button" className="secondary" disabled={busy} onClick={e=>search(e,true)}>Load more cards</button>}</>}
 {selected&&<>
 {selected.card_faces?.length>1&&<label>Card face / half to import<select value={face} onChange={e=>{setFace(Number(e.target.value));setNotice('')}}>{selected.card_faces.map((f,i)=><option key={i} value={i}>{f.name||`Face ${i+1}`}</option>)}</select></label>}
 <div className="text-import-preview"><b>{data.name||selected.name}</b><span><SymbolText text={data.mana_cost||''}/></span><div>{data.type_line||selected.type_line}</div><p>{data.oracle_text??selected.oracle_text??''}</p>{data.flavor_text&&<i>{data.flavor_text}</i>}<div>{data.power!==undefined||data.toughness!==undefined?`${data.power??'—'}/${data.toughness??'—'}`:'No power / toughness'}</div></div>
 <fieldset className="text-import-fields"><legend>Fields to import</legend>{IMPORT_FIELDS.map(([id,label])=><label key={id}><input type="checkbox" checked={fields.includes(id)} onChange={e=>{setFields(old=>e.target.checked?[...old,id]:old.filter(f=>f!==id));setNotice('')}}/>{label}</label>)}</fieldset>
 <p className="layer-note">Checked fields are replaced; missing mana or power/toughness clears those values. Uncheck Card name to keep your custom name. Layout and stats-box visibility stay unchanged.</p>
 <button type="button" className="primary" disabled={busy||!fields.length} onClick={apply}>Import selected text</button>
 </>}
 {error&&<p role="alert" className="error-text">{error}</p>}{notice&&<p role="status" className="layer-note">{notice}</p>}
 </div>;
}
