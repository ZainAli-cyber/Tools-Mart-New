import type { SupabaseClient } from '@supabase/supabase-js';
import {
  daysLeft,
  extendPlanExpiry,
  planDaysFromOrderMonths,
  planExpiryDate,
  resolvePlanDays,
  todayDateOnly,
} from './planDuration';

type OrderRow = {
  id?: string;
  customer_id?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_name?: string | null;
  tool?: string | null;
  duration?: number | null;
  final_amount?: number | null;
  activation_date?: string | null;
  expiry_date?: string | null;
};

function mergeTools(existing: unknown, toolName: string): string[] {
  const list = Array.isArray(existing) ? existing.map(String) : [];
  if (!toolName || list.includes(toolName)) return list;
  return [...list, toolName];
}

async function findCustomer(sb: SupabaseClient, order: OrderRow) {
  if (order.customer_id) {
    const { data } = await sb.from('customers').select('*').eq('id', order.customer_id).maybeSingle();
    if (data) return data;
  }
  const email = String(order.customer_email || '').trim().toLowerCase();
  if (email) {
    const { data } = await sb.from('customers').select('*').ilike('email', email).maybeSingle();
    if (data) return data;
  }
  const phone = String(order.customer_phone || '').trim();
  if (phone) {
    const { data } = await sb.from('customers').select('*').eq('phone', phone).maybeSingle();
    if (data) return data;
  }
  return null;
}

export function buildApprovedOrderDates(order: OrderRow, patch: Record<string, unknown> = {}) {
  const activationDate = String(
    patch.activation_date || patch.activationDate || order.activation_date || todayDateOnly(),
  ).slice(0, 10);
  const planDays = resolvePlanDays({
    planDays: Number(patch.plan_days ?? patch.planDays) || undefined,
    planName: String(patch.plan || order.tool || ''),
    orderMonths: Number(patch.duration ?? order.duration) || 1,
  });
  const expiryDate = String(
    patch.expiry_date || patch.expiryDate || planExpiryDate(activationDate, planDays),
  ).slice(0, 10);

  return {
    activationDate,
    planDays,
    expiryDate,
    daysLeft: daysLeft(expiryDate),
  };
}

/** Apply plan + tool access to the linked customer when a shop order is approved. */
export async function activateCustomerForApprovedOrder(
  sb: SupabaseClient,
  order: OrderRow,
  patch: Record<string, unknown> = {},
) {
  const dates = buildApprovedOrderDates(order, patch);
  const customer = await findCustomer(sb, order);
  if (!customer) {
    return { ...dates, customerId: null as string | null, customerUpdated: false };
  }

  const toolName = String(order.tool || '').trim();
  const planName = String(customer.plan || toolName || 'Monthly Plan').trim() || 'Monthly Plan';
  const stillActive = customer.expiry && daysLeft(String(customer.expiry)) >= 0 && String(customer.plan || '').trim();
  const expiry = stillActive
    ? extendPlanExpiry(String(customer.expiry), dates.planDays)
    : dates.expiryDate;

  const { error } = await sb
    .from('customers')
    .update({
      plan: toolName || planName,
      plan_days: dates.planDays,
      expiry,
      fee: Number(order.final_amount ?? customer.fee ?? 0) || Number(customer.fee || 0),
      status: 'active',
      tools: mergeTools(customer.tools, toolName),
    })
    .eq('id', customer.id);

  if (error) throw new Error(error.message);

  return {
    ...dates,
    expiryDate: expiry,
    daysLeft: daysLeft(expiry),
    customerId: String(customer.id),
    customerUpdated: true,
  };
}

export function orderMonthsToPlanDays(months: number) {
  return planDaysFromOrderMonths(months);
}
