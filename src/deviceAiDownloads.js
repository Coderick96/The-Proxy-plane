import {createSHA256} from 'hash-wasm';
import {DEVICE_CACHE_NAME} from './deviceAiModel.js';
export async function readVerifiedAsset(response,asset,onProgress=()=>{}){
 if(!response?.ok||!response.body?.getReader)throw new Error('The model download is unavailable. Check your connection and retry.');
 const hash=await createSHA256();hash.init();const bytes=new Uint8Array(asset.bytes),reader=response.body.getReader();let offset=0,lastPercent=-1;
 try{
  for(;;){const {done,value}=await reader.read();if(done)break;if(offset+value.length>asset.bytes)throw new Error('The model download has an unexpected size.');bytes.set(value,offset);hash.update(value);offset+=value.length;const percent=Math.floor(offset/asset.bytes*100);if(percent!==lastPercent){lastPercent=percent;onProgress({stage:'download',asset:asset.id,loaded:offset,total:asset.bytes,message:`${asset.label} · ${percent}%`});}}
  if(offset!==asset.bytes||hash.digest('hex')!==asset.sha256)throw new Error('The model download failed its integrity check. Clear the downloaded model and retry.');
  return bytes.buffer;
 }catch(error){reader.cancel().catch(()=>{});throw error;}finally{reader.releaseLock();}
}
export async function loadDeviceAsset(asset,{onProgress=()=>{},fetcher=globalThis.fetch,cacheStorage=globalThis.caches}={}){
 let cache=null;try{cache=await cacheStorage?.open(DEVICE_CACHE_NAME);}catch{/* Model generation can run without persistent cache. */}
 let cached=null;try{cached=await cache?.match(asset.url);}catch{/* Retry from the network. */}
 const abort=new AbortController();
 const response=cached||await fetcher(asset.url,{credentials:'omit',referrerPolicy:'no-referrer',cache:'default',signal:abort.signal});
 try{
  const buffer=await readVerifiedAsset(response,asset,onProgress);
  if(!cached&&cache){
   // Only verified bytes enter the cache. Bounded views avoid a second graph-size copy or an unbounded tee.
   let offset=0;
   const body=new ReadableStream({pull(controller){if(offset>=buffer.byteLength){controller.close();return;}const size=Math.min(65536,buffer.byteLength-offset);controller.enqueue(new Uint8Array(buffer,offset,size));offset+=size;}});
   try{await cache.put(asset.url,new Response(body,{headers:{'Content-Type':'application/octet-stream'}}));}catch{/* Quota failures do not prevent an uncached run. */}
  }
  return buffer;
 }catch(error){abort.abort();try{await cache?.delete(asset.url);}catch{}throw error;}
}
