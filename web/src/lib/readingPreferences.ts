/**
 * lib/readingPreferences.ts
 *
 * Framework-agnostic reading-preferences read/write — plain functions, no
 * React, same shape as lib/appearance.ts and lib/a11y.ts. Stores under a
 * new "readingPreferences" localStorage key, deliberately separate from
 * "appearancePrefs"/"a11yPrefs": P0-8 is a Note-page-scoped reading layer
 * (font size, line height, font family, content width) rather than a
 * site-wide appearance or accessibility toggle, so it gets its own
 * storage envelope and its own CSS custom properties.
 *
 * Unlike appearancePrefs/a11yPrefs (applied at :root and felt everywhere),
 * these vars are set at :root but only ever *consumed* by
 * `.notes-body-prose` in index.css — a note page's real body-prose
 * container (see pages/Note/BodyProseModule.tsx). Setting them globally
 * but scoping consumption locally mirrors how --accent/--card-radius
 * already work: one write site, one deliberately narrow read site.
 */

export type ReadingFontSize = 'small' | 'medium' | 'large' | 'x-large';
export type ReadingLineHeight = 'compact' | 'comfortable' | 'spacious';
export type ReadingFontFamily = 'system' | 'serif' | 'dyslexia';
export type ReadingWidth = 'narrow' | 'medium' | 'wide';

export interface ReadingPreferences {
  v: 1;
  fontSize: ReadingFontSize;
  lineHeight: ReadingLineHeight;
  fontFamily: ReadingFontFamily;
  width: ReadingWidth;
}

export const DEFAULT_READING_PREFERENCES: ReadingPreferences = {
  v: 1,
  fontSize: 'medium',
  lineHeight: 'comfortable',
  fontFamily: 'system',
  width: 'medium',
};

export const FONT_SIZE_OPTIONS: { value: ReadingFontSize; label: string; cssValue: string }[] = [
  { value: 'small', label: 'Small', cssValue: '0.9375rem' },
  { value: 'medium', label: 'Medium', cssValue: '1.0625rem' }, // matches the pre-P0-8 hardcoded body-prose size
  { value: 'large', label: 'Large', cssValue: '1.1875rem' },
  { value: 'x-large', label: 'Extra large', cssValue: '1.375rem' },
];

export const LINE_HEIGHT_OPTIONS: { value: ReadingLineHeight; label: string; cssValue: string }[] = [
  { value: 'compact', label: 'Compact', cssValue: '1.4' },
  { value: 'comfortable', label: 'Comfortable', cssValue: '1.7' },
  { value: 'spacious', label: 'Spacious', cssValue: '2' },
];

export const FONT_FAMILY_OPTIONS: { value: ReadingFontFamily; label: string; cssValue: string }[] = [
  { value: 'system', label: 'System default', cssValue: 'inherit' },
  {
    value: 'serif',
    label: 'Serif',
    cssValue: "'Georgia', 'Times New Roman', serif",
  },
  {
    // Deliberately a different font stack from A11yContext's own
    // dyslexiaFont toggle (lib/a11y.ts) — that one is a site-wide
    // accessibility override, this one is a Note-page reading choice.
    // The two are independent and may be combined; neither reads the
    // other's key.
    value: 'dyslexia',
    label: 'Dyslexia-friendly',
    cssValue: "'OpenDyslexic', 'Comic Sans MS', sans-serif",
  },
];

export const WIDTH_OPTIONS: { value: ReadingWidth; label: string; cssValue: string }[] = [
  { value: 'narrow', label: 'Narrow', cssValue: '38rem' },
  { value: 'medium', label: 'Medium', cssValue: '48rem' }, // matches the pre-P0-8 hardcoded max-width
  { value: 'wide', label: 'Wide', cssValue: '64rem' },
];

const STORAGE_KEY = 'readingPreferences';

function isReadingFontSize(value: unknown): value is ReadingFontSize {
  return FONT_SIZE_OPTIONS.some((o) => o.value === value);
}

function isReadingLineHeight(value: unknown): value is ReadingLineHeight {
  return LINE_HEIGHT_OPTIONS.some((o) => o.value === value);
}

function isReadingFontFamily(value: unknown): value is ReadingFontFamily {
  return FONT_FAMILY_OPTIONS.some((o) => o.value === value);
}

function isReadingWidth(value: unknown): value is ReadingWidth {
  return WIDTH_OPTIONS.some((o) => o.value === value);
}

function isReadingPreferences(value: unknown): value is ReadingPreferences {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.v === 1 &&
    isReadingFontSize(candidate.fontSize) &&
    isReadingLineHeight(candidate.lineHeight) &&
    isReadingFontFamily(candidate.fontFamily) &&
    isReadingWidth(candidate.width)
  );
}

/** Reads the saved reading prefs, defaulting to DEFAULT_READING_PREFERENCES on missing/corrupt data. */
export function getSavedReadingPreferences(): ReadingPreferences {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return DEFAULT_READING_PREFERENCES;
    const parsed = JSON.parse(saved);
    return isReadingPreferences(parsed) ? parsed : DEFAULT_READING_PREFERENCES;
  } catch {
    // Private-browsing / storage-disabled / malformed JSON: fail silently,
    // same as appearance.ts's getSavedAppearancePrefs().
    return DEFAULT_READING_PREFERENCES;
  }
}

/** Persists the reading prefs. Swallows storage errors, same as saveAppearancePrefs(). */
export function saveReadingPreferences(prefs: ReadingPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // no-op — matches appearance.ts's silent-fail behavior
  }
}

function resolveCssValue<T extends { value: string; cssValue: string }>(
  options: T[],
  value: string,
  fallbackIndex: number,
): string {
  return options.find((o) => o.value === value)?.cssValue ?? options[fallbackIndex].cssValue;
}

/**
 * Applies reading prefs to the document root as CSS custom properties —
 * never writes to data-theme/appearancePrefs/a11yPrefs or their
 * attributes. index.css's `.notes-body-prose` rule is the only consumer
 * of these four vars (see that file's P0-8 block), so setting them here
 * has no visible effect anywhere except a note page's body-prose content.
 */
export function applyReadingPreferencesToDocument(prefs: ReadingPreferences): void {
  const root = document.documentElement;

  root.style.setProperty('--reading-font-size', resolveCssValue(FONT_SIZE_OPTIONS, prefs.fontSize, 1));
  root.style.setProperty('--reading-line-height', resolveCssValue(LINE_HEIGHT_OPTIONS, prefs.lineHeight, 1));
  root.style.setProperty('--reading-font-family', resolveCssValue(FONT_FAMILY_OPTIONS, prefs.fontFamily, 0));
  root.style.setProperty('--reading-content-width', resolveCssValue(WIDTH_OPTIONS, prefs.width, 1));
}
