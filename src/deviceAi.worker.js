import {configureDeviceRuntime,verifyDeviceRuntime} from './deviceAiRuntime.js';
import {createDeviceEngine} from './deviceAiEngine.js';
import {DEVICE_ASSETS,DEVICE_GPU_MIN_BUFFER,DEVICE_MODEL_REVISION} from './deviceAiModel.js';
import {loadDeviceAsset} from './deviceAiDownloads.js';
import {deviceSeeds} from './deviceAiMath.js';
let started=false,activeId=null,creditDecision=null;
self.onmessage=async event=>{
 const job=event.data;
 if(started){if(job?.type==='credit-authorized'&&job.id===activeId&&creditDecision)creditDecision(job.receipt);return;}
 if(job?.type!=='generate')return;started=true;activeId=job.id;let engine,device;
 const emit=(type,data)=>self.postMessage({type,id:job.id,...data});
 try{
  if(typeof job.id!=='string'||typeof job.prompt!=='string'||!job.prompt.trim()||job.prompt.length>1000)throw new Error('Enter an artwork prompt of 1–1,000 characters.');
  const adapter=await self.navigator.gpu?.requestAdapter({powerPreference:'high-performance'});
  if(!adapter||!adapter.features.has('shader-f16')||adapter.limits.maxStorageBufferBindingSize<DEVICE_GPU_MIN_BUFFER||adapter.limits.maxBufferSize<DEVICE_GPU_MIN_BUFFER)throw new Error('A compatible GPU is unavailable in this browser worker. Upload artwork or try another device.');
  const ort=configureDeviceRuntime();
  emit('progress',{stage:'runtime',message:'Checking the GPU runtime before credit authorization…'});
  await verifyDeviceRuntime(ort);
  // Native ORT owns device creation. Validate its actual device, not a separately created adapter device.
  device=await ort.env.webgpu.device;
  if(!device?.features.has('shader-f16')||device.limits.maxStorageBufferBindingSize<DEVICE_GPU_MIN_BUFFER||device.limits.maxBufferSize<DEVICE_GPU_MIN_BUFFER)throw new Error('The GPU runtime cannot provide the features or memory limits this model needs.');
  device.lost.then(info=>{if(info.reason!=='destroyed')emit('error',{message:'The GPU became unavailable. Close other tabs and retry. '});});
  const progress=value=>emit('progress',value);
  const asset=id=>loadDeviceAsset(DEVICE_ASSETS.find(a=>a.id===id),{onProgress:progress});
  const decoder=new TextDecoder();
  const vocab=JSON.parse(decoder.decode(await asset('vocab'))),merges=decoder.decode(await asset('merges'));
  // Verify the decoder download before asking the server to authorize a credit.
  let decoderBytes=await asset('vae');
  const beforeGenerate=()=>new Promise((resolve,reject)=>{
   creditDecision=receipt=>{creditDecision=null;if(receipt?.operationId!==job.id||receipt?.mode!=='device'||receipt?.creditsSpent!==1||receipt?.modelRevision!==DEVICE_MODEL_REVISION)reject(new Error('The credit authorization was invalid.'));else resolve();};
   emit('charge-required',{});
  });
  engine=createDeviceEngine({ort,vocab,merges,models:{textEncoder:()=>asset('textEncoder'),unet:()=>asset('unet'),vae:()=>{const bytes=decoderBytes;decoderBytes=null;return bytes}},progress,beforeGenerate});
  const seeds=await deviceSeeds(job.id);
  const images=await engine.generateThree(job.prompt.trim(),seeds);
  self.postMessage({type:'complete',id:job.id,images},images.map(image=>image.pixels.buffer));
 }catch(error){emit('error',{message:error?.message||'This device could not complete generation. Try freeing GPU memory or upload artwork. '});}
 finally{await engine?.dispose().catch(()=>{});device?.destroy();self.close();}
};
