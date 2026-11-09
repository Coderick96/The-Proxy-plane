import {uuid as createUUID} from './uuid.js';
export async function api(client,path,body){
 if(body!==undefined&&['/api/generate-art','/api/ai/resketch','/api/ai/set','/api/ai/review'].includes(path)&&!body.operationId)body={...body,operationId:createUUID()};
 const operationId=body?.operationId;
 try{
  let {data}=client?await client.auth.getSession():{data:null};
  if(path==='/api/ai/resketch'&&body?.source){
   const identity=session=>session?.user?.id||session?.access_token||null;
   const startedAs=identity(data?.session);
   const {prepareAIReference}=await import('./aiReference.js');body={...body,source:await prepareAIReference(body.source)};
   const current=client?await client.auth.getSession():{data:null};
   if(identity(current.data?.session)!==startedAs)throw new Error('Your account changed while preparing the image. Please retry. No credits were charged.');
   data=current.data;
  }
  const response=await fetch(path,{method:body===undefined?'GET':'POST',headers:{...(data?.session?.access_token?{Authorization:'Bearer '+data.session.access_token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  let result;
  try{result=await response.json();}catch{
   const error=new Error(response.ok?'The server response was interrupted. Check recent AI requests before generating again.':'The app server is unavailable. Please retry.');error.status=response.status;throw error;
  }
  if(!result||typeof result!=='object')throw new Error('The server returned an invalid response. Please retry.');
  if(!response.ok){const error=new Error(result.error||'Request failed.');error.status=response.status;if(result.operationId)error.operationId=result.operationId;throw error;}return result;
 }catch(error){
  const failure=error instanceof Error?error:new Error('Request failed. Please retry.');
  if(operationId&&!failure.operationId)failure.operationId=operationId;
  throw failure;
 }
}
