import assert from 'node:assert/strict';import {createServices} from '../server/premium.js';
const uid='00000000-0000-4000-8000-000000000001',events=[];
let status='active',invoiceStatus='paid',amount=1499,reason='subscription_cycle',interval='month',price='price_monthly',proration=false;
const admin={rpc:async(name,args)=>{events.push([name,args]);return {data:null}},from(table){const c={select(){return c},eq(){return c},maybeSingle:async()=>({data:table==='pp_subscription_holds'?null:{user_id:uid}})};return c}};
const stripe={subscriptions:{retrieve:async()=>({id:'sub_test',customer:'cus_test',status,items:{data:[{price:{id:'price_monthly',recurring:{interval,interval_count:1}},current_period_end:2000000000}]}})},invoices:{retrieve:async()=>({id:'in_test',customer:'cus_test',status:invoiceStatus,amount_paid:amount,billing_reason:reason,parent:{subscription_details:{subscription:'sub_test'}},lines:{has_more:false,data:[{amount,quantity:1,pricing:{price_details:{price}},parent:{subscription_item_details:{proration}},period:{start:1997321600,end:2000000000}}]}})}};
const services=createServices({STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_PRICE_PREMIUM_MONTHLY:'price_monthly'},{admin,stripe});
const event={livemode:false,type:'invoice.paid',data:{object:{id:'in_test'}}};
await services.webhook(event);assert.equal(events.findLast(e=>e[0]==='pp_grant_monthly')[1].owner,uid);assert.equal(events.findLast(e=>e[0]==='pp_grant_monthly')[1].invoice_id,'in_test');
for(const change of [()=>status='canceled',()=>invoiceStatus='open',()=>amount=0,()=>reason='subscription_update',()=>interval='year']){
 status='active';invoiceStatus='paid';amount=1499;reason='subscription_cycle';interval='month';events.length=0;change();await services.webhook(event);assert(!events.some(e=>e[0]==='pp_grant_monthly'));
}
status='active';invoiceStatus='paid';amount=1499;reason='subscription_cycle';interval='month';price='price_other';await assert.rejects(()=>services.webhook(event),/exactly one/);price='price_monthly';proration=true;await assert.rejects(()=>services.webhook(event),/exactly one/);
console.log('Passed monthly grant owner/price/paid-status/cycle/interval checks; zero-payment, canceled, annual, proration and unrelated invoice rejection (mock Stripe).');
