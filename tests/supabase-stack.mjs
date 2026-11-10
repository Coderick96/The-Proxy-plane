// Real disposable Supabase Auth, REST, Mailpit and Storage services. Intended for CI
// with sufficient Docker disk space. Never accepts an existing project or remote URL.
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes,randomInt,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';

const id='pp-storage-'+randomUUID().replaceAll('-','').slice(0,16);
const network=id+'-network',env={...process.env};
for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH','SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','SUPABASE_PROJECT_ID','SUPABASE_URL'])delete env[key];
for(const key of Object.keys(env))if(key.startsWith('SUPABASE_'))delete env[key];
env.DOCKER_HOST='unix:///var/run/docker.sock';
const directory=await mkdtemp(join(tmpdir(),'proxy-supabase-stack-'));
const cache=join(tmpdir(),'proxy-supabase-cli-cache');
const excluded='realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor';
const privateValues=[];
let networkCreated=false,startAttempted=false;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const clean=text=>{
 let result=String(text);for(const value of privateValues)if(value)result=result.replaceAll(value,'[local test secret]');
 return result.replace(/(postgres(?:ql)?:\/\/[^:\s/@]+:)[^@\s]+@/g,'$1[local password]@').replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[local JWT]').replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g,'[local API key]');
};
function command(binary,args,input,{timeout=900000}={}){return new Promise((resolve,reject)=>{
 const child=spawn(binary,args,{env,cwd:directory,stdio:['pipe','pipe','pipe']});let out='',err='';
 const timer=setTimeout(()=>child.kill('SIGKILL'),timeout);
 child.stdout.on('data',v=>out+=v);child.stderr.on('data',v=>err+=v);
 child.on('error',error=>{clearTimeout(timer);reject(new Error('Local stack command could not start: '+error.code));});
 child.on('close',(code,signal)=>{clearTimeout(timer);if(code===0)resolve(out);else reject(new Error(`Local stack command failed (${code}/${signal}). `+clean(err.slice(-3500))));});
 child.stdin.on('error',()=>{});child.stdin.end(input);
});}
const docker=(args,input)=>command('docker',['--host=unix:///var/run/docker.sock',...args],input,{timeout:60000});
const cli=(args)=>command('npm',['exec','--yes','--cache',cache,'--package=supabase@3.1.0','--','supabase','--workdir',directory,...args]);
const sql=text=>docker(['exec','-i','supabase_db_'+id,'psql','-U','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],text);
const loopback=value=>{const url=new URL(value);assert(['127.0.0.1','localhost','[::1]'].includes(url.hostname),'Only local service URLs are permitted');assert.equal(url.protocol,'http:');return url;};
const requireSuccess=(result,label)=>assert(!result.error,label+' failed: '+(result.error?.code||result.error?.status||'unknown'));
const denied=result=>assert(result.error,'Cross-account operation unexpectedly succeeded');
function section(text,name,changes){
 const heading='['+name+']',start=text.indexOf(heading);assert(start>=0,'Generated CLI config is missing '+name);
 const next=text.indexOf('\n[',start+heading.length),end=next<0?text.length:next;
 let body=text.slice(start,end);
 for(const [key,value]of Object.entries(changes)){
  const pattern=new RegExp('^'+key+'\\s*=.*$','m');assert(pattern.test(body),'Generated CLI config key missing: '+name+'.'+key);body=body.replace(pattern,key+' = '+value);
 }
 return text.slice(0,start)+body+text.slice(end);
}
function parseStatus(text){
 for(let i=text.indexOf('{');i>=0;i=text.indexOf('{',i+1)){try{return JSON.parse(text.slice(i))}catch{}}
 throw new Error('CLI did not return parseable local status JSON');
}
async function confirmMail(email,api,mailpit){
 for(let n=0;n<100;n++){
  const response=await fetch(mailpit+'/api/v1/messages',{signal:AbortSignal.timeout(5000)});
  assert(response.ok,'Local Mailpit inbox is unavailable');const messages=await response.json();
  const message=(messages.messages||[]).find(value=>JSON.stringify(value.To||[]).includes(email));
  if(!message){await pause(200);continue;}
  const detail=await fetch(mailpit+'/api/v1/message/'+encodeURIComponent(message.ID),{signal:AbortSignal.timeout(5000)});assert(detail.ok);
  const content=await detail.json(),links=((content.HTML||'')+' '+(content.Text||'')).replaceAll('&amp;','&').match(/https?:\/\/[^\s"'<>]+/g)||[];
  for(const link of links){
   let url;try{url=loopback(link)}catch{continue;}
   if(url.pathname!=='/auth/v1/verify'||url.port!==new URL(api).port)continue;
   const verification=await fetch(api+url.pathname+url.search,{redirect:'manual',signal:AbortSignal.timeout(10000)});
   assert([200,302,303].includes(verification.status),'Local email verification was rejected');return;
  }
  throw new Error('Local confirmation email did not include a loopback verification URL');
 }
 throw new Error('Local Mailpit did not receive the confirmation email');
}

try{
 await cli(['init']);
 const path=join(directory,'supabase','config.toml');let config=await readFile(path,'utf8');
 config=config.replace(/^project_id\s*=.*$/m,'project_id = "'+id+'"');
 const base=randomInt(35000,45000);
 config=section(config,'api',{port:base});config=section(config,'db',{port:base+1,shadow_port:base+2});
 const mailSection=config.includes('[mailpit]')?'mailpit':config.includes('[inbucket]')?'inbucket':null;assert(mailSection,'Generated CLI config has no supported mail service');
 config=section(config,mailSection,{port:base+3});config=section(config,'db.seed',{enabled:'false'});
 config=section(config,'auth.email',{enable_confirmations:'true'});config=section(config,'auth.rate_limit',{email_sent:20});
 await writeFile(path,config);
 // A custom Docker network makes unspecified published bindings loopback-only.
 await docker(['network','create','--label','app=proxy-plane-disposable-stack-qa','--opt','com.docker.network.bridge.host_binding_ipv4=127.0.0.1',network]);networkCreated=true;
 startAttempted=true;await cli(['--network-id',network,'start','--exclude',excluded]);
 const status=parseStatus(await cli(['status','--output','json']));
 const api=loopback(status.API_URL).origin,mailpit=loopback(status.MAILPIT_URL||status.INBUCKET_URL||'http://127.0.0.1:'+(base+3)).origin;
 const publicKey=status.ANON_KEY||status.PUBLISHABLE_KEY,serviceKey=status.SERVICE_ROLE_KEY||status.SECRET_KEY;
 assert(publicKey&&serviceKey,'CLI status is missing local account keys');privateValues.push(publicKey,serviceKey,status.JWT_SECRET,status.DB_URL);
 const names=(await docker(['ps','--filter','network='+network,'--format','{{.Names}}'])).trim().split('\n').filter(Boolean);
 assert(names.includes('supabase_db_'+id),'Disposable database identity mismatch');
 for(const name of names){const ports=JSON.parse(await docker(['inspect','--format','{{json .NetworkSettings.Ports}}',name]));for(const bindings of Object.values(ports||{}))for(const binding of bindings||[])assert(['127.0.0.1','::1'].includes(binding.HostIp),'A local test service was exposed beyond loopback');}
 console.log('PASS actual disposable Supabase services started with loopback-only published ports.');
 // These are actual service schemas; no auth/storage compatibility tables are substituted.
 await sql("select count(*) from auth.users;select count(*) from storage.objects;");
 for(const name of ['schema','community','premium','evolution','credits','ai_recovery','dev_credits'])await sql(await readFile(new URL('../supabase/'+name+'.sql',import.meta.url),'utf8'));
 await sql("notify pgrst,'reload schema';");
 const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
 const admin=createClient(api,serviceKey,options),users=[];
 for(const label of ['alpha','bravo']){
  const client=createClient(api,publicKey,options),email=label+'-'+id+'@example.test',password='Qa!'+randomBytes(24).toString('hex');privateValues.push(password);
  const signup=await client.auth.signUp({email,password});requireSuccess(signup,'Email signup');assert(signup.data.user);assert.equal(signup.data.session,null,'Email confirmation was bypassed');
  const before=await client.auth.signInWithPassword({email,password});denied(before);
  await confirmMail(email,api,mailpit);
  const login=await client.auth.signInWithPassword({email,password});requireSuccess(login,'Confirmed password login');assert(login.data.user.email_confirmed_at);
  users.push({client,id:login.data.user.id,email});
 }
 console.log('PASS actual local email confirmation delivery: both signups reach Mailpit, login is denied before confirmation, verification enables login. External mail delivery/OAuth are not tested.');
 const [a,b]=users;
 await sql(await readFile(new URL('../supabase/beta.sql',import.meta.url),'utf8'));await sql("notify pgrst,'reload schema';");
 let configured=false;for(let n=0;n<30;n++){const result=await admin.rpc('pp_beta_configure',{owner:a.id});if(!result.error){configured=true;break;}if(result.error.code!=='PGRST202')requireSuccess(result,'Beta owner configuration');await pause(200);}assert(configured);
 requireSuccess(await admin.rpc('pp_beta_set_seat',{seat:1,address:b.email}),'Beta seat');requireSuccess(await admin.rpc('pp_beta_claim',{owner:b.id}),'Beta admission');
 const bucket='proxy-kingdom-art',object=a.id+'/private-'+randomUUID()+'.png';
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=','base64');
 requireSuccess(await a.client.storage.from(bucket).upload(object,png,{contentType:'image/png'}),'Own artwork upload');
 const downloaded=await a.client.storage.from(bucket).download(object);requireSuccess(downloaded,'Own artwork download');assert.deepEqual(Buffer.from(await downloaded.data.arrayBuffer()),png);
 requireSuccess(await a.client.storage.from(bucket).update(object,png,{contentType:'image/png'}),'Own artwork update');
 requireSuccess(await a.client.storage.from(bucket).upload(object,png,{contentType:'image/png',upsert:true}),'Own artwork upsert');
 const ownList=await a.client.storage.from(bucket).list(a.id);requireSuccess(ownList,'Own artwork listing');assert(ownList.data.some(item=>item.name===object.split('/').at(-1)));
 const foreignList=await b.client.storage.from(bucket).list(a.id);if(!foreignList.error)assert.deepEqual(foreignList.data,[]);
 const signed=await a.client.storage.from(bucket).createSignedUrl(object,2);requireSuccess(signed,'Own signed URL');loopback(signed.data.signedUrl);
 const image=await fetch(signed.data.signedUrl,{signal:AbortSignal.timeout(10000)});assert.equal(image.status,200);assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);
 denied(await b.client.storage.from(bucket).download(object));denied(await b.client.storage.from(bucket).createSignedUrl(object,60));
 denied(await b.client.storage.from(bucket).update(object,png,{contentType:'image/png'}));denied(await b.client.storage.from(bucket).upload(a.id+'/forged-'+randomUUID()+'.png',png,{contentType:'image/png'}));
 // DELETE may intentionally conceal inaccessible paths by returning success with no objects.
 await b.client.storage.from(bucket).remove([object]);requireSuccess(await a.client.storage.from(bucket).download(object),'Foreign deletion must not remove owner artwork');
 const anonymous=createClient(api,publicKey,options);denied(await anonymous.storage.from(bucket).download(object));denied(await anonymous.storage.from(bucket).createSignedUrl(object,60));
 const publicResponse=await fetch(api+'/storage/v1/object/public/'+bucket+'/'+object,{signal:AbortSignal.timeout(10000)});assert(!publicResponse.ok,'Private artwork was available at public storage URL');
 assert.equal((await sql("select public from storage.buckets where id='proxy-kingdom-art';")).trim(),'f');
 await pause(4100);const expired=await fetch(signed.data.signedUrl,{signal:AbortSignal.timeout(10000)});assert(!expired.ok,'Expired private artwork signed URL remained usable');
 requireSuccess(await a.client.storage.from(bucket).remove([object]),'Owner artwork deletion');denied(await a.client.storage.from(bucket).download(object));
 console.log('PASS actual Storage HTTP: owner upload/read/update/upsert/list/signed download/delete; anonymous and cross-account read/sign/update/upload denied; foreign delete preserves artwork; public URL denied; signed URL expires; bucket remains private.');
 console.log('LIMIT: only this disposable local stack was verified. No hosted project, external email/OAuth, Stripe, GPU model or physical printer was exercised.');
}catch(error){throw new Error(clean(error.message),{cause:undefined});}
finally{
 const errors=[];
 if(startAttempted)await cli(['--network-id',network,'stop','--project-id',id,'--no-backup']).catch(error=>errors.push(error));
 if(networkCreated){
  try{const remaining=(await docker(['network','ls','--filter','name=^'+network+'$','--format','{{.Name}}'])).trim();if(remaining){assert.equal(remaining,network);await docker(['network','rm',network]);}}catch(error){errors.push(error);}
 }
 await rm(directory,{recursive:true,force:true});
 if(errors.length)throw new Error('Disposable Supabase stack cleanup failed; inspect only resources for project '+id);
}
