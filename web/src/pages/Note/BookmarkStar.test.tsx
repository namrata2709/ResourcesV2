import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookmarkStar } from './BookmarkStar';
import { bookmarksKey } from '../../lib/storageKeys';

describe('BookmarkStar', () => {
  it('renders unbookmarked when the section id is absent from storage', () => {
    render(<BookmarkStar pageId="dsa-merge-sort" sectionId="section-1" label="Getting Started" />);
    const star = screen.getByRole('button', { name: 'Bookmark: Getting Started' });
    expect(star).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders bookmarked when the section id is already saved', () => {
    localStorage.setItem(bookmarksKey('dsa-merge-sort'), JSON.stringify(['section-1']));
    render(<BookmarkStar pageId="dsa-merge-sort" sectionId="section-1" label="Getting Started" />);
    expect(screen.getByRole('button', { name: 'Remove bookmark: Getting Started' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('clicking an unbookmarked star adds the section id to storage', () => {
    render(<BookmarkStar pageId="dsa-merge-sort" sectionId="section-1" label="Getting Started" />);
    fireEvent.click(screen.getByRole('button', { name: 'Bookmark: Getting Started' }));

    expect(JSON.parse(localStorage.getItem(bookmarksKey('dsa-merge-sort')) || '[]')).toEqual(['section-1']);
    expect(screen.getByRole('button', { name: 'Remove bookmark: Getting Started' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('clicking a bookmarked star removes the section id from storage', () => {
    localStorage.setItem(bookmarksKey('dsa-merge-sort'), JSON.stringify(['section-1', 'section-2']));
    render(<BookmarkStar pageId="dsa-merge-sort" sectionId="section-1" label="Getting Started" />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove bookmark: Getting Started' }));

    expect(JSON.parse(localStorage.getItem(bookmarksKey('dsa-merge-sort')) || '[]')).toEqual(['section-2']);
    expect(screen.getByRole('button', { name: 'Bookmark: Getting Started' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not disturb other sections already bookmarked on the same page', () => {
    localStorage.setItem(bookmarksKey('dsa-merge-sort'), JSON.stringify(['other-section']));
    render(<BookmarkStar pageId="dsa-merge-sort" sectionId="section-1" label="Getting Started" />);
    fireEvent.click(screen.getByRole('button', { name: 'Bookmark: Getting Started' }));

    expect(JSON.parse(localStorage.getItem(bookmarksKey('dsa-merge-sort')) || '[]')).toEqual([
      'other-section',
      'section-1',
    ]);
  });
});
