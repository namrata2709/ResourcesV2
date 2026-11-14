import { Link } from 'react-router-dom';
import { BookOpen, ListChecks, Heart, RotateCcw, Search, Images, FileText, Download } from 'lucide-react';
import { getSavedQuickActions } from '../../lib/quickActions';

/**
 * QuickActionsBar — P0-7 (Quick Actions), the real Dashboard consumer.
 *
 * This never existed until now: QUICK_ACTION_CATALOG/getSavedQuickActionIds
 * were only ever referenced by lib/quickActions.ts itself and
 * QuickActionsSection.tsx (the Settings picker). Picking actions and
 * reordering them in Settings correctly persisted to localStorage, but
 * nothing on the Dashboard — or anywhere else — ever read that saved
 * selection to render anything. The feature stored a value and had no
 * real effect anywhere, which is exactly the bug report this fixes.
 *
 * Renders getSavedQuickActions() — already resolved to catalog defs, in
 * the user's chosen order. Note lib/quickActions.ts's own validation is
 * all-or-nothing per saved list (isValidIdList uses .every()): if even
 * one saved id no longer matches the catalog (e.g. a removed action),
 * the whole saved list is treated as invalid and DEFAULT_QUICK_ACTION_IDS
 * is used instead, not a partial list with just the bad id removed.
 * DEFAULT_QUICK_ACTION_IDS guarantees this is never empty for a
 * first-time visitor.
 */

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  'continue-reading': BookOpen,
  'start-quiz': ListChecks,
  favorites: Heart,
  revision: RotateCcw,
  search: Search,
  gallery: Images,
  'my-notes': FileText,
  export: Download,
};

export function QuickActionsBar() {
  const actions = getSavedQuickActions();

  if (actions.length === 0) return null;

  return (
    <nav aria-label="Quick actions" className="quick-actions-bar flex flex-wrap gap-2 mb-6">
      {actions.map((action) => {
        const Icon = ICONS[action.id];
        return (
          <Link
            key={action.id}
            to={action.href}
            className="inline-flex items-center gap-1.5 rounded-full border border-border-color bg-bg-card px-3.5 py-1.5 text-sm font-medium text-text-primary hover:border-accent hover:text-accent transition-colors"
          >
            {Icon && <Icon size={14} />}
            {action.label}
          </Link>
        );
      })}
    </nav>
  );
}
