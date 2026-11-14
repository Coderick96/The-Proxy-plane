import React,{useEffect,useRef,useState} from 'react';
import {uuid as createUUID} from './uuid.js';
import {api} from './premiumApi.js';
import {DEVICE_MODEL_NAME,DEVICE_MODEL_LICENSE,DEVICE_MODEL_REVISION,checkDeviceSupport,clearDeviceModelCache} from './deviceAiModel.js';
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
export async function deviceRequestFingerprint(prompt){
 const bytes=new TextEncoder().encode(JSON.stringify({modelRevision:DEVICE_MODEL_REVISION,prompt:prompt.trim()}));
 const digest=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
const validReceipt=(receipt,job)=>receipt?.operationId===job.id&&receipt?.creditsSpent===1&&receipt?.mode==='device'&&receipt?.modelRevision===DEVICE_MODEL_REVISION;
export default function DeviceArtworkStudio({onPick,contextKey='',client=null,user=null,credits=null,connected=Boolean(client),signedIn=Boolean(user),onSignIn,onRefresh,supportCheck=checkDeviceSupport,workerFactory=createDeviceWorker,clearCache=clearDeviceModelCache,request=api,fingerprint=deviceRequestFingerprint,authorizationTimeoutMs=20000}){
 const [prompt,setPrompt]=useState(''),[consent,setConsent]=useState(false),[support,setSupport]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState(''),[progress,setProgress]=useState(null),[images,setImages]=useState([]),[selected,setSelected]=useState(null),[billingState,setBillingState]=useState(null);
 const selfCheckTimer=useRef(null);
 const task=useRef(0),worker=useRef(null),mounted=useRef(true),capability=useRef(0),billing=useRef(null);
 const accountReady=connected&&signedIn&&Boolean(client&&user?.id),creditReady=Number.isFinite(credits)&&credits>=1;
 const stop=()=>{clearTimeout(selfCheckTimer.current);task.current++;worker.current?.terminate();worker.current=null;};
 const currentJob=job=>mounted.current&&billing.current===job;
 const currentWorker=(job,instance)=>currentJob(job)&&worker.current===instance&&job.version===task.current;
 function updateBilling(job){if(currentJob(job))setBillingState({id:job.id,state:job.state});}
 async function check(){const version=++capability.current;setSupport(null);try{const state=await supportCheck();if(mounted.current&&capability.current===version)setSupport(state);}catch{if(mounted.current&&capability.current===version)setSupport({supported:false,message:'Device GPU access could not be checked. Retry or upload artwork.'});}}
 useEffect(()=>{mounted.current=true;billing.current=null;setBillingState(null);setPrompt('');setImages([]);setConsent(false);setSelected(null);setBusy(false);setNotice('');setError('');check();return()=>{mounted.current=false;capability.current++;billing.current=null;stop();};},[contextKey,user?.id]);
 function endFailure(job,message){
  if(!currentJob(job))return;stop();setBusy(false);setNotice('');setProgress(null);
  if(job.receipt){job.state='authorized';updateBilling(job);setError(message+' This request used 1 credit. Retry this same request without another charge, or ask the owner to review request '+job.id+'.');}
  else if(job.state==='pending'||job.state==='unknown'){job.state='unknown';updateBilling(job);setError(message+' Credit authorization could not be confirmed. Retry authorization for request '+job.id+' before starting another request.');}
  else{billing.current=null;setBillingState(null);setError(message+' No credits were charged.');}
 }
 function cancel(){const job=billing.current;stop();setBusy(false);setProgress(null);if(!job){setNotice('Device preparation canceled. No credits were charged.');return;}
  if(job.receipt){job.state='authorized';updateBilling(job);setNotice('Generation canceled after its 1-credit authorization. Retry this same request without another charge, or contact the owner with request '+job.id+'.');}
  else if(job.state==='pending'||job.state==='unknown'){updateBilling(job);setNotice('Generation canceled. Credit status is not yet confirmed; retry authorization for request '+job.id+'.');}
  else{billing.current=null;setBillingState(null);setNotice('Generation canceled before authorization. No AI credits were spent.');}
 }
 async function authorize(job){
  if(!currentJob(job))return;if(job.promise)return job.promise;
  const instance=worker.current;
  if(job.receipt&&job.authorizedInstance===instance&&currentWorker(job,instance))return;
  job.state='pending';updateBilling(job);setError('');setNotice('Authorizing 1 credit for three artwork choices…');
  job.promise=(async()=>{
   try{
    const {data,error:sessionError}=await client.auth.getSession();const session=data?.session;
    if(sessionError||session?.user?.id!==job.owner||!session?.access_token)throw Object.assign(new Error('Your account changed or expired. Sign in and retry.'),{status:401});
    if(!currentJob(job))return;
    // Freeze this account's session so api() cannot reread another account after the check above.
    const frozenClient={auth:{getSession:async()=>({data:{session}})}};
    let timeout;let receipt;try{receipt=await Promise.race([request(frozenClient,'/api/ai/device/charge',{operationId:job.id,modelRevision:DEVICE_MODEL_REVISION,fingerprint:job.fingerprint}),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Credit authorization timed out.')),authorizationTimeoutMs);})]);}finally{clearTimeout(timeout);}
    if(!currentJob(job))return;
    if(!validReceipt(receipt,job))throw new Error('The server returned an invalid credit authorization.');
    job.receipt=receipt;job.state='authorized';updateBilling(job);setError('');
    Promise.resolve().then(()=>onRefresh?.()).catch(()=>{});
    if(currentWorker(job,instance)){job.authorizedInstance=instance;setNotice('1 credit authorized. Generating your three choices on this device…');instance.postMessage({type:'credit-authorized',id:job.id,receipt});}
    else{setBusy(false);setNotice('The 1-credit authorization was confirmed after cancellation. Retry this charged request without another charge, or ask the owner to review request '+job.id+'.');}
   }catch(e){
    if(!currentJob(job))return;
    if(job.receipt&&e.status===409){stop();setBusy(false);setProgress(null);job.receipt=null;billing.current=null;setBillingState(null);setError('This prior request is no longer authorized. Refresh your credits before starting another request.');Promise.resolve().then(()=>onRefresh?.()).catch(()=>{});return;}
    if(job.receipt){endFailure(job,e.message||'The device could not continue after authorization.');return;}
    if([400,401,402,403,404,409,422].includes(e.status)){stop();setBusy(false);setProgress(null);billing.current=null;setBillingState(null);setError(e.message+' No credit was authorized for this request.');}
    else{job.state='unknown';updateBilling(job);setError(e.message+' Credit status is unknown. Retry authorization with the same request ID; do not start another request.');}
   }finally{job.promise=null;}
  })();
  return job.promise;
 }
 function startWorker(job){
  job.authorizedInstance=null;stop();job.version=task.current;setBusy(true);setError('');setNotice('Preparing on-device generation before authorizing credits…');setProgress(null);setImages([]);setSelected(null);
  try{
   const instance=workerFactory();worker.current=instance;
   instance.onmessage=event=>{const data=event.data;if(!currentWorker(job,instance)||data?.id!==job.id)return;
    if(data.type==='progress'){setNotice(data.message||'Working on your device…');setProgress(Number.isFinite(data.loaded)&&data.total>0?{value:data.loaded,max:data.total}:null);}
    if(data.type==='charge-required')authorize(job);
    if(data.type==='error')endFailure(job,data.message||'This device could not finish generation.');
    if(data.type==='complete'){
     if(!job.receipt){endFailure(job,'The device returned artwork without a confirmed credit authorization.');return;}
     try{const completed=deviceImageUrls(data.images);if(!currentWorker(job,instance))return;setImages(completed);setNotice('Three choices are ready. Choose one to apply directly to your card.');stop();billing.current=null;setBillingState(null);setBusy(false);setProgress(null);}catch(e){endFailure(job,e.message);}
    }
   };
   instance.onerror=()=>{if(currentWorker(job,instance))endFailure(job,'Device generation stopped. Your browser may have run out of GPU memory.');};
   instance.postMessage({type:'generate',id:job.id,prompt:job.prompt});
  }catch(e){endFailure(job,e.message||'The device worker could not start.');}
 }
 async function generate(){
  if(busy||billing.current||!accountReady||!creditReady||!support?.supported||!consent||!prompt.trim()||prompt.length>1000)return;
  stop();const version=task.current;setBusy(true);setError('');
  try{
   const text=prompt.trim(),hash=await fingerprint(text);if(!mounted.current||task.current!==version)return;
   if(!/^[0-9a-f]{64}$/.test(hash))throw new Error('The private request fingerprint could not be created.');
   const job={id:createUUID(),owner:user.id,prompt:text,fingerprint:hash,state:'preparing',receipt:null,promise:null};billing.current=job;startWorker(job);
  }catch(e){if(mounted.current&&task.current===version){setBusy(false);setError(e.message+' No credits were charged.');}}
 }
 function retry(){const job=billing.current;if(!job||!accountReady||job.owner!==user?.id)return;if(job.receipt&&!worker.current)startWorker(job);else authorize(job);}
 function dismiss(){const job=billing.current;if(!job?.receipt||job.promise)return;stop();billing.current=null;setBillingState(null);setBusy(false);setError('');setNotice('Request closed. Its 1-credit charge remains recorded. Contact the owner if it needs review.');}
 async function selfCheck(){
  if(busy||billing.current||!support?.supported)return;
  stop();const version=task.current;setBusy(true);setError('');setNotice('Testing the built-in GPU runtime. No model files or credits are used.');
  const finish=(message,failed=false)=>{if(!mounted.current||version!==task.current)return;stop();setBusy(false);setProgress(null);if(failed)setError(message+' No model was downloaded and no credits were charged.');else setNotice(message);};
  try{const instance=workerFactory();worker.current=instance;const id=createUUID();
   instance.onmessage=event=>{const value=event.data;if(!mounted.current||version!==task.current||worker.current!==instance||value?.id!==id)return;
    if(value.type==='error')finish(value.message||'The GPU runtime test failed.',true);
    if(value.type==='self-test-complete'){if(value.runtimeVerified!==true||value.modelDownloaded!==false||value.creditsSpent!==0)finish('The GPU test returned an invalid result.',true);else finish('GPU runtime self-check passed. Full image generation and quality still need testing on this device.');}
   };
   instance.onerror=()=>finish('The device could not initialize its GPU runtime.',true);
   selfCheckTimer.current=setTimeout(()=>finish('The GPU runtime test timed out.',true),30000);
   instance.postMessage({type:'self-test',id});
  }catch(e){finish(e.message||'The GPU test could not start.',true);}
 }
 async function removeModel(){if(busy)return;setError('');try{await clearCache();setNotice('Downloaded model removed. Your saved cards and artwork are unchanged.');}catch(e){setError(e.message||'The browser could not remove its model cache.');}}
 return <section className="device-art-studio" aria-label="On-device artwork generator">
  <p>Generate inside this tab using your device’s GPU, with no paid AI API. The beta uses 1 app credit per three-choice generation request; an account is required. The GPU self-check is free.</p>
  <p className="device-ai-model"><strong>{DEVICE_MODEL_NAME}</strong> · 512 × 512 artwork</p>
  {!connected?<p role="status">Account and credit setup is not connected for this beta yet. Generation stays disabled until server credit authorization is available.</p>:!signedIn?<><p>Sign in to use your AI credits for device generation.</p><button type="button" className="secondary" onClick={onSignIn}>Sign in for device artwork</button></>:<p>{Number.isFinite(credits)?credits+' AI credits available.':'Your credit balance is unavailable. Refresh it before generating.'}</p>}
  {connected&&signedIn&&onRefresh&&<button type="button" className="subtle-btn" disabled={busy} onClick={onRefresh}>Refresh AI credits</button>}
  <label>Describe your artwork<textarea rows={4} maxLength={1000} value={prompt} disabled={busy||Boolean(billingState)} onChange={e=>setPrompt(e.target.value)} placeholder="A moonlit dragon over an ancient forest, fantasy illustration, no text or frame…"/></label>
  <p className="device-ai-download">First use downloads about 1.04 GB of model files. Use Wi-Fi; your browser may cache them if storage allows. Generation needs substantial GPU memory and can drain battery. Some phones and browsers cannot run this model.</p>
  <label className="device-ai-consent"><input type="checkbox" checked={consent} disabled={busy||Boolean(billingState)} onChange={e=>setConsent(e.target.checked)}/><span>I agree to the model download and its <a href={DEVICE_MODEL_LICENSE} target="_blank" rel="noreferrer">CreativeML OpenRAIL-M license and use restrictions</a>.</span></label>
  <p className="device-ai-support" role="status">{support?.message||'Checking this browser’s GPU features…'}</p>
  <button type="button" className="secondary" disabled={busy||Boolean(billingState)||!support?.supported} onClick={selfCheck}>Run GPU self-check · no credits</button>
  <p className="muted">The server authorizes 1 credit after model setup, before generation. After authorization, cancellation or a device failure does not automatically refund it; retry the same request without another charge or contact the owner for review.</p>
  <div className="device-ai-actions"><button type="button" className="primary" disabled={busy||Boolean(billingState)||!accountReady||!creditReady||!support?.supported||!consent||!prompt.trim()} onClick={generate}>{busy?(selfCheckTimer.current?'Testing GPU…':'Generating on this device…'):'Generate 3 choices on this device · 1 credit'}</button>{busy&&<button type="button" className="secondary" onClick={cancel}>Cancel generation</button>}</div>
  {billingState&&['pending','unknown','authorized'].includes(billingState.state)&&<div className="device-credit-recovery"><p>Request ID: <code>{billingState.id}</code></p><button type="button" className="secondary" disabled={!accountReady||billingState.state==='pending'||(billingState.state==='authorized'&&busy)} onClick={retry}>{billingState.state==='authorized'?'Retry this charged request':'Retry credit authorization'}</button>{billingState.state==='authorized'&&!busy&&<button type="button" className="subtle-btn" onClick={dismiss}>Close this charged request</button>}</div>}
  {support&&!support.supported&&!busy&&<button type="button" className="secondary" onClick={check}>Check device compatibility again</button>}
  <p className="device-ai-notice" role="status" aria-live="polite">{notice}</p>{progress&&<progress aria-label="Model loading progress" value={progress.value} max={progress.max}/>}
  {error&&<p className="error-text" role="alert">{error}</p>}
  {images.length>0&&<div className="art-choices"><div className="art-choice-grid">{images.map((image,index)=><article key={image.seed+'-'+index}><img src={image.url} alt={'On-device artwork option '+(index+1)}/><button type="button" className="primary" aria-pressed={selected===index} disabled={busy} onClick={()=>{setSelected(index);onPick(image.url);setNotice('Option '+(index+1)+' applied to your card. Save your card to keep it.');}}>Use option {index+1}</button></article>)}</div></div>}
  <p className="muted">Your prompt and generated images stay on this device unless you choose to save or share them. Only a request fingerprint is sent for credit authorization. Results here are not automatically saved. There is no cloud inference fallback.</p>
  <button type="button" className="subtle-btn" disabled={busy} onClick={removeModel}>Remove downloaded model</button>
 </section>;
}
