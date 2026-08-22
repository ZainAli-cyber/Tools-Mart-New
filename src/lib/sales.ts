import { daysLeft } from './accountStore';

export type SaleRow = {
  id: string;
  date: string;
  name: string;
  label: string;
  amount: number;
  status: string;
  method: string;
  source: 'shop' | 'direct' | 'reseller';
  customerId?: string;
  expiry?: string;
  daysLeft?: number;
  subStatus?: string;
  planDays?: number;
};

export type LiveSubscription = {
  expiry: string;
  daysLeft: number;
  subStatus: string;
  plan: string;
  fee: number;
  planDays: number;
  accountStatus: string;
};

function num(value: any) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function expiryStamp(value: string): number {
  const raw = String(value || '').trim();
  if (!raw) return NaN;
  const dateOnly = raw.slice(0, 10);
  const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime();
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : NaN;
}

/** Prefer the later of live account expiry vs a stored order snapshot. */
export function preferLiveExpiry(live: string, snapshot = ''): string {
  const a = String(live || '').trim();
  const b = String(snapshot || '').trim();
  if (!a) return b;
  if (!b) return a;
  const at = expiryStamp(a);
  const bt = expiryStamp(b);
  if (!Number.isFinite(at)) return b;
  if (!Number.isFinite(bt) || at >= bt) return a;
  return b;
}

export function findCustomer(
  customers: any[] | undefined,
  hints: { id?: string; email?: string; code?: string },
): any | null {
  const list = customers || [];
  const id = String(hints.id || '').trim();
  const code = String(hints.code || '').trim();
  const email = String(hints.email || '').trim().toLowerCase();
  if (id) {
    const hit = list.find(c => String(c.id) === id || String(c.customer_code || '') === id);
    if (hit) return hit;
  }
  if (code) {
    const hit = list.find(c => String(c.customer_code || '') === code);
    if (hit) return hit;
  }
  if (email) {
    const hit = list.find(c => String(c.email || '').trim().toLowerCase() === email);
    if (hit) return hit;
  }
  return null;
}

/**
 * Live subscription fields from the customer row (same source as Accounts).
 * Never infers expiry from join_date + plan length.
 */
export function liveSubscription(
  account: any | null | undefined,
  snapshotExpiry = '',
  snapshotDays?: number,
): LiveSubscription {
  const liveExpiry = String(account?.expiry || '').trim();
  const expiry = preferLiveExpiry(liveExpiry, snapshotExpiry);
  const left = expiry ? daysLeft(expiry) : -1;
  const accountStatus = String(account?.status || '').toLowerCase();
  let subStatus = 'active';
  if (accountStatus === 'blocked') subStatus = 'suspended';
  else if (expiry && left < 0) subStatus = 'expired';
  else if (accountStatus === 'active' || !accountStatus) subStatus = 'active';
  else subStatus = accountStatus;

  const days = expiry
    ? left
    : (snapshotDays !== undefined && Number.isFinite(Number(snapshotDays)) && !liveExpiry
      ? num(snapshotDays)
      : left);

  return {
    expiry,
    daysLeft: days,
    subStatus,
    plan: String(account?.plan || ''),
    fee: num(account?.fee),
    planDays: num(account?.plan_days ?? account?.days),
    accountStatus,
  };
}

export function accountForSale(
  row: SaleRow,
  customersById: Map<string, any>,
  extras?: { payment?: any; shop?: any; customers?: any[] },
): any | null {
  if (row.customerId && customersById.get(row.customerId)) return customersById.get(row.customerId);
  if (row.source === 'direct') {
    const id = String(row.id).replace(/^acct-/, '');
    if (customersById.get(id)) return customersById.get(id);
  }
  const payment = extras?.payment;
  if (payment?.member_id && customersById.get(payment.member_id)) return customersById.get(payment.member_id);
  const shop = extras?.shop;
  if (shop?.customer_id && customersById.get(shop.customer_id)) return customersById.get(shop.customer_id);
  const list = extras?.customers || [...customersById.values()];
  return findCustomer(list, {
    id: payment?.member_id || shop?.customer_id || shop?.customerId,
    email: payment?.member_email || shop?.customer_email || shop?.customerEmail,
  });
}

/** Shop checkouts + admin plan sales + reseller member payments. */
export function collectSales(input: {
  orders?: any[];
  customers?: any[];
  payments?: any[];
}): SaleRow[] {
  const rows: SaleRow[] = [];
  const customers = input.customers || [];

  for (const order of input.orders || []) {
    const account = findCustomer(customers, {
      id: order.customer_id || order.customerId,
      email: order.customer_email || order.customerEmail,
    });
    const snapExpiry = order.expiry_date || order.expiryDate || '';
    const sub = liveSubscription(account, snapExpiry, order.days_left ?? order.daysLeft);
    rows.push({
      id: order.id,
      date: order.order_date || order.created_at || '',
      name: order.customer_name || order.customerName || 'Customer',
      label: order.tool || 'Shop order',
      amount: num(order.final_amount ?? order.finalAmount),
      status: order.status || 'pending',
      method: order.payment_method || order.paymentMethod || 'shop',
      source: 'shop',
      customerId: account?.id || order.customer_id || undefined,
      expiry: sub.expiry,
      daysLeft: sub.daysLeft,
      subStatus: sub.subStatus,
      planDays: sub.planDays,
    });
  }

  for (const account of customers) {
    const role = String(account.role || 'user').toLowerCase();
    if (role === 'admin') continue;
    if (account.owner_id) continue;
    const fee = num(account.fee);
    if (fee <= 0) continue;
    const sub = liveSubscription(account);
    rows.push({
      id: `acct-${account.id}`,
      date: account.join_date || account.created_at || '',
      name: account.name || 'Account',
      label: account.plan || (role === 'reseller' ? 'Seller plan' : 'Customer plan'),
      amount: fee,
      status: 'approved',
      method: 'account',
      source: 'direct',
      customerId: account.id,
      expiry: sub.expiry,
      daysLeft: sub.daysLeft,
      subStatus: sub.subStatus,
      planDays: sub.planDays,
    });
  }

  for (const payment of input.payments || []) {
    if (payment.status && payment.status !== 'paid') continue;
    const account = findCustomer(customers, {
      id: payment.member_id || payment.memberId,
      email: payment.member_email || payment.memberEmail,
    });
    const sub = liveSubscription(account);
    rows.push({
      id: payment.id,
      date: payment.payment_date || payment.created_at || '',
      name: payment.member_name || payment.memberName || account?.name || 'Member',
      label: 'Reseller sale',
      amount: num(payment.amount),
      status: 'approved',
      method: payment.method || 'reseller',
      source: 'reseller',
      customerId: account?.id || payment.member_id || undefined,
      expiry: sub.expiry,
      daysLeft: sub.daysLeft,
      subStatus: sub.subStatus,
      planDays: sub.planDays,
    });
  }

  return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function isApprovedSale(row: SaleRow) {
  return row.status === 'approved' || row.status === 'paid' || row.status === 'active';
}

/** Stable INV- number for shop orders (existing invoice_no) and synthetic sales. */
export function invoiceNumberFor(row: SaleRow, shopInvoiceNo?: string) {
  const existing = String(shopInvoiceNo || '').trim();
  if (existing) return existing;
  const date = String(row.date || '').slice(0, 10).replace(/-/g, '');
  const raw = String(row.id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const idPart = (raw.slice(-8) || 'SALE').padStart(4, '0');
  const tag = row.source === 'direct' ? 'A' : row.source === 'reseller' ? 'R' : 'S';
  return `INV-${tag}${date || '00000000'}-${idPart}`;
}

export function invoiceDateOnly(value: string) {
  return String(value || '').slice(0, 10);
}

export function invoiceMonthsFromDays(days: number) {
  if (!days || days <= 0) return 0;
  return Math.max(1, Math.round(days / 30));
}

export type ResellerInvoiceInput = {
  member: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    status?: string;
    join_date?: string;
    meta: { plan?: string; fee?: number; days?: number; expiry?: string };
  };
  payment?: {
    id: string;
    memberId?: string;
    amount: number;
    method?: string;
    status?: string;
    date?: string;
    reference?: string;
  } | null;
  issuer?: string;
};

/** Receipt fields for a reseller's own member (plan fee or a logged payment). */
export function invoiceFromResellerMember(input: ResellerInvoiceInput) {
  const { member, payment, issuer } = input;
  const fee = payment ? num(payment.amount) : num(member.meta.fee);
  const date = payment?.date || member.join_date || '';
  const sale: SaleRow = {
    id: payment?.id || `acct-${member.id}`,
    date,
    name: member.name,
    label: member.meta.plan || payment?.method || 'Plan sale',
    amount: fee,
    status: !payment || payment.status === 'paid' ? 'approved' : (payment.status || 'pending'),
    method: payment?.method || 'account',
    source: 'reseller',
    customerId: member.id,
    expiry: member.meta.expiry,
    daysLeft: member.meta.expiry ? daysLeft(member.meta.expiry) : undefined,
    planDays: num(member.meta.days),
  };
  const sub = liveSubscription({
    expiry: member.meta.expiry,
    status: member.status,
    plan: member.meta.plan,
    fee: member.meta.fee,
    plan_days: member.meta.days,
  });
  const paid = payment ? payment.status === 'paid' : fee > 0;

  return {
    id: sale.id,
    invoiceNo: invoiceNumberFor(sale),
    orderDate: invoiceDateOnly(date),
    customerName: member.name,
    customerEmail: member.email || '',
    customerPhone: member.phone || '',
    customerCity: '',
    tool: sub.plan || sale.label,
    duration: invoiceMonthsFromDays(sub.planDays),
    amount: fee,
    discount: 0,
    finalAmount: fee,
    paymentMethod: payment?.method || 'Plan fee',
    paymentStatus: paid ? 'paid' : (payment?.status || 'pending'),
    transactionId: payment?.id || payment?.reference || '',
    notes: issuer ? `Issued by ${issuer}` : '',
    subStatus: sub.subStatus || (paid ? 'active' : 'pending'),
    activationDate: invoiceDateOnly(date),
    expiryDate: sub.expiry,
    source: 'reseller' as const,
    issuer: issuer || '',
  };
}
