import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import JSZip from 'jszip';
import { exportQuizBook } from './quizBookExport';

const QUIZ_INDEX = {
  Quizzes: [
    { title: 'Networking Basics', file: 'networking-basics', topic: 'Networking' },
    { title: 'Broken Quiz', file: 'broken-quiz', topic: 'Networking' },
  ],
};

const QUIZ_DATA: Record<string, unknown> = {
  'networking-basics': {
    title: 'Networking Basics',
    topic: 'Networking',
    questions: [
      {
        id: 1,
        question: 'Which protocol is connectionless?',
        options: [
          { id: 'A', text: 'TCP', isCorrect: false, explanation: { why: 'TCP is connection-oriented.' } },
          { id: 'B', text: 'UDP', isCorrect: true, explanation: { why: 'UDP has no handshake.' } },
        ],
      },
    ],
  },
};

function mockFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/data/index/quiz-index.json') {
        return Promise.resolve({ ok: true, json: async () => QUIZ_INDEX });
      }
      const match = url.match(/\/data\/quiz\/([^/]+)\.json/);
      if (match) {
        const file = match[1];
        if (QUIZ_DATA[file]) return Promise.resolve({ ok: true, json: async () => QUIZ_DATA[file] });
        return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
      }
      return Promise.reject(new Error(`unexpected fetch in test: ${url}`));
    }),
  );
}

describe('lib/quizBookExport', () => {
  beforeEach(() => {
    mockFetch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('skips a quiz whose file fails to load, without aborting the whole book', async () => {
    let capturedBlob: Blob | null = null;
    vi.stubGlobal('URL', class extends URL {
      static override createObjectURL = vi.fn((b: Blob) => {
        capturedBlob = b;
        return 'blob:mock-url';
      });
      static override revokeObjectURL = vi.fn();
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const { skipped } = await exportQuizBook();
    expect(skipped).toEqual(['Broken Quiz']);
    expect(capturedBlob).not.toBeNull();
  });

  it('lays out each quiz as questions, then a page break, then a real answer key', async () => {
    let capturedBlob: Blob | null = null;
    vi.stubGlobal('URL', class extends URL {
      static override createObjectURL = vi.fn((b: Blob) => {
        capturedBlob = b;
        return 'blob:mock-url';
      });
      static override revokeObjectURL = vi.fn();
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    await exportQuizBook();
    const zip = await JSZip.loadAsync(await (capturedBlob as unknown as Blob).arrayBuffer());
    const chapter = await zip.file('OEBPS/networking-basics.xhtml')!.async('string');

    const questionIndex = chapter.indexOf('Which protocol is connectionless?');
    const pageBreakIndex = chapter.indexOf('class="page-break"');
    const answerKeyIndex = chapter.indexOf('Answer Key');
    const explanationIndex = chapter.indexOf('UDP has no handshake');

    expect(questionIndex).toBeGreaterThanOrEqual(0);
    expect(pageBreakIndex).toBeGreaterThan(questionIndex);
    expect(answerKeyIndex).toBeGreaterThan(pageBreakIndex);
    expect(explanationIndex).toBeGreaterThan(answerKeyIndex);

    // Correct answer letter (B) appears in the answer key, and the
    // wrong option's own explanation is NOT included there.
    const answerKeySection = chapter.slice(answerKeyIndex);
    expect(answerKeySection).toContain('B');
    expect(answerKeySection).not.toContain('TCP is connection-oriented');
  });

  it('throws when the quiz index has nothing loadable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/data/index/quiz-index.json') {
          return Promise.resolve({ ok: true, json: async () => ({ Quizzes: [{ title: 'X', file: 'x', topic: 'Y' }] }) });
        }
        return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
      }),
    );
    await expect(exportQuizBook()).rejects.toThrow();
  });
});
