import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Zap, MessageCircle } from 'lucide-react';

const WA_BASE = 'https://wa.me/923275855578';

/** Light-on-dark tokens — never rely on Tailwind text-* (light theme remaps them). */
const T = {
  title: '#f5f0ed',
  body: '#efe8e3',
  muted: '#ddd4ce',
  faint: '#c9bfb8',
  accent: '#f87171',
  badge: '#ff8a8a',
} as const;

export const PromoPopup: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const handleClaim = () => {
    const msg = encodeURIComponent('Hi ZynexTools! I want to claim the Premium Plan at 30% OFF. Coupon: PREMIUM30');
    window.open(`${WA_BASE}?text=${msg}`, '_blank');
    setVisible(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm" onClick={() => setVisible(false)} />

      {/* Modal */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center px-4 pointer-events-none">
        <div
          className="theme-dark-surface relative w-full max-w-sm pointer-events-auto rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #1e0a0a 0%, #230d0d 40%, #1a0808 100%)',
            border: '1px solid rgba(204,26,26,0.5)',
            boxShadow: '0 0 80px rgba(180,20,0,0.40), inset 0 0 40px rgba(140,10,0,0.12)',
            color: T.title,
          }}
        >
          {/* Inner gradient glows — same as glow-card */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 0% 0%, rgba(220,40,20,0.28) 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(160,20,0,0.14) 0%, transparent 50%)',
          }} />

          {/* Gradient border shimmer top */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(220,40,20,0.8) 50%, transparent 100%)',
          }} />

          {/* Close */}
          <button onClick={() => setVisible(false)}
            className="absolute top-3.5 right-3.5 z-10 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition"
            style={{ background: 'rgba(204,26,26,0.15)', border: '1px solid rgba(204,26,26,0.3)', color: 'rgba(255,255,255,0.75)' }}>
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="relative z-10 p-7 space-y-5">
            {/* Badge */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest"
                style={{ background: 'rgba(204,26,26,0.20)', border: '1px solid rgba(204,26,26,0.50)', color: T.badge }}>
                <Zap className="w-3 h-3 fill-current" />
                Limited Time Offer
              </div>
            </div>

            {/* Headline */}
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black leading-tight" style={{ color: T.title }}>
                Get <span style={{ color: T.accent }}>Premium Plan</span> at
              </h2>
              <p className="text-4xl font-black" style={{ color: T.title }}>30% OFF</p>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: T.muted }}>
                80+ premium SEO, AI, Design & Learning tools in one plan.
              </p>
            </div>

            {/* Pricing card */}
            <div className="rounded-2xl p-4 space-y-3" style={{
              background: 'linear-gradient(135deg, #1a0808 0%, #200b0b 100%)',
              border: '1px solid rgba(204,26,26,0.30)',
            }}>
              <div className="flex items-baseline gap-3">
                <span className="line-through text-base" style={{ color: T.faint }}>Rs 2,780</span>
                <span className="text-3xl font-black" style={{ color: '#ef4444' }}>Rs 1,946</span>
                <span className="text-sm" style={{ color: T.muted }}>/mo</span>
              </div>
              <div className="space-y-2">
                {['80+ premium tools','Semrush + Canva Pro + Jasper AI','Instant 5-min activation','24/7 VIP WhatsApp support'].map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs" style={{ color: T.body }}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#ef4444' }} />
                    {f}
                  </div>
                ))}
              </div>
              <div className="pt-1 text-center">
                <span className="text-xs uppercase tracking-widest" style={{ color: T.faint }}>Use code </span>
                <span className="text-xs font-extrabold tracking-widest uppercase px-2 py-0.5 rounded"
                  style={{ color: T.badge, background: 'rgba(204,26,26,0.15)', border: '1px solid rgba(204,26,26,0.35)' }}>
                  PREMIUM30
                </span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex gap-3">
              <button onClick={handleClaim}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm cursor-pointer transition hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #cc1a1a 0%, #a31414 100%)', boxShadow: '0 4px 24px rgba(180,20,0,0.40)', color: '#ffffff' }}>
                <MessageCircle className="w-4 h-4" />
                Claim Premium Offer
              </button>
              <button onClick={() => setVisible(false)}
                className="px-4 py-3.5 rounded-xl font-bold text-sm cursor-pointer transition"
                style={{ background: 'rgba(204,26,26,0.12)', border: '1px solid rgba(204,26,26,0.35)', color: T.body }}>
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
