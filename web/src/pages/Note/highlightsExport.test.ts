import { describe, it, expect } from 'vitest';
import { buildHighlightsExportText } from './highlightsExport';
import type { Highlight } from './highlights';

describe('buildHighlightsExportText', () => {
  it('titles the export with the note title', () => {
    const text = buildHighlightsExportText('Merge Sort', [
      { id: 'hl-1', blockId: 'b1', text: 'Divide and conquer.', createdAt: 1 },
    ]);
    expect(text.startsWith('# Exam Highlights — Merge Sort\n')).toBe(true);
  });

  it('numbers highlights in the order given (creation order)', () => {
    const highlights: Highlight[] = [
      { id: 'hl-1', blockId: 'b1', text: 'First.', createdAt: 1 },
      { id: 'hl-2', blockId: 'b2', text: 'Second.', createdAt: 2 },
    ];
    const text = buildHighlightsExportText('Note', highlights);
    const firstIndex = text.indexOf('1. First.');
    const secondIndex = text.indexOf('2. Second.');
    expect(firstIndex).toBeGreaterThanOrEqual(0);
    expect(secondIndex).toBeGreaterThan(firstIndex);
  });

  it('includes a personal note (P1-2) directly under its highlight', () => {
    const text = buildHighlightsExportText('Note', [
      { id: 'hl-1', blockId: 'b1', text: 'Key point.', createdAt: 1, note: 'Review before exam' },
    ]);
    const lines = text.split('\n');
    const highlightLine = lines.findIndex((l) => l === '1. Key point.');
    expect(lines[highlightLine + 1]).toBe('   Note: Review before exam');
  });

  it('omits a note line entirely when the highlight has no note', () => {
    const text = buildHighlightsExportText('Note', [
      { id: 'hl-1', blockId: 'b1', text: 'No note here.', createdAt: 1 },
    ]);
    expect(text).not.toContain('Note:');
  });

  it('ends with exactly one trailing newline', () => {
    const text = buildHighlightsExportText('Note', [
      { id: 'hl-1', blockId: 'b1', text: 'Only one.', createdAt: 1 },
    ]);
    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
  });
});
