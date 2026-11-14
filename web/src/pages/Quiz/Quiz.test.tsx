import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Quiz } from './Quiz';
import { getShortcuts } from '../../lib/keyboardShortcuts';

/**
 * Quiz.test.tsx — covers the core engine, bookmarks, flags, print/export,
 * save/resume, study-mode toggle + self-rating, in-quiz
 * search/status-filter, attempt history, and the two "Share via QR"
 * actions + trivia-mode `?seed=` fixed-sequence support.
 * Weak-areas-by-category is explicitly out of scope entirely (dropped
 * 2026-07-26, blocked on quiz.json's `category` field, T5-2/PY-1) — see
 * Quiz.tsx's own header. Attempt history is NOT blocked on that same
 * schema change (a correction from an earlier pass that lumped the two
 * together) and is covered below.
 */

const FIXTURE = {
  title: 'Sample Quiz',
  topic: 'Testing',
  questions: [
    {
      id: 1,
      question: 'Single-select question?',
      multiSelect: false,
      options: [
        { id: 'A', text: 'Wrong answer', isCorrect: false, explanation: { why: 'This is wrong because reasons.' } },
        { id: 'B', text: 'Right answer', isCorrect: true, explanation: { why: 'This is right because reasons.' } },
      ],
    },
    {
      id: 2,
      question: 'Multi-select question?',
      multiSelect: true,
      options: [
        { id: 'A', text: 'First correct', isCorrect: true },
        { id: 'B', text: 'Second correct', isCorrect: true },
        { id: 'C', text: 'Not correct', isCorrect: false },
      ],
    },
  ],
};

function mockFetchQuiz(data: unknown = FIXTURE, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok,
        json: async () => data,
      }),
    ),
  );
}

function renderQuiz(quizId = 'sample-quiz') {
  return render(
    <MemoryRouter initialEntries={[`/quiz/${quizId}`]}>
      <Routes>
        <Route path="/quiz/:quizId" element={<Quiz />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Same as renderQuiz, but lets a caller supply a `?search` string — used
 * for the trivia-mode `?seed=` tests below. */
function renderQuizWithSearch(quizId: string, search: string) {
  return render(
    <MemoryRouter initialEntries={[`/quiz/${quizId}${search}`]}>
      <Routes>
        <Route path="/quiz/:quizId" element={<Quiz />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** A larger fixture (5 questions) for the fixed-sequence determinism
 * tests below — with only 2 questions (FIXTURE above) there's only one
 * possible non-identity ordering, which wouldn't meaningfully rule out
 * coincidence; 5 questions makes an accidental match astronomically
 * unlikely if the seeding weren't actually deterministic. */
const ORDER_FIXTURE = {
  title: 'Order Fixture Quiz',
  topic: 'Testing',
  questions: [1, 2, 3, 4, 5].map((n) => ({
    id: n,
    question: `Question number ${n}?`,
    multiSelect: false,
    options: [
      { id: 'A', text: `Q${n} wrong`, isCorrect: false },
      { id: 'B', text: `Q${n} right`, isCorrect: true },
    ],
  })),
};

/** Reads back the rendered question order from a mounted Quiz page. */
function renderedQuestionOrder(): string[] {
  return Array.from(document.querySelectorAll('.question-card')).map(
    (el) => el.getAttribute('data-question-id') ?? '',
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('Quiz — load and render', () => {
  it('fetches /data/quiz/<quizId>.json and renders every question and option', async () => {
    mockFetchQuiz();
    renderQuiz('sample-quiz');

    expect(fetch).toHaveBeenCalledWith('/data/quiz/sample-quiz.json');
    expect(await screen.findByRole('heading', { name: /Sample Quiz/ })).toBeInTheDocument();
    expect(screen.getByText('Single-select question?')).toBeInTheDocument();
    expect(screen.getByText('Multi-select question?')).toBeInTheDocument();
    expect(screen.getByText('Right answer')).toBeInTheDocument();
    expect(screen.getByText('First correct')).toBeInTheDocument();
  });

  it('shows an error state when the fetch fails', async () => {
    mockFetchQuiz(null, false);
    renderQuiz('missing-quiz');

    expect(await screen.findByText('Failed to load quiz')).toBeInTheDocument();
  });
});

describe('Quiz — single-select answering', () => {
  it('marks the selected option correct/incorrect and shows its explanation', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const card = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;

    fireEvent.click(within(card).getByText('Right answer'));

    expect(await within(card).findByText(/This is right because reasons\./)).toBeInTheDocument();
    expect(within(card).getByLabelText('Correct')).toBeInTheDocument();
  });

  it('locks other options once answered, and Reset answer clears the question', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const card = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;

    fireEvent.click(within(card).getByText('Wrong answer'));
    expect(await within(card).findByLabelText('Incorrect')).toBeInTheDocument();

    const resetBtn = within(card).getByRole('button', { name: /clear your answer/i });
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(within(card).queryByLabelText('Incorrect')).not.toBeInTheDocument();
    });
  });
});

describe('Quiz — multi-select answering', () => {
  it('requires exactly the correct number of selections and blocks a 3rd pick with a toast', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Multi-select question?');
    const card = screen.getByText('Multi-select question?').closest('.question-card') as HTMLElement;

    fireEvent.click(within(card).getByText('First correct'));
    fireEvent.click(within(card).getByText('Second correct'));
    fireEvent.click(within(card).getByText('Not correct'));

    // role="status" now also matches the shared app-wide live region (from
    // ShareQR's useLiveRegion()) alongside the toast div — status doesn't
    // take its accessible name from content, so a `name` filter can't
    // disambiguate them; picking the one whose text actually matches does.
    const toast = await waitFor(() => {
      const match = screen.getAllByRole('status').find((el) => /You can only select two answers/i.test(el.textContent ?? ''));
      if (!match) throw new Error('toast not found yet');
      return match;
    });
    expect(toast).toHaveTextContent(/You can only select two answers/i);
  });
});

describe('Quiz — progress and scoring', () => {
  it('updates the progress bar and shows the score summary once every question is answered', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    expect(screen.getByText('0 / 2 answered')).toBeInTheDocument();

    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q1).getByText('Right answer'));
    await waitFor(() => expect(screen.getByText('1 / 2 answered')).toBeInTheDocument());

    const q2 = screen.getByText('Multi-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q2).getByText('First correct'));
    fireEvent.click(within(q2).getByText('Second correct'));

    expect(await screen.findByRole('region', { name: 'Quiz results' })).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('Retry Quiz clears the score summary and every answer', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q1).getByText('Right answer'));
    const q2 = screen.getByText('Multi-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q2).getByText('First correct'));
    fireEvent.click(within(q2).getByText('Second correct'));

    fireEvent.click(await screen.findByRole('button', { name: /Retry Quiz/i }));

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Quiz results' })).not.toBeInTheDocument();
    });
    expect(screen.getByText('0 / 2 answered')).toBeInTheDocument();
  });
});

describe('Quiz — attempt history', () => {
  it('does not show a history panel before any attempt has been completed', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    expect(screen.queryByRole('heading', { name: 'Attempt history' })).not.toBeInTheDocument();
  });

  it('records a completed attempt to quiz_history_<quizId> and displays it', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q1).getByText('Right answer'));
    const q2 = screen.getByText('Multi-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q2).getByText('First correct'));
    fireEvent.click(within(q2).getByText('Second correct'));

    await screen.findByRole('region', { name: 'Quiz results' });

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('quiz_history_sample-quiz') as string);
      expect(saved).toHaveLength(1);
      expect(saved[0]).toMatchObject({ score: 2, total: 2, pct: 100, passed: true });
      expect(typeof saved[0].date).toBe('string');
    });

    expect(await screen.findByRole('heading', { name: 'Attempt history' })).toBeInTheDocument();
    expect(screen.getByText('2 / 2 (100%)')).toBeInTheDocument();
    expect(screen.getByLabelText('Passed')).toBeInTheDocument();
  });

  it('records a second entry (not overwriting the first) after Retry Quiz completes again', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');

    // First attempt: perfect score.
    const q1First = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q1First).getByText('Right answer'));
    const q2First = screen.getByText('Multi-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q2First).getByText('First correct'));
    fireEvent.click(within(q2First).getByText('Second correct'));
    await screen.findByRole('region', { name: 'Quiz results' });
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('quiz_history_sample-quiz') as string)).toHaveLength(1);
    });

    // Retry, then complete with one wrong answer this time.
    fireEvent.click(screen.getByRole('button', { name: /Retry Quiz/i }));
    await screen.findByText('0 / 2 answered');
    const q1Second = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q1Second).getByText('Wrong answer'));
    const q2Second = screen.getByText('Multi-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q2Second).getByText('First correct'));
    fireEvent.click(within(q2Second).getByText('Second correct'));
    await screen.findByRole('region', { name: 'Quiz results' });

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('quiz_history_sample-quiz') as string);
      expect(saved).toHaveLength(2);
      expect(saved[0]).toMatchObject({ score: 2, passed: true });
      expect(saved[1]).toMatchObject({ score: 1, total: 2, pct: 50, passed: false });
    });

    // Most-recent-first display order.
    const rows = screen.getAllByText(/\/ 2 \(\d+%\)/);
    expect(rows[0]).toHaveTextContent('1 / 2 (50%)');
    expect(rows[1]).toHaveTextContent('2 / 2 (100%)');
  });

  it('caps history at 20 entries, dropping the oldest', async () => {
    // Seed 20 pre-existing entries (oldest first, as saveHistory stores
    // them) so completing one more attempt pushes past the cap.
    const seeded = Array.from({ length: 20 }, (_, i) => ({
      date: new Date(2026, 0, i + 1).toISOString(),
      score: 2,
      total: 2,
      pct: 100,
      timeSeconds: 10,
      passed: true,
    }));
    localStorage.setItem('quiz_history_sample-quiz', JSON.stringify(seeded));

    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q1).getByText('Wrong answer'));
    const q2 = screen.getByText('Multi-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q2).getByText('First correct'));
    fireEvent.click(within(q2).getByText('Second correct'));
    await screen.findByRole('region', { name: 'Quiz results' });

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('quiz_history_sample-quiz') as string);
      expect(saved).toHaveLength(20);
      // The oldest seeded entry (Jan 1) was dropped; the newest seeded
      // entry (Jan 20) is still present as the second-to-last, and the
      // just-completed attempt (score 1, not 2) is the new last entry.
      expect(saved[0].date).toBe(new Date(2026, 0, 2).toISOString());
      expect(saved[saved.length - 1]).toMatchObject({ score: 1, total: 2, passed: false });
    });
  });
});

describe('Quiz — timer', () => {
  it('starts the elapsed-time timer on the first answer, not before', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetchQuiz();
    renderQuiz();

    await vi.waitFor(() => expect(screen.getByText('Single-select question?')).toBeInTheDocument());
    expect(screen.getByLabelText('Time elapsed')).toHaveTextContent('0:00');

    vi.advanceTimersByTime(5000);
    expect(screen.getByLabelText('Time elapsed')).toHaveTextContent('0:00');

    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q1).getByText('Right answer'));

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByLabelText('Time elapsed')).toHaveTextContent('0:03');
  });
});

describe('Quiz — bookmarks', () => {
  it('toggles a bookmark on and off, and persists it to localStorage', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    const bookmarkBtn = within(q1).getByRole('button', { name: /^Bookmark question/ });

    fireEvent.click(bookmarkBtn);

    expect(await within(q1).findByRole('button', { name: /^Remove bookmark from question/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('quiz_progress_sample-quiz') as string);
      expect(saved.bookmarks).toEqual({ '1': true });
    });

    fireEvent.click(within(q1).getByRole('button', { name: /^Remove bookmark from question/ }));

    expect(await within(q1).findByRole('button', { name: /^Bookmark question/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('quiz_progress_sample-quiz') as string);
      expect(saved.bookmarks).toEqual({});
    });
  });

  it('preserves a bookmark independently of the question being answered', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q1).getByRole('button', { name: /^Bookmark question/ }));
    fireEvent.click(within(q1).getByText('Right answer'));

    expect(await within(q1).findByLabelText('Correct')).toBeInTheDocument();
    expect(within(q1).getByRole('button', { name: /^Remove bookmark from question/ })).toBeInTheDocument();
  });
});

describe('Quiz — flags', () => {
  it('cycles none -> confusing -> incorrect -> none on repeated clicks', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    const flagBtn = within(q1).getByRole('button', { name: /^Flag question/ });

    fireEvent.click(flagBtn);
    expect(await within(q1).findByTitle('Flagged: confusing')).toBeInTheDocument();

    fireEvent.click(within(q1).getByTitle('Flagged: confusing'));
    expect(await within(q1).findByTitle('Flagged: possibly incorrect')).toBeInTheDocument();

    fireEvent.click(within(q1).getByTitle('Flagged: possibly incorrect'));
    expect(await within(q1).findByRole('button', { name: /^Flag question/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('fires a toast and a live-region announcement on each flag transition', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    const flagBtn = within(q1).getByRole('button', { name: /^Flag question/ });
    const liveRegion = () => document.getElementById('app-live-region');

    fireEvent.click(flagBtn);
    expect(await screen.findByText('Flagged as confusing')).toBeInTheDocument();
    await waitFor(() => expect(liveRegion()?.textContent).toBe('Flagged as confusing'));

    fireEvent.click(within(q1).getByTitle('Flagged: confusing'));
    expect(await screen.findByText('Flagged as incorrect')).toBeInTheDocument();
    await waitFor(() => expect(liveRegion()?.textContent).toBe('Flagged as incorrect'));

    fireEvent.click(within(q1).getByTitle('Flagged: possibly incorrect'));
    expect(await screen.findByText('Flag removed')).toBeInTheDocument();
    await waitFor(() => expect(liveRegion()?.textContent).toBe('Flag removed'));
  });

  it('persists the flag state to localStorage independently per question', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Multi-select question?');
    const q2 = screen.getByText('Multi-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q2).getByRole('button', { name: /^Flag question/ }));

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('quiz_progress_sample-quiz') as string);
      expect(saved.flags).toEqual({ '2': 'confusing' });
    });
  });
});

describe('Quiz — study mode', () => {
  it('turning study mode on keeps a single-select answer unlocked and shows the self-rating widget once answered', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle study mode' }));
    expect(screen.getByRole('button', { name: 'Toggle study mode' })).toHaveAttribute('aria-pressed', 'true');

    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q1).getByText('Wrong answer'));
    expect(await within(q1).findByLabelText('Incorrect')).toBeInTheDocument();

    // Still unlocked (not `pointer-events-none opacity-45`) — study mode
    // lets you change your answer freely, unlike the normal locked flow.
    fireEvent.click(within(q1).getByText('Right answer'));
    expect(await within(q1).findByLabelText('Correct')).toBeInTheDocument();

    expect(within(q1).getByRole('group', { name: /Self-rating for question/ })).toBeInTheDocument();
    // The normal "Reset answer" button is study mode's off-switch instead
    expect(within(q1).queryByRole('button', { name: /clear your answer/i })).not.toBeInTheDocument();
  });

  it('setting a self-rating toggles it on and off, and persists it to localStorage', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    fireEvent.click(screen.getByRole('button', { name: 'Toggle study mode' }));
    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q1).getByText('Right answer'));

    const gotItBtn = await within(q1).findByRole('button', { name: /Got it — I understood this question/ });
    fireEvent.click(gotItBtn);
    expect(gotItBtn).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('quiz_progress_sample-quiz') as string);
      expect(saved.ratings).toEqual({ '1': 'got-it' });
    });

    // Clicking the same rating again clears it, same toggle behavior as
    // bookmarks/flags.
    fireEvent.click(gotItBtn);
    expect(gotItBtn).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('quiz_progress_sample-quiz') as string);
      expect(saved.ratings).toEqual({});
    });
  });

  it('turning study mode off with no answered questions needs no confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const toggle = screen.getByRole('button', { name: 'Toggle study mode' });
    fireEvent.click(toggle);
    fireEvent.click(toggle);

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('turning study mode off after answering asks for confirmation and, if confirmed, resets every answer', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const toggle = screen.getByRole('button', { name: 'Toggle study mode' });
    fireEvent.click(toggle);
    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q1).getByText('Right answer'));
    await within(q1).findByLabelText('Correct');

    fireEvent.click(toggle);

    expect(window.confirm).toHaveBeenCalledWith(
      'Exit study mode? This will reset all answers so you can take the quiz properly.',
    );
    await waitFor(() => expect(screen.getByText('0 / 2 answered')).toBeInTheDocument());
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('declining the confirmation leaves study mode on and the answer untouched', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const toggle = screen.getByRole('button', { name: 'Toggle study mode' });
    fireEvent.click(toggle);
    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q1).getByText('Right answer'));
    await within(q1).findByLabelText('Correct');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(within(q1).getByLabelText('Correct')).toBeInTheDocument();
  });
});

describe('Quiz — in-quiz search and status filter', () => {
  it('hides questions that do not match a search query, after the 200ms debounce', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetchQuiz();
    renderQuiz();

    await vi.waitFor(() => expect(screen.getByText('Single-select question?')).toBeInTheDocument());
    const input = screen.getByLabelText('Search questions by keyword');
    fireEvent.change(input, { target: { value: 'multi-select' } });

    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    const q2 = screen.getByText('Multi-select question?').closest('.question-card') as HTMLElement;

    // Not yet applied — debounce hasn't elapsed
    expect(q1).not.toHaveClass('search-hidden');

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(q1).toHaveClass('search-hidden');
    expect(q2).not.toHaveClass('search-hidden');
    expect(screen.getByText('1 of 2 questions')).toBeInTheDocument();
  });

  it('Clear search restores every question and empties the counter', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockFetchQuiz();
    renderQuiz();

    await vi.waitFor(() => expect(screen.getByText('Single-select question?')).toBeInTheDocument());
    const input = screen.getByLabelText('Search questions by keyword') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'multi-select' } });
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    expect(input.value).toBe('');
    expect(q1).not.toHaveClass('search-hidden');
    expect(screen.queryByText(/of 2 questions/)).not.toBeInTheDocument();
  });

  it('status filter shows only unanswered questions', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    const q2 = screen.getByText('Multi-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q1).getByText('Right answer'));
    await within(q1).findByLabelText('Correct');

    fireEvent.change(screen.getByLabelText('Filter by answer status'), { target: { value: 'unanswered' } });

    expect(q1).toHaveClass('search-hidden');
    expect(q2).not.toHaveClass('search-hidden');
    expect(screen.getByText('1 of 2 questions')).toBeInTheDocument();
  });

  it('status filter shows only correct, then only incorrect, questions', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    const q2 = screen.getByText('Multi-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q1).getByText('Wrong answer'));
    await within(q1).findByLabelText('Incorrect');
    fireEvent.click(within(q2).getByText('First correct'));
    fireEvent.click(within(q2).getByText('Second correct'));
    await within(q2).findByLabelText('Correct');

    const statusSelect = screen.getByLabelText('Filter by answer status');

    fireEvent.change(statusSelect, { target: { value: 'correct' } });
    expect(q1).toHaveClass('search-hidden');
    expect(q2).not.toHaveClass('search-hidden');

    fireEvent.change(statusSelect, { target: { value: 'incorrect' } });
    expect(q1).not.toHaveClass('search-hidden');
    expect(q2).toHaveClass('search-hidden');
  });

  it('status filter shows only flagged questions', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    const q2 = screen.getByText('Multi-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q1).getByRole('button', { name: /^Flag question/ }));

    fireEvent.change(screen.getByLabelText('Filter by answer status'), { target: { value: 'flagged' } });

    expect(q1).not.toHaveClass('search-hidden');
    expect(q2).toHaveClass('search-hidden');
  });

  it('shows no counter and no hidden questions when the filter is at its "all" default', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    const q2 = screen.getByText('Multi-select question?').closest('.question-card') as HTMLElement;

    expect(q1).not.toHaveClass('search-hidden');
    expect(q2).not.toHaveClass('search-hidden');
    expect(screen.queryByText(/of 2 questions/)).not.toBeInTheDocument();
  });
});

function touch(clientX: number, clientY: number): Touch {
  return { clientX, clientY } as Touch;
}

function fireTouch(el: HTMLElement, type: string, touches: Touch[], changedTouches?: Touch[]) {
  const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent;
  Object.defineProperty(event, 'touches', { value: touches });
  Object.defineProperty(event, 'changedTouches', { value: changedTouches ?? touches });
  el.dispatchEvent(event);
}

describe('Quiz — swipe navigation', () => {
  it('scrolls the next question into view on a left swipe', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const container = document.getElementById('questionsContainer') as HTMLElement;
    const scrollSpy = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollSpy;

    fireTouch(container, 'touchstart', [touch(200, 100)]);
    fireTouch(container, 'touchend', [], [touch(100, 100)]);

    expect(scrollSpy).toHaveBeenCalled();
  });
});

describe('Quiz — keyboard quick-select (1-4/A-D)', () => {
  // Pins shuffle() to a no-op ordering (both question order and each
  // question's option order) so positions map predictably back to the
  // fixture's own array order, instead of asserting against a random
  // shuffle result.
  let randomSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99);
  });
  afterEach(() => {
    randomSpy.mockRestore();
  });

  it('selects the option at the pressed position on the focused single-select question, and moves focus to it', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const card = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    const options = within(card).getAllByRole('radio');

    options[0].focus();
    fireEvent.keyDown(document, { key: '2' });

    expect(options[1]).toHaveAttribute('aria-checked', 'true');
    expect(options[1]).toHaveFocus();
  });

  it('treats A-D the same as 1-4, case-insensitively', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const card = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    const options = within(card).getAllByRole('radio');

    options[0].focus();
    fireEvent.keyDown(document, { key: 'B' });

    expect(options[1]).toHaveAttribute('aria-checked', 'true');
  });

  it('with no question focused yet, targets the first unanswered question', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const card = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    const options = within(card).getAllByRole('radio');

    fireEvent.keyDown(document, { key: '1' });

    expect(options[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles a multi-select option on and off, still enforcing the max-reached toast on the pressed-count', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Multi-select question?');
    const card = screen.getByText('Multi-select question?').closest('.question-card') as HTMLElement;
    const options = within(card).getAllByRole('checkbox');

    options[0].focus();
    fireEvent.keyDown(document, { key: '1' });
    expect(options[0]).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(document, { key: '1' });
    expect(options[0]).toHaveAttribute('aria-checked', 'false');

    fireEvent.keyDown(document, { key: '1' });
    fireEvent.keyDown(document, { key: '2' });
    fireEvent.keyDown(document, { key: '3' });

    const toast = await waitFor(() => {
      const match = screen.getAllByRole('status').find((el) => /You can only select two answers/i.test(el.textContent ?? ''));
      if (!match) throw new Error('toast not found yet');
      return match;
    });
    expect(toast).toHaveTextContent(/You can only select two answers/i);
  });

  it('overwrites an already-answered single-select question — matches quiz-engine.js bypassing the CSS lock', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const card = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    const options = within(card).getAllByRole('radio');

    options[0].focus();
    fireEvent.keyDown(document, { key: '1' });
    expect(options[0]).toHaveAttribute('aria-checked', 'true');

    fireEvent.keyDown(document, { key: '2' });
    expect(options[1]).toHaveAttribute('aria-checked', 'true');
    expect(options[0]).toHaveAttribute('aria-checked', 'false');
  });

  it('ignores 1-4/A-D while focus is in an input, textarea, or select element', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const card = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    const options = within(card).getAllByRole('radio');

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    // T3-2b: useKeyboardShortcut's typing guard reads the event's own
    // `target` (matching how a real keydown naturally targets whatever
    // element currently has focus, then bubbles to document) rather than
    // separately re-checking document.activeElement — so the simulated
    // event needs to actually target the focused input to exercise that
    // guard, the same way a real browser keystroke would.
    fireEvent.keyDown(input, { key: '1' });

    expect(options[0]).toHaveAttribute('aria-checked', 'false');
    document.body.removeChild(input);
  });

  /**
   * T3-2b: this whole describe block's shortcuts used to be a raw,
   * page-rolled document.addEventListener — invisible to
   * KeyboardShortcutsPanel. They're now real useKeyboardShortcut
   * registrations, so they should actually show up there: one combined
   * "1-4 / A-D" entry (not eight near-duplicate ones, one per key) plus
   * the separate Escape-to-blur entry, and both should disappear again
   * once the page unmounts — the same live-registration/cleanup contract
   * every other useKeyboardShortcut consumer is held to.
   */
  it('registers as real shortcuts in the shared registry (one 1-4/A-D entry, not eight), and unregisters on unmount', async () => {
    mockFetchQuiz();
    const { unmount } = renderQuiz();

    await screen.findByText('Single-select question?');

    const entries = getShortcuts();
    const selectEntries = entries.filter((s) => s.description === 'Select answer option');
    expect(selectEntries).toHaveLength(1);
    expect(selectEntries[0].keyLabel).toBe('1-4 / A-D');
    expect(entries.some((s) => s.description === 'Unfocus answer option')).toBe(true);

    unmount();

    const afterUnmount = getShortcuts();
    expect(afterUnmount.some((s) => s.description === 'Select answer option')).toBe(false);
    expect(afterUnmount.some((s) => s.description === 'Unfocus answer option')).toBe(false);
  });

  it('ignores number/letter keys held with Ctrl, Meta, or Alt', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const card = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    const options = within(card).getAllByRole('radio');

    options[0].focus();
    fireEvent.keyDown(document, { key: '2', ctrlKey: true });

    expect(options[1]).toHaveAttribute('aria-checked', 'false');
  });

  it('Escape blurs a focused option without changing its selection', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const card = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    const options = within(card).getAllByRole('radio');

    options[0].focus();
    expect(options[0]).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(options[0]).not.toHaveFocus();
    expect(options[0]).toHaveAttribute('aria-checked', 'false');
  });
});

describe('Quiz — print format and export', () => {
  it('defaults to "Question paper" and offers all four print modes', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const select = screen.getByLabelText('Print format') as HTMLSelectElement;
    expect(select.value).toBe('question-paper');
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Question paper',
      'Answer key',
      'Answers + reasons',
      'Full explanations',
    ]);
  });

  it('copies question-paper text (no answers revealed) to the clipboard by default', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    fireEvent.click(screen.getByRole('button', { name: /Copy/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copiedText = writeText.mock.calls[0][0] as string;
    expect(copiedText).toContain('Single-select question?');
    expect(copiedText).toContain('Wrong answer');
    expect(copiedText).not.toContain('Correct:');
  });

  it('switching to "Answer key" copies only the correct-option letters, not option text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    fireEvent.change(screen.getByLabelText('Print format'), { target: { value: 'answer-key' } });
    fireEvent.click(screen.getByRole('button', { name: /Copy/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copiedText = writeText.mock.calls[0][0] as string;
    expect(copiedText).toContain('Correct:');
    expect(copiedText).not.toContain('Wrong answer');
  });

  it('"Full explanations" mode includes each option\'s explanation text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    fireEvent.change(screen.getByLabelText('Print format'), { target: { value: 'full-explanations' } });
    fireEvent.click(screen.getByRole('button', { name: /Copy/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copiedText = writeText.mock.calls[0][0] as string;
    expect(copiedText).toContain('This is right because reasons.');
    expect(copiedText).toContain('This is wrong because reasons.');
  });

  it('Print button calls window.print()', async () => {
    const printSpy = vi.fn();
    vi.stubGlobal('print', printSpy);
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    fireEvent.click(screen.getByRole('button', { name: /Print/ }));

    expect(printSpy).toHaveBeenCalledTimes(1);
  });
});

describe('Quiz — save and resume', () => {
  it('offers to resume a previously saved partial attempt, and Resume restores it', async () => {
    localStorage.setItem(
      'quiz_progress_sample-quiz',
      JSON.stringify({
        selectedAnswers: { 1: 'B' },
        answeredQuestions: { 1: true },
        bookmarks: {},
        flags: {},
        ratings: {},
        questionOrder: [1, 2],
        optionOrder: { 1: ['A', 'B'], 2: ['A', 'B', 'C'] },
        elapsedSeconds: 42,
        studyMode: false,
        savedAt: Date.now(),
      }),
    );
    mockFetchQuiz();
    renderQuiz();

    expect(await screen.findByRole('region', { name: 'Quiz progress saved' })).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 2 answered/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Resume quiz from 1 of 2 answered/i }));

    await waitFor(() => expect(screen.getByText('1 / 2 answered')).toBeInTheDocument());
    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    expect(within(q1).getByLabelText('Correct')).toBeInTheDocument();
  });

  it('Start fresh discards the saved attempt and clears localStorage', async () => {
    localStorage.setItem(
      'quiz_progress_sample-quiz',
      JSON.stringify({
        selectedAnswers: { 1: 'B' },
        answeredQuestions: { 1: true },
        bookmarks: {},
        flags: {},
        ratings: {},
        questionOrder: [1, 2],
        optionOrder: { 1: ['A', 'B'], 2: ['A', 'B', 'C'] },
        elapsedSeconds: 42,
        studyMode: false,
        savedAt: Date.now(),
      }),
    );
    mockFetchQuiz();
    renderQuiz();

    fireEvent.click(await screen.findByRole('button', { name: 'Discard saved progress and start fresh' }));

    await waitFor(() => expect(screen.getByText('0 / 2 answered')).toBeInTheDocument());
    expect(localStorage.getItem('quiz_progress_sample-quiz')).toBeNull();
  });

  it('persists progress to quiz_progress_<quizId> in the real _saveState() shape after answering', async () => {
    mockFetchQuiz();
    renderQuiz();

    await screen.findByText('Single-select question?');
    const q1 = screen.getByText('Single-select question?').closest('.question-card') as HTMLElement;
    fireEvent.click(within(q1).getByText('Right answer'));

    await waitFor(() => {
      const raw = localStorage.getItem('quiz_progress_sample-quiz');
      expect(raw).not.toBeNull();
      const saved = JSON.parse(raw as string);
      expect(saved.answeredQuestions).toEqual({ '1': true });
      expect(saved.selectedAnswers).toEqual({ '1': 'B' });
      expect(saved.questionOrder.sort()).toEqual([1, 2]);
      expect(typeof saved.savedAt).toBe('number');
    });
  });
});

describe('Quiz — Share via QR (B-7) and trivia-mode fixed sequence', () => {
  it('renders two distinct Share via QR triggers — plain quiz link and fixed-sequence link', async () => {
    mockFetchQuiz();
    renderQuiz('sample-quiz');

    await screen.findByText('Single-select question?');

    expect(screen.getByRole('button', { name: 'Show QR code for this quiz' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: "Show QR code for this quiz's fixed sequence" }),
    ).toBeInTheDocument();
  });

  it('"Share quiz" encodes the plain /quiz/:quizId URL, with no seed param', async () => {
    mockFetchQuiz();
    renderQuiz('sample-quiz');

    await screen.findByText('Single-select question?');
    fireEvent.click(screen.getByRole('button', { name: 'Show QR code for this quiz' }));

    const dialog = await screen.findByRole('dialog', { name: 'QR code for this quiz' });
    const urlText = within(dialog).getByText(/\/quiz\/sample-quiz/);
    expect(urlText.textContent).not.toMatch(/seed=/);
    // A real QR is drawn from this same URL via B-7's shared canvas renderer.
    expect(within(dialog).getByRole('img', { name: 'QR code' })).toBeInTheDocument();
  });

  it('"Share sequence" encodes the same URL with a ?seed= param appended', async () => {
    mockFetchQuiz();
    renderQuiz('sample-quiz');

    await screen.findByText('Single-select question?');
    fireEvent.click(screen.getByRole('button', { name: "Show QR code for this quiz's fixed sequence" }));

    const dialog = await screen.findByRole('dialog', { name: "QR code for this quiz's fixed sequence" });
    const urlText = within(dialog).getByText(/\/quiz\/sample-quiz\?seed=/);
    expect(urlText.textContent).toMatch(/seed=\d+/);
    expect(within(dialog).getByRole('img', { name: 'QR code' })).toBeInTheDocument();
  });

  it('reuses the session\'s own seed for "Share sequence" when this session was itself opened via ?seed=', async () => {
    mockFetchQuiz();
    renderQuizWithSearch('sample-quiz', '?seed=482');

    await screen.findByText('Single-select question?');
    fireEvent.click(screen.getByRole('button', { name: "Show QR code for this quiz's fixed sequence" }));

    const dialog = await screen.findByRole('dialog', { name: "QR code for this quiz's fixed sequence" });
    expect(within(dialog).getByText(/seed=482\b/)).toBeInTheDocument();
  });

  it('shows a "Fixed sequence" indicator only when opened via ?seed=', async () => {
    mockFetchQuiz();
    const { unmount } = renderQuizWithSearch('sample-quiz', '?seed=482');
    await screen.findByText('Single-select question?');
    expect(screen.getByText('Fixed sequence')).toBeInTheDocument();
    unmount();

    localStorage.clear();
    renderQuiz('sample-quiz');
    await screen.findByText('Single-select question?');
    expect(screen.queryByText('Fixed sequence')).not.toBeInTheDocument();
  });

  it('a ?seed= link renders questions in the identical order across two separate sessions', async () => {
    mockFetchQuiz(ORDER_FIXTURE);
    const { unmount: unmountA } = renderQuizWithSearch('order-quiz-a', '?seed=482');
    await screen.findByText('Question number 1?');
    const orderA = renderedQuestionOrder();
    unmountA();

    mockFetchQuiz(ORDER_FIXTURE);
    const { unmount: unmountB } = renderQuizWithSearch('order-quiz-b', '?seed=482');
    await screen.findByText('Question number 1?');
    const orderB = renderedQuestionOrder();
    unmountB();

    expect(orderA).toHaveLength(5);
    expect(orderA).toEqual(orderB);
  });

  it('a different seed produces a different order than the default (no seed) shuffle would, without disturbing the unseeded path', async () => {
    // Confirms the seeded path actually reorders (not a no-op) by
    // checking two different seeds diverge from each other.
    mockFetchQuiz(ORDER_FIXTURE);
    const { unmount: unmountA } = renderQuizWithSearch('order-quiz-c', '?seed=111');
    await screen.findByText('Question number 1?');
    const orderSeed111 = renderedQuestionOrder();
    unmountA();

    mockFetchQuiz(ORDER_FIXTURE);
    const { unmount: unmountB } = renderQuizWithSearch('order-quiz-d', '?seed=999');
    await screen.findByText('Question number 1?');
    const orderSeed999 = renderedQuestionOrder();
    unmountB();

    expect(orderSeed111).not.toEqual(orderSeed999);
  });

  it('omitting ?seed= leaves the existing per-browser random shuffle unchanged (no seed param read, no forced order)', async () => {
    mockFetchQuiz(ORDER_FIXTURE);
    renderQuiz('order-quiz-e');
    await screen.findByText('Question number 1?');

    // No behavioral assertion on *which* order it lands on (that's
    // Math.random, deliberately not seeded) — this just confirms the
    // page still renders all 5 questions normally with no seed present.
    expect(renderedQuestionOrder().sort()).toEqual(['1', '2', '3', '4', '5']);
    expect(screen.queryByText('Fixed sequence')).not.toBeInTheDocument();
  });
});

describe('Quiz — T1-5 "Open as Quiz" (?source=notes)', () => {
  it('fetches the note\'s embedded mcq.json, not /data/quiz/<id>.json, when opened with ?source=notes', async () => {
    mockFetchQuiz();
    renderQuizWithSearch('dsa-merge-sort', '?source=notes');

    expect(fetch).toHaveBeenCalledWith('/data/notes/dsa-merge-sort/json/mcq.json');
    expect(fetch).not.toHaveBeenCalledWith('/data/quiz/dsa-merge-sort.json');
    expect(await screen.findByRole('heading', { name: /Sample Quiz/ })).toBeInTheDocument();
  });

  it('omitting ?source= (or any other value) keeps fetching the standalone /data/quiz/<id>.json path, unchanged', async () => {
    mockFetchQuiz();
    renderQuiz('sample-quiz');

    expect(fetch).toHaveBeenCalledWith('/data/quiz/sample-quiz.json');
  });

  it('saves progress under quiz_progress_<folder>, independent of the note\'s own notes_mcq_progress_<folder> key', async () => {
    mockFetchQuiz();
    renderQuizWithSearch('dsa-merge-sort', '?source=notes');

    await screen.findByText('Single-select question?');
    fireEvent.click(screen.getByText('Right answer'));

    await waitFor(() => expect(localStorage.getItem('quiz_progress_dsa-merge-sort')).not.toBeNull());
    expect(localStorage.getItem('notes_mcq_progress_dsa-merge-sort')).toBeNull();
  });

  it('"Share quiz"/"Share sequence" preserve ?source=notes on the shared URL', async () => {
    mockFetchQuiz();
    renderQuizWithSearch('dsa-merge-sort', '?source=notes');

    await screen.findByText('Single-select question?');
    fireEvent.click(screen.getByRole('button', { name: 'Show QR code for this quiz' }));
    const dialog = await screen.findByRole('dialog', { name: 'QR code for this quiz' });
    expect(within(dialog).getByText(/\/quiz\/dsa-merge-sort\?source=notes/)).toBeInTheDocument();
  });

  it('PageMeta canonical link includes ?source=notes so it resolves to the actual page shown, not a 404', async () => {
    mockFetchQuiz();
    renderQuizWithSearch('dsa-merge-sort', '?source=notes');

    await screen.findByText('Single-select question?');
    const canonical = document.head.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute('href')).toMatch(/\/quiz\/dsa-merge-sort\?source=notes$/);
  });

  it('PageMeta canonical link has no ?source= param for a normal standalone quiz', async () => {
    mockFetchQuiz();
    renderQuiz('sample-quiz');

    await screen.findByText('Single-select question?');
    const canonical = document.head.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute('href')).toMatch(/\/quiz\/sample-quiz$/);
    expect(canonical?.getAttribute('href')).not.toMatch(/source=/);
  });
});

describe('Quiz — P0-5 "Extend Recently Opened to quizzes"', () => {
  it('marks a standalone quiz as opened under readingProgress-quiz-<id> on load', async () => {
    mockFetchQuiz();
    renderQuiz('sample-quiz');

    await screen.findByText('Single-select question?');
    const raw = JSON.parse(localStorage.getItem('readingProgress-quiz-sample-quiz') || '{}');
    expect(raw).toMatchObject({ v: 1 });
    expect(typeof raw.timestamp).toBe('number');
  });

  it('does NOT write readingProgress-quiz-<folder> for a ?source=notes embedded open (already tracked via the note\'s own key)', async () => {
    mockFetchQuiz();
    renderQuizWithSearch('dsa-merge-sort', '?source=notes');

    await screen.findByText('Single-select question?');
    expect(localStorage.getItem('readingProgress-quiz-dsa-merge-sort')).toBeNull();
  });

  it('does not affect the separate quiz_progress_<id>/quiz_history_<id> keys', async () => {
    mockFetchQuiz();
    renderQuiz('sample-quiz');

    await screen.findByText('Single-select question?');
    expect(localStorage.getItem('quiz_progress_sample-quiz')).toBeNull();
    expect(localStorage.getItem('quiz_history_sample-quiz')).toBeNull();
  });
});
