/**
 * lib/keyboardShortcuts.ts — T3-1b: a shared registry for keyboard
 * shortcuts, so `useKeyboardShortcut` (the hook every page calls to
 * register its own shortcuts) and `KeyboardShortcutsPanel` (the shared
 * help panel) can agree on what's currently active without either
 * needing to know about the other directly.
 *
 * Deliberately module-scope state, not a Context: this is read by a
 * single global panel mounted once in App.tsx, not by a nested tree of
 * consumers that would need re-render propagation through a provider.
 * A small pub-sub (subscribe/notify) is enough for that one listener.
 *
 * This only tracks *description* metadata for the help panel — it does
 * NOT own the actual `keydown` listener. Each `useKeyboardShortcut` call
 * still attaches its own listener for its own handler; this registry is
 * purely "what's currently listed," so the panel always reflects
 * whatever shortcuts are active on the page you're standing on right
 * now, not a static list that includes shortcuts that don't apply here.
 */

export interface ShortcutEntry {
  id: string;
  keyLabel: string; // human-readable, e.g. "Alt+E", "/", "Esc"
  description: string;
}

let entries: ShortcutEntry[] = [];
let nextId = 0;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/** Registers a shortcut for the help panel's listing. Returns an id to pass to `unregisterShortcut`. */
export function registerShortcut(keyLabel: string, description: string): string {
  const id = `shortcut-${nextId++}`;
  entries = [...entries, { id, keyLabel, description }];
  notify();
  return id;
}

export function unregisterShortcut(id: string): void {
  entries = entries.filter((e) => e.id !== id);
  notify();
}

export function getShortcuts(): ShortcutEntry[] {
  return entries;
}

export function subscribeShortcuts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test-only: clears all registered entries between test files. */
export function _resetShortcutsForTests(): void {
  entries = [];
  nextId = 0;
  listeners.clear();
}
