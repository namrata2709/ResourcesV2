import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PopularNotes } from './PopularNotes';

/**
 * PopularNotes.test.tsx (B-6)
 *
 * Covers popular-notes.json's real, generated contract (see
 * generate_popular_notes.py): a flat, already-resolved list of
 * { folder, title, subject, category, url, internal } entries, no
 * localStorage/cross-referencing involved on this side.
 */

const FIXTURE_POPULAR = {
  notes: [
    { folder: 'merge-sort', title: 'Merge Sort', subject: 'dsa', category: 'Sorting', url: '/notes/merge-sort', internal: true },
    { folder: 'openclaw', title: 'Openclaw Agents', subject: 'aws', category: 'Machine Learning', url: '/notes/openclaw', internal: true },
    { folder: 'external-ref', title: 'External Ref', subject: 'aws', category: 'General', url: 'https://example.com/doc', internal: false },
  ],
};

function mockFetch(data: unknown = FIXTURE_POPULAR, ok = true) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, status: ok ? 200 : 500, json: async () => data }));
}

function renderPopularNotes(props = {}) {
  return render(
    <MemoryRouter>
      <PopularNotes {...props} />
    </MemoryRouter>,
  );
}

describe('PopularNotes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders nothing while loading (no flash of empty state)', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {}))); // never resolves
    const { container } = renderPopularNotes();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders entries from popular-notes.json, in file order', async () => {
    mockFetch();
    renderPopularNotes();

    const links = await screen.findAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['Merge Sort', 'Openclaw Agents', 'External Ref']);
  });

  it('renders an internal entry as a client-side Link', async () => {
    mockFetch();
    renderPopularNotes();

    const link = await screen.findByRole('link', { name: 'Merge Sort' });
    expect(link).toHaveAttribute('href', '/notes/merge-sort');
  });

  it('renders a non-internal entry as a plain <a>, unprefixed', async () => {
    mockFetch();
    renderPopularNotes();

    const link = await screen.findByRole('link', { name: 'External Ref' });
    expect(link).toHaveAttribute('href', 'https://example.com/doc');
  });

  it('shows each entry\'s category', async () => {
    mockFetch();
    renderPopularNotes();

    await screen.findByRole('link', { name: 'Merge Sort' });
    expect(screen.getByText('Sorting')).toBeInTheDocument();
    expect(screen.getByText('Machine Learning')).toBeInTheDocument();
  });

  it('renders nothing when popular-notes.json has an empty notes array', async () => {
    mockFetch({ notes: [] });
    const { container } = renderPopularNotes();

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('renders nothing when the fetch fails', async () => {
    mockFetch(undefined, false);
    const { container } = renderPopularNotes();

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('renders nothing when fetch rejects outright', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const { container } = renderPopularNotes();

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('omits the heading when headingText is empty', async () => {
    mockFetch();
    renderPopularNotes({ headingText: '' });

    await screen.findByRole('link', { name: 'Merge Sort' });
    expect(screen.queryByText('Popular Notes')).not.toBeInTheDocument();
  });

  it('uses a custom headingText when provided', async () => {
    mockFetch();
    renderPopularNotes({ headingText: 'You might also like' });

    expect(await screen.findByText('You might also like')).toBeInTheDocument();
  });
});
