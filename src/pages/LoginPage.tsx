import React, { useState } from 'react';
import {
  Mail, Lock, User, Phone, Eye, EyeOff, AlertCircle, CheckCircle2,
  ShieldCheck, Store, UserCircle, MessageCircle, Loader2,
} from 'lucide-react';
import { portalLogin, portalSignup } from '../lib/portalAuth';

type Tab = 'login' | 'signup';

const WA_LINK = 'https://wa.me/923275855578?text=Hi%20AI%20TOOLZ%20MART%2C%20I%20just%20created%20an%20account%20and%20want%20to%20activate%20a%20plan.';

const inputCls =
  'w-full bg-slate-900 border border-slate-700 focus:border-red-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none transition';
const labelCls = 'text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2';

export const LoginPage: React.FC<{ onNavigate: (p: string) => void }> = ({ onNavigate }) => {
  const [tab, setTab] = useState<Tab>('login');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const [login, setLogin] = useState({ email: '', password: '' });
  const [signup, setSignup] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });

  const switchTab = (t: Tab) => { setTab(t); setError(''); setNotice(''); };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setNotice(''); setLoading(true);
    const result = await portalLogin(login.email, login.password);
    setLoading(false);
    if (result.ok && result.redirect) window.location.href = result.redirect;
    else setError(result.error || 'Unable to sign in');
  };

  const submitSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setNotice('');
    if (signup.password !== signup.confirm) return setError('Passwords do not match');
    setLoading(true);
    const result = await portalSignup(signup);
    setLoading(false);
    if (result.ok && result.redirect) {
      setNotice('Account created — taking you to your dashboard…');
      window.location.href = result.redirect;
    } else setError(result.error || 'Unable to create account');
  };

  return (
    <div className="min-h-[70vh] px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md mx-auto">

        {/* Heading */}
        <div className="text-center mb-6 space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {tab === 'login' ? 'Sign in to your account' : 'Create your account'}
          </h1>
          <p className="text-sm text-slate-400">
            {tab === 'login'
              ? 'Customers, resellers and admins all sign in here.'
              : 'Free to join — then activate a package with our team.'}
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="grid grid-cols-2 border-b border-slate-800">
            {(['login', 'signup'] as Tab[]).map(t => (
              <button key={t} onClick={() => switchTab(t)}
                className={`py-3.5 text-sm font-black transition cursor-pointer ${
                  tab === t
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}>
                {t === 'login' ? 'Login' : 'Sign Up'}
              </button>
            ))}
          </div>

          <div className="p-6">
            {error && (
              <div
                className="mb-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm border font-semibold"
                style={{ background: 'var(--alert-danger-bg)', borderColor: 'var(--alert-danger-border)', color: 'var(--alert-danger-text)' }}
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{error}</span>
              </div>
            )}
            {notice && (
              <div className="mb-5 flex items-start gap-2 bg-emerald-900/30 border border-emerald-500/40 rounded-xl px-4 py-3 text-sm text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> <span>{notice}</span>
              </div>
            )}

            {tab === 'login' ? (
              <form onSubmit={submitLogin} className="space-y-4">
                <div>
                  <label className={labelCls}>Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="email" required value={login.email} placeholder="you@example.com"
                      onChange={e => setLogin(f => ({ ...f, email: e.target.value }))} className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type={showPwd ? 'text' : 'password'} required value={login.password} placeholder="••••••••"
                      onChange={e => setLogin(f => ({ ...f, password: e.target.value }))} className={inputCls + ' pr-11'} />
                    <button type="button" onClick={() => setShowPwd(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition cursor-pointer">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-black text-sm rounded-xl transition shadow-lg shadow-red-900/30 cursor-pointer flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : 'Sign In →'}
                </button>

                {/* Roles handled by this one form */}
                <div className="pt-2 grid grid-cols-3 gap-2">
                  {[
                    { icon: <UserCircle className="w-3.5 h-3.5" />, label: 'Customer' },
                    { icon: <Store className="w-3.5 h-3.5" />, label: 'Reseller' },
                    { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: 'Admin' },
                  ].map(r => (
                    <div key={r.label} className="flex flex-col items-center gap-1 bg-slate-950/60 border border-slate-800 rounded-xl py-2 text-[10px] font-bold text-slate-400">
                      <span className="text-red-400">{r.icon}</span> {r.label}
                    </div>
                  ))}
                </div>
                <p className="text-center text-[11px] text-slate-500">
                  We detect your role automatically and open the right dashboard.
                </p>
              </form>
            ) : (
              <form onSubmit={submitSignup} className="space-y-4">
                <div>
                  <label className={labelCls}>Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input required value={signup.name} placeholder="e.g. Ali Hassan"
                      onChange={e => setSignup(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="email" required value={signup.email} placeholder="you@example.com"
                      onChange={e => setSignup(f => ({ ...f, email: e.target.value }))} className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>WhatsApp / Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input value={signup.phone} placeholder="+92…"
                      onChange={e => setSignup(f => ({ ...f, phone: e.target.value }))} className={inputCls} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input type="password" required value={signup.password} placeholder="min 8 chars"
                        onChange={e => setSignup(f => ({ ...f, password: e.target.value }))} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Confirm *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input type="password" required value={signup.confirm} placeholder="repeat password"
                        onChange={e => setSignup(f => ({ ...f, confirm: e.target.value }))} className={inputCls} />
                    </div>
                  </div>
                </div>

                {/* What a new account gets */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1.5">
                  <p className="text-[11px] font-bold text-white">What happens next</p>
                  <p className="text-[11px] text-slate-400">
                    You get a free customer account. All tools stay <span className="text-red-400 font-semibold">locked</span> until
                    you pay for a package — message us on WhatsApp and we unlock the tools included in your plan.
                  </p>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-black text-sm rounded-xl transition shadow-lg shadow-red-900/30 cursor-pointer flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</> : 'Create Account →'}
                </button>

                <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2">
                  <MessageCircle className="w-4 h-4" /> Contact Admin to Activate
                </a>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-5">
          {tab === 'login' ? (
            <>New here? <button onClick={() => switchTab('signup')} className="text-red-400 hover:text-red-300 font-bold cursor-pointer">Create an account</button></>
          ) : (
            <>Already have an account? <button onClick={() => switchTab('login')} className="text-red-400 hover:text-red-300 font-bold cursor-pointer">Log in</button></>
          )}
        </p>

        <p className="text-center text-xs text-slate-600 mt-2">
          <button onClick={() => onNavigate('/plans')} className="hover:text-slate-400 cursor-pointer">View packages &amp; pricing</button>
        </p>
      </div>
    </div>
  );
};
