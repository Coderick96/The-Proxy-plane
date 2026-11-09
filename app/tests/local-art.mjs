import assert from 'node:assert/strict';
import {generateKeyPairSync,verify} from 'node:crypto';
import express from 'express';
import {mountLocalArt} from '../server/localArt.js';
import {createApp} from '../server/index.js';

const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const env={LOCAL_ART_PRIVATE_KEY:privateKey.export({type:'pkcs8',format:'pem'})};
const ledger=new Map();let balance=5,studio=false,spends=0;
const services={
 user:async req=>{if(req.headers.authorization!=='Bearer valid')throw Object.assign(new Error('Sign in'),{status:401});return {id:'owner'};},
 access:async()=>({studio}),
 admin:{from:()=>({select:()=>({eq:(_key,operation)=>({maybeSingle:async()=>({data:ledger.get(operation)||null})})})})},
 rpc:async(name,args)=>{assert.equal(name,'pp_spend_credits');assert.equal(args.owner,'owner');assert.equal(args.amount,1);if(ledger.has(args.operation))throw new Error('Request already processed');if(!balance)throw new Error('No credits');ledger.set(args.operation,{user_id:args.owner,refunded:false});balance--;spends++;}
};
const app=express();app.use(express.json());
mountLocalArt(app,{env,services,route:fn=>async(req,res)=>{try{await fn(req,res);}catch(e){res.status(e.status||500).json({error:e.message});}}});
const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
const base='http://127.0.0.1:'+server.address().port;
const body={requestId:'00000000-0000-4000-8000-000000000001',prompt:'A moonlit mountain',size:'1024x1536'};
async function request(value=body,token='valid'){
 const response=await fetch(base+'/api/local-art/authorize',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(value)});
 return {status:response.status,data:await response.json()};
}
try{
 const currentAccess=services.access;
 services.access=async()=>{throw Object.assign(new Error('Credit schema is outdated'),{status:503});};
 assert.equal((await request()).status,503);assert.equal(spends,0);
 services.access=currentAccess;
 assert.equal((await request(body,'bad')).status,401);
 assert.equal((await request({...body,prompt:'bad'})).status,400);assert.equal(spends,0);
 assert.equal((await request({...body,source:'data:image/png;base64,AAAA'})).status,403);assert.equal(spends,0);
 const first=await request();assert.equal(first.status,200);assert.equal(first.data.choices,3);assert.equal(spends,1);
 const [payload,sig]=first.data.ticket.split('.');assert(verify(null,Buffer.from(payload),publicKey,Buffer.from(sig,'base64url')));
 const claims=JSON.parse(Buffer.from(payload,'base64url'));assert.equal(claims.prompt,body.prompt);assert.equal(claims.choices,3);assert.equal(claims.aud,'proxy-plane-local-art');
 const replay=await request();assert.equal(replay.data.job,first.data.job);assert.equal(spends,1);
 const concurrent=await Promise.all([request(),request(),request()]);assert(concurrent.every(x=>x.status===200));assert.equal(spends,1);
 const changed=await request({...body,prompt:'A different mountain'});assert.notEqual(changed.data.job,first.data.job);assert.equal(spends,2);
 ledger.get(first.data.job).refunded=true;assert.equal((await request()).status,409);assert.equal(spends,2);
 studio=true;assert.equal((await request({...body,source:'data:image/png;base64,AAAA'})).status,200);assert.equal(spends,3);
 balance=0;assert.equal((await request({...body,requestId:'00000000-0000-4000-8000-000000000002'})).status,500);assert.equal(spends,3);
 delete env.LOCAL_ART_PRIVATE_KEY;assert.equal((await request()).status,503);assert.equal(spends,3);
 console.log('Passed real HTTP auth, Ed25519 verification, fixed batch/cost, prompt binding, replay/concurrent deduplication, refunded-ticket rejection, re-sketch entitlement and credit failure checks.');
}finally{await new Promise(resolve=>server.close(resolve));}

// No paid provider may be reached in the default local mode.
const guarded=createApp({env:{},services:{...services,configured:true},fetcher:()=>{throw new Error('Unexpected paid request');}}).listen(0,'127.0.0.1');
await new Promise(resolve=>guarded.once('listening',resolve));
try{for(const path of ['/api/generate-art','/api/ai/resketch']){
 const response=await fetch('http://127.0.0.1:'+guarded.address().port+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:'A landscape'})});assert.equal(response.status,409);
}console.log('Passed default-mode paid image endpoint blocking.');}finally{await new Promise(resolve=>guarded.close(resolve));}

await import('./local-art-client.mjs');
const betaServices={...services,rpc:async(name,args)=>name==='pp_beta_status'?{enabled:true,configured:true,ownerId:'owner'}:services.rpc(name,args)};
const beta=createApp({env:{BETA_MODE:'true',BETA_AI_ENABLED:'true',OWNER_USER_ID:'owner'},services:betaServices}).listen(0,'127.0.0.1');
await new Promise(resolve=>beta.once('listening',resolve));
try{
 const url='http://127.0.0.1:'+beta.address().port+'/api/local-art/config';
 assert.equal((await fetch(url)).status,401);
 assert.equal((await fetch(url,{headers:{Authorization:'Bearer valid'}})).status,200);
 console.log('Passed actual private-beta config authentication and outdated-credit-schema denial.');
}finally{await new Promise(resolve=>beta.close(resolve));}
if(process.argv.includes('--browser'))await import('./local-art-browser.cjs');
if(process.argv.includes('--legacy'))await import('./ai-safety.mjs');
