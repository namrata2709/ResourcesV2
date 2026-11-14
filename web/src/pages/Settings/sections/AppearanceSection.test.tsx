import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppearanceProvider } from '../../../context/AppearanceContext';
import './AppearanceSection'; // registers itself as a side effect — see sections/index.ts's own comment
import { getSettingsSections } from '../registry';

/**
 * AppearanceSection.test.tsx — same shape as ProfileSection.test.tsx.
 * Closes the gap neither Settings.test.tsx (fake sections) nor a future
 * Dashboard test would cover: each control here actually calls
 * updatePrefs() and persists to localStorage via lib/appearance.ts's
 * saveAppearancePrefs(), and (separately) applies the corresponding CSS
 * custom property / data attribute to <html> without touching data-theme.
 */

afterEach(() => {
  const root = document.documentElement;
  root.style.removeProperty('--accent');
  root.style.removeProperty('--card-radius');
  root.removeAttribute('data-density');
  root.removeAttribute('data-animations');
});

function renderAppearanceSection() {
  const section = getSettingsSections().find((s) => s.id === 'appearance');
  if (!section) throw new Error('AppearanceSection did not register itself — check the side-effect import above');
  return render(
    <AppearanceProvider>
      <section.Component />
    </AppearanceProvider>,
  );
}

describe('AppearanceSection', () => {
  it('registers itself under the "appearance" id with label "Appearance"', () => {
    const section = getSettingsSections().find((s) => s.id === 'appearance');
    expect(section?.label).toBe('Appearance');
  });

  it('selecting an accent swatch persists it and sets the --accent CSS variable', () => {
    renderAppearanceSection();

    fireEvent.click(screen.getByRole('radio', { name: 'Accent #38bdf8' }));

    expect(JSON.parse(localStorage.getItem('appearancePrefs') || '{}')).toMatchObject({ accent: '#38bdf8' });
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#38bdf8');
  });

  it('"Theme default" clears a previously-set accent override', () => {
    renderAppearanceSection();
    fireEvent.click(screen.getByRole('radio', { name: 'Accent #38bdf8' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Theme default' }));

    expect(JSON.parse(localStorage.getItem('appearancePrefs') || '{}')).toMatchObject({ accent: 'theme' });
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('');
  });

  it('selecting a card radius option persists it and sets --card-radius', () => {
    renderAppearanceSection();

    fireEvent.click(screen.getByRole('radio', { name: 'Pill' }));

    expect(JSON.parse(localStorage.getItem('appearancePrefs') || '{}')).toMatchObject({ radius: 'pill' });
    expect(document.documentElement.style.getPropertyValue('--card-radius')).toBe('1.5rem');
  });

  it('selecting compact density persists it and sets data-density on <html>', () => {
    renderAppearanceSection();

    fireEvent.click(screen.getByRole('radio', { name: /Compact/ }));

    expect(JSON.parse(localStorage.getItem('appearancePrefs') || '{}')).toMatchObject({ density: 'compact' });
    expect(document.documentElement.getAttribute('data-density')).toBe('compact');
  });

  it('toggling animations off persists it and sets data-animations="off" on <html>', () => {
    renderAppearanceSection();

    const toggle = screen.getByRole('switch', { name: /Animations/ });
    expect(toggle).toBeChecked();

    fireEvent.click(toggle);

    expect(toggle).not.toBeChecked();
    expect(JSON.parse(localStorage.getItem('appearancePrefs') || '{}')).toMatchObject({ animations: false });
    expect(document.documentElement.getAttribute('data-animations')).toBe('off');
  });

  it('does not touch the "theme" localStorage key or data-theme attribute', () => {
    localStorage.setItem('theme', 'comfort');
    renderAppearanceSection();

    fireEvent.click(screen.getByRole('radio', { name: 'Pill' }));
    fireEvent.click(screen.getByRole('radio', { name: /Compact/ }));
    fireEvent.click(screen.getByRole('switch', { name: /Animations/ }));

    expect(localStorage.getItem('theme')).toBe('comfort');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('loads previously saved values on mount rather than starting from defaults', () => {
    localStorage.setItem(
      'appearancePrefs',
      JSON.stringify({ v: 1, accent: '#f472b6', radius: 'sharp', density: 'compact', animations: false }),
    );

    renderAppearanceSection();

    expect(screen.getByRole('radio', { name: 'Accent #f472b6' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Sharp' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Compact/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: /Animations/ })).not.toBeChecked();
  });
});
