/**
 * lib/profile.ts
 *
 * Framework-agnostic profile read/write — plain functions, no React, same
 * shape as lib/theme.ts. Stores under the "userProfile" localStorage key
 * as a versioned envelope ({ v: 1, ... }), matching the convention used by
 * readingProgress-folder-* entries (see RecentlyViewed.tsx).
 */

export interface UserProfile {
  v: 1;
  name: string;
  avatar: string;
  /** Greeting template. Supports {name} and {timeOfDay} placeholders. */
  greeting: string;
  goal: string;
}

export const DEFAULT_PROFILE: UserProfile = {
  v: 1,
  name: '',
  avatar: '👋',
  greeting: 'Good {timeOfDay}{name}',
  goal: '',
};

const STORAGE_KEY = 'userProfile';

function isUserProfile(value: unknown): value is UserProfile {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.v === 1 &&
    typeof candidate.name === 'string' &&
    typeof candidate.avatar === 'string' &&
    typeof candidate.greeting === 'string' &&
    typeof candidate.goal === 'string'
  );
}

/** Reads the saved profile, defaulting to DEFAULT_PROFILE on missing/corrupt data. */
export function getSavedProfile(): UserProfile {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return DEFAULT_PROFILE;
    const parsed = JSON.parse(saved);
    return isUserProfile(parsed) ? parsed : DEFAULT_PROFILE;
  } catch {
    // Private-browsing / storage-disabled / malformed JSON: fail silently,
    // same as theme.js's getSavedTheme().
    return DEFAULT_PROFILE;
  }
}

/** Persists the profile. Swallows storage errors, same as saveTheme(). */
export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // no-op — matches theme.js's silent-fail behavior
  }
}

export function getTimeOfDay(date: Date = new Date()): 'morning' | 'afternoon' | 'evening' {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * Resolves {timeOfDay} and {name} placeholders in a greeting template.
 * With no name set, ", {name}" collapses cleanly instead of leaving a
 * trailing comma or "Good evening, 👋" with an empty name.
 */
export function buildGreetingText(profile: UserProfile, date: Date = new Date()): string {
  const timeOfDay = getTimeOfDay(date);
  const namePart = profile.name.trim() ? `, ${profile.name.trim()}` : '';
  return profile.greeting
    .replace('{timeOfDay}', timeOfDay)
    .replace('{name}', namePart)
    .trim();
}
