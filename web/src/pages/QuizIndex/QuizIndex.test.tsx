import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as useSearchModule from '../../hooks/useSearch';
import * as QuickFiltersBarModule from '../../components/QuickFiltersBar';
import * as ViewModeToggleModule from '../../components/ViewModeToggle';
import * as PaginationModule from '../../components/Pagination';
import * as CardQuickActionsModule from '../../components/CardQuickActions';
import * as ProgressBarModule from '../../components/ProgressBar';
import * as CompletionBadgeModule from '../../components/CompletionBadge';
import { QuizIndex } from './QuizIndex';

/**
 * QuizIndex.test.tsx
 *
 * Covers the full T3-2b Testing spec (expanded scope — feature parity,
 * not just the original topic-filter/search port):
 *   - QuizIndex imports the LITERAL SAME useSearch, QuickFiltersBar,
 *     ViewModeToggle, Pagination, CardQuickActions, ProgressBar,
 *     CompletionBadge modules T3-2a exports. Each is spied on directly
 *     via vi.spyOn against the real module (not a mock replacing it) —
 *     a silently duplicated second implementation of any of these would
 *     never trigger its spy, so a passing feature test elsewhere
 *     couldn't hide it.
 *   - topic filter narrows results correctly; combined with search
 *     query narrows further (both applied, not either/or)
 *   - Quiz Favorites toggle writes/reads quizFavorites, independently of
 *     notesFavorites/galleryFavorites
 *   - CompletionBadge/ProgressBar: no stored progress -> Not Started;
 *     partial answers -> In Progress with correct answered/total
 *     percent; a full attempt recorded -> Completed — all three states
 *     against fixture quiz_progress_<quizFile> data in the real
 *     _saveState() shape (answeredQuestions/questionOrder/savedAt), not
 *     the previously-assumed { answered, total, timestamp }
 *   - Copy Link quick action copies the correct quiz URL
 */

const FIXTURE_QUIZZES = {
  Quizzes: [
    { title: 'VPC Basics', file: 'vpc-basics', topic: 'Networking' },
    { title: 'Subnetting Deep Dive', file: 'subnetting', topic: 'Networking' },
    { title: 'IAM Roles', file: 'iam-roles', topic: 'Security' },
  ],
};

const FIXTURE_NAV_CONFIG = [
  { title: 'Home', emoji: '🏠', url: '/' },
  { title: 'Quizzes', emoji: '📝', url: '/quiz-index' },
];

function mockFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/data/index/quiz-index.json') {
        return Promise.resolve({ ok: true, json: async () => FIXTURE_QUIZZES });
      }
      if (url === '/data/config/navigation-url.json') {
        return Promise.resolve({ ok: true, json: async () => FIXTURE_NAV_CONFIG });
      }
      return Promise.reject(new Error(`unexpected fetch in test: ${url}`));
    }),
  );
}

function renderQuizIndex() {
  return render(
    <MemoryRouter>
      <QuizIndex />
    </MemoryRouter>,
  );
}

describe('QuizIndex', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('calls the shared useSearch module directly — not a duplicated search implementation', async () => {
    const spy = vi.spyOn(useSearchModule, 'useSearch');
    mockFetch();
    renderQuizIndex();

    await screen.findByText('VPC Basics');
    expect(spy).toHaveBeenCalled();
  });

  it('imports the same shared QuickFiltersBar, ViewModeToggle, and Pagination components T3-2a exports', async () => {
    const quickFiltersSpy = vi.spyOn(QuickFiltersBarModule, 'QuickFiltersBar');
    const viewModeSpy = vi.spyOn(ViewModeToggleModule, 'ViewModeToggle');
    const paginationSpy = vi.spyOn(PaginationModule, 'Pagination');

    mockFetch();
    renderQuizIndex();

    await screen.findByText('VPC Basics');
    expect(quickFiltersSpy).toHaveBeenCalled();
    expect(viewModeSpy).toHaveBeenCalled();
    expect(paginationSpy).toHaveBeenCalled();
  });

  it('imports the same shared CardQuickActions, ProgressBar, and CompletionBadge components T3-2a exports', async () => {
    const quickActionsSpy = vi.spyOn(CardQuickActionsModule, 'CardQuickActions');
    const progressBarSpy = vi.spyOn(ProgressBarModule, 'ProgressBar');
    const completionBadgeSpy = vi.spyOn(CompletionBadgeModule, 'CompletionBadge');

    mockFetch();
    renderQuizIndex();

    await screen.findByText('VPC Basics');
    expect(quickActionsSpy).toHaveBeenCalled();
    expect(progressBarSpy).toHaveBeenCalled();
    expect(completionBadgeSpy).toHaveBeenCalled();
  });

  it('narrows results by topic filter', async () => {
    mockFetch();
    renderQuizIndex();

    await screen.findByText('IAM Roles');
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by Topic' }), { target: { value: 'Security' } });

    await waitFor(() => {
      expect(screen.getByText('IAM Roles')).toBeInTheDocument();
      expect(screen.queryByText('VPC Basics')).not.toBeInTheDocument();
      expect(screen.queryByText('Subnetting Deep Dive')).not.toBeInTheDocument();
    });
  });

  it('combines topic filter + search query — both applied, not either/or', async () => {
    mockFetch();
    renderQuizIndex();

    await screen.findByText('VPC Basics');

    // Topic = Networking matches BOTH "VPC Basics" and "Subnetting Deep
    // Dive". Adding a search term matching only one of them should
    // narrow further, proving both filters apply together.
    fireEvent.change(screen.getByRole('combobox', { name: 'Filter by Topic' }), { target: { value: 'Networking' } });
    await screen.findByText('Subnetting Deep Dive'); // both still visible

    fireEvent.change(screen.getByRole('textbox', { name: 'Search quizzes' }), {
      target: { value: 'subnetting' },
    });

    await waitFor(() => {
      expect(screen.getByText('Subnetting Deep Dive')).toBeInTheDocument();
      expect(screen.queryByText('VPC Basics')).not.toBeInTheDocument();
    });
  });

  it('favorite toggle writes to quizFavorites, independent of notesFavorites/galleryFavorites', async () => {
    localStorage.setItem('notesFavorites', JSON.stringify(['some-other-note']));
    localStorage.setItem('galleryFavorites', JSON.stringify(['some-other-image.png']));

    mockFetch();
    renderQuizIndex();

    const vpcCard = (await screen.findByText('VPC Basics')).closest('.quiz-card') as HTMLElement;
    fireEvent.click(within(vpcCard).getByLabelText('Add to favorites'));

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('quizFavorites') || '[]')).toEqual(['vpc-basics']);
    });

    // The other two families' favorites must be completely untouched.
    expect(JSON.parse(localStorage.getItem('notesFavorites') || '[]')).toEqual(['some-other-note']);
    expect(JSON.parse(localStorage.getItem('galleryFavorites') || '[]')).toEqual(['some-other-image.png']);
  });

  /**
   * T3-2b: useLiveRegion wiring — same gap and fix as NotesIndex's
   * identical tests.
   */
  it('announces when a quiz is added to or removed from favorites', async () => {
    mockFetch();
    renderQuizIndex();

    const vpcCard = (await screen.findByText('VPC Basics')).closest('.quiz-card') as HTMLElement;
    fireEvent.click(within(vpcCard).getByLabelText('Add to favorites'));

    await waitFor(() => {
      expect(document.getElementById('app-live-region')).toHaveTextContent('Added VPC Basics to favorites');
    });

    fireEvent.click(within(vpcCard).getByLabelText('Remove from favorites'));

    await waitFor(() => {
      expect(document.getElementById('app-live-region')).toHaveTextContent('Removed VPC Basics from favorites');
    });
  });

  it('announces the result count when a filter narrows the list, but not on initial load', async () => {
    mockFetch();
    renderQuizIndex();

    await screen.findByText('VPC Basics');
    expect(document.getElementById('app-live-region')).toHaveTextContent('');

    fireEvent.change(screen.getByLabelText('Search quizzes'), { target: { value: 'VPC' } });

    await waitFor(() => {
      expect(document.getElementById('app-live-region')).toHaveTextContent('1 quiz found');
    });
  });

  it('Favorites-only quick filter shows only favorited quizzes', async () => {
    localStorage.setItem('quizFavorites', JSON.stringify(['iam-roles']));

    mockFetch();
    renderQuizIndex();

    await screen.findByText('VPC Basics');
    fireEvent.click(screen.getByRole('button', { name: /Favorites/ }));

    await waitFor(() => {
      expect(screen.getByText('IAM Roles')).toBeInTheDocument();
      expect(screen.queryByText('VPC Basics')).not.toBeInTheDocument();
      expect(screen.queryByText('Subnetting Deep Dive')).not.toBeInTheDocument();
    });
  });

  describe('Completion state — three fixture states against quiz_progress_<quizFile>', () => {
    it('shows Not Started when no quiz_progress_<file> entry exists at all', async () => {
      mockFetch();
      renderQuizIndex();

      const vpcCard = (await screen.findByText('VPC Basics')).closest('.quiz-card') as HTMLElement;
      expect(within(vpcCard).getByLabelText('Not Started')).toBeInTheDocument();
      expect(within(vpcCard).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    });

    it('shows In Progress with the correct answered/total percent for a partial attempt', async () => {
      localStorage.setItem(
        'quiz_progress_subnetting',
        JSON.stringify({
          answeredQuestions: { 1: true, 2: true, 3: true },
          questionOrder: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          savedAt: 1000,
        }),
      );

      mockFetch();
      renderQuizIndex();

      const card = (await screen.findByText('Subnetting Deep Dive')).closest('.quiz-card') as HTMLElement;
      expect(within(card).getByLabelText('In Progress')).toBeInTheDocument();
      expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '30');
    });

    it('shows Completed when every question has been answered at least once', async () => {
      localStorage.setItem(
        'quiz_progress_iam-roles',
        JSON.stringify({
          answeredQuestions: { 1: true, 2: true, 3: true, 4: true, 5: true },
          questionOrder: [1, 2, 3, 4, 5],
          savedAt: 2000,
        }),
      );

      mockFetch();
      renderQuizIndex();

      const card = (await screen.findByText('IAM Roles')).closest('.quiz-card') as HTMLElement;
      expect(within(card).getByLabelText('Completed')).toBeInTheDocument();
      expect(within(card).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    });

    it('narrows to only Completed quizzes via the status quick filter', async () => {
      localStorage.setItem(
        'quiz_progress_iam-roles',
        JSON.stringify({
          answeredQuestions: { 1: true, 2: true, 3: true, 4: true, 5: true },
          questionOrder: [1, 2, 3, 4, 5],
          savedAt: 2000,
        }),
      );

      mockFetch();
      renderQuizIndex();

      await screen.findByText('VPC Basics');
      fireEvent.click(screen.getByRole('button', { name: /Completed/ }));

      await waitFor(() => {
        expect(screen.getByText('IAM Roles')).toBeInTheDocument();
        expect(screen.queryByText('VPC Basics')).not.toBeInTheDocument();
        expect(screen.queryByText('Subnetting Deep Dive')).not.toBeInTheDocument();
      });
    });
  });

  it('Copy Link copies the /quiz/<stem> URL', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    mockFetch();
    renderQuizIndex();

    const card = (await screen.findByText('VPC Basics')).closest('.quiz-card') as HTMLElement;
    fireEvent.click(within(card).getByLabelText('Copy link'));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/quiz/vpc-basics`);
    });
  });

  describe('PY-1: questionCount/estimatedMinutes sort + display', () => {
    const FIXTURE_QUIZZES_WITH_TIME = {
      Quizzes: [
        { title: 'VPC Basics', file: 'vpc-basics', topic: 'Networking', questionCount: 20, estimatedMinutes: 15 },
        { title: 'Subnetting Deep Dive', file: 'subnetting', topic: 'Networking', questionCount: 4, estimatedMinutes: 3 },
        // No questionCount/estimatedMinutes at all — a pre-PY-1 entry
        // that hasn't been regenerated yet. Must not crash, must not
        // silently sort as if it were the fastest quiz (0 minutes).
        { title: 'IAM Roles', file: 'iam-roles', topic: 'Security' },
      ],
    };

    function mockFetchWithTime() {
      vi.stubGlobal(
        'fetch',
        vi.fn((url: string) => {
          if (url === '/data/index/quiz-index.json') {
            return Promise.resolve({ ok: true, json: async () => FIXTURE_QUIZZES_WITH_TIME });
          }
          if (url === '/data/config/navigation-url.json') {
            return Promise.resolve({ ok: true, json: async () => FIXTURE_NAV_CONFIG });
          }
          return Promise.reject(new Error(`unexpected fetch in test: ${url}`));
        }),
      );
    }

    it('shows question count and estimated time on a card that has both fields', async () => {
      mockFetchWithTime();
      renderQuizIndex();

      const card = (await screen.findByText('VPC Basics')).closest('.quiz-card') as HTMLElement;
      expect(within(card).getByText('⏱️ 20 questions · ~15 min')).toBeInTheDocument();
    });

    it('shows singular "question" for a 1-question quiz', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn((url: string) => {
          if (url === '/data/index/quiz-index.json') {
            return Promise.resolve({
              ok: true,
              json: async () => ({ Quizzes: [{ title: 'Pop Quiz', file: 'pop-quiz', topic: 'Misc', questionCount: 1, estimatedMinutes: 1 }] }),
            });
          }
          if (url === '/data/config/navigation-url.json') {
            return Promise.resolve({ ok: true, json: async () => FIXTURE_NAV_CONFIG });
          }
          return Promise.reject(new Error(`unexpected fetch in test: ${url}`));
        }),
      );
      renderQuizIndex();

      const card = (await screen.findByText('Pop Quiz')).closest('.quiz-card') as HTMLElement;
      expect(within(card).getByText('⏱️ 1 question · ~1 min')).toBeInTheDocument();
    });

    it('renders no time/question-count line for a card missing those fields, without crashing', async () => {
      mockFetchWithTime();
      renderQuizIndex();

      const card = (await screen.findByText('IAM Roles')).closest('.quiz-card') as HTMLElement;
      expect(within(card).queryByText(/⏱️/)).not.toBeInTheDocument();
    });

    it('"Quickest" quick-filter sorts by estimatedMinutes ascending, with unknown-time entries sorting last', async () => {
      mockFetchWithTime();
      renderQuizIndex();

      await screen.findByText('VPC Basics');
      fireEvent.click(screen.getByRole('button', { name: /Quickest/i }));

      await waitFor(() => {
        const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent);
        expect(titles).toEqual(['Subnetting Deep Dive', 'VPC Basics', 'IAM Roles']);
      });
    });

    it('"Time ↑" sort dropdown option produces the same ordering as the Quickest quick filter', async () => {
      mockFetchWithTime();
      renderQuizIndex();

      await screen.findByText('VPC Basics');
      fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), { target: { value: 'time-asc' } });

      await waitFor(() => {
        const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent);
        expect(titles).toEqual(['Subnetting Deep Dive', 'VPC Basics', 'IAM Roles']);
      });
    });

    it('"Time ↓" sort dropdown option reverses the ordering, with unknown-time entries still sorting last', async () => {
      mockFetchWithTime();
      renderQuizIndex();

      await screen.findByText('VPC Basics');
      fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), { target: { value: 'time-desc' } });

      await waitFor(() => {
        const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent);
        expect(titles).toEqual(['VPC Basics', 'Subnetting Deep Dive', 'IAM Roles']);
      });
    });
  });
});
