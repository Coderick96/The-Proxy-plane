// New shop sales are separate from legacy entitlements and webhook fulfillment.
export const SHOP_PRODUCT_IDS=new Set(['studio_unlock','pack_celestial','pack_gothic','pack_dragon','credits_10','credits_30','credits_80','credits_monthly','storage_monthly']);
export const isShopProduct=product=>SHOP_PRODUCT_IDS.has(product?.id);
