import { useEffect, useState } from 'react';
import {
  type InboxNotification,
  subscribeToInboxNotifications,
  markInboxNotificationRead,
  markAllInboxNotificationsRead,
  clearInboxNotifications,
} from '../lib/notificationsInbox';

/**
 * useNotificationsInbox — thin React wrapper around
 * lib/notificationsInbox.ts (R3-1a), same shape as useNotifications()
 * around lib/notifications.ts. Used by the single <NotificationsBell />
 * mounted once in App.tsx — addInboxNotification() itself is called
 * from plain code anywhere (e.g. useDailyGoal.ts), not through this hook.
 */
export function useNotificationsInbox() {
  const [items, setItems] = useState<InboxNotification[]>([]);

  useEffect(() => subscribeToInboxNotifications(setItems), []);

  const unreadCount = items.filter((n) => !n.read).length;

  return {
    items,
    unreadCount,
    markRead: markInboxNotificationRead,
    markAllRead: markAllInboxNotificationsRead,
    clearAll: clearInboxNotifications,
  };
}
