import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, Shield, AlertCircle } from 'lucide-react';
import { authStore } from '../store/authStore';
import { ThemeToggle } from '../../components/ThemeToggle';

interface AdminLoginProps { onLogin: () => void; }

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await authStore.login(email, password);
    setLoading(false);
    if (result.ok) onLogin();
    else setError(result.error || 'Login failed');
  };

  return (
    <div className="min-h-screen bg-[#0a0808] flex items-center justify-center px-4 relative"
      style={{ backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(204,26,26,0.08) 0%, transparent 50%)' }}>
      <div className="absolute top-4 right-4">
        <ThemeToggle variant="labeled" />
      </div>
      <div className="w-full max-w-md">
        <div className="bg-[#130d0d]/90 border border-[#3a2a26] rounded-3xl p-8 shadow-2xl"
          style={{ boxShadow: '0 0 60px rgba(204,26,26,0.15)' }}>
          <div className="text-center mb-8 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-900/40">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Admin Panel</h1>
              <p className="text-sm text-slate-400 mt-1">AI TOOLZ MART · Secure Access</p>
            </div>
          </div>
          {error && (
            <div
              className="mb-5 flex items-center gap-2 rounded-xl px-4 py-3 text-sm border font-semibold"
              style={{ background: 'var(--alert-danger-bg)', borderColor: 'var(--alert-danger-border)', color: 'var(--alert-danger-text)' }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@example.com"
                  className="w-full bg-[#1a1210] border border-[#3a2a26] focus:border-red-500 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none transition" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••••"
                  className="w-full bg-[#1a1210] border border-[#3a2a26] focus:border-red-500 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-600 focus:outline-none transition" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition cursor-pointer">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-black text-sm rounded-xl transition shadow-lg shadow-red-900/30 cursor-pointer flex items-center justify-center gap-2 mt-2">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Authenticating…</> : 'Sign In →'}
            </button>
          </form>
          <p className="text-center text-xs text-slate-600 mt-6">Protected area · Unauthorized access prohibited</p>
        </div>
      </div>
    </div>
  );
};
