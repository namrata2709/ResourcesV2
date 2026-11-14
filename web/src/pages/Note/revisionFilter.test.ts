import { describe, it, expect } from 'vitest';
import { filterBlocksForRevision } from './revisionFilter';
import type { BodyProseBlock } from './types';
import type { Highlight } from './highlights';

function mkHighlight(overrides: Partial<Highlight> = {}): Highlight {
  return { id: 'hl-1', blockId: 'block-0001', text: 'sample', createdAt: 0, ...overrides };
}

describe('filterBlocksForRevision', () => {
  it('drops plain paragraphs and keeps a highlighted one', () => {
    const blocks: BodyProseBlock[] = [
      { type: 'paragraph', runs: [{ text: 'plain', mark: null }], blockId: 'block-0001' } as BodyProseBlock,
      { type: 'paragraph', runs: [{ text: 'highlighted', mark: null }], blockId: 'block-0002' } as BodyProseBlock,
    ];
    const byBlock = { 'block-0002': [mkHighlight({ blockId: 'block-0002' })] };

    const result = filterBlocksForRevision(blocks, byBlock, []);

    expect(result).toHaveLength(1);
    expect((result[0] as any).blockId).toBe('block-0002');
  });

  it('keeps a heading that precedes a qualifying block, drops one that does not', () => {
    const blocks: BodyProseBlock[] = [
      { type: 'heading', level: 2, id: 'kept-section', text: [{ text: 'Kept', mark: null }] } as BodyProseBlock,
      { type: 'paragraph', runs: [{ text: 'highlighted', mark: null }], blockId: 'block-0002' } as BodyProseBlock,
      { type: 'heading', level: 2, id: 'empty-section', text: [{ text: 'Empty', mark: null }] } as BodyProseBlock,
      { type: 'paragraph', runs: [{ text: 'plain', mark: null }], blockId: 'block-0004' } as BodyProseBlock,
    ];
    const byBlock = { 'block-0002': [mkHighlight({ blockId: 'block-0002' })] };

    const result = filterBlocksForRevision(blocks, byBlock, []);

    expect(result.map((b) => (b.type === 'heading' ? b.id : (b as any).blockId))).toEqual(['kept-section', 'block-0002']);
  });

  it('keeps a bookmarked heading even with no qualifying content after it', () => {
    const blocks: BodyProseBlock[] = [
      { type: 'heading', level: 2, id: 'bookmarked-section', text: [{ text: 'Bookmarked', mark: null }] } as BodyProseBlock,
      { type: 'paragraph', runs: [{ text: 'plain', mark: null }], blockId: 'block-0001' } as BodyProseBlock,
    ];

    const result = filterBlocksForRevision(blocks, {}, ['bookmarked-section']);

    expect(result).toHaveLength(1);
    expect((result[0] as any).id).toBe('bookmarked-section');
  });

  it('drops the trailing heading of a note with nothing after it', () => {
    const blocks: BodyProseBlock[] = [
      { type: 'paragraph', runs: [{ text: 'highlighted', mark: null }], blockId: 'block-0001' } as BodyProseBlock,
      { type: 'heading', level: 2, id: 'trailing', text: [{ text: 'Trailing', mark: null }] } as BodyProseBlock,
    ];
    const byBlock = { 'block-0001': [mkHighlight({ blockId: 'block-0001' })] };

    const result = filterBlocksForRevision(blocks, byBlock, []);

    expect(result).toHaveLength(1);
    expect((result[0] as any).blockId).toBe('block-0001');
  });

  it('recurses into a collapsible, keeping it only if a child qualifies or it is bookmarked', () => {
    const collapsibleWithHighlightedChild: BodyProseBlock = {
      type: 'collapsible',
      level: 2,
      id: 'coll-1',
      heading: 'Has a highlight inside',
      open: false,
      children: [
        { type: 'paragraph', runs: [{ text: 'highlighted', mark: null }], blockId: 'block-0005' } as BodyProseBlock,
        { type: 'paragraph', runs: [{ text: 'plain', mark: null }], blockId: 'block-0006' } as BodyProseBlock,
      ],
    } as BodyProseBlock;
    const emptyCollapsible: BodyProseBlock = {
      type: 'collapsible',
      level: 2,
      id: 'coll-2',
      heading: 'Nothing inside',
      open: false,
      children: [{ type: 'paragraph', runs: [{ text: 'plain', mark: null }], blockId: 'block-0007' } as BodyProseBlock],
    } as BodyProseBlock;

    const byBlock = { 'block-0005': [mkHighlight({ blockId: 'block-0005' })] };
    const result = filterBlocksForRevision([collapsibleWithHighlightedChild, emptyCollapsible], byBlock, []);

    expect(result).toHaveLength(1);
    const kept = result[0] as any;
    expect(kept.id).toBe('coll-1');
    expect(kept.children).toHaveLength(1);
    expect(kept.children[0].blockId).toBe('block-0005');
  });

  it('keeps a bookmarked collapsible even with no qualifying children', () => {
    const collapsible: BodyProseBlock = {
      type: 'collapsible',
      level: 2,
      id: 'coll-bookmarked',
      heading: 'Bookmarked, nothing highlighted inside',
      open: false,
      children: [{ type: 'paragraph', runs: [{ text: 'plain', mark: null }], blockId: 'block-0008' } as BodyProseBlock],
    } as BodyProseBlock;

    const result = filterBlocksForRevision([collapsible], {}, ['coll-bookmarked']);

    expect(result).toHaveLength(1);
    expect((result[0] as any).children).toHaveLength(0);
  });

  it('returns an empty array for a note with no highlights or bookmarks at all', () => {
    const blocks: BodyProseBlock[] = [
      { type: 'heading', level: 2, id: 'section', text: [{ text: 'Section', mark: null }] } as BodyProseBlock,
      { type: 'paragraph', runs: [{ text: 'plain', mark: null }], blockId: 'block-0001' } as BodyProseBlock,
    ];

    expect(filterBlocksForRevision(blocks, {}, [])).toEqual([]);
  });
});
