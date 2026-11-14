/**
 * lib/theme.ts
 *
 * Framework-agnostic theme read/write — plain functions, no React.
 * Ports js/shared/theme.js's storage contract exactly:
 *   - same localStorage key ("theme")
 *   - same 3-mode cycle (light -> dark -> comfort)
 * so a saved preference from the vanilla site (or an earlier React session)
 * carries over untouched. ThemeContext (src/context/ThemeContext.tsx) is a
 * thin wrapper around these functions, not where the logic lives — mirrors
 * the pattern src/lib/README.md documents for useLiveRegion.
 */

export type Theme = 'light' | 'dark' | 'comfort';

export const THEMES: Theme[] = ['light', 'dark', 'comfort'];

export const NEXT_THEME_LABEL: Record<Theme, string> = {
  light: 'Dark mode',
  dark: 'Comfort mode',
  comfort: 'Light mode',
};

const STORAGE_KEY = 'theme';

function isTheme(value: string | null): value is Theme {
  return value !== null && (THEMES as string[]).includes(value);
}

/** Reads the saved theme, defaulting to 'light' — same fallback as theme.js. */
export function getSavedTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isTheme(saved) ? saved : 'light';
  } catch {
    // Private-browsing / storage-disabled: fail silently, same as vanilla.
    return 'light';
  }
}

/** Persists the theme choice. Swallows storage errors, same as theme.js. */
export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // no-op — matches theme.js's silent-fail behavior
  }
}

/** Applies the theme to the document root so CSS custom properties react. */
export function applyThemeToDocument(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

/** Returns the next theme in the light -> dark -> comfort -> light cycle. */
export function getNextTheme(current: Theme): Theme {
  return THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
}
