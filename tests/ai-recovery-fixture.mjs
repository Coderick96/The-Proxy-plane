// HTTP provider fixtures model the durable RPC boundary; SQL semantics are tested in ai-recovery-db.mjs.
export function durableAIFixture(rpc){const operations=new Map();return async(name,args)=>{
 if(name==='pp_ai_reconcile')return 0;
 if(name==='pp_ai_reserve'){const old=operations.get(args.operation);if(old)return {fresh:false,...old};await rpc('pp_spend_credits',{owner:args.owner,operation:args.operation,amount:args.amount});operations.set(args.operation,{state:'running'});return {fresh:true,state:'running'};}
 if(name==='pp_ai_complete'){operations.set(args.operation,{state:'completed',result:args.payload});return args.payload;}
 if(name==='pp_ai_fail'){await rpc('pp_refund_ai',{charge_id:args.operation});operations.set(args.operation,{state:'refunded'});return null;}
 return rpc(name,args);
};}
