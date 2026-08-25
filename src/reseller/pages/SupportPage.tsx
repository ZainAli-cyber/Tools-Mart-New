import React from 'react';
import { Headphones, MessageCircle, Plus, ShieldCheck } from 'lucide-react';
import { TicketsInbox, type TicketAccount } from '../../components/TicketsInbox';
import { openSupportChat } from '../../lib/supportChat';
import { isMobileApp } from '../../lib/mobile/toolLauncher';

export const SupportPage: React.FC<{
  account: TicketAccount;
  adminWaLink: string;
  adminWhatsapp: string;
}> = ({ account, adminWaLink, adminWhatsapp }) => (
  <div className="space-y-5">
    <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/60 to-[#130d0d] p-5">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-600/10 blur-3xl" />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-600/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-red-300">
          <ShieldCheck className="h-3 w-3" /> Support
        </span>
        <h2 className="mt-3 text-xl font-black text-white">We&apos;re here to help</h2>
        <p className="mt-1 max-w-lg text-xs leading-5 text-slate-400">
          Chat with our team, create a support ticket, or message us on WhatsApp. Replies appear in your ticket inbox.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openSupportChat()}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-red-900/30 transition hover:bg-red-500 cursor-pointer"
          >
            <Headphones className="h-4 w-4" /> Live chat
          </button>
          <a
            href={adminWaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-600/10 px-4 py-2.5 text-xs font-black text-emerald-300 transition hover:bg-emerald-600/20"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        </div>
        <p className="mt-2 text-[10px] text-slate-600">
          WhatsApp: {adminWhatsapp.replace('+92', '0')}
        </p>
      </div>
    </div>

    {isMobileApp() && (
      <div className="rounded-2xl border border-[#2a1e1c] bg-[#130d0d] p-4">
        <p className="text-xs font-bold text-white">Quick tip</p>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          Tap <strong className="text-red-400">Chat</strong> in the bottom bar anytime, or use Live chat above to open
          the assistant and create a ticket in a few taps.
        </p>
      </div>
    )}

    <section className="rounded-2xl border border-[#2a1e1c] bg-[#130d0d] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#2a1e1c] px-4 py-3">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-red-400" />
          <h3 className="text-sm font-black text-white">My support tickets</h3>
        </div>
      </div>
      <div className="p-3 sm:p-4">
        <TicketsInbox mode="mine" account={account} />
      </div>
    </section>
  </div>
);
