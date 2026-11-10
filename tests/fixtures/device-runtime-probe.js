import * as ort from 'onnxruntime-web/webgpu';
import wrongWasm from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.wasm?url';
import wrongMjs from 'onnxruntime-web/ort-wasm-simd-threaded.jsep.mjs?url';
import {configureDeviceRuntime,verifyDeviceRuntime} from '../../src/deviceAiRuntime.js';
export async function probeRuntime(broken=false){
 const adapter=await navigator.gpu?.requestAdapter({powerPreference:'high-performance'});
 if(!adapter)return {blocked:true,reason:'No browser GPU adapter'};
 const gpuErrors=[];
 try{
  if(broken){ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;ort.env.wasm.wasmPaths={wasm:wrongWasm,mjs:wrongMjs};}
  else configureDeviceRuntime();
  await verifyDeviceRuntime(ort);return {ok:true,expectedOutput:3.5,adapter:adapter.info?.architecture||'unreported'};
 }catch(error){return {ok:false,error:error.message,gpuErrors};}
 finally{ort.env.webgpu.device?.destroy();}
}
