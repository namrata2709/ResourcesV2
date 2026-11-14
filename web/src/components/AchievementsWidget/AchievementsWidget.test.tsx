import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AchievementsWidget } from './AchievementsWidget';
import { checkAchievements } from '../../lib/achievements';

describe('AchievementsWidget', () => {
  it('renders every achievement as locked with nothing unlocked yet', () => {
    render(<AchievementsWidget />);

    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText(/^\(0\//)).toBeInTheDocument();
    // At least one "Locked" label present (every achievement, in this
    // all-zero state).
    expect(screen.getAllByText('Locked').length).toBeGreaterThan(0);
    expect(screen.queryByText('Unlocked')).not.toBeInTheDocument();
  });

  it('reflects real persisted unlock state', () => {
    checkAchievements(
      {
        notesRead: 1,
        quizAttempts: 0,
        avgScorePercent: null,
        highlightsCount: 0,
        bookmarksCount: 0,
        studyTimeMinutes: 0,
      },
      { current: 0, longest: 0 },
    );

    render(<AchievementsWidget />);

    // "First Steps" is unlocked; its own count label reads "Unlocked".
    const firstStepsCard = screen.getByText('First Steps').closest('li');
    expect(firstStepsCard).not.toBeNull();
    expect(firstStepsCard).toHaveTextContent('Unlocked');

    // Something else, e.g. the quiz achievement, is still locked.
    const quizCard = screen.getByText('Quiz Starter').closest('li');
    expect(quizCard).toHaveTextContent('Locked');
  });
});
