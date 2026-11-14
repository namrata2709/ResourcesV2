import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type Theme,
  getSavedTheme,
  saveTheme,
  applyThemeToDocument,
  getNextTheme,
  NEXT_THEME_LABEL,
} from '../lib/theme';

/**
 * ThemeContext — per PROJECT.md §7.5 (T2-1 decision): one Context per
 * concern, thin provider wrapping src/lib/theme.ts's plain functions.
 * Reads/writes the same "theme" localStorage key as vanilla theme.js so
 * a saved preference carries over across a vanilla <-> React page swap.
 */

interface ThemeContextValue {
  theme: Theme;
  nextThemeLabel: string;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getSavedTheme());

  // Apply on mount and whenever theme changes — mirrors theme.js's
  // applyTheme() being called both on init and on every toggle.
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  function toggleTheme() {
    const next = getNextTheme(theme);
    saveTheme(next);
    setThemeState(next);
  }

  const value: ThemeContextValue = {
    theme,
    nextThemeLabel: NEXT_THEME_LABEL[theme],
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
