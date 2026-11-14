import { useEffect, useRef, useState } from 'react';
import { useNotificationsInbox } from '../../hooks/useNotificationsInbox';
import type { InboxNotification, NotificationType } from '../../lib/notificationsInbox';
import { Icon } from '../Icon';

/**
 * NotificationsBell — R3-1a's in-app notification center.
 *
 * Deliberately NOT the toast system (see lib/notificationsInbox.ts's
 * header for why): this is a persistent, dismiss-on-read inbox opened
 * on demand from a bell icon, not another auto-expiring toast renderer.
 *
 * Mounted once in App.tsx's fixed header cluster, alongside the
 * Settings gear and ThemeToggle — same visual weight and
 * Icon+fallback convention as those two.
 *
 * The open/close panel is a lightweight anchored dropdown (click the
 * bell, click outside or Escape to close) rather than a full-screen
 * modal like KeyboardShortcutsPanel — R3-1a's own spec calls this out
 * explicitly as "same weight as the existing KeyboardShortcutsPanel,
 * not a full page," but a *dropdown*, not another center-screen dialog,
 * since it's anchored to the bell rather than a global keyboard action.
 */

const TYPE_DOT: Record<NotificationType, string> = {
  info: 'bg-primary',
  success: 'bg-primary',
  warning: 'bg-accent',
  error: 'bg-red-500',
};

function BellIconFallback() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

/** Same relative-time formatting RecentlyViewed.tsx already established. */
function formatRelativeTime(ts: number): string {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

function NotificationRow({
  item,
  onRead,
}: {
  item: InboxNotification;
  onRead: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onRead(item.id)}
        className={`
          w-full flex items-start gap-2.5 text-left px-3 py-2.5 rounded-lg
          transition-colors duration-100
          hover:bg-bg-secondary
          ${item.read ? '' : 'bg-bg-secondary/60'}
        `}
      >
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read ? 'bg-transparent' : TYPE_DOT[item.type]}`}
          aria-hidden="true"
        />
        <span className="flex-1 min-w-0">
          <span className="block text-sm text-text-primary leading-snug">{item.message}</span>
          <span className="block text-xs text-text-muted mt-0.5">
            {formatRelativeTime(item.createdAt)}
          </span>
        </span>
      </button>
    </li>
  );
}

export function NotificationsBell() {
  const { items, unreadCount, markRead, markAllRead, clearAll } = useNotificationsInbox();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click-outside to close, same intent as KeyboardShortcutsPanel's
  // backdrop click but for an anchored dropdown rather than a full
  // overlay — no backdrop element to click, so this listens on the
  // document instead.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const label = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        title={label}
        className="
          relative inline-flex items-center justify-center
          h-10 w-10 rounded-full
          bg-bg-card text-primary
          border border-border-color
          shadow-[0_4px_12px_var(--shadow)]
          transition-shadow duration-150
          hover:shadow-[0_6px_20px_var(--shadow)]
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
        "
      >
        <Icon name="bell" size={20} fallback={<BellIconFallback />} />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="
              absolute -top-1 -right-1
              min-w-[18px] h-[18px] px-1
              flex items-center justify-center
              rounded-full bg-red-500 text-white text-[10px] font-semibold
              leading-none
            "
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="
            absolute right-0 mt-2 w-80 max-w-[90vw] z-50
            bg-bg-card border border-border-color rounded-xl
            shadow-[0_8px_30px_var(--shadow)]
            flex flex-col max-h-[70vh]
          "
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border-color">
            <h2 className="text-sm font-semibold text-text-primary">Notifications</h2>
            {items.length > 0 && (
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="text-xs text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-text-muted hover:text-text-primary"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-3 py-6 text-sm text-text-muted text-center">
              You're all caught up.
            </p>
          ) : (
            <ul className="overflow-y-auto py-1 px-1 flex flex-col gap-0.5">
              {items.map((item) => (
                <NotificationRow key={item.id} item={item} onRead={markRead} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
