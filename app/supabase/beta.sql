-- Optional private beta. Run LAST after credits.sql. Dedicated beta database recommended.
begin;
create table if not exists public.pp_beta_config(singleton boolean primary key default true check(singleton),enabled boolean not null default true,owner_id uuid references auth.users(id));
insert into public.pp_beta_config(singleton)values(true)on conflict do nothing;
create table if not exists public.pp_beta_seats(slot integer primary key check(slot between 1 and 10),email text not null unique check(email=lower(trim(email)) and length(email)between 3 and 254 and position('@' in email)>1),user_id uuid unique references auth.users(id)on delete set null,created_at timestamptz not null default now());
create table if not exists public.pp_beta_feedback(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id)on delete cascade,category text not null check(category in('bug','idea','printing')),title text not null check(length(title)between 3 and 120),details text not null check(length(details)between 10 and 6000),device text not null default '' check(length(device)<=300),status text not null default 'new' check(status in('new','investigating','fixed')),created_at timestamptz not null default now());
alter table public.pp_beta_config enable row level security;
alter table public.pp_beta_seats enable row level security;
alter table public.pp_beta_feedback enable row level security;
revoke all on public.pp_beta_config,public.pp_beta_seats,public.pp_beta_feedback from public,anon,authenticated;
grant all on public.pp_beta_config,public.pp_beta_seats,public.pp_beta_feedback to service_role;
create or replace function public.pp_beta_allowed()returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.pp_beta_config c where not c.enabled) or exists(
 select 1 from auth.users u cross join public.pp_beta_config c where u.id=auth.uid() and u.email_confirmed_at is not null and
 (u.id=c.owner_id or exists(select 1 from public.pp_beta_seats s where s.user_id=u.id and s.email=lower(trim(u.email)))));
$$;
create or replace function public.pp_beta_assert()returns void language plpgsql stable security definer set search_path='' as $$begin
 if current_setting('role',true)='service_role' then return;end if;
 if not public.pp_beta_allowed() then raise exception 'This private beta requires an approved, verified Cardsmith account.' using errcode='42501';end if;
end;$$;
create or replace function public.pp_beta_configure(owner uuid)returns void language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from auth.users where id=owner)then raise exception 'Create the owner account first.';end if;
 update public.pp_beta_config set owner_id=owner,enabled=true where singleton and(owner_id is null or owner_id=owner);
 if not found then raise exception 'Beta already has a different owner. Change it deliberately in SQL Editor.';end if;
end;$$;
create or replace function public.pp_beta_status()returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('enabled',enabled,'capacity',10,'configured',owner_id is not null,'ownerId',owner_id)from public.pp_beta_config where singleton;$$;
create or replace function public.pp_beta_set_seat(seat integer,address text)returns void language plpgsql security definer set search_path='' as $$declare normalized text:=lower(trim(address));begin
 perform 1 from public.pp_beta_config where singleton for update;
 if exists(select 1 from auth.users u join public.pp_beta_config c on u.id=c.owner_id where lower(trim(u.email))=normalized)then raise exception 'Owner has separate access; use this slot for a tester.';end if;
 insert into public.pp_beta_seats(slot,email)values(seat,normalized)on conflict(slot)do update set email=excluded.email,user_id=case when pp_beta_seats.email=excluded.email then pp_beta_seats.user_id else null end,created_at=case when pp_beta_seats.email=excluded.email then pp_beta_seats.created_at else now()end;
end;$$;
create or replace function public.pp_beta_claim(owner uuid)returns jsonb language plpgsql security definer set search_path='' as $$declare c public.pp_beta_config;u auth.users;s public.pp_beta_seats;begin
 select * into c from public.pp_beta_config where singleton;
 if not found then raise exception 'Beta migration is incomplete.';end if;
 if not c.enabled then return jsonb_build_object('allowed',true,'enabled',false);end if;
 select * into u from auth.users where id=owner;
 if u.email_confirmed_at is null then return jsonb_build_object('allowed',false,'reason','Confirm your email before entering the beta.');end if;
 if owner=c.owner_id then return jsonb_build_object('allowed',true,'owner',true,'enabled',true);end if;
 select * into s from public.pp_beta_seats where email=lower(trim(u.email))for update;
 if not found or(s.user_id is not null and s.user_id<>owner)then return jsonb_build_object('allowed',false,'reason','This account is not on the 10-person beta list.');end if;
 update public.pp_beta_seats set user_id=owner where slot=s.slot;
 return jsonb_build_object('allowed',true,'owner',false,'enabled',true,'slot',s.slot);
end;$$;
-- A restrictive policy is ANDed with the existing owner/privacy policies.
do $$declare t record;begin
 for t in select tablename from pg_tables where schemaname='public' and(tablename like 'pk\_%' escape '\' or tablename like 'pp\_%' escape '\' or tablename='proxy_kingdom_projects')and tablename not in('pp_beta_config','pp_beta_seats')loop
 execute format('drop policy if exists pp_private_beta_gate on public.%I',t.tablename);
 execute format('create policy pp_private_beta_gate on public.%I as restrictive for all to anon,authenticated using((select public.pp_beta_allowed())) with check((select public.pp_beta_allowed()))',t.tablename);
 end loop;
end;$$;
drop policy if exists pp_private_beta_storage on storage.objects;
create policy pp_private_beta_storage on storage.objects as restrictive for all to anon,authenticated using(bucket_id not in('proxy-kingdom-art','proxy-kingdom-community','proxy-plane-decks')or(select public.pp_beta_allowed()))with check(bucket_id not in('proxy-kingdom-art','proxy-kingdom-community','proxy-plane-decks')or(select public.pp_beta_allowed()));
-- Existing public SECURITY DEFINER read RPCs bypass RLS: guard their entry too.
-- Preserve signatures, privileges, volatility, and return types; reruns do not stack guards.
do $$declare f record;definition text;begin
 for f in select p.oid,p.prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname='public' and l.lanname='sql' and p.prosecdef and p.proname in('pk_card_is_public','pk_gallery','pp_home_featured','pp_my_access','pp_showcase','pp_public_badge','pp_has_feature','pp_storage_fits')loop
 if position('select public.pp_beta_assert();'in f.prosrc)=0 then
 definition:=replace(pg_get_functiondef(f.oid),f.prosrc,'select public.pp_beta_assert();'||chr(10)||f.prosrc);execute definition;
 end if;
 end loop;
end;$$;
revoke all on function public.pp_beta_allowed(),public.pp_beta_assert(),public.pp_beta_configure(uuid),public.pp_beta_status(),public.pp_beta_set_seat(integer,text),public.pp_beta_claim(uuid)from public,anon,authenticated;
grant execute on function public.pp_beta_allowed(),public.pp_beta_assert()to anon,authenticated,service_role;
grant execute on function public.pp_beta_configure(uuid),public.pp_beta_status(),public.pp_beta_set_seat(integer,text),public.pp_beta_claim(uuid)to service_role;
-- Feedback is private, deliberately entered by the tester, and rate limited even via REST.
create or replace function public.pp_beta_feedback_limit()returns trigger language plpgsql security definer set search_path='' as $$begin
 perform 1 from auth.users where id=new.user_id for update;
 if(select count(*)from public.pp_beta_feedback where user_id=new.user_id and created_at>now()-interval '1 hour')>=10 then raise exception 'Please wait before sending more feedback.';end if;
 new.created_at:=now();new.status:='new';return new;
end;$$;
revoke all on function public.pp_beta_feedback_limit()from public,anon,authenticated;
drop trigger if exists pp_beta_feedback_limit on public.pp_beta_feedback;
create trigger pp_beta_feedback_limit before insert on public.pp_beta_feedback for each row execute function public.pp_beta_feedback_limit();
grant select,insert on public.pp_beta_feedback to authenticated;
drop policy if exists pp_beta_feedback_own on public.pp_beta_feedback;
create policy pp_beta_feedback_own on public.pp_beta_feedback for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists pp_beta_feedback_send on public.pp_beta_feedback;
create policy pp_beta_feedback_send on public.pp_beta_feedback for insert to authenticated with check(user_id=(select auth.uid()));
-- Internal trigger functions are not client RPCs.
revoke all on function public.enforce_proxy_kingdom_free_limit(), public.pp_document_quota(), public.pp_profile_guard(), public.pp_project_design_guard(), public.pp_save_version() from public, anon, authenticated;
commit;
