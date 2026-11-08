import {generateLocalArt} from './localArt.js';
async function request(path,body,token){
 const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const result=await response.json().catch(()=>({error:'The app server is unavailable. Start START_THE_PROXY_PLANE_FULL.bat.'}));
 if(!response.ok)throw new Error(result.error||'Request failed.');return result;
}
export async function api(client,path,body){
 const {data}=client?await client.auth.getSession():{data:null};
 const token=data?.session?.access_token;
 if(path==='/api/generate-art'||path==='/api/ai/resketch'){
  const configResponse=await fetch('/api/local-art/config',{headers:token?{Authorization:'Bearer '+token}:{},cache:'no-store'});
  if(!configResponse.ok)throw new Error('Artwork configuration is unavailable. Try again shortly.');
  const config=await configResponse.json();
  if(config.enabled){
   if(!token)throw new Error('Sign in to your Cardsmith account first.');
   const owner=data.session.user.id;
   return generateLocalArt(async(route,payload)=>{
    const {data:current}=await client.auth.getSession();
    if(current?.session?.user?.id!==owner)throw new Error('Your account changed. Start artwork again from the current account. No new credit was charged.');
    return request(route,payload,current.session.access_token);
   },body,owner);
  }
 }
 return request(path,body,token);
}
