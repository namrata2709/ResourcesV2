/**
 * lib/notificationsInbox.ts — R3-1a
 *
 * The notifications **bell** — deliberately a separate store from
 * lib/notifications.ts's toast system, not a second renderer on top of
 * it. The two solve different problems:
 *
 *   - lib/notifications.ts (toasts): ephemeral, auto-dismissing,
 *     in-the-moment feedback ("Settings saved"). Nothing persists.
 *   - This module (inbox): persistent, read/unread, survives past the
 *     moment it fired — an inbox, not a toast queue. Backed by
 *     localStorage under its own "notificationsInbox" key, versioned
 *     envelope ({v:1, items:[...]}) per the app-wide convention (see
 *     lib/profile.ts, lib/dailyGoal.ts for the same shape).
 *
 * Same framework-agnostic-lib + thin-hook shape as every other lib/
 * module here (see src/lib/README.md): plain functions and a
 * module-level subscriber list, no React import. useNotificationsInbox()
 * wraps this for components; addInboxNotification() itself is callable
 * from anywhere — plain code, another lib/ module, an event handler —
 * the same way showNotification() is.
 *
 * R3-1a scoped this to start with in-app-generated events (achievement
 * unlocks, daily goal completion) rather than B-2's not-yet-built
 * reminder mechanism — see that ticket's spec for why. The first real
 * call site wired up is useDailyGoal.ts's goal-completion detection.
 */

// Reuses the existing NotificationType union from lib/notifications.ts
// rather than inventing a second taxonomy, per R3-1a's own spec.
export type { NotificationType } from './notifications';
import type { NotificationType } from './notifications';

export interface InboxNotification {
  id: string;
  message: string;
  type: NotificationType;
  createdAt: number;
  read: boolean;
}

interface InboxEnvelope {
  v: 1;
  items: InboxNotification[];
}

const STORAGE_KEY = 'notificationsInbox';
/** Caps stored items so localStorage can't grow unbounded (R3-1a spec). */
const MAX_ITEMS = 50;

function isNotificationType(value: unknown): value is NotificationType {
  return value === 'info' || value === 'success' || value === 'warning' || value === 'error';
}

function isInboxNotification(value: unknown): value is InboxNotification {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    typeof c.message === 'string' &&
    isNotificationType(c.type) &&
    typeof c.createdAt === 'number' &&
    typeof c.read === 'boolean'
  );
}

function readFromStorage(): InboxNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed as InboxEnvelope).v === 1 &&
      Array.isArray((parsed as InboxEnvelope).items)
    ) {
      return (parsed as InboxEnvelope).items.filter(isInboxNotification);
    }
    return [];
  } catch {
    // Private-browsing / storage-disabled / malformed JSON: fail silently,
    // same tolerance as lib/theme.ts / lib/profile.ts.
    return [];
  }
}

function writeToStorage(current: InboxNotification[]): void {
  try {
    const envelope: InboxEnvelope = { v: 1, items: current };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // no-op — matches the rest of the app's silent-fail storage pattern
  }
}

let items: InboxNotification[] = readFromStorage();
const listeners = new Set<(items: InboxNotification[]) => void>();

function emit(): void {
  const snapshot = items;
  listeners.forEach((listener) => listener(snapshot));
}

/**
 * Adds a persistent inbox entry. Callable from anywhere, not just from
 * within a React component tree — same contract as showNotification().
 * Newest-first; trims to MAX_ITEMS.
 */
export function addInboxNotification(
  message: string,
  type: NotificationType = 'info',
): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  items = [{ id, message, type, createdAt: Date.now(), read: false }, ...items].slice(
    0,
    MAX_ITEMS,
  );
  writeToStorage(items);
  emit();
  return id;
}

/** Marks a single item read (e.g. opening it in the bell panel). */
export function markInboxNotificationRead(id: string): void {
  const next = items.map((n) => (n.id === id ? { ...n, read: true } : n));
  if (next === items) return;
  items = next;
  writeToStorage(items);
  emit();
}

/** Marks every item read at once ("mark all as read"). */
export function markAllInboxNotificationsRead(): void {
  if (items.every((n) => n.read)) return;
  items = items.map((n) => ({ ...n, read: true }));
  writeToStorage(items);
  emit();
}

/** Clears the whole inbox ("clear all"). */
export function clearInboxNotifications(): void {
  if (items.length === 0) return;
  items = [];
  writeToStorage(items);
  emit();
}

/** Subscribes to the current inbox list; returns an unsubscribe function. */
export function subscribeToInboxNotifications(
  listener: (items: InboxNotification[]) => void,
): () => void {
  listeners.add(listener);
  listener(items);
  return () => listeners.delete(listener);
}

/** Test-only: resets in-memory + persisted state between test runs. */
export function _resetInboxForTests(): void {
  items = [];
  listeners.clear();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
