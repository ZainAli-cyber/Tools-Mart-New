import React from 'react';
import { MessageCircle } from 'lucide-react';
import { RTable, Th, Td, Tr, Pill } from '../components/ResellerUI';
import { fmtDate, waLink, type ResellerPayment } from '../../lib/accountStore';
import type { ResellerMember } from '../types';

interface Props {
  payments: ResellerPayment[];
  members: ResellerMember[];
}

export const PaymentsPage: React.FC<Props> = ({ payments, members }) => {
  const phoneOf = (memberId: string) => members.find(m => m.id === memberId)?.phone || '';

  return (
    <div className="space-y-3">
      <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl px-4 py-3">
        <h3 className="text-sm font-extrabold text-white">Payment History</h3>
      </div>

      <RTable>
        <thead>
          <tr>
            <Th>Member</Th><Th>Amount (PKR)</Th><Th>Method</Th>
            <Th>Reference</Th><Th>Status</Th><Th>Date</Th><Th>WhatsApp</Th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => {
            const phone = phoneOf(p.memberId);
            return (
              <Tr key={p.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-red-600/30 flex items-center justify-center text-xs font-black text-red-300">
                      {(p.memberName || '?')[0]?.toUpperCase()}
                    </div>
                    <span className="font-semibold text-white">{p.memberName}</span>
                  </div>
                </Td>
                <Td><span className="text-emerald-400 font-bold">Rs. {Number(p.amount || 0).toLocaleString()}</span></Td>
                <Td><span className="text-[11px]">{p.method}</span></Td>
                <Td><span className="text-[11px] font-mono text-slate-400">{p.reference}</span></Td>
                <Td><Pill variant={p.status === 'paid' ? 'green' : p.status === 'pending' ? 'amber' : 'red'}>{p.status}</Pill></Td>
                <Td><span className="text-[11px]">{fmtDate(p.date)}</span></Td>
                <Td>
                  {phone
                    ? <a href={waLink(phone, `Hi ${p.memberName}, regarding payment ${p.reference}.`)} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-bold transition">
                        <MessageCircle className="w-3 h-3" /> Chat
                      </a>
                    : <span className="text-slate-600 text-[11px]">No phone</span>}
                </Td>
              </Tr>
            );
          })}
          {payments.length === 0 && (
            <tr><td colSpan={7} className="p-8 text-center text-slate-600 text-sm border-b border-[#1a1210]">No payments yet.</td></tr>
          )}
        </tbody>
      </RTable>

      {payments.length > 0 && (
        <div className="flex justify-end">
          <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl px-4 py-2.5 text-xs">
            <span className="text-slate-400">Total collected: </span>
            <span className="text-emerald-400 font-black">
              Rs. {payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
