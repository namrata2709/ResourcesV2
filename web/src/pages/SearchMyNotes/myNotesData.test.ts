import { describe, it, expect, afterEach } from 'vitest';
import { buildMyNotesItems } from './myNotesData';
import { highlightsKey, bookmarksKey } from '../../lib/storageKeys';
import type { Note } from '../NotesIndex';

function makeNote(overrides: Partial<Note> & { folder: string; title: string }): Note {
  return {
    subject: 'aws',
    session: null,
    date: '2026-07-01',
    lastModified: '2026-07-01',
    readTimeMinutes: 10,
    category: 'General',
    tags: [],
    hasImages: false,
    images: [],
    files: [],
    ...overrides,
  } as Note;
}

describe('buildMyNotesItems (P3-1)', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('excludes notes with no highlights and no bookmarks', () => {
    const notes = [makeNote({ folder: 'a', title: 'A' })];
    expect(buildMyNotesItems(notes)).toEqual([]);
  });

  it('includes a note that has at least one saved highlight', () => {
    localStorage.setItem(
      highlightsKey('a'),
      JSON.stringify([{ id: 'hl-1', blockId: 'b1', text: 'x', createdAt: 1 }]),
    );
    const notes = [makeNote({ folder: 'a', title: 'A' })];
    const result = buildMyNotesItems(notes);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
    expect(result[0].highlightCount).toBe(1);
    expect(result[0].bookmarkCount).toBe(0);
  });

  it('includes a note that has at least one bookmarked section, independent of highlights', () => {
    localStorage.setItem(bookmarksKey('b'), JSON.stringify(['section-1', 'section-2']));
    const notes = [makeNote({ folder: 'b', title: 'B' })];
    const result = buildMyNotesItems(notes);
    expect(result).toHaveLength(1);
    expect(result[0].bookmarkCount).toBe(2);
    expect(result[0].highlightCount).toBe(0);
  });

  it('ignores malformed/corrupt storage for a folder rather than throwing', () => {
    localStorage.setItem(highlightsKey('c'), '{not json');
    const notes = [makeNote({ folder: 'c', title: 'C' })];
    expect(buildMyNotesItems(notes)).toEqual([]);
  });

  it('does not conflate favorites with highlights/bookmarks — a merely-favorited note stays excluded', () => {
    localStorage.setItem('notesFavorites', JSON.stringify(['d']));
    const notes = [makeNote({ folder: 'd', title: 'D' })];
    expect(buildMyNotesItems(notes)).toEqual([]);
  });

  it('preserves every original Note field on the returned item', () => {
    localStorage.setItem(
      highlightsKey('e'),
      JSON.stringify([{ id: 'hl-1', blockId: 'b1', text: 'x', createdAt: 1 }]),
    );
    const note = makeNote({ folder: 'e', title: 'E', tags: ['Foo', 'Bar'] });
    const result = buildMyNotesItems([note]);
    expect(result[0].title).toBe('E');
    expect(result[0].tags).toEqual(['Foo', 'Bar']);
  });
});
