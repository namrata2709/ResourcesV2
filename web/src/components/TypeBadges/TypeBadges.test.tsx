import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TypeBadges } from './TypeBadges';

/**
 * TypeBadges.test.tsx — genericity, per T3-2a's Testing spec: renders
 * correctly with a NON-notes fixture (invented file types with no
 * relation to notes/lab/slides), confirming there's no hardcoded
 * notes-index assumption baked in.
 */
describe('TypeBadges', () => {
  it('renders one badge per unique type, using the provided typeMap', () => {
    render(
      <TypeBadges
        files={[
          { type: 'video', icon: '🎬' },
          { type: 'audio', icon: '🎧' },
          { type: 'video', icon: '🎬' }, // duplicate type — should still be ONE badge
        ]}
        typeMap={{ video: { icon: '🎬', label: 'Video' }, audio: { icon: '🎧', label: 'Audio' } }}
      />,
    );

    expect(screen.getByLabelText('Video')).toBeInTheDocument();
    expect(screen.getByLabelText('Audio')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Video')).toHaveLength(1); // deduped
  });

  it("falls back to the file's own icon/type when not present in typeMap", () => {
    render(<TypeBadges files={[{ type: 'archive', icon: '📦' }]} typeMap={{}} />);
    expect(screen.getByLabelText('archive')).toBeInTheDocument();
  });

  it('renders nothing for an empty files array', () => {
    const { container } = render(<TypeBadges files={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
