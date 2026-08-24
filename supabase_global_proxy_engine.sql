-- ============================================================
--  Global Proxy Engine (app_settings)
--  Safe to re-run in the Supabase SQL Editor.
--
--  Stores: { "enabled": boolean, "url": "http://user:pass@host:port/" }
--  Used by /api/tool-proxy outbound fetches so one-click tools can
--  open without the Chrome extension when the engine is ON.
-- ============================================================

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.app_settings is
  'Small key/value site flags (device limits, global proxy engine, etc.).';

alter table public.app_settings enable row level security;

drop policy if exists "authenticated read app_settings" on public.app_settings;
create policy "authenticated read app_settings" on public.app_settings
  for select
  to authenticated
  using (true);

grant select on public.app_settings to authenticated;

insert into public.app_settings (key, value, updated_at)
values (
  'global_proxy_engine',
  '{"enabled":false,"url":""}'::jsonb,
  now()
)
on conflict (key) do nothing;
