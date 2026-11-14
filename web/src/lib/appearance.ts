/**
 * lib/appearance.ts
 *
 * Framework-agnostic appearance-prefs read/write — plain functions, no
 * React, same shape as lib/theme.ts and lib/profile.ts. Stores under a new
 * "appearancePrefs" localStorage key, deliberately separate from the
 * "theme" key that theme.js/theme.ts already owns: P0-2 is an ADDITIVE
 * layer on top of the existing light/dark/comfort 3-theme system (accent
 * override, card radius, density, animation on/off), not a fourth theme,
 * so it gets its own storage envelope and its own [data-*] attributes
 * rather than touching theme.ts's cycle or STORAGE_KEY at all.
 */

export type AccentChoice = 'theme' | string; // 'theme' = no override, else a hex color
export type CardRadius = 'sharp' | 'soft' | 'round' | 'pill';
export type Density = 'comfortable' | 'compact';

export interface AppearancePrefs {
  v: 1;
  /** 'theme' defers to the active theme's --accent; any other value is a hex override. */
  accent: AccentChoice;
  radius: CardRadius;
  density: Density;
  animations: boolean;
}

export const DEFAULT_APPEARANCE_PREFS: AppearancePrefs = {
  v: 1,
  accent: 'theme',
  radius: 'round',
  density: 'comfortable',
  animations: true,
};

/** Preset accent swatches offered in the UI — arbitrary custom hex values are also accepted. */
export const ACCENT_SWATCHES: string[] = [
  '#7c4dff', // brand default (matches --accent in light/dark)
  '#ffb347', // brand default (matches --accent in comfort)
  '#2dd4bf',
  '#f472b6',
  '#38bdf8',
  '#f59e0b',
];

export const RADIUS_OPTIONS: { value: CardRadius; label: string; cssValue: string }[] = [
  { value: 'sharp', label: 'Sharp', cssValue: '0.25rem' },
  { value: 'soft', label: 'Soft', cssValue: '0.75rem' },
  { value: 'round', label: 'Round', cssValue: '1rem' }, // matches the pre-P0-2 hardcoded rounded-2xl
  { value: 'pill', label: 'Pill', cssValue: '1.5rem' },
];

const STORAGE_KEY = 'appearancePrefs';

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

function isCardRadius(value: unknown): value is CardRadius {
  return value === 'sharp' || value === 'soft' || value === 'round' || value === 'pill';
}

function isDensity(value: unknown): value is Density {
  return value === 'comfortable' || value === 'compact';
}

function isAccentChoice(value: unknown): value is AccentChoice {
  return value === 'theme' || (typeof value === 'string' && HEX_COLOR_RE.test(value));
}

function isAppearancePrefs(value: unknown): value is AppearancePrefs {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.v === 1 &&
    isAccentChoice(candidate.accent) &&
    isCardRadius(candidate.radius) &&
    isDensity(candidate.density) &&
    typeof candidate.animations === 'boolean'
  );
}

/** Reads the saved appearance prefs, defaulting to DEFAULT_APPEARANCE_PREFS on missing/corrupt data. */
export function getSavedAppearancePrefs(): AppearancePrefs {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return DEFAULT_APPEARANCE_PREFS;
    const parsed = JSON.parse(saved);
    return isAppearancePrefs(parsed) ? parsed : DEFAULT_APPEARANCE_PREFS;
  } catch {
    // Private-browsing / storage-disabled / malformed JSON: fail silently,
    // same as theme.ts's getSavedTheme() and profile.ts's getSavedProfile().
    return DEFAULT_APPEARANCE_PREFS;
  }
}

/** Persists the appearance prefs. Swallows storage errors, same as saveTheme()/saveProfile(). */
export function saveAppearancePrefs(prefs: AppearancePrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // no-op — matches theme.ts's silent-fail behavior
  }
}

function resolveRadiusCssValue(radius: CardRadius): string {
  return RADIUS_OPTIONS.find((option) => option.value === radius)?.cssValue ?? RADIUS_OPTIONS[2].cssValue;
}

/**
 * Applies appearance prefs to the document root as CSS custom properties
 * and data attributes, layered on top of whatever [data-theme] is
 * currently active — never writes to data-theme itself, so theme.ts's
 * cycle stays untouched.
 *
 * - accent: when not 'theme', sets an inline-style --accent override,
 *   which wins over the [data-theme='...'] stylesheet rule (inline style
 *   beats an attribute-selector rule of equal specificity) without
 *   editing index.css's per-theme blocks. Cleared (not just set to
 *   'theme') to fall back to the active theme's own --accent.
 * - radius: sets --card-radius, consumed via Tailwind arbitrary-value
 *   classes (e.g. rounded-[var(--card-radius)]) the same way --shadow
 *   already is (see DashboardCardsGrid's shadow-[...var(--shadow)]).
 * - density: sets a data-density attribute; index.css's
 *   [data-density='compact'] block overrides --card-gap/--card-padding/
 *   --grid-gap for that attribute only.
 * - animations: sets a data-animations attribute; index.css's
 *   [data-animations='off'] block zeroes --motion-duration.
 */
export function applyAppearanceToDocument(prefs: AppearancePrefs): void {
  const root = document.documentElement;

  if (prefs.accent === 'theme') {
    root.style.removeProperty('--accent');
  } else {
    root.style.setProperty('--accent', prefs.accent);
  }

  root.style.setProperty('--card-radius', resolveRadiusCssValue(prefs.radius));
  root.setAttribute('data-density', prefs.density);
  root.setAttribute('data-animations', prefs.animations ? 'on' : 'off');
}
