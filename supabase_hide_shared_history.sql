-- Per-member ChatGPT privacy: when false, hide shared account history/projects/library.
-- Safe to re-run.
alter table public.customers
  add column if not exists hide_shared_history boolean default true;

comment on column public.customers.hide_shared_history is
  'When true, tool sessions hide other users chats/projects/library and keep only this member email history.';
