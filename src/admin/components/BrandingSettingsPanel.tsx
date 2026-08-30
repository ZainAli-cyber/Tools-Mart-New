import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, RotateCcw, Save } from 'lucide-react';
import {
  BRANDING_UPDATED_EVENT,
  DEFAULT_BRANDING,
  type BrandingSettings,
  normalizeBranding,
} from '../../lib/brandingSettings';
import { getBrandingSettingsApi, saveBrandingSettingsApi } from '../../lib/settingsApi';

type SlotKey = 'website' | 'app' | 'invoice' | 'invoiceFooter';

const SLOTS: {
  key: SlotKey;
  title: string;
  hint: string;
  urlKey: keyof BrandingSettings;
  heightKey: keyof BrandingSettings;
  defaultUrl: string;
}[] = [
  {
    key: 'website',
    title: 'Website logo',
    hint: 'Header, footer, and public pages. Default size matches the current site.',
    urlKey: 'websiteLogoUrl',
    heightKey: 'websiteLogoHeight',
    defaultUrl: DEFAULT_BRANDING.websiteLogoUrl,
  },
  {
    key: 'app',
    title: 'App internal logo',
    hint: 'Dashboard / mobile app chrome (not the Android launcher icon).',
    urlKey: 'appLogoUrl',
    heightKey: 'appLogoHeight',
    defaultUrl: DEFAULT_BRANDING.appLogoUrl,
  },
  {
    key: 'invoice',
    title: 'Invoice top logo',
    hint: 'Shown at the top of PDF / print invoices.',
    urlKey: 'invoiceLogoUrl',
    heightKey: 'invoiceLogoHeight',
    defaultUrl: DEFAULT_BRANDING.invoiceLogoUrl,
  },
  {
    key: 'invoiceFooter',
    title: 'Invoice footer logo',
    hint: 'Shown at the bottom of PDF / print invoices.',
    urlKey: 'invoiceFooterLogoUrl',
    heightKey: 'invoiceFooterLogoHeight',
    defaultUrl: DEFAULT_BRANDING.invoiceFooterLogoUrl,
  },
];

async function fileToDataUrl(file: File, maxEdge = 512): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
  if (!raw.startsWith('data:image/')) throw new Error('Please choose an image file');

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(raw);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(raw);
      }
    };
    img.onerror = () => reject(new Error('Invalid image'));
    img.src = raw;
  });
}

export const BrandingSettingsPanel: React.FC = () => {
  const [form, setForm] = useState<BrandingSettings>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [setupRequired, setSetupRequired] = useState(false);
  const fileRefs = useRef<Record<SlotKey, HTMLInputElement | null>>({
    website: null,
    app: null,
    invoice: null,
    invoiceFooter: null,
  });

  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getBrandingSettingsApi();
        if (!live) return;
        setForm(normalizeBranding(data.branding));
        setSetupRequired(Boolean(data.setupRequired));
      } catch (err: any) {
        if (!live) return;
        setForm(DEFAULT_BRANDING);
        setError(err?.message || 'Could not load branding');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const setUrl = (key: keyof BrandingSettings, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const setHeight = (key: keyof BrandingSettings, value: number) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const onPickFile = async (slot: SlotKey, file?: File | null) => {
    if (!file) return;
    setError('');
    try {
      const dataUrl = await fileToDataUrl(file);
      const slotDef = SLOTS.find(s => s.key === slot)!;
      setUrl(slotDef.urlKey, dataUrl);
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const result = await saveBrandingSettingsApi(form);
      const next = normalizeBranding(result.branding);
      setForm(next);
      window.dispatchEvent(new CustomEvent(BRANDING_UPDATED_EVENT, { detail: next }));
      setMessage('Branding saved — logos update across the site.');
    } catch (err: any) {
      const msg = err?.message || 'Could not save branding';
      setError(msg);
      if (/app_settings/i.test(msg)) setSetupRequired(true);
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    setForm(DEFAULT_BRANDING);
    setMessage('Defaults loaded — click Save Branding to apply.');
  };

  return (
    <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-white">Logos & sizes</h3>
          <p className="text-xs text-slate-400 mt-1">
            Change website, app, and invoice logos. Heights default to current site sizes.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={resetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#1a1210] border border-[#2a1e1c] text-slate-300 hover:text-white cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Defaults
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white disabled:opacity-60 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Branding'}
          </button>
        </div>
      </div>

      {setupRequired && (
        <div className="text-[11px] text-amber-200/90 bg-amber-950/30 border border-amber-500/25 rounded-xl px-3 py-2">
          Run <code className="text-amber-100">supabase_device_limits_toggle.sql</code> in Supabase so
          <code className="text-amber-100"> app_settings</code> exists, then save again.
        </div>
      )}
      {message && (
        <div className="text-[11px] text-emerald-300 bg-emerald-950/30 border border-emerald-500/25 rounded-xl px-3 py-2">
          {message}
        </div>
      )}
      {error && (
        <div className="text-[11px] text-red-300 bg-red-950/30 border border-red-500/25 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {SLOTS.map(slot => {
          const url = String(form[slot.urlKey] || '');
          const height = Number(form[slot.heightKey] || 40);
          return (
            <div key={slot.key} className="rounded-xl border border-[#2a1e1c] bg-[#0d0908] p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">{slot.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1">{slot.hint}</p>
                </div>
                <div className="rounded-lg bg-black/40 border border-[#2a1e1c] px-3 py-2 flex items-center justify-center min-w-[88px] min-h-[64px]">
                  <img
                    src={url || slot.defaultUrl}
                    alt=""
                    style={{ height, width: 'auto', maxWidth: 140 }}
                    className="object-contain"
                    onError={e => {
                      e.currentTarget.src = slot.defaultUrl;
                    }}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-[1fr_120px] gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Image URL or upload
                  </label>
                  <input
                    value={url.startsWith('data:') ? '' : url}
                    onChange={e => setUrl(slot.urlKey, e.target.value || slot.defaultUrl)}
                    placeholder={slot.defaultUrl}
                    className="w-full bg-[#1a1210] border border-[#2a1e1c] focus:border-red-500/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition"
                  />
                  {url.startsWith('data:') && (
                    <p className="text-[10px] text-emerald-400 mt-1">Custom upload loaded (saved as image data).</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    min={16}
                    max={160}
                    value={height}
                    onChange={e => setHeight(slot.heightKey, Number(e.target.value) || height)}
                    className="w-full bg-[#1a1210] border border-[#2a1e1c] focus:border-red-500/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  ref={el => {
                    fileRefs.current[slot.key] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => void onPickFile(slot.key, e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileRefs.current[slot.key]?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#1a1210] border border-[#2a1e1c] text-slate-300 hover:text-white cursor-pointer"
                >
                  <ImagePlus className="w-3.5 h-3.5" /> Upload image
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUrl(slot.urlKey, slot.defaultUrl);
                    setHeight(
                      slot.heightKey,
                      Number(DEFAULT_BRANDING[slot.heightKey]),
                    );
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-white cursor-pointer"
                >
                  Reset this logo
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
