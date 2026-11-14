import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import assert from 'node:assert/strict';
import PremiumShop from '../src/PremiumShop.jsx';
import {PremiumContext} from '../src/PremiumContext.jsx';
import {FREE_ACCESS} from '../src/premiumCatalog.js';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const find=text=>[...document.querySelectorAll('button')].find(button=>button.textContent===text);
const client={auth:{getSession:async()=>({data:{session:{user:{id:'tester'},access_token:'test-token'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};
async function run(){
const previous=global.fetch;
const pending=[];
global.fetch=async path=>{assert.equal(path,'/api/premium/catalog');return new Promise((resolve,reject)=>pending.push({resolve:data=>resolve({ok:true,json:async()=>data}),reject}));};
const root=createRoot(document.getElementById('root'));
try{
 await act(async()=>{root.render(<PremiumContext.Provider value={{access:FREE_ACCESS,client,refresh(){}}}><PremiumShop/></PremiumContext.Provider>);await tick()});
 assert(document.body.textContent.includes('Checking checkout availability'));
 assert(!find('Manage billing').disabled,'Existing customers retain portal access if catalog is loading');
 await act(async()=>{pending.shift().reject(new Error('Network unavailable'));await tick()});
 assert(document.querySelector('[role="alert"]').textContent.includes('catalog could not load'));
 assert(!find('Manage billing').disabled,'Catalog failure must not prevent managing existing subscriptions');
 await act(async()=>{find('Retry purchase catalog').click();await tick()});
 assert(document.body.textContent.includes('Checking checkout availability'));
 const product={id:'credits_10',name:'10 AI credits',description:'Credit pack',available:false};
 await act(async()=>{pending.shift().resolve({products:[product],testMode:true,billing:{enabled:false,mode:'disabled',reason:'Test purchases are disabled for this deployment.'}});await tick()});
 assert(document.body.textContent.includes('Test purchases are disabled for this deployment.'));
 assert(find('Continue to checkout').disabled);
 assert(find('Manage billing').disabled);
 await act(async()=>{find('Check checkout availability').click();await tick()});
 await act(async()=>{pending.shift().resolve({products:[product],testMode:false,billing:{enabled:false,portalEnabled:true,mode:'live',reason:'New purchases are paused; existing subscriptions can still be managed.'}});await tick()});
 assert(find('Continue to checkout').disabled,'Paused live sales cannot open checkout');
 assert(!find('Manage billing').disabled,'Paused live sales must preserve cancellation and billing portal');
 assert(document.body.textContent.includes('existing subscriptions can still be managed'));
 assert(!document.body.textContent.includes('Live checkout — purchases charge real money.'),'Paused sales must not be advertised as active checkout');
 await act(async()=>{find('Check checkout availability').click();await tick()});
 assert([...document.querySelectorAll('button')].filter(b=>b.textContent==='Continue to checkout').every(b=>b.disabled),'All shop offers stay disabled while retrying');
 assert(!document.body.textContent.includes('$2.99'),'Stale prices are removed while retrying');
 await act(async()=>{pending.shift().resolve({products:[{...product,available:true,amount:299,currency:'usd'}],testMode:true,billing:{enabled:true,mode:'test',reason:null}});await tick()});
 assert([...document.querySelectorAll('button')].some(b=>b.textContent==='Continue to checkout'&&!b.disabled));
 assert(!find('Manage billing').disabled);
 assert(document.body.textContent.includes('Stripe test mode'));
 assert(document.body.textContent.includes('$2.99'));
 assert(document.body.textContent.includes('AI credit sales are paused'));
 await act(async()=>root.unmount());
 console.log('PASS checkout availability: loading defers checkout, catalog failure preserves portal access, retry clears stale offers, disabled reason is visible, paused live sales preserve cancellation portal, available test offer enables checkout; simulated DOM/provider responses.');
}finally{global.fetch=previous;}

}
run().catch(error=>{console.error(error);process.exitCode=1});
