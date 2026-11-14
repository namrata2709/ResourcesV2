import { useState } from 'react';
import {
  QUICK_ACTION_CATALOG,
  getSavedQuickActionIds,
  saveQuickActionIds,
  DEFAULT_QUICK_ACTION_IDS,
} from '../../../lib/quickActions';
import { registerSettingsSection } from '../registry';

/**
 * QuickActionsSection — P0-7 (Quick Actions), registered into P0-0's
 * shared Settings page. Same registration shape as AppearanceSection.tsx:
 * the registerSettingsSection() call below plus the one-line side-effect
 * import in sections/index.ts is this file's entire integration.
 *
 * Reordering is plain up/down buttons, not drag-and-drop — P0-11
 * (Dashboard Widgets) is the ticket that brings in a drag-and-drop
 * library for the card grid; duplicating that machinery here for a
 * five-item list would be more than this ticket needs.
 */

function moveItem(ids: string[], index: number, direction: -1 | 1): string[] {
  const target = index + direction;
  if (target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function QuickActionsSectionPanel() {
  const [selectedIds, setSelectedIds] = useState<string[]>(getSavedQuickActionIds);

  function persist(next: string[]) {
    // Never let the saved set go empty — matches lib/quickActions.ts's
    // own fallback-to-default guard, so unchecking every box lands back
    // on a sensible default instead of an empty dashboard.
    const toSave = next.length > 0 ? next : DEFAULT_QUICK_ACTION_IDS;
    setSelectedIds(next);
    saveQuickActionIds(toSave);
  }

  function toggle(id: string) {
    persist(
      selectedIds.includes(id) ? selectedIds.filter((existing) => existing !== id) : [...selectedIds, id]
    );
  }

  function move(id: string, direction: -1 | 1) {
    persist(moveItem(selectedIds, selectedIds.indexOf(id), direction));
  }

  const catalogById = new Map(QUICK_ACTION_CATALOG.map((action) => [action.id, action]));
  // Selected items render in the user's actual chosen order (selectedIds
  // itself), not the fixed catalog order — this was the real bug: the
  // list used to always render QUICK_ACTION_CATALOG's order regardless
  // of what move() computed, so Up/Down correctly updated and saved
  // selectedIds but the on-screen list never visibly reordered.
  const selectedActions = selectedIds.map((id) => catalogById.get(id)).filter((action) => action !== undefined);
  const unselectedActions = QUICK_ACTION_CATALOG.filter((action) => !selectedIds.includes(action.id));

  function renderRow(action: (typeof QUICK_ACTION_CATALOG)[number], isSelected: boolean, position: number) {
    return (
      <li
        key={action.id}
        className="flex items-center justify-between gap-3 rounded-lg border border-border-color bg-bg-card px-3 py-2"
      >
        <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggle(action.id)}
            className="h-4 w-4 accent-primary"
          />
          {action.label}
        </label>

        {isSelected && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => move(action.id, -1)}
              disabled={position === 0}
              aria-label={`Move ${action.label} up`}
              className="h-7 w-7 rounded-md text-text-muted hover:bg-bg-secondary hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(action.id, 1)}
              disabled={position === selectedActions.length - 1}
              aria-label={`Move ${action.label} down`}
              className="h-7 w-7 rounded-md text-text-muted hover:bg-bg-secondary hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none"
            >
              ↓
            </button>
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="quick-actions-section space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Quick Actions</h2>
        <p className="text-sm text-text-secondary">
          Choose which shortcut buttons appear at the top of your dashboard, and reorder them.
        </p>
      </div>

      <ul className="flex flex-col gap-2 max-w-sm" aria-label="Selected quick actions, in dashboard order">
        {selectedActions.map((action, index) => renderRow(action, true, index))}
      </ul>

      {unselectedActions.length > 0 && (
        <div className="max-w-sm space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Not shown on dashboard</p>
          <ul className="flex flex-col gap-2" aria-label="Unselected quick actions">
            {unselectedActions.map((action) => renderRow(action, false, -1))}
          </ul>
        </div>
      )}
    </div>
  );
}

registerSettingsSection({
  id: 'quick-actions',
  label: 'Quick Actions',
  Component: QuickActionsSectionPanel,
});
