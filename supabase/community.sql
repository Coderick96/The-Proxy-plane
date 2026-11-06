-- Run schema.sql first, then this migration in the Supabase SQL Editor.
-- Existing project documents and source artwork remain owner-only.
begin;
create table if not exists public.pk_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
 display_name text not null check (char_length(display_name) between 1 and 64),
 bio text not null default '' check (char_length(bio)<=500),
 avatar text not null default 'crown' check (avatar in ('crown','crystal','moon','shield','spark','book')),
 is_public boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.pk_collections (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 80),
 visibility text not null default 'private' check (visibility in ('private','public')),
 created_at timestamptz not null default now(),
 unique(id,user_id)
);
alter table public.proxy_kingdom_projects add column if not exists visibility text not null default 'private' check (visibility in ('private','public'));
alter table public.proxy_kingdom_projects add column if not exists collection_id uuid;
alter table public.proxy_kingdom_projects add column if not exists published_at timestamptz;
create unique index if not exists pk_project_owner_key on public.proxy_kingdom_projects(id,user_id);
do $$ begin
 if not exists(select 1 from pg_constraint where conname='pk_project_collection_owner') then
  alter table public.proxy_kingdom_projects add constraint pk_project_collection_owner foreign key(collection_id,user_id) references public.pk_collections(id,user_id);
 end if;
end $$;
create table if not exists public.pk_posts (
 project_id uuid primary key,
 owner_id uuid not null references public.pk_profiles(id) on delete cascade,
 title text not null check (char_length(title) between 1 and 120),
 caption text not null default '' check (char_length(caption)<=1000),
 artist_credit text not null default '' check (char_length(artist_credit)<=200),
 kind text not null default 'proxy' check (kind in ('proxy','art')),
 image_path text not null,
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 foreign key(project_id,owner_id) references public.proxy_kingdom_projects(id,user_id) on delete cascade,
 check(image_path=owner_id::text||'/'||project_id::text||'.png')
);
alter table public.pk_posts add column if not exists updated_at timestamptz not null default now();
create table if not exists public.pk_follows (
 follower_id uuid not null references public.pk_profiles(id) on delete cascade,
 creator_id uuid not null references public.pk_profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(follower_id,creator_id),
 check(follower_id<>creator_id)
);
create index if not exists pk_posts_created on public.pk_posts(created_at desc);
create index if not exists pk_follows_creator on public.pk_follows(creator_id);
create index if not exists pk_collections_owner on public.pk_collections(user_id);

-- This helper returns a boolean, never editable project data.
create or replace function public.pk_card_is_public(card_id uuid, cardsmith_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from public.proxy_kingdom_projects p
  join public.pk_profiles u on u.id=p.user_id
  left join public.pk_collections c on c.id=p.collection_id and c.user_id=p.user_id
  where p.id=card_id and p.user_id=cardsmith_id and p.visibility='public' and u.is_public
  and (p.collection_id is null or c.visibility='public')
 );
$$;
revoke all on function public.pk_card_is_public(uuid,uuid) from public;
grant execute on function public.pk_card_is_public(uuid,uuid) to anon,authenticated;

alter table public.pk_profiles enable row level security;
alter table public.pk_collections enable row level security;
alter table public.pk_posts enable row level security;
alter table public.pk_follows enable row level security;
revoke all on public.pk_profiles,public.pk_collections,public.pk_posts,public.pk_follows from anon,authenticated;
grant select on public.pk_profiles,public.pk_collections,public.pk_posts,public.pk_follows to anon,authenticated;
grant insert,update,delete on public.pk_profiles,public.pk_collections,public.pk_posts to authenticated;
grant insert,delete on public.pk_follows to authenticated;
-- Never grant anonymous read access to editable project JSON.
revoke all on public.proxy_kingdom_projects from anon;
grant select,insert,update,delete on public.proxy_kingdom_projects to authenticated;

drop policy if exists pk_profile_read on public.pk_profiles;
create policy pk_profile_read on public.pk_profiles for select using(is_public or id=(select auth.uid()));
drop policy if exists pk_profile_write on public.pk_profiles;
create policy pk_profile_write on public.pk_profiles for all to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
drop policy if exists pk_collection_read on public.pk_collections;
create policy pk_collection_read on public.pk_collections for select using(user_id=(select auth.uid()) or (visibility='public' and exists(select 1 from public.pk_profiles p where p.id=user_id and p.is_public)));
drop policy if exists pk_collection_write on public.pk_collections;
create policy pk_collection_write on public.pk_collections for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists pk_post_read on public.pk_posts;
create policy pk_post_read on public.pk_posts for select using(owner_id=(select auth.uid()) or public.pk_card_is_public(project_id,owner_id));
drop policy if exists pk_post_write on public.pk_posts;
create policy pk_post_write on public.pk_posts for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
drop policy if exists pk_follow_read on public.pk_follows;
create policy pk_follow_read on public.pk_follows for select using(follower_id=(select auth.uid()) or creator_id=(select auth.uid()) or (exists(select 1 from public.pk_profiles p where p.id=follower_id and p.is_public) and exists(select 1 from public.pk_profiles p where p.id=creator_id and p.is_public)));
drop policy if exists pk_follow_insert on public.pk_follows;
create policy pk_follow_insert on public.pk_follows for insert to authenticated with check(follower_id=(select auth.uid()) and exists(select 1 from public.pk_profiles p where p.id=creator_id and p.is_public));
drop policy if exists pk_follow_delete on public.pk_follows;
create policy pk_follow_delete on public.pk_follows for delete to authenticated using(follower_id=(select auth.uid()));

-- Public feeds exclude even the current owner's private cards/collections.
drop function if exists public.pk_gallery(uuid,uuid,boolean,integer);
create function public.pk_gallery(creator_filter uuid default null, collection_filter uuid default null, following_only boolean default false, page_offset integer default 0)
returns table(project_id uuid,owner_id uuid,title text,caption text,artist_credit text,kind text,image_path text,created_at timestamptz,updated_at timestamptz,username text,display_name text,avatar text)
language sql stable security definer set search_path='' as $$
 select s.project_id,s.owner_id,s.title,s.caption,s.artist_credit,s.kind,s.image_path,s.created_at,s.updated_at,u.username,u.display_name,u.avatar
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

-- Share only rendered snapshots, in a private bucket with database-backed reads.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('proxy-kingdom-community','proxy-kingdom-community',false,20971520,array['image/png'])
on conflict(id) do update set public=false,file_size_limit=20971520,allowed_mime_types=array['image/png'];
drop policy if exists pk_snapshot_read on storage.objects;
create policy pk_snapshot_read on storage.objects for select using(bucket_id='proxy-kingdom-community' and ((storage.foldername(name))[1]=(select auth.uid())::text or exists(select 1 from public.pk_posts s where s.image_path=name and public.pk_card_is_public(s.project_id,s.owner_id))));
drop policy if exists pk_snapshot_insert on storage.objects;
create policy pk_snapshot_insert on storage.objects for insert to authenticated with check(bucket_id='proxy-kingdom-community' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists pk_snapshot_update on storage.objects;
create policy pk_snapshot_update on storage.objects for update to authenticated using(bucket_id='proxy-kingdom-community' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='proxy-kingdom-community' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists pk_snapshot_delete on storage.objects;
create policy pk_snapshot_delete on storage.objects for delete to authenticated using(bucket_id='proxy-kingdom-community' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
