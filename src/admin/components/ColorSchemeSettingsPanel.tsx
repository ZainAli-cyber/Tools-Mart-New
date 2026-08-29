import React, { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import {
  COLOR_SCHEME_UPDATED_EVENT,
  DEFAULT_COLOR_SCHEME,
  DEFAULT_DARK_PALETTE,
  DEFAULT_LIGHT_PALETTE,
  type ColorSchemeSettings,
  type ThemePalette,
  buildCardGradient,
  buildPageGradient,
  normalizeColorScheme,
} from '../../lib/colorSchemeSettings';
import { getColorSchemeSettingsApi, saveColorSchemeSettingsApi } from '../../lib/settingsApi';

type Mode = 'dark' | 'light';

type ColorField = {
  key: keyof ThemePalette;
  label: string;
  kind?: 'color' | 'angle' | 'toggle';
};

const BRAND_FIELDS: ColorField[] = [
  { key: 'brand', label: 'Brand primary' },
  { key: 'brandDark', label: 'Brand dark' },
  { key: 'brandLight', label: 'Brand light' },
  { key: 'brandGlow', label: 'Brand glow' },
  { key: 'gold', label: 'Accent / gold' },
  { key: 'goldStrong', label: 'Accent strong' },
  { key: 'goldDark', label: 'Accent dark' },
  { key: 'premiumBorder', label: 'Premium border' },
];

const SURFACE_FIELDS: ColorField[] = [
  { key: 'bgPage', label: 'Page background' },
  { key: 'bgSecondary', label: 'Secondary / surface' },
  { key: 'bgCard', label: 'Card' },
  { key: 'bgCardAlt', label: 'Card alt' },
  { key: 'bgElevated', label: 'Elevated' },
  { key: 'bgInput', label: 'Input / sidebar' },
  { key: 'border', label: 'Border' },
  { key: 'borderSubtle', label: 'Border subtle' },
  { key: 'textPrimary', label: 'Text primary' },
  { key: 'textMuted', label: 'Text muted' },
  { key: 'textFaint', label: 'Text faint' },
];

const BUTTON_FIELDS: ColorField[] = [
  { key: 'btnPrimaryBg', label: 'Primary button BG' },
  { key: 'btnPrimaryText', label: 'Primary button text' },
  { key: 'btnPrimaryHover', label: 'Primary button hover' },
  { key: 'btnSecondaryBg', label: 'Secondary button BG' },
  { key: 'btnSecondaryText', label: 'Secondary button text' },
  { key: 'btnSecondaryBorder', label: 'Secondary button border' },
  { key: 'success', label: 'Success' },
  { key: 'warning', label: 'Warning' },
];

const GRADIENT_FIELDS: ColorField[] = [
  { key: 'pageGradientEnabled', label: 'Enable page gradient', kind: 'toggle' },
  { key: 'pageGradientFrom', label: 'Page gradient from' },
  { key: 'pageGradientTo', label: 'Page gradient to' },
  { key: 'pageGradientAngle', label: 'Page gradient angle', kind: 'angle' },
  { key: 'cardGradientFrom', label: 'Card gradient from' },
  { key: 'cardGradientMid', label: 'Card gradient mid' },
  { key: 'cardGradientTo', label: 'Card gradient to' },
  { key: 'cardGradientHoverFrom', label: 'Card hover from' },
  { key: 'cardGradientHoverTo', label: 'Card hover to' },
  { key: 'heroGlowFrom', label: 'Glow accent from' },
  { key: 'heroGlowTo', label: 'Glow accent to' },
];

function toPickerValue(color: string): string {
  const s = String(color || '').trim();
  if (/^#([0-9a-f]{6})$/i.test(s)) return s;
  if (/^#([0-9a-f]{3})$/i.test(s)) {
    const r = s[1], g = s[2], b = s[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return '#5D0808';
}

const ColorRow: React.FC<{
  field: ColorField;
  value: string | number | boolean;
  onChange: (v: string | number | boolean) => void;
}> = ({ field, value, onChange }) => {
  if (field.kind === 'toggle') {
    const on = Boolean(value);
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#2a1e1c] bg-[#0d0908] px-3 py-2.5">
        <span className="text-xs font-bold text-slate-300">{field.label}</span>
        <button
          type="button"
          onClick={() => onChange(!on)}
          className="cursor-pointer text-[10px] font-black px-3 py-1.5 rounded-lg border transition"
          style={
            on
              ? { background: '#dc262622', color: '#f87171', borderColor: '#dc262644' }
              : { background: '#1a1210', color: '#666', borderColor: '#2a1e1c' }
          }
        >
          {on ? 'ON' : 'OFF'}
        </button>
      </div>
    );
  }

  if (field.kind === 'angle') {
    return (
      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
          {field.label}
        </label>
        <input
          type="number"
          min={0}
          max={360}
          value={Number(value) || 0}
          onChange={e => onChange(Number(e.target.value) || 0)}
          className="w-full bg-[#1a1210] border border-[#2a1e1c] focus:border-red-500/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition"
        />
      </div>
    );
  }

  const str = String(value || '');
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
        {field.label}
      </label>
      <div className="flex gap-2">
        <input
          type="color"
          value={toPickerValue(str)}
          onChange={e => onChange(e.target.value)}
          className="h-10 w-12 rounded-lg border border-[#2a1e1c] bg-[#1a1210] cursor-pointer p-1"
          title={field.label}
        />
        <input
          value={str}
          onChange={e => onChange(e.target.value)}
          placeholder="#5D0808"
          className="flex-1 bg-[#1a1210] border border-[#2a1e1c] focus:border-red-500/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none transition font-mono"
        />
      </div>
    </div>
  );
};

const FieldGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-xl border border-[#2a1e1c] bg-[#0d0908] p-4 space-y-3">
    <h4 className="text-xs font-black text-white uppercase tracking-wider">{title}</h4>
    <div className="grid sm:grid-cols-2 gap-3">{children}</div>
  </div>
);

export const ColorSchemeSettingsPanel: React.FC = () => {
  const [mode, setMode] = useState<Mode>('dark');
  const [form, setForm] = useState<ColorSchemeSettings>(DEFAULT_COLOR_SCHEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true);
      try {
        const data = await getColorSchemeSettingsApi();
        if (!live) return;
        setForm(normalizeColorScheme(data.scheme));
        setSetupRequired(Boolean(data.setupRequired));
      } catch (err: any) {
        if (!live) return;
        setForm(DEFAULT_COLOR_SCHEME);
        setError(err?.message || 'Could not load colors');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const palette = form[mode];

  const setField = (key: keyof ThemePalette, value: string | number | boolean) => {
    setForm(prev => ({
      ...prev,
      [mode]: { ...prev[mode], [key]: value },
    }));
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const result = await saveColorSchemeSettingsApi(form);
      const next = normalizeColorScheme(result.scheme);
      setForm(next);
      window.dispatchEvent(new CustomEvent(COLOR_SCHEME_UPDATED_EVENT, { detail: next }));
      setMessage('Color scheme saved — website updates immediately.');
    } catch (err: any) {
      const msg = err?.message || 'Could not save colors';
      setError(msg);
      if (/app_settings/i.test(msg)) setSetupRequired(true);
    } finally {
      setSaving(false);
    }
  };

  const resetMode = () => {
    setForm(prev => ({
      ...prev,
      [mode]: mode === 'dark' ? DEFAULT_DARK_PALETTE : DEFAULT_LIGHT_PALETTE,
    }));
    setMessage(`${mode} defaults loaded — click Save Colors to apply.`);
  };

  const resetAll = () => {
    setForm(DEFAULT_COLOR_SCHEME);
    setMessage('All color defaults loaded — click Save Colors to apply.');
  };

  return (
    <div className="bg-[#130d0d] border border-[#2a1e1c] rounded-2xl p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-white">Brand colors & gradients</h3>
          <p className="text-xs text-slate-400 mt-1">
            Control the full website color scheme for dark and light modes. Defaults match the current live theme.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={resetMode}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#1a1210] border border-[#2a1e1c] text-slate-300 hover:text-white cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset {mode}
          </button>
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#1a1210] border border-[#2a1e1c] text-slate-300 hover:text-white cursor-pointer"
          >
            Reset all
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white disabled:opacity-60 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Colors'}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {(['dark', 'light'] as Mode[]).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
              mode === m
                ? 'bg-red-600 text-white'
                : 'bg-[#1a1210] border border-[#2a1e1c] text-slate-400 hover:text-white'
            }`}
          >
            {m} mode
          </button>
        ))}
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

      {/* Live preview */}
      <div
        className="rounded-2xl border p-4 space-y-3"
        style={{
          background: buildPageGradient(palette) === 'none' ? palette.bgPage : buildPageGradient(palette),
          borderColor: palette.borderSubtle,
          color: palette.textPrimary,
        }}
      >
        <div className="text-[10px] font-black uppercase tracking-wider opacity-70">Preview ({mode})</div>
        <div
          className="rounded-xl p-4 border"
          style={{
            background: buildCardGradient(palette),
            borderColor: palette.border,
          }}
        >
          <div className="text-sm font-bold" style={{ color: palette.textPrimary }}>
            Sample card
          </div>
          <p className="text-xs mt-1" style={{ color: palette.textMuted }}>
            Brand and gradient preview using your current picks.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
              style={{ background: palette.btnPrimaryBg, color: palette.btnPrimaryText }}
            >
              Primary CTA
            </span>
            <span
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border"
              style={{
                background: palette.btnSecondaryBg,
                color: palette.btnSecondaryText,
                borderColor: palette.btnSecondaryBorder,
              }}
            >
              Secondary
            </span>
            <span className="px-3 py-1.5 rounded-lg text-[11px] font-bold" style={{ color: palette.gold }}>
              Accent text
            </span>
          </div>
        </div>
      </div>

      <FieldGroup title="Brand">
        {BRAND_FIELDS.map(f => (
          <ColorRow
            key={f.key}
            field={f}
            value={palette[f.key]}
            onChange={v => setField(f.key, v)}
          />
        ))}
      </FieldGroup>

      <FieldGroup title="Surfaces & text">
        {SURFACE_FIELDS.map(f => (
          <ColorRow
            key={f.key}
            field={f}
            value={palette[f.key]}
            onChange={v => setField(f.key, v)}
          />
        ))}
      </FieldGroup>

      <FieldGroup title="Buttons & status">
        {BUTTON_FIELDS.map(f => (
          <ColorRow
            key={f.key}
            field={f}
            value={palette[f.key]}
            onChange={v => setField(f.key, v)}
          />
        ))}
      </FieldGroup>

      <FieldGroup title="Gradients">
        {GRADIENT_FIELDS.map(f => (
          <ColorRow
            key={f.key}
            field={f}
            value={palette[f.key]}
            onChange={v => setField(f.key, v)}
          />
        ))}
      </FieldGroup>
    </div>
  );
};
