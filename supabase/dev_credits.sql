-- Optional private-beta owner refills. Apply only to the isolated development database.
-- The server authenticates OWNER_USER_ID and its configured code before invoking this service-only RPC.
begin;
create table if not exists public.pp_dev_credit_topoffs(
 operation uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 amount integer not null check(amount between 1 and 10000),
 created_at timestamptz not null default now()
);
alter table public.pp_dev_credit_topoffs enable row level security;
revoke all on table public.pp_dev_credit_topoffs from public,anon,authenticated;
grant select,insert on table public.pp_dev_credit_topoffs to service_role;
create or replace function public.pp_dev_topoff(owner uuid,operation uuid,amount integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare existing public.pp_dev_credit_topoffs;
begin
 if amount is null or amount<1 or amount>10000 then raise exception 'Invalid development credit amount';end if;
 perform 1 from auth.users where id=owner for update;
 if not found then raise exception 'Account not found';end if;
 -- Serialize the global idempotency key across owners, after the common account lock.
 perform pg_advisory_xact_lock(hashtextextended(operation::text,0));
 select * into existing from public.pp_dev_credit_topoffs t where t.operation=pp_dev_topoff.operation;
 if found then
  if existing.user_id<>owner or existing.amount<>amount then raise exception 'Refill request conflicts with an existing operation';end if;
  return jsonb_build_object('operationId',operation,'added',existing.amount,'idempotent',true);
 end if;
 insert into public.pp_dev_credit_topoffs(operation,user_id,amount)values(operation,owner,amount);
 insert into public.pp_credits(user_id,reference,amount)values(owner,'dev-topoff:'||operation::text,amount);
 return jsonb_build_object('operationId',operation,'added',amount,'idempotent',false);
end;$$;
revoke all on function public.pp_dev_topoff(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.pp_dev_topoff(uuid,uuid,integer) to service_role;
commit;
