import React from 'react';
import { CheckCircle2, ArrowRight, MessageCircle, Star } from 'lucide-react';
import { GROUP_BUY_TOOLS } from '../data/groupBuyTools';

interface PlansPageProps {
  onNavigate: (path: string) => void;
}

const WA_BASE = 'https://wa.me/923275855578';

export const PlansPage: React.FC<PlansPageProps> = ({ onNavigate }) => {
  const plans = [
    {
      name: 'Basic',
      price: 'Rs 1,390',
      period: 'mo',
      count: '42+ Tools Included',
      badge: null,
      features: [
        'Canva Pro + Envato Elements',
        'QuillBot + Grammarly + Wordtune',
        'Jasper + Trump Rewrite AI',
        'Netflix + Prime Video + Duolingo Super',
        'SEO Site Checkup + SEO Optimer',
        '37+ more premium tools',
      ],
      cta: 'Purchase Now',
      ctaHref: 'https://app.aitoolzmart.com/signup',
      highlight: false,
    },
    {
      name: 'Standard',
      price: 'Rs 1,946',
      period: 'mo',
      count: '60+ Tools Included',
      badge: 'Popular',
      features: [
        'Everything in Basic',
        'Semrush + Ubersuggest',
        'Jasper + HIX AI + Writeless',
        'LinkedIn Learning + Skillshare',
        'VidToons + Toons AI + DesignBeast',
        '18+ additional premium tools',
      ],
      cta: 'Purchase Now',
      ctaHref: 'https://app.aitoolzmart.com/signup',
      highlight: false,
    },
    {
      name: 'Premium',
      price: 'Rs 2,780',
      period: 'mo',
      count: '80+ Tools Included',
      badge: 'Most Popular',
      features: [
        'All 80+ premium tools',
        'Semrush + Helium 10 + SpyFu',
        'Perplexity AI + Jasper + HIX AI',
        'Coursera + LinkedIn Learning + Skillshare',
        'Netflix + Prime Video + Epidemic Sound',
        'Priority 24/7 VIP support',
      ],
      cta: 'Purchase Now',
      ctaHref: 'https://app.aitoolzmart.com/signup',
      highlight: true,
    },
    {
      name: 'Custom',
      price: 'Rs 1,112',
      period: 'mo',
      count: 'Choose any 5 tools',
      badge: 'Build Your Own',
      features: [
        'Pick any 5 premium tools',
        'Perfect for niche use-cases',
        '5-min instant activation',
        '24/7 WhatsApp support',
        'Upgrade anytime',
      ],
      cta: 'Choose Your Tools',
      ctaHref: `${WA_BASE}?text=${encodeURIComponent('Hi AI TOOLZ MART, I want to build a custom plan.')}`,
      highlight: false,
    },
  ];

  const resellerPlans = [
    {
      name: 'Lite Reseller',
      price: 'Rs 5,560',
      period: '1 Month',
      badge: null,
      features: ['Unlimited User Add', '100+ Tools in Panel', 'High Profit Margin', 'Video Guide Provided', 'Premium Support', '1 IP Allowed'],
      href: 'https://app.aitoolzmart.com/signup',
    },
    {
      name: 'Guru Reseller',
      price: 'Rs 8,340',
      period: '1 Month',
      badge: 'Popular',
      features: ['Unlimited User Add', '100+ Tools in Panel', 'High Profit Margin', 'Video Guide Provided', 'VIP Support', '2 IPs Allowed'],
      href: 'https://app.aitoolzmart.com/signup',
    },
    {
      name: 'Pro Reseller',
      price: 'Rs 30,580',
      period: '6 Months',
      badge: 'Best Value',
      features: ['Unlimited User Add', '100+ Tools in Panel', 'High Profit Margin', 'Video Guide Provided', 'VIP Support', '3 IPs Allowed', 'No Limitations'],
      href: 'https://app.aitoolzmart.com/signup',
    },
  ];

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden pt-14 pb-16 px-4 sm:px-6 lg:px-8 border-b border-red-900/20 text-center" style={{ background: 'var(--hero-bg)' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-red-600/10 blur-3xl pointer-events-none rounded-full" />
        <div className="relative max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-red-500">Simple Pricing</span>
          <h1 className="text-3xl sm:text-5xl font-black text-white">Choose Your Plan</h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Access premium tools without paying premium prices. Every plan includes instant activation and 24/7 support.
          </p>
        </div>
      </section>

      {/* Main Plans */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-6 flex flex-col gap-5 border ${
                plan.highlight
                  ? 'theme-dark-surface bg-gradient-to-b from-red-600/10 to-slate-900 border-red-500/40 shadow-2xl shadow-red-900/20'
                  : 'glow-card'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-wider ${plan.highlight ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                    {plan.badge}
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-lg font-extrabold text-white">{plan.name}</h3>
                <div className="flex items-end gap-1 mt-1">
                  <span className="text-2xl font-black text-white">{plan.price}</span>
                  <span className="text-xs text-slate-400 mb-1">/{plan.period}</span>
                </div>
                <p className="text-xs text-red-400 font-bold mt-1">{plan.count}</p>
              </div>
              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={plan.ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-3 rounded-xl text-sm font-black text-center transition block ${
                  plan.highlight
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/30 border border-transparent'
                    : 'btn-secondary-red'
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Single Tools */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6 border-t border-slate-800">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-red-500">Single Tools</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Buy Individual Tools</h2>
          <p className="text-sm text-slate-400">Only need one tool? Grab any of our premium tools individually.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {GROUP_BUY_TOOLS.slice(0, 8).map((tool) => (
            <a
              key={tool.id}
              href={`${WA_BASE}?text=${encodeURIComponent(`Hi AI TOOLZ MART, I want to buy ${tool.name}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glow-card rounded-2xl p-4 flex flex-col items-center gap-2 text-center transition group"
            >
              <img src={tool.favicon} alt={tool.name} className="w-10 h-10 rounded-xl border border-slate-700 bg-white p-0.5" />
              <span className="text-[10px] text-slate-500 font-semibold">{tool.category}</span>
              <span className="text-xs font-bold text-white group-hover:text-red-400 transition">{tool.name}</span>
              <span className="text-xs font-black text-emerald-400">Rs 556</span>
            </a>
          ))}
        </div>
      </section>

      {/* Reseller Plans */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8 border-t border-slate-800">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-red-500">Reseller Plans</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Become a Reseller</h2>
          <p className="text-sm text-slate-400">Resell 100+ premium tools to your own clients and keep the profits.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {resellerPlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-6 flex flex-col gap-5 border ${
                plan.badge === 'Popular'
                  ? 'theme-dark-surface bg-gradient-to-b from-red-600/10 to-slate-900 border-red-500/40 shadow-xl shadow-red-900/20'
                  : plan.badge === 'Best Value'
                  ? 'theme-dark-surface bg-gradient-to-b from-amber-600/10 to-slate-900 border-amber-500/30'
                  : 'glow-card'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                    plan.badge === 'Popular' ? 'bg-red-600 text-white' : 'bg-red-600 text-white'
                  }`}>
                    {plan.badge}
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-lg font-extrabold text-white">{plan.name}</h3>
                <div className="flex items-end gap-1 mt-1">
                  <span className="text-2xl font-black text-white">{plan.price}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{plan.period}</p>
              </div>
              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={plan.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl text-sm font-black text-center transition block btn-secondary-red"
              >
                Buy Now
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* All plans include */}
      <section className="max-w-3xl mx-auto px-4 py-10 space-y-6 text-center border-t border-slate-800">
        <h3 className="text-lg font-extrabold text-white">All plans include</h3>
        <div className="flex flex-wrap justify-center gap-4">
          {['Instant activation within minutes', '24/7 WhatsApp support', 'Money-back guarantee'].map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {f}
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-400">
          Looking for a reseller plan?{' '}
          <button onClick={() => onNavigate('/resellers-portal')} className="text-red-400 hover:text-red-300 font-bold transition cursor-pointer">
            Check out the $20 Reseller Program →
          </button>
        </p>
      </section>
    </div>
  );
};
