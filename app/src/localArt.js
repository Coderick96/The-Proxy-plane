export const RENDERER='http://127.0.0.1:8790';
async function renderer(path,options={}){
 const response=await fetch(RENDERER+path,{...options,signal:AbortSignal.timeout(15000)});
 const data=await response.json();
 if(!response.ok)throw new Error(data.detail||'Local renderer request failed.');
 return data;
}
export async function localHardware(){
 try{return await renderer('/health');}
 catch{throw new Error('Start the Proxy Plane local renderer on this computer and allow local-network access in your browser. See LOCAL_ART_SETUP.md.');}
}
export async function generateLocalArt(request,body,owner,onProgress=()=>{}){
 const health=await localHardware();
 if(!health.ready)throw new Error(health.message||'Local renderer needs the publisher public key. See LOCAL_ART_SETUP.md.');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([owner,body.prompt,body.size,body.source||null])));
 const cacheKey='pp-local-art:'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 // Persist before spending, so a reload or broken connection can safely resume the same charge.
 let requestId=sessionStorage.getItem(cacheKey);
 if(!requestId){requestId=crypto.randomUUID();sessionStorage.setItem(cacheKey,requestId);}
 const authorization=await request('/api/local-art/authorize',{...body,requestId});
 try{
  await renderer('/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket:authorization.ticket,source:body.source})});
  const deadline=Date.now()+2*60*60*1000;
  while(Date.now()<deadline){
   const status=await renderer('/jobs/'+authorization.job,{headers:{Authorization:'Bearer '+authorization.ticket}});
   onProgress(status);
   window.dispatchEvent(new CustomEvent('pp-art-progress',{detail:status}));
   if(status.status==='failed')throw new Error(status.error||'Local rendering failed.');
   if(status.status==='complete'){
    if(!Array.isArray(status.images)||status.images.length!==3||status.images.some(image=>typeof image!=='string'||!image.startsWith('data:image/png;base64,')))throw new Error('The renderer returned an incomplete batch.');
    sessionStorage.removeItem(cacheKey);
    return {images:status.images,creditsSpent:1,profile:status.profile};
   }
   await new Promise(resolve=>setTimeout(resolve,1500));
  }
  throw new Error('The render is taking longer than two hours.');
 }catch(error){throw new Error(error.message+' Retry the same prompt and size in this tab to resume without another credit.');}
}
