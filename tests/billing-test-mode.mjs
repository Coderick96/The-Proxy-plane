import assert from 'node:assert/strict';
import Stripe from 'stripe';
import {createApp} from '../server/index.js';
import {createServices,isTestStripeKey,testBillingAllowed} from '../server/premium.js';

const uid='00000000-0000-4000-8000-000000000001';
const sdk=new Stripe('sk_test_fixture');
const secret='whsec_fixture';
assert.equal(isTestStripeKey('sk_test_fixture'),true);
assert.equal(isTestStripeKey('rk_test_fixture'),true);
for(const key of [undefined,'sk_live_fixture','rk_live_fixture','',123])assert.equal(isTestStripeKey(key),false);
for(const key of ['sk_live_fixture','rk_live_fixture'])assert.equal(createServices({STRIPE_SECRET_KEY:key}).stripe,null);
assert.equal(testBillingAllowed({STRIPE_SECRET_KEY:'rk_test_fixture'}),true);
assert.equal(testBillingAllowed({STRIPE_SECRET_KEY:'sk_test_fixture',BETA_MODE:'true'}),false);
assert.equal(testBillingAllowed({STRIPE_SECRET_KEY:'rk_test_fixture',BETA_MODE:'true',BETA_TEST_BILLING:'true'}),true);

for(const key of ['sk_live_fixture','rk_live_fixture',undefined,'sk_test_fixture','rk_test_fixture']){
 const calls=[];
 const env={OWNER_USER_ID:uid,STRIPE_SECRET_KEY:key,STRIPE_WEBHOOK_SECRET:secret};
 const services={configured:true,
  rpc:async name=>{assert.equal(name,'pp_ai_reconcile');return 0},
  user:async()=>({id:uid,email:'fixture@example.test'}),access:async()=>({premium:false}),
  customer:async()=>{calls.push('customer');return 'cus_fixture'},
  products:async()=>[{id:'credits_10',kind:'payment',price:'price_fixture'}],
  deckProducts:async()=>[{id:uid,published:true,title:'Fixture',stripe_price:'price_deck'}],
  webhook:async()=>calls.push('webhook'),
  stripe:{webhooks:sdk.webhooks,
   prices:{retrieve:async id=>{calls.push('price');return {active:true,currency:'usd',unit_amount:299,recurring:undefined}}},
   checkout:{sessions:{create:async()=>{calls.push('checkout');return {url:'https://checkout.stripe.com/test'}}}},
   billingPortal:{sessions:{create:async()=>{calls.push('portal');return {url:'https://billing.stripe.com/test'}}}}
  }
 };
 const app=createApp({env,services});const server=app.listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const req=async(path,body)=>{
  const response=await fetch(base+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:response.status,data:await response.json()};
 };
 const webhook=async event=>{
  const payload=JSON.stringify(event);
  return fetch(base+'/api/billing/webhook',{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':sdk.webhooks.generateTestHeaderString({payload,secret})},body:payload});
 };
 try{
  const allowed=isTestStripeKey(key);
  assert.equal((await req('/api/billing/checkout',{product:'credits_10'})).status,allowed?200:403);
  assert.equal((await req('/api/billing/portal',{})).status,allowed?200:403);
  const catalog=await req('/api/premium/catalog');
  assert.equal(catalog.data.products[0].available,allowed);
  const decks=await req('/api/deck-products');
  assert.equal(decks.data.decks[0].purchasable,allowed);
  const before=calls.length;
  assert.equal((await webhook({id:'evt_live',type:'checkout.session.completed',livemode:true,data:{object:{id:'cs_live'}}})).status,allowed?400:403);
  assert.equal((await webhook({id:'evt_missing_mode',type:'checkout.session.completed',data:{object:{id:'cs_bad'}}})).status,allowed?400:403);
  assert.equal(calls.length,before,'Rejected webhook must not reach fulfillment');
  assert.equal((await webhook({id:'evt_test',type:'checkout.session.completed',livemode:false,data:{object:{id:'cs_test'}}})).status,allowed?200:403);
  if(!allowed)assert.deepEqual(calls,[],'Live/missing keys must not perform Stripe or fulfillment operations');
 }finally{app.locals.stopAIRecovery?.();await new Promise(resolve=>server.close(resolve))}
}
const direct=createServices({}, {stripe:{},admin:{}});
await assert.rejects(()=>direct.webhook({livemode:true}),/Only Stripe test-mode/);
await assert.rejects(()=>direct.webhook({}),/Only Stripe test-mode/);
console.log('Passed test-only billing guards for live/missing/restricted keys, checkout/portal/catalog/decks, signed live/missing-mode webhook rejection and service-level fulfillment guard (local mocks; no Stripe network).');
