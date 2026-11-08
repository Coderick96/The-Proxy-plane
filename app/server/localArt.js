import {createHash, createPrivateKey, sign} from 'node:crypto';
import {readFileSync} from 'node:fs';

const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function artOperation(owner,requestId,prompt,size,sourceHash){
 const hex=createHash('sha256').update(JSON.stringify([owner,requestId,prompt,size,sourceHash])).digest('hex');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}
export function signArtTicket(key,claims){
 const body=Buffer.from(JSON.stringify(claims)).toString('base64url');
 return body+'.'+sign(null,Buffer.from(body),key).toString('base64url');
}
export function mountLocalArt(app,{env,services,route}){
 const enabled=env.LOCAL_ART_ENABLED!=='false';
 const signingKey=()=>{
  const pem=env.LOCAL_ART_PRIVATE_KEY|| (env.LOCAL_ART_PRIVATE_KEY_FILE?readFileSync(env.LOCAL_ART_PRIVATE_KEY_FILE,'utf8'):null);
  if(!pem)throw fail('Local artwork signing is not configured. See LOCAL_ART_SETUP.md.',503);
  const key=createPrivateKey(pem.replace(/\\n/g,'\n'));
  if(key.asymmetricKeyType!=='ed25519')throw fail('Local artwork requires an Ed25519 signing key.',503);
  return key;
 };
 app.get('/api/local-art/config',(_req,res)=>res.json({enabled,choices:3,creditsPerBatch:1,renderer:'http://127.0.0.1:8790'}));
 app.post('/api/local-art/authorize',route(async(req,res)=>{
  if(!enabled)throw fail('Local artwork is disabled.',503);
  const user=await services.user(req);
  if(env.BETA_MODE==='true'&&env.BETA_AI_ENABLED!=='true')throw fail('AI generation is paused for this beta.',503);
  const {requestId,prompt,size='1024x1536',source}=req.body||{};
  if(!uuid.test(requestId||'')||typeof prompt!=='string'||prompt.trim().length<5||prompt.length>4000||!['1024x1024','1024x1536','1536x1024'].includes(size))throw fail('Use a 5–4,000 character prompt and a supported size.');
  if(source!==undefined&&(typeof source!=='string'||source.length>10*1024*1024||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(source)))throw fail('Invalid reference image.');
  if(source&&!(await services.access(user.id)).studio)throw fail('Re-sketch requires Premium or Studio Pass.',403);
  const key=signingKey(); // Validate configuration before touching credits.
  const sourceHash=source?createHash('sha256').update(source).digest('hex'):null;
  const operation=artOperation(user.id,requestId,prompt,size,sourceHash);
  const charge=async()=>{
   if(!services.admin)throw fail('Account database is not configured.',503);
   const {data,error}=await services.admin.from('pp_ai_charges').select('user_id,refunded').eq('operation',operation).maybeSingle();
   if(error)throw error;
   if(data&&(data.user_id!==user.id||data.refunded))throw fail('This artwork authorization is no longer valid.',409);
   return data;
  };
  if(!await charge()){
   try{await services.rpc('pp_spend_credits',{owner:user.id,operation,amount:1});}
   catch(error){if(!await charge())throw error;} // Safe retry after an ambiguous network response or concurrent duplicate.
  }
  const claims={v:1,aud:'proxy-plane-local-art',job:operation,prompt,size,sourceHash,choices:3,exp:Math.floor(Date.now()/1000)+86400};
  const ticket=signArtTicket(key,claims);
  res.set('Cache-Control','no-store').json({ticket,job:operation,creditsSpent:1,choices:3});
 }));
}
