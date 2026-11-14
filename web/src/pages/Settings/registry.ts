import type { ComponentType } from 'react';

/**
 * registry.ts — the section-registry pattern P0-0 exists to establish.
 *
 * Five separate P0 tickets (P0-1 Profile, P0-2 Appearance, P0-7 Quick
 * Actions, P0-8 Reading Preferences, P0-9 Accessibility) each independently
 * called for "a settings panel." Instead of Settings.tsx hardcoding five
 * imports, each section registers itself here at module load time, and
 * Settings.tsx just asks the registry what's currently registered.
 *
 * Adding a section is a one-line side-effect import in ./sections/index.ts
 * (see that file) — never a change to registry.ts or Settings.tsx.
 */

export interface SettingsSection {
  /** Stable, unique id — used as the tab key and (optionally) a URL hash. */
  id: string;
  /** Human-readable label shown in the section nav. */
  label: string;
  /** The section's own panel content. Rendered with no props. */
  Component: ComponentType;
}

// Module-level, private — sections must go through registerSettingsSection.
const sections: SettingsSection[] = [];

/**
 * Registers a settings section. Call this at module scope in the section's
 * own file (see sections/ProfileSection.tsx for the pattern), then add a
 * single side-effect import for that file to ./sections/index.ts.
 */
export function registerSettingsSection(section: SettingsSection): void {
  if (sections.some((existing) => existing.id === section.id)) {
    // Dev-time guard against copy-paste id collisions — not a hard throw,
    // since a duplicate registration (e.g. from hot-reload re-running a
    // module) shouldn't crash the whole settings page.
    if (import.meta.env.DEV) {
      console.warn(
        `[Settings] A section with id "${section.id}" is already registered. Ignoring the duplicate.`
      );
    }
    return;
  }
  sections.push(section);
}

/** Returns all registered sections, in registration order. */
export function getSettingsSections(): SettingsSection[] {
  return [...sections];
}

/**
 * Test-only escape hatch: registry.ts is a module-level singleton, so
 * without this, tests that register sections would leak state into other
 * test files that import the same module graph.
 */
export function __resetSettingsSectionsForTests(): void {
  sections.length = 0;
}
