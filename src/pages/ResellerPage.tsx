import React from 'react';
import { CheckCircle2, MessageCircle, TrendingUp, Users, BarChart2, PlayCircle, Zap, ShieldCheck, Clock } from 'lucide-react';

const WA_JOIN = 'https://wa.me/923275855578?text=Hi%20ZynexTools%2C%20I%20want%20to%20join%20the%20Reseller%20Program%20(%2420).';

export const ResellerPage: React.FC = () => {
  const plans = [
    {
      name: 'Lite Reseller',
      price: 'Rs 5,560',
      period: '1 Month',
      badge: null,
      features: ['Unlimited User Add', '100+ Tools in Panel', 'High Profit Margin', 'Video Guide Provided', 'Premium Support', '1 IP Allowed'],
      waText: 'Hi ZynexTools, I want to join the Lite Reseller plan.',
    },
    {
      name: 'Guru Reseller',
      price: 'Rs 8,340',
      period: '1 Month',
      badge: 'Popular',
      features: ['Unlimited User Add', '100+ Tools in Panel', 'High Profit Margin', 'Video Guide Provided', 'VIP Support', '2 IPs Allowed'],
      waText: 'Hi ZynexTools, I want to join the Guru Reseller plan.',
    },
    {
      name: 'Pro Reseller',
      price: 'Rs 30,580',
      period: '6 Months',
      badge: 'Best Value',
      features: ['Unlimited User Add', '100+ Tools in Panel', 'High Profit Margin', 'Video Guide Provided', 'VIP Support', '3 IPs Allowed', 'No Limitations'],
      waText: 'Hi ZynexTools, I want to join the Pro Reseller plan.',
    },
  ];

  const benefits = [
    { icon: <TrendingUp className="w-5 h-5" />, title: 'High Profit Margin', desc: '1 Lakh+ earning potential per month with the right hustle.' },
    { icon: <Zap className="w-5 h-5" />, title: '80+ Tools in One Place', desc: 'Give your clients access to every tool from one panel.' },
    { icon: <Users className="w-5 h-5" />, title: 'Unlimited User Access', desc: 'Add as many users as you like — no seat limits, ever.' },
    { icon: <BarChart2 className="w-5 h-5" />, title: 'Sales Dashboard', desc: 'Track your sales, users and revenue in real-time.' },
    { icon: <PlayCircle className="w-5 h-5" />, title: 'Step-by-Step Video Guide', desc: 'Onboarding videos walk you through every feature.' },
    { icon: <Clock className="w-5 h-5" />, title: 'Instant Activation', desc: 'Get set up in minutes and start selling the same day.' },
    { icon: <ShieldCheck className="w-5 h-5" />, title: 'Secure & Reliable', desc: 'Uptime you can count on and safe delivery for every user.' },
    { icon: <MessageCircle className="w-5 h-5" />, title: '24/7 Premium Support', desc: 'Priority WhatsApp support for you and your customers.' },
  ];

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden pt-14 pb-16 px-4 sm:px-6 lg:px-8 border-b border-red-900/20 text-center" style={{ background: 'var(--hero-bg)' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 bg-red-600/10 blur-3xl pointer-events-none rounded-full" />
        <div className="relative max-w-3xl mx-auto space-y-5">
          <span className="text-xs font-bold uppercase tracking-widest text-red-500">For Resellers</span>
          <h1 className="text-3xl sm:text-5xl font-black text-white">🌟 ZynexTools Reseller Program</h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto">
            Partner with us and start reselling 80+ premium digital tools at unbeatable prices. Your time to grow and earn 1 Lakh+/month.
          </p>
          <div className="inline-flex flex-col items-center bg-slate-900 rounded-2xl px-8 py-5 gap-2">
            <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">One-time Setup</span>
            <span className="text-4xl font-black text-white">$20</span>
            <span className="text-sm text-slate-400">reseller panel</span>
            <p className="text-xs text-slate-400 max-w-xs text-center mt-1">
              Powerful admin panel for designers, marketers, editors and students. Access every essential tool in one place and resell to your clients.
            </p>
            <a
              href={WA_JOIN}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl transition flex items-center gap-2 shadow-lg shadow-red-900/30"
            >
              <MessageCircle className="w-4 h-4" /> Join the Program
            </a>
          </div>
        </div>
      </section>

      {/* Who is this for */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center space-y-5 border-b border-slate-800">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Who is this for?</span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Your all-in-one solution for every profession</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {['🎨 Designers', '🎥 Video Editors', '📖 Students', '📊 SEO Experts', '💼 Agency Owners'].map((l) => (
            <span key={l} className="text-sm bg-slate-900 border border-slate-700 text-slate-300 px-4 py-2 rounded-full font-semibold">{l}</span>
          ))}
        </div>
      </section>

      {/* Reseller Plans */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-red-500">💎 Reseller Pricing</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Choose your reseller plan</h2>
          <p className="text-sm text-slate-400">Pick a plan that fits your business. All plans include admin panel, unlimited users and 80+ premium tools.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-6 flex flex-col gap-5 border ${
                plan.badge === 'Popular'
                  ? 'theme-dark-surface bg-gradient-to-b from-red-600/10 to-slate-900 border-red-500/40 shadow-2xl shadow-red-900/20'
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
                <p className="text-xs text-slate-400 mt-0.5">/ {plan.period}</p>
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
                href={`https://wa.me/923275855578?text=${encodeURIComponent(plan.waText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-3 rounded-xl text-sm font-black text-center transition block ${
                  plan.badge === 'Popular'
                    ? 'bg-red-600 hover:bg-red-700 text-white border border-transparent'
                    : 'btn-secondary-red'
                }`}
              >
                Get Started
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="border-y border-red-900/20 py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-red-500">🚀 What You Get</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Reseller Benefits</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {benefits.map((b) => (
              <div key={b.title} className="glow-card rounded-2xl p-5 space-y-3 transition">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
                  {b.icon}
                </div>
                <h3 className="text-sm font-bold text-white">{b.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8 text-center">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">✅ How to Get Started</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">3 simple steps to activation</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { n: '01', title: 'Select Payment', desc: 'Choose your preferred payment method.' },
            { n: '02', title: 'Send Screenshot', desc: 'After payment, send us the screenshot on WhatsApp.' },
            { n: '03', title: 'Get Access', desc: 'Admin panel access is emailed to you after verification.' },
          ].map((s) => (
            <div key={s.n} className="glow-card rounded-3xl p-6 space-y-3">
              <div className="text-4xl font-black text-red-500">{s.n}</div>
              <h3 className="text-base font-extrabold text-white">{s.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
        <a
          href={WA_JOIN}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl transition shadow-lg shadow-red-900/30"
        >
          <MessageCircle className="w-4 h-4" /> Start Reselling Today
        </a>
      </section>
    </div>
  );
};
