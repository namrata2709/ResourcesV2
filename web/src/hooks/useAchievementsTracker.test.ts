import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAchievementsTracker } from './useAchievementsTracker';
import { getUnlockedAchievementIds } from '../lib/achievements';
import { subscribeToNotifications, _resetNotificationsForTests } from '../lib/notifications';

afterEach(() => {
  vi.useRealTimers();
  _resetNotificationsForTests();
});

describe('useAchievementsTracker', () => {
  it('checks once on mount and unlocks + notifies for an already-qualifying stat', () => {
    localStorage.setItem('readingProgress-folder-a', JSON.stringify({ v: 1, percent: 100, timestamp: 1 }));

    const listener = vi.fn();
    subscribeToNotifications(listener);
    listener.mockClear();

    renderHook(() => useAchievementsTracker());

    expect(getUnlockedAchievementIds().has('first-note')).toBe(true);
    expect(listener).toHaveBeenCalledWith([
      expect.objectContaining({ message: expect.stringContaining('First Steps'), type: 'success' }),
    ]);
  });

  it('does not re-fire a notification for an already-unlocked achievement on a later tick', () => {
    localStorage.setItem('readingProgress-folder-a', JSON.stringify({ v: 1, percent: 100, timestamp: 1 }));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    vi.useFakeTimers();

    // Tracks every distinct toast message ever seen across the whole
    // window (mount + tick), independent of the toast's own 4s
    // auto-dismiss timer — a naive "listener not called again" check
    // would false-fail on the dismiss's own unrelated emit().
    const messagesEverSeen = new Set<string>();
    subscribeToNotifications((toasts) => {
      for (const toast of toasts) messagesEverSeen.add(toast.message);
    });

    renderHook(() => useAchievementsTracker());
    vi.advanceTimersByTime(60_000);

    const firstStepsToasts = [...messagesEverSeen].filter((message) => message.includes('First Steps'));
    expect(firstStepsToasts).toHaveLength(1);
  });

  it('fires a fresh notification once a new threshold is crossed on a later tick', () => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    vi.useFakeTimers();

    renderHook(() => useAchievementsTracker());
    expect(getUnlockedAchievementIds().size).toBe(0);

    const listener = vi.fn();
    subscribeToNotifications(listener);
    listener.mockClear();

    // Crosses the "first quiz attempt" threshold in between ticks.
    localStorage.setItem(
      'quiz_history_aws-iam',
      JSON.stringify([{ date: '2026-08-01T00:00:00Z', score: 5, total: 10, pct: 50, timeSeconds: 1, passed: false }]),
    );
    vi.advanceTimersByTime(60_000);

    expect(getUnlockedAchievementIds().has('first-quiz')).toBe(true);
    expect(listener).toHaveBeenCalledWith([
      expect.objectContaining({ message: expect.stringContaining('Quiz Starter') }),
    ]);
  });

  it('clears its interval on unmount', () => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    vi.useFakeTimers();

    const { unmount } = renderHook(() => useAchievementsTracker());
    unmount();

    localStorage.setItem('readingProgress-folder-a', JSON.stringify({ v: 1, percent: 100, timestamp: 1 }));
    vi.advanceTimersByTime(120_000);

    // No mounted tracker left to pick this up.
    expect(getUnlockedAchievementIds().has('first-note')).toBe(false);
  });
});
