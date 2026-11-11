import assert from 'node:assert/strict';
import Stripe from 'stripe';
import {createServices} from '../server/premium.js';
import {createApp} from '../server/index.js';

// Shared Stripe test accounts can contain invoices unrelated to this application.
// These SDK-signed HTTP fixtures do not call Stripe or mutate a hosted database.
const uid='00000000-0000-4000-8000-000000000001';
const secret='whsec_foreign_invoice_fixture';
const sdk=new Stripe('sk_test_fixture');
let subscriptionCustomer='cus_unrelated',invoiceCustomer='cus_unrelated',checkoutCustomer='cus_unrelated',checkoutReference='foreign-user';
const writes=[];
const admin={
 rpc:async(name,args)=>{writes.push({name,args});return {data:name==='pp_ai_reconcile'?0:null}},
 from(table){let customer;const query={select(){return query},order:async()=>({data:[]}),eq(key,value){if(key==='stripe_id')customer=value;return query},maybeSingle:async()=>({data:table==='pp_customers'&&customer==='cus_owner'?{user_id:uid}:null})};return query}
};
const stripe={webhooks:sdk.webhooks,
 checkout:{sessions:{retrieve:async()=>({id:'cs_checkout',mode:'payment',payment_status:'paid',customer:checkoutCustomer,client_reference_id:checkoutReference,line_items:{data:[{quantity:1,price:{id:'price_credits'}}]}})}},
 subscriptions:{retrieve:async()=>({id:'sub_invoice',customer:subscriptionCustomer,status:'active',items:{data:[{price:{id:'price_monthly',recurring:{interval:'month',interval_count:1}},current_period_end:2000000000}]}})},
 invoices:{retrieve:async()=>({id:'in_invoice',customer:invoiceCustomer,status:'paid',amount_paid:1499,billing_reason:'subscription_cycle',parent:{subscription_details:{subscription:'sub_invoice'}},lines:{has_more:false,data:[{amount:1499,quantity:1,pricing:{price_details:{price:'price_monthly'}},period:{start:1997321600,end:2000000000}}]}})}
};
const env={STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:secret,STRIPE_PRICE_PREMIUM_MONTHLY:'price_monthly',STRIPE_PRICE_CREDITS_10:'price_credits',SERVERLESS_MODE:'true'};
const services=createServices(env,{admin,stripe});
const app=createApp({env,services});const server=app.listen(0,'127.0.0.1');
await new Promise(resolve=>server.once('listening',resolve));
const base='http://127.0.0.1:'+server.address().port;
async function send(type='invoice.paid'){const payload=JSON.stringify({id:'evt_invoice',livemode:false,type,data:{object:{id:type==='invoice.paid'?'in_invoice':'cs_checkout'}}});return fetch(base+'/api/billing/webhook',{method:'POST',headers:{'Content-Type':'application/json','Stripe-Signature':sdk.webhooks.generateTestHeaderString({payload,secret})},body:payload});}
try{
 assert.equal((await send()).status,200,'An unrelated signed test invoice must be acknowledged without retrying indefinitely');
 assert.deepEqual(writes,[],'An unmapped customer must not write entitlements or credits');
 subscriptionCustomer='cus_owner';invoiceCustomer='cus_foreign';
 assert.equal((await send()).status,500,'Mapped subscription with mismatched invoice customer remains rejected');
 assert(!writes.some(x=>x.name==='pp_grant_monthly'),'Mismatch must never grant monthly credits');
 writes.length=0;invoiceCustomer='cus_owner';
 assert.equal((await send()).status,200);
 assert.equal(writes.filter(x=>x.name==='pp_grant_monthly').length,1);
 assert.equal(writes.find(x=>x.name==='pp_grant_monthly').args.owner,uid);
 writes.length=0;
 assert.equal((await send('checkout.session.completed')).status,200,'Unmapped paid checkout must be acknowledged without fulfillment');
 assert.deepEqual(writes,[]);
 checkoutCustomer='cus_owner';
 assert.equal((await send('checkout.session.completed')).status,500,'Mapped checkout client-reference mismatch remains rejected');
 assert.deepEqual(writes,[]);
 checkoutReference=uid;
 assert.equal((await send('checkout.session.completed')).status,200);
 assert.equal(writes.filter(x=>x.name==='pp_apply_purchase').length,1);
 assert.equal(writes.find(x=>x.name==='pp_apply_purchase').args.owner,uid);
 console.log('PASS signed HTTP invoice and checkout handling: unrelated customer acknowledged without DB writes, mapped customer mismatch rejected without credit grant, genuine mapped paid invoice fulfilled (mock Stripe/DB).');
}finally{app.locals.stopAIRecovery?.();await new Promise(resolve=>server.close(resolve))}
