/**
 * QuickFiltersBar — the "Favorites / Recently Updated / Recently Viewed
 * / Reading Time / Completed / In Progress / Not Started / Clear all"
 * row from notes-index.js's quick-filters-section, generalized so
 * T3-2b (quiz) supplies its own quiz-appropriate set of buttons instead
 * of hardcoded notes options. This component knows nothing about notes
 * or quizzes specifically — it renders whatever `buttons` config it's
 * given, plus a favorites toggle and a clear-all action if provided.
 */

import type { ReactNode } from 'react';
import { Heart, RotateCcw } from 'lucide-react';

export interface QuickFilterButton {
  key: string;
  /** An emoji string, or a ReactNode (e.g. a themed lucide-react icon). Per the icon strategy: lucide-react is the real build, emoji is the fallback. */
  icon: ReactNode;
  label: string;
  onClick: () => void;
  /** aria-pressed — for toggle-style buttons (a status filter, a quick-sort that's currently active). */
  active?: boolean;
}

interface QuickFiltersBarProps {
  /** Rendered first, styled distinctly (matches vanilla's dedicated Favorites toggle position). Omit if this page has no favorites concept. */
  favoritesButton?: {
    active: boolean;
    onClick: () => void;
    label?: string;
  };
  buttons: QuickFilterButton[];
  onClearAll?: () => void;
  className?: string;
}

export function QuickFiltersBar({ favoritesButton, buttons, onClearAll, className = '' }: QuickFiltersBarProps) {
  const HeartIcon = <Heart size={14} fill={favoritesButton?.active ? 'currentColor' : 'none'} />;
  return (
    <div className={`quick-filters-bar flex flex-wrap items-center gap-2 ${className}`} role="group" aria-label="Quick filters">
      {favoritesButton && (
        <button
          type="button"
          onClick={favoritesButton.onClick}
          aria-pressed={favoritesButton.active}
          className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
            favoritesButton.active
              ? 'bg-accent text-white border-accent'
              : 'border-border-color text-text-secondary hover:border-accent'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            {HeartIcon} {favoritesButton.label ?? 'Favorites'}
          </span>
        </button>
      )}

      {buttons.map((btn) => (
        <button
          key={btn.key}
          type="button"
          onClick={btn.onClick}
          aria-pressed={btn.active}
          className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
            btn.active
              ? 'bg-primary text-white border-primary'
              : 'border-border-color text-text-secondary hover:border-primary'
          }`}
        >
          <span aria-hidden="true" className="inline-flex items-center">{btn.icon}</span> {btn.label}
        </button>
      ))}

      {onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-sm px-3 py-1.5 rounded-full border border-border-color text-text-muted hover:border-accent hover:text-accent transition-colors"
        >
          <span className="inline-flex items-center gap-1.5">
            <RotateCcw size={14} /> Clear all
          </span>
        </button>
      )}
    </div>
  );
}
