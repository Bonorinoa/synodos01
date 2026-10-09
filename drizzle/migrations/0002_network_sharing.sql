create table public.network_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  network_id text not null,
  token text not null unique default replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.network_shares to authenticated;
grant all on public.network_shares to service_role;
alter table public.network_shares enable row level security;
create policy "Owner reads shares" on public.network_shares for select to authenticated using (owner_id = auth.uid());
create policy "Owner creates shares" on public.network_shares for insert to authenticated with check (owner_id = auth.uid() and public.has_access(auth.uid()));
create policy "Owner updates shares" on public.network_shares for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Owner deletes shares" on public.network_shares for delete to authenticated using (owner_id = auth.uid());

create table public.network_share_views (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.network_shares(id) on delete cascade,
  viewer_id uuid not null,
  viewed_at timestamptz not null default now()
);
grant select on public.network_share_views to authenticated;
grant all on public.network_share_views to service_role;
alter table public.network_share_views enable row level security;
create policy "Owner reads views" on public.network_share_views for select to authenticated using (exists (select 1 from public.network_shares s where s.id = share_id and s.owner_id = auth.uid()));

create or replace function public.get_shared_network(_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s public.network_shares; result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to open shared networks'; end if;
  select * into s from public.network_shares where token = _token and active;
  if not found then return null; end if;
  select data into result from public.networks where user_id = s.owner_id and id = s.network_id;
  if result is null then return null; end if;
  if auth.uid() <> s.owner_id then insert into public.network_share_views (share_id, viewer_id) values (s.id, auth.uid()); end if;
  return result;
end $$;
revoke execute on function public.get_shared_network(text) from public, anon;
grant execute on function public.get_shared_network(text) to authenticated;

create or replace function public.list_share_viewers(_share_id uuid)
returns table(email text, viewed_at timestamptz) language sql stable security definer set search_path = public as $$
  select u.email::text, max(v.viewed_at) from public.network_share_views v
  join public.network_shares s on s.id = v.share_id and s.owner_id = auth.uid()
  join auth.users u on u.id = v.viewer_id
  where v.share_id = _share_id group by u.email order by 2 desc
$$;
revoke execute on function public.list_share_viewers(uuid) from public, anon;
grant execute on function public.list_share_viewers(uuid) to authenticated;