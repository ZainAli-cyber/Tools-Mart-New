import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { resolveTheme, toggleTheme, type Theme } from '../lib/theme';

interface ThemeToggleProps {
  /** compact = icon-only (sidebars / headers); labeled adds a short text hint */
  variant?: 'compact' | 'labeled';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'compact', className = '' }) => {
  const [theme, setThemeState] = useState<Theme>(() => resolveTheme());

  useEffect(() => {
    const sync = () => setThemeState(resolveTheme());
    window.addEventListener('themechange', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('themechange', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const isDark = theme === 'dark';
  const label = isDark ? 'Light mode' : 'Dark mode';

  return (
    <button
      type="button"
      onClick={() => setThemeState(toggleTheme())}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)] transition hover:border-red-500/40 hover:text-[var(--text-primary)] cursor-pointer ${
        variant === 'labeled' ? 'px-3 py-2 text-xs font-bold' : 'p-2'
      } ${className}`}
    >
      {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
      {variant === 'labeled' && <span>{isDark ? 'Light' : 'Dark'}</span>}
    </button>
  );
};
