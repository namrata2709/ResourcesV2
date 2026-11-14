import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import './DataBackupSection'; // registers itself as a side effect — see sections/index.ts's own comment
import { getSettingsSections } from '../registry';
import { BACKUP_SCHEMA_VERSION } from '../../../lib/dataBackup';

function renderDataBackupSection() {
  const section = getSettingsSections().find((s) => s.id === 'data-backup');
  if (!section) {
    throw new Error('DataBackupSection did not register itself — check the side-effect import above');
  }
  return render(<section.Component />);
}

function makeBackupFile(entries: Record<string, string>): File {
  const backup = { schemaVersion: BACKUP_SCHEMA_VERSION, exportedAt: new Date().toISOString(), entries };
  return new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });
}

describe('DataBackupSection', () => {
  const reloadSpy = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    // jsdom doesn't implement real navigation — location.reload() would
    // throw "Not implemented" if actually invoked, so it's replaced with
    // a spy. This is real behavior under test (see the reload-after-
    // import fix below), not incidental — every context in this app
    // (Theme/Appearance/A11y/...) only reads localStorage once at
    // initial mount, so a restore that writes storage directly without
    // triggering a reload would silently succeed on disk while the
    // visible app kept showing stale state.
    vi.stubGlobal('location', { ...window.location, reload: reloadSpy });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    reloadSpy.mockClear();
  });

  it('registers itself under the "data-backup" id with label "Backup & Restore"', () => {
    const section = getSettingsSections().find((s) => s.id === 'data-backup');
    expect(section?.label).toBe('Backup & Restore');
  });

  it('renders Export and Import buttons', () => {
    renderDataBackupSection();
    expect(screen.getByRole('button', { name: 'Export backup' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import backup' })).toBeInTheDocument();
  });

  it('clicking Export does not throw (triggerDownload is a real DOM side effect, not asserted here)', () => {
    renderDataBackupSection();
    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Export backup' }))).not.toThrow();
  });

  it('importing a valid backup file shows a success summary, restores the key, and reloads to apply it', async () => {
    renderDataBackupSection();
    const file = makeBackupFile({ theme: 'dark' });
    const input = screen.getByLabelText('Choose a backup file to import');

    fireEvent.change(input, { target: { files: [file] } });

    await vi.waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('1 setting restored');
    });
    expect(localStorage.getItem('theme')).toBe('dark');

    // Reload is intentionally delayed (long enough to read the summary
    // line), not instant — shouldn't have fired yet.
    expect(reloadSpy).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(3000);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('does not reload when nothing was actually imported (e.g. every entry skipped/invalid)', async () => {
    localStorage.setItem('theme', JSON.stringify({ v: 5 }));
    renderDataBackupSection();
    const file = makeBackupFile({ theme: JSON.stringify({ v: 1 }) });
    const input = screen.getByLabelText('Choose a backup file to import');

    fireEvent.change(input, { target: { files: [file] } });

    await vi.waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('0 settings restored');
    });

    await vi.advanceTimersByTimeAsync(3000);
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('importing an invalid file shows an error message, not a crash, and does not reload', async () => {
    renderDataBackupSection();
    const file = new File(['not valid json'], 'backup.json', { type: 'application/json' });
    const input = screen.getByLabelText('Choose a backup file to import');

    fireEvent.change(input, { target: { files: [file] } });

    await vi.waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/not valid JSON/i);
    });

    await vi.advanceTimersByTimeAsync(3000);
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('reports skipped-older-version entries distinctly from imported ones', async () => {
    localStorage.setItem('readingProgress-folder-dsa-merge-sort', JSON.stringify({ v: 2, percent: 90 }));
    renderDataBackupSection();
    const file = makeBackupFile({
      'readingProgress-folder-dsa-merge-sort': JSON.stringify({ v: 1, percent: 5 }),
      theme: 'light',
    });
    const input = screen.getByLabelText('Choose a backup file to import');

    fireEvent.change(input, { target: { files: [file] } });

    await vi.waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('1 setting restored');
      expect(screen.getByRole('status')).toHaveTextContent('1 skipped');
    });
  });
});
