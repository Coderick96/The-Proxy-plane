-- Apply after ai_recovery.sql. Optional private-beta capacity bound; no rows deleted.
-- Logical accounting: result JSON bytes, 20 MiB per outstanding result, and 4 KiB
-- metadata per operation. This is not a physical PostgreSQL/WAL/disk-size estimate.
-- Existing over-budget results remain readable/replayable; only new work is refused.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create or replace function public.pp_ai_reserve(owner uuid,operation uuid,kind text,fingerprint text,amount integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 r public.pp_ai_operations;
 global_bytes bigint;
 owner_bytes bigint;
 pending_bytes constant bigint:=20*1024*1024;
 metadata_bytes constant bigint:=4096;
begin
 -- Keep the account-first order used by spend/refund/completion/reconciliation.
 perform 1 from auth.users where id=owner for update;
 if not found then raise exception 'Unknown account'; end if;
 -- A transaction-wide global guard serializes capacity admission across owners.
 -- Completion/failure/reconciliation only reduce this conservative reservation,
 -- so they do not acquire this lock or introduce a reverse locking dependency.
 perform pg_catalog.pg_advisory_xact_lock(707080,1129464144);
 select * into r from public.pp_ai_operations o where o.operation=pp_ai_reserve.operation;
 if found then
  if r.user_id<>owner or r.kind<>kind or r.fingerprint<>fingerprint or r.cost<>amount then raise exception 'Operation identifier already used'; end if;
  return jsonb_build_object('state',r.state,'result',r.result,'fresh',false);
 end if;
 if exists(select 1 from public.pp_ai_operations o where o.user_id=owner and o.state in ('running','refund_pending')) then raise exception 'An AI operation is already running or awaiting recovery'; end if;
 select coalesce(sum(metadata_bytes+case when o.state in ('running','refund_pending') then pending_bytes else coalesce(octet_length(o.result::text),0)::bigint end),0),
        coalesce(sum(metadata_bytes+case when o.state in ('running','refund_pending') then pending_bytes else coalesce(octet_length(o.result::text),0)::bigint end) filter(where o.user_id=owner),0)
 into global_bytes,owner_bytes
 from public.pp_ai_operations o;
 if owner_bytes+pending_bytes+metadata_bytes>64*1024*1024 then
  raise exception 'AI recovery capacity for this account is full. No credit was charged. Contact the beta owner; existing results remain available.';
 end if;
 if global_bytes+pending_bytes+metadata_bytes>128*1024*1024 then
  raise exception 'AI recovery capacity for this beta is full. No credit was charged. Contact the beta owner; existing results remain available.';
 end if;
 insert into public.pp_ai_operations(operation,user_id,kind,fingerprint,cost) values(operation,owner,kind,fingerprint,amount);
 perform public.pp_spend_credits(owner,operation,amount);
 return jsonb_build_object('state','running','fresh',true);
end $$;
revoke all on function public.pp_ai_reserve(uuid,uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.pp_ai_reserve(uuid,uuid,text,text,integer) to service_role;
commit;
-- Rollback: restore only pp_ai_reserve's reviewed definition from ai_recovery.sql,
-- retaining its service-only grants. Do not drop operations, credit rows or results.
