import React, { useState } from 'react';
import { MessageCircle, ArrowRight } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { RTable, Th, Td, Tr, Pill, StatTile } from '../components/ResellerUI';
import { fmtDate, daysLeft, waLink, type ResellerPayment } from '../../lib/accountStore';
import { PeriodPills } from '../../components/PeriodPills';
import { inPeriod, moneyTick, periodFrom, trendKey, trendPoints, type PeriodKey } from '../../lib/period';
import type { ResellerMember } from '../types';

interface Props {
  members: ResellerMember[];
  payments: ResellerPayment[];
  adminWhatsapp: string;
  adminWaLink: string;
  onManageAll: () => void;
}

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1210] border border-[#3a2a26] rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => <p key={i} style={{ color: p.color }} className="font-bold">{p.name}: {p.value}</p>)}
    </div>
  );
};

export const OverviewPage: React.FC<Props> = ({
  members, payments, adminWhatsapp, adminWaLink, onManageAll,
}) => {
  const [period, setPeriod] = useState<PeriodKey>('month');
  const from = periodFrom(period);
  const paid = payments.filter(p => p.status === 'paid' && inPeriod(p.date, from));
  const totalRevenue = paid.reduce((s, p) => s + (p.amount || 0), 0);
  const newMembers = members.filter(m => inPeriod(m.join_date, from));
  const active = members.filter(m => m.status !== 'blocked' && daysLeft(m.meta.expiry) >= 0);
  const expiringSoon = members.filter(m => {
    const d = daysLeft(m.meta.expiry);
    return m.meta.expiry !== '' && d >= 0 && d <= 7;
  });
  const expired = members.filter(m => m.meta.expiry !== '' && daysLeft(m.meta.expiry) < 0);
  const trend = trendPoints(period);
  paid.forEach(p => {
    const point = trend.find(item => item.key === trendKey(p.date, period));
    if (point) { point.revenue += p.amount || 0; point.orders += 1; }
  });
  newMembers.forEach(m => {
    const point = trend.find(item => item.key === trendKey(m.join_date, period));
    if (point) point.customers += 1;
  });

  return (
    <div className="space-y-5">
      <PeriodPills value={period} onChange={setPeriod} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile tone="red"   label="Revenue (PKR)" value={`Rs. ${totalRevenue.toLocaleString()}`} sub={`${paid.length} payments in period`} />
        <StatTile tone="blue"  label="New Customers" value={newMembers.length} sub={`${members.length} total members`} />
        <StatTile tone="amber" label="Expiring Soon (7d)" value={expiringSoon.length} sub="Needs renewal" />
        <StatTile tone="rose"  label="Expired" value={expired.length} sub={`${active.length} active now`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5">
          <h3 className="text-sm font-extrabold text-white mb-4">Revenue generated</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trend}>
              <defs><linearGradient id="rr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#cc1a1a" stopOpacity={0.4}/><stop offset="95%" stopColor="#cc1a1a" stopOpacity={0}/></linearGradient></defs>
              <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={moneyTick} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#cc1a1a" fill="url(#rr)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5">
          <h3 className="text-sm font-extrabold text-white mb-4">Sales</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trend}>
              <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="orders" name="Sales" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5">
          <h3 className="text-sm font-extrabold text-white mb-4">Customers</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trend}>
              <XAxis dataKey="label" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="customers" name="Customers" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gradient-to-r from-emerald-900/25 to-[#130d0d] border border-emerald-500/25 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-extrabold text-white">Administrator WhatsApp</h3>
            <p className="text-xs text-slate-400 mt-0.5">This contact is controlled centrally by the platform administrator</p>
            <a href={adminWaLink} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition">
              Contact Admin <ArrowRight className="w-3 h-3" />
            </a>
          </div>
          <div className="hidden sm:block text-right">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Number</div>
            <div className="text-sm font-bold text-emerald-400">{adminWhatsapp}</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between bg-[#130d0d] border border-[#2a1e1c] rounded-2xl px-4 py-3">
          <h3 className="text-sm font-extrabold text-white">Members Status</h3>
          <button onClick={onManageAll} className="text-xs font-bold text-red-400 hover:text-red-300 transition cursor-pointer flex items-center gap-1">
            Manage All <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <RTable>
          <thead>
            <tr>
              <Th>Member</Th><Th>Plan</Th><Th>Fee (PKR)</Th><Th>Joined</Th>
              <Th>Expiry</Th><Th>Status</Th><Th>WhatsApp</Th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => {
              const left = daysLeft(m.meta.expiry);
              return (
                <Tr key={m.id}>
                  <Td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-red-600/30 flex items-center justify-center text-xs font-black text-red-300">
                        {m.avatar
                          ? <img src={m.avatar} alt="" className="w-full h-full object-cover" />
                          : (m.name || '?')[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{m.name}</div>
                        <div className="text-[10px] text-slate-500">{m.email || '—'}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>{m.meta.plan
                    ? <span className="text-red-400 font-bold text-[11px] uppercase">{m.meta.plan}</span>
                    : <span className="text-slate-600">No plan</span>}
                  </Td>
                  <Td><span className="text-emerald-400 font-bold">Rs. {Number(m.meta.fee || 0).toLocaleString()}</span></Td>
                  <Td><span className="text-[11px]">{fmtDate(m.join_date)}</span></Td>
                  <Td>
                    {m.meta.expiry ? (
                      <div className="space-y-1">
                        <div className="text-[11px] text-white">{fmtDate(m.meta.expiry)}</div>
                        {left >= 0
                          ? <Pill variant={left <= 7 ? 'amber' : 'green'}>{left}d left</Pill>
                          : <Pill variant="red">Expired</Pill>}
                      </div>
                    ) : <span className="text-slate-600 text-[11px]">— No expiry</span>}
                  </Td>
                  <Td><Pill variant={m.status === 'blocked' ? 'amber' : 'green'}>{m.status === 'blocked' ? 'Suspended' : 'Active'}</Pill></Td>
                  <Td>
                    {m.phone
                      ? <a href={waLink(m.phone, `Hi ${m.name}, regarding your ZynexTools subscription.`)} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-bold transition">
                          <MessageCircle className="w-3 h-3" /> Chat
                        </a>
                      : <span className="text-slate-600 text-[11px]">No phone</span>}
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </RTable>

        {members.length === 0 && (
          <div className="text-center py-10 text-slate-600 text-sm bg-[#130d0d] border border-[#2a1e1c] rounded-2xl">
            No members yet — add your first member from “My Members”.
          </div>
        )}
      </div>
    </div>
  );
};
