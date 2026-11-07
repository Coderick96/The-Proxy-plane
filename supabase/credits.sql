-- 2.6.0: after evolution.sql. 10 one-time starter credits; 200 per paid month.
begin;
create table if not exists public.pp_allowances(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,
 reference text not null unique,kind text not null check(kind in('starter','premium')),subscription text,
 period_start timestamptz not null default now(),expires_at timestamptz,
 amount integer not null,remaining integer not null,revoked boolean not null default false,
 check((kind='starter' and amount=10 and subscription is null and expires_at is null)or(kind='premium' and amount=200 and subscription is not null and expires_at>period_start)),
 check(remaining between 0 and amount),unique(user_id,subscription,period_start)
);
create table if not exists public.pp_allowance_spends(
 operation uuid not null references public.pp_ai_charges(operation)on delete cascade,
 allowance uuid not null references public.pp_allowances(id)on delete cascade,
 amount integer not null check(amount>0),primary key(operation,allowance)
);
alter table public.pp_allowances enable row level security;alter table public.pp_allowance_spends enable row level security;
revoke all on public.pp_allowances,public.pp_allowance_spends from anon,authenticated;
grant select on public.pp_allowances to authenticated;grant all on public.pp_allowances,public.pp_allowance_spends to service_role;
drop policy if exists pp_allowances_own on public.pp_allowances;
create policy pp_allowances_own on public.pp_allowances for select to authenticated using(user_id=auth.uid());
create or replace function public.pp_allowance_active(owner uuid,subscription_id text)returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.pp_grants where user_id=owner and source=subscription_id and feature='premium' and active and expires_at>now())and not exists(select 1 from public.pp_subscription_holds where source=subscription_id);
$$;
revoke all on function public.pp_allowance_active(uuid,text)from public,anon,authenticated;
grant execute on function public.pp_allowance_active(uuid,text)to service_role;
-- Preserve this helper name for existing pp_access_for; daily credits are removed.
create or replace function public.pp_daily_status(owner uuid)returns jsonb language sql stable security definer set search_path='' as $$
 with balances as(
 select case when exists(select 1 from auth.users where id=owner)then coalesce((select remaining from public.pp_allowances where reference='starter:'||owner::text),10)else 0 end starter,
 coalesce((select sum(remaining) from public.pp_allowances where user_id=owner and kind='premium' and not revoked and period_start<=now() and expires_at>now() and public.pp_allowance_active(owner,subscription)),0)::integer monthly,
 greatest(0,coalesce((select sum(amount)from public.pp_credits where user_id=owner),0))::integer wallet,
 (select min(expires_at)from public.pp_allowances where user_id=owner and kind='premium' and not revoked and period_start<=now() and expires_at>now() and public.pp_allowance_active(owner,subscription)) ends
 )select jsonb_build_object('policyVersion',30,'starterRemaining',starter,'starterLimit',10,'monthlyRemaining',monthly,'monthlyLimit',200,'monthlyEndsAt',ends,'walletCredits',wallet,'credits',starter+monthly+wallet,'dailyRemaining',0,'dailyLimit',0,'dailyResetsAt',null)from balances;
$$;
create or replace function public.pp_grant_monthly(owner uuid,invoice_id text,subscription_id text,starts timestamptz,ends timestamptz)returns void language plpgsql security definer set search_path='' as $$
 begin
 if invoice_id!~'^in_[A-Za-z0-9_]+' or subscription_id!~'^sub_[A-Za-z0-9_]+' or ends<starts+interval '27 days' or ends>starts+interval '35 days' or starts is null or ends is null then raise exception 'Invalid monthly billing period';end if;
 perform 1 from auth.users where id=owner for update;if not found then raise exception 'Account not found';end if;
 if not public.pp_allowance_active(owner,subscription_id)then return;end if;
 if exists(select 1 from public.pp_subscription_holds where source=subscription_id)then return;end if;
 if exists(select 1 from public.pp_allowances where reference='invoice:'||invoice_id or(user_id=owner and subscription=subscription_id and period_start=starts))then return;end if;
 if exists(select 1 from public.pp_allowances where user_id=owner and kind='premium' and not revoked and period_start<ends and expires_at>starts)then raise exception 'Premium periods must not overlap';end if;
 insert into public.pp_allowances(user_id,reference,kind,subscription,period_start,expires_at,amount,remaining)values(owner,'invoice:'||invoice_id,'premium',subscription_id,starts,ends,200,200)on conflict do nothing;
 end;$$;
create or replace function public.pp_revoke_monthly(invoice_id text)returns void language sql security definer set search_path='' as $$update public.pp_allowances set revoked=true where reference='invoice:'||invoice_id;$$;
create or replace function public.pp_spend_credits(owner uuid,operation uuid,amount integer)returns void language plpgsql security definer set search_path='' as $$
 declare wallet integer;available integer;needed integer:=amount;take integer;p record;
 begin
 if amount<=0 or amount>100 then raise exception 'Invalid credit amount';end if;
 perform 1 from auth.users where id=owner for update;if not found then raise exception 'Account not found';end if;
 if exists(select 1 from public.pp_ai_charges c where c.operation=pp_spend_credits.operation)or exists(select 1 from public.pp_credits where reference='spend:'||operation::text)then raise exception 'Request already processed';end if;
 insert into public.pp_allowances(user_id,reference,kind,amount,remaining)values(owner,'starter:'||owner::text,'starter',10,10)on conflict do nothing;
 select greatest(0,coalesce(sum(c.amount),0))into wallet from public.pp_credits c where c.user_id=owner;
 select coalesce(sum(remaining),0)into available from public.pp_allowances where user_id=owner and not revoked and period_start<=now() and (kind='starter' or(expires_at>now() and public.pp_allowance_active(owner,subscription)));
 if amount>available+wallet then raise exception 'No AI credits left. Starter credits are one-time; Premium includes 200 per paid month, or purchase additional credits.';end if;
 insert into public.pp_ai_charges(operation,user_id,day,daily_spent,purchased_spent)values(operation,owner,(now()at time zone 'UTC')::date,0,greatest(0,amount-available));
 -- Expiring monthly allowance first, then non-expiring starter, then purchased wallet.
 for p in select * from public.pp_allowances where user_id=owner and not revoked and period_start<=now() and (kind='starter' or(expires_at>now() and public.pp_allowance_active(owner,subscription)))order by expires_at nulls last,id for update loop
  take:=least(needed,p.remaining);if take>0 then update public.pp_allowances set remaining=remaining-take where id=p.id;insert into public.pp_allowance_spends(operation,allowance,amount)values(operation,p.id,take);needed:=needed-take;end if;exit when needed=0;
 end loop;
 if needed>0 then insert into public.pp_credits(user_id,reference,amount)values(owner,'spend:'||operation::text,-needed);end if;
 end;$$;
create or replace function public.pp_refund_ai(charge_id uuid)returns void language plpgsql security definer set search_path='' as $$
 declare c public.pp_ai_charges;r record;begin
 select * into c from public.pp_ai_charges where operation=charge_id;if not found then return;end if;
 perform 1 from auth.users where id=c.user_id for update;
 select * into c from public.pp_ai_charges where operation=charge_id for update;if c.refunded then return;end if;
 for r in select * from public.pp_allowance_spends where operation=charge_id loop update public.pp_allowances set remaining=least(amount,remaining+r.amount)where id=r.allowance;end loop;
 -- Legacy in-flight daily reservations are restored to their old day, never into a new starter/monthly pool.
 if c.daily_spent>0 then update public.pp_daily_usage set spent=greatest(0,spent-c.daily_spent)where user_id=c.user_id and day=c.day;end if;
 if c.purchased_spent>0 then insert into public.pp_credits(user_id,reference,amount)values(c.user_id,'refund:'||charge_id::text,c.purchased_spent)on conflict do nothing;end if;
 update public.pp_ai_charges set refunded=true where operation=charge_id;
 end;$$;
revoke all on function public.pp_grant_monthly(uuid,text,text,timestamptz,timestamptz),public.pp_revoke_monthly(text)from public,anon,authenticated;
grant execute on function public.pp_grant_monthly(uuid,text,text,timestamptz,timestamptz),public.pp_revoke_monthly(text)to service_role;
commit;
