import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Calendar } from './Calendar';

/**
 * Calendar.test.tsx
 *
 * Covers R3-1c's "Done when" list for the activity-calendar variant:
 *   - /calendar renders a correct month grid with no errors at zero
 *     tracked activity (empty state, not broken)
 *   - month navigation (prev/next/today) works
 *   - clicking a day shows a detail panel (accurate detail once
 *     P2-1/P2-2 land; today it's honestly "no tracked activity yet",
 *     since getMonthActivity() has nothing real to read)
 *
 * A fixed system time keeps "today"/month-label assertions stable
 * regardless of when the suite actually runs.
 */

function renderCalendar() {
  return render(<Calendar />);
}

describe('Calendar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15)); // March 15, 2026 (Sunday-anchored month)
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('renders the page heading and current month with no errors at zero tracked activity', () => {
    renderCalendar();
    expect(screen.getByRole('heading', { name: 'Calendar', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('March 2026')).toBeInTheDocument();
    expect(
      screen.getByText(/No tracked activity yet/i),
    ).toBeInTheDocument();
  });

  it('renders a full 7-day-wide month grid with weekday headers', () => {
    renderCalendar();
    expect(screen.getByRole('grid', { name: 'March 2026' })).toBeInTheDocument();
    for (const label of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      expect(screen.getByRole('columnheader', { name: label })).toBeInTheDocument();
    }
    // 42 cells = 6 full weeks, a stable grid height regardless of month length
    expect(screen.getAllByRole('gridcell')).toHaveLength(42);
  });

  it('marks today with aria-current="date"', () => {
    renderCalendar();
    const todayCell = screen.getByRole('gridcell', { current: 'date' });
    expect(todayCell).toHaveAccessibleName(/Sunday, March 15, 2026/);
  });

  it('navigates to the next and previous month', () => {
    renderCalendar();

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('April 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText('February 2026')).toBeInTheDocument();
  });

  it('returns to the current month via the Today shortcut', () => {
    renderCalendar();

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('May 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByText('March 2026')).toBeInTheDocument();
  });

  it('shows a detail panel for the clicked day, honest about no data yet', () => {
    renderCalendar();

    expect(screen.queryByRole('region', { name: 'Selected day detail' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('gridcell', { name: /March 10, 2026/ }));

    const detail = screen.getByRole('region', { name: 'Selected day detail' });
    expect(detail).toHaveTextContent('Tuesday, March 10, 2026');
    expect(detail).toHaveTextContent('No tracked activity for this day yet.');
  });

  it('clears the previously selected day when the month changes', () => {
    renderCalendar();

    fireEvent.click(screen.getByRole('gridcell', { name: /March 10, 2026/ }));
    expect(screen.getByRole('region', { name: 'Selected day detail' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.queryByRole('region', { name: 'Selected day detail' })).not.toBeInTheDocument();
  });
});
