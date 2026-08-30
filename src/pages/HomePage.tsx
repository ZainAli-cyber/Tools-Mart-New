import React, { useState, useEffect, useRef } from 'react';
import {
  Zap, ShieldCheck, Globe, ArrowRight, CheckCircle2, Star, RefreshCw,
  MessageCircle, ChevronDown, ChevronUp, Lock, TrendingUp,
} from 'lucide-react';
import { HERO_TICKER_TOOLS } from '../data/groupBuyTools';
import { loadTools } from '../data/toolStore';
import { nameToId, type Tool } from '../admin/data/adminStore';
import { loadCatalogTools } from '../lib/toolCookies';
import { getPublicBannersApi } from '../lib/settingsApi';
import { BANNERS_UPDATED_EVENT } from '../lib/bannerSettings';

/* ── Banner Slider ── */
const BannerSection: React.FC = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);

  const load = () => {
    void getPublicBannersApi()
      .then(data => {
        const list = Array.isArray(data.banners) ? data.banners.filter((b: any) => b.active !== false) : [];
        setBanners(list);
        setIdx(0);
      })
      .catch(() => setBanners([]));
  };

  useEffect(() => {
    load();
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (Array.isArray(detail)) {
        setBanners(detail.filter((b: any) => b.active !== false));
        setIdx(0);
        return;
      }
      load();
    };
    window.addEventListener('focus', load);
    window.addEventListener(BANNERS_UPDATED_EVENT, onUpdate);
    return () => {
      window.removeEventListener('focus', load);
      window.removeEventListener(BANNERS_UPDATED_EVENT, onUpdate);
    };
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const iv = setInterval(() => setIdx(i => (i + 1) % banners.length), 5000);
    return () => clearInterval(iv);
  }, [banners.length]);

  if (!banners.length) return null;

  return (
    <div className="w-full overflow-hidden relative" style={{ background: 'var(--hero-bg)' }}>
      <div className="relative w-full">
        {banners.map((b: any, i: number) => (
          <div key={b.id} style={{ display: banners.length === 1 ? 'block' : i === idx ? 'block' : 'none' }}
            className="transition-opacity duration-700">
            {b.link ? (
              <a href={b.link} target="_blank" rel="noopener noreferrer" className="block w-full">
                <img src={b.imageUrl} alt="Banner" className="w-full object-cover max-h-36 sm:max-h-52"
                  onError={e => (e.currentTarget.parentElement!.style.display = 'none')} />
              </a>
            ) : (
              <img src={b.imageUrl} alt="Banner" className="w-full object-cover max-h-36 sm:max-h-52"
                onError={e => (e.currentTarget.style.display = 'none')} />
            )}
          </div>
        ))}
        {banners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_: any, i: number) => (
              <button key={i} onClick={() => setIdx(i)}
                className={`w-2 h-2 rounded-full transition cursor-pointer ${i === idx ? 'bg-red-500' : 'bg-white/30'}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Animated Counter ── */
function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => { const p=Math.min((Date.now()-start)/duration,1); setCount(Math.floor(p*target)); if(p<1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return { count, ref };
}

/* ── Stats Section — matching screenshot ── */
const StatsSection: React.FC = () => {
  const c1=useCountUp(10); const c2=useCountUp(100); const c3=useCountUp(99); const c4=useCountUp(24);
  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 overflow-x-hidden" style={{ background: 'var(--bg-page)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="rounded-3xl border border-red-900/30 overflow-hidden glow-card" style={{ background: 'var(--glow-card-bg)' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x divide-red-900/20">
            <div className="p-8 sm:p-10 space-y-3 border-b lg:border-b-0 border-red-900/20 min-w-0">
              <span className="text-xs font-bold uppercase tracking-widest text-red-500">Our Journey</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white break-words">Our Success</h2>
              <p className="text-sm leading-relaxed break-words">
                <span className="text-red-400">From the beginning,</span>{' '}
                <span className="text-slate-400">we've worked hard to bring valuable digital products, tools, and solutions to everyone. Our journey is filled with milestones that inspire us to aim higher every day.</span>
              </p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-red-900/20">
              {[{r:c1,s:'K+',l:'HAPPY CLIENTS'},{r:c2,s:'+',l:'PREMIUM TOOLS'},{r:c3,s:'%',l:'UPTIME'},{r:c4,s:'/7',l:'LIVE SUPPORT'}].map((s,i)=>(
                <div key={i} ref={s.r.ref} className="p-6 sm:p-8 flex flex-col justify-center min-w-0">
                  <div className="text-3xl sm:text-4xl font-black text-white">{s.r.count}<span className="text-red-500">{s.s}</span></div>
                  <div className="text-[10px] font-bold tracking-widest mt-1 text-slate-500">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

function StatCounter({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const { count, ref } = useCountUp(target);
  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl sm:text-4xl font-black text-white">{count}{suffix}</div>
      <p className="text-xs text-slate-400 mt-1 font-medium">{label}</p>
    </div>
  );
}

interface HomePageProps {
  onNavigate: (path: string) => void;
  favorites: string[];
  onToggleFavorite: (e: React.MouseEvent, toolId: string) => void;
}

const WA_BASE = 'https://wa.me/923275855578';
const waLink = (text: string) =>
  `${WA_BASE}?text=${encodeURIComponent(`Hi ZynexTools, I want to buy ${text}.`)}`;


const FAQS = [
  { q: 'Are these tools genuine and safe to use?', a: 'Yes, we provide only genuine tools directly purchased from trusted sources. We ensure access is secure, reliable, and complies with all sharing policies.' },
  { q: 'What payment methods are accepted?', a: 'We accept UPI, PayPal, Binance, bank transfers, and secure payment gateways for hassle-free transactions.' },
  { q: 'How long does it take to get access?', a: 'Access is typically granted within 5 minutes after payment confirmation.' },
  { q: 'What if I face issues while using a tool?', a: 'Clear your cookies and cache, then restart the tool. If the problem persists, contact us via email or Help Desk for prompt assistance.' },
  { q: 'Is my data secure?', a: 'Absolutely! We prioritize your privacy and ensure your data is never shared with third parties. All transactions are processed securely.' },
  { q: 'What does Group Buy SEO Tools mean?', a: 'Group Buy means you get SEO tools access at an affordable price compared to the original. These accounts are best for medium usage — heavy users should not purchase.' },
  { q: 'Do you offer a refund?', a: 'We only refund if our tools do not work for more than 48 hours. Please clear everything with Live Chat Support before purchasing.' },
  { q: 'Can I use Proxy/VPN IPs?', a: 'No, you cannot access your account via proxies or RDPs. It may result in a permanent ban on your account.' },
];

const TESTIMONIALS = [
  { name: 'Ahmed Khalil', role: 'Freelance Web Developer, Lahore', text: 'I needed a dependable place to get premium digital tools and this store delivered beyond expectations. Instant delivery, quality products, and support that actually replies fast.', initial: 'A', ago: '2 months ago' },
  { name: 'Hina Naqvi', role: 'Graphic Designer, Karachi', text: 'Everything felt genuine — no hidden charges, no false promises. The templates I ordered matched exactly what was shown and checkout was completely smooth.', initial: 'H', ago: '3 months ago' },
  { name: 'Usman Mirza', role: 'E-commerce Entrepreneur, Islamabad', text: "Running an online store, I needed quality resources on a budget. The subscription plans are worth every rupee and every download worked flawlessly.", initial: 'U', ago: '1 month ago' },
  { name: 'Fatima Rauf', role: 'Content Strategist, Rawalpindi', text: "I've tried many digital product platforms and this one stands out for its attention to detail. Accurate listings, fast website, and a premium shopping experience.", initial: 'F', ago: '3 months ago' },
  { name: 'Mohsin Ali', role: 'Verified Customer', text: "Purchased CapCut and I'm very satisfied. Affordable pricing and it's been running smoothly without any issues for weeks.", initial: 'M', ago: '3 months ago' },
  { name: 'Hammad Khan', role: 'Verified Customer', text: 'Canva Pro service was great. Quick activation, smooth deal, and everything delivered exactly as promised.', initial: 'H', ago: '3 months ago' },
];

/* ── Tool Grid Card (right side of hero) ── */
const HERO_GRID_TOOLS = [
  { name: 'Envato Elements', domain: 'envato.com' },
  { name: 'Semrush', domain: 'semrush.com' },
  { name: 'Coursera', domain: 'coursera.org' },
  { name: 'Ubersuggest', domain: 'neilpatel.com' },
  { name: 'Vista Create', domain: 'vista.com' },
  { name: 'Udemy', domain: 'udemy.com' },
  { name: 'SkillShare', domain: 'skillshare.com' },
  { name: 'Placeit', domain: 'placeit.net' },
  { name: 'Motion Array', domain: 'motionarray.com' },
  { name: 'Canva Pro', domain: 'canva.com' },
  { name: 'Capcut', domain: 'capcut.com' },
  { name: 'Epidemic Sound', domain: 'epidemicsound.com' },
];

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const tickerTools = [...HERO_TICKER_TOOLS, ...HERO_TICKER_TOOLS];
  const [allLiveTools, setAllLiveTools] = useState<Tool[]>(() => loadTools());
  useEffect(() => {
    void loadCatalogTools({ includeCookies: false }).then(setAllLiveTools);
  }, []);
  // Homepage-only filter: dashboard / shop / admin lists ignore showOnHome
  const onHome = (t: Tool) => t.showOnHome !== false;
  const liveGroupTools = allLiveTools.filter(t => !t.isPrivate && !t.isSemiPrivate && onHome(t));
  const livePrivateTools = allLiveTools.filter(t => (t.isPrivate || t.isSemiPrivate) && onHome(t));

  return (
    <div className="pb-16">

      {/* ══════════════════════════════════════════
          HERO — two-column layout matching reference
      ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-10 pb-28 px-4 sm:px-6 lg:px-8 border-b border-red-900/30" style={{ background: 'var(--hero-bg)' }}>
        {/* Theme-aware red glows */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="hero-glow-tl" style={{position:'absolute',top:'-10%',left:'-5%',width:'55%',height:'80%',background:'radial-gradient(ellipse at 30% 40%, rgba(93,8,8,0.45) 0%, rgba(54,16,18,0.2) 40%, transparent 70%)'}} />
          <div className="hero-glow-tr" style={{position:'absolute',top:'0%',right:'-5%',width:'50%',height:'70%',background:'radial-gradient(ellipse at 70% 30%, rgba(246,216,144,0.12) 0%, rgba(93,8,8,0.18) 45%, transparent 70%)'}} />
          <div style={{position:'absolute',bottom:0,left:0,right:0,height:'30%',background:'var(--hero-fade)'}} />
        </div>

        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

          {/* ── LEFT: Text ── */}
          <div className="space-y-6">
            {/* Trust badge */}
            <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/40 rounded-full px-4 py-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-extrabold text-red-400 uppercase tracking-widest">Trusted by 10,000+ Clients</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight uppercase">
              Pakistan<br />
              <span className="text-red-500"># 01</span><br />
              <span className="text-slate-300">Tools Provider</span>
            </h1>

            {/* Subtext */}
            <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
              ZynexTools is the <strong className="text-white">best group buy SEO tools provider</strong> — get Semrush, Ahrefs, Canva Pro, ChatGPT Plus, Envato & 80+ premium tools in one affordable plan. Trusted by freelancers, agencies & resellers worldwide.
            </p>

            {/* Stars */}
            <div className="flex items-center gap-1.5">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
              <span className="text-sm font-bold text-white ml-1">4.9/5</span>
              <span className="text-xs text-slate-400">from 2,500+ reviews</span>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <a
                href="https://zynextools.com/signup"
                target="_blank" rel="noopener noreferrer"
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl shadow-lg shadow-red-900/30 transition flex items-center gap-2"
              >
                Get Started Now <ArrowRight className="w-4 h-4" />
              </a>
              <a
                href={WA_BASE}
                target="_blank" rel="noopener noreferrer"
                className="px-6 py-3 btn-secondary-red font-black text-sm rounded-xl transition flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp Us
              </a>
            </div>

            {/* 5 metric pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { icon: <Zap className="w-4 h-4 text-amber-400" />, label: 'Instant Access', sub: '5 min activation' },
                { icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />, label: '100% Genuine', sub: 'Verified tools' },
                { icon: <MessageCircle className="w-4 h-4 text-blue-400" />, label: '24/7 Support', sub: 'Live human help' },
                { icon: <TrendingUp className="w-4 h-4 text-red-400" />, label: 'You Save', sub: '$4,200 / mo vs. buying separately' },
                { icon: <Globe className="w-4 h-4 text-purple-400" />, label: 'Uptime SLA', sub: '99.9% last 12 months' },
              ].map((m) => (
                <div key={m.label} className="flex items-start gap-2 rounded-xl p-3 border border-[var(--border-subtle)]" style={{ background: 'var(--hero-chip-bg)' }}>
                  <div className="mt-0.5 shrink-0">{m.icon}</div>
                  <div>
                    <div className="text-xs font-extrabold text-white uppercase tracking-wide">{m.label}</div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{m.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Tool Grid Card ── */}
          <div className="relative">
            {/* Top badge */}
            <div className="absolute -top-3 right-4 z-10 flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-full px-3 py-1.5 shadow-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">3 Signups Just Now</span>
            </div>

            <div className="rounded-3xl p-5 shadow-2xl shadow-black/40 border border-red-900/30" style={{ background: 'var(--hero-card-bg)' }}>
              {/* Card header */}
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  {/* You save badge */}
                  <div className="flex items-center gap-2 bg-red-600/20 border border-red-500/30 rounded-full px-3 py-1 w-fit">
                    <TrendingUp className="w-3 h-3 text-red-400" />
                    <div>
                      <span className="text-xs font-black text-white">You Save $4,200/mo</span>
                      <span className="text-[10px] text-slate-400 block">vs. buying separately</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">10K+ Users</div>
                </div>
              </div>

              {/* "PREMIUM TOOLS" label + LIVE dot */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold text-white uppercase tracking-widest">Premium Tools</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-red-400 uppercase">Live</span>
                </div>
              </div>

              {/* 4×3 Tool Grid */}
              <div className="grid grid-cols-4 gap-2">
                {HERO_GRID_TOOLS.map((tool) => (
                  <button
                    key={tool.name}
                    onClick={() => onNavigate(`/tools/${nameToId(tool.name)}`)}
                    className="rounded-2xl p-3 flex flex-col items-center gap-2 transition cursor-pointer group hover:scale-105 border border-red-900/20 hover:border-red-500/30"
                    style={{ background: 'var(--hero-tile-bg)' }}
                  >
                    <img
                      src={`https://www.google.com/s2/favicons?sz=128&domain=${tool.domain}`}
                      alt={tool.name}
                      className="w-9 h-9 rounded-xl bg-white p-0.5 group-hover:scale-110 transition-transform"
                    />
                    <span className="text-[9px] font-semibold text-slate-400 text-center leading-tight line-clamp-2 group-hover:text-white transition">{tool.name}</span>
                  </button>
                ))}
              </div>

              {/* Bottom row */}
              <div className="mt-4 flex items-center justify-between gap-3">
                {/* Avatars + joined */}
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1">
                    {['J','S','A','M','R'].map((l, i) => (
                      <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-amber-500 border-2 border-slate-900 flex items-center justify-center text-[9px] font-black text-white">{l}</div>
                    ))}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white">247 joined today</span>
                    <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold">+12%</span>
                  </div>
                </div>
                {/* Uptime */}
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider">Uptime SLA</div>
                  <div className="text-sm font-black text-white">99.9%</div>
                  <div className="text-[9px] text-slate-500">last 12 months</div>
                </div>
              </div>

              {/* Starts from + Sign Up */}
              <div className="mt-4 rounded-2xl p-4 flex items-center justify-between gap-4 border border-red-900/20" style={{ background: 'var(--hero-panel-bg)' }}>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Starts from</div>
                  <div className="flex items-end gap-2 mt-0.5">
                    <span className="text-2xl font-black text-white">$5</span>
                    <span className="text-sm text-slate-500 line-through mb-0.5">$4200</span>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-400">Save 99% today</div>
                </div>
                <a
                  href="https://zynextools.com/signup"
                  target="_blank" rel="noopener noreferrer"
                  className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl transition whitespace-nowrap shadow-lg shadow-red-900/30"
                >
                  Sign Up Now →
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* ── FULL WIDTH TICKER — runs edge to edge under hero ── */}
        <div className="absolute bottom-0 left-0 right-0 py-3.5 border-t border-red-900/30 overflow-hidden" style={{ background: 'var(--hero-ticker-bg)' }}>
          <div className="flex gap-4 animate-marquee whitespace-nowrap leading-normal">
            {[...tickerTools, ...tickerTools].map((t, i) => (
              <div key={i} className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-slate-300 shrink-0 border border-[var(--border-subtle)]" style={{ background: 'var(--hero-chip-bg)' }}>
                <img src={`https://www.google.com/s2/favicons?sz=32&domain=${t.domain}`} className="w-4 h-4 rounded" alt="" />
                {t.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ BANNER SECTION — full width, under hero ══ */}
      <BannerSection />

      {/* ══ STATS — redesigned to match screenshot ══ */}
      <StatsSection />

      {/* ══ WHY CHOOSE US ══ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-red-500">Why Choose Us</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Built for Serious Creators</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">Everything you need to run your agency, freelance business or side hustle — one login, one bill.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: <Zap className="w-5 h-5" />, title: 'Instant Activation', desc: 'Get all tools inside 5 minutes after payment confirmation.', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
            { icon: <ShieldCheck className="w-5 h-5" />, title: '100% Genuine', desc: 'Verified licenses sourced directly from official providers.', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { icon: <MessageCircle className="w-5 h-5" />, title: '24/7 Live Support', desc: 'Real human help on WhatsApp, chat & email — anytime.', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
            { icon: <Globe className="w-5 h-5" />, title: 'Works Worldwide', desc: 'Access from any country on Windows, Mac, iOS & Android.', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
            { icon: <RefreshCw className="w-5 h-5" />, title: 'Auto-Renew', desc: 'Never lose access — subscriptions renew seamlessly.', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
            { icon: <CheckCircle2 className="w-5 h-5" />, title: 'Flexible Payments', desc: 'UPI, PayPal, Binance, cards and local bank transfers.', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
            { icon: <Lock className="w-5 h-5" />, title: 'Secure Access', desc: 'Encrypted Chrome extension with per-user session isolation.', color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
            { icon: <TrendingUp className="w-5 h-5" />, title: 'New Tools Weekly', desc: 'We keep adding the latest AI, SEO & design tools you need.', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
          ].map((f) => (
            <div key={f.title} className="glow-card rounded-3xl p-5 space-y-3 transition">
              <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center ${f.color}`}>{f.icon}</div>
              <h3 className="text-sm font-bold text-white">{f.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ PRIVATE TOOLS ══ */}
      <section className="border-y border-red-900/20 py-16 px-4 sm:px-6 lg:px-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-3 px-1">
            <span className="text-xs font-bold uppercase tracking-widest text-red-500">Private &amp; Semi-Private</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white break-words">Private Tools — Your own dedicated seat</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto break-words">For creators & agencies who need dedicated logins instead of shared group access. Faster, safer & no session conflicts.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {livePrivateTools.map((tool) => (
              <div key={tool.id} className="glow-card rounded-3xl p-5 flex flex-col gap-4 transition min-w-0">
                <div className="flex items-start gap-3 min-w-0">
                  <img src={tool.favicon} alt={tool.name} className="w-10 h-10 rounded-xl bg-white p-0.5 shrink-0" />
                  <div className="min-w-0">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${tool.isSemiPrivate ? 'bg-red-600/20 text-red-400 border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                      {tool.isSemiPrivate ? 'Semi-Private' : 'Private'}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1 break-words">{tool.name}</h3>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed flex-1 break-words">{tool.desc}</p>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-base font-black text-white">Rs {tool.price.toLocaleString()}<span className="text-xs font-medium text-slate-500">/mo</span></span>
                  <a href={waLink(tool.waText || tool.name)} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0">
                    <MessageCircle className="w-3 h-3" /> Order
                  </a>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center px-1">
            <p className="text-xs text-slate-400 mb-3 break-words">Need a private seat for another tool? We can arrange Ahrefs, Netflix Pro, Adobe CC and more.</p>
            <a href={`${WA_BASE}?text=${encodeURIComponent('Hi, I need a private/dedicated seat for a specific tool.')}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 btn-secondary-red text-xs font-bold rounded-xl transition">
              <MessageCircle className="w-4 h-4 text-emerald-500" /> Request a private tool
            </a>
          </div>
        </div>
      </section>

      {/* ══ POPULAR TOOLS ══ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-red-500">Featured Tools</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">Popular This Week</h2>
          </div>
          <button onClick={() => onNavigate('/tools')}
            className="self-start sm:self-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer">
            View All Tools <ArrowRight className="w-4 h-4 text-red-500" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {liveGroupTools.slice(0, 10).map((tool) => (
            <div key={tool.id}
              className="glow-card rounded-2xl p-4 flex flex-col gap-3  transition cursor-pointer group"
              onClick={() => onNavigate(`/tools/${tool.id}`)}
            >
              <div><span className="text-[10px] font-black bg-red-600/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">Hot Deal −{tool.discount}%</span></div>
              <div className="flex items-center gap-3">
                <img src={tool.favicon} alt={tool.name} className="w-10 h-10 rounded-xl border border-slate-700 bg-white p-0.5" />
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">{tool.category}</span>
                  <h3 className="text-sm font-bold text-white group-hover:text-red-400 transition">{tool.name}</h3>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                <span className="text-[11px] text-slate-400 ml-1">{tool.rating}</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-base font-black text-white">Rs {tool.price}</span>
                <span className="text-xs text-slate-500 line-through">Rs {tool.originalPrice}</span>
                <span className="text-[10px] text-slate-400">/mo</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); onNavigate(`/tools/${tool.id}`); }}
                className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer">
                View Details
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ══ PRICING PLANS ══ */}
      <section className="border-y border-red-900/20 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="text-center sm:text-left space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-red-500">Simple Pricing</span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Choose Your Plan</h2>
              <p className="text-xs sm:text-sm text-slate-400">Live rates — switch currency to see prices in USD, PKR or INR.</p>
            </div>
            <button onClick={() => onNavigate('/plans')}
              className="self-start sm:self-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer">
              View Full Details <ArrowRight className="w-4 h-4 text-red-500" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
            {[
              { name: 'Basic', price: 'Rs 1,390', period: '1 Month', count: '42+ Tools Included', features: ['Canva Pro + Envato Elements', 'QuillBot + Grammarly + Wordtune', 'Netflix + Prime Video + Duolingo', '5-min instant activation', 'Email support'], highlight: false, cta: 'Get Started', badge: null },
              { name: 'Standard', price: 'Rs 1,946', period: '1 Month', count: '60+ Tools Included', features: ['Everything in Basic', 'Semrush + Ubersuggest', 'Jasper + HIX AI + Writeless', 'LinkedIn Learning + Skillshare', 'Priority WhatsApp support'], highlight: false, cta: 'Get Started', badge: null },
              { name: 'Premium', price: 'Rs 2,780', period: '1 Month', count: '80+ Tools Included', features: ['All 80+ premium tools', 'Perplexity AI + Jasper + HIX AI', 'Coursera + LinkedIn Learning', 'Epidemic Sound + Helium 10', '24/7 VIP support'], highlight: true, cta: 'Get Started', badge: 'Most Popular' },
              { name: 'Custom', price: 'Rs 1,112', period: '1 Month', count: 'Choose any 5 tools', features: ['Pick any 5 premium tools', 'Perfect for niche use-cases', '5-min instant activation', '24/7 WhatsApp support', 'Upgrade anytime'], highlight: false, cta: 'Choose Tools', badge: 'Build Your Own' },
            ].map((plan) => (
              <div key={plan.name} className={`relative rounded-3xl p-6 flex flex-col gap-5 border ${plan.highlight ? 'theme-dark-surface bg-gradient-to-b from-red-600/10 to-slate-900 border-red-500/40 shadow-2xl shadow-red-900/20' : 'glow-card'}`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-wider ${plan.highlight ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-200'}`}>{plan.badge}</span>
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
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />{f}
                    </li>
                  ))}
                </ul>
                <a href="https://zynextools.com/signup" target="_blank" rel="noopener noreferrer"
                  className={`w-full py-3 rounded-xl text-sm font-black text-center transition block ${plan.highlight ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/30 border border-transparent' : 'btn-secondary-red'}`}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>

          {/* Compare table */}
          <div className="glow-card rounded-3xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">Compare Plans</h3>
              <span className="text-xs text-slate-400">What's included in each plan</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left p-4 text-slate-400 font-semibold">Feature</th>
                    <th className="p-4 text-slate-300 font-bold">Basic</th>
                    <th className="p-4 text-slate-300 font-bold">Standard</th>
                    <th className="p-4 text-red-400 font-bold">Premium ⭐</th>
                    <th className="p-4 text-slate-300 font-bold">Custom</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Total premium tools', '30+', '60+', '80+', 'Custom'],
                    ['SEO tools (Semrush, Ahrefs, Moz)', '✗', '✓', '✓', 'Optional'],
                    ['AI tools (ChatGPT, Jasper, QuillBot)', '✗', 'Partial', '✓', 'Optional'],
                    ['Design (Canva Pro, Envato, Placeit)', 'Partial', '✓', '✓', 'Optional'],
                    ['Learning (Udemy, Coursera, Skillshare)', '✗', 'Udemy', '✓', 'Optional'],
                    ['Video & audio (Motion Array, Epidemic)', '✗', '✗', '✓', 'Optional'],
                    ['Activation speed', '5 min', '5 min', '5 min', 'Same day'],
                    ['Support', 'Email', 'WhatsApp', '24/7 VIP', 'Dedicated'],
                  ].map(([feat, ...cols]) => (
                    <tr key={feat} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      <td className="p-4 text-slate-300">{feat}</td>
                      {cols.map((v, i) => (
                        <td key={i} className={`p-4 text-center font-semibold ${v === '✓' ? 'text-emerald-400' : v === '✗' ? 'text-slate-600' : i === 2 ? 'text-red-400' : 'text-slate-400'}`}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS ══ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-red-500">Testimonials</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">What our customers say</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {TESTIMONIALS.slice(0, 4).map((t) => (
            <div key={t.name} className="glow-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-1">{[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-xs text-slate-300 leading-relaxed">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center text-sm font-black text-white">{t.initial}</div>
                <div>
                  <div className="text-xs font-bold text-white">{t.name}</div>
                  <div className="text-[11px] text-slate-400">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="glow-card rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Verified customer sentiment</div>
              <h3 className="text-base font-extrabold text-white">Google reviews snapshot</h3>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-white">Excellent</div>
              <div className="flex items-center gap-1 mt-1">{[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
              <p className="text-[11px] text-slate-400 mt-1">Based on hundreds of reviews</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t) => (
              <div key={t.name + '-g'} className="glow-card rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center text-xs font-black text-white">{t.initial}</div>
                  <div>
                    <div className="text-xs font-bold text-white">{t.name}</div>
                    <div className="text-[10px] text-slate-400">{t.ago} · Verified</div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">{t.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ RESELLER ══ */}
      <section className="bg-gradient-to-br from-slate-900 via-red-950/20 to-slate-900 border-y border-slate-800 py-16 px-4 sm:px-6 lg:px-8 reseller-band">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <span className="text-xl">🌟 Reseller Program</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">Resell 80+ Premium Tools — Earn 1 Lakh+/mo</h2>
            <p className="text-sm text-slate-400 leading-relaxed">Partner with us and start reselling 80+ premium digital tools at unbeatable prices. One-time setup with a full admin panel, unlimited users and a done-for-you sales dashboard.</p>
            <div className="inline-flex items-center gap-2 bg-slate-900 rounded-xl px-4 py-2">
              <span className="text-white font-black text-lg">$20</span>
              <span className="text-xs text-slate-400">one-time · admin panel</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {['🎨 Designers','🎥 Video Editors','📖 Students','📊 SEO Experts','💼 Agency Owners'].map(l => (
                <span key={l} className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1 rounded-full">{l}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <a href={`${WA_BASE}?text=${encodeURIComponent('Hi ZynexTools, I want to join the Reseller Program ($20).')}`} target="_blank" rel="noopener noreferrer"
                className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl transition flex items-center gap-2">
                <MessageCircle className="w-4 h-4" /> Join the Program
              </a>
              <button onClick={() => onNavigate('/resellers-portal')}
                className="px-5 py-3 btn-secondary-red font-bold text-sm rounded-xl transition cursor-pointer">
                View Full Details
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { title: 'High Profit Margin', desc: '1 Lakh+ earning potential per month with the right hustle.' },
              { title: '80+ Tools in One Panel', desc: 'Give clients access to every tool from a single dashboard.' },
              { title: 'Unlimited User Access', desc: 'Add as many users as you like — no seat limits, ever.' },
              { title: 'Sales Dashboard', desc: 'Track sales, users and revenue in real-time.' },
              { title: 'Step-by-Step Guide', desc: 'Onboarding videos walk you through every feature.' },
              { title: 'Instant Activation', desc: 'Get set up in minutes and start selling the same day.' },
            ].map((b) => (
              <div key={b.title} className="glow-card rounded-2xl p-4 space-y-1">
                <h4 className="text-sm font-bold text-white">{b.title}</h4>
                <p className="text-xs text-slate-400">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ COMPARISON ══ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-red-500">📊 Why Choose ZynexTools?</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">See How We Stack Up Against the Competition</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">The most feature-packed group buy platform — at the lowest price you'll find anywhere.</p>
        </div>
        <div className="glow-card rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left p-4 text-slate-400 font-semibold">Feature</th>
                  <th className="p-4 text-red-400 font-extrabold">ZynexTools ⭐ Best Choice</th>
                  <th className="p-4 text-slate-400 font-semibold">Others</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['80+ Premium Tools in One Panel', 'Yes', 'Limited 20-30'],
                  ['Instant Activation', 'Under 5 min', 'Hours / Days'],
                  ['24/7 WhatsApp Support', 'Yes', 'No'],
                  ['Dedicated Private Seats (ChatGPT, Canva)', 'Yes', 'No'],
                  ['Reseller / Admin Panel Included', 'Yes', 'Paid Add-on'],
                  ['Money-Back Guarantee', '7 Days', 'None'],
                  ['Uptime & V3 Extension Security', '99.9%', 'Frequent Downtime'],
                  ['Free Bonus Tools & Updates', 'Yes', 'No'],
                  ['Starting Price', '$5/mo', '$15+/mo'],
                ].map(([feat, us, them]) => (
                  <tr key={feat} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                    <td className="p-4 text-slate-300 font-medium">{feat}</td>
                    <td className="p-4 text-center text-emerald-400 font-bold">{us}</td>
                    <td className="p-4 text-center text-slate-500">{them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="text-center">
          <button onClick={() => onNavigate('/plans')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl transition shadow-lg shadow-red-900/30 cursor-pointer">
            See Our Plans <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section className="border-y border-red-900/20 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-red-500">FAQs</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Common Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="glow-card rounded-2xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-slate-800/50 transition">
                  <span className="text-sm font-bold text-white">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-red-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800 pt-4">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <button onClick={() => onNavigate('/faq')}
              className="text-sm text-red-400 hover:text-red-300 font-bold transition cursor-pointer">
              See all FAQs →
            </button>
          </div>
        </div>
      </section>

      {/* ══ TICKER BAND ══ */}
      <section className="border-y border-slate-800 py-3.5 overflow-hidden bg-slate-900/40">
        <div className="flex gap-6 animate-marquee whitespace-nowrap items-center leading-normal">
          {[...Array(4)].flatMap(() => ['Powering Your Digital Success Everywhere✦']).map((t, i) => (
            <span key={i} className="text-xs font-bold text-slate-300 uppercase tracking-widest shrink-0 py-0.5">{t}</span>
          ))}
        </div>
      </section>

      {/* ══ JOIN CHANNEL ══ */}
      <section className="bg-gradient-to-r from-red-600 to-red-700 py-12 px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="text-white/80 text-xs font-bold uppercase tracking-widest">Want more tools &amp; premium drops?</div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Join our Channel now.</h2>
          <a href="https://wa.me/923275855578" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-red-600 font-black text-sm rounded-xl hover:bg-slate-100 transition shadow-lg">
            <MessageCircle className="w-4 h-4" /> Join for Free
          </a>
        </div>
      </section>

      {/* ══ SEO CONTENT ══ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 space-y-5">
        <div className="text-center mb-6">
          <span className="text-xs font-bold uppercase tracking-widest text-red-500">Why ZynexTools</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">The Best Group Buy SEO Tools Provider in 2026</h2>
        </div>
        <div className="text-sm text-slate-400 leading-relaxed space-y-4">
          <p>Looking for the <strong className="text-white">best group buy SEO tools provider</strong>? ZynexTools gives you instant access to 80+ premium SEO, AI, design and learning tools — Semrush, Ahrefs, Moz, Canva Pro, ChatGPT Plus, Envato Elements, Grammarly, SpyFu, Helium 10 and more — in one affordable group buy plan starting at just <strong className="text-white">$5/month</strong>.</p>
          <p>Our group buy SEO tools service is trusted by 20,000+ freelancers, agencies, bloggers and resellers worldwide. Every account is verified, secure and activated within 5 minutes. Whether you need a <strong className="text-white">cheap Semrush group buy</strong>, <strong className="text-white">Ahrefs group buy</strong> access, or a complete <strong className="text-white">group buy SEO tools website</strong> for your own clients, we've got you covered — with 24/7 WhatsApp support and a money-back guarantee.</p>
          <p>Stop paying $4,000+ per month for individual subscriptions. Join the best group buy SEO tools provider today and save up to 99% on premium SEO tools.</p>
        </div>
      </section>
    </div>
  );
};
