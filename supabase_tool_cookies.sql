-- ============================================================
--  Tool cookie / access-method columns
--  Run once in the Supabase SQL Editor on PRODUCTION.
--  Does not seed cookie values (those stay in the database only).
--
--  After this runs, open Admin → Cookies and Save each one-click
--  tool again so tool_url / cookies_json / panel_referrer reach the DB.
--
--  Example that WORKS (ChatGPT pattern):
--    Access method = On one click
--    Destination URL = https://chatgpt.com/   (the real site — NOT toolaccess.click)
--    Cookies JSON   = paste from Chrome "Copy Cookies" for chatgpt.com
--    Panel unlock referrer = leave empty (not needed for real domains)
--
--  toolaccess.click panels (Semrush-style unlock):
--    URLs like https://semrush01.toolaccess.click/ often return
--    "403 Access Denied / Access from Pak seo tool dashboard".
--    Observed: Pak SEO (aMember) hosts the dashboard at
--    https://app.pakseotools.com/ — members open tool links from that
--    origin so the browser sends a natural Referer. Referer alone is
--    NOT enough (spoofed Referer without unlocked cookies still 403s).
--    AI Toolz Mart Access extension / tool-proxy can:
--      1) Apply admin cookie JSON to the toolaccess host (incl. PHPSESSID)
--      2) Temporarily rewrite Referer/Origin to the Panel unlock referrer
--         (prefer https://app.pakseotools.com/ — never /login)
--    Configure in Admin → Cookies:
--      Destination = https://semrush01.toolaccess.click/  (or your panel)
--      Cookies JSON = Copy Cookies from an ALREADY unlocked toolaccess session
--      Panel unlock referrer = https://app.pakseotools.com/
--    Members must install/reinstall AI Toolz Mart Access (v1.3.2+).
--
--  Honesty: this spoofs the Referer the panel asks for + applies cookies.
--  If the panel only accepts signed tokens issued by Pak SEO login, cookies
--  must come from an already-unlocked session; referrer alone is not enough.
--
--  Values that only lived in the admin browser localStorage will
--  NOT help production users until that re-save.
-- ============================================================

alter table tools
  add column if not exists access_method text not null default 'extension';

alter table tools
  add column if not exists tool_url text;

alter table tools
  add column if not exists cookies_json text;

-- Optional dashboard URL used as Referer when opening *.toolaccess.click
alter table tools
  add column if not exists panel_referrer text;

-- Fallback JSON bag used when older schemas lack dedicated columns
alter table tools
  add column if not exists extra jsonb default '{}'::jsonb;

alter table tools drop constraint if exists tools_access_method_check;
alter table tools add constraint tools_access_method_check
  check (access_method in ('extension', 'one_click'));

comment on column tools.access_method is 'extension = Chrome extension required; one_click = open destination URL (cookies applied via extension when present)';
comment on column tools.tool_url is 'Destination URL opened for one-click access (real tool site, e.g. https://chatgpt.com/). For *.toolaccess.click, also set panel_referrer + unlocked session cookies.';
comment on column tools.cookies_json is 'Admin-supplied Copy Cookies JSON array. Do not expose in public catalogs.';
comment on column tools.panel_referrer is 'Optional unlock Referer URL for toolaccess panels (prefer https://app.pakseotools.com/). Also stored in extra.panelReferrer / extra.unlockReferrer.';
comment on column tools.extra is 'JSON fallback for accessMethod / toolUrl / cookiesJson / panelReferrer when columns are unavailable';

-- Public catalog view without cookie payloads
create or replace view tools_public as
select
  id, name, category, rating, price, original_price, discount, favicon, badge,
  "desc", full_desc, features, use_cases, faqs, wa_text, is_private, is_semi_private,
  access_method, tool_url, created_at
from tools;

grant select on tools_public to anon, authenticated;

-- Optional audit (run manually): tools still pointing at toolaccess panels
-- select id, name, access_method, tool_url, panel_referrer,
--        extra->>'panelReferrer' as extra_panel_referrer
-- from tools
-- where tool_url ilike '%toolaccess.click%'
--    or (extra->>'toolUrl') ilike '%toolaccess.click%'
--    or (extra->>'tool_url') ilike '%toolaccess.click%';
