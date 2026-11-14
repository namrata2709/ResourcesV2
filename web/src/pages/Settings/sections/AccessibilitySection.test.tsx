import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { A11yProvider } from '../../../context/A11yContext';
import { registerShortcut, _resetShortcutsForTests } from '../../../lib/keyboardShortcuts';
import './AccessibilitySection'; // registers itself as a side effect — see sections/index.ts's own comment
import { getSettingsSections } from '../registry';

/**
 * AccessibilitySection.test.tsx — same shape as AppearanceSection.test.tsx.
 * Each toggle here actually calls updatePrefs() and persists to
 * localStorage via lib/a11y.ts's saveA11yPrefs(), and (separately) sets
 * the corresponding data-* attribute on <html> without touching
 * data-theme/appearancePrefs. The keyboard-shortcuts reference list is
 * confirmed to read the real shared registry, not a duplicate of it.
 */

afterEach(() => {
  const root = document.documentElement;
  root.removeAttribute('data-high-contrast');
  root.removeAttribute('data-reduced-motion');
  root.removeAttribute('data-focus-mode');
  root.removeAttribute('data-dyslexia-font');
  root.removeAttribute('data-larger-ui');
  _resetShortcutsForTests();
});

function renderAccessibilitySection() {
  const section = getSettingsSections().find((s) => s.id === 'accessibility');
  if (!section) throw new Error('AccessibilitySection did not register itself — check the side-effect import above');
  return render(
    <A11yProvider>
      <section.Component />
    </A11yProvider>,
  );
}

describe('AccessibilitySection', () => {
  it('registers itself under the "accessibility" id with label "Accessibility"', () => {
    const section = getSettingsSections().find((s) => s.id === 'accessibility');
    expect(section?.label).toBe('Accessibility');
  });

  it('toggling High contrast persists it and sets data-high-contrast="on" on <html>', () => {
    renderAccessibilitySection();

    const toggle = screen.getByRole('switch', { name: /High contrast/ });
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);

    expect(toggle).toBeChecked();
    expect(JSON.parse(localStorage.getItem('a11yPrefs') || '{}')).toMatchObject({ highContrast: true });
    expect(document.documentElement.getAttribute('data-high-contrast')).toBe('on');
  });

  it('toggling Reduced motion persists it and sets data-reduced-motion="on" on <html>', () => {
    renderAccessibilitySection();

    fireEvent.click(screen.getByRole('switch', { name: /Reduced motion/ }));

    expect(JSON.parse(localStorage.getItem('a11yPrefs') || '{}')).toMatchObject({ reducedMotion: true });
    expect(document.documentElement.getAttribute('data-reduced-motion')).toBe('on');
  });

  it('toggling Focus mode persists it and sets data-focus-mode="on" on <html>', () => {
    renderAccessibilitySection();

    fireEvent.click(screen.getByRole('switch', { name: /Focus mode/ }));

    expect(JSON.parse(localStorage.getItem('a11yPrefs') || '{}')).toMatchObject({ focusMode: true });
    expect(document.documentElement.getAttribute('data-focus-mode')).toBe('on');
  });

  it('toggling Dyslexia-friendly font persists it and sets data-dyslexia-font="on" on <html>', () => {
    renderAccessibilitySection();

    fireEvent.click(screen.getByRole('switch', { name: /Dyslexia-friendly font/ }));

    expect(JSON.parse(localStorage.getItem('a11yPrefs') || '{}')).toMatchObject({ dyslexiaFont: true });
    expect(document.documentElement.getAttribute('data-dyslexia-font')).toBe('on');
  });

  it('toggling Larger UI persists it and sets data-larger-ui="on" on <html>', () => {
    renderAccessibilitySection();

    fireEvent.click(screen.getByRole('switch', { name: /Larger UI/ }));

    expect(JSON.parse(localStorage.getItem('a11yPrefs') || '{}')).toMatchObject({ largerUI: true });
    expect(document.documentElement.getAttribute('data-larger-ui')).toBe('on');
  });

  it('does not touch the "theme" or "appearancePrefs" localStorage keys or their attributes', () => {
    localStorage.setItem('theme', 'comfort');
    renderAccessibilitySection();

    fireEvent.click(screen.getByRole('switch', { name: /High contrast/ }));
    fireEvent.click(screen.getByRole('switch', { name: /Larger UI/ }));

    expect(localStorage.getItem('theme')).toBe('comfort');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    expect(document.documentElement.getAttribute('data-density')).toBeNull();
    expect(document.documentElement.getAttribute('data-animations')).toBeNull();
  });

  it('loads previously saved values on mount rather than starting from defaults', () => {
    localStorage.setItem(
      'a11yPrefs',
      JSON.stringify({ v: 1, highContrast: true, reducedMotion: false, focusMode: true, dyslexiaFont: false, largerUI: true }),
    );

    renderAccessibilitySection();

    expect(screen.getByRole('switch', { name: /High contrast/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Reduced motion/ })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: /Focus mode/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Dyslexia-friendly font/ })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: /Larger UI/ })).toBeChecked();
  });

  it('shows a message that reduced motion is honored automatically regardless of the toggle', () => {
    renderAccessibilitySection();
    expect(screen.getByText(/always honored automatically/i)).toBeInTheDocument();
  });

  describe('keyboard shortcuts reference', () => {
    it('shows a placeholder when no shortcuts are currently registered', () => {
      renderAccessibilitySection();
      expect(screen.getByText(/no shortcuts are currently active/i)).toBeInTheDocument();
    });

    it('lists shortcuts from the real shared registry, not a duplicate of it', () => {
      registerShortcut('Alt+E', 'Toggle exam mode');
      registerShortcut('/', 'Focus search');

      renderAccessibilitySection();

      expect(screen.getByText('Toggle exam mode')).toBeInTheDocument();
      expect(screen.getByText('Alt+E')).toBeInTheDocument();
      expect(screen.getByText('Focus search')).toBeInTheDocument();
      expect(screen.getByText('/')).toBeInTheDocument();
    });

    it('updates live when a shortcut is registered after mount', () => {
      renderAccessibilitySection();
      expect(screen.queryByText('Toggle exam mode')).not.toBeInTheDocument();

      act(() => {
        registerShortcut('Alt+E', 'Toggle exam mode');
      });

      expect(screen.getByText('Toggle exam mode')).toBeInTheDocument();
    });
  });
});
