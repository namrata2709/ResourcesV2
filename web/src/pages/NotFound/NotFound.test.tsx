import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { NotFound } from './NotFound';

const FIXTURE_CARDS = { cards: [{ id: 'aws', label: 'AWS', icon: '☁️', type: 'subject', url: '/aws' }] };
const FIXTURE_CATEGORY_ICONS = { default: { icon: '🔮', keywords: [] } };
const FIXTURE_NOTES = { notes: [] };
// B-6: PopularNotes' data — deliberately non-empty by default so it
// doesn't get confused for RecentlyViewed's separate empty state in
// the tests below (those two sections are independent: Popular Notes
// is generated/curated and empty-of-localStorage doesn't affect it).
const FIXTURE_POPULAR_NOTES = {
  notes: [{ folder: 'merge-sort', title: 'Merge Sort', subject: 'dsa', category: 'Sorting', url: '/notes/merge-sort', internal: true }],
};

function mockFetchRouting() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/data/index/dashboard-cards.json') return Promise.resolve({ ok: true, json: async () => FIXTURE_CARDS });
      if (url === '/data/config/category-icons.json') return Promise.resolve({ ok: true, json: async () => FIXTURE_CATEGORY_ICONS });
      if (url === '/data/index/notes-index.json') return Promise.resolve({ ok: true, json: async () => FIXTURE_NOTES });
      if (url === '/data/index/popular-notes.json') return Promise.resolve({ ok: true, json: async () => FIXTURE_POPULAR_NOTES });
      return Promise.reject(new Error(`unexpected fetch in test: ${url}`));
    }),
  );
}

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="landed-at">{location.pathname + location.search}</div>;
}

describe('NotFound', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the page-not-found heading and subtitle', async () => {
    mockFetchRouting();
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.getByText('🔍 Page Not Found')).toBeInTheDocument();
    expect(screen.getByText("That page doesn't exist — but here's everything that does.")).toBeInTheDocument();
    // Let DashboardCardsGrid's pending fetch settle before the test ends,
    // or its state update lands outside act() and warns.
    await screen.findByText('AWS');
  });

  it('renders the search box, dashboard cards, and a link back home', async () => {
    mockFetchRouting();
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('Search notes')).toBeInTheDocument();
    expect(await screen.findByText('AWS')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← Back to the homepage' })).toHaveAttribute('href', '/');
  });

  it('renders no Recently Viewed section when localStorage is empty', async () => {
    mockFetchRouting();
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    await screen.findByText('AWS');
    expect(screen.queryByText('Recently Viewed')).not.toBeInTheDocument();
  });

  /** B-6: Popular Notes is independent of Recently Viewed/localStorage
   * — it should render even for a first-time visitor with nothing in
   * Recently Viewed, since that's the exact visitor this section exists
   * for (someone who landed on a broken link with no browsing history
   * on this site yet). */
  it('renders Popular Notes even when Recently Viewed is empty', async () => {
    mockFetchRouting();
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Recently Viewed')).not.toBeInTheDocument();
    expect(await screen.findByText('Popular Notes')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Merge Sort' })).toHaveAttribute('href', '/notes/merge-sort');
  });

  it('renders no Popular Notes section when popular-notes.json is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/data/index/dashboard-cards.json') return Promise.resolve({ ok: true, json: async () => FIXTURE_CARDS });
        if (url === '/data/config/category-icons.json') return Promise.resolve({ ok: true, json: async () => FIXTURE_CATEGORY_ICONS });
        if (url === '/data/index/notes-index.json') return Promise.resolve({ ok: true, json: async () => FIXTURE_NOTES });
        if (url === '/data/index/popular-notes.json') return Promise.resolve({ ok: true, json: async () => ({ notes: [] }) });
        return Promise.reject(new Error(`unexpected fetch in test: ${url}`));
      }),
    );
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );

    await screen.findByText('AWS');
    expect(screen.queryByText('Popular Notes')).not.toBeInTheDocument();
  });

  /**
   * Moved from the deleted SearchRedirect.test.tsx once that component
   * was inlined here directly (see NotFound.tsx's module comment).
   */
  describe('search box redirect', () => {
    it('navigates to /notes-index?q=<term> when a term is submitted', async () => {
      mockFetchRouting();
      render(
        <MemoryRouter initialEntries={['/404']}>
          <Routes>
            <Route path="/404" element={<NotFound />} />
            <Route path="/notes-index" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>,
      );

      fireEvent.change(screen.getByLabelText('Search notes'), { target: { value: 'ec2 basics' } });
      fireEvent.submit(screen.getByRole('search'));

      expect(screen.getByTestId('landed-at')).toHaveTextContent('/notes-index?q=ec2%20basics');
    });

    it('navigates to bare /notes-index when submitted empty', async () => {
      mockFetchRouting();
      render(
        <MemoryRouter initialEntries={['/404']}>
          <Routes>
            <Route path="/404" element={<NotFound />} />
            <Route path="/notes-index" element={<LocationDisplay />} />
          </Routes>
        </MemoryRouter>,
      );

      fireEvent.submit(screen.getByRole('search'));

      expect(screen.getByTestId('landed-at')).toHaveTextContent('/notes-index');
      expect(screen.getByTestId('landed-at')).not.toHaveTextContent('?q=');
    });
  });
});
