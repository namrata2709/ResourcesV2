/**
 * lib/dataBackup.ts — P4-1 (Export/Import JSON backup).
 *
 * Everything this app persists lives in localStorage, and every real
 * key already in use is scattered across ~20 different lib files, each
 * owning its own STORAGE_KEY constant (lib/theme.ts, lib/profile.ts,
 * lib/a11y.ts, ...), plus several per-item key builders in
 * lib/storageKeys.ts (bookmarksKey, highlightsKey, quizProgressKey,
 * ...). A backup feature that hand-lists every one of those would be
 * wrong the moment the next ticket adds a new key — nothing would
 * remind that ticket's author to also update a backup allowlist
 * somewhere else in the codebase.
 *
 * So this file doesn't enumerate keys at all: it snapshots the WHOLE
 * of localStorage (this app owns 100% of its own origin's storage —
 * confirmed by grepping every localStorage.setItem call site, none of
 * them are some other embedded widget's data) into one JSON file, and
 * restores it the same generic way. New keys are automatically covered
 * by both export and import with zero changes needed here, ever.
 *
 * Import safety (the real risk a generic "just overwrite everything"
 * restore would otherwise have): several of this app's own stored
 * blobs are internally versioned with a `v` field (e.g.
 * lib/readingProgress.ts's `{v:1, percent, timestamp}`,
 * useQuizEngine.ts's quiz-progress shape) specifically so a future
 * shape change can tell old and new data apart. A backup file made
 * today and restored after such a shape change could otherwise
 * silently downgrade a key back to its old, narrower shape. Per-key,
 * import only overwrites when the incoming value's `v` is greater than
 * or equal to what's already there; a plain string/array value with no
 * `v` field (theme, notesFavorites, examMode, ...) has nothing to
 * compare and is always restored, matching what "restore my settings"
 * should intuitively do for those.
 */

import { triggerDownload, slugify } from './exportAs';

export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupFile {
  schemaVersion: number;
  exportedAt: string;
  entries: Record<string, string>;
}

export interface ImportSummary {
  imported: string[];
  skippedOlderVersion: string[];
  invalidEntries: string[];
}

/** Snapshots every current localStorage entry into a versioned backup object. */
export function buildBackup(): BackupFile {
  const entries: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key === null) continue;
    const value = localStorage.getItem(key);
    if (value === null) continue;
    entries[key] = value;
  }

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    entries,
  };
}

/** Builds a backup and triggers a browser download of it as a `.json` file. */
export function downloadBackup(filenameStem = 'notebook-buddy-backup'): void {
  const backup = buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  triggerDownload(blob, `${slugify(filenameStem)}.json`);
}

/** Extracts a numeric `v` field from a JSON-encoded value, or null if the
 * value isn't valid JSON, isn't an object, or has no numeric `v` field —
 * any of which means this value has no version to compare against. */
function extractVersion(rawValue: string): number | null {
  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      typeof (parsed as Record<string, unknown>).v === 'number'
    ) {
      return (parsed as Record<string, unknown>).v as number;
    }
    return null;
  } catch {
    return null;
  }
}

function isBackupFileShape(value: unknown): value is BackupFile {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as BackupFile).schemaVersion === 'number' &&
    typeof (value as BackupFile).entries === 'object' &&
    (value as BackupFile).entries !== null
  );
}

/**
 * Parses and applies a backup file's contents to localStorage.
 *
 * Throws if `raw` isn't valid JSON or doesn't match the backup file
 * shape at all (nothing to import) — callers are expected to catch and
 * show an honest error, same convention every other import/export path
 * in this codebase follows (see lib/notebookExport.ts's
 * "nothing to export" throw). Per-key skip/import decisions are
 * returned rather than thrown, since a partially-importable file
 * (some keys newer, some older) is the normal case, not an error.
 */
export function importBackup(raw: string): ImportSummary {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  if (!isBackupFileShape(parsed)) {
    throw new Error('That file does not look like a Notebook Buddy backup.');
  }

  const summary: ImportSummary = { imported: [], skippedOlderVersion: [], invalidEntries: [] };

  for (const [key, incomingRaw] of Object.entries(parsed.entries)) {
    if (typeof incomingRaw !== 'string') {
      summary.invalidEntries.push(key);
      continue;
    }

    const existingRaw = localStorage.getItem(key);
    if (existingRaw !== null) {
      const existingVersion = extractVersion(existingRaw);
      const incomingVersion = extractVersion(incomingRaw);
      if (existingVersion !== null && incomingVersion !== null && incomingVersion < existingVersion) {
        summary.skippedOlderVersion.push(key);
        continue;
      }
    }

    localStorage.setItem(key, incomingRaw);
    summary.imported.push(key);
  }

  return summary;
}
