import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuickActionsBar } from './QuickActionsBar';
import { DEFAULT_QUICK_ACTION_IDS } from '../../lib/quickActions';

/**
 * QuickActionsBar.test.tsx — P0-7's real, previously-missing Dashboard
 * consumer. QUICK_ACTION_CATALOG/getSavedQuickActionIds were only ever
 * referenced by lib/quickActions.ts and the Settings picker before this
 * component existed; picking/reordering actions in Settings correctly
 * persisted to localStorage, but nothing rendered any of it anywhere.
 * This covers: renders the saved selection in the saved order, and
 * falls back sensibly for a first-time visitor / a corrupted value.
 */

function renderBar() {
  return render(
    <MemoryRouter>
      <QuickActionsBar />
    </MemoryRouter>,
  );
}

describe('QuickActionsBar', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the default actions for a first-time visitor (nothing saved yet)', () => {
    renderBar();
    for (const label of ['Continue Reading', 'Start Quiz', 'Favorites', 'Search']) {
      expect(screen.getByRole('link', { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it('renders exactly the saved selection, in the saved order — not the fixed catalog order', () => {
    // Catalog order is continue-reading, start-quiz, favorites, revision,
    // search, ... — deliberately different here so a test that happened
    // to match catalog order by coincidence wouldn't quietly pass.
    localStorage.setItem('quickActions', JSON.stringify(['search', 'gallery', 'continue-reading']));
    renderBar();

    const links = screen.getAllByRole('link');
    expect(links.map((el) => el.textContent)).toEqual([
      expect.stringContaining('Search'),
      expect.stringContaining('Gallery'),
      expect.stringContaining('Continue Reading'),
    ]);
  });

  it('links each action to its real href from the catalog', () => {
    localStorage.setItem('quickActions', JSON.stringify(['favorites']));
    renderBar();
    expect(screen.getByRole('link', { name: /Favorites/ })).toHaveAttribute('href', '/gallery?favorites=true');
  });

  it('falls back to the entire default set when even one saved id is unknown/stale (all-or-nothing validation, not per-id filtering)', () => {
    // lib/quickActions.ts's isValidIdList() rejects the WHOLE saved list
    // if any single id doesn't match the catalog — a removed/renamed
    // action doesn't just drop out of an otherwise-valid saved order.
    localStorage.setItem('quickActions', JSON.stringify(['search', 'no-longer-a-real-action']));
    renderBar();

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(DEFAULT_QUICK_ACTION_IDS.length);
    for (const label of ['Continue Reading', 'Start Quiz', 'Favorites', 'Search']) {
      expect(screen.getByRole('link', { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it('falls back to the default set when the saved value is corrupted (not an array)', () => {
    localStorage.setItem('quickActions', JSON.stringify({ not: 'an array' }));
    renderBar();
    expect(screen.getAllByRole('link')).toHaveLength(DEFAULT_QUICK_ACTION_IDS.length);
  });

  it('falls back to the default set (not an empty render) when every saved id is unknown', () => {
    // Same all-or-nothing rule as above — an all-invalid list is just a
    // more extreme case of "even one id is unknown".
    localStorage.setItem('quickActions', JSON.stringify(['totally-made-up']));
    renderBar();
    expect(screen.getAllByRole('link')).toHaveLength(DEFAULT_QUICK_ACTION_IDS.length);
  });
});
