import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardCardsGrid } from './DashboardCardsGrid';

/**
 * DashboardCardsGrid.test.tsx
 *
 * Extracted from Dashboard.test.tsx when this component was pulled out
 * of Dashboard.tsx so NotFound could reuse it (T3-1's audit gap — "same
 * dashboard cards as index.html"). Dashboard.test.tsx's own tests are
 * left in place unchanged as integration coverage through Dashboard.
 */

const FIXTURE_CARDS = {
  cards: [
    { id: 'aws', label: 'AWS', icon: '☁️', description: 'Cloud stuff', type: 'subject', url: '/aws' },
    { id: 'mystery', label: 'Mystery Subject', description: 'No icon field at all', type: 'subject', url: '/mystery' },
  ],
};

const FIXTURE_CATEGORY_ICONS = {
  default: { icon: '🔮', keywords: [] },
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

function renderGrid() {
  return render(
    <MemoryRouter>
      <DashboardCardsGrid />
    </MemoryRouter>,
  );
}

describe('DashboardCardsGrid', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders one card per dashboard-cards.json entry', async () => {
    mockFetchRouting();
    renderGrid();

    expect(await screen.findByText('AWS')).toBeInTheDocument();
    expect(await screen.findByText('Mystery Subject')).toBeInTheDocument();
  });

  it("falls back to category-icons.json's default.icon for a card with no icon of its own", async () => {
    mockFetchRouting();
    renderGrid();

    const mysteryCard = (await screen.findByText('Mystery Subject')).closest('a') as HTMLElement;
    expect(mysteryCard).not.toBeNull();

    const img = mysteryCard.querySelector('img');
    expect(img).not.toBeNull();
    fireEvent.error(img as HTMLImageElement);

    await waitFor(() => expect(within(mysteryCard).getByText('🔮')).toBeInTheDocument());
  });

  it('shows the error state when dashboard-cards.json fails to load', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    renderGrid();

    expect(await screen.findByText('Error Loading Dashboard')).toBeInTheDocument();
  });

  it('P0-2: gives the type badge a solid accent background, not just accent text on a neutral bg', async () => {
    // Regression guard: the original P0-2 bug wasn't that --accent had no
    // consumers (it has dozens, via Tailwind's text-accent/bg-accent/etc.
    // utility classes — confirmed against the built CSS output), it's
    // that this badge's *background* stayed theme-neutral, so an accent
    // color change only moved the small label text, easy to miss glancing
    // at Dashboard. `bg-accent` (solid, not the `/15` tint) makes the
    // swatch itself visible here — solid rather than tinted specifically
    // because Tailwind's `/NN` opacity modifier doesn't compile at all
    // for any bare-var()-backed color in this config (confirmed via a
    // built CSS check); a `/15` tint would be the exact same silent
    // no-op this ticket is fixing.
    mockFetchRouting();
    renderGrid();

    const badges = await screen.findAllByText('Subject');
    expect(badges.length).toBeGreaterThan(0);
    for (const badge of badges) {
      expect(badge.className).toContain('bg-accent');
      expect(badge.className).not.toContain('bg-accent/');
      expect(badge.className).not.toContain('bg-bg-secondary');
      expect(badge.className).toContain('text-white');
    }
  });

  it('shows the empty state when there are zero cards', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/data/index/dashboard-cards.json') {
          return Promise.resolve({ ok: true, json: async () => ({ cards: [] }) });
        }
        return Promise.resolve({ ok: true, json: async () => FIXTURE_CATEGORY_ICONS });
      }),
    );
    renderGrid();

    expect(await screen.findByText('No dashboard cards configured yet.')).toBeInTheDocument();
  });

  describe('P0-11: reordering', () => {
    it('renders cards in dashboard-cards.json order when nothing is saved (sensible default)', async () => {
      mockFetchRouting();
      renderGrid();

      const headings = (await screen.findAllByRole('heading', { level: 2 })).map(
        (h) => h.textContent,
      );
      expect(headings).toEqual(['AWS', 'Mystery Subject']);
    });

    it('applies a previously saved order on load', async () => {
      localStorage.setItem('dashboardCardOrder', JSON.stringify(['mystery', 'aws']));
      mockFetchRouting();
      renderGrid();

      const headings = (await screen.findAllByRole('heading', { level: 2 })).map(
        (h) => h.textContent,
      );
      expect(headings).toEqual(['Mystery Subject', 'AWS']);
    });

    it('moves a card earlier via its Move button and persists the new order', async () => {
      mockFetchRouting();
      renderGrid();
      await screen.findByText('AWS');

      fireEvent.click(screen.getByRole('button', { name: 'Move Mystery Subject earlier' }));

      const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
      expect(headings).toEqual(['Mystery Subject', 'AWS']);
      expect(JSON.parse(localStorage.getItem('dashboardCardOrder') || '[]')).toEqual([
        'mystery',
        'aws',
      ]);
    });

    it('disables the Move-earlier button on the first card and Move-later on the last', async () => {
      mockFetchRouting();
      renderGrid();
      await screen.findByText('AWS');

      expect(screen.getByRole('button', { name: 'Move AWS earlier' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Move Mystery Subject later' })).toBeDisabled();
    });

    it('reorders on drag-and-drop and persists the result', async () => {
      mockFetchRouting();
      renderGrid();
      await screen.findByText('AWS');

      const awsCard = screen.getByText('AWS').closest('a')!.parentElement as HTMLElement;
      const mysteryCard = screen.getByText('Mystery Subject').closest('a')!
        .parentElement as HTMLElement;

      fireEvent.dragStart(awsCard);
      fireEvent.dragOver(mysteryCard);
      fireEvent.drop(mysteryCard);

      const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
      expect(headings).toEqual(['Mystery Subject', 'AWS']);
      expect(JSON.parse(localStorage.getItem('dashboardCardOrder') || '[]')).toEqual([
        'mystery',
        'aws',
      ]);
    });
  });
});
