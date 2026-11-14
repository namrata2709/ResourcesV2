/**
 * ChecklistModule — a note's checklist section, rendered via the shared
 * `Table` component (checkbox column + checkpoint-text column), per
 * T5-3a's own scope: "Checklist and Glossary render via the new shared
 * `Table` component, not two independent table implementations."
 *
 * Checked state persists to `<folder>-checklist-state` (a plain array of
 * checked item ids), via lib/storageKeys.ts's `checklistStateKey`.
 */

import { useEffect, useState } from 'react';
import { Table } from '../../components/Table';
import { ProgressBar } from '../../components/ProgressBar';
import { useLiveRegion } from '../../hooks/useLiveRegion';
import { dataPath } from '../../lib/siteConfig';
import { checklistStateKey } from '../../lib/storageKeys';
import type { ChecklistData } from './types';

function loadChecked(pageId: string): Set<string> {
  try {
    const raw = localStorage.getItem(checklistStateKey(pageId));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveChecked(pageId: string, checked: Set<string>) {
  localStorage.setItem(checklistStateKey(pageId), JSON.stringify(Array.from(checked)));
}

interface ChecklistModuleProps {
  folder: string;
}

export function ChecklistModule({ folder }: ChecklistModuleProps) {
  const [data, setData] = useState<ChecklistData | null | 'missing'>(null);
  const [checked, setChecked] = useState<Set<string>>(() => loadChecked(folder));
  const { announce } = useLiveRegion();

  useEffect(() => {
    let cancelled = false;
    fetch(dataPath('notes', folder, 'json', 'checklist.json'))
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((json: ChecklistData) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [folder]);

  useEffect(() => {
    saveChecked(folder, checked);
  }, [folder, checked]);

  if (data === null || data === 'missing' || data.items.length === 0) return null;

  const items = data.items;
  const percent = items.length > 0 ? (checked.size / items.length) * 100 : 0;

  function toggle(id: string, text: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      const willCheck = !next.has(id);
      if (willCheck) next.add(id);
      else next.delete(id);
      announce(willCheck ? `Checked: ${text}` : `Unchecked: ${text}`);
      return next;
    });
  }

  return (
    <section aria-labelledby="notes-checklist-heading" className="mt-8">
      <div className="flex items-center justify-between gap-4 mb-3">
        <h2 id="notes-checklist-heading" className="text-lg font-semibold text-text-primary">
          {data.title || 'Checklist'}
        </h2>
        <ProgressBar
          percent={percent}
          labelText={`${checked.size} / ${items.length} complete`}
          ariaLabel="Checklist progress"
          className="max-w-[220px]"
        />
      </div>
      <Table
        caption={data.title || 'Checklist'}
        rows={items}
        rowKey={(item) => item.id}
        columns={[
          {
            key: 'checked',
            header: 'Done',
            align: 'center',
            width: '4rem',
            render: (item) => (
              <input
                type="checkbox"
                checked={checked.has(item.id)}
                onChange={() => toggle(item.id, item.text)}
                aria-label={`Mark done: ${item.text}`}
                className="h-4 w-4 accent-[var(--primary)]"
              />
            ),
          },
          {
            key: 'text',
            header: 'Checkpoint',
            render: (item) => (
              <span className={checked.has(item.id) ? 'line-through text-text-muted' : ''}>{item.text}</span>
            ),
          },
        ]}
      />
    </section>
  );
}
