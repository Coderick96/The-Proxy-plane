import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadDeviceAsset} from '../src/deviceAiDownloads.js';
import {DEVICE_ASSETS,DEVICE_DOWNLOAD_BYTES,DEVICE_CACHE_NAME,checkDeviceSupport,clearDeviceModelCache} from '../src/deviceAiModel.js';
const data=new TextEncoder().encode('verified model fixture'),asset={id:'test',label:'Test model',url:'https://example.invalid/pinned-model',bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};
const entries=new Map();let calls=0,writes=0,deleted=0;
const cache={match:async url=>entries.has(url)?new Response(entries.get(url)):null,put:async(url,response)=>{writes++;entries.set(url,new Uint8Array(await response.arrayBuffer()))},delete:async url=>{deleted++;entries.delete(url)}};
const storage={open:async name=>{assert.equal(name,DEVICE_CACHE_NAME);return cache}};
const fetcher=async(url,options)=>{calls++;assert.equal(url,asset.url);assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');return new Response(data)};
assert.deepEqual(new Uint8Array(await loadDeviceAsset(asset,{fetcher,cacheStorage:storage})),data);assert.equal(calls,1);assert.equal(writes,1);
await loadDeviceAsset(asset,{fetcher,cacheStorage:storage});assert.equal(calls,1,'verified cache avoids external fetch');
entries.set(asset.url,new TextEncoder().encode('bad'));await assert.rejects(loadDeviceAsset(asset,{fetcher,cacheStorage:storage}),/integrity/);assert(deleted>0);await loadDeviceAsset(asset,{fetcher,cacheStorage:storage});assert.equal(calls,2);
await loadDeviceAsset(asset,{fetcher,cacheStorage:{open:async()=>({match:async()=>null,put:async()=>{throw new Error('QuotaExceeded')},delete:async()=>{}})}});
let signal,puts=0,canceled=false;
const endless=new Response(new ReadableStream({start(c){c.enqueue(Uint8Array.of(1,2));},cancel(){canceled=true}}));
const tiny={...asset,bytes:1};let timeout;
try{await assert.rejects(Promise.race([loadDeviceAsset(tiny,{fetcher:async(_url,options)=>{signal=options.signal;return endless},cacheStorage:{open:async()=>({match:async()=>null,put:async()=>puts++,delete:async()=>{}})}}),new Promise((_,reject)=>timeout=setTimeout(()=>reject(new Error('loader hung')),1000))]),/unexpected size/);}finally{clearTimeout(timeout)}
assert(signal.aborted);assert(canceled);assert.equal(puts,0,'unverified/oversized bytes never enter cache');
const progress=[];const big=new Uint8Array(1000).fill(7),bigAsset={...asset,bytes:1000,sha256:createHash('sha256').update(big).digest('hex')};
await loadDeviceAsset(bigAsset,{fetcher:async()=>new Response(new ReadableStream({start(c){for(const b of big)c.enqueue(Uint8Array.of(b));c.close()}})),cacheStorage:null,onProgress:p=>progress.push(p)});assert(progress.length<=101,'progress is throttled to integer percentages');assert.equal(progress.at(-1).loaded,1000);
assert.equal(DEVICE_ASSETS.length,5);assert.equal(DEVICE_DOWNLOAD_BYTES,1036345432);for(const a of DEVICE_ASSETS){assert.match(a.url,/a310400909a293a7a937a54854910ed06469192b/);assert.match(a.sha256,/^[a-f0-9]{64}$/);assert(a.bytes>0)}
assert.equal((await checkDeviceSupport({isSecureContext:false})).supported,false);assert.equal((await checkDeviceSupport({isSecureContext:true,Worker:class{},navigator:{}})).supported,false);
const adapter={features:new Set(['shader-f16']),limits:{maxStorageBufferBindingSize:268435456,maxBufferSize:268435456}};
const scope={isSecureContext:true,Worker:class{},navigator:{gpu:{requestAdapter:async()=>adapter}}};assert.equal((await checkDeviceSupport(scope)).supported,true);adapter.features.clear();assert.equal((await checkDeviceSupport(scope)).supported,false);
let cacheName;await clearDeviceModelCache({delete:async name=>{cacheName=name}});assert.equal(cacheName,DEVICE_CACHE_NAME);
console.log('PASS device downloads: SHA/size verification, immutable manifest, verified cache reuse, corruption eviction/retry, quota fallback, credential/referrer omission, unending oversize cancellation, bounded progress, GPU feature gates and isolated cache removal.');
