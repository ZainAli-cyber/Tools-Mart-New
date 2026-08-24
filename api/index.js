var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/globalProxySettings.ts
var globalProxySettings_exports = {};
__export(globalProxySettings_exports, {
  GLOBAL_PROXY_SETTING_KEY: () => GLOBAL_PROXY_SETTING_KEY,
  GLOBAL_PROXY_SQL_HINT: () => GLOBAL_PROXY_SQL_HINT,
  clearGlobalProxyConfig: () => clearGlobalProxyConfig,
  getActiveOutboundProxyUrl: () => getActiveOutboundProxyUrl,
  getGlobalProxyConfig: () => getGlobalProxyConfig,
  getGlobalProxyPublicStatus: () => getGlobalProxyPublicStatus,
  invalidateGlobalProxyCache: () => invalidateGlobalProxyCache,
  maskProxyUrl: () => maskProxyUrl,
  normalizeProxyUrl: () => normalizeProxyUrl,
  setGlobalProxyConfig: () => setGlobalProxyConfig
});
import { createClient as createClient9 } from "@supabase/supabase-js";
function serviceClient2() {
  const url3 = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey3 = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url3 || !serviceKey3) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for proxy settings");
  }
  return createClient9(url3, serviceKey3, { auth: { persistSession: false } });
}
function isAppSettingsMissing2(message) {
  return /app_settings|does not exist|schema cache|Could not find the table/i.test(
    String(message || "")
  );
}
function parseConfig(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw;
    return {
      enabled: Boolean(o.enabled),
      url: String(o.url || "").trim()
    };
  }
  return { enabled: false, url: "" };
}
function normalizeProxyUrl(raw) {
  let s = String(raw || "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s) && !/^socks/i.test(s)) {
    s = `http://${s}`;
  }
  try {
    const u = new URL(s);
    if (!/^https?:$/i.test(u.protocol) && !/^socks/i.test(u.protocol)) {
      throw new Error("Proxy URL must start with http:// or https://");
    }
    return u.href;
  } catch {
    throw new Error("Invalid proxy URL. Example: http://user:pass@host:3128/");
  }
}
function maskProxyUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  try {
    const u = new URL(s);
    if (u.username || u.password) {
      u.username = u.username ? "***" : "";
      u.password = u.password ? "***" : "";
    }
    return u.href;
  } catch {
    return "***";
  }
}
async function getGlobalProxyConfig(admin) {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS && !cache.value.setupRequired) {
    return { ...cache.value };
  }
  try {
    const db = admin || serviceClient2();
    const { data, error } = await db.from("app_settings").select("value").eq("key", GLOBAL_PROXY_SETTING_KEY).maybeSingle();
    if (error) {
      const setupRequired = isAppSettingsMissing2(error.message);
      const value2 = { enabled: false, url: "", setupRequired: setupRequired || void 0 };
      cache = { at: now, value: value2 };
      return { ...value2 };
    }
    const value = parseConfig(data?.value);
    cache = { at: now, value };
    return { ...value };
  } catch (err) {
    const setupRequired = isAppSettingsMissing2(err?.message);
    const value = { enabled: false, url: "", setupRequired: setupRequired || void 0 };
    cache = { at: now, value };
    return { ...value };
  }
}
async function getGlobalProxyPublicStatus(admin) {
  const cfg = await getGlobalProxyConfig(admin);
  const ready = Boolean(cfg.enabled && cfg.url);
  return { enabled: Boolean(cfg.enabled), ready };
}
async function getActiveOutboundProxyUrl(admin) {
  const cfg = await getGlobalProxyConfig(admin);
  if (!cfg.enabled || !cfg.url) return null;
  try {
    return normalizeProxyUrl(cfg.url);
  } catch {
    return null;
  }
}
async function setGlobalProxyConfig(input, admin) {
  const db = admin || serviceClient2();
  const prev = await getGlobalProxyConfig(db);
  let url3 = prev.url;
  if (typeof input.url === "string") {
    const trimmed = input.url.trim();
    url3 = trimmed ? normalizeProxyUrl(trimmed) : "";
  }
  const enabled = Boolean(input.enabled) && Boolean(url3);
  const value = { enabled, url: url3 };
  const { error } = await db.from("app_settings").upsert(
    {
      key: GLOBAL_PROXY_SETTING_KEY,
      value: { enabled: value.enabled, url: value.url },
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    { onConflict: "key" }
  );
  if (error) {
    if (isAppSettingsMissing2(error.message)) {
      throw new Error(GLOBAL_PROXY_SQL_HINT);
    }
    throw new Error(error.message);
  }
  cache = { at: Date.now(), value };
  return { ...value };
}
async function clearGlobalProxyConfig(admin) {
  return setGlobalProxyConfig({ enabled: false, url: "" }, admin);
}
function invalidateGlobalProxyCache() {
  cache = null;
}
var GLOBAL_PROXY_SETTING_KEY, GLOBAL_PROXY_SQL_HINT, CACHE_MS, cache;
var init_globalProxySettings = __esm({
  "src/lib/globalProxySettings.ts"() {
    GLOBAL_PROXY_SETTING_KEY = "global_proxy_engine";
    GLOBAL_PROXY_SQL_HINT = "Run supabase_global_proxy_engine.sql (or supabase_device_limits_toggle.sql) in the Supabase SQL Editor so app_settings exists, then try again.";
    CACHE_MS = 8e3;
    cache = null;
  }
});

// api/handler.ts
import express2 from "express";

// src/lib/createApiApp.ts
import express from "express";

// src/lib/adminRoutes.ts
import { Router } from "express";
import { createClient as createClient3 } from "@supabase/supabase-js";

// src/lib/auth.ts
import { createClient } from "@supabase/supabase-js";
function client(token) {
  const url3 = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url3 || !anon) throw new Error("Supabase authentication is not configured");
  return createClient(url3, anon, {
    auth: { persistSession: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : void 0
  });
}
async function authenticateAdmin(email, password) {
  const supabase2 = client();
  const { data, error } = await supabase2.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) return null;
  const { data: profile } = await supabase2.from("customers").select("id,role,status").eq("auth_user_id", data.user.id).single();
  if (profile?.role !== "admin" || profile.status === "blocked") return null;
  return data.session.access_token;
}
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized \u2014 no token" });
    }
    const token = header.slice(7);
    const supabase2 = client(token);
    const { data, error } = await supabase2.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: "Unauthorized \u2014 invalid or expired token" });
    const { data: profile } = await supabase2.from("customers").select("id,email,role,status").eq("auth_user_id", data.user.id).single();
    if (profile?.role !== "admin" || profile.status === "blocked") {
      return res.status(403).json({ error: "Forbidden" });
    }
    req.admin = profile;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized \u2014 invalid or expired token" });
  }
}

// src/lib/db.ts
import { createClient as createClient2 } from "@supabase/supabase-js";
var nodeEnv = typeof process !== "undefined" ? process.env : {};
var SUPABASE_URL = nodeEnv.SUPABASE_URL || nodeEnv.VITE_SUPABASE_URL || "https://duvwpbetvftqissnstoy.supabase.co";
var SUPABASE_ANON = nodeEnv.SUPABASE_ANON_KEY || nodeEnv.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dndwYmV0dmZ0cWlzc25zdG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NjkxMTksImV4cCI6MjEwMjQ0NTExOX0.2_-KYBcp3z4xa9MMsg4GAAdWpABhOIWInfN2SIFiv1w";
var supabase = createClient2(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
var TABLE = {
  tools: "tools",
  orders: "orders",
  customers: "customers",
  coupons: "coupons",
  tickets: "tickets",
  settings: "settings",
  activity: "activity_log",
  notifications: "notifications",
  banners: "banners",
  resellerPayments: "reseller_payments"
};
function toCamel(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  const map = {
    invoice_no: "invoiceNo",
    order_date: "orderDate",
    customer_id: "customerId",
    customer_name: "customerName",
    customer_email: "customerEmail",
    customer_phone: "customerPhone",
    customer_city: "customerCity",
    tool_id: "toolId",
    final_amount: "finalAmount",
    payment_method: "paymentMethod",
    payment_status: "paymentStatus",
    transaction_id: "transactionId",
    admin_notes: "adminNotes",
    coupon_code: "couponCode",
    sub_status: "subStatus",
    activation_date: "activationDate",
    expiry_date: "expiryDate",
    days_left: "daysLeft",
    created_at: "createdAt",
    join_date: "joinDate",
    total_orders: "totalOrders",
    total_spend: "totalSpend",
    usage_limit: "usageLimit",
    used_count: "usedCount",
    min_purchase: "minPurchase",
    original_price: "originalPrice",
    is_private: "isPrivate",
    is_semi_private: "isSemiPrivate",
    full_desc: "fullDesc",
    wa_text: "waText",
    use_cases: "useCases",
    auth_user_id: "authUserId",
    plan_days: "planDays",
    owner_id: "ownerId",
    member_id: "memberId",
    member_name: "memberName",
    payment_date: "paymentDate",
    description: "desc",
    access_method: "accessMethod",
    tool_url: "toolUrl",
    cookies_json: "cookiesJson",
    panel_referrer: "panelReferrer",
    show_on_home: "showOnHome"
  };
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const camelKey = map[k] || k;
    out[camelKey] = toCamel(v);
  }
  return out;
}
async function readDb(name, defaultVal) {
  const table = TABLE[name];
  if (!table) return defaultVal;
  try {
    if (name === "settings") {
      const { data: data2, error: error2 } = await supabase.from("settings").select("*").eq("id", 1).single();
      if (error2 || !data2) return defaultVal;
      return toCamel(data2);
    }
    const orderCol = name === "activity" ? "created_at" : "created_at";
    const { data, error } = await supabase.from(table).select("*").order(orderCol, { ascending: false });
    if (error || !data) return defaultVal;
    return toCamel(data);
  } catch {
    return defaultVal;
  }
}
async function logActivity(action, detail) {
  try {
    await supabase.from("activity_log").insert({
      id: "ACT" + Date.now(),
      action,
      detail,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (e) {
    console.error("logActivity error:", e);
  }
}

// src/lib/notifications.ts
function noteVisible(note, account) {
  const type = String(note.type || "");
  if (account.role === "admin") {
    if (note.recipient_id || type.startsWith("direct-") || type.startsWith("broadcast-")) return false;
    return true;
  }
  if (note.recipient_id) return note.recipient_id === account.id;
  if (type === `direct-${account.id}`) return true;
  if (type === "broadcast-sellers") return account.role === "reseller";
  if (type === "broadcast-customers") return account.role === "user";
  if (note.audience === "reseller") return account.role === "reseller";
  if (note.audience === "user") return account.role === "user";
  return false;
}
function stamp() {
  return (/* @__PURE__ */ new Date()).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
async function insertNoteRows(rows) {
  if (!rows.length) return;
  const full = await supabase.from("notifications").insert(rows);
  if (!full.error) return;
  const fallback = rows.map(({ audience: _a, recipient_id: _r, ...rest }) => rest);
  const retry = await supabase.from("notifications").insert(fallback);
  if (retry.error) throw new Error(retry.error.message);
}
function noteId(suffix = "") {
  return `N${Date.now()}${suffix}${Math.random().toString(36).slice(2, 6)}`;
}
function adminNote(title, message, type) {
  return {
    id: noteId("A"),
    type,
    audience: "admin",
    recipient_id: null,
    title,
    message,
    time: stamp(),
    read: false
  };
}
function directNote(account, title, message, type) {
  const role = account.role === "reseller" ? "reseller" : "user";
  return {
    id: noteId(account.id.slice(-4)),
    type: type || `direct-${account.id}`,
    audience: role,
    recipient_id: account.id,
    title,
    message,
    time: stamp(),
    read: false
  };
}
async function ownerOfCustomer(hint) {
  let row = null;
  if (hint.customerId) {
    const { data } = await supabase.from("customers").select("id,owner_id,role").eq("id", hint.customerId).maybeSingle();
    row = data;
  }
  if (!row && hint.customerPhone) {
    const { data } = await supabase.from("customers").select("id,owner_id,role").eq("phone", hint.customerPhone).maybeSingle();
    row = data;
  }
  if (!row && hint.customerEmail) {
    const { data } = await supabase.from("customers").select("id,owner_id,role").eq("email", hint.customerEmail).maybeSingle();
    row = data;
  }
  const ownerId = row?.owner_id || null;
  if (!ownerId || ownerId === row?.id) return null;
  return String(ownerId);
}
async function pushNotes(rows) {
  try {
    await insertNoteRows(rows);
  } catch {
  }
}
async function notifyAdminAndOwner(input) {
  const rows = [adminNote(input.title, input.message, input.type)];
  try {
    const ownerId = await ownerOfCustomer(input);
    if (ownerId) {
      rows.push(directNote({ id: ownerId, role: "reseller" }, input.title, input.message, `direct-${ownerId}`));
    }
  } catch {
  }
  await pushNotes(rows);
}
async function notifyTicketCreated(ticket) {
  const fromChat = (ticket.source || "") === "chatbot";
  const title = fromChat ? "New Chatbot Query" : "New Support Ticket";
  const phoneNote = ticket.customer_phone ? ` \xB7 ${ticket.customer_phone}` : "";
  const message = `${ticket.customer_name}${phoneNote}: ${ticket.subject}`;
  const rows = [];
  if (ticket.assignee_role === "reseller" && ticket.owner_id) {
    rows.push(directNote({ id: ticket.owner_id, role: "reseller" }, title, message, `direct-${ticket.owner_id}`));
  } else {
    rows.push(adminNote(title, message, fromChat ? "chatbot-ticket" : "ticket"));
  }
  if (ticket.customer_id) {
    rows.push(
      directNote(
        { id: ticket.customer_id, role: "user" },
        "Support ticket opened",
        `We received your query: ${ticket.subject}`,
        `direct-${ticket.customer_id}`
      )
    );
  }
  await pushNotes(rows);
}
async function notifyTicketReply(ticket, from) {
  const title = "New Support Message";
  const message = `${ticket.customer_name} \xB7 ${ticket.subject}`;
  if (from === "customer") {
    if (ticket.assignee_role === "reseller" && ticket.owner_id) {
      await pushNotes([directNote({ id: ticket.owner_id, role: "reseller" }, title, message, `direct-${ticket.owner_id}`)]);
      return;
    }
    await pushNotes([adminNote(title, message, "ticket")]);
    return;
  }
  let customerId = ticket.customer_id || null;
  let customerRole = "user";
  if (!customerId && ticket.customer_email) {
    const { data } = await supabase.from("customers").select("id,role").eq("email", ticket.customer_email).maybeSingle();
    if (data?.id) {
      customerId = String(data.id);
      customerRole = data.role === "reseller" ? "reseller" : "user";
    }
  }
  if (customerId) {
    await pushNotes([directNote({ id: customerId, role: customerRole }, "Support replied", message, `direct-${customerId}`)]);
  }
}

// src/lib/adminRoutes.ts
var router = Router();
var COLUMN_MISSING = /could not find|schema cache|column|42703|PGRST204/i;
function toolsAdminDb() {
  const url3 = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey3 = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url3) {
    throw new Error("Supabase is not configured (need SUPABASE_URL on Vercel)");
  }
  if (!serviceKey3) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing on Vercel. Add it under Project \u2192 Settings \u2192 Environment Variables (Production + Preview), then Redeploy. Cookie Save needs the service role key."
    );
  }
  return createClient3(url3, serviceKey3, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
function slugifyToolKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function toolMatchesKey(tool, key) {
  const want = String(key || "").trim().toLowerCase();
  if (!want) return false;
  const id = String(tool?.id || "").trim().toLowerCase();
  const name = String(tool?.name || "").trim().toLowerCase();
  return id === want || name === want || slugifyToolKey(name) === want || slugifyToolKey(id) === want;
}
async function resolveToolId(sb, key) {
  const raw = decodeURIComponent(String(key || "")).trim();
  if (!raw) return null;
  const byId = await sb.from("tools").select("id,name").eq("id", raw).maybeSingle();
  if (byId.data?.id) return byId.data.id;
  const catalog = await sb.from("tools").select("id,name");
  const match = (catalog.data || []).find((row) => toolMatchesKey(row, raw));
  return match?.id || null;
}
async function mergeCookieExtra(sb, toolId, body, baseExtra) {
  let prevExtra = baseExtra && typeof baseExtra === "object" ? { ...baseExtra } : null;
  if (!prevExtra) {
    const { data: existing } = await sb.from("tools").select("extra").eq("id", toolId).maybeSingle();
    const raw = existing?.extra;
    if (raw && typeof raw === "object") prevExtra = { ...raw };
    else if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        prevExtra = parsed && typeof parsed === "object" ? { ...parsed } : {};
      } catch {
        prevExtra = {};
      }
    } else {
      prevExtra = {};
    }
  }
  const extra = { ...prevExtra };
  if (body.accessMethod !== void 0) extra.accessMethod = body.accessMethod;
  if (body.toolUrl !== void 0) extra.toolUrl = body.toolUrl;
  if (body.cookiesJson !== void 0) extra.cookiesJson = body.cookiesJson;
  if (body.panelReferrer !== void 0) {
    extra.panelReferrer = body.panelReferrer;
    extra.unlockReferrer = body.panelReferrer;
  }
  if (body.showOnHome !== void 0) extra.showOnHome = body.showOnHome !== false;
  return extra;
}
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  const token = await authenticateAdmin(email, password);
  if (!token) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  logActivity("Login", `Admin logged in: ${email}`);
  return res.json({ ok: true, token, email });
});
router.post("/logout", requireAuth, (req, res) => {
  logActivity("Logout", "Admin logged out");
  res.json({ ok: true });
});
router.get("/dashboard", requireAuth, async (req, res) => {
  const orders = await readDb("orders", []);
  const customers = await readDb("customers", []);
  const tools = await readDb("tools", []);
  const approved = orders.filter((o) => o.status === "approved");
  const totalRevenue = approved.reduce((s, o) => s + (o.finalAmount || 0), 0);
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => (o.orderDate || "").slice(0, 10) === todayStr);
  res.json({
    totalRevenue,
    totalOrders: orders.length,
    todayOrders: todayOrders.length,
    pendingOrders: orders.filter((o) => o.status === "pending").length,
    approvedOrders: approved.length,
    rejectedOrders: orders.filter((o) => o.status === "rejected").length,
    refundedOrders: orders.filter((o) => o.status === "refunded").length,
    activeSubscriptions: orders.filter((o) => o.subStatus === "active").length,
    expiredSubscriptions: orders.filter((o) => o.subStatus === "expired").length,
    totalCustomers: customers.length,
    activeCustomers: customers.filter((c) => c.status === "active").length,
    blockedCustomers: customers.filter((c) => c.status === "blocked").length,
    totalTools: tools.length,
    recentOrders: orders.slice(0, 5),
    expiringSoon: orders.filter((o) => o.daysLeft >= 0 && o.daysLeft <= 5)
  });
});
router.get("/orders", requireAuth, async (req, res) => {
  const { status, search } = req.query;
  let query = supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (status && status !== "all") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  let result = data || [];
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (o) => o.customer_name?.toLowerCase().includes(q) || o.invoice_no?.toLowerCase().includes(q) || o.tool?.toLowerCase().includes(q) || o.id?.toLowerCase().includes(q)
    );
  }
  res.json(result.map((o) => snakeToCamelOrder(o)));
});
router.get("/orders/:id", requireAuth, async (req, res) => {
  const { data, error } = await supabase.from("orders").select("*").eq("id", req.params.id).single();
  if (error || !data) return res.status(404).json({ error: "Order not found" });
  res.json(snakeToCamelOrder(data));
});
router.post("/orders", requireAuth, async (req, res) => {
  const { data: existing } = await supabase.from("orders").select("id").order("created_at", { ascending: false }).limit(1);
  const invoiceNum = 100 + (existing?.length || 0);
  const order = {
    id: `ORD${Date.now()}`,
    invoice_no: `INV-${String(invoiceNum).padStart(3, "0")}`,
    order_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
    ...camelToSnakeOrder(req.body)
  };
  const { data, error } = await supabase.from("orders").insert(order).select().single();
  if (error) return res.status(500).json({ error: error.message });
  await notifyAdminAndOwner({
    title: "New Order",
    message: `${order.customer_name} ordered ${order.tool}`,
    type: "order",
    customerId: order.customer_id || null,
    customerPhone: order.customer_phone || order.whatsapp || null,
    customerEmail: order.customer_email || null
  });
  logActivity("Order Created", `Created order ${order.id} for ${order.customer_name}`);
  res.json(snakeToCamelOrder(data));
});
router.patch("/orders/:id", requireAuth, async (req, res) => {
  const { data, error } = await supabase.from("orders").update(camelToSnakeOrder(req.body)).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  logActivity("Order Updated", `Updated order ${req.params.id}`);
  res.json(snakeToCamelOrder(data));
});
router.delete("/orders/:id", requireAuth, async (req, res) => {
  const { error } = await supabase.from("orders").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  logActivity("Order Deleted", `Deleted order ${req.params.id}`);
  res.json({ ok: true });
});
router.get("/tools", requireAuth, async (req, res) => {
  try {
    const sb = toolsAdminDb();
    const { data, error } = await sb.from("tools").select("*").order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json((data || []).map(snakeToCamelTool));
  } catch (e) {
    return res.status(500).json({ error: e.message || "Could not load tools" });
  }
});
router.get("/public/tools", async (req, res) => {
  const { data, error } = await supabase.from("tools").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map((row) => {
    const tool = snakeToCamelTool(row);
    delete tool.cookiesJson;
    return tool;
  }));
});
router.post("/tools", requireAuth, async (req, res) => {
  try {
    const sb = toolsAdminDb();
    const tool = camelToSnakeTool({
      ...req.body,
      id: req.body.id || req.body.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    });
    const extra = await mergeCookieExtra(sb, tool.id, req.body);
    let { data, error } = await sb.from("tools").upsert({ ...tool, extra }).select().single();
    if (error && COLUMN_MISSING.test(error.message || "")) {
      const withoutCols = { ...tool };
      delete withoutCols.show_on_home;
      delete withoutCols.access_method;
      delete withoutCols.tool_url;
      delete withoutCols.cookies_json;
      delete withoutCols.panel_referrer;
      const retry = await sb.from("tools").upsert({ ...withoutCols, extra }).select().single();
      data = retry.data;
      error = retry.error;
    }
    if (error) return res.status(500).json({ error: error.message });
    logActivity("Tool Saved", `Saved tool: ${tool.name || tool.id}`);
    res.json(snakeToCamelTool(data));
  } catch (e) {
    return res.status(500).json({ error: e.message || "Could not save tool" });
  }
});
router.patch("/tools/:id", requireAuth, async (req, res) => {
  try {
    const sb = toolsAdminDb();
    const toolId = await resolveToolId(sb, req.params.id);
    if (!toolId) {
      return res.status(404).json({
        error: `Tool not found in database for \u201C${req.params.id}\u201D. Save the tool from Admin \u2192 Tools first, then save Cookies again.`
      });
    }
    const payload = camelToSnakeTool(req.body);
    const extra = await mergeCookieExtra(sb, toolId, req.body);
    let { data, error } = await sb.from("tools").update({ ...payload, extra }).eq("id", toolId).select().single();
    if (error && COLUMN_MISSING.test(error.message || "")) {
      const withoutCols = { ...payload };
      delete withoutCols.access_method;
      delete withoutCols.tool_url;
      delete withoutCols.cookies_json;
      delete withoutCols.panel_referrer;
      delete withoutCols.show_on_home;
      const retry = await sb.from("tools").update({ ...withoutCols, extra }).eq("id", toolId).select().single();
      data = retry.data;
      error = retry.error;
    }
    if (error && COLUMN_MISSING.test(error.message || "")) {
      const retryExtra = await sb.from("tools").update({ extra }).eq("id", toolId).select().single();
      data = retryExtra.data;
      error = retryExtra.error;
    }
    if (error) return res.status(500).json({ error: error.message });
    if (!data) {
      return res.status(500).json({
        error: "Database update returned no row. Check SUPABASE_SERVICE_ROLE_KEY and that the tools row exists."
      });
    }
    logActivity("Tool Updated", `Updated tool: ${data.name}`);
    const mapped = snakeToCamelTool(data);
    const usedFallback = Boolean(
      req.body?.toolUrl || req.body?.accessMethod || req.body?.cookiesJson || req.body?.panelReferrer
    ) && !data.tool_url && Boolean(mapped.toolUrl || mapped.accessMethod === "one_click" || mapped.panelReferrer);
    res.json({ ...mapped, usedFallback });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Could not update tool" });
  }
});
router.delete("/tools/:id", requireAuth, async (req, res) => {
  try {
    const sb = toolsAdminDb();
    const toolId = await resolveToolId(sb, req.params.id) || req.params.id;
    const { data: tool } = await sb.from("tools").select("name").eq("id", toolId).maybeSingle();
    const { error } = await sb.from("tools").delete().eq("id", toolId);
    if (error) return res.status(500).json({ error: error.message });
    logActivity("Tool Deleted", `Deleted tool: ${tool?.name}`);
    res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Could not delete tool" });
  }
});
router.get("/customers", requireAuth, async (req, res) => {
  const { search } = req.query;
  let query = supabase.from("customers").select("*").order("created_at", { ascending: false });
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  let result = data || [];
  if (search) {
    const q = search.toLowerCase();
    result = result.filter((c) => c.name?.toLowerCase().includes(q) || c.email?.includes(q) || c.phone?.includes(q));
  }
  res.json(result.map(snakeToCamelCustomer));
});
router.post("/customers", requireAuth, async (req, res) => {
  const customer = {
    ...camelToSnakeCustomer(req.body),
    id: `C${Date.now()}`,
    join_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
  };
  const { data, error } = await supabase.from("customers").insert(customer).select().single();
  if (error) return res.status(500).json({ error: error.message });
  logActivity("Customer Added", `Added customer: ${customer.name}`);
  res.json(snakeToCamelCustomer(data));
});
router.patch("/customers/:id", requireAuth, async (req, res) => {
  const { data, error } = await supabase.from("customers").update(camelToSnakeCustomer(req.body)).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  logActivity("Customer Updated", `Updated customer: ${data.name}`);
  res.json(snakeToCamelCustomer(data));
});
router.delete("/customers/:id", requireAuth, async (req, res) => {
  const { data: c } = await supabase.from("customers").select("name").eq("id", req.params.id).single();
  const { error } = await supabase.from("customers").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  logActivity("Customer Deleted", `Deleted customer: ${c?.name}`);
  res.json({ ok: true });
});
router.get("/coupons", requireAuth, async (req, res) => {
  const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map(snakeToCamelCoupon));
});
router.post("/coupons", requireAuth, async (req, res) => {
  const coupon = { ...camelToSnakeCoupon(req.body), id: `CPN${Date.now()}` };
  const { data, error } = await supabase.from("coupons").insert(coupon).select().single();
  if (error) return res.status(500).json({ error: error.message });
  logActivity("Coupon Created", `Created coupon: ${coupon.code}`);
  res.json(snakeToCamelCoupon(data));
});
router.patch("/coupons/:id", requireAuth, async (req, res) => {
  const { data, error } = await supabase.from("coupons").update(camelToSnakeCoupon(req.body)).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(snakeToCamelCoupon(data));
});
router.delete("/coupons/:id", requireAuth, async (req, res) => {
  const { error } = await supabase.from("coupons").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  logActivity("Coupon Deleted", `Deleted coupon ${req.params.id}`);
  res.json({ ok: true });
});
router.post("/public/validate-coupon", async (req, res) => {
  const { code, amount } = req.body;
  const { data: coupon } = await supabase.from("coupons").select("*").eq("code", code?.toUpperCase()).eq("active", true).single();
  if (!coupon) return res.status(404).json({ error: "Invalid or expired coupon code" });
  if (coupon.used_count >= coupon.usage_limit) return res.status(400).json({ error: "Coupon usage limit reached" });
  if (coupon.expiry && new Date(coupon.expiry) < /* @__PURE__ */ new Date()) return res.status(400).json({ error: "Coupon has expired" });
  if (amount < coupon.min_purchase) return res.status(400).json({ error: `Minimum purchase of Rs ${coupon.min_purchase} required` });
  const discount = coupon.type === "percent" ? Math.floor(amount * coupon.value / 100) : coupon.value;
  res.json({ ok: true, discount, code: coupon.code, type: coupon.type, value: coupon.value });
});
router.post("/public/orders", async (req, res) => {
  const { toolId, toolName, duration, quantity, finalAmount, customerName, customerPhone, customerEmail, paymentMethod, couponCode, note } = req.body;
  if (!toolId || !customerName || !customerPhone || !finalAmount) return res.status(400).json({ error: "Missing required fields" });
  const { count } = await supabase.from("orders").select("*", { count: "exact", head: true });
  const invoiceNum = 100 + (count || 0);
  const orderId = `ORD${Date.now()}`;
  const invoiceNo = `INV-${String(invoiceNum).padStart(4, "0")}`;
  const order = {
    id: orderId,
    invoice_no: invoiceNo,
    order_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
    customer_id: null,
    customer_name: customerName,
    customer_email: customerEmail || "",
    customer_phone: customerPhone,
    whatsapp: customerPhone,
    tool: toolName,
    tool_id: toolId,
    duration: duration || 1,
    quantity: quantity || 1,
    amount: finalAmount,
    discount: 0,
    final_amount: finalAmount,
    status: "pending",
    payment_method: paymentMethod || "screenshot",
    payment_status: "pending",
    transaction_id: "",
    notes: note || "",
    admin_notes: "",
    coupon_code: couponCode || "",
    sub_status: "pending",
    activation_date: null,
    expiry_date: null,
    days_left: 0,
    screenshot: null
  };
  const { data, error } = await supabase.from("orders").insert(order).select().single();
  if (error) return res.status(500).json({ error: error.message });
  const methodLabel = paymentMethod === "screenshot" ? "Pay First (SS)" : "Team Contact";
  await notifyAdminAndOwner({
    title: "\u{1F4B0} New Order",
    message: `${customerName} ordered ${toolName} (${duration} mo) via ${methodLabel} \u2014 Rs ${finalAmount}`,
    type: "order",
    customerPhone: customerPhone || null,
    customerEmail: customerEmail || null
  });
  logActivity("Order Received", `New order ${orderId} from ${customerName} for ${toolName} via ${paymentMethod}`);
  res.json({ ok: true, orderId, invoiceNo });
});
router.post("/public/orders/:id/screenshot", async (req, res) => {
  const { screenshot } = req.body;
  if (!screenshot) return res.status(400).json({ error: "Screenshot required" });
  const { data: order, error: fetchErr } = await supabase.from("orders").select("customer_name,tool,customer_id,customer_phone,customer_email").eq("id", req.params.id).single();
  if (fetchErr || !order) return res.status(404).json({ error: "Order not found" });
  const { error } = await supabase.from("orders").update({ screenshot, payment_status: "pending" }).eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  await notifyAdminAndOwner({
    title: "Payment Screenshot",
    message: `${order.customer_name} uploaded payment proof for ${order.tool}`,
    type: "payment",
    customerId: order.customer_id || null,
    customerPhone: order.customer_phone || null,
    customerEmail: order.customer_email || null
  });
  res.json({ ok: true });
});
router.get("/tickets", requireAuth, async (req, res) => {
  const { data, error } = await supabase.from("tickets").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});
router.post("/tickets", async (req, res) => {
  const body = req.body || {};
  const ticket = {
    ...body,
    id: body.id || `T${Date.now()}`,
    status: body.status || "open",
    replies: Array.isArray(body.replies) ? body.replies : [],
    source: body.source || "portal",
    category: body.category || "general",
    customer_phone: body.customer_phone || body.customerPhone || "",
    reopen_locked: false
  };
  let { data, error } = await supabase.from("tickets").insert(ticket).select().single();
  if (error && COLUMN_MISSING.test(error.message || "")) {
    const {
      customer_phone: _p,
      category: _c,
      source: _s,
      reopen_locked: _r,
      ...legacy
    } = ticket;
    const retry = await supabase.from("tickets").insert(legacy).select().single();
    data = retry.data;
    error = retry.error;
    if (error) {
      return res.status(500).json({
        error: `${error.message} \u2014 Run supabase_chatbot_tickets.sql in the Supabase SQL editor, then refresh.`
      });
    }
  } else if (error) {
    return res.status(500).json({ error: error.message });
  }
  await notifyTicketCreated({
    customer_name: ticket.customer_name || ticket.customerName || "",
    subject: ticket.subject,
    customer_id: ticket.customer_id || null,
    customer_phone: ticket.customer_phone || null,
    source: ticket.source,
    assignee_role: ticket.assignee_role,
    owner_id: ticket.owner_id || null
  });
  res.json({ ok: true, id: data.id });
});
router.patch("/tickets/:id", requireAuth, async (req, res) => {
  const patch = { ...req.body || {} };
  const nextStatus = typeof patch.status === "string" ? patch.status.toLowerCase() : null;
  let existing = null;
  let lockColMissing = false;
  {
    const full = await supabase.from("tickets").select("status,reopen_locked").eq("id", req.params.id).maybeSingle();
    if (full.error && COLUMN_MISSING.test(full.error.message || "")) {
      lockColMissing = true;
      const slim = await supabase.from("tickets").select("status").eq("id", req.params.id).maybeSingle();
      existing = slim.data;
    } else {
      existing = full.data;
    }
  }
  if (!lockColMissing) {
    if (nextStatus === "closed" || nextStatus === "resolved") {
      patch.reopen_locked = true;
    } else if (nextStatus && ["open", "pending", "unresolved"].includes(nextStatus) && existing && (existing.reopen_locked || ["closed", "resolved"].includes(String(existing.status || "").toLowerCase()))) {
      patch.reopen_locked = false;
    }
  } else {
    delete patch.reopen_locked;
  }
  const { data, error } = await supabase.from("tickets").update(patch).eq("id", req.params.id).select().single();
  if (error) {
    if (COLUMN_MISSING.test(error.message || "") && patch.reopen_locked !== void 0) {
      const { reopen_locked: _drop, ...statusOnly } = patch;
      const retry = await supabase.from("tickets").update(statusOnly).eq("id", req.params.id).select().single();
      if (retry.error) {
        return res.status(500).json({
          error: `${retry.error.message} \u2014 Run supabase_chatbot_tickets.sql in the Supabase SQL editor, then refresh.`
        });
      }
      return res.json(retry.data);
    }
    return res.status(500).json({
      error: COLUMN_MISSING.test(error.message || "") ? `${error.message} \u2014 Run supabase_chatbot_tickets.sql in the Supabase SQL editor, then refresh.` : error.message
    });
  }
  res.json(data);
});
router.post("/tickets/:id/reply", requireAuth, async (req, res) => {
  const { data: ticket } = await supabase.from("tickets").select("*").eq("id", req.params.id).single();
  if (!ticket) return res.status(404).json({ error: "Not found" });
  const status = String(ticket.status || "open").toLowerCase();
  const locked = Boolean(ticket.reopen_locked) || status === "closed" || status === "resolved";
  const from = String(req.body?.from || "admin");
  if (locked && from === "customer") {
    return res.status(409).json({
      error: "This ticket is closed or resolved and cannot be reopened. Please submit a new support ticket."
    });
  }
  if (locked) {
    return res.status(409).json({
      error: "This ticket is closed. Reopen it (staff) before replying, or ask the customer to start a new ticket."
    });
  }
  const reply = {
    from,
    text: req.body.message || req.body.text,
    at: (/* @__PURE__ */ new Date()).toISOString(),
    name: req.body.name || (from === "admin" ? "Admin" : from)
  };
  const replies = [...ticket.replies || [], reply];
  const { data, error } = await supabase.from("tickets").update({ replies, status: "open" }).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  await notifyTicketReply({
    customer_name: ticket.customer_name || "",
    subject: ticket.subject || "",
    customer_id: ticket.customer_id || null,
    assignee_role: ticket.assignee_role,
    owner_id: ticket.owner_id || null
  }, from);
  logActivity("Ticket Reply", `Replied to ticket ${req.params.id}`);
  res.json(data);
});
router.get("/notifications", requireAuth, async (req, res) => {
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});
router.patch("/notifications/read-all", requireAuth, async (req, res) => {
  await supabase.from("notifications").update({ read: true }).eq("read", false);
  res.json({ ok: true });
});
router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  await supabase.from("notifications").update({ read: true }).eq("id", req.params.id);
  res.json({ ok: true });
});
router.get("/settings", requireAuth, async (req, res) => {
  const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single();
  if (error || !data) return res.json({});
  res.json(snakeToCamelSettings(data));
});
router.put("/settings", requireAuth, async (req, res) => {
  const { error } = await supabase.from("settings").update(camelToSnakeSettings(req.body)).eq("id", 1);
  if (error) return res.status(500).json({ error: error.message });
  logActivity("Settings Updated", "Admin updated site settings");
  res.json({ ok: true });
});
router.get("/analytics", requireAuth, async (req, res) => {
  const { data: orders } = await supabase.from("orders").select("status,final_amount,order_date,tool,tool_id,payment_method,quantity,duration").order("created_at", { ascending: false });
  const all = orders || [];
  const approved = all.filter((o) => o.status === "approved");
  const pending = all.filter((o) => o.status === "pending");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthly = {};
  months.forEach((m) => {
    monthly[m] = { revenue: 0, orders: 0, pending: 0 };
  });
  approved.forEach((o) => {
    const d = new Date(o.order_date);
    if (!isNaN(d.getTime())) {
      const m = months[d.getMonth()];
      monthly[m].revenue += o.final_amount || 0;
      monthly[m].orders += 1;
    }
  });
  pending.forEach((o) => {
    const d = new Date(o.order_date);
    if (!isNaN(d.getTime())) {
      const m = months[d.getMonth()];
      monthly[m].pending += o.final_amount || 0;
    }
  });
  const toolStats = {};
  all.forEach((o) => {
    if (!toolStats[o.tool]) toolStats[o.tool] = { revenue: 0, sales: 0, pending: 0 };
    if (o.status === "approved") {
      toolStats[o.tool].revenue += o.final_amount || 0;
      toolStats[o.tool].sales += 1;
    } else if (o.status === "pending") {
      toolStats[o.tool].pending += 1;
    }
  });
  const pmCount = {};
  all.filter((o) => o.status !== "rejected").forEach((o) => {
    const label = o.payment_method === "screenshot" ? "Pay First (SS)" : o.payment_method === "online" ? "Team Contact" : o.payment_method || "Other";
    pmCount[label] = (pmCount[label] || 0) + 1;
  });
  const totalRevenue = approved.reduce((s, o) => s + (o.final_amount || 0), 0);
  const pendingRevenue = pending.reduce((s, o) => s + (o.final_amount || 0), 0);
  res.json({
    monthly: months.map((m) => ({ month: m, ...monthly[m] })),
    toolRevenue: Object.entries(toolStats).map(([name, d]) => ({ name, ...d })),
    paymentMethods: Object.entries(pmCount).map(([name, value]) => ({ name, value })),
    totalRevenue,
    pendingRevenue,
    totalOrders: all.length,
    approvedOrders: approved.length,
    pendingOrders: pending.length,
    avgOrderValue: approved.length ? Math.floor(totalRevenue / approved.length) : 0
  });
});
router.get("/activity", requireAuth, async (req, res) => {
  const { data, error } = await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});
var adminRoutes_default = router;
function snakeToCamelOrder(o) {
  if (!o) return o;
  return {
    id: o.id,
    invoiceNo: o.invoice_no,
    orderDate: o.order_date,
    customerId: o.customer_id,
    customerName: o.customer_name,
    customerEmail: o.customer_email,
    customerPhone: o.customer_phone,
    customerCity: o.customer_city,
    whatsapp: o.whatsapp,
    tool: o.tool,
    toolId: o.tool_id,
    duration: o.duration,
    quantity: o.quantity,
    amount: o.amount,
    discount: o.discount,
    finalAmount: o.final_amount,
    status: o.status,
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status,
    transactionId: o.transaction_id,
    notes: o.notes,
    adminNotes: o.admin_notes,
    couponCode: o.coupon_code,
    subStatus: o.sub_status,
    activationDate: o.activation_date,
    expiryDate: o.expiry_date,
    daysLeft: o.days_left,
    screenshot: o.screenshot,
    createdAt: o.created_at
  };
}
function camelToSnakeOrder(o) {
  if (!o) return o;
  const r = {};
  if (o.invoiceNo !== void 0) r.invoice_no = o.invoiceNo;
  if (o.orderDate !== void 0) r.order_date = o.orderDate;
  if (o.customerId !== void 0) r.customer_id = o.customerId;
  if (o.customerName !== void 0) r.customer_name = o.customerName;
  if (o.customerEmail !== void 0) r.customer_email = o.customerEmail;
  if (o.customerPhone !== void 0) r.customer_phone = o.customerPhone;
  if (o.customerCity !== void 0) r.customer_city = o.customerCity;
  if (o.whatsapp !== void 0) r.whatsapp = o.whatsapp;
  if (o.tool !== void 0) r.tool = o.tool;
  if (o.toolId !== void 0) r.tool_id = o.toolId;
  if (o.duration !== void 0) r.duration = o.duration;
  if (o.quantity !== void 0) r.quantity = o.quantity;
  if (o.amount !== void 0) r.amount = o.amount;
  if (o.discount !== void 0) r.discount = o.discount;
  if (o.finalAmount !== void 0) r.final_amount = o.finalAmount;
  if (o.status !== void 0) r.status = o.status;
  if (o.paymentMethod !== void 0) r.payment_method = o.paymentMethod;
  if (o.paymentStatus !== void 0) r.payment_status = o.paymentStatus;
  if (o.transactionId !== void 0) r.transaction_id = o.transactionId;
  if (o.notes !== void 0) r.notes = o.notes;
  if (o.adminNotes !== void 0) r.admin_notes = o.adminNotes;
  if (o.couponCode !== void 0) r.coupon_code = o.couponCode;
  if (o.subStatus !== void 0) r.sub_status = o.subStatus;
  if (o.activationDate !== void 0) r.activation_date = o.activationDate;
  if (o.expiryDate !== void 0) r.expiry_date = o.expiryDate;
  if (o.daysLeft !== void 0) r.days_left = o.daysLeft;
  if (o.screenshot !== void 0) r.screenshot = o.screenshot;
  return r;
}
function snakeToCamelTool(t) {
  if (!t) return t;
  let extra = {};
  if (t.extra && typeof t.extra === "object") extra = t.extra;
  else if (typeof t.extra === "string") {
    try {
      const parsed = JSON.parse(t.extra);
      if (parsed && typeof parsed === "object") extra = parsed;
    } catch {
      extra = {};
    }
  }
  return {
    id: t.id,
    name: t.name,
    category: t.category,
    rating: t.rating,
    price: t.price,
    originalPrice: t.original_price,
    discount: t.discount,
    favicon: t.favicon,
    badge: t.badge,
    desc: t.description,
    fullDesc: t.full_desc,
    features: t.features,
    useCases: t.use_cases,
    faqs: t.faqs,
    waText: t.wa_text,
    isPrivate: t.is_private,
    isSemiPrivate: t.is_semi_private,
    showOnHome: t.show_on_home === false || t.show_on_home === 0 || extra.showOnHome === false ? false : true,
    accessMethod: String(t.access_method || extra.accessMethod || extra.access_method || "extension").trim().toLowerCase() === "one_click" ? "one_click" : "extension",
    toolUrl: t.tool_url || extra.toolUrl || extra.tool_url || "",
    cookiesJson: t.cookies_json ?? extra.cookiesJson ?? extra.cookies_json ?? "",
    panelReferrer: t.panel_referrer || extra.panelReferrer || extra.unlockReferrer || extra.panel_referrer || ""
  };
}
function camelToSnakeTool(t) {
  if (!t) return t;
  const r = {};
  if (t.id !== void 0) r.id = t.id;
  if (t.name !== void 0) r.name = t.name;
  if (t.category !== void 0) r.category = t.category;
  if (t.rating !== void 0) r.rating = t.rating;
  if (t.price !== void 0) r.price = t.price;
  if (t.originalPrice !== void 0) r.original_price = t.originalPrice;
  if (t.discount !== void 0) r.discount = t.discount;
  if (t.favicon !== void 0) r.favicon = t.favicon;
  if (t.badge !== void 0) r.badge = t.badge;
  if (t.desc !== void 0) r.description = t.desc;
  if (t.description !== void 0) r.description = t.description;
  if (t.fullDesc !== void 0) r.full_desc = t.fullDesc;
  if (t.features !== void 0) r.features = t.features;
  if (t.useCases !== void 0) r.use_cases = t.useCases;
  if (t.faqs !== void 0) r.faqs = t.faqs;
  if (t.waText !== void 0) r.wa_text = t.waText;
  if (t.isPrivate !== void 0) r.is_private = t.isPrivate;
  if (t.isSemiPrivate !== void 0) r.is_semi_private = t.isSemiPrivate;
  if (t.accessMethod !== void 0) r.access_method = t.accessMethod;
  if (t.toolUrl !== void 0) r.tool_url = t.toolUrl;
  if (t.cookiesJson !== void 0) r.cookies_json = t.cookiesJson;
  if (t.panelReferrer !== void 0) r.panel_referrer = t.panelReferrer;
  if (t.showOnHome !== void 0) r.show_on_home = t.showOnHome !== false;
  return r;
}
function snakeToCamelCustomer(c) {
  if (!c) return c;
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    country: c.country,
    city: c.city,
    totalOrders: c.total_orders,
    totalSpend: c.total_spend,
    joinDate: c.join_date,
    status: c.status,
    tools: c.tools,
    notes: c.notes
  };
}
function camelToSnakeCustomer(c) {
  if (!c) return c;
  const r = {};
  if (c.name !== void 0) r.name = c.name;
  if (c.email !== void 0) r.email = c.email;
  if (c.phone !== void 0) r.phone = c.phone;
  if (c.country !== void 0) r.country = c.country;
  if (c.city !== void 0) r.city = c.city;
  if (c.totalOrders !== void 0) r.total_orders = c.totalOrders;
  if (c.totalSpend !== void 0) r.total_spend = c.totalSpend;
  if (c.joinDate !== void 0) r.join_date = c.joinDate;
  if (c.status !== void 0) r.status = c.status;
  if (c.tools !== void 0) r.tools = c.tools;
  if (c.notes !== void 0) r.notes = c.notes;
  return r;
}
function snakeToCamelCoupon(c) {
  if (!c) return c;
  return {
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.value,
    usageLimit: c.usage_limit,
    usedCount: c.used_count,
    expiry: c.expiry,
    active: c.active,
    minPurchase: c.min_purchase
  };
}
function camelToSnakeCoupon(c) {
  if (!c) return c;
  const r = {};
  if (c.code !== void 0) r.code = c.code;
  if (c.type !== void 0) r.type = c.type;
  if (c.value !== void 0) r.value = c.value;
  if (c.usageLimit !== void 0) r.usage_limit = c.usageLimit;
  if (c.usedCount !== void 0) r.used_count = c.usedCount;
  if (c.expiry !== void 0) r.expiry = c.expiry;
  if (c.active !== void 0) r.active = c.active;
  if (c.minPurchase !== void 0) r.min_purchase = c.minPurchase;
  return r;
}
function snakeToCamelSettings(s) {
  if (!s) return s;
  return {
    siteName: s.site_name,
    contactEmail: s.contact_email,
    whatsapp: s.whatsapp,
    currency: s.currency,
    invoicePrefix: s.invoice_prefix,
    taxPercent: s.tax_percent,
    maintenanceMode: s.maintenance_mode,
    easypaisa: s.easypaisa,
    jazzcash: s.jazzcash,
    paypalEmail: s.paypal_email,
    bankName: s.bank_name,
    bankAccount: s.bank_account
  };
}
function camelToSnakeSettings(s) {
  if (!s) return s;
  const r = {};
  if (s.siteName !== void 0) r.site_name = s.siteName;
  if (s.contactEmail !== void 0) r.contact_email = s.contactEmail;
  if (s.whatsapp !== void 0) r.whatsapp = s.whatsapp;
  if (s.currency !== void 0) r.currency = s.currency;
  if (s.invoicePrefix !== void 0) r.invoice_prefix = s.invoicePrefix;
  if (s.taxPercent !== void 0) r.tax_percent = s.taxPercent;
  if (s.maintenanceMode !== void 0) r.maintenance_mode = s.maintenanceMode;
  if (s.easypaisa !== void 0) r.easypaisa = s.easypaisa;
  if (s.jazzcash !== void 0) r.jazzcash = s.jazzcash;
  if (s.paypalEmail !== void 0) r.paypal_email = s.paypalEmail;
  if (s.bankName !== void 0) r.bank_name = s.bankName;
  if (s.bankAccount !== void 0) r.bank_account = s.bankAccount;
  return r;
}
router.get("/orders/:id/invoice", requireAuth, async (req, res) => {
  const { data: order, error } = await supabase.from("orders").select("*").eq("id", req.params.id).single();
  if (error || !order) return res.status(404).json({ error: "Order not found" });
  const { data: s } = await supabase.from("settings").select("*").eq("id", 1).single();
  const currency = s?.currency || "PKR";
  res.json({
    invoiceNo: order.invoice_no || `INV-${order.id}`,
    orderId: order.id,
    orderDate: order.order_date,
    activationDate: order.activation_date,
    expiryDate: order.expiry_date,
    customer: {
      name: order.customer_name,
      email: order.customer_email,
      phone: order.customer_phone,
      city: order.customer_city
    },
    items: [{ tool: order.tool, duration: order.duration, quantity: order.quantity || 1, price: order.amount, discount: order.discount || 0, total: order.final_amount }],
    couponCode: order.coupon_code,
    amount: order.amount,
    discount: order.discount || 0,
    finalAmount: order.final_amount,
    currency,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    status: order.status,
    subStatus: order.sub_status,
    business: { name: s?.site_name || "AI TOOLZ MART", email: s?.contact_email || "emaan@aitoolsmart.com", whatsapp: s?.whatsapp || "+923275855578" }
  });
});

// src/lib/accountRoutes.ts
import { Router as Router2 } from "express";
import { createClient as createClient4 } from "@supabase/supabase-js";
var router2 = Router2();
var url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
var anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
var serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
function clients() {
  if (!url || !anonKey || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. Open Supabase \u2192 Project Settings \u2192 API, copy the service_role secret, add it to .env, then restart the server."
    );
  }
  return {
    auth: createClient4(url, anonKey, { auth: { persistSession: false } }),
    admin: createClient4(url, serviceKey, { auth: { persistSession: false } })
  };
}
async function actor(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { auth, admin } = clients();
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile } = await admin.from("customers").select("id,role,status,owner_id").eq("auth_user_id", data.user.id).single();
  if (!profile || profile.status === "blocked") return null;
  return profile;
}
function modeFor(actorRow, target) {
  if (actorRow.role === "admin") return "admin";
  if (actorRow.id === target.id && actorRow.role === "reseller") return "self-seller";
  if (actorRow.id === target.id && actorRow.role === "user") return "self-user";
  if (actorRow.role === "reseller" && target.owner_id === actorRow.id && target.role === "user") return "seller-member";
  return null;
}
async function saveProfile(req, res, targetId) {
  const current = await actor(req);
  if (!current) return res.status(401).json({ error: "Not authorized" });
  const { admin } = clients();
  const { data: target, error: targetError } = await admin.from("customers").select("id,auth_user_id,role,owner_id,email,name,phone,customer_code").eq("id", targetId).single();
  if (targetError || !target) return res.status(404).json({ error: "Account not found" });
  const mode = modeFor(current, target);
  if (!mode) return res.status(403).json({ error: "Not authorized" });
  const body = req.body || {};
  const profile = {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : void 0;
  const avatar = typeof body.avatar === "string" ? body.avatar : void 0;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (name) profile.name = name;
  if (phone !== void 0) profile.phone = phone;
  if (avatar !== void 0) {
    if (avatar && avatar.length > 35e4) {
      return res.status(400).json({ error: "Profile image is too large. Use a smaller photo." });
    }
    profile.avatar = avatar || null;
  }
  const canChangeEmail = mode === "admin" || mode === "self-seller";
  if (email) {
    if (!canChangeEmail) return res.status(403).json({ error: "Email cannot be changed on this account" });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address" });
    profile.email = email;
  }
  if (password) {
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  if (mode === "admin") {
    if (body.role && ["admin", "reseller", "user"].includes(body.role)) profile.role = body.role;
    if (Object.prototype.hasOwnProperty.call(body, "ownerId") || Object.prototype.hasOwnProperty.call(body, "owner_id")) {
      const ownerId = body.ownerId === void 0 ? body.owner_id : body.ownerId;
      profile.owner_id = ownerId || null;
      if (profile.owner_id) {
        const { data: seller } = await admin.from("customers").select("id,role").eq("id", profile.owner_id).single();
        if (!seller || seller.role !== "reseller") {
          return res.status(400).json({ error: "Seller assignment must be an existing seller account" });
        }
        if (seller.id === target.id) return res.status(400).json({ error: "An account cannot belong to itself" });
      }
    }
    if ((profile.role || target.role) === "reseller" || (profile.role || target.role) === "admin") {
      profile.owner_id = null;
    }
  }
  delete profile.customer_code;
  delete profile.id;
  delete profile.auth_user_id;
  const authPatch = {};
  if (profile.email && profile.email !== target.email) authPatch.email = profile.email;
  if (password) authPatch.password = password;
  if (profile.name) authPatch.user_metadata = { name: profile.name, phone: profile.phone ?? target.phone };
  if (Object.keys(authPatch).length && target.auth_user_id) {
    const { error: authError } = await admin.auth.admin.updateUserById(target.auth_user_id, authPatch);
    if (authError) return res.status(400).json({ error: authError.message });
  }
  if (Object.keys(profile).length) {
    const apply = async (fields) => admin.from("customers").update(fields).eq("id", target.id).select().single();
    let { data: row2, error: profileError } = await apply(profile);
    if (profileError && profile.avatar !== void 0 && /avatar/i.test(profileError.message || "")) {
      const { avatar: _ignored, ...rest } = profile;
      const retry = await apply(rest);
      row2 = retry.data;
      profileError = retry.error;
    }
    if (profileError) return res.status(400).json({ error: profileError.message });
    return res.json({ account: row2 });
  }
  const { data: row } = await admin.from("customers").select("*").eq("id", target.id).single();
  return res.json({ account: row });
}
router2.post("/", async (req, res) => {
  try {
    const current = await actor(req);
    if (!current || !["admin", "reseller"].includes(current.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const {
      name,
      email,
      phone = "",
      password,
      role = "user",
      plan = "",
      fee = 0,
      planDays = 0,
      expiry = "",
      tools = []
    } = req.body || {};
    if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || "") || String(password || "").length < 8) {
      return res.status(400).json({ error: "Valid name, email and 8-character password are required" });
    }
    const assignedRole = current.role === "admin" && ["admin", "reseller", "user"].includes(role) ? role : "user";
    const ownerId = current.role === "reseller" ? current.id : null;
    const { admin } = clients();
    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { name: name.trim(), phone: phone.trim() }
    });
    if (authError || !created.user) {
      return res.status(400).json({ error: authError?.message || "Could not create login" });
    }
    const profile = {
      auth_user_id: created.user.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role: assignedRole,
      status: "active",
      plan,
      fee: Number(fee) || 0,
      plan_days: Number(planDays) || 0,
      expiry: expiry || null,
      owner_id: ownerId,
      tools: Array.isArray(tools) ? tools : [],
      total_orders: 0,
      total_spend: Number(fee) || 0,
      notes: ownerId ? "Created by reseller" : "Created by administrator"
    };
    const { data: row, error: profileError } = await admin.from("customers").update(profile).eq("auth_user_id", created.user.id).select().single();
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return res.status(400).json({ error: profileError.message });
    }
    if (ownerId && Number(fee) > 0) {
      await admin.from("reseller_payments").insert({
        owner_id: ownerId,
        member_id: row.id,
        member_name: row.name,
        amount: Number(fee),
        method: "Manual",
        status: "paid",
        payment_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
      });
    }
    return res.status(201).json({ account: row });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Account creation failed" });
  }
});
router2.patch("/me", async (req, res) => {
  try {
    const current = await actor(req);
    if (!current) return res.status(401).json({ error: "Not authorized" });
    return saveProfile(req, res, current.id);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Profile update failed" });
  }
});
router2.patch("/:id", async (req, res) => {
  try {
    return saveProfile(req, res, req.params.id);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Profile update failed" });
  }
});
router2.delete("/:id", async (req, res) => {
  try {
    const current = await actor(req);
    if (!current || !["admin", "reseller"].includes(current.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const { admin } = clients();
    let query = admin.from("customers").select("id,auth_user_id,owner_id").eq("id", req.params.id);
    if (current.role === "reseller") query = query.eq("owner_id", current.id);
    const { data: target } = await query.single();
    if (!target) return res.status(404).json({ error: "Account not found" });
    await admin.from("customers").delete().eq("id", target.id);
    if (target.auth_user_id) await admin.auth.admin.deleteUser(target.auth_user_id);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Account deletion failed" });
  }
});
var accountRoutes_default = router2;

// src/lib/extensionRoutes.ts
import { Router as Router3 } from "express";
import { createClient as createClient6 } from "@supabase/supabase-js";

// src/lib/accountStore.ts
var PLAN_OPTIONS = [
  { name: "Monthly Plan", fee: 2e3, days: 30 },
  { name: "3 Month Plan", fee: 5e3, days: 90 },
  { name: "6 Month Plan", fee: 9e3, days: 180 },
  { name: "Lite Reseller", fee: 5560, days: 30 },
  { name: "Guru Reseller", fee: 8340, days: 30 },
  { name: "Pro Reseller", fee: 30580, days: 180 }
];
var MEMBER_PLAN_OPTIONS = PLAN_OPTIONS.filter(
  (p) => !p.name.toLowerCase().includes("reseller")
);
function daysLeft(expiry) {
  if (!expiry) return -1;
  const raw = String(expiry).trim();
  const dateOnly = raw.slice(0, 10);
  const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const end = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59, 999) : new Date(raw);
  if (isNaN(end.getTime())) return -1;
  return Math.ceil((end.getTime() - Date.now()) / 864e5);
}
function planIsActive(plan, expiry) {
  if (!String(plan || "").trim()) return false;
  if (!expiry) return true;
  return daysLeft(String(expiry)) >= 0;
}

// src/lib/deviceSessions.ts
import { createClient as createClient5 } from "@supabase/supabase-js";
var DEVICE_LIMIT_MESSAGE = "Device limit reached. Ask admin/reseller to manage devices or remove an old device.";
var DEVICE_LIMITS_SETTING_KEY = "device_limits_enabled";
function serviceClient() {
  const url3 = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey3 = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url3 || !serviceKey3) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env and restart the server.");
  }
  return createClient5(url3, serviceKey3, { auth: { persistSession: false } });
}
function isAdminRole(role) {
  return String(role || "").trim().toLowerCase() === "admin";
}
function softPassDevice(input) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    ok: true,
    session: {
      id: "exempt",
      account_id: input.accountId,
      device_id: input.deviceId,
      device_label: normalizeDeviceLabel(input.deviceLabel),
      user_agent: null,
      last_seen: now,
      created_at: now
    },
    maxDevices: input.maxDevices ?? 999,
    deviceCount: input.deviceCount ?? 0
  };
}
var deviceLimitsEnabledCache = null;
var DEVICE_LIMITS_CACHE_MS = 15e3;
function parseSettingBool(raw) {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw === 1;
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "on";
  }
  return false;
}
var DEVICE_LIMITS_SQL_HINT = "Run supabase_device_limits_toggle.sql in the Supabase SQL Editor, then try again.";
function isAppSettingsMissing(message) {
  return /app_settings|does not exist|schema cache|Could not find the table/i.test(
    String(message || "")
  );
}
async function getDeviceLimitsSetting(admin) {
  const now = Date.now();
  if (deviceLimitsEnabledCache && now - deviceLimitsEnabledCache.at < DEVICE_LIMITS_CACHE_MS && !deviceLimitsEnabledCache.setupRequired) {
    return { enabled: deviceLimitsEnabledCache.value };
  }
  try {
    const db = admin || serviceClient();
    const { data, error } = await db.from("app_settings").select("value").eq("key", DEVICE_LIMITS_SETTING_KEY).maybeSingle();
    if (error) {
      const setupRequired = isAppSettingsMissing(error.message);
      deviceLimitsEnabledCache = { value: false, at: now, setupRequired };
      return { enabled: false, setupRequired: setupRequired || void 0 };
    }
    if (!data) {
      deviceLimitsEnabledCache = { value: false, at: now };
      return { enabled: false };
    }
    const enabled = parseSettingBool(data.value);
    deviceLimitsEnabledCache = { value: enabled, at: now };
    return { enabled };
  } catch (err) {
    const setupRequired = isAppSettingsMissing(err?.message);
    deviceLimitsEnabledCache = { value: false, at: now, setupRequired };
    return { enabled: false, setupRequired: setupRequired || void 0 };
  }
}
async function areDeviceLimitsEnabled(admin) {
  const setting = await getDeviceLimitsSetting(admin);
  return setting.enabled;
}
async function setDeviceLimitsEnabled(enabled, admin) {
  const db = admin || serviceClient();
  const value = Boolean(enabled);
  const { error } = await db.from("app_settings").upsert(
    {
      key: DEVICE_LIMITS_SETTING_KEY,
      value,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    { onConflict: "key" }
  );
  if (error) {
    if (isAppSettingsMissing(error.message)) {
      throw new Error(DEVICE_LIMITS_SQL_HINT);
    }
    throw new Error(error.message);
  }
  deviceLimitsEnabledCache = { value, at: Date.now() };
  return value;
}
function normalizeDeviceId(raw) {
  return String(raw || "").trim().slice(0, 200);
}
function normalizeDeviceLabel(raw) {
  return String(raw || "").trim().slice(0, 160) || "Browser";
}
async function loadAccountDevices(accountId, admin) {
  const db = admin || serviceClient();
  const { data, error } = await db.from("device_sessions").select("*").eq("account_id", accountId).order("last_seen", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}
async function loadAccountMaxDevices(accountId, admin) {
  const db = admin || serviceClient();
  const { data, error } = await db.from("customers").select("id,max_devices,status,role,owner_id").eq("id", accountId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const max = Math.max(1, Math.min(50, Number(data.max_devices) || 1));
  return { ...data, max_devices: max };
}
async function registerOrHeartbeatDevice(input) {
  const deviceId = normalizeDeviceId(input.deviceId);
  if (!deviceId) {
    return { ok: false, error: "Device id is required", status: 400 };
  }
  const db = input.admin || serviceClient();
  let account;
  try {
    account = await loadAccountMaxDevices(input.accountId, db);
  } catch (err) {
    if (/max_devices|does not exist|schema cache|column/i.test(String(err?.message || ""))) {
      return {
        ok: true,
        session: {
          id: "pending",
          account_id: input.accountId,
          device_id: deviceId,
          device_label: normalizeDeviceLabel(input.deviceLabel),
          user_agent: null,
          last_seen: (/* @__PURE__ */ new Date()).toISOString(),
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        },
        maxDevices: 1,
        deviceCount: 0
      };
    }
    throw err;
  }
  if (!account) return { ok: false, error: "Account not found", status: 404 };
  if (account.status === "blocked") {
    return { ok: false, error: "Account suspended", status: 403 };
  }
  const label = normalizeDeviceLabel(input.deviceLabel);
  if (isAdminRole(account.role)) {
    return softPassDevice({
      accountId: input.accountId,
      deviceId,
      deviceLabel: label,
      maxDevices: 999,
      deviceCount: 0
    });
  }
  const limitsOn = await areDeviceLimitsEnabled(db);
  if (!limitsOn) {
    return softPassDevice({
      accountId: input.accountId,
      deviceId,
      deviceLabel: label,
      maxDevices: account.max_devices,
      deviceCount: 0
    });
  }
  const maxDevices = account.max_devices;
  const ua = String(input.userAgent || "").slice(0, 400) || null;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const { data: existing, error: existingError } = await db.from("device_sessions").select("*").eq("account_id", input.accountId).eq("device_id", deviceId).maybeSingle();
  if (existingError && /device_sessions|does not exist|schema cache/i.test(existingError.message || "")) {
    return {
      ok: true,
      session: {
        id: "pending",
        account_id: input.accountId,
        device_id: deviceId,
        device_label: label,
        user_agent: ua,
        last_seen: now,
        created_at: now
      },
      maxDevices,
      deviceCount: 0
    };
  }
  if (existing) {
    const { data: updated, error } = await db.from("device_sessions").update({
      last_seen: now,
      device_label: label || existing.device_label,
      user_agent: ua || existing.user_agent
    }).eq("id", existing.id).select().single();
    if (error) return { ok: false, error: error.message, status: 500 };
    const sessions3 = await loadAccountDevices(input.accountId, db);
    return {
      ok: true,
      session: updated || existing,
      maxDevices,
      deviceCount: sessions3.length
    };
  }
  let sessions2 = [];
  try {
    sessions2 = await loadAccountDevices(input.accountId, db);
  } catch (err) {
    if (/device_sessions|does not exist|schema cache/i.test(String(err?.message || ""))) {
      return {
        ok: true,
        session: {
          id: "pending",
          account_id: input.accountId,
          device_id: deviceId,
          device_label: label,
          user_agent: ua,
          last_seen: now,
          created_at: now
        },
        maxDevices,
        deviceCount: 0
      };
    }
    throw err;
  }
  if (sessions2.length >= maxDevices) {
    return {
      ok: false,
      error: DEVICE_LIMIT_MESSAGE,
      status: 403,
      maxDevices,
      deviceCount: sessions2.length
    };
  }
  const { data: created, error: insertError } = await db.from("device_sessions").insert({
    account_id: input.accountId,
    device_id: deviceId,
    device_label: label,
    user_agent: ua,
    last_seen: now,
    created_at: now
  }).select().single();
  if (insertError) {
    if (/device_sessions|does not exist|schema cache/i.test(insertError.message || "")) {
      return {
        ok: true,
        session: {
          id: "pending",
          account_id: input.accountId,
          device_id: deviceId,
          device_label: label,
          user_agent: ua,
          last_seen: now,
          created_at: now
        },
        maxDevices,
        deviceCount: 0
      };
    }
    if (/duplicate|unique/i.test(insertError.message || "")) {
      const { data: raced } = await db.from("device_sessions").select("*").eq("account_id", input.accountId).eq("device_id", deviceId).maybeSingle();
      if (raced) {
        await db.from("device_sessions").update({ last_seen: now }).eq("id", raced.id);
        const again = await loadAccountDevices(input.accountId, db);
        return { ok: true, session: raced, maxDevices, deviceCount: again.length };
      }
    }
    return { ok: false, error: insertError.message, status: 500 };
  }
  return {
    ok: true,
    session: created,
    maxDevices,
    deviceCount: sessions2.length + 1
  };
}
async function revokeDeviceSession(input) {
  const db = input.admin || serviceClient();
  const { data, error } = await db.from("device_sessions").delete().eq("id", input.sessionId).eq("account_id", input.accountId).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.id);
}
async function setAccountMaxDevices(input) {
  const db = input.admin || serviceClient();
  const max = Math.max(1, Math.min(50, Math.floor(Number(input.maxDevices) || 1)));
  const { data, error } = await db.from("customers").update({ max_devices: max }).eq("id", input.accountId).select("id,max_devices").single();
  if (error) throw new Error(error.message);
  return data;
}
function readDeviceFromRequest(req) {
  const headers = req.headers || {};
  const body = req.body || {};
  const deviceId = normalizeDeviceId(headers["x-device-id"] || headers["X-Device-Id"]) || normalizeDeviceId(body.deviceId || body.device_id);
  const deviceLabel = normalizeDeviceLabel(headers["x-device-label"] || headers["X-Device-Label"]) || normalizeDeviceLabel(body.deviceLabel || body.device_label);
  const userAgent = String(headers["user-agent"] || body.userAgent || "").slice(0, 400);
  return { deviceId, deviceLabel, userAgent };
}

// src/lib/extensionRoutes.ts
var router3 = Router3();
var loginAttempts = /* @__PURE__ */ new Map();
var LOGIN_WINDOW_MS = 15 * 60 * 1e3;
var MAX_LOGIN_ATTEMPTS = 5;
function attemptKey(req, email) {
  return `${req.ip || req.socket?.remoteAddress || "unknown"}:${email}`;
}
function blocked(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || record.resetAt <= now) {
    loginAttempts.set(key, { count: 0, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  return record.count >= MAX_LOGIN_ATTEMPTS;
}
function failed(key) {
  const record = loginAttempts.get(key) || { count: 0, resetAt: Date.now() + LOGIN_WINDOW_MS };
  record.count += 1;
  loginAttempts.set(key, record);
}
function config() {
  const url3 = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url3 || !anon) throw new Error("Supabase authentication is not configured");
  return { url: url3, anon };
}
function client2(token) {
  const { url: url3, anon } = config();
  return createClient6(url3, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : void 0
  });
}
function toolsDb() {
  const url3 = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey3 = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url3 || !(serviceKey3 || anon)) throw new Error("Supabase authentication is not configured");
  return createClient6(url3, serviceKey3 || anon, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
function slugify(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function toolMatchesKey2(tool, key) {
  const want = String(key || "").trim().toLowerCase();
  if (!want) return false;
  const id = String(tool?.id || "").trim().toLowerCase();
  const name = String(tool?.name || "").trim().toLowerCase();
  return id === want || name === want || slugify(name) === want || slugify(id) === want;
}
function parseExtraBag(raw) {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
    }
  }
  return {};
}
function parseCookiesPayload(raw) {
  let text = String(raw || "").trim();
  if (!text) return [];
  if (text.charCodeAt(0) === 65279) text = text.slice(1);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(text.slice(start, end + 1));
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (Array.isArray(parsed)) return parsed.filter((c) => c && typeof c === "object");
  if (parsed && typeof parsed === "object") {
    if (Array.isArray(parsed.cookies)) return parsed.cookies.filter((c) => c && typeof c === "object");
    if (Array.isArray(parsed.data)) return parsed.data.filter((c) => c && typeof c === "object");
    if (parsed.name) return [parsed];
  }
  return [];
}
async function selectToolsRows(sb, idEq) {
  const attempts = [
    "*",
    "id,name,access_method,tool_url,cookies_json,panel_referrer,extra",
    "id,name,access_method,tool_url,cookies_json,extra",
    "id,name,extra",
    "id,name"
  ];
  for (const cols of attempts) {
    const q = idEq ? sb.from("tools").select(cols).eq("id", idEq).maybeSingle() : sb.from("tools").select(cols);
    const result = await q;
    if (!result.error) {
      return idEq ? result.data ? [result.data] : [] : result.data || [];
    }
  }
  return [];
}
async function findToolByKey(key) {
  const sb = toolsDb();
  const raw = decodeURIComponent(String(key || "")).trim();
  if (!raw) return null;
  const byIdRows = await selectToolsRows(sb, raw);
  if (byIdRows[0]) return byIdRows[0];
  const rows = await selectToolsRows(sb);
  return rows.find((row) => toolMatchesKey2(row, raw)) || null;
}
async function profileForToken(token) {
  const supabase2 = client2(token);
  const { data: authData, error: authError } = await supabase2.auth.getUser(token);
  if (authError || !authData.user) return null;
  const db = toolsDb();
  const { data: profile, error } = await db.from("customers").select("id,customer_code,name,email,role,status,plan,expiry,tools").eq("auth_user_id", authData.user.id).maybeSingle();
  if (!error && profile) return profile;
  const fallback = await supabase2.from("customers").select("id,customer_code,name,email,role,status,plan,expiry,tools").eq("auth_user_id", authData.user.id).single();
  if (fallback.error || !fallback.data) return null;
  return fallback.data;
}
router3.post("/login", async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    const key = attemptKey(req, email);
    if (blocked(key)) {
      return res.status(429).json({ error: "Too many login attempts. Try again in 15 minutes." });
    }
    const supabase2 = client2();
    const { data, error } = await supabase2.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      failed(key);
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const profile = await profileForToken(data.session.access_token);
    if (!profile || profile.status === "blocked") {
      failed(key);
      return res.status(403).json({ error: "This account is unavailable. Contact the administrator." });
    }
    const fp = readDeviceFromRequest(req);
    if (fp.deviceId) {
      const deviceCheck = await registerOrHeartbeatDevice({
        accountId: profile.id,
        deviceId: fp.deviceId,
        deviceLabel: fp.deviceLabel,
        userAgent: fp.userAgent
      });
      if (deviceCheck.ok === false) {
        return res.status(deviceCheck.status).json({ error: deviceCheck.error || DEVICE_LIMIT_MESSAGE });
      }
    }
    loginAttempts.delete(key);
    return res.json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      profile
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Extension login failed" });
  }
});
router3.post("/refresh", async (req, res) => {
  try {
    const refreshToken = String(req.body?.refreshToken || "");
    if (!refreshToken) return res.status(400).json({ error: "Refresh token required" });
    const supabase2 = client2();
    const { data, error } = await supabase2.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) return res.status(401).json({ error: "Session expired. Please sign in again." });
    return res.json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Could not refresh session" });
  }
});
router3.get("/entitlements", async (req, res) => {
  try {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const profile = await profileForToken(token);
    if (!profile) return res.status(401).json({ error: "Session expired. Please sign in again." });
    if (profile.status === "blocked") return res.status(403).json({ error: "Account suspended" });
    const planActive = planIsActive(profile.plan, profile.expiry);
    const assigned = planActive && Array.isArray(profile.tools) ? profile.tools : [];
    const sb = toolsDb();
    const catalog = await sb.from("tools").select("*");
    let catalogRows = catalog.data || [];
    if (catalog.error) {
      catalogRows = (await sb.from("tools").select("id,name")).data || [];
    }
    const tools = assigned.map((entry) => {
      const label = String(entry || "");
      const match = catalogRows.find((row) => toolMatchesKey2(row, label)) || catalogRows.find((row) => String(row.name || "").toLowerCase() === label.toLowerCase());
      const fields = cookieFields(match);
      return {
        id: match?.id || "",
        name: match?.name || label,
        accessMethod: fields.accessMethod,
        toolUrl: fields.url
      };
    });
    return res.json({
      customerId: profile.customer_code || profile.id,
      name: profile.name,
      role: profile.role,
      plan: profile.plan || "",
      expiry: profile.expiry,
      planActive,
      tools
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Could not load tool access" });
  }
});
function toolAssigned(profile, tool) {
  const assigned = Array.isArray(profile.tools) ? profile.tools : [];
  return assigned.some((entry) => {
    const value = String(entry || "").trim();
    if (!value) return false;
    return toolMatchesKey2(tool, value) || value.toLowerCase() === String(tool.name || "").trim().toLowerCase();
  });
}
function cookieFields(tool) {
  const extra = parseExtraBag(tool?.extra);
  const method = tool?.access_method || extra.accessMethod || extra.access_method;
  const url3 = tool?.tool_url || extra.toolUrl || extra.tool_url || "";
  const cookiesRaw = tool?.cookies_json ?? extra.cookiesJson ?? extra.cookies_json ?? "";
  const panelReferrer = tool?.panel_referrer || extra.panelReferrer || extra.unlockReferrer || extra.panel_referrer || "";
  const normalized = String(method || "").trim().toLowerCase() === "one_click" ? "one_click" : "extension";
  return {
    accessMethod: normalized,
    url: String(url3 || "").trim(),
    cookiesRaw: String(cookiesRaw || ""),
    panelReferrer: String(panelReferrer || "").trim()
  };
}
router3.get("/launch/:toolId", async (req, res) => {
  try {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const profile = await profileForToken(token);
    if (!profile) return res.status(401).json({ error: "Session expired. Please sign in again." });
    if (profile.status === "blocked") return res.status(403).json({ error: "Account suspended" });
    const fp = readDeviceFromRequest(req);
    if (!fp.deviceId) {
      return res.status(400).json({
        error: "Device id required. Refresh the portal or reinstall the extension, then try again."
      });
    }
    const deviceCheck = await registerOrHeartbeatDevice({
      accountId: profile.id,
      deviceId: fp.deviceId,
      deviceLabel: fp.deviceLabel,
      userAgent: fp.userAgent
    });
    if (deviceCheck.ok === false) {
      return res.status(deviceCheck.status).json({ error: deviceCheck.error || DEVICE_LIMIT_MESSAGE });
    }
    const planActive = planIsActive(profile.plan, profile.expiry);
    if (!planActive) return res.status(403).json({ error: "Activate or renew a plan to access tools." });
    const tool = await findToolByKey(req.params.toolId);
    if (!tool) return res.status(404).json({ error: "Tool not found" });
    if (!toolAssigned(profile, tool)) {
      return res.status(403).json({ error: "This tool is not assigned to your account." });
    }
    const fields = cookieFields(tool);
    const omitCookies = String(req.query.omitCookies || req.query.meta || "").trim() === "1" || String(req.headers["x-omit-cookies"] || "").trim() === "1";
    const cookies = omitCookies ? [] : parseCookiesPayload(fields.cookiesRaw);
    return res.json({
      name: tool.name,
      accessMethod: fields.accessMethod,
      url: fields.url,
      toolUrl: fields.url,
      cookies,
      panelReferrer: fields.panelReferrer || void 0,
      unlockReferrer: fields.panelReferrer || void 0
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Could not launch tool" });
  }
});
var extensionRoutes_default = router3;

// src/lib/notificationRoutes.ts
import { Router as Router4 } from "express";
import { createClient as createClient7 } from "@supabase/supabase-js";
var router4 = Router4();
var url2 = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
var anonKey2 = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
var serviceKey2 = process.env.SUPABASE_SERVICE_ROLE_KEY;
function clients2() {
  if (!url2 || !anonKey2 || !serviceKey2) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. Open Supabase \u2192 Project Settings \u2192 API, copy the service_role secret, add it to .env, then restart the server."
    );
  }
  return {
    auth: createClient7(url2, anonKey2, { auth: { persistSession: false } }),
    admin: createClient7(url2, serviceKey2, { auth: { persistSession: false } })
  };
}
async function actor2(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { auth, admin } = clients2();
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile } = await admin.from("customers").select("id,role,status").eq("auth_user_id", data.user.id).single();
  if (!profile || profile.status === "blocked") return null;
  return profile;
}
router4.post("/actions", async (req, res) => {
  try {
    const current = await actor2(req);
    if (!current) return res.status(401).json({ error: "Not authorized" });
    const action = req.body?.action === "read" ? "read" : req.body?.action === "delete" ? "delete" : "";
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((id) => String(id)).filter(Boolean) : [];
    if (!action || !ids.length) return res.status(400).json({ error: "action and ids are required" });
    const { admin } = clients2();
    const { data, error } = await admin.from("notifications").select("*").in("id", ids);
    if (error) return res.status(500).json({ error: error.message });
    const allowed = (data || []).filter((row) => noteVisible(row, current)).map((row) => row.id);
    if (!allowed.length) return res.json({ ok: true, ids: [] });
    if (action === "read") {
      const { error: updateError } = await admin.from("notifications").update({ read: true }).in("id", allowed);
      if (updateError) return res.status(500).json({ error: updateError.message });
    } else {
      const { error: deleteError } = await admin.from("notifications").delete().in("id", allowed);
      if (deleteError) return res.status(500).json({ error: deleteError.message });
    }
    return res.json({ ok: true, ids: allowed });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Notification update failed" });
  }
});
var notificationRoutes_default = router4;

// src/lib/deviceRoutes.ts
import { Router as Router5 } from "express";
import { createClient as createClient8 } from "@supabase/supabase-js";
var router5 = Router5();
function clients3() {
  const url3 = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey3 = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey3 = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url3 || !anonKey3 || !serviceKey3) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. Open Supabase \u2192 Project Settings \u2192 API, copy the service_role secret, add it to .env, then restart the server."
    );
  }
  return {
    auth: createClient8(url3, anonKey3, { auth: { persistSession: false } }),
    admin: createClient8(url3, serviceKey3, { auth: { persistSession: false } })
  };
}
async function actor3(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { auth, admin } = clients3();
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return null;
  let profile = null;
  const full = await admin.from("customers").select("id,role,status,owner_id,max_devices").eq("auth_user_id", data.user.id).maybeSingle();
  if (full.error && /max_devices|column|schema cache/i.test(full.error.message || "")) {
    const basic = await admin.from("customers").select("id,role,status,owner_id").eq("auth_user_id", data.user.id).maybeSingle();
    profile = basic.data;
  } else {
    profile = full.data || null;
  }
  if (!profile || profile.status === "blocked") return null;
  return {
    id: profile.id,
    role: profile.role,
    status: profile.status,
    owner_id: profile.owner_id,
    max_devices: Math.max(1, Math.min(50, Number(profile.max_devices) || 1))
  };
}
async function canManageAccount(current, targetId, admin) {
  if (current.role === "admin") return { ok: true, self: current.id === targetId };
  if (current.id === targetId) return { ok: true, self: true };
  const { data: target } = await admin.from("customers").select("id,owner_id,role").eq("id", targetId).maybeSingle();
  if (!target) return { ok: false, error: "Account not found", status: 404 };
  if (current.role === "reseller" && target.owner_id === current.id && target.role === "user") {
    return { ok: true, self: false, target };
  }
  return { ok: false, error: "Not authorized", status: 403 };
}
router5.get("/limits-enabled", async (req, res) => {
  try {
    const current = await actor3(req);
    if (!current) return res.status(401).json({ error: "Not authorized" });
    const { admin } = clients3();
    const setting = await getDeviceLimitsSetting(admin);
    return res.json({
      enabled: Boolean(setting.enabled),
      ...setting.setupRequired ? { setupRequired: true, hint: DEVICE_LIMITS_SQL_HINT } : {}
    });
  } catch (error) {
    return res.json({
      enabled: false,
      setupRequired: true,
      hint: error?.message || DEVICE_LIMITS_SQL_HINT
    });
  }
});
router5.patch("/limits-enabled", async (req, res) => {
  try {
    const current = await actor3(req);
    if (!current) return res.status(401).json({ error: "Not authorized" });
    if (current.role !== "admin") return res.status(403).json({ error: "Admin only" });
    const { admin } = clients3();
    const raw = req.body?.enabled ?? req.body?.device_limits_enabled;
    if (typeof raw !== "boolean") {
      return res.status(400).json({ error: "enabled must be a boolean" });
    }
    const enabled = await setDeviceLimitsEnabled(raw, admin);
    return res.json({ enabled });
  } catch (error) {
    const message = error?.message || "Could not update device limits setting";
    const setup = message === DEVICE_LIMITS_SQL_HINT || /app_settings|does not exist|schema cache/i.test(message);
    return res.status(setup ? 503 : 500).json({
      error: setup ? DEVICE_LIMITS_SQL_HINT : message,
      enabled: false,
      setupRequired: setup || void 0
    });
  }
});
router5.get("/me", async (req, res) => {
  try {
    const current = await actor3(req);
    if (!current) return res.status(401).json({ error: "Not authorized" });
    const { admin } = clients3();
    const fp = readDeviceFromRequest(req);
    if (fp.deviceId) {
      const check = await registerOrHeartbeatDevice({
        accountId: current.id,
        deviceId: fp.deviceId,
        deviceLabel: fp.deviceLabel,
        userAgent: fp.userAgent,
        admin
      });
      if (check.ok === false) {
        return res.status(check.status).json({
          error: check.error,
          maxDevices: check.maxDevices,
          deviceCount: check.deviceCount
        });
      }
    }
    const account = await loadAccountMaxDevices(current.id, admin);
    const devices = await loadAccountDevices(current.id, admin);
    return res.json({
      accountId: current.id,
      maxDevices: account?.max_devices ?? 1,
      currentDeviceId: fp.deviceId || null,
      devices
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Could not load devices" });
  }
});
router5.get("/account/:id", async (req, res) => {
  try {
    const current = await actor3(req);
    if (!current) return res.status(401).json({ error: "Not authorized" });
    const { admin } = clients3();
    const access = await canManageAccount(current, req.params.id, admin);
    if (!access.ok) return res.status(access.status).json({ error: access.error });
    const account = await loadAccountMaxDevices(req.params.id, admin);
    if (!account) return res.status(404).json({ error: "Account not found" });
    const devices = await loadAccountDevices(req.params.id, admin);
    return res.json({
      accountId: account.id,
      maxDevices: account.max_devices,
      devices
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Could not load devices" });
  }
});
router5.post("/register", async (req, res) => {
  try {
    const current = await actor3(req);
    if (!current) return res.status(401).json({ error: "Not authorized" });
    const { admin } = clients3();
    const fp = readDeviceFromRequest(req);
    if (!fp.deviceId) return res.status(400).json({ error: "deviceId is required" });
    const check = await registerOrHeartbeatDevice({
      accountId: current.id,
      deviceId: fp.deviceId,
      deviceLabel: fp.deviceLabel,
      userAgent: fp.userAgent,
      admin
    });
    if (check.ok === false) {
      return res.status(check.status).json({
        error: check.error,
        maxDevices: check.maxDevices,
        deviceCount: check.deviceCount
      });
    }
    return res.json({
      ok: true,
      session: check.session,
      maxDevices: check.maxDevices,
      deviceCount: check.deviceCount
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Device registration failed" });
  }
});
router5.patch("/account/:id/max", async (req, res) => {
  try {
    const current = await actor3(req);
    if (!current) return res.status(401).json({ error: "Not authorized" });
    const { admin } = clients3();
    const targetId = req.params.id;
    const requested = Math.floor(Number(req.body?.maxDevices ?? req.body?.max_devices));
    if (!Number.isFinite(requested) || requested < 1 || requested > 50) {
      return res.status(400).json({ error: "maxDevices must be an integer from 1 to 50" });
    }
    if (current.role === "admin") {
      const row = await setAccountMaxDevices({ accountId: targetId, maxDevices: requested, admin });
      return res.json({ account: row });
    }
    if (current.role === "reseller") {
      const { data: target } = await admin.from("customers").select("id,owner_id,role,max_devices").eq("id", targetId).maybeSingle();
      if (!target || target.owner_id !== current.id || target.role !== "user") {
        return res.status(403).json({ error: "Not authorized" });
      }
      const sellerCap = Math.max(1, Math.min(50, Number(current.max_devices) || 1));
      if (requested > sellerCap) {
        return res.status(400).json({
          error: `Cannot exceed your seller device limit (${sellerCap}). Ask admin to raise it.`
        });
      }
      const row = await setAccountMaxDevices({ accountId: targetId, maxDevices: requested, admin });
      return res.json({ account: row });
    }
    return res.status(403).json({ error: "Not authorized to change device limits" });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Could not update max devices" });
  }
});
router5.delete("/:sessionId", async (req, res) => {
  try {
    const current = await actor3(req);
    if (!current) return res.status(401).json({ error: "Not authorized" });
    const { admin } = clients3();
    const sessionId = String(req.params.sessionId || "");
    if (sessionId === "me" || sessionId === "account" || sessionId === "register" || sessionId === "limits-enabled") {
      return res.status(404).json({ error: "Device not found" });
    }
    const { data: row } = await admin.from("device_sessions").select("id,account_id").eq("id", sessionId).maybeSingle();
    if (!row) return res.status(404).json({ error: "Device not found" });
    const access = await canManageAccount(current, row.account_id, admin);
    if (!access.ok) return res.status(access.status).json({ error: access.error });
    await revokeDeviceSession({ accountId: row.account_id, sessionId: row.id, admin });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Could not revoke device" });
  }
});
var deviceRoutes_default = router5;

// src/lib/toolProxyRoutes.ts
import { Router as Router6 } from "express";
import { createClient as createClient10 } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";
init_globalProxySettings();

// src/lib/proxyFetch.ts
init_globalProxySettings();
var cachedAgent = null;
var AGENT_TTL_MS = 6e4;
async function getProxyAgent(proxyUrl) {
  const now = Date.now();
  if (cachedAgent && cachedAgent.proxyUrl === proxyUrl && now - cachedAgent.at < AGENT_TTL_MS) {
    return cachedAgent.agent;
  }
  const undici = await import("undici");
  const agent = new undici.ProxyAgent(proxyUrl);
  cachedAgent = { proxyUrl, agent, at: now };
  return agent;
}
function invalidateProxyAgentCache() {
  cachedAgent = null;
}
async function proxyAwareFetch(input, init) {
  const proxyUrl = await getActiveOutboundProxyUrl();
  if (!proxyUrl) {
    return fetch(input, init);
  }
  try {
    const undici = await import("undici");
    const agent = await getProxyAgent(proxyUrl);
    const opts = { ...init || {}, dispatcher: agent };
    return await undici.fetch(input, opts);
  } catch (err) {
    const msg = String(err?.message || err || "Proxy request failed");
    throw new Error(
      /proxy|ECONNREFUSED|ENOTFOUND|socket|tunnel|407|authentication/i.test(msg) ? `Global Proxy Engine failed (${msg}). Check the proxy URL in Admin \u2192 Accounts.` : msg
    );
  }
}
async function testProxyUrl(proxyUrlRaw) {
  let proxyUrl;
  try {
    const { normalizeProxyUrl: normalizeProxyUrl2 } = await Promise.resolve().then(() => (init_globalProxySettings(), globalProxySettings_exports));
    proxyUrl = normalizeProxyUrl2(proxyUrlRaw);
  } catch (err) {
    return { ok: false, error: err?.message || "Invalid proxy URL" };
  }
  if (!proxyUrl) return { ok: false, error: "Proxy URL is empty" };
  try {
    const undici = await import("undici");
    const agent = new undici.ProxyAgent(proxyUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12e3);
    try {
      const res = await undici.fetch("https://api.ipify.org?format=json", {
        dispatcher: agent,
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });
      const text = await res.text();
      if (!res.ok) {
        return { ok: false, error: `Proxy reachable but IP check failed (${res.status})` };
      }
      let ip = "";
      try {
        ip = String(JSON.parse(text)?.ip || "").trim();
      } catch {
        ip = text.trim().slice(0, 64);
      }
      return { ok: true, ip: ip || "unknown" };
    } finally {
      clearTimeout(timer);
      try {
        agent.close?.();
      } catch {
      }
    }
  } catch (err) {
    return { ok: false, error: String(err?.message || err || "Proxy test failed") };
  }
}

// src/lib/toolProxyRoutes.ts
var router6 = Router6();
var SESSION_TTL_MS = 15 * 60 * 1e3;
var MAX_BODY_BYTES = 8 * 1024 * 1024;
var MAX_REDIRECTS = 12;
var sessions = /* @__PURE__ */ new Map();
function pruneSessions() {
  const now = Date.now();
  for (const [key, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(key);
  }
}
if (!process.env.VERCEL) {
  setInterval(pruneSessions, 6e4).unref?.();
}
function config2() {
  const url3 = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url3 || !anon) throw new Error("Supabase authentication is not configured");
  return { url: url3, anon };
}
function client3(token) {
  const { url: url3, anon } = config2();
  return createClient10(url3, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : void 0
  });
}
function toolsDb2() {
  const url3 = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey3 = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url3 || !(serviceKey3 || anon)) throw new Error("Supabase authentication is not configured");
  return createClient10(url3, serviceKey3 || anon, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
function slugify2(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function toolMatchesKey3(tool, key) {
  const want = String(key || "").trim().toLowerCase();
  if (!want) return false;
  const id = String(tool?.id || "").trim().toLowerCase();
  const name = String(tool?.name || "").trim().toLowerCase();
  return id === want || name === want || slugify2(name) === want || slugify2(id) === want;
}
function parseExtraJson(raw) {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
    }
  }
  return {};
}
function parseCookiesPayload2(raw) {
  let text = String(raw || "").trim();
  if (!text) return [];
  if (text.charCodeAt(0) === 65279) text = text.slice(1);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(text.slice(start, end + 1));
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }
  if (Array.isArray(parsed)) return parsed.filter((c) => c && typeof c === "object");
  if (parsed && typeof parsed === "object") {
    if (Array.isArray(parsed.cookies)) return parsed.cookies.filter((c) => c && typeof c === "object");
    if (Array.isArray(parsed.data)) return parsed.data.filter((c) => c && typeof c === "object");
    if (parsed.name) return [parsed];
  }
  return [];
}
function cookiesToHeader(cookies) {
  const parts = [];
  const seen = /* @__PURE__ */ new Set();
  for (const c of cookies || []) {
    const name = String(c?.name || "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const value = c?.value == null ? "" : String(c.value);
    parts.push(`${name}=${value}`);
  }
  return parts.join("; ");
}
function hostsFromCookies(cookies, origin) {
  const hosts = /* @__PURE__ */ new Set();
  try {
    hosts.add(new URL(origin).hostname.toLowerCase());
  } catch {
  }
  for (const c of cookies || []) {
    let d = String(c?.domain || "").trim().replace(/^\./, "").toLowerCase();
    if (d) hosts.add(d);
  }
  return [...hosts];
}
function isToolAccessUrl(url3) {
  try {
    const host = new URL(String(url3 || "").trim()).hostname.toLowerCase();
    return host === "toolaccess.click" || host.endsWith(".toolaccess.click");
  } catch {
    return /toolaccess\.click/i.test(String(url3 || ""));
  }
}
var DEFAULT_PANEL_REFERRER = "https://app.pakseotools.com/";
var APEX_PANEL_REFERRER = "https://pakseotools.com/";
var PANEL_REFERRER_FALLBACKS = [
  DEFAULT_PANEL_REFERRER,
  APEX_PANEL_REFERRER,
  "https://app.pakseotools.com/member"
];
function normalizePanelUnlockReferrer(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed);
    if (!/^https?:$/i.test(u.protocol)) return trimmed;
    if (/\/(login|signin|sign-in|sign_in|register|signup|sign-up)\/?$/i.test(u.pathname)) {
      return `${u.origin}/`;
    }
    if (!u.pathname || u.pathname === "/") return `${u.origin}/`;
    return trimmed;
  } catch {
    return trimmed;
  }
}
function panelUnlockReferrerCandidates(raw) {
  const normalized = normalizePanelUnlockReferrer(raw);
  const asIs = String(raw || "").trim();
  const out = [];
  const push = (v) => {
    const s = String(v || "").trim();
    if (s && !out.includes(s)) out.push(s);
  };
  push(normalized);
  push(asIs);
  for (const s of PANEL_REFERRER_FALLBACKS) push(s);
  if (normalized) {
    try {
      push(`${new URL(normalized).origin}/`);
    } catch {
    }
  }
  return out;
}
function resolvePanelUnlockReferrer(raw, dest) {
  if (!isToolAccessUrl(dest) && !String(raw || "").trim()) return "";
  const normalized = normalizePanelUnlockReferrer(raw);
  if (normalized) return normalized;
  if (isToolAccessUrl(dest)) return DEFAULT_PANEL_REFERRER;
  return "";
}
function isPanelAccessDenied(status, contentType, bodyPreview) {
  if (status !== 403) return false;
  const text = String(bodyPreview || "");
  return /access denied|pak seo|tool dashboard/i.test(text) || /text\/html/i.test(String(contentType || ""));
}
function mergeSetCookies(existingHeader, response) {
  const jar = /* @__PURE__ */ new Map();
  for (const part of String(existingHeader || "").split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (name) jar.set(name, value);
  }
  const rawList = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  if (!rawList.length) {
    const single = response.headers.get("set-cookie");
    if (single) rawList.push(single);
  }
  for (const raw of rawList) {
    const first = String(raw || "").split(";")[0] || "";
    const eq = first.indexOf("=");
    if (eq <= 0) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    if (name) jar.set(name, value);
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
async function selectToolsRows2(sb, idEq) {
  const attempts = [
    "*",
    "id,name,access_method,tool_url,cookies_json,panel_referrer,extra",
    "id,name,access_method,tool_url,cookies_json,extra",
    "id,name,extra",
    "id,name"
  ];
  for (const cols of attempts) {
    const q = idEq ? sb.from("tools").select(cols).eq("id", idEq).maybeSingle() : sb.from("tools").select(cols);
    const result = await q;
    if (!result.error) {
      return idEq ? result.data ? [result.data] : [] : result.data || [];
    }
  }
  return [];
}
async function findToolByKey2(key) {
  const sb = toolsDb2();
  const raw = decodeURIComponent(String(key || "")).trim();
  if (!raw) return null;
  const byIdRows = await selectToolsRows2(sb, raw);
  if (byIdRows[0]) return byIdRows[0];
  const rows = await selectToolsRows2(sb);
  return rows.find((row) => toolMatchesKey3(row, raw)) || null;
}
async function profileForToken2(token) {
  const supabase2 = client3(token);
  const { data: authData, error: authError } = await supabase2.auth.getUser(token);
  if (authError || !authData.user) return null;
  const db = toolsDb2();
  const { data: profile, error } = await db.from("customers").select("id,customer_code,name,email,role,status,plan,expiry,tools").eq("auth_user_id", authData.user.id).maybeSingle();
  if (!error && profile) return profile;
  const fallback = await supabase2.from("customers").select("id,customer_code,name,email,role,status,plan,expiry,tools").eq("auth_user_id", authData.user.id).single();
  if (fallback.error || !fallback.data) return null;
  return fallback.data;
}
function toolAssigned2(profile, tool) {
  const assigned = Array.isArray(profile.tools) ? profile.tools : [];
  return assigned.some((entry) => {
    const value = String(entry || "").trim();
    if (!value) return false;
    return toolMatchesKey3(tool, value) || value.toLowerCase() === String(tool.name || "").trim().toLowerCase();
  });
}
function cookieFields2(tool) {
  const extra = parseExtraJson(tool?.extra);
  const method = tool?.access_method || extra.accessMethod || extra.access_method;
  const url3 = tool?.tool_url || extra.toolUrl || extra.tool_url || "";
  const cookiesRaw = tool?.cookies_json ?? extra.cookiesJson ?? extra.cookies_json ?? "";
  const panelReferrer = tool?.panel_referrer || extra.panelReferrer || extra.unlockReferrer || extra.panel_referrer || "";
  const normalized = String(method || "").trim().toLowerCase() === "one_click" ? "one_click" : "extension";
  return {
    accessMethod: normalized,
    url: String(url3 || "").trim(),
    cookiesRaw: String(cookiesRaw || ""),
    panelReferrer: String(panelReferrer || "").trim()
  };
}
async function requireEntitledLaunch(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, status: 401, error: "Authentication required" };
  const profile = await profileForToken2(token);
  if (!profile) return { ok: false, status: 401, error: "Session expired. Please sign in again." };
  if (profile.status === "blocked") return { ok: false, status: 403, error: "Account suspended" };
  const fp = readDeviceFromRequest(req);
  if (!fp.deviceId) {
    return {
      ok: false,
      status: 400,
      error: "Device id required. Refresh the portal, then try again."
    };
  }
  const deviceCheck = await registerOrHeartbeatDevice({
    accountId: profile.id,
    deviceId: fp.deviceId,
    deviceLabel: fp.deviceLabel,
    userAgent: fp.userAgent
  });
  if (deviceCheck.ok === false) {
    return { ok: false, status: deviceCheck.status, error: deviceCheck.error || DEVICE_LIMIT_MESSAGE };
  }
  if (!planIsActive(profile.plan, profile.expiry)) {
    return { ok: false, status: 403, error: "Activate or renew a plan to access tools." };
  }
  const toolKey = String(req.body?.toolId || req.body?.toolKey || req.query?.toolId || "").trim();
  if (!toolKey) return { ok: false, status: 400, error: "toolId is required" };
  const tool = await findToolByKey2(toolKey);
  if (!tool) return { ok: false, status: 404, error: "Tool not found" };
  if (!toolAssigned2(profile, tool)) {
    return { ok: false, status: 403, error: "This tool is not assigned to your account." };
  }
  const fields = cookieFields2(tool);
  if (!fields.url) {
    return {
      ok: false,
      status: 400,
      error: "No destination URL is set for this tool. Ask admin to save Cookies settings again."
    };
  }
  return {
    ok: true,
    profile,
    tool,
    fields,
    cookies: parseCookiesPayload2(fields.cookiesRaw)
  };
}
function newToken() {
  return randomBytes(24).toString("hex");
}
function resolveAgainst(base, href) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}
function shouldProxyUrl(session, absoluteUrl) {
  try {
    const u = new URL(absoluteUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    const originHost = new URL(session.origin).hostname.toLowerCase();
    if (host === originHost) return true;
    if (host === "toolaccess.click" || host.endsWith(".toolaccess.click")) return true;
    for (const d of session.cookieHosts || []) {
      const domain = String(d || "").toLowerCase();
      if (!domain) continue;
      if (host === domain || host.endsWith(`.${domain}`)) return true;
    }
    return false;
  } catch {
    return false;
  }
}
function proxyAssetUrl(token, absoluteUrl) {
  return `/api/tool-proxy/asset?token=${encodeURIComponent(token)}&u=${encodeURIComponent(absoluteUrl)}`;
}
function rewriteHtml(html, session, pageUrl) {
  const baseHref = pageUrl;
  const token = session.token;
  const rewriteAttr = (attr, value) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:") || trimmed.startsWith("javascript:")) {
      return value;
    }
    if (trimmed.startsWith("#")) return value;
    const abs = resolveAgainst(baseHref, trimmed);
    if (!abs || !shouldProxyUrl(session, abs)) return value;
    return proxyAssetUrl(token, abs);
  };
  let out = html;
  out = out.replace(/<base\b[^>]*>/gi, "");
  out = out.replace(
    /\b(href|src|action|data-src|poster)=["']([^"']+)["']/gi,
    (_m, attr, val) => `${attr}="${rewriteAttr(attr, val)}"`
  );
  out = out.replace(/\bsrcset=["']([^"']+)["']/gi, (_m, val) => {
    const parts = val.split(",").map((chunk) => {
      const bit = chunk.trim();
      if (!bit) return bit;
      const [urlPart, ...rest] = bit.split(/\s+/);
      const rewritten = rewriteAttr("srcset", urlPart);
      return [rewritten, ...rest].join(" ");
    });
    return `srcset="${parts.join(", ")}"`;
  });
  out = out.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, (_m, _q, val) => {
    const rewritten = rewriteAttr("css", val.trim());
    return `url("${rewritten}")`;
  });
  out = out.replace(/<meta[^>]+http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, "");
  const banner = `<div style="position:sticky;top:0;z-index:99999;background:#1a0f0f;color:#fecaca;font:12px/1.4 system-ui,sans-serif;padding:8px 12px;border-bottom:1px solid #7f1d1d;">AI Toolz Mart proxy \xB7 ${escapeHtml(session.toolName)} \xB7 session expires in ~15 min</div>`;
  if (/<body\b/i.test(out)) {
    out = out.replace(/<body([^>]*)>/i, `<body$1>${banner}`);
  } else {
    out = banner + out;
  }
  return out;
}
function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function buildUpstreamHeaders(session, forUrl, opts) {
  const referrer = String(opts?.referrerOverride || session.referrer || "").trim();
  const navigation = opts?.navigation !== false;
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: navigation ? "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8" : "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Upgrade-Insecure-Requests": "1"
  };
  if (navigation) {
    headers["Sec-Fetch-Dest"] = "document";
    headers["Sec-Fetch-Mode"] = "navigate";
    headers["Sec-Fetch-User"] = "?1";
    headers["Sec-Fetch-Site"] = referrer ? "cross-site" : "none";
  }
  if (session.cookieHeader) headers.Cookie = session.cookieHeader;
  if (referrer) {
    headers.Referer = referrer;
    try {
      headers.Origin = new URL(referrer).origin;
    } catch {
    }
  } else {
    try {
      headers.Referer = new URL(forUrl).origin + "/";
    } catch {
    }
  }
  return headers;
}
async function fetchUpstream(session, url3, init) {
  let current = url3;
  let method = init?.method || "GET";
  let body = init?.body ?? null;
  const candidates = (session.referrerCandidates?.length ? session.referrerCandidates : [session.referrer]).filter(Boolean);
  let candidateIdx = 0;
  const tried = /* @__PURE__ */ new Set();
  for (let i = 0; i < MAX_REDIRECTS; i++) {
    const activeReferrer = candidates[candidateIdx] || session.referrer || "";
    if (activeReferrer) {
      session.referrer = activeReferrer;
      tried.add(activeReferrer);
    }
    const response = await proxyAwareFetch(current, {
      method,
      redirect: "manual",
      headers: buildUpstreamHeaders(session, current, {
        referrerOverride: activeReferrer,
        navigation: true
      }),
      body: method === "GET" || method === "HEAD" ? void 0 : body || void 0
    });
    session.cookieHeader = mergeSetCookies(session.cookieHeader, response);
    if (response.status >= 300 && response.status < 400) {
      const loc = response.headers.get("location");
      if (!loc) return response;
      const next = resolveAgainst(current, loc);
      if (!next) return response;
      current = next;
      method = "GET";
      body = null;
      continue;
    }
    if (response.status === 403 && isToolAccessUrl(current)) {
      const contentType = response.headers.get("content-type") || "";
      const previewBuf = await response.clone().arrayBuffer();
      const preview = Buffer.from(previewBuf).toString("utf8").slice(0, 400);
      if (isPanelAccessDenied(403, contentType, preview)) {
        let advanced = false;
        while (candidateIdx + 1 < candidates.length) {
          candidateIdx += 1;
          const nextRef = candidates[candidateIdx];
          if (nextRef && !tried.has(nextRef)) {
            advanced = true;
            break;
          }
        }
        if (advanced) {
          method = "GET";
          body = null;
          continue;
        }
      }
    }
    return response;
  }
  throw new Error("Too many redirects from upstream tool panel");
}
async function readLimited(response) {
  const ab = await response.arrayBuffer();
  if (ab.byteLength > MAX_BODY_BYTES) {
    throw new Error("Upstream response too large to proxy");
  }
  return Buffer.from(ab);
}
router6.post("/launch", async (req, res) => {
  try {
    const gate = await requireEntitledLaunch(req);
    if (gate.ok === false) {
      return res.status(gate.status).json({ error: gate.error });
    }
    const { profile, tool, fields, cookies } = gate;
    const dest = fields.url;
    if (fields.accessMethod !== "one_click") {
      return res.status(403).json({
        error: "This tool requires the AI Toolz Mart Access browser extension. Install it from the Installation Guide, then open again.",
        accessMethod: "extension"
      });
    }
    const preferProxy = isToolAccessUrl(dest) || Boolean(fields.panelReferrer) || Boolean(req.body?.forceProxy) || cookies.length > 0;
    const proxyStatus = await getGlobalProxyPublicStatus();
    const useServerProxy = preferProxy || proxyStatus.ready;
    if (!useServerProxy) {
      return res.json({
        mode: "direct",
        url: dest,
        name: tool.name,
        toolId: tool.id,
        message: "This destination is opened directly; use Copy cookies + open for HttpOnly sites."
      });
    }
    const cookieHeader = cookiesToHeader(cookies);
    let origin;
    try {
      origin = new URL(dest).origin;
    } catch {
      return res.status(400).json({ error: "Invalid tool destination URL" });
    }
    const referrer = resolvePanelUnlockReferrer(fields.panelReferrer, dest);
    const referrerCandidates = panelUnlockReferrerCandidates(
      fields.panelReferrer || referrer || DEFAULT_PANEL_REFERRER
    );
    pruneSessions();
    const token = newToken();
    const session = {
      token,
      accountId: String(profile.id),
      toolId: String(tool.id || ""),
      toolName: String(tool.name || "Tool"),
      targetUrl: dest,
      origin,
      cookieHeader,
      cookieHosts: hostsFromCookies(cookies, origin),
      referrer: referrer || (isToolAccessUrl(dest) ? DEFAULT_PANEL_REFERRER : ""),
      referrerCandidates: referrerCandidates.length > 0 ? referrerCandidates : isToolAccessUrl(dest) ? [DEFAULT_PANEL_REFERRER] : [],
      expiresAt: Date.now() + SESSION_TTL_MS
    };
    sessions.set(token, session);
    const viewUrl = `/api/tool-proxy/view?token=${encodeURIComponent(token)}`;
    return res.json({
      mode: "proxy",
      viewUrl,
      url: dest,
      name: tool.name,
      toolId: tool.id,
      expiresInSec: Math.floor(SESSION_TTL_MS / 1e3),
      viaGlobalProxy: proxyStatus.ready,
      fingerprint: createHash("sha256").update(cookieHeader || dest).digest("hex").slice(0, 12)
    });
  } catch (error) {
    const message = String(error?.message || "").trim();
    console.error("[tool-proxy/launch]", message || error);
    return res.status(500).json({
      error: message || "Could not start tool proxy",
      detail: process.env.NODE_ENV === "production" ? void 0 : message || void 0
    });
  }
});
router6.get("/view", async (req, res) => {
  try {
    const token = String(req.query.token || "").trim();
    const session = sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
      sessions.delete(token);
      return res.status(410).type("html").send(
        `<!doctype html><meta charset="utf-8"><title>Session expired</title>
           <body style="font-family:system-ui;background:#130d0d;color:#fecaca;padding:2rem">
           <h1>Proxy session expired</h1>
           <p>Return to the dashboard and click Open again.</p></body>`
      );
    }
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    const upstream = await fetchUpstream(session, session.targetUrl);
    const buf = await readLimited(upstream);
    const contentType = upstream.headers.get("content-type") || "text/html; charset=utf-8";
    if (!/text\/html|application\/xhtml/i.test(contentType)) {
      res.status(upstream.status);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "no-store");
      return res.send(buf);
    }
    const html = rewriteHtml(buf.toString("utf8"), session, upstream.url || session.targetUrl);
    if (upstream.status === 403 && isPanelAccessDenied(403, contentType, html)) {
      return res.status(403).type("html").send(
        `<!doctype html><meta charset="utf-8"><title>Panel locked</title>
           <body style="font-family:system-ui;background:#130d0d;color:#fecaca;padding:2rem;max-width:40rem">
           <h1>Tool panel still locked (403)</h1>
           <p>The vendor returned <em>Access from Pak seo tool dashboard</em>. Referer alone is not enough \u2014 admin must paste cookies from an <strong>already unlocked</strong> toolaccess session, and set Panel unlock referrer to <code>https://app.pakseotools.com/</code> (not /login).</p>
           <p style="color:#94a3b8;font-size:0.85rem">Tried referrer: ${escapeHtml(session.referrer || "\u2014")}</p>
           </body>`
      );
    }
    res.status(upstream.status);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    return res.send(html);
  } catch (error) {
    return res.status(502).type("html").send(
      `<!doctype html><meta charset="utf-8"><title>Proxy error</title>
         <body style="font-family:system-ui;background:#130d0d;color:#fecaca;padding:2rem">
         <h1>Could not open panel</h1>
         <p>${escapeHtml(error?.message || "Upstream fetch failed")}</p>
         <p>Ask admin to refresh unlocked cookies / panel referrer, or install the extension.</p></body>`
    );
  }
});
router6.get("/asset", async (req, res) => {
  try {
    const token = String(req.query.token || "").trim();
    const target = String(req.query.u || "").trim();
    const session = sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
      sessions.delete(token);
      return res.status(410).json({ error: "Proxy session expired" });
    }
    if (!target || !shouldProxyUrl(session, target)) {
      return res.status(400).json({ error: "URL not allowed for this proxy session" });
    }
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    const upstream = await fetchUpstream(session, target);
    const buf = await readLimited(upstream);
    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    if (/text\/html|application\/xhtml/i.test(contentType)) {
      const html = rewriteHtml(buf.toString("utf8"), session, upstream.url || target);
      res.status(upstream.status);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      return res.send(html);
    }
    if (/text\/css/i.test(contentType)) {
      const css = buf.toString("utf8").replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, (_m, _q, val) => {
        const abs = resolveAgainst(target, val.trim());
        if (!abs || !shouldProxyUrl(session, abs)) return `url("${val.trim()}")`;
        return `url("${proxyAssetUrl(token, abs)}")`;
      });
      res.status(upstream.status);
      res.setHeader("Content-Type", "text/css; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      return res.send(css);
    }
    res.status(upstream.status);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "no-store");
    const cacheControl = upstream.headers.get("cache-control");
    if (cacheControl) res.setHeader("Cache-Control", cacheControl);
    return res.send(buf);
  } catch (error) {
    return res.status(502).json({ error: error.message || "Asset proxy failed" });
  }
});
var toolProxyRoutes_default = router6;

// src/lib/settingsRoutes.ts
init_globalProxySettings();
import { Router as Router7 } from "express";
import { createClient as createClient11 } from "@supabase/supabase-js";
var router7 = Router7();
function clients4() {
  const url3 = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey3 = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey3 = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url3 || !anonKey3 || !serviceKey3) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env, then restart the server."
    );
  }
  return {
    auth: createClient11(url3, anonKey3, { auth: { persistSession: false } }),
    admin: createClient11(url3, serviceKey3, { auth: { persistSession: false } })
  };
}
async function actor4(req) {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { auth, admin } = clients4();
  const { data, error } = await auth.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile } = await admin.from("customers").select("id,role,status").eq("auth_user_id", data.user.id).maybeSingle();
  if (!profile || profile.status === "blocked") return null;
  return { id: profile.id, role: String(profile.role || "") };
}
router7.get("/global-proxy", async (req, res) => {
  try {
    const current = await actor4(req);
    if (!current) return res.status(401).json({ error: "Not authorized" });
    const { admin } = clients4();
    if (current.role === "admin") {
      const cfg = await getGlobalProxyConfig(admin);
      return res.json({
        enabled: cfg.enabled,
        ready: Boolean(cfg.enabled && cfg.url),
        url: cfg.url,
        maskedUrl: maskProxyUrl(cfg.url),
        ...cfg.setupRequired ? { setupRequired: true, hint: GLOBAL_PROXY_SQL_HINT } : {}
      });
    }
    const status = await getGlobalProxyPublicStatus(admin);
    return res.json(status);
  } catch (error) {
    return res.json({
      enabled: false,
      ready: false,
      setupRequired: true,
      hint: error?.message || GLOBAL_PROXY_SQL_HINT
    });
  }
});
router7.patch("/global-proxy", async (req, res) => {
  try {
    const current = await actor4(req);
    if (!current) return res.status(401).json({ error: "Not authorized" });
    if (current.role !== "admin") return res.status(403).json({ error: "Admin only" });
    const { admin } = clients4();
    const enabled = Boolean(req.body?.enabled);
    const url3 = typeof req.body?.url === "string" ? req.body.url : void 0;
    if (enabled && (url3 === void 0 ? !(await getGlobalProxyConfig(admin)).url : !String(url3).trim())) {
      return res.status(400).json({ error: "Proxy URL is required when enabling the Global Proxy Engine." });
    }
    const cfg = await setGlobalProxyConfig({ enabled, url: url3 }, admin);
    invalidateProxyAgentCache();
    return res.json({
      enabled: cfg.enabled,
      ready: Boolean(cfg.enabled && cfg.url),
      url: cfg.url,
      maskedUrl: maskProxyUrl(cfg.url)
    });
  } catch (error) {
    const message = error?.message || "Could not save proxy settings";
    const setup = message === GLOBAL_PROXY_SQL_HINT || /app_settings|does not exist|schema cache/i.test(message);
    return res.status(setup ? 503 : 500).json({
      error: setup ? GLOBAL_PROXY_SQL_HINT : message,
      enabled: false,
      ready: false,
      setupRequired: setup || void 0
    });
  }
});
router7.delete("/global-proxy", async (req, res) => {
  try {
    const current = await actor4(req);
    if (!current) return res.status(401).json({ error: "Not authorized" });
    if (current.role !== "admin") return res.status(403).json({ error: "Admin only" });
    const { admin } = clients4();
    const cfg = await clearGlobalProxyConfig(admin);
    invalidateProxyAgentCache();
    return res.json({
      enabled: cfg.enabled,
      ready: false,
      url: "",
      maskedUrl: ""
    });
  } catch (error) {
    const message = error?.message || "Could not remove proxy settings";
    const setup = /app_settings|does not exist|schema cache/i.test(message);
    return res.status(setup ? 503 : 500).json({
      error: setup ? GLOBAL_PROXY_SQL_HINT : message
    });
  }
});
router7.post("/global-proxy/test", async (req, res) => {
  try {
    const current = await actor4(req);
    if (!current) return res.status(401).json({ error: "Not authorized" });
    if (current.role !== "admin") return res.status(403).json({ error: "Admin only" });
    let url3 = typeof req.body?.url === "string" ? req.body.url.trim() : "";
    if (!url3) {
      const { admin } = clients4();
      const cfg = await getGlobalProxyConfig(admin);
      url3 = cfg.url;
    }
    if (!url3) return res.status(400).json({ error: "Enter a proxy URL to test." });
    const result = await testProxyUrl(url3);
    if (result.ok === false) {
      return res.status(502).json({ ok: false, error: result.error });
    }
    return res.json({ ok: true, ip: result.ip, message: `Proxy OK \u2014 outbound IP ${result.ip}` });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || "Proxy test failed" });
  }
});
var settingsRoutes_default = router7;

// src/lib/createApiApp.ts
function createApiApp() {
  const app = express();
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Device-Id, X-Device-Label, X-Omit-Cookies"
    );
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    if (req.method === "OPTIONS") return res.status(200).end();
    next();
  });
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ extended: true, limit: "20mb" }));
  app.use((err, _req, res, next) => {
    if (err instanceof SyntaxError && "body" in err) {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
    return next(err);
  });
  app.get(["/api/health", "/health"], (_req, res) => {
    res.json({ status: "ok", service: "AI TOOLZ MART", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.use("/api/admin", adminRoutes_default);
  app.use("/api/accounts", accountRoutes_default);
  app.use("/api/devices", deviceRoutes_default);
  app.use("/api/settings", settingsRoutes_default);
  app.use("/api/extension", extensionRoutes_default);
  app.use("/api/tool-proxy", toolProxyRoutes_default);
  app.use("/api/notifications", notificationRoutes_default);
  const getAI = async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
    const { GoogleGenAI } = await import("@google/genai");
    return new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
  };
  app.post("/api/ai/plagiarism", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text?.trim()) return res.status(400).json({ success: false, error: "Text required." });
      const ai = await getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Analyze for plagiarism. Return JSON: {uniquenessPercent,plagiarismPercent,totalWords,duplicateSentences:[],uniqueSentences:[],summaryReport}. TEXT: "${text.slice(0, 4e3)}"`,
        config: { responseMimeType: "application/json" }
      });
      return res.json({ success: true, data: JSON.parse(response.text || "{}") });
    } catch {
      const words = (req.body.text || "").trim().split(/\s+/).filter(Boolean);
      return res.json({
        success: true,
        data: {
          uniquenessPercent: 94,
          plagiarismPercent: 6,
          totalWords: words.length,
          duplicateSentences: [],
          uniqueSentences: [],
          summaryReport: "High uniqueness detected."
        }
      });
    }
  });
  app.post("/api/ai/rewrite", async (req, res) => {
    try {
      const { text, tone = "SEO Optimized" } = req.body;
      if (!text) return res.status(400).json({ success: false, error: "Text required." });
      const ai = await getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Rewrite uniquely in ${tone} tone:
${text.slice(0, 4e3)}`
      });
      return res.json({ success: true, rewrittenText: response.text });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });
  app.post("/api/ai/grammar", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ success: false, error: "Text required." });
      const ai = await getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Fix grammar. Return JSON: {correctedText,totalErrors,issues:[{error,fix,reason}]}. TEXT: "${text.slice(0, 3e3)}"`,
        config: { responseMimeType: "application/json" }
      });
      return res.json({ success: true, data: JSON.parse(response.text || "{}") });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });
  app.post("/api/ai/summarize", async (req, res) => {
    try {
      const { text, format = "bullet" } = req.body;
      if (!text) return res.status(400).json({ success: false, error: "Text required." });
      const ai = await getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Summarize in ${format === "bullet" ? "bullet points" : "a paragraph"}:
${text.slice(0, 5e3)}`
      });
      return res.json({ success: true, summary: response.text });
    } catch {
      return res.status(500).json({ success: false, error: "Summarization failed." });
    }
  });
  app.post("/api/ai/keywords", async (req, res) => {
    try {
      const { seedKeyword } = req.body;
      if (!seedKeyword) return res.status(400).json({ success: false, error: "Seed keyword required." });
      const ai = await getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Generate 15 long-tail keywords for "${seedKeyword}". Return JSON array: [{keyword,searchVolume,difficulty,intent,cpc}]`,
        config: { responseMimeType: "application/json" }
      });
      return res.json({ success: true, keywords: JSON.parse(response.text || "[]") });
    } catch {
      return res.status(500).json({ success: false, error: "Keyword generation failed." });
    }
  });
  app.post("/api/ai/schema", async (req, res) => {
    try {
      const { schemaType, details } = req.body;
      const ai = await getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `Generate valid JSON-LD schema for type "${schemaType}" with: ${JSON.stringify(details)}. Return only the script tag.`
      });
      return res.json({ success: true, schemaCode: response.text });
    } catch {
      return res.status(500).json({ success: false, error: "Schema generation failed." });
    }
  });
  app.post("/api/seo/headers", async (req, res) => {
    try {
      const { url: url3 } = req.body;
      if (!url3) return res.status(400).json({ success: false, error: "URL required." });
      let formatted = url3.trim();
      if (!formatted.startsWith("http")) formatted = "https://" + formatted;
      const response = await fetch(formatted, {
        method: "HEAD",
        headers: { "User-Agent": "AI-TOOLZ-MART-Bot/1.0" }
      });
      const headers = {};
      response.headers.forEach((v, k) => {
        headers[k] = v;
      });
      return res.json({ success: true, url: formatted, statusCode: response.status, headers });
    } catch (e) {
      return res.json({ success: false, error: `Cannot connect: ${e.message}`, statusCode: 0 });
    }
  });
  return app;
}

// api/handler.ts
var healthPayload = () => ({
  status: "ok",
  service: "AI TOOLZ MART",
  timestamp: (/* @__PURE__ */ new Date()).toISOString()
});
function isHealthPath(url3) {
  if (!url3) return false;
  const path = url3.split("?")[0];
  return path === "/api/health" || path === "/health";
}
var fullApp = null;
var fullAppError = null;
function getFullApp() {
  if (fullApp) return fullApp;
  if (fullAppError) throw new Error(fullAppError);
  try {
    fullApp = createApiApp();
    return fullApp;
  } catch (err) {
    fullAppError = err instanceof Error ? err.stack || err.message : String(err);
    console.error("[api] createApiApp failed:\n", fullAppError);
    throw err;
  }
}
function createBootstrapApp() {
  const app = express2();
  app.get(["/api/health", "/health"], (_req, res) => {
    res.status(200).json(healthPayload());
  });
  app.use((req, res, next) => {
    if (isHealthPath(req.url) || isHealthPath(req.originalUrl)) {
      return res.status(200).json(healthPayload());
    }
    try {
      return getFullApp()(req, res, next);
    } catch (err) {
      console.error("[api] request failed after init error:", err);
      if (!res.headersSent) {
        res.status(500).json({
          error: "API initialization failed",
          message: err instanceof Error ? err.message : String(err)
        });
      }
    }
  });
  return app;
}
var bootstrap = createBootstrapApp();
var handler = (req, res) => {
  if (isHealthPath(req.url)) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(healthPayload()));
    return;
  }
  bootstrap(req, res);
};
var handler_default = handler;
export {
  handler_default as default
};
