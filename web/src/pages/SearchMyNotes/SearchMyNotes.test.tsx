import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SearchMyNotes } from './SearchMyNotes';
import { highlightsKey, bookmarksKey } from '../../lib/storageKeys';

const FIXTURE_NOTES = {
  notes: [
    {
      title: 'Lambda Basics',
      folder: 'aws-lambda-basics',
      subject: 'aws',
      session: 'Workshop A',
      date: '2026-07-01',
      lastModified: '2026-07-01',
      readTimeMinutes: 10,
      category: 'Serverless',
      tags: ['AWS', 'Lambda'],
      hasImages: false,
      images: [],
      files: [{ name: 'Notes', file: 'notes.html', type: 'notes', icon: '📄' }],
    },
    {
      title: 'EC2 Basics',
      folder: 'aws-ec2-basics',
      subject: 'aws',
      session: null,
      date: '2026-07-02',
      lastModified: '2026-07-02',
      readTimeMinutes: 12,
      category: 'Compute',
      tags: ['AWS', 'EC2'],
      hasImages: false,
      images: [],
      files: [{ name: 'Notes', file: 'notes.html', type: 'notes', icon: '📄' }],
    },
    {
      title: 'Merge Sort',
      folder: 'dsa-merge-sort',
      subject: 'dsa',
      session: null,
      date: '2026-07-03',
      lastModified: '2026-07-03',
      readTimeMinutes: 8,
      category: 'Sorting',
      tags: ['DSA', 'Sorting'],
      hasImages: false,
      images: [],
      files: [{ name: 'Notes', file: 'notes.html', type: 'notes', icon: '📄' }],
    },
  ],
};

function mockFetchRouting() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/data/index/notes-index.json') {
        return Promise.resolve({ ok: true, json: async () => FIXTURE_NOTES });
      }
      if (url === '/data/config/navigation-url.json') {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      return Promise.reject(new Error(`unexpected fetch in test: ${url}`));
    }),
  );
}

describe('SearchMyNotes (P3-1)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('shows the empty state when no note has a highlight or bookmark', async () => {
    mockFetchRouting();
    render(
      <MemoryRouter>
        <SearchMyNotes />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/haven't highlighted or bookmarked/i)).toBeInTheDocument();
    expect(screen.queryByText('Lambda Basics')).not.toBeInTheDocument();
  });

  it('scopes results to only notes with a saved highlight or bookmark', async () => {
    localStorage.setItem(
      highlightsKey('aws-lambda-basics'),
      JSON.stringify([{ id: 'hl-1', blockId: 'b1', text: 'cold starts', createdAt: 1 }]),
    );
    localStorage.setItem(bookmarksKey('dsa-merge-sort'), JSON.stringify(['section-1']));

    mockFetchRouting();
    render(
      <MemoryRouter>
        <SearchMyNotes />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Lambda Basics')).toBeInTheDocument();
    expect(screen.getByText('Merge Sort')).toBeInTheDocument();
    // EC2 Basics has neither a highlight nor a bookmark — must not appear,
    // even though it's a real note in the full index.
    expect(screen.queryByText('EC2 Basics')).not.toBeInTheDocument();
  });

  it('displays highlight and bookmark counts per note', async () => {
    localStorage.setItem(
      highlightsKey('aws-lambda-basics'),
      JSON.stringify([
        { id: 'hl-1', blockId: 'b1', text: 'one', createdAt: 1 },
        { id: 'hl-2', blockId: 'b2', text: 'two', createdAt: 2 },
      ]),
    );

    mockFetchRouting();
    render(
      <MemoryRouter>
        <SearchMyNotes />
      </MemoryRouter>,
    );

    await screen.findByText('Lambda Basics');
    expect(screen.getByText('2 highlights')).toBeInTheDocument();
  });

  it('searches within the scoped set and ranks by the same title/tags/category/session weighting as the main index', async () => {
    localStorage.setItem(
      highlightsKey('aws-lambda-basics'),
      JSON.stringify([{ id: 'hl-1', blockId: 'b1', text: 'x', createdAt: 1 }]),
    );
    localStorage.setItem(bookmarksKey('dsa-merge-sort'), JSON.stringify(['section-1']));

    mockFetchRouting();
    render(
      <MemoryRouter>
        <SearchMyNotes />
      </MemoryRouter>,
    );

    await screen.findByText('Lambda Basics');
    fireEvent.change(screen.getByLabelText('Search my notes'), { target: { value: 'lambda' } });

    await waitFor(() => {
      expect(screen.getByText('Lambda Basics')).toBeInTheDocument();
      expect(screen.queryByText('Merge Sort')).not.toBeInTheDocument();
    });
  });

  it('a query matching nothing in the scoped set shows a no-results message, not the full-library empty state', async () => {
    localStorage.setItem(
      highlightsKey('aws-lambda-basics'),
      JSON.stringify([{ id: 'hl-1', blockId: 'b1', text: 'x', createdAt: 1 }]),
    );

    mockFetchRouting();
    render(
      <MemoryRouter>
        <SearchMyNotes />
      </MemoryRouter>,
    );

    await screen.findByText('Lambda Basics');
    fireEvent.change(screen.getByLabelText('Search my notes'), { target: { value: 'zzzznotarealterm' } });

    await waitFor(() => {
      expect(screen.queryByText('Lambda Basics')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/No highlighted or bookmarked notes match/)).toBeInTheDocument();
  });

  it('re-scans when a highlight/bookmark storage key changes in another tab', async () => {
    mockFetchRouting();
    render(
      <MemoryRouter>
        <SearchMyNotes />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/haven't highlighted or bookmarked/i)).toBeInTheDocument();

    localStorage.setItem(bookmarksKey('aws-ec2-basics'), JSON.stringify(['section-1']));
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: bookmarksKey('aws-ec2-basics'), newValue: '["section-1"]' }),
      );
    });

    expect(await screen.findByText('EC2 Basics')).toBeInTheDocument();
  });
});
