import { createClient } from '@supabase/supabase-js';

/**
 * Avoid `import.meta.env` here — this module is shared by the Vite client and the
 * Vercel serverless API. Vercel's Node builder may emit CJS, where `import.meta`
 * is a SyntaxError and crashes the whole function (FUNCTION_INVOCATION_FAILED).
 * Vite inlines `process.env.VITE_*` via vite.config.ts `define`.
 */
const nodeEnv = typeof process !== 'undefined' ? process.env : {};
const SUPABASE_URL =
  nodeEnv.SUPABASE_URL ||
  nodeEnv.VITE_SUPABASE_URL ||
  'https://duvwpbetvftqissnstoy.supabase.co';
const SUPABASE_ANON =
  nodeEnv.SUPABASE_ANON_KEY ||
  nodeEnv.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dndwYmV0dmZ0cWlzc25zdG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4NjkxMTksImV4cCI6MjEwMjQ0NTExOX0.2_-KYBcp3z4xa9MMsg4GAAdWpABhOIWInfN2SIFiv1w';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ── Table name map ────────────────────────────────────────────────────────
const TABLE: Record<string, string> = {
  tools:         'tools',
  orders:        'orders',
  customers:     'customers',
  coupons:       'coupons',
  tickets:       'tickets',
  settings:      'settings',
  activity:      'activity_log',
  notifications: 'notifications',
  banners:       'banners',
  resellerPayments: 'reseller_payments',
};

// ── camelCase → snake_case field mapping for insert/update ────────────────
function toSnake(obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const map: Record<string, string> = {
    invoiceNo:       'invoice_no',
    orderDate:       'order_date',
    customerId:      'customer_id',
    customerName:    'customer_name',
    customerEmail:   'customer_email',
    customerPhone:   'customer_phone',
    customerCity:    'customer_city',
    toolId:          'tool_id',
    finalAmount:     'final_amount',
    paymentMethod:   'payment_method',
    paymentStatus:   'payment_status',
    transactionId:   'transaction_id',
    adminNotes:      'admin_notes',
    couponCode:      'coupon_code',
    subStatus:       'sub_status',
    activationDate:  'activation_date',
    expiryDate:      'expiry_date',
    daysLeft:        'days_left',
    createdAt:       'created_at',
    joinDate:        'join_date',
    totalOrders:     'total_orders',
    totalSpend:      'total_spend',
    usageLimit:      'usage_limit',
    usedCount:       'used_count',
    minPurchase:     'min_purchase',
    customerEmail2:  'customer_email',
    originalPrice:   'original_price',
    isPrivate:       'is_private',
    isSemiPrivate:   'is_semi_private',
    fullDesc:        'full_desc',
    waText:          'wa_text',
    useCases:        'use_cases',
    authUserId:      'auth_user_id',
    planDays:        'plan_days',
    ownerId:         'owner_id',
    memberId:        'member_id',
    memberName:      'member_name',
    paymentDate:     'payment_date',
    // tools table column is "desc" (quoted reserved word in SQL)
    desc:            'desc',
    accessMethod:    'access_method',
    toolUrl:         'tool_url',
    cookiesJson:     'cookies_json',
    panelReferrer:   'panel_referrer',
    showOnHome:      'show_on_home',
  };
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    const snakeKey = map[k] || k;
    out[snakeKey] = v;
  }
  return out;
}

// ── snake_case → camelCase for results ───────────────────────────────────
function toCamel(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamel);
  const map: Record<string, string> = {
    invoice_no:      'invoiceNo',
    order_date:      'orderDate',
    customer_id:     'customerId',
    customer_name:   'customerName',
    customer_email:  'customerEmail',
    customer_phone:  'customerPhone',
    customer_city:   'customerCity',
    tool_id:         'toolId',
    final_amount:    'finalAmount',
    payment_method:  'paymentMethod',
    payment_status:  'paymentStatus',
    transaction_id:  'transactionId',
    admin_notes:     'adminNotes',
    coupon_code:     'couponCode',
    sub_status:      'subStatus',
    activation_date: 'activationDate',
    expiry_date:     'expiryDate',
    days_left:       'daysLeft',
    created_at:      'createdAt',
    join_date:       'joinDate',
    total_orders:    'totalOrders',
    total_spend:     'totalSpend',
    usage_limit:     'usageLimit',
    used_count:      'usedCount',
    min_purchase:    'minPurchase',
    original_price:  'originalPrice',
    is_private:      'isPrivate',
    is_semi_private: 'isSemiPrivate',
    full_desc:       'fullDesc',
    wa_text:         'waText',
    use_cases:       'useCases',
    auth_user_id:    'authUserId',
    plan_days:       'planDays',
    owner_id:        'ownerId',
    member_id:       'memberId',
    member_name:     'memberName',
    payment_date:    'paymentDate',
    desc:            'desc',
    description:     'desc',
    access_method:   'accessMethod',
    tool_url:        'toolUrl',
    cookies_json:    'cookiesJson',
    panel_referrer:  'panelReferrer',
    show_on_home:    'showOnHome',
  };
  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    const camelKey = map[k] || k;
    out[camelKey] = toCamel(v);
  }
  return out;
}

// ── readDb: fetch all rows from a Supabase table ─────────────────────────
export async function readDb<T>(name: string, defaultVal: T): Promise<T> {
  const table = TABLE[name];
  if (!table) return defaultVal;

  try {
    if (name === 'settings') {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (error || !data) return defaultVal;
      return toCamel(data) as T;
    }

    const orderCol = name === 'activity' ? 'created_at' : 'created_at';
    const { data, error } = await supabase.from(table).select('*').order(orderCol, { ascending: false });
    if (error || !data) return defaultVal;
    return toCamel(data) as T;
  } catch {
    return defaultVal;
  }
}

// ── writeDb: replace all rows (used for bulk updates) ────────────────────
// NOTE: For single-record updates, use supabase directly in adminRoutes.
// writeDb is kept for compatibility but performs upsert.
export async function writeDb<T>(name: string, data: T): Promise<void> {
  const table = TABLE[name];
  if (!table) return;

  try {
    if (name === 'settings') {
      const row = toSnake({ ...(data as any), id: 1 });
      await supabase.from('settings').upsert(row);
      return;
    }

    const rows = Array.isArray(data) ? data : [data];
    if (rows.length === 0) return;
    const snakeRows = rows.map(toSnake);
    await supabase.from(table).upsert(snakeRows);
  } catch (e) {
    console.error(`Supabase writeDb error [${name}]:`, e);
  }
}

// ── logActivity ───────────────────────────────────────────────────────────
export async function logActivity(action: string, detail: string): Promise<void> {
  try {
    await supabase.from('activity_log').insert({
      id: 'ACT' + Date.now(),
      action,
      detail,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('logActivity error:', e);
  }
}

// ── seedIfEmpty: no-op — seeding is done via SQL schema ──────────────────
export function seedIfEmpty(): void {
  // Data lives in Supabase; seed via supabase_schema.sql
}

// ── DEFAULT_SETTINGS export (still used by some UI components) ────────────
export const DEFAULT_SETTINGS = {
  siteName:        'ZynexTools',
  contactEmail:    'emaan@aitoolsmart.com',
  whatsapp:        '+923275855578',
  currency:        'PKR',
  invoicePrefix:   'INV',
  taxPercent:      '0',
  maintenanceMode: false,
  easypaisa:       '03XX-XXXXXXX',
  jazzcash:        '03XX-XXXXXXX',
  paypalEmail:     'payments@zynextools.com',
  bankName:        'Meezan Bank',
  bankAccount:     '0123456789',
};
