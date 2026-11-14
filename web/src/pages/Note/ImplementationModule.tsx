/**
 * ImplementationModule — a DSA note's Implementation section,
 * Python/Java/C++ code-language tabs, rendered via the shared `TabPanel`
 * component (T5-3b's) — one of its two confirmed consumers (the other
 * being VisualisationModule's Images/Animation toggle below).
 * DSA-only — Note.tsx only renders this for `note.subject === 'dsa'`.
 */

import { useEffect, useState } from 'react';
import { TabPanel } from '../../components/TabPanel';
import { dataPath } from '../../lib/siteConfig';
import type { ImplementationData } from './types';

interface ImplementationModuleProps {
  folder: string;
}

export function ImplementationModule({ folder }: ImplementationModuleProps) {
  const [data, setData] = useState<ImplementationData | null | 'missing'>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(dataPath('notes', folder, 'json', 'implementation.json'))
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json: ImplementationData) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [folder]);

  if (data === null || data === 'missing' || data.languages.length === 0) return null;

  return (
    <section aria-labelledby="notes-implementation-heading" className="mt-8">
      <h2 id="notes-implementation-heading" className="text-lg font-semibold text-text-primary mb-3">
        Implementation
      </h2>
      <TabPanel
        ariaLabel="Implementation language"
        tabs={data.languages.map((lang) => ({
          id: lang.id,
          label: lang.label,
          content: (
            <pre className="rounded-lg bg-bg-secondary p-3 text-sm overflow-x-auto">
              <code>{lang.code}</code>
            </pre>
          ),
        }))}
      />
    </section>
  );
}
