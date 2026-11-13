// Explicit environment selection prevents a copied live key from activating Preview billing.
export const isTestStripeKey=key=>typeof key==='string'&&/^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(key);
export const isLiveStripeKey=key=>typeof key==='string'&&/^(?:sk|rk)_live_[A-Za-z0-9]+$/.test(key);
export function billingMode(env){
 if(env.BILLING_MODE==='live')return env.VERCEL_ENV==='production'&&env.BILLING_LIVE_DATA_ISOLATED==='true'&&/^acct_[A-Za-z0-9]+$/.test(env.STRIPE_EXPECTED_ACCOUNT_ID||'')&&isLiveStripeKey(env.STRIPE_SECRET_KEY)?'live':'disabled';
 if(env.BILLING_MODE&&env.BILLING_MODE!=='test')return 'disabled';
 return isTestStripeKey(env.STRIPE_SECRET_KEY)&&(env.BETA_MODE!=='true'||env.BETA_TEST_BILLING==='true')?'test':'disabled';
}
export const billingAllowed=env=>billingMode(env)==='test'||billingMode(env)==='live'&&env.LIVE_PAYMENTS_ENABLED==='true';
export const testBillingAllowed=env=>billingMode(env)==='test';
// Test fixtures predating mode metadata remain compatible; live objects must explicitly be live.
export const stripeObjectMatchesMode=(env,object)=>billingMode(env)==='live'?object?.livemode===true:billingMode(env)==='test'&&object?.livemode!==true;
export const stripeEventMatchesMode=(env,event)=>billingMode(env)==='live'?event?.livemode===true:billingMode(env)==='test'&&event?.livemode===false;
