import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type ReadingPreferences,
  getSavedReadingPreferences,
  saveReadingPreferences,
  applyReadingPreferencesToDocument,
} from '../lib/readingPreferences';

/**
 * ReadingPreferencesContext — P0-8 (Reading Preferences). One Context per
 * concern (PROJECT.md §7.5), thin provider wrapping
 * src/lib/readingPreferences.ts's plain functions — same shape as
 * AppearanceContext.tsx/A11yContext.tsx/ProfileContext.tsx.
 *
 * Registers as the 5th sibling in App.tsx's flat provider stack
 * (T2-1's documented pattern for a new settings domain: standalone
 * context, sibling provider, a useX() hook with the same
 * not-in-provider guard) — never nested inside ThemeProvider/
 * AppearanceProvider/A11yProvider, since font size/line height/family/
 * width is its own additive layer independent of all three.
 */

interface ReadingPreferencesContextValue {
  prefs: ReadingPreferences;
  updatePrefs: (partial: Partial<ReadingPreferences>) => void;
}

const ReadingPreferencesContext = createContext<ReadingPreferencesContextValue | null>(null);

export function ReadingPreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<ReadingPreferences>(() => getSavedReadingPreferences());

  // Apply on mount and whenever prefs change — mirrors AppearanceProvider's/
  // A11yProvider's own effect.
  useEffect(() => {
    applyReadingPreferencesToDocument(prefs);
  }, [prefs]);

  function updatePrefs(partial: Partial<ReadingPreferences>) {
    setPrefs((current) => {
      const next: ReadingPreferences = { ...current, ...partial, v: 1 };
      saveReadingPreferences(next);
      return next;
    });
  }

  return (
    <ReadingPreferencesContext.Provider value={{ prefs, updatePrefs }}>
      {children}
    </ReadingPreferencesContext.Provider>
  );
}

export function useReadingPreferences(): ReadingPreferencesContextValue {
  const ctx = useContext(ReadingPreferencesContext);
  if (!ctx) throw new Error('useReadingPreferences must be used within a ReadingPreferencesProvider');
  return ctx;
}
