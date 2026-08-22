import React, { useState } from 'react';
import {
  ArrowLeft, Star, CheckCircle2, MessageCircle, ArrowRight,
  ChevronDown, ChevronUp, Shield, Zap, Globe, Clock,
  Minus, Plus, ShoppingCart, X, Upload, Send, Phone, User, Mail, Image,
} from 'lucide-react';
import { GroupTool } from '../data/groupBuyTools';
import { loadTools } from '../data/toolStore';
import { db } from '../admin/data/adminStore';
import { supabase } from '../lib/db';
import { notifyAdminAndOwner } from '../lib/notifications';

interface ToolDetailPageProps {
  slug: string;
  onNavigate: (path: string) => void;
}

const WA_BASE = 'https://wa.me/923275855578';

const DURATION_OPTIONS = [
  { label: '1 Month', months: 1, save: null },
  { label: '3 Months', months: 3, save: 7 },
  { label: '6 Months', months: 6, save: 10 },
  { label: '12 Months', months: 12, save: 17 },
];

/* ── Order Modal ── */
const OrderModal: React.FC<{
  tool: GroupTool;
  duration: number;
  quantity: number;
  totalPrice: number;
  onClose: () => void;
}> = ({ tool, duration, quantity, totalPrice, onClose }) => {
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [paymentMethod, setPaymentMethod] = useState<'whatsapp' | 'screenshot' | 'online'>('whatsapp');
  const [form, setForm] = useState({ name: '', phone: '', email: '', note: '' });
  const [ssFile, setSsFile] = useState<File | null>(null);
  const [ssPreview, setSsPreview] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const durationLabel = DURATION_OPTIONS.find(d => d.months === duration)?.label || '1 Month';

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.phone.trim()) e.phone = 'WhatsApp number is required';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (paymentMethod === 'screenshot' && !ssFile) e.ss = 'Please upload payment screenshot';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (isSubmitting) return;

    // WhatsApp — open WA directly, no admin save needed
    if (paymentMethod === 'whatsapp') {
      const msg = encodeURIComponent(
        `Hi AI TOOLZ MART!\n\n📦 *Order Details*\n• Tool: ${tool.name}\n• Duration: ${durationLabel}\n• Qty: ${quantity}\n• Total: Rs ${totalPrice.toLocaleString()}\n\n👤 *My Details*\n• Name: ${form.name}\n• Phone: ${form.phone}${form.email ? `\n• Email: ${form.email}` : ''}${form.note ? `\n• Note: ${form.note}` : ''}\n\nPlease confirm my order!`
      );
      window.open(`${WA_BASE}?text=${msg}`, '_blank');
      setStep('success');
      return;
    }

    // Pay First (screenshot) and Team Contact → save directly to Supabase
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const orderId   = 'ORD' + Date.now();
      const invoiceNo = 'INV-' + Date.now();
      const today     = new Date().toISOString().slice(0, 10);

      // Read screenshot as base64 if provided
      let screenshotData: string | null = null;
      if (paymentMethod === 'screenshot' && ssFile) {
        screenshotData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(ssFile);
        });
      }

      // Save order directly to Supabase (visible on all devices)
      const { error } = await supabase.from('orders').insert({
        id:              orderId,
        invoice_no:      invoiceNo,
        order_date:      today,
        customer_name:   form.name,
        customer_email:  form.email || '',
        customer_phone:  form.phone,
        customer_city:   '',
        whatsapp:        form.phone,
        tool:            tool.name,
        tool_id:         null,
        duration:        duration,
        quantity:        quantity,
        amount:          totalPrice,
        discount:        0,
        final_amount:    totalPrice,
        status:          'pending',
        payment_method:  paymentMethod,
        payment_status:  'pending',
        transaction_id:  '',
        notes:           form.note || '',
        admin_notes:     '',
        coupon_code:     '',
        sub_status:      'pending',
        activation_date: null,
        expiry_date:     null,
        days_left:       0,
        screenshot:      screenshotData,
      });

      if (error) {
        console.error('Supabase order insert error:', JSON.stringify(error));
        throw new Error(error.message || 'Order insert failed');
      }

      // Auto-create or update customer record (non-blocking — won't fail the order)
      try {
        const { data: existingCust } = await supabase.from('customers').select('id,total_orders,total_spend').eq('phone', form.phone).maybeSingle();
        if (existingCust) {
          await supabase.from('customers').update({ total_orders: (existingCust.total_orders||0)+1, total_spend: (existingCust.total_spend||0)+totalPrice }).eq('id', existingCust.id);
        } else {
          await supabase.from('customers').insert({ name: form.name, email: form.email||'', phone: form.phone, status: 'active', total_orders: 1, total_spend: totalPrice, join_date: today });
        }
      } catch { /* customer upsert failed silently — order already saved */ }

      // Notify admin (and the seller if this is a sub-customer)
      try {
        await notifyAdminAndOwner({
          title: '💰 New Order',
          message: form.name + ' ordered ' + tool.name + ' (' + durationLabel + ') via ' + (paymentMethod === 'screenshot' ? 'Pay First (SS)' : 'Team Contact') + ' — Rs ' + totalPrice.toLocaleString(),
          type: 'order',
          customerPhone: form.phone,
          customerEmail: form.email || null,
        });
      } catch { /* notification failed silently */ }

      setIsSubmitting(false);
      setStep('success');
    } catch (err: any) {
      console.error('Order error:', err);
      setIsSubmitting(false);
      const msg = err?.message || err?.toString() || 'Unknown error';
      setSubmitError('Error: ' + msg);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#1a1210] border border-[#3a2a26] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3a2a26]">
          <div className="flex items-center gap-3">
            <img src={tool.favicon} alt={tool.name} className="w-9 h-9 rounded-xl bg-white p-0.5" />
            <div>
              <h3 className="text-sm font-extrabold text-white">{tool.name}</h3>
              <p className="text-[11px] text-slate-400">{durationLabel} · Qty {quantity} · <span className="text-red-400 font-bold">Rs {totalPrice.toLocaleString()}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition cursor-pointer text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'details' && (
          <div className="p-6 space-y-5">
            <div>
              <h4 className="text-sm font-bold text-white mb-4">📋 Your Details</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="text" placeholder="Your full name"
                      value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition" />
                  </div>
                  {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">WhatsApp Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="tel" placeholder="+92 3XX XXXXXXX"
                      value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition" />
                  </div>
                  {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Email (optional)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input type="email" placeholder="your@email.com"
                      value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition" />
                  </div>
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Note (optional)</label>
                  <textarea placeholder="Any special requirements…"
                    value={form.note} onChange={e => setForm({...form, note: e.target.value})}
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition resize-none" />
                </div>
              </div>
            </div>

            <button onClick={() => setStep('payment')}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl transition shadow-lg shadow-red-900/30 cursor-pointer">
              Continue to Payment →
            </button>
          </div>
        )}

        {step === 'payment' && (
          <div className="p-6 space-y-5">
            <button onClick={() => setStep('details')} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>

            <h4 className="text-sm font-bold text-white">💳 Choose Payment Method</h4>

            {/* Method selector */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'whatsapp', label: 'WhatsApp', icon: '💬', sub: 'Order & pay via WA' },
                { id: 'screenshot', label: 'Pay First', icon: '📸', sub: 'Send payment SS' },
                { id: 'online', label: 'Team Contact', icon: '📞', sub: 'We send payment link' },
              ].map(m => (
                <button key={m.id} onClick={() => setPaymentMethod(m.id as any)}
                  className={`p-3 rounded-2xl text-center border transition cursor-pointer space-y-1 ${paymentMethod === m.id ? 'bg-red-600/20 border-red-500/60 text-red-300' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                  <div className="text-xl">{m.icon}</div>
                  <div className="text-xs font-bold text-white">{m.label}</div>
                  <div className="text-[10px] text-slate-400">{m.sub}</div>
                </button>
              ))}
            </div>

            {/* Payment details per method */}
            {paymentMethod === 'whatsapp' && (
              <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold text-emerald-400">✅ How it works</p>
                <p className="text-xs text-slate-300 leading-relaxed">Click "Confirm Order" and your order details will be sent to us on WhatsApp automatically. Our team will confirm and guide you through payment.</p>
                <div className="flex items-center gap-2 mt-2">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-white">+92327-5855578</span>
                </div>
              </div>
            )}

            {paymentMethod === 'screenshot' && (
              <div className="space-y-3">
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-bold text-blue-400">📋 Payment Accounts</p>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex justify-between"><span className="text-slate-400">EasyPaisa / JazzCash</span><span className="font-bold text-white">03XX-XXXXXXX</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Bank Transfer</span><span className="font-bold text-white">Contact on WA</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Binance / Crypto</span><span className="font-bold text-white">Contact on WA</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">PayPal</span><span className="font-bold text-white">Contact on WA</span></div>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-2 block">Upload Payment Screenshot *</label>
                  <label className="block w-full cursor-pointer">
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) { setSsFile(f); setSsPreview(URL.createObjectURL(f)); }
                      }} />
                    {ssPreview ? (
                      <div className="relative rounded-2xl overflow-hidden border border-red-500/30 h-36">
                        <img src={ssPreview} alt="SS" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                          <span className="text-xs text-white font-bold">Click to change</span>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-600 hover:border-red-500/50 rounded-2xl h-28 flex flex-col items-center justify-center gap-2 transition">
                        <Upload className="w-6 h-6 text-slate-500" />
                        <span className="text-xs text-slate-400">Click to upload screenshot</span>
                        <span className="text-[10px] text-slate-500">JPG, PNG up to 10MB</span>
                      </div>
                    )}
                  </label>
                  {errors.ss && <p className="text-xs text-red-400 mt-1">{errors.ss}</p>}
                </div>
                <p className="text-[11px] text-slate-400">After uploading, our team will verify and send you access credentials within 5 minutes on WhatsApp.</p>
              </div>
            )}

            {paymentMethod === 'online' && (
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold text-purple-400">📞 Team Contact Method</p>
                <p className="text-xs text-slate-300 leading-relaxed">Click "Confirm Order" and we'll reach out to you on the WhatsApp number you provided. Our team will send you a secure payment link or UPI QR within minutes.</p>
                <p className="text-[11px] text-slate-500 mt-2">Average response time: under 10 minutes</p>
              </div>
            )}

            {/* Order summary */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Order Summary</h5>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Tool</span><span className="text-white font-semibold">{tool.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Duration</span><span className="text-white">{durationLabel}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Quantity</span><span className="text-white">{quantity}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Customer</span><span className="text-white">{form.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">WhatsApp</span><span className="text-white">{form.phone}</span></div>
                <div className="border-t border-slate-800 pt-2 flex justify-between">
                  <span className="text-slate-300 font-bold">Total</span>
                  <span className="text-red-400 font-black text-sm">Rs {totalPrice.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {submitError && (
              <div className="bg-red-900/30 border border-red-500/40 rounded-xl px-4 py-3 text-xs text-red-300 text-center">
                ⚠️ {submitError}
              </div>
            )}
            <button onClick={handleSubmit} disabled={isSubmitting}
              className={`w-full py-3.5 text-white font-black text-sm rounded-xl transition shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 ${isSubmitting ? 'bg-red-800 cursor-not-allowed opacity-70' : 'bg-red-600 hover:bg-red-700 cursor-pointer'}`}>
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Submitting…' : paymentMethod === 'whatsapp' ? 'Confirm & Open WhatsApp' : paymentMethod === 'screenshot' ? 'Submit Order' : 'Request Payment Link'}
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-red-600/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-extrabold text-white">Order Received! 🎉</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Thank you <span className="text-white font-bold">{form.name}</span>! Your order for <span className="text-red-400 font-bold">{tool.name}</span> has been submitted. Our team will contact you on <span className="text-white font-bold">{form.phone}</span> within 5 minutes.
            </p>
            <div className="glow-card rounded-2xl p-4 space-y-2 text-left">
              <p className="text-xs font-bold text-slate-300">Order Details</p>
              <div className="text-xs text-slate-400 space-y-1">
                <p>• Tool: <span className="text-white">{tool.name}</span></p>
                <p>• Duration: <span className="text-white">{durationLabel}</span></p>
                <p>• Total: <span className="text-red-400 font-bold">Rs {totalPrice.toLocaleString()}</span></p>
              </div>
            </div>
            <div className="flex gap-3">
              <a href={`${WA_BASE}?text=${encodeURIComponent(`Hi AI TOOLZ MART! I just placed an order for ${tool.name}. My name is ${form.name}, number ${form.phone}.`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4" /> Follow up on WA
              </a>
              <button onClick={onClose}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition cursor-pointer">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════
   MAIN TOOL DETAIL PAGE
══════════════════════════════════ */
export const ToolDetailPage: React.FC<ToolDetailPageProps> = ({ slug, onNavigate }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const allTools = loadTools();
  const tool: GroupTool | undefined = allTools.find((t) => t.id === slug);

  if (!tool) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-6">
        <h1 className="text-3xl font-extrabold text-white">Tool Not Found</h1>
        <p className="text-slate-400">This tool doesn't exist or may have been removed.</p>
        <button onClick={() => onNavigate('/tools')}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition cursor-pointer">
          ← Browse All Tools
        </button>
      </div>
    );
  }

  const durOpt = DURATION_OPTIONS.find(d => d.months === selectedDuration)!;
  const discount = durOpt.save ? 1 - durOpt.save / 100 : 1;
  const unitPrice = Math.round(tool.price * selectedDuration * discount);
  const totalPrice = unitPrice * quantity;
  const waLink = `${WA_BASE}?text=${encodeURIComponent(`Hi AI TOOLZ MART, I want to buy ${tool.waText || tool.name}.`)}`;
  const suggested = [...allTools.filter(t => t.id !== tool.id && t.category === tool.category), ...allTools.filter(t => t.id !== tool.id && t.category !== tool.category)].slice(0, 4);

  return (
    <div className="pb-20">
      {/* Breadcrumb */}
      <div className="border-b border-[#3a2a26] bg-[#1a1210]/60 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-slate-400 uppercase tracking-widest font-semibold">
          <button onClick={() => onNavigate('/')} className="hover:text-white transition cursor-pointer">Home</button>
          <span>/</span>
          <button onClick={() => onNavigate('/tools')} className="hover:text-white transition cursor-pointer">Tools</button>
          <span>/</span>
          <span className="text-slate-500">{tool.category}</span>
          <span>/</span>
          <span className="text-white">{tool.name}</span>
        </div>
      </div>

      {/* ── MAIN PRODUCT SECTION ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

          {/* LEFT: Product Image Panel */}
          <div className="space-y-4">
            {/* Main image card */}
            <div className="relative glow-card rounded-3xl overflow-hidden">
              {/* Badges */}
              <div className="absolute top-4 left-4 z-10">
                <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">✓ In Stock</span>
              </div>
              <div className="absolute top-4 right-4 z-10">
                <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider">Best Price</span>
              </div>

              {/* Tool logo on dark bg */}
              <div className="h-72 sm:h-80 bg-gradient-to-br from-[#1a1210] via-[#231a18] to-[#1a1210] flex items-center justify-center p-10">
                <div className="bg-white rounded-3xl p-8 shadow-2xl">
                  <img src={tool.favicon} alt={tool.name}
                    className="w-28 h-28 object-contain rounded-2xl" />
                </div>
              </div>

              {/* Bottom badges row */}
              <div className="grid grid-cols-4 border-t border-[#3a2a26]">
                {[
                  { icon: <Zap className="w-4 h-4" />, label: 'Instant Delivery', sub: '5-min activation' },
                  { icon: <Shield className="w-4 h-4" />, label: 'Genuine Access', sub: 'Verified premium' },
                  { icon: <ArrowRight className="w-4 h-4" />, label: 'Easy Renewals', sub: 'One-click renewal' },
                  { icon: <Star className="w-4 h-4" />, label: 'Rated 4.9/5', sub: '10,000+ clients' },
                ].map((b) => (
                  <div key={b.label} className="py-4 text-center border-r border-[#3a2a26] last:border-r-0">
                    <div className="flex justify-center text-red-500 mb-1">{b.icon}</div>
                    <div className="text-[10px] font-extrabold text-white">{b.label}</div>
                    <div className="text-[9px] text-slate-500">{b.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature checklist */}
            {tool.features && (
              <div className="glow-card rounded-3xl p-5 space-y-3">
                <h3 className="text-sm font-extrabold text-white">What's Included</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tool.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-red-400 shrink-0" /> {f}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Product Info + Pricing + Actions */}
          <div className="space-y-5">
            {/* Category tag */}
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-red-600 text-white px-3 py-1.5 rounded-full">{tool.category}</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">{tool.name}</h1>

            {/* Stars + sold */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                <span className="text-sm font-bold text-white ml-1">{tool.rating}</span>
                <span className="text-xs text-slate-400 ml-1">(2,847 reviews)</span>
              </div>
              <span className="text-xs text-emerald-400 font-bold">✓ 12,500+ sold</span>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-400 leading-relaxed">{tool.fullDesc || tool.desc}</p>

            {/* Pricing card */}
            <div className="glow-card rounded-3xl p-5 space-y-4">
              {/* Price */}
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-black text-red-500">Rs {unitPrice.toLocaleString()}</span>
                  <span className="text-base text-slate-500 line-through">Rs {(tool.originalPrice * selectedDuration).toLocaleString()}</span>
                  <span className="text-xs font-extrabold text-red-400 bg-red-600/20 border border-red-500/30 px-2 py-0.5 rounded-full">
                    SAVE {tool.discount + (durOpt.save || 0)}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Inclusive of all charges · No hidden fees</p>
              </div>

              {/* Duration */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Duration</p>
                <div className="grid grid-cols-4 gap-2">
                  {DURATION_OPTIONS.map(opt => (
                    <button key={opt.months} onClick={() => setSelectedDuration(opt.months)}
                      className={`py-2.5 rounded-xl text-center transition cursor-pointer border ${selectedDuration === opt.months ? 'bg-red-600 border-red-600 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-red-500/50'}`}>
                      <div className="text-xs font-extrabold">{opt.label}</div>
                      {opt.save && <div className="text-[9px] text-red-300 font-bold">Save {opt.save}%</div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-center gap-4">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Quantity</p>
                <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-extrabold text-white w-4 text-center">{quantity}</span>
                  <button onClick={() => setQuantity(q => Math.min(10, q + 1))}
                    className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white cursor-pointer transition">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {quantity > 1 && (
                  <span className="text-xs text-slate-400">Total: <span className="text-red-400 font-bold">Rs {totalPrice.toLocaleString()}</span></span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button onClick={() => setShowModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-sm rounded-xl transition shadow-lg shadow-red-900/30 cursor-pointer">
                  <ShoppingCart className="w-4 h-4" /> Buy Now →
                </button>
                <a href={waLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-5 py-3.5 bg-[#1a1210] hover:bg-[#231a18] border border-[#3a2a26] hover:border-red-500/40 text-white font-bold text-sm rounded-xl transition">
                  <MessageCircle className="w-4 h-4 text-emerald-400" /> WhatsApp Order
                </a>
              </div>

              {/* Checklist */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-[#3a2a26]">
                {[
                  'Genuine premium subscription',
                  'Instant 5-min email delivery',
                  'Works on Windows, Mac & mobile',
                  'Chrome extension access',
                  '24/7 live WhatsApp support',
                  '80%+ savings vs official price',
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-red-400 shrink-0" /> {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Use cases */}
            {tool.useCases && (
              <div className="glow-card rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Perfect For</p>
                <div className="flex flex-wrap gap-2">
                  {tool.useCases.map((u, i) => (
                    <span key={i} className="text-xs bg-red-600/15 border border-red-500/20 text-red-300 px-3 py-1 rounded-full font-medium">{u}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-t border-[#3a2a26] py-12 px-4 sm:px-6 lg:px-8 bg-[#1a1210]/40">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-red-500">How It Works</span>
            <h2 className="text-2xl font-extrabold text-white">Get Access in 3 Simple Steps</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { n: '01', title: 'Place Your Order', desc: `Click "Buy Now", fill in your details and select a payment method.` },
              { n: '02', title: 'Complete Payment', desc: 'Pay via EasyPaisa, JazzCash, Binance, PayPal, bank transfer — your choice.' },
              { n: '03', title: 'Instant Access', desc: `Receive your ${tool.name} credentials within 5 minutes on WhatsApp or email.` },
            ].map((s) => (
              <div key={s.n} className="glow-card rounded-3xl p-6 space-y-3 text-center">
                <div className="text-4xl font-black text-red-500">{s.n}</div>
                <h3 className="text-sm font-extrabold text-white">{s.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      {tool.faqs && (
        <section className="py-12 px-4 sm:px-6 lg:px-8 border-t border-[#3a2a26]">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-red-500">FAQs</span>
              <h2 className="text-2xl font-extrabold text-white">Frequently Asked Questions</h2>
            </div>
            <div className="space-y-3">
              {[...tool.faqs,
                { q: 'What if the tool stops working?', a: 'Contact us on WhatsApp — we resolve issues within hours or provide a replacement.' },
                { q: 'What payment methods do you accept?', a: 'EasyPaisa, JazzCash, UPI, PayPal, Binance, bank transfer, and more.' },
              ].map((faq, i) => (
                <div key={i} className="glow-card rounded-2xl overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left cursor-pointer hover:bg-red-600/5 transition">
                    <span className="text-sm font-bold text-white pr-4">{faq.q}</span>
                    {openFaq === i ? <ChevronUp className="w-4 h-4 text-red-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-5 text-sm text-slate-400 leading-relaxed border-t border-[#3a2a26] pt-4">{faq.a}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── RELATED TOOLS ── */}
      {suggested.length > 0 && (
        <section className="py-12 px-4 sm:px-6 lg:px-8 border-t border-[#3a2a26]">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-red-500">You May Also Like</span>
                <h2 className="text-2xl font-extrabold text-white mt-1">Related Tools</h2>
              </div>
              <button onClick={() => onNavigate('/tools')}
                className="text-xs text-red-400 hover:text-red-300 font-bold transition cursor-pointer flex items-center gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {suggested.map((t) => (
                <div key={t.id} className="glow-card rounded-2xl p-5 flex flex-col gap-4 cursor-pointer group" onClick={() => onNavigate(`/tools/${t.id}`)}>
                  <div className="flex items-center gap-3">
                    <img src={t.favicon} alt={t.name} className="w-10 h-10 rounded-xl bg-white p-0.5" />
                    <div>
                      <span className="text-[10px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded">−{t.discount}%</span>
                      <h3 className="text-sm font-bold text-white group-hover:text-red-400 transition mt-0.5">{t.name}</h3>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed flex-1 line-clamp-2">{t.desc}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white">Rs {t.price.toLocaleString()}<span className="text-xs text-slate-500">/mo</span></span>
                    <button onClick={(e) => { e.stopPropagation(); onNavigate(`/tools/${t.id}`); }}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer">
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── BOTTOM CTA ── */}
      <section className="bg-gradient-to-r from-red-600 to-red-700 py-12 px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="text-2xl font-extrabold text-white">Ready to get {tool.name}?</h2>
          <p className="text-sm text-red-100">Instant access · 5-min delivery · 24/7 support</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-white text-red-600 font-black text-sm rounded-xl hover:bg-slate-100 transition shadow-lg flex items-center gap-2 cursor-pointer">
              <ShoppingCart className="w-4 h-4" /> Buy Now
            </button>
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="px-6 py-3 bg-red-700 hover:bg-red-800 border border-red-500 text-white font-bold text-sm rounded-xl transition flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> WhatsApp Order
            </a>
          </div>
        </div>
      </section>

      {/* Order Modal */}
      {showModal && (
        <OrderModal
          tool={tool}
          duration={selectedDuration}
          quantity={quantity}
          totalPrice={totalPrice}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};
