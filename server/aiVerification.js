import {createHash,timingSafeEqual} from 'node:crypto';
import {cloudImageConfig,generateCloudImages} from './cloudImages.js';
import {checkAISafety} from './aiSafety.js';

const digest=value=>createHash('sha256').update(value).digest();
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const prompt='A silver dragon resting above an ancient forest temple at sunrise, original fantasy illustration, no text or frame.';
const size='1024x1536';
export function classifyCloudFailure(status,value){
 let body=value;try{if(typeof value==='string')body=JSON.parse(value)}catch{body={error:{message:value}}}
 const detail=[body?.error?.code,body?.error?.type,body?.error?.message].filter(v=>typeof v==='string').join(' ').toLowerCase();
 const code=/insufficient_quota|insufficient_user_quota|current quota|billing quota|run out of credits|no balance|billing_hard_limit|usage_limit_reached/.test(detail)?'INSUFFICIENT_API_QUOTA':/rate_limit_exceeded|requests.per.minute|tokens.per.minute|too many requests/.test(detail)?'RATE_LIMIT':[401,403].includes(status)?'KEY_OR_MODEL_ACCESS':status===429?'API_LIMIT_REACHED':'PROVIDER_UNAVAILABLE';
 return {providerStatus:status,code};
}
function summary(result,operationId,replayed){
 if(!result||result.operationId!==operationId||result.creditsSpent!==1||!Array.isArray(result.images)||result.images.length!==3||result.images.some(image=>typeof image!=='string'||!image.startsWith('data:image/png;base64,')))throw Error('Incomplete verification result');
 return {ok:true,operationId,replayed,choices:3,creditsSpent:1,model:result.model,quality:result.quality,...(result.usage?{usage:result.usage}:{})};
}

// Temporary opt-in operator validation, never a general-purpose generation API.
// One configured owner/operation/prompt, durable replay and no image/key in its response.
export function mountAIVerification(app,{env,services,recovery,fetcher=fetch}){
 let busy=false;
 app.all('/api/internal/ai/verify',async(req,res)=>{
  res.set('Cache-Control','private, no-store');
  if(env.VERCEL_ENV!=='preview'||env.AI_VERIFICATION_ENABLED!=='true')return res.sendStatus(404);
  if(!['GET','POST'].includes(req.method))return res.set('Allow','GET, POST').status(405).json({error:'Method not allowed.'});
  const secret=env.AI_VERIFICATION_SECRET;
  if(typeof secret!=='string'||! /^[\x21-\x7e]{32,512}$/.test(secret))return res.status(503).json({error:'Operator verification is not configured.'});
  if(typeof req.headers.authorization!=='string'||!timingSafeEqual(digest(req.headers.authorization),digest('Bearer '+secret)))return res.status(401).json({error:'Unauthorized.'});
  if(!env.OPENAI_API_KEY)return res.status(503).json({error:'The cloud key is not configured.'});
  let config;
  try{config=cloudImageConfig(env)}catch{return res.status(503).json({error:'Cloud image configuration is invalid.'})}
  let providerFailure;
  const verificationFetch=async(...args)=>{
   const response=await fetcher(...args);
   if(!response.ok){
    let detail;try{detail=await response.clone().text()}catch{/* Never return a provider body. */}
    providerFailure=classifyCloudFailure(response.status,detail);
   }
   return response;
  };
  if(req.method==='GET'){
   try{
    const models=[...new Set([config.model,env.OPENAI_TEXT_MODEL||'gpt-4.1-mini',env.OPENAI_SAFETY_MODEL||'gpt-4.1-mini'])];
    for(const model of models){
     const response=await verificationFetch('https://api.openai.com/v1/models/'+encodeURIComponent(model),{headers:{Authorization:'Bearer '+env.OPENAI_API_KEY},signal:AbortSignal.timeout(20000)});
     if(!response.ok)return res.status(503).json({error:'Cloud model access could not be verified.',code:[401,403].includes(response.status)?'KEY_OR_MODEL_ACCESS':'MODEL_UNAVAILABLE'});
     const value=await response.json();if(typeof value?.id!=='string')throw Error('Invalid model response');
    }
    return res.json({ok:true,keyAndModelsReachable:true,model:config.model,quality:config.quality,inferenceTested:false});
   }catch{return res.status(503).json({error:'Cloud model access could not be verified.'})}
  }
  let payload=req.body;
  try{if(Buffer.isBuffer(payload)||typeof payload==='string')payload=JSON.parse(payload.toString())}catch{return res.status(400).json({error:'Verification accepts no overrides.'})}
  // Vercel's /api/:path* rewrite can supply its routing parameter. It never
  // selects an owner, prompt or operation; all action inputs remain server fixed.
  if(payload!==undefined&&payload!==null&&(typeof payload!=='object'||Array.isArray(payload)||Object.keys(payload).length)||Object.keys(req.query||{}).some(key=>key!=='path'))return res.status(400).json({error:'Verification accepts no overrides.'});
  const owner=env.OWNER_USER_ID,operationId=env.AI_VERIFICATION_OPERATION_ID;
  if(!services.configured||env.BETA_MODE!=='true'||env.AI_RECOVERY_SCHEDULER_VERIFIED!=='true'||!uuid.test(owner||'')||!uuid.test(operationId||''))return res.status(503).json({error:'Durable owner verification is not configured.'});
  if(busy)return res.status(409).json({error:'Verification is already running.',operationId});
  busy=true;
  try{
   const beta=await services.rpc('pp_beta_status',{});
   if(!beta?.enabled||!beta.configured||beta.ownerId!==owner)throw Error('Owner configuration mismatch');
   const existing=await recovery.results(owner,operationId);
   if(!Array.isArray(existing))throw Error('Invalid operation acknowledgement');
   if(existing.length){
    if(existing.length!==1||existing[0].operationId!==operationId)throw Error('Invalid operation acknowledgement');
    if(existing[0].state!=='completed')return res.status(409).json({error:'This verification operation already exists. Inspect its recovery state before changing configuration.',operationId});
    return res.json(summary(existing[0].result,operationId,true));
   }
   const body={operationId,prompt,size,...config,verification:true};
   const result=await recovery.run({owner,kind:'art',body,cost:1,
    before:()=>checkAISafety(env,{prompt},verificationFetch),
    work:()=>generateCloudImages({env,prompt,size,choices:3,fetcher:verificationFetch}),
    after:value=>checkAISafety(env,value,verificationFetch)});
   return res.json(summary(result,operationId,false));
  }catch(error){
   // Recovery owns refunds and persistence; do not expose provider/DB errors or payloads.
   res.status(error?.status===402?402:503).json({error:'Cloud verification did not complete. Inspect the fixed operation recovery state before retrying.',operationId,...providerFailure});
  }finally{busy=false}
 });
}
