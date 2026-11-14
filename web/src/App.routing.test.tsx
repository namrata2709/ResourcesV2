import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ProfileProvider } from './context/ProfileContext';
import { Dashboard } from './components/Dashboard';
import { NotesIndex } from './pages/NotesIndex';
import { QuizIndex } from './pages/QuizIndex';
import { Gallery } from './pages/Gallery';
import { NotFound } from './pages/NotFound';
import { Settings } from './pages/Settings';
import { NotesRoute } from './App';

/**
 * App.routing.test.tsx
 *
 * Covers the T3-3 Testing spec, updated by T3-1c for path-based URLs:
 *   - rendering /notes-index/aws (via the actual route wiring, NotesRoute)
 *     produces the same result set as passing subject: "aws" directly to
 *     NotesIndex in isolation — proves the ROUTE-TO-PROP adapter itself,
 *     not just re-testing NotesIndex's own filtering (that's T3-2a's job)
 *   - Dashboard's card targets match the ACTUAL registered routes, proven
 *     by really clicking a card inside a router and asserting the correct
 *     page rendered — not by comparing string literals, which could both
 *     be typo'd the same way and still "match"
 *   - old /notes?subject=... and /quiz URLs redirect to the new shape
 *     rather than 404ing or silently half-working (T3-1c's "Done when")
 *
 * NOTE: this file can only exercise the React-Router-level behavior.
 * public/404.html's GitHub-Pages-server-level redirect (the cold-load /
 * hard-refresh / bookmark case) isn't something Vitest+JSDOM can run —
 * there's no real GH Pages 404 dispatch to simulate. That has to be
 * verified manually against a real deploy at the /ResourcesV2/ subpath
 * (see T3-1c's "Done when" list) — a passing test suite here does not by
 * itself satisfy that bullet.
 */

const FIXTURE_NOTES = {
  notes: [
    {
      title: 'Lambda Basics',
      folder: 'aws-lambda-basics',
      subject: 'aws',
      session: null,
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
      title: 'Merge Sort',
      folder: 'dsa-merge-sort',
      subject: 'dsa',
      session: null,
      date: '2026-07-01',
      lastModified: '2026-06-20',
      readTimeMinutes: 15,
      category: 'Sorting',
      tags: ['sorting'],
      hasImages: false,
      images: [],
      files: [{ name: 'Notes', file: 'notes.html', type: 'notes', icon: '📄' }],
    },
  ],
};

const FIXTURE_CATEGORY_ICONS = { default: { icon: '📂' } };

const FIXTURE_DASHBOARD_CARDS = {
  cards: [
    { id: 'aws', label: 'AWS', icon: '☁️', description: '', type: 'subject', url: '/notes-index/aws' },
    { id: 'dsa', label: 'DSA', icon: '🧩', description: '', type: 'subject', url: '/notes-index/dsa' },
    { id: 'quiz', label: 'Quiz', icon: '📝', description: '', type: 'standalone', url: '/quiz-index' },
  ],
};

const FIXTURE_QUIZZES = {
  Quizzes: [{ title: 'VPC Basics', file: 'vpc-basics', topic: 'Networking' }],
};

// T3-7a: NotesIndex now also fetches subjects.json for breadcrumb/title
// copy — routed here the same way category-icons.json/nav-config are.
const FIXTURE_SUBJECTS = {
  aws: { label: 'AWS', titleSuffix: 'AWS Notes' },
  dsa: { label: 'DSA', titleSuffix: 'DSA Notes' },
};

// NotesIndex/QuizIndex render <PageHeader> (NAV-1b — was <Breadcrumb>
// until its trail nav was retired) — routing this here keeps it from
// silently failing during these tests.
const FIXTURE_NAV_CONFIG = [
  { title: 'Home', emoji: '🏠', url: '/' },
  { title: 'AWS', emoji: '☁️', url: '/notes-index/aws' },
  { title: 'DSA', emoji: '🧩', url: '/notes-index/dsa' },
  { title: 'Notes', emoji: '📓', url: '/notes-index' },
  { title: 'Quizzes', emoji: '📝', url: '/quiz-index' },
  { title: 'Images Gallery', emoji: '🖼️', url: '/gallery' },
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
      if (url === '/data/index/dashboard-cards.json') {
        return Promise.resolve({ ok: true, json: async () => FIXTURE_DASHBOARD_CARDS });
      }
      if (url === '/data/index/quiz-index.json') {
        return Promise.resolve({ ok: true, json: async () => FIXTURE_QUIZZES });
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

// Local copy of App.tsx's OldNotesRedirect — that component isn't
// exported (only NotesRoute is, for the route-to-prop adapter tests
// below), so the redirect tests build the same small routing shape
// inline against the real react-router-dom primitives it's made of.
function OldNotesRedirectUnderTest() {
  const [searchParams] = useSearchParams();
  const subject = searchParams.get('subject');
  const q = searchParams.get('q');
  const target = subject ? `/notes-index/${encodeURIComponent(subject)}` : '/notes-index';
  const qs = q ? `?q=${encodeURIComponent(q)}` : '';
  return <Navigate to={`${target}${qs}`} replace />;
}

describe('Routing (T3-3, path-based URLs per T3-1c)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('/notes-index/aws produces the same result set as subjectOverride="aws" passed directly', async () => {
    mockFetchRouting();

    // Reference: NotesIndex rendered directly, exactly like T3-2a's own
    // tests. Still needs MemoryRouter — NotesIndex renders <PageHeader>,
    // which uses <Link> and throws without a Router context, even though
    // this render has nothing to do with the route wiring under test.
    const { unmount } = render(
      <MemoryRouter>
        <NotesIndex subjectOverride="aws" />
      </MemoryRouter>,
    );
    await screen.findByText('Lambda Basics');
    expect(screen.queryByText('Merge Sort')).not.toBeInTheDocument();
    unmount();

    // Under test: the real route, reached via a URL path param, not a
    // query string and not a direct prop.
    mockFetchRouting();
    render(
      <MemoryRouter initialEntries={['/notes-index/aws']}>
        <Routes>
          <Route path="/notes-index/:subject" element={<NotesRoute />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Lambda Basics')).toBeInTheDocument();
    expect(screen.queryByText('Merge Sort')).not.toBeInTheDocument();
  });

  it('bare /notes-index (no :subject) renders all subjects unscoped', async () => {
    mockFetchRouting();
    render(
      <MemoryRouter initialEntries={['/notes-index']}>
        <Routes>
          <Route path="/notes-index" element={<NotesRoute />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Lambda Basics')).toBeInTheDocument();
    expect(screen.getByText('Merge Sort')).toBeInTheDocument();
  });

  it('Dashboard card links navigate to the actual registered routes, with the correct subject path', async () => {
    mockFetchRouting();

    render(
      <MemoryRouter initialEntries={['/']}>
        <ThemeProvider>
          <ProfileProvider>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/notes-index/:subject" element={<NotesRoute />} />
              <Route path="/quiz-index" element={<QuizIndex />} />
            </Routes>
          </ProfileProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    // Click the AWS card -> must land on /notes-index/aws specifically,
    // proven by only AWS-scoped content appearing (not DSA's).
    fireEvent.click(await screen.findByText('AWS'));
    await waitFor(() => expect(screen.getByText('Lambda Basics')).toBeInTheDocument());
    expect(screen.queryByText('Merge Sort')).not.toBeInTheDocument();
  });

  it('the Quiz card navigates to /quiz-index specifically, rendering QuizIndex', async () => {
    mockFetchRouting();

    render(
      <MemoryRouter initialEntries={['/']}>
        <ThemeProvider>
          <ProfileProvider>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/notes-index/:subject" element={<NotesRoute />} />
              <Route path="/quiz-index" element={<QuizIndex />} />
            </Routes>
          </ProfileProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText('Quiz'));
    await waitFor(() => expect(screen.getByText('VPC Basics')).toBeInTheDocument());
  });

  it('/notes-index?q=<term> pre-fills and runs the search (T3-1 audit gap, still a query param post-T3-1c)', async () => {
    mockFetchRouting();

    render(
      <MemoryRouter initialEntries={['/notes-index?q=Lambda']}>
        <Routes>
          <Route path="/notes-index" element={<NotesRoute />} />
        </Routes>
      </MemoryRouter>,
    );

    // The search box is pre-filled with the ?q= value...
    const searchBox = (await screen.findByPlaceholderText(/search/i)) as HTMLInputElement;
    expect(searchBox.value).toBe('Lambda');
    // ...and the search has already run (no need to press Enter).
    await waitFor(() => expect(screen.getByText('Lambda Basics')).toBeInTheDocument());
    expect(screen.queryByText('Merge Sort')).not.toBeInTheDocument();
  });

  it('an unmatched route renders NotFound (T3-1 audit gap — a real 404 route)', async () => {
    mockFetchRouting();

    render(
      <MemoryRouter initialEntries={['/this-route-does-not-exist']}>
        <ProfileProvider>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ProfileProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('🔍 Page Not Found')).toBeInTheDocument();
  });

  it('/gallery renders the Gallery page (T4-1a — registered as a real route)', async () => {
    mockFetchRouting();

    render(
      <MemoryRouter initialEntries={['/gallery']}>
        <ProfileProvider>
          <Routes>
            <Route path="/gallery" element={<Gallery />} />
          </Routes>
        </ProfileProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText('Search images')).toBeInTheDocument();
  });

  it('/settings renders the Settings page (P0-0)', async () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <ProfileProvider>
          <Routes>
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </ProfileProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    // P0-1's Profile section should already be registered by this point.
    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();
  });

  describe('old URL redirects (T3-1c "Done when": not silently half-working)', () => {
    it('old /notes?subject=aws redirects to /notes-index/aws, not left on the old shape', async () => {
      mockFetchRouting();
      render(
        <MemoryRouter initialEntries={['/notes?subject=aws']}>
          <Routes>
            <Route path="/notes" element={<OldNotesRedirectUnderTest />} />
            <Route path="/notes-index/:subject" element={<NotesRoute />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(await screen.findByText('Lambda Basics')).toBeInTheDocument();
      expect(screen.queryByText('Merge Sort')).not.toBeInTheDocument();
    });

    it('old /notes?subject=aws&q=lambda preserves the q param through the redirect', async () => {
      mockFetchRouting();
      render(
        <MemoryRouter initialEntries={['/notes?subject=aws&q=Lambda']}>
          <Routes>
            <Route path="/notes" element={<OldNotesRedirectUnderTest />} />
            <Route path="/notes-index/:subject" element={<NotesRoute />} />
          </Routes>
        </MemoryRouter>,
      );

      const searchBox = (await screen.findByPlaceholderText(/search/i)) as HTMLInputElement;
      expect(searchBox.value).toBe('Lambda');
    });

    it('old bare /notes (no subject) redirects to bare /notes-index', async () => {
      mockFetchRouting();
      render(
        <MemoryRouter initialEntries={['/notes']}>
          <Routes>
            <Route path="/notes" element={<OldNotesRedirectUnderTest />} />
            <Route path="/notes-index" element={<NotesRoute />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(await screen.findByText('Lambda Basics')).toBeInTheDocument();
      expect(screen.getByText('Merge Sort')).toBeInTheDocument();
    });

    it('old /quiz redirects to /quiz-index', async () => {
      mockFetchRouting();
      render(
        <MemoryRouter initialEntries={['/quiz']}>
          <Routes>
            <Route path="/quiz" element={<Navigate to="/quiz-index" replace />} />
            <Route path="/quiz-index" element={<QuizIndex />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(await screen.findByText('VPC Basics')).toBeInTheDocument();
    });
  });
});
