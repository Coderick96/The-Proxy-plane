import {PGlite} from '@electric-sql/pglite';import fs from 'node:fs';import assert from 'node:assert/strict';
const credits=fs.readFileSync(new URL('../../../supabase/credits.sql',import.meta.url),'utf8');
async function setup(){const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,storage,public to anon,authenticated,service_role;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);alter table storage.objects enable row level security;create function storage.foldername(text)returns text[] language sql immutable as $$select string_to_array($1,'/')$$;grant select,insert,update,delete on storage.objects to anon,authenticated;`);
for(const name of ['schema','community','premium','evolution'])await db.exec(fs.readFileSync(new URL('../../../supabase/'+name+'.sql',import.meta.url),'utf8'));return db}
const old='00000000-0000-4000-8000-000000000001',fresh='00000000-0000-4000-8000-000000000002';
for(const legacy of [false,true]){
 const db=await setup();
 try{
  // Reconstruct the historical schema from its original exact entitlement expression.
  await db.exec(legacy?credits.replace("amount=10 and subscription is null", "amount=15 and subscription is null").replace(/-- Reconcile only recognized historical[\s\S]*?end;\$\$;\n/,''):credits);
  await db.exec(`insert into auth.users values('${old}'),('${fresh}');insert into public.pp_credits(user_id,reference,amount)values('${old}','historical-paid-wallet',80);`);
  if(legacy)await db.exec(`insert into public.pp_allowances(user_id,reference,kind,amount,remaining)values('${old}','starter:${old}','starter',15,7)`);
  const before=(await db.query('select * from public.pp_allowances')).rows;
  const wallet=(await db.query('select * from public.pp_credits')).rows;
  await db.exec(credits);await db.exec(credits);
  assert.deepEqual((await db.query('select * from public.pp_allowances')).rows,before);
  assert.deepEqual((await db.query('select * from public.pp_credits')).rows,wallet);
  await db.query('select public.pp_spend_credits($1,$2,3)',[fresh,'10000000-0000-4000-8000-000000000001']);
  assert.deepEqual((await db.query('select amount,remaining from public.pp_allowances where user_id=$1',[fresh])).rows,[{amount:10,remaining:7}]);
  if(legacy)assert.deepEqual((await db.query('select amount,remaining from public.pp_allowances where user_id=$1',[old])).rows,[{amount:15,remaining:7}]);
  assert.deepEqual((await db.query('select * from public.pp_credits')).rows,wallet);
  await db.exec("alter table public.pp_allowances add constraint custom_starter_policy check(kind<>'starter' or amount=15) not valid");
  const constraintsBefore=(await db.query("select conname,pg_get_constraintdef(oid) definition,convalidated from pg_constraint where conrelid='public.pp_allowances'::regclass order by conname")).rows;
  await assert.rejects(db.exec(credits),/Unrecognized pp_allowances CHECK constraint "custom_starter_policy"/);
  await db.exec('rollback');
  assert.deepEqual((await db.query("select conname,pg_get_constraintdef(oid) definition,convalidated from pg_constraint where conrelid='public.pp_allowances'::regclass order by conname")).rows,constraintsBefore);
  assert.equal((await db.query("select count(*)::integer n from pg_class where relname='pp_allowance_check_reference' and relnamespace=pg_my_temp_schema()")).rows[0].n,0);
  assert.equal((await db.query("select count(*)::integer n from pg_constraint where conrelid='public.pp_allowances'::regclass and conname='custom_starter_policy'")).rows[0].n,1);
  assert.deepEqual((await db.query('select * from public.pp_credits')).rows,wallet);
 }finally{await db.close()}
}
console.log('PASS independent full constraint-catalog rollback snapshot and temporary-table cleanup;  fresh and historical 15-credit schema compatibility: repeat setup, unchanged used legacy balances and paid wallet, new 10-credit spend, unknown custom CHECK rejected atomically.');
