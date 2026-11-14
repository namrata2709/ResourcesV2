import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { StudyTimer } from './StudyTimer';

describe('StudyTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders nothing when not visible', () => {
    render(<StudyTimer visible={false} />);
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
  });

  it('counts elapsed seconds once visible, formatted as mm:ss', () => {
    render(<StudyTimer visible />);
    expect(screen.getByText('00:00')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(65_000);
    });
    expect(screen.getByText('01:05')).toBeInTheDocument();
  });
});
