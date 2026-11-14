import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type AppearancePrefs,
  getSavedAppearancePrefs,
  saveAppearancePrefs,
  applyAppearanceToDocument,
} from '../lib/appearance';

/**
 * AppearanceContext — P0-2 (Extended Theme & Appearance). One Context per
 * concern (PROJECT.md §7.5), thin provider wrapping src/lib/appearance.ts's
 * plain functions — same shape as ThemeContext.tsx and ProfileContext.tsx.
 *
 * Deliberately a sibling of ThemeProvider, not nested inside/around it or
 * merged with it: accent/radius/density/animations are an additive layer
 * on top of the existing light/dark/comfort cycle, so this provider never
 * reads or writes theme.ts's "theme" key or its data-theme attribute —
 * only the new "appearancePrefs" key and its own data-density/
 * data-animations attributes plus a scoped --accent/--card-radius style
 * override (see applyAppearanceToDocument's doc comment).
 */

interface AppearanceContextValue {
  prefs: AppearancePrefs;
  updatePrefs: (partial: Partial<AppearancePrefs>) => void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<AppearancePrefs>(() => getSavedAppearancePrefs());

  // Apply on mount and whenever prefs change — mirrors ThemeProvider's
  // applyThemeToDocument effect.
  useEffect(() => {
    applyAppearanceToDocument(prefs);
  }, [prefs]);

  function updatePrefs(partial: Partial<AppearancePrefs>) {
    setPrefs((current) => {
      const next: AppearancePrefs = { ...current, ...partial, v: 1 };
      saveAppearancePrefs(next);
      return next;
    });
  }

  return (
    <AppearanceContext.Provider value={{ prefs, updatePrefs }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error('useAppearance must be used within an AppearanceProvider');
  return ctx;
}
