import {generateKeyPairSync} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
const dir=new URL('../.local-art-keys/',import.meta.url);
mkdirSync(dir,{recursive:true,mode:0o700});
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
writeFileSync(new URL('private.pem',dir),privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600,flag:'wx'});
writeFileSync(new URL('public.pem',dir),publicKey.export({type:'spki',format:'pem'}),{flag:'wx'});
console.log('Created .local-art-keys/private.pem (server only) and public.pem (distribute with renderer). Existing keys are never overwritten.');
