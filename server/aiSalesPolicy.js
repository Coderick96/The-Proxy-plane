// Local model downloads/inference do not use a paid provider. Selling AI credits
// requires a separate recorded quality/device acceptance release, not just keys.
export const aiCreditOffer=product=>/^credits_(10|30|80|monthly)$/.test(product?.id||'');
export const aiSalesPaused=(env,product)=>aiCreditOffer(product)&&env.DEVICE_AI_PAID_RELEASE_VERIFIED!=='true';
export const AI_SALES_PAUSED_REASON='AI credit purchases are paused while built-in image quality and device compatibility are verified.';
