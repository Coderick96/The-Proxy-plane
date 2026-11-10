import React,{useEffect,useRef,useState} from 'react';
import {uuid as createUUID} from './uuid.js';
import {DEVICE_MODEL_NAME,DEVICE_MODEL_LICENSE,checkDeviceSupport,clearDeviceModelCache} from './deviceAiModel.js';
import './deviceAi.css';
export const createDeviceWorker=()=>new Worker(new URL('./deviceAi.worker.js',import.meta.url),{type:'module',name:'proxy-plane-device-ai'});
export function deviceImageUrls(images){
 if(!Array.isArray(images)||images.length!==3)throw new Error('The device did not return three complete artwork choices.');
 return images.map(image=>{
  if(image.width!==512||image.height!==512||!(image.pixels instanceof Uint8ClampedArray)||image.pixels.length!==512*512*4)throw new Error('The device returned an incomplete image. Please retry.');
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const context=canvas.getContext('2d');if(!context)throw new Error('This browser cannot display the generated artwork.');
  context.putImageData(new ImageData(image.pixels,512,512),0,0);const url=canvas.toDataURL('image/png');canvas.width=0;canvas.height=0;
  if(!url.startsWith('data:image/png;base64,'))throw new Error('The browser could not save this image.');return {url,seed:image.seed};
 });
}
export default function DeviceArtworkStudio({onPick,contextKey='',supportCheck=checkDeviceSupport,workerFactory=createDeviceWorker,clearCache=clearDeviceModelCache}){
 const [prompt,setPrompt]=useState(''),[consent,setConsent]=useState(false),[support,setSupport]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState(''),[progress,setProgress]=useState(null),[images,setImages]=useState([]),[selected,setSelected]=useState(null);
 const task=useRef(0),worker=useRef(null),mounted=useRef(true),capability=useRef(0);
 const stop=()=>{task.current++;worker.current?.terminate();worker.current=null;};
 async function check(){const version=++capability.current;setSupport(null);try{const state=await supportCheck();if(mounted.current&&capability.current===version)setSupport(state);}catch{if(mounted.current&&capability.current===version)setSupport({supported:false,message:'Device GPU access could not be checked. Retry or upload artwork.'});}}
 useEffect(()=>{mounted.current=true;setPrompt('');setImages([]);setConsent(false);setSelected(null);setBusy(false);setNotice('');setError('');check();return()=>{mounted.current=false;capability.current++;stop();};},[contextKey]);
 function cancel(){stop();setBusy(false);setProgress(null);setNotice('Generation canceled. No AI credits were spent.');}
 function generate(){
  if(busy||!support?.supported||!consent||!prompt.trim()||prompt.length>1000)return;
  stop();const version=task.current,id=createUUID();setBusy(true);setError('');setNotice('Preparing on-device generation…');setProgress(null);setImages([]);setSelected(null);
  try{
   const instance=workerFactory();worker.current=instance;
   const current=()=>mounted.current&&task.current===version&&worker.current===instance;
   const fail=message=>{if(!current())return;stop();setBusy(false);setNotice('');setProgress(null);setError(message||'This device could not finish generation. Free GPU memory and retry, or upload artwork. No AI credits were spent.');};
   instance.onmessage=event=>{const data=event.data;if(!current()||data?.id!==id)return;
    if(data.type==='progress'){setNotice(data.message||'Working on your device…');setProgress(Number.isFinite(data.loaded)&&data.total>0?{value:data.loaded,max:data.total}:null);}
    if(data.type==='error')fail(data.message);
    if(data.type==='complete'){try{const completed=deviceImageUrls(data.images);if(!current())return;setImages(completed);setNotice('Three choices are ready. Choose one to apply directly to your card.');stop();setBusy(false);setProgress(null);}catch(e){fail(e.message);}}
   };
   instance.onerror=()=>fail('Device generation stopped. Your browser may have run out of GPU memory. Close other tabs and retry, or upload artwork. No AI credits were spent.');
   instance.postMessage({type:'generate',id,prompt:prompt.trim()});
  }catch(e){stop();setBusy(false);setError(e.message||'The device worker could not start. Please retry.');}
 }
 async function removeModel(){if(busy)return;setError('');try{await clearCache();setNotice('Downloaded model removed. Your saved cards and artwork are unchanged.');}catch(e){setError(e.message||'The browser could not remove its model cache.');}}
 return <section className="device-art-studio" aria-label="On-device artwork generator">
  <p>Generate inside this tab using your device’s GPU. No account, desktop companion or AI credits are required.</p>
  <p className="device-ai-model"><strong>{DEVICE_MODEL_NAME}</strong> · 512 × 512 artwork</p>
  <label>Describe your artwork<textarea rows={4} maxLength={1000} value={prompt} disabled={busy} onChange={e=>setPrompt(e.target.value)} placeholder="A moonlit dragon over an ancient forest, fantasy illustration, no text or frame…"/></label>
  <p className="device-ai-download">First use downloads about 1.04 GB of model files. Use Wi-Fi; your browser may cache them if storage allows. Generation needs substantial GPU memory and can drain battery. Some phones and browsers cannot run this model.</p>
  <label className="device-ai-consent"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/><span>I agree to the model download and its <a href={DEVICE_MODEL_LICENSE} target="_blank" rel="noreferrer">CreativeML OpenRAIL-M license and use restrictions</a>.</span></label>
  <p className="device-ai-support" role="status">{support?.message||'Checking this browser’s GPU features…'}</p>
  <div className="device-ai-actions"><button type="button" className="primary" disabled={busy||!support?.supported||!consent||!prompt.trim()} onClick={generate}>{busy?'Generating on this device…':'Generate 3 choices on this device'}</button>{busy&&<button type="button" className="secondary" onClick={cancel}>Cancel generation</button>}</div>
  {support&&!support.supported&&!busy&&<button type="button" className="secondary" onClick={check}>Check device compatibility again</button>}
  <p className="device-ai-notice" role="status" aria-live="polite">{notice}</p>{progress&&<progress aria-label="Model loading progress" value={progress.value} max={progress.max}/>}
  {error&&<p className="error-text" role="alert">{error}</p>}
  {images.length>0&&<div className="art-choices"><div className="art-choice-grid">{images.map((image,index)=><article key={image.seed+'-'+index}><img src={image.url} alt={'On-device artwork option '+(index+1)}/><button type="button" className="primary" aria-pressed={selected===index} disabled={busy} onClick={()=>{setSelected(index);onPick(image.url);setNotice('Option '+(index+1)+' applied to your card. Save your card to keep it.');}}>Use option {index+1}</button></article>)}</div></div>}
  <p className="muted">Your prompt and generated images stay on this device unless you choose to save or share them. Results here are not automatically saved. There is no cloud fallback.</p>
  <button type="button" className="subtle-btn" disabled={busy} onClick={removeModel}>Remove downloaded model</button>
 </section>;
}
