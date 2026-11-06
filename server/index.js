import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {mountBeta} from './beta.js';
import {checkAISafety} from './aiSafety.js';
import {createServices,catalog} from './premium.js';
import {structuredAI,SET_SCHEMA,REVIEW_SCHEMA,validateSet} from './ai.js';
import {mountDeckStore} from './deckStore.js';
import {fetchDeck} from './deckImport.js';
import {PACKS,ownsPack} from '../src/premiumCatalog.js';
export function createApp({env=process.env,services=createServices(env),fetcher=fetch}={}){
 const app=express(),origin=env.CLIENT_ORIGIN||'http://127.0.0.1:5173',pending=new Set();
 app.use(cors({origin}));
 const route=fn=>async(req,res,next)=>{try{await fn(req,res,next)}catch(e){res.status(e.status||(/Could not find.*pp_|function.*pp_.*does not exist/i.test(e.message||'')?503:500)).json({error:/Could not find.*pp_|function.*pp_.*does not exist/i.test(e.message||'')?'Premium database setup is incomplete. See PREMIUM_SETUP.md.':e.message||'Server request failed.'})}};
 app.post('/api/billing/webhook',express.raw({type:'application/json',limit:'1mb'}),route(async(req,res)=>{
  if(!services.stripe||!env.STRIPE_WEBHOOK_SECRET)return res.status(503).json({error:'Billing webhook is not configured.'});
  let event;try{event=services.stripe.webhooks.constructEvent(req.body,req.headers['stripe-signature'],env.STRIPE_WEBHOOK_SECRET)}catch{return res.status(400).json({error:'Invalid webhook signature.'})}
  await services.webhook(event);res.json({received:true});
 }));
 app.use(express.json({limit:'12mb'}));
 app.get('/api/health',(_req,res)=>res.json({ok:true,aiConfigured:Boolean(env.OPENAI_API_KEY),accountsConfigured:services.configured,billingConfigured:Boolean(services.stripe&&env.STRIPE_WEBHOOK_SECRET)}));
 mountBeta(app,{env,services,route});
 const betaSalesOff=()=>env.BETA_MODE==='true'&&(env.BETA_TEST_BILLING!=='true'||!env.STRIPE_SECRET_KEY?.startsWith('sk_test_'));
 app.use(['/api/billing/checkout','/api/billing/portal'],(req,res,next)=>betaSalesOff()?res.status(403).json({error:'Purchases are disabled during the private beta.'}):next());
 const deckLimits=new Map();
 app.post('/api/decks/import',route(async(req,res)=>{const key=req.ip,now=Date.now();let limit=deckLimits.get(key);if(!limit||now-limit.start>60000){limit={start:now,count:0};if(deckLimits.size>5000)deckLimits.clear();deckLimits.set(key,limit)}if(++limit.count>10)return res.status(429).json({error:'Please wait a minute before importing another deck URL.'});if(typeof req.body?.url!=='string'||req.body.url.length>2000)return res.status(400).json({error:'Paste a supported public deck URL.'});try{res.json(await fetchDeck(req.body.url,{fetcher}))}catch(e){res.status(400).json({error:e.name==='TimeoutError'?'Deck site timed out. Try its text export instead.':e.message})}}));

 app.get('/api/premium/catalog',route(async(_req,res)=>{
  const products=await Promise.all((await services.products()).map(async p=>{if(betaSalesOff()||!services.stripe||!p.price||!env.STRIPE_WEBHOOK_SECRET)return {...p,price:undefined,available:false};const price=await services.stripe.prices.retrieve(p.price);return {...p,price:undefined,available:price.active,currency:price.currency,amount:price.unit_amount,interval:price.recurring?.interval};}));res.json({products,testMode:env.STRIPE_SECRET_KEY?.includes('_test_')||false});
 }));
 app.get('/api/premium/access',route(async(req,res)=>{const u=await services.user(req);res.json(await services.access(u.id))}));
 app.get('/api/premium/assets/:pack/:design',route(async(req,res)=>{const u=await services.user(req),a=await services.access(u.id);const p=PACKS.find(p=>p.id===req.params.pack);if(!p||!p.backs.includes(req.params.design))return res.sendStatus(404);if(!ownsPack(a,p.id))return res.status(403).json({error:'This design requires its pack or Premium.'});res.set('Cache-Control','private, no-store').json({image:'data:image/svg+xml;base64,'+(await readFile(new URL(`./assets/${p.id}-${req.params.design}.svg`,import.meta.url))).toString('base64')});}));
 app.post('/api/billing/checkout',route(async(req,res)=>{
  const u=await services.user(req);if(!services.stripe||!env.STRIPE_WEBHOOK_SECRET)return res.status(503).json({error:'Purchases are not configured yet.'});const p=(await services.products()).find(p=>p.id===req.body?.product);if(!p?.price)return res.status(400).json({error:'This product is not available yet.'});
  const price=await services.stripe.prices.retrieve(p.price);
  const expectedAmounts={credits_10:299,credits_30:699,credits_80:1499,premium_monthly:1499};
  if(!price.active||price.currency!=='usd'||(expectedAmounts[p.id]!==undefined&&price.unit_amount!==expectedAmounts[p.id]))return res.status(503).json({error:'Stripe price configuration does not match the published offer.'});
  if(p.kind==='subscription'?(price.recurring?.interval!=='month'||price.recurring?.interval_count!==1):Boolean(price.recurring))return res.status(503).json({error:'Stripe billing interval does not match the product.'});
  const a=await services.access(u.id);if(p.id==='studio_pass'&&a.studioPassOwned||p.id.startsWith('pack_')&&a.ownedPacks?.includes(p.id.slice(5))||p.id==='premium_monthly'&&a.premium||p.id.startsWith('deck:')&&a.ownedDecks?.includes(p.id.slice(5)))return res.status(409).json({error:'You already own this product or have an active membership.'});
  const customer=await services.customer(u.id,u.email);if((await services.products()).filter(item=>item.price===p.price).length!==1)throw Object.assign(new Error('Each product must have its own Stripe Price ID.'),{status:503});const session=await services.stripe.checkout.sessions.create({customer,mode:p.kind,metadata:{product:p.id},client_reference_id:u.id,line_items:[{price:p.price,quantity:1}],success_url:origin+'/?checkout=success',cancel_url:origin+'/?checkout=cancel',...(p.kind==='subscription'?{subscription_data:{metadata:{user_id:u.id}}}:{payment_intent_data:{metadata:{user_id:u.id}}})},...(p.kind==='subscription'?[{idempotencyKey:`pp-membership-${u.id}-${Math.floor(Date.now()/600000)}`}]:[]));res.json({url:session.url});
 }));
 app.post('/api/billing/portal',route(async(req,res)=>{const u=await services.user(req);if(!services.stripe)return res.status(503).json({error:'Billing is not configured.'});const customer=await services.customer(u.id,u.email);res.json({url:(await services.stripe.billingPortal.sessions.create({customer,return_url:origin})).url})}));
 async function aiRequest(req,res,kind,work){
  const u=await services.user(req);if(env.BETA_MODE==='true'&&env.BETA_AI_ENABLED!=='true')return res.status(503).json({error:'AI generation is paused for this beta. Upload artwork or import card text to keep testing.'});if(!env.OPENAI_API_KEY)return res.status(503).json({error:'AI is not configured on the server.'});
  if(pending.has(u.id))return res.status(429).json({error:'An AI request is already running for your account.'});
  const access=await services.access(u.id);const choices=kind==='art'||kind==='resketch'?3:0;if(kind==='resketch'&&!access.studio)return res.status(403).json({error:'Re-sketch requires Premium or Studio Pass.'});
  const cost=choices?1:(kind==='set'?Number(req.body?.count):1);
  const operation=randomUUID();pending.add(u.id);let charged=false;
  try{await checkAISafety(env,req.body,fetcher);await services.rpc('pp_spend_credits',{owner:u.id,operation,amount:cost});charged=true;const result=await work({choices});await checkAISafety(env,result,fetcher);res.json({...result,creditsSpent:cost})}
  catch(error){if(charged)await services.rpc('pp_refund_ai',{charge_id:operation});throw error}
  finally{pending.delete(u.id)}
 }
 app.post('/api/generate-art',route(async(req,res)=>{
  const {prompt,size='1024x1536'}=req.body||{};if(typeof prompt!=='string'||prompt.trim().length<5||prompt.length>4000||!['1024x1024','1024x1536','1536x1024'].includes(size))return res.status(400).json({error:'Use a 5–4,000 character prompt and a supported image size.'});
  await aiRequest(req,res,'art',async({choices})=>{const r=await fetcher('https://api.openai.com/v1/images/generations',{method:'POST',headers:{Authorization:'Bearer '+env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:env.OPENAI_IMAGE_MODEL||'gpt-image-1',prompt:'Original fantasy card illustration only. No child abuse or exploitation; no explicit pornography. No text, logo, watermark or frame. '+prompt,size,n:choices}),signal:AbortSignal.timeout(180000)});const d=await r.json();if(!r.ok||!Array.isArray(d.data)||d.data.length!==choices||d.data.some(i=>!i.b64_json))throw new Error(d.error?.message||'The image service did not return all choices. Credits were returned.');return {images:d.data.map(i=>'data:image/png;base64,'+i.b64_json)}});
 }));
 app.post('/api/ai/resketch',route(async(req,res)=>{const {prompt,source,size='1024x1536'}=req.body||{};const match=typeof source==='string'&&source.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);if(!match||source.length>10*1024*1024||typeof prompt!=='string'||prompt.trim().length<5||prompt.length>4000||!['1024x1024','1024x1536','1536x1024'].includes(size))return res.status(400).json({error:'Provide a valid reference image and 5–4,000 characters of changes.'});await aiRequest(req,res,'resketch',async({choices})=>{const form=new FormData();form.set('model',env.OPENAI_IMAGE_MODEL||'gpt-image-1');form.set('prompt','Re-sketch this fantasy illustration. Preserve its subject and composition unless the requested changes require otherwise. No child abuse or exploitation; no explicit pornography. No text or logos. Changes: '+prompt);form.set('n',String(choices));form.set('size',size);form.set('image[]',new Blob([Buffer.from(match[2],'base64')],{type:'image/'+match[1]}),'reference.'+match[1]);const r=await fetcher('https://api.openai.com/v1/images/edits',{method:'POST',headers:{Authorization:'Bearer '+env.OPENAI_API_KEY},body:form,signal:AbortSignal.timeout(180000)});const d=await r.json();if(!r.ok||!Array.isArray(d.data)||d.data.length!==choices||d.data.some(i=>!i.b64_json))throw new Error(d.error?.message||'Re-sketch did not return all choices. Credits were returned.');return {images:d.data.map(i=>'data:image/png;base64,'+i.b64_json)}})}));
 app.post('/api/ai/set',route(async(req,res)=>{const {prompt,count}=req.body||{};if(typeof prompt!=='string'||prompt.trim().length<5||prompt.length>4000||!Number.isInteger(count)||count<1||count>10)return res.status(400).json({error:'Enter a theme and choose 1–10 cards.'});await aiRequest(req,res,'set',async()=>validateSet(await structuredAI(env,`Create exactly ${count} connected cards with shared setting and lore. Include a distinct artPrompt for each. Theme: ${prompt}`,SET_SCHEMA,'card_set',fetcher),count));}));
 app.post('/api/ai/review',route(async(req,res)=>{const c=req.body?.card;if(!c||typeof c.rules!=='string'||JSON.stringify(c).length>12000)return res.status(400).json({error:'Choose a card with rules text (maximum 12,000 characters).'});await aiRequest(req,res,'review',async()=>{const d=await structuredAI(env,'Review this casual-play design for ambiguous wording and possible balance issues. Suggestions only; do not claim tournament legality. Card: '+JSON.stringify(c),REVIEW_SCHEMA,'card_review',fetcher);if(typeof d.summary!=='string'||!Array.isArray(d.issues)||typeof d.suggestedRules!=='string')throw new Error('Invalid review returned.');return d;});}));
 mountDeckStore(app,{services,env,route});
 if(env.SERVE_WEB==='true'){const webRoot=fileURLToPath(new URL('../dist/',import.meta.url));app.use(express.static(webRoot,{index:false}));app.get('*',(req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'API route not found.'});res.set('Cache-Control','no-cache').sendFile(path.join(webRoot,'index.html'));});}
 app.use((error,_req,res,_next)=>res.status(400).json({error:error.type==='entity.too.large'?'Request too large.':'Invalid request.'}));
 return app;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT||8787);createApp().listen(port,process.env.HOST||'127.0.0.1',()=>console.log(`The Proxy Plane server: http://127.0.0.1:${port}`));}
