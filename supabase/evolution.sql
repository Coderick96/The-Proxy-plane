-- Version 2.4: run after premium.sql. Daily allowance resets at 00:00 UTC.
begin;
create table if not exists public.pp_daily_usage(user_id uuid not null references auth.users on delete cascade,day date not null,spent integer not null default 0 check(spent between 0 and 20),primary key(user_id,day));
create table if not exists public.pp_ai_charges(operation uuid primary key,user_id uuid not null references auth.users on delete cascade,day date not null,daily_spent integer not null,purchased_spent integer not null,refunded boolean not null default false,created_at timestamptz not null default now());
create or replace function public.pp_daily_status(owner uuid) returns jsonb language sql stable security definer set search_path='' as $$
 with balance as(select greatest(0,coalesce(sum(amount),0))::integer wallet from public.pp_credits where user_id=owner),daily as(select case when owner is not null then greatest(0,20-coalesce((select spent from public.pp_daily_usage where user_id=owner and day=(now() at time zone 'UTC')::date),0)) else 0 end remaining)
 select jsonb_build_object('policyVersion',24,'walletCredits',balance.wallet,'dailyRemaining',daily.remaining,'dailyLimit',case when owner is not null then 20 else 0 end,'credits',balance.wallet+daily.remaining,'dailyResetsAt',(((now() at time zone 'UTC')::date+1)::timestamp at time zone 'UTC')) from balance,daily;
$$;
create or replace function public.pp_spend_credits(owner uuid,operation uuid,amount integer) returns void language plpgsql security definer set search_path='' as $$
declare today date:=(now() at time zone 'UTC')::date;daily integer:=0;wallet integer;take_daily integer;begin
 if amount<=0 or amount>100 then raise exception 'Invalid credit amount';end if;
 perform 1 from auth.users where id=owner for update;
 if exists(select 1 from public.pp_ai_charges c where c.operation=pp_spend_credits.operation) or exists(select 1 from public.pp_credits where reference='spend:'||operation::text) then raise exception 'Request already processed';end if;
 if owner is not null then select greatest(0,20-coalesce((select spent from public.pp_daily_usage where user_id=owner and day=today),0)) into daily;end if;
 select greatest(0,coalesce(sum(c.amount),0)) into wallet from public.pp_credits c where c.user_id=owner;
 if amount>daily+wallet then raise exception 'Not enough AI credits. Daily credits reset at 00:00 UTC; purchased credits are separate.';end if;
 take_daily:=least(daily,amount);
 if take_daily>0 then insert into public.pp_daily_usage(user_id,day,spent)values(owner,today,take_daily) on conflict(user_id,day)do update set spent=public.pp_daily_usage.spent+excluded.spent;end if;
 if amount>take_daily then insert into public.pp_credits(user_id,reference,amount)values(owner,'spend:'||operation::text,-(amount-take_daily));end if;
 insert into public.pp_ai_charges(operation,user_id,day,daily_spent,purchased_spent)values(operation,owner,today,take_daily,amount-take_daily);
end;$$;
create or replace function public.pp_refund_ai(charge_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare c public.pp_ai_charges;begin
 select * into c from public.pp_ai_charges where operation=charge_id;if not found then return;end if;
 perform 1 from auth.users where id=c.user_id for update;
 select * into c from public.pp_ai_charges where operation=charge_id for update;if c.refunded then return;end if;
 if c.daily_spent>0 then update public.pp_daily_usage set spent=greatest(0,spent-c.daily_spent)where user_id=c.user_id and day=c.day;end if;
 if c.purchased_spent>0 then insert into public.pp_credits(user_id,reference,amount)values(c.user_id,'refund:'||charge_id::text,c.purchased_spent)on conflict do nothing;end if;
 update public.pp_ai_charges set refunded=true where operation=charge_id;
end;$$;
create table if not exists public.pp_deck_products(id uuid primary key default gen_random_uuid(),slug text not null unique check(slug~'^[a-z0-9-]{3,64}$'),title text not null check(char_length(title)between 1 and 120),description text not null default '' check(char_length(description)<=2000),creator_credit text not null check(char_length(creator_credit)between 1 and 200),member_access boolean not null default true,published boolean not null default false,stripe_price text not null default '' check(stripe_price='' or stripe_price~'^price_[A-Za-z0-9]+$'),file_path text not null,file_name text not null,file_size bigint not null check(file_size between 1 and 104857600),cover_data text not null default '' check(octet_length(cover_data)<=1048576),created_at timestamptz not null default now());
create table if not exists public.pp_deck_uploads(id uuid primary key,user_id uuid not null references auth.users on delete cascade,path text not null unique,file_name text not null,file_size bigint not null,expires_at timestamptz not null default(now()+interval '1 hour'),used boolean not null default false);
create or replace function public.pp_deck_access(owner uuid,deck_id uuid)returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.pp_deck_products p where p.id=deck_id and p.published and ((p.member_access and public.pp_has_feature(owner,'premium'))or exists(select 1 from public.pp_grants g where g.user_id=owner and g.feature='deck:'||deck_id::text and g.active and(g.expires_at is null or g.expires_at>now()))));
$$;
-- Existing created cards retain their free frame controls; only backs require paid access.
create or replace function public.pp_project_design_guard()returns trigger language plpgsql security definer set search_path='' as $$
declare b jsonb;begin b:=new.project_json->'back';
 if tg_op='INSERT' or b is distinct from old.project_json->'back' then
 if b->>'mode'='custom' and not public.pp_has_feature(new.user_id,'studio')then raise exception 'Custom backs require Studio access';end if;
 if b->>'mode'='pack' and not public.pp_has_feature(new.user_id,'pack_'||(b->>'pack'))then raise exception 'Backing pack is not owned';end if;end if;return new;end;$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)values('proxy-plane-decks','proxy-plane-decks',false,104857600,array['application/pdf','application/zip','application/x-zip-compressed'])on conflict(id)do update set public=false,file_size_limit=104857600,allowed_mime_types=excluded.allowed_mime_types;
alter table public.pp_daily_usage enable row level security;alter table public.pp_ai_charges enable row level security;alter table public.pp_deck_products enable row level security;alter table public.pp_deck_uploads enable row level security;
revoke all on public.pp_daily_usage,public.pp_ai_charges,public.pp_deck_products,public.pp_deck_uploads from anon,authenticated;
grant select on public.pp_daily_usage to authenticated;drop policy if exists pp_daily_read on public.pp_daily_usage;create policy pp_daily_read on public.pp_daily_usage for select to authenticated using(user_id=(select auth.uid()));
grant select(id,slug,title,description,creator_credit,member_access,published,cover_data,created_at,file_name,file_size)on public.pp_deck_products to anon,authenticated;
drop policy if exists pp_deck_metadata_read on public.pp_deck_products;create policy pp_deck_metadata_read on public.pp_deck_products for select using(published);
grant all on public.pp_daily_usage,public.pp_ai_charges,public.pp_deck_products,public.pp_deck_uploads to service_role;
revoke all on function public.pp_daily_status(uuid),public.pp_refund_ai(uuid),public.pp_deck_access(uuid,uuid)from public,anon,authenticated;
grant execute on function public.pp_daily_status(uuid),public.pp_refund_ai(uuid),public.pp_deck_access(uuid,uuid)to service_role;
-- Attribution for explicitly imported, permission-cleared proxy fronts.
alter table public.pk_posts add column if not exists source_url text not null default '' check(char_length(source_url)<=2000);
alter table public.pk_posts add column if not exists origin_credit text not null default '' check(char_length(origin_credit)<=200);
create table if not exists public.pp_home_features(slot integer primary key check(slot between 1 and 3),project_id uuid not null unique references public.pk_posts(project_id)on delete cascade);
alter table public.pp_home_features enable row level security;revoke all on public.pp_home_features from anon,authenticated;grant all on public.pp_home_features to service_role;
create or replace function public.pp_set_home_features(ids uuid[])returns void language plpgsql security definer set search_path='' as $$
begin if cardinality(ids)>3 then raise exception 'Choose at most three public creations';end if;
 if exists(select 1 from unnest(ids) x where not exists(select 1 from public.pk_posts p where p.project_id=x and public.pk_card_is_public(p.project_id,p.owner_id)))then raise exception 'Only currently public published creations can be featured';end if;
 delete from public.pp_home_features;insert into public.pp_home_features(slot,project_id)select ord::int,id from unnest(ids)with ordinality as t(id,ord);
end;$$;
create or replace function public.pp_home_featured()returns table(slot integer,project_id uuid,title text,image_path text,artist_credit text,display_name text,username text,updated_at timestamptz)language sql stable security definer set search_path='' as $$
 select h.slot,p.project_id,p.title,p.image_path,p.artist_credit,u.display_name,u.username,p.updated_at from public.pp_home_features h join public.pk_posts p on p.project_id=h.project_id join public.pk_profiles u on u.id=p.owner_id where public.pk_card_is_public(p.project_id,p.owner_id)order by h.slot;
$$;
revoke all on function public.pp_set_home_features(uuid[]),public.pp_home_featured()from public,anon,authenticated;
grant execute on function public.pp_set_home_features(uuid[])to service_role;grant execute on function public.pp_home_featured()to anon,authenticated;
commit;

create or replace function public.pp_access_for(owner uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('studioPassOwned',exists(select 1 from public.pp_grants where user_id=owner and feature='studio' and active and expires_at is null),'ownedPacks',coalesce((select jsonb_agg(x) from unnest(array['celestial','gothic','dragon']) x where exists(select 1 from public.pp_grants g where g.user_id=owner and g.active and g.expires_at is null and g.feature in('studio','pack_'||x))),'[]'::jsonb),'premium',public.pp_has_feature(owner,'premium'),'studio',public.pp_has_feature(owner,'studio'),'packs',coalesce((select jsonb_agg(x) from unnest(array['celestial','gothic','dragon']) x where public.pp_has_feature(owner,'pack_'||x)),'[]'::jsonb),'storageUsedBytes',public.pp_usage_bytes(owner),'cardsUsed',(select count(*) from public.proxy_kingdom_projects where user_id=owner),'credits',coalesce((select sum(amount) from public.pp_credits where user_id=owner),0),'cardLimit',case when public.pp_has_feature(owner,'premium') then 10000 else 1000 end,'storageBytes',case when public.pp_has_feature(owner,'premium') then 1073741824 else 104857600 end) || public.pp_daily_status(owner) || jsonb_build_object('ownedDecks',coalesce((select jsonb_agg(substring(feature from 6))from public.pp_grants where user_id=owner and feature like 'deck:%' and active and(expires_at is null or expires_at>now())),'[]'::jsonb));
$$;
create or replace function public.pp_apply_purchase(owner uuid,receipt text,sku text) returns void language plpgsql security definer set search_path='' as $$
begin
 if sku not in('studio_pass','pack_celestial','pack_gothic','pack_dragon','credits_10','credits_30','credits_80') and not(sku~'^deck:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and exists(select 1 from public.pp_deck_products where id=substring(sku from 6)::uuid and published))then raise exception 'Unknown product';end if;
 perform 1 from auth.users where id=owner for update;
 insert into public.pp_receipts(id,user_id,sku) values(receipt,owner,sku) on conflict do nothing;
 if not found then return;end if;
 if sku in('credits_10','credits_30','credits_80') then insert into public.pp_credits(user_id,reference,amount) values(owner,'purchase:'||receipt,substring(sku from 9)::integer) on conflict do nothing;
 else insert into public.pp_grants(user_id,source,feature) values(owner,receipt,case when sku='studio_pass' then 'studio' else sku end) on conflict do nothing;end if;
end;$$;
drop function if exists public.pk_gallery(uuid,uuid,boolean,integer);
create function public.pk_gallery(creator_filter uuid default null, collection_filter uuid default null, following_only boolean default false, page_offset integer default 0)
returns table(project_id uuid,owner_id uuid,title text,caption text,artist_credit text,kind text,image_path text,created_at timestamptz,updated_at timestamptz,username text,display_name text,avatar text,source_url text,origin_credit text)
language sql stable security definer set search_path='' as $$
 select s.project_id,s.owner_id,s.title,s.caption,s.artist_credit,s.kind,s.image_path,s.created_at,s.updated_at,u.username,u.display_name,u.avatar,s.source_url,s.origin_credit
 from public.pk_posts s join public.pk_profiles u on u.id=s.owner_id
 join public.proxy_kingdom_projects p on p.id=s.project_id and p.user_id=s.owner_id
 where public.pk_card_is_public(s.project_id,s.owner_id)
 and (creator_filter is null or s.owner_id=creator_filter)
 and (collection_filter is null or p.collection_id=collection_filter)
 and (not following_only or exists(select 1 from public.pk_follows f where f.follower_id=(select auth.uid()) and f.creator_id=s.owner_id))
 order by s.created_at desc,s.project_id
 limit 24 offset greatest(0,least(page_offset,2400));
$$;
revoke all on function public.pk_gallery(uuid,uuid,boolean,integer) from public;
grant execute on function public.pk_gallery(uuid,uuid,boolean,integer) to anon,authenticated;
create or replace function public.pp_publish_deck_product(ticket_id uuid,owner uuid,product_slug text,product_title text,product_description text,credit text,members boolean,price text,cover text)returns uuid language plpgsql security definer set search_path='' as $$
declare ticket public.pp_deck_uploads;created uuid;begin
 select * into ticket from public.pp_deck_uploads where id=ticket_id and user_id=owner for update;
 if not found or ticket.used or ticket.expires_at<now()then raise exception 'Upload ticket is unavailable';end if;
 insert into public.pp_deck_products(slug,title,description,creator_credit,member_access,published,stripe_price,file_path,file_name,file_size,cover_data)values(product_slug,product_title,product_description,credit,members,true,price,ticket.path,ticket.file_name,ticket.file_size,cover)returning id into created;
 update public.pp_deck_uploads set used=true where id=ticket_id;return created;
end;$$;
revoke all on function public.pp_publish_deck_product(uuid,uuid,text,text,text,text,boolean,text,text)from public,anon,authenticated;
grant execute on function public.pp_publish_deck_product(uuid,uuid,text,text,text,text,boolean,text,text)to service_role;
