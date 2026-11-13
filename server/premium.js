import {createClient} from '@supabase/supabase-js';
import Stripe from 'stripe';
import {serverAccountKey} from './accountConfig.js';
import {PACKS,FREE_ACCESS} from '../src/premiumCatalog.js';
import {billingMode,billingAllowed,isTestStripeKey,stripeObjectMatchesMode,stripeEventMatchesMode} from './billingMode.js';
export {billingMode,billingAllowed,isTestStripeKey,testBillingAllowed} from './billingMode.js';
export function catalog(env){return [
 {id:'premium_monthly',name:'Premium membership',kind:'subscription',price:env.STRIPE_PRICE_PREMIUM_MONTHLY,description:'Custom backs, three AI image choices, re-sketch, member decks, Studio tools and expanded storage. 200 AI credits per paid month. Free accounts receive 10 starter credits once.'},
 {id:'studio_pass',name:'Studio Pass',kind:'payment',price:env.STRIPE_PRICE_STUDIO_PASS,description:'One-time Studio tools + the three launch packs. Free cloud limits; AI credits sold separately.'},
 ...PACKS.map(p=>({id:'pack_'+p.id,name:p.name,kind:'payment',price:env['STRIPE_PRICE_PACK_'+p.id.toUpperCase()],description:'Own this card-backing pack without a subscription.'})),
 ...[10,30,80].map(n=>({id:'credits_'+n,name:n+' AI credits',kind:'payment',price:env['STRIPE_PRICE_CREDITS_'+n],description:'One-time AI credit pack. Available without Premium; purchased credits carry forward.'}))
 ];}
export function createServices(env=process.env,overrides={}){
 const accountKey=serverAccountKey(env),configured=Boolean(env.SUPABASE_URL&&accountKey);
 const admin=overrides.admin||(configured?createClient(env.SUPABASE_URL,accountKey,{auth:{persistSession:false,autoRefreshToken:false}}):null);
 const stripe=overrides.stripe||(billingMode(env)!=='disabled'?new Stripe(env.STRIPE_SECRET_KEY):null);
 async function billingReady({fulfillment=false}={}){if((fulfillment?billingMode(env)==='disabled':!billingAllowed(env))||!stripe)return false;if(billingMode(env)!=='live')return true;const account=await stripe.accounts.retrieve();if(account.id!==env.STRIPE_EXPECTED_ACCOUNT_ID||!fulfillment&&account.charges_enabled!==true)throw Object.assign(new Error('Live billing account is not ready.'),{status:503});return true;}
 function verifyObject(object){if(!stripeObjectMatchesMode(env,object))throw Object.assign(new Error('Stripe object does not match the configured billing mode.'),{status:400});}
 const requireAdmin=()=>{if(!admin)throw Object.assign(new Error('Server account setup is incomplete. See PREMIUM_SETUP.md.'),{status:503});return admin};
 const rpc=async(name,args)=>{const {data,error}=await requireAdmin().rpc(name,args);if(error)throw error;return data};
 async function user(req){if(req.betaUser)return req.betaUser;const token=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];if(!token)throw Object.assign(new Error('Sign in to your Cardsmith account first.'),{status:401});const {data,error}=await requireAdmin().auth.getUser(token);if(error||!data.user)throw Object.assign(new Error('Your session expired. Sign in again.'),{status:401});if(env.BETA_MODE==='true'){const admission=await rpc('pp_beta_claim',{owner:data.user.id});if(!admission?.allowed)throw Object.assign(new Error(admission?.reason||'This account is not approved for the private beta.'),{status:403});}return data.user;}
 async function access(uid){const {data,error}=await requireAdmin().rpc('pp_access_for',{owner:uid});if(error)throw error;if(data?.policyVersion!==30)throw Object.assign(new Error('Run supabase/credits.sql after evolution.sql to activate one-time starter and monthly Premium credits.'),{status:503});return {...FREE_ACCESS,...data,owner:env.OWNER_USER_ID===uid};}
 async function deckProducts(){if(!admin)return [];const {data,error}=await admin.from('pp_deck_products').select('*').eq('published',true).order('created_at',{ascending:false});if(error){if(/does not exist|schema cache|Could not find/.test(error.message||''))return [];throw error;}return data||[];}
 async function products(){return [...catalog(env),...(await deckProducts()).map(d=>({id:'deck:'+d.id,name:d.title,description:d.description,kind:'payment',price:d.stripe_price||undefined}))]}
 async function customer(uid,email){const {data,error}=await requireAdmin().from('pp_customers').select('stripe_id').eq('user_id',uid).maybeSingle();if(error)throw error;if(data){if(billingMode(env)==='live'){const existing=await stripe.customers.retrieve(data.stripe_id);verifyObject(existing);if(existing.deleted)throw Object.assign(new Error('Billing customer is unavailable.'),{status:503});}return data.stripe_id;}const c=await stripe.customers.create({email,metadata:{user_id:uid}},{idempotencyKey:'pp-customer-'+uid});verifyObject(c);const {error:writeError}=await admin.from('pp_customers').upsert({user_id:uid,stripe_id:c.id});if(writeError)throw writeError;return c.id;}
 async function ownerFor(customerId){const {data,error}=await requireAdmin().from('pp_customers').select('user_id').eq('stripe_id',customerId).maybeSingle();if(error)throw error;return data?.user_id;}
 async function subscription(id){const sub=await stripe.subscriptions.retrieve(id);verifyObject(sub);const uid=await ownerFor(typeof sub.customer==='string'?sub.customer:sub.customer.id);if(!uid)return;const known=catalog(env).find(p=>p.id==='premium_monthly');const item=sub.items.data.find(i=>i.price.id===known.price);if(item)verifyObject(item.price);const end=item?.current_period_end||sub.current_period_end;await rpc('pp_sync_subscription',{owner:uid,source_id:sub.id,enabled:Boolean(item&&['active','trialing'].includes(sub.status)),expires:end?new Date(end*1000).toISOString():new Date().toISOString()});const {data:hold,error:holdError}=await admin.from('pp_subscription_holds').select('source').eq('source',sub.id).maybeSingle();if(holdError)throw holdError;return {sub,uid,item,blocked:Boolean(hold)};}
 async function paidSession(id){const session=await stripe.checkout.sessions.retrieve(id,{expand:['line_items']});verifyObject(session);if(session.mode==='subscription'){if(session.subscription)await subscription(session.subscription);return;}
  if(session.payment_status!=='paid')return;const uid=await ownerFor(typeof session.customer==='string'?session.customer:session.customer?.id);if(!uid)return;if(session.client_reference_id!==uid)throw new Error('Checkout account mismatch.');
  const lines=session.line_items?.data||[];if(lines.length!==1||lines[0].quantity!==1)throw new Error('Unexpected checkout contents.');verifyObject(lines[0].price);const product=(await products()).find(p=>p.kind==='payment'&&p.price===lines[0].price?.id);if(!product)throw new Error('Unknown checkout price.');
  if(session.payment_intent){const intent=await stripe.paymentIntents.retrieve(session.payment_intent,{expand:['latest_charge']});verifyObject(intent);const charge=intent.latest_charge;if(charge&&typeof charge!=='string')verifyObject(charge);if(charge&&typeof charge!=='string'&&(charge.refunded||charge.amount_refunded>0||charge.disputed))return;}
  await rpc('pp_apply_purchase',{owner:uid,receipt:session.id,sku:product.id});
 }
 async function webhook(event){if(!stripeEventMatchesMode(env,event))throw Object.assign(new Error(billingMode(env)==='live'?'Only Stripe live-mode webhook events are accepted.':'Only Stripe test-mode webhook events are accepted.'),{status:400});if(!await billingReady({fulfillment:true}))throw Object.assign(new Error('Billing is disabled.'),{status:503});const object=event.data.object;
  if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))await paidSession(object.id);
  else if(event.type.startsWith('customer.subscription.'))await subscription(object.id);
  else if(event.type==='invoice.paid'){
   const inv=await stripe.invoices.retrieve(object.id);verifyObject(inv);const id=inv.subscription||inv.parent?.subscription_details?.subscription;if(!id)return;
   const result=await subscription(typeof id==='string'?id:id.id);
   // Other applications may share the approved Stripe test account. Ignore their
   // invoices before comparing ownership; mapped customers still require a match.
   if(!result?.uid)return;
   if((typeof inv.customer==='string'?inv.customer:inv.customer?.id)!==(typeof result?.sub?.customer==='string'?result.sub.customer:result?.sub?.customer?.id))throw new Error('Invoice customer mismatch.');
   if(!result?.uid||result.blocked||!result.item||result.sub.status!=='active'||inv.status!=='paid'||inv.amount_paid<=0||!['subscription_create','subscription_cycle'].includes(inv.billing_reason))return;
   if(result.item.price.recurring?.interval!=='month'||result.item.price.recurring?.interval_count!==1)return;
   const lines=[];if(inv.lines?.has_more){for await(const line of stripe.invoices.listLineItems(inv.id,{limit:100}))lines.push(line);}else lines.push(...inv.lines?.data||[]);
   const premiumLines=lines.filter(l=>(l.pricing?.price_details?.price||l.price?.id)===env.STRIPE_PRICE_PREMIUM_MONTHLY&&l.amount>0&&l.quantity===1&&l.parent?.subscription_item_details?.proration!==true&&l.proration!==true);
   if(premiumLines.length!==1)throw new Error('Expected exactly one paid monthly Premium invoice line.');const line=premiumLines[0];
   const start=line.period?.start,end=line.period?.end;if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)throw new Error('Invalid Premium invoice period.');
   await rpc('pp_grant_monthly',{owner:result.uid,invoice_id:inv.id,subscription_id:result.sub.id,starts:new Date(start*1000).toISOString(),ends:new Date(end*1000).toISOString()});
  }
  else if(['charge.refunded','charge.dispute.created'].includes(event.type)){const charge=event.type==='charge.refunded'?await stripe.charges.retrieve(object.id):await stripe.charges.retrieve(typeof object.charge==='string'?object.charge:object.charge.id);verifyObject(charge);if(!charge.payment_intent)return;const sessions=await stripe.checkout.sessions.list({payment_intent:charge.payment_intent,limit:100});for(const session of sessions.data){verifyObject(session);await rpc('pp_revoke_purchase',{receipt:session.id});}const payments=await stripe.invoicePayments.list({payment:{type:'payment_intent',payment_intent:charge.payment_intent},limit:100});for(const payment of payments.data){const inv=await stripe.invoices.retrieve(typeof payment.invoice==='string'?payment.invoice:payment.invoice.id);verifyObject(inv);const subId=inv.subscription||inv.parent?.subscription_details?.subscription;if(subId){const sub=await stripe.subscriptions.retrieve(typeof subId==='string'?subId:subId.id);verifyObject(sub);const uid=await ownerFor(sub.customer);if(uid)await rpc('pp_hold_subscription',{owner:uid,source_id:sub.id});await rpc('pp_revoke_credit',{original_reference:'invoice:'+inv.id});await rpc('pp_revoke_monthly',{invoice_id:inv.id});}}}
 }
 return {admin,stripe,user,access,rpc,customer,webhook,billingReady,configured,products,deckProducts};
}
