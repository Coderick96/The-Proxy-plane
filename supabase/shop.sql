-- Run after evolution.sql and credits.sql. Independent shop subscriptions.
-- No existing purchase, credit balance, card or grant is deleted or reset.
begin;
create table if not exists public.pp_shop_subscriptions(
 source text primary key, user_id uuid not null references auth.users(id) on delete cascade,
 sku text not null check(sku in('credits_monthly','storage_monthly')),
 enabled boolean not null default false, paid_until timestamptz,
 card_limit integer not null default 0 check(card_limit between 0 and 1000000),
 storage_bytes bigint not null default 0 check(storage_bytes between 0 and 1099511627776)
);
create table if not exists public.pp_shop_invoices(
 invoice text primary key, user_id uuid not null references auth.users(id) on delete cascade,
 source text not null references public.pp_shop_subscriptions(source),
 sku text not null check(sku in('credits_monthly','storage_monthly')),
 starts timestamptz not null, ends timestamptz not null,
 unique(source,starts),check(ends>starts)
);
create index if not exists pp_shop_subscriptions_owner on public.pp_shop_subscriptions(user_id);
alter table public.pp_shop_subscriptions enable row level security;
alter table public.pp_shop_invoices enable row level security;
revoke all on public.pp_shop_subscriptions,public.pp_shop_invoices from public,anon,authenticated;
grant all on public.pp_shop_subscriptions,public.pp_shop_invoices to service_role;

create or replace function public.pp_shop_sync_subscription(owner uuid,source_id text,sku text,enabled boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if owner is null or source_id !~ '^sub_[A-Za-z0-9_]+' then raise exception 'Invalid subscription';end if;
 perform 1 from auth.users where id=owner for update;if not found then raise exception 'Account not found';end if;
 if exists(select 1 from public.pp_shop_subscriptions where source=source_id and user_id<>owner)then raise exception 'Subscription owner mismatch';end if;
 if sku is null then update public.pp_shop_subscriptions set enabled=false where source=source_id and user_id=owner;return;end if;
 if sku not in('credits_monthly','storage_monthly')then raise exception 'Unknown monthly shop option';end if;
 if exists(select 1 from public.pp_shop_subscriptions s where s.source=source_id and s.sku<>pp_shop_sync_subscription.sku)then raise exception 'Subscription option mismatch';end if;
 insert into public.pp_shop_subscriptions(source,user_id,sku,enabled)values(source_id,owner,sku,enabled)
 on conflict(source)do update set enabled=excluded.enabled;
end;$$;

create or replace function public.pp_shop_paid_invoice(owner uuid,invoice_id text,source_id text,sku text,starts timestamptz,ends timestamptz,credit_amount integer,card_limit integer,storage_bytes bigint)
returns void language plpgsql security definer set search_path='' as $$
declare previous public.pp_shop_invoices;
begin
 if owner is null or invoice_id !~ '^in_[A-Za-z0-9_]+' or source_id !~ '^sub_[A-Za-z0-9_]+' or starts is null or ends is null or ends<starts+interval '27 days' or ends>starts+interval '35 days' then raise exception 'Invalid monthly invoice';end if;
 if sku='credits_monthly' then
  if credit_amount is null or credit_amount not between 1 and 1000 or card_limit<>0 or storage_bytes<>0 then raise exception 'Invalid top-off allowance';end if;
 elsif sku='storage_monthly' then
  if credit_amount<>0 or card_limit is null or card_limit not between 1000 and 1000000 or storage_bytes is null or storage_bytes not between 104857600 and 1099511627776 then raise exception 'Invalid storage allowance';end if;
 else raise exception 'Unknown monthly option';end if;
 perform 1 from auth.users where id=owner for update;if not found then raise exception 'Account not found';end if;
 if exists(select 1 from public.pp_shop_subscriptions s where s.source=source_id and s.user_id<>owner)then raise exception 'Subscription owner mismatch';end if;
 if not exists(select 1 from public.pp_shop_subscriptions s where s.source=source_id and s.user_id=owner and s.sku=pp_shop_paid_invoice.sku and s.enabled)or exists(select 1 from public.pp_subscription_holds where source=source_id)then return;end if;
 select * into previous from public.pp_shop_invoices where invoice=invoice_id;
 if found then
  if previous.user_id<>owner or previous.source<>source_id or previous.sku<>sku or previous.starts<>starts or previous.ends<>ends then raise exception 'Invoice identity mismatch';end if;
  return;
 end if;
 insert into public.pp_shop_invoices(invoice,user_id,source,sku,starts,ends)values(invoice_id,owner,source_id,sku,starts,ends)on conflict do nothing;
 if not found then return;end if;
 if sku='credits_monthly' then perform public.pp_credit_grant(owner,'invoice:'||invoice_id,credit_amount);end if;
 update public.pp_shop_subscriptions s set paid_until=ends,card_limit=pp_shop_paid_invoice.card_limit,storage_bytes=pp_shop_paid_invoice.storage_bytes
 where s.source=source_id and(s.paid_until is null or s.paid_until<ends);
end;$$;

create or replace function public.pp_shop_card_limit(owner uuid)returns integer language sql stable security definer set search_path='' as $$
 select greatest(case when public.pp_has_feature(owner,'premium')then 10000 else 1000 end,coalesce((select max(s.card_limit)from public.pp_shop_subscriptions s where s.user_id=owner and s.sku='storage_monthly' and s.enabled and s.paid_until>now()and not exists(select 1 from public.pp_subscription_holds h where h.source=s.source)),0));
$$;
create or replace function public.pp_shop_storage_limit(owner uuid)returns bigint language sql stable security definer set search_path='' as $$
 select greatest(case when public.pp_has_feature(owner,'premium')then 1073741824 else 104857600 end,coalesce((select max(s.storage_bytes)from public.pp_shop_subscriptions s where s.user_id=owner and s.sku='storage_monthly' and s.enabled and s.paid_until>now()and not exists(select 1 from public.pp_subscription_holds h where h.source=s.source)),0));
$$;
revoke all on function public.pp_shop_sync_subscription(uuid,text,text,boolean),public.pp_shop_paid_invoice(uuid,text,text,text,timestamptz,timestamptz,integer,integer,bigint),public.pp_shop_card_limit(uuid),public.pp_shop_storage_limit(uuid)from public,anon,authenticated;
grant execute on function public.pp_shop_sync_subscription(uuid,text,text,boolean),public.pp_shop_paid_invoice(uuid,text,text,text,timestamptz,timestamptz,integer,integer,bigint),public.pp_shop_card_limit(uuid),public.pp_shop_storage_limit(uuid)to service_role;

create or replace function public.enforce_proxy_kingdom_free_limit() returns trigger language plpgsql security definer set search_path='' as $$
declare maximum integer;begin
 perform 1 from auth.users where id=new.user_id for update;
 if tg_op='UPDATE' and new.user_id<>old.user_id then raise exception 'Project ownership cannot change';end if;
 maximum:=public.pp_shop_card_limit(new.user_id);
 if not exists(select 1 from public.proxy_kingdom_projects where id=new.id and user_id=new.user_id) and (select count(*) from public.proxy_kingdom_projects where user_id=new.user_id)>=maximum then raise exception 'Account card limit reached: %',maximum;end if;
 if octet_length(new.project_json::text)>2097152 then raise exception 'Card data too large. Keep artwork in private source storage.';end if;
 return new;
end;$$;

create or replace function public.pp_save_version() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.project_json is distinct from new.project_json and public.pp_has_feature(new.user_id,'studio') and public.pp_usage_bytes(new.user_id)+octet_length(old.project_json::text)<=(public.pp_shop_storage_limit(new.user_id)) then
  insert into public.pp_versions(project_id,user_id,project_json) values(old.id,old.user_id,old.project_json);
  delete from public.pp_versions where id in(select id from public.pp_versions where project_id=old.id order by created_at desc,id desc offset 20);
 end if;return new;
end;$$;

create or replace function public.pp_storage_fits(bucket text,object_name text,object_meta jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare v_owner uuid;used bigint;maximum bigint;begin
 v_owner:=(select auth.uid());if v_owner is null then return false;end if;
 if bucket not in('proxy-kingdom-art','proxy-kingdom-community') then return false;end if;
 if split_part(object_name,'/',1)<>v_owner::text then return false;end if;
 perform 1 from auth.users where id=v_owner for update;
 maximum:=public.pp_shop_storage_limit(v_owner);
 select coalesce(sum(coalesce((o.metadata->>'size')::bigint,0)),0) into used from storage.objects o where o.bucket_id in('proxy-kingdom-art','proxy-kingdom-community') and split_part(o.name,'/',1)=v_owner::text and not(o.bucket_id=bucket and o.name=object_name);
 return public.pp_usage_bytes(v_owner)-coalesce((select coalesce((metadata->>'size')::bigint,0) from storage.objects where bucket_id=bucket and name=object_name),0)+coalesce((object_meta->>'size')::bigint,0)<=maximum;
end;$$;

create or replace function public.pp_document_quota() returns trigger language plpgsql security definer set search_path='' as $$
declare maximum bigint;before_size bigint:=0;after_size bigint;extra bigint:=0;begin
 perform 1 from auth.users where id=new.user_id for update;
 maximum:=public.pp_shop_storage_limit(new.user_id);
 if tg_table_name='pp_templates' then
  if tg_op='INSERT' and (select count(*) from public.pp_templates where user_id=new.user_id)>=100 then raise exception 'Template limit reached: 100';end if;
  if tg_op='UPDATE' then before_size:=octet_length(old.style::text);end if;after_size:=octet_length(new.style::text);
 else
  if tg_op='UPDATE' then before_size:=octet_length(old.project_json::text);if old.project_json is distinct from new.project_json and public.pp_has_feature(new.user_id,'studio') then extra:=before_size;end if;end if;
  after_size:=octet_length(new.project_json::text);if public.pp_usage_bytes(new.user_id)-before_size+after_size+extra>maximum then extra:=0;end if;
 end if;
 -- Grandfather over-quota accounts: allow changes that do not grow their usage.
 if after_size+extra>before_size and public.pp_usage_bytes(new.user_id)-before_size+after_size+extra>maximum then raise exception 'Cloud storage quota reached. Remove unused data or upgrade.';end if;
 return new;
end;$$;

create or replace function public.pp_access_for(owner uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('studioUnlockOwned',exists(select 1 from public.pp_grants where user_id=owner and feature='studio_unlock' and active and expires_at is null),'studioPassOwned',exists(select 1 from public.pp_grants where user_id=owner and feature='studio' and active and expires_at is null),'ownedPacks',coalesce((select jsonb_agg(x) from unnest(array['celestial','gothic','dragon']) x where exists(select 1 from public.pp_grants g where g.user_id=owner and g.active and g.expires_at is null and g.feature in('studio','pack_'||x))),'[]'::jsonb),'premium',public.pp_has_feature(owner,'premium'),'studio',public.pp_has_feature(owner,'studio'),'packs',coalesce((select jsonb_agg(x) from unnest(array['celestial','gothic','dragon']) x where public.pp_has_feature(owner,'pack_'||x)),'[]'::jsonb),'storageUsedBytes',public.pp_usage_bytes(owner),'cardsUsed',(select count(*) from public.proxy_kingdom_projects where user_id=owner),'credits',coalesce((select sum(amount) from public.pp_credits where user_id=owner),0),'cardLimit',public.pp_shop_card_limit(owner),'storageBytes',public.pp_shop_storage_limit(owner)) || jsonb_build_object('shopSubscriptions',coalesce((select jsonb_agg(jsonb_build_object('sku',s.sku,'paidUntil',s.paid_until))from public.pp_shop_subscriptions s where s.user_id=owner and s.enabled and not exists(select 1 from public.pp_subscription_holds h where h.source=s.source)),'[]'::jsonb)) || public.pp_daily_status(owner) || jsonb_build_object('ownedDecks',coalesce((select jsonb_agg(substring(feature from 6))from public.pp_grants where user_id=owner and feature like 'deck:%' and active and(expires_at is null or expires_at>now())),'[]'::jsonb));
$$;

-- New Studio unlock is permanent and independent of paid backing packs.
create or replace function public.pp_has_feature(owner uuid,wanted text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.pp_grants g where g.user_id=owner and g.active and(g.expires_at is null or g.expires_at>now())and(g.feature='premium' or g.feature=wanted or(wanted='studio' and g.feature='studio_unlock')or(g.feature='studio' and wanted in('studio','pack_celestial','pack_gothic','pack_dragon'))));
$$;
create or replace function public.pp_apply_purchase(owner uuid,receipt text,sku text) returns void language plpgsql security definer set search_path='' as $$
begin
 if sku not in('studio_unlock','studio_pass','pack_celestial','pack_gothic','pack_dragon','credits_10','credits_30','credits_80') and not(sku~'^deck:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and exists(select 1 from public.pp_deck_products where id=substring(sku from 6)::uuid and published))then raise exception 'Unknown product';end if;
 perform 1 from auth.users where id=owner for update;
 insert into public.pp_receipts(id,user_id,sku) values(receipt,owner,sku) on conflict do nothing;
 if not found then return;end if;
 if sku in('credits_10','credits_30','credits_80') then insert into public.pp_credits(user_id,reference,amount) values(owner,'purchase:'||receipt,substring(sku from 9)::integer) on conflict do nothing;
 else insert into public.pp_grants(user_id,source,feature) values(owner,receipt,case when sku='studio_pass' then 'studio' else sku end) on conflict do nothing;end if;
end;$$;
notify pgrst, 'reload schema';
commit;
