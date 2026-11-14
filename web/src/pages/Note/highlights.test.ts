import { describe, it, expect } from 'vitest';
import { addHighlight, groupHighlightsByBlock, loadHighlights, removeHighlight, setHighlightNote } from './highlights';

describe('highlights storage', () => {
  it('returns an empty array when nothing is saved yet', () => {
    expect(loadHighlights('two-pointer-technique')).toEqual([]);
  });

  it('adds a highlight and persists it under the page-specific key', () => {
    const result = addHighlight('two-pointer-technique', 'block-0003', 'two indices moving toward each other');
    expect(result).toHaveLength(1);
    expect(result[0].blockId).toBe('block-0003');
    expect(result[0].text).toBe('two indices moving toward each other');
    expect(typeof result[0].id).toBe('string');
    expect(typeof result[0].createdAt).toBe('number');

    // Independently re-read from storage -- proves it's actually
    // persisted, not just returned from in-memory state.
    expect(loadHighlights('two-pointer-technique')).toHaveLength(1);
  });

  it('trims whitespace and no-ops on an empty selection', () => {
    const trimmed = addHighlight('folder-a', 'block-0001', '  padded text  ');
    expect(trimmed[0].text).toBe('padded text');

    const before = loadHighlights('folder-b');
    const afterEmpty = addHighlight('folder-b', 'block-0001', '   ');
    expect(afterEmpty).toEqual(before);
  });

  it('removes a highlight by id, leaving the others intact', () => {
    addHighlight('folder-c', 'block-0001', 'first highlight');
    const afterSecond = addHighlight('folder-c', 'block-0002', 'second highlight');
    const idToRemove = afterSecond.find((h) => h.text === 'first highlight')!.id;

    const result = removeHighlight('folder-c', idToRemove);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('second highlight');
  });

  it('keeps two different pages independent', () => {
    addHighlight('folder-x', 'block-0001', 'only in x');
    expect(loadHighlights('folder-y')).toEqual([]);
  });

  it('groups a flat list by blockId', () => {
    const flat = [
      { id: 'h1', blockId: 'block-0001', text: 'a', createdAt: 1 },
      { id: 'h2', blockId: 'block-0001', text: 'b', createdAt: 2 },
      { id: 'h3', blockId: 'block-0002', text: 'c', createdAt: 3 },
    ];
    const grouped = groupHighlightsByBlock(flat);
    expect(grouped['block-0001']).toHaveLength(2);
    expect(grouped['block-0002']).toHaveLength(1);
    expect(grouped['block-0003']).toBeUndefined();
  });

  it('ignores malformed localStorage content instead of throwing', () => {
    localStorage.setItem('highlights-folder-broken', 'not json');
    expect(loadHighlights('folder-broken')).toEqual([]);

    localStorage.setItem('highlights-folder-shape', JSON.stringify([{ id: 'ok' }, 'garbage', 42]));
    expect(loadHighlights('folder-shape')).toEqual([]);
  });
});

describe('highlight notes (P1-2)', () => {
  it('has no note on a freshly-added highlight', () => {
    const [highlight] = addHighlight('folder-notes-a', 'block-0001', 'some highlighted text');
    expect(highlight.note).toBeUndefined();
  });

  it('sets a note on an existing highlight and persists it', () => {
    const [highlight] = addHighlight('folder-notes-b', 'block-0001', 'some highlighted text');
    const result = setHighlightNote('folder-notes-b', highlight.id, 'This is important for the exam.');
    expect(result[0].note).toBe('This is important for the exam.');

    // Independently re-read from storage -- proves it's actually
    // persisted, not just returned from in-memory state.
    expect(loadHighlights('folder-notes-b')[0].note).toBe('This is important for the exam.');
  });

  it('trims a note the same way addHighlight trims selected text', () => {
    const [highlight] = addHighlight('folder-notes-c', 'block-0001', 'text');
    const result = setHighlightNote('folder-notes-c', highlight.id, '  padded note  ');
    expect(result[0].note).toBe('padded note');
  });

  it('clears a note (stores undefined, not an empty string) when given whitespace-only input', () => {
    const [highlight] = addHighlight('folder-notes-d', 'block-0001', 'text');
    setHighlightNote('folder-notes-d', highlight.id, 'a real note');
    const cleared = setHighlightNote('folder-notes-d', highlight.id, '   ');
    expect(cleared[0].note).toBeUndefined();
  });

  it('only updates the targeted highlight, leaving others untouched', () => {
    addHighlight('folder-notes-e', 'block-0001', 'first');
    const afterSecond = addHighlight('folder-notes-e', 'block-0002', 'second');
    const second = afterSecond.find((h) => h.text === 'second')!;

    const result = setHighlightNote('folder-notes-e', second.id, 'note on second only');
    const first = result.find((h) => h.text === 'first')!;
    expect(first.note).toBeUndefined();
    expect(result.find((h) => h.text === 'second')!.note).toBe('note on second only');
  });

  it('no-ops safely for an id that does not exist', () => {
    addHighlight('folder-notes-f', 'block-0001', 'first');
    const before = loadHighlights('folder-notes-f');
    const after = setHighlightNote('folder-notes-f', 'not-a-real-id', 'orphan note');
    expect(after).toEqual(before);
  });

  it('keeps two different pages independent', () => {
    const [highlight] = addHighlight('folder-notes-g', 'block-0001', 'text');
    setHighlightNote('folder-notes-g', highlight.id, 'only in g');
    expect(loadHighlights('folder-notes-h')).toEqual([]);
  });

  it('accepts a note field on load without breaking the malformed-shape filter', () => {
    localStorage.setItem(
      'highlights-folder-notes-i',
      JSON.stringify([{ id: 'hl-1', blockId: 'block-0001', text: 'x', createdAt: 1, note: 'a note' }])
    );
    expect(loadHighlights('folder-notes-i')[0].note).toBe('a note');

    // A non-string note is still rejected, same discipline as every
    // other field this filter already checks.
    localStorage.setItem(
      'highlights-folder-notes-j',
      JSON.stringify([{ id: 'hl-1', blockId: 'block-0001', text: 'x', createdAt: 1, note: 42 }])
    );
    expect(loadHighlights('folder-notes-j')).toEqual([]);
  });
});
