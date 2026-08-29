import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, authenticateAdmin } from './auth';
import { getSupabaseConfig, requireServiceRoleKey, logActivity } from './db';
import { notifyAdminAndOwner, notifyTicketCreated, notifyTicketReply } from './notifications';
import { activateCustomerForApprovedOrder, buildApprovedOrderDates } from './subscriptionActivate';

const router = Router();

const COLUMN_MISSING = /could not find|schema cache|column|42703|PGRST204/i;

/** Service role for admin writes so mutations persist past RLS on Vercel. */
function adminServiceDb() {
  const { url } = getSupabaseConfig();
  const serviceKey = requireServiceRoleKey();
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** @deprecated use adminServiceDb */
function toolsAdminDb() {
  return adminServiceDb();
}

function slugifyToolKey(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function toolMatchesKey(tool: { id?: string; name?: string }, key: string) {
  const want = String(key || '').trim().toLowerCase();
  if (!want) return false;
  const id = String(tool?.id || '').trim().toLowerCase();
  const name = String(tool?.name || '').trim().toLowerCase();
  return id === want || name === want || slugifyToolKey(name) === want || slugifyToolKey(id) === want;
}

async function resolveToolId(sb: ReturnType<typeof toolsAdminDb>, key: string): Promise<string | null> {
  const raw = decodeURIComponent(String(key || '')).trim();
  if (!raw) return null;
  const slug = slugifyToolKey(raw);
  for (const candidate of [raw, slug]) {
    if (!candidate) continue;
    const byId = await sb.from('tools').select('id,name').eq('id', candidate).maybeSingle();
    if (byId.data?.id) return String(byId.data.id);
  }
  const catalog = await sb.from('tools').select('id,name');
  const match = (catalog.data || []).find((row: any) => toolMatchesKey(row, raw) || toolMatchesKey(row, slug));
  return match?.id ? String(match.id) : null;
}

/** Create a tools row when Cookies is saved for a tool that only exists in the admin UI. */
async function ensureToolRow(
  sb: ReturnType<typeof toolsAdminDb>,
  key: string,
  body: any,
): Promise<{ id: string; created: boolean } | { error: string }> {
  const existing = await resolveToolId(sb, key);
  if (existing) return { id: existing, created: false };

  const name = String(body?.name || key || 'New Tool').trim() || 'New Tool';
  const id =
    slugifyToolKey(body?.id || key || name) ||
    `tool-${Date.now().toString(36)}`;

  const seed = camelToSnakeTool({
    id,
    name,
    category: body?.category || 'Other',
    rating: typeof body?.rating === 'number' ? body.rating : 4.9,
    price: typeof body?.price === 'number' ? body.price : 0,
    originalPrice: typeof body?.originalPrice === 'number' ? body.originalPrice : 0,
    discount: typeof body?.discount === 'number' ? body.discount : 0,
    favicon: body?.favicon || `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(name)}`,
    desc: body?.desc || `${name} access`,
    fullDesc: body?.fullDesc || '',
    features: Array.isArray(body?.features) ? body.features : [],
    useCases: Array.isArray(body?.useCases) ? body.useCases : [],
    faqs: Array.isArray(body?.faqs) ? body.faqs : [],
    waText: body?.waText || name,
    isPrivate: Boolean(body?.isPrivate),
    isSemiPrivate: Boolean(body?.isSemiPrivate),
    showOnHome: body?.showOnHome !== false,
    badge: body?.badge || '',
    accessMethod: body?.accessMethod,
    toolUrl: body?.toolUrl,
    cookiesJson: body?.cookiesJson,
    panelReferrer: body?.panelReferrer,
  });

  const extra = await mergeCookieExtra(sb, id, body, {});
  let { data, error } = await sb.from('tools').upsert({ ...seed, extra }).select('id').single();
    if (error && COLUMN_MISSING.test(error.message || '')) {
      const withoutCols = { ...seed };
      delete withoutCols.description;
      delete withoutCols.show_on_home;
      delete withoutCols.access_method;
      delete withoutCols.tool_url;
      delete withoutCols.cookies_json;
      delete withoutCols.panel_referrer;
      const retry = await sb.from('tools').upsert({ ...withoutCols, extra }).select('id').single();
      data = retry.data;
      error = retry.error;
    }
  if (error || !data?.id) {
    return { error: error?.message || 'Could not create tool row in the database' };
  }
  logActivity('Tool Auto-Created', `Created tool from Cookies save: ${name} (${data.id})`);
  return { id: String(data.id), created: true };
}

async function mergeCookieExtra(
  sb: ReturnType<typeof toolsAdminDb>,
  toolId: string,
  body: any,
  baseExtra?: Record<string, any>,
) {
  let prevExtra = baseExtra && typeof baseExtra === 'object' ? { ...baseExtra } : null;
  if (!prevExtra) {
    const { data: existing } = await sb.from('tools').select('extra').eq('id', toolId).maybeSingle();
    const raw = existing?.extra;
    if (raw && typeof raw === 'object') prevExtra = { ...raw };
    else if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        prevExtra = parsed && typeof parsed === 'object' ? { ...parsed } : {};
      } catch {
        prevExtra = {};
      }
    } else {
      prevExtra = {};
    }
  }
  const extra: any = { ...prevExtra };
  if (body.accessMethod !== undefined) extra.accessMethod = body.accessMethod;
  if (body.toolUrl !== undefined) extra.toolUrl = body.toolUrl;
  if (body.cookiesJson !== undefined) extra.cookiesJson = body.cookiesJson;
  if (body.panelReferrer !== undefined) {
    extra.panelReferrer = body.panelReferrer;
    extra.unlockReferrer = body.panelReferrer;
  }
  if (body.apkDesktopDefault !== undefined) {
    extra.apkDesktopDefault = Boolean(body.apkDesktopDefault);
  }
  if (body.showOnHome !== undefined) extra.showOnHome = body.showOnHome !== false;
  return extra;
}

// ── POST /api/admin/login ─────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const token = await authenticateAdmin(email, password);
  if (!token) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  logActivity('Login', `Admin logged in: ${email}`);
  return res.json({ ok: true, token, email });
});

// ── POST /api/admin/logout ────────────────────────────────────────────────
router.post('/logout', requireAuth, (req, res) => {
  logActivity('Logout', 'Admin logged out');
  res.json({ ok: true });
});

// ── GET /api/admin/dashboard ──────────────────────────────────────────────
router.get('/dashboard', requireAuth, async (req, res) => {
  const orders    = await readDb<any[]>('orders', []);
  const customers = await readDb<any[]>('customers', []);
  const tools     = await readDb<any[]>('tools', []);

  const approved     = orders.filter(o => o.status === 'approved');
  const totalRevenue = approved.reduce((s: number, o: any) => s + (o.finalAmount || 0), 0);
  const todayStr     = new Date().toISOString().slice(0, 10);
  const todayOrders  = orders.filter(o => (o.orderDate || '').slice(0,10) === todayStr);

  res.json({
    totalRevenue,
    totalOrders:          orders.length,
    todayOrders:          todayOrders.length,
    pendingOrders:        orders.filter(o => o.status === 'pending').length,
    approvedOrders:       approved.length,
    rejectedOrders:       orders.filter(o => o.status === 'rejected').length,
    refundedOrders:       orders.filter(o => o.status === 'refunded').length,
    activeSubscriptions:  orders.filter(o => o.subStatus === 'active').length,
    expiredSubscriptions: orders.filter(o => o.subStatus === 'expired').length,
    totalCustomers:       customers.length,
    activeCustomers:      customers.filter(c => c.status === 'active').length,
    blockedCustomers:     customers.filter(c => c.status === 'blocked').length,
    totalTools:           tools.length,
    recentOrders:         orders.slice(0, 5),
    expiringSoon:         orders.filter(o => o.daysLeft >= 0 && o.daysLeft <= 5),
  });
});

// ── ORDERS ────────────────────────────────────────────────────────────────
router.get('/orders', requireAuth, async (req, res) => {
  const { status, search } = req.query as any;
  let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (status && status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  let result = data || [];
  if (search) {
    const q = search.toLowerCase();
    result = result.filter((o: any) =>
      o.customer_name?.toLowerCase().includes(q) ||
      o.invoice_no?.toLowerCase().includes(q) ||
      o.tool?.toLowerCase().includes(q) ||
      o.id?.toLowerCase().includes(q)
    );
  }
  // camelCase for frontend
  res.json(result.map((o: any) => snakeToCamelOrder(o)));
});

router.get('/orders/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('orders').select('*').eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ error: 'Order not found' });
  res.json(snakeToCamelOrder(data));
});

router.post('/orders', requireAuth, async (req, res) => {
  const { data: existing } = await supabase.from('orders').select('id').order('created_at', { ascending: false }).limit(1);
  const invoiceNum = 100 + (existing?.length || 0);
  const order = {
    id: `ORD${Date.now()}`,
    invoice_no: `INV-${String(invoiceNum).padStart(3,'0')}`,
    order_date: new Date().toISOString().slice(0,10),
    ...camelToSnakeOrder(req.body),
  };
  const { data, error } = await supabase.from('orders').insert(order).select().single();
  if (error) return res.status(500).json({ error: error.message });
  await notifyAdminAndOwner({
    title: 'New Order',
    message: `${order.customer_name} ordered ${order.tool}`,
    type: 'order',
    customerId: order.customer_id || null,
    customerPhone: order.customer_phone || order.whatsapp || null,
    customerEmail: order.customer_email || null,
  });
  logActivity('Order Created', `Created order ${order.id} for ${order.customer_name}`);
  res.json(snakeToCamelOrder(data));
});

router.patch('/orders/:id', requireAuth, async (req, res) => {
  try {
    const sb = adminServiceDb();
    const patch = camelToSnakeOrder(req.body);
    const { data: existing, error: loadError } = await sb.from('orders').select('*').eq('id', req.params.id).single();
    if (loadError || !existing) return res.status(404).json({ error: 'Order not found' });

    const approving =
      patch.status === 'approved' ||
      req.body?.status === 'approved' ||
      patch.sub_status === 'active' ||
      req.body?.subStatus === 'active';

    if (approving) {
      const dates = buildApprovedOrderDates(existing, { ...patch, ...req.body });
      patch.status = 'approved';
      patch.payment_status = patch.payment_status || 'paid';
      patch.sub_status = patch.sub_status || 'active';
      patch.activation_date = dates.activationDate;
      patch.expiry_date = dates.expiryDate;
      patch.days_left = dates.daysLeft;
      try {
        const applied = await activateCustomerForApprovedOrder(sb, existing, patch);
        if (applied.expiryDate) patch.expiry_date = applied.expiryDate;
        if (applied.daysLeft !== undefined) patch.days_left = applied.daysLeft;
        if (applied.customerId && !existing.customer_id) patch.customer_id = applied.customerId;
      } catch (activationError: any) {
        return res.status(500).json({ error: activationError?.message || 'Order saved but customer plan could not be activated' });
      }
    } else if (patch.expiry_date) {
      const { daysLeft } = await import('./planDuration');
      patch.days_left = daysLeft(String(patch.expiry_date));
    }

    const { data, error } = await sb.from('orders').update(patch).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    logActivity('Order Updated', `Updated order ${req.params.id}`);
    res.json(snakeToCamelOrder(data));
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Could not update order' });
  }
});

router.delete('/orders/:id', requireAuth, async (req, res) => {
  try {
    const sb = adminServiceDb();
    const { error } = await sb.from('orders').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    logActivity('Order Deleted', `Deleted order ${req.params.id}`);
    res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Could not delete order' });
  }
});

// ── TOOLS ─────────────────────────────────────────────────────────────────
router.get('/tools', requireAuth, async (req, res) => {
  try {
    const sb = toolsAdminDb();
    const { data, error } = await sb.from('tools').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json((data || []).map(snakeToCamelTool));
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Could not load tools' });
  }
});

router.get('/public/tools', async (req, res) => {
  const { data, error } = await supabase.from('tools').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map((row: any) => {
    const tool = snakeToCamelTool(row);
    delete tool.cookiesJson;
    return tool;
  }));
});

router.post('/tools', requireAuth, async (req, res) => {
  try {
    const sb = toolsAdminDb();
    const tool = camelToSnakeTool({
      ...req.body,
      id: req.body.id || req.body.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    });
    const extra = await mergeCookieExtra(sb, tool.id, req.body);
    let { data, error } = await sb.from('tools').upsert({ ...tool, extra }).select().single();
    if (error && COLUMN_MISSING.test(error.message || '')) {
      const withoutCols = { ...tool };
      delete withoutCols.description;
      delete withoutCols.show_on_home;
      delete withoutCols.access_method;
      delete withoutCols.tool_url;
      delete withoutCols.cookies_json;
      delete withoutCols.panel_referrer;
      const retry = await sb.from('tools').upsert({ ...withoutCols, extra }).select().single();
      data = retry.data;
      error = retry.error;
    }
    if (error) return res.status(500).json({ error: error.message });
    logActivity('Tool Saved', `Saved tool: ${tool.name || tool.id}`);
    res.json(snakeToCamelTool(data));
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Could not save tool' });
  }
});

router.patch('/tools/:id', requireAuth, async (req, res) => {
  try {
    const sb = toolsAdminDb();
    const ensured = await ensureToolRow(sb, req.params.id, {
      ...req.body,
      name: req.body?.name || req.params.id,
      id: req.body?.id || req.params.id,
    });
    if ('error' in ensured) {
      return res.status(500).json({ error: ensured.error });
    }
    const toolId = ensured.id;

    const payload = camelToSnakeTool(req.body);
    // Never overwrite primary key / blank out name on cookie-only patches.
    delete (payload as any).id;
    if (!String((payload as any).name || '').trim()) delete (payload as any).name;

    const extra = await mergeCookieExtra(sb, toolId, req.body);
    // Dual-write: dedicated columns (when present) AND extra JSON fallback for older schemas.
    let { data, error } = await sb
      .from('tools')
      .update({ ...payload, extra })
      .eq('id', toolId)
      .select()
      .single();

    if (error && COLUMN_MISSING.test(error.message || '')) {
      const withoutCols = { ...payload };
      delete withoutCols.description;
      delete withoutCols.access_method;
      delete withoutCols.tool_url;
      delete withoutCols.cookies_json;
      delete withoutCols.panel_referrer;
      delete withoutCols.show_on_home;
      const retry = await sb
        .from('tools')
        .update({ ...withoutCols, extra })
        .eq('id', toolId)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    // If column updates still fail, try extra-only write.
    if (error && COLUMN_MISSING.test(error.message || '')) {
      const retryExtra = await sb.from('tools').update({ extra }).eq('id', toolId).select().single();
      data = retryExtra.data;
      error = retryExtra.error;
    }

    if (error) return res.status(500).json({ error: error.message });
    if (!data) {
      return res.status(500).json({
        error: 'Database update returned no row. Check SUPABASE_SERVICE_ROLE_KEY and that the tools row exists.',
      });
    }

    // Ensure access_method column matches the save when the column exists.
    const wantMethod =
      String(req.body?.accessMethod || '').trim().toLowerCase() === 'one_click' ? 'one_click' : 'extension';
    if (req.body?.accessMethod !== undefined && data.access_method !== wantMethod) {
      const force = await sb
        .from('tools')
        .update({ access_method: wantMethod, extra })
        .eq('id', toolId)
        .select()
        .single();
      if (!force.error && force.data) data = force.data;
      else if (force.error && COLUMN_MISSING.test(force.error.message || '')) {
        const extraOnly = await sb.from('tools').update({ extra }).eq('id', toolId).select().single();
        if (!extraOnly.error && extraOnly.data) data = extraOnly.data;
      }
    }

    // Force-sync cookie columns when they lag behind the just-saved extra payload.
    const wantUrl = req.body?.toolUrl !== undefined ? String(req.body.toolUrl || '') : null;
    const wantCookies = req.body?.cookiesJson !== undefined ? req.body.cookiesJson : null;
    const wantRef = req.body?.panelReferrer !== undefined ? String(req.body.panelReferrer || '') : null;
    const urlLag = wantUrl !== null && String(data.tool_url || '') !== wantUrl;
    const cookiesLag =
      wantCookies !== null && String(data.cookies_json ?? '') !== String(wantCookies ?? '');
    const refLag = wantRef !== null && String(data.panel_referrer || '') !== wantRef;
    if (urlLag || cookiesLag || refLag) {
      const sync: any = { extra };
      if (wantUrl !== null) sync.tool_url = wantUrl;
      if (wantCookies !== null) sync.cookies_json = wantCookies;
      if (wantRef !== null) sync.panel_referrer = wantRef;
      const synced = await sb.from('tools').update(sync).eq('id', toolId).select().single();
      if (!synced.error && synced.data) data = synced.data;
      else if (synced.error && COLUMN_MISSING.test(synced.error.message || '')) {
        const extraOnly = await sb.from('tools').update({ extra }).eq('id', toolId).select().single();
        if (!extraOnly.error && extraOnly.data) data = extraOnly.data;
      }
    }

    logActivity('Tool Updated', `Updated tool: ${data.name}`);
    const mapped = snakeToCamelTool(data);
    const usedFallback =
      Boolean(
        req.body?.toolUrl ||
          req.body?.accessMethod ||
          req.body?.cookiesJson ||
          req.body?.panelReferrer,
      ) &&
      !data.tool_url &&
      Boolean(mapped.toolUrl || mapped.accessMethod === 'one_click' || mapped.panelReferrer);
    res.json({ ...mapped, usedFallback, created: ensured.created || undefined });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Could not update tool' });
  }
});

router.delete('/tools/:id', requireAuth, async (req, res) => {
  try {
    const sb = toolsAdminDb();
    const toolId = (await resolveToolId(sb, req.params.id)) || req.params.id;
    const { data: tool } = await sb.from('tools').select('name').eq('id', toolId).maybeSingle();
    const { error } = await sb.from('tools').delete().eq('id', toolId);
    if (error) return res.status(500).json({ error: error.message });
    logActivity('Tool Deleted', `Deleted tool: ${tool?.name}`);
    res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Could not delete tool' });
  }
});

// ── CUSTOMERS ─────────────────────────────────────────────────────────────
router.get('/customers', requireAuth, async (req, res) => {
  const { search } = req.query as any;
  let query = supabase.from('customers').select('*').order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  let result = data || [];
  if (search) {
    const q = search.toLowerCase();
    result = result.filter((c: any) => c.name?.toLowerCase().includes(q) || c.email?.includes(q) || c.phone?.includes(q));
  }
  res.json(result.map(snakeToCamelCustomer));
});

router.post('/customers', requireAuth, async (req, res) => {
  const customer = {
    ...camelToSnakeCustomer(req.body),
    id: `C${Date.now()}`,
    join_date: new Date().toISOString().slice(0,10),
  };
  const { data, error } = await supabase.from('customers').insert(customer).select().single();
  if (error) return res.status(500).json({ error: error.message });
  logActivity('Customer Added', `Added customer: ${customer.name}`);
  res.json(snakeToCamelCustomer(data));
});

router.patch('/customers/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('customers').update(camelToSnakeCustomer(req.body)).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  logActivity('Customer Updated', `Updated customer: ${data.name}`);
  res.json(snakeToCamelCustomer(data));
});

router.delete('/customers/:id', requireAuth, async (req, res) => {
  const { data: c } = await supabase.from('customers').select('name').eq('id', req.params.id).single();
  const { error } = await supabase.from('customers').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  logActivity('Customer Deleted', `Deleted customer: ${c?.name}`);
  res.json({ ok: true });
});

// ── COUPONS ───────────────────────────────────────────────────────────────
router.get('/coupons', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json((data || []).map(snakeToCamelCoupon));
});

router.post('/coupons', requireAuth, async (req, res) => {
  const coupon = { ...camelToSnakeCoupon(req.body), id: `CPN${Date.now()}` };
  const { data, error } = await supabase.from('coupons').insert(coupon).select().single();
  if (error) return res.status(500).json({ error: error.message });
  logActivity('Coupon Created', `Created coupon: ${coupon.code}`);
  res.json(snakeToCamelCoupon(data));
});

router.patch('/coupons/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('coupons').update(camelToSnakeCoupon(req.body)).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(snakeToCamelCoupon(data));
});

router.delete('/coupons/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('coupons').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  logActivity('Coupon Deleted', `Deleted coupon ${req.params.id}`);
  res.json({ ok: true });
});

// ── VALIDATE COUPON (public) ──────────────────────────────────────────────
router.post('/public/validate-coupon', async (req, res) => {
  const { code, amount } = req.body;
  const { data: coupon } = await supabase.from('coupons').select('*').eq('code', code?.toUpperCase()).eq('active', true).single();
  if (!coupon)                                     return res.status(404).json({ error: 'Invalid or expired coupon code' });
  if (coupon.used_count >= coupon.usage_limit)     return res.status(400).json({ error: 'Coupon usage limit reached' });
  if (coupon.expiry && new Date(coupon.expiry) < new Date()) return res.status(400).json({ error: 'Coupon has expired' });
  if (amount < coupon.min_purchase)                return res.status(400).json({ error: `Minimum purchase of Rs ${coupon.min_purchase} required` });
  const discount = coupon.type === 'percent' ? Math.floor(amount * coupon.value / 100) : coupon.value;
  res.json({ ok: true, discount, code: coupon.code, type: coupon.type, value: coupon.value });
});

// ── SUBMIT ORDER (public — screenshot/online only; WhatsApp handled client-side) ───
router.post('/public/orders', async (req, res) => {
  const { toolId, toolName, duration, quantity, finalAmount, customerName, customerPhone, customerEmail, paymentMethod, couponCode, note } = req.body;
  if (!toolId || !customerName || !customerPhone || !finalAmount) return res.status(400).json({ error: 'Missing required fields' });

  // Generate a unique sequential invoice number
  const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
  const invoiceNum = 100 + (count || 0);
  const orderId    = `ORD${Date.now()}`;
  const invoiceNo  = `INV-${String(invoiceNum).padStart(4,'0')}`;

  const order = {
    id:              orderId,
    invoice_no:      invoiceNo,
    order_date:      new Date().toISOString().slice(0,10),
    customer_id:     null,
    customer_name:   customerName,
    customer_email:  customerEmail || '',
    customer_phone:  customerPhone,
    whatsapp:        customerPhone,
    tool:            toolName,
    tool_id:         toolId,
    duration:        duration || 1,
    quantity:        quantity || 1,
    amount:          finalAmount,
    discount:        0,
    final_amount:    finalAmount,
    status:          'pending',
    payment_method:  paymentMethod || 'screenshot',
    payment_status:  'pending',
    transaction_id:  '',
    notes:           note || '',
    admin_notes:     '',
    coupon_code:     couponCode || '',
    sub_status:      'pending',
    activation_date: null,
    expiry_date:     null,
    days_left:       0,
    screenshot:      null,
  };

  const { data, error } = await supabase.from('orders').insert(order).select().single();
  if (error) return res.status(500).json({ error: error.message });

  // Notify admin
  const methodLabel = paymentMethod === 'screenshot' ? 'Pay First (SS)' : 'Team Contact';
  await notifyAdminAndOwner({
    title: '💰 New Order',
    message: `${customerName} ordered ${toolName} (${duration} mo) via ${methodLabel} — Rs ${finalAmount}`,
    type: 'order',
    customerPhone: customerPhone || null,
    customerEmail: customerEmail || null,
  });

  logActivity('Order Received', `New order ${orderId} from ${customerName} for ${toolName} via ${paymentMethod}`);
  res.json({ ok: true, orderId, invoiceNo });
});

// ── UPLOAD SCREENSHOT (public) ────────────────────────────────────────────
router.post('/public/orders/:id/screenshot', async (req, res) => {
  const { screenshot } = req.body;
  if (!screenshot) return res.status(400).json({ error: 'Screenshot required' });
  const { data: order, error: fetchErr } = await supabase.from('orders').select('customer_name,tool,customer_id,customer_phone,customer_email').eq('id', req.params.id).single();
  if (fetchErr || !order) return res.status(404).json({ error: 'Order not found' });
  const { error } = await supabase.from('orders').update({ screenshot, payment_status: 'pending' }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  await notifyAdminAndOwner({
    title: 'Payment Screenshot',
    message: `${order.customer_name} uploaded payment proof for ${order.tool}`,
    type: 'payment',
    customerId: order.customer_id || null,
    customerPhone: order.customer_phone || null,
    customerEmail: order.customer_email || null,
  });
  res.json({ ok: true });
});

// ── SUPPORT TICKETS ───────────────────────────────────────────────────────
router.get('/tickets', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/tickets', async (req, res) => {
  const body = req.body || {};
  const ticket = {
    ...body,
    id: body.id || `T${Date.now()}`,
    status: body.status || 'open',
    replies: Array.isArray(body.replies) ? body.replies : [],
    source: body.source || 'portal',
    category: body.category || 'general',
    customer_phone: body.customer_phone || body.customerPhone || '',
    reopen_locked: false,
  };
  let { data, error } = await supabase.from('tickets').insert(ticket).select().single();
  if (error && COLUMN_MISSING.test(error.message || '')) {
    const {
      customer_phone: _p,
      category: _c,
      source: _s,
      reopen_locked: _r,
      ...legacy
    } = ticket as Record<string, unknown>;
    const retry = await supabase.from('tickets').insert(legacy).select().single();
    data = retry.data;
    error = retry.error;
    if (error) {
      return res.status(500).json({
        error: `${error.message} — Run supabase_chatbot_tickets.sql in the Supabase SQL editor, then refresh.`,
      });
    }
  } else if (error) {
    return res.status(500).json({ error: error.message });
  }
  await notifyTicketCreated({
    customer_name: ticket.customer_name || ticket.customerName || '',
    subject: ticket.subject,
    customer_id: ticket.customer_id || null,
    customer_phone: ticket.customer_phone || null,
    source: ticket.source,
    assignee_role: ticket.assignee_role,
    owner_id: ticket.owner_id || null,
  });
  res.json({ ok: true, id: data!.id });
});

router.patch('/tickets/:id', requireAuth, async (req, res) => {
  const patch = { ...(req.body || {}) };
  const nextStatus = typeof patch.status === 'string' ? patch.status.toLowerCase() : null;

  let existing: { status?: string; reopen_locked?: boolean } | null = null;
  let lockColMissing = false;
  {
    const full = await supabase
      .from('tickets')
      .select('status,reopen_locked')
      .eq('id', req.params.id)
      .maybeSingle();
    if (full.error && COLUMN_MISSING.test(full.error.message || '')) {
      lockColMissing = true;
      const slim = await supabase.from('tickets').select('status').eq('id', req.params.id).maybeSingle();
      existing = slim.data;
    } else {
      existing = full.data;
    }
  }

  if (!lockColMissing) {
    if (nextStatus === 'closed' || nextStatus === 'resolved') {
      patch.reopen_locked = true;
    } else if (
      nextStatus &&
      ['open', 'pending', 'unresolved'].includes(nextStatus) &&
      existing &&
      (existing.reopen_locked || ['closed', 'resolved'].includes(String(existing.status || '').toLowerCase()))
    ) {
      // Staff reopen only via authenticated admin/reseller routes.
      patch.reopen_locked = false;
    }
  } else {
    delete patch.reopen_locked;
  }

  const { data, error } = await supabase.from('tickets').update(patch).eq('id', req.params.id).select().single();
  if (error) {
    if (COLUMN_MISSING.test(error.message || '') && patch.reopen_locked !== undefined) {
      const { reopen_locked: _drop, ...statusOnly } = patch;
      const retry = await supabase.from('tickets').update(statusOnly).eq('id', req.params.id).select().single();
      if (retry.error) {
        return res.status(500).json({
          error: `${retry.error.message} — Run supabase_chatbot_tickets.sql in the Supabase SQL editor, then refresh.`,
        });
      }
      return res.json(retry.data);
    }
    return res.status(500).json({
      error: COLUMN_MISSING.test(error.message || '')
        ? `${error.message} — Run supabase_chatbot_tickets.sql in the Supabase SQL editor, then refresh.`
        : error.message,
    });
  }
  res.json(data);
});

router.post('/tickets/:id/reply', requireAuth, async (req, res) => {
  const { data: ticket } = await supabase.from('tickets').select('*').eq('id', req.params.id).single();
  if (!ticket) return res.status(404).json({ error: 'Not found' });

  const status = String(ticket.status || 'open').toLowerCase();
  const locked = Boolean(ticket.reopen_locked) || status === 'closed' || status === 'resolved';
  const from = String(req.body?.from || 'admin');
  if (locked && from === 'customer') {
    return res.status(409).json({
      error: 'This ticket is closed or resolved and cannot be reopened. Please submit a new support ticket.',
    });
  }
  if (locked) {
    return res.status(409).json({
      error: 'This ticket is closed. Reopen it (staff) before replying, or ask the customer to start a new ticket.',
    });
  }

  const reply = {
    from,
    text: req.body.message || req.body.text,
    at: new Date().toISOString(),
    name: req.body.name || (from === 'admin' ? 'Admin' : from),
  };
  const replies = [...(ticket.replies || []), reply];
  const { data, error } = await supabase
    .from('tickets')
    .update({ replies, status: 'open' })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  await notifyTicketReply({
    customer_name: ticket.customer_name || '',
    subject: ticket.subject || '',
    customer_id: ticket.customer_id || null,
    assignee_role: ticket.assignee_role,
    owner_id: ticket.owner_id || null,
  }, from);
  logActivity('Ticket Reply', `Replied to ticket ${req.params.id}`);
  res.json(data);
});

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────
router.get('/notifications', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.patch('/notifications/read-all', requireAuth, async (req, res) => {
  await supabase.from('notifications').update({ read: true }).eq('read', false);
  res.json({ ok: true });
});

router.patch('/notifications/:id/read', requireAuth, async (req, res) => {
  await supabase.from('notifications').update({ read: true }).eq('id', req.params.id);
  res.json({ ok: true });
});

// ── SETTINGS ──────────────────────────────────────────────────────────────
router.get('/settings', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
  if (error || !data) return res.json({});
  res.json(snakeToCamelSettings(data));
});

router.put('/settings', requireAuth, async (req, res) => {
  const { error } = await supabase.from('settings').update(camelToSnakeSettings(req.body)).eq('id', 1);
  if (error) return res.status(500).json({ error: error.message });
  logActivity('Settings Updated', 'Admin updated site settings');
  res.json({ ok: true });
});

// ── ANALYTICS ─────────────────────────────────────────────────────────────
router.get('/analytics', requireAuth, async (req, res) => {
  const { data: orders } = await supabase
    .from('orders')
    .select('status,final_amount,order_date,tool,tool_id,payment_method,quantity,duration')
    .order('created_at', { ascending: false });
  const all      = orders || [];
  const approved = all.filter(o => o.status === 'approved');
  const pending  = all.filter(o => o.status === 'pending');

  // Monthly revenue (approved) + pipeline (pending)
  const months   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthly: Record<string, { revenue: number; orders: number; pending: number }> = {};
  months.forEach(m => { monthly[m] = { revenue: 0, orders: 0, pending: 0 }; });
  approved.forEach(o => {
    const d = new Date(o.order_date);
    if (!isNaN(d.getTime())) {
      const m = months[d.getMonth()];
      monthly[m].revenue += o.final_amount || 0;
      monthly[m].orders  += 1;
    }
  });
  pending.forEach(o => {
    const d = new Date(o.order_date);
    if (!isNaN(d.getTime())) {
      const m = months[d.getMonth()];
      monthly[m].pending += o.final_amount || 0;
    }
  });

  // Tool-level: revenue from approved + total orders (pending+approved) per tool
  const toolStats: Record<string, { revenue: number; sales: number; pending: number }> = {};
  all.forEach(o => {
    if (!toolStats[o.tool]) toolStats[o.tool] = { revenue: 0, sales: 0, pending: 0 };
    if (o.status === 'approved') {
      toolStats[o.tool].revenue += o.final_amount || 0;
      toolStats[o.tool].sales  += 1;
    } else if (o.status === 'pending') {
      toolStats[o.tool].pending += 1;
    }
  });

  // Payment method breakdown (all non-rejected orders)
  const pmCount: Record<string, number> = {};
  all.filter(o => o.status !== 'rejected').forEach(o => {
    const label = o.payment_method === 'screenshot' ? 'Pay First (SS)'
                : o.payment_method === 'online'     ? 'Team Contact'
                : o.payment_method || 'Other';
    pmCount[label] = (pmCount[label] || 0) + 1;
  });

  const totalRevenue  = approved.reduce((s, o) => s + (o.final_amount || 0), 0);
  const pendingRevenue = pending.reduce((s, o) => s + (o.final_amount || 0), 0);

  res.json({
    monthly:         months.map(m => ({ month: m, ...monthly[m] })),
    toolRevenue:     Object.entries(toolStats).map(([name, d]) => ({ name, ...d })),
    paymentMethods:  Object.entries(pmCount).map(([name, value]) => ({ name, value })),
    totalRevenue,
    pendingRevenue,
    totalOrders:     all.length,
    approvedOrders:  approved.length,
    pendingOrders:   pending.length,
    avgOrderValue:   approved.length ? Math.floor(totalRevenue / approved.length) : 0,
  });
});

// ── ACTIVITY LOG ──────────────────────────────────────────────────────────
router.get('/activity', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

export default router;

// ══════════════════════════════════════════════════════════════════════════
//  Field mapping helpers
// ══════════════════════════════════════════════════════════════════════════

function snakeToCamelOrder(o: any) {
  if (!o) return o;
  return {
    id:             o.id,
    invoiceNo:      o.invoice_no,
    orderDate:      o.order_date,
    customerId:     o.customer_id,
    customerName:   o.customer_name,
    customerEmail:  o.customer_email,
    customerPhone:  o.customer_phone,
    customerCity:   o.customer_city,
    whatsapp:       o.whatsapp,
    tool:           o.tool,
    toolId:         o.tool_id,
    duration:       o.duration,
    quantity:       o.quantity,
    amount:         o.amount,
    discount:       o.discount,
    finalAmount:    o.final_amount,
    status:         o.status,
    paymentMethod:  o.payment_method,
    paymentStatus:  o.payment_status,
    transactionId:  o.transaction_id,
    notes:          o.notes,
    adminNotes:     o.admin_notes,
    couponCode:     o.coupon_code,
    subStatus:      o.sub_status,
    activationDate: o.activation_date,
    expiryDate:     o.expiry_date,
    daysLeft:       o.days_left,
    screenshot:     o.screenshot,
    createdAt:      o.created_at,
  };
}

function camelToSnakeOrder(o: any) {
  if (!o) return o;
  const r: any = {};
  if (o.invoiceNo      !== undefined) r.invoice_no      = o.invoiceNo;
  if (o.orderDate      !== undefined) r.order_date      = o.orderDate;
  if (o.customerId     !== undefined) r.customer_id     = o.customerId;
  if (o.customerName   !== undefined) r.customer_name   = o.customerName;
  if (o.customerEmail  !== undefined) r.customer_email  = o.customerEmail;
  if (o.customerPhone  !== undefined) r.customer_phone  = o.customerPhone;
  if (o.customerCity   !== undefined) r.customer_city   = o.customerCity;
  if (o.whatsapp       !== undefined) r.whatsapp        = o.whatsapp;
  if (o.tool           !== undefined) r.tool            = o.tool;
  if (o.toolId         !== undefined) r.tool_id         = o.toolId;
  if (o.duration       !== undefined) r.duration        = o.duration;
  if (o.quantity       !== undefined) r.quantity        = o.quantity;
  if (o.amount         !== undefined) r.amount          = o.amount;
  if (o.discount       !== undefined) r.discount        = o.discount;
  if (o.finalAmount    !== undefined) r.final_amount    = o.finalAmount;
  if (o.status         !== undefined) r.status          = o.status;
  if (o.paymentMethod  !== undefined) r.payment_method  = o.paymentMethod;
  if (o.paymentStatus  !== undefined) r.payment_status  = o.paymentStatus;
  if (o.transactionId  !== undefined) r.transaction_id  = o.transactionId;
  if (o.notes          !== undefined) r.notes           = o.notes;
  if (o.adminNotes     !== undefined) r.admin_notes     = o.adminNotes;
  if (o.couponCode     !== undefined) r.coupon_code     = o.couponCode;
  if (o.subStatus      !== undefined) r.sub_status      = o.subStatus;
  if (o.activationDate !== undefined) r.activation_date = o.activationDate;
  if (o.expiryDate     !== undefined) r.expiry_date     = o.expiryDate;
  if (o.daysLeft       !== undefined) r.days_left       = o.daysLeft;
  if (o.screenshot     !== undefined) r.screenshot      = o.screenshot;
  return r;
}

function snakeToCamelTool(t: any) {
  if (!t) return t;
  let extra: any = {};
  if (t.extra && typeof t.extra === 'object') extra = t.extra;
  else if (typeof t.extra === 'string') {
    try {
      const parsed = JSON.parse(t.extra);
      if (parsed && typeof parsed === 'object') extra = parsed;
    } catch {
      extra = {};
    }
  }
  return {
    id:            t.id,
    name:          t.name,
    category:      t.category,
    rating:        t.rating,
    price:         t.price,
    originalPrice: t.original_price,
    discount:      t.discount,
    favicon:       t.favicon,
    badge:         t.badge,
    desc:          t.desc ?? t.description ?? '',
    fullDesc:      t.full_desc,
    features:      t.features,
    useCases:      t.use_cases,
    faqs:          t.faqs,
    waText:        t.wa_text,
    isPrivate:     t.is_private,
    isSemiPrivate: t.is_semi_private,
    showOnHome:    t.show_on_home === false || t.show_on_home === 0 || extra.showOnHome === false
      ? false
      : true,
    // Prefer extra.* for cookie admin fields: Cookies saves always write into extra, while
    // tool_url / cookies_json columns can stay on an older value when schema dual-write lags.
    accessMethod: (() => {
      const candidates = [
        extra.accessMethod,
        extra.access_method,
        t.access_method,
        t.accessMethod,
      ]
        .map(v => String(v || '').trim().toLowerCase())
        .filter(Boolean);
      if (candidates.some(v => v === 'one_click' || v === 'one-click')) return 'one_click';
      return 'extension';
    })(),
    toolUrl:
      'toolUrl' in extra
        ? String(extra.toolUrl || '')
        : 'tool_url' in extra
          ? String(extra.tool_url || '')
          : String(t.tool_url || ''),
    cookiesJson:
      'cookiesJson' in extra
        ? (extra.cookiesJson ?? '')
        : 'cookies_json' in extra
          ? (extra.cookies_json ?? '')
          : (t.cookies_json ?? ''),
    panelReferrer:
      'panelReferrer' in extra || 'unlockReferrer' in extra || 'panel_referrer' in extra
        ? String(extra.panelReferrer || extra.unlockReferrer || extra.panel_referrer || '')
        : String(t.panel_referrer || ''),
    apkDesktopDefault: Boolean(extra.apkDesktopDefault ?? extra.apk_desktop_default),
  };
}

function camelToSnakeTool(t: any) {
  if (!t) return t;
  const r: any = {};
  if (t.id            !== undefined) r.id            = t.id;
  if (t.name          !== undefined) r.name          = t.name;
  if (t.category      !== undefined) r.category      = t.category;
  if (t.rating        !== undefined) r.rating        = t.rating;
  if (t.price         !== undefined) r.price         = t.price;
  if (t.originalPrice !== undefined) r.original_price = t.originalPrice;
  if (t.discount      !== undefined) r.discount      = t.discount;
  if (t.favicon       !== undefined) r.favicon       = t.favicon;
  if (t.badge         !== undefined) r.badge         = t.badge;
  // Schema column is "desc" (see supabase_schema.sql), not "description".
  if (t.desc          !== undefined) r.desc           = t.desc;
  if (t.description   !== undefined) r.desc           = t.description;
  if (t.fullDesc      !== undefined) r.full_desc     = t.fullDesc;
  if (t.features      !== undefined) r.features      = t.features;
  if (t.useCases      !== undefined) r.use_cases     = t.useCases;
  if (t.faqs          !== undefined) r.faqs          = t.faqs;
  if (t.waText        !== undefined) r.wa_text       = t.waText;
  if (t.isPrivate     !== undefined) r.is_private    = t.isPrivate;
  if (t.isSemiPrivate !== undefined) r.is_semi_private = t.isSemiPrivate;
  if (t.accessMethod  !== undefined) r.access_method = t.accessMethod;
  if (t.toolUrl       !== undefined) r.tool_url      = t.toolUrl;
  if (t.cookiesJson   !== undefined) r.cookies_json  = t.cookiesJson;
  if (t.panelReferrer !== undefined) r.panel_referrer = t.panelReferrer;
  if (t.showOnHome    !== undefined) r.show_on_home  = t.showOnHome !== false;
  return r;
}

function snakeToCamelCustomer(c: any) {
  if (!c) return c;
  return {
    id:          c.id,
    name:        c.name,
    email:       c.email,
    phone:       c.phone,
    country:     c.country,
    city:        c.city,
    totalOrders: c.total_orders,
    totalSpend:  c.total_spend,
    joinDate:    c.join_date,
    status:      c.status,
    tools:       c.tools,
    notes:       c.notes,
  };
}

function camelToSnakeCustomer(c: any) {
  if (!c) return c;
  const r: any = {};
  if (c.name        !== undefined) r.name         = c.name;
  if (c.email       !== undefined) r.email        = c.email;
  if (c.phone       !== undefined) r.phone        = c.phone;
  if (c.country     !== undefined) r.country      = c.country;
  if (c.city        !== undefined) r.city         = c.city;
  if (c.totalOrders !== undefined) r.total_orders = c.totalOrders;
  if (c.totalSpend  !== undefined) r.total_spend  = c.totalSpend;
  if (c.joinDate    !== undefined) r.join_date    = c.joinDate;
  if (c.status      !== undefined) r.status       = c.status;
  if (c.tools       !== undefined) r.tools        = c.tools;
  if (c.notes       !== undefined) r.notes        = c.notes;
  return r;
}

function snakeToCamelCoupon(c: any) {
  if (!c) return c;
  return {
    id:          c.id,
    code:        c.code,
    type:        c.type,
    value:       c.value,
    usageLimit:  c.usage_limit,
    usedCount:   c.used_count,
    expiry:      c.expiry,
    active:      c.active,
    minPurchase: c.min_purchase,
  };
}

function camelToSnakeCoupon(c: any) {
  if (!c) return c;
  const r: any = {};
  if (c.code        !== undefined) r.code         = c.code;
  if (c.type        !== undefined) r.type         = c.type;
  if (c.value       !== undefined) r.value        = c.value;
  if (c.usageLimit  !== undefined) r.usage_limit  = c.usageLimit;
  if (c.usedCount   !== undefined) r.used_count   = c.usedCount;
  if (c.expiry      !== undefined) r.expiry       = c.expiry;
  if (c.active      !== undefined) r.active       = c.active;
  if (c.minPurchase !== undefined) r.min_purchase = c.minPurchase;
  return r;
}

function snakeToCamelSettings(s: any) {
  if (!s) return s;
  return {
    siteName:        s.site_name,
    contactEmail:    s.contact_email,
    whatsapp:        s.whatsapp,
    currency:        s.currency,
    invoicePrefix:   s.invoice_prefix,
    taxPercent:      s.tax_percent,
    maintenanceMode: s.maintenance_mode,
    easypaisa:       s.easypaisa,
    jazzcash:        s.jazzcash,
    paypalEmail:     s.paypal_email,
    bankName:        s.bank_name,
    bankAccount:     s.bank_account,
  };
}

function camelToSnakeSettings(s: any) {
  if (!s) return s;
  const r: any = {};
  if (s.siteName        !== undefined) r.site_name        = s.siteName;
  if (s.contactEmail    !== undefined) r.contact_email    = s.contactEmail;
  if (s.whatsapp        !== undefined) r.whatsapp         = s.whatsapp;
  if (s.currency        !== undefined) r.currency         = s.currency;
  if (s.invoicePrefix   !== undefined) r.invoice_prefix   = s.invoicePrefix;
  if (s.taxPercent      !== undefined) r.tax_percent      = s.taxPercent;
  if (s.maintenanceMode !== undefined) r.maintenance_mode = s.maintenanceMode;
  if (s.easypaisa       !== undefined) r.easypaisa        = s.easypaisa;
  if (s.jazzcash        !== undefined) r.jazzcash         = s.jazzcash;
  if (s.paypalEmail     !== undefined) r.paypal_email     = s.paypalEmail;
  if (s.bankName        !== undefined) r.bank_name        = s.bankName;
  if (s.bankAccount     !== undefined) r.bank_account     = s.bankAccount;
  return r;
}

// ── INVOICE endpoint added after export ──────────────────────────────────
// Note: This is appended; the router export above is still active since
// we register more routes on it here and express uses the same reference.
router.get('/orders/:id/invoice', requireAuth, async (req, res) => {
  const { data: order, error } = await supabase.from('orders').select('*').eq('id', req.params.id).single();
  if (error || !order) return res.status(404).json({ error: 'Order not found' });
  const { data: s } = await supabase.from('settings').select('*').eq('id', 1).single();
  const currency = s?.currency || 'PKR';
  res.json({
    invoiceNo:      order.invoice_no || `INV-${order.id}`,
    orderId:        order.id,
    orderDate:      order.order_date,
    activationDate: order.activation_date,
    expiryDate:     order.expiry_date,
    customer: {
      name:  order.customer_name,
      email: order.customer_email,
      phone: order.customer_phone,
      city:  order.customer_city,
    },
    items: [{ tool: order.tool, duration: order.duration, quantity: order.quantity || 1, price: order.amount, discount: order.discount || 0, total: order.final_amount }],
    couponCode:    order.coupon_code,
    amount:        order.amount,
    discount:      order.discount || 0,
    finalAmount:   order.final_amount,
    currency,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    status:        order.status,
    subStatus:     order.sub_status,
    business: { name: s?.site_name || 'ZynexTools', email: s?.contact_email || 'emaan@aitoolsmart.com', whatsapp: s?.whatsapp || '+923275855578' },
  });
});
