import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StudyStatisticsWidget } from './StudyStatisticsWidget';
import { recordStudyMinute } from '../../lib/studyStats';

afterEach(() => {
  vi.useRealTimers();
});

/** Each stat renders as a value <p> immediately followed by a label <p>
 * (see StatItem) — look the value up via its label rather than by exact
 * text, since several stats can legitimately share the same numeric
 * value (e.g. "1 note" and "1 quiz attempt" in the same render). */
function statValueFor(label: string): string | null | undefined {
  return screen.getByText(label).previousElementSibling?.textContent;
}

describe('StudyStatisticsWidget', () => {
  it('renders an honest all-zero state with nothing tracked yet', () => {
    render(<StudyStatisticsWidget />);

    expect(screen.getByText('Study Statistics')).toBeInTheDocument();
    expect(statValueFor('Notes read')).toBe('0');
    expect(statValueFor('Quiz attempts')).toBe('0');
    // Average score shows an em dash, not a misleading 0%, when there's
    // no quiz history yet.
    expect(statValueFor('Average score')).toBe('—');
    expect(statValueFor('Highlights')).toBe('0');
    expect(statValueFor('Bookmarks')).toBe('0');
    expect(statValueFor('Study time')).toBe('0m');
    expect(statValueFor('Day streak')).toBe('0');
  });

  it('reflects real tracked data across notes, quizzes, highlights, bookmarks, and time', () => {
    localStorage.setItem('readingProgress-folder-a', JSON.stringify({ v: 1, percent: 100, timestamp: 1 }));
    localStorage.setItem(
      'quiz_history_aws-iam',
      JSON.stringify([{ date: '2026-08-01T00:00:00Z', score: 9, total: 10, pct: 90, timeSeconds: 1, passed: true }]),
    );
    localStorage.setItem('highlights-note-a', JSON.stringify([{ id: '1' }, { id: '2' }]));
    localStorage.setItem('bookmarks-note-a', JSON.stringify(['sec-1']));
    recordStudyMinute();
    recordStudyMinute();

    render(<StudyStatisticsWidget />);

    expect(statValueFor('Notes read')).toBe('1');
    expect(statValueFor('Quiz attempts')).toBe('1');
    expect(statValueFor('Average score')).toBe('90%');
    expect(statValueFor('Highlights')).toBe('2');
    expect(statValueFor('Bookmarks')).toBe('1');
    expect(statValueFor('Study time')).toBe('2m');
  });

  it('formats study time in hours + minutes once past 60', () => {
    for (let i = 0; i < 75; i++) recordStudyMinute();

    render(<StudyStatisticsWidget />);

    expect(statValueFor('Study time')).toBe('1h 15m');
  });

  it('shows the current P2-2 streak, with the longest run in a tooltip', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 12));

    localStorage.setItem(
      'readingProgress-folder-a',
      JSON.stringify({ v: 1, percent: 100, timestamp: new Date(2026, 7, 11).getTime() }),
    );
    localStorage.setItem(
      'readingProgress-folder-b',
      JSON.stringify({ v: 1, percent: 100, timestamp: new Date(2026, 7, 12).getTime() }),
    );

    render(<StudyStatisticsWidget />);

    expect(statValueFor('Day streak')).toBe('2');
    expect(screen.getByText('Day streak').closest('div[title]')).toHaveAttribute(
      'title',
      'Longest streak: 2 days',
    );
  });
});
