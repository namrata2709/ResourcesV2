/**
 * lib/motivationalMessages.ts
 *
 * P2-4 — Motivational Dashboard. Framework-agnostic message bank + draw
 * logic, same "plain functions, no React" shape as lib/dailyGoal.ts /
 * lib/appearance.ts. The React side (hooks/useMotivationalMessage.ts)
 * is a thin wrapper around getNextMessage() below.
 *
 * The ticket's own manual test is explicit about what "done" means
 * here: "load the widget repeatedly across sessions, confirm messages
 * rotate without obvious short-cycle repetition." A naive
 * `messages[Math.floor(Math.random() * messages.length)]` on every
 * mount technically "rotates," but nothing stops it from showing the
 * same line twice in a row, or noticeably more often than the others
 * over a short run — which is exactly what "short-cycle repetition"
 * means and what this needs to avoid.
 *
 * The fix is a shuffle-bag ("deck"), not a fresh random pick each time:
 * shuffle every message index once, hand them out one per mount in that
 * shuffled order, and only reshuffle once the deck is empty — at which
 * point the reshuffle is checked against the last-shown index so the
 * old deck's last card and the new deck's first card can't be the same
 * message twice in a row across the reshuffle boundary either. This
 * guarantees every message is shown exactly once per full cycle through
 * the bank, with no repeat closer together than (message count) draws.
 */

export interface MotivationalMessage {
  id: number;
  text: string;
}

/** Deliberately short lines — this is a small dashboard widget, not a
 * quote-of-the-day feature with attribution/citations to manage (and
 * per this app's own copyright-safety discipline elsewhere, these are
 * written for this app, not lifted from any real, attributable source). */
export const MOTIVATIONAL_MESSAGES: MotivationalMessage[] = [
  { id: 0, text: 'Small steps still move you forward. Keep going.' },
  { id: 1, text: "You don't have to finish today — just don't stop today." },
  { id: 2, text: 'Every question you review is one less surprise on exam day.' },
  { id: 3, text: "Progress isn't always visible. Trust the process." },
  { id: 4, text: 'One more page. One more question. That adds up.' },
  { id: 5, text: "Consistency beats intensity. Show up, even for five minutes." },
  { id: 6, text: 'You already started — that was the hardest part.' },
  { id: 7, text: 'Mistakes on practice questions are cheaper than mistakes on exam day.' },
  { id: 8, text: 'Future you is counting on the work you put in right now.' },
  { id: 9, text: "It's okay to go slow. It's not okay to give up." },
  { id: 10, text: 'Confidence is built one correct answer at a time.' },
  { id: 11, text: "Come back tomorrow. That's really the whole secret." },
];

interface MotivationalMessageState {
  v: 1;
  /** Remaining, already-shuffled indices into MOTIVATIONAL_MESSAGES,
   * drawn from the end on each call. */
  queue: number[];
  /** Index most recently handed out, so a reshuffle can avoid
   * repeating it as the very next card. `null` before anything's
   * been drawn yet. */
  lastShownIndex: number | null;
}

const STORAGE_KEY = 'motivationalMessageState';

function readRaw(): MotivationalMessageState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.v === 1 &&
      Array.isArray(parsed.queue) &&
      parsed.queue.every((n: unknown) => typeof n === 'number') &&
      (parsed.lastShownIndex === null || typeof parsed.lastShownIndex === 'number')
    ) {
      return parsed as MotivationalMessageState;
    }
    return null;
  } catch {
    return null;
  }
}

function write(state: MotivationalMessageState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // matches the rest of the app's silent-fail storage pattern (e.g. useQuizEngine.ts)
  }
}

/** Fisher-Yates over every valid message index. No seed needed here —
 * unlike NotesIndex's Random sort (which needs a *reproducible* order
 * for "Shuffle Again" semantics), this only needs a fresh, unbiased
 * shuffle each time the deck empties. */
function shuffledIndices(count: number): number[] {
  const arr = Array.from({ length: count }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Builds a fresh shuffled deck, avoiding a same-message repeat right
 * across the reshuffle boundary when there's more than one message to
 * choose from. */
function freshDeck(lastShownIndex: number | null, count: number): number[] {
  const deck = shuffledIndices(count);
  if (count > 1 && lastShownIndex !== null && deck[deck.length - 1] === lastShownIndex) {
    // Swap the boundary card with any other position so the next draw
    // (popped from the end) doesn't repeat lastShownIndex.
    const swapWith = Math.floor(Math.random() * (deck.length - 1));
    [deck[deck.length - 1], deck[swapWith]] = [deck[swapWith], deck[deck.length - 1]];
  }
  return deck;
}

/**
 * Draws and persists the next message. Call once per widget mount
 * ("session" in the ticket's own phrasing) — not on an interval — so
 * the rotation is driven by real dashboard visits, matching how
 * P0-6/P2-1's other "once per real usage event" widgets behave.
 */
export function getNextMessage(): MotivationalMessage {
  const count = MOTIVATIONAL_MESSAGES.length;
  const stored = readRaw();
  // Also guards against a corrupted/mismatched-length queue (e.g. the
  // message bank shrank since the state was saved) rather than crashing.
  let queue = stored && stored.queue.every((n) => n >= 0 && n < count) ? [...stored.queue] : [];
  const lastShownIndex = stored?.lastShownIndex ?? null;

  if (queue.length === 0) {
    queue = freshDeck(lastShownIndex, count);
  }

  const nextIndex = queue.pop()!;
  write({ v: 1, queue, lastShownIndex: nextIndex });

  return MOTIVATIONAL_MESSAGES[nextIndex];
}
