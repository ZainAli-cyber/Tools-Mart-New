-- Homepage visibility for tools. Safe to re-run.
-- When false, tool is hidden from the public homepage only
-- (still shown on dashboard / shop / admin Tools / Cookies).

alter table public.tools
  add column if not exists show_on_home boolean default true;

alter table public.tools
  add column if not exists extra jsonb default '{}'::jsonb;

update public.tools
set show_on_home = true
where show_on_home is null;
