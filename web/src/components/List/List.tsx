/**
 * List — generic card-list, first built here (T5-3b) per the same
 * architecture principle `Table` (T5-3a) already follows: "one
 * component per repeated UI pattern... built once where it's needed
 * first, reused everywhere else."
 *
 * Exists specifically because of a confirmed real vanilla
 * inconsistency, not a design preference: `dsa-contest.js` actually
 * renders `<div class="interview-question">` cards, NOT a `<table>`,
 * despite `dsa-notes.css` having dead CSS rules for
 * `#contestContainer table` that never match anything. Porting that
 * faithfully means Contest Problems needs a card-list component, not
 * `Table` — and `dsa-page.js`'s `youtube-recommendations` section is
 * confirmed to use the exact same card-list shape, so this is built
 * generic over both from the start rather than copied twice.
 *
 * Deliberately generic over `T` and over how each item renders — same
 * shape as `Table`'s `columns`/`render` split, just for a list instead
 * of a grid of cells: this component owns the `<ul>`/`<li>` structure
 * and the card chrome (border/radius/padding), the caller owns what
 * goes inside each card via `renderItem`.
 */

import type { ReactNode } from 'react';

interface ListProps<T> {
  items: T[];
  itemKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Accessible name for the list — required, matching Table's own
   * "no unlabeled structural element" rule. */
  ariaLabel: string;
  className?: string;
}

export function List<T>({ items, itemKey, renderItem, ariaLabel, className = '' }: ListProps<T>) {
  if (!items || items.length === 0) return null;

  return (
    <ul aria-label={ariaLabel} className={`list-wrapper flex flex-col gap-3 ${className}`}>
      {items.map((item) => (
        <li
          key={itemKey(item)}
          className="interview-question rounded-lg border border-border-color bg-bg-card p-4"
        >
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}
