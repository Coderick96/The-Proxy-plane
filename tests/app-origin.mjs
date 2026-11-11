import assert from 'node:assert/strict';
import {appOrigin} from '../server/appOrigin.js';
assert.equal(appOrigin({}),'http://127.0.0.1:5173');
const config={CLIENT_ORIGIN:'https://example.com',VERCEL_URL:'project-preview.vercel.app'};
assert.equal(appOrigin({...config,VERCEL_ENV:'preview'}),'https://project-preview.vercel.app');
assert.equal(appOrigin({...config,VERCEL_ENV:'production'}),'https://example.com');
for(const value of ['attacker.example','good.vercel.app@evil.example','good.vercel.app/path','https://good.vercel.app','good.vercel.app?next=evil','good.vercel.app\n'])assert.equal(appOrigin({...config,VERCEL_URL:value,VERCEL_ENV:'preview'}),'https://example.com');
console.log('PASS Preview checkout/portal origin stays on the hosting-supplied beta deployment; production and local configuration preserved, malformed hosts rejected.');
