import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { VisualMcqModule } from './VisualMcqModule';

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
        { id: 'a', text: 'Computes the midpoint', isCorrect: true, explanation: { why: 'Standard binary split.' } },
        { id: 'b', text: 'Swaps two elements', isCorrect: false, explanation: { why: 'No swap happens here.' } },
      ],
    },
  ],
};

function mockFetch(payload: unknown = VISUAL_MCQ_FIXTURE, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => (ok ? Promise.resolve({ ok: true, json: () => Promise.resolve(payload) }) : Promise.resolve({ ok: false, status: 404 }))),
  );
}

describe('VisualMcqModule', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('renders each question via QuestionCard with its sub-type label and code snippet (extraContent slot)', async () => {
    mockFetch();
    render(<VisualMcqModule folder="dsa-merge-sort" />);
    expect(await screen.findByText('What does the highlighted line do?')).toBeInTheDocument();
    expect(screen.getByText('Trace the execution')).toBeInTheDocument();
    expect(screen.getByText('mid = (lo + hi) // 2')).toBeInTheDocument();
  });

  it('tracks answered progress independently of the plain MCQ module (own storage key)', async () => {
    mockFetch();
    render(<VisualMcqModule folder="dsa-merge-sort" />);
    await screen.findByText('What does the highlighted line do?');
    expect(screen.getByText('0 / 1 answered')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Computes the midpoint'));
    await waitFor(() => expect(screen.getByText('1 / 1 answered')).toBeInTheDocument());

    const saved = JSON.parse(localStorage.getItem('visual_mcq_progress_dsa-merge-sort') || '{}');
    expect(saved.answered['1']).toBe(true);
    // Confirms it's a distinct key from the plain MCQ module's own progress.
    expect(localStorage.getItem('notes_mcq_progress_dsa-merge-sort')).toBeNull();
  });

  it('renders nothing when the note has no visual-mcq.json', async () => {
    mockFetch(null, false);
    const { container } = render(<VisualMcqModule folder="dsa-merge-sort" />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
