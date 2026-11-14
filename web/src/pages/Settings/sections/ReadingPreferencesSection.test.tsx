import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReadingPreferencesProvider } from '../../../context/ReadingPreferencesContext';
import './ReadingPreferencesSection'; // registers itself as a side effect — see sections/index.ts's own comment
import { getSettingsSections } from '../registry';

/**
 * ReadingPreferencesSection.test.tsx — same shape as AppearanceSection.test.tsx.
 * Each option group here actually calls updatePrefs() and persists to
 * localStorage via lib/readingPreferences.ts's saveReadingPreferences(),
 * and (separately) applies the corresponding CSS custom property to
 * <html> without touching theme/appearance/a11y state.
 */

afterEach(() => {
  const root = document.documentElement;
  root.style.removeProperty('--reading-font-size');
  root.style.removeProperty('--reading-line-height');
  root.style.removeProperty('--reading-font-family');
  root.style.removeProperty('--reading-content-width');
});

function renderReadingPreferencesSection() {
  const section = getSettingsSections().find((s) => s.id === 'reading-preferences');
  if (!section) {
    throw new Error('ReadingPreferencesSection did not register itself — check the side-effect import above');
  }
  return render(
    <ReadingPreferencesProvider>
      <section.Component />
    </ReadingPreferencesProvider>,
  );
}

describe('ReadingPreferencesSection', () => {
  it('registers itself under the "reading-preferences" id with label "Reading Preferences"', () => {
    const section = getSettingsSections().find((s) => s.id === 'reading-preferences');
    expect(section?.label).toBe('Reading Preferences');
  });

  it('selecting a font size persists it and sets --reading-font-size on <html>', () => {
    renderReadingPreferencesSection();

    fireEvent.click(screen.getByRole('radio', { name: 'Extra large' }));

    expect(JSON.parse(localStorage.getItem('readingPreferences') || '{}')).toMatchObject({ fontSize: 'x-large' });
    expect(document.documentElement.style.getPropertyValue('--reading-font-size')).toBe('1.375rem');
  });

  it('selecting a line height persists it and sets --reading-line-height on <html>', () => {
    renderReadingPreferencesSection();

    fireEvent.click(screen.getByRole('radio', { name: 'Spacious' }));

    expect(JSON.parse(localStorage.getItem('readingPreferences') || '{}')).toMatchObject({ lineHeight: 'spacious' });
    expect(document.documentElement.style.getPropertyValue('--reading-line-height')).toBe('2');
  });

  it('selecting a font family persists it and sets --reading-font-family on <html>', () => {
    renderReadingPreferencesSection();

    fireEvent.click(screen.getByRole('radio', { name: 'Dyslexia-friendly' }));

    expect(JSON.parse(localStorage.getItem('readingPreferences') || '{}')).toMatchObject({ fontFamily: 'dyslexia' });
    expect(document.documentElement.style.getPropertyValue('--reading-font-family')).toContain('OpenDyslexic');
  });

  it('selecting a content width persists it and sets --reading-content-width on <html>', () => {
    renderReadingPreferencesSection();

    fireEvent.click(screen.getByRole('radio', { name: 'Narrow' }));

    expect(JSON.parse(localStorage.getItem('readingPreferences') || '{}')).toMatchObject({ width: 'narrow' });
    expect(document.documentElement.style.getPropertyValue('--reading-content-width')).toBe('38rem');
  });

  it('does not touch the "theme", "appearancePrefs", or "a11yPrefs" localStorage keys or their attributes', () => {
    localStorage.setItem('theme', 'comfort');
    renderReadingPreferencesSection();

    fireEvent.click(screen.getByRole('radio', { name: 'Extra large' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Wide' }));

    expect(localStorage.getItem('theme')).toBe('comfort');
    expect(localStorage.getItem('appearancePrefs')).toBeNull();
    expect(localStorage.getItem('a11yPrefs')).toBeNull();
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    expect(document.documentElement.getAttribute('data-density')).toBeNull();
    expect(document.documentElement.getAttribute('data-high-contrast')).toBeNull();
  });

  it('loads previously saved values on mount rather than starting from defaults', () => {
    localStorage.setItem(
      'readingPreferences',
      JSON.stringify({ v: 1, fontSize: 'small', lineHeight: 'compact', fontFamily: 'serif', width: 'wide' }),
    );

    renderReadingPreferencesSection();

    expect(screen.getByRole('radio', { name: 'Small' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Compact' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Serif' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Wide' })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows a hint that these preferences only apply to note pages', () => {
    renderReadingPreferencesSection();
    expect(screen.getByText(/note pages only/i)).toBeInTheDocument();
  });
});
