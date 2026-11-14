import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addInboxNotification,
  markInboxNotificationRead,
  markAllInboxNotificationsRead,
  clearInboxNotifications,
  subscribeToInboxNotifications,
  _resetInboxForTests,
} from './notificationsInbox';

beforeEach(() => {
  _resetInboxForTests();
});

describe('lib/notificationsInbox', () => {
  it('addInboxNotification is callable from anywhere, without a subscriber present', () => {
    expect(() => addInboxNotification('Achievement unlocked')).not.toThrow();
  });

  it('notifies subscribers with the new item, newest first, unread by default', () => {
    const listener = vi.fn();
    subscribeToInboxNotifications(listener);
    listener.mockClear();

    addInboxNotification('Daily goal complete', 'success');

    expect(listener).toHaveBeenCalledWith([
      expect.objectContaining({ message: 'Daily goal complete', type: 'success', read: false }),
    ]);
  });

  it('does not auto-dismiss (persistent, unlike the toast store)', () => {
    const listener = vi.fn();
    subscribeToInboxNotifications(listener);
    addInboxNotification('Sticks around', 'info');

    // No timer to advance — items only disappear via explicit read/clear.
    expect(listener).toHaveBeenLastCalledWith([
      expect.objectContaining({ message: 'Sticks around' }),
    ]);
  });

  it('markInboxNotificationRead marks only the targeted item', () => {
    const id = addInboxNotification('First', 'info');
    addInboxNotification('Second', 'info');

    markInboxNotificationRead(id);

    const listener = vi.fn();
    subscribeToInboxNotifications(listener);
    const items = listener.mock.calls[0][0];
    expect(items.find((n: { message: string }) => n.message === 'First').read).toBe(true);
    expect(items.find((n: { message: string }) => n.message === 'Second').read).toBe(false);
  });

  it('markAllInboxNotificationsRead marks every item read', () => {
    addInboxNotification('First', 'info');
    addInboxNotification('Second', 'warning');

    markAllInboxNotificationsRead();

    const listener = vi.fn();
    subscribeToInboxNotifications(listener);
    const items = listener.mock.calls[0][0];
    expect(items.every((n: { read: boolean }) => n.read)).toBe(true);
  });

  it('clearInboxNotifications empties the inbox', () => {
    addInboxNotification('First', 'info');
    clearInboxNotifications();

    const listener = vi.fn();
    subscribeToInboxNotifications(listener);
    expect(listener).toHaveBeenCalledWith([]);
  });

  it('persists across a fresh subscriber via localStorage (versioned envelope)', () => {
    addInboxNotification('Persisted item', 'success');

    const raw = localStorage.getItem('notificationsInbox');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.v).toBe(1);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].message).toBe('Persisted item');
  });

  it('caps stored items at 50, dropping the oldest', () => {
    for (let i = 0; i < 55; i++) {
      addInboxNotification(`Item ${i}`, 'info');
    }
    const listener = vi.fn();
    subscribeToInboxNotifications(listener);
    const items = listener.mock.calls[0][0];
    expect(items).toHaveLength(50);
    expect(items[0].message).toBe('Item 54');
  });

  it('unsubscribe stops further updates', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToInboxNotifications(listener);
    listener.mockClear();

    unsubscribe();
    addInboxNotification('After unsubscribe', 'info');

    expect(listener).not.toHaveBeenCalled();
  });

  it('ignores malformed persisted data on load instead of throwing', async () => {
    localStorage.setItem('notificationsInbox', 'not json');
    // Module state is set at import time (readFromStorage() runs once),
    // so a fresh module instance is needed to actually exercise the
    // load-time parse path against the malformed value set above.
    await vi.resetModules();
    await expect(import('./notificationsInbox')).resolves.toBeDefined();
    const fresh = await import('./notificationsInbox');
    const listener = vi.fn();
    fresh.subscribeToInboxNotifications(listener);
    expect(listener).toHaveBeenCalledWith([]);
  });
});
