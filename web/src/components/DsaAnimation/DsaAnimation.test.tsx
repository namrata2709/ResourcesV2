import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DsaAnimation } from './DsaAnimation';

/**
 * Full cross-frame "does the embedded page actually flip theme" behavior
 * isn't testable in jsdom (the iframe's own document never loads/runs
 * its script here) — that's covered on the vanilla/generator side per
 * T1-4's own testing note ("this ticket's own testing is scoped to the
 * vanilla/generator side only"). What IS testable, and is what this
 * component could regress on a careless port: that it embeds the page
 * inertly and does NOT reintroduce a second theme channel (a `?theme=`
 * query param, an inline dark-palette override, etc.) fighting T1-4's
 * shared-localStorage fix.
 */
describe('DsaAnimation', () => {
  it('renders an accessible, titled iframe pointed at the given src', () => {
    render(<DsaAnimation src="/data/notes/dsa-heap/animation/heap-insert.html" title="Heap insert animation" />);
    const frame = screen.getByTitle('Heap insert animation');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('src', '/data/notes/dsa-heap/animation/heap-insert.html');
  });

  it('does not append a theme query param to src — theming flows through shared localStorage per T1-4, not a URL/prop channel', () => {
    render(<DsaAnimation src="/data/notes/dsa-heap/animation/heap-insert.html" title="Heap insert animation" />);
    const src = screen.getByTitle('Heap insert animation').getAttribute('src') ?? '';
    expect(src).not.toMatch(/theme=/);
  });

  it('renders nothing when src is empty (no animation for this note)', () => {
    const { container } = render(<DsaAnimation src="" title="No animation" />);
    expect(container).toBeEmptyDOMElement();
  });
});
