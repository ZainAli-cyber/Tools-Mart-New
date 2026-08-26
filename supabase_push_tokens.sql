-- Mobile push notification tokens (FCM)
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id text not null,
  token text not null,
  platform text not null default 'android',
  updated_at timestamptz not null default now(),
  unique (account_id, token)
);

create index if not exists push_tokens_account_id_idx on public.push_tokens (account_id);

alter table public.push_tokens enable row level security;

revoke all on public.push_tokens from anon, authenticated;
