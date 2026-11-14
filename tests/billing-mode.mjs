import assert from 'node:assert/strict';
import Stripe from 'stripe';
import {billingMode,billingAllowed,stripeObjectMatchesMode} from '../server/billingMode.js';
import {createServices} from '../server/premium.js';
import {createApp} from '../server/index.js';
const live={DEVICE_AI_PAID_RELEASE_VERIFIED:'true',VERCEL_ENV:'production',BILLING_MODE:'live',LIVE_PAYMENTS_ENABLED:'true',BILLING_LIVE_DATA_ISOLATED:'true',STRIPE_EXPECTED_ACCOUNT_ID:'acct_fixture',STRIPE_SECRET_KEY:'rk_live_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture',STRIPE_PRICE_CREDITS_10:'price_credit'};
assert.equal(billingMode(live),'live');
for(const field of ['VERCEL_ENV','BILLING_MODE','LIVE_PAYMENTS_ENABLED','BILLING_LIVE_DATA_ISOLATED','STRIPE_EXPECTED_ACCOUNT_ID','STRIPE_SECRET_KEY']){assert.equal(billingAllowed({...live,[field]:undefined}),false,field+' must be explicit');}
for(const environment of ['preview','development',undefined])assert.equal(billingMode({...live,VERCEL_ENV:environment}),'disabled');
assert.equal(billingMode({...live,STRIPE_SECRET_KEY:'sk_test_fixture'}),'disabled');
assert.equal(billingMode({STRIPE_SECRET_KEY:'sk_live_fixture'}),'disabled');
assert.equal(billingMode({STRIPE_SECRET_KEY:'sk_test_fixture'}),'test');
assert.equal(stripeObjectMatchesMode(live,{livemode:false}),false);
assert.equal(stripeObjectMatchesMode(live,{}),false);
const uid='00000000-0000-4000-8000-000000000001';
const sdk=new Stripe('sk_test_fixture');let account='acct_fixture',charges=true,priceLive=true,creates=0;
const stripe={accounts:{retrieve:async()=>({id:account,charges_enabled:charges})},prices:{retrieve:async()=>({active:true,livemode:priceLive,currency:'usd',unit_amount:299})},checkout:{sessions:{create:async()=>{creates++;return {url:'https://checkout.stripe.com/fixture'}}}},webhooks:sdk.webhooks};
const service=createServices(live,{stripe,admin:{}});
const services={...service,configured:false,user:async()=>({id:uid}),access:async()=>({}),customer:async()=> 'cus_fixture',products:async()=>[{id:'credits_10',kind:'payment',price:'price_credit'}],rpc:async()=>0};
const app=createApp({env:live,services});const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
async function checkout(){return fetch(base+'/api/billing/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:'credits_10'})})}
try{
 account='acct_wrong';assert.equal((await checkout()).status,503);assert.equal(creates,0);
 account='acct_fixture';charges=false;assert.equal((await checkout()).status,503);assert.equal(creates,0);
 charges=true;priceLive=false;assert.equal((await checkout()).status,503);assert.equal(creates,0);
 priceLive=true;assert.equal((await checkout()).status,200);assert.equal(creates,1);
 for(const mode of [false,undefined]){const payload=JSON.stringify({type:'checkout.session.completed',livemode:mode,data:{object:{id:'cs_fixture'}}});const r=await fetch(base+'/api/billing/webhook',{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':sdk.webhooks.generateTestHeaderString({payload,secret:live.STRIPE_WEBHOOK_SECRET})},body:payload});assert.equal(r.status,400);}
}finally{await new Promise(r=>server.close(r));}
// Exercise service-level cross-mode rejection before any ledger write, even behind a valid live event.
let grants=0;const admin={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{user_id:uid}})})})}),rpc:async()=>{grants++;return {data:true}}};
const fulfillment=createServices(live,{admin,stripe:{accounts:stripe.accounts,checkout:{sessions:{retrieve:async()=>({livemode:false,payment_status:'paid'})}}}});
await assert.rejects(()=>fulfillment.webhook({livemode:true,type:'checkout.session.completed',data:{object:{id:'cs_wrong'}}}),/does not match/);assert.equal(grants,0);
// Positive live-mode fulfillment through signed HTTP with real service dispatch and mocked Stripe/DB.
// Replay must deliver the identical receipt to the existing SQL idempotency boundary, not invent a new grant.
const purchaseCalls=[];
const purchaseAdmin={
 from(table){
  if(table==='pp_customers')return {select:()=>({eq:(field,customer)=>({maybeSingle:async()=>({data:customer==='cus_live_fixture'?{user_id:uid}:null})})})};
  assert.equal(table,'pp_deck_products');return {select:()=>({eq:()=>({order:async()=>({data:[]})})})};
 },
 async rpc(name,args){assert.equal(name,'pp_apply_purchase');purchaseCalls.push({name,args});return {data:true};}
};
let purchasePriceLive=true,purchaseIntentLive=true,purchaseChargeLive=true;
const purchaseStripe={
 webhooks:sdk.webhooks,accounts:stripe.accounts,
 checkout:{sessions:{retrieve:async id=>({id,livemode:true,mode:'payment',payment_status:'paid',customer:'cus_live_fixture',client_reference_id:uid,payment_intent:'pi_live_fixture',line_items:{data:[{quantity:1,price:{id:'price_credit',livemode:purchasePriceLive}}]}})}},
 paymentIntents:{retrieve:async()=>({id:'pi_live_fixture',livemode:purchaseIntentLive,latest_charge:{id:'ch_live_fixture',livemode:purchaseChargeLive,refunded:false,amount_refunded:0,disputed:false}})}
};
const purchaseService=createServices(live,{admin:purchaseAdmin,stripe:purchaseStripe});
const purchaseApp=createApp({env:live,services:{...purchaseService,configured:false}});
const purchaseServer=purchaseApp.listen(0,'127.0.0.1');await new Promise(r=>purchaseServer.once('listening',r));
const paidEvent={id:'evt_live_paid_fixture',livemode:true,type:'checkout.session.completed',data:{object:{id:'cs_live_paid_fixture'}}};
async function deliverPurchase(){const payload=JSON.stringify(paidEvent);return fetch('http://127.0.0.1:'+purchaseServer.address().port+'/api/billing/webhook',{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':sdk.webhooks.generateTestHeaderString({payload,secret:live.STRIPE_WEBHOOK_SECRET})},body:payload})}
try{
 for(let replay=0;replay<2;replay++){const response=await deliverPurchase();assert.equal(response.status,200,await response.text());}
 assert.equal(purchaseCalls.length,2);
 assert.deepEqual(purchaseCalls[0],{name:'pp_apply_purchase',args:{owner:uid,receipt:'cs_live_paid_fixture',sku:'credits_10'}});
 assert.deepEqual(purchaseCalls[1],purchaseCalls[0],'Duplicate delivery must use the same SQL receipt idempotency key');
 purchasePriceLive=false;assert.equal((await deliverPurchase()).status,400);purchasePriceLive=true;
 purchaseIntentLive=false;assert.equal((await deliverPurchase()).status,400);purchaseIntentLive=true;
 purchaseChargeLive=false;assert.equal((await deliverPurchase()).status,400);purchaseChargeLive=true;
 assert.equal(purchaseCalls.length,2,'Wrong-mode nested payment objects must not reach the ledger');
}finally{await new Promise(r=>purchaseServer.close(r));}
// Pausing new sales must keep signed outstanding payment/refund processing reachable.
const paused={...live,LIVE_PAYMENTS_ENABLED:'false'};assert.equal(billingAllowed(paused),false);assert.equal(billingMode(paused),'live');
let retrieved=0;const pausedService=createServices(paused,{admin:{},stripe:{webhooks:sdk.webhooks,accounts:stripe.accounts,checkout:{sessions:{retrieve:async()=>{retrieved++;return {livemode:true,payment_status:'unpaid'}}}}}});charges=false;await pausedService.webhook({livemode:true,type:'checkout.session.completed',data:{object:{id:'cs_pending'}}});assert.equal(retrieved,1);
pausedService.stripe.billingPortal={sessions:{create:async()=>({url:'https://billing.stripe.com/fixture'})}};const pausedApp=createApp({env:paused,services:{...pausedService,configured:false,user:async()=>({id:uid}),customer:async()=>'cus_fixture',webhook:async()=>{retrieved++}}});const pausedServer=pausedApp.listen(0,'127.0.0.1');await new Promise(r=>pausedServer.once('listening',r));try{const pausedBase='http://127.0.0.1:'+pausedServer.address().port;const checkoutResult=await fetch(pausedBase+'/api/billing/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(checkoutResult.status,403);const portalResult=await fetch(pausedBase+'/api/billing/portal',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(portalResult.status,200);const payload=JSON.stringify({livemode:true,type:'checkout.session.completed',data:{object:{id:'cs_pending'}}});const response=await fetch(pausedBase+'/api/billing/webhook',{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':sdk.webhooks.generateTestHeaderString({payload,secret:live.STRIPE_WEBHOOK_SECRET})},body:payload});assert.equal(response.status,200,await response.text());assert.equal(retrieved,2);}finally{await new Promise(r=>pausedServer.close(r));}
console.log('Passed explicit production/live/isolation opt-ins, Preview rejection, account and charges readiness, wrong-mode prices, signed cross-mode webhook rejection positive signed live receipt dispatch/replay, paused cancellation and nested fulfillment isolation (local mock Stripe/DB; SQL receipt idempotency covered separately; no real charges).');
