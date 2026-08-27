import React from 'react';
import { Sparkles, CheckCircle2, Lock, Globe, MessageCircle, Mail } from 'lucide-react';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-sm">
      {/* Value Highlights */}
      <div className="border-b border-slate-800 bg-[var(--bg-card-alt)] py-8 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-center sm:text-left">
          {[
            { icon: <Sparkles className="w-5 h-5" />, color: 'bg-red-500/10 text-red-500 border-red-500/20', title: '100% Free Forever', sub: 'No hidden fees or subscriptions' },
            { icon: <CheckCircle2 className="w-5 h-5" />, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', title: 'High Accuracy AI', sub: 'Powered by Google Gemini AI' },
            { icon: <Lock className="w-5 h-5" />, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', title: 'Privacy Protected', sub: 'We never store your text or files' },
            { icon: <Globe className="w-5 h-5" />, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', title: '80+ Working SEO Tools', sub: 'All tools tested & operational' },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3 justify-center sm:justify-start">
              <div className={`p-2.5 rounded-xl border ${item.color}`}>{item.icon}</div>
              <div>
                <h4 className="text-white font-bold text-sm">{item.title}</h4>
                <p className="text-xs text-slate-400">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="space-y-4">
          <button onClick={() => onNavigate('/')} className="cursor-pointer text-left">
            <img
              src="/logo.png"
              alt="ZynexTools"
              className="h-24 w-auto object-contain"
            />
          </button>
          <p className="text-xs text-slate-400 leading-relaxed">
            100+ premium SEO, AI and marketing tools in one affordable group buy. Trusted by 10,000+ clients worldwide. Instant activation & 24/7 support.
          </p>
          <div className="pt-2 text-xs text-slate-500 space-y-1">
            <p className="text-[11px] text-slate-500 mt-1">© {new Date().getFullYear()} All rights reserved.</p>
          </div>
        </div>

        {/* Product */}
        <div className="space-y-3">
          <h4 className="text-white font-bold text-sm uppercase tracking-wider">Product</h4>
          <ul className="space-y-2 text-xs">
            {[
              { label: 'All Tools', path: '/tools' },
              { label: 'Pricing Plans', path: '/plans' },
              { label: 'Reseller Program', path: '/resellers-portal' },
              { label: 'FAQs', path: '/faq' },
            ].map((l) => (
              <li key={l.path}>
                <button onClick={() => onNavigate(l.path)} className="hover:text-red-400 transition cursor-pointer text-slate-400 text-left">{l.label}</button>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div className="space-y-3">
          <h4 className="text-white font-bold text-sm uppercase tracking-wider">Company</h4>
          <ul className="space-y-2 text-xs">
            {[
              { label: 'About Us', path: '/about' },
              { label: 'Contact', path: '/contact' },
              { label: 'Blog', path: '/blog' },
              { label: 'Terms & Conditions', path: '/terms-of-service' },
              { label: 'Privacy Policy', path: '/privacy-policy' },
            ].map((l) => (
              <li key={l.path}>
                <button onClick={() => onNavigate(l.path)} className="hover:text-red-400 transition cursor-pointer text-slate-400 text-left">{l.label}</button>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div className="space-y-3">
          <h4 className="text-white font-bold text-sm uppercase tracking-wider">Get in touch</h4>
          <ul className="space-y-3 text-xs">
            <li>
              <a href="https://wa.me/923275855578" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition">
                <MessageCircle className="w-4 h-4 text-emerald-500" /> WhatsApp: +92 327 5855578
              </a>
            </li>
            <li>
              <a href="mailto:support@zynextools.com" className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition">
                <Mail className="w-4 h-4 text-red-500" /> support@zynextools.com
              </a>
            </li>
            <li>
              <button onClick={() => onNavigate('/contact')} className="hover:text-red-400 transition cursor-pointer text-slate-400">Contact page</button>
            </li>
          </ul>
        </div>
      </div>

      {/* ── Our Brands ── */}
      <div className="border-t border-red-900/20 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-4">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-500">Our Brands</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            <img src="/brand1.png" alt="Motu Patlu Tools" className="h-16 w-auto object-contain opacity-90 hover:opacity-100 transition rounded-2xl" />
            <img src="/brand2.png" alt="AI Toolz Hub" className="h-16 w-auto object-contain opacity-90 hover:opacity-100 transition rounded-2xl" />
            <img src="/brand3.png" alt="Prime AI Toolz" className="h-16 w-auto object-contain opacity-90 hover:opacity-100 transition rounded-2xl" />
          </div>
        </div>
      </div>

      <div className="border-t border-red-900/20 py-4 px-4 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} ZynexTools. Powered By Sales Bouncer
      </div>
    </footer>
  );
};
