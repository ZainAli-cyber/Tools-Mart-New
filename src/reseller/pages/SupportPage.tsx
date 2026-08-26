import React from 'react';
import { Headphones, MessageCircle } from 'lucide-react';
import { TicketsInbox, type TicketAccount } from '../../components/TicketsInbox';
import { openSupportChat } from '../../lib/supportChat';
import { isMobileApp } from '../../lib/mobile/toolLauncher';

/** Single Support screen: ticket list + Live chat (no duplicate Tickets tab). */
export const SupportPage: React.FC<{
  account: TicketAccount;
  adminWaLink: string;
  adminWhatsapp: string;
}> = ({ account, adminWaLink, adminWhatsapp }) => {
  const mobile = isMobileApp();

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-2 ${mobile ? '' : 'flex-wrap'}`}>
        <button
          type="button"
          onClick={() => openSupportChat()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-3 py-2.5 text-xs font-black text-white cursor-pointer hover:bg-red-500"
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
          {!mobile && ` (${adminWhatsapp.replace('+92', '0')})`}
        </a>
      </div>
      <TicketsInbox mode="mine" account={account} />
    </div>
  );
};
