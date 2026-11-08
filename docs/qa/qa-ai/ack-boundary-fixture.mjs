import {PGlite} from '/workspace/proxy-plane-latest/node_modules/@electric-sql/pglite/dist/index.js';import fs from 'node:fs';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {createAIRecovery} from '/workspace/proxy-plane-latest/server/aiRecovery.js';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,storage,public to anon,authenticated,service_role;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);alter table storage.objects enable row level security;create function storage.foldername(text)returns text[] language sql immutable as $$select string_to_array($1,'/')$$;grant select,insert,update,delete on storage.objects to anon,authenticated;`);
for(const name of ['schema','community','premium','evolution','credits','ai_recovery','ai_recovery'])await db.exec(fs.readFileSync('/workspace/proxy-plane-latest/supabase/'+name+'.sql','utf8'));
const a=randomUUID(),b=randomUUID();await db.query('insert into auth.users values ($1),($2)',[a,b]);await db.exec('set role service_role');
const rpc=async(name,args)=>{const keys=Object.keys(args);return (await db.query(`select public.${name}(${keys.map((k,i)=>k+'=> $'+(i+1)).join(',')}) value`,Object.values(args))).rows[0].value};
const service=()=>createAIRecovery({rpc});const reserve=(id,owner=a)=>rpc('pp_ai_reserve',{owner,operation:id,kind:'art',fingerprint:'abc',amount:1});
const state=async id=>(await rpc('pp_ai_results',{owner:a,operation:id}))[0];
const crash=randomUUID();await reserve(crash);await db.query("update pp_ai_operations set lease_until=now()-interval '1 second' where operation=$1",[crash]);await service().reconcile();assert.equal((await state(crash)).state,'refunded');
const id=randomUUID();assert.equal((await reserve(id)).fresh,true);assert.equal((await reserve(id)).fresh,false);await assert.rejects(reserve(id,b));
await rpc('pp_ai_complete',{owner:a,operation:id,payload:{images:['a','b','c'],creditsSpent:1}});await rpc('pp_ai_fail',{owner:a,operation:id});await service().reconcile();assert.equal((await state(id)).state,'completed');assert.deepEqual(await rpc('pp_ai_results',{owner:b,operation:id}),[]);
const retry=randomUUID();await reserve(retry);await rpc('pp_ai_fail',{owner:a,operation:retry});
await db.exec(`reset role;create function public.pp_test_refund_failure() returns trigger language plpgsql as $$ begin raise exception 'simulated refund outage'; end $$;create trigger pp_test_failure before update on public.pp_ai_charges for each row execute function public.pp_test_refund_failure();set role service_role`);
await service().reconcile();assert.equal((await state(retry)).state,'refund_pending');await db.exec('reset role;drop trigger pp_test_failure on public.pp_ai_charges;set role service_role');await db.query("update pp_ai_operations set lease_until=now()-interval '1 second' where operation=$1",[retry]);await service().reconcile();assert.equal((await state(retry)).state,'refunded');
await assert.rejects(rpc('pp_ai_complete',{owner:a,operation:retry,payload:{images:[]}}));
const legacy=randomUUID();await rpc('pp_spend_credits',{owner:a,operation:legacy,amount:1});await service().reconcile();assert.equal((await db.query('select refunded from pp_ai_charges where operation=$1',[legacy])).rows[0].refunded,false);
let calls=0;const op=randomUUID(),input={owner:a,kind:'art',body:{operationId:op,prompt:'test'},cost:1,before:async()=>{},after:async()=>{},work:async()=>{calls++;return {images:['a','b','c']}}};const first=await service().run(input),duplicate=await service().run(input);assert.deepEqual(first,duplicate);assert.equal(calls,1);assert.equal(first.images.length,3);assert.equal(first.creditsSpent,1);
const concurrent=randomUUID();const dup=await Promise.all([reserve(concurrent),reserve(concurrent)]);assert.equal(dup.filter(r=>r.fresh).length,1);await rpc('pp_ai_fail',{owner:a,operation:concurrent});await service().reconcile();

// Independently injected acknowledgement-loss boundaries: commit occurs but response is lost.
for (const boundary of ['pp_ai_reserve','pp_ai_complete']) {
 const operationId=randomUUID();let lost=false,works=0;
 const flaky=createAIRecovery({rpc:async(name,args)=>{const result=await rpc(name,args);if(name===boundary&&!lost){lost=true;throw new Error('ack lost after commit')}return result;}});
 const request={owner:a,kind:'art',body:{operationId,prompt:boundary},cost:1,before:async()=>{},after:async()=>{},work:async()=>{works++;return {images:['safe']}}};
 await assert.rejects(flaky.run(request));
 const record=await state(operationId);
 if(boundary==='pp_ai_complete') {assert.equal(record.state,'completed');assert.equal((await service().run(request)).images[0],'safe');assert.equal(works,1);}
 else {assert.equal(record.state,'running');assert.equal(works,0);await db.query("update pp_ai_operations set lease_until=now()-interval '1 second' where operation=$1",[operationId]);await service().reconcile();assert.equal((await state(operationId)).state,'refunded');}
}
console.log('PASS independent reserve/complete acknowledgement loss boundaries');
await db.exec('reset role;set role authenticated');
await assert.rejects(db.query('select * from pp_ai_operations'));await assert.rejects(rpc('pp_ai_reconcile',{batch_size:20}));await db.close();console.log('PASS durable AI crash/lease refund, retry after refund outage, duplicate delivery, terminal-state races, owner isolation, historical preservation, service-only grants, 3-choice cost.');
