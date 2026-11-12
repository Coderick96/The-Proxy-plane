import {createHash,timingSafeEqual} from 'node:crypto';
import {isTestStripeKey} from './premium.js';

const digest=value=>createHash('sha256').update(value).digest();
const offers=[['STRIPE_PRICE_PREMIUM_MONTHLY',1499,true],['STRIPE_PRICE_CREDITS_10',299,false],['STRIPE_PRICE_CREDITS_30',699,false],['STRIPE_PRICE_CREDITS_80',1499,false]];

// An operator-only, read-only probe for credentials that cannot be read back from hosting.
// It never creates a customer, checkout, payment, entitlement or credit grant.
export function mountBillingReadiness(app,{env,services}){
 app.all('/api/internal/billing/readiness',async(req,res)=>{
  res.set('Cache-Control','private, no-store');
  if(req.method!=='GET')return res.set('Allow','GET').status(405).json({error:'Method not allowed.'});
  if(env.VERCEL_ENV==='production')return res.sendStatus(404);
  if(typeof env.CRON_SECRET!=='string'||! /^[\x21-\x7e]{32,512}$/.test(env.CRON_SECRET))return res.status(503).json({error:'Operator verification is not configured.'});
  if(typeof req.headers.authorization!=='string'||!timingSafeEqual(digest(req.headers.authorization),digest('Bearer '+env.CRON_SECRET)))return res.status(401).json({error:'Unauthorized.'});
  if(!isTestStripeKey(env.STRIPE_SECRET_KEY)||!services.stripe||!/^acct_[A-Za-z0-9]+$/.test(env.STRIPE_EXPECTED_ACCOUNT_ID||''))return res.status(503).json({error:'Test billing verification is not configured.'});
  try{
   const account=await services.stripe.accounts.retrieve();
   if(account.id!==env.STRIPE_EXPECTED_ACCOUNT_ID)return res.status(503).json({error:'The configured test account does not match.'});
   const ids=offers.map(([key])=>env[key]);
   if(ids.some(id=>!/^price_[A-Za-z0-9]+$/.test(id||''))||new Set(ids).size!==ids.length)return res.status(503).json({error:'Distinct test price configuration is required.'});
   for(const [key,amount,monthly] of offers){
    const price=await services.stripe.prices.retrieve(env[key]);
    if(price.livemode!==false||!price.active||price.currency!=='usd'||price.unit_amount!==amount||(monthly?price.recurring?.interval!=='month'||price.recurring?.interval_count!==1:Boolean(price.recurring)))return res.status(503).json({error:'A test price does not match the published offer.'});
   }
   res.json({ok:true,testMode:true,accountMatches:true,verifiedOffers:offers.length,webhookConfigured:Boolean(env.STRIPE_WEBHOOK_SECRET)});
  }catch{
   res.status(503).json({error:'Test billing verification could not be confirmed.'});
  }
 });
}
