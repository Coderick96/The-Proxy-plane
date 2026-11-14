import assert from 'node:assert/strict';
import {createServices,catalog} from '../server/premium.js';
import {createApp} from '../server/index.js';
import {shopPlans} from '../server/shopPlans.js';
const uid='00000000-0000-4000-8000-000000000001',calls=[];
const env={STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture',SHOP_MONTHLY_ENABLED:'true',STRIPE_PRICE_CREDITS_MONTHLY:'price_credits',SHOP_MONTHLY_CREDITS:'80',SHOP_CREDITS_MONTHLY_CENTS:'999',STRIPE_PRICE_STORAGE_MONTHLY:'price_storage',SHOP_STORAGE_CARDS:'2500',SHOP_STORAGE_BYTES:'2147483648',SHOP_STORAGE_MONTHLY_CENTS:'499',STRIPE_PRICE_PREMIUM_MONTHLY:'price_legacy'};
let status='active',sku='credits_monthly',invoiceStatus='paid',reason='subscription_cycle',proration=false,quantity=1,interval='month';
const plan=()=>shopPlans(env).find(p=>p.id===sku);
const price=()=>({id:plan().price,active:true,currency:'usd',unit_amount:plan().expectedAmount,livemode:false,recurring:{interval,interval_count:1}});
const admin={rpc:async(name,args)=>{calls.push([name,args]);return {data:null}},from(table){const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:table==='pp_subscription_holds'?null:{user_id:uid}})};return q}};
const stripe={subscriptions:{retrieve:async()=>({id:'sub_shop',customer:'cus_shop',status,livemode:false,items:{data:[{price:price(),quantity}]}})},invoices:{retrieve:async()=>({id:'in_shop',customer:'cus_shop',status:invoiceStatus,livemode:false,amount_paid:plan().expectedAmount,billing_reason:reason,parent:{subscription_details:{subscription:'sub_shop'}},lines:{has_more:false,data:[{amount:plan().expectedAmount,quantity:1,pricing:{price_details:{price:plan().price}},proration,period:{start:1997321600,end:2000000000}}]}})}};
const services=createServices(env,{stripe,admin});
const paid=()=>services.webhook({livemode:false,type:'invoice.paid',data:{object:{id:'in_shop'}}});
await paid();assert.equal(calls.findLast(c=>c[0]==='pp_shop_paid_invoice')[1].credit_amount,80);assert(!calls.some(c=>c[0]==='pp_grant_monthly'||c[0]==='pp_sync_subscription'));
sku='storage_monthly';calls.length=0;await paid();assert.equal(calls.findLast(c=>c[0]==='pp_shop_paid_invoice')[1].card_limit,2500);
for(const change of [()=>status='canceled',()=>invoiceStatus='open',()=>reason='subscription_update',()=>quantity=2,()=>interval='year']){status='active';invoiceStatus='paid';reason='subscription_cycle';quantity=1;interval='month';calls.length=0;change();await paid();assert(!calls.some(c=>c[0]==='pp_shop_paid_invoice'));}
status='active';invoiceStatus='paid';reason='subscription_cycle';quantity=1;interval='month';proration=true;await assert.rejects(paid,/exactly one/);
// Direct HTTP attempts cannot bypass the retired Premium offer.
const httpServices={...services,configured:false,products:async()=>catalog(env),user:async()=>({id:uid}),access:async()=>({}),billingReady:async()=>true};
const server=createApp({env,services:httpServices}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
try{const base='http://127.0.0.1:'+server.address().port;const result=await fetch(base+'/api/billing/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:'premium_monthly'})});assert.equal(result.status,410);const data=await(await fetch(base+'/api/premium/catalog')).json();assert(!data.products.some(p=>['premium_monthly','studio_pass'].includes(p.id)));}finally{await new Promise(r=>server.close(r));}
console.log('PASS monthly shop billing: separate credit/storage invoice dispatch, retired offer rejection, subscription quantity/cancellation/unpaid/proration protection and hidden Premium catalog.');
