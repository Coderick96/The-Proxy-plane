import {CARD_WIDTH_IN,CARD_HEIGHT_IN} from './printSettings.js';
export function printMemoryLimits(scope=globalThis){
 const nav=scope.navigator||{};
 const ios=/iPad|iPhone|iPod/.test(nav.userAgent||'')||nav.platform==='MacIntel'&&nav.maxTouchPoints>1;
 const constrained=ios||Number.isFinite(nav.deviceMemory)&&nav.deviceMemory<=4;
 return {constrained,maxRasterPixels:constrained?4_000_000:16_000_000,maxRasterBytes:constrained?24*1024*1024:192*1024*1024};
}
export function checkPrintRasterBudget(settings,limits=printMemoryLimits()){
 const dpi=[300,600,1200].includes(settings.dpi)?settings.dpi:300;
 const width=Math.ceil((CARD_WIDTH_IN+2*(settings.bleed||0))*dpi),height=Math.ceil((CARD_HEIGHT_IN+2*(settings.bleed||0))*dpi);
 if(width*height>limits.maxRasterPixels)throw new Error(`${dpi} DPI needs too much memory on this device. Choose 600 or 300 DPI. Your cards are unchanged.`);
 return {dpi,width,height};
}
