import React, { useMemo, useState } from 'react';
import { Eye, Download, Printer, FileText } from 'lucide-react';
import { RTable, Th, Td, Tr, Pill, RSearch } from '../components/ResellerUI';
import { InvoiceModal } from '../../components/InvoiceModal';
import { invoiceFromResellerMember } from '../../lib/sales';
import { fmtDate, type ResellerPayment } from '../../lib/accountStore';
import type { ResellerMember } from '../types';

interface Props {
  ownerName: string;
  members: ResellerMember[];
  payments: ResellerPayment[];
}

export const InvoicesPage: React.FC<Props> = ({ ownerName, members, payments }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ReturnType<typeof invoiceFromResellerMember> | null>(null);
  const [autoAction, setAutoAction] = useState<'pdf' | 'print' | null>(null);
  const [actionKey, setActionKey] = useState(0);

  const invoices = useMemo(() => {
    const memberById = new Map<string, ResellerMember>(members.map(m => [m.id, m]));
    const rows = payments.map(p => {
        const member: ResellerMember | undefined = memberById.get(p.memberId);
        return invoiceFromResellerMember({
          member: {
            id: member?.id || p.memberId,
            name: member?.name || p.memberName,
            email: member?.email,
            phone: member?.phone,
            status: member?.status,
            join_date: member?.join_date,
            meta: member?.meta || {},
          },
          payment: p,
          issuer: ownerName,
        });
      });
    const billed = new Set(payments.map(p => p.memberId));
    for (const member of members) {
      if ((member.meta.fee || 0) <= 0 || billed.has(member.id)) continue;
      rows.push(invoiceFromResellerMember({ member, issuer: ownerName }));
    }
    return rows.sort((a, b) => String(b.orderDate).localeCompare(String(a.orderDate)));
  }, [members, payments, ownerName]);

  const open = (row: (typeof invoices)[number], action: 'pdf' | 'print' | null = null) => {
    setSelected(row);
    setAutoAction(action);
    setActionKey(k => k + 1);
  };

  const filtered = invoices.filter(o => {
    const q = search.toLowerCase();
    if (!q) return true;
    return [o.customerName, o.invoiceNo, o.tool, o.customerEmail, o.customerPhone].join(' ').toLowerCase().includes(q);
  });

  const paid = invoices.filter(o => o.paymentStatus === 'paid');
  const total = paid.reduce((s, o) => s + (o.finalAmount || 0), 0);
  const btn = 'p-1.5 rounded-xl border bg-[#1a1210] hover:bg-[#231a18] border-[#3a2a26] text-slate-300 hover:text-white transition cursor-pointer';

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-red-900/60 to-red-950/40 border border-red-500/30 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-black text-white">Customer Invoices</h3>
          <p className="text-xs text-red-200/70 mt-0.5">Receipts for your members only · {invoices.length} invoice{invoices.length === 1 ? '' : 's'}</p>
        </div>
        <RSearch value={search} onChange={setSearch} placeholder="Search invoices…" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {([['Total', invoices.length, 'text-white'], ['Paid', paid.length, 'text-emerald-400'], ['Collected', `Rs ${total.toLocaleString()}`, 'text-white']] as const).map(([l, v, c]) => (
          <div key={l} className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-3 text-center">
            <div className={`text-xl font-black ${c}`}>{v}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{l}</div>
          </div>
        ))}
      </div>

      <RTable>
        <thead>
          <tr>
            <Th>Invoice</Th><Th>Customer</Th><Th>Plan</Th><Th>Amount</Th><Th>Date</Th><Th>Status</Th><Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(o => (
            <Tr key={o.id}>
              <Td><span className="font-bold text-white">{o.invoiceNo}</span></Td>
              <Td>
                <div className="text-white">{o.customerName}</div>
                <div className="text-[10px] text-slate-500">{o.customerEmail || o.customerPhone || '—'}</div>
              </Td>
              <Td>{o.tool}{o.duration ? ` · ${o.duration}mo` : ''}</Td>
              <Td><span className="font-bold text-white">Rs {(o.finalAmount || 0).toLocaleString()}</span></Td>
              <Td>{fmtDate(o.orderDate)}</Td>
              <Td><Pill variant={o.paymentStatus === 'paid' ? 'green' : o.paymentStatus === 'pending' ? 'amber' : 'red'}>{o.paymentStatus || 'pending'}</Pill></Td>
              <Td>
                <div className="flex gap-1">
                  <button type="button" title="View" onClick={() => open(o)} className={btn}><Eye className="w-3 h-3" /></button>
                  <button type="button" title="Download PDF" onClick={() => open(o, 'pdf')} className={`${btn} text-blue-300 hover:text-blue-200`}><Download className="w-3 h-3" /></button>
                  <button type="button" title="Print" onClick={() => open(o, 'print')} className={btn}><Printer className="w-3 h-3" /></button>
                </div>
              </Td>
            </Tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={7} className="p-8 text-center text-slate-600 text-sm border-b border-[#1a1210]">
                {invoices.length ? 'No invoices found.' : 'No invoices yet. Assign a plan or renew a member, then generate a receipt from Actions.'}
              </td>
            </tr>
          )}
        </tbody>
      </RTable>

      {!invoices.length && (
        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          You can also open ⋯ Actions on My Members and pick Invoice.
        </p>
      )}

      {selected && (
        <InvoiceModal
          key={`${selected.id}-${actionKey}`}
          order={selected}
          autoAction={autoAction}
          onClose={() => { setSelected(null); setAutoAction(null); }}
        />
      )}
    </div>
  );
};
