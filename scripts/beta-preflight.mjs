import 'dotenv/config';
import {pathToFileURL} from 'node:url';

// Offline configuration checks only: no network requests, migrations, purchases or secret output.
export function betaPreflight(env){
 const checks=[];
 const check=(name,ok,message)=>checks.push({name,status:ok?'PASS':'BLOCKED',message});
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
 const local=host=>['localhost','127.0.0.1','[::1]'].includes(host);
 const api=value=>{try{const u=new URL(value);return !u.username&&!u.password&&!u.search&&!u.hash&&u.pathname==='/'&&(u.protocol==='https:'||(u.protocol==='http:'&&local(u.hostname)))?u.origin:null}catch{return null}};
 const serviceKey=value=>{
  if(typeof value!=='string')return false;
  if(value.startsWith('sb_secret_'))return true;
  try{return JSON.parse(Buffer.from(value.split('.')[1],'base64url')).role==='service_role'}catch{return false}
 };
 check('private-beta',env.BETA_MODE==='true'&&env.VITE_PRIVATE_BETA==='true','Enable both server and browser private-beta gates.');
 const server=api(env.SUPABASE_URL),browser=api(env.VITE_SUPABASE_URL);
 check('account-url',Boolean(server&&browser&&server===browser),'Use the same isolated Supabase API origin on server and browser; HTTP is limited to loopback.');
 const publicKey=env.VITE_SUPABASE_ANON_KEY;
 let publicRole;try{publicRole=JSON.parse(Buffer.from(publicKey.split('.')[1],'base64url')).role}catch{}
 check('public-key',Boolean(typeof publicKey==='string'&&(/^sb_publishable_[A-Za-z0-9_-]+$/.test(publicKey)||publicRole==='anon')),'Configure a public publishable/anon key, never a service-role key.');
 check('server-key',serviceKey(env.SUPABASE_SERVICE_ROLE_KEY),'Configure the server-only Supabase service credential securely.');
 check('owner',uuid.test(env.OWNER_USER_ID||''),'Configure the confirmed owner Auth UUID.');
 check('client-origin',Boolean(api(env.CLIENT_ORIGIN)),'Configure the exact browser origin (HTTPS when hosted).');
 const privateValue=value=>serviceKey(value)||/^(?:sk-(?:proj|svcacct)-|(?:sk|rk)_(?:test|live)_|whsec_)/.test(value);
 const leaked=Object.entries(env).some(([key,value])=>key.startsWith('VITE_')&&value&&(/SECRET|SERVICE_ROLE|OPENAI|OWNER_TOPOFF/i.test(key)||privateValue(value)));
 check('browser-secret-boundary',!leaked,'Server secrets must never use a VITE_ environment name.');
 check('stripe-test-only',!env.STRIPE_SECRET_KEY||/^(?:sk|rk)_test_/.test(env.STRIPE_SECRET_KEY),'Live or unrecognized Stripe keys are not allowed.');
 if(env.BETA_TEST_BILLING==='true')check('billing-setup',/^(?:sk|rk)_test_/.test(env.STRIPE_SECRET_KEY||'')&&Boolean(env.STRIPE_WEBHOOK_SECRET),'Test checkout needs test credentials and a verified webhook; delivery still needs integration testing.');
 if(env.DEV_CREDIT_TOPOFF_ENABLED==='true')check('owner-refill',Boolean(env.OWNER_TOPOFF_CODE&&env.VERCEL_ENV!=='production'&&!(env.NODE_ENV==='production'&&!env.VERCEL_ENV)),'Owner refills require a server-only code and development/Preview environment.');
 if(env.BETA_AI_ENABLED==='true'&&env.OPENAI_API_KEY&&env.SERVERLESS_MODE==='true')check('idle-ai-recovery',false,'Before enabling cloud AI on serverless, configure and verify authenticated scheduled reconciliation; the continuous-server timer does not run there.');
 return {ok:checks.every(c=>c.status==='PASS'),checks};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=betaPreflight(process.env);
 for(const c of result.checks)console.log(`${c.status} ${c.name}: ${c.message}`);
 console.log(result.ok?'OFFLINE CONFIGURATION PASS. Auth/REST/Storage, billing delivery, device inference and physical printing still require executed acceptance checks.':'SETUP BLOCKED. See BETA_SETUP.md. No service was changed and no secret values were printed.');
 process.exitCode=result.ok?0:1;
}
