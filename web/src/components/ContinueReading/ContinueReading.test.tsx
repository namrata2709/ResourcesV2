import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ContinueReading } from './ContinueReading';

/**
 * ContinueReading.test.tsx — P0-3's Dashboard-facing half ("dashboard
 * shows a working 'Continue Reading' deep link to the single most
 * recent note"). The scroll-restore half is covered in Note.test.tsx.
 */

const FIXTURE_NOTES = {
  notes: [
    {
      title: 'EC2 Basics',
      folder: 'ec2-basics',
      subject: 'aws',
      files: [{ name: 'Notes', file: 'notes.html', type: 'notes', icon: '' }],
    },
    {
      title: 'External Ref',
      folder: 'external-ref',
      subject: 'aws',
      files: [{ name: 'Docs', file: 'https://example.com/doc', type: 'link', icon: '' }],
    },
    {
      title: 'Slides Only',
      folder: 'slides-only',
      subject: 'dsa',
      files: [{ name: 'Slides', file: 'slides.html', type: 'slides', icon: '' }],
    },
  ],
};

function mockNotesFetch() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => FIXTURE_NOTES }));
}

function renderWidget() {
  return render(
    <MemoryRouter>
      <ContinueReading />
    </MemoryRouter>,
  );
}

describe('ContinueReading', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders nothing when there is no readingProgress entry yet (first-time visitor)', () => {
    const { container } = renderWidget();
    expect(container).toBeEmptyDOMElement();
  });

  it('does not fetch notes-index.json at all when there is nothing to resolve', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    renderWidget();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('renders the most recently read note\'s title and a Resume link to /notes/:folder', async () => {
    localStorage.setItem('readingProgress-folder-ec2-basics', JSON.stringify({ v: 1, percent: 40, timestamp: 1000 }));
    mockNotesFetch();
    renderWidget();

    expect(await screen.findByText('EC2 Basics')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /resume/i });
    expect(link).toHaveAttribute('href', '/notes/ec2-basics');
  });

  it('picks the single most recent entry when multiple exist', async () => {
    localStorage.setItem('readingProgress-folder-ec2-basics', JSON.stringify({ v: 1, percent: 40, timestamp: 1000 }));
    localStorage.setItem('readingProgress-folder-external-ref', JSON.stringify({ v: 1, percent: 10, timestamp: 5000 }));
    mockNotesFetch();
    renderWidget();

    expect(await screen.findByText('External Ref')).toBeInTheDocument();
    expect(screen.queryByText('EC2 Basics')).not.toBeInTheDocument();
  });

  it('falls back to the resolved file URL (external <a>) when the primary file is not a notes/lab route', async () => {
    localStorage.setItem('readingProgress-folder-external-ref', JSON.stringify({ v: 1, percent: 10, timestamp: 1000 }));
    mockNotesFetch();
    renderWidget();

    const link = await screen.findByRole('link', { name: /resume/i });
    expect(link).toHaveAttribute('href', 'https://example.com/doc');
  });

  it('renders nothing when the stored folder no longer matches any note in notes-index.json (renamed/removed)', async () => {
    localStorage.setItem('readingProgress-folder-ghost-folder', JSON.stringify({ v: 1, percent: 10, timestamp: 1000 }));
    mockNotesFetch();
    const { container } = renderWidget();

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('renders nothing when notes-index.json fails to load', async () => {
    localStorage.setItem('readingProgress-folder-ec2-basics', JSON.stringify({ v: 1, percent: 10, timestamp: 1000 }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const { container } = renderWidget();

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
