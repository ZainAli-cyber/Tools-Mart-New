import React, { useEffect } from 'react';
import {
  COLOR_SCHEME_UPDATED_EVENT,
  DEFAULT_COLOR_SCHEME,
  applyColorSchemeToDocument,
  normalizeColorScheme,
  type ColorSchemeSettings,
} from '../lib/colorSchemeSettings';

let loaded = false;

async function loadAndApply(): Promise<void> {
  try {
    const res = await fetch('/api/settings/colors', { credentials: 'same-origin' });
    const body = await res.json().catch(() => ({}));
    const scheme = normalizeColorScheme(body?.scheme || body);
    applyColorSchemeToDocument(scheme);
    loaded = true;
  } catch {
    applyColorSchemeToDocument(DEFAULT_COLOR_SCHEME);
  }
}

/** Loads admin color scheme and keeps CSS variables in sync. */
export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void loadAndApply();
    const onUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail as ColorSchemeSettings | undefined;
      if (detail) {
        applyColorSchemeToDocument(normalizeColorScheme(detail));
        return;
      }
      void loadAndApply();
    };
    window.addEventListener(COLOR_SCHEME_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(COLOR_SCHEME_UPDATED_EVENT, onUpdate);
  }, []);

  return <>{children}</>;
}

export function prefetchColorScheme(): void {
  if (loaded || typeof window === 'undefined') return;
  void loadAndApply();
}
