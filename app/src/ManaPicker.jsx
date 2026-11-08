import React,{useState} from 'react';
import {MANA_GROUPS,appendMana,removeLastMana} from './mana.js';
import {SymbolText} from './SymbolText.jsx';
export default function ManaPicker({value,onChange}){
 const [category,setCategory]=useState('colors');const [token,setToken]=useState('W');const [count,setCount]=useState(1);
 const group=MANA_GROUPS.find(g=>g[0]===category)||MANA_GROUPS[1];
 return <div className="mana-picker"><label>Mana cost — type or use the picker<input value={value||''} onChange={e=>onChange(e.target.value)} placeholder="{2}{U}{U}"/></label>
 <div className="control-grid"><label>Symbol category<select value={category} onChange={e=>{setCategory(e.target.value);setToken(MANA_GROUPS.find(g=>g[0]===e.target.value)[2][0][0])}}>{MANA_GROUPS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
 <label>Symbol or number<select value={token} onChange={e=>setToken(e.target.value)}>{group[2].map(([id,label])=><option key={id} value={id}>{label} {'{'+id+'}'}</option>)}</select></label>
 <label>How many symbols<select value={count} onChange={e=>setCount(Number(e.target.value))}>{Array.from({length:20},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label></div>
 <div className="mana-picker-actions"><span className="mana-picker-sample"><SymbolText text={`{${token}}`}/></span><button className="secondary" onClick={()=>onChange(appendMana(value,token,count))}>Add symbol</button><button className="secondary" onClick={()=>onChange(removeLastMana(value))}>Remove last</button><button className="secondary" onClick={()=>onChange('')}>Clear</button></div><div className="mana-picker-cost" aria-label="Current mana cost"><SymbolText text={value||''}/></div></div>;
}
