import { describe, it, expect } from 'vitest';
import { getNextMessage, MOTIVATIONAL_MESSAGES } from './motivationalMessages';

describe('motivationalMessages', () => {
  it('never repeats a message on back-to-back draws', () => {
    let previousId = getNextMessage().id;
    for (let i = 0; i < 200; i++) {
      const next = getNextMessage();
      expect(next.id).not.toBe(previousId);
      previousId = next.id;
    }
  });

  it('shows every message exactly once per full cycle through the bank', () => {
    const count = MOTIVATIONAL_MESSAGES.length;
    const seen = new Set<number>();
    for (let i = 0; i < count; i++) {
      seen.add(getNextMessage().id);
    }
    expect(seen.size).toBe(count);
  });

  it('persists state across calls so a fresh mount continues the same deck, not a new random draw', () => {
    const first = getNextMessage();
    const stateAfterFirst = localStorage.getItem('motivationalMessageState');
    expect(stateAfterFirst).toBeTruthy();

    const parsed = JSON.parse(stateAfterFirst!);
    expect(parsed.lastShownIndex).toBe(first.id);
    expect(Array.isArray(parsed.queue)).toBe(true);
  });

  it('recovers gracefully from a corrupted stored state instead of throwing', () => {
    localStorage.setItem('motivationalMessageState', 'not json');
    expect(() => getNextMessage()).not.toThrow();
  });

  it('recovers if the stored queue references an out-of-range index (message bank changed)', () => {
    localStorage.setItem(
      'motivationalMessageState',
      JSON.stringify({ v: 1, queue: [999, -1], lastShownIndex: 0 }),
    );
    const message = getNextMessage();
    expect(MOTIVATIONAL_MESSAGES.some((m) => m.id === message.id)).toBe(true);
  });
});
