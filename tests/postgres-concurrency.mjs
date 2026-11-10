// Disposable native PostgreSQL only. Never accepts a database URL or existing container.
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';

const image='postgres:17.6-bookworm@sha256:f3bd19c606e442c3d7bdfa8002e03fe260a1023351e0ea4598032022b68dd6e3';
const container='proxy-plane-qa-'+randomUUID();
const env={...process.env};
for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key];
function docker(args,input){return new Promise((resolve,reject)=>{
 const child=spawn('docker',['--host=unix:///var/run/docker.sock',...args],{env,stdio:['pipe','pipe','pipe']});let out='',err='';
 const timer=setTimeout(()=>child.kill('SIGKILL'),45000);
 child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);
 child.on('error',error=>{clearTimeout(timer);reject(error)});
 child.on('close',(code,signal)=>{clearTimeout(timer);code===0?resolve(out.trim()):reject(new Error(err.trim()||`docker exited ${code}/${signal}`))});
 child.stdin.on('error',()=>{});child.stdin.end(input);
});}
const sql=(text,role='service_role')=>docker(['exec','-i',container,'psql','-U','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],`SET statement_timeout='20s';SET lock_timeout='15s';SET ROLE ${role};\n${text}`);
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
const scalar=async text=>JSON.parse(await sql(text));
const model='a310400909a293a7a937a54854910ed06469192b',fp='a'.repeat(64);
const charge=(owner,id=randomUUID())=>scalar(`select pp_charge_device_ai(${quote(owner)},${quote(id)},'${model}','${fp}');`);
const balance=owner=>scalar(`select pp_daily_status(${quote(owner)});`);
const race=(count,operation)=>Promise.allSettled(Array.from({length:count},(_,i)=>operation(i)));
let started=false;
try{
 await docker(['run','--detach','--pull=never','--network=none','--name',container,'--label','app=proxy-plane-disposable-qa','-e','POSTGRES_HOST_AUTH_METHOD=trust',image]);started=true;
 let ready=false;for(let i=0;i<100;i++){try{await docker(['exec',container,'pg_isready','-h','127.0.0.1','-U','postgres']);ready=true;break}catch{await new Promise(r=>setTimeout(r,200))}}
 assert(ready,'Disposable PostgreSQL did not become ready');
 // Auth/storage interfaces are fixtures; this validates real SQL/connections, not Supabase services.
 const fixture=await readFile(new URL('./fixtures/postgres-bootstrap.sql',import.meta.url),'utf8');
 await sql(fixture,'postgres');
 for(const name of ['schema','community','premium','evolution','credits','ai_recovery','dev_credits','credits'])await sql(await readFile(new URL('../supabase/'+name+'.sql',import.meta.url),'utf8'),'postgres');
 const [a,b,c,d,e]=Array.from({length:5},()=>randomUUID());
 await sql(`insert into auth.users(id)values(${quote(a)}),(${quote(b)}),(${quote(c)}),(${quote(d)}),(${quote(e)});`,'postgres');
 const duplicate=randomUUID(),same=await race(16,()=>charge(a,duplicate));
 assert(same.every(r=>r.status==='fulfilled'),JSON.stringify(same));assert(same.every(r=>r.value.operationId===duplicate));assert.equal((await balance(a)).credits,9);
 console.log('PASS native PostgreSQL: 16 independent connections, same operation produces one debit and matching receipts.');
 const exhausted=await race(24,()=>charge(b));assert.equal(exhausted.filter(r=>r.status==='fulfilled').length,10);
 assert(exhausted.filter(r=>r.status==='rejected').every(r=>/No AI credits/.test(r.reason.message)));assert.equal((await balance(b)).credits,0);
 console.log('PASS native PostgreSQL: 24 distinct concurrent requests cannot overspend 10 starter credits; failures roll back.');
 const shared=randomUUID(),foreign=await Promise.allSettled([charge(c,shared),charge(d,shared)]);
 assert.equal(foreign.filter(r=>r.status==='fulfilled').length,1);assert.equal(foreign.filter(r=>r.status==='rejected'&&/identifier is unavailable/.test(r.reason.message)).length,1);assert.equal((await balance(c)).credits+(await balance(d)).credits,19);
 const refill=randomUUID(),grants=await race(16,()=>scalar(`select pp_dev_topoff(${quote(e)},${quote(refill)},100);`));
 assert(grants.every(r=>r.status==='fulfilled'));assert.equal(grants.filter(r=>!r.value.idempotent).length,1);assert.equal((await balance(e)).walletCredits,100);
 console.log('PASS native PostgreSQL: cross-account operation collision stays private; 16 duplicate refills grant exactly 100 wallet credits.');
 await race(12,()=>sql(`select pp_refund_ai(${quote(duplicate)});`)).then(results=>assert(results.every(r=>r.status==='fulfilled')));
 assert.equal((await balance(a)).credits,10);await assert.rejects(charge(a,duplicate),/refunded/);
 for(const role of ['anon','authenticated']){
  await assert.rejects(sql('select * from pp_device_ai_receipts;',role),/permission denied/);
  await assert.rejects(sql(`select pp_charge_device_ai(${quote(a)},${quote(randomUUID())},'${model}','${fp}');`,role),/permission denied/);
  await assert.rejects(sql(`select pp_dev_topoff(${quote(a)},${quote(randomUUID())},100);`,role),/permission denied/);
 }
 console.log('PASS native PostgreSQL: concurrent refunds restore once, refunded receipts cannot resume, unprivileged roles cannot call billing RPCs/read receipts.');
 console.log('LIMIT: auth/storage are schema fixtures; real Supabase Auth/REST/Storage, payment delivery and physical GPU/device behavior remain unverified.');
}finally{if(started)await docker(['rm','--force','--volumes',container]);}
