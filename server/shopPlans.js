const positive=(value,max)=>typeof value==='string'&&/^[1-9][0-9]*$/.test(value)&&Number.isSafeInteger(Number(value))&&Number(value)<=max?Number(value):undefined;
export function shopPlans(env){
 const enabled=env.SHOP_MONTHLY_ENABLED==='true';
 const credits=positive(env.SHOP_MONTHLY_CREDITS,1000),cards=positive(env.SHOP_STORAGE_CARDS,1000000),bytes=positive(env.SHOP_STORAGE_BYTES,1099511627776);
 return [
  {id:'credits_monthly',name:'Monthly credit top-off',kind:'subscription',price:env.STRIPE_PRICE_CREDITS_MONTHLY,expectedAmount:positive(env.SHOP_CREDITS_MONTHLY_CENTS,1000000),credits,description:credits?`${credits} credits added after each paid monthly invoice. Unused top-off credits carry forward.`:'A monthly credit top-off. Allowance and price are being configured.'},
  {id:'storage_monthly',name:'Monthly card storage',kind:'subscription',price:env.STRIPE_PRICE_STORAGE_MONTHLY,expectedAmount:positive(env.SHOP_STORAGE_MONTHLY_CENTS,1000000),cards,bytes,description:cards&&bytes?`Store up to ${cards.toLocaleString('en-US')} cloud cards and ${(bytes/1073741824).toLocaleString('en-US')} GiB while subscribed. Saved cards remain readable after cancellation.`:'Extra cloud cards and artwork storage. Capacity and price are being configured.'}
 ].map(p=>({...p,configured:Boolean(enabled&&p.price&&p.expectedAmount&&(p.id==='credits_monthly'?credits:cards>=1000&&bytes>=104857600)),unavailableReason:enabled?'This monthly offer needs its price and allowance configured.':'Monthly offers are being configured.'}));
}
export function validShopPrice(env,product,price){return product.configured&&price.active&&price.currency==='usd'&&price.unit_amount===product.expectedAmount&&price.recurring?.interval==='month'&&price.recurring?.interval_count===1;}
