import { useEffect, useState } from 'react';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { getShortcuts, subscribeShortcuts, type ShortcutEntry } from '../../lib/keyboardShortcuts';

/**
 * KeyboardShortcutsPanel — T3-1b: a single, real shortcuts-help panel,
 * discoverable via Shift+? (labeled that way, not bare "?" — the
 * character `?` itself requires holding Shift on a standard layout,
 * and the label previously didn't say so, which read as a different,
 * simpler-sounding shortcut than what you actually have to press).
 * matching the vanilla precedent implied by notes-print.css already
 * hiding a `.keyboard-shortcuts-help` element in print (i.e. some such
 * panel already existed in spirit — this is its React equivalent,
 * standardized as one shared component instead of each page needing
 * its own).
 *
 * Mounted ONCE in App.tsx (not per-page) — it reads the shared registry
 * from lib/keyboardShortcuts.ts, which every `useKeyboardShortcut` call
 * updates as components mount/unmount, so this panel's list is always
 * exactly "whatever shortcuts are active on the page you're standing on
 * right now," including its own `?` entry.
 */
export function KeyboardShortcutsPanel() {
  const [open, setOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState<ShortcutEntry[]>(getShortcuts());

  useEffect(() => subscribeShortcuts(() => setShortcuts(getShortcuts())), []);

  useKeyboardShortcut({
    key: '?',
    keyLabel: 'Shift+?',
    description: 'Show keyboard shortcuts',
    handler: () => setOpen((v) => !v),
  });

  useKeyboardShortcut({
    key: 'Escape',
    keyLabel: 'Esc',
    description: 'Close keyboard shortcuts panel',
    allowWhileTyping: true,
    enabled: open,
    handler: () => setOpen(false),
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="relative bg-bg-card border border-border-color rounded-xl shadow-[0_8px_30px_var(--shadow)] max-w-sm w-full p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-text-primary">⌨️ Keyboard shortcuts</h2>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close keyboard shortcuts panel"
            className="text-text-muted hover:text-text-primary"
          >
            ✕
          </button>
        </div>
        {shortcuts.length === 0 ? (
          <p className="text-sm text-text-muted">No shortcuts are active on this page.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {shortcuts.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-text-secondary">{s.description}</span>
                <kbd className="px-2 py-0.5 rounded bg-bg-secondary border border-border-color text-text-primary font-mono text-xs">
                  {s.keyLabel}
                </kbd>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
