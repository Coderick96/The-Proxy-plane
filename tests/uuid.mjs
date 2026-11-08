import assert from 'node:assert/strict';
import {uuid} from '../src/uuid.js';
const native=uuid({randomUUID:()=> 'native-id'});assert.equal(native,'native-id');
const ids=new Set();for(let i=0;i<100;i++){const id=uuid({getRandomValues:values=>crypto.getRandomValues(values)});assert.match(id,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);ids.add(id)}assert.equal(ids.size,100);
assert.throws(()=>uuid({}),/Secure random/);
console.log('PASS secure UUID native path and getRandomValues v4 fallback for local-network/mobile browsers; unavailable entropy fails closed.');
