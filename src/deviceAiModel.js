export const DEVICE_MODEL_REVISION='a310400909a293a7a937a54854910ed06469192b';
export const DEVICE_MODEL_NAME='DreamShaper 8 LCM · device model';
export const DEVICE_MODEL_URL='https://huggingface.co/skillsafeai/dreamshaper-8-lcm-onnx-webgpu';
export const DEVICE_MODEL_LICENSE='/licenses/device-ai-openrail-m.txt';
export const DEVICE_CACHE_NAME='proxy-plane-device-ai-'+DEVICE_MODEL_REVISION;
const base=DEVICE_MODEL_URL+'/resolve/'+DEVICE_MODEL_REVISION+'/';
export const DEVICE_ASSETS=Object.freeze([
 {id:'vocab',label:'Prompt vocabulary',path:'tokenizer/vocab.json',bytes:1059962,sha256:'e089ad92ba36837a0d31433e555c8f45fe601ab5c221d4f607ded32d9f7a4349'},
 {id:'merges',label:'Prompt tokenizer',path:'tokenizer/merges.txt',bytes:524619,sha256:'9fd691f7c8039210e0fced15865466c65820d09b63988b0174bfe25de299051a'},
 {id:'textEncoder',label:'Text model',path:'int8/text_encoder_int8.onnx',bytes:123612877,sha256:'ff9bd0225990f6827682cfe37cf95912135e4f84945ba7f3abfe70a19eeff8fb'},
 {id:'unet',label:'Artwork model',path:'int8/unet_int8.onnx',bytes:861356871,sha256:'a6bab857c28d27ac914a2d8e731011c0d9b361da7553efc6117e04f722e9f4ca'},
 {id:'vae',label:'Image decoder',path:'int8/vae_decoder_int8.onnx',bytes:49791103,sha256:'7556dbb3d599dbad393dc598b8bf28874245b721aa581f321dfbd0f7211f37d2'}
].map(file=>Object.freeze({...file,url:base+file.path})));
export const DEVICE_DOWNLOAD_BYTES=DEVICE_ASSETS.reduce((sum,file)=>sum+file.bytes,0);
export const DEVICE_GPU_MIN_BUFFER=256*1024*1024;
export async function checkDeviceSupport(scope=globalThis){
 if(scope.isSecureContext!==true)return {supported:false,message:'On-device generation needs HTTPS or localhost. Open the secure app address, or upload artwork instead.'};
 if(typeof scope.Worker!=='function'||!scope.navigator?.gpu?.requestAdapter)return {supported:false,message:'This browser does not provide the GPU features needed for on-device generation. Try an updated compatible browser, or upload artwork.'};
 try{
  const adapter=await scope.navigator.gpu.requestAdapter({powerPreference:'high-performance'});
  if(!adapter||adapter.isFallbackAdapter===true||!adapter.features.has('shader-f16')||(adapter.limits.maxStorageBufferBindingSize||0)<DEVICE_GPU_MIN_BUFFER||(adapter.limits.maxBufferSize||0)<DEVICE_GPU_MIN_BUFFER)return {supported:false,message:'This device’s available GPU cannot run this model. You can still upload artwork or use cloud mode when available.'};
  return {supported:true,message:'Required GPU features detected. Model loading will check whether enough memory is available.'};
 }catch{return {supported:false,message:'The browser could not access a compatible GPU. Close other GPU-heavy tabs and retry, or upload artwork.'};}
}
export async function clearDeviceModelCache(storage=globalThis.caches){
 if(!storage?.delete)throw new Error('This browser does not provide a removable model cache.');
 await storage.delete(DEVICE_CACHE_NAME);
}
