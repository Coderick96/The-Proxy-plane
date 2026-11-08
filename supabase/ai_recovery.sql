-- Apply after credits.sql. Only newly reserved operations participate in recovery.
-- Required before enabling AI: server fails closed if these RPCs are absent.
-- API startup/60-second reconciliation runs with configured accounts; AI requests and
-- recovery reads also reconcile. Run the API continuously or schedule the service-only
-- pp_ai_reconcile(20) RPC at least once per minute for idle crash recovery.
-- Leases expire after 10 minutes; refund outages retry after 1 minute.
-- Completed private results have no automatic TTL: retain until account deletion
-- (cascade) pending a separately approved retention policy. Results capped at 20 MiB.
-- No historical charge is modified. Results contain private artwork/card content.
create table if not exists public.pp_ai_operations (
 operation uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('art','resketch','set','review')),
 fingerprint text not null, cost integer not null check(cost between 1 and 10),
 state text not null default 'running' check(state in ('running','refund_pending','refunded','completed')),
 lease_until timestamptz not null default (now()+interval '10 minutes'),
 result jsonb, created_at timestamptz not null default now(),
 check ((state='completed')=(result is not null))
);
alter table public.pp_ai_operations enable row level security;
revoke all on public.pp_ai_operations from public,anon,authenticated;
grant select,insert,update on public.pp_ai_operations to service_role;
create index if not exists pp_ai_operations_recovery on public.pp_ai_operations(lease_until) where state in ('running','refund_pending');
create index if not exists pp_ai_operations_owner on public.pp_ai_operations(user_id,created_at desc);
create or replace function public.pp_ai_reserve(owner uuid,operation uuid,kind text,fingerprint text,amount integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.pp_ai_operations; begin
 perform 1 from auth.users where id=owner for update;
 if not found then raise exception 'Unknown account'; end if;
 select * into r from public.pp_ai_operations o where o.operation=pp_ai_reserve.operation;
 if found then
  if r.user_id<>owner or r.kind<>kind or r.fingerprint<>fingerprint or r.cost<>amount then raise exception 'Operation identifier already used'; end if;
  return jsonb_build_object('state',r.state,'result',r.result,'fresh',false);
 end if;
 if exists(select 1 from public.pp_ai_operations o where o.user_id=owner and o.state in ('running','refund_pending')) then raise exception 'An AI operation is already running or awaiting recovery'; end if;
 insert into public.pp_ai_operations(operation,user_id,kind,fingerprint,cost) values(operation,owner,kind,fingerprint,amount);
 perform public.pp_spend_credits(owner,operation,amount);
 return jsonb_build_object('state','running','fresh',true);
end $$;
create or replace function public.pp_ai_complete(owner uuid,operation uuid,payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.pp_ai_operations; begin
 perform 1 from auth.users where id=owner for update;
 select * into r from public.pp_ai_operations o where o.operation=pp_ai_complete.operation and o.user_id=owner for update;
 if not found then raise exception 'Operation not found'; end if;
 if r.state='completed' then return r.result; end if;
 if r.state<>'running' or r.lease_until<=clock_timestamp() then raise exception 'Operation lease expired; recovery will return credits'; end if;
 if payload is null or jsonb_typeof(payload)<>'object' then raise exception 'Invalid result'; end if;
 if octet_length(payload::text)>20*1024*1024 then raise exception 'AI result exceeds the 20 MiB recovery limit'; end if;
 update public.pp_ai_operations o set state='completed',result=payload where o.operation=pp_ai_complete.operation;
 return payload;
end $$;
create or replace function public.pp_ai_fail(owner uuid,operation uuid)
returns void language plpgsql security definer set search_path='' as $$ begin
 perform 1 from auth.users where id=owner for update;
 update public.pp_ai_operations o set state='refund_pending',lease_until=clock_timestamp() where o.operation=pp_ai_fail.operation and o.user_id=owner and state='running';
end $$;
create or replace function public.pp_ai_reconcile(batch_size integer default 20)
returns integer language plpgsql security definer set search_path='' as $$
declare r record; n integer:=0; begin
 for r in select o.operation,o.user_id from public.pp_ai_operations o where o.state in ('running','refund_pending') and o.lease_until<=clock_timestamp() order by o.lease_until limit least(greatest(batch_size,1),100) loop
  -- Same lock order as credit functions: account, then operation/charge.
  perform 1 from auth.users where id=r.user_id for update;
  perform 1 from public.pp_ai_operations o where o.operation=r.operation and (o.state in ('running','refund_pending') and o.lease_until<=clock_timestamp()) for update;
  if found then
   begin
    perform public.pp_refund_ai(r.operation);
    update public.pp_ai_operations set state='refunded' where operation=r.operation;
    n:=n+1;
   exception when others then
    update public.pp_ai_operations set state='refund_pending',lease_until=clock_timestamp()+interval '1 minute' where operation=r.operation;
   end;
  end if;
 end loop; return n;
end $$;
create or replace function public.pp_ai_results(owner uuid,operation uuid default null)
returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('operationId',o.operation,'kind',o.kind,'state',o.state,'hasResult',o.result is not null,'creditsSpent',case when o.state='completed' then o.cost else 0 end,'createdAt',o.created_at) || case when pp_ai_results.operation is not null then jsonb_build_object('result',o.result) else '{}'::jsonb end order by o.created_at desc),'[]'::jsonb)
 from (select * from public.pp_ai_operations o where o.user_id=owner and (pp_ai_results.operation is null or o.operation=pp_ai_results.operation) order by created_at desc limit 20) o
$$;
revoke all on function public.pp_ai_reserve(uuid,uuid,text,text,integer),public.pp_ai_complete(uuid,uuid,jsonb),public.pp_ai_fail(uuid,uuid),public.pp_ai_reconcile(integer),public.pp_ai_results(uuid,uuid) from public,anon,authenticated;
grant execute on function public.pp_ai_reserve(uuid,uuid,text,text,integer),public.pp_ai_complete(uuid,uuid,jsonb),public.pp_ai_fail(uuid,uuid),public.pp_ai_reconcile(integer),public.pp_ai_results(uuid,uuid) to service_role;
