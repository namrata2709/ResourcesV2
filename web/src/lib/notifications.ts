/**
 * lib/notifications.ts
 *
 * Ports the shared `showNotification` toast system — used by 5 vanilla
 * files today (feature-parity audit, Part B) — as one framework-agnostic
 * store, per src/lib/README.md's pattern: plain logic here, a thin
 * `useNotifications()` hook in src/hooks/ wraps it for the one
 * <NotificationToasts /> renderer mounted once in App.tsx. Every vanilla
 * file called a single global showNotification(message, type) function
 * from anywhere, so the React port keeps that same shape — showNotification()
 * below works whether or not any component happens to be subscribed at
 * call time, rather than requiring a React Context provider around every
 * call site.
 */

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

/** Same on-screen duration the vanilla toasts used before auto-dismissing. */
const DEFAULT_DURATION_MS = 4000;

let notifications: Notification[] = [];
const listeners = new Set<(items: Notification[]) => void>();

function emit(): void {
  const snapshot = notifications;
  listeners.forEach((listener) => listener(snapshot));
}

/**
 * Shows a toast notification. Callable from anywhere — plain code, an
 * event handler, another lib/ module — not just from within a React
 * component tree.
 */
export function showNotification(
  message: string,
  type: NotificationType = 'info',
  durationMs: number = DEFAULT_DURATION_MS,
): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  notifications = [...notifications, { id, message, type }];
  emit();

  if (durationMs > 0) {
    window.setTimeout(() => dismissNotification(id), durationMs);
  }

  return id;
}

/** Dismisses a single toast early, e.g. from its own close button. */
export function dismissNotification(id: string): void {
  const next = notifications.filter((n) => n.id !== id);
  if (next.length === notifications.length) return;
  notifications = next;
  emit();
}

/** Subscribes to the current toast list; returns an unsubscribe function. */
export function subscribeToNotifications(listener: (items: Notification[]) => void): () => void {
  listeners.add(listener);
  listener(notifications);
  return () => listeners.delete(listener);
}

/** Test-only: clears all toasts and listeners between test runs. */
export function _resetNotificationsForTests(): void {
  notifications = [];
  listeners.clear();
}
