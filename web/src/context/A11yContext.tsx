import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type A11yPrefs,
  getSavedA11yPrefs,
  saveA11yPrefs,
  applyA11yToDocument,
} from '../lib/a11y';

/**
 * A11yContext — P0-9 (Accessibility options). One Context per concern
 * (PROJECT.md §7.5), thin provider wrapping src/lib/a11y.ts's plain
 * functions — same shape as AppearanceContext.tsx and ProfileContext.tsx.
 *
 * Deliberately a sibling of ThemeProvider/AppearanceProvider, not nested
 * inside/around either: high contrast / reduced motion / focus mode /
 * dyslexia font / larger UI are their own additive layer, so this provider
 * never reads or writes "theme" or "appearancePrefs" — only the new
 * "a11yPrefs" key and its own data-* attributes (see applyA11yToDocument's
 * doc comment).
 */

interface A11yContextValue {
  prefs: A11yPrefs;
  updatePrefs: (partial: Partial<A11yPrefs>) => void;
}

const A11yContext = createContext<A11yContextValue | null>(null);

export function A11yProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<A11yPrefs>(() => getSavedA11yPrefs());

  // Apply on mount and whenever prefs change — mirrors AppearanceProvider's
  // applyAppearanceToDocument effect.
  useEffect(() => {
    applyA11yToDocument(prefs);
  }, [prefs]);

  function updatePrefs(partial: Partial<A11yPrefs>) {
    setPrefs((current) => {
      const next: A11yPrefs = { ...current, ...partial, v: 1 };
      saveA11yPrefs(next);
      return next;
    });
  }

  return (
    <A11yContext.Provider value={{ prefs, updatePrefs }}>
      {children}
    </A11yContext.Provider>
  );
}

export function useA11y(): A11yContextValue {
  const ctx = useContext(A11yContext);
  if (!ctx) throw new Error('useA11y must be used within an A11yProvider');
  return ctx;
}
