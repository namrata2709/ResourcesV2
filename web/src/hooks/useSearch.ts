import { useMemo } from 'react';
import FlexSearch from 'flexsearch';

/**
 * useSearch — generic ranked-search hook, ported from notes-index.js's
 * FlexSearch.Document setup (buildSearchIndex() + searchNotes()).
 *
 * Design note on genericity: notes-index.js hardcoded 4 specific fields
 * with hardcoded weights. This hook takes `fields` as a parameter instead,
 * specifically so T3-2b's quiz-index can reuse it with its own field set
 * (per this ticket's own "Blocks: T3-2b" note) rather than copy-pasting
 * the FlexSearch setup a second time.
 *
 * Every item must have a unique `id: string` — FlexSearch.Document needs
 * a stable identity per document. Callers with a different unique key
 * (e.g. notes-index.json's `folder`) map it onto `id` before calling this
 * hook; that mapping stays the caller's concern, not this hook's.
 *
 * Ranking exactly matches searchNotes()'s formula: for each field, run a
 * separate FlexSearch query (suggest:true, so partial/typo'd terms like
 * "lamda" still surface "Lambda" notes), then combine scores as
 * `weight * positionalBoost`, where positionalBoost favors items FlexSearch
 * itself ranked earlier within that field's own result list
 * (`Math.max(1 - position * 0.01, 0.5)`). Summed across fields, then
 * sorted descending. An empty query returns the full, unranked item list
 * unchanged — no index query happens at all.
 *
 * Difference from notes-index.js worth knowing about: that file defended
 * against FlexSearch failing to load from a CDN
 * (`typeof FlexSearch === 'undefined'`), with a plain-substring fallback.
 * Here FlexSearch is a bundled npm dependency, not a CDN script race —
 * that failure mode doesn't exist, so there's no fallback branch to port.
 */

export interface SearchableItem {
  id: string;
  [key: string]: unknown;
}

export interface SearchField {
  /** Property name on the item to index. */
  name: string;
  /** Relative importance — matches notes-index.js's SEARCH_FIELD_WEIGHTS scheme (title:4, tags:3, category:2, session:1). */
  weight: number;
  /**
   * How to turn the item's raw field value into indexable text. Defaults
   * to String(value) — pass this explicitly for array fields (e.g. tags),
   * same as notes-index.js joining `(note.tags || []).join(' ')` before
   * handing it to FlexSearch.
   */
  getValue?: (item: SearchableItem) => string;
}

function defaultGetValue(item: SearchableItem, name: string): string {
  const raw = item[name];
  if (raw == null) return '';
  if (Array.isArray(raw)) return raw.join(' ');
  return String(raw);
}

/** Normalizes a FlexSearch.Document search() result into a flat, ranked array of ids — same shape searchNotes.js's extractIds() produces. */
function extractIds(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object' && raw[0] !== null && 'result' in (raw[0] as object)) {
    return (raw as Array<{ result: string[] }>).flatMap((r) => r.result);
  }
  return raw as string[];
}

export function useSearch<T extends SearchableItem>(items: T[], query: string, fields: SearchField[]): T[] {
  // Rebuilt only when `items` itself changes — never on every keystroke,
  // same "index once, query on keystroke" philosophy as buildSearchIndex().
  const index = useMemo(() => {
    const doc = new FlexSearch.Document({
      document: {
        id: 'id',
        index: fields.map((f) => ({ field: f.name, tokenize: 'forward' as const })),
      },
      tokenize: 'forward',
      cache: true,
    });

    for (const item of items) {
      const record: Record<string, string> = { id: item.id };
      for (const f of fields) {
        record[f.name] = (f.getValue ?? ((it: SearchableItem) => defaultGetValue(it, f.name)))(item);
      }
      doc.add(record);
    }

    return doc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return items;

    const scores = new Map<string, number>();
    for (const f of fields) {
      const raw = index.search(trimmed, { index: [f.name], suggest: true, limit: 100 });
      const ids = extractIds(raw);
      ids.forEach((id, position) => {
        const positional = Math.max(1 - position * 0.01, 0.5);
        scores.set(id, (scores.get(id) ?? 0) + f.weight * positional);
      });
    }

    return items
      .filter((item) => scores.has(item.id))
      .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, query, items]);
}
