import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createDeviceTokenizer} from '../src/deviceAiTokenizer.js';
const minimal={'<|startoftext|>':49406,'<|endoftext|>':49407,'a</w>':320};
const simple=createDeviceTokenizer(minimal,'#version: 0.2\n');
assert.deepEqual(Array.from(simple('A').slice(0,3)),[49406n,320n,49407n]);
assert.equal(simple('A').length,77);assert(simple('a').slice(2).every(x=>x===49407n));
assert.throws(()=>simple(''),/prompt/);assert.throws(()=>simple('a'.repeat(1001)),/prompt/);
assert.throws(()=>createDeviceTokenizer({},''),/incomplete/);
const dir=process.env.DEVICE_AI_TOKENIZER_DIR||new URL('./fixtures/device-ai-tokenizer/',import.meta.url).pathname;
if(existsSync(dir+'/vocab.json')&&existsSync(dir+'/merges.txt')){
 const vocab=JSON.parse(readFileSync(dir+'/vocab.json','utf8')),merges=readFileSync(dir+'/merges.txt','utf8');
 const encode=createDeviceTokenizer(vocab,merges);
 // Oracle sequences are from Hugging Face's official CLIP tokenizer fixtures.
 const vectors=[
  ['a photo of a cat',[49406,320,1125,539,320,2368,49407]],
  ['Hello World',[49406,3306,1002,49407]],
  ['How are you doing?',[49406,829,631,592,1960,286,49407]],
  ["You should've done this",[49406,592,1535,1200,1700,589,49407]],
  ['UNwantéd,running',[49406,569,18356,3459,323,267,2761,49407]],
  ['生活的真谛是',[49406,33375,162,112,119,163,248,226,41570,164,108,249,42891,363,49407]],
  ['This\n\nis\na\ntest.',[49406,589,533,320,1628,269,49407]]
 ];
 for(const [text,expected] of vectors){const ids=Array.from(encode(text),Number);assert.deepEqual(ids.slice(0,expected.length),expected,text);assert(ids.slice(expected.length).every(x=>x===49407));}
 const long=encode('dragon '.repeat(140));assert.equal(long.length,77);assert.equal(long[0],49406n);assert.equal(long[76],49407n);
 assert.deepEqual(encode('café'),encode('cafe\u0301'),'canonical Unicode normalization');
 console.log('PASS real pinned CLIP vocabulary/merges against seven official tokenizer oracles, Unicode NFC, truncation and EOS padding.');
}else{
 console.log('NOT RUN real CLIP oracle vectors: set DEVICE_AI_TOKENIZER_DIR to downloaded pinned vocab.json/merges.txt. Synthetic tokenizer boundary tests PASS.');
}
