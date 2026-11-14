/**
 * CardQuickActions — the four-button row from notes-index.js's
 * getQuickActionsHTML(), generalized so T3-2b (quiz) and T4-1a (gallery)
 * import this SAME component with their own action subset, rather than
 * each building a bespoke row. Genericity is the whole point here: the
 * component takes an `actions` array — it has no idea what "Open" or
 * "Favorite" mean, it just renders buttons. The caller decides which
 * actions exist and what they do:
 *   - NotesIndex: Open, Favorite, Copy Link, Gallery (conditional on hasImages)
 *   - QuizIndex (T3-2b): Open, Favorite, Copy Link — no Gallery
 *   - Gallery (T4-1a): Favorite, Copy Link — no Open (card already opens
 *     the lightbox directly), no Gallery-pointing-at-itself
 *
 * Every button stops click propagation, since these always sit inside a
 * larger clickable card — without that, clicking Favorite would also
 * trigger the card's own onClick (opening the note/quiz/lightbox).
 */

import type { ReactNode } from 'react';

export interface QuickAction {
  key: string;
  /** An emoji string, or a ReactNode (e.g. a themed lucide-react icon). Per the icon strategy: lucide-react is the real build, emoji is the fallback. */
  icon: ReactNode;
  label: string;
  onClick: () => void;
  /** For toggle-style actions (Favorite) — renders as aria-pressed and can swap icon/label via the caller. */
  active?: boolean;
}

interface CardQuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

export function CardQuickActions({ actions, className = '' }: CardQuickActionsProps) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className={`card-quick-actions flex items-center gap-1 ${className}`} role="group" aria-label="Quick actions">
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            action.onClick();
          }}
          aria-label={action.label}
          aria-pressed={action.active}
          title={action.label}
          className={`
            quick-action-btn h-8 w-8 rounded-full flex items-center justify-center text-sm
            transition-colors hover:bg-bg-secondary
            ${action.active ? 'text-accent' : 'text-text-muted'}
          `}
        >
          <span aria-hidden="true">{action.icon}</span>
        </button>
      ))}
    </div>
  );
}
