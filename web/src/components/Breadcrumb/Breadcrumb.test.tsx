import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Breadcrumb } from './Breadcrumb';

/**
 * Breadcrumb.test.tsx
 *
 * Covers navigation.js's ported contract (see lib/navigation.ts):
 *   - keys resolved against navigation-url.json's emoji+title+url
 *   - last item = current page, no link, aria-current="page"
 *   - a key with no config entry falls back to plain text (intentional
 *     — page-specific last-segment titles were never meant to resolve)
 *
 * Note on mocking: lib/navigation.ts caches its parsed config at module
 * scope after the first successful fetch (same behavior as the vanilla
 * navigation.js closure variable it replaced) — so `fetch` only needs to
 * be mocked once for this whole file, not per-test. That's intentional
 * production behavior, not a test-isolation bug to work around.
 */

const FIXTURE_NAV_CONFIG = [
  { title: 'Home', emoji: '🏠', url: '/' },
  { title: 'AWS', emoji: '☁️', url: '/aws' },
];

beforeAll(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => FIXTURE_NAV_CONFIG,
    }),
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});

function renderBreadcrumb(keys: string[]) {
  return render(
    <MemoryRouter>
      <Breadcrumb keys={keys} showPageHeader={false} />
    </MemoryRouter>,
  );
}

describe('Breadcrumb', () => {
  it('renders the correct emoji + title for a known navigation-url.json key', async () => {
    renderBreadcrumb(['Home', 'AWS']);

    // "AWS" is last here, so check the non-last "Home" link for correct resolution.
    const homeLink = await screen.findByRole('link', { name: '🏠 Home' });
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders the last item with no link and aria-current="page"', async () => {
    renderBreadcrumb(['Home', 'AWS']);

    const current = await screen.findByText('☁️ AWS');
    expect(current.tagName).not.toBe('A');
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('falls back to plain text for an unrecognized key', async () => {
    renderBreadcrumb(['Home', 'Some Page-Specific Title']);

    const current = await screen.findByText('Some Page-Specific Title');
    // No emoji prefix, no href — this key has no navigation-url.json entry.
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.tagName).not.toBe('A');
  });

  it('renders nothing until keys resolve, then renders once resolved', async () => {
    const { container } = render(
      <MemoryRouter>
        <Breadcrumb keys={['Home']} showPageHeader={false} />
      </MemoryRouter>,
    );
    // Resolution is async (awaits a fetch); assert it eventually appears
    // rather than assuming a synchronous render.
    await waitFor(() => expect(container.querySelector('nav.breadcrumb')).toBeInTheDocument());
  });

  /**
   * Coverage added for sprint-tickets-feature-audit.md Part B's T3-1
   * gap: navigation.js's "← Back" link is a SEPARATE element from the
   * breadcrumb trail (its own <header class="page-header">, built by
   * _renderPageHeader(), not folded into <nav class="breadcrumb">).
   * showPageHeader defaults to true and every page already renders it —
   * this was a real, confirmed test gap (every existing test above
   * passes showPageHeader={false}), not a missing feature.
   */
  describe('page header / back button (showPageHeader default true)', () => {
    it('renders the page header as a separate element from the breadcrumb nav', async () => {
      render(
        <MemoryRouter>
          <Breadcrumb keys={['Home', 'AWS']} />
        </MemoryRouter>,
      );

      await screen.findByRole('navigation', { name: 'Breadcrumb' });
      const header = document.querySelector('header.page-header');
      expect(header).not.toBeNull();
      expect(header).not.toBe(document.querySelector('nav.breadcrumb'));
    });

    it('back link targets the second-to-last item (the parent), not the current page', async () => {
      render(
        <MemoryRouter>
          <Breadcrumb keys={['Home', 'AWS']} />
        </MemoryRouter>,
      );

      const backLink = await screen.findByRole('link', { name: '← Back' });
      expect(backLink).toHaveAttribute('href', '/');
    });

    it('renders the current page title as an <h1>', async () => {
      render(
        <MemoryRouter>
          <Breadcrumb keys={['Home', 'AWS']} />
        </MemoryRouter>,
      );

      const heading = await screen.findByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('☁️ AWS');
    });

    it('renders no back link when there is only one breadcrumb item', async () => {
      render(
        <MemoryRouter>
          <Breadcrumb keys={['Home']} />
        </MemoryRouter>,
      );

      await screen.findByRole('heading', { level: 1 });
      expect(screen.queryByRole('link', { name: '← Back' })).not.toBeInTheDocument();
    });
  });
});
