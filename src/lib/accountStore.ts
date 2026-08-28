// Shared account types and display helpers.
// Account state lives in Supabase; this module deliberately stores nothing in
// localStorage and never handles passwords.

import {
  addDays as addDaysSafe,
  daysLeft as daysLeftSafe,
  extendPlanExpiry,
  planDaysFromOrderMonths,
  planDaysFromPlanName,
  planExpiryDate,
  planIsActive as planIsActiveSafe,
  todayDateOnly,
} from './planDuration';

export {
  extendPlanExpiry,
  planDaysFromOrderMonths,
  planDaysFromPlanName,
  planExpiryDate,
  todayDateOnly,
} from './planDuration';

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

export type PlanOption = import('./planCatalog').PlanOption;
export { PLAN_OPTIONS, MEMBER_PLAN_OPTIONS } from './planCatalog';

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
  return todayDateOnly();
}

export function addDays(dateStr: string, days: number): string {
  return addDaysSafe(dateStr, days);
}

export function daysLeft(expiry: string): number {
  return daysLeftSafe(expiry);
}

/** Paid plan that has not passed its expiry date. Empty plan = unpaid. */
export function planIsActive(plan?: string | null, expiry?: string | null): boolean {
  return planIsActiveSafe(plan, expiry);
}

export function fmtDate(d?: string): string {
  if (!d) return '—';
  const dt = parseDateOnlyForDisplay(d);
  if (!dt) return d;
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
}

function parseDateOnlyForDisplay(value: string): Date | null {
  const match = String(value || '').trim().slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    const dt = new Date(value);
    return isNaN(dt.getTime()) ? null : dt;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
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
