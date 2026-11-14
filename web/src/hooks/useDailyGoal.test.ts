import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDailyGoal } from './useDailyGoal';
import { setDailyGoal, todayDateString } from '../lib/dailyGoal';
import { subscribeToInboxNotifications, _resetInboxForTests } from '../lib/notificationsInbox';

function stubVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}

beforeEach(() => {
  vi.useFakeTimers();
  stubVisibility('visible');
  _resetInboxForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDailyGoal', () => {
  it('returns the currently saved goal on mount', () => {
    setDailyGoal('mcqs', 25);
    const { result } = renderHook(() => useDailyGoal());
    expect(result.current.goal).toMatchObject({ type: 'mcqs', target: 25, progress: 0 });
  });

  it('returns null when no goal is set', () => {
    const { result } = renderHook(() => useDailyGoal());
    expect(result.current.goal).toBeNull();
  });

  it('chooseGoal persists and updates state', () => {
    const { result } = renderHook(() => useDailyGoal());
    act(() => result.current.chooseGoal('chapters', 2));
    expect(result.current.goal).toMatchObject({ type: 'chapters', target: 2, progress: 0 });
  });

  it('clearGoal removes the goal and updates state', () => {
    setDailyGoal('mcqs', 25);
    const { result } = renderHook(() => useDailyGoal());
    act(() => result.current.clearGoal());
    expect(result.current.goal).toBeNull();
    expect(localStorage.getItem('dailyGoal')).toBeNull();
  });

  it("ticks 'time' progress by 1 per minute while the tab is visible", () => {
    setDailyGoal('time', 30);
    const { result } = renderHook(() => useDailyGoal());

    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.goal?.progress).toBe(1);

    act(() => vi.advanceTimersByTime(60_000 * 2));
    expect(result.current.goal?.progress).toBe(3);
  });

  it("does not tick 'time' progress while the tab is hidden", () => {
    setDailyGoal('time', 30);
    stubVisibility('hidden');
    const { result } = renderHook(() => useDailyGoal());

    act(() => vi.advanceTimersByTime(60_000 * 3));
    expect(result.current.goal?.progress).toBe(0);
  });

  it("does not tick progress for a 'mcqs' or 'chapters' goal", () => {
    setDailyGoal('mcqs', 25);
    const { result } = renderHook(() => useDailyGoal());

    act(() => vi.advanceTimersByTime(60_000 * 5));
    expect(result.current.goal?.progress).toBe(0);
  });

  it('picking up a new goal at 30 min progress before midnight still resets correctly the next day (delegates to getDailyGoal)', () => {
    localStorage.setItem('dailyGoal', JSON.stringify({ v: 1, type: 'time', target: 30, progress: 30, lastReset: '2020-01-01' }));
    const { result } = renderHook(() => useDailyGoal());
    expect(result.current.goal?.progress).toBe(0);
    expect(result.current.goal?.lastReset).toBe(todayDateString());
  });

  // R3-1a: goal-completion -> notifications inbox wiring
  describe('R3-1a: completion notification', () => {
    it('writes one inbox notification the moment progress reaches target', () => {
      localStorage.setItem(
        'dailyGoal',
        JSON.stringify({ v: 1, type: 'mcqs', target: 25, progress: 25, lastReset: todayDateString() }),
      );

      const listener = vi.fn();
      subscribeToInboxNotifications(listener);
      listener.mockClear();

      renderHook(() => useDailyGoal());

      expect(listener).toHaveBeenCalledWith([
        expect.objectContaining({ type: 'success', read: false }),
      ]);
    });

    it('does not fire again on a later refresh once already notified', () => {
      localStorage.setItem(
        'dailyGoal',
        JSON.stringify({ v: 1, type: 'mcqs', target: 25, progress: 25, lastReset: todayDateString() }),
      );
      const { result } = renderHook(() => useDailyGoal());

      const listener = vi.fn();
      subscribeToInboxNotifications(listener);
      listener.mockClear();

      act(() => result.current.refresh());

      expect(listener).not.toHaveBeenCalled();
    });

    it('does not fire for a goal still below target', () => {
      setDailyGoal('mcqs', 25);
      const listener = vi.fn();
      subscribeToInboxNotifications(listener);
      listener.mockClear();

      renderHook(() => useDailyGoal());

      expect(listener).not.toHaveBeenCalled();
    });

    it('resets notifiedComplete on a new day, so a fresh completion can notify again', () => {
      localStorage.setItem(
        'dailyGoal',
        JSON.stringify({
          v: 1,
          type: 'mcqs',
          target: 25,
          progress: 25,
          lastReset: '2020-01-01',
          notifiedComplete: true,
        }),
      );

      const listener = vi.fn();
      subscribeToInboxNotifications(listener);
      listener.mockClear();

      // Daily reset zeroes progress back to 0, so today's (new, unmet)
      // goal shouldn't immediately notify again.
      renderHook(() => useDailyGoal());

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
