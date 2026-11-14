import { describe, it, expect } from 'vitest';
import { getStickyNote, saveStickyNote, deleteStickyNote } from './stickyNotes';

describe('lib/stickyNotes', () => {
  describe('getStickyNote', () => {
    it('returns null when no note exists for the page', () => {
      expect(getStickyNote('home')).toBeNull();
    });

    it('returns null for malformed JSON', () => {
      localStorage.setItem('stickyNotes-home', '{not json');
      expect(getStickyNote('home')).toBeNull();
    });

    it('returns null for a wrong/missing version', () => {
      localStorage.setItem('stickyNotes-home', JSON.stringify({ v: 2, text: 'hi', updatedAt: 'now' }));
      expect(getStickyNote('home')).toBeNull();
    });

    it('returns the saved note when valid', () => {
      saveStickyNote('home', 'Remember to review VPC peering');
      const note = getStickyNote('home');
      expect(note?.text).toBe('Remember to review VPC peering');
      expect(note?.v).toBe(1);
      expect(typeof note?.updatedAt).toBe('string');
    });
  });

  describe('saveStickyNote', () => {
    it('persists under stickyNotes-<pageId> as v:1 JSON', () => {
      saveStickyNote('quiz--aws-vpc', 'hello');
      const raw = JSON.parse(localStorage.getItem('stickyNotes-quiz--aws-vpc')!);
      expect(raw).toMatchObject({ v: 1, text: 'hello' });
    });

    it('does not collide across different pages', () => {
      saveStickyNote('home', 'note on home');
      saveStickyNote('gallery', 'note on gallery');

      expect(getStickyNote('home')?.text).toBe('note on home');
      expect(getStickyNote('gallery')?.text).toBe('note on gallery');
    });

    it('overwrites the previous note for the same page', () => {
      saveStickyNote('home', 'first draft');
      saveStickyNote('home', 'second draft');

      expect(getStickyNote('home')?.text).toBe('second draft');
    });

    it('allows saving an empty string (mid-edit), without deleting the entry', () => {
      saveStickyNote('home', '');
      const raw = localStorage.getItem('stickyNotes-home');
      expect(raw).not.toBeNull();
      expect(getStickyNote('home')?.text).toBe('');
    });

    it('updates updatedAt on every save', () => {
      const first = saveStickyNote('home', 'v1');
      const second = saveStickyNote('home', 'v2');
      expect(typeof first.updatedAt).toBe('string');
      expect(typeof second.updatedAt).toBe('string');
    });
  });

  describe('deleteStickyNote', () => {
    it('removes the note for a page entirely', () => {
      saveStickyNote('home', 'to be deleted');
      expect(getStickyNote('home')).not.toBeNull();

      deleteStickyNote('home');

      expect(getStickyNote('home')).toBeNull();
      expect(localStorage.getItem('stickyNotes-home')).toBeNull();
    });

    it('only removes the targeted page, not others', () => {
      saveStickyNote('home', 'keep me');
      saveStickyNote('gallery', 'delete me');

      deleteStickyNote('gallery');

      expect(getStickyNote('home')?.text).toBe('keep me');
      expect(getStickyNote('gallery')).toBeNull();
    });

    it('is a no-op when no note exists for the page', () => {
      expect(() => deleteStickyNote('nonexistent')).not.toThrow();
    });
  });
});
