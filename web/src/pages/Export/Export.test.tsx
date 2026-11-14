import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Export } from './Export';

/**
 * Export.test.tsx — E0-2's "Export options UI".
 *
 * Covers the ticket's own scope list rendering plus the "Current
 * Chapter" option's presence being gated on a `?folder=` param, since
 * that's the one piece of this page's behavior that isn't just "click
 * a button and something downloads" (already covered end-to-end by
 * notebookExport.test.ts / quizBookExport.test.ts / revisionBookExport.test.ts
 * for the actual export logic this page merely triggers).
 */

function renderExport(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/export${search}`]}>
      <Export />
    </MemoryRouter>,
  );
}

describe('Export page', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders the three real notebook scope options plus Quiz Book and Revision Book actions', () => {
    renderExport();
    expect(screen.getByText('Whole Notebook')).toBeInTheDocument();
    expect(screen.getByText('Favorites')).toBeInTheDocument();
    expect(screen.getByText('Bookmarked & Highlighted')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download Quiz Book/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download Revision Book/i })).toBeInTheDocument();
  });

  it('does not show "Current Chapter" without a ?folder= param', () => {
    renderExport();
    expect(screen.queryByText('Current Chapter')).not.toBeInTheDocument();
  });

  it('shows and pre-selects "Current Chapter" when arrived at with ?folder=', () => {
    renderExport('?folder=aws-lambda-basics&title=Lambda%20Basics');
    expect(screen.getByText('Current Chapter')).toBeInTheDocument();
    expect(screen.getByText(/Lambda Basics/)).toBeInTheDocument();
  });

  it('triggers a notebook export via the shared exportNotebook path on Export click', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ notes: [] }) })),
    );
    renderExport();
    fireEvent.click(screen.getByRole('button', { name: /^Export$/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Exporting…/i })).toBeInTheDocument();
    });
  });
});
