import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickFiltersBar } from './QuickFiltersBar';

/**
 * QuickFiltersBar.test.tsx — genericity, per T3-2a's Testing spec:
 * minimal fixture unrelated to notes (a "Starred"/"Recently Played"
 * config), confirming no hardcoded notes-index assumptions.
 */
describe('QuickFiltersBar', () => {
  it('renders a favorites-style toggle, custom buttons, and clear-all, all wired to their callbacks', () => {
    const onFav = vi.fn();
    const onSort = vi.fn();
    const onClear = vi.fn();

    render(
      <QuickFiltersBar
        favoritesButton={{ active: false, onClick: onFav, label: 'Starred' }}
        buttons={[{ key: 'recent', icon: '🕐', label: 'Recently Played', onClick: onSort, active: true }]}
        onClearAll={onClear}
      />,
    );

    fireEvent.click(screen.getByText(/Starred/));
    expect(onFav).toHaveBeenCalledOnce();

    const recentBtn = screen.getByText(/Recently Played/);
    expect(recentBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(recentBtn);
    expect(onSort).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByText(/Clear all/));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('omits the favorites button entirely when not provided', () => {
    render(<QuickFiltersBar buttons={[]} />);
    expect(screen.queryByText(/Favorites/)).not.toBeInTheDocument();
  });
});
