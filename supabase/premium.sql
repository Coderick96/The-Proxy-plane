-- Run schema.sql, community.sql, then this migration. Safe to rerun.
begin;
create table if not exists public.pp_customers(user_id uuid primary key references auth.users on delete cascade,stripe_id text unique not null);
create table if not exists public.pp_grants(user_id uuid not null references auth.users on delete cascade,source text not null,feature text not null,active boolean not null default true,expires_at timestamptz,primary key(source,feature));
create table if not exists public.pp_receipts(id text primary key,user_id uuid not null references auth.users on delete cascade,sku text not null,revoked boolean not null default false);
create table if not exists public.pp_subscription_holds(source text primary key,user_id uuid not null references auth.users on delete cascade);
create table if not exists public.pp_credits(user_id uuid not null references auth.users on delete cascade,reference text primary key,amount integer not null,created_at timestamptz not null default now());
create table if not exists public.pp_templates(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,name text not null check(char_length(name) between 1 and 80),style jsonb not null check(octet_length(style::text)<=524288),updated_at timestamptz not null default now());
create table if not exists public.pp_versions(id uuid primary key default gen_random_uuid(),project_id uuid not null,user_id uuid not null,project_json jsonb not null,created_at timestamptz not null default now(),foreign key(project_id,user_id) references public.proxy_kingdom_projects(id,user_id) on delete cascade);
create index if not exists pp_version_project on public.pp_versions(project_id,created_at desc);
create or replace function public.pp_has_feature(owner uuid,wanted text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.pp_grants g where g.user_id=owner and g.active and (g.expires_at is null or g.expires_at>now()) and (g.feature='premium' or g.feature=wanted or (g.feature='studio' and wanted in('studio','pack_celestial','pack_gothic','pack_dragon'))));
$$;
create or replace function public.pp_usage_bytes(owner uuid) returns bigint language sql volatile security definer set search_path='' as $$
 select coalesce((select sum(octet_length(project_json::text)) from public.proxy_kingdom_projects where user_id=owner),0)+coalesce((select sum(octet_length(project_json::text)) from public.pp_versions where user_id=owner),0)+coalesce((select sum(octet_length(style::text)) from public.pp_templates where user_id=owner),0)+coalesce((select sum(coalesce((metadata->>'size')::bigint,0)) from storage.objects where bucket_id in('proxy-kingdom-art','proxy-kingdom-community') and split_part(name,'/',1)=owner::text),0);
$$;
create or replace function public.pp_access_for(owner uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('studioPassOwned',exists(select 1 from public.pp_grants where user_id=owner and feature='studio' and active and expires_at is null),'ownedPacks',coalesce((select jsonb_agg(x) from unnest(array['celestial','gothic','dragon']) x where exists(select 1 from public.pp_grants g where g.user_id=owner and g.active and g.expires_at is null and g.feature in('studio','pack_'||x))),'[]'::jsonb),'premium',public.pp_has_feature(owner,'premium'),'studio',public.pp_has_feature(owner,'studio'),'packs',coalesce((select jsonb_agg(x) from unnest(array['celestial','gothic','dragon']) x where public.pp_has_feature(owner,'pack_'||x)),'[]'::jsonb),'storageUsedBytes',public.pp_usage_bytes(owner),'cardsUsed',(select count(*) from public.proxy_kingdom_projects where user_id=owner),'credits',coalesce((select sum(amount) from public.pp_credits where user_id=owner),0),'cardLimit',case when public.pp_has_feature(owner,'premium') then 10000 else 1000 end,'storageBytes',case when public.pp_has_feature(owner,'premium') then 1073741824 else 104857600 end);
$$;
create or replace function public.pp_my_access() returns jsonb language sql stable security definer set search_path='' as $$select public.pp_access_for((select auth.uid()))$$;
create or replace function public.pp_apply_purchase(owner uuid,receipt text,sku text) returns void language plpgsql security definer set search_path='' as $$
begin
 if sku not in('studio_pass','pack_celestial','pack_gothic','pack_dragon','credits_10','credits_30','credits_80') then raise exception 'Unknown product';end if;
 perform 1 from auth.users where id=owner for update;
 insert into public.pp_receipts(id,user_id,sku) values(receipt,owner,sku) on conflict do nothing;
 if not found then return;end if;
 if sku in ('credits_10','credits_30','credits_80') then insert into public.pp_credits(user_id,reference,amount) values(owner,'purchase:'||receipt,substring(sku from 9)::integer) on conflict do nothing;
 else insert into public.pp_grants(user_id,source,feature) values(owner,receipt,case when sku='studio_pass' then 'studio' else sku end) on conflict do nothing;end if;
end;$$;
create or replace function public.pp_revoke_purchase(receipt text) returns void language plpgsql security definer set search_path='' as $$
declare r public.pp_receipts;begin
 select * into r from public.pp_receipts where id=receipt for update;
 if not found or r.revoked then return;end if;
 update public.pp_receipts set revoked=true where id=receipt;
 update public.pp_grants set active=false where source=receipt;
 if r.sku in ('credits_10','credits_30','credits_80') then insert into public.pp_credits(user_id,reference,amount) values(r.user_id,'revoke:'||receipt,-substring(r.sku from 9)::integer) on conflict do nothing;end if;
end;$$;
create or replace function public.pp_sync_subscription(owner uuid,source_id text,enabled boolean,expires timestamptz) returns void language sql security definer set search_path='' as $$
 insert into public.pp_grants(user_id,source,feature,active,expires_at) values(owner,source_id,'premium',enabled and not exists(select 1 from public.pp_subscription_holds where source=source_id),expires) on conflict(source,feature) do update set active=excluded.active,expires_at=excluded.expires_at where public.pp_grants.user_id=excluded.user_id;
$$;
create or replace function public.pp_hold_subscription(owner uuid,source_id text) returns void language plpgsql security definer set search_path='' as $$
begin insert into public.pp_subscription_holds(source,user_id) values(source_id,owner) on conflict do nothing;update public.pp_grants set active=false where source=source_id and user_id=owner;end;$$;
create or replace function public.pp_revoke_credit(original_reference text) returns void language plpgsql security definer set search_path='' as $$
declare r public.pp_credits;begin select * into r from public.pp_credits where reference=original_reference and amount>0; if not found then return;end if;perform 1 from auth.users where id=r.user_id for update;insert into public.pp_credits(user_id,reference,amount)values(r.user_id,'revoke:'||original_reference,-r.amount) on conflict do nothing;end;$$;
create or replace function public.pp_credit_grant(owner uuid,reference text,amount integer) returns void language plpgsql security definer set search_path='' as $$
begin if amount<=0 or amount>1000 then raise exception 'Invalid credit amount';end if;
 perform 1 from auth.users where id=owner for update;
 insert into public.pp_credits(user_id,reference,amount) values(owner,reference,amount) on conflict do nothing;
end;$$;
create or replace function public.pp_spend_credits(owner uuid,operation uuid,amount integer) returns void language plpgsql security definer set search_path='' as $$
begin
 if amount<=0 or amount>100 then raise exception 'Invalid credit amount';end if;
 perform 1 from auth.users where id=owner for update;
 if exists(select 1 from public.pp_credits where reference='spend:'||operation::text) then raise exception 'Request already processed';end if;
 if coalesce((select sum(c.amount) from public.pp_credits c where c.user_id=owner),0)<amount then raise exception 'Not enough AI credits. Add credits in Premium.';end if;
 insert into public.pp_credits(user_id,reference,amount) values(owner,'spend:'||operation::text,-amount);
end;$$;
-- Replace the old quota function, including fixes for updates through UPSERT.
create or replace function public.enforce_proxy_kingdom_free_limit() returns trigger language plpgsql security definer set search_path='' as $$
declare maximum integer;begin
 perform 1 from auth.users where id=new.user_id for update;
 if tg_op='UPDATE' and new.user_id<>old.user_id then raise exception 'Project ownership cannot change';end if;
 maximum:=case when public.pp_has_feature(new.user_id,'premium') then 10000 else 1000 end;
 if not exists(select 1 from public.proxy_kingdom_projects where id=new.id and user_id=new.user_id) and (select count(*) from public.proxy_kingdom_projects where user_id=new.user_id)>=maximum then raise exception 'Account card limit reached: %',maximum;end if;
 if octet_length(new.project_json::text)>2097152 then raise exception 'Card data too large. Keep artwork in private source storage.';end if;
 return new;
end;$$;
create or replace function public.pp_project_design_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare b jsonb;pack text;begin
 b:=new.project_json->'back';pack:=new.project_json->>'premiumPack';
 if tg_op='INSERT' or (new.project_json->'back') is distinct from (old.project_json->'back') then
  if b->>'mode'='custom' and not public.pp_has_feature(new.user_id,'studio') then raise exception 'Custom backs require Studio access';end if;
  if b->>'mode'='pack' and not public.pp_has_feature(new.user_id,'pack_'||(b->>'pack')) then raise exception 'Backing pack is not owned';end if;
 end if;
 if pack is not null and (tg_op='INSERT' or pack is distinct from old.project_json->>'premiumPack') and not public.pp_has_feature(new.user_id,'pack_'||pack) then raise exception 'Frame pack is not owned';end if;
 return new;
end;$$;
drop trigger if exists pp_project_design_guard on public.proxy_kingdom_projects;
create trigger pp_project_design_guard before insert or update on public.proxy_kingdom_projects for each row execute function public.pp_project_design_guard();
create or replace function public.pp_save_version() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.project_json is distinct from new.project_json and public.pp_has_feature(new.user_id,'studio') and public.pp_usage_bytes(new.user_id)+octet_length(old.project_json::text)<=(case when public.pp_has_feature(new.user_id,'premium') then 1073741824 else 104857600 end) then
  insert into public.pp_versions(project_id,user_id,project_json) values(old.id,old.user_id,old.project_json);
  delete from public.pp_versions where id in(select id from public.pp_versions where project_id=old.id order by created_at desc,id desc offset 20);
 end if;return new;
end;$$;
drop trigger if exists pp_version_snapshot on public.proxy_kingdom_projects;
create trigger pp_version_snapshot after update on public.proxy_kingdom_projects for each row execute function public.pp_save_version();
alter table public.pk_profiles add column if not exists showcase_layout text not null default 'grid' check(showcase_layout in('grid','spotlight'));
alter table public.pk_profiles add column if not exists theme text not null default 'classic' check(theme in('classic','celestial','gothic','dragon'));
alter table public.pk_profiles add column if not exists banner_text text not null default '' check(char_length(banner_text)<=80);
alter table public.pk_profiles add column if not exists featured_ids uuid[] not null default '{}' check(cardinality(featured_ids)<=3);
create or replace function public.pp_profile_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (tg_op='INSERT' or new.theme is distinct from old.theme) and new.theme<>'classic' and not public.pp_has_feature(new.id,'studio') then raise exception 'Profile themes require Studio access';end if;
 if (tg_op='INSERT' and (new.banner_text<>'' or cardinality(new.featured_ids)>0 or new.showcase_layout<>'grid')) or (tg_op='UPDATE' and (new.banner_text is distinct from old.banner_text or new.featured_ids is distinct from old.featured_ids or new.showcase_layout is distinct from old.showcase_layout)) then
  if not public.pp_has_feature(new.id,'studio') then raise exception 'Profile customization requires Studio access';end if;
  if exists(select 1 from unnest(new.featured_ids) x where not exists(select 1 from public.proxy_kingdom_projects p where p.id=x and p.user_id=new.id)) then raise exception 'Only your own cards can be featured';end if;
 end if;return new;
end;$$;
drop trigger if exists pp_profile_guard on public.pk_profiles;
create trigger pp_profile_guard before insert or update on public.pk_profiles for each row execute function public.pp_profile_guard();
-- Artwork quota is enforced on Storage object metadata, with per-account serialization.
create or replace function public.pp_storage_fits(bucket text,object_name text,object_meta jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare owner uuid;used bigint;maximum bigint;begin
 owner:=(select auth.uid());if owner is null then return false;end if;
 if bucket not in('proxy-kingdom-art','proxy-kingdom-community') then return false;end if;
 if split_part(object_name,'/',1)<>owner::text then return false;end if;
 perform 1 from auth.users where id=owner for update;
 maximum:=case when public.pp_has_feature(owner,'premium') then 1073741824 else 104857600 end;
 select coalesce(sum(coalesce((o.metadata->>'size')::bigint,0)),0) into used from storage.objects o where o.bucket_id in('proxy-kingdom-art','proxy-kingdom-community') and split_part(o.name,'/',1)=owner::text and not(o.bucket_id=bucket and o.name=object_name);
 return public.pp_usage_bytes(owner)-coalesce((select coalesce((metadata->>'size')::bigint,0) from storage.objects where bucket_id=bucket and name=object_name),0)+coalesce((object_meta->>'size')::bigint,0)<=maximum;
end;$$;
-- Restrictive policies preserve existing owner folder rules and apply to both buckets.
drop policy if exists pp_storage_insert_quota on storage.objects;
create policy pp_storage_insert_quota on storage.objects as restrictive for insert to authenticated with check(bucket_id not in('proxy-kingdom-art','proxy-kingdom-community') or public.pp_storage_fits(bucket_id,name,metadata));
drop policy if exists pp_storage_update_quota on storage.objects;
create policy pp_storage_update_quota on storage.objects as restrictive for update to authenticated with check(bucket_id not in('proxy-kingdom-art','proxy-kingdom-community') or public.pp_storage_fits(bucket_id,name,metadata));
create or replace function public.pp_document_quota() returns trigger language plpgsql security definer set search_path='' as $$
declare maximum bigint;before_size bigint:=0;after_size bigint;extra bigint:=0;begin
 perform 1 from auth.users where id=new.user_id for update;
 maximum:=case when public.pp_has_feature(new.user_id,'premium') then 1073741824 else 104857600 end;
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
drop trigger if exists pp_document_quota on public.proxy_kingdom_projects;
create trigger pp_document_quota before insert or update on public.proxy_kingdom_projects for each row execute function public.pp_document_quota();
drop trigger if exists pp_template_quota on public.pp_templates;
create trigger pp_template_quota before insert or update on public.pp_templates for each row execute function public.pp_document_quota();
update storage.buckets set file_size_limit=20971520,allowed_mime_types=array['image/png','image/jpeg','image/webp','image/svg+xml','image/gif','image/avif'] where id='proxy-kingdom-art';
-- Users can read their access/credit ledger, never grant it to themselves.
alter table public.pp_subscription_holds enable row level security;
alter table public.pp_customers enable row level security;
alter table public.pp_grants enable row level security;
alter table public.pp_receipts enable row level security;
alter table public.pp_credits enable row level security;
alter table public.pp_templates enable row level security;
alter table public.pp_versions enable row level security;
revoke all on public.pp_subscription_holds,public.pp_customers,public.pp_grants,public.pp_receipts,public.pp_credits,public.pp_templates,public.pp_versions from anon,authenticated;
grant select on public.pp_grants,public.pp_credits,public.pp_templates,public.pp_versions to authenticated;
grant insert,update,delete on public.pp_templates to authenticated;
grant delete on public.pp_versions to authenticated;
drop policy if exists pp_version_delete on public.pp_versions;create policy pp_version_delete on public.pp_versions for delete to authenticated using(user_id=(select auth.uid()));
drop policy if exists pp_grant_read on public.pp_grants;create policy pp_grant_read on public.pp_grants for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists pp_credit_read on public.pp_credits;create policy pp_credit_read on public.pp_credits for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists pp_version_read on public.pp_versions;create policy pp_version_read on public.pp_versions for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists pp_template_read on public.pp_templates;create policy pp_template_read on public.pp_templates for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists pp_template_write on public.pp_templates;create policy pp_template_write on public.pp_templates for all to authenticated using(user_id=(select auth.uid()) and public.pp_has_feature(user_id,'studio')) with check(user_id=(select auth.uid()) and public.pp_has_feature(user_id,'studio'));
-- Every definer function has explicit privileges; only billing server may mutate grants.
revoke all on function public.pp_usage_bytes(uuid),public.pp_has_feature(uuid,text),public.pp_access_for(uuid),public.pp_hold_subscription(uuid,text),public.pp_revoke_credit(text),public.pp_apply_purchase(uuid,text,text),public.pp_revoke_purchase(text),public.pp_sync_subscription(uuid,text,boolean,timestamptz),public.pp_credit_grant(uuid,text,integer),public.pp_spend_credits(uuid,uuid,integer),public.pp_my_access(),public.pp_storage_fits(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.pp_my_access(),public.pp_has_feature(uuid,text),public.pp_storage_fits(text,text,jsonb) to authenticated;
grant all on public.pp_subscription_holds,public.pp_customers,public.pp_grants,public.pp_receipts,public.pp_credits to service_role;
grant execute on function public.pp_access_for(uuid),public.pp_hold_subscription(uuid,text),public.pp_revoke_credit(text),public.pp_apply_purchase(uuid,text,text),public.pp_revoke_purchase(text),public.pp_sync_subscription(uuid,text,boolean,timestamptz),public.pp_credit_grant(uuid,text,integer),public.pp_spend_credits(uuid,uuid,integer) to service_role;
commit;
-- Featured creations use the same effective privacy checks as the main gallery.
create or replace function public.pp_showcase(creator uuid) returns setof public.pk_posts language sql stable security definer set search_path='' as $$
 select s.* from public.pk_posts s join public.pk_profiles p on p.id=s.owner_id where p.id=creator and s.project_id=any(p.featured_ids) and public.pk_card_is_public(s.project_id,s.owner_id) order by array_position(p.featured_ids,s.project_id);
$$;
revoke all on function public.pp_showcase(uuid) from public;
grant execute on function public.pp_showcase(uuid) to anon,authenticated;
alter table public.pk_profiles add column if not exists showcase_layout text not null default 'grid' check(showcase_layout in('grid','spotlight'));
create or replace function public.pp_public_badge(creator uuid) returns text language sql stable security definer set search_path='' as $$
 select case when public.pp_has_feature(p.id,'premium') then 'Premium Cardsmith' when public.pp_has_feature(p.id,'studio') then 'Studio Cardsmith' else null end from public.pk_profiles p where p.id=creator and (p.is_public or p.id=(select auth.uid()));
$$;
revoke all on function public.pp_public_badge(uuid) from public;
grant execute on function public.pp_public_badge(uuid) to anon,authenticated;
