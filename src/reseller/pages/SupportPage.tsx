import React from 'react';
import { Headphones, MessageCircle } from 'lucide-react';
import { TicketsInbox, type TicketAccount } from '../../components/TicketsInbox';
import { openSupportChat } from '../../lib/supportChat';
import { isMobileApp } from '../../lib/mobile/toolLauncher';

export const SupportPage: React.FC<{
  account: TicketAccount;
  adminWaLink: string;
  adminWhatsapp: string;
}> = ({ account, adminWaLink, adminWhatsapp }) => {
  const mobile = isMobileApp();

  if (mobile) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openSupportChat()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-xs font-black text-white cursor-pointer"
          >
            <Headphones className="h-4 w-4" /> Live chat
          </button>
          <a
            href={adminWaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-600/10 px-3 py-2.5 text-xs font-black text-emerald-300"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        </div>
        <TicketsInbox mode="mine" account={account} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/60 to-[#130d0d] p-5">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-red-600/10 blur-3xl" />
        <div className="relative">
          <h2 className="text-xl font-black text-white">We&apos;re here to help</h2>
          <p className="mt-1 max-w-lg text-xs leading-5 text-slate-400">
            Chat with our team, create a support ticket, or message us on WhatsApp.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openSupportChat()}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black text-white cursor-pointer"
            >
              <Headphones className="h-4 w-4" /> Live chat
            </button>
            <a
              href={adminWaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-600/10 px-4 py-2.5 text-xs font-black text-emerald-300"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp ({adminWhatsapp.replace('+92', '0')})
            </a>
          </div>
        </div>
      </div>
      <TicketsInbox mode="mine" account={account} />
    </div>
  );
};
