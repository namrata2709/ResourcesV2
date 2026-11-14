import { describe, it, expect } from 'vitest';
import { buildBackup, importBackup, BACKUP_SCHEMA_VERSION, type BackupFile } from './dataBackup';

describe('dataBackup', () => {
  describe('buildBackup', () => {
    it('captures every current localStorage key/value pair', () => {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('notesFavorites', JSON.stringify(['dsa-merge-sort']));

      const backup = buildBackup();

      expect(backup.entries.theme).toBe('dark');
      expect(backup.entries.notesFavorites).toBe(JSON.stringify(['dsa-merge-sort']));
    });

    it('stamps the current schema version and an ISO exportedAt timestamp', () => {
      const backup = buildBackup();
      expect(backup.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
      expect(() => new Date(backup.exportedAt).toISOString()).not.toThrow();
    });

    it('produces an empty entries object when localStorage is empty', () => {
      const backup = buildBackup();
      expect(backup.entries).toEqual({});
    });

    it('automatically picks up a key it has never heard of (no hardcoded key list)', () => {
      localStorage.setItem('someBrandNewFeatureKey', 'hello');
      const backup = buildBackup();
      expect(backup.entries.someBrandNewFeatureKey).toBe('hello');
    });
  });

  describe('importBackup', () => {
    function makeBackup(entries: Record<string, string>): string {
      const backup: BackupFile = {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        entries,
      };
      return JSON.stringify(backup);
    }

    it('throws on invalid JSON', () => {
      expect(() => importBackup('{not valid json')).toThrow(/not valid JSON/i);
    });

    it('throws on valid JSON that is not a backup file', () => {
      expect(() => importBackup(JSON.stringify({ foo: 'bar' }))).toThrow(/does not look like/i);
    });

    it('restores every key into a fresh (empty) localStorage', () => {
      const raw = makeBackup({ theme: 'dark', notesFavorites: JSON.stringify(['dsa-merge-sort']) });

      const summary = importBackup(raw);

      expect(localStorage.getItem('theme')).toBe('dark');
      expect(localStorage.getItem('notesFavorites')).toBe(JSON.stringify(['dsa-merge-sort']));
      expect(summary.imported).toEqual(expect.arrayContaining(['theme', 'notesFavorites']));
      expect(summary.skippedOlderVersion).toEqual([]);
    });

    it('overwrites an unversioned existing value unconditionally', () => {
      localStorage.setItem('theme', 'light');
      const raw = makeBackup({ theme: 'dark' });

      const summary = importBackup(raw);

      expect(localStorage.getItem('theme')).toBe('dark');
      expect(summary.imported).toEqual(['theme']);
    });

    it('does NOT overwrite a versioned key with an older-versioned incoming value (corruption guard)', () => {
      const newerOnDisk = JSON.stringify({ v: 2, percent: 80, timestamp: 1000 });
      localStorage.setItem('readingProgress-folder-dsa-merge-sort', newerOnDisk);

      const olderIncoming = JSON.stringify({ v: 1, percent: 10, timestamp: 500 });
      const raw = makeBackup({ 'readingProgress-folder-dsa-merge-sort': olderIncoming });

      const summary = importBackup(raw);

      expect(localStorage.getItem('readingProgress-folder-dsa-merge-sort')).toBe(newerOnDisk);
      expect(summary.skippedOlderVersion).toEqual(['readingProgress-folder-dsa-merge-sort']);
      expect(summary.imported).toEqual([]);
    });

    it('DOES overwrite a versioned key when the incoming value is the same version or newer', () => {
      localStorage.setItem(
        'readingProgress-folder-dsa-merge-sort',
        JSON.stringify({ v: 1, percent: 10, timestamp: 500 })
      );
      const newerIncoming = JSON.stringify({ v: 2, percent: 80, timestamp: 1000 });
      const raw = makeBackup({ 'readingProgress-folder-dsa-merge-sort': newerIncoming });

      const summary = importBackup(raw);

      expect(localStorage.getItem('readingProgress-folder-dsa-merge-sort')).toBe(newerIncoming);
      expect(summary.imported).toEqual(['readingProgress-folder-dsa-merge-sort']);
    });

    it('imports a versioned key that does not exist yet regardless of its version number', () => {
      const raw = makeBackup({
        'readingProgress-folder-dsa-merge-sort': JSON.stringify({ v: 1, percent: 10, timestamp: 500 }),
      });

      const summary = importBackup(raw);

      expect(localStorage.getItem('readingProgress-folder-dsa-merge-sort')).not.toBeNull();
      expect(summary.imported).toEqual(['readingProgress-folder-dsa-merge-sort']);
    });

    it('a newer on-disk plain value (no v field) still gets overwritten -- only versioned shapes are protected', () => {
      localStorage.setItem('theme', 'dark');
      const raw = makeBackup({ theme: 'light' });

      const summary = importBackup(raw);

      expect(localStorage.getItem('theme')).toBe('light');
      expect(summary.imported).toEqual(['theme']);
    });

    it('flags a non-string entry value as invalid rather than importing it', () => {
      const backup = {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        entries: { theme: 123 as unknown as string },
      };

      const summary = importBackup(JSON.stringify(backup));

      expect(summary.invalidEntries).toEqual(['theme']);
      expect(summary.imported).toEqual([]);
    });

    it('round-trips a full real backup (export then import) with no loss', () => {
      localStorage.setItem('theme', 'comfort');
      localStorage.setItem('notesFavorites', JSON.stringify(['dsa-linear-search']));
      localStorage.setItem('dashboardCardOrder', JSON.stringify(['quiz', 'aws', 'dsa']));

      const raw = makeBackup({
        theme: localStorage.getItem('theme')!,
        notesFavorites: localStorage.getItem('notesFavorites')!,
        dashboardCardOrder: localStorage.getItem('dashboardCardOrder')!,
      });

      localStorage.clear();
      const summary = importBackup(raw);

      expect(localStorage.getItem('theme')).toBe('comfort');
      expect(localStorage.getItem('notesFavorites')).toBe(JSON.stringify(['dsa-linear-search']));
      expect(localStorage.getItem('dashboardCardOrder')).toBe(JSON.stringify(['quiz', 'aws', 'dsa']));
      expect(summary.imported.sort()).toEqual(['dashboardCardOrder', 'notesFavorites', 'theme']);
    });
  });
});
