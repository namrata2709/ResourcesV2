/**
 * lib/dashboardCardOrder.ts
 *
 * P0-11: the user's chosen, persisted order for the Dashboard's card
 * grid. Same shape as lib/quickActions.ts's saved-id-list convention —
 * a plain ordered array of ids under its own localStorage key, no
 * version envelope — matching the ticket's own file list verbatim:
 * "New localStorage key dashboardCardOrder (ordered array of card ids)".
 *
 * Deliberately knows nothing about DashboardCard's real shape
 * (label/icon/description/etc.) — it only ever orders ids, the same
 * way quickActions.ts's storage layer doesn't know what a "Quick
 * Action" button looks like. DashboardCardsGrid owns the live drag/
 * keyboard-reorder UI and calls into this module to persist and
 * re-apply the result.
 */

const STORAGE_KEY = 'dashboardCardOrder';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === 'string');
}

/** Reads the saved order, or null if nothing's been saved yet (first-time visitor, or corrupt/cleared storage). */
export function getSavedCardOrder(): string[] | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return null;
    const parsed = JSON.parse(saved);
    return isStringArray(parsed) ? parsed : null;
  } catch {
    // Private-browsing / storage-disabled / malformed JSON: fail silently,
    // same tolerance as every other lib/*.ts's getSaved*() in this codebase.
    return null;
  }
}

/** Persists the ordered card id list. Swallows storage errors, same as saveQuickActionIds()/saveTheme(). */
export function saveCardOrder(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // no-op
  }
}

/**
 * Orders `cards` (the real, current fetch of dashboard-cards.json)
 * against a saved id order:
 *   - cards whose id appears in `savedOrder` are placed in that order
 *   - any card NOT in `savedOrder` (new since the user last reordered —
 *     e.g. a fresh dashboard-cards.json entry landed after they
 *     customized their layout) is appended at the end, in its original
 *     fetched order — never silently dropped
 *   - any id in `savedOrder` that no longer matches a real card
 *     (removed from dashboard-cards.json since) is skipped, not
 *     rendered as a gap
 *
 * With `savedOrder` null/empty (nothing saved yet), returns `cards`
 * completely untouched — dashboard-cards.json's own order IS the
 * "sensible default order for first-time users" the ticket's done-when
 * calls for, no separate default list to hand-maintain here.
 */
export function applyCardOrder<T extends { id: string }>(
  cards: T[],
  savedOrder: string[] | null,
): T[] {
  if (!savedOrder || savedOrder.length === 0) return cards;

  const byId = new Map(cards.map((card) => [card.id, card]));
  const seen = new Set<string>();
  const ordered: T[] = [];

  for (const id of savedOrder) {
    const card = byId.get(id);
    if (card && !seen.has(id)) {
      ordered.push(card);
      seen.add(id);
    }
  }
  for (const card of cards) {
    if (!seen.has(card.id)) {
      ordered.push(card);
      seen.add(card.id);
    }
  }
  return ordered;
}
