import {createHash,timingSafeEqual} from 'node:crypto';

const digest=value=>createHash('sha256').update(value).digest();
export function mountAIReconcile(app,{env,services,recovery}){
 // This service endpoint must precede the beta user gate. It has independent
 // server-secret authorization and never accepts an account, batch size or refund ID.
 app.all('/api/internal/ai/reconcile',async(req,res)=>{
  res.set('Cache-Control','private, no-store');
  if(req.method!=='GET')return res.set('Allow','GET').status(405).json({error:'Method not allowed.'});
  const secret=env.CRON_SECRET;
  if(typeof secret!=='string'||! /^[\x21-\x7e]{32,512}$/.test(secret))return res.status(503).json({error:'Scheduled AI recovery is not configured.'});
  const authorization=req.headers.authorization;
  if(typeof authorization!=='string'||!timingSafeEqual(digest(authorization),digest('Bearer '+secret)))return res.status(401).json({error:'Unauthorized.'});
  if(!services.configured)return res.status(503).json({error:'Scheduled AI recovery is unavailable.'});
  try{
   // Reconcile existing failed/expired leases even while new beta AI is paused.
   const count=await recovery.reconcile();
   if(!Number.isInteger(count)||count<0||count>20)throw new Error('Invalid reconciliation acknowledgement');
   return res.json({ok:true,reconciled:count});
  }catch{
   // Do not expose database messages, stored provider payloads or secret values.
   res.set('Retry-After','60');
   return res.status(503).json({error:'Scheduled AI recovery could not be confirmed. Retry later.'});
  }
 });
}
