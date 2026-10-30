-- Kalkulator wycieczek — database schema for Supabase.
-- Run once in Supabase: SQL Editor → New query → paste → Run.
-- Safe to re-run: every statement is idempotent.

-- Who may use the calculator (emails of agents). Add people here, not in code.
create table if not exists public.agents (
  email text primary key
);

-- Every tour with full costs. Only agents can read or change these rows.
create table if not exists public.trips (
  id          text primary key,
  data        jsonb not null,
  published   boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  text
);

-- What clients see: public snapshots without costs, written only by publish_trips().
create table if not exists public.published (
  id          text primary key,
  data        jsonb not null,
  position    int not null default 0,
  updated_at  timestamptz not null default now()
);

alter table public.agents    enable row level security;
alter table public.trips     enable row level security;
alter table public.published enable row level security;

-- True when the signed-in user's email is on the agents list.
create or replace function public.is_agent()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.agents
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_agent() from public;
grant execute on function public.is_agent() to anon, authenticated;

drop policy if exists agents_read_self on public.agents;
create policy agents_read_self on public.agents
  for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists trips_agents_only on public.trips;
create policy trips_agents_only on public.trips
  for all to authenticated
  using (public.is_agent())
  with check (public.is_agent());

drop policy if exists published_read_all on public.published;
create policy published_read_all on public.published
  for select to anon, authenticated
  using (true);

drop policy if exists published_agents_write on public.published;
create policy published_agents_write on public.published
  for all to authenticated
  using (public.is_agent())
  with check (public.is_agent());

-- Replace the client page content in one transaction.
create or replace function public.publish_trips(items jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_agent() then
    raise exception 'not allowed';
  end if;
  if jsonb_typeof(items) <> 'array' then
    raise exception 'items must be an array';
  end if;
  delete from public.published where true;
  insert into public.published (id, data, position)
  select x ->> 'id', x, ord::int
  from jsonb_array_elements(items) with ordinality as t(x, ord)
  where coalesce(x ->> 'id', '') <> '';
end;
$$;
revoke all on function public.publish_trips(jsonb) from public;
grant execute on function public.publish_trips(jsonb) to authenticated;

-- Agents. Change the second email to Sylwia's real address.
insert into public.agents (email) values
  ('artemkukunin96@gmail.com'),
  ('sylwia@example.com')
on conflict do nothing;
