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
