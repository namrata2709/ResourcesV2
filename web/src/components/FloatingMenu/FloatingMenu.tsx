import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * components/FloatingMenu/FloatingMenu.tsx — T5-3c-2's generic FAB menu.
 *
 * T5-3c-2's own done-when is explicit: "both menus render via one
 * generic FloatingMenu component, not two hand-built menus." This is
 * that shared component — Note.tsx's Settings and Tools FABs are both
 * just two <FloatingMenu> instances with different item lists, not two
 * separately-built dropdowns.
 *
 * Interaction pattern deliberately matches UserMenu.tsx (R3-1b) and
 * NotificationsBell's existing anchored-dropdown convention exactly —
 * same click-outside/Escape-to-close behavior, same role="dialog"
 * (not role="menu") since items here mix plain actions, toggle-style
 * buttons (aria-pressed), and one item with its own inline submenu
 * (Print's format picker) — a strict ARIA menu role doesn't fit that
 * mix cleanly, and this codebase already made that same call for
 * UserMenu. "Reuse, don't duplicate" per project convention.
 *
 * Each item is a plain action UNLESS it has a `submenu`, in which case
 * clicking it expands an inline sub-list instead of firing an action
 * directly (used by Tools > Print, which needs to offer 2 modes rather
 * than doing one fixed thing on click) — the submenu stays open until a
 * sub-item is chosen or the whole menu is dismissed.
 */

export interface FloatingMenuSubItem {
  key: string;
  label: string;
  onSelect: () => void;
}

export interface FloatingMenuItem {
  key: string;
  /** Primary label, e.g. "Exam Mode". */
  label: string;
  /** Current-state text shown under the label, e.g. "Off" / "Dark mode". */
  detail?: string;
  icon?: ReactNode;
  /** Plain action items call this on click and close the menu. Ignored
   * when `submenu` is present. */
  onSelect?: () => void;
  /** When present, clicking the item expands this inline list instead
   * of firing an action directly (Tools > Print's format picker). */
  submenu?: FloatingMenuSubItem[];
  /** Toggle-style items (Lite Mode) render aria-pressed for a11y. */
  pressed?: boolean;
  /** Omit the item entirely — e.g. Export Highlights on lab pages. */
  hidden?: boolean;
}

interface FloatingMenuProps {
  /** Trigger label, also used as the panel's aria-label — "Settings" / "Tools". */
  label: string;
  icon: ReactNode;
  items: FloatingMenuItem[];
  /** Stacks multiple FABs without overlapping — a 0-based slot index
   * counted from the bottom-right corner, each slot 3.5rem apart. */
  stackIndex?: number;
}

export function FloatingMenu({ label, icon, items, stackIndex = 0 }: FloatingMenuProps) {
  const [open, setOpen] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Collapse any expanded submenu whenever the menu itself closes, so it
  // doesn't reopen pre-expanded next time.
  useEffect(() => {
    if (!open) setExpandedKey(null);
  }, [open]);

  const visibleItems = items.filter((item) => !item.hidden);

  return (
    <div
      ref={containerRef}
      className="fixed z-40"
      style={{ right: '1.5rem', bottom: `calc(1.5rem + ${stackIndex} * 4rem)` }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        title={label}
        className="
          inline-flex items-center justify-center
          h-12 w-12 rounded-full
          bg-bg-card text-text-primary
          border border-border-color
          shadow-[0_4px_12px_var(--shadow)]
          transition-shadow duration-150
          hover:shadow-[0_6px_20px_var(--shadow)]
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
        "
      >
        {icon}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="
            absolute right-0 bottom-full mb-2 w-72 max-w-[90vw] z-50
            bg-bg-card border border-border-color rounded-xl
            shadow-[0_8px_30px_var(--shadow)]
            flex flex-col py-1
          "
        >
          <p className="px-4 pt-2 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wide">
            {label}
          </p>
          {visibleItems.map((item) => (
            <div key={item.key}>
              <button
                type="button"
                onClick={() => {
                  if (item.submenu) {
                    setExpandedKey((prev) => (prev === item.key ? null : item.key));
                    return;
                  }
                  item.onSelect?.();
                  setOpen(false);
                }}
                aria-label={item.detail ? `${item.label}: ${item.detail}` : item.label}
                aria-pressed={item.pressed}
                aria-expanded={item.submenu ? expandedKey === item.key : undefined}
                className="
                  w-full flex items-center gap-2.5 px-4 py-2.5 text-left
                  text-sm text-text-primary hover:bg-bg-secondary transition-colors
                "
              >
                {item.icon && <span aria-hidden="true">{item.icon}</span>}
                <span className="flex-1">
                  {item.label}
                  {item.detail && <span className="block text-xs text-text-muted">{item.detail}</span>}
                </span>
              </button>
              {item.submenu && expandedKey === item.key && (
                <div className="pl-9 pr-2 pb-1.5 flex flex-col gap-0.5">
                  {item.submenu.map((sub) => (
                    <button
                      key={sub.key}
                      type="button"
                      onClick={() => {
                        sub.onSelect();
                        setOpen(false);
                      }}
                      className="
                        w-full text-left px-2.5 py-1.5 rounded-md text-sm
                        text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors
                      "
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
