import React,{useState} from 'react';
import {resolveBack} from './cardBacks.js';
import {PACKS,ownsPack} from './premiumCatalog.js';
import {usePremium} from './PremiumContext.jsx';
import './cardBacks.css';
export function CardBack({back}){return <div className="card-back" aria-label={back?.image?'The Proxy Plane card back':'Blank card back'}>{back?.image?<img src={back.image} alt="Card backing"/>:back?.missing?<span>Sign in to load this backing</span>:null}</div>}
export default function BackSettings({value={mode:'inherit'},onChange,allowInherit=true}){
 const {access,assets,openPremium}=usePremium(),[error,setError]=useState('');
 const selected=value.mode==='pack'?`pack/${value.pack}/${value.design}`:value.mode||'inherit';
 const back=resolveBack({back:value},undefined,assets,access);
 function select(v){if(v.startsWith('pack/')){const [,pack,design]=v.split('/');onChange({mode:'pack',pack,design})}else onChange(v==='custom'?{mode:v,image:value.image||''}:{mode:v})}
 async function upload(file){if(!file||!access.studio)return;setError('');if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024*1024){setError('Use a PNG, JPG or WebP under 20 MB.');return;}const reader=new FileReader();reader.onerror=()=>setError('Could not read the image.');reader.onload=()=>onChange({mode:'custom',image:reader.result});reader.readAsDataURL(file)}
 return <div className="back-settings"><label>Card backing<select value={selected} onChange={e=>select(e.target.value)}>{allowInherit&&<option value="inherit">Use print-sheet setting</option>}<option value="none">None / blank back</option><option value="classic">The Proxy Plane · classic-inspired (Free)</option>{PACKS.map(p=><optgroup key={p.id} label={p.name}>{p.backs.map(d=><option key={d} value={`pack/${p.id}/${d}`} disabled={!ownsPack(access,p.id)}>{d} {!ownsPack(access,p.id)?'· Locked':''}</option>)}</optgroup>)}<option value="custom" disabled={!access.studio}>Upload my own · Studio</option></select></label>{value.mode==='custom'&&access.studio&&<label>Custom backing image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>upload(e.target.files?.[0])}/></label>}{back.image&&<div className="back-preview"><CardBack back={back}/></div>}{back.missing&&<p role="alert">This backing is locked or still loading. Open Premium to check access.</p>}{error&&<p role="alert">{error}</p>}<button className="text-btn" onClick={openPremium}>Browse premium packs ↗</button><p className="muted">The standard back is free. Premium packs stay unlocked when purchased separately. Backs are 2.5 × 3.5 inches; uploaded images fill the card and may crop.</p></div>;
}
