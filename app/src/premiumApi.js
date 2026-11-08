export async function api(client,path,body){
 const {data}=client?await client.auth.getSession():{data:null};
 const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{...(data?.session?.access_token?{Authorization:'Bearer '+data.session.access_token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const result=await response.json().catch(()=>({error:'The app server is unavailable. Start START_THE_PROXY_PLANE_FULL.bat.'}));
 if(!response.ok)throw new Error(result.error||'Request failed.');return result;
}
