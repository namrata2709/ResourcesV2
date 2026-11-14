import { useRef, useState } from 'react';
import { downloadBackup, importBackup, type ImportSummary } from '../../../lib/dataBackup';
import { registerSettingsSection } from '../registry';

/**
 * DataBackupSection — P4-1 (Export/Import JSON backup), registered into
 * P0-0's shared Settings page. Same registration shape as every other
 * section here: the registerSettingsSection() call below plus the
 * one-line side-effect import in sections/index.ts.
 *
 * Export is a single button (lib/dataBackup.ts does the real work).
 * Import is a hidden file input triggered by a visible button — the
 * conventional way to get a native file picker without a raw, ugly
 * `<input type="file">` sitting in the layout — with the resulting
 * import/skip/invalid counts surfaced back to the person so a partial
 * restore (some keys skipped as older-versioned) isn't silently
 * invisible.
 */

type ImportOutcome = { kind: 'success'; summary: ImportSummary } | { kind: 'error'; message: string };

/** Long enough to actually read the summary line before the page reloads out from under it. */
const REFRESH_DELAY_MS = 2500;

function summaryText(summary: ImportSummary): string {
  const parts = [`${summary.imported.length} setting${summary.imported.length === 1 ? '' : 's'} restored`];
  if (summary.skippedOlderVersion.length > 0) {
    parts.push(`${summary.skippedOlderVersion.length} skipped (your current data was already newer)`);
  }
  if (summary.invalidEntries.length > 0) {
    parts.push(`${summary.invalidEntries.length} invalid entr${summary.invalidEntries.length === 1 ? 'y' : 'ies'} ignored`);
  }
  return parts.join(' · ');
}

function DataBackupSectionPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);

  function handleExportClick() {
    downloadBackup();
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file next time
    if (!file) return;

    try {
      const raw = await file.text();
      const summary = importBackup(raw);
      // importBackup() writes straight to raw localStorage — every
      // context in this app (Theme/Appearance/A11y/Profile/Reading
      // Preferences/...) only ever reads localStorage once, at initial
      // mount (`useState(() => getSavedXPrefs())`). Overwriting storage
      // after the app is already running doesn't retroactively update
      // any of that already-in-memory state, so a restore would
      // silently "succeed" (the file IS correctly written) while the
      // visible app kept showing whatever was there before — exactly
      // the bug report this fixes. A real reload is the simplest
      // correct fix: every context re-reads its saved prefs fresh on
      // next mount, so a reload is the one action guaranteed to make
      // every restored key actually take visible effect, without this
      // file needing to know about every context that exists today or
      // gets added later.
      setOutcome({ kind: 'success', summary });
      if (summary.imported.length > 0) {
        window.setTimeout(() => window.location.reload(), REFRESH_DELAY_MS);
      }
    } catch (err) {
      setOutcome({ kind: 'error', message: err instanceof Error ? err.message : 'Import failed.' });
    }
  }

  return (
    <div className="data-backup-section space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Backup & Restore</h2>
        <p className="text-sm text-text-secondary">
          Export all of your settings, progress, favorites, and personalization data as a single JSON
          file — useful before clearing your browser data, or to carry your setup to another browser.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleExportClick}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Export backup
        </button>

        <button
          type="button"
          onClick={handleImportClick}
          className="rounded-lg border border-border-color bg-bg-card px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-secondary"
        >
          Import backup
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileSelected}
          className="hidden"
          aria-label="Choose a backup file to import"
        />
      </div>

      {outcome?.kind === 'success' && (
        <p role="status" className="text-sm text-text-secondary">
          {summaryText(outcome.summary)}
          {outcome.summary.imported.length > 0 && ' — reloading to apply your restored settings…'}
        </p>
      )}
      {outcome?.kind === 'error' && (
        <p role="alert" className="text-sm text-red-500">
          {outcome.message}
        </p>
      )}
    </div>
  );
}

registerSettingsSection({
  id: 'data-backup',
  label: 'Backup & Restore',
  Component: DataBackupSectionPanel,
});
