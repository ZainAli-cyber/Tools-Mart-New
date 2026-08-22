-- ============================================================
--  Device limits master switch (app_settings)
--  Safe to re-run in the Supabase SQL Editor.
--
--  When device_limits_enabled is false (default): soft-pass all
--  max_devices / device_sessions enforcement for everyone.
--  Admins are always exempt in app code regardless of this flag.
-- ============================================================

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.app_settings is
  'Small key/value site flags (e.g. device_limits_enabled). Managed via service-role APIs.';

alter table public.app_settings enable row level security;

drop policy if exists "admin all app_settings" on public.app_settings;
drop policy if exists "service role app_settings" on public.app_settings;

-- No broad client policies; service-role server routes manage rows.
-- Optional read for authenticated users (admin UI uses Bearer + API).
drop policy if exists "authenticated read app_settings" on public.app_settings;
create policy "authenticated read app_settings" on public.app_settings
  for select
  to authenticated
  using (true);

grant select on public.app_settings to authenticated;

insert into public.app_settings (key, value, updated_at)
values ('device_limits_enabled', 'false'::jsonb, now())
on conflict (key) do nothing;

-- Ensure default stays false if row exists with null
update public.app_settings
set value = 'false'::jsonb
where key = 'device_limits_enabled'
  and (value is null or value::text = 'null');
