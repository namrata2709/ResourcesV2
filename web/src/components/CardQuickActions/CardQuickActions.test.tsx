import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardQuickActions } from './CardQuickActions';

/**
 * CardQuickActions.test.tsx — genericity, per T3-2a's Testing spec:
 * renders and behaves correctly with a minimal, deliberately non-notes
 * action set (a "Pin"/"Archive" pair, nothing resembling Open/Favorite/
 * Copy Link/Gallery) — confirms this component has no hidden knowledge
 * of what a "note" is.
 */
describe('CardQuickActions', () => {
  it('renders whatever actions it is given and fires their callbacks', () => {
    const onPin = vi.fn();
    const onArchive = vi.fn();
    render(
      <CardQuickActions
        actions={[
          { key: 'pin', icon: '📌', label: 'Pin', onClick: onPin },
          { key: 'archive', icon: '🗄️', label: 'Archive', onClick: onArchive, active: true },
        ]}
      />,
    );

    fireEvent.click(screen.getByLabelText('Pin'));
    expect(onPin).toHaveBeenCalledOnce();

    const archiveBtn = screen.getByLabelText('Archive');
    expect(archiveBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(archiveBtn);
    expect(onArchive).toHaveBeenCalledOnce();
  });

  it("stops click propagation, so a parent card's own onClick doesn't also fire", () => {
    const cardClick = vi.fn();
    const actionClick = vi.fn();
    render(
      <div onClick={cardClick}>
        <CardQuickActions actions={[{ key: 'x', icon: '🔧', label: 'Action', onClick: actionClick }]} />
      </div>,
    );

    fireEvent.click(screen.getByLabelText('Action'));
    expect(actionClick).toHaveBeenCalledOnce();
    expect(cardClick).not.toHaveBeenCalled();
  });

  it('renders nothing for an empty actions array', () => {
    const { container } = render(<CardQuickActions actions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
