import { createPrivilegedSupabase } from './db';

export const COLOR_SCHEME_KEY = 'branding_colors';
export const COLOR_SCHEME_UPDATED_EVENT = 'zynex-color-scheme-updated';

export type ThemePalette = {
  bgPage: string;
  bgSecondary: string;
  bgCard: string;
  bgCardAlt: string;
  bgElevated: string;
  bgInput: string;
  border: string;
  borderLight: string;
  borderSubtle: string;
  textPrimary: string;
  textMuted: string;
  textFaint: string;
  brand: string;
  brandDark: string;
  brandLight: string;
  brandGlow: string;
  gold: string;
  goldStrong: string;
  goldDark: string;
  goldHover: string;
  premiumBorder: string;
  btnPrimaryBg: string;
  btnPrimaryText: string;
  btnPrimaryHover: string;
  btnSecondaryBg: string;
  btnSecondaryHover: string;
  btnSecondaryBorder: string;
  btnSecondaryText: string;
  success: string;
  warning: string;
  tipAmber: string;
  pageGradientEnabled: boolean;
  pageGradientFrom: string;
  pageGradientTo: string;
  pageGradientAngle: number;
  cardGradientFrom: string;
  cardGradientMid: string;
  cardGradientTo: string;
  cardGradientHoverFrom: string;
  cardGradientHoverTo: string;
  heroGlowFrom: string;
  heroGlowTo: string;
};

export type ColorSchemeSettings = {
  dark: ThemePalette;
  light: ThemePalette;
};

/** Current live dark palette from index.css */
export const DEFAULT_DARK_PALETTE: ThemePalette = {
  bgPage: '#120405',
  bgSecondary: '#090303',
  bgCard: '#24090B',
  bgCardAlt: '#351012',
  bgElevated: '#24090B',
  bgInput: '#090303',
  border: '#6F2626',
  borderLight: '#C69B47',
  borderSubtle: '#351012',
  textPrimary: '#FFF8EE',
  textMuted: '#D6CDD0',
  textFaint: '#95898B',
  brand: '#5D0808',
  brandDark: '#351012',
  brandLight: '#6F2626',
  brandGlow: 'rgba(93, 8, 8, 0.28)',
  gold: '#F6D890',
  goldStrong: '#D9B85F',
  goldDark: '#B98A35',
  goldHover: '#E2BF6B',
  premiumBorder: '#C69B47',
  btnPrimaryBg: '#F6D890',
  btnPrimaryText: '#5D0808',
  btnPrimaryHover: '#E2BF6B',
  btnSecondaryBg: '#24090B',
  btnSecondaryHover: '#351012',
  btnSecondaryBorder: '#6F2626',
  btnSecondaryText: '#F6D890',
  success: '#19B978',
  warning: '#F4C542',
  tipAmber: '#F6D890',
  pageGradientEnabled: false,
  pageGradientFrom: '#120405',
  pageGradientTo: '#090303',
  pageGradientAngle: 160,
  cardGradientFrom: '#24090B',
  cardGradientMid: '#1a0608',
  cardGradientTo: '#120405',
  cardGradientHoverFrom: '#351012',
  cardGradientHoverTo: '#24090B',
  heroGlowFrom: 'rgba(246, 216, 144, 0.12)',
  heroGlowTo: 'rgba(93, 8, 8, 0.28)',
};

/** Current live light palette from index.css */
export const DEFAULT_LIGHT_PALETTE: ThemePalette = {
  bgPage: '#FFF8EE',
  bgSecondary: '#ffffff',
  bgCard: '#ffffff',
  bgCardAlt: '#F7EFE6',
  bgElevated: '#F7EFE6',
  bgInput: '#FFF8EE',
  border: '#D6CDD0',
  borderLight: '#B98A35',
  borderSubtle: '#E8DFD6',
  textPrimary: '#120405',
  textMuted: '#5D0808',
  textFaint: '#95898B',
  brand: '#5D0808',
  brandDark: '#351012',
  brandLight: '#6F2626',
  brandGlow: 'rgba(93, 8, 8, 0.12)',
  gold: '#D9B85F',
  goldStrong: '#B98A35',
  goldDark: '#B98A35',
  goldHover: '#C69B47',
  premiumBorder: '#C69B47',
  btnPrimaryBg: '#5D0808',
  btnPrimaryText: '#FFF8EE',
  btnPrimaryHover: '#351012',
  btnSecondaryBg: 'rgba(93, 8, 8, 0.08)',
  btnSecondaryHover: 'rgba(93, 8, 8, 0.14)',
  btnSecondaryBorder: 'rgba(93, 8, 8, 0.45)',
  btnSecondaryText: '#5D0808',
  success: '#19B978',
  warning: '#F4C542',
  tipAmber: '#B98A35',
  pageGradientEnabled: false,
  pageGradientFrom: '#FFF8EE',
  pageGradientTo: '#F7EFE6',
  pageGradientAngle: 160,
  cardGradientFrom: '#FFF8EE',
  cardGradientMid: '#ffffff',
  cardGradientTo: '#F7EFE6',
  cardGradientHoverFrom: '#F7EFE6',
  cardGradientHoverTo: '#FFF8EE',
  heroGlowFrom: 'rgba(93, 8, 8, 0.08)',
  heroGlowTo: 'rgba(185, 138, 53, 0.08)',
};

export const DEFAULT_COLOR_SCHEME: ColorSchemeSettings = {
  dark: DEFAULT_DARK_PALETTE,
  light: DEFAULT_LIGHT_PALETTE,
};

const CACHE_MS = 20_000;
let cache: { value: ColorSchemeSettings; at: number; setupRequired?: boolean } | null = null;

function serviceClient() {
  return createPrivilegedSupabase();
}

function isAppSettingsMissing(message?: string) {
  return /app_settings|does not exist|schema cache|Could not find the table/i.test(String(message || ''));
}

function asColor(raw: unknown, fallback: string): string {
  const s = String(raw || '').trim();
  if (!s) return fallback;
  if (
    /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s) ||
    /^rgba?\(/i.test(s) ||
    /^hsla?\(/i.test(s)
  ) {
    return s;
  }
  return fallback;
}

function asBool(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') {
    const v = raw.trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
    if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
  }
  return fallback;
}

function asAngle(raw: unknown, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(360, Math.round(n)));
}

export function normalizePalette(
  input: Partial<ThemePalette> | null | undefined,
  fallback: ThemePalette,
): ThemePalette {
  const src = input && typeof input === 'object' ? input : {};
  const out = { ...fallback };
  (Object.keys(fallback) as (keyof ThemePalette)[]).forEach(key => {
    if (key === 'pageGradientEnabled') {
      out[key] = asBool(src[key], fallback[key]);
      return;
    }
    if (key === 'pageGradientAngle') {
      out[key] = asAngle(src[key], fallback[key]);
      return;
    }
    out[key] = asColor(src[key], String(fallback[key])) as never;
  });
  return out;
}

export function normalizeColorScheme(input?: Partial<ColorSchemeSettings> | null): ColorSchemeSettings {
  const src = input && typeof input === 'object' ? input : {};
  return {
    dark: normalizePalette(src.dark, DEFAULT_DARK_PALETTE),
    light: normalizePalette(src.light, DEFAULT_LIGHT_PALETTE),
  };
}

function parseStored(value: unknown): Partial<ColorSchemeSettings> | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Partial<ColorSchemeSettings>;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') return value as Partial<ColorSchemeSettings>;
  return null;
}

export function buildPageGradient(p: ThemePalette): string {
  if (!p.pageGradientEnabled) return 'none';
  return `linear-gradient(${p.pageGradientAngle}deg, ${p.pageGradientFrom} 0%, ${p.pageGradientTo} 100%)`;
}

export function buildCardGradient(p: ThemePalette): string {
  return `linear-gradient(145deg, ${p.cardGradientFrom} 0%, ${p.cardGradientMid} 40%, ${p.cardGradientTo} 70%, ${p.cardGradientFrom} 100%)`;
}

export function buildCardGradientHover(p: ThemePalette): string {
  return `linear-gradient(145deg, ${p.cardGradientHoverFrom} 0%, ${p.cardGradientHoverTo} 40%, ${p.cardGradientMid} 70%, ${p.cardGradientHoverFrom} 100%)`;
}

function paletteToCssVars(p: ThemePalette): string {
  const pageGrad = buildPageGradient(p);
  return [
    `--bg-primary:${p.bgPage}`,
    `--bg-secondary:${p.bgSecondary}`,
    `--bg-card:${p.bgCard}`,
    `--bg-card-alt:${p.bgCardAlt}`,
    `--bg-surface:${p.bgSecondary}`,
    `--bg-input:${p.bgInput}`,
    `--bg-elevated:${p.bgElevated}`,
    `--bg-page:${p.bgPage}`,
    `--border:${p.border}`,
    `--border-light:${p.borderLight}`,
    `--border-subtle:${p.borderSubtle}`,
    `--text-primary:${p.textPrimary}`,
    `--text-muted:${p.textMuted}`,
    `--text-faint:${p.textFaint}`,
    `--red:${p.brand}`,
    `--red-dark:${p.brandDark}`,
    `--red-light:${p.brandLight}`,
    `--red-glow:${p.brandGlow}`,
    `--gold:${p.gold}`,
    `--gold-strong:${p.goldStrong}`,
    `--gold-dark:${p.goldDark}`,
    `--gold-hover:${p.goldHover}`,
    `--premium-border:${p.premiumBorder}`,
    `--btn-primary-bg:${p.btnPrimaryBg}`,
    `--btn-primary-text:${p.btnPrimaryText}`,
    `--btn-primary-hover:${p.btnPrimaryHover}`,
    `--btn-secondary-bg:${p.btnSecondaryBg}`,
    `--btn-secondary-bg-hover:${p.btnSecondaryHover}`,
    `--btn-secondary-border:${p.btnSecondaryBorder}`,
    `--btn-secondary-text:${p.btnSecondaryText}`,
    `--success:${p.success}`,
    `--warning:${p.warning}`,
    `--tip-amber:${p.tipAmber}`,
    `--hero-bg:${p.bgSecondary}`,
    `--hero-card-bg:${p.bgCard}`,
    `--hero-chip-bg:${p.bgElevated}`,
    `--hero-tile-bg:${p.bgCardAlt}`,
    `--hero-panel-bg:${p.bgPage}`,
    `--page-gradient:${pageGrad}`,
    `--glow-card-bg:${buildCardGradient(p)}`,
    `--glow-card-bg-hover:${buildCardGradientHover(p)}`,
    `--glow-accent-from:${p.heroGlowFrom}`,
    `--glow-accent-to:${p.heroGlowTo}`,
  ].join(';');
}

/** CSS override block applied on top of index.css defaults. */
export function colorSchemeToCss(scheme: ColorSchemeSettings): string {
  const dark = normalizePalette(scheme.dark, DEFAULT_DARK_PALETTE);
  const light = normalizePalette(scheme.light, DEFAULT_LIGHT_PALETTE);
  return [
    `:root,[data-theme="dark"]{${paletteToCssVars(dark)}}`,
    `[data-theme="light"]{${paletteToCssVars(light)}}`,
    `body{background-color:var(--bg-page);background-image:var(--page-gradient,none);background-attachment:fixed}`,
    `.glow-card::after{background:radial-gradient(ellipse at 0% 0%,var(--glow-accent-from) 0%,transparent 55%),radial-gradient(ellipse at 100% 100%,var(--glow-accent-to) 0%,transparent 50%)}`,
  ].join('\n');
}

export function applyColorSchemeToDocument(scheme: ColorSchemeSettings): void {
  if (typeof document === 'undefined') return;
  const id = 'zynex-color-scheme';
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = colorSchemeToCss(scheme);
}

export async function getColorSchemeSettings(
  admin?: ReturnType<typeof createPrivilegedSupabase>,
): Promise<{ scheme: ColorSchemeSettings; setupRequired?: boolean }> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS && !cache.setupRequired) {
    return { scheme: cache.value };
  }
  try {
    const db = admin || serviceClient();
    const { data, error } = await db
      .from('app_settings')
      .select('value')
      .eq('key', COLOR_SCHEME_KEY)
      .maybeSingle();
    if (error) {
      const setupRequired = isAppSettingsMissing(error.message);
      cache = { value: DEFAULT_COLOR_SCHEME, at: now, setupRequired };
      return { scheme: DEFAULT_COLOR_SCHEME, setupRequired: setupRequired || undefined };
    }
    const scheme = normalizeColorScheme(parseStored(data?.value));
    cache = { value: scheme, at: now };
    return { scheme };
  } catch (err: any) {
    const setupRequired = isAppSettingsMissing(err?.message);
    cache = { value: DEFAULT_COLOR_SCHEME, at: now, setupRequired };
    return { scheme: DEFAULT_COLOR_SCHEME, setupRequired: setupRequired || undefined };
  }
}

export async function setColorSchemeSettings(
  input: Partial<ColorSchemeSettings>,
  admin?: ReturnType<typeof createPrivilegedSupabase>,
): Promise<ColorSchemeSettings> {
  const db = admin || serviceClient();
  const current = await getColorSchemeSettings(db);
  const next = normalizeColorScheme({
    dark: { ...current.scheme.dark, ...(input.dark || {}) },
    light: { ...current.scheme.light, ...(input.light || {}) },
  });
  const { error } = await db.from('app_settings').upsert(
    {
      key: COLOR_SCHEME_KEY,
      value: next,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' },
  );
  if (error) {
    if (isAppSettingsMissing(error.message)) {
      throw new Error(
        'Run supabase_device_limits_toggle.sql (creates app_settings) in Supabase, then try again.',
      );
    }
    throw new Error(error.message);
  }
  cache = { value: next, at: Date.now() };
  return next;
}

export function clearColorSchemeCache() {
  cache = null;
}
