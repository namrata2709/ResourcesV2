import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DailyGoalWidget } from './DailyGoalWidget';
import { todayDateString } from '../../lib/dailyGoal';

afterEach(() => {
  vi.useRealTimers();
});

describe('DailyGoalWidget', () => {
  it('shows the four presets from the ticket when no goal is set', () => {
    render(<DailyGoalWidget />);
    expect(screen.getByRole('button', { name: '30 min' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '60 min' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2 chapters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '25 MCQs' })).toBeInTheDocument();
  });

  it('choosing a preset persists it and switches to the progress view', () => {
    render(<DailyGoalWidget />);
    fireEvent.click(screen.getByRole('button', { name: '25 MCQs' }));

    expect(screen.getByText("Today's Goal")).toBeInTheDocument();
    expect(screen.getByText('25 MCQs answered')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('dailyGoal') || '{}')).toMatchObject({ type: 'mcqs', target: 25, progress: 0 });
  });

  it('shows an already-chosen goal on mount, without needing a fresh click', () => {
    localStorage.setItem('dailyGoal', JSON.stringify({ v: 1, type: 'time', target: 30, progress: 15, lastReset: todayDateString() }));
    render(<DailyGoalWidget />);

    expect(screen.getByText('30 min of study time')).toBeInTheDocument();
    expect(screen.getByText('15 / 30')).toBeInTheDocument();
  });

  it('shows a resets-to-0 goal when lastReset is stale (crossed midnight)', () => {
    localStorage.setItem('dailyGoal', JSON.stringify({ v: 1, type: 'mcqs', target: 25, progress: 20, lastReset: '2020-01-01' }));
    render(<DailyGoalWidget />);

    expect(screen.getByText('0 / 25')).toBeInTheDocument();
  });

  it('"Change goal" clears the goal and returns to the preset picker', () => {
    localStorage.setItem('dailyGoal', JSON.stringify({ v: 1, type: 'mcqs', target: 25, progress: 5, lastReset: todayDateString() }));
    render(<DailyGoalWidget />);

    fireEvent.click(screen.getByRole('button', { name: 'Change goal' }));

    expect(screen.getByRole('button', { name: '25 MCQs' })).toBeInTheDocument();
    expect(localStorage.getItem('dailyGoal')).toBeNull();
  });

  it('clamps the progress bar label at the target even if progress exceeds it', () => {
    localStorage.setItem('dailyGoal', JSON.stringify({ v: 1, type: 'mcqs', target: 25, progress: 31, lastReset: todayDateString() }));
    render(<DailyGoalWidget />);

    expect(screen.getByText('25 / 25')).toBeInTheDocument();
  });

  it('renders a progressbar with the correct aria attributes', () => {
    localStorage.setItem('dailyGoal', JSON.stringify({ v: 1, type: 'mcqs', target: 2, progress: 1, lastReset: todayDateString() }));
    render(<DailyGoalWidget />);

    const bar = screen.getByRole('progressbar', { name: "Today's goal progress" });
    expect(bar).toHaveAttribute('aria-valuenow', '50');
  });
});
