import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  hidePageLoader,
  armPageLoaderSafetyTimeout,
  SAFETY_TIMEOUT_MS,
  _resetPageLoaderForTests,
} from './pageLoader';

beforeEach(() => {
  vi.useFakeTimers();
  _resetPageLoaderForTests();
  const el = document.createElement('div');
  el.id = 'pageLoader';
  document.body.appendChild(el);
});

afterEach(() => {
  document.getElementById('pageLoader')?.remove();
  vi.useRealTimers();
});

describe('lib/pageLoader', () => {
  it('hidePageLoader adds the hidden class and aria-hidden', () => {
    hidePageLoader();
    const el = document.getElementById('pageLoader')!;
    expect(el.classList.contains('page-loader--hidden')).toBe(true);
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('hidePageLoader is idempotent / safe with no element present', () => {
    document.getElementById('pageLoader')?.remove();
    expect(() => hidePageLoader()).not.toThrow();
  });

  it('armPageLoaderSafetyTimeout force-hides the loader after 5s if nothing else did', () => {
    armPageLoaderSafetyTimeout();
    const el = document.getElementById('pageLoader')!;
    expect(el.classList.contains('page-loader--hidden')).toBe(false);

    vi.advanceTimersByTime(SAFETY_TIMEOUT_MS);

    expect(el.classList.contains('page-loader--hidden')).toBe(true);
  });

  it('the safety timeout is a no-op if the loader was already hidden', () => {
    const cancel = armPageLoaderSafetyTimeout();
    hidePageLoader();
    vi.advanceTimersByTime(SAFETY_TIMEOUT_MS);
    // Should not throw even though hidePageLoader() already ran.
    expect(document.getElementById('pageLoader')!.classList.contains('page-loader--hidden')).toBe(true);
    cancel();
  });
});
