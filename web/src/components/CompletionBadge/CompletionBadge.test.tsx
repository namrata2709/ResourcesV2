import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompletionBadge, getCompletionState } from './CompletionBadge';

/**
 * CompletionBadge.test.tsx
 *
 * Exact three-way threshold notes-index.js currently uses: 0% ->
 * not-started/⭕, 1–94% -> in-progress/🔵, >=95% -> completed/✅ — a
 * slightly unusual boundary (95%, not 100%) the ticket itself flags as
 * easy to mis-transcribe, so tested at the exact boundary values, not
 * just one value from each bucket.
 */
describe('CompletionBadge', () => {
  it('0% -> not-started', () => {
    expect(getCompletionState(0)).toBe('not-started');
    render(<CompletionBadge percent={0} />);
    expect(screen.getByLabelText('Not Started')).toBeInTheDocument();
  });

  it('94% -> in-progress (just below the completed threshold)', () => {
    expect(getCompletionState(94)).toBe('in-progress');
    render(<CompletionBadge percent={94} />);
    expect(screen.getByLabelText('In Progress')).toBeInTheDocument();
  });

  it('1% -> in-progress (just above not-started)', () => {
    expect(getCompletionState(1)).toBe('in-progress');
  });

  it('95% -> completed (the exact threshold, not 100%)', () => {
    expect(getCompletionState(95)).toBe('completed');
    render(<CompletionBadge percent={95} />);
    expect(screen.getByLabelText('Completed')).toBeInTheDocument();
  });

  it('100% -> completed', () => {
    expect(getCompletionState(100)).toBe('completed');
  });
});
