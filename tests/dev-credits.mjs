import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import express from 'express';
import {mountDevCredits} from '../server/devCredits.js';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create table public.pp_credits(user_id uuid not null references auth.users,reference text primary key,amount integer not null,created_at timestamptz not null default now());grant usage on schema auth,public to anon,authenticated,service_role;`);
const sql=readFileSync(new URL('../supabase/dev_credits.sql',import.meta.url),'utf8');await db.exec(sql);await db.exec(sql);
const owner=randomUUID(),other=randomUUID();await db.query('insert into auth.users values($1),($2)',[owner,other]);await db.query("insert into pp_credits(user_id,reference,amount)values($1,'purchase:historical',7)",[owner]);
const call=async(uid,id,amount=100)=>(await db.query('select public.pp_dev_topoff($1,$2,$3) receipt',[uid,id,amount])).rows[0].receipt;
const total=async uid=>Number((await db.query('select coalesce(sum(amount),0) n from pp_credits where user_id=$1',[uid])).rows[0].n);
const id=randomUUID();const first=await call(owner,id);assert.equal(first.added,100);assert.equal(first.idempotent,false);assert.equal((await call(owner,id)).idempotent,true);assert.equal(await total(owner),107);
await assert.rejects(call(other,id),/conflicts/);await assert.rejects(call(owner,id,200),/conflicts/);assert.equal(await total(other),0);assert.equal(await total(owner),107);
for(const amount of [0,-1,10001,null])await assert.rejects(call(owner,randomUUID(),amount));assert.equal(await total(owner),107);
const concurrent=randomUUID();const duplicates=await Promise.all([call(owner,concurrent),call(owner,concurrent)]);assert.equal(duplicates.filter(r=>!r.idempotent).length,1);assert.equal(await total(owner),207);
assert.equal(Number((await db.query("select amount from pp_credits where reference='purchase:historical'")).rows[0].amount),7);
for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(call(owner,randomUUID()));await assert.rejects(db.query('select * from pp_dev_credit_topoffs'));await db.exec('reset role');}
await db.exec('set role service_role');const serviceOp=randomUUID();assert.equal((await call(owner,serviceOp)).added,100);await db.exec('reset role');assert.equal(await total(owner),307);
let rpcCalls=0;
const services={configured:true,user:async req=>{const token=req.headers.authorization;if(token==='Bearer owner')return {id:owner};if(token==='Bearer other')return {id:other};throw Object.assign(new Error('Sign in required'),{status:401})},rpc:async(name,args)=>{assert.equal(name,'pp_dev_topoff');rpcCalls++;return call(args.owner,args.operation,args.amount)}};
const env={BETA_MODE:'true',DEV_CREDIT_TOPOFF_ENABLED:'true',OWNER_USER_ID:owner,OWNER_TOPOFF_CODE:'fixture-development-code',VERCEL_ENV:'preview',NODE_ENV:'production'};
const app=express();app.use(express.json({limit:'2kb'}));const route=fn=>async(req,res)=>{try{await fn(req,res)}catch(e){res.status(e.status||500).json({error:e.message})}};mountDevCredits(app,{env,services,route});
const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const url='http://127.0.0.1:'+server.address().port+'/api/dev/credits/topoff';
const request=async(body,token='owner')=>{const response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:response.status,body:await response.json(),cache:response.headers.get('cache-control')}};
try{
 const requestId=randomUUID(),body={operationId:requestId,code:env.OWNER_TOPOFF_CODE};
 assert.equal((await request(body,'invalid')).status,401);assert.equal((await request(body,'other')).status,403);assert.equal((await request({...body,code:'wrong'})).status,403);assert.equal(rpcCalls,0);
 assert.equal((await request({...body,amount:9999})).status,400);assert.equal((await request({...body,operationId:'invalid'})).status,400);assert.equal((await request({...body,code:'x'.repeat(101)})).status,400);assert.equal(rpcCalls,0);
 const success=await request(body);assert.equal(success.status,200);assert.equal(success.body.added,100);assert.match(success.cache,/private, no-store/);assert.equal((await request(body)).body.idempotent,true);assert.equal(await total(owner),407);
 const upper={...body,operationId:randomUUID().toUpperCase()};const normalized=await request(upper);assert.equal(normalized.status,200);assert.equal(normalized.body.operationId,upper.operationId.toLowerCase());assert.equal(await total(owner),507);
 const before=rpcCalls;
 for(const [key,value] of [['VERCEL_ENV','production'],['BETA_MODE','false'],['DEV_CREDIT_TOPOFF_ENABLED','false']]){const old=env[key];env[key]=value;assert.equal((await request({...body,operationId:randomUUID()})).status,404);env[key]=old;}
 env.VERCEL_ENV='';assert.equal((await request(body)).status,404);env.VERCEL_ENV='preview';
 for(const key of ['OWNER_USER_ID','OWNER_TOPOFF_CODE']){const old=env[key];delete env[key];assert.equal((await request(body)).status,503);env[key]=old;}
 for(const amount of ['0','-1','10001','not-number','1.5']){env.DEV_CREDIT_TOPOFF_AMOUNT=amount;assert.equal((await request(body)).status,503);}delete env.DEV_CREDIT_TOPOFF_AMOUNT;
 services.configured=false;assert.equal((await request(body)).status,503);services.configured=true;assert.equal(rpcCalls,before);
 console.log('PASS owner development credits: real SQL additive wallet/history preservation, same-ID/queued-duplicate idempotency (multi-connection concurrency unverified), cross-owner/amount conflict rejection, service-only table/RPC, HTTP owner+code/auth/config gates, server-owned amount, preview allowance and production denial. No payment/provider calls.');
}finally{await new Promise(resolve=>server.close(resolve));await db.close()}
