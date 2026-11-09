import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';

// Leave room for the JSON envelope below Vercel's 4.5 MB inbound limit.
export const SERVERLESS_AI_REFERENCE_LIMIT=3*1024*1024;
export function aiReferenceLimit(env){return env.SERVERLESS_MODE==='true'?SERVERLESS_AI_REFERENCE_LIMIT:10*1024*1024;}

export async function sendAIJson(res,value){
 // Serialize before sending headers, so serialization failures remain normal JSON errors.
 const json=JSON.stringify(value);
 if(json===undefined)throw new TypeError('AI response must be JSON serializable.');
 const bytes=Buffer.from(json);
 res.set('Content-Type','application/json; charset=utf-8');
 res.set('Cache-Control','private, no-store');
 res.set('X-Content-Type-Options','nosniff');
 res.removeHeader('Content-Length');
 res.flushHeaders();
 // Streaming bypasses the buffered response-size cap. pipeline handles backpressure
 // and disconnects; persisted AI results remain available if delivery is interrupted.
 function* chunks(){for(let i=0;i<bytes.length;i+=64*1024)yield bytes.subarray(i,i+64*1024);}
 await pipeline(Readable.from(chunks()),res);
}
