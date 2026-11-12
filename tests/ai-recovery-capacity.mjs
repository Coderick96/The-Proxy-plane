// Disposable capacity fixtures only. Never accepts a hosted URL, project or container.
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const native=process.argv.includes('--native');
const image='postgres:17.6-bookworm@sha256:f3bd19c606e442c3d7bdfa8002e03fe260a1023351e0ea4598032022b68dd6e3';
const container='proxy-plane-capacity-'+randomUUID();
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
let started=false;
function docker(args,input=''){return new Promise((resolve,reject)=>{
 const env={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key];
 const child=spawn('docker',['--host=unix:///var/run/docker.sock',...args],{env,stdio:['pipe','pipe','pipe']});let out='',err='';const timer=setTimeout(()=>child.kill('SIGKILL'),60000);
 child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);child.on('error',e=>{clearTimeout(timer);reject(e)});child.on('close',(code,signal)=>{clearTimeout(timer);code===0?resolve(out.trim()):reject(Error(err.trim()||`docker exited ${code}/${signal}`))});child.stdin.on('error',()=>{});child.stdin.end(input);
})}
const psql=(sql,role='postgres')=>docker(['exec','-i',container,'psql','-U','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],`set statement_timeout='45s';set lock_timeout='30s';set role ${role};\n${sql}`);
let db;
try{
 if(native){
  await docker(['run','--detach','--pull=never','--network=none','--name',container,'--label','app=proxy-plane-disposable-capacity-qa','-e','POSTGRES_HOST_AUTH_METHOD=trust',image]);started=true;
  let ready=false;for(let i=0;i<100;i++){try{await docker(['exec',container,'pg_isready','-h','127.0.0.1','-U','postgres']);ready=true;break}catch{await new Promise(r=>setTimeout(r,200))}}assert(ready);
  db={exec:sql=>psql(sql),query:async(sql,args=[])=>{const substituted=sql.replace(/\$(\d+)/g,(_,n)=>args[Number(n)-1]===null?'null':quote(typeof args[Number(n)-1]==='object'?JSON.stringify(args[Number(n)-1]):args[Number(n)-1]));const result=await psql('select row_to_json(q) from ('+substituted.replace(/;\s*$/,'')+') q;');return {rows:result?result.split('\n').map(v=>JSON.parse(v)):[]}},close:async()=>{}};
 }else db=new PGlite();
 await db.exec(await readFile(new URL('./fixtures/postgres-bootstrap.sql',import.meta.url),'utf8'));
 for(const name of ['schema','community','premium','evolution','credits','ai_recovery'])await db.exec(await readFile(new URL('../supabase/'+name+'.sql',import.meta.url),'utf8'));
 const patch=await readFile(new URL('../supabase/ai_recovery_capacity.sql',import.meta.url),'utf8');await db.exec(patch);
 const users=Array.from({length:12},()=>randomUUID());await db.exec('insert into auth.users(id) values '+users.map(u=>'('+quote(u)+')').join(',')+';');
 const rpc=async(name,args)=>{const keys=Object.keys(args);return (await db.query('select public.'+name+'('+keys.map((k,i)=>k+'=>$'+(i+1)).join(',')+') value',Object.values(args))).rows[0].value};
 const reserve=(owner,operation=randomUUID())=>rpc('pp_ai_reserve',{owner,operation,kind:'art',fingerprint:'capacity-fixture',amount:1});
 const charges=async()=>Number((await db.query('select count(*) as n from public.pp_ai_charges')).rows[0].n);
 const count=async()=>Number((await db.query('select count(*) as n from public.pp_ai_operations')).rows[0].n);
 const complete=(owner,operation)=>rpc('pp_ai_complete',{owner,operation,payload:{operationId:operation,images:['a','b','c'],creditsSpent:1}});
 const seed=async(owner,bytes)=>{const op=randomUUID();await db.exec(`insert into public.pp_ai_operations(operation,user_id,kind,fingerprint,cost,state,result)values(${quote(op)},${quote(owner)},'art','historical',1,'completed',jsonb_build_object('images',jsonb_build_array(repeat('x',${bytes}))));`);return op};
 const clear=()=>db.exec('truncate public.pp_ai_operations;'); // Only this disposable fixture's operation rows.
 const MiB=1024*1024;
 // Three outstanding-account reservations are forbidden by the original gate;
 // completed historical rows exercise the separate account byte budget.
 await seed(users[0],16*MiB);await seed(users[0],16*MiB);await seed(users[0],16*MiB);
 const beforeCharges=await charges(),beforeCount=await count();
 await assert.rejects(reserve(users[0]),/capacity for this account is full/);assert.equal(await charges(),beforeCharges);assert.equal(await count(),beforeCount);
 // Existing data and ledgers survive repeated patching, including over-budget history.
 const fingerprint=(await db.query("select md5(string_agg(operation::text||result::text,'' order by operation)) as value from public.pp_ai_operations")).rows[0].value;
 await db.exec(patch);assert.equal((await db.query("select md5(string_agg(operation::text||result::text,'' order by operation)) as value from public.pp_ai_operations")).rows[0].value,fingerprint);assert.equal(await charges(),beforeCharges);
 await clear();
 // Admit and complete a real operation, then exceed current capacity with historical
 // fixtures: a replay must still return its result without another charge.
 const replay=randomUUID();await reserve(users[1],replay);await complete(users[1],replay);
 for(let i=0;i<3;i++)await seed(users[1],16*MiB);
 const replayCharges=await charges(),old=await reserve(users[1],replay);assert.equal(old.fresh,false);assert.equal(old.state,'completed');assert.equal(old.result.operationId,replay);assert.equal(await charges(),replayCharges);
 await assert.rejects(reserve(users[2],replay),/Operation identifier already used/);
 await clear();
 // 108MiB of payload plus metadata leaves less than one20MiB reservation.
 for(let i=0;i<6;i++)await seed(users[i%3+2],18*MiB);
 const globalCharges=await charges(),globalCount=await count();await assert.rejects(reserve(users[8]),/capacity for this beta is full/);assert.equal(await charges(),globalCharges);assert.equal(await count(),globalCount);
 await clear();
 // Five outstanding20MiB slots allow exactly one of two new owners to reserve;
 // actual independent connections under --native prove cross-owner serialization.
 for(let i=0;i<5;i++)await reserve(users[i+2]);
 const race=await Promise.allSettled([reserve(users[9]),reserve(users[10])]);
 assert.equal(race.filter(r=>r.status==='fulfilled').length,1,JSON.stringify(race));assert.equal(race.filter(r=>r.status==='rejected'&&/capacity for this beta is full/.test(r.reason.message)).length,1);
 assert.equal(await count(),6);
 const used=(await db.query("select sum(4096+case when state in('running','refund_pending')then 20*1024*1024 else coalesce(octet_length(result::text),0)end) as value from public.pp_ai_operations")).rows[0].value;assert(Number(used)<=128*MiB);
 // Completing a reserved operation only reduces accounted capacity, allowing new work.
 const running=(await db.query("select operation,user_id from public.pp_ai_operations where state='running' limit 1")).rows[0];await complete(running.user_id,running.operation);assert.equal((await reserve(users[11])).fresh,true);
 const acl=(await db.query("select has_function_privilege('anon','public.pp_ai_reserve(uuid,uuid,text,text,integer)','execute') as anon,has_function_privilege('authenticated','public.pp_ai_reserve(uuid,uuid,text,text,integer)','execute') as authenticated,has_function_privilege('service_role','public.pp_ai_reserve(uuid,uuid,text,text,integer)','execute') as service,(select proconfig::text from pg_proc where oid='public.pp_ai_reserve(uuid,uuid,text,text,integer)'::regprocedure) as config")).rows[0];
 assert.equal(acl.anon,false);assert.equal(acl.authenticated,false);assert.equal(acl.service,true);assert(acl.config.includes('search_path'));
 console.log(`PASS ${native?'native PostgreSQL independent connections':'PGlite serialized SQL fixture'}: account/global recovery capacity, pending20MiB slots, no-charge rejection, repeatable patch preserves all existing results/credits, replay despite full history, cross-account collision, completion releases reservation and service-only grants.`);
 console.log('LIMIT: logical JSON/pending/metadata accounting, not a physical disk/WAL bound; this does not delete history or guarantee capacity for other database tables.');
}finally{await db?.close();if(started)await docker(['rm','--force','--volumes',container]);}
