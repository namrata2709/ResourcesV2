import { useEffect, useState } from 'react';
import {
  type Notification,
  subscribeToNotifications,
  dismissNotification,
} from '../lib/notifications';

/**
 * useNotifications — thin React wrapper around lib/notifications.ts.
 * Used by the single <NotificationToasts /> renderer mounted once in
 * App.tsx — showNotification() itself is called from plain code anywhere,
 * not through this hook (see lib/notifications.ts).
 */
export function useNotifications() {
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => subscribeToNotifications(setItems), []);

  return { notifications: items, dismiss: dismissNotification };
}
