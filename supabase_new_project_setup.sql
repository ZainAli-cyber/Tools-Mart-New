-- ============================================================
--  AI TOOLZ MART — Supabase Schema
--  Run this entire file in Supabase SQL Editor once.
--  Then provide your Project URL + anon key to connect the app.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Drop tables if re-running ─────────────────────────────────
drop table if exists activity_log   cascade;
drop table if exists notifications  cascade;
drop table if exists tickets        cascade;
drop table if exists coupons        cascade;
drop table if exists orders         cascade;
drop table if exists customers      cascade;
drop table if exists banners        cascade;
drop table if exists settings       cascade;
drop table if exists tools          cascade;

-- ════════════════════════════════════════════════════════════
--  TOOLS
-- ════════════════════════════════════════════════════════════
create table tools (
  id              text primary key,
  name            text not null,
  category        text not null default 'SEO',
  rating          numeric(3,1) not null default 4.9,
  price           integer not null default 0,
  original_price  integer not null default 0,
  discount        integer not null default 0,
  favicon         text,
  badge           text,
  "desc"          text,
  full_desc       text,
  features        jsonb  default '[]',
  use_cases       jsonb  default '[]',
  faqs            jsonb  default '[]',
  wa_text         text,
  is_private      boolean default false,
  is_semi_private boolean default false,
  access_method   text not null default 'extension',
  tool_url        text,
  cookies_json    text,
  panel_referrer  text,
  created_at      timestamptz default now()
);

-- Seed tools
insert into tools (id,name,category,rating,price,original_price,discount,favicon,badge,"desc",full_desc,features,use_cases,faqs,wa_text,is_private,is_semi_private) values
('semrush','Semrush','SEO',4.9,556,2780,80,'https://www.google.com/s2/favicons?sz=128&domain=semrush.com','Best Seller',
 'All-in-one SEO platform for keyword research, competitor analysis, backlink auditing & rank tracking.',
 'Semrush is the world''s leading SEO and digital marketing platform trusted by 10M+ professionals.',
 '["Keyword Research (20B+ keywords)","Competitor traffic analysis","Backlink audit & building","Site health audit","Rank tracking","Content marketing toolkit"]',
 '["SEO professionals","Digital marketing agencies","Content marketers","Bloggers"]',
 '[{"q":"Which plan?","a":"Guru-level access with full features."},{"q":"Competitor analysis?","a":"Yes, fully included."}]',
 'Semrush',false,false),

('canva-pro','Canva Pro','Design',4.9,556,2780,80,'https://www.google.com/s2/favicons?sz=128&domain=canva.com','Popular',
 'The world''s most popular design platform — Magic AI, brand kit & premium templates.',
 'Canva Pro is used by 170M+ people worldwide with Magic AI tools and 100M+ assets.',
 '["Magic AI design tools","Brand kit & logo upload","Background remover","100M+ premium assets","610,000+ templates","Unlimited storage"]',
 '["Social media managers","Marketing teams","Small businesses","Freelance designers"]',
 '[{"q":"Canva Free vs Pro?","a":"Pro unlocks Magic AI, background remover and premium templates."},{"q":"Commercial use?","a":"Yes, all Pro designs can be used commercially."}]',
 'Canva Pro',false,false),

('envato-elements','Envato Elements','Design',4.9,556,2780,80,'https://www.google.com/s2/favicons?sz=128&domain=envato.com',null,
 'Unlimited downloads of 16M+ creative assets — templates, fonts, photos, video, audio & more.',
 'Envato Elements gives you unlimited access to 16M+ premium creative assets.',
 '["16M+ creative assets","Unlimited downloads","Website themes","Stock photos & videos","Fonts & graphics","Commercial license"]',
 '["Graphic designers","Web developers","Content creators","Video producers"]',
 '[{"q":"Is this genuine?","a":"Yes, 100% verified group buy access."},{"q":"How fast?","a":"Within 5 minutes of payment."}]',
 'Envato Elements',false,false),

('chatgpt-plus','ChatGPT Plus','AI',4.9,1668,8340,80,'https://www.google.com/s2/favicons?sz=128&domain=openai.com','Trending',
 'GPT-4o, image generation, custom GPTs & code interpreter — semi-private seat.',
 'ChatGPT Plus gives you access to GPT-4o and DALL-E 3 image generation.',
 '["GPT-4o access","DALL·E 3 image generation","Advanced Data Analysis","Custom GPTs","Code Interpreter","Priority access"]',
 '["Content writers","Developers","Data analysts","Researchers"]',
 '[{"q":"Semi-private?","a":"2-3 users share the seat for near-private speed."},{"q":"GPT-4o included?","a":"Yes, fully accessible."}]',
 'ChatGPT Plus',false,true),

('capcut-pro','CapCut Pro','Video',4.9,1390,6950,80,'https://www.google.com/s2/favicons?sz=128&domain=capcut.com',null,
 'AI-powered video editor — effects, captions, background removal.',
 'CapCut Pro is a powerful AI video editor by ByteDance, loved by 300M+ creators.',
 '["AI video effects","Auto-captions","Background removal","Commercial music","Text-to-video AI","No watermark"]',
 '["TikTok creators","YouTubers","Social media managers"]',
 '[{"q":"Pro vs Free?","a":"Pro unlocks commercial music, AI effects, removes watermarks."},{"q":"Desktop?","a":"Yes, Windows and Mac."}]',
 'CapCut Pro',true,false),

('udemy','Udemy','Learning',4.9,556,2780,80,'https://www.google.com/s2/favicons?sz=128&domain=udemy.com',null,
 'Access 200,000+ online courses on tech, business, design & more.',
 'Udemy is the world''s largest online learning marketplace with 200,000+ courses.',
 '["200,000+ courses","Lifetime access","Certificate of completion","Mobile & offline","Multiple languages"]',
 '["Students","Developers","Designers","Marketers"]',
 '[{"q":"Which courses?","a":"Top-rated premium courses across all topics."},{"q":"Valid certificate?","a":"Yes, recognized by employers."}]',
 'Udemy',false,false);

-- ════════════════════════════════════════════════════════════
--  SETTINGS  (single row, id = 1)
-- ════════════════════════════════════════════════════════════
create table settings (
  id               integer primary key default 1,
  site_name        text    default 'AI TOOLZ MART',
  contact_email    text    default 'emaan@aitoolsmart.com',
  whatsapp         text    default '+923275855578',
  currency         text    default 'PKR',
  invoice_prefix   text    default 'INV',
  tax_percent      text    default '0',
  maintenance_mode boolean default false,
  easypaisa        text    default '03XX-XXXXXXX',
  jazzcash         text    default '03XX-XXXXXXX',
  paypal_email     text    default 'payments@aitoolzmart.com',
  bank_name        text    default 'Meezan Bank',
  bank_account     text    default '0123456789',
  constraint single_row check (id = 1)
);
insert into settings default values;

-- ════════════════════════════════════════════════════════════
--  CUSTOMERS
-- ════════════════════════════════════════════════════════════
create table customers (
  id            text primary key default 'C' || extract(epoch from now())::bigint,
  name          text not null,
  email         text,
  phone         text,
  country       text default 'Pakistan',
  city          text,
  total_orders  integer default 0,
  total_spend   integer default 0,
  join_date     date default current_date,
  status        text default 'active',
  tools         jsonb default '[]',
  notes         text default '',
  created_at    timestamptz default now()
);

-- ════════════════════════════════════════════════════════════
--  ORDERS
-- ════════════════════════════════════════════════════════════
create table orders (
  id               text primary key,
  invoice_no       text unique,
  order_date       date default current_date,
  customer_id      text references customers(id) on delete set null,
  customer_name    text not null,
  customer_email   text,
  customer_phone   text,
  customer_city    text,
  whatsapp         text,
  tool             text not null,
  tool_id          text references tools(id) on delete set null,
  duration         integer not null default 1,
  quantity         integer default 1,
  amount           integer not null default 0,
  discount         integer default 0,
  final_amount     integer not null default 0,
  status           text default 'pending',
  payment_method   text default 'whatsapp',
  payment_status   text default 'pending',
  transaction_id   text default '',
  notes            text default '',
  admin_notes      text default '',
  coupon_code      text default '',
  sub_status       text default 'pending',
  activation_date  date,
  expiry_date      date,
  days_left        integer default 0,
  screenshot       text,
  created_at       timestamptz default now()
);

-- ════════════════════════════════════════════════════════════
--  COUPONS
-- ════════════════════════════════════════════════════════════
create table coupons (
  id           text primary key default 'CPN' || extract(epoch from now())::bigint,
  code         text unique not null,
  type         text not null default 'percent',
  value        integer not null default 10,
  usage_limit  integer default 100,
  used_count   integer default 0,
  expiry       date,
  active       boolean default true,
  min_purchase integer default 0,
  created_at   timestamptz default now()
);

-- ════════════════════════════════════════════════════════════
--  TICKETS
-- ════════════════════════════════════════════════════════════
create table tickets (
  id             text primary key default 'T' || extract(epoch from now())::bigint,
  customer_name  text not null,
  customer_email text,
  subject        text not null,
  message        text not null,
  status         text default 'open',
  priority       text default 'medium',
  replies        jsonb default '[]',
  created_at     timestamptz default now()
);

-- ════════════════════════════════════════════════════════════
--  NOTIFICATIONS
-- ════════════════════════════════════════════════════════════
create table notifications (
  id         text primary key default 'N' || extract(epoch from now())::bigint,
  type       text default 'info',
  title      text not null,
  message    text not null,
  "time"     text default 'just now',
  "read"     boolean default false,
  audience   text default 'admin',
  recipient_id text,
  created_at timestamptz default now()
);

-- ════════════════════════════════════════════════════════════
--  BANNERS
-- ════════════════════════════════════════════════════════════
create table banners (
  id         text primary key default 'BNR' || extract(epoch from now())::bigint,
  image_url  text not null,
  link       text default '',
  active     boolean default true,
  order_num  integer default 0,
  created_at timestamptz default now()
);

-- ════════════════════════════════════════════════════════════
--  ACTIVITY LOG
-- ════════════════════════════════════════════════════════════
create table activity_log (
  id         text primary key default 'ACT' || extract(epoch from now())::bigint,
  action     text not null,
  detail     text,
  created_at timestamptz default now()
);

-- ════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════
-- Enable RLS on all tables
alter table tools          enable row level security;
alter table settings       enable row level security;
alter table customers      enable row level security;
alter table orders         enable row level security;
alter table coupons        enable row level security;
alter table tickets        enable row level security;
alter table notifications  enable row level security;
alter table banners        enable row level security;
alter table activity_log   enable row level security;

-- ── Public read (customer-facing) ────────────────────────────
-- Tools: anyone can read
create policy "public read tools" on tools
  for select using (true);

-- Banners: anyone can read active banners
create policy "public read banners" on banners
  for select using (active = true);

-- Orders: public can INSERT (customer submitting order)
create policy "public insert orders" on orders
  for insert with check (true);

-- Tickets: public can INSERT (customer submitting ticket)
create policy "public insert tickets" on tickets
  for insert with check (true);

-- Coupons: public can read active coupons (for validation)
create policy "public read coupons" on coupons
  for select using (active = true);

-- ── Admin full access (service role / anon for now) ───────────
-- NOTE: In production, use Supabase Auth + JWT claims.
-- For now, all operations work via anon key (your admin panel is
-- password-protected at the app level).

create policy "admin all tools"         on tools         for all using (true) with check (true);
create policy "admin all settings"      on settings      for all using (true) with check (true);
create policy "admin all customers"     on customers     for all using (true) with check (true);
create policy "admin all orders"        on orders        for all using (true) with check (true);
create policy "admin all coupons"       on coupons       for all using (true) with check (true);
create policy "admin all tickets"       on tickets       for all using (true) with check (true);
create policy "admin all notifications" on notifications for all using (true) with check (true);
create policy "admin all banners"       on banners       for all using (true) with check (true);
create policy "admin all activity"      on activity_log  for all using (true) with check (true);

-- ════════════════════════════════════════════════════════════
--  USEFUL VIEWS
-- ════════════════════════════════════════════════════════════

-- Dashboard summary view
create or replace view dashboard_stats as
select
  count(*)                                              as total_orders,
  count(*) filter (where status = 'approved')          as approved_orders,
  count(*) filter (where status = 'pending')           as pending_orders,
  count(*) filter (where status = 'rejected')          as rejected_orders,
  count(*) filter (where status = 'refunded')          as refunded_orders,
  coalesce(sum(final_amount) filter (where status = 'approved'), 0) as total_revenue,
  count(*) filter (where sub_status = 'active')        as active_subscriptions,
  count(*) filter (where sub_status = 'expired')       as expired_subscriptions,
  count(*) filter (where days_left between 0 and 5 and sub_status = 'active') as expiring_soon,
  count(*) filter (where order_date = current_date)    as today_orders
from orders;

-- ════════════════════════════════════════════════════════════
--  DONE — Your Supabase database is ready.
--
--  Next steps:
--  1. Go to your Supabase project → Settings → API
--  2. Copy "Project URL" and "anon public" key
--  3. Send them to Claude to wire up the frontend
-- ════════════════════════════════════════════════════════════

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
