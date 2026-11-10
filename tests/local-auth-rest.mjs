// Actual disposable GoTrue + PostgREST + PostgreSQL. No hosted URLs or data accepted.
// Storage tables/helpers are compatibility fixtures, NOT a real Storage service.
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {randomUUID,randomBytes,createHmac} from 'node:crypto';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createApp} from '../server/index.js';

const images={
 db:'postgres:17.6-bookworm@sha256:f3bd19c606e442c3d7bdfa8002e03fe260a1023351e0ea4598032022b68dd6e3',
 auth:'public.ecr.aws/supabase/gotrue@sha256:1736a63078f5922b198c4cbe50f80ab9a2d3b54fe8b7b6cfb2e9dc5dbbc12c6b',
 rest:'public.ecr.aws/supabase/postgrest@sha256:1347d7552b88f17832912c06afbf7c43209af6eeeb60834b04aae12c9bd9d5cc'
};
const suffix=randomUUID(),network='pp-auth-qa-'+suffix,db='pp-db-'+suffix,auth='pp-auth-'+suffix,rest='pp-rest-'+suffix;
const secret=randomBytes(48).toString('hex'),password=randomBytes(24).toString('hex'),containers=[];
const env={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[key];
function docker(args,input){return new Promise((resolve,reject)=>{
 const child=spawn('docker',['--host=unix:///var/run/docker.sock',...args],{env,stdio:['pipe','pipe','pipe']});let out='',err='';
 const timer=setTimeout(()=>child.kill('SIGKILL'),45000);
 child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);
 child.on('error',error=>{clearTimeout(timer);reject(error)});child.on('close',(code,signal)=>{clearTimeout(timer);code===0?resolve((out+(args[0]==='logs'?'\n'+err:'')).trim()):reject(new Error(err.trim()||`docker exited ${code}/${signal}`))});
 child.stdin.on('error',()=>{});child.stdin.end(input);
});}
const sql=text=>docker(['exec','-i',db,'psql','-U','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],text);
const q=value=>"'"+String(value).replaceAll("'","''")+"'";
const pause=()=>new Promise(resolve=>setTimeout(resolve,200));
async function start(name,image,args=[]){await docker(['run','--detach','--pull=never','--network',network,'--name',name,'--label','app=proxy-plane-disposable-auth-qa',...args,image]);containers.push(name);}
async function port(name,internal){const binding=await docker(['port',name,internal+'/tcp']);assert.match(binding,/^127\.0\.0\.1:\d+$/);return 'http://'+binding;}
async function ready(url){for(let i=0;i<120;i++){try{const r=await fetch(url,{signal:AbortSignal.timeout(1000)});if(r.ok)return;}catch{}await pause();}throw new Error('Local service readiness timeout: '+new URL(url).pathname);}
async function request(url,{token,body,method=body?'POST':'GET',prefer}={}){
 const r=await fetch(url,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{}),...(prefer?{Prefer:prefer}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});
 const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}return {status:r.status,data};
}
function jwt(role){const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');const content=encode({alg:'HS256',typ:'JWT'})+'.'+encode({role,iss:'supabase',exp:Math.floor(Date.now()/1000)+3600});return content+'.'+createHmac('sha256',secret).update(content).digest('base64url');}
let networkStarted=false,gateway,application;
try{
 await docker(['network','create','--label','app=proxy-plane-disposable-auth-qa',network]);networkStarted=true;
 await start(db,images.db,['-e','POSTGRES_PASSWORD='+password]);
 let found=false;for(let i=0;i<120;i++){try{await docker(['exec',db,'pg_isready','-h','127.0.0.1','-U','postgres']);found=true;break}catch{await pause();}}assert(found,'Disposable PostgreSQL readiness');
 await sql(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create schema storage;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;
 alter default privileges in schema public grant select,insert,update,delete on tables to anon,authenticated,service_role;
 alter default privileges in schema public grant usage,select on sequences to anon,authenticated,service_role;`);
 const dbUrl=`postgres://postgres:${password}@${db}:5432/postgres?sslmode=disable`;
 await start(auth,images.auth,['-p','127.0.0.1::9999','-e','GOTRUE_API_HOST=0.0.0.0','-e','GOTRUE_API_PORT=9999','-e','API_EXTERNAL_URL=http://127.0.0.1:9999','-e','GOTRUE_SITE_URL=http://127.0.0.1','-e','GOTRUE_DB_DRIVER=postgres','-e','GOTRUE_DB_DATABASE_URL='+dbUrl+'&search_path=auth,public','-e','GOTRUE_DB_NAMESPACE=auth','-e','GOTRUE_JWT_SECRET='+secret,'-e','GOTRUE_JWT_AUD=authenticated','-e','GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated','-e','GOTRUE_JWT_ADMIN_ROLES=service_role','-e','GOTRUE_EXTERNAL_EMAIL_ENABLED=true','-e','GOTRUE_MAILER_AUTOCONFIRM=true','-e','GOTRUE_DISABLE_SIGNUP=false']);
 const authUrl=await port(auth,9999);await ready(authUrl+'/health');
 // Supabase's SQL helper/storage interfaces below are fixtures. GoTrue owns real auth.users/sessions migrations.
 await sql(`create or replace function auth.uid()returns uuid language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub',nullif(current_setting('request.jwt.claim.sub',true),''))::uuid$$;
 create or replace function auth.jwt()returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);alter table storage.objects enable row level security;
 create function storage.foldername(text)returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 grant select,insert,update,delete on storage.objects to anon,authenticated,service_role;`);
 for(const name of ['schema','community','premium','evolution','credits','ai_recovery','dev_credits'])await sql(await readFile(new URL('../supabase/'+name+'.sql',import.meta.url),'utf8'));
 const accounts=[];
 for(const label of ['alpha','bravo']){
  const email=label+'-'+suffix+'@example.test',pass='Qa!'+randomBytes(24).toString('hex');
  const signup=await request(authUrl+'/signup',{body:{email,password:pass}});assert.equal(signup.status,200,'Actual GoTrue signup failed: '+(signup.data?.msg||signup.data?.message||signup.data?.code||''));
  const login=await request(authUrl+'/token?grant_type=password',{body:{email,password:pass}});assert.equal(login.status,200,'Actual GoTrue password login failed');assert(login.data.access_token&&login.data.refresh_token);
  accounts.push({id:login.data.user.id,token:login.data.access_token,refresh:login.data.refresh_token,email});
 }
 const [a,b]=accounts;assert.notEqual(a.id,b.id);
 assert.equal((await request(authUrl+'/user',{token:a.token})).data.id,a.id);assert.equal((await request(authUrl+'/user',{token:b.token})).data.id,b.id);
 assert([401,403].includes((await request(authUrl+'/user',{token:'invalid'})).status),'Invalid token must be denied');
 const refreshed=await request(authUrl+'/token?grant_type=refresh_token',{body:{refresh_token:a.refresh}});assert.equal(refreshed.status,200);assert.equal(refreshed.data.user.id,a.id);a.token=refreshed.data.access_token;
 console.log('PASS actual local GoTrue: two confirmed accounts, password sessions, user verification, invalid-token rejection and refresh.');
 await start(rest,images.rest,['-p','127.0.0.1::3000','-e','PGRST_DB_URI='+dbUrl,'-e','PGRST_DB_SCHEMAS=public','-e','PGRST_DB_ANON_ROLE=anon','-e','PGRST_JWT_SECRET='+secret,'-e','PGRST_SERVER_PORT=3000']);
 const restUrl=await port(rest,3000);await ready(restUrl+'/');
 // Create the same profile/vault rows used by the app; there is no signup profile trigger.
 for(const [index,user] of accounts.entries()){
  const profile=await request(restUrl+'/pk_profiles',{token:user.token,body:{id:user.id,username:'qa_'+user.id.slice(0,12).replaceAll('-',''),display_name:'QA '+index,is_public:false},prefer:'return=representation'});
  assert.equal(profile.status,201,'Actual profile creation failed');
 }
 const own=await request(restUrl+'/pk_profiles?id=eq.'+a.id,{token:a.token});assert.equal(own.status,200);assert.equal(own.data[0]?.id,a.id);
 const card=randomUUID(),body={id:card,user_id:a.id,title:'Private QA card',project_json:{id:card,name:'Private QA card',kind:'custom'}};
 const created=await request(restUrl+'/proxy_kingdom_projects',{token:a.token,body,prefer:'return=representation'});assert([200,201].includes(created.status),'Actual card creation: '+JSON.stringify(created));
 const path=restUrl+'/proxy_kingdom_projects?id=eq.'+card;
 assert.equal((await request(path,{token:a.token})).data.length,1);
 assert.deepEqual((await request(path,{token:b.token})).data,[]);
 const anonymous=await request(path);assert([200,401,403].includes(anonymous.status));if(anonymous.status===200)assert.deepEqual(anonymous.data,[]);
 const crossInsert=await request(restUrl+'/proxy_kingdom_projects',{token:b.token,body:{...body,id:randomUUID()},prefer:'return=representation'});assert([401,403].includes(crossInsert.status));
 const crossUpdate=await request(path,{token:b.token,method:'PATCH',body:{title:'stolen'},prefer:'return=representation'});assert.equal(crossUpdate.status,200);assert.deepEqual(crossUpdate.data,[]);
 const reassign=await request(path,{token:a.token,method:'PATCH',body:{user_id:b.id},prefer:'return=representation'});assert([401,403].includes(reassign.status));
 const crossDelete=await request(path,{token:b.token,method:'DELETE',prefer:'return=representation'});assert.equal(crossDelete.status,200);assert.deepEqual(crossDelete.data,[]);assert.equal((await request(path,{token:a.token})).data.length,1);
 console.log('PASS actual local PostgREST + GoTrue JWTs: owner vault create/read, anonymous and cross-account read isolation, forged owner insert, reassignment, foreign update/delete denied.');
 for(const token of [jwt('anon'),a.token,b.token]){
  const result=await request(restUrl+'/rpc/pp_dev_topoff',{token,body:{owner:a.id,operation:randomUUID(),amount:100}});assert([401,403,404].includes(result.status),'Privileged refill RPC must not be callable by clients');
 }
 console.log('PASS actual local REST: service-only refill RPC denied to anonymous and both real user JWTs.');
 // Install private-beta rules last, just as the real setup guide requires.
 const outsiderEmail='outsider-'+suffix+'@example.test',outsiderPassword='Qa!'+randomBytes(24).toString('hex');
 const outsiderSignup=await request(authUrl+'/signup',{body:{email:outsiderEmail,password:outsiderPassword}});assert.equal(outsiderSignup.status,200);
 const outsiderLogin=await request(authUrl+'/token?grant_type=password',{body:{email:outsiderEmail,password:outsiderPassword}});assert.equal(outsiderLogin.status,200);
 await sql(await readFile(new URL('../supabase/beta.sql',import.meta.url),'utf8'));
 await sql(`select pp_beta_configure(${q(a.id)});select pp_beta_set_seat(1,${q(b.email)});select pp_beta_claim(${q(b.id)});notify pgrst,'reload schema';`);
 const approvedInsert=await request(restUrl+'/proxy_kingdom_projects',{token:b.token,body:{...body,id:randomUUID(),user_id:b.id},prefer:'return=representation'});assert.equal(approvedInsert.status,201);
 const outsiderInsert=await request(restUrl+'/proxy_kingdom_projects',{token:outsiderLogin.data.access_token,body:{...body,id:randomUUID(),user_id:outsiderLogin.data.user.id},prefer:'return=representation'});assert.equal(outsiderInsert.status,403);
 assert.equal((await request(path,{token:a.token})).data.length,1);
 console.log('PASS actual local private-beta REST gate: configured owner and admitted account can use their vaults; a real unapproved account cannot insert.');

 // Minimal loopback routing supplies the normal supabase-js URL shape to the actual application.
 // Both upstream destinations are fixed local fixture services, never arbitrary/request-supplied URLs.
 gateway=createServer(async(req,res)=>{
  const prefix=req.url.startsWith('/auth/v1/')?'/auth/v1':req.url.startsWith('/rest/v1/')?'/rest/v1':null;
  if(!prefix){res.writeHead(404).end();return;}
  try{
   const parts=[];for await(const part of req)parts.push(part);
   const headers={...req.headers};delete headers.host;delete headers.connection;delete headers['content-length'];
   const response=await fetch((prefix==='/auth/v1'?authUrl:restUrl)+req.url.slice(prefix.length),{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(parts),signal:AbortSignal.timeout(10000)});
   res.writeHead(response.status,{'Content-Type':response.headers.get('content-type')||'application/json'});res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(502).end('Local test gateway unavailable');}
 });
 await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));
 const ownerCode=randomBytes(24).toString('hex'),cronSecret=randomBytes(32).toString('hex');
 const appEnv={SUPABASE_URL:'http://127.0.0.1:'+gateway.address().port,SUPABASE_SERVICE_ROLE_KEY:jwt('service_role'),BETA_MODE:'true',BETA_AI_ENABLED:'true',SERVERLESS_MODE:'true',OWNER_USER_ID:a.id,DEV_CREDIT_TOPOFF_ENABLED:'true',OWNER_TOPOFF_CODE:ownerCode,DEV_CREDIT_TOPOFF_AMOUNT:'100',NODE_ENV:'development',CRON_SECRET:cronSecret};
 const app=createApp({env:appEnv,fetcher:async()=>{throw new Error('Unexpected external provider request in local account test');}});
 application=app.listen(0,'127.0.0.1');await new Promise(resolve=>application.on('listening',resolve));
 const appUrl='http://127.0.0.1:'+application.address().port;
 const chargeBody={operationId:randomUUID(),modelRevision:'a310400909a293a7a937a54854910ed06469192b',fingerprint:'a'.repeat(64)};
 const charges=await Promise.all(Array.from({length:8},()=>request(appUrl+'/api/ai/device/charge',{token:a.token,body:chargeBody})));
 assert(charges.every(r=>r.status===200&&r.data.operationId===chargeBody.operationId&&r.data.creditsSpent===1));
 assert.equal(JSON.parse(await sql(`select pp_daily_status(${q(a.id)});`)).credits,9);
 const deniedCharge=await request(appUrl+'/api/ai/device/charge',{token:outsiderLogin.data.access_token,body:{...chargeBody,operationId:randomUUID()}});assert.equal(deniedCharge.status,403);
 assert.equal((await request(appUrl+'/api/ai/device/charge',{token:'invalid',body:chargeBody})).status,401);
 const topoff={operationId:randomUUID(),code:ownerCode};
 assert.equal((await request(appUrl+'/api/dev/credits/topoff',{token:b.token,body:topoff})).status,403);
 const refills=await Promise.all(Array.from({length:8},()=>request(appUrl+'/api/dev/credits/topoff',{token:a.token,body:topoff})));
 assert(refills.every(r=>r.status===200&&r.data.added===100));
 assert.equal(JSON.parse(await sql(`select pp_daily_status(${q(a.id)});`)).credits,109);
 const ownerAccess=await request(appUrl+'/api/premium/access',{token:a.token}),otherAccess=await request(appUrl+'/api/premium/access',{token:b.token});
 assert.equal(ownerAccess.status,200);assert.equal(ownerAccess.data.owner,true);assert.equal(ownerAccess.data.credits,109);
 assert.equal(otherAccess.status,200);assert.equal(otherAccess.data.owner,false);assert.equal(otherAccess.data.credits,10);
 console.log('PASS actual app HTTP → supabase-js → GoTrue/PostgREST → native SQL: eight duplicate device authorizations debit once; outsider/invalid auth denied; owner-only duplicate refill grants exactly 100 wallet credits.');
 // A local timer invokes the same authenticated recovery HTTP endpoint a scheduler uses.
 // This proves endpoint/database behavior, not installation of a hosted scheduler.
 const expiredOperation=randomUUID();
 await sql(`select pp_ai_reserve(${q(a.id)},${q(expiredOperation)},'art','local-idle-recovery',1);update pp_ai_operations set lease_until=now()-interval '1 minute' where operation=${q(expiredOperation)};`);
 assert.equal(JSON.parse(await sql(`select pp_daily_status(${q(a.id)});`)).credits,108);
 appEnv.BETA_AI_ENABLED='false';
 assert.equal((await request(appUrl+'/api/internal/ai/reconcile')).status,401);
 const ticks=[];let tickWork=Promise.resolve(),tickFailure;
 const timer=setInterval(()=>{tickWork=tickWork.then(async()=>ticks.push(await request(appUrl+'/api/internal/ai/reconcile',{token:cronSecret}))).catch(error=>{tickFailure=error;});},100);
 try{for(let i=0;i<100&&ticks.length<2&&!tickFailure;i++)await pause();}finally{clearInterval(timer);await tickWork;}
 if(tickFailure)throw tickFailure;
 assert(ticks.length>=2);assert(ticks.every(r=>r.status===200));assert.equal(ticks.reduce((sum,r)=>sum+r.data.reconciled,0),1);
 assert.equal(JSON.parse(await sql(`select pp_daily_status(${q(a.id)});`)).credits,109);
 assert.equal((await sql(`select state from pp_ai_operations where operation=${q(expiredOperation)};`)).trim(),'refunded');
 assert.equal(JSON.parse(await sql(`select pp_daily_status(${q(b.id)});`)).credits,10);
 console.log('PASS actual timer-driven authenticated HTTP recovery: expired cloud reservation refunded once with generation paused; repeated ticks add no credit and another account remains unchanged. Hosted scheduler installation is not tested.');
 console.log('LIMIT: Storage is a SQL interface fixture; no email delivery, OAuth provider, hosted service, real payment, GPU inference or physical-device claim.');
}catch(error){
 const redact=text=>text.replaceAll(secret,'[local secret]').replaceAll(password,'[local password]').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[token]');
 for(const name of containers){const state=await docker(['inspect','--format','{{.State.Status}} / {{.State.ExitCode}}',name]).catch(()=> 'unavailable');console.error('Local service',name.startsWith('pp-auth-')?'auth':name.startsWith('pp-rest-')?'REST':'database',state);if(name.startsWith('pp-auth-'))console.error(redact(await docker(['logs','--tail','12',name]).catch(e=>e.message))); }
 throw error;
}finally{
 if(application)await new Promise(resolve=>application.close(resolve));
 if(gateway)await new Promise(resolve=>gateway.close(resolve));
 const cleanupErrors=[];
 for(const container of containers.reverse())await docker(['rm','--force','--volumes',container]).catch(error=>cleanupErrors.push(error));
 if(networkStarted)await docker(['network','rm',network]).catch(error=>cleanupErrors.push(error));
 if(cleanupErrors.length)throw new AggregateError(cleanupErrors,'Disposable account-test resource cleanup failed');
}
