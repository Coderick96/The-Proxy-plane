import assert from 'node:assert/strict';
import {createApp} from '../server/index.js';
let writes=0;
const products=[{id:'credits_10',price:'price_credit',kind:'payment'},{id:'credits_monthly',price:'price_monthly',kind:'subscription'},{id:'pack_celestial',price:'price_pack',kind:'payment'}];
const services={configured:false,user:async()=>({id:'test-owner'}),products:async()=>products,billingReady:async()=>true,stripe:{prices:{retrieve:async()=>({active:true,currency:'usd',unit_amount:299})},checkout:{sessions:{create:async()=>{writes++;}}}},rpc:async()=>{writes++;}};
const env={STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture'};
const server=createApp({env,services}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
try{const base='http://127.0.0.1:'+server.address().port;const catalog=await(await fetch(base+'/api/premium/catalog')).json();assert(catalog.products.filter(p=>p.id.startsWith('credits_')).every(p=>!p.available));assert(catalog.products.find(p=>p.id==='pack_celestial').available);
for(const product of ['credits_10','credits_monthly']){const r=await fetch(base+'/api/billing/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product})});assert.equal(r.status,503);assert.match((await r.json()).error,/quality/);}assert.equal(writes,0);
}finally{await new Promise(r=>server.close(r));}
console.log('PASS unverified device AI cannot sell one-time/monthly credits through catalog or direct checkout; backing packs remain independent; no Stripe/ledger writes.');
