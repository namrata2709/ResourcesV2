import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { NoteSearchPanel } from './NoteSearchPanel';

function renderNoteContent() {
  const container = document.createElement('div');
  container.id = 'note-content';
  container.innerHTML = `
    <h2 id="intro">Introduction to Lambda</h2>
    <h2 id="pricing">Lambda pricing model</h2>
    <h2 id="glossary-term">EC2 glossary</h2>
  `;
  document.body.appendChild(container);
  return container;
}

afterEach(() => {
  document.getElementById('note-content')?.remove();
});

describe('NoteSearchPanel', () => {
  it('renders nothing when closed', () => {
    render(<NoteSearchPanel open={false} onClose={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens and autofocuses the search input', () => {
    render(<NoteSearchPanel open onClose={() => {}} />);
    const input = screen.getByRole('searchbox', { name: 'Search this note' });
    expect(input).toHaveFocus();
  });

  it('lists all sections found in #note-content when the query is empty', () => {
    renderNoteContent();
    render(<NoteSearchPanel open onClose={() => {}} />);
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('Introduction to Lambda')).toBeInTheDocument();
    expect(dialog.getByText('Lambda pricing model')).toBeInTheDocument();
    expect(dialog.getByText('EC2 glossary')).toBeInTheDocument();
  });

  it('filters sections by a case-insensitive substring match, only within this note', () => {
    renderNoteContent();
    render(<NoteSearchPanel open onClose={() => {}} />);
    const input = screen.getByRole('searchbox', { name: 'Search this note' });
    fireEvent.change(input, { target: { value: 'lambda' } });
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('Introduction to Lambda')).toBeInTheDocument();
    expect(dialog.getByText('Lambda pricing model')).toBeInTheDocument();
    expect(dialog.queryByText('EC2 glossary')).not.toBeInTheDocument();
  });

  it('shows a no-match message when nothing in this note matches', () => {
    renderNoteContent();
    render(<NoteSearchPanel open onClose={() => {}} />);
    const input = screen.getByRole('searchbox', { name: 'Search this note' });
    fireEvent.change(input, { target: { value: 'zzz-nonexistent' } });
    expect(screen.getByText('No sections match "zzz-nonexistent".')).toBeInTheDocument();
  });

  it('scrolls to the matching section and closes the panel on click', () => {
    renderNoteContent();
    const scrollIntoViewSpy = vi.fn();
    document.getElementById('pricing')!.scrollIntoView = scrollIntoViewSpy;
    const onClose = vi.fn();

    render(<NoteSearchPanel open onClose={onClose} />);
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByText('Lambda pricing model'));

    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an empty-state message when the note has no searchable sections', () => {
    render(<NoteSearchPanel open onClose={() => {}} />);
    expect(screen.getByText('No searchable sections found on this note yet.')).toBeInTheDocument();
  });
});
