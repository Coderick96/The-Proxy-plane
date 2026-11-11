import assert from 'node:assert/strict';
import express from 'express';
import {mountBillingReadiness} from '../server/billingReadiness.js';
const env={CRON_SECRET:'a'.repeat(64),STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_EXPECTED_ACCOUNT_ID:'acct_expected',STRIPE_PRICE_PREMIUM_MONTHLY:'price_monthly',STRIPE_PRICE_CREDITS_10:'price_ten',STRIPE_PRICE_CREDITS_30:'price_thirty',STRIPE_PRICE_CREDITS_80:'price_eighty'};
let reads=0,account='acct_expected',invalid=false,fail=false;
const stripe={accounts:{retrieve:async()=>{reads++;if(fail)throw Error('private provider error');return{id:account}}},prices:{retrieve:async id=>{reads++;return{livemode:invalid,active:true,currency:'usd',unit_amount:({price_monthly:1499,price_ten:299,price_thirty:699,price_eighty:1499})[id],...(id==='price_monthly'?{recurring:{interval:'month',interval_count:1}}:{})}}}};
const app=express();mountBillingReadiness(app,{env,services:{stripe}});const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url='http://127.0.0.1:'+server.address().port+'/api/internal/billing/readiness';
const get=(token=env.CRON_SECRET,method='GET')=>fetch(url,{method,headers:token?{authorization:'Bearer '+token}:{}});
try{
 for(const token of ['', 'wrong'])assert.equal((await get(token)).status,401);
 assert.equal((await get(env.CRON_SECRET,'POST')).status,405);assert.equal(reads,0);
 let r=await get();assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.deepEqual(await r.json(),{ok:true,testMode:true,accountMatches:true,verifiedOffers:4,webhookConfigured:false});
 account='acct_other';assert.equal((await get()).status,503);account='acct_expected';
 invalid=true;assert.equal((await get()).status,503);invalid=false;
 fail=true;r=await get();assert.equal(r.status,503);assert(!(await r.text()).includes('private provider error'));fail=false;
 const n=reads;env.STRIPE_SECRET_KEY='sk_live_forbidden';assert.equal((await get()).status,503);assert.equal(reads,n);
 env.STRIPE_SECRET_KEY='sk_test_fixture';env.VERCEL_ENV='production';assert.equal((await get()).status,404);assert.equal(reads,n);
 console.log('PASS operator-only billing readiness: no unauthorized provider reads, GET-only, test/account/price guards, private no-store, generic failure and production denial (mock Stripe).');
}finally{await new Promise(r=>server.close(r))}
