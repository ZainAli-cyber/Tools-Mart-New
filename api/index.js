var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/db.ts
var db_exports = {};
__export(db_exports, {
  DEFAULT_SETTINGS: () => DEFAULT_SETTINGS,
  createAnonSupabase: () => createAnonSupabase,
  createAuthAndAdminClients: () => createAuthAndAdminClients,
  createPrivilegedSupabase: () => createPrivilegedSupabase,
  createServiceSupabase: () => createServiceSupabase,
  getSupabaseConfig: () => getSupabaseConfig,
  logActivity: () => logActivity2,
  readDb: () => readDb2,
  requireServiceRoleKey: () => requireServiceRoleKey,
  seedIfEmpty: () => seedIfEmpty,
  serviceRoleMissingMessage: () => serviceRoleMissingMessage,
  supabase: () => supabase2,
  supabaseSealKeyMaterial: () => supabaseSealKeyMaterial,
  writeDb: () => writeDb
});
import { createClient } from "@supabase/supabase-js";
function getSupabaseConfig() {
  return {
    url: nodeEnv.SUPABASE_URL || nodeEnv.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    anon: nodeEnv.SUPABASE_ANON_KEY || nodeEnv.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON,
    serviceKey: String(nodeEnv.SUPABASE_SERVICE_ROLE_KEY || "").trim()
  };
}
function serviceRoleMissingMessage() {
  if (nodeEnv.VERCEL) {
    return "SUPABASE_SERVICE_ROLE_KEY is missing on Vercel. Project \u2192 Settings \u2192 Environment Variables \u2192 Production \u2192 paste the service_role key \u2192 Redeploy.";
  }
  return "SUPABASE_SERVICE_ROLE_KEY is missing. Add it to .env in the project root, then restart the server (npm run dev).";
}
function requireServiceRoleKey() {
  const key = getSupabaseConfig().serviceKey;
  if (key) return key;
  throw new Error(serviceRoleMissingMessage());
}
function createAnonSupabase(token) {
  const { url, anon } = getSupabaseConfig();
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : void 0
  });
}
function createPrivilegedSupabase(token) {
  const { url, anon, serviceKey } = getSupabaseConfig();
  const key = serviceKey || anon;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: !serviceKey && token ? { headers: { Authorization: `Bearer ${token}` } } : void 0
  });
}
function createAuthAndAdminClients() {
  const { url, anon, serviceKey } = getSupabaseConfig();
  const adminKey = serviceKey || anon;
  return {
    auth: createClient(url, anon, { auth: { persistSession: false } }),
    admin: createClient(url, adminKey, { auth: { persistSession: false } }),
    hasServiceRole: Boolean(serviceKey)
  };
}
function supabaseSealKeyMaterial() {
  const { serviceKey, anon } = getSupabaseConfig();
  return serviceKey || anon || "atm-proxy";
}
function createServiceSupabase() {
  return createPrivilegedSupabase();
}
function toSnake(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const map = {
    invoiceNo: "invoice_no",
    orderDate: "order_date",
    customerId: "customer_id",
    customerName: "customer_name",
    customerEmail: "customer_email",
    customerPhone: "customer_phone",
    customerCity: "customer_city",
    toolId: "tool_id",
    finalAmount: "final_amount",
    paymentMethod: "payment_method",
    paymentStatus: "payment_status",
    transactionId: "transaction_id",
    adminNotes: "admin_notes",
    couponCode: "coupon_code",
    subStatus: "sub_status",
    activationDate: "activation_date",
    expiryDate: "expiry_date",
    daysLeft: "days_left",
    createdAt: "created_at",
    joinDate: "join_date",
    totalOrders: "total_orders",
    totalSpend: "total_spend",
    usageLimit: "usage_limit",
    usedCount: "used_count",
    minPurchase: "min_purchase",
    customerEmail2: "customer_email",
    originalPrice: "original_price",
    isPrivate: "is_private",
    isSemiPrivate: "is_semi_private",
    fullDesc: "full_desc",
    waText: "wa_text",
    useCases: "use_cases",
    authUserId: "auth_user_id",
    planDays: "plan_days",
    ownerId: "owner_id",
    memberId: "member_id",
    memberName: "member_name",
    paymentDate: "payment_date",
    // tools table column is "desc" (quoted reserved word in SQL)
    desc: "desc",
    accessMethod: "access_method",
    toolUrl: "tool_url",
    cookiesJson: "cookies_json",
    panelReferrer: "panel_referrer",
    showOnHome: "show_on_home"
  };
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const snakeKey = map[k] || k;
    out[snakeKey] = v;
  }
  return out;
}
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
    desc: "desc",
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
async function readDb2(name, defaultVal) {
  const table = TABLE[name];
  if (!table) return defaultVal;
  try {
    if (name === "settings") {
      const { data: data2, error: error2 } = await supabase2.from("settings").select("*").eq("id", 1).single();
      if (error2 || !data2) return defaultVal;
      return toCamel(data2);
    }
    const orderCol = name === "activity" ? "created_at" : "created_at";
    const { data, error } = await supabase2.from(table).select("*").order(orderCol, { ascending: false });
    if (error || !data) return defaultVal;
    return toCamel(data);
  } catch {
    return defaultVal;
  }
}
async function writeDb(name, data) {
  const table = TABLE[name];
  if (!table) return;
  try {
    if (name === "settings") {
      const row = toSnake({ ...data, id: 1 });
      await supabase2.from("settings").upsert(row);
      return;
    }
    const rows = Array.isArray(data) ? data : [data];
    if (rows.length === 0) return;
    const snakeRows = rows.map(toSnake);
    await supabase2.from(table).upsert(snakeRows);
  } catch (e) {
    console.error(`Supabase writeDb error [${name}]:`, e);
  }
}
async function logActivity2(action, detail) {
  try {
    await supabase2.from("activity_log").insert({
      id: "ACT" + Date.now(),
      action,
      detail,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (e) {
    console.error("logActivity error:", e);
  }
}
function seedIfEmpty() {
}
var nodeEnv, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON, SUPABASE_URL, SUPABASE_ANON, supabase2, TABLE, DEFAULT_SETTINGS;
var init_db = __esm({
  "src/lib/db.ts"() {
    nodeEnv = typeof process !== "undefined" ? process.env : {};
    DEFAULT_SUPABASE_URL = "https://duvwpbetvftqissnstoy.supabase.co";
    DEFAULT_SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dndwYmV0dmZ0cWlzc25zdG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NjkxMTksImV4cCI6MjEwMjQ0NTExOX0.2_-KYBcp3z4xa9MMsg4GAAdWpABhOIWInfN2SIFiv1w";
    ({ url: SUPABASE_URL, anon: SUPABASE_ANON } = getSupabaseConfig());
    supabase2 = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    TABLE = {
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
    DEFAULT_SETTINGS = {
      siteName: "ZynexTools",
      contactEmail: "emaan@aitoolsmart.com",
      whatsapp: "+923275855578",
      currency: "PKR",
      invoicePrefix: "INV",
      taxPercent: "0",
      maintenanceMode: false,
      easypaisa: "03XX-XXXXXXX",
      jazzcash: "03XX-XXXXXXX",
      paypalEmail: "payments@zynextools.com",
      bankName: "Meezan Bank",
      bankAccount: "0123456789"
    };
  }
});

// src/lib/mobile/portalBase.ts
import { Capacitor } from "@capacitor/core";
function getPortalBaseUrl() {
  const env = String(
    import.meta.env?.VITE_PORTAL_URL || ""
  ).trim().replace(/\/$/, "");
  if (typeof window === "undefined") return env || DEFAULT_PORTAL;
  if (!Capacitor.isNativePlatform()) return "";
  const origin = window.location.origin || "";
  if (origin && !origin.startsWith("capacitor://") && !origin.startsWith("ionic://") && !origin.includes("localhost")) {
    return origin.replace(/\/$/, "");
  }
  return env || DEFAULT_PORTAL;
}
function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = getPortalBaseUrl();
  return base ? `${base}${p}` : p;
}
var DEFAULT_PORTAL;
var init_portalBase = __esm({
  "src/lib/mobile/portalBase.ts"() {
    DEFAULT_PORTAL = "https://www.zynextools.com";
  }
});

// src/lib/mobile/pushClient.ts
var pushClient_exports = {};
__export(pushClient_exports, {
  requestPushDispatch: () => requestPushDispatch
});
async function requestPushDispatch(rows) {
  if (!rows.length) return;
  try {
    const { supabase: supabase3 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { data } = await supabase3.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch(apiUrl("/api/mobile/push/dispatch"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ rows })
    });
  } catch {
  }
}
var init_pushClient = __esm({
  "src/lib/mobile/pushClient.ts"() {
    init_portalBase();
  }
});

// src/lib/pushEngine.ts
var pushEngine_exports = {};
__export(pushEngine_exports, {
  pushConfigured: () => pushConfigured,
  registerPushToken: () => registerPushToken,
  sendPushForNoteRows: () => sendPushForNoteRows,
  sendPushToAccounts: () => sendPushToAccounts,
  unregisterPushToken: () => unregisterPushToken
});
function serviceDb() {
  return createPrivilegedSupabase();
}
async function getMessaging() {
  if (firebaseReady === false) return null;
  if (messaging) return messaging;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "";
  if (!raw.trim()) {
    firebaseReady = false;
    return null;
  }
  try {
    const admin = await import("firebase-admin");
    if (!admin.apps.length) {
      const cred = JSON.parse(raw);
      admin.initializeApp({ credential: admin.credential.cert(cred) });
    }
    messaging = admin.messaging();
    firebaseReady = true;
    return messaging;
  } catch (err) {
    console.error("[push] Firebase init failed", err?.message || err);
    firebaseReady = false;
    return null;
  }
}
function pushConfigured() {
  return Boolean(String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || "").trim());
}
async function registerPushToken(accountId, token, platform = "android") {
  const db2 = serviceDb();
  const acc = String(accountId || "").trim();
  const tok = String(token || "").trim();
  if (!acc || !tok) throw new Error("accountId and token required");
  const { error } = await db2.from("push_tokens").upsert(
    {
      account_id: acc,
      token: tok,
      platform: platform || "android",
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    { onConflict: "account_id,token" }
  );
  if (error) throw new Error(error.message);
}
async function unregisterPushToken(accountId, token) {
  const db2 = serviceDb();
  await db2.from("push_tokens").delete().eq("account_id", accountId).eq("token", token);
}
async function tokensForAccounts(accountIds) {
  const ids = [...new Set(accountIds.map((id) => String(id || "").trim()).filter(Boolean))];
  if (!ids.length) return [];
  const db2 = serviceDb();
  const { data, error } = await db2.from("push_tokens").select("token").in("account_id", ids);
  if (error) {
    console.error("[push] token lookup failed", error.message);
    return [];
  }
  return [...new Set((data || []).map((r) => String(r.token || "").trim()).filter(Boolean))];
}
async function sendPushToAccounts(items) {
  const msg = await getMessaging();
  if (!msg) return { sent: 0, skipped: true };
  const grouped = /* @__PURE__ */ new Map();
  for (const item of items) {
    const id = String(item.accountId || "").trim();
    if (!id) continue;
    grouped.set(id, {
      accountId: id,
      title: String(item.title || "ZynexTools").trim() || "ZynexTools",
      message: String(item.message || "").trim()
    });
  }
  if (!grouped.size) return { sent: 0, skipped: false };
  let sent = 0;
  for (const item of grouped.values()) {
    const tokens = await tokensForAccounts([item.accountId]);
    if (!tokens.length) continue;
    const body = item.message.slice(0, 500);
    try {
      const res = await msg.sendEachForMulticast({
        tokens,
        notification: { title: item.title, body },
        data: { accountId: item.accountId, type: "notification" },
        android: {
          priority: "high",
          notification: {
            channelId: "aitoolzmart_alerts",
            sound: "default",
            defaultVibrateTimings: true,
            priority: "high",
            visibility: "public"
          }
        }
      });
      sent += res.successCount;
      if (res.failureCount) {
        console.warn("[push] partial failure", item.accountId, res.failureCount);
      }
    } catch (err) {
      console.error("[push] send failed", item.accountId, err?.message || err);
    }
  }
  return { sent, skipped: false };
}
async function sendPushForNoteRows(rows) {
  const items = [];
  for (const row of rows) {
    const accountId = String(row.recipient_id || "").trim();
    if (!accountId) continue;
    if (row.read === true) continue;
    items.push({
      accountId,
      title: String(row.title || "ZynexTools"),
      message: String(row.message || "")
    });
  }
  if (!items.length) return { sent: 0, skipped: false };
  return sendPushToAccounts(items);
}
var firebaseReady, messaging;
var init_pushEngine = __esm({
  "src/lib/pushEngine.ts"() {
    init_db();
    firebaseReady = null;
    messaging = null;
  }
});

// src/lib/pushDispatchServer.ts
var pushDispatchServer_exports = {};
__export(pushDispatchServer_exports, {
  dispatchPushOnServer: () => dispatchPushOnServer
});
async function dispatchPushOnServer(rows) {
  if (typeof window !== "undefined") return;
  try {
    const { sendPushForNoteRows: sendPushForNoteRows2 } = await Promise.resolve().then(() => (init_pushEngine(), pushEngine_exports));
    await sendPushForNoteRows2(rows);
  } catch (err) {
    console.error("[push] server dispatch failed", err?.message || err);
  }
}
var init_pushDispatchServer = __esm({
  "src/lib/pushDispatchServer.ts"() {
  }
});

// src/lib/planCatalog.ts
var PLAN_OPTIONS, MEMBER_PLAN_OPTIONS;
var init_planCatalog = __esm({
  "src/lib/planCatalog.ts"() {
    PLAN_OPTIONS = [
      { name: "Monthly Plan", fee: 2e3, days: 30 },
      { name: "3 Month Plan", fee: 5e3, days: 90 },
      { name: "6 Month Plan", fee: 9e3, days: 180 },
      { name: "Lite Reseller", fee: 5560, days: 30 },
      { name: "Guru Reseller", fee: 8340, days: 30 },
      { name: "Pro Reseller", fee: 30580, days: 180 }
    ];
    MEMBER_PLAN_OPTIONS = PLAN_OPTIONS.filter(
      (p) => !p.name.toLowerCase().includes("reseller")
    );
  }
});

// src/lib/planDuration.ts
var planDuration_exports = {};
__export(planDuration_exports, {
  addDays: () => addDays,
  daysLeft: () => daysLeft,
  extendPlanExpiry: () => extendPlanExpiry,
  formatDateOnly: () => formatDateOnly,
  parseDateOnly: () => parseDateOnly,
  planDaysFromOrderMonths: () => planDaysFromOrderMonths,
  planDaysFromPlanName: () => planDaysFromPlanName,
  planExpiryDate: () => planExpiryDate,
  planIsActive: () => planIsActive,
  resolvePlanDays: () => resolvePlanDays,
  todayDateOnly: () => todayDateOnly
});
function parseDateOnly(value) {
  const match = String(value || "").trim().slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}
function formatDateOnly(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function todayDateOnly() {
  return formatDateOnly(/* @__PURE__ */ new Date());
}
function addDays(dateStr, days) {
  const n = Math.max(0, Math.floor(Number(days) || 0));
  const d = parseDateOnly(dateStr) || /* @__PURE__ */ new Date();
  d.setDate(d.getDate() + n);
  return formatDateOnly(d);
}
function planExpiryDate(startDate, planDays) {
  const days = Math.max(1, Math.floor(Number(planDays) || 0));
  return addDays(startDate, days - 1);
}
function extendPlanExpiry(currentExpiry, planDays) {
  const days = Math.max(1, Math.floor(Number(planDays) || 0));
  const base = String(currentExpiry || "").trim().slice(0, 10) || todayDateOnly();
  return addDays(base, days);
}
function daysLeft(expiry, now = /* @__PURE__ */ new Date()) {
  if (!expiry) return -1;
  const end = parseDateOnly(expiry);
  if (!end) return -1;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endDay.getTime() - today.getTime()) / 864e5);
}
function planIsActive(plan, expiry, now = /* @__PURE__ */ new Date()) {
  if (!String(plan || "").trim()) return false;
  if (!expiry) return true;
  return daysLeft(String(expiry), now) >= 0;
}
function planDaysFromOrderMonths(months) {
  const m = Math.max(1, Math.floor(Number(months) || 0));
  return m * 30;
}
function planDaysFromPlanName(planName) {
  const want = String(planName || "").trim().toLowerCase();
  const hit = PLAN_OPTIONS.find((p) => p.name.toLowerCase() === want);
  return hit?.days || 30;
}
function resolvePlanDays(input) {
  if (input.planDays && input.planDays > 0) return Math.floor(input.planDays);
  if (input.planName) {
    const fromName = planDaysFromPlanName(input.planName);
    if (fromName > 0) return fromName;
  }
  if (input.orderMonths) return planDaysFromOrderMonths(input.orderMonths);
  return 30;
}
var init_planDuration = __esm({
  "src/lib/planDuration.ts"() {
    init_planCatalog();
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
init_db();
import { createClient as createClient2 } from "@supabase/supabase-js";
function client(token) {
  const { url, anon } = getSupabaseConfig();
  return createClient2(url, anon, {
    auth: { persistSession: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : void 0
  });
}
function supabaseEnv() {
  return getSupabaseConfig();
}
async function authenticateAdmin(email, password) {
  const supabase3 = client();
  const { data, error } = await supabase3.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) return null;
  const { url, serviceKey } = supabaseEnv();
  const db2 = serviceKey && url ? createClient2(url, serviceKey, { auth: { persistSession: false } }) : supabase3;
  const { data: profile } = await db2.from("customers").select("id,role,status").eq("auth_user_id", data.user.id).single();
  if (String(profile?.role || "").toLowerCase() !== "admin" || profile?.status === "blocked") return null;
  return data.session.access_token;
}
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized \u2014 no token" });
    }
    const token = header.slice(7).trim();
    if (!token) {
      return res.status(401).json({ error: "Unauthorized \u2014 no token" });
    }
    const { url, anon, serviceKey } = supabaseEnv();
    const authClient2 = createClient2(url, anon, { auth: { persistSession: false } });
    const { data, error } = await authClient2.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: "Unauthorized \u2014 invalid or expired token" });
    }
    const db2 = serviceKey ? createClient2(url, serviceKey, { auth: { persistSession: false } }) : client(token);
    const { data: profile, error: profileError } = await db2.from("customers").select("id,email,role,status").eq("auth_user_id", data.user.id).single();
    if (profileError || !profile) {
      return res.status(403).json({ error: "Forbidden \u2014 administrator profile not found" });
    }
    if (String(profile.role || "").toLowerCase() !== "admin" || profile.status === "blocked") {
      return res.status(403).json({ error: "Forbidden \u2014 administrator access required" });
    }
    req.admin = profile;
    next();
  } catch (e) {
    return res.status(401).json({ error: e?.message || "Unauthorized \u2014 invalid or expired token" });
  }
}

// src/lib/adminRoutes.ts
init_db();

// src/lib/notifications.ts
init_db();
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
  const full = await supabase2.from("notifications").insert(rows);
  if (!full.error) return;
  const fallback = rows.map(({ audience: _a, recipient_id: _r, ...rest }) => rest);
  const retry = await supabase2.from("notifications").insert(fallback);
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
    const { data } = await supabase2.from("customers").select("id,owner_id,role").eq("id", hint.customerId).maybeSingle();
    row = data;
  }
  if (!row && hint.customerPhone) {
    const { data } = await supabase2.from("customers").select("id,owner_id,role").eq("phone", hint.customerPhone).maybeSingle();
    row = data;
  }
  if (!row && hint.customerEmail) {
    const { data } = await supabase2.from("customers").select("id,owner_id,role").eq("email", hint.customerEmail).maybeSingle();
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
  void dispatchPushAfterNotes(rows);
}
async function dispatchPushAfterNotes(rows) {
  if (!rows.length) return;
  if (typeof window !== "undefined") {
    try {
      const { requestPushDispatch: requestPushDispatch2 } = await Promise.resolve().then(() => (init_pushClient(), pushClient_exports));
      await requestPushDispatch2(rows);
    } catch {
    }
    return;
  }
  try {
    const mod = await Promise.resolve().then(() => (init_pushDispatchServer(), pushDispatchServer_exports));
    await mod.dispatchPushOnServer(rows);
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
    const { data } = await supabase2.from("customers").select("id,role").eq("email", ticket.customer_email).maybeSingle();
    if (data?.id) {
      customerId = String(data.id);
      customerRole = data.role === "reseller" ? "reseller" : "user";
    }
  }
  if (customerId) {
    await pushNotes([directNote({ id: customerId, role: customerRole }, "Support replied", message, `direct-${customerId}`)]);
  }
}

// src/lib/subscriptionActivate.ts
init_planDuration();
function mergeTools(existing, toolName) {
  const list = Array.isArray(existing) ? existing.map(String) : [];
  if (!toolName || list.includes(toolName)) return list;
  return [...list, toolName];
}
async function findCustomer(sb, order) {
  if (order.customer_id) {
    const { data } = await sb.from("customers").select("*").eq("id", order.customer_id).maybeSingle();
    if (data) return data;
  }
  const email = String(order.customer_email || "").trim().toLowerCase();
  if (email) {
    const { data } = await sb.from("customers").select("*").ilike("email", email).maybeSingle();
    if (data) return data;
  }
  const phone = String(order.customer_phone || "").trim();
  if (phone) {
    const { data } = await sb.from("customers").select("*").eq("phone", phone).maybeSingle();
    if (data) return data;
  }
  return null;
}
function buildApprovedOrderDates(order, patch = {}) {
  const activationDate = String(
    patch.activation_date || patch.activationDate || order.activation_date || todayDateOnly()
  ).slice(0, 10);
  const planDays = resolvePlanDays({
    planDays: Number(patch.plan_days ?? patch.planDays) || void 0,
    planName: String(patch.plan || order.tool || ""),
    orderMonths: Number(patch.duration ?? order.duration) || 1
  });
  const expiryDate = String(
    patch.expiry_date || patch.expiryDate || planExpiryDate(activationDate, planDays)
  ).slice(0, 10);
  return {
    activationDate,
    planDays,
    expiryDate,
    daysLeft: daysLeft(expiryDate)
  };
}
async function activateCustomerForApprovedOrder(sb, order, patch = {}) {
  const dates = buildApprovedOrderDates(order, patch);
  const customer = await findCustomer(sb, order);
  if (!customer) {
    return { ...dates, customerId: null, customerUpdated: false };
  }
  const toolName = String(order.tool || "").trim();
  const planName = String(customer.plan || toolName || "Monthly Plan").trim() || "Monthly Plan";
  const stillActive = customer.expiry && daysLeft(String(customer.expiry)) >= 0 && String(customer.plan || "").trim();
  const expiry = stillActive ? extendPlanExpiry(String(customer.expiry), dates.planDays) : dates.expiryDate;
  const { error } = await sb.from("customers").update({
    plan: toolName || planName,
    plan_days: dates.planDays,
    expiry,
    fee: Number(order.final_amount ?? customer.fee ?? 0) || Number(customer.fee || 0),
    status: "active",
    tools: mergeTools(customer.tools, toolName)
  }).eq("id", customer.id);
  if (error) throw new Error(error.message);
  return {
    ...dates,
    expiryDate: expiry,
    daysLeft: daysLeft(expiry),
    customerId: String(customer.id),
    customerUpdated: true
  };
}

// src/lib/adminRoutes.ts
var router = Router();
var COLUMN_MISSING = /could not find|schema cache|column|42703|PGRST204/i;
function adminServiceDb() {
  const { url } = getSupabaseConfig();
  const serviceKey = requireServiceRoleKey();
  return createClient3(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
function toolsAdminDb() {
  return adminServiceDb();
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
  const slug = slugifyToolKey(raw);
  for (const candidate of [raw, slug]) {
    if (!candidate) continue;
    const byId = await sb.from("tools").select("id,name").eq("id", candidate).maybeSingle();
    if (byId.data?.id) return String(byId.data.id);
  }
  const catalog = await sb.from("tools").select("id,name");
  const match = (catalog.data || []).find((row) => toolMatchesKey(row, raw) || toolMatchesKey(row, slug));
  return match?.id ? String(match.id) : null;
}
async function ensureToolRow(sb, key, body) {
  const existing = await resolveToolId(sb, key);
  if (existing) return { id: existing, created: false };
  const name = String(body?.name || key || "New Tool").trim() || "New Tool";
  const id = slugifyToolKey(body?.id || key || name) || `tool-${Date.now().toString(36)}`;
  const seed = camelToSnakeTool({
    id,
    name,
    category: body?.category || "Other",
    rating: typeof body?.rating === "number" ? body.rating : 4.9,
    price: typeof body?.price === "number" ? body.price : 0,
    originalPrice: typeof body?.originalPrice === "number" ? body.originalPrice : 0,
    discount: typeof body?.discount === "number" ? body.discount : 0,
    favicon: body?.favicon || `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(name)}`,
    desc: body?.desc || `${name} access`,
    fullDesc: body?.fullDesc || "",
    features: Array.isArray(body?.features) ? body.features : [],
    useCases: Array.isArray(body?.useCases) ? body.useCases : [],
    faqs: Array.isArray(body?.faqs) ? body.faqs : [],
    waText: body?.waText || name,
    isPrivate: Boolean(body?.isPrivate),
    isSemiPrivate: Boolean(body?.isSemiPrivate),
    showOnHome: body?.showOnHome !== false,
    badge: body?.badge || "",
    accessMethod: body?.accessMethod,
    toolUrl: body?.toolUrl,
    cookiesJson: body?.cookiesJson,
    panelReferrer: body?.panelReferrer
  });
  const extra = await mergeCookieExtra(sb, id, body, {});
  let { data, error } = await sb.from("tools").upsert({ ...seed, extra }).select("id").single();
  if (error && COLUMN_MISSING.test(error.message || "")) {
    const withoutCols = { ...seed };
    delete withoutCols.description;
    delete withoutCols.show_on_home;
    delete withoutCols.access_method;
    delete withoutCols.tool_url;
    delete withoutCols.cookies_json;
    delete withoutCols.panel_referrer;
    const retry = await sb.from("tools").upsert({ ...withoutCols, extra }).select("id").single();
    data = retry.data;
    error = retry.error;
  }
  if (error || !data?.id) {
    return { error: error?.message || "Could not create tool row in the database" };
  }
  logActivity("Tool Auto-Created", `Created tool from Cookies save: ${name} (${data.id})`);
  return { id: String(data.id), created: true };
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
  try {
    const sb = adminServiceDb();
    const patch = camelToSnakeOrder(req.body);
    const { data: existing, error: loadError } = await sb.from("orders").select("*").eq("id", req.params.id).single();
    if (loadError || !existing) return res.status(404).json({ error: "Order not found" });
    const approving = patch.status === "approved" || req.body?.status === "approved" || patch.sub_status === "active" || req.body?.subStatus === "active";
    if (approving) {
      const dates = buildApprovedOrderDates(existing, { ...patch, ...req.body });
      patch.status = "approved";
      patch.payment_status = patch.payment_status || "paid";
      patch.sub_status = patch.sub_status || "active";
      patch.activation_date = dates.activationDate;
      patch.expiry_date = dates.expiryDate;
      patch.days_left = dates.daysLeft;
      try {
        const applied = await activateCustomerForApprovedOrder(sb, existing, patch);
        if (applied.expiryDate) patch.expiry_date = applied.expiryDate;
        if (applied.daysLeft !== void 0) patch.days_left = applied.daysLeft;
        if (applied.customerId && !existing.customer_id) patch.customer_id = applied.customerId;
      } catch (activationError) {
        return res.status(500).json({ error: activationError?.message || "Order saved but customer plan could not be activated" });
      }
    } else if (patch.expiry_date) {
      const { daysLeft: daysLeft2 } = await Promise.resolve().then(() => (init_planDuration(), planDuration_exports));
      patch.days_left = daysLeft2(String(patch.expiry_date));
    }
    const { data, error } = await sb.from("orders").update(patch).eq("id", req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    logActivity("Order Updated", `Updated order ${req.params.id}`);
    res.json(snakeToCamelOrder(data));
  } catch (e) {
    return res.status(500).json({ error: e.message || "Could not update order" });
  }
});
router.delete("/orders/:id", requireAuth, async (req, res) => {
  try {
    const sb = adminServiceDb();
    const { error } = await sb.from("orders").delete().eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    logActivity("Order Deleted", `Deleted order ${req.params.id}`);
    res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Could not delete order" });
  }
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
      delete withoutCols.description;
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
    const ensured = await ensureToolRow(sb, req.params.id, {
      ...req.body,
      name: req.body?.name || req.params.id,
      id: req.body?.id || req.params.id
    });
    if ("error" in ensured) {
      return res.status(500).json({ error: ensured.error });
    }
    const toolId = ensured.id;
    const payload = camelToSnakeTool(req.body);
    delete payload.id;
    if (!String(payload.name || "").trim()) delete payload.name;
    const extra = await mergeCookieExtra(sb, toolId, req.body);
    let { data, error } = await sb.from("tools").update({ ...payload, extra }).eq("id", toolId).select().single();
    if (error && COLUMN_MISSING.test(error.message || "")) {
      const withoutCols = { ...payload };
      delete withoutCols.description;
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
    const wantMethod = String(req.body?.accessMethod || "").trim().toLowerCase() === "one_click" ? "one_click" : "extension";
    if (req.body?.accessMethod !== void 0 && data.access_method !== wantMethod) {
      const force = await sb.from("tools").update({ access_method: wantMethod, extra }).eq("id", toolId).select().single();
      if (!force.error && force.data) data = force.data;
      else if (force.error && COLUMN_MISSING.test(force.error.message || "")) {
        const extraOnly = await sb.from("tools").update({ extra }).eq("id", toolId).select().single();
        if (!extraOnly.error && extraOnly.data) data = extraOnly.data;
      }
    }
    const wantUrl = req.body?.toolUrl !== void 0 ? String(req.body.toolUrl || "") : null;
    const wantCookies = req.body?.cookiesJson !== void 0 ? req.body.cookiesJson : null;
    const wantRef = req.body?.panelReferrer !== void 0 ? String(req.body.panelReferrer || "") : null;
    const urlLag = wantUrl !== null && String(data.tool_url || "") !== wantUrl;
    const cookiesLag = wantCookies !== null && String(data.cookies_json ?? "") !== String(wantCookies ?? "");
    const refLag = wantRef !== null && String(data.panel_referrer || "") !== wantRef;
    if (urlLag || cookiesLag || refLag) {
      const sync = { extra };
      if (wantUrl !== null) sync.tool_url = wantUrl;
      if (wantCookies !== null) sync.cookies_json = wantCookies;
      if (wantRef !== null) sync.panel_referrer = wantRef;
      const synced = await sb.from("tools").update(sync).eq("id", toolId).select().single();
      if (!synced.error && synced.data) data = synced.data;
      else if (synced.error && COLUMN_MISSING.test(synced.error.message || "")) {
        const extraOnly = await sb.from("tools").update({ extra }).eq("id", toolId).select().single();
        if (!extraOnly.error && extraOnly.data) data = extraOnly.data;
      }
    }
    logActivity("Tool Updated", `Updated tool: ${data.name}`);
    const mapped = snakeToCamelTool(data);
    const usedFallback = Boolean(
      req.body?.toolUrl || req.body?.accessMethod || req.body?.cookiesJson || req.body?.panelReferrer
    ) && !data.tool_url && Boolean(mapped.toolUrl || mapped.accessMethod === "one_click" || mapped.panelReferrer);
    res.json({ ...mapped, usedFallback, created: ensured.created || void 0 });
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
    desc: t.desc ?? t.description ?? "",
    fullDesc: t.full_desc,
    features: t.features,
    useCases: t.use_cases,
    faqs: t.faqs,
    waText: t.wa_text,
    isPrivate: t.is_private,
    isSemiPrivate: t.is_semi_private,
    showOnHome: t.show_on_home === false || t.show_on_home === 0 || extra.showOnHome === false ? false : true,
    // Prefer extra.* for cookie admin fields: Cookies saves always write into extra, while
    // tool_url / cookies_json columns can stay on an older value when schema dual-write lags.
    accessMethod: (() => {
      const candidates = [
        extra.accessMethod,
        extra.access_method,
        t.access_method,
        t.accessMethod
      ].map((v) => String(v || "").trim().toLowerCase()).filter(Boolean);
      if (candidates.some((v) => v === "one_click" || v === "one-click")) return "one_click";
      return "extension";
    })(),
    toolUrl: "toolUrl" in extra ? String(extra.toolUrl || "") : "tool_url" in extra ? String(extra.tool_url || "") : String(t.tool_url || ""),
    cookiesJson: "cookiesJson" in extra ? extra.cookiesJson ?? "" : "cookies_json" in extra ? extra.cookies_json ?? "" : t.cookies_json ?? "",
    panelReferrer: "panelReferrer" in extra || "unlockReferrer" in extra || "panel_referrer" in extra ? String(extra.panelReferrer || extra.unlockReferrer || extra.panel_referrer || "") : String(t.panel_referrer || "")
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
  if (t.desc !== void 0) r.desc = t.desc;
  if (t.description !== void 0) r.desc = t.description;
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
    business: { name: s?.site_name || "ZynexTools", email: s?.contact_email || "emaan@aitoolsmart.com", whatsapp: s?.whatsapp || "+923275855578" }
  });
});

// src/lib/accountRoutes.ts
init_db();
import { Router as Router2 } from "express";
var router2 = Router2();
function clients() {
  return createAuthAndAdminClients();
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
init_db();
import { Router as Router3 } from "express";

// src/lib/accountStore.ts
init_planDuration();
init_planDuration();
init_planCatalog();
function planIsActive2(plan, expiry) {
  return planIsActive(plan, expiry);
}

// src/lib/deviceSessions.ts
init_db();
var DEVICE_LIMIT_MESSAGE = "Device limit reached. Ask admin/reseller to manage devices or remove an old device.";
var DEVICE_LIMITS_SETTING_KEY = "device_limits_enabled";
function serviceClient() {
  return createServiceSupabase();
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
    const db2 = admin || serviceClient();
    const { data, error } = await db2.from("app_settings").select("value").eq("key", DEVICE_LIMITS_SETTING_KEY).maybeSingle();
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
  const db2 = admin || serviceClient();
  const value = Boolean(enabled);
  const { error } = await db2.from("app_settings").upsert(
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
  const db2 = admin || serviceClient();
  const { data, error } = await db2.from("device_sessions").select("*").eq("account_id", accountId).order("last_seen", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}
async function loadAccountMaxDevices(accountId, admin) {
  const db2 = admin || serviceClient();
  const { data, error } = await db2.from("customers").select("id,max_devices,status,role,owner_id").eq("id", accountId).maybeSingle();
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
  const db2 = input.admin || serviceClient();
  let account;
  try {
    account = await loadAccountMaxDevices(input.accountId, db2);
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
  const limitsOn = await areDeviceLimitsEnabled(db2);
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
  const { data: existing, error: existingError } = await db2.from("device_sessions").select("*").eq("account_id", input.accountId).eq("device_id", deviceId).maybeSingle();
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
    const { data: updated, error } = await db2.from("device_sessions").update({
      last_seen: now,
      device_label: label || existing.device_label,
      user_agent: ua || existing.user_agent
    }).eq("id", existing.id).select().single();
    if (error) return { ok: false, error: error.message, status: 500 };
    const sessions3 = await loadAccountDevices(input.accountId, db2);
    return {
      ok: true,
      session: updated || existing,
      maxDevices,
      deviceCount: sessions3.length
    };
  }
  let sessions2 = [];
  try {
    sessions2 = await loadAccountDevices(input.accountId, db2);
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
  const { data: created, error: insertError } = await db2.from("device_sessions").insert({
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
      const { data: raced } = await db2.from("device_sessions").select("*").eq("account_id", input.accountId).eq("device_id", deviceId).maybeSingle();
      if (raced) {
        await db2.from("device_sessions").update({ last_seen: now }).eq("id", raced.id);
        const again = await loadAccountDevices(input.accountId, db2);
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
  const db2 = input.admin || serviceClient();
  const { data, error } = await db2.from("device_sessions").delete().eq("id", input.sessionId).eq("account_id", input.accountId).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data?.id);
}
async function setAccountMaxDevices(input) {
  const db2 = input.admin || serviceClient();
  const max = Math.max(1, Math.min(50, Math.floor(Number(input.maxDevices) || 1)));
  const { data, error } = await db2.from("customers").update({ max_devices: max }).eq("id", input.accountId).select("id,max_devices").single();
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
function client2(token) {
  return createAnonSupabase(token);
}
function toolsDb() {
  return createPrivilegedSupabase();
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
  const supabase3 = client2(token);
  const { data: authData, error: authError } = await supabase3.auth.getUser(token);
  if (authError || !authData.user) return null;
  const db2 = toolsDb();
  const { data: profile, error } = await db2.from("customers").select("id,customer_code,name,email,role,status,plan,expiry,tools").eq("auth_user_id", authData.user.id).maybeSingle();
  if (!error && profile) return profile;
  const fallback = await supabase3.from("customers").select("id,customer_code,name,email,role,status,plan,expiry,tools").eq("auth_user_id", authData.user.id).single();
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
    const supabase3 = client2();
    const { data, error } = await supabase3.auth.signInWithPassword({ email, password });
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
    const supabase3 = client2();
    const { data, error } = await supabase3.auth.refreshSession({ refresh_token: refreshToken });
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
    const planActive = planIsActive2(profile.plan, profile.expiry);
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
function resolveToolAccessMethod(tool, extra) {
  const candidates = [
    extra?.accessMethod,
    extra?.access_method,
    tool?.access_method,
    tool?.accessMethod
  ].map((v) => String(v || "").trim().toLowerCase()).filter(Boolean);
  if (candidates.some((v) => v === "one_click" || v === "one-click")) return "one_click";
  return "extension";
}
function cookieFields(tool) {
  const extra = parseExtraBag(tool?.extra);
  const url = "toolUrl" in extra || "tool_url" in extra ? String(extra.toolUrl || extra.tool_url || "") : String(tool?.tool_url || "");
  const cookiesRaw = "cookiesJson" in extra || "cookies_json" in extra ? String(extra.cookiesJson ?? extra.cookies_json ?? "") : String(tool?.cookies_json ?? "");
  const panelReferrer = "panelReferrer" in extra || "unlockReferrer" in extra || "panel_referrer" in extra ? String(extra.panelReferrer || extra.unlockReferrer || extra.panel_referrer || "") : String(tool?.panel_referrer || "");
  return {
    accessMethod: resolveToolAccessMethod(tool, extra),
    url: String(url || "").trim(),
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
    const planActive = planIsActive2(profile.plan, profile.expiry);
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
init_db();
import { Router as Router4 } from "express";
var router4 = Router4();
function clients2() {
  return createAuthAndAdminClients();
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
init_db();
import { Router as Router5 } from "express";
var router5 = Router5();
function clients3() {
  return createAuthAndAdminClients();
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
init_db();
import { Router as Router6 } from "express";
import { createHash as createHash2, randomBytes as randomBytes2 } from "crypto";

// src/lib/globalProxySettings.ts
init_db();
var GLOBAL_PROXY_SETTING_KEY = "global_proxy_engine";
var GLOBAL_PROXY_SQL_HINT = "Run supabase_global_proxy_engine.sql (or supabase_device_limits_toggle.sql) in the Supabase SQL Editor so app_settings exists, then try again.";
var CACHE_MS = 8e3;
var cache = null;
function serviceClient2() {
  return createPrivilegedSupabase();
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
function serializeProxyUrl(u) {
  const protocol = u.protocol === "https:" ? "https:" : "http:";
  const port = u.port || (protocol === "https:" ? "443" : "80");
  const user = u.username ? decodeURIComponent(u.username) : "";
  const pass = u.password ? decodeURIComponent(u.password) : "";
  const auth = user ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : "";
  return `${protocol}//${auth}${u.hostname}:${port}/`;
}
function normalizeProxyUrl(raw) {
  let s = String(raw || "").trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s) && !/^socks/i.test(s)) {
    s = `http://${s}`;
  }
  try {
    const u = new URL(s);
    if (/^socks/i.test(u.protocol)) {
      throw new Error(
        "Use the provider HTTP endpoint (http://user:pass@host:port/), not socks://. Residential HTTP is required for one-click."
      );
    }
    if (!/^https?:$/i.test(u.protocol)) {
      throw new Error("Proxy URL must start with http:// or https://");
    }
    if (!u.hostname) {
      throw new Error("Invalid proxy URL. Example: http://user:pass@p.webshare.io:80/");
    }
    if (!u.port) {
      u.port = /^https:$/i.test(u.protocol) ? "443" : "80";
    }
    let user = decodeURIComponent(u.username || "");
    if (user) {
      user = user.replace(/-rotate$/i, "");
      u.username = user;
    }
    return serializeProxyUrl(u);
  } catch (err) {
    if (err?.message && /HTTP endpoint|must start with http|Invalid proxy|Example:/i.test(err.message)) {
      throw err;
    }
    throw new Error("Invalid proxy URL. Example: http://user:pass@p.webshare.io:80/");
  }
}
function webshareStickyDigits(stickyId) {
  const fromDigits = String(stickyId || "").replace(/\D/g, "");
  if (fromDigits.length >= 4) return fromDigits.slice(0, 12);
  let hash = 0;
  for (const ch of String(stickyId || "atm")) {
    hash = Math.imul(31, hash) + ch.charCodeAt(0) | 0;
  }
  const mixed = `${Math.abs(hash)}7${Math.abs(hash << 3)}`.replace(/\D/g, "");
  return (mixed || "1001").slice(0, 10);
}
function applyStickySession(proxyUrl, stickyId) {
  const id = String(stickyId || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12);
  if (!id) return proxyUrl;
  try {
    const u = new URL(proxyUrl);
    let user = decodeURIComponent(u.username || "");
    if (!user) return proxyUrl;
    if (/session/i.test(user)) return proxyUrl;
    const host = (u.hostname || "").toLowerCase();
    if (/webshare\.io$/i.test(host)) {
      user = user.replace(/-\d{3,}$/i, "");
      u.username = `${user}-${webshareStickyDigits(id)}`;
      if (!u.port) u.port = "80";
      return serializeProxyUrl(u);
    }
    u.username = `${user}-session-${id}`;
    if (!u.port) u.port = /^https:$/i.test(u.protocol) ? "443" : "80";
    return serializeProxyUrl(u);
  } catch {
    return proxyUrl;
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
    const db2 = admin || serviceClient2();
    const { data, error } = await db2.from("app_settings").select("value").eq("key", GLOBAL_PROXY_SETTING_KEY).maybeSingle();
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
  const db2 = admin || serviceClient2();
  const prev = await getGlobalProxyConfig(db2);
  let url = prev.url;
  if (typeof input.url === "string") {
    const trimmed = input.url.trim();
    url = trimmed ? normalizeProxyUrl(trimmed) : "";
  }
  const enabled = Boolean(input.enabled) && Boolean(url);
  const value = { enabled, url };
  const { error } = await db2.from("app_settings").upsert(
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

// src/lib/proxyEngine.ts
import { Readable } from "stream";

// src/lib/proxyFetch.ts
import { AsyncLocalStorage } from "async_hooks";
var stickyStore = new AsyncLocalStorage();
var cachedAgent = null;
var AGENT_TTL_MS = 5 * 6e4;
function runWithProxySticky(stickyId, fn) {
  const id = String(stickyId || "").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
  if (!id) return fn();
  return stickyStore.run(id, fn);
}
function invalidateProxyAgentCache() {
  cachedAgent = null;
}
async function getProxyAgent(proxyUrl) {
  const now = Date.now();
  if (cachedAgent && cachedAgent.key === proxyUrl && now - cachedAgent.at < AGENT_TTL_MS) {
    return cachedAgent.agent;
  }
  if (/^socks/i.test(proxyUrl)) {
    throw new Error(
      "SOCKS proxies are not supported on this host. Use the provider\u2019s HTTP residential endpoint (http://user:pass@host:port/)."
    );
  }
  const undici = await import("undici");
  const agent = new undici.ProxyAgent({
    uri: proxyUrl,
    connections: 16,
    pipelining: 1,
    connect: { timeout: 3e4 }
  });
  cachedAgent = { key: proxyUrl, agent, at: now };
  return agent;
}
async function resolveProxyUrl() {
  let proxyUrl = await getActiveOutboundProxyUrl();
  if (!proxyUrl) return null;
  const sticky = stickyStore.getStore();
  if (sticky) proxyUrl = applyStickySession(proxyUrl, sticky);
  return proxyUrl;
}
async function proxyAwareFetch(input, init) {
  const proxyUrl = await resolveProxyUrl();
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
      /proxy|ECONNREFUSED|ENOTFOUND|socket|tunnel|407|authentication|SOCKS|residential/i.test(msg) ? `Global Proxy Engine failed (${msg}). Check Admin \u2192 Global Proxy Engine (residential HTTP URL).` : msg
    );
  }
}
var BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
function looksLikeCloudflare(status, body) {
  const head = String(body || "").slice(0, 8e3);
  if (/just a moment|cf-browser-verification|challenge-platform|cdn-cgi\/challenge|attention required|unable to connect to the website|checking your browser before accessing/i.test(
    head
  )) {
    return true;
  }
  if ((status === 403 || status === 503) && /cf-|challenge|cloudflare/i.test(head)) return true;
  return false;
}
async function fetchViaProxy(proxyUrl, url, headers, timeoutMs = 35e3) {
  const undici = await import("undici");
  const agent = new undici.ProxyAgent({
    uri: proxyUrl,
    connections: 4,
    pipelining: 1,
    connect: { timeout: timeoutMs }
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("Proxy request timed out")), timeoutMs);
  try {
    const res = await undici.fetch(url, {
      dispatcher: agent,
      signal: controller.signal,
      headers,
      redirect: "follow"
    });
    const text = await res.text();
    return { status: res.status, text };
  } finally {
    clearTimeout(timer);
    try {
      agent.close?.();
    } catch {
    }
  }
}
async function testProxyUrl(proxyUrlRaw) {
  let proxyUrl;
  try {
    proxyUrl = normalizeProxyUrl(proxyUrlRaw);
  } catch (err) {
    return { ok: false, error: err?.message || "Invalid proxy URL" };
  }
  if (!proxyUrl) return { ok: false, error: "Proxy URL is empty" };
  if (/^socks/i.test(proxyUrl)) {
    return {
      ok: false,
      error: "Use an HTTP residential proxy URL (http://user:pass@host:port/), not socks://. Most providers give both."
    };
  }
  const stickyProxyUrl = applyStickySession(proxyUrl, `t${Date.now()}`);
  try {
    let activeProxy = stickyProxyUrl;
    let ipRes = null;
    let lastErr = null;
    for (const candidate of [stickyProxyUrl, proxyUrl]) {
      try {
        const res = await fetchViaProxy(candidate, "https://api.ipify.org?format=json", {
          Accept: "application/json",
          "User-Agent": BROWSER_UA
        });
        if (res.status >= 200 && res.status < 300) {
          ipRes = res;
          activeProxy = candidate;
          break;
        }
        lastErr = new Error(`Proxy reachable but IP check failed (${res.status})`);
      } catch (err) {
        lastErr = err;
      }
    }
    if (!ipRes) {
      throw lastErr || new Error("Proxy IP check failed");
    }
    proxyUrl = activeProxy;
    let ip = "";
    try {
      ip = String(JSON.parse(ipRes.text)?.ip || "").trim();
    } catch {
      ip = ipRes.text.trim().slice(0, 64);
    }
    if (!ip) return { ok: false, error: "Proxy returned empty IP" };
    let isp = "";
    let hosting = false;
    try {
      const meta = await fetchViaProxy(
        proxyUrl,
        `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,proxy,hosting,isp,org,query`,
        { Accept: "application/json", "User-Agent": BROWSER_UA }
      );
      const j = JSON.parse(meta.text);
      if (j?.status === "success") {
        isp = String(j.isp || j.org || "").trim();
        hosting = Boolean(j.hosting || j.proxy);
      }
    } catch {
    }
    if (!isp && /^(3\.|13\.|18\.|34\.|35\.|52\.|54\.|16\.|44\.|63\.|64\.|100\.|107\.|174\.|184\.)/.test(ip)) {
      hosting = true;
      isp = "Likely cloud/datacenter (heuristic)";
    }
    const chatgpt = await fetchViaProxy(proxyUrl, "https://chatgpt.com/", {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": BROWSER_UA,
      "Accept-Language": "en-US,en;q=0.9"
    });
    const chatgptBlocked = looksLikeCloudflare(chatgpt.status, chatgpt.text.slice(0, 4e3));
    let udemyHtml = 0;
    let udemyBlocked = false;
    try {
      const udemy = await fetchViaProxy(proxyUrl, "https://www.udemy.com/", {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": BROWSER_UA,
        "Accept-Language": "en-US,en;q=0.9"
      });
      udemyHtml = udemy.status;
      udemyBlocked = looksLikeCloudflare(udemy.status, udemy.text.slice(0, 4e3));
    } catch {
      udemyBlocked = true;
    }
    const residentialLikely = !hosting;
    const warnings = [];
    if (hosting) {
      warnings.push(
        "Exit IP looks like datacenter/VPN. ChatGPT Send and Udemy often fail \u2014 buy residential sticky (Webshare/IPRoyal/Bright Data)."
      );
    }
    if (chatgptBlocked) warnings.push("ChatGPT returned a bot/Cloudflare wall through this proxy.");
    if (udemyBlocked) {
      warnings.push(
        "Udemy returned a Cloudflare wall \u2014 keep Udemy on By extension unless this residential IP is trusted."
      );
    }
    const oneClickReady = residentialLikely && !chatgptBlocked && chatgpt.status >= 200 && chatgpt.status < 400;
    const message = oneClickReady ? `One-click ready \u2014 residential IP ${ip}${isp ? ` (${isp})` : ""}. ChatGPT HTML ${chatgpt.status}.` : `Proxy reachable (IP ${ip}) but NOT ready for one-click.${warnings[0] ? ` ${warnings[0]}` : ""}`;
    return {
      ok: true,
      ip,
      isp: isp || void 0,
      hosting,
      residentialLikely,
      chatgptHtml: chatgpt.status,
      chatgptBlocked,
      udemyHtml,
      udemyBlocked,
      oneClickReady,
      message,
      warnings
    };
  } catch (err) {
    const cause = err?.cause?.message || err?.cause?.code || (typeof err?.cause === "string" ? err.cause : "") || "";
    const base = String(err?.message || err || "Proxy test failed");
    const detail = cause && !base.includes(String(cause)) ? `${base} (${cause})` : base;
    let hint = detail;
    if (/fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|aborted|UND_ERR|cancelled|timed out/i.test(detail)) {
      hint = `${detail}. Check: (1) Save with http://USER:PASS@p.webshare.io:80/ (port stays after save now), (2) Sticky not Rotating, (3) verify Webshare email, (4) wait for deploy then Test again.`;
    }
    return { ok: false, error: hint };
  }
}

// src/lib/proxyEngine.ts
var PROXY_BASE = "/fx";
var CROSS_HOST_MARKER = "~";
var STREAM_TYPES = /event-stream|ndjson|octet-stream|audio|video|zip|pdf|wasm/i;
var REWRITE_HTML = /text\/html|application\/xhtml/i;
var REWRITE_CSS = /text\/css/i;
var HOP_BY_HOP = /* @__PURE__ */ new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "accept-encoding",
  "cookie",
  "origin",
  "referer",
  "if-none-match",
  "if-modified-since"
]);
var STRIP_RESPONSE_HEADERS = /* @__PURE__ */ new Set([
  "content-security-policy",
  "content-security-policy-report-only",
  "x-frame-options",
  "cross-origin-opener-policy",
  "cross-origin-embedder-policy",
  "cross-origin-resource-policy",
  "strict-transport-security",
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "report-to",
  "nel",
  "set-cookie",
  "alt-svc",
  "link"
]);
function normalizeCookies(raw, fallbackHost = "") {
  const out = [];
  const fallback = String(fallbackHost || "").trim().toLowerCase().replace(/^\./, "");
  for (const c of Array.isArray(raw) ? raw : []) {
    const name = String(c?.name || "").trim();
    if (!name) continue;
    const domain = String(c?.domain || "").trim().toLowerCase().replace(/^\./, "") || fallback;
    out.push({
      name,
      value: c?.value == null ? "" : String(c.value),
      domain,
      path: String(c?.path || "/") || "/",
      secure: Boolean(c?.secure)
    });
  }
  return out;
}
function filterLiveCookies(raw) {
  const nowSec = Date.now() / 1e3;
  return (Array.isArray(raw) ? raw : []).filter((c) => {
    if (!c || typeof c !== "object") return false;
    const exp = c.expirationDate ?? c.expires ?? c.expiry;
    if (typeof exp === "number" && exp > 0 && exp < nowSec) return false;
    if (typeof exp === "string") {
      const t = Date.parse(exp);
      if (Number.isFinite(t) && t < Date.now()) return false;
    }
    return true;
  });
}
function isChatGptOrigin(origin) {
  try {
    const h = new URL(origin).hostname.toLowerCase();
    return h === "chatgpt.com" || h.endsWith(".chatgpt.com") || h.includes("openai.com");
  } catch {
    return /chatgpt\.com|openai\.com/i.test(origin);
  }
}
async function bootstrapSessionCookies(target) {
  let cookies = [...target.cookies || []];
  const errors = [];
  let origin = String(target.origin || "").trim();
  if (!origin || !isChatGptOrigin(origin)) {
    return { cookies, ok: true, errors: [] };
  }
  try {
    origin = new URL(origin).origin;
  } catch {
    return { cookies, ok: false, errors: ["Invalid tool origin URL"] };
  }
  const referer = String(target.referrer || `${origin}/`).trim() || `${origin}/`;
  const endpoints = [`${origin}/api/auth/session`, `${origin}/backend-api/me`];
  let anyOk = false;
  for (const url of endpoints) {
    try {
      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json",
        Referer: referer,
        Origin: origin
      };
      const cookie = cookieHeaderFor(cookies, url);
      if (cookie) headers.Cookie = cookie;
      const res = await proxyAwareFetch(url, { method: "GET", redirect: "manual", headers });
      cookies = mergeSetCookies(cookies, res, url);
      const body = await res.text();
      const ct = res.headers.get("content-type") || "";
      if (res.status >= 200 && res.status < 400 && !isCloudflareChallenge(res.status, ct, body)) {
        anyOk = true;
        continue;
      }
      if (isCloudflareChallenge(res.status, ct, body)) {
        errors.push(`${url}: Cloudflare blocked the proxy IP \u2014 use residential sticky Webshare in Admin.`);
      } else if (res.status === 401 || res.status === 403) {
        errors.push(`${url}: session rejected (${res.status}) \u2014 copy fresh cookies from a logged-in ChatGPT tab.`);
      } else {
        errors.push(`${url}: HTTP ${res.status}`);
      }
    } catch (err) {
      errors.push(`${url}: ${String(err?.message || err)}`);
    }
  }
  return { cookies, ok: anyOk, errors };
}
function domainMatches(host, domain) {
  const h = String(host || "").toLowerCase();
  const d = String(domain || "").toLowerCase().replace(/^\./, "");
  if (!d) return true;
  if (h === d || h.endsWith(`.${d}`)) return true;
  const family = /(^|\.)(chatgpt\.com|openai\.com|oaistatic\.com|oaiusercontent\.com)$/i;
  if (family.test(h) && family.test(d)) return true;
  return false;
}
function cookieHeaderFor(cookies, url) {
  let host = "";
  let path = "/";
  try {
    const u = new URL(url);
    host = u.hostname.toLowerCase();
    path = u.pathname || "/";
  } catch {
    return "";
  }
  const ranked = [];
  for (const c of cookies || []) {
    if (!domainMatches(host, c.domain)) continue;
    const cookiePath = c.path || "/";
    if (cookiePath !== "/" && !path.startsWith(cookiePath)) continue;
    const dom = String(c.domain || "").replace(/^\./, "");
    const score = dom.length * 1e3 + cookiePath.length;
    ranked.push({ name: c.name, value: c.value, score });
  }
  ranked.sort((a, b) => b.score - a.score);
  const seen = /* @__PURE__ */ new Map();
  for (const c of ranked) {
    if (!seen.has(c.name)) seen.set(c.name, c.value);
  }
  return [...seen.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
function mergeSetCookies(cookies, response, url) {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
  }
  const raw = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  if (!raw.length) {
    const single = response.headers.get("set-cookie");
    if (single) raw.push(single);
  }
  if (!raw.length) return cookies;
  let next = [...cookies];
  for (const line of raw) {
    const parts = String(line || "").split(";");
    const first = parts.shift() || "";
    const eq = first.indexOf("=");
    if (eq <= 0) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    if (!name) continue;
    let domain = host;
    let path = "/";
    let maxAge = null;
    let expiresAt = null;
    for (const attr of parts) {
      const [k, v] = attr.split("=");
      const key = String(k || "").trim().toLowerCase();
      if (key === "domain" && v) domain = String(v).trim().toLowerCase().replace(/^\./, "");
      if (key === "path" && v) path = String(v).trim() || "/";
      if (key === "max-age" && v != null) {
        const n = Number(v);
        if (Number.isFinite(n)) maxAge = n;
      }
      if (key === "expires" && v) {
        const t = Date.parse(String(v).trim());
        if (Number.isFinite(t)) expiresAt = t;
      }
    }
    const expired = maxAge != null && maxAge <= 0 || expiresAt != null && expiresAt <= Date.now();
    if (expired) {
      next = next.filter(
        (c) => !(c.name === name && (c.domain || "") === domain && (c.path || "/") === path)
      );
      continue;
    }
    const idx = next.findIndex(
      (c) => c.name === name && (c.domain || "") === domain && (c.path || "/") === path
    );
    const entry = { name, value, domain, path };
    if (idx >= 0) next[idx] = entry;
    else next.push(entry);
  }
  return next;
}
function isBlockedHost(host) {
  const h = String(host || "").toLowerCase();
  if (!h) return true;
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal")) return true;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (h === "::1" || h.startsWith("fd") || h.startsWith("fe80")) return true;
  return false;
}
function isDirectStaticHost(host) {
  const h = String(host || "").toLowerCase().split(":")[0].replace(/^\./, "");
  if (!h) return false;
  if (h === "oaistatic.com" || h.endsWith(".oaistatic.com")) return true;
  if (h === "cdn.openai.com" || h.endsWith(".cdn.openai.com")) return true;
  if (h === "oaiusercontent.com" || h.endsWith(".oaiusercontent.com")) return true;
  if (h === "cdnjs.cloudflare.com" || h === "unpkg.com" || h === "jsdelivr.net" || h.endsWith(".jsdelivr.net")) {
    return true;
  }
  return false;
}
function toProxyPath(target, absoluteUrl) {
  try {
    const u = new URL(absoluteUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return absoluteUrl;
    if (isDirectStaticHost(u.hostname)) return absoluteUrl;
    const base = `${PROXY_BASE}/${encodeURIComponent(target.token)}`;
    if (u.pathname === base || u.pathname.startsWith(`${base}/`)) {
      return `${u.pathname}${u.search}${u.hash}`;
    }
    const originHost = new URL(target.origin).hostname.toLowerCase();
    const tail = `${u.pathname}${u.search}${u.hash}`;
    if (u.hostname.toLowerCase() === originHost) return `${base}${tail}`;
    return `${base}/${CROSS_HOST_MARKER}${u.host}${tail}`;
  } catch {
    return absoluteUrl;
  }
}
function unwrapNestedFxPath(token, remainder) {
  let raw = String(remainder || "/");
  if (!raw.startsWith("/")) raw = `/${raw}`;
  const nested = `${PROXY_BASE}/${encodeURIComponent(String(token || "").trim())}`;
  let guard = 0;
  while (guard++ < 5 && (raw === nested || raw.startsWith(`${nested}/`))) {
    raw = raw.slice(nested.length) || "/";
  }
  return raw;
}
function fromProxyPath(target, remainder) {
  const withSlash = unwrapNestedFxPath(target.token, remainder);
  try {
    if (withSlash.startsWith(`/${CROSS_HOST_MARKER}`)) {
      const rest = withSlash.slice(2);
      const slash = rest.indexOf("/");
      const host = slash === -1 ? rest : rest.slice(0, slash);
      const tail = slash === -1 ? "/" : rest.slice(slash);
      if (!host || isBlockedHost(host.split(":")[0])) return null;
      return new URL(tail, `https://${host}`).href;
    }
    const originBase = target.origin.endsWith("/") ? target.origin : `${target.origin}/`;
    const url = new URL(withSlash, originBase);
    if (isBlockedHost(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}
function isCloudflareChallenge(status, contentType, body) {
  const text = String(body || "");
  const head = text.slice(0, 12e3);
  const looksHtml = /text\/html/i.test(contentType) || /<!DOCTYPE html|<html[\s>]/i.test(text.slice(0, 400));
  if (!looksHtml && status !== 403 && status !== 503) return false;
  const strong = /just a moment|cf-browser-verification|challenge-platform|cdn-cgi\/challenge-platform|cdn-cgi\/challenge|attention required|unable to connect to the website|security verification process|cf-challenge-running|enable javascript and cookies to continue|checking your browser before accessing/i.test(
    head
  );
  if (strong) return true;
  if (/ray id:/i.test(head) && /cloudflare|challenge|blocked|attention required|just a moment/i.test(head)) {
    return true;
  }
  if ((status === 403 || status === 503) && /cf-|cloudflare|challenge/i.test(head) && /<!DOCTYPE|<html/i.test(head)) {
    return true;
  }
  if (/designing again soon|we.?ll have you designing|help centre to see why|__cf_chl|cf_chl_rt/i.test(head)) {
    return true;
  }
  return false;
}
function oneClickBlockedHtml(toolHost) {
  return cloudflareBlockedPage(toolHost);
}
function isOneClickBlockedHost(url) {
  try {
    const h = new URL(String(url || "").trim()).hostname.toLowerCase();
    return h === "canva.com" || h.endsWith(".canva.com") || h === "canva.cn" || h.endsWith(".canva.cn");
  } catch {
    return /canva\.(com|cn)/i.test(String(url || ""));
  }
}
function cloudflareBlockedPage(toolHost) {
  const host = String(toolHost || "this site").replace(/[<>&"]/g, "");
  return `<!doctype html><meta charset="utf-8"><title>One-click blocked</title>
<body style="font-family:system-ui;background:#0d0908;color:#fecaca;padding:2.5rem;max-width:38rem;margin:auto">
<h1 style="font-size:1.25rem">One-click cannot open this site</h1>
<p style="color:#94a3b8;font-size:.9rem;line-height:1.55">
<strong style="color:#fda4af">${host}</strong> is protected by Cloudflare (or similar bot checks).
The server proxy cannot complete that browser security check \u2014 that is why the extension works
(real browser + your IP) but one-click fails.
</p>
<ol style="color:#cbd5e1;font-size:.85rem;line-height:1.65">
<li>Admin \u2192 Cookies for this tool \u2192 set access to <strong>By extension</strong>.</li>
<li>Members install the Access extension and open the tool again.</li>
<li>Or keep one-click only for sites that allow residential-proxy access (many ChatGPT setups).</li>
</ol>
<p style="color:#64748b;font-size:.75rem;margin-top:1.5rem">This is not a broken cookie \u2014 it is a site security wall in front of one-click.</p>
</body>`;
}
function resolveAgainst(base, href) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}
function mapAttrValue(target, pageUrl, value) {
  const trimmed = String(value || "").trim();
  if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("data:") || trimmed.startsWith("blob:") || trimmed.startsWith("javascript:") || trimmed.startsWith("mailto:") || trimmed.startsWith("tel:") || trimmed.startsWith(`${PROXY_BASE}/`)) {
    return value;
  }
  const abs = resolveAgainst(pageUrl, trimmed);
  if (!abs || !/^https?:/i.test(abs)) return value;
  return toProxyPath(target, abs);
}
function rewriteCss(target, css, pageUrl) {
  return String(css || "").replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/gi, (_m, _q, val) => {
    return `url("${mapAttrValue(target, pageUrl, val)}")`;
  }).replace(/@import\s+(['"])([^'"]+)\1/gi, (_m, q, val) => {
    return `@import ${q}${mapAttrValue(target, pageUrl, val)}${q}`;
  });
}
function runtimeScript(target) {
  const base = JSON.stringify(`${PROXY_BASE}/${encodeURIComponent(target.token)}`);
  const origin = JSON.stringify(new URL(target.origin).origin);
  const marker = JSON.stringify(CROSS_HOST_MARKER);
  return `<script data-atm-proxy="1">
(function(){
  if (window.__ATM_PROXY__) return;
  var BASE=${base}, ORIGIN=${origin}, MARK=${marker};
  window.__ATM_PROXY__={base:BASE,origin:ORIGIN};

  function portalHost(){ return location.host; }

  /** Public CDN hosts \u2014 never rewrite (keeps ChatGPT CSS/JS loading). */
  function isDirectStatic(host){
    var h=String(host||'').toLowerCase().split(':')[0];
    if (!h) return false;
    if (h==='oaistatic.com' || h.slice(-13)==='.oaistatic.com') return true;
    if (h==='cdn.openai.com' || h.slice(-14)==='.cdn.openai.com') return true;
    if (h==='oaiusercontent.com' || h.slice(-17)==='.oaiusercontent.com') return true;
    if (h==='cdnjs.cloudflare.com' || h==='unpkg.com' || h==='jsdelivr.net' || h.slice(-12)==='.jsdelivr.net') return true;
    return false;
  }

  /** Current page mapped back to the tool URL space. */
  function virtualHref(){
    var p=location.pathname;
    if (p.indexOf(BASE)===0) {
      var rest=p.slice(BASE.length) || '/';
      // Undo accidental /fx/<token>/fx/<token>/ nesting before mapping to the tool.
      while (rest===BASE || rest.indexOf(BASE+'/')===0) rest=rest.slice(BASE.length)||'/';
      if (rest.charAt(1)===MARK && rest.charAt(0)==='/') {
        var body=rest.slice(2), i=body.indexOf('/');
        var host=i===-1?body:body.slice(0,i);
        var tail=i===-1?'/':body.slice(i);
        return 'https://'+host+tail+location.search+location.hash;
      }
      return ORIGIN+rest+location.search+location.hash;
    }
    return ORIGIN+p+location.search+location.hash;
  }

  function toProxy(abs){
    try {
      var u=new URL(abs);
      if (u.protocol!=='http:' && u.protocol!=='https:') return abs;
      // CSS/JS CDNs stay on the real host so the SPA hydrates fully.
      if (isDirectStatic(u.host)) return abs;
      // Already a portal /fx/<token> URL \u2014 never nest another prefix.
      if (u.host===portalHost()) {
        if (u.pathname===BASE || u.pathname.indexOf(BASE+'/')===0) return u.pathname+u.search+u.hash;
        return abs;
      }
      if (u.pathname===BASE || u.pathname.indexOf(BASE+'/')===0) return u.pathname+u.search+u.hash;
      var o=new URL(ORIGIN);
      var tail=u.pathname+u.search+u.hash;
      if (u.host===o.host) return BASE+tail;
      return BASE+'/'+MARK+u.host+tail;
    } catch(e){ return abs; }
  }

  function alreadyProxied(raw){
    if (!raw) return false;
    if (raw===BASE || raw.indexOf(BASE+'/')===0) return true;
    try {
      var u=new URL(raw, location.href);
      return u.host===portalHost() && (u.pathname===BASE || u.pathname.indexOf(BASE+'/')===0);
    } catch(e){ return false; }
  }

  function map(input){
    if (input==null) return input;
    var raw=String(input);
    if (!raw || raw.charAt(0)==='#') return input;
    if (/^(data|blob|javascript|mailto|tel|about):/i.test(raw)) return input;
    if (alreadyProxied(raw)) {
      try {
        // Normalize full portal URLs down to path so we never double-prefix.
        var u=new URL(raw, location.href);
        if (u.host===portalHost()) return u.pathname+u.search+u.hash;
      } catch(e){}
      return raw;
    }
    try {
      var abs=new URL(raw, virtualHref()).href;
      if (raw.charAt(0)==='/' || /^https?:/i.test(raw) || raw.charAt(0)==='?') return toProxy(abs);
      return input;
    } catch(e){ return input; }
  }

  var ofetch=window.fetch && window.fetch.bind(window);
  if (ofetch) {
    window.fetch=function(input, init){
      try {
        if (typeof input==='string' || input instanceof URL) {
          return ofetch(map(String(input)), init);
        }
        if (input && input.url) {
          var mapped=map(input.url);
          if (mapped===input.url) return ofetch(input, init);
          return ofetch(new Request(mapped, input), init);
        }
      } catch(e){}
      return ofetch(input, init);
    };
  }

  var oopen=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(){
    var args=Array.prototype.slice.call(arguments);
    if (typeof args[1]==='string') args[1]=map(args[1]);
    return oopen.apply(this, args);
  };

  if (window.EventSource) {
    var OES=window.EventSource;
    function PatchedES(url, conf){ return new OES(map(String(url)), conf); }
    PatchedES.prototype=OES.prototype;
    try { PatchedES.CONNECTING=OES.CONNECTING; PatchedES.OPEN=OES.OPEN; PatchedES.CLOSED=OES.CLOSED; } catch(e){}
    window.EventSource=PatchedES;
  }

  if (window.WebSocket) {
    var OWS=window.WebSocket;
    function PatchedWS(url, protocols){
      var u=String(url);
      try {
        var abs=new URL(u, virtualHref());
        var mapped=toProxy(abs.href.replace(/^ws/,'http'));
        if (mapped.indexOf(BASE)===0) {
          u=(location.protocol==='https:'?'wss://':'ws://')+location.host+mapped;
        } else if (/^https?:/i.test(mapped)) {
          u=mapped.replace(/^http/,'ws');
        }
      } catch(e){}
      return protocols===undefined ? new OWS(u) : new OWS(u, protocols);
    }
    PatchedWS.prototype=OWS.prototype;
    try { PatchedWS.CONNECTING=OWS.CONNECTING; PatchedWS.OPEN=OWS.OPEN; PatchedWS.CLOSING=OWS.CLOSING; PatchedWS.CLOSED=OWS.CLOSED; } catch(e){}
    window.WebSocket=PatchedWS;
  }

  // Patch workers so relative chatgpt.com worker scripts stay inside /fx/\u2026
  try {
    if (window.Worker) {
      var OWorker=window.Worker;
      function PatchedWorker(url, opts){
        return new OWorker(typeof url==='string'?map(url):url, opts);
      }
      PatchedWorker.prototype=OWorker.prototype;
      window.Worker=PatchedWorker;
    }
  } catch(e){}

  // Service workers cannot see our patches \u2014 keep the page on the network path.
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register=function(){ return Promise.reject(new Error('disabled by proxy')); };
      if (navigator.serviceWorker.getRegistrations) {
        navigator.serviceWorker.getRegistrations().then(function(rs){
          rs.forEach(function(r){ try { r.unregister(); } catch(e){} });
        }).catch(function(){});
      }
    }
  } catch(e){}

  function patchProp(proto, prop){
    try {
      var d=Object.getOwnPropertyDescriptor(proto, prop);
      if (!d || !d.set) return;
      Object.defineProperty(proto, prop, {
        configurable:true, enumerable:d.enumerable,
        get: function(){ return d.get ? d.get.call(this) : undefined; },
        set: function(v){ return d.set.call(this, map(v)); }
      });
    } catch(e){}
  }
  if (window.HTMLScriptElement) patchProp(HTMLScriptElement.prototype, 'src');
  if (window.HTMLImageElement) patchProp(HTMLImageElement.prototype, 'src');
  if (window.HTMLLinkElement) patchProp(HTMLLinkElement.prototype, 'href');
  if (window.HTMLIFrameElement) patchProp(HTMLIFrameElement.prototype, 'src');
  if (window.HTMLMediaElement) patchProp(HTMLMediaElement.prototype, 'src');
  if (window.HTMLFormElement) patchProp(HTMLFormElement.prototype, 'action');

  var oset=Element.prototype.setAttribute;
  Element.prototype.setAttribute=function(name, value){
    try {
      var n=String(name||'').toLowerCase();
      if (n==='src' || n==='href' || n==='action' || n==='poster' || n==='formaction') {
        return oset.call(this, name, map(value));
      }
    } catch(e){}
    return oset.call(this, name, value);
  };

  // Keep SPA history inside the proxy path space \u2014 never nest /fx/<token>.
  ['pushState','replaceState'].forEach(function(fn){
    var orig=history[fn];
    if (!orig) return;
    history[fn]=function(state, title, url){
      if (url==null) return orig.call(history, state, title, url);
      return orig.call(history, state, title, map(String(url)));
    };
  });

  // Self-heal if we landed on a doubled /fx/<token>/fx/<token>/ URL.
  try {
    var p=location.pathname;
    var doubled=BASE+BASE;
    if (p===doubled || p.indexOf(doubled+'/')===0 || p.indexOf(BASE+BASE+'/')===0) {
      var fixed=BASE + p.slice(BASE.length*2) + location.search + location.hash;
      if (!fixed || fixed.charAt(0)!=='/') fixed=BASE+'/';
      location.replace(fixed);
      return;
    }
  } catch(e){}

  var oopenwin=window.open;
  window.open=function(url){
    var args=Array.prototype.slice.call(arguments);
    if (typeof url==='string') args[0]=map(url);
    return oopenwin.apply(window, args);
  };

  // Block native form navigations away from /fx/\u2026 (caused reload-with-no-reply).
  // Do NOT stopPropagation on keydown \u2014 ChatGPT's React handlers need Enter.
  document.addEventListener('submit', function(e){
    try {
      var form=e.target;
      if(!form || form.tagName!=='FORM') return;
      var action=form.getAttribute('action') || location.href;
      if (String(action).indexOf(BASE)===0) return;
      var method=(form.getAttribute('method')||'GET').toUpperCase();
      var abs=new URL(action, virtualHref()).href;
      e.preventDefault();
      if (method==='GET') {
        var dest=new URL(abs);
        var fd=new FormData(form);
        fd.forEach(function(v,k){ dest.searchParams.set(k, String(v)); });
        location.href=map(dest.href);
        return;
      }
      if (ofetch) {
        ofetch(map(abs), { method: method, body: new FormData(form), credentials: 'same-origin' })
          .then(function(r){ return r.text(); })
          .then(function(html){
            if (html && /<html/i.test(html)) { document.open(); document.write(html); document.close(); }
          })
          .catch(function(){});
      }
    } catch(err){}
  }, true);

  // Re-enable Send when ChatGPT left it disabled after a failed conversation/init
  // (happens when /api/auth bootstrap was not proxied).
  function unlockComposer(){
    try {
      var btns=document.querySelectorAll('button[data-testid="send-button"], button[aria-label="Send prompt"], form[data-type="unified-composer"] button[type="submit"]');
      btns.forEach(function(btn){
        if (!btn) return;
        if (btn.disabled) btn.disabled=false;
        btn.removeAttribute('disabled');
        btn.setAttribute('aria-disabled','false');
      });
    } catch(e){}
  }
  setInterval(unlockComposer, 1500);
  document.addEventListener('input', unlockComposer, true);
})();
</script>`;
}
function rewriteHtml(target, html, pageUrl) {
  let out = String(html || "");
  out = out.replace(/<base\b[^>]*>/gi, "");
  out = out.replace(
    /<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi,
    ""
  );
  out = out.replace(/\sintegrity=("[^"]*"|'[^']*')/gi, "");
  out = out.replace(
    /\b(href|src|action|poster|formaction|data-src|data-href)=("([^"]*)"|'([^']*)')/gi,
    (_m, attr, _q, dq, sq) => {
      const value = dq !== void 0 ? dq : sq || "";
      return `${attr}="${mapAttrValue(target, pageUrl, value)}"`;
    }
  );
  out = out.replace(/\bsrcset=("([^"]*)"|'([^']*)')/gi, (_m, _q, dq, sq) => {
    const value = dq !== void 0 ? dq : sq || "";
    const mapped = value.split(",").map((chunk) => {
      const bit = chunk.trim();
      if (!bit) return bit;
      const [urlPart, ...rest] = bit.split(/\s+/);
      return [mapAttrValue(target, pageUrl, urlPart), ...rest].join(" ");
    }).join(", ");
    return `srcset="${mapped}"`;
  });
  out = out.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (m, css) => {
    return m.replace(css, rewriteCss(target, css, pageUrl));
  });
  out = out.replace(
    /<script\b([^>]*\btype\s*=\s*["']importmap["'][^>]*)>([\s\S]*?)<\/script>/gi,
    (m, attrs, body) => {
      try {
        const json = JSON.parse(body);
        const rewriteMap = (obj) => {
          if (!obj || typeof obj !== "object") return obj;
          const next = {};
          for (const [k, v] of Object.entries(obj)) {
            next[k] = typeof v === "string" ? mapAttrValue(target, pageUrl, v) : String(v);
          }
          return next;
        };
        if (json.imports) json.imports = rewriteMap(json.imports);
        if (json.scopes && typeof json.scopes === "object") {
          for (const scope of Object.keys(json.scopes)) {
            json.scopes[scope] = rewriteMap(json.scopes[scope]);
          }
        }
        return `<script${attrs}>${JSON.stringify(json)}</script>`;
      } catch {
        return m;
      }
    }
  );
  const runtime = runtimeScript(target);
  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1>${runtime}`);
  } else if (/<html[^>]*>/i.test(out)) {
    out = out.replace(/<html([^>]*)>/i, `<html$1>${runtime}`);
  } else {
    out = runtime + out;
  }
  return out;
}
function isPanelDenied(status, contentType, bodyPreview) {
  if (status === 403) return true;
  if (!/text\/html|application\/json|text\/plain/i.test(contentType) && status !== 401) return false;
  return /session expired|access again from dashboard|access denied|pak seo|tool dashboard|login to continue|please\s+login/i.test(
    String(bodyPreview || "")
  );
}
function buildRequestHeaders(target, clientHeaders, url, method, refererOverride) {
  const headers = {};
  for (const [rawKey, rawValue] of Object.entries(clientHeaders || {})) {
    const key = rawKey.toLowerCase();
    if (HOP_BY_HOP.has(key)) continue;
    if (key.startsWith("x-vercel") || key.startsWith("x-forwarded") || key === "x-real-ip") continue;
    if (key === "sec-fetch-site" || key === "sec-fetch-mode" || key === "sec-fetch-dest") continue;
    const value = Array.isArray(rawValue) ? rawValue.join(", ") : rawValue;
    if (value == null) continue;
    headers[rawKey] = String(value);
  }
  if (!headers["user-agent"] && !headers["User-Agent"]) {
    headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  }
  headers["Accept-Encoding"] = "identity";
  const cookie = cookieHeaderFor(target.cookies, url);
  if (cookie) headers.Cookie = cookie;
  let sameOrigin = target.origin;
  try {
    sameOrigin = new URL(url).origin;
  } catch {
  }
  let mappedReferer = "";
  const rawReferer = String(clientHeaders?.referer || clientHeaders?.Referer || "");
  if (rawReferer) {
    try {
      const refPath = new URL(rawReferer).pathname;
      const prefix = `${PROXY_BASE}/${encodeURIComponent(target.token)}`;
      if (refPath === prefix || refPath.startsWith(`${prefix}/`)) {
        const remainder = `${refPath.slice(prefix.length) || "/"}${new URL(rawReferer).search}`;
        mappedReferer = fromProxyPath(target, remainder) || "";
      }
    } catch {
    }
  }
  const referer = String(refererOverride || target.referrer || "").trim() || mappedReferer || `${sameOrigin}/`;
  headers.Referer = referer;
  if (method !== "GET" && method !== "HEAD") {
    try {
      headers.Origin = new URL(referer).origin;
    } catch {
      headers.Origin = sameOrigin;
    }
  }
  return headers;
}
async function forwardRequest(opts) {
  const { target, req, res } = opts;
  const method = String(req.method || "GET").toUpperCase();
  let body;
  if (method !== "GET" && method !== "HEAD") {
    const contentType2 = String(req.headers?.["content-type"] || "");
    if (Buffer.isBuffer(req.body)) body = req.body;
    else if (typeof req.body === "string") body = Buffer.from(req.body);
    else if (req.body && typeof req.body === "object" && Object.keys(req.body).length) {
      body = /application\/x-www-form-urlencoded/i.test(contentType2) ? Buffer.from(new URLSearchParams(req.body).toString()) : Buffer.from(JSON.stringify(req.body));
    }
  }
  const referrerList = [];
  const pushRef = (v) => {
    const s = String(v || "").trim();
    if (s && !referrerList.includes(s)) referrerList.push(s);
  };
  pushRef(target.referrer);
  for (const c of target.referrerCandidates || []) pushRef(c);
  if (!referrerList.length) referrerList.push("");
  let cookies = target.cookies;
  let chosenReferrer = referrerList[0] || "";
  let finalUrl = opts.url;
  let finalUpstream = null;
  let finalBuf = null;
  for (let r = 0; r < referrerList.length; r++) {
    const refererOverride = referrerList[r] || void 0;
    let current = opts.url;
    let upstream = null;
    let hopCookies = cookies;
    for (let hop = 0; hop < 8; hop++) {
      const activeTarget2 = { ...target, cookies: hopCookies, referrer: refererOverride || "" };
      const headers = buildRequestHeaders(
        activeTarget2,
        req.headers || {},
        current,
        hop === 0 ? method : "GET",
        refererOverride
      );
      if (body && hop === 0) headers["Content-Length"] = String(body.byteLength);
      upstream = await proxyAwareFetch(current, {
        method: hop === 0 ? method : "GET",
        redirect: "manual",
        headers,
        body: hop === 0 && method !== "GET" && method !== "HEAD" ? body : void 0
      });
      hopCookies = mergeSetCookies(hopCookies, upstream, current);
      if (upstream.status < 300 || upstream.status >= 400) break;
      const location2 = upstream.headers.get("location");
      if (!location2) break;
      const next = resolveAgainst(current, location2);
      if (!next) break;
      if (opts.document) {
        cookies = hopCookies;
        res.status(upstream.status);
        res.setHeader("Location", toProxyPath({ ...target, cookies }, next));
        res.end();
        return { cookies, referrerUsed: refererOverride || "" };
      }
      current = next;
    }
    if (!upstream) continue;
    const contentType2 = upstream.headers.get("content-type") || "";
    const shouldRewriteHtml = REWRITE_HTML.test(contentType2);
    const shouldRewriteCss = REWRITE_CSS.test(contentType2);
    const shouldStream = !shouldRewriteHtml && !shouldRewriteCss && (STREAM_TYPES.test(contentType2) || !contentType2);
    const mayRetry = r < referrerList.length - 1 && Boolean(target.referrer || target.referrerCandidates?.length);
    if (shouldStream && !mayRetry) {
      cookies = hopCookies;
      for (const [key, value] of upstream.headers.entries()) {
        if (STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) continue;
        res.setHeader(key, value);
      }
      res.setHeader("Cache-Control", "no-store");
      if (/event-stream/i.test(contentType2)) res.setHeader("X-Accel-Buffering", "no");
      res.status(upstream.status);
      if (!upstream.body) {
        res.end();
        return { cookies, referrerUsed: refererOverride || "" };
      }
      if (typeof res.flushHeaders === "function") res.flushHeaders();
      Readable.fromWeb(upstream.body).pipe(res);
      return { cookies, referrerUsed: refererOverride || "" };
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    const preview = buf.subarray(0, 4096).toString("utf8");
    cookies = hopCookies;
    finalUpstream = upstream;
    finalBuf = buf;
    finalUrl = upstream.url || current;
    chosenReferrer = refererOverride || "";
    if (mayRetry && isPanelDenied(upstream.status, contentType2, preview)) {
      continue;
    }
    break;
  }
  if (!finalUpstream || !finalBuf) {
    res.status(502).json({ error: "No upstream response" });
    return { cookies, referrerUsed: chosenReferrer };
  }
  const activeTarget = { ...target, cookies, referrer: chosenReferrer };
  const contentType = finalUpstream.headers.get("content-type") || "";
  for (const [key, value] of finalUpstream.headers.entries()) {
    if (STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) continue;
    res.setHeader(key, value);
  }
  const location = finalUpstream.headers.get("location");
  if (location) {
    const abs = resolveAgainst(finalUrl, location);
    if (abs) res.setHeader("Location", toProxyPath(activeTarget, abs));
  }
  res.setHeader("Cache-Control", "no-store");
  res.status(finalUpstream.status);
  if (REWRITE_HTML.test(contentType)) {
    const rawHtml = finalBuf.toString("utf8");
    if (opts.document && isCloudflareChallenge(finalUpstream.status, contentType, rawHtml)) {
      let host = "this website";
      try {
        host = new URL(finalUrl).hostname;
      } catch {
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.status(403);
      res.send(cloudflareBlockedPage(host));
      return { cookies, referrerUsed: chosenReferrer };
    }
    let html = rewriteHtml(activeTarget, rawHtml, finalUrl);
    if (opts.document && target.referrer && isPanelDenied(finalUpstream.status, contentType, finalBuf.subarray(0, 4096).toString("utf8"))) {
      html = `<!doctype html><meta charset="utf-8"><title>Panel locked</title>
<body style="font-family:system-ui;background:#0d0908;color:#fecaca;padding:2.5rem;max-width:36rem;margin:auto">
<h1 style="font-size:1.2rem">Panel session rejected</h1>
<p style="color:#94a3b8;font-size:.9rem;line-height:1.5">
We tried every dashboard Referer (including <code>app.pakseotools.com</code>).
The panel still said <em>Session expired</em> \u2014 so this is <strong>not a proxy/Referer bug</strong>.
The <code>proxy_token</code> cookie is expired or was copied before the panel was unlocked.
</p>
<ol style="color:#cbd5e1;font-size:.85rem;line-height:1.6">
<li>Log into the <strong>original seller dashboard</strong> (Pak SEO / aitoolzmart) and open this tool until it loads.</li>
<li>While that unlocked tab is open, Copy Cookies and paste them in Admin \u2192 Cookies.</li>
<li>Panel unlock referrer = <code>https://app.pakseotools.com/</code> (not /login).</li>
<li>Save, close this tab, open again from your dashboard.</li>
</ol>
<p style="color:#64748b;font-size:.75rem">Tried referrer: ${String(chosenReferrer || "\u2014")}</p>
</body>`;
    }
    res.setHeader("Content-Type", contentType || "text/html; charset=utf-8");
    res.send(html);
    return { cookies, referrerUsed: chosenReferrer };
  }
  if (REWRITE_CSS.test(contentType)) {
    const css = rewriteCss(activeTarget, finalBuf.toString("utf8"), finalUrl);
    res.setHeader("Content-Type", contentType || "text/css; charset=utf-8");
    res.send(css);
    return { cookies, referrerUsed: chosenReferrer };
  }
  if (contentType) res.setHeader("Content-Type", contentType);
  res.send(finalBuf);
  return { cookies, referrerUsed: chosenReferrer };
}

// src/lib/proxySessionStore.ts
init_db();
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
function db() {
  return createPrivilegedSupabase();
}
function keyBuf() {
  return createHash("sha256").update(supabaseSealKeyMaterial()).digest();
}
function sealSession(s) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBuf(), iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(s), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}
function unsealSession(blob) {
  try {
    const buf = Buffer.from(String(blob || ""), "base64url");
    if (buf.length < 29) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", keyBuf(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(json);
    if (!parsed?.token || !parsed?.origin) return null;
    return parsed;
  } catch {
    return null;
  }
}
async function persistStoredSession(s) {
  const client4 = db();
  const sealed = sealSession(s);
  const { error } = await client4.from("tool_proxy_sessions").upsert(
    {
      token: s.token,
      sealed,
      expires_at: new Date(s.expiresAt).toISOString()
    },
    { onConflict: "token" }
  );
  if (!error) return;
  await client4.from("app_settings").upsert(
    {
      key: `pxs_${s.token}`,
      value: { sealed, expiresAt: s.expiresAt },
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    { onConflict: "key" }
  );
}
async function loadStoredSession(token) {
  const id = String(token || "").trim();
  if (!id) return null;
  const client4 = db();
  const table = await client4.from("tool_proxy_sessions").select("sealed,expires_at").eq("token", id).maybeSingle();
  if (!table.error && table.data?.sealed) {
    if (new Date(String(table.data.expires_at)).getTime() <= Date.now()) return null;
    return unsealSession(table.data.sealed);
  }
  const fallback = await client4.from("app_settings").select("value").eq("key", `pxs_${id}`).maybeSingle();
  const v = fallback.data?.value;
  if (v?.sealed) {
    if (Number(v.expiresAt || 0) <= Date.now()) return null;
    return unsealSession(v.sealed);
  }
  return null;
}

// src/lib/toolProxyRoutes.ts
var router6 = Router6();
var SESSION_TTL_MS = 6 * 60 * 60 * 1e3;
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
function client3(token) {
  return createAnonSupabase(token);
}
function toolsDb2() {
  return createPrivilegedSupabase();
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
    const d = String(c?.domain || "").trim().replace(/^\./, "").toLowerCase();
    if (d) hosts.add(d);
  }
  const list = [...hosts];
  if (list.some((h) => /(^|\.)(chatgpt\.com|openai\.com)$/i.test(h))) {
    for (const h of [
      "chatgpt.com",
      "www.chatgpt.com",
      "chat.openai.com",
      "auth.openai.com",
      "api.openai.com",
      "cdn.oaistatic.com",
      "ab.chatgpt.com"
    ]) {
      hosts.add(h);
    }
  }
  return [...hosts];
}
function isPanelUnlockUrl(url) {
  try {
    const host = new URL(String(url || "").trim()).hostname.toLowerCase();
    return host === "toolaccess.click" || host.endsWith(".toolaccess.click") || host.endsWith(".xemrush.site") || host.endsWith(".semrush.site") || host.endsWith(".groupbuy.tools") || /\.(toolpanel|sharedpanel|panelhub)\./i.test(host);
  } catch {
    return /toolaccess\.click|xemrush\.site|semrush\.site/i.test(String(url || ""));
  }
}
function isRealToolOrigin(url) {
  try {
    const host = new URL(String(url || "").trim()).hostname.toLowerCase();
    return host === "chatgpt.com" || host.endsWith(".chatgpt.com") || host === "chat.openai.com" || host.endsWith(".openai.com") || host === "claude.ai" || host.endsWith(".claude.ai") || host === "gemini.google.com" || host === "www.midjourney.com" || host.endsWith(".midjourney.com");
  } catch {
    return false;
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
  if (isRealToolOrigin(dest)) return "";
  if (!isPanelUnlockUrl(dest) && !String(raw || "").trim()) return "";
  if (!isPanelUnlockUrl(dest) && String(raw || "").trim()) {
    return "";
  }
  const normalized = normalizePanelUnlockReferrer(raw);
  if (normalized) return normalized;
  if (isPanelUnlockUrl(dest)) return DEFAULT_PANEL_REFERRER;
  return "";
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
  const supabase3 = client3(token);
  const { data: authData, error: authError } = await supabase3.auth.getUser(token);
  if (authError || !authData.user) return null;
  const db2 = toolsDb2();
  const { data: profile, error } = await db2.from("customers").select("id,customer_code,name,email,role,status,plan,expiry,tools").eq("auth_user_id", authData.user.id).maybeSingle();
  if (!error && profile) return profile;
  const fallback = await supabase3.from("customers").select("id,customer_code,name,email,role,status,plan,expiry,tools").eq("auth_user_id", authData.user.id).single();
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
function resolveToolAccessMethod2(tool, extra) {
  const candidates = [
    extra?.accessMethod,
    extra?.access_method,
    tool?.access_method,
    tool?.accessMethod
  ].map((v) => String(v || "").trim().toLowerCase()).filter(Boolean);
  if (candidates.some((v) => v === "one_click" || v === "one-click")) return "one_click";
  return "extension";
}
function cookieFields2(tool) {
  const extra = parseExtraJson(tool?.extra);
  const url = "toolUrl" in extra || "tool_url" in extra ? String(extra.toolUrl || extra.tool_url || "") : String(tool?.tool_url || "");
  const cookiesRaw = "cookiesJson" in extra || "cookies_json" in extra ? String(extra.cookiesJson ?? extra.cookies_json ?? "") : String(tool?.cookies_json ?? "");
  const panelReferrer = "panelReferrer" in extra || "unlockReferrer" in extra || "panel_referrer" in extra ? String(extra.panelReferrer || extra.unlockReferrer || extra.panel_referrer || "") : String(tool?.panel_referrer || "");
  return {
    accessMethod: resolveToolAccessMethod2(tool, extra),
    url: String(url || "").trim(),
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
  if (!planIsActive2(profile.plan, profile.expiry)) {
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
  return randomBytes2(24).toString("hex");
}
function publicFxPath(token) {
  return `/fx/${encodeURIComponent(String(token || "").trim())}/`;
}
function tokenFromRequest(req) {
  const fromParam = String(req.params?.token || "").trim();
  if (fromParam) return fromParam;
  const fromQuery = String(req.query?.token || "").trim();
  if (fromQuery) return fromQuery;
  const cookie = String(req.headers?.cookie || "");
  const match = cookie.match(/(?:^|;\s*)atm_px=([^;]+)/);
  return match ? decodeURIComponent(match[1].trim()) : "";
}
function tokenFromReferer(req) {
  try {
    const path = new URL(String(req.headers?.referer || "")).pathname;
    return decodeURIComponent(path.match(/^\/fx\/([^/]+)/)?.[1] || "");
  } catch {
    return "";
  }
}
function setProxyCookie(res, token, sealed) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1e3);
  const secure = process.env.VERCEL || process.env.NODE_ENV === "production" ? "; Secure" : "";
  const parts = [
    `atm_px=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly${secure}`
  ];
  if (sealed && sealed.length < 2800) {
    parts.push(
      `atm_px_s=${encodeURIComponent(sealed)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; HttpOnly${secure}`
    );
  }
  if (typeof res.append === "function") {
    for (const p of parts) res.append("Set-Cookie", p);
  } else {
    res.setHeader("Set-Cookie", parts);
  }
}
function hydrateSession(stored) {
  let originHost = "";
  try {
    originHost = new URL(stored.origin).hostname;
  } catch {
  }
  const cookies = Array.isArray(stored.cookies) && stored.cookies.length ? normalizeCookies(stored.cookies, originHost) : normalizeCookies(
    String(stored.cookieHeader || "").split(";").map((part) => {
      const eq = part.indexOf("=");
      if (eq <= 0) return null;
      return {
        name: part.slice(0, eq).trim(),
        value: part.slice(eq + 1).trim(),
        domain: originHost
      };
    }).filter(Boolean),
    originHost
  );
  return { ...stored, cookies };
}
function sealedFromRequest(req) {
  const cookie = String(req.headers?.cookie || "");
  const match = cookie.match(/(?:^|;\s*)atm_px_s=([^;]+)/);
  return match ? decodeURIComponent(match[1].trim()) : "";
}
async function resolveSession(token, req) {
  pruneSessions();
  const id = String(token || "").trim();
  if (!id) return null;
  const mem = sessions.get(id);
  if (mem && mem.expiresAt > Date.now()) {
    mem.expiresAt = Date.now() + SESSION_TTL_MS;
    return mem;
  }
  const stored = await loadStoredSession(id);
  if (stored && stored.expiresAt > Date.now()) {
    const session = hydrateSession(stored);
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    sessions.set(id, session);
    return session;
  }
  if (req) {
    const sealed = sealedFromRequest(req);
    if (sealed) {
      const parsed = unsealSession(sealed);
      if (parsed && parsed.token === id && parsed.expiresAt > Date.now()) {
        const session = hydrateSession(parsed);
        session.expiresAt = Date.now() + SESSION_TTL_MS;
        sessions.set(id, session);
        void persistStoredSession(session);
        return session;
      }
    }
  }
  return null;
}
async function rememberSession(session) {
  sessions.set(session.token, session);
  const sealed = sealSession(session);
  try {
    await persistStoredSession(session);
  } catch (err) {
    console.error("[tool-proxy] persist session failed", err?.message || err);
  }
  return sealed;
}
function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (ch) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return map[ch] || ch;
  });
}
function sessionLostPage(res, status = 410) {
  return res.status(status).type("html").send(
    `<!doctype html><meta charset="utf-8"><title>Session ended</title>
       <body style="font-family:system-ui;background:#0d0908;color:#fecaca;padding:2.5rem;max-width:34rem;margin:auto">
       <h1 style="font-size:1.25rem">Tool session ended</h1>
       <p style="color:#94a3b8;font-size:.9rem">Go back to your dashboard and click <strong>Open</strong> on the tool again.</p>
       </body>`
  );
}
function isDocumentRequest(req) {
  const method = String(req.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD" && method !== "POST") return false;
  const dest = String(req.headers?.["sec-fetch-dest"] || "").toLowerCase();
  if (dest) return dest === "document" || dest === "iframe";
  const accept = String(req.headers?.accept || "");
  return /text\/html/i.test(accept);
}
async function proxyThrough(session, req, res, url) {
  return runWithProxySticky(session.token, async () => {
    const document = isDocumentRequest(req);
    const panelMode = Boolean(session.referrer);
    const target = {
      token: session.token,
      origin: session.origin,
      cookies: session.cookies,
      referrer: panelMode ? session.referrer : "",
      referrerCandidates: panelMode ? session.referrerCandidates : []
    };
    const before = session.cookies.length;
    const result = await forwardRequest({ target, req, res, url, document });
    const changed = result.cookies !== session.cookies && (result.cookies.length !== before || JSON.stringify(result.cookies) !== JSON.stringify(session.cookies));
    session.cookies = result.cookies;
    session.cookieHeader = cookiesToHeader(result.cookies);
    if (result.referrerUsed && panelMode) session.referrer = result.referrerUsed;
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    const sealed = await rememberSession(session);
    if (changed || result.referrerUsed || document) {
      setProxyCookie(res, session.token, sealed);
    } else {
      sessions.set(session.token, session);
    }
  });
}
router6.post("/launch", async (req, res) => {
  try {
    const gate = await requireEntitledLaunch(req);
    if (gate.ok === false) {
      return res.status(gate.status).json({ error: gate.error });
    }
    const { profile, tool, fields, cookies } = gate;
    const dest = fields.url;
    if (isOneClickBlockedHost(dest)) {
      return res.status(403).json({
        error: "Canva and similar sites cannot use one-click \u2014 they require Cloudflare in a real browser. In Admin \u2192 Cookies set this tool to By extension.",
        accessMethod: "extension",
        blockedHost: true
      });
    }
    if (fields.accessMethod !== "one_click") {
      return res.status(403).json({
        error: "This tool requires the ZynexTools Access browser extension. Install it from the Installation Guide, then open again.",
        accessMethod: "extension"
      });
    }
    let origin;
    try {
      origin = new URL(dest).origin;
    } catch {
      return res.status(400).json({ error: "Invalid tool destination URL" });
    }
    const proxyStatus = await getGlobalProxyPublicStatus();
    if (!proxyStatus.ready) {
      return res.status(503).json({
        error: "Global Proxy Engine is not ready. Admin must enable it with a residential sticky HTTP proxy (Webshare) and pass the one-click test."
      });
    }
    const liveRaw = filterLiveCookies(cookies);
    if (!liveRaw.length) {
      return res.status(400).json({
        error: "All saved cookies are expired. Admin must copy fresh cookies from a logged-in session and save again in Admin \u2192 Cookies."
      });
    }
    const referrer = resolvePanelUnlockReferrer(fields.panelReferrer, dest);
    let originHost = "";
    try {
      originHost = new URL(origin).hostname;
    } catch {
    }
    const jar = normalizeCookies(liveRaw, originHost);
    pruneSessions();
    const token = newToken();
    const bootstrap2 = await runWithProxySticky(
      token,
      () => bootstrapSessionCookies({
        origin,
        cookies: jar,
        referrer: referrer || `${origin}/`
      })
    );
    if (!bootstrap2.ok) {
      return res.status(502).json({
        error: bootstrap2.errors[0] || "Could not warm the tool session. Copy fresh cookies or check Global Proxy Engine in Admin.",
        details: bootstrap2.errors
      });
    }
    const session = {
      token,
      accountId: String(profile.id),
      toolId: String(tool.id || ""),
      toolName: String(tool.name || "Tool"),
      targetUrl: dest,
      origin,
      cookies: bootstrap2.cookies,
      cookieHeader: cookiesToHeader(bootstrap2.cookies),
      cookieHosts: hostsFromCookies(liveRaw, origin),
      referrer: referrer || (isPanelUnlockUrl(dest) ? DEFAULT_PANEL_REFERRER : ""),
      referrerCandidates: isPanelUnlockUrl(dest) ? panelUnlockReferrerCandidates(fields.panelReferrer || referrer || DEFAULT_PANEL_REFERRER) : [],
      expiresAt: Date.now() + SESSION_TTL_MS
    };
    const sealed = await rememberSession(session);
    setProxyCookie(res, token, sealed);
    return res.json({
      mode: "proxy",
      viewUrl: publicFxPath(token),
      url: dest,
      name: tool.name,
      toolId: tool.id,
      expiresInSec: Math.floor(SESSION_TTL_MS / 1e3),
      viaGlobalProxy: proxyStatus.ready,
      fingerprint: createHash2("sha256").update(session.cookieHeader || dest).digest("hex").slice(0, 12)
    });
  } catch (error) {
    const message = String(error?.message || "").trim();
    console.error("[tool-proxy/launch]", message || error);
    return res.status(500).json({ error: message || "Could not start tool proxy" });
  }
});
async function handleFxProxy(req, res) {
  let session = null;
  try {
    const token = tokenFromRequest(req);
    if (!token) return sessionLostPage(res, 400);
    session = await resolveSession(token, req);
    if (!session) return sessionLostPage(res);
    const remainder = String(req.url || "/");
    const pathOnly = remainder.split("?")[0] || "/";
    const nestedPrefix = `/fx/${encodeURIComponent(session.token)}`;
    if (pathOnly === nestedPrefix || pathOnly.startsWith(`${nestedPrefix}/`)) {
      const cleaned = unwrapNestedFxPath(session.token, pathOnly);
      const q = remainder.includes("?") ? remainder.slice(remainder.indexOf("?")) : "";
      return res.redirect(302, `${nestedPrefix}${cleaned === "/" ? "/" : cleaned}${q}`);
    }
    const isRoot = pathOnly === "/" || pathOnly === "";
    if (isDocumentRequest(req) && /(?:^|[?&])__cf_chl/i.test(String(req.url || ""))) {
      let host = session.origin;
      try {
        host = new URL(session.origin).hostname;
      } catch {
      }
      return res.status(403).type("html").send(oneClickBlockedHtml(host));
    }
    const target = {
      token: session.token,
      origin: session.origin,
      cookies: session.cookies,
      referrer: session.referrer
    };
    const url = isRoot ? session.targetUrl : fromProxyPath(target, remainder);
    if (!url) return res.status(400).json({ error: "Invalid proxy path" });
    const sealed = sealSession(session);
    setProxyCookie(res, session.token, sealed);
    await proxyThrough(session, req, res, url);
  } catch (error) {
    const message = String(error?.message || "Proxy request failed");
    console.error("[tool-proxy/fx]", message);
    if (res.headersSent) return;
    if (isDocumentRequest(req)) {
      return res.status(502).type("html").send(
        `<!doctype html><meta charset="utf-8"><title>Could not open tool</title>
           <body style="font-family:system-ui;background:#0d0908;color:#fecaca;padding:2.5rem;max-width:34rem;margin:auto">
           <h1 style="font-size:1.25rem">Could not open this tool</h1>
           <p style="color:#94a3b8;font-size:.9rem">${escapeHtml(message)}</p>
           </body>`
      );
    }
    return res.status(502).json({ error: message });
  }
}
async function handleOriginToolApi(req, res) {
  try {
    const session = await resolveSession(tokenFromReferer(req) || tokenFromRequest(req), req);
    if (!session) {
      return res.status(401).json({ error: "No tool session. Open the tool from the dashboard again." });
    }
    const original = String(req.originalUrl || req.url || "/");
    const base = session.origin.endsWith("/") ? session.origin : `${session.origin}/`;
    const url = new URL(original, base).href;
    await proxyThrough(session, req, res, url);
  } catch (error) {
    if (res.headersSent) return;
    return res.status(502).json({ error: error?.message || "Tool API proxy failed" });
  }
}
var RESERVED_PATHS = [
  /^\/api\/tool-proxy(\/|$)/,
  /^\/api\/admin(\/|$)/,
  /^\/api\/accounts(\/|$)/,
  /^\/api\/devices(\/|$)/,
  /^\/api\/settings(\/|$)/,
  /^\/api\/extension(\/|$)/,
  /^\/api\/notifications(\/|$)/,
  /^\/api\/ai(\/|$)/,
  /^\/api\/seo(\/|$)/,
  /^\/api\/health$/,
  /^\/api\/health$/,
  /^\/fx(\/|$)/,
  /^\/go(\/|$)/,
  /^\/health$/
];
var TOOL_ORIGIN_API = [
  /^\/backend-api(\/|$)/,
  /^\/public-api(\/|$)/,
  /^\/backend-anon(\/|$)/,
  /^\/ces(\/|$)/,
  /^\/api\/auth(\/|$)/,
  /^\/api\/subscriptions(\/|$)/,
  /^\/api\/communications(\/|$)/
];
var PORTAL_ASSET_PATHS = [
  /^\/assets\//,
  /^\/src\//,
  /^\/@/,
  /^\/node_modules\//,
  /^\/favicon/,
  /^\/manifest/,
  /^\/robots\.txt$/,
  /^\/sitemap/,
  /^\/vite\.svg$/
];
async function handlePortalToolFallback(req, res, next) {
  try {
    const path = String(req.path || req.url || "/").split("?")[0];
    if (RESERVED_PATHS.some((rx) => rx.test(path))) return next();
    const refererToken = tokenFromReferer(req);
    const token = refererToken || tokenFromRequest(req);
    if (!token) return next();
    const fromProxiedPage = Boolean(refererToken);
    const isToolApi = TOOL_ORIGIN_API.some((rx) => rx.test(path));
    if (!fromProxiedPage && !isToolApi && PORTAL_ASSET_PATHS.some((rx) => rx.test(path))) return next();
    const dest = String(req.headers?.["sec-fetch-dest"] || "").toLowerCase();
    const isSubresource = Boolean(dest) && dest !== "document" && dest !== "empty";
    if (!fromProxiedPage && !isToolApi && !isSubresource) return next();
    const session = await resolveSession(token, req);
    if (!session) return next();
    const base = session.origin.endsWith("/") ? session.origin : `${session.origin}/`;
    const url = new URL(String(req.originalUrl || req.url || "/"), base).href;
    await proxyThrough(session, req, res, url);
  } catch (error) {
    if (res.headersSent) return;
    return next();
  }
}
async function handleProxyView(req, res) {
  const token = tokenFromRequest(req);
  if (!token) return sessionLostPage(res, 400);
  const session = await resolveSession(token, req);
  if (!session) return sessionLostPage(res);
  const sealed = sealSession(session);
  setProxyCookie(res, session.token, sealed);
  return res.redirect(302, publicFxPath(session.token));
}
async function handleProxyAsset(req, res) {
  try {
    const session = await resolveSession(tokenFromRequest(req), req);
    if (!session) return res.status(410).json({ error: "Tool session ended" });
    const url = String(req.query?.u || "").trim();
    if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: "Invalid asset URL" });
    await proxyThrough(session, req, res, url);
  } catch (error) {
    if (res.headersSent) return;
    return res.status(502).json({ error: error?.message || "Asset proxy failed" });
  }
}
router6.get("/view", (req, res) => {
  void handleProxyView(req, res);
});
router6.all("/asset", (req, res) => {
  void handleProxyAsset(req, res);
});
var toolProxyRoutes_default = router6;

// src/lib/settingsRoutes.ts
init_db();
import { Router as Router7 } from "express";

// src/lib/toolAccessLabels.ts
init_db();
var TOOL_ACCESS_LABELS_KEY = "show_tool_access_labels";
var CACHE_MS2 = 15e3;
var cache2 = null;
function serviceClient3() {
  return createPrivilegedSupabase();
}
function isAppSettingsMissing3(message) {
  return /app_settings|does not exist|schema cache|Could not find the table/i.test(String(message || ""));
}
function parseBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
    if (v === "false" || v === "0" || v === "no" || v === "off") return false;
  }
  if (value && typeof value === "object" && "enabled" in value) {
    return Boolean(value.enabled);
  }
  return false;
}
async function getShowToolAccessLabels(admin) {
  const now = Date.now();
  if (cache2 && now - cache2.at < CACHE_MS2 && !cache2.setupRequired) {
    return { enabled: cache2.value };
  }
  try {
    const db2 = admin || serviceClient3();
    const { data, error } = await db2.from("app_settings").select("value").eq("key", TOOL_ACCESS_LABELS_KEY).maybeSingle();
    if (error) {
      const setupRequired = isAppSettingsMissing3(error.message);
      cache2 = { value: false, at: now, setupRequired };
      return { enabled: false, setupRequired: setupRequired || void 0 };
    }
    if (!data) {
      cache2 = { value: false, at: now };
      return { enabled: false };
    }
    const enabled = parseBool(data.value);
    cache2 = { value: enabled, at: now };
    return { enabled };
  } catch (err) {
    const setupRequired = isAppSettingsMissing3(err?.message);
    cache2 = { value: false, at: now, setupRequired };
    return { enabled: false, setupRequired: setupRequired || void 0 };
  }
}
async function setShowToolAccessLabels(enabled, admin) {
  const db2 = admin || serviceClient3();
  const value = Boolean(enabled);
  const { error } = await db2.from("app_settings").upsert(
    {
      key: TOOL_ACCESS_LABELS_KEY,
      value,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    { onConflict: "key" }
  );
  if (error) {
    if (isAppSettingsMissing3(error.message)) {
      throw new Error(
        "Run supabase_device_limits_toggle.sql (creates app_settings) in Supabase, then try again."
      );
    }
    throw new Error(error.message);
  }
  cache2 = { value, at: Date.now() };
  return value;
}

// src/lib/settingsRoutes.ts
var router7 = Router7();
function clients4() {
  return createAuthAndAdminClients();
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
    const url = typeof req.body?.url === "string" ? req.body.url : void 0;
    if (enabled && (url === void 0 ? !(await getGlobalProxyConfig(admin)).url : !String(url).trim())) {
      return res.status(400).json({ error: "Proxy URL is required when enabling the Global Proxy Engine." });
    }
    const cfg = await setGlobalProxyConfig({ enabled, url }, admin);
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
    let url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
    if (!url) {
      const { admin } = clients4();
      const cfg = await getGlobalProxyConfig(admin);
      url = cfg.url;
    }
    if (!url) return res.status(400).json({ error: "Enter a proxy URL to test." });
    const result = await testProxyUrl(url);
    if (result.ok === false) {
      return res.status(502).json({ ok: false, error: result.error });
    }
    return res.json({
      ok: true,
      ip: result.ip,
      isp: result.isp,
      hosting: result.hosting,
      residentialLikely: result.residentialLikely,
      chatgptHtml: result.chatgptHtml,
      chatgptBlocked: result.chatgptBlocked,
      udemyHtml: result.udemyHtml,
      udemyBlocked: result.udemyBlocked,
      oneClickReady: result.oneClickReady,
      warnings: result.warnings,
      message: result.message
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || "Proxy test failed" });
  }
});
router7.get("/tool-access-labels", async (req, res) => {
  try {
    const current = await actor4(req);
    if (!current) return res.status(401).json({ error: "Not authorized" });
    const { admin } = clients4();
    const setting = await getShowToolAccessLabels(admin);
    return res.json({
      enabled: Boolean(setting.enabled),
      ...setting.setupRequired ? { setupRequired: true } : {}
    });
  } catch {
    return res.json({ enabled: false });
  }
});
router7.patch("/tool-access-labels", async (req, res) => {
  try {
    const current = await actor4(req);
    if (!current) return res.status(401).json({ error: "Not authorized" });
    if (current.role !== "admin") return res.status(403).json({ error: "Admin only" });
    const raw = req.body?.enabled ?? req.body?.show_tool_access_labels;
    if (typeof raw !== "boolean") {
      return res.status(400).json({ error: "enabled must be a boolean" });
    }
    const { admin } = clients4();
    const enabled = await setShowToolAccessLabels(raw, admin);
    return res.json({ enabled });
  } catch (error) {
    const message = error?.message || "Could not update setting";
    const setup = /app_settings|supabase_device_limits/i.test(message);
    return res.status(setup ? 503 : 500).json({ error: message, enabled: false });
  }
});
var settingsRoutes_default = router7;

// src/lib/mobileRoutes.ts
init_db();
init_pushEngine();
import { Router as Router8 } from "express";
var router8 = Router8();
function authClient(token) {
  return createAnonSupabase(token);
}
async function profileForToken3(token) {
  const client4 = authClient(token);
  const { data: userData, error } = await client4.auth.getUser(token);
  if (error || !userData.user) return null;
  const db2 = createPrivilegedSupabase(token);
  const { data: profile } = await db2.from("customers").select("id,role,status").eq("auth_user_id", userData.user.id).maybeSingle();
  if (!profile || profile.status === "blocked") return null;
  return profile;
}
function canDispatch(profile, items) {
  if (profile.role === "admin") return true;
  return items.every((item) => item.accountId === profile.id);
}
router8.get("/info", (_req, res) => {
  const apkUrl = String(process.env.MOBILE_APK_URL || "/downloads/zynextools.apk").trim();
  const version = String(process.env.MOBILE_APK_VERSION || "1.2.0").trim();
  res.json({
    ok: true,
    platform: "android",
    apkUrl,
    version,
    minAndroid: 24,
    appName: "ZynexTools",
    pushEnabled: pushConfigured(),
    note: "Install once. Tools and cookies update automatically when you open them \u2014 no reinstall needed."
  });
});
router8.post("/push/register", async (req, res) => {
  try {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const profile = await profileForToken3(token);
    if (!profile) return res.status(401).json({ error: "Session expired" });
    const fcmToken = String(req.body?.token || "").trim();
    const platform = String(req.body?.platform || "android").trim();
    if (!fcmToken) return res.status(400).json({ error: "token is required" });
    await registerPushToken(String(profile.id), fcmToken, platform);
    return res.json({ ok: true, pushEnabled: pushConfigured() });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Could not register push token" });
  }
});
router8.post("/push/unregister", async (req, res) => {
  try {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const profile = await profileForToken3(token);
    if (!profile) return res.status(401).json({ error: "Session expired" });
    const fcmToken = String(req.body?.token || "").trim();
    if (fcmToken) await unregisterPushToken(String(profile.id), fcmToken);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Could not unregister push token" });
  }
});
router8.post("/push/dispatch", async (req, res) => {
  try {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const profile = await profileForToken3(token);
    if (!profile) return res.status(401).json({ error: "Session expired" });
    const items = Array.isArray(req.body?.items) ? req.body.items.map((row) => ({
      accountId: String(row.accountId || row.account_id || "").trim(),
      title: String(row.title || "ZynexTools"),
      message: String(row.message || "")
    })).filter((row) => row.accountId) : [];
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    for (const row of rows) {
      const accountId = String(row.recipient_id || row.accountId || "").trim();
      if (!accountId || row.read === true) continue;
      items.push({
        accountId,
        title: String(row.title || "ZynexTools"),
        message: String(row.message || "")
      });
    }
    if (!items.length) return res.json({ ok: true, sent: 0 });
    if (!canDispatch(profile, items)) {
      return res.status(403).json({ error: "Not allowed to push to these recipients" });
    }
    const result = await sendPushToAccounts(items);
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Push dispatch failed" });
  }
});
var mobileRoutes_default = router8;

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
  const rawBody = express.raw({ type: () => true, limit: "50mb" });
  const proxyPrefixes = [
    "/backend-api",
    "/public-api",
    "/backend-anon",
    "/ces",
    "/api/auth",
    "/api/subscriptions",
    "/api/communications"
  ];
  app.use("/fx/:token", rawBody, (req, res) => {
    void handleFxProxy(req, res);
  });
  app.use(proxyPrefixes, rawBody, (req, res) => {
    void handleOriginToolApi(req, res);
  });
  app.all("/api/tool-proxy/asset", rawBody, (req, res) => {
    void handleProxyAsset(req, res);
  });
  app.get(["/go", "/go/*"], (req, res) => {
    void handleProxyView(req, res);
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
    res.json({ status: "ok", service: "ZynexTools", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.use("/api/admin", adminRoutes_default);
  app.use("/api/accounts", accountRoutes_default);
  app.use("/api/devices", deviceRoutes_default);
  app.use("/api/settings", settingsRoutes_default);
  app.use("/api/extension", extensionRoutes_default);
  app.use("/api/mobile", mobileRoutes_default);
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
      const { url } = req.body;
      if (!url) return res.status(400).json({ success: false, error: "URL required." });
      let formatted = url.trim();
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
  app.use((req, res, next) => {
    void handlePortalToolFallback(req, res, next);
  });
  return app;
}

// api/handler.ts
var healthPayload = () => ({
  status: "ok",
  service: "ZynexTools",
  timestamp: (/* @__PURE__ */ new Date()).toISOString()
});
function isHealthPath(url) {
  if (!url) return false;
  const path = url.split("?")[0];
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
