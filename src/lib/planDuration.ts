import { PLAN_OPTIONS } from './planCatalog';

export function parseDateOnly(value: string): Date | null {
  const match = String(value || '').trim().slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function formatDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayDateOnly(): string {
  return formatDateOnly(new Date());
}

/** Add whole calendar days to a YYYY-MM-DD date (timezone-safe). */
export function addDays(dateStr: string, days: number): string {
  const n = Math.max(0, Math.floor(Number(days) || 0));
  const d = parseDateOnly(dateStr) || new Date();
  d.setDate(d.getDate() + n);
  return formatDateOnly(d);
}

/**
 * Last valid day for a new plan (inclusive).
 * Example: 30-day plan starting 2026-08-28 expires on 2026-09-26.
 */
export function planExpiryDate(startDate: string, planDays: number): string {
  const days = Math.max(1, Math.floor(Number(planDays) || 0));
  return addDays(startDate, days - 1);
}

/** Extend from the current inclusive expiry by another plan length. */
export function extendPlanExpiry(currentExpiry: string, planDays: number): string {
  const days = Math.max(1, Math.floor(Number(planDays) || 0));
  const base = String(currentExpiry || '').trim().slice(0, 10) || todayDateOnly();
  return addDays(base, days);
}

/** Whole calendar days remaining until expiry (0 on last valid day). */
export function daysLeft(expiry: string, now = new Date()): number {
  if (!expiry) return -1;
  const end = parseDateOnly(expiry);
  if (!end) return -1;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endDay.getTime() - today.getTime()) / 86400000);
}

export function planIsActive(plan?: string | null, expiry?: string | null, now = new Date()): boolean {
  if (!String(plan || '').trim()) return false;
  if (!expiry) return true;
  return daysLeft(String(expiry), now) >= 0;
}

/** Website checkout stores duration in months (1, 3, 6, 12). */
export function planDaysFromOrderMonths(months: number): number {
  const m = Math.max(1, Math.floor(Number(months) || 0));
  return m * 30;
}

export function planDaysFromPlanName(planName: string): number {
  const want = String(planName || '').trim().toLowerCase();
  const hit = PLAN_OPTIONS.find(p => p.name.toLowerCase() === want);
  return hit?.days || 30;
}

export function resolvePlanDays(input: { planDays?: number; planName?: string; orderMonths?: number }): number {
  if (input.planDays && input.planDays > 0) return Math.floor(input.planDays);
  if (input.planName) {
    const fromName = planDaysFromPlanName(input.planName);
    if (fromName > 0) return fromName;
  }
  if (input.orderMonths) return planDaysFromOrderMonths(input.orderMonths);
  return 30;
}
