import {createHash,randomUUID} from 'node:crypto';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
export function createAIRecovery(services){
 const reconcile=async()=>services.rpc('pp_ai_reconcile',{batch_size:20});
 return {reconcile,
  async results(owner,operation=null){if(operation&&!uuid.test(operation))throw Object.assign(new Error('Invalid operation identifier.'),{status:400});return services.rpc('pp_ai_results',{owner,operation});},
  async run({owner,kind,body,cost,work,before,after}){
   const operation=body.operationId||randomUUID();if(!uuid.test(operation))throw Object.assign(new Error('Use a UUID operationId.'),{status:400});
   const {operationId:_,...input}=body;
   let reserved=false;
   try{
    await reconcile();await before();
    const reservation=await services.rpc('pp_ai_reserve',{owner,operation,kind,fingerprint:createHash('sha256').update(JSON.stringify(stable(input))).digest('hex'),amount:cost});
    if(!reservation||typeof reservation.fresh!=='boolean')throw new Error('AI recovery database setup is incomplete. Apply supabase/ai_recovery.sql.');
    if(!reservation.fresh){if(reservation.state==='completed')return {...reservation.result,operationId:operation};throw Object.assign(new Error(reservation.state==='running'?'This operation is still running. Recover it using its operationId.':'This operation was refunded or is awaiting refund. Start a new operation.'),{status:409});}
    reserved=true;const result=await work();await after(result);
    const payload={...result,creditsSpent:cost,operationId:operation};
    const saved=await services.rpc('pp_ai_complete',{owner,operation,payload});
    if(!saved||typeof saved!=='object'||saved.operationId!==operation)throw new Error('AI result confirmation is unavailable. Recover this operation before starting another.');
    return saved;
   }catch(error){
    if(reserved){try{await services.rpc('pp_ai_fail',{owner,operation});await reconcile();}catch{/* Persisted running lease is the recovery fallback. */}}
    error.operationId=operation;throw error;
   }
  }
 };
}
