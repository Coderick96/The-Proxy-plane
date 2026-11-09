import React,{useMemo,useState} from 'react';
import catalog from './setCatalog.json';
import {CARD_COLORS,CARD_RARITIES,EMPTY_CARD_FILTERS,matchingSets} from './cardSearch.js';
import './cardSearch.css';
export default function CardSearchFilters({value,onChange,busy=false}){
 const [setQuery,setSetQuery]=useState('');
 const sets=useMemo(()=>matchingSets(catalog.sets,setQuery),[setQuery]);
 const selected=catalog.sets.find(s=>s.code===value.set);
 const toggle=(key,id)=>onChange({...value,[key]:value[key].includes(id)?value[key].filter(x=>x!==id):[...value[key],id]});
 const activeCount=Number(Boolean(value.set))+value.colors.length+value.rarities.length;
 const active=activeCount>0;
 return <details className="card-search-filters" aria-label="Card search filters">
  <summary><strong>Filter cards</strong><span className="card-filter-summary-hint">Set · colors · rarity</span>{activeCount>0&&<span className="card-filter-count">{activeCount} selected</span>}</summary>
  <div className="card-filter-content">
  <div className="card-filter-heading"><div><h2>Browse your way</h2><p>Pick a set, colors or rarities. A card name is optional.</p></div><button className="subtle-btn" type="button" disabled={!active&&!setQuery} onClick={()=>{onChange({...EMPTY_CARD_FILTERS});setSetQuery('');}}>Reset filters</button></div>
  <div className="card-set-fields"><label>Find a set<input type="search" value={setQuery} onChange={e=>setSetQuery(e.target.value)} placeholder="Set name or code, e.g. Bloomburrow"/></label><label>Set<select value={value.set} onChange={e=>onChange({...value,set:e.target.value})}><option value="">All sets</option>{selected&&!sets.some(s=>s.code===selected.code)&&<option value={selected.code}>{selected.name} ({selected.code.toUpperCase()})</option>}{sets.map(s=><option key={s.code} value={s.code}>{s.name} ({s.code.toUpperCase()})</option>)}</select></label></div>
  {setQuery&&!sets.length&&<p className="card-filter-help" role="status">No matching sets. Try another name or set code.</p>}
  <fieldset><legend>Card colors</legend><div className="card-filter-chips">{CARD_COLORS.map(([id,name])=><button key={id} type="button" className={`card-filter-chip card-color-${id}`} aria-pressed={value.colors.includes(id)} onClick={()=>toggle('colors',id)}><span aria-hidden="true" className="card-color-dot"/>{name}</button>)}</div><p className="card-filter-help">Matches any selected color, including multicolor cards. Colorless matches cards with no colors.</p></fieldset>
  <fieldset><legend>Rarity</legend><div className="card-filter-chips">{CARD_RARITIES.map(([id,name])=><button key={id} type="button" className="card-filter-chip" aria-pressed={value.rarities.includes(id)} onClick={()=>toggle('rarities',id)}>{name}</button>)}</div><p className="card-filter-help">Matches any selected rarity.</p></fieldset>
  <p className="card-filter-help">No selection means any color or rarity. Search Scryfall or Browse cards applies your filters.</p><button type="submit" disabled={busy} className="primary card-browse-submit">Browse cards</button>
 </div></details>;
}
