import assert from 'node:assert/strict';
import {LCM_TIMESTEPS,LCM_ALPHAS,seededGaussian,lcmStep,decodedPixels} from '../src/deviceAiMath.js';
import {createDeviceEngine} from '../src/deviceAiEngine.js';
assert.deepEqual(LCM_TIMESTEPS,[999,759,499,259]);
// Independent Python math.prod oracle for scaled-linear SD1.5 betas.
for(const [index,expected] of [[0,.99915],[259,.658975526890813],[499,.27766965045646763],[759,.05221292829431003],[999,.004660098513077234]])assert(Math.abs(LCM_ALPHAS[index]-expected)<1e-13);
const sample=Float32Array.of(.2,-.7,1.1),eps=Float32Array.of(.1,.3,-.2),noise=Float32Array.of(.5,-.25,.1);
const final=lcmStep(sample,eps,999,null,null),next=lcmStep(sample,eps,999,759,noise);
for(const [actual,expected] of [[final,[1.468298584632767,-14.638561833383374,19.036623123751788]],[next,[.8222801880578952,-3.588318996978467,4.4472509948985905]]])actual.forEach((x,i)=>assert(Math.abs(x-expected[i])<3e-6));
const first=seededGaussian(1234),second=seededGaussian(1234);assert.deepEqual(first(16384),second(16384));assert.deepEqual(first(16384),second(16384));assert.notDeepEqual(seededGaussian(0)(16),seededGaussian(1)(16));
const draws=seededGaussian(42)(100000),mean=draws.reduce((n,x)=>n+x,0)/draws.length,variance=draws.reduce((n,x)=>n+x*x,0)/draws.length-mean*mean;assert(Math.abs(mean)<.02);assert(Math.abs(variance-1)<.03);
assert.throws(()=>seededGaussian(-1),/seed/);assert.throws(()=>lcmStep(sample,Float32Array.of(0),999,null),/sample/);assert.throws(()=>lcmStep(sample,eps,759,999,noise),/continuation/);assert.throws(()=>lcmStep(sample,Float32Array.of(NaN,0,0),999,null),/invalid image/);
assert.throws(()=>lcmStep(Float32Array.of(3e38),Float32Array.of(-3e38),999,null),/invalid image/);
assert.deepEqual(Array.from(decodedPixels(Float32Array.of(-1,1,0,.5,1,-.5),2,1)),[0,128,255,255,255,191,64,255]);assert.throws(()=>decodedPixels(Float32Array.of(NaN,0,0),1,1),/invalid image/);
// Mock sessions exercise the real orchestration and graph contracts, not real GPU inference.
const calls=[],releases=[];let active=0,maxActive=0,failMetadata=false;
class Tensor{constructor(type,data,dims){Object.assign(this,{type,data,dims})}dispose(){}}
const specs={1:{key:'textEncoder',names:['input_ids'],types:['int64'],output:'last_hidden_state'},2:{key:'unet',names:['sample','timestep','encoder_hidden_states'],types:['float32','float32','float32'],output:'out_sample'},3:{key:'vae',names:['latent'],types:['float32'],output:'image'}};
const ort={Tensor,InferenceSession:{create:async(buffer,options)=>{assert.deepEqual(options.executionProviders,['webgpu']);const spec=specs[new Uint8Array(buffer)[0]];active++;maxActive=Math.max(maxActive,active);return {inputNames:spec.names,inputMetadata:spec.names.map((name,i)=>({name,type:failMetadata?'float16':spec.types[i]})),outputNames:[spec.output],release:async()=>{active--;releases.push(spec.key)},run:async feeds=>{calls.push({key:spec.key,feeds});if(spec.key==='textEncoder'){assert(feeds.input_ids.data instanceof BigInt64Array);return {last_hidden_state:new Tensor('float32',new Float32Array(77*768),[1,77,768])}}if(spec.key==='unet')return {out_sample:new Tensor('float32',new Float32Array(16384).fill(.01),[1,4,64,64])};return {image:new Tensor('float32',new Float32Array(3*512*512),[1,3,512,512])}}};}}};
const options={ort,models:{textEncoder:async()=>Uint8Array.of(1).buffer,unet:async()=>Uint8Array.of(2).buffer,vae:async()=>Uint8Array.of(3).buffer},vocab:{'<|startoftext|>':49406,'<|endoftext|>':49407,'a</w>':320},merges:'#version: 0.2\n'};
const engine=createDeviceEngine(options),images=await engine.generateThree('a',[1,2,3]);assert.equal(images.length,3);assert.equal(calls.filter(x=>x.key==='unet').length,12);assert.equal(calls.filter(x=>x.key==='textEncoder').length,1);assert.equal(calls.filter(x=>x.key==='vae').length,3);assert.equal(maxActive,1);assert.deepEqual(releases,['textEncoder','unet','vae']);assert(images.every(x=>x.width===512&&x.height===512&&x.pixels.length===512*512*4));assert.deepEqual(Array.from(images[0].pixels.slice(0,4)),[128,128,128,255]);
// Compare the decoder feed directly to independent scheduler steps: no extra /0.18215.
const rng=seededGaussian(1);let expected=rng(16384);for(let i=0;i<4;i++){const t=LCM_TIMESTEPS[i],nextT=LCM_TIMESTEPS[i+1];expected=lcmStep(expected,new Float32Array(16384).fill(.01),t,nextT,nextT===undefined?null:rng(16384));}assert.deepEqual(calls.find(x=>x.key==='vae').feeds.latent.data,expected);
await engine.dispose();await assert.rejects(engine.generateThree('a',[1,2,3]),/canceled/);
failMetadata=true;const incompatible=createDeviceEngine(options);await assert.rejects(incompatible.generateThree('a',[1,2,3]),/tensor type/);assert.equal(active,0);await incompatible.dispose();
console.log('PASS LCM independent numeric oracles, deterministic Gaussian/statistics, CHW image conversion, sequential released sessions, 3-image/12-step pipeline, correct VAE scaling and incompatible model rejection (mock sessions; no GPU inference).');
