import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getSavedQuickActions } from '../../lib/quickActions';

/**
 * QuickActions — P0-7's dashboard-facing half. The Settings-side half
 * (toggle/reorder) is QuickActionsSection.tsx, registered into P0-0's
 * shared Settings page; this component only reads the saved result.
 *
 * Reads once on mount, same as every other page's `useState(getSaved...)`
 * lazy-init pattern (ThemeContext, AppearanceContext, Gallery's
 * loadFavorites) — no live cross-tab/cross-page subscription, since a
 * route change (Settings -> Dashboard) already remounts this component
 * and re-reads localStorage fresh.
 *
 * Renders nothing when the saved set is empty — same "no chrome for an
 * empty state" convention RecentlyViewed already uses — though in
 * practice getSavedQuickActions() never actually returns empty, since
 * lib/quickActions.ts falls back to DEFAULT_QUICK_ACTION_IDS whenever
 * storage has nothing valid (the ticket's own "no empty dashboard on
 * first visit" requirement).
 */
export function QuickActions() {
  const [actions] = useState(getSavedQuickActions);

  if (actions.length === 0) return null;

  return (
    <nav aria-label="Quick actions" className="quick-actions mb-6">
      <ul className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <li key={action.id}>
            <Link
              to={action.href}
              className="
                inline-flex items-center rounded-full px-4 py-2 text-sm font-medium
                bg-bg-card text-text-primary border border-border-color
                hover:bg-bg-secondary hover:border-primary/60 transition-colors
              "
            >
              {action.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
