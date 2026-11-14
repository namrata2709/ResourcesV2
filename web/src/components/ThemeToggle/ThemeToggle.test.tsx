import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../../context/ThemeContext';
import { ThemeToggle } from './ThemeToggle';

/**
 * ThemeToggle.test.tsx — T0-7's proof-of-setup test.
 *
 * Covers the contract ThemeToggle.tsx itself documents:
 *   - 3-mode cycle: light -> dark -> comfort -> light
 *   - same "theme" localStorage key as vanilla theme.js
 *   - a saved preference from a previous session is honored on load
 *   - aria-label always describes the NEXT theme, not the current one
 *   - the click announces the change via the shared live region
 */

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
  it('defaults to light and shows "Switch to Dark mode" with no saved preference', () => {
    renderToggle();
    expect(screen.getByRole('button')).toHaveAccessibleName('Switch to Dark mode');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('honors a theme saved from a previous session on initial render', () => {
    localStorage.setItem('theme', 'dark');
    renderToggle();
    // Already dark on load -> next label should point at comfort, not dark again.
    expect(screen.getByRole('button')).toHaveAccessibleName('Switch to Comfort mode');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('cycles light -> dark -> comfort -> light on repeated clicks, persisting each step', async () => {
    const user = userEvent.setup();
    renderToggle();
    const button = screen.getByRole('button');

    await user.click(button);
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(button).toHaveAccessibleName('Switch to Comfort mode');

    await user.click(button);
    expect(localStorage.getItem('theme')).toBe('comfort');
    expect(document.documentElement.getAttribute('data-theme')).toBe('comfort');
    expect(button).toHaveAccessibleName('Switch to Light mode');

    await user.click(button);
    expect(localStorage.getItem('theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(button).toHaveAccessibleName('Switch to Dark mode');
  });

  it('announces the destination theme to the shared live region on click', async () => {
    const user = userEvent.setup();
    renderToggle();

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      const liveRegion = document.getElementById('app-live-region');
      expect(liveRegion).toHaveTextContent('Theme switched to Dark mode');
    });
  });

  it('falls back to an invalid/corrupted saved value by defaulting to light', () => {
    localStorage.setItem('theme', 'not-a-real-theme');
    renderToggle();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(screen.getByRole('button')).toHaveAccessibleName('Switch to Dark mode');
  });
});
