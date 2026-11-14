import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  showNotification,
  dismissNotification,
  subscribeToNotifications,
  _resetNotificationsForTests,
} from './notifications';

beforeEach(() => {
  vi.useFakeTimers();
  _resetNotificationsForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('lib/notifications', () => {
  it('showNotification is callable from anywhere, without a subscriber present', () => {
    expect(() => showNotification('Saved!')).not.toThrow();
  });

  it('notifies subscribers with the new toast', () => {
    const listener = vi.fn();
    subscribeToNotifications(listener);
    listener.mockClear();

    showNotification('Copied to clipboard', 'success', 0);

    expect(listener).toHaveBeenCalledWith([
      expect.objectContaining({ message: 'Copied to clipboard', type: 'success' }),
    ]);
  });

  it('auto-dismisses after the given duration', () => {
    const listener = vi.fn();
    subscribeToNotifications(listener);

    showNotification('Heads up', 'warning', 1000);
    expect(listener).toHaveBeenLastCalledWith([
      expect.objectContaining({ message: 'Heads up' }),
    ]);

    vi.advanceTimersByTime(1000);
    expect(listener).toHaveBeenLastCalledWith([]);
  });

  it('dismissNotification removes a toast early', () => {
    const listener = vi.fn();
    subscribeToNotifications(listener);
    const id = showNotification('Manual dismiss', 'info', 0);

    dismissNotification(id);

    expect(listener).toHaveBeenLastCalledWith([]);
  });

  it('unsubscribe stops further updates', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToNotifications(listener);
    unsubscribe();
    listener.mockClear();

    showNotification('After unsubscribe', 'info', 0);

    expect(listener).not.toHaveBeenCalled();
  });
});
