-- Optional cloud project sync. Run this in Supabase SQL Editor after creating a project.
create table if not exists public.proxy_kingdom_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled project',
  project_json jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.proxy_kingdom_projects enable row level security;
drop policy if exists "Users manage their own projects" on public.proxy_kingdom_projects;
create policy "Users manage their own projects" on public.proxy_kingdom_projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Private artwork bucket. Each user can only access objects in their own folder.
insert into storage.buckets (id, name, public)
values ('proxy-kingdom-art', 'proxy-kingdom-art', false)
on conflict (id) do update set public = false;
drop policy if exists "Users upload their own Proxy Kingdom artwork" on storage.objects;
create policy "Users upload their own Proxy Kingdom artwork" on storage.objects
  for insert to authenticated with check (bucket_id = 'proxy-kingdom-art' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users update their own Proxy Kingdom artwork" on storage.objects;
create policy "Users update their own Proxy Kingdom artwork" on storage.objects
  for update to authenticated using (bucket_id = 'proxy-kingdom-art' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'proxy-kingdom-art' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users delete their own Proxy Kingdom artwork" on storage.objects;
create policy "Users delete their own Proxy Kingdom artwork" on storage.objects
  for delete to authenticated using (bucket_id = 'proxy-kingdom-art' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users read their own Proxy Kingdom artwork objects" on storage.objects;
create policy "Users read their own Proxy Kingdom artwork objects" on storage.objects
  for select to authenticated using (bucket_id = 'proxy-kingdom-art' and (storage.foldername(name))[1] = auth.uid()::text);

-- Free-tier quota enforced in database, including direct API calls.
create or replace function public.enforce_proxy_kingdom_free_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Serialize inserts per account to avoid concurrent quota bypass.
  perform 1 from auth.users where id = new.user_id for update;
  if (select count(*) from public.proxy_kingdom_projects where user_id = new.user_id) >= 1000 then
    raise exception 'Free account limit reached: 1000 cards';
  end if;
  return new;
end; $$;
drop trigger if exists proxy_kingdom_free_limit on public.proxy_kingdom_projects;
create trigger proxy_kingdom_free_limit before insert on public.proxy_kingdom_projects
for each row execute function public.enforce_proxy_kingdom_free_limit();
