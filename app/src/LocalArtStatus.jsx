import React,{useEffect,useState} from 'react';
import {localHardware} from './localArt.js';
export default function LocalArtStatus(){
 const [status,setStatus]=useState('Local rendering uses this computer. Start the local renderer before generating.'),[checking,setChecking]=useState(false);
 useEffect(()=>{
  const update=event=>{const d=event.detail;setStatus(d.status==='complete'?'Three image choices are ready.':d.status==='failed'?'Render stopped. Retry the same prompt without another credit.':`Rendering on this computer: ${d.completed||0} of 3 images finished. First use downloads the model.`);};
  window.addEventListener('pp-art-progress',update);
  return ()=>window.removeEventListener('pp-art-progress',update);
 },[]);
 async function check(){setChecking(true);try{const d=await localHardware();setStatus(d.ready?`${d.hardware.name} · ${d.profile.model.toUpperCase()} · up to ${d.profile.width} × ${d.profile.height} portrait. Three images render one at a time. ${d.message}`:d.message||'Install the publisher public key before generating.');}catch(e){setStatus(e.message);}finally{setChecking(false);}}
 return <div className="local-art-status"><p role="status">{status}</p><button type="button" className="secondary" disabled={checking} onClick={check}>{checking?'Checking…':'Check this computer'}</button><p className="muted">1 credit authorizes 3 local image choices. Downloads, electricity and storage use your device. Failed renders can retry the same prompt in this tab without another credit. Model screening can miss unsafe content; use original, non-explicit fantasy prompts.</p></div>;
}
