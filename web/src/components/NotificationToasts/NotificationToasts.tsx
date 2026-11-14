import { useNotifications } from '../../hooks/useNotifications';
import type { NotificationType } from '../../lib/notifications';

/**
 * NotificationToasts — the single renderer for lib/notifications.ts's
 * shared toast store. Mounted once in App.tsx, same "one shared instance,
 * not per-file duplication" fix lib/liveRegion.ts already applied to
 * live-region announcements (see that file's header) — the vanilla
 * showNotification was duplicated across 5 files; this consolidates it
 * to one place instead of porting the duplication forward.
 */

const TYPE_STYLES: Record<NotificationType, string> = {
  info: 'bg-bg-card text-text-primary border-border-color',
  success: 'bg-bg-card text-text-primary border-primary',
  warning: 'bg-bg-card text-text-primary border-accent',
  error: 'bg-bg-card text-text-primary border-red-500',
};

export function NotificationToasts() {
  const { notifications, dismiss } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-xs"
    >
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 shadow-[0_4px_12px_var(--shadow)] ${TYPE_STYLES[n.type]}`}
        >
          <span className="text-sm">{n.message}</span>
          <button
            type="button"
            onClick={() => dismiss(n.id)}
            aria-label="Dismiss notification"
            className="text-text-muted hover:text-text-primary leading-none"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
