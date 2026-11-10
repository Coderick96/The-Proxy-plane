import {createHash,timingSafeEqual} from 'node:crypto';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const digest=value=>createHash('sha256').update(value).digest();
export function mountDevCredits(app,{env,services,route}){
 app.post('/api/dev/credits/topoff',route(async(req,res)=>{
  if(env.BETA_MODE!=='true'||env.DEV_CREDIT_TOPOFF_ENABLED!=='true'||(env.VERCEL_ENV==='production'||(!env.VERCEL_ENV&&env.NODE_ENV==='production')))return res.status(404).json({error:'Development credit refills are disabled.'});
  const amount=Number(env.DEV_CREDIT_TOPOFF_AMOUNT??100),expected=env.OWNER_TOPOFF_CODE,owner=env.OWNER_USER_ID;
  if(!owner||typeof expected!=='string'||!expected||expected.length>100||!Number.isInteger(amount)||amount<1||amount>10000||!services.configured)return res.status(503).json({error:'Development credit refill setup is incomplete.'});
  const user=await services.user(req);
  if(user.id!==owner)return res.status(403).json({error:'Owner authorization required.'});
  const body=req.body||{};
  if(!UUID.test(body.operationId||'')||typeof body.code!=='string'||body.code.length>100||Object.keys(body).some(key=>!['operationId','code'].includes(key)))return res.status(400).json({error:'Provide a valid refill request and owner code.'});
  if(!timingSafeEqual(digest(body.code),digest(expected)))return res.status(403).json({error:'Owner authorization and correct code required.'});
  const operationId=body.operationId.toLowerCase();
  const receipt=await services.rpc('pp_dev_topoff',{owner:user.id,operation:operationId,amount});
  if(!receipt||receipt.operationId!==operationId||receipt.added!==amount)throw Object.assign(new Error('Refill confirmation is unavailable. Retry the same request.'),{status:503});
  res.set('Cache-Control','private, no-store').json(receipt);
 }));
}
