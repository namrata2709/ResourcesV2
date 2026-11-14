import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StickyNoteWidget } from './StickyNoteWidget';
import { saveStickyNote, getStickyNote } from '../../lib/stickyNotes';

/**
 * StickyNoteWidget.test.tsx
 *
 * Covers P0-10's "Done when": a sticky note persists per page, is
 * editable, and is deletable — plus that it's correctly keyed per page
 * (usePageId()) rather than shared across every route.
 */

function renderWidget(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <StickyNoteWidget />
    </MemoryRouter>,
  );
}

afterEach(() => {
  localStorage.clear();
});

describe('StickyNoteWidget', () => {
  it('renders a closed launcher button with no panel by default', () => {
    renderWidget();
    expect(screen.getByRole('button', { name: /add sticky note/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /sticky note/i })).not.toBeInTheDocument();
  });

  it('opens the panel when the launcher is clicked', () => {
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /add sticky note/i }));
    expect(screen.getByRole('dialog', { name: /sticky note/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/sticky note text/i)).toBeInTheDocument();
  });

  it('typing in the textarea persists the note under the current page id', () => {
    renderWidget('/quiz/aws-vpc');
    fireEvent.click(screen.getByRole('button', { name: /add sticky note/i }));

    const textarea = screen.getByLabelText(/sticky note text/i);
    fireEvent.change(textarea, { target: { value: 'check subnet routing' } });

    expect(getStickyNote('quiz--aws-vpc')?.text).toBe('check subnet routing');
  });

  it('loads a previously saved note for the current page on mount', () => {
    saveStickyNote('gallery', 'existing note text');
    renderWidget('/gallery');

    fireEvent.click(screen.getByRole('button', { name: /open sticky note/i }));

    expect(screen.getByLabelText(/sticky note text/i)).toHaveValue('existing note text');
  });

  it('shows a filled indicator on the launcher when a note exists', () => {
    saveStickyNote('home', 'a note');
    renderWidget('/');
    expect(screen.getByRole('button', { name: /open sticky note \(note present\)/i })).toBeInTheDocument();
  });

  it('does not show the indicator when no note exists', () => {
    renderWidget('/');
    expect(screen.queryByRole('button', { name: /note present/i })).not.toBeInTheDocument();
  });

  it('closes the panel via the close (X) button', () => {
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /add sticky note/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close sticky note/i }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the panel on Escape', () => {
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /add sticky note/i }));

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('the Delete button is disabled until a note actually exists', () => {
    renderWidget();
    fireEvent.click(screen.getByRole('button', { name: /add sticky note/i }));
    expect(screen.getByRole('button', { name: /delete sticky note/i })).toBeDisabled();
  });

  it('deleting removes the note from storage and closes the panel', () => {
    saveStickyNote('home', 'to be deleted');
    renderWidget('/');

    fireEvent.click(screen.getByRole('button', { name: /open sticky note/i }));
    expect(screen.getByRole('button', { name: /delete sticky note/i })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /delete sticky note/i }));

    expect(getStickyNote('home')).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is independently keyed per page — a note on one route does not appear on another', () => {
    saveStickyNote('gallery', 'gallery-only note');
    renderWidget('/quiz-index');

    fireEvent.click(screen.getByRole('button', { name: /add sticky note/i }));

    expect(screen.getByLabelText(/sticky note text/i)).toHaveValue('');
  });
});
