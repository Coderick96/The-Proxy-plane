import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {createAIRecovery} from './aiRecovery.js';
import {mountAIReconcile} from './aiReconcile.js';
import {mountBillingReadiness} from './billingReadiness.js';
import {mountAIVerification} from './aiVerification.js';
import {cloudImageConfig,generateCloudImages} from './cloudImages.js';
import {appOrigin} from './appOrigin.js';
import {sendAIJson,aiReferenceLimit} from './aiTransport.js';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {mountBeta} from './beta.js';
import {checkAISafety} from './aiSafety.js';
import {createServices,catalog,billingAllowed,billingMode,isTestStripeKey} from './premium.js';
import {stripeObjectMatchesMode,stripeEventMatchesMode} from './billingMode.js';
import {structuredAI,SET_SCHEMA,REVIEW_SCHEMA,validateSet} from './ai.js';
import {mountDeckStore} from './deckStore.js';
import {mountDeviceCredits} from './deviceCredits.js';
import {mountDevCredits} from './devCredits.js';
import {fetchDeck} from './deckImport.js';
import {PACKS,ownsPack} from '../src/premiumCatalog.js';
import {aiSalesPaused,AI_SALES_PAUSED_REASON} from './aiSalesPolicy.js';
import {validShopPrice} from './shopPlans.js';
import {isShopProduct} from '../src/shopCatalog.js';
export function createApp({env=process.env,services=createServices(env),fetcher=fetch}={}){
 const app=express(),origin=appOrigin(env),recovery=createAIRecovery(services),pending=new Set();
 app.use(cors({origin}));
 const route=fn=>async(req,res,next)=>{try{await fn(req,res,next)}catch(e){if(res.headersSent){res.destroy();return;}res.status(e.status||(/Could not find.*pp_|function.*pp_.*does not exist/i.test(e.message||'')?503:500)).json({...(e.operationId?{operationId:e.operationId}:{}),error:/Could not find.*pp_|function.*pp_.*does not exist/i.test(e.message||'')?'Premium database setup is incomplete. See PREMIUM_SETUP.md.':e.message||'Server request failed.'})}};
 app.post('/api/billing/webhook',express.raw({type:'application/json',limit:'1mb'}),route(async(req,res)=>{
  if(billingMode(env)==='disabled')return res.status(403).json({error:'Billing is disabled for this environment.'});
  if(!services.stripe||!env.STRIPE_WEBHOOK_SECRET)return res.status(503).json({error:'Billing webhook is not configured.'});
  let event;try{event=services.stripe.webhooks.constructEvent(req.body,req.headers['stripe-signature'],env.STRIPE_WEBHOOK_SECRET)}catch{return res.status(400).json({error:'Invalid webhook signature.'})}
  if(!stripeEventMatchesMode(env,event))return res.status(400).json({error:'Stripe webhook mode does not match this environment.'});
  await services.webhook(event);res.json({received:true});
 }));
 app.use(express.json({limit:'12mb'}));
 app.get('/api/health',(_req,res)=>res.json({ok:true,aiConfigured:Boolean(env.OPENAI_API_KEY),accountsConfigured:services.configured,deviceAIEnabled:env.BETA_MODE!=='true'||env.BETA_AI_ENABLED==='true',cloudAIEnabled:env.BETA_CLOUD_AI_ENABLED==='true'&&Boolean(env.OPENAI_API_KEY),billingConfigured:Boolean(billingAllowed(env)&&services.stripe&&env.STRIPE_WEBHOOK_SECRET)}));
 mountAIReconcile(app,{env,services,recovery});
 mountBillingReadiness(app,{env,services});
 mountAIVerification(app,{env,services,recovery,fetcher});
 mountBeta(app,{env,services,route});
 mountDeviceCredits(app,{env,services,route});
 mountDevCredits(app,{env,services,route});
 const betaSalesOff=()=>!billingAllowed(env);
 const billingReady=async()=>{if(!billingAllowed(env)||!services.stripe)return false;if(billingMode(env)==='live'&&!services.billingReady)throw Object.assign(new Error('Live billing account verification is unavailable.'),{status:503});return services.billingReady?services.billingReady():true;};
 app.use('/api/billing/checkout',(req,res,next)=>betaSalesOff()?res.status(403).json({error:'Purchases are disabled for this environment.'}):next());
 const deckLimits=new Map();
 app.post('/api/decks/import',route(async(req,res)=>{const key=req.ip,now=Date.now();let limit=deckLimits.get(key);if(!limit||now-limit.start>60000){limit={start:now,count:0};if(deckLimits.size>5000)deckLimits.clear();deckLimits.set(key,limit)}if(++limit.count>10)return res.status(429).json({error:'Please wait a minute before importing another deck URL.'});if(typeof req.body?.url!=='string'||req.body.url.length>2000)return res.status(400).json({error:'Paste a supported public deck URL.'});try{res.json(await fetchDeck(req.body.url,{fetcher}))}catch(e){res.status(400).json({error:e.name==='TimeoutError'?'Deck site timed out. Try its text export instead.':e.message})}}));

 app.get('/api/premium/catalog',route(async(_req,res)=>{
  let ready=false,portalReady=false;try{ready=await billingReady()}catch{}
  try{portalReady=billingMode(env)!=='disabled'&&Boolean(services.stripe)&&(billingMode(env)!=='live'||Boolean(services.billingReady&&await services.billingReady({fulfillment:true})))}catch{}
  const products=await Promise.all((await services.products()).filter(p=>isShopProduct(p)||p.id.startsWith('deck:')).map(async p=>{if(aiSalesPaused(env,p))return {...p,price:undefined,available:false,unavailableReason:AI_SALES_PAUSED_REASON};if(!ready||!p.price||p.configured===false||p.shopReady===false||!env.STRIPE_WEBHOOK_SECRET)return {...p,price:undefined,available:false};try{const price=await services.stripe.prices.retrieve(p.price);return {...p,price:undefined,available:Boolean(price.active&&stripeObjectMatchesMode(env,price)&&(p.configured===undefined||validShopPrice(env,p,price))),currency:price.currency,amount:price.unit_amount,interval:price.recurring?.interval};}catch{return {...p,price:undefined,available:false,unavailableReason:'This offer is temporarily unavailable.'};}}));res.set('Cache-Control','private, no-store').json({products,testMode:billingMode(env)==='test',billing:{enabled:Boolean(ready&&env.STRIPE_WEBHOOK_SECRET),portalEnabled:Boolean(portalReady&&env.STRIPE_WEBHOOK_SECRET),mode:billingMode(env),reason:ready&&env.STRIPE_WEBHOOK_SECRET?'':billingMode(env)==='live'?'Live billing setup or account verification is incomplete.':'Purchases are disabled for this environment. Use the current test beta to verify checkout.'}});
 }));
 app.get('/api/premium/access',route(async(req,res)=>{const u=await services.user(req);res.json(await services.access(u.id))}));
 app.get('/api/premium/assets/:pack/:design',route(async(req,res)=>{const u=await services.user(req),a=await services.access(u.id);const p=PACKS.find(p=>p.id===req.params.pack);if(!p||!p.backs.includes(req.params.design))return res.sendStatus(404);if(!ownsPack(a,p.id))return res.status(403).json({error:'This design requires its pack or Premium.'});res.set('Cache-Control','private, no-store').json({image:'data:image/svg+xml;base64,'+(await readFile(new URL(`./assets/${p.id}-${req.params.design}.svg`,import.meta.url))).toString('base64')});}));
 app.post('/api/billing/checkout',route(async(req,res)=>{
  const u=await services.user(req);if(!await billingReady()||!env.STRIPE_WEBHOOK_SECRET)return res.status(503).json({error:'Purchases are not configured yet.'});const p=(await services.products()).find(p=>p.id===req.body?.product);if(aiSalesPaused(env,p))return res.status(503).json({error:AI_SALES_PAUSED_REASON});if(!p?.price||p.shopReady===false)return res.status(400).json({error:'This product is not available yet.'});if(!isShopProduct(p)&&!p.id.startsWith('deck:'))return res.status(410).json({error:'This offer has been retired. Visit the shop for card backs and credits.'});
  const price=await services.stripe.prices.retrieve(p.price);
  if(p.configured!==undefined&&!validShopPrice(env,p,price))return res.status(503).json({error:'Monthly shop price or allowance is not configured.'});
  const expectedAmounts={credits_10:299,credits_30:699,credits_80:1499,premium_monthly:1499};
  if(!stripeObjectMatchesMode(env,price)||!price.active||price.currency!=='usd'||(expectedAmounts[p.id]!==undefined&&price.unit_amount!==expectedAmounts[p.id]))return res.status(503).json({error:'Stripe price configuration does not match the published offer.'});
  if(p.kind==='subscription'?(price.recurring?.interval!=='month'||price.recurring?.interval_count!==1):Boolean(price.recurring))return res.status(503).json({error:'Stripe billing interval does not match the product.'});
  const a=await services.access(u.id);if(p.kind==='subscription'&&a.shopSubscriptions?.some(s=>s.sku===p.id))return res.status(409).json({error:'You already have this monthly option. Manage it in billing.'});if(p.id==='studio_unlock'&&(a.studioUnlockOwned||a.studioPassOwned)||p.id==='studio_pass'&&a.studioPassOwned||p.id.startsWith('pack_')&&a.ownedPacks?.includes(p.id.slice(5))||p.id==='premium_monthly'&&a.premium||p.id.startsWith('deck:')&&a.ownedDecks?.includes(p.id.slice(5)))return res.status(409).json({error:'You already own this product or have an active membership.'});
  const customer=await services.customer(u.id,u.email);if(p.configured!==undefined){for await(const sub of services.stripe.subscriptions.list({customer,status:'all',limit:100})){if(!stripeObjectMatchesMode(env,sub))throw Object.assign(new Error('Subscription billing mode mismatch.'),{status:503});if(!['canceled','incomplete_expired'].includes(sub.status)&&sub.items.data.some(item=>item.price.id===p.price))return res.status(409).json({error:'You already have this monthly option. Manage it in billing.'});}}if((await services.products()).filter(item=>item.price===p.price).length!==1)throw Object.assign(new Error('Each product must have its own Stripe Price ID.'),{status:503});const session=await services.stripe.checkout.sessions.create({customer,mode:p.kind,integration_identifier:'proxy_plane_shop_'+Array.from(randomBytes(8),b=>String.fromCharCode(97+b%26)).join(''),metadata:{product:p.id},client_reference_id:u.id,line_items:[{price:p.price,quantity:1}],success_url:origin+'/?checkout=success',cancel_url:origin+'/?checkout=cancel',...(p.kind==='subscription'?{subscription_data:{metadata:{user_id:u.id}}}:{payment_intent_data:{metadata:{user_id:u.id}}})},...(p.kind==='subscription'?[{idempotencyKey:`pp-subscription-${p.id}-${u.id}-${Math.floor(Date.now()/600000)}`}]:[]));res.json({url:session.url});
 }));
 app.post('/api/billing/portal',route(async(req,res)=>{if(billingMode(env)==='disabled')return res.status(403).json({error:'Billing is disabled for this environment.'});const u=await services.user(req);if(billingMode(env)==='live'&&(!services.billingReady||!await services.billingReady({fulfillment:true})))return res.status(503).json({error:'Billing is not configured.'});if(!services.stripe)return res.status(503).json({error:'Billing is not configured.'});const customer=await services.customer(u.id,u.email);res.json({url:(await services.stripe.billingPortal.sessions.create({customer,return_url:origin})).url})}));
 async function aiRequest(req,res,kind,work){
  const u=await services.user(req);if(env.BETA_MODE==='true'&&env.BETA_AI_ENABLED!=='true')return res.status(503).json({error:'AI generation is paused for this beta. Upload artwork or import card text to keep testing.'});if(env.BETA_MODE==='true'&&env.BETA_CLOUD_AI_ENABLED!=='true')return res.status(503).json({error:'Cloud AI generation is paused for this beta. On-device artwork and uploads remain available.'});if(!env.OPENAI_API_KEY)return res.status(503).json({error:'AI is not configured on the server.'});
  if(kind==='art'||kind==='resketch')cloudImageConfig(env);
  if(pending.has(u.id))return res.status(429).json({error:'An AI request is already running for your account.',...(req.body?.operationId?{operationId:req.body.operationId}:{})});
  const access=await services.access(u.id);const choices=kind==='art'||kind==='resketch'?3:0;if(kind==='resketch'&&!access.studio)return res.status(403).json({error:'Re-sketch requires Premium or Studio Pass.'});
  const cost=choices?1:(kind==='set'?Number(req.body?.count):1);
  pending.add(u.id);try{await sendAIJson(res,await recovery.run({owner:u.id,kind,body:req.body||{},cost,work:()=>work({choices}),before:()=>checkAISafety(env,req.body,fetcher),after:result=>checkAISafety(env,result,fetcher)}));}finally{pending.delete(u.id)}
 }
 app.get('/api/ai/operations',route(async(req,res)=>{const u=await services.user(req);await recovery.reconcile();await sendAIJson(res,{operations:await recovery.results(u.id)});}));
 app.get('/api/ai/operations/:operation',route(async(req,res)=>{const u=await services.user(req);await recovery.reconcile();const results=await recovery.results(u.id,req.params.operation);if(!results.length)return res.sendStatus(404);await sendAIJson(res,results[0]);}));
 app.post('/api/generate-art',route(async(req,res)=>{
  const {prompt,size='1024x1536'}=req.body||{};if(typeof prompt!=='string'||prompt.trim().length<5||prompt.length>4000||!['1024x1024','1024x1536','1536x1024'].includes(size))return res.status(400).json({error:'Use a 5–4,000 character prompt and a supported image size.'});
  await aiRequest(req,res,'art',({choices})=>generateCloudImages({env,prompt,size,choices,fetcher}));
 }));
 app.post('/api/ai/resketch',route(async(req,res)=>{const {prompt,source,size='1024x1536'}=req.body||{};if(typeof source==='string'&&source.length>aiReferenceLimit(env))return res.status(413).json({error:env.SERVERLESS_MODE==='true'?'Reference image is too large for cloud re-sketch. Use an image smaller than 3 MiB.':'Reference image is too large. Use an image smaller than 10 MiB.'});const match=typeof source==='string'&&source.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);if(!match||source.length>10*1024*1024||typeof prompt!=='string'||prompt.trim().length<5||prompt.length>4000||!['1024x1024','1024x1536','1536x1024'].includes(size))return res.status(400).json({error:'Provide a valid reference image and 5–4,000 characters of changes.'});await aiRequest(req,res,'resketch',({choices})=>generateCloudImages({env,prompt,size,source,choices,fetcher}))}));
 app.post('/api/ai/set',route(async(req,res)=>{const {prompt,count}=req.body||{};if(typeof prompt!=='string'||prompt.trim().length<5||prompt.length>4000||!Number.isInteger(count)||count<1||count>10)return res.status(400).json({error:'Enter a theme and choose 1–10 cards.'});await aiRequest(req,res,'set',async()=>validateSet(await structuredAI(env,`Create exactly ${count} connected cards with shared setting and lore. Include a distinct artPrompt for each. Theme: ${prompt}`,SET_SCHEMA,'card_set',fetcher),count));}));
 app.post('/api/ai/review',route(async(req,res)=>{const c=req.body?.card;if(!c||typeof c.rules!=='string'||JSON.stringify(c).length>12000)return res.status(400).json({error:'Choose a card with rules text (maximum 12,000 characters).'});await aiRequest(req,res,'review',async()=>{const d=await structuredAI(env,'Review this casual-play design for ambiguous wording and possible balance issues. Suggestions only; do not claim tournament legality. Card: '+JSON.stringify(c),REVIEW_SCHEMA,'card_review',fetcher);if(typeof d.summary!=='string'||!Array.isArray(d.issues)||typeof d.suggestedRules!=='string')throw new Error('Invalid review returned.');return d;});}));
 mountDeckStore(app,{services,env,route});
 if(env.SERVE_WEB==='true'){const webRoot=fileURLToPath(new URL('../dist/',import.meta.url));app.use(express.static(webRoot,{index:false}));app.get('*',(req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'API route not found.'});res.set('Cache-Control','no-cache').sendFile(path.join(webRoot,'index.html'));});}
 app.use((error,_req,res,_next)=>res.status(400).json({error:error.type==='entity.too.large'?'Request too large.':'Invalid request.'}));
 if(services.configured&&env.SERVERLESS_MODE!=='true'){const timer=setInterval(()=>recovery.reconcile().catch(()=>{}),60000);timer.unref();app.locals.stopAIRecovery=()=>clearInterval(timer);recovery.reconcile().catch(()=>{});}
 return app;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT||8787);createApp().listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`The Proxy Plane server: http://127.0.0.1:${port}`));}
