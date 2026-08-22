import React, { useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { X } from 'lucide-react';
import { PeriodPills } from './PeriodPills';
import { inPeriod, moneyTick, periodFrom, trendKey, trendPoints, type PeriodKey } from '../lib/period';
import { fmtDate, shortId } from '../lib/accountStore';

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1210] border border-[#3a2a26] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => <p key={i} style={{ color: p.color }} className="font-bold">{p.name}: {p.value}</p>)}
    </div>
  );
};

export function sellerTrendData(period: PeriodKey, members: any[], payments: any[]) {
  const from = periodFrom(period);
  const points = trendPoints(period);
  payments.forEach(p => {
    const status = p.status || 'paid';
    if (status !== 'paid') return;
    const date = p.payment_date || p.date || p.created_at;
    if (!inPeriod(date, from)) return;
    const point = points.find(item => item.key === trendKey(date, period));
    if (point) {
      point.revenue += Number(p.amount || 0);
      point.orders += 1;
    }
  });
  members.forEach(m => {
    const date = m.join_date || m.created_at;
    if (!inPeriod(date, from)) return;
    const point = points.find(item => item.key === trendKey(date, period));
    if (point) point.customers += 1;
  });
  return points;
}

export const SellerTrendPanel: React.FC<{
  seller: any;
  members: any[];
  payments: any[];
  onClose: () => void;
}> = ({ seller, members, payments, onClose }) => {
  const [period, setPeriod] = useState<PeriodKey>('month');
  const trend = sellerTrendData(period, members, payments);
  const from = periodFrom(period);
  const sales = payments.filter(p => (p.status || 'paid') === 'paid' && inPeriod(p.payment_date || p.date || p.created_at, from));
  const revenue = sales.reduce((s, p) => s + Number(p.amount || 0), 0);
  const newCustomers = members.filter(m => inPeriod(m.join_date || m.created_at, from)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-4xl bg-[#130d0d] border border-[#3a2a26] rounded-3xl shadow-2xl my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 p-5 border-b border-[#2a1e1c]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-purple-600/30 flex items-center justify-center text-sm font-black text-purple-200 shrink-0">
              {seller.avatar
                ? <img src={seller.avatar} alt="" className="w-full h-full object-cover" />
                : (seller.name || '?')[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-white truncate">{seller.name} — Revenue trend</h3>
              <p className="text-[11px] text-slate-500">ID {seller.customer_code || shortId(seller.id)} · {members.length} customers · Joined {fmtDate(seller.join_date || seller.created_at)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#1a1210] rounded-xl text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <PeriodPills value={period} onChange={setPeriod} />
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Revenue', `Rs ${revenue.toLocaleString()}`],
              ['Sales', sales.length],
              ['New customers', newCustomers],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-[#0d0908] border border-[#2a1e1c] rounded-2xl p-3">
                <div className="text-lg font-black text-white">{value}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-[#0d0908] border border-[#2a1e1c] rounded-2xl p-4">
              <h4 className="text-xs font-extrabold text-white mb-3">Revenue generated</h4>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={trend}>
                  <defs><linearGradient id="st-rev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#cc1a1a" stopOpacity={0.4}/><stop offset="95%" stopColor="#cc1a1a" stopOpacity={0}/></linearGradient></defs>
                  <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={moneyTick} width={32} />
                  <Tooltip content={<Tip />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#cc1a1a" fill="url(#st-rev)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-[#0d0908] border border-[#2a1e1c] rounded-2xl p-4">
              <h4 className="text-xs font-extrabold text-white mb-3">Sales</h4>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={trend}>
                  <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="orders" name="Sales" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-[#0d0908] border border-[#2a1e1c] rounded-2xl p-4">
              <h4 className="text-xs font-extrabold text-white mb-3">Customers</h4>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={trend}>
                  <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} width={24} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="customers" name="Customers" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
