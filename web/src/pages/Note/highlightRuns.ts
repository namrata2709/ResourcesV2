/**
 * pages/Note/highlightRuns.ts — P1-1: splits a block's `runs` array so
 * highlighted spans can render as their own segments (wrapped in
 * `<mark>` by BodyProse.tsx), without disturbing the block's existing
 * `mark` styling (bold/italic/code/link/...).
 *
 * Matching is done against the block's FLATTENED plain text (the
 * concatenation of every run's `text`), not run-by-run -- a real
 * mouse/touch selection routinely spans more than one run (e.g. part
 * plain text, part `**bold**`), and matching only within a single run
 * would silently fail to highlight anything for that (common) case.
 * Existing run boundaries are still respected as hard split points:
 * a highlight spanning two differently-styled runs renders as two
 * separately-wrapped `<mark>` segments sharing the same `highlightId`,
 * rather than merging styles that were never meant to merge.
 *
 * Only each highlight's FIRST occurrence in the block is matched --
 * matches this ticket's own save-time behavior (the exact selected
 * text, anchored to the specific block the selection was made in), and
 * avoids a duplicate-word inside the same paragraph accidentally
 * double-highlighting.
 */

import type { BodyProseRun } from './types';

export interface HighlightedRun extends BodyProseRun {
  highlightId?: string;
}

interface HighlightMatch {
  id: string;
  text: string;
}

export function highlightRuns(runs: BodyProseRun[], highlights: HighlightMatch[]): HighlightedRun[] {
  if (!highlights.length || !runs.length) return runs.map((r) => ({ ...r }));

  const flat = runs.map((r) => r.text).join('');

  const ranges: { start: number; end: number; id: string }[] = [];
  for (const h of highlights) {
    if (!h.text) continue;
    const idx = flat.indexOf(h.text);
    if (idx === -1) continue;
    ranges.push({ start: idx, end: idx + h.text.length, id: h.id });
  }
  if (!ranges.length) return runs.map((r) => ({ ...r }));

  const out: HighlightedRun[] = [];
  let cursor = 0;
  for (const run of runs) {
    const runStart = cursor;
    const runEnd = cursor + run.text.length;
    cursor = runEnd;

    // Cut points inside this run, from any range boundary that falls
    // strictly within it, plus the run's own start/end.
    const cuts = new Set<number>([runStart, runEnd]);
    for (const r of ranges) {
      if (r.start > runStart && r.start < runEnd) cuts.add(r.start);
      if (r.end > runStart && r.end < runEnd) cuts.add(r.end);
    }
    const points = Array.from(cuts).sort((a, b) => a - b);

    for (let i = 0; i < points.length - 1; i++) {
      const segStart = points[i];
      const segEnd = points[i + 1];
      if (segStart === segEnd) continue;
      const text = run.text.slice(segStart - runStart, segEnd - runStart);
      const covering = ranges.find((r) => segStart >= r.start && segEnd <= r.end);
      out.push(covering ? { ...run, text, highlightId: covering.id } : { ...run, text });
    }
  }
  return out;
}
