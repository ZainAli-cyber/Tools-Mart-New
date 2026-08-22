-- ============================================================
--  Concurrent device sessions (max devices per account)
--  Safe to re-run in the Supabase SQL Editor.
--
--  Also run supabase_device_limits_toggle.sql for the global
--  ON/OFF master switch (device_limits_enabled, default false).
--
--  App APIs use the service role (same pattern as /api/accounts).
--  RLS is enabled with no broad client policies so browser anon
--  keys cannot manage sessions directly.
-- ============================================================

alter table public.customers
  add column if not exists max_devices integer not null default 1;

update public.customers
set max_devices = 1
where max_devices is null or max_devices < 1;

alter table public.customers
  drop constraint if exists customers_max_devices_check;

alter table public.customers
  add constraint customers_max_devices_check
  check (max_devices >= 1 and max_devices <= 50);

comment on column public.customers.max_devices is
  'Max concurrent browser/extension devices allowed for this account. Default 1.';

create table if not exists public.device_sessions (
  id text primary key default ('dev_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
  account_id text not null references public.customers(id) on delete cascade,
  device_id text not null,
  device_label text,
  user_agent text,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists device_sessions_account_device_uidx
  on public.device_sessions (account_id, device_id);

create index if not exists device_sessions_account_idx
  on public.device_sessions (account_id);

create index if not exists device_sessions_last_seen_idx
  on public.device_sessions (last_seen desc);

comment on table public.device_sessions is
  'Registered browser/extension devices per customer account for concurrent-session limits.';

alter table public.device_sessions enable row level security;

-- Prefer service-role server routes. Keep policies tight; drop any prior open policies.
drop policy if exists "service role device_sessions" on public.device_sessions;
drop policy if exists "admin all device_sessions" on public.device_sessions;
drop policy if exists "account read own device_sessions" on public.device_sessions;

-- Authenticated users may read their own rows (optional UI fallback).
-- Mutations go through /api/devices with the service role.
drop policy if exists "account read own devices" on public.device_sessions;
create policy "account read own devices" on public.device_sessions
  for select
  using (
    account_id in (
      select id from public.customers where auth_user_id = auth.uid()
    )
  );

grant select on public.device_sessions to authenticated;
-- No insert/update/delete grants to anon/authenticated; service role bypasses RLS.
