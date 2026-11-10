import * as ort from 'onnxruntime-web/webgpu';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url';
import runtimeUrl from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url';
import {createDeviceEngine} from './deviceAiEngine.js';
import {DEVICE_ASSETS,DEVICE_GPU_MIN_BUFFER} from './deviceAiModel.js';
import {loadDeviceAsset} from './deviceAiDownloads.js';
let started=false;
self.onmessage=async event=>{
 const job=event.data;if(started||job?.type!=='generate')return;started=true;let engine,device;
 const emit=(type,data)=>self.postMessage({type,id:job.id,...data});
 try{
  if(typeof job.id!=='string'||typeof job.prompt!=='string'||!job.prompt.trim()||job.prompt.length>1000)throw new Error('Enter an artwork prompt of 1–1,000 characters.');
  const adapter=await self.navigator.gpu?.requestAdapter({powerPreference:'high-performance'});
  if(!adapter||!adapter.features.has('shader-f16')||adapter.limits.maxStorageBufferBindingSize<DEVICE_GPU_MIN_BUFFER||adapter.limits.maxBufferSize<DEVICE_GPU_MIN_BUFFER)throw new Error('A compatible GPU is unavailable in this browser worker. Upload artwork or try another device.');
  device=await adapter.requestDevice({requiredFeatures:['shader-f16'],requiredLimits:{maxStorageBufferBindingSize:Math.min(adapter.limits.maxStorageBufferBindingSize,512*1024*1024),maxBufferSize:Math.min(adapter.limits.maxBufferSize,1024*1024*1024)}});
  ort.env.webgpu.device=device;ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths={wasm:wasmUrl,mjs:runtimeUrl};
  device.lost.then(info=>{if(info.reason!=='destroyed')emit('error',{message:'The GPU became unavailable. Close other tabs and retry. No AI credits were spent.'});});
  const progress=value=>emit('progress',value);
  const asset=id=>loadDeviceAsset(DEVICE_ASSETS.find(a=>a.id===id),{onProgress:progress});
  const decoder=new TextDecoder();
  const vocab=JSON.parse(decoder.decode(await asset('vocab'))),merges=decoder.decode(await asset('merges'));
  engine=createDeviceEngine({ort,vocab,merges,models:{textEncoder:()=>asset('textEncoder'),unet:()=>asset('unet'),vae:()=>asset('vae')},progress});
  const seeds=Array.from(crypto.getRandomValues(new Uint32Array(3)));
  const images=await engine.generateThree(job.prompt.trim(),seeds);
  self.postMessage({type:'complete',id:job.id,images},images.map(image=>image.pixels.buffer));
 }catch(error){emit('error',{message:error?.message||'This device could not complete generation. Try freeing GPU memory or upload artwork. No AI credits were spent.'});}
 finally{await engine?.dispose().catch(()=>{});device?.destroy();self.close();}
};
