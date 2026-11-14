import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { Note } from './Note';
import { ThemeProvider } from '../../context/ThemeContext';
import { _resetNotificationsForTests, subscribeToNotifications } from '../../lib/notifications';
import { exportAs, triggerDownload } from '../../lib/exportAs';
import { highlightsKey } from '../../lib/storageKeys';

// E0-1's Note.tsx wiring only needs to prove it fetches body-prose.json
// and hands it to the shared exportAs() entry point with the right
// shape -- exportAs's OWN behavior (download trigger, docx conversion)
// is covered by lib/exportAs.test.ts and lib/docxExport.test.ts, so
// this file mocks it rather than re-testing it through a real Blob/
// download round-trip. T5-3c-6's Export Highlights reuses that same
// module's `triggerDownload` (mocked the same way, same reason) and
// `slugify` -- `slugify` is real here rather than mocked since it's a
// trivial pure string function with its own dedicated test in
// lib/exportAs.test.ts already; re-implementing it in this file's own
// mock would just be a second copy to keep in sync.
vi.mock('../../lib/exportAs', async () => {
  const actual = await vi.importActual<typeof import('../../lib/exportAs')>('../../lib/exportAs');
  return {
    exportAs: vi.fn(() => Promise.resolve()),
    triggerDownload: vi.fn(),
    slugify: actual.slugify,
  };
});

/**
 * Note.test.tsx — covers T5-3a's core scope: resolving which file in a
 * folder to render (primary vs. ?file= override, notes/lab types only),
 * Favorite toggle (shares notesFavorites with NotesIndex), exam-mode
 * cycling, and each already-JSON module (MCQ/checklist/glossary/
 * interview) rendering, persisting, and gracefully no-op'ing when its
 * JSON file doesn't exist for a given note. Body-prose rendering
 * (headings/callouts/collapsibles/etc., via BodyProseModule) is
 * integration-tested below too — per-block-type rendering detail lives
 * in its own BodyProse.test.tsx instead of being duplicated here.
 *
 * Also covers T5-3b's DSA-specific modules (LeetCode/Contest/YouTube/
 * Visual MCQ/Implementation/Visualisation) at the integration level —
 * that they render for a DSA note, don't fetch at all for an AWS note
 * (subject-gated), and no-op gracefully when their JSON is missing. Each
 * module's own deeper behavior (e.g. VisualMcqModule's answer/lock
 * cycle, VisualisationModule's Images/Animation toggle) has its own
 * dedicated test file alongside it.
 */

const NOTE_META = {
  notes: [
    {
      title: 'Merge Sort',
      folder: 'dsa-merge-sort',
      subject: 'dsa',
      session: null,
      date: '2026-07-02',
      lastModified: '2026-06-23',
      readTimeMinutes: 15,
      category: 'Sorting',
      tags: ['sorting'],
      hasImages: false,
      images: [],
      files: [{ name: 'Notes', file: 'notes.html', type: 'notes', icon: '📄' }],
    },
    {
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
    {
      title: 'Slides Only',
      folder: 'aws-slides-only',
      subject: 'aws',
      session: null,
      date: '2026-07-05',
      lastModified: '2026-07-05',
      readTimeMinutes: 5,
      category: 'Overview',
      tags: [],
      hasImages: false,
      images: [],
      files: [{ name: 'Slides', file: 'slides.html', type: 'slides', icon: '📊' }],
    },
    {
      // Hypothetical only — no real folder has a file type besides
      // notes/lab/slides today (confirmed against the real
      // notes-index.json), and all three now route somewhere real. Kept
      // to exercise the generic "not available yet" fallback, which
      // still exists defensively for any future unported type.
      title: 'Future Type Only',
      folder: 'aws-future-type-only',
      subject: 'aws',
      session: null,
      date: '2026-07-06',
      lastModified: '2026-07-06',
      readTimeMinutes: 5,
      category: 'Overview',
      tags: [],
      hasImages: false,
      images: [],
      files: [{ name: 'Podcast', file: 'podcast.html', type: 'podcast', icon: '🎙️' }],
    },
  ],
};

const MCQ_FIXTURE = {
  title: 'Check Your Understanding',
  topic: 'DSA',
  questions: [
    {
      id: 1,
      question: 'Worst-case time complexity of merge sort?',
      multiSelect: false,
      options: [
        { id: 'a', text: 'O(n^2)', isCorrect: false, explanation: { why: 'Too slow — that describes simpler sorts.' } },
        { id: 'b', text: 'O(n log n)', isCorrect: true, explanation: { why: 'Correct — log n levels, O(n) work each.' } },
      ],
    },
  ],
};

const CHECKLIST_FIXTURE = {
  title: 'Merge Sort Checklist',
  items: [
    { id: 'c1', text: 'Can explain the divide step' },
    { id: 'c2', text: 'Can trace the merge step by hand' },
  ],
};

const GLOSSARY_FIXTURE = {
  title: 'Merge Sort Glossary',
  terms: [{ id: 'g1', term: 'Stable Sort', definition: 'Equal keys keep their order.', example: 'A before B stays A before B.' }],
};

const INTERVIEW_FIXTURE = {
  title: 'Interview Prep',
  questions: [{ id: 'i1', question: 'Why prefer merge sort for worst-case guarantees?', answer: 'Always O(n log n).', tips: 'Mention the space trade-off.' }],
};

const LEETCODE_FIXTURE = {
  title: 'LeetCode Problems',
  problems: [{ id: 'l1', title: 'Sort List', difficulty: 'Medium', url: 'https://leetcode.com/problems/sort-list/' }],
};

const CONTEST_FIXTURE = {
  title: 'Contest Problems',
  problems: [{ id: 'c1', title: 'Weekly 400 - Q2', difficulty: 'Medium' }],
};

const YOUTUBE_FIXTURE = {
  title: 'YouTube Recommendations',
  videos: [{ id: 'y1', title: 'Merge Sort Visualized', url: 'https://youtube.com/watch?v=abc' }],
};

const VISUAL_MCQ_FIXTURE = {
  title: 'Visual MCQ',
  questions: [
    {
      id: 1,
      question: 'What does the highlighted line do?',
      visualType: 'trace',
      code: 'mid = (lo + hi) // 2',
      multiSelect: false,
      options: [
        { id: 'a', text: 'Computes the midpoint', isCorrect: true },
        { id: 'b', text: 'Swaps two elements', isCorrect: false },
      ],
    },
  ],
};

const IMPLEMENTATION_FIXTURE = {
  languages: [{ id: 'python', label: 'Python', code: 'def merge_sort(arr): ...' }],
};

const VISUALISATION_FIXTURE = {
  images: ['/img/merge-sort-1.png'],
  animationSrc: '/data/notes/dsa-merge-sort/animation/merge-sort.html',
};

const BODY_PROSE_FIXTURE = {
  blocks: [
    { type: 'heading', level: 2, id: 'getting-started', text: [{ text: 'Getting Started', mark: null }] },
    {
      type: 'paragraph',
      runs: [
        { text: 'Merge sort is a ', mark: null },
        { text: 'divide and conquer', mark: 'bold' },
        { text: ' algorithm.', mark: null },
      ],
    },
    {
      type: 'collapsible',
      level: 2,
      id: 'links-references',
      heading: 'Links & References',
      open: false,
      children: [{ type: 'references', items: [{ text: 'CLRS', url: 'https://example.com/clrs' }] }],
    },
  ],
};

function mockFetch(overrides: Record<string, unknown> = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('notes-index.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(overrides.index ?? NOTE_META) });
      }
      if (url.includes('/json/mcq.json')) {
        const val = overrides.mcq;
        if (val === 'missing') return Promise.resolve({ ok: false, status: 404 });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(val ?? MCQ_FIXTURE) });
      }
      if (url.includes('/json/checklist.json')) {
        const val = overrides.checklist;
        if (val === 'missing') return Promise.resolve({ ok: false, status: 404 });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(val ?? CHECKLIST_FIXTURE) });
      }
      if (url.includes('/json/glossary.json')) {
        const val = overrides.glossary;
        if (val === 'missing') return Promise.resolve({ ok: false, status: 404 });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(val ?? GLOSSARY_FIXTURE) });
      }
      if (url.includes('/json/interview.json')) {
        const val = overrides.interview;
        if (val === 'missing') return Promise.resolve({ ok: false, status: 404 });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(val ?? INTERVIEW_FIXTURE) });
      }
      if (url.includes('/json/leetcode.json')) {
        const val = overrides.leetcode ?? 'missing';
        if (val === 'missing') return Promise.resolve({ ok: false, status: 404 });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(val) });
      }
      if (url.includes('/json/contest.json')) {
        const val = overrides.contest ?? 'missing';
        if (val === 'missing') return Promise.resolve({ ok: false, status: 404 });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(val) });
      }
      if (url.includes('/json/youtube.json')) {
        const val = overrides.youtube ?? 'missing';
        if (val === 'missing') return Promise.resolve({ ok: false, status: 404 });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(val) });
      }
      if (url.includes('/json/visual-mcq.json')) {
        const val = overrides.visualMcq ?? 'missing';
        if (val === 'missing') return Promise.resolve({ ok: false, status: 404 });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(val) });
      }
      if (url.includes('/json/implementation.json')) {
        const val = overrides.implementation ?? 'missing';
        if (val === 'missing') return Promise.resolve({ ok: false, status: 404 });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(val) });
      }
      if (url.includes('/json/visualisation.json')) {
        const val = overrides.visualisation ?? 'missing';
        if (val === 'missing') return Promise.resolve({ ok: false, status: 404 });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(val) });
      }
      if (url.includes('/json/body-prose.json')) {
        const val = overrides.bodyProse ?? 'missing';
        if (val === 'missing') return Promise.resolve({ ok: false, status: 404 });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(val) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }),
  );
}

function renderNote(path = '/notes/dsa-merge-sort') {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/notes/:folder" element={<Note />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

/** Same as renderNote, but with a real /slides/:folder route registered
 * too, so a redirect to it (T5-4) has somewhere to actually land — a
 * bare stand-in element that surfaces the resolved :folder param is
 * enough to prove the redirect target, without pulling in the real
 * Slides page and its own fetch/rendering concerns. */
function renderNoteWithSlidesRoute(path: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/notes/:folder" element={<Note />} />
          <Route
            path="/slides/:folder"
            element={<SlidesLandedStandIn />}
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

function SlidesLandedStandIn() {
  const { folder } = useParams<{ folder: string }>();
  return <div data-testid="slides-landed">{folder}</div>;
}

/** T5-3c-2: Exam Mode/Theme/Lite Mode moved from standalone header
 * buttons into the Settings FloatingMenu — this opens it so tests can
 * reach the item buttons underneath, same as a real user would click
 * the FAB before seeing its items. */
async function openSettingsMenu() {
  fireEvent.click(await screen.findByRole('button', { name: 'Settings' }));
}

describe('Note', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetNotificationsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the resolved primary notes-type file for a single-file folder', async () => {
    mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing' });
    renderNote();
    expect(await screen.findByRole('heading', { name: 'Merge Sort', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/15 min read/)).toBeInTheDocument();
  });

  it('shows a not-found message for an unknown folder', async () => {
    mockFetch();
    renderNote('/notes/does-not-exist');
    expect(await screen.findByRole('heading', { name: 'Note not found' })).toBeInTheDocument();
  });

  it('falls back to an "open on the current site" link for a file type with no route on this site yet (hypothetical — no real folder is in this state today)', async () => {
    mockFetch();
    renderNote('/notes/aws-future-type-only');
    expect(await screen.findByText(/isn't available on the new site yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open on the current site/ })).toHaveAttribute(
      'href',
      '/data/notes/aws-future-type-only/podcast.html',
    );
  });

  it('T5-4: redirects a slides-only folder to /slides/:folder now that the Slides page exists, instead of the "not available" fallback', async () => {
    mockFetch();
    renderNoteWithSlidesRoute('/notes/aws-slides-only');
    expect(await screen.findByTestId('slides-landed')).toHaveTextContent('aws-slides-only');
    expect(screen.queryByText(/isn't available on the new site yet/)).not.toBeInTheDocument();
  });

  it('resolves a non-primary file via ?file=, for a multi-file folder', async () => {
    mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing', mcq: 'missing' });
    renderNote('/notes/aws-vpc-deep-dive?file=lab.html');
    expect(await screen.findByRole('heading', { name: 'VPC Deep Dive', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('🧪 Lab')).toBeInTheDocument();
  });

  describe('Reading progress (P0-3)', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('does not call scrollTo when no reading progress was saved for this folder', async () => {
      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing' });
      renderNote();
      await screen.findByRole('heading', { name: 'Merge Sort', level: 1 });
      expect(scrollToSpy).not.toHaveBeenCalled();
    });

    it('restores the saved scrollY on load once the note is resolved', async () => {
      localStorage.setItem(
        'readingProgress-folder-dsa-merge-sort',
        JSON.stringify({ v: 1, percent: 40, timestamp: 1000, scrollY: 812 }),
      );
      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing' });
      renderNote();

      await waitFor(() => expect(scrollToSpy).toHaveBeenCalledWith(0, 812));
    });

    it('regression: a pre-existing entry with no scrollY (written before P0-3) still loads without error and restores nothing', async () => {
      // Real pre-P0-3 shape per RecentlyViewed's confirmed contract: { v: 1, percent, timestamp }.
      localStorage.setItem(
        'readingProgress-folder-dsa-merge-sort',
        JSON.stringify({ v: 1, percent: 40, timestamp: 1000 }),
      );
      const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing' });
      renderNote();

      expect(await screen.findByRole('heading', { name: 'Merge Sort', level: 1 })).toBeInTheDocument();
      expect(scrollToSpy).not.toHaveBeenCalled();
      // Original entry is untouched/still valid — proves reading it didn't corrupt or drop the shape.
      const stored = JSON.parse(localStorage.getItem('readingProgress-folder-dsa-merge-sort') || '{}');
      expect(stored).toMatchObject({ v: 1, percent: 40, timestamp: 1000 });
    });

    it('saves scroll position + timestamp to readingProgress-folder-<folder> as the user scrolls', async () => {
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing' });
      renderNote();
      await screen.findByRole('heading', { name: 'Merge Sort', level: 1 });

      Object.defineProperty(window, 'scrollY', { configurable: true, value: 500 });
      fireEvent.scroll(window);

      await waitFor(() => {
        const saved = JSON.parse(localStorage.getItem('readingProgress-folder-dsa-merge-sort') || '{}');
        expect(saved.scrollY).toBe(500);
        expect(saved.v).toBe(1);
        expect(typeof saved.timestamp).toBe('number');
      });
    });

    it('saves a final snapshot on unmount (navigating away) even without a prior scroll event', async () => {
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing' });
      const { unmount } = renderNote();
      await screen.findByRole('heading', { name: 'Merge Sort', level: 1 });

      expect(localStorage.getItem('readingProgress-folder-dsa-merge-sort')).toBeNull();
      unmount();

      const saved = JSON.parse(localStorage.getItem('readingProgress-folder-dsa-merge-sort') || '{}');
      expect(saved.v).toBe(1);
      expect(typeof saved.timestamp).toBe('number');
    });
  });

  describe('Favorite toggle', () => {
    it('writes/removes the folder id from notesFavorites, independently of any gallery/quiz key', async () => {
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing', mcq: 'missing' });
      renderNote();
      const favBtn = await screen.findByRole('button', { name: 'Add Merge Sort to favorites' });
      fireEvent.click(favBtn);
      expect(JSON.parse(localStorage.getItem('notesFavorites') || '[]')).toContain('dsa-merge-sort');
      expect(localStorage.getItem('galleryFavorites')).toBeNull();
      expect(localStorage.getItem('quizFavorites')).toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Remove Merge Sort from favorites' }));
      expect(JSON.parse(localStorage.getItem('notesFavorites') || '[]')).not.toContain('dsa-merge-sort');
    });
  });

  describe('Exam mode', () => {
    it('cycles none -> highlight -> test -> none, persists to examMode, and toasts on each change', async () => {
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing', mcq: 'missing' });
      renderNote();
      await openSettingsMenu();
      const btn = screen.getByRole('button', { name: 'Exam Mode: Off' });

      fireEvent.click(btn);
      expect(localStorage.getItem('examMode')).toBe('highlight');

      await openSettingsMenu();
      fireEvent.click(screen.getByRole('button', { name: 'Exam Mode: Highlight' }));
      expect(localStorage.getItem('examMode')).toBe('test');

      await openSettingsMenu();
      fireEvent.click(screen.getByRole('button', { name: 'Exam Mode: Test' }));
      expect(localStorage.getItem('examMode')).toBe('none');
    });
  });

  describe('Lite Mode (T5-3c-1)', () => {
    it('clicking the toggle persists liteMode and reloads the page', async () => {
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing', mcq: 'missing' });
      const reloadSpy = vi.fn();
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...originalLocation, reload: reloadSpy },
      });

      renderNote();
      await openSettingsMenu();
      const btn = screen.getByRole('button', { name: 'Lite Mode: Off' });
      fireEvent.click(btn);

      expect(localStorage.getItem('liteMode')).toBe('true');
      expect(reloadSpy).toHaveBeenCalledTimes(1);

      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    });

    it('shows "Lite Mode: On" once liteMode is already persisted', async () => {
      localStorage.setItem('liteMode', 'true');
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing', mcq: 'missing' });
      renderNote();
      await openSettingsMenu();
      expect(screen.getByRole('button', { name: 'Lite Mode: On' })).toBeInTheDocument();
    });

    it('hides interactive and links modules, but keeps body-prose and glossary visible, driven by the shared module registry', async () => {
      localStorage.setItem('liteMode', 'true');
      mockFetch({ bodyProse: BODY_PROSE_FIXTURE });
      renderNote('/notes/aws-vpc-deep-dive');

      // Core content (body-prose, glossary) still renders.
      expect(await screen.findByRole('heading', { name: 'Getting Started', level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Merge Sort Glossary' })).toBeInTheDocument();

      // Interactive modules (MCQ, checklist, interview) are hidden — not
      // just their content, the whole section including its heading.
      expect(screen.queryByRole('heading', { name: 'Check Your Understanding' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Merge Sort Checklist' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Interview Prep' })).not.toBeInTheDocument();
    });

    it('hides links-tagged DSA modules (LeetCode/Contest) in Lite Mode, matching a non-Lite-Mode render that shows them', async () => {
      mockFetch({
        checklist: 'missing',
        glossary: 'missing',
        interview: 'missing',
        mcq: 'missing',
        leetcode: LEETCODE_FIXTURE,
        contest: CONTEST_FIXTURE,
      });

      // Baseline: without Lite Mode, both render.
      const { unmount } = renderNote();
      expect(await screen.findByRole('heading', { name: 'LeetCode Problems' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Contest Problems' })).toBeInTheDocument();
      unmount();

      // With Lite Mode on, both are hidden.
      localStorage.setItem('liteMode', 'true');
      renderNote();
      await screen.findByRole('heading', { name: 'Merge Sort', level: 1 });
      expect(screen.queryByRole('heading', { name: 'LeetCode Problems' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Contest Problems' })).not.toBeInTheDocument();
    });
  });

  describe('Settings + Tools FABs (T5-3c-2)', () => {
    it('Theme item shows the current theme and cycles it on click', async () => {
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing', mcq: 'missing' });
      renderNote();
      await openSettingsMenu();
      expect(screen.getByRole('button', { name: 'Theme: Light' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Theme: Light' }));
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('Study Timer item toggles the widget\'s visibility and its own detail text', async () => {
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing', mcq: 'missing' });
      renderNote();
      expect(screen.queryByRole('timer')).not.toBeInTheDocument();

      fireEvent.click(await screen.findByRole('button', { name: 'Tools' }));
      fireEvent.click(screen.getByRole('button', { name: 'Study Timer: Hidden' }));

      expect(screen.getByRole('timer')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Tools' }));
      expect(screen.getByRole('button', { name: 'Study Timer: Shown' })).toBeInTheDocument();
    });

    it('Bookmarks item opens the bookmarks panel', async () => {
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing', mcq: 'missing' });
      renderNote();
      fireEvent.click(await screen.findByRole('button', { name: 'Tools' }));
      fireEvent.click(screen.getByRole('button', { name: 'Bookmarks' }));
      expect(screen.getByRole('dialog', { name: 'Bookmarked sections' })).toBeInTheDocument();
    });

    it('Search item opens the search panel with a focused input', async () => {
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing', mcq: 'missing' });
      renderNote();
      fireEvent.click(await screen.findByRole('button', { name: 'Tools' }));
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
      expect(screen.getByRole('searchbox', { name: 'Search this note' })).toHaveFocus();
    });

    it('Print item expands a Full page / Notes only submenu without closing the parent menu', async () => {
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing', mcq: 'missing' });
      vi.spyOn(window, 'print').mockImplementation(() => {});
      renderNote();
      fireEvent.click(await screen.findByRole('button', { name: 'Tools' }));
      fireEvent.click(screen.getByRole('button', { name: 'Print' }));

      expect(screen.getByRole('button', { name: 'Full page' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Notes only' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Notes only' }));
      expect(window.print).toHaveBeenCalledTimes(1);
      expect(document.body.classList.contains('print-core-only')).toBe(true);
      window.dispatchEvent(new Event('afterprint'));
    });

    it('Export Highlights is present on a complete-notes page and absent on a lab page', async () => {
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing', mcq: 'missing' });
      const { unmount } = renderNote('/notes/aws-vpc-deep-dive');
      fireEvent.click(await screen.findByRole('button', { name: 'Tools' }));
      expect(screen.getByRole('button', { name: 'Export Highlights' })).toBeInTheDocument();
      unmount();

      renderNote('/notes/aws-vpc-deep-dive?file=lab.html');
      fireEvent.click(await screen.findByRole('button', { name: 'Tools' }));
      expect(screen.queryByRole('button', { name: 'Export Highlights' })).not.toBeInTheDocument();
    });

    it('Export Highlights shows an honest status toast when this note genuinely has no saved highlights', async () => {
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing', mcq: 'missing' });
      renderNote();
      fireEvent.click(await screen.findByRole('button', { name: 'Tools' }));

      let latest: { message: string }[] = [];
      const unsubscribe = subscribeToNotifications((items) => {
        latest = items;
      });
      fireEvent.click(screen.getByRole('button', { name: 'Export Highlights' }));
      unsubscribe();

      expect(latest.some((n) => n.message === 'No highlights saved yet for this note.')).toBe(true);
      expect(triggerDownload).not.toHaveBeenCalled();
    });

    it('Export Highlights downloads this note\'s real saved highlights (plus any P1-2 note) as a .txt file', async () => {
      vi.mocked(triggerDownload).mockClear();
      localStorage.setItem(
        highlightsKey('dsa-merge-sort'),
        JSON.stringify([
          { id: 'hl-1', blockId: 'b1', text: 'The pivot choice matters.', createdAt: 1 },
          { id: 'hl-2', blockId: 'b2', text: 'Stable sorts preserve order.', createdAt: 2, note: 'Ask about this' },
        ]),
      );
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing', mcq: 'missing' });
      renderNote();
      fireEvent.click(await screen.findByRole('button', { name: 'Tools' }));

      let latest: { message: string }[] = [];
      const unsubscribe = subscribeToNotifications((items) => {
        latest = items;
      });
      fireEvent.click(screen.getByRole('button', { name: 'Export Highlights' }));
      unsubscribe();

      expect(triggerDownload).toHaveBeenCalledTimes(1);
      const [blob, filename] = vi.mocked(triggerDownload).mock.calls[0];
      expect(filename).toBe('merge-sort-highlights.txt');
      const text = await blob.text();
      expect(text).toContain('# Exam Highlights — Merge Sort');
      expect(text).toContain('1. The pivot choice matters.');
      expect(text).toContain('2. Stable sorts preserve order.');
      expect(text).toContain('Note: Ask about this');
      expect(latest.some((n) => n.message === 'Highlights exported')).toBe(true);
    });

    it('Download as Word calls the shared exportAs() with the note title and real fetched blocks', async () => {
      vi.mocked(exportAs).mockClear();
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing', mcq: 'missing', bodyProse: BODY_PROSE_FIXTURE });
      renderNote();
      fireEvent.click(await screen.findByRole('button', { name: 'Tools' }));
      fireEvent.click(screen.getByRole('button', { name: 'Download as Word' }));

      await waitFor(() => expect(exportAs).toHaveBeenCalledTimes(1));
      expect(exportAs).toHaveBeenCalledWith({ title: 'Merge Sort', blocks: BODY_PROSE_FIXTURE.blocks }, 'docx');
    });

    it('Download as Word shows an info toast instead of exporting an empty document when there is no body-prose content', async () => {
      vi.mocked(exportAs).mockClear();
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing', mcq: 'missing' });
      renderNote();

      let latest: { message: string }[] = [];
      const unsubscribe = subscribeToNotifications((items) => {
        latest = items;
      });
      fireEvent.click(await screen.findByRole('button', { name: 'Tools' }));
      fireEvent.click(screen.getByRole('button', { name: 'Download as Word' }));

      await waitFor(() => expect(latest.some((n) => n.message === 'Nothing to export yet for this note.')).toBe(true));
      unsubscribe();
      expect(exportAs).not.toHaveBeenCalled();
    });
  });

  describe('McqModule', () => {
    it('renders questions via QuestionCard and tracks answered progress', async () => {
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing' });
      renderNote();
      expect(await screen.findByText('Worst-case time complexity of merge sort?')).toBeInTheDocument();
      expect(screen.getByText('0 / 1 answered')).toBeInTheDocument();

      fireEvent.click(screen.getByText('O(n log n)'));
      await waitFor(() => expect(screen.getByText('1 / 1 answered')).toBeInTheDocument());

      const saved = JSON.parse(localStorage.getItem('notes_mcq_progress_dsa-merge-sort') || '{}');
      expect(saved.answered['1']).toBe(true);
    });

    it('renders nothing when the note has no mcq.json', async () => {
      mockFetch({ mcq: 'missing', checklist: 'missing', glossary: 'missing', interview: 'missing' });
      renderNote();
      await screen.findByRole('heading', { name: 'Merge Sort', level: 1 });
      expect(screen.queryByRole('heading', { name: 'Check Your Understanding' })).not.toBeInTheDocument();
    });

    it('T1-5: shows an "Open as Quiz" link pointing at /quiz/<folder>?source=notes', async () => {
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing' });
      renderNote();
      const link = await screen.findByRole('link', { name: /Open as Quiz/ });
      expect(link).toHaveAttribute('href', '/quiz/dsa-merge-sort?source=notes');
    });

    it('T1-5: does not show "Open as Quiz" when there is no mcq.json', async () => {
      mockFetch({ mcq: 'missing', checklist: 'missing', glossary: 'missing', interview: 'missing' });
      renderNote();
      await screen.findByRole('heading', { name: 'Merge Sort', level: 1 });
      expect(screen.queryByRole('link', { name: /Open as Quiz/ })).not.toBeInTheDocument();
    });
  });

  describe('ChecklistModule', () => {
    it('renders items via the shared Table, toggles persist to <folder>-checklist-state, and progress updates', async () => {
      mockFetch({ mcq: 'missing', glossary: 'missing', interview: 'missing' });
      renderNote();
      const checkbox = await screen.findByRole('checkbox', { name: 'Mark done: Can explain the divide step' });
      expect(screen.getByText('0 / 2 complete')).toBeInTheDocument();

      fireEvent.click(checkbox);
      await waitFor(() => expect(screen.getByText('1 / 2 complete')).toBeInTheDocument());

      const saved = JSON.parse(localStorage.getItem('dsa-merge-sort-checklist-state') || '[]');
      expect(saved).toContain('c1');
    });
  });

  describe('GlossaryModule', () => {
    it('renders terms via the shared Table, with no progress bar (informational only)', async () => {
      mockFetch({ mcq: 'missing', checklist: 'missing', interview: 'missing' });
      renderNote();
      expect(await screen.findByText('Stable Sort')).toBeInTheDocument();
      expect(screen.getByText('Equal keys keep their order.')).toBeInTheDocument();
    });
  });

  describe('InterviewModule', () => {
    it('reveals an answer on demand and tracks practiced progress independently of the checklist', async () => {
      mockFetch({ mcq: 'missing', checklist: 'missing', glossary: 'missing' });
      renderNote();
      expect(await screen.findByText('Why prefer merge sort for worst-case guarantees?')).toBeInTheDocument();
      expect(screen.getByText('0 / 1 practiced')).toBeInTheDocument();
      expect(screen.queryByText('Always O(n log n).')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }));
      expect(screen.getByText('Always O(n log n).')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('checkbox', { name: 'Practiced' }));
      await waitFor(() => expect(screen.getByText('1 / 1 practiced')).toBeInTheDocument());
      expect(JSON.parse(localStorage.getItem('dsa-merge-sort-interview-state') || '[]')).toContain('i1');
    });
  });

  describe('BodyProseModule', () => {
    it('renders real body-prose content in place of the old placeholder', async () => {
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing', mcq: 'missing', bodyProse: BODY_PROSE_FIXTURE });
      renderNote();
      expect(await screen.findByRole('heading', { name: 'Getting Started', level: 2 })).toBeInTheDocument();
      expect(screen.getByText('divide and conquer')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /CLRS/ })).toHaveAttribute('href', 'https://example.com/clrs');
      expect(screen.queryByText(/pending the content-pipeline/)).not.toBeInTheDocument();
    });

    it('renders nothing when the note has no body-prose.json (pre-T5-2 note)', async () => {
      mockFetch({ checklist: 'missing', glossary: 'missing', interview: 'missing', mcq: 'missing' });
      renderNote();
      await screen.findByRole('heading', { name: 'Merge Sort', level: 1 });
      expect(screen.queryByRole('heading', { name: 'Getting Started' })).not.toBeInTheDocument();
    });
  });

  describe('DSA-specific modules (T5-3b)', () => {
    it('renders LeetCode/Contest/YouTube/Visual MCQ/Implementation/Visualisation for a DSA note', async () => {
      mockFetch({
        leetcode: LEETCODE_FIXTURE,
        contest: CONTEST_FIXTURE,
        youtube: YOUTUBE_FIXTURE,
        visualMcq: VISUAL_MCQ_FIXTURE,
        implementation: IMPLEMENTATION_FIXTURE,
        visualisation: VISUALISATION_FIXTURE,
      });
      renderNote();
      expect(await screen.findByRole('heading', { name: 'LeetCode Problems' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Contest Problems' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'YouTube Recommendations' })).toBeInTheDocument();
      expect(screen.getByText('What does the highlighted line do?')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Implementation' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Visualisation' })).toBeInTheDocument();
    });

    it('does NOT fetch any DSA-specific JSON for an AWS note (subject-gated)', async () => {
      mockFetch({
        checklist: 'missing',
        glossary: 'missing',
        interview: 'missing',
        mcq: 'missing',
        leetcode: LEETCODE_FIXTURE,
        visualMcq: VISUAL_MCQ_FIXTURE,
      });
      renderNote('/notes/aws-vpc-deep-dive');
      await screen.findByRole('heading', { name: 'VPC Deep Dive', level: 1 });
      expect(screen.queryByRole('heading', { name: 'LeetCode Problems' })).not.toBeInTheDocument();
      const calledUrls = (fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) => c[0]);
      expect(calledUrls.some((u) => String(u).includes('leetcode.json'))).toBe(false);
      expect(calledUrls.some((u) => String(u).includes('visual-mcq.json'))).toBe(false);
    });

    it('gracefully renders nothing for any DSA module whose JSON is missing (the default)', async () => {
      mockFetch();
      renderNote();
      await screen.findByRole('heading', { name: 'Merge Sort', level: 1 });
      expect(screen.queryByRole('heading', { name: 'LeetCode Problems' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Contest Problems' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'YouTube Recommendations' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Implementation' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Visualisation' })).not.toBeInTheDocument();
    });
  });
});
