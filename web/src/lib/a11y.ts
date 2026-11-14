/**
 * lib/a11y.ts
 *
 * Framework-agnostic accessibility-prefs read/write — plain functions, no
 * React, same shape as lib/appearance.ts and lib/theme.ts. Stores under a
 * new "a11yPrefs" localStorage key, deliberately separate from "theme" and
 * "appearancePrefs": P0-9 is its own additive layer (high contrast, manual
 * reduced motion, focus mode, dyslexia-friendly font, larger UI) on top of
 * whichever theme/appearance is active, not a variant of either.
 *
 * `prefers-reduced-motion` itself is handled separately, as a plain CSS
 * `@media` query in index.css that applies regardless of this file's
 * `reducedMotion` toggle (see that block's comment) — this toggle is the
 * *manual* override for people who want reduced motion without their OS
 * reporting the preference, not a duplicate of the automatic behavior.
 */

export interface A11yPrefs {
  v: 1;
  highContrast: boolean;
  reducedMotion: boolean;
  focusMode: boolean;
  dyslexiaFont: boolean;
  largerUI: boolean;
}

export const DEFAULT_A11Y_PREFS: A11yPrefs = {
  v: 1,
  highContrast: false,
  reducedMotion: false,
  focusMode: false,
  dyslexiaFont: false,
  largerUI: false,
};

const STORAGE_KEY = 'a11yPrefs';

function isA11yPrefs(value: unknown): value is A11yPrefs {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.v === 1 &&
    typeof candidate.highContrast === 'boolean' &&
    typeof candidate.reducedMotion === 'boolean' &&
    typeof candidate.focusMode === 'boolean' &&
    typeof candidate.dyslexiaFont === 'boolean' &&
    typeof candidate.largerUI === 'boolean'
  );
}

/** Reads the saved accessibility prefs, defaulting to DEFAULT_A11Y_PREFS on missing/corrupt data. */
export function getSavedA11yPrefs(): A11yPrefs {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return DEFAULT_A11Y_PREFS;
    const parsed = JSON.parse(saved);
    return isA11yPrefs(parsed) ? parsed : DEFAULT_A11Y_PREFS;
  } catch {
    // Private-browsing / storage-disabled / malformed JSON: fail silently,
    // same as theme.ts's getSavedTheme() and appearance.ts's
    // getSavedAppearancePrefs().
    return DEFAULT_A11Y_PREFS;
  }
}

/** Persists the accessibility prefs. Swallows storage errors, same as saveAppearancePrefs(). */
export function saveA11yPrefs(prefs: A11yPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // no-op — matches appearance.ts's silent-fail behavior
  }
}

/**
 * Applies accessibility prefs to the document root as data attributes,
 * layered on top of whatever [data-theme]/[data-density]/[data-animations]
 * is currently active — never writes to any of those, so ThemeContext and
 * AppearanceContext stay untouched.
 *
 * - highContrast: [data-high-contrast="on"] — index.css overrides text/
 *   border/shadow tokens for stronger contrast, on top of the active theme.
 * - reducedMotion: [data-reduced-motion="on"] — same zero-duration rule
 *   shape as appearance.ts's [data-animations="off"], but a distinct
 *   attribute/key so this ticket's toggle doesn't silently share state
 *   with P0-2's "Animations" switch.
 * - focusMode: [data-focus-mode="on"] — stronger, more visible focus
 *   outlines site-wide, for people who lose track of keyboard focus.
 * - dyslexiaFont: [data-dyslexia-font="on"] — swaps body copy to a
 *   dyslexia-friendly font stack.
 * - largerUI: [data-larger-ui="on"] — scales the root font size up, so
 *   every rem-based measurement grows with it.
 */
export function applyA11yToDocument(prefs: A11yPrefs): void {
  const root = document.documentElement;

  root.setAttribute('data-high-contrast', prefs.highContrast ? 'on' : 'off');
  root.setAttribute('data-reduced-motion', prefs.reducedMotion ? 'on' : 'off');
  root.setAttribute('data-focus-mode', prefs.focusMode ? 'on' : 'off');
  root.setAttribute('data-dyslexia-font', prefs.dyslexiaFont ? 'on' : 'off');
  root.setAttribute('data-larger-ui', prefs.largerUI ? 'on' : 'off');
}
