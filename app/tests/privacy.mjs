import {PGlite} from '@electric-sql/pglite';
import {fileURLToPath} from 'node:url';import fs from 'node:fs';import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,storage,public to anon,authenticated;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
grant select,insert,update,delete on storage.objects to anon,authenticated;`);
const root=fileURLToPath(new URL('../',import.meta.url));
await db.exec(fs.readFileSync(root+'supabase/schema.sql','utf8'));
await db.exec(`insert into auth.users values('00000000-0000-4000-8000-000000000009');insert into public.proxy_kingdom_projects(user_id,project_json)values('00000000-0000-4000-8000-000000000009','{}');`);
await db.exec(fs.readFileSync(root+'supabase/community.sql','utf8'));
// Migration must be safe to run twice.
await db.exec(fs.readFileSync(root+'supabase/community.sql','utf8'));
assert.equal((await db.query("select visibility from public.proxy_kingdom_projects where user_id='00000000-0000-4000-8000-000000000009'")).rows[0].visibility,'private');
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002',c='00000000-0000-4000-8000-000000000003';
const cp='10000000-0000-4000-8000-000000000001',cs='10000000-0000-4000-8000-000000000002',cb='10000000-0000-4000-8000-000000000003';
const ids=[1,2,3,4,5].map(n=>`20000000-0000-4000-8000-00000000000${n}`);
await db.exec(`insert into auth.users values('${a}'),('${b}'),('${c}');
insert into public.pk_profiles(id,username,display_name,is_public) values('${a}','alice','Alice',true),('${b}','bob','Bob',true),('${c}','secret','Secret',false);
insert into public.pk_collections(id,user_id,name,visibility)values('${cp}','${a}','Public collection','public'),('${cs}','${a}','Private collection','private'),('${cb}','${b}','Bob collection','public');`);
for(let i=0;i<5;i++){
 const owner=i===4?c:a;const visibility=i===1?'private':'public';const coll=i===2?cs:i<2?cp:null;
 await db.query('insert into public.proxy_kingdom_projects(id,user_id,title,project_json,visibility,collection_id)values($1,$2,$3,$4,$5,$6)',[ids[i],owner,'Card '+i,{secret:'private editable project'},visibility,coll]);
 await db.query('insert into public.pk_posts(project_id,owner_id,title,image_path)values($1,$2,$3,$4)',[ids[i],owner,'Card '+i,`${owner}/${ids[i]}.png`]);
 await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['proxy-kingdom-community',`${owner}/${ids[i]}.png`]);
}
await db.query("insert into storage.objects(bucket_id,name)values('proxy-kingdom-art',$1)",[`${a}/original.png`]);
async function as(role,user=''){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${user}',false);set role ${role}`)}
const count=async sql=>Number((await db.query(sql)).rows[0].n);
const denied=async(sql,args=[])=>{let threw=false;try{await db.query(sql,args)}catch{threw=true}assert(threw,'Expected denial: '+sql)};
await as('anon');assert.equal(await count('select count(*) n from public.pk_gallery()'),2);await denied('select project_json from public.proxy_kingdom_projects');assert.equal(await count("select count(*) n from storage.objects where bucket_id='proxy-kingdom-community'"),2);assert.equal(await count("select count(*) n from storage.objects where bucket_id='proxy-kingdom-art'"),0);
await as('authenticated',b);assert.equal(await count('select count(*) n from public.proxy_kingdom_projects'),0);assert.equal(await count('select count(*) n from public.pk_posts'),2);assert.equal(await count(`select count(*) n from public.pk_collections where user_id='${a}'`),1);
await denied(`insert into public.pk_follows(follower_id,creator_id)values('${a}','${c}')`);await denied(`insert into public.pk_follows(follower_id,creator_id)values('${b}','${b}')`);
await db.exec(`insert into public.pk_follows(follower_id,creator_id)values('${b}','${a}')`);assert.equal(await count('select count(*) n from public.pk_gallery(null,null,true)'),2);
await as('authenticated',a);assert.equal(await count('select count(*) n from public.proxy_kingdom_projects'),4);assert.equal(await count('select count(*) n from public.pk_gallery()'),2);
await denied('insert into public.proxy_kingdom_projects(user_id,title,project_json,collection_id)values($1,$2,$3,$4)',[a,'Wrong owner',{},cb]);await denied('insert into public.pk_posts(project_id,owner_id,title,image_path)values($1,$2,$3,$4)',[ids[4],a,'Wrong owner',`${a}/${ids[4]}.png`]);
await db.exec(`update public.pk_collections set visibility='private' where id='${cp}'`);
await as('authenticated',b);assert.equal(await count('select count(*) n from public.pk_gallery()'),1);assert.equal(await count("select count(*) n from storage.objects where bucket_id='proxy-kingdom-community'"),1);
await as('authenticated',a);await db.exec('update public.pk_profiles set is_public=false');
await as('anon');assert.equal(await count('select count(*) n from public.pk_gallery()'),0);assert.equal(await count("select count(*) n from storage.objects where bucket_id='proxy-kingdom-community'"),0);
await as('authenticated',b);assert.equal(await count('select count(*) n from public.pk_gallery(null,null,true)'),0);
await as('authenticated',a);await db.exec("update public.pk_profiles set is_public=true;update public.pk_collections set visibility='public'");await db.exec(`update public.proxy_kingdom_projects set visibility='private' where id='${ids[3]}'`);
await as('anon');assert.equal(await count('select count(*) n from public.pk_gallery()'),2); // public card in formerly private collection reappears, individually private card does not
console.log('Passed migration repeatability, default privacy, anonymous/other-owner isolation, profile/collection/card privacy, storage reads, following feed and ownership constraint checks.');await db.close();
