-- Website chatbot → support tickets. Safe to re-run.
-- Guest name/phone, ticket source/category, and reopen lock for closed/resolved.
--
-- RUN THIS in the Supabase SQL Editor if Support Center shows:
--   column tickets.reopen_locked does not exist
-- Then refresh the admin Support Center.

alter table public.tickets add column if not exists customer_phone text;
alter table public.tickets add column if not exists category text default 'general';
alter table public.tickets add column if not exists source text default 'portal';
alter table public.tickets add column if not exists reopen_locked boolean default false;

-- Ensure defaults on existing rows (no-op if already set).
update public.tickets set category = 'general' where category is null;
update public.tickets set source = 'portal' where source is null;
update public.tickets set reopen_locked = false where reopen_locked is null
  and lower(coalesce(status, '')) not in ('closed', 'resolved');

create index if not exists tickets_customer_phone_idx on public.tickets (customer_phone);
create index if not exists tickets_source_idx on public.tickets (source);
create index if not exists tickets_reopen_locked_idx on public.tickets (reopen_locked);

comment on column public.tickets.customer_phone is 'Guest or customer phone captured by the website chatbot / ticket form.';
comment on column public.tickets.source is 'portal | chatbot | admin — where the ticket was opened.';
comment on column public.tickets.category is 'general | pricing | billing | technical | access | other';
comment on column public.tickets.reopen_locked is 'True after admin closes or resolves — customer cannot reopen; must start a new ticket.';

-- Keep reopen_locked in sync when status moves to closed/resolved (or back to open by staff).
create or replace function public.tickets_sync_reopen_lock()
returns trigger
language plpgsql
as $$
begin
  if lower(coalesce(new.status, '')) in ('closed', 'resolved') then
    new.reopen_locked := true;
  elsif lower(coalesce(new.status, '')) in ('open', 'pending', 'unresolved')
        and lower(coalesce(old.status, '')) in ('closed', 'resolved') then
    -- Staff may clear the lock only by explicitly setting status back to open.
    new.reopen_locked := false;
  end if;
  return new;
end;
$$;

drop trigger if exists tickets_sync_reopen_lock_trg on public.tickets;
create trigger tickets_sync_reopen_lock_trg
  before update of status on public.tickets
  for each row
  execute function public.tickets_sync_reopen_lock();

-- Backfill existing closed/resolved rows.
update public.tickets
set reopen_locked = true
where lower(coalesce(status, '')) in ('closed', 'resolved')
  and coalesce(reopen_locked, false) = false;
