import { useEffect, useState, type CSSProperties } from 'react';
import {
  BRANDING_UPDATED_EVENT,
  DEFAULT_BRANDING,
  type BrandingSettings,
  normalizeBranding,
} from '../lib/brandingSettings';

let memory: BrandingSettings | null = null;
let inflight: Promise<BrandingSettings> | null = null;

async function fetchBranding(): Promise<BrandingSettings> {
  if (memory) return memory;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch('/api/settings/branding', { credentials: 'same-origin' });
      const body = await res.json().catch(() => ({}));
      const next = normalizeBranding(body?.branding || body);
      memory = next;
      return next;
    } catch {
      memory = DEFAULT_BRANDING;
      return DEFAULT_BRANDING;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useBranding(): BrandingSettings {
  const [branding, setBranding] = useState<BrandingSettings>(memory || DEFAULT_BRANDING);

  useEffect(() => {
    let live = true;
    void fetchBranding().then(b => {
      if (live) setBranding(b);
    });
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail as BrandingSettings | undefined;
      if (detail) {
        memory = normalizeBranding(detail);
        setBranding(memory);
        return;
      }
      memory = null;
      void fetchBranding().then(b => {
        if (live) setBranding(b);
      });
    };
    window.addEventListener(BRANDING_UPDATED_EVENT, onUpdate);
    return () => {
      live = false;
      window.removeEventListener(BRANDING_UPDATED_EVENT, onUpdate);
    };
  }, []);

  return branding;
}

export type BrandLogoVariant = 'website' | 'app' | 'invoice';

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  alt?: string;
  className?: string;
  height?: number;
  style?: CSSProperties;
  crossOrigin?: '' | 'anonymous' | 'use-credentials';
};

export function BrandLogo({
  variant = 'website',
  alt = 'ZynexTools',
  className = '',
  height,
  style,
  crossOrigin,
}: BrandLogoProps) {
  const branding = useBranding();
  const src =
    variant === 'app'
      ? branding.appLogoUrl
      : variant === 'invoice'
        ? branding.invoiceLogoUrl
        : branding.websiteLogoUrl;
  const h =
    height ??
    (variant === 'app'
      ? branding.appLogoHeight
      : variant === 'invoice'
        ? branding.invoiceLogoHeight
        : branding.websiteLogoHeight);

  return (
    <img
      src={src}
      alt={alt}
      className={className || 'w-auto object-contain'}
      style={{ height: h, width: 'auto', maxWidth: Math.max(120, h * 4), ...style }}
      crossOrigin={crossOrigin}
      onError={e => {
        const el = e.currentTarget;
        const fallback = variant === 'website' ? '/logo.png' : '/app-logo.png';
        if (el.getAttribute('src') !== fallback) el.src = fallback;
      }}
    />
  );
}
