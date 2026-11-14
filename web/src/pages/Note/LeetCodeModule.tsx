/**
 * LeetCodeModule — a DSA note's LeetCode Problems section, rendered via
 * the shared `Table` component (T5-3a's), per T5-3b's own note:
 * confirmed a real `<table>` in vanilla (`dsa-problems.js` builds
 * `<table>`/`<th>`/`<td>` directly), so this reuses `Table` with its own
 * column config rather than building a fourth table implementation.
 * DSA-only — Note.tsx only renders this for `note.subject === 'dsa'`.
 */

import { useEffect, useState } from 'react';
import { Table } from '../../components/Table';
import { dataPath } from '../../lib/siteConfig';
import type { LeetCodeData } from './types';

interface LeetCodeModuleProps {
  folder: string;
}

export function LeetCodeModule({ folder }: LeetCodeModuleProps) {
  const [data, setData] = useState<LeetCodeData | null | 'missing'>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(dataPath('notes', folder, 'json', 'leetcode.json'))
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json: LeetCodeData) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [folder]);

  if (data === null || data === 'missing' || data.problems.length === 0) return null;

  return (
    <section aria-labelledby="notes-leetcode-heading" className="mt-8">
      <h2 id="notes-leetcode-heading" className="text-lg font-semibold text-text-primary mb-3">
        {data.title || 'LeetCode Problems'}
      </h2>
      <Table
        caption={data.title || 'LeetCode Problems'}
        rows={data.problems}
        rowKey={(p) => p.id}
        columns={[
          {
            key: 'title',
            header: 'Problem',
            render: (p) =>
              p.url ? (
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-accent underline">
                  {p.title}
                </a>
              ) : (
                p.title
              ),
          },
          { key: 'difficulty', header: 'Difficulty', width: '8rem', render: (p) => p.difficulty },
          { key: 'pattern', header: 'Pattern', render: (p) => p.pattern || '—' },
        ]}
      />
    </section>
  );
}
