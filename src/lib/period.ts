export type PeriodKey = '7d' | '30d' | 'month' | 'year' | 'all';

export const PERIOD_OPTIONS: { id: PeriodKey; label: string }[] = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
  { id: 'all', label: 'All time' },
];

/** Date-only values stay on the calendar day; timestamps use local time. */
export function parseStamp(value: string | undefined | null): Date | null {
  if (!value) return null;
  const raw = String(value).trim();
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const date = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    return isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(raw);
  return isNaN(date.getTime()) ? null : date;
}

export function localYmd(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function periodFrom(key: PeriodKey): Date | null {
  if (key === 'all') return null;
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  if (key === '7d') from.setDate(from.getDate() - 6);
  if (key === '30d') from.setDate(from.getDate() - 29);
  if (key === 'month') from.setDate(1);
  if (key === 'year') { from.setMonth(0, 1); }
  return from;
}

export function inPeriod(value: string | undefined | null, from: Date | null): boolean {
  if (!from) return true;
  const date = parseStamp(value);
  if (!date) return false;
  date.setHours(0, 0, 0, 0);
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  return date.getTime() >= start.getTime();
}

export type TrendPoint = { label: string; key: string; revenue: number; orders: number; customers: number };

export function trendPoints(key: PeriodKey): TrendPoint[] {
  const blank = { revenue: 0, orders: 0, customers: 0 };
  if (key === '7d' || key === '30d' || key === 'month') {
    const days = key === '7d' ? 7 : key === '30d' ? 30 : new Date().getDate();
    return Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (days - 1 - index));
      return {
        key: localYmd(date),
        label: `${date.getDate()}/${date.getMonth() + 1}`,
        ...blank,
      };
    });
  }
  const count = 12;
  const cursor = new Date();
  cursor.setDate(1);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(cursor.getFullYear(), cursor.getMonth() - (count - 1 - index), 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleString('en', { month: 'short' }),
      ...blank,
    };
  });
}

export function trendKey(value: string | undefined | null, period: PeriodKey): string | null {
  const date = parseStamp(value);
  if (!date) return null;
  if (period === '7d' || period === '30d' || period === 'month') return localYmd(date);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function moneyTick(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return String(value);
}
