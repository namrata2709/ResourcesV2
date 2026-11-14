import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RecentlyViewed } from './RecentlyViewed';

/**
 * RecentlyViewed.test.tsx
 *
 * Covers recently-viewed.js's real, uploaded contract:
 *   - only `{ v: 1, timestamp }`-shaped readingProgress-folder-* entries
 *     count; malformed/legacy ones are skipped
 *   - most-recent-first ordering, capped at `max`
 *   - a folder with no matching notes-index.json entry is dropped
 *     silently, not shown broken
 *   - renders nothing at all when there's nothing to show
 */

const FIXTURE_NOTES = {
  notes: [
    { title: 'EC2 Basics', folder: 'ec2-basics', subject: 'aws', files: [{ name: 'Notes', file: 'notes.md', type: 'notes', icon: '' }] },
    { title: 'S3 Deep Dive', folder: 's3-deep-dive', subject: 'aws', files: [{ name: 'Notes', file: 'notes.md', type: 'notes', icon: '' }] },
    { title: 'External Ref', folder: 'external-ref', subject: 'aws', files: [{ name: 'Docs', file: 'https://example.com/doc', type: 'link', icon: '' }] },
  ],
};

const FIXTURE_QUIZZES = {
  Quizzes: [
    { title: 'Networking Quiz', file: 'networking-quiz', topic: 'Networking' },
  ],
};

function mockNotesFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => FIXTURE_NOTES }),
  );
}

function mockNotesAndQuizFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('quiz-index.json')) {
        return Promise.resolve({ ok: true, json: async () => FIXTURE_QUIZZES });
      }
      return Promise.resolve({ ok: true, json: async () => FIXTURE_NOTES });
    }),
  );
}

function renderRecentlyViewed(props = {}) {
  return render(
    <MemoryRouter>
      <RecentlyViewed {...props} />
    </MemoryRouter>,
  );
}

describe('RecentlyViewed', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders nothing when localStorage has no readingProgress entries', () => {
    mockNotesFetch();
    const { container } = renderRecentlyViewed();
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for malformed entries (missing v or timestamp)', async () => {
    localStorage.setItem('readingProgress-folder-ec2-basics', JSON.stringify({ percent: 50 })); // no v/timestamp
    mockNotesFetch();
    const { container } = renderRecentlyViewed();
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('renders items most-recent-first, cross-referenced with notes-index.json', async () => {
    localStorage.setItem('readingProgress-folder-ec2-basics', JSON.stringify({ v: 1, timestamp: 1000 }));
    localStorage.setItem('readingProgress-folder-s3-deep-dive', JSON.stringify({ v: 1, timestamp: 2000 }));
    mockNotesFetch();
    renderRecentlyViewed();

    const links = await screen.findAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['S3 Deep Dive', 'EC2 Basics']);
  });

  it('drops a folder with no matching notes-index.json entry', async () => {
    localStorage.setItem('readingProgress-folder-ec2-basics', JSON.stringify({ v: 1, timestamp: 1000 }));
    localStorage.setItem('readingProgress-folder-ghost-folder', JSON.stringify({ v: 1, timestamp: 2000 }));
    mockNotesFetch();
    renderRecentlyViewed();

    const links = await screen.findAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent('EC2 Basics');
  });

  it('caps results at max', async () => {
    localStorage.setItem('readingProgress-folder-ec2-basics', JSON.stringify({ v: 1, timestamp: 1000 }));
    localStorage.setItem('readingProgress-folder-s3-deep-dive', JSON.stringify({ v: 1, timestamp: 2000 }));
    mockNotesFetch();
    renderRecentlyViewed({ max: 1 });

    const links = await screen.findAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent('S3 Deep Dive');
  });

  it('uses a plain <a> for a resolved file link, not a client-side Link', async () => {
    localStorage.setItem('readingProgress-folder-ec2-basics', JSON.stringify({ v: 1, timestamp: 1000 }));
    mockNotesFetch();
    renderRecentlyViewed();

    const link = await screen.findByRole('link', { name: 'EC2 Basics' });
    expect(link).toHaveAttribute('href', '/data/notes/ec2-basics/notes.md');
  });

  it("uses the file's own URL as-is for a link-type file (no /data/notes/ prefix)", async () => {
    localStorage.setItem('readingProgress-folder-external-ref', JSON.stringify({ v: 1, timestamp: 1000 }));
    mockNotesFetch();
    renderRecentlyViewed();

    const link = await screen.findByRole('link', { name: 'External Ref' });
    expect(link).toHaveAttribute('href', 'https://example.com/doc');
  });

  it('omits the heading when headingText is empty', async () => {
    localStorage.setItem('readingProgress-folder-ec2-basics', JSON.stringify({ v: 1, timestamp: 1000 }));
    mockNotesFetch();
    renderRecentlyViewed({ headingText: '' });

    await screen.findByRole('link', { name: 'EC2 Basics' });
    expect(screen.queryByText('Recently Viewed')).not.toBeInTheDocument();
  });

  describe('P0-5: quizzes interleaved into Recently Viewed', () => {
    it('interleaves a quiz alongside notes, most-recent-first, cross-referenced with quiz-index.json', async () => {
      localStorage.setItem('readingProgress-folder-ec2-basics', JSON.stringify({ v: 1, timestamp: 1000 }));
      localStorage.setItem('readingProgress-quiz-networking-quiz', JSON.stringify({ v: 1, timestamp: 2000 }));
      mockNotesAndQuizFetch();
      renderRecentlyViewed();

      const links = await screen.findAllByRole('link');
      expect(links.map((l) => l.textContent)).toEqual(['Networking Quiz', 'EC2 Basics']);
    });

    it('links a quiz via the real /quiz/:quizId React route', async () => {
      localStorage.setItem('readingProgress-quiz-networking-quiz', JSON.stringify({ v: 1, timestamp: 1000 }));
      mockNotesAndQuizFetch();
      renderRecentlyViewed();

      const link = await screen.findByRole('link', { name: 'Networking Quiz' });
      expect(link).toHaveAttribute('href', '/quiz/networking-quiz');
    });

    it('drops a quiz with no matching quiz-index.json entry, same as an unmatched note', async () => {
      localStorage.setItem('readingProgress-quiz-networking-quiz', JSON.stringify({ v: 1, timestamp: 2000 }));
      localStorage.setItem('readingProgress-quiz-ghost-quiz', JSON.stringify({ v: 1, timestamp: 3000 }));
      mockNotesAndQuizFetch();
      renderRecentlyViewed();

      const links = await screen.findAllByRole('link');
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveTextContent('Networking Quiz');
    });

    it('does not fetch quiz-index.json when there are no quiz entries to resolve', async () => {
      localStorage.setItem('readingProgress-folder-ec2-basics', JSON.stringify({ v: 1, timestamp: 1000 }));
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => FIXTURE_NOTES });
      vi.stubGlobal('fetch', fetchSpy);
      renderRecentlyViewed();

      await screen.findByRole('link', { name: 'EC2 Basics' });
      const quizCalls = fetchSpy.mock.calls.filter((c) => String(c[0]).includes('quiz-index.json'));
      expect(quizCalls).toHaveLength(0);
    });

    it('caps the merged notes+quizzes list at max overall', async () => {
      localStorage.setItem('readingProgress-folder-ec2-basics', JSON.stringify({ v: 1, timestamp: 1000 }));
      localStorage.setItem('readingProgress-quiz-networking-quiz', JSON.stringify({ v: 1, timestamp: 2000 }));
      mockNotesAndQuizFetch();
      renderRecentlyViewed({ max: 1 });

      const links = await screen.findAllByRole('link');
      expect(links).toHaveLength(1);
      expect(links[0]).toHaveTextContent('Networking Quiz');
    });
  });
});
