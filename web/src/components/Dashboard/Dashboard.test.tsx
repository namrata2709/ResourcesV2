import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../../context/ThemeContext';
import { ProfileProvider } from '../../context/ProfileContext';
import { Dashboard } from './Dashboard';

/**
 * Dashboard.test.tsx
 *
 * Covers dashboard.js's ported contract:
 *   - one card rendered per dashboard-cards.json entry
 *   - a card missing its own `icon` falls back to category-icons.json's
 *     `default.icon` — the ONE source of truth for the fallback glyph
 *     (T1-3's fix for audit-findings.md Finding 10, where this file and
 *     category-icons.json each defined their own, disagreeing fallback).
 *     The fixture below uses a deliberately unusual glyph so this test
 *     fails loudly if a hardcoded fallback ever creeps back into
 *     Dashboard.tsx instead of coming from the mocked JSON.
 *
 * Note on Icon/jsdom: jsdom doesn't attempt real image loads, so an
 * <img>'s onError never fires on its own — a card's real icon and its
 * fallback are indistinguishable in the DOM until the error is triggered
 * explicitly via fireEvent.error(), same as a real 404 would in a browser.
 */

const FIXTURE_CARDS = {
  cards: [
    { id: 'aws', label: 'AWS', icon: '☁️', description: 'Cloud stuff', type: 'subject', url: '/aws' },
    { id: 'mystery', label: 'Mystery Subject', description: 'No icon field at all', type: 'subject', url: '/mystery' },
  ],
};

const FIXTURE_CATEGORY_ICONS = {
  default: { icon: '🔮', keywords: [] }, // deliberately distinctive — see note above
};

function mockFetchRouting() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/data/index/dashboard-cards.json') {
        return Promise.resolve({ ok: true, json: async () => FIXTURE_CARDS });
      }
      if (url === '/data/config/category-icons.json') {
        return Promise.resolve({ ok: true, json: async () => FIXTURE_CATEGORY_ICONS });
      }
      return Promise.reject(new Error(`unexpected fetch in test: ${url}`));
    }),
  );
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <ProfileProvider>
          <Dashboard />
        </ProfileProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('Dashboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders one card per dashboard-cards.json entry', async () => {
    mockFetchRouting();
    renderDashboard();

    expect(await screen.findByText('AWS')).toBeInTheDocument();
    expect(await screen.findByText('Mystery Subject')).toBeInTheDocument();
  });

  it("falls back to category-icons.json's default.icon for a card with no icon of its own", async () => {
    mockFetchRouting();
    renderDashboard();

    const mysteryCard = (await screen.findByText('Mystery Subject')).closest('a') as HTMLElement;
    expect(mysteryCard).not.toBeNull();

    // Icon's <img> has alt="" here (Dashboard doesn't pass one), which
    // resolves to ARIA role "presentation", not "img" — getByRole('img')
    // would silently find nothing. Query the element directly instead.
    const img = mysteryCard.querySelector('img');
    expect(img).not.toBeNull();
    fireEvent.error(img as HTMLImageElement); // simulate the 404 jsdom won't produce on its own

    // Must show the FIXTURE's glyph specifically — not any other string —
    // to confirm it came from the mocked category-icons.json response.
    await waitFor(() => expect(within(mysteryCard).getByText('🔮')).toBeInTheDocument());
  });

  it('shows the error state when dashboard-cards.json fails to load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    renderDashboard();

    expect(await screen.findByText('Error Loading Dashboard')).toBeInTheDocument();
  });

  it('renders the default greeting with no userProfile set (P0-1)', async () => {
    mockFetchRouting();
    renderDashboard();

    expect(await screen.findByText(/Good (morning|afternoon|evening)/)).toBeInTheDocument();
  });

  it('renders a saved name/greeting/avatar from userProfile (P0-1)', async () => {
    localStorage.setItem(
      'userProfile',
      JSON.stringify({ v: 1, name: 'Namu', avatar: '🚀', greeting: 'Good {timeOfDay}{name}', goal: '' }),
    );
    mockFetchRouting();
    renderDashboard();

    expect(await screen.findByText(/Good (morning|afternoon|evening), Namu/)).toBeInTheDocument();
    expect(screen.getByText('🚀')).toBeInTheDocument();
  });
});
