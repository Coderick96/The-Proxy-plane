import assert from 'node:assert/strict';
import {generateLocalArt} from '../src/localArt.js';
const saved=new Map(),requests=[];
const original=Object.fromEntries(['sessionStorage','window','CustomEvent','fetch'].map(key=>[key,global[key]]));
global.sessionStorage={getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)};
global.window={dispatchEvent:()=>{}};
global.CustomEvent=class{constructor(name,options){this.type=name;this.detail=options.detail;}};
let fail=true,ready=true;
global.fetch=async(url,options)=>{
 if(url.endsWith('/health'))return {ok:true,json:async()=>({ready,message:'Not ready'})};
 if(url.endsWith('/jobs'))return {ok:true,json:async()=>({job:'test'})};
 assert(url.endsWith('/jobs/test'));
 return {ok:true,json:async()=>fail?{status:'failed',error:'Simulated GPU error'}:{status:'complete',images:Array(3).fill('data:image/png;base64,AAAA'),profile:{model:'sd15'}}};
};
const authorize=async(path,payload)=>{assert.equal(path,'/api/local-art/authorize');requests.push(payload);return {job:'test',ticket:'signed'};};
const body={prompt:'A moonlit forest',size:'1024x1536'};
ready=false;await assert.rejects(generateLocalArt(authorize,body,'owner'),/Not ready/);assert.equal(requests.length,0);
ready=true;await assert.rejects(generateLocalArt(authorize,body,'owner'),/without another credit/);assert.equal(saved.size,1);
fail=false;const result=await generateLocalArt(authorize,body,'owner');assert.equal(result.images.length,3);assert.equal(requests[0].requestId,requests[1].requestId);assert.equal(saved.size,0);
await generateLocalArt(authorize,body,'owner');assert.notEqual(requests[1].requestId,requests[2].requestId);
console.log('Passed client preflight before authorization, retry-ID persistence, three-choice validation and deliberate new-batch behavior.');
for(const [key,value] of Object.entries(original)){if(value===undefined)delete global[key];else global[key]=value;}
