-- Ticket routing for the support inbox. Safe to re-run.
-- Direct customers + reseller-to-admin tickets → assignee_role = 'admin'
-- Sub-customers (users with owner_id) → assignee_role = 'reseller', owner_id = seller id

alter table public.tickets
  add column if not exists customer_id text,
  add column if not exists assignee_role text default 'admin',
  add column if not exists owner_id text;

create index if not exists tickets_customer_id_idx on public.tickets (customer_id);
create index if not exists tickets_assignee_idx on public.tickets (assignee_role);
create index if not exists tickets_owner_id_idx on public.tickets (owner_id);
create index if not exists tickets_status_idx on public.tickets (status);

-- RLS stays open (using true) so inserts/updates from the portal keep working.
