import { useEffect, useRef } from 'react';
import { registerShortcut, unregisterShortcut } from '../lib/keyboardShortcuts';

export interface KeyboardShortcutOptions {
  /**
   * The key as reported by KeyboardEvent.key, e.g. 'e', '/', 'Escape',
   * 'ArrowRight'. Pass an array when a shortcut has more than one valid
   * key (e.g. '+' and '=' both zooming in on a US keyboard, since '='
   * is the unshifted key '+' lives on) — the handler and help-panel
   * entry are still one shortcut, just reachable by either key.
   */
  key: string | string[];
  /** Human-readable label for the help panel, e.g. "Alt+E", "/", "Esc". */
  keyLabel: string;
  /** What this shortcut does, shown in the help panel. */
  description: string;
  handler: (e: KeyboardEvent) => void;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  /**
   * By default, shortcuts don't fire while the user is typing/selecting in
   * an input/textarea/select/contenteditable (matches notes-index.js's own
   * '/' behavior deliberately NOT firing mid-sentence in some other field).
   * Set true for shortcuts that should still work while typing (e.g. Escape).
   */
  allowWhileTyping?: boolean;
  /** Pass false to skip registering (e.g. a shortcut that's conditionally active). */
  enabled?: boolean;
}

/**
 * useKeyboardShortcut — T3-1b's shared shortcut hook. Registers a real
 * `keydown` listener for the lifetime of the calling component AND
 * registers a description in the shared registry (lib/keyboardShortcuts.ts)
 * so KeyboardShortcutsPanel can list it — both halves live and die
 * together, tied to this one hook call, so the panel can never show a
 * shortcut that's actually inactive on the current page.
 *
 * Usage (one call per shortcut):
 *   useKeyboardShortcut({
 *     key: 'e', keyLabel: 'Alt+E', altKey: true,
 *     description: 'Toggle exam mode',
 *     handler: () => setExamMode((v) => !v),
 *   });
 */
export function useKeyboardShortcut({
  key,
  keyLabel,
  description,
  handler,
  altKey = false,
  ctrlKey = false,
  metaKey = false,
  allowWhileTyping = false,
  enabled = true,
}: KeyboardShortcutOptions): void {
  // Keep the latest handler without re-registering the listener/registry
  // entry on every render (handler is often an inline closure).
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  // Array identity changes every render for an inline `['+', '=']` literal
  // — join to a stable string for the effect's dependency array instead of
  // re-registering the listener (and flickering the help panel's entry)
  // on every render.
  const keys = Array.isArray(key) ? key : [key];
  const keysDepKey = keys.join('\u0000');

  useEffect(() => {
    if (!enabled) return;

    const id = registerShortcut(keyLabel, description);

    function onKeyDown(e: KeyboardEvent) {
      if (!keys.some((k) => e.key.toLowerCase() === k.toLowerCase())) return;
      if (e.altKey !== altKey || e.ctrlKey !== ctrlKey || e.metaKey !== metaKey) return;

      if (!allowWhileTyping) {
        const target = e.target as HTMLElement | null;
        const isTyping =
          !!target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable);
        if (isTyping) return;
      }

      handlerRef.current(e);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      unregisterShortcut(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysDepKey, keyLabel, description, altKey, ctrlKey, metaKey, allowWhileTyping, enabled]);
}
