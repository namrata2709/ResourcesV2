import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookmarksPanel } from './BookmarksPanel';
import { BookmarkStar } from './BookmarkStar';

describe('BookmarksPanel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders nothing when closed', () => {
    render(<BookmarksPanel pageId="dsa-merge-sort" open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the empty state when no sections are bookmarked yet', () => {
    render(<BookmarksPanel pageId="dsa-merge-sort" open onClose={() => {}} />);
    expect(screen.getByText('No bookmarked sections yet.')).toBeInTheDocument();
  });

  it('lists bookmarked section ids, resolving each label from the live DOM heading', () => {
    document.body.innerHTML = '<h2 id="section-1">Getting Started</h2>';
    localStorage.setItem('bookmarks-dsa-merge-sort', JSON.stringify(['section-1']));

    render(<BookmarksPanel pageId="dsa-merge-sort" open onClose={() => {}} />);
    expect(screen.getByRole('button', { name: 'Getting Started' })).toBeInTheDocument();
  });

  it('falls back to the raw id when no matching DOM element exists', () => {
    localStorage.setItem('bookmarks-dsa-merge-sort', JSON.stringify(['missing-section']));
    render(<BookmarksPanel pageId="dsa-merge-sort" open onClose={() => {}} />);
    expect(screen.getByRole('button', { name: 'missing-section' })).toBeInTheDocument();
  });

  it('removes a bookmark and persists the change', () => {
    document.body.innerHTML = '<h2 id="section-1">Getting Started</h2>';
    localStorage.setItem('bookmarks-dsa-merge-sort', JSON.stringify(['section-1']));

    render(<BookmarksPanel pageId="dsa-merge-sort" open onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove bookmark: Getting Started' }));

    expect(screen.queryByRole('button', { name: 'Getting Started' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('bookmarks-dsa-merge-sort') || '[]')).toEqual([]);
  });

  it('lists a section starred via BookmarkStar (T5-3c-7 integration)', () => {
    document.body.innerHTML = '<h2 id="section-1">Getting Started</h2>';
    const { rerender } = render(
      <BookmarkStar pageId="dsa-merge-sort" sectionId="section-1" label="Getting Started" />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Bookmark: Getting Started' }));

    rerender(<BookmarksPanel pageId="dsa-merge-sort" open onClose={() => {}} />);
    expect(screen.getByRole('button', { name: 'Getting Started' })).toBeInTheDocument();
  });
});
