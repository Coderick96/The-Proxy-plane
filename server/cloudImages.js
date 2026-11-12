export const DEFAULT_IMAGE_MODEL='gpt-image-2.5-flare-2026-09-08';
const MODELS=new Set(['gpt-image-2.5-flare','gpt-image-2.5-flare-2026-09-08','gpt-image-2.5-sunburst','gpt-image-2.5-sunburst-2026-09-08']);
const QUALITIES=new Set(['low','medium','high']);
const SIZES=new Set(['1024x1024','1024x1536','1536x1024']);
export function cloudImageConfig(env){
 const model=env.OPENAI_IMAGE_MODEL||DEFAULT_IMAGE_MODEL,quality=env.OPENAI_IMAGE_QUALITY||'medium';
 if(!MODELS.has(model)||!QUALITIES.has(quality))throw Object.assign(new Error('Cloud image model or quality is not configured for this beta.'),{status:503});
 return {model,quality};
}
function usageDetails(value){
 if(!value||typeof value!=='object')return undefined;
 const result={};
 for(const key of ['input_tokens','output_tokens','total_tokens'])if(Number.isSafeInteger(value[key])&&value[key]>=0)result[key]=value[key];
 for(const key of ['input_tokens_details','output_tokens_details']){
  const parts={};for(const field of ['text_tokens','image_tokens','cached_tokens'])if(Number.isSafeInteger(value[key]?.[field])&&value[key][field]>=0)parts[field]=value[key][field];
  if(Object.keys(parts).length)result[key]=parts;
 }
 return Object.keys(result).length?result:undefined;
}
export async function generateCloudImages({env,prompt,size='1024x1536',source=null,choices=3,fetcher=fetch}){
 const {model,quality}=cloudImageConfig(env);
 if(choices!==3||typeof prompt!=='string'||prompt.trim().length<5||prompt.length>4000||!SIZES.has(size))throw Object.assign(new Error('Use a valid artwork prompt, supported size and three choices.'),{status:400});
 if(!env.OPENAI_API_KEY)throw Object.assign(new Error('AI is not configured on the server.'),{status:503});
 let body,url,headers={Authorization:'Bearer '+env.OPENAI_API_KEY};
 if(source!==null){
  const match=typeof source==='string'&&source.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if(!match||source.length>10*1024*1024)throw Object.assign(new Error('Provide a valid reference image.'),{status:400});
  body=new FormData();body.set('model',model);body.set('quality',quality);body.set('output_format','png');body.set('n',String(choices));body.set('size',size);
  body.set('prompt','Re-sketch this fantasy illustration. Preserve its subject and composition unless the requested changes require otherwise. No child abuse or exploitation; no explicit pornography. No text or logos. Changes: '+prompt);
  body.set('image[]',new Blob([Buffer.from(match[2],'base64')],{type:'image/'+match[1]}),'reference.'+match[1]);
  url='https://api.openai.com/v1/images/edits';
 }else{
  headers['Content-Type']='application/json';url='https://api.openai.com/v1/images/generations';
  body=JSON.stringify({model,quality,output_format:'png',prompt:'Original fantasy card illustration only. No child abuse or exploitation; no explicit pornography. No text, logo, watermark or frame. '+prompt,size,n:choices});
 }
 let response;try{response=await fetcher(url,{method:'POST',headers,body,signal:AbortSignal.timeout(180000)})}catch{throw new Error('The image service could not be reached. Check recent AI requests for credit recovery.')}

 let data;try{data=await response.json()}catch{throw new Error('The image service response was interrupted. Check recent AI requests for credit recovery.')}
 if(!response.ok||!Array.isArray(data?.data)||data.data.length!==choices||data.data.some(image=>typeof image?.b64_json!=='string'||!image.b64_json||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(image.b64_json)||Buffer.from(image.b64_json,'base64').toString('base64')!==image.b64_json))throw new Error('The image service did not return all choices. Check recent AI requests for credit recovery.');
 const usage=usageDetails(data.usage);
 return {images:data.data.map(image=>'data:image/png;base64,'+image.b64_json),model,quality,...(usage?{usage}:{})};
}
