-- Focused function repair for reviewed isolated/staging databases. No table/data changes.
-- Fresh setup already includes these definitions in premium.sql.
-- CREATE OR REPLACE preserves existing grants and does not reset beta gallery guards.
begin;
create or replace function public.pp_usage_bytes(owner uuid) returns bigint language sql volatile security definer set search_path='' as $$
 select coalesce((select sum(octet_length(project_json::text)) from public.proxy_kingdom_projects where user_id=$1),0)+coalesce((select sum(octet_length(project_json::text)) from public.pp_versions where user_id=$1),0)+coalesce((select sum(octet_length(style::text)) from public.pp_templates where user_id=$1),0)+coalesce((select sum(coalesce((metadata->>'size')::bigint,0)) from storage.objects where bucket_id in('proxy-kingdom-art','proxy-kingdom-community') and split_part(name,'/',1)=$1::text),0);
$$;
create or replace function public.pp_storage_fits(bucket text,object_name text,object_meta jsonb) returns boolean language plpgsql security definer set search_path='' as $$
declare v_owner uuid;used bigint;maximum bigint;begin
 v_owner:=(select auth.uid());if v_owner is null then return false;end if;
 if bucket not in('proxy-kingdom-art','proxy-kingdom-community') then return false;end if;
 if split_part(object_name,'/',1)<>v_owner::text then return false;end if;
 perform 1 from auth.users where id=v_owner for update;
 maximum:=case when public.pp_has_feature(v_owner,'premium') then 1073741824 else 104857600 end;
 select coalesce(sum(coalesce((o.metadata->>'size')::bigint,0)),0) into used from storage.objects o where o.bucket_id in('proxy-kingdom-art','proxy-kingdom-community') and split_part(o.name,'/',1)=v_owner::text and not(o.bucket_id=bucket and o.name=object_name);
 return public.pp_usage_bytes(v_owner)-coalesce((select coalesce((metadata->>'size')::bigint,0) from storage.objects where bucket_id=bucket and name=object_name),0)+coalesce((object_meta->>'size')::bigint,0)<=maximum;
end;$$;
revoke all on function public.pp_usage_bytes(uuid) from public,anon,authenticated;
revoke all on function public.pp_storage_fits(text,text,jsonb) from public,anon;
grant execute on function public.pp_storage_fits(text,text,jsonb) to authenticated;
commit;
