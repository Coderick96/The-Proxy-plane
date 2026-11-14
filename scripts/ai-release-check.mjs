// Explicit release-time probe. Never log keys, provider payloads or generated content.
import {pathToFileURL} from 'node:url';
import {cloudImageConfig} from '../server/cloudImages.js';
import {classifyCloudFailure} from '../server/aiVerification.js';
export async function checkAIRelease(env,fetcher=fetch){
 if(!env.OPENAI_API_KEY)return {ok:false,code:'KEY_MISSING'};
 let config;try{config=cloudImageConfig(env)}catch{return {ok:false,code:'INVALID_MODEL_CONFIGURATION'}}
 try{
  const headers={Authorization:'Bearer '+env.OPENAI_API_KEY};
  const image=await fetcher('https://api.openai.com/v1/models/'+encodeURIComponent(config.model),{headers,signal:AbortSignal.timeout(20000)});
  if(!image.ok){const body=await image.json();return {ok:false,stage:'image_model',...classifyCloudFailure(image.status,body)}}
  const response=await fetcher('https://api.openai.com/v1/responses',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({model:env.OPENAI_SAFETY_MODEL||'gpt-4.1-mini',store:false,input:'Reply with OK.',max_output_tokens:16}),signal:AbortSignal.timeout(45000)});
  const body=await response.json();
  if(!response.ok)return {ok:false,stage:'inference',...classifyCloudFailure(response.status,body)};
  const text=(body.output||[]).flatMap(x=>x.content||[]).some(x=>x.type==='output_text'&&typeof x.text==='string'&&x.text.length>0);
  return body.status==='completed'&&text?{ok:true,imageModelReachable:true,textInferenceTested:true,imageGenerationTested:false}:{ok:false,stage:'inference',code:'INCOMPLETE_RESPONSE'};
 }catch{return {ok:false,code:'PROVIDER_TRANSPORT_ERROR'}}
}
if(process.env.AI_RELEASE_CHECK==='true'&&process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log('PROXY_PLANE_AI_RELEASE_CHECK '+JSON.stringify(await checkAIRelease(process.env)));
