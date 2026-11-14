import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { useKeyboardShortcut, type KeyboardShortcutOptions } from './useKeyboardShortcut';
import { getShortcuts, _resetShortcutsForTests } from '../lib/keyboardShortcuts';

// React's `createElement`/JSX both intercept a prop literally named `key`
// for reconciliation, no matter how the element is constructed — so it
// can never reach a component as `props.key`. Wrap the hook's options in
// a single `options` prop instead, and spread them into the real hook
// call inside the component, where `key` is just a normal object field.
function ShortcutHarness({ options }: { options: KeyboardShortcutOptions }) {
  useKeyboardShortcut(options);
  return null;
}

function renderShortcut(options: KeyboardShortcutOptions) {
  return render(<ShortcutHarness options={options} />);
}

afterEach(() => {
  cleanup();
  _resetShortcutsForTests();
});

describe('useKeyboardShortcut', () => {
  it('fires the handler on a matching key, case-insensitively', () => {
    const handler = vi.fn();
    renderShortcut({ key: 'e', altKey: true, keyLabel: 'Alt+E', description: 'Toggle exam mode', handler });

    fireEvent.keyDown(document, { key: 'E', altKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not fire when a modifier does not match', () => {
    const handler = vi.fn();
    renderShortcut({ key: 'e', altKey: true, keyLabel: 'Alt+E', description: 'Toggle exam mode', handler });

    fireEvent.keyDown(document, { key: 'e', altKey: false });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not fire while typing in an input by default', () => {
    const handler = vi.fn();
    renderShortcut({ key: '/', keyLabel: '/', description: 'Focus search', handler });

    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: '/' });
    expect(handler).not.toHaveBeenCalled();
    input.remove();
  });

  it('does not fire while a <select> is focused by default', () => {
    const handler = vi.fn();
    renderShortcut({ key: '1', keyLabel: '1', description: 'Select option 1', handler });

    const select = document.createElement('select');
    document.body.appendChild(select);
    fireEvent.keyDown(select, { key: '1' });
    expect(handler).not.toHaveBeenCalled();
    select.remove();
  });

  it('fires while typing when allowWhileTyping is set (e.g. Escape)', () => {
    const handler = vi.fn();
    renderShortcut({ key: 'Escape', keyLabel: 'Esc', description: 'Close', allowWhileTyping: true, handler });

    const input = document.createElement('input');
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(handler).toHaveBeenCalledTimes(1);
    input.remove();
  });

  it('does not register (or fire) when enabled is false', () => {
    const handler = vi.fn();
    renderShortcut({ key: 'f', keyLabel: 'F', description: 'Toggle favorite', enabled: false, handler });

    fireEvent.keyDown(document, { key: 'f' });
    expect(handler).not.toHaveBeenCalled();
    expect(getShortcuts().some((s) => s.description === 'Toggle favorite')).toBe(false);
  });

  /**
   * Array-key support (added while resolving T3-2b's flagged gap: Gallery
   * and Quiz each rolled their own document/window keydown listener
   * instead of this hook, partly because a couple of Gallery's shortcuts
   * — zoom in/out — have two valid keys on a US keyboard ('+' and its
   * unshifted '=', '-' and its shifted '_') that a single `key: string`
   * couldn't express as one shortcut without either dropping an alias or
   * duplicating the registry entry.
   */
  it('accepts an array of keys, firing on any one of them as a single shortcut', () => {
    const handler = vi.fn();
    renderShortcut({ key: ['+', '='], keyLabel: '+/=', description: 'Zoom in', handler });

    fireEvent.keyDown(document, { key: '=' });
    fireEvent.keyDown(document, { key: '+' });
    expect(handler).toHaveBeenCalledTimes(2);

    // Only one registry entry for the pair, not two.
    expect(getShortcuts().filter((s) => s.description === 'Zoom in')).toHaveLength(1);
  });

  it('does not fire for a key outside the given array', () => {
    const handler = vi.fn();
    renderShortcut({ key: ['+', '='], keyLabel: '+/=', description: 'Zoom in', handler });

    fireEvent.keyDown(document, { key: '-' });
    expect(handler).not.toHaveBeenCalled();
  });
});
