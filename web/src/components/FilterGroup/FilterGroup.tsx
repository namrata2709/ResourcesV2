import type { ReactNode } from 'react';

/**
 * FilterGroup — a labeled cluster of filter controls (a <select> plus
 * whatever SelectedChips are active for it). Extracted out of NotesIndex
 * (T3-2a) for the same reason as SelectedChip — see that component's
 * comment.
 */
export function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-text-muted">{label}</label>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}
