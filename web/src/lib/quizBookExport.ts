/**
 * lib/quizBookExport.ts — E0-2's Quiz Book variant.
 *
 * Manual test #2 (E0-2's own ticket text) is specific: "question →
 * page break → answer key structure." That's a per-quiz layout
 * decision, not a per-question one -- so each quiz becomes one EPUB
 * chapter shaped as: every question + its options (no answer marked),
 * then a real CSS page-break, then a dedicated Answer Key section
 * listing the correct option(s) and each option's `explanation.why`
 * for that question. A reader can work through the whole quiz before
 * the page-turn reveals answers, matching how a real practice-exam
 * book is laid out -- not interleaving question/answer pairs the way
 * the live Quiz page does turn-by-turn.
 *
 * Reuses the exact `QuizData`/`QuizQuestion` shape every other quiz
 * consumer in this codebase already reads (pages/Quiz/types.ts,
 * re-exporting components/QuestionCard/types.ts's T5-2-unified schema)
 * -- no second quiz-content type introduced here.
 */

import { dataPath } from './siteConfig';
import { buildEpub, escapeXml, type EpubChapter } from './epubBook';
import { triggerDownload } from './exportAs';
import { slugify } from './exportAs';
import type { QuizData, QuizQuestion } from '../pages/Quiz/types';

interface QuizIndexEntry {
  title: string;
  file: string;
  topic: string;
}

interface QuizIndexData {
  Quizzes: QuizIndexEntry[];
}

function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

function questionsSectionHtml(questions: QuizQuestion[]): string {
  return questions
    .map((q, qi) => {
      const options = q.options
        .map((opt, oi) => `<li>${optionLetter(oi)}. ${escapeXml(opt.text)}</li>`)
        .join('\n');
      return `<div class="quiz-question">
  <h3>Question ${qi + 1}</h3>
  <p>${escapeXml(q.question)}</p>
  <ol type="A">
${options}
  </ol>
</div>`;
    })
    .join('\n');
}

function answerKeyHtml(questions: QuizQuestion[]): string {
  const rows = questions
    .map((q, qi) => {
      const correct = q.options
        .map((opt, oi) => ({ opt, letter: optionLetter(oi) }))
        .filter(({ opt }) => opt.isCorrect);
      const correctLetters = correct.map(({ letter }) => letter).join(', ');
      const explanations = correct
        .map(({ opt, letter }) =>
          opt.explanation?.why
            ? `<p><strong>${letter}.</strong> ${escapeXml(opt.explanation.why)}</p>`
            : '',
        )
        .filter(Boolean)
        .join('\n');
      return `<div class="quiz-answer">
  <h4>Question ${qi + 1}: <span class="answer-correct">${escapeXml(correctLetters)}</span></h4>
  ${explanations}
</div>`;
    })
    .join('\n');
  return `<h2>Answer Key</h2>\n${rows}`;
}

function quizChapter(quiz: QuizData, chapterId: string): EpubChapter {
  return {
    id: chapterId,
    title: quiz.title,
    bodyHtml: `<h1>${escapeXml(quiz.title)}</h1>
<h2>Questions</h2>
${questionsSectionHtml(quiz.questions)}
<div class="page-break"></div>
${answerKeyHtml(quiz.questions)}`,
  };
}

/** Fetches quiz-index.json, then every listed quiz's real JSON, and
 * assembles one Quiz Book EPUB covering all of them -- "the" Quiz
 * Book, not a per-quiz picker, since the ticket text describes a
 * single variant rather than a selection UI of its own (Export.tsx's
 * scope/format controls are for the note-content export paths;
 * Quiz Book and Revision Book are each a single one-click action). A
 * quiz that fails to fetch (missing/malformed file) is skipped with
 * its title still recorded, rather than aborting the whole book over
 * one bad file -- same "flag, don't silently fail the entire export"
 * discipline notebookExport.ts follows for the same class of problem. */
export async function exportQuizBook(): Promise<{ skipped: string[] }> {
  const indexRes = await fetch(dataPath('index', 'quiz-index.json'));
  if (!indexRes.ok) throw new Error('Could not load the quiz index.');
  const index: QuizIndexData = await indexRes.json();

  const chapters: EpubChapter[] = [];
  const skipped: string[] = [];

  for (const entry of index.Quizzes) {
    try {
      const res = await fetch(dataPath('quiz', `${entry.file}.json`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const quiz: QuizData = await res.json();
      if (!quiz.questions?.length) throw new Error('no questions');
      chapters.push(quizChapter(quiz, entry.file));
    } catch {
      skipped.push(entry.title);
    }
  }

  if (chapters.length === 0) {
    throw new Error('No quizzes could be loaded to build the Quiz Book.');
  }

  const blob = await buildEpub({ title: 'Notebook Buddy — Quiz Book', chapters });
  triggerDownload(blob, `${slugify('quiz-book')}.epub`);
  return { skipped };
}
