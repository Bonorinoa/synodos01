create type public.app_role as enum ('owner', 'tester');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create table public.tester_invites (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.tester_invites to authenticated;
grant all on public.tester_invites to service_role;
alter table public.tester_invites enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create policy "Owner manages invites read" on public.tester_invites for select to authenticated using (public.has_role(auth.uid(), 'owner'));
create policy "Owner manages invites insert" on public.tester_invites for insert to authenticated with check (public.has_role(auth.uid(), 'owner'));
create policy "Owner manages invites delete" on public.tester_invites for delete to authenticated using (public.has_role(auth.uid(), 'owner'));

-- Access = owner, or a tester whose sign-in email is on the invite list.
create or replace function public.has_access(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.has_role(_user_id, 'owner') or exists (
  select 1 from public.tester_invites i join auth.users u on lower(u.email) = i.email where u.id = _user_id) $$;

-- The very first account to call this becomes owner; afterwards it only reports access.
create or replace function public.claim_access()
returns text language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then return 'none'; end if;
  perform pg_advisory_xact_lock(4242);
  if not exists (select 1 from public.user_roles where role = 'owner') then
    insert into public.user_roles (user_id, role) values (auth.uid(), 'owner');
  end if;
  if public.has_role(auth.uid(), 'owner') then return 'owner'; end if;
  if public.has_access(auth.uid()) then return 'tester'; end if;
  return 'none';
end $$;
revoke execute on function public.claim_access() from anon, public;
grant execute on function public.claim_access() to authenticated;

create table public.networks (
  user_id uuid not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
grant select, insert, update, delete on public.networks to authenticated;
grant all on public.networks to service_role;
alter table public.networks enable row level security;
create policy "Own networks select" on public.networks for select to authenticated using (user_id = auth.uid() and public.has_access(auth.uid()));
create policy "Own networks insert" on public.networks for insert to authenticated with check (user_id = auth.uid() and public.has_access(auth.uid()));
create policy "Own networks update" on public.networks for update to authenticated using (user_id = auth.uid() and public.has_access(auth.uid())) with check (user_id = auth.uid());
create policy "Own networks delete" on public.networks for delete to authenticated using (user_id = auth.uid() and public.has_access(auth.uid()));