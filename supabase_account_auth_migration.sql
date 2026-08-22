-- Production account/auth migration.
-- Run once in Supabase SQL Editor, then run: npm run migrate:accounts

create extension if not exists "uuid-ossp";

alter table public.customers
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade,
  add column if not exists customer_code text,
  add column if not exists role text not null default 'user'
    check (role in ('user', 'reseller', 'admin')),
  add column if not exists plan text not null default '',
  add column if not exists fee integer not null default 0 check (fee >= 0),
  add column if not exists plan_days integer not null default 0 check (plan_days >= 0),
  add column if not exists expiry date,
  add column if not exists owner_id text references public.customers(id) on delete set null;

update public.customers
set customer_code = 'TM-' || upper(substr(replace(uuid_generate_v4()::text, '-', ''), 1, 10))
where customer_code is null or trim(customer_code) = '';

alter table public.customers
  alter column customer_code set default
    ('TM-' || upper(substr(replace(uuid_generate_v4()::text, '-', ''), 1, 10))),
  alter column customer_code set not null;

create unique index if not exists customers_code_unique
  on public.customers (upper(customer_code));
create unique index if not exists customers_email_unique
  on public.customers (lower(email)) where email is not null;
create index if not exists customers_auth_user_idx on public.customers(auth_user_id);
create index if not exists customers_owner_idx on public.customers(owner_id);
create index if not exists customers_role_idx on public.customers(role);

create table if not exists public.reseller_payments (
  id text primary key default 'PAY' || replace(uuid_generate_v4()::text, '-', ''),
  owner_id text not null references public.customers(id) on delete cascade,
  member_id text not null references public.customers(id) on delete cascade,
  member_name text not null default '',
  amount integer not null default 0 check (amount >= 0),
  method text not null default 'Manual',
  reference text not null default 'REF-' || upper(substr(replace(uuid_generate_v4()::text, '-', ''), 1, 8)),
  status text not null default 'paid' check (status in ('paid', 'pending', 'failed')),
  payment_date date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists reseller_payments_owner_idx on public.reseller_payments(owner_id);
create index if not exists reseller_payments_member_idx on public.reseller_payments(member_id);

-- Security-definer helpers avoid recursive customer RLS checks.
create or replace function public.current_customer_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select id from public.customers where auth_user_id = auth.uid() limit 1
$$;

create or replace function public.current_account_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.customers where auth_user_id = auth.uid() limit 1
$$;

revoke all on function public.current_customer_id() from public;
revoke all on function public.current_account_role() from public;
grant execute on function public.current_customer_id() to authenticated;
grant execute on function public.current_account_role() to authenticated;

-- Every normal signup gets a locked customer profile. Role is deliberately not
-- read from user metadata, preventing users from making themselves admins.
create or replace function public.handle_new_portal_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.customers
  set auth_user_id = new.id,
      name = coalesce(nullif(trim(name), ''), nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)),
      email = lower(new.email),
      phone = coalesce(nullif(phone, ''), new.raw_user_meta_data->>'phone', '')
  where auth_user_id is null and lower(email) = lower(new.email);

  if found then
    return new;
  end if;

  insert into public.customers (
    id, auth_user_id, name, email, phone, role, status, plan, fee,
    plan_days, expiry, tools, notes
  ) values (
    'C' || replace(new.id::text, '-', ''),
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    'user',
    'active',
    '',
    0,
    0,
    null,
    '[]'::jsonb,
    'Self signup — awaiting plan activation'
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_portal_profile on auth.users;
create trigger on_auth_user_created_portal_profile
  after insert on auth.users
  for each row execute function public.handle_new_portal_user();

alter table public.customers enable row level security;
alter table public.reseller_payments enable row level security;

drop policy if exists "admin all customers" on public.customers;
drop policy if exists "account read customers" on public.customers;
drop policy if exists "account update customers" on public.customers;
drop policy if exists "admin insert customers" on public.customers;
drop policy if exists "admin delete customers" on public.customers;

create policy "account read customers" on public.customers
  for select to authenticated
  using (
    auth_user_id = auth.uid()
    or public.current_account_role() = 'admin'
    or (
      public.current_account_role() = 'reseller'
      and owner_id = public.current_customer_id()
    )
  );

create policy "account update customers" on public.customers
  for update to authenticated
  using (
    public.current_account_role() = 'admin'
    or (
      public.current_account_role() = 'reseller'
      and owner_id = public.current_customer_id()
    )
  )
  with check (
    public.current_account_role() = 'admin'
    or (
      public.current_account_role() = 'reseller'
      and owner_id = public.current_customer_id()
      and role = 'user'
    )
  );

create policy "admin insert customers" on public.customers
  for insert to authenticated
  with check (public.current_account_role() = 'admin');

-- Public checkout may record a lead, but only as a locked plain customer with
-- no login, no plan, no tools and no reseller ownership.
drop policy if exists "public insert customer lead" on public.customers;
create policy "public insert customer lead" on public.customers
  for insert to anon
  with check (
    auth_user_id is null
    and role = 'user'
    and coalesce(plan, '') = ''
    and coalesce(fee, 0) = 0
    and coalesce(plan_days, 0) = 0
    and expiry is null
    and owner_id is null
    and coalesce(tools, '[]'::jsonb) = '[]'::jsonb
  );

create policy "admin delete customers" on public.customers
  for delete to authenticated
  using (public.current_account_role() = 'admin');

drop policy if exists "account read payments" on public.reseller_payments;
drop policy if exists "account insert payments" on public.reseller_payments;
drop policy if exists "account delete payments" on public.reseller_payments;

create policy "account read payments" on public.reseller_payments
  for select to authenticated
  using (
    public.current_account_role() = 'admin'
    or owner_id = public.current_customer_id()
  );

create policy "account insert payments" on public.reseller_payments
  for insert to authenticated
  with check (
    public.current_account_role() = 'admin'
    or (
      public.current_account_role() = 'reseller'
      and owner_id = public.current_customer_id()
    )
  );

create policy "account delete payments" on public.reseller_payments
  for delete to authenticated
  using (public.current_account_role() = 'admin');

grant select, insert, update, delete on public.customers to authenticated;
grant insert on public.customers to anon;
grant select, insert on public.reseller_payments to authenticated;

-- No password column is created: Supabase Auth stores salted password hashes in
-- auth.users, inaccessible to the browser and normal database clients.

-- ============================================================
--  SEED THE THREE PORTAL LOGINS
--  Creates the Supabase Auth users and links them to the
--  existing customer rows. Safe to re-run.
-- ============================================================
set search_path = public, extensions;

create extension if not exists pgcrypto;

do $seed$
declare
  seed record;
  existing_id uuid;
  new_id uuid;
begin
  for seed in
    select * from (values
      ('admin@toolsportal.com',      'admin123', 'Administrator',  'admin'),
      ('arhamresellar@gmail.com',    '12345678', 'Arham Reseller', 'reseller'),
      ('arhamsheikhx5555@gmail.com', '12345678', 'Arham Sheikh',   'user')
    ) as t(email, password, full_name, account_role)
  loop
    select id into existing_id from auth.users where lower(email) = seed.email;

    if existing_id is null then
      new_id := gen_random_uuid();

      -- The empty token strings matter: GoTrue cannot read NULL token
      -- columns and would reject the password login.
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token,
        email_change, email_change_token_new, email_change_token_current
      ) values (
        '00000000-0000-0000-0000-000000000000',
        new_id, 'authenticated', 'authenticated', seed.email,
        crypt(seed.password, gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('name', seed.full_name),
        '', '', '', '', ''
      );

      insert into auth.identities (
        id, provider_id, user_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), new_id::text, new_id,
        jsonb_build_object('sub', new_id::text, 'email', seed.email),
        'email', now(), now(), now()
      );

      existing_id := new_id;
    else
      -- Reset the password so the documented credentials always work.
      update auth.users
      set encrypted_password = crypt(seed.password, gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          confirmation_token = coalesce(confirmation_token, ''),
          recovery_token = coalesce(recovery_token, ''),
          email_change = coalesce(email_change, ''),
          email_change_token_new = coalesce(email_change_token_new, ''),
          email_change_token_current = coalesce(email_change_token_current, ''),
          updated_at = now()
      where id = existing_id;

      insert into auth.identities (
        id, provider_id, user_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      )
      select gen_random_uuid(), existing_id::text, existing_id,
             jsonb_build_object('sub', existing_id::text, 'email', seed.email),
             'email', now(), now(), now()
      where not exists (
        select 1 from auth.identities
        where user_id = existing_id and provider = 'email'
      );
    end if;

    -- Link the Auth user to its customer profile and apply the role.
    update public.customers
    set auth_user_id = existing_id,
        role = seed.account_role,
        status = 'active',
        name = coalesce(nullif(trim(name), ''), seed.full_name)
    where lower(email) = seed.email;

    if not found then
      insert into public.customers (
        id, auth_user_id, name, email, role, status, plan, fee, plan_days, tools
      ) values (
        'C' || replace(existing_id::text, '-', ''),
        existing_id, seed.full_name, seed.email, seed.account_role,
        'active', '', 0, 0, '[]'::jsonb
      );
    end if;
  end loop;
end
$seed$;

-- Verify: should list admin, reseller and user with an auth_user_id.
select email, role, customer_code, auth_user_id is not null as login_ready
from public.customers
order by role;
