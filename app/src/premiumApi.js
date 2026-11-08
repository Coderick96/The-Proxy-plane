import {generateLocalArt} from './localArt.js';
export async function api(client,path,body){
 const {data}=client?await client.auth.getSession():{data:null};
 const token=data?.session?.access_token;
 if(path==='/api/generate-art'||path==='/api/ai/resketch'){
  const configResponse=await fetch('/api/local-art/config');
  if(!configResponse.ok)throw new Error('Artwork configuration is unavailable. Try again shortly.');
  const config=await configResponse.json();
  if(config.enabled){
   if(!token)throw new Error('Sign in to your Cardsmith account first.');
   return generateLocalArt((route,payload)=>api(client,route,payload),body,data.session.user.id);
  }
 }
 const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{...(data?.session?.access_token?{Authorization:'Bearer '+data.session.access_token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const result=await response.json().catch(()=>({error:'The app server is unavailable. Start START_THE_PROXY_PLANE_FULL.bat.'}));
 if(!response.ok)throw new Error(result.error||'Request failed.');return result;
}
