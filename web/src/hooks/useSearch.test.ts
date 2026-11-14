import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSearch, type SearchableItem, type SearchField } from './useSearch';

/**
 * useSearch.test.ts
 *
 * Covers the T3-2a Testing spec:
 *   - a known query ranks results the way notes-index.js's FlexSearch
 *     setup currently ranks them — weighted field scoring intact, not
 *     just substring matching. Proven with a fixture specifically
 *     constructed so a plain substring-match implementation would get
 *     the order WRONG: "lambda" appears in a low-weight field (tags) on
 *     one item and a high-weight field (title) on another. If ranking
 *     ever regresses to unweighted/substring matching, this test catches
 *     it by failing on order, not just presence.
 *   - an empty query returns the full, unfiltered item list
 */

interface Fixture extends SearchableItem {
  title: string;
  tags: string;
  category: string;
  session: string;
}

const FIELDS: SearchField[] = [
  { name: 'title', weight: 4 },
  { name: 'tags', weight: 3 },
  { name: 'category', weight: 2 },
  { name: 'session', weight: 1 },
];

const FIXTURE_ITEMS: Fixture[] = [
  // "lambda" only in the LOW-weight tags field
  { id: 'a', title: 'EC2 Basics', tags: 'lambda serverless', category: 'Compute', session: '' },
  // "lambda" in the HIGH-weight title field
  { id: 'b', title: 'Lambda Deep Dive', tags: 'compute', category: 'Serverless', session: '' },
  // no mention of lambda at all
  { id: 'c', title: 'S3 Storage Basics', tags: 'storage', category: 'Storage', session: '' },
];

describe('useSearch', () => {
  it('ranks a title-field match above a tags-field match for the same term (weighted, not substring)', () => {
    const { result } = renderHook(() => useSearch(FIXTURE_ITEMS, 'lambda', FIELDS));

    const ids = result.current.map((item) => item.id);
    expect(ids).toContain('a');
    expect(ids).toContain('b');
    expect(ids).not.toContain('c'); // no match at all

    // "b" (title match, weight 4) must outrank "a" (tags match, weight 3)
    // — a plain substring implementation with no field weighting would
    // have no reason to prefer one over the other.
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('a'));
  });

  it('returns the full, unfiltered item list for an empty query', () => {
    const { result } = renderHook(() => useSearch(FIXTURE_ITEMS, '', FIELDS));
    expect(result.current).toHaveLength(FIXTURE_ITEMS.length);
    expect(result.current.map((i) => i.id)).toEqual(FIXTURE_ITEMS.map((i) => i.id));
  });

  it('returns the full list for a whitespace-only query too', () => {
    const { result } = renderHook(() => useSearch(FIXTURE_ITEMS, '   ', FIELDS));
    expect(result.current).toHaveLength(FIXTURE_ITEMS.length);
  });

  it('returns an empty array when nothing matches', () => {
    const { result } = renderHook(() => useSearch(FIXTURE_ITEMS, 'zzz-no-match-zzz', FIELDS));
    expect(result.current).toEqual([]);
  });
});
