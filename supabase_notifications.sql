-- Targeting for admin-sent notifications. Safe to re-run.
alter table public.notifications
  add column if not exists audience text default 'admin',
  add column if not exists recipient_id text;

-- Deletes are per copy: sendNotes inserts one row per recipient plus an admin "sent" row.
-- Removing a row never removes other users' copies.
-- If RLS blocks client deletes, the app falls back to POST /api/notifications/actions
-- (service role, still limited to rows visible to that account).
