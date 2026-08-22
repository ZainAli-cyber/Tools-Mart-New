import React from 'react';
import { PlayCircle, MessageCircle } from 'lucide-react';

const TUTORIALS = [
  { title: 'Getting Started', desc: 'Set up your account and understand the dashboard layout.' },
  { title: 'Accessing Your Tools', desc: 'How to open a tool you are subscribed to and log in safely.' },
  { title: 'Subscriptions & Renewals', desc: 'Check your expiry date and renew before your plan lapses.' },
  { title: 'Adding Your Own Members', desc: 'For resellers — create members and assign plans and tools.' },
  { title: 'Tracking Payments', desc: 'For resellers — read the payment history and reconcile revenue.' },
  { title: 'Getting Support', desc: 'Reach the administrator on WhatsApp for any account issue.' },
];

export const TutorialsPage: React.FC<{ adminWaLink: string }> = ({ adminWaLink }) => (
  <div className="space-y-5">
    <div className="bg-gradient-to-r from-red-900/40 to-[#130d0d] border border-red-500/25 rounded-2xl p-5">
      <h3 className="text-base font-black text-white">Tutorials</h3>
      <p className="text-xs text-slate-400 mt-0.5">Step-by-step guides for using your panel and tools</p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {TUTORIALS.map(t => (
        <div key={t.title} className="bg-[#130d0d] border border-[#2a1e1c] hover:border-[#3a2a26] rounded-2xl p-4 space-y-3 transition">
          <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
            <PlayCircle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">{t.title}</div>
            <p className="text-[11px] text-slate-500 mt-1">{t.desc}</p>
          </div>
          <a href={adminWaLink} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#1a1210] hover:bg-[#231a18] border border-[#2a1e1c] text-slate-300 hover:text-white rounded-xl text-xs font-bold transition">
            <MessageCircle className="w-3 h-3" /> Request Guide
          </a>
        </div>
      ))}
    </div>

    <p className="text-center text-xs text-slate-600">
      Video walkthroughs are shared by the administrator on WhatsApp.
    </p>
  </div>
);
