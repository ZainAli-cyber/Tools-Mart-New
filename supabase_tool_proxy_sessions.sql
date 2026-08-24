-- Optional: dedicated encrypted proxy sessions (service role only).
-- Safe to re-run. If skipped, the API falls back to encrypted app_settings rows.

create table if not exists public.tool_proxy_sessions (
  token text primary key,
  sealed text not null,
  expires_at timestamptz not null
);

alter table public.tool_proxy_sessions enable row level security;

revoke all on public.tool_proxy_sessions from anon, authenticated;

create index if not exists tool_proxy_sessions_expires_at_idx
  on public.tool_proxy_sessions (expires_at);
