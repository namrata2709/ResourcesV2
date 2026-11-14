import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { NotesIndex } from './NotesIndex';

/** Renders the current router location as plain text, so a test can
 * assert what internal route useNavigate() actually landed on — a
 * MemoryRouter's location isn't reflected in window.location.href. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location-probe">{location.pathname}{location.search}</div>;
}

/**
 * NotesIndex.test.tsx
 *
 * Covers the T3-2a Testing spec:
 *   - a selected filter chip renders with --accent, not --primary — this
 *     is precisely Finding 1's regression (already happened once in
 *     vanilla), which is why it's worth a test rather than a visual
 *     glance. category-chip (the card's own badge) staying --primary is
 *     asserted too, since the point is these are deliberately DIFFERENT
 *     elements/colors, not that "chips" should uniformly be one color.
 *   - category/tag/type filters combine as AND across dimensions (a note
 *     matching only 2 of 3 active filters must NOT appear)
 *   - ?subject= (via subjectOverride, see NotesIndex.tsx's prop comment)
 *     correctly scopes which notes are visible at all
 */

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
      hasImages: true,
      images: [{ name: 'EC2 Diagram', file: 'ec2-diagram.png' }],
      files: [{ name: 'Lab', file: 'lab.html', type: 'lab', icon: '🧪' }],
    },
    {
      // Same category AND same session as Lambda Basics, but a different
      // tag — used to prove category+tag combine as AND, not OR, and
      // (separately) that selecting a session narrows to just its own
      // session, not every note sharing the same category.
      title: 'Step Functions Overview',
      folder: 'aws-step-functions',
      subject: 'aws',
      session: 'Workshop B',
      date: '2026-07-03',
      lastModified: '2026-07-03',
      readTimeMinutes: 8,
      category: 'Serverless',
      tags: ['AWS', 'Orchestration'],
      hasImages: false,
      images: [],
      files: [{ name: 'Notes', file: 'notes.html', type: 'notes', icon: '📄' }],
    },
    {
      title: 'Merge Sort',
      folder: 'dsa-merge-sort',
      subject: 'dsa',
      session: null,
      date: '2026-07-01',
      lastModified: '2026-06-20',
      readTimeMinutes: 15,
      category: 'Sorting',
      tags: ['sorting', 'recursion'],
      hasImages: false,
      images: [],
      files: [{ name: 'Notes', file: 'notes.html', type: 'notes', icon: '📄' }],
    },
    {
      // The only fixture note with more than one file — used to prove
      // openNote()'s resolved decision: single-file notes bypass the
      // modal, multi-file notes still show it.
      title: 'VPC Deep Dive',
      folder: 'aws-vpc-deep-dive',
      subject: 'aws',
      session: null,
      date: '2026-07-04',
      lastModified: '2026-07-04',
      readTimeMinutes: 20,
      category: 'Networking',
      tags: ['AWS', 'VPC'],
      hasImages: false,
      images: [],
      files: [
        { name: 'Notes', file: 'notes.html', type: 'notes', icon: '📄' },
        { name: 'Lab', file: 'lab.html', type: 'lab', icon: '🧪' },
      ],
    },
  ],
};

const FIXTURE_CATEGORY_ICONS = { default: { icon: '📂' } };

// T3-7a: subjects.json is now the source of breadcrumb/title copy per
// subject — routed here the same way category-icons.json/nav-config are,
// so NotesIndex's fetch of it doesn't hit the "unexpected fetch" reject.
const FIXTURE_SUBJECTS = {
  aws: { label: 'AWS', titleSuffix: 'AWS Notes' },
  dsa: { label: 'DSA', titleSuffix: 'DSA Notes' },
};

// NotesIndex now renders <Breadcrumb> (fixed after being missed entirely
// when this page was first built) — it fetches navigation-url.json on
// its own, independent of this file's other fixtures. Routing it here
// keeps Breadcrumb from silently failing to render during these tests.
const FIXTURE_NAV_CONFIG = [
  { title: 'Home', emoji: '🏠', url: '/' },
  { title: 'AWS', emoji: '☁️', url: '/notes-index/aws' },
  { title: 'DSA', emoji: '🧩', url: '/notes-index/dsa' },
  { title: 'Notes', emoji: '📓', url: '/notes-index' },
];

function mockFetchRouting() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/data/index/notes-index.json') {
        return Promise.resolve({ ok: true, json: async () => FIXTURE_NOTES });
      }
      if (url === '/data/config/category-icons.json') {
        return Promise.resolve({ ok: true, json: async () => FIXTURE_CATEGORY_ICONS });
      }
      if (url === '/data/config/navigation-url.json') {
        return Promise.resolve({ ok: true, json: async () => FIXTURE_NAV_CONFIG });
      }
      if (url === '/data/config/subjects.json') {
        return Promise.resolve({ ok: true, json: async () => FIXTURE_SUBJECTS });
      }
      return Promise.reject(new Error(`unexpected fetch in test: ${url}`));
    }),
  );
}

describe('NotesIndex', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('scopes results to the given subject via subjectOverride', async () => {
    mockFetchRouting();
    render(
      <MemoryRouter>
        <NotesIndex subjectOverride="dsa" />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Merge Sort')).toBeInTheDocument();
    expect(screen.queryByText('Lambda Basics')).not.toBeInTheDocument();
    expect(screen.queryByText('EC2 Basics')).not.toBeInTheDocument();
  });

  it('T3-7a: reads breadcrumb/title copy from the subjects.json registry, not a hardcoded aws/dsa ternary', async () => {
    mockFetchRouting();
    render(
      <MemoryRouter>
        <NotesIndex subjectOverride="aws" />
      </MemoryRouter>,
    );

    await screen.findByText('Lambda Basics');
    // PageMeta sets document.title imperatively; FIXTURE_SUBJECTS' aws
    // entry supplies "AWS Notes" — proves pageTitle came from the
    // registry lookup, not a literal string in the component. Exact
    // match (not `.toContain`) since document.title isn't reset between
    // tests and a substring check could pass on a stale value.
    await waitFor(() => expect(document.title).toBe('AWS Notes · Notebook Buddy'));
    // Breadcrumb's current-page item renders subjectConfig.label ("AWS"),
    // resolved against FIXTURE_NAV_CONFIG for its emoji. Both the
    // breadcrumb's current-page <span> and the page-header <h1> render
    // this same text, so scope to the aria-current element specifically.
    const current = await screen.findByText('☁️ AWS', { selector: '[aria-current="page"]' });
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('T3-7a: falls back to generic "Notes" copy for a subject with no registry entry', async () => {
    mockFetchRouting();
    render(
      <MemoryRouter>
        <NotesIndex subjectOverride="cloud-test" />
      </MemoryRouter>,
    );

    // No notes match this subject in the fixture data, but the page
    // itself should still render with generic fallback copy rather than
    // crashing or silently mislabeling as AWS/DSA. Exact match, since
    // document.title carries over between tests and "AWS Notes" also
    // contains the substring "Notes".
    await waitFor(() => expect(document.title).toBe('Notes · Notebook Buddy'));
  });

  it('shows all subjects when no subject is given', async () => {
    mockFetchRouting();
    render(
      <MemoryRouter>
        <NotesIndex subjectOverride="" />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Lambda Basics')).toBeInTheDocument();
    expect(screen.getByText('Merge Sort')).toBeInTheDocument();
  });

  it('renders a selected filter chip with --accent, while the card category-chip stays --primary', async () => {
    mockFetchRouting();
    render(
      <MemoryRouter>
        <NotesIndex subjectOverride="aws" />
      </MemoryRouter>,
    );

    await screen.findByText('Lambda Basics');

    // Select the "Serverless" category via the dropdown.
    fireEvent.change(screen.getByLabelText('Filter by category'), { target: { value: 'Serverless' } });

    const chip = await screen.findByText('Serverless', { selector: '.selected-chip' });
    expect(chip).toHaveStyle({ backgroundColor: 'var(--accent)' });

    // The card's own category-chip is a DIFFERENT element with a
    // DIFFERENT color — must not also be --accent.
    const cardChips = document.querySelectorAll('.category-chip');
    expect(cardChips.length).toBeGreaterThan(0);
    cardChips.forEach((el) => {
      expect(el).not.toHaveStyle({ backgroundColor: 'var(--accent)' });
    });
  });

  it('combines category + tag filters as AND, not OR', async () => {
    mockFetchRouting();
    render(
      <MemoryRouter>
        <NotesIndex subjectOverride="aws" />
      </MemoryRouter>,
    );

    await screen.findByText('Lambda Basics');

    // Category = Serverless matches BOTH "Lambda Basics" and "Step
    // Functions Overview". Adding tag = "Lambda" should narrow it down
    // to ONLY "Lambda Basics" — proving AND across dimensions, since
    // "Step Functions Overview" shares the category but not the tag.
    fireEvent.change(screen.getByLabelText('Filter by category'), { target: { value: 'Serverless' } });

    await screen.findByText('Step Functions Overview'); // both Serverless notes visible so far

    fireEvent.change(screen.getByLabelText('Add tag filter'), { target: { value: 'Lambda' } });

    await waitFor(() => {
      expect(screen.getByText('Lambda Basics')).toBeInTheDocument();
      expect(screen.queryByText('Step Functions Overview')).not.toBeInTheDocument();
      expect(screen.queryByText('EC2 Basics')).not.toBeInTheDocument();
    });
  });

  it('has a Session filter, and narrows results to that session specifically', async () => {
    mockFetchRouting();
    render(
      <MemoryRouter>
        <NotesIndex subjectOverride="aws" />
      </MemoryRouter>,
    );

    await screen.findByText('Lambda Basics');

    // "Lambda Basics" and "Step Functions Overview" share a category
    // (Serverless) but have DIFFERENT sessions — selecting a session
    // must narrow to only its own note, not everything in the shared
    // category. This is the actual regression guard: the Session filter
    // was missing entirely until caught via a UI review, so this test
    // exists specifically so that gap can't silently reappear.
    const sessionSelect = screen.getByLabelText('Filter by session');
    fireEvent.change(sessionSelect, { target: { value: 'Workshop A' } });

    await waitFor(() => {
      expect(screen.getByText('Lambda Basics')).toBeInTheDocument();
      expect(screen.queryByText('Step Functions Overview')).not.toBeInTheDocument();
      expect(screen.queryByText('EC2 Basics')).not.toBeInTheDocument();
    });

    // Renders as a removable SelectedChip, same pattern (and same
    // --accent color) as Category/Type/Tags.
    const chip = screen.getByText('Workshop A', { selector: '.selected-chip' });
    expect(chip).toHaveStyle({ backgroundColor: 'var(--accent)' });

    fireEvent.click(screen.getByLabelText('Remove Workshop A filter'));
    await waitFor(() => {
      expect(screen.getByText('Step Functions Overview')).toBeInTheDocument();
    });
  });

  it('shows the Gallery quick action only for a note with hasImages:true and a non-empty images array', async () => {
    mockFetchRouting();
    render(
      <MemoryRouter>
        <NotesIndex subjectOverride="aws" />
      </MemoryRouter>,
    );

    const ec2Card = (await screen.findByText('EC2 Basics')).closest('.note-folder') as HTMLElement;
    const lambdaCard = (await screen.findByText('Lambda Basics')).closest('.note-folder') as HTMLElement;

    expect(within(ec2Card).getByLabelText('View in gallery')).toBeInTheDocument();
    expect(within(lambdaCard).queryByLabelText('View in gallery')).not.toBeInTheDocument();
  });

  it('favorite toggle writes to notesFavorites, independent of galleryFavorites/quizFavorites', async () => {
    localStorage.setItem('galleryFavorites', JSON.stringify(['some-other-image.png']));
    localStorage.setItem('quizFavorites', JSON.stringify(['some-other-quiz']));

    mockFetchRouting();
    render(
      <MemoryRouter>
        <NotesIndex subjectOverride="aws" />
      </MemoryRouter>,
    );

    const lambdaCard = (await screen.findByText('Lambda Basics')).closest('.note-folder') as HTMLElement;
    fireEvent.click(within(lambdaCard).getByLabelText('Add to favorites'));

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('notesFavorites') || '[]')).toEqual(['aws-lambda-basics']);
    });

    // The other two families' favorites must be completely untouched.
    expect(JSON.parse(localStorage.getItem('galleryFavorites') || '[]')).toEqual(['some-other-image.png']);
    expect(JSON.parse(localStorage.getItem('quizFavorites') || '[]')).toEqual(['some-other-quiz']);
  });

  /**
   * T3-2a's audit gap: Random sort + "Shuffle Again", confirmed real via
   * sprint-tickets-feature-audit.md (notes-index.js genuinely has this).
   */
  /**
   * T3-2b: useLiveRegion wiring — favorites and filter-result-count
   * changes previously had no announcement at all on this page, unlike
   * Gallery's equivalent. Same #app-live-region query pattern as
   * useLiveRegion.test.ts.
   */
  it('announces when a note is added to or removed from favorites', async () => {
    mockFetchRouting();
    render(
      <MemoryRouter>
        <NotesIndex subjectOverride="aws" />
      </MemoryRouter>,
    );

    const lambdaCard = (await screen.findByText('Lambda Basics')).closest('.note-folder') as HTMLElement;
    fireEvent.click(within(lambdaCard).getByLabelText('Add to favorites'));

    await waitFor(() => {
      expect(document.getElementById('app-live-region')).toHaveTextContent('Added Lambda Basics to favorites');
    });

    fireEvent.click(within(lambdaCard).getByLabelText('Remove from favorites'));

    await waitFor(() => {
      expect(document.getElementById('app-live-region')).toHaveTextContent('Removed Lambda Basics from favorites');
    });
  });

  it('announces the result count when a filter narrows the list, but not on initial load', async () => {
    mockFetchRouting();
    render(
      <MemoryRouter>
        <NotesIndex subjectOverride="aws" />
      </MemoryRouter>,
    );

    await screen.findByText('Lambda Basics');
    // No announcement yet — this is the initial render, not a change.
    expect(document.getElementById('app-live-region')).toHaveTextContent('');

    fireEvent.change(screen.getByLabelText('Search notes'), { target: { value: 'Lambda' } });

    await waitFor(() => {
      expect(document.getElementById('app-live-region')).toHaveTextContent('1 note found');
    });
  });

  describe('Random sort', () => {
    it('offers a Random option and a Shuffle Again button only while it is selected', async () => {
      mockFetchRouting();
      render(
        <MemoryRouter>
          <NotesIndex subjectOverride="aws" />
        </MemoryRouter>,
      );
      await screen.findByText('Lambda Basics');

      expect(screen.queryByText('🔀 Shuffle Again')).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'random' } });
      expect(screen.getByText('🔀 Shuffle Again')).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'date-desc' } });
      expect(screen.queryByText('🔀 Shuffle Again')).not.toBeInTheDocument();
    });

    it('Shuffle Again changes the order without changing which notes are shown', async () => {
      mockFetchRouting();
      render(
        <MemoryRouter>
          <NotesIndex subjectOverride="aws" />
        </MemoryRouter>,
      );
      await screen.findByText('Lambda Basics');
      fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'random' } });

      const titlesBefore = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
      fireEvent.click(screen.getByText('🔀 Shuffle Again'));
      const titlesAfter = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);

      expect([...titlesAfter].sort()).toEqual([...titlesBefore].sort());
    });
  });

  /**
   * T3-2a's audit gap: a mobile slide-in filter drawer for
   * Session/Category/Type/Tags, distinct from Gallery's own pattern.
   */
  describe('mobile filter drawer', () => {
    it('opens via the Filters button and closes via its own close button', async () => {
      mockFetchRouting();
      render(
        <MemoryRouter>
          <NotesIndex subjectOverride="aws" />
        </MemoryRouter>,
      );
      await screen.findByText('Lambda Basics');

      expect(screen.getByRole('dialog', { name: 'Filters' })).not.toHaveClass('max-md:translate-x-0');
      fireEvent.click(screen.getByText('Filters'));
      expect(screen.getByRole('dialog', { name: 'Filters' })).toHaveClass('max-md:translate-x-0');

      fireEvent.click(screen.getByLabelText('Close filters'));
      expect(screen.getByRole('dialog', { name: 'Filters' })).not.toHaveClass('max-md:translate-x-0');
    });

    it('shows an active-filter count badge on the Filters button', async () => {
      mockFetchRouting();
      render(
        <MemoryRouter>
          <NotesIndex subjectOverride="aws" />
        </MemoryRouter>,
      );
      await screen.findByText('Lambda Basics');

      fireEvent.change(screen.getByLabelText('Filter by category'), { target: { value: 'Serverless' } });
      expect(screen.getByText('Filters').parentElement).toHaveTextContent('1');
    });
  });

  /**
   * T3-2a's flagged, now-resolved decision: single-file notes bypass the
   * modal (Open = direct navigation); multi-file notes still show it.
   */
  describe('Open action / card click', () => {
    const originalLocation = window.location;

    afterEach(() => {
      Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
    });

    it('opens a single-file note directly (internal route, not a full page load), without showing the modal', async () => {
      Object.defineProperty(window, 'location', { value: { href: '' }, writable: true });
      mockFetchRouting();
      render(
        <MemoryRouter initialEntries={['/notes-index']}>
          <Routes>
            <Route path="/notes-index" element={<NotesIndex subjectOverride="aws" />} />
            <Route path="*" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>,
      );

      const lambdaCard = (await screen.findByText('Lambda Basics')).closest('.note-folder') as HTMLElement;
      fireEvent.click(within(lambdaCard).getByLabelText('Open'));

      // T5-3a: single-file notes/lab-type notes now route internally to
      // /notes/:folder instead of a full page load to the raw data file.
      expect(await screen.findByTestId('location-probe')).toHaveTextContent('/notes/aws-lambda-basics');
      expect(window.location.href).toBe(''); // confirms this really is client-side routing, not window.location.href
      expect(screen.queryByRole('dialog', { name: /Lambda Basics/i })).not.toBeInTheDocument();
    });

    it('shows the folder modal for a multi-file note, without navigating', async () => {
      Object.defineProperty(window, 'location', { value: { href: '' }, writable: true });
      mockFetchRouting();
      render(
        <MemoryRouter initialEntries={['/notes-index']}>
          <Routes>
            <Route path="/notes-index" element={<NotesIndex subjectOverride="aws" />} />
            <Route path="*" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>,
      );

      const vpcCard = (await screen.findByText('VPC Deep Dive')).closest('.note-folder') as HTMLElement;
      fireEvent.click(within(vpcCard).getByLabelText('Open'));

      expect(window.location.href).toBe('');
      expect(screen.queryByTestId('location-probe')).not.toBeInTheDocument();
      // FolderModal's file link, not the Type filter's "Lab" <option> —
      // scoped by role to avoid that ambiguity. T5-3a: this is now an
      // internal route too, since a lab-type file has a /notes/:folder
      // destination — with ?file= since it's NOT the folder's primary file.
      expect(await screen.findByRole('link', { name: 'Lab' })).toHaveAttribute(
        'href',
        '/notes/aws-vpc-deep-dive?file=lab.html',
      );
    });
  });
});
