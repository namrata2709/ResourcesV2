/**
 * Table — generic columns+rows table, first built here (T5-3a) per the
 * architecture principle at the top of sprint-tickets.md: "one component
 * per repeated UI pattern... built once where it's needed first, reused
 * everywhere else, not re-verified per consumer."
 *
 * First two real consumers, both in this same ticket:
 *   - Checklist module: a checkbox column + checkpoint-text column
 *   - Glossary module: term / definition / example, 3 columns
 *
 * T5-3b's LeetCode Problems table (confirmed a real `<table>` in vanilla,
 * per that ticket's own note) is the documented third consumer — it
 * should import THIS component with its own column config, not build a
 * fourth table implementation. (Contest Problems and YouTube
 * Recommendations are explicitly NOT tables — see T5-3b's own
 * `List` component instead; don't route those through here.)
 *
 * Deliberately generic over `T`: the component has no idea what a row
 * "is" (a checklist item, a glossary term, a LeetCode problem) — it just
 * renders whatever `columns` says to render for each row in `rows`.
 * `render` returning a ReactNode (not just a string) is what lets the
 * checklist column host a real interactive `<input type="checkbox">`.
 */

import type { ReactNode } from 'react';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Narrow numeric/checkbox columns shouldn't stretch — opt in per column. */
  width?: string;
  /** Right/center-align a column's cells (numbers, a checkbox) — left by default. */
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Accessible table name — required, not optional, since a bare
   * <table> with no caption/aria-label is a real a11y gap. */
  caption: string;
  /** Hides the caption visually while keeping it in the accessibility
   * tree — pass false only when a visible on-page heading already
   * serves as the table's label. */
  visuallyHiddenCaption?: boolean;
  className?: string;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  caption,
  visuallyHiddenCaption = true,
  className = '',
}: TableProps<T>) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className={`table-wrapper overflow-x-auto rounded-lg border border-border-color ${className}`}>
      <table className="w-full text-sm border-collapse">
        <caption className={visuallyHiddenCaption ? 'sr-only' : 'text-left px-3 py-2 text-text-primary font-medium'}>
          {caption}
        </caption>
        <thead>
          <tr className="bg-bg-secondary">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-3 py-2 font-semibold text-text-primary ${
                  col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                }`}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-t border-border-color">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-2 text-text-secondary align-top ${
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
