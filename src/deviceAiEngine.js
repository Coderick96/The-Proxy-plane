import {createDeviceTokenizer} from './deviceAiTokenizer.js';
import {LCM_TIMESTEPS,seededGaussian,lcmStep,decodedPixels} from './deviceAiMath.js';
const LATENT_SHAPE=[1,4,64,64],TEXT_SHAPE=[1,77,768],IMAGE_SHAPE=[1,3,512,512],LATENT_COUNT=16384;
const CONTRACTS={
 textEncoder:{inputs:{input_ids:'int64'},output:'last_hidden_state',shape:TEXT_SHAPE},
 unet:{inputs:{sample:'float32',timestep:'float32',encoder_hidden_states:'float32'},output:'out_sample',shape:LATENT_SHAPE},
 vae:{inputs:{latent:'float32'},output:'image',shape:IMAGE_SHAPE}
};
function disposeTensors(tensors){for(const tensor of Object.values(tensors||{})){try{tensor.dispose?.();}catch{/* CPU tensors may already be disposed. */}}}
function metadataType(session,name){
 const meta=session.inputMetadata,info=Array.isArray(meta)?meta[session.inputNames.indexOf(name)]:meta?.[name];
 const type=info?.tensorType||info?.type;
 return ({'tensor(float)':'float32','tensor(int64)':'int64'})[type]||type;
}
function validateSession(session,key){
 const spec=CONTRACTS[key],names=Object.keys(spec.inputs);
 if(!Array.isArray(session.inputNames)||session.inputNames.length!==names.length||names.some(name=>!session.inputNames.includes(name))||!session.outputNames?.includes(spec.output))throw new Error(`The ${key} model interface does not match this device generator.`);
 for(const [name,expected] of Object.entries(spec.inputs)){
  const type=metadataType(session,name);
  if(type&&type!==expected)throw new Error(`The ${key} model input ${name} has an unsupported tensor type.`);
 }
}
function outputValues(outputs,key){
 const spec=CONTRACTS[key],tensor=outputs[spec.output];
 if(!tensor||tensor.type!=='float32'||!(tensor.data instanceof Float32Array)||tensor.dims?.length!==spec.shape.length||tensor.dims.some((size,i)=>size!==spec.shape[i])||tensor.data.length!==spec.shape.reduce((a,b)=>a*b,1))throw new Error(`The ${key} model returned an unexpected tensor.`);
 return tensor.data;
}
export function createDeviceEngine({ort,models,vocab,merges,progress=()=>{},beforeGenerate=async()=>{}}){
 if(!ort?.InferenceSession?.create||!ort?.Tensor||!models)throw new Error('The device inference runtime is unavailable.');
 const tokenize=createDeviceTokenizer(vocab,merges),sessions=new Set();let disposed=false,busy=false;
 const alive=()=>{if(disposed)throw new Error('Device generation was canceled.');};
 async function session(key){
  alive();progress({stage:'loading',model:key,message:`Preparing ${key} on your GPU…`});
  const source=typeof models[key]==='function'?await models[key]():await models[key];alive();
  if(!(source instanceof ArrayBuffer)&&!(source instanceof Uint8Array))throw new Error(`The ${key} model download is incomplete.`);
  const value=await ort.InferenceSession.create(source,{executionProviders:['webgpu'],graphOptimizationLevel:'all',preferredOutputLocation:'cpu'});
  sessions.add(value);try{alive();validateSession(value,key);return value;}catch(error){await release(value);throw error;}
 }
 async function release(value){if(sessions.delete(value))await value.release();}
 async function run(value,feeds,key){let outputs;try{alive();outputs=await value.run(feeds);alive();return {outputs,values:outputValues(outputs,key)};}catch(error){disposeTensors(outputs);throw error;}finally{disposeTensors(feeds);}}
 return {
  async generateThree(prompt,seeds){
   alive();if(busy)throw new Error('Device generation is already running.');
   if(!Array.isArray(seeds)||seeds.length!==3||seeds.some(x=>!Number.isInteger(x)||x<0||x>0xffffffff))throw new Error('Provide three unsigned 32-bit image seeds.');
   const ids=tokenize(prompt);busy=true;
   try{
    let embeddings;
    const text=await session('textEncoder');
    try{progress({stage:'encoding',message:'Reading your artwork prompt on this device…'});const result=await run(text,{input_ids:new ort.Tensor('int64',ids,[1,77])},'textEncoder');try{if(result.values.some(x=>!Number.isFinite(x)))throw new Error('The text model returned invalid prompt values.');embeddings=new Float32Array(result.values);}finally{disposeTensors(result.outputs);}}
    finally{await release(text);}
    const latents=[],unet=await session('unet');
    try{
     alive();await beforeGenerate();alive();
     for(let image=0;image<3;image++){
      const noise=seededGaussian(seeds[image]);let sample=noise(LATENT_COUNT);
      for(let step=0;step<LCM_TIMESTEPS.length;step++){
       alive();const t=LCM_TIMESTEPS[step];progress({stage:'generating',image:image+1,total:3,step:step+1,steps:4,message:`Creating option ${image+1} of 3 · step ${step+1} of 4…`});
       const result=await run(unet,{sample:new ort.Tensor('float32',sample,LATENT_SHAPE),timestep:new ort.Tensor('float32',Float32Array.of(t),[1]),encoder_hidden_states:new ort.Tensor('float32',embeddings,TEXT_SHAPE)},'unet');
       try{const next=LCM_TIMESTEPS[step+1];sample=lcmStep(sample,result.values,t,next,next===undefined?null:noise(LATENT_COUNT));}finally{disposeTensors(result.outputs);}
      }
      latents.push(sample);
     }
    }finally{await release(unet);}
    // This specific pinned VAE performs the 0.18215 scaling internally.
    const images=[],vae=await session('vae');
    try{
     for(let image=0;image<3;image++){
      alive();progress({stage:'decoding',image:image+1,total:3,message:`Finishing option ${image+1} of 3…`});
      const result=await run(vae,{latent:new ort.Tensor('float32',latents[image],LATENT_SHAPE)},'vae');
      try{images.push({pixels:decodedPixels(result.values),width:512,height:512,seed:seeds[image]});}finally{disposeTensors(result.outputs);}
     }
    }finally{await release(vae);}
    alive();return images;
   }finally{busy=false;await Promise.allSettled([...sessions].map(release));}
  },
  async dispose(){disposed=true;if(!busy)await Promise.allSettled([...sessions].map(release));}
 };
}
