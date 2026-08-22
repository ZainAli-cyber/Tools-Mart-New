// Shared account types and display helpers.
// Account state lives in Supabase; this module deliberately stores nothing in
// localStorage and never handles passwords.

export type AccountRole = 'user' | 'reseller' | 'admin';

export type AccountMeta = {
  role: AccountRole;
  plan: string;
  fee: number;
  days: number;
  expiry: string;
  /** Customer id of the reseller that created this member. */
  owner?: string;
};

export type PlanOption = { name: string; fee: number; days: number };

export const PLAN_OPTIONS: PlanOption[] = [
  { name: 'Monthly Plan', fee: 2000, days: 30 },
  { name: '3 Month Plan', fee: 5000, days: 90 },
  { name: '6 Month Plan', fee: 9000, days: 180 },
  { name: 'Lite Reseller', fee: 5560, days: 30 },
  { name: 'Guru Reseller', fee: 8340, days: 30 },
  { name: 'Pro Reseller', fee: 30580, days: 180 },
];

/** Plans a reseller may sell to their own members. */
export const MEMBER_PLAN_OPTIONS: PlanOption[] = PLAN_OPTIONS.filter(
  p => !p.name.toLowerCase().includes('reseller'),
);

export const BLANK_META: AccountMeta = { role: 'user', plan: '', fee: 0, days: 0, expiry: '' };

/** Convert a database customer row to the UI's compact account shape. */
export function accountMetaFromRow(row: any): AccountMeta {
  if (!row) return { ...BLANK_META };
  const rawRole = row.role;
  const role: AccountRole =
    rawRole === 'admin' || rawRole === 'reseller' ? rawRole : 'user';
  return {
    role,
    plan: row.plan || '',
    fee: Number(row.fee || 0),
    days: Number(row.plan_days ?? row.days ?? 0),
    expiry: row.expiry || '',
    owner: row.owner_id || row.owner || undefined,
  };
}

// ── Date helpers ───────────────────────────────────────────────────────────
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) d.setTime(Date.now());
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysLeft(expiry: string): number {
  if (!expiry) return -1;
  const raw = String(expiry).trim();
  const dateOnly = raw.slice(0, 10);
  const match = dateOnly.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const end = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59, 999)
    : new Date(raw);
  if (isNaN(end.getTime())) return -1;
  return Math.ceil((end.getTime() - Date.now()) / 86400000);
}

/** Paid plan that has not passed its expiry date. Empty plan = unpaid. */
export function planIsActive(plan?: string | null, expiry?: string | null): boolean {
  if (!String(plan || '').trim()) return false;
  if (!expiry) return true;
  return daysLeft(String(expiry)) >= 0;
}

export function fmtDate(d?: string): string {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
}

export function shortId(id?: string): string {
  if (!id) return '—';
  return id.length > 8 ? id.slice(-6) : id;
}

/** Digits-only WhatsApp link for a phone number. */
export function waLink(phone: string, text?: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  const normalized = digits.startsWith('0') ? '92' + digits.slice(1) : digits;
  return `https://wa.me/${normalized}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

// ── Reseller payment records ───────────────────────────────────────────────
export type ResellerPayment = {
  id: string;
  owner: string;
  memberId: string;
  memberName: string;
  amount: number;
  method: string;
  reference: string;
  status: 'paid' | 'pending' | 'failed';
  date: string;
};

export function paymentFromRow(row: any): ResellerPayment {
  return {
    id: row.id,
    owner: row.owner_id,
    memberId: row.member_id,
    memberName: row.member_name || '',
    amount: Number(row.amount || 0),
    method: row.method || '',
    reference: row.reference || '',
    status: row.status || 'pending',
    date: row.payment_date || row.date || '',
  };
}
