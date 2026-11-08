import {uuid as createUUID} from './uuid.js';
export async function api(client,path,body){
 if(body!==undefined&&['/api/generate-art','/api/ai/resketch','/api/ai/set','/api/ai/review'].includes(path)&&!body.operationId)body={...body,operationId:createUUID()};
 const operationId=body?.operationId;
 try{
  const {data}=client?await client.auth.getSession():{data:null};
  const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{...(data?.session?.access_token?{Authorization:'Bearer '+data.session.access_token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const result=await response.json().catch(()=>({error:'The app server is unavailable. Start START_THE_PROXY_PLANE_FULL.bat.'}));
  if(!response.ok){const error=new Error(result.error||'Request failed.');error.status=response.status;if(result.operationId)error.operationId=result.operationId;throw error;}return result;
 }catch(error){
  const failure=error instanceof Error?error:new Error('Request failed. Please retry.');
  if(operationId&&!failure.operationId)failure.operationId=operationId;
  throw failure;
 }
}
