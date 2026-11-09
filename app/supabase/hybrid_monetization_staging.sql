-- Apply only after staging validation; do not execute on production without approval.
-- Existing starter credits are preserved; new accounts receive 10 after the credits.sql
-- allowance function is updated. Existing 15-credit accounts are not retroactively debited.
create or replace function public.pp_apply_purchase(owner uuid,receipt text,sku text) returns void language plpgsql security definer set search_path='' as $$
begin
 if sku not in('studio_pass','pack_celestial','pack_gothic','pack_dragon','credits_10','credits_30','credits_80') and not(sku~'^deck:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and exists(select 1 from public.pp_deck_products where id=substring(sku from 6)::uuid and published))then raise exception 'Unknown product';end if;
 perform 1 from auth.users where id=owner for update;
 insert into public.pp_receipts(id,user_id,sku) values(receipt,owner,sku) on conflict do nothing;
 if not found then return;end if;
 if sku in('credits_10','credits_30','credits_80') then
  insert into public.pp_credits(user_id,reference,amount) values(owner,'purchase:'||receipt,substring(sku from 9)::integer) on conflict do nothing;
 else
  insert into public.pp_grants(user_id,source,feature) values(owner,receipt,case when sku='studio_pass' then 'studio' else sku end) on conflict do nothing;
 end if;
end;$$;
create or replace function public.pp_revoke_purchase(receipt text) returns void language plpgsql security definer set search_path='' as $$
declare r public.pp_receipts;begin
 select * into r from public.pp_receipts where id=receipt for update;
 if not found or r.revoked then return;end if;
 update public.pp_receipts set revoked=true where id=receipt;
 update public.pp_grants set active=false where source=receipt;
 if r.sku in('credits_10','credits_30','credits_80','credits_100') then
  insert into public.pp_credits(user_id,reference,amount) values(r.user_id,'revoke:'||receipt,-substring(r.sku from 9)::integer) on conflict do nothing;
 end if;
end;$$;
revoke all on function public.pp_apply_purchase(uuid,text,text) from public,anon,authenticated;
revoke all on function public.pp_revoke_purchase(text) from public,anon,authenticated;
grant execute on function public.pp_apply_purchase(uuid,text,text) to service_role;
grant execute on function public.pp_revoke_purchase(text) to service_role;
