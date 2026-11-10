// Device computation stays local; this endpoint authorizes the app's one-credit request.
export const DEVICE_CREDIT_MODEL='a310400909a293a7a937a54854910ed06469192b';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fingerprint=/^[a-f0-9]{64}$/;
export function mountDeviceCredits(app,{env,services,route}){
 app.post('/api/ai/device/charge',route(async(req,res)=>{
  const user=await services.user(req);
  if(env.BETA_MODE==='true'&&env.BETA_AI_ENABLED!=='true')return res.status(503).json({error:'AI generation is paused for this beta. No credits were charged.'});
  if(!services.configured)return res.status(503).json({error:'Account credit setup is incomplete. No credits were charged.'});
  const body=req.body;
  if(!body||Array.isArray(body)||Object.keys(body).some(key=>!['operationId','modelRevision','fingerprint'].includes(key))||!uuid.test(body.operationId||'')||body.modelRevision!==DEVICE_CREDIT_MODEL||!fingerprint.test(body.fingerprint||''))return res.status(400).json({error:'Provide a valid device operation, supported model and request fingerprint.'});
  const operationId=body.operationId.toLowerCase();
  try{
   const receipt=await services.rpc('pp_charge_device_ai',{owner:user.id,operation:operationId,model_revision:body.modelRevision,fingerprint:body.fingerprint});
   if(!receipt||receipt.operationId!==operationId||receipt.modelRevision!==body.modelRevision||receipt.mode!=='device'||receipt.creditsSpent!==1)throw Object.assign(new Error('The credit receipt could not be confirmed. Retry this same request identifier before starting another generation.'),{status:503});
   res.set('Cache-Control','private, no-store').json(receipt);
  }catch(error){
   error.operationId=operationId;
   if(/No AI credits|Not enough AI credits/i.test(error.message||''))error.status=402;
   else if(error.code==='23505'||/Device request identifier is unavailable|Request already processed|Device request was refunded/i.test(error.message||''))error.status=409;
   else if(/Could not find.*pp_charge_device_ai|function.*pp_charge_device_ai.*does not exist|schema cache/i.test(error.message||''))error.status=503;
   throw error;
  }
 }));
}
