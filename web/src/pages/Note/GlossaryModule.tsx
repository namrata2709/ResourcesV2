/**
 * GlossaryModule — a note's glossary section, rendered via the shared
 * `Table` component: term / definition / example, 3 columns, per
 * T5-3a's own scope note. Purely informational (no completion state to
 * track — a glossary isn't a checklist), so no progress bar here.
 */

import { useEffect, useState } from 'react';
import { Table } from '../../components/Table';
import { dataPath } from '../../lib/siteConfig';
import type { GlossaryData } from './types';

interface GlossaryModuleProps {
  folder: string;
}

export function GlossaryModule({ folder }: GlossaryModuleProps) {
  const [data, setData] = useState<GlossaryData | null | 'missing'>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(dataPath('notes', folder, 'json', 'glossary.json'))
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json: GlossaryData) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [folder]);

  if (data === null || data === 'missing' || data.terms.length === 0) return null;

  return (
    <section aria-labelledby="notes-glossary-heading" className="mt-8">
      <h2 id="notes-glossary-heading" className="text-lg font-semibold text-text-primary mb-3">
        {data.title || 'Glossary'}
      </h2>
      <Table
        caption={data.title || 'Glossary'}
        rows={data.terms}
        rowKey={(term) => term.id}
        columns={[
          { key: 'term', header: 'Term', width: '25%', render: (t) => <strong>{t.term}</strong> },
          { key: 'definition', header: 'Definition', render: (t) => t.definition },
          { key: 'example', header: 'Example', render: (t) => t.example || '—' },
        ]}
      />
    </section>
  );
}
