import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStudyTimeTracker } from './useStudyTimeTracker';
import { getStudyTimeMinutes } from '../lib/studyStats';

afterEach(() => {
  vi.useRealTimers();
});

describe('useStudyTimeTracker', () => {
  it('records one minute per elapsed minute while the tab is visible', () => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    vi.useFakeTimers();

    renderHook(() => useStudyTimeTracker());
    expect(getStudyTimeMinutes()).toBe(0);

    vi.advanceTimersByTime(60_000);
    expect(getStudyTimeMinutes()).toBe(1);

    vi.advanceTimersByTime(120_000);
    expect(getStudyTimeMinutes()).toBe(3);
  });

  it('does not record minutes while the tab is hidden', () => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    vi.useFakeTimers();

    renderHook(() => useStudyTimeTracker());
    vi.advanceTimersByTime(180_000);

    expect(getStudyTimeMinutes()).toBe(0);
  });

  it('clears its interval on unmount', () => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    vi.useFakeTimers();

    const { unmount } = renderHook(() => useStudyTimeTracker());
    unmount();
    vi.advanceTimersByTime(180_000);

    expect(getStudyTimeMinutes()).toBe(0);
  });
});
