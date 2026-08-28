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
