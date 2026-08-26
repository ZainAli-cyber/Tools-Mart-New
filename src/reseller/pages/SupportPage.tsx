import React from 'react';
import { MessageCircle } from 'lucide-react';
import { TicketsInbox, type TicketAccount } from '../../components/TicketsInbox';
import { isMobileApp } from '../../lib/mobile/toolLauncher';

/** Support = ticket list (+ WhatsApp). Live chat is web-only. */
export const SupportPage: React.FC<{
  account: TicketAccount;
  adminWaLink: string;
  adminWhatsapp: string;
}> = ({ account, adminWaLink, adminWhatsapp }) => {
  const mobile = isMobileApp();

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 ${mobile ? '' : 'flex-wrap'}`}>
        {!mobile && (
          <a
            href={adminWaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-600/10 px-3 py-2.5 text-xs font-black text-emerald-300"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp ({adminWhatsapp.replace('+92', '0')})
          </a>
        )}
        {mobile && (
          <a
            href={adminWaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-600/10 px-3 py-2.5 text-xs font-black text-emerald-300"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp support
          </a>
        )}
      </div>
      <TicketsInbox mode="mine" account={account} />
    </div>
  );
};
