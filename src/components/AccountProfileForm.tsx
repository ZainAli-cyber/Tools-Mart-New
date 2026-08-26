import React, { useState } from 'react';
import { Camera, Lock } from 'lucide-react';
import { DevicesManager } from './DevicesManager';

export type ProfileMode = 'admin' | 'self-seller' | 'self-user' | 'seller-member';

export type SellerOption = { id: string; name: string; customer_code?: string };

export type ProfileValues = {
  customer_code?: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role?: string;
  owner_id?: string | null;
  max_devices?: number;
};

const inp = 'w-full bg-[#0d0908] border border-[#2a1e1c] focus:border-red-500/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition disabled:opacity-60 disabled:cursor-not-allowed';
const lbl = 'text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5';

export async function compressProfileImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file');
  if (file.size > 4 * 1024 * 1024) throw new Error('Image must be under 4MB');
  const bitmap = await createImageBitmap(file);
  const max = 256;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.82);
}

export const AccountProfileForm: React.FC<{
  mode: ProfileMode;
  account: ProfileValues;
  sellers?: SellerOption[];
  /** Seller's own max_devices — used as ceiling when editing a member. */
  sellerMaxDevices?: number;
  onSaved: () => void;
  onCancel: () => void;
  /** Hide Cancel when the form is a full-screen page (mobile profile). */
  hideCancel?: boolean;
  save: (payload: Record<string, any>) => Promise<void>;
}> = ({ mode, account, sellers = [], sellerMaxDevices, onSaved, onCancel, hideCancel = false, save }) => {
  const lockEmail = mode === 'self-user' || mode === 'seller-member';
  const showRole = mode === 'admin';
  const showSeller = mode === 'admin' && (account.role || 'user') !== 'admin';
  const canEditMax = mode === 'admin' || mode === 'seller-member';
  const showOwnDevices = mode === 'self-seller' || mode === 'self-user';
  const [name, setName] = useState(account.name || '');
  const [email, setEmail] = useState(account.email || '');
  const [phone, setPhone] = useState(account.phone || '');
  const [password, setPassword] = useState('');
  const [avatar, setAvatar] = useState(account.avatar || '');
  const [role, setRole] = useState(account.role || 'user');
  const [ownerId, setOwnerId] = useState(account.owner_id || '');
  const [maxDevices, setMaxDevices] = useState(Math.max(1, Number(account.max_devices) || 1));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const pickImage = async (file?: File) => {
    if (!file) return;
    try {
      setError('');
      setAvatar(await compressProfileImage(file));
    } catch (err: any) {
      setError(err.message || 'Could not read image');
    }
  };

  const submit = async () => {
    if (!name.trim()) return setError('Full name is required');
    if (!lockEmail && email && !/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address');
    if (password && password.length < 8) return setError('Password must be at least 8 characters');
    if (canEditMax && (maxDevices < 1 || maxDevices > 50)) {
      return setError('Max devices must be between 1 and 50');
    }
    if (mode === 'seller-member' && typeof sellerMaxDevices === 'number' && maxDevices > sellerMaxDevices) {
      return setError(`Cannot exceed your seller device limit (${sellerMaxDevices})`);
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = { name: name.trim(), phone: phone.trim(), avatar };
      if (!lockEmail) payload.email = email.trim().toLowerCase();
      if (password) payload.password = password;
      if (showRole) payload.role = role;
      if (mode === 'admin') payload.ownerId = role === 'user' ? (ownerId || null) : null;
      if (canEditMax) payload.maxDevices = maxDevices;
      await save(payload);
    } catch (err: any) {
      setError(err.message || 'Could not save profile');
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-900/30 border border-red-500/40 rounded-xl px-3 py-2 text-xs text-red-300">{error}</div>}

      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-red-600/20 border border-red-500/30 flex items-center justify-center text-xl font-black text-red-300">
            {avatar
              ? <img src={avatar} alt="" className="w-full h-full object-cover" />
              : (name || '?')[0]?.toUpperCase()}
          </div>
          <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer shadow">
            <Camera className="w-3.5 h-3.5" />
            <input type="file" accept="image/*" className="hidden" onChange={e => pickImage(e.target.files?.[0])} />
          </label>
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Unique Customer ID
          </div>
          <div className="text-sm font-black tracking-wider text-white">{account.customer_code || '—'}</div>
          <p className="text-[10px] text-slate-500 mt-0.5">This ID never changes.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Full Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} className={inp} />
        </div>
        <div>
          <label className={lbl}>Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className={inp} placeholder="+92…" />
        </div>
      </div>

      <div>
        <label className={lbl}>Email {lockEmail ? '(locked)' : '*'}</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inp} disabled={lockEmail} />
      </div>

      <div>
        <label className={lbl}>New Password (leave blank to keep)</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inp} placeholder="••••••••" />
      </div>

      {showRole && (
        <div>
          <label className={lbl}>Role</label>
          <select value={role} onChange={e => setRole(e.target.value)} className={inp}>
            <option value="user">User</option>
            <option value="reseller">Seller</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      )}

      {showSeller && role === 'user' && (
        <div>
          <label className={lbl}>Related Seller</label>
          <select value={ownerId} onChange={e => setOwnerId(e.target.value)} className={inp}>
            <option value="">Direct / no seller</option>
            {sellers.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.customer_code || s.id})</option>
            ))}
          </select>
        </div>
      )}

      {canEditMax && (
        <div>
          <label className={lbl}>Max devices</label>
          <input
            type="number"
            min={1}
            max={50}
            value={maxDevices}
            onChange={e => setMaxDevices(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            className={inp}
          />
          <p className="text-[10px] text-slate-500 mt-1">
            How many browsers/devices may use this login at once (default 1).
            {mode === 'seller-member' && typeof sellerMaxDevices === 'number'
              ? ` Your seller cap is ${sellerMaxDevices}.`
              : ''}
          </p>
        </div>
      )}

      {showOwnDevices && (
        <div className="border-t border-[#2a1e1c] pt-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Your devices</h4>
          <DevicesManager embedded />
        </div>
      )}

      <div className="flex gap-2 justify-end pt-1">
        {!hideCancel && (
          <button type="button" onClick={onCancel}
            className="px-5 py-2.5 bg-[#1a1210] hover:bg-[#231a18] border border-[#3a2a26] text-slate-300 hover:text-white text-sm font-bold rounded-xl transition cursor-pointer">
            Cancel
          </button>
        )}
        <button type="button" onClick={submit} disabled={saving}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-black rounded-xl transition cursor-pointer">
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
};
