import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MotivationalWidget } from './MotivationalWidget';
import { MOTIVATIONAL_MESSAGES } from '../../lib/motivationalMessages';

describe('MotivationalWidget', () => {
  it('renders one real message from the bank', () => {
    render(<MotivationalWidget />);
    const texts = MOTIVATIONAL_MESSAGES.map((m) => m.text);
    const rendered = texts.find((text) => screen.queryByText(text));
    expect(rendered).toBeTruthy();
  });

  it('rotates without repeating the immediately previous message across remounts ("sessions")', () => {
    const seenInOrder: string[] = [];
    for (let i = 0; i < MOTIVATIONAL_MESSAGES.length + 5; i++) {
      const { unmount } = render(<MotivationalWidget />);
      const shown = MOTIVATIONAL_MESSAGES.find((m) => screen.queryByText(m.text))!;
      seenInOrder.push(shown.text);
      unmount();
      cleanup();
    }

    for (let i = 1; i < seenInOrder.length; i++) {
      expect(seenInOrder[i]).not.toBe(seenInOrder[i - 1]);
    }
  });
});
