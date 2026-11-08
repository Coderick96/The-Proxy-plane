import {PGlite} from '@electric-sql/pglite';import fs from 'node:fs';import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,storage,public to anon,authenticated,service_role;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);alter table storage.objects enable row level security;create function storage.foldername(text)returns text[] language sql immutable as $$select string_to_array($1,'/')$$;grant select,insert,update,delete on storage.objects to anon,authenticated;`);

for(const name of ['schema','community','premium','evolution'])await db.exec(fs.readFileSync(new URL('../../../supabase/'+name+'.sql',import.meta.url),'utf8'));
const current=fs.readFileSync(new URL('../../../supabase/credits.sql',import.meta.url),'utf8');
await db.exec(current.replace("kind='starter' and amount=10", "kind='starter' and amount=15"));
const uid='00000000-0000-4000-8000-000000000001';
await db.exec(`insert into auth.users values('${uid}');insert into public.pp_allowances(user_id,reference,kind,amount,remaining)values('${uid}','starter:${uid}','starter',15,15);`);
await db.exec(current);
assert.equal((await db.query('select remaining from public.pp_allowances where user_id=$1',[uid])).rows[0].remaining,15);
const newuid='00000000-0000-4000-8000-000000000002';await db.exec(`insert into auth.users values('${newuid}');`);
await assert.rejects(db.query('select public.pp_spend_credits($1,$2,1)',[newuid,'10000000-0000-4000-8000-000000000001']),/check constraint/);
console.log('CONFIRMED simulated historical15 starter check: reapplying current credits.sql preserves15 existing balance but new account10 starter reservation fails old CHECK. Actual deployed schema has not been inspected.');await db.close();
