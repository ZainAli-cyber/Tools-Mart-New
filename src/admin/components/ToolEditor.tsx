import React, { useState, useRef } from 'react';
import { X, Plus, Trash2, Upload, Globe, CheckCircle2, HelpCircle, Image as ImageIcon, Save, Eye } from 'lucide-react';
import { GroupTool } from '../../data/groupBuyTools';
import { nameToId, blankTool } from '../data/adminStore';
import { AdminBtn } from './AdminUI';

const CATEGORIES = ['SEO', 'Design', 'AI', 'Learning', 'Video', 'Audio', 'YouTube', 'AI Dev', 'Writing', 'Marketing', 'Productivity', 'E-commerce'];
const BADGES = ['', 'Best Seller', 'Popular', 'Trending', 'Hot Deal', 'New'];

interface ToolEditorProps {
  tool: GroupTool | null; // null = new tool
  onSave: (tool: GroupTool) => void;
  onClose: () => void;
  onPreview: (id: string) => void;
}

const Input: React.FC<{ label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string; err?: string }> =
  ({ label, value, onChange, type = 'text', placeholder, err }) => (
    <div>
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full bg-[#0d0908] border ${err ? 'border-red-500' : 'border-[#2a1e1c]'} focus:border-red-500/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition`} />
      {err && <p className="text-xs text-red-400 mt-1">{err}</p>}
    </div>
  );

const Textarea: React.FC<{ label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }> =
  ({ label, value, onChange, rows = 3, placeholder }) => (
    <div>
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="w-full bg-[#0d0908] border border-[#2a1e1c] focus:border-red-500/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition resize-none" />
    </div>
  );

export const ToolEditor: React.FC<ToolEditorProps> = ({ tool, onSave, onClose, onPreview }) => {
  const isNew = !tool;
  const [form, setForm] = useState<GroupTool>(tool ? { ...tool } : blankTool());
  const [faviconMode, setFaviconMode] = useState<'domain' | 'url' | 'upload'>('domain');
  const [domainInput, setDomainInput] = useState('');
  const [uploadedImg, setUploadedImg] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'basic' | 'details' | 'faqs'>('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof GroupTool, val: any) => setForm(prev => ({ ...prev, [key]: val }));

  const applyDomain = () => {
    const d = domainInput.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (d) set('favicon', `https://www.google.com/s2/favicons?sz=128&domain=${d}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setUploadedImg(dataUrl);
      set('favicon', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Tool name is required';
    if (!form.price || form.price <= 0) e.price = 'Price must be > 0';
    if (!form.desc?.trim()) e.desc = 'Short description is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const finalTool: GroupTool = {
      ...form,
      id: form.id || nameToId(form.name),
      waText: form.waText || form.name,
      originalPrice: form.originalPrice || form.price * 5,
      discount: form.discount || 80,
      rating: form.rating || 4.9,
      showOnHome: form.showOnHome !== false,
    };
    onSave(finalTool);
  };

  const addFeature = () => set('features', [...(form.features || []), '']);
  const updateFeature = (i: number, v: string) => set('features', (form.features || []).map((f, idx) => idx === i ? v : f));
  const removeFeature = (i: number) => set('features', (form.features || []).filter((_, idx) => idx !== i));

  const addUseCase = () => set('useCases', [...(form.useCases || []), '']);
  const updateUseCase = (i: number, v: string) => set('useCases', (form.useCases || []).map((u, idx) => idx === i ? v : u));
  const removeUseCase = (i: number) => set('useCases', (form.useCases || []).filter((_, idx) => idx !== i));

  const addFaq = () => set('faqs', [...(form.faqs || []), { q: '', a: '' }]);
  const updateFaq = (i: number, field: 'q' | 'a', v: string) => set('faqs', (form.faqs || []).map((f, idx) => idx === i ? { ...f, [field]: v } : f));
  const removeFaq = (i: number) => set('faqs', (form.faqs || []).filter((_, idx) => idx !== i));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-2 sm:px-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl bg-[#0d0908] border border-[#3a2a26] rounded-3xl shadow-2xl flex flex-col max-h-[95vh]"
        style={{ boxShadow: '0 0 60px rgba(204,26,26,0.15)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a1e1c] shrink-0">
          <div className="flex items-center gap-3">
            {form.favicon && <img src={form.favicon} alt="" className="w-8 h-8 rounded-xl bg-white p-0.5" onError={e => (e.currentTarget.style.display='none')} />}
            <div>
              <h2 className="text-sm font-extrabold text-white">{isNew ? '+ Add New Tool' : `Edit: ${form.name}`}</h2>
              <p className="text-[10px] text-slate-500">Changes save to live site instantly</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              <button onClick={() => onPreview(form.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1210] border border-[#3a2a26] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer">
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-[#1a1210] rounded-xl text-slate-400 hover:text-white cursor-pointer transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#2a1e1c] shrink-0 px-5">
          {[['basic','Basic Info'], ['details','Features & Use Cases'], ['faqs','FAQs']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id as any)}
              className={`px-4 py-3 text-xs font-bold transition cursor-pointer border-b-2 ${activeTab===id ? 'border-red-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* ── BASIC TAB ── */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              {/* Logo/Image */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Tool Logo / Image</label>
                {/* Mode toggle */}
                <div className="flex gap-2 mb-3">
                  {[['domain','🌐 Domain'], ['url','🔗 URL'], ['upload','📁 Upload']].map(([mode, label]) => (
                    <button key={mode} onClick={() => setFaviconMode(mode as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${faviconMode===mode ? 'bg-red-600 text-white' : 'bg-[#1a1210] border border-[#2a1e1c] text-slate-400 hover:text-white'}`}>
                      {label}
                    </button>
                  ))}
                </div>

                {faviconMode === 'domain' && (
                  <div className="flex gap-2">
                    <input value={domainInput} onChange={e => setDomainInput(e.target.value)} placeholder="e.g. semrush.com, canva.com"
                      className="flex-1 bg-[#0d0908] border border-[#2a1e1c] focus:border-red-500/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition" />
                    <button onClick={applyDomain} className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer transition">
                      Apply
                    </button>
                  </div>
                )}
                {faviconMode === 'url' && (
                  <input value={form.favicon} onChange={e => set('favicon', e.target.value)} placeholder="https://example.com/logo.png"
                    className="w-full bg-[#0d0908] border border-[#2a1e1c] focus:border-red-500/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none transition" />
                )}
                {faviconMode === 'upload' && (
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    <button onClick={() => fileRef.current?.click()}
                      className="w-full border-2 border-dashed border-[#3a2a26] hover:border-red-500/40 rounded-2xl h-24 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-300 transition cursor-pointer">
                      <Upload className="w-5 h-5" />
                      <span className="text-xs">Click to upload image (PNG, JPG, SVG)</span>
                    </button>
                  </div>
                )}

                {/* Preview */}
                {form.favicon && (
                  <div className="mt-3 flex items-center gap-3 bg-[#1a1210] border border-[#2a1e1c] rounded-xl p-3">
                    <img src={form.favicon} alt="logo preview" className="w-12 h-12 rounded-xl bg-white p-0.5 object-contain"
                      onError={e => (e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="%23cc1a1a" rx="8"/><text x="50%" y="55%" text-anchor="middle" fill="white" font-size="20" font-family="Arial">?</text></svg>')} />
                    <div>
                      <div className="text-xs font-semibold text-white">{form.name || 'Tool Name'}</div>
                      <div className="text-[10px] text-slate-500">Logo preview</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Name + Category row */}
              <div className="grid grid-cols-2 gap-4">
                <Input label="Tool Name *" value={form.name} onChange={v => { set('name', v); if (!form.id || isNew) set('id', nameToId(v)); }} placeholder="e.g. Semrush" err={errors.name} />
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Category *</label>
                  <select value={form.category} onChange={e => set('category', e.target.value)}
                    className="w-full bg-[#0d0908] border border-[#2a1e1c] focus:border-red-500/60 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Pricing row */}
              <div className="grid grid-cols-3 gap-4">
                <Input label="Price (Rs/mo) *" value={form.price} onChange={v => set('price', Number(v))} type="number" placeholder="556" err={errors.price} />
                <Input label="Original Price (Rs)" value={form.originalPrice} onChange={v => set('originalPrice', Number(v))} type="number" placeholder="2780" />
                <Input label="Discount %" value={form.discount} onChange={v => set('discount', Number(v))} type="number" placeholder="80" />
              </div>

              {/* Type flags */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!form.isPrivate} onChange={e => { set('isPrivate', e.target.checked); if (e.target.checked) set('isSemiPrivate', false); }}
                    className="w-4 h-4 accent-red-500" />
                  <span className="text-xs text-slate-300 font-semibold">Private Tool</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!form.isSemiPrivate} onChange={e => { set('isSemiPrivate', e.target.checked); if (e.target.checked) set('isPrivate', false); }}
                    className="w-4 h-4 accent-red-500" />
                  <span className="text-xs text-slate-300 font-semibold">Semi-Private</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer" title="Uncheck to hide this tool from the public homepage only. Still shown on shop, dashboard, and admin.">
                  <input type="checkbox" checked={form.showOnHome !== false} onChange={e => set('showOnHome', e.target.checked)}
                    className="w-4 h-4 accent-red-500" />
                  <span className="text-xs text-slate-300 font-semibold">Show on homepage</span>
                </label>
              </div>

              {/* Badge */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Badge</label>
                <div className="flex flex-wrap gap-2">
                  {BADGES.map(b => (
                    <button key={b} onClick={() => set('badge' as any, b || undefined)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${(form as any).badge===b||(!(form as any).badge&&b==='') ? 'bg-red-600 text-white' : 'bg-[#1a1210] border border-[#2a1e1c] text-slate-400 hover:text-white'}`}>
                      {b || 'None'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descriptions */}
              <Textarea label="Short Description *" value={form.desc || ''} onChange={v => set('desc', v)} rows={2} placeholder="One-line description shown in cards…" />
              {errors.desc && <p className="text-xs text-red-400 -mt-3">{errors.desc}</p>}
              <Textarea label="Full Description" value={form.fullDesc || ''} onChange={v => set('fullDesc', v)} rows={4} placeholder="Detailed description shown on the tool detail page…" />
              <Input label="WhatsApp Order Text" value={form.waText || ''} onChange={v => set('waText', v)} placeholder="e.g. Semrush Group Buy" />

              {/* Page URL preview */}
              {form.id && (
                <div className="bg-[#1a1210] border border-[#2a1e1c] rounded-xl px-3 py-2.5 text-xs text-slate-400">
                  🔗 Tool page will be at: <span className="text-red-400 font-bold">/tools/{form.id || nameToId(form.name)}</span>
                </div>
              )}
            </div>
          )}

          {/* ── DETAILS TAB ── */}
          {activeTab === 'details' && (
            <div className="space-y-5">
              {/* Features */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Key Features</label>
                  <button onClick={addFeature} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 cursor-pointer font-semibold transition">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {(form.features || []).map((f, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0" />
                      <input value={f} onChange={e => updateFeature(i, e.target.value)} placeholder={`Feature ${i+1}`}
                        className="flex-1 bg-[#0d0908] border border-[#2a1e1c] focus:border-red-500/60 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none transition" />
                      <button onClick={() => removeFeature(i)} className="p-1.5 hover:bg-red-600/10 rounded-xl text-slate-600 hover:text-red-400 transition cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {(!form.features || form.features.length === 0) && (
                    <button onClick={addFeature} className="w-full border-dashed border border-[#2a1e1c] rounded-xl py-4 text-xs text-slate-600 hover:text-slate-400 transition cursor-pointer">
                      + Click to add first feature
                    </button>
                  )}
                </div>
              </div>

              {/* Use Cases */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Use Cases / Perfect For</label>
                  <button onClick={addUseCase} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 cursor-pointer font-semibold transition">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {(form.useCases || []).map((u, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Globe className="w-4 h-4 text-red-400 shrink-0" />
                      <input value={u} onChange={e => updateUseCase(i, e.target.value)} placeholder={`Use case ${i+1}`}
                        className="flex-1 bg-[#0d0908] border border-[#2a1e1c] focus:border-red-500/60 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none transition" />
                      <button onClick={() => removeUseCase(i)} className="p-1.5 hover:bg-red-600/10 rounded-xl text-slate-600 hover:text-red-400 transition cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {(!form.useCases || form.useCases.length === 0) && (
                    <button onClick={addUseCase} className="w-full border-dashed border border-[#2a1e1c] rounded-xl py-4 text-xs text-slate-600 hover:text-slate-400 transition cursor-pointer">
                      + Click to add first use case
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── FAQS TAB ── */}
          {activeTab === 'faqs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">FAQs</label>
                <button onClick={addFaq} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 cursor-pointer font-semibold transition">
                  <Plus className="w-3.5 h-3.5" /> Add FAQ
                </button>
              </div>
              {(form.faqs || []).map((faq, i) => (
                <div key={i} className="bg-[#1a1210] border border-[#2a1e1c] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                      <HelpCircle className="w-3.5 h-3.5 text-red-400" /> FAQ {i+1}
                    </div>
                    <button onClick={() => removeFaq(i)} className="p-1 hover:bg-red-600/10 rounded text-slate-600 hover:text-red-400 transition cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input value={faq.q} onChange={e => updateFaq(i, 'q', e.target.value)} placeholder="Question…"
                    className="w-full bg-[#0d0908] border border-[#2a1e1c] focus:border-red-500/60 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none transition" />
                  <textarea value={faq.a} onChange={e => updateFaq(i, 'a', e.target.value)} placeholder="Answer…" rows={2}
                    className="w-full bg-[#0d0908] border border-[#2a1e1c] focus:border-red-500/60 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none transition resize-none" />
                </div>
              ))}
              {(!form.faqs || form.faqs.length === 0) && (
                <button onClick={addFaq} className="w-full border-dashed border border-[#2a1e1c] rounded-xl py-6 text-xs text-slate-600 hover:text-slate-400 transition cursor-pointer">
                  + Click to add first FAQ
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#2a1e1c] shrink-0 bg-[#0d0908]">
          <button onClick={onClose} className="px-4 py-2 bg-[#1a1210] border border-[#2a1e1c] text-slate-400 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl transition shadow-lg shadow-red-900/30 cursor-pointer">
            <Save className="w-4 h-4" /> {isNew ? 'Add Tool to Site' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
