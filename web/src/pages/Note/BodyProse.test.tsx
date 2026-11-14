import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BodyProseBlocks } from './BodyProse';
import { HighlightsProvider } from './HighlightsContext';
import type { BodyProseBlock } from './types';

/**
 * BodyProse.test.tsx — T5-3a. Per-block-type rendering, isolated from
 * fetching (BodyProseModule.tsx owns the fetch; BodyProseBlocks is a
 * pure renderer given already-parsed JSON, so no `fetch` mocking is
 * needed here). Note.test.tsx covers the fetch-wrapper + Note.tsx
 * integration; this file covers each block/run shape confirmed against
 * generate_notes.py's `extract_body_prose()`/`_extract_blocks()`.
 *
 * P1-1's highlight-rendering tests render through a real
 * HighlightsProvider (rather than mocking useHighlightsForBlock) so
 * they exercise the actual context wiring BodyProseModule sets up.
 */

function renderBlocks(blocks: BodyProseBlock[], folder = 'dsa-merge-sort') {
  return render(<BodyProseBlocks blocks={blocks} folder={folder} />);
}

describe('BodyProse', () => {
  it('renders a heading with its id and inline runs', () => {
    renderBlocks([{ type: 'heading', level: 2, id: 'getting-started', text: [{ text: 'Getting Started', mark: null }] }]);
    const heading = screen.getByRole('heading', { name: 'Getting Started', level: 2 });
    expect(heading).toHaveAttribute('id', 'getting-started');
  });

  it('renders a paragraph with bold/italic/code/link/highlight/exam marks', () => {
    renderBlocks([
      {
        type: 'paragraph',
        runs: [
          { text: 'resizable', mark: 'bold' },
          { text: 'It scales', mark: 'italic' },
          { text: 'inline code', mark: 'code' },
          { text: 'docs', mark: 'link', url: 'https://example.com' },
          { text: 'KeyTerm', mark: 'examTerm' },
          { text: 'This whole sentence matters.', mark: 'examSentence' },
          { text: 'highlighted', mark: 'highlight' },
        ],
      },
    ]);
    expect(screen.getByText('resizable').tagName).toBe('STRONG');
    expect(screen.getByText('It scales').tagName).toBe('EM');
    expect(screen.getByText('inline code').tagName).toBe('CODE');
    expect(screen.getByRole('link', { name: 'docs' })).toHaveAttribute('href', 'https://example.com');
    expect(screen.getByText('KeyTerm')).toHaveClass('exam-term');
    expect(screen.getByText('This whole sentence matters.')).toHaveClass('exam-sentence');
    expect(screen.getByText('highlighted').tagName).toBe('MARK');
  });

  it('renders unordered and ordered lists as separate elements', () => {
    renderBlocks([
      { type: 'list', ordered: false, items: [[{ text: 'First bullet', mark: null }]] },
      { type: 'list', ordered: true, items: [[{ text: 'Step one', mark: null }]] },
    ]);
    const lists = screen.getAllByRole('list');
    expect(lists).toHaveLength(2);
    expect(screen.getByText('First bullet')).toBeInTheDocument();
    expect(screen.getByText('Step one')).toBeInTheDocument();
  });

  it('renders table headers as plain text and body cells through Runs', () => {
    renderBlocks([
      {
        type: 'table',
        headers: ['Instance', 'vCPU'],
        rows: [[[{ text: 't2.micro', mark: null }], [{ text: '1', mark: null }]]],
      },
    ]);
    expect(screen.getByRole('columnheader', { name: 'Instance' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 't2.micro' })).toBeInTheDocument();
  });

  it('renders a fenced code block', () => {
    const { container } = renderBlocks([{ type: 'code', lang: 'python', code: "print('hi')" }]);
    expect(container.querySelector('pre code')?.textContent).toBe("print('hi')");
  });

  it.each([
    ['note', 'stop unused instances'],
    ['important', 'back up before deleting'],
    ['warning', 'this action is irreversible'],
  ] as const)('renders a %s callout with its runs', (kind, text) => {
    renderBlocks([{ type: 'callout', kind, runs: [{ text, mark: null }] }]);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('renders a YouTube embed as a link carrying title/channel/why', () => {
    renderBlocks([
      { type: 'youtube', title: 'EC2 Deep Dive', channel: 'AWS Training', url: 'https://youtube.com/watch?v=abc123', level: 'intermediate', why: 'Great overview' },
    ]);
    const link = screen.getByRole('link', { name: /EC2 Deep Dive/ });
    expect(link).toHaveAttribute('href', 'https://youtube.com/watch?v=abc123');
    expect(screen.getByText('AWS Training')).toBeInTheDocument();
    expect(screen.getByText('Great overview')).toBeInTheDocument();
  });

  it('renders a references list with external links', () => {
    renderBlocks([
      { type: 'references', items: [{ text: 'AWS EC2 Documentation', url: 'https://docs.aws.amazon.com/ec2/' }] },
    ]);
    expect(screen.getByRole('link', { name: /AWS EC2 Documentation/ })).toHaveAttribute(
      'href',
      'https://docs.aws.amazon.com/ec2/',
    );
  });

  it('renders takeaways under a "Key Takeaways" heading', () => {
    renderBlocks([{ type: 'takeaways', items: [[{ text: 'Takeaway one', mark: null }]] }]);
    expect(screen.getByRole('heading', { name: 'Key Takeaways' })).toBeInTheDocument();
    expect(screen.getByText('Takeaway one')).toBeInTheDocument();
  });

  it('resolves an inline image relative to the note\'s own images/ folder', () => {
    renderBlocks([{ type: 'image', filename: 'ec2-diagram.png', caption: 'EC2 architecture diagram' }], 'aws-ec2-fundamentals');
    const img = screen.getByRole('img', { name: 'EC2 architecture diagram' });
    expect(img).toHaveAttribute('src', expect.stringContaining('/data/notes/aws-ec2-fundamentals/images/ec2-diagram.png'));
    expect(screen.getByText('EC2 architecture diagram')).toBeInTheDocument();
  });

  it('renders a collapsible with its open flag and recursively renders nested children', () => {
    renderBlocks([
      {
        type: 'collapsible',
        level: 2,
        id: 'advanced-topics',
        heading: 'Advanced Topics',
        open: true,
        children: [
          { type: 'paragraph', runs: [{ text: 'Nested content lives here.', mark: null }] },
          { type: 'heading', level: 3, id: 'nested-subsection', text: [{ text: 'Nested Subsection', mark: null }] },
        ],
      },
    ]);
    expect(screen.getByText('Advanced Topics')).toBeInTheDocument();
    expect(screen.getByText('Nested content lives here.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nested Subsection', level: 3 })).toBeInTheDocument();
  });

  it('does not render anything visible for code_tabs_raw or raw_html (T5-3b/opaque territory)', () => {
    const { container } = renderBlocks([
      { type: 'code_tabs_raw' },
      { type: 'raw_html', html: '<div class="viz"></div>' },
    ]);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a bookmark star next to a heading that has a real id (T5-3c-7)', () => {
    renderBlocks([{ type: 'heading', level: 2, id: 'getting-started', text: [{ text: 'Getting Started', mark: null }] }]);
    expect(screen.getByRole('button', { name: 'Bookmark: Getting Started' })).toBeInTheDocument();
  });

  it('renders no bookmark star for a heading with a null id -- nothing for it to attach to', () => {
    renderBlocks([{ type: 'heading', level: 2, id: null, text: [{ text: 'Untitled Section', mark: null }] }]);
    expect(screen.queryByRole('button', { name: /Bookmark/ })).not.toBeInTheDocument();
  });

  it('renders a bookmark star next to a collapsible heading (T5-3c-7)', () => {
    renderBlocks([
      {
        type: 'collapsible',
        level: 2,
        id: 'advanced-topics',
        heading: 'Advanced Topics',
        open: true,
        children: [],
      },
    ]);
    expect(screen.getByRole('button', { name: 'Bookmark: Advanced Topics' })).toBeInTheDocument();
  });

  it('starring a heading section persists under this note\'s bookmarksKey shape', () => {
    renderBlocks(
      [{ type: 'heading', level: 2, id: 'getting-started', text: [{ text: 'Getting Started', mark: null }] }],
      'dsa-merge-sort',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Bookmark: Getting Started' }));
    expect(JSON.parse(localStorage.getItem('bookmarks-dsa-merge-sort') || '[]')).toEqual(['getting-started']);
  });
});

describe('BodyProse highlights (P1-1)', () => {
  const paragraph: BodyProseBlock = {
    type: 'paragraph',
    blockId: 'block-0005',
    runs: [{ text: 'EC2 provides resizable compute capacity.', mark: null }],
  };

  it('renders plain text with no <mark> when there are no highlights for this block', () => {
    render(
      <HighlightsProvider value={{ byBlock: {}, onRemove: vi.fn(), onEditNote: vi.fn() }}>
        <BodyProseBlocks blocks={[paragraph]} folder="dsa-merge-sort" />
      </HighlightsProvider>
    );
    expect(screen.getByText(/EC2 provides resizable compute capacity\./)).toBeInTheDocument();
    expect(document.querySelector('mark[data-highlight-id]')).toBeNull();
  });

  it('wraps the highlighted span for this block in a <mark data-highlight-id>', () => {
    render(
      <HighlightsProvider
        value={{
          byBlock: { 'block-0005': [{ id: 'hl-1', blockId: 'block-0005', text: 'resizable compute', createdAt: 1 }] },
          onRemove: vi.fn(),
          onEditNote: vi.fn(),
        }}
      >
        <BodyProseBlocks blocks={[paragraph]} folder="dsa-merge-sort" />
      </HighlightsProvider>
    );
    const mark = document.querySelector('mark[data-highlight-id="hl-1"]');
    expect(mark).not.toBeNull();
    expect(mark).toHaveTextContent('resizable compute');
  });

  it('does NOT highlight a different block\'s saved highlight', () => {
    render(
      <HighlightsProvider
        value={{
          byBlock: { 'block-9999': [{ id: 'hl-2', blockId: 'block-9999', text: 'resizable', createdAt: 1 }] },
          onRemove: vi.fn(),
          onEditNote: vi.fn(),
        }}
      >
        <BodyProseBlocks blocks={[paragraph]} folder="dsa-merge-sort" />
      </HighlightsProvider>
    );
    expect(document.querySelector('mark[data-highlight-id]')).toBeNull();
  });

  it('clicking a highlighted span calls onRemove with that highlight\'s id', () => {
    const onRemove = vi.fn();
    render(
      <HighlightsProvider
        value={{
          byBlock: { 'block-0005': [{ id: 'hl-3', blockId: 'block-0005', text: 'resizable compute', createdAt: 1 }] },
          onRemove,
          onEditNote: vi.fn(),
        }}
      >
        <BodyProseBlocks blocks={[paragraph]} folder="dsa-merge-sort" />
      </HighlightsProvider>
    );
    fireEvent.click(document.querySelector('mark[data-highlight-id="hl-3"]')!);
    expect(onRemove).toHaveBeenCalledWith('hl-3');
  });

  it('stamps every highlightable block with data-block-id from generate_notes.py', () => {
    renderBlocks([paragraph]);
    expect(document.querySelector('[data-block-id="block-0005"]')).not.toBeNull();
  });

  it('does not crash when a block has no blockId (older/unregenerated content)', () => {
    const noId: BodyProseBlock = { type: 'paragraph', runs: [{ text: 'No id here.', mark: null }] };
    expect(() => renderBlocks([noId])).not.toThrow();
    expect(screen.getByText('No id here.')).toBeInTheDocument();
  });

  it('highlights a span inside a collapsible\'s nested paragraph too', () => {
    const nested: BodyProseBlock = {
      type: 'collapsible',
      level: 2,
      id: 'advanced-topics',
      blockId: 'block-0010',
      heading: 'Advanced Topics',
      open: true,
      children: [
        { type: 'paragraph', blockId: 'block-0011', runs: [{ text: 'Nested content lives here.', mark: null }] },
      ],
    };
    render(
      <HighlightsProvider
        value={{
          byBlock: { 'block-0011': [{ id: 'hl-4', blockId: 'block-0011', text: 'content lives', createdAt: 1 }] },
          onRemove: vi.fn(),
          onEditNote: vi.fn(),
        }}
      >
        <BodyProseBlocks blocks={[nested]} folder="dsa-merge-sort" />
      </HighlightsProvider>
    );
    const mark = document.querySelector('mark[data-highlight-id="hl-4"]');
    expect(mark).not.toBeNull();
    expect(mark).toHaveTextContent('content lives');
  });
});

describe('BodyProse highlight notes (P1-2)', () => {
  const paragraph: BodyProseBlock = {
    type: 'paragraph',
    blockId: 'block-0005',
    runs: [{ text: 'EC2 provides resizable compute capacity.', mark: null }],
  };

  it('renders exactly one note-icon button per highlight, not one per segment', () => {
    render(
      <HighlightsProvider
        value={{
          byBlock: { 'block-0005': [{ id: 'hl-5', blockId: 'block-0005', text: 'resizable compute', createdAt: 1 }] },
          onRemove: vi.fn(),
          onEditNote: vi.fn(),
        }}
      >
        <BodyProseBlocks blocks={[paragraph]} folder="dsa-merge-sort" />
      </HighlightsProvider>
    );
    expect(document.querySelectorAll('[data-note-trigger-id="hl-5"]')).toHaveLength(1);
  });

  it('clicking the note-icon button does NOT remove the highlight', () => {
    const onRemove = vi.fn();
    render(
      <HighlightsProvider
        value={{
          byBlock: { 'block-0005': [{ id: 'hl-6', blockId: 'block-0005', text: 'resizable compute', createdAt: 1 }] },
          onRemove,
          onEditNote: vi.fn(),
        }}
      >
        <BodyProseBlocks blocks={[paragraph]} folder="dsa-merge-sort" />
      </HighlightsProvider>
    );
    fireEvent.click(document.querySelector('[data-note-trigger-id="hl-6"]')!);
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('opens a note editor pre-filled with the highlight\'s existing note', () => {
    render(
      <HighlightsProvider
        value={{
          byBlock: {
            'block-0005': [
              { id: 'hl-7', blockId: 'block-0005', text: 'resizable compute', createdAt: 1, note: 'already noted' },
            ],
          },
          onRemove: vi.fn(),
          onEditNote: vi.fn(),
        }}
      >
        <BodyProseBlocks blocks={[paragraph]} folder="dsa-merge-sort" />
      </HighlightsProvider>
    );
    fireEvent.click(document.querySelector('[data-note-trigger-id="hl-7"]')!);
    expect(screen.getByRole('dialog', { name: 'Highlight note' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('already noted')).toBeInTheDocument();
  });

  it('saving the editor calls onEditNote with this highlight\'s id and the typed text', () => {
    const onEditNote = vi.fn();
    render(
      <HighlightsProvider
        value={{
          byBlock: { 'block-0005': [{ id: 'hl-8', blockId: 'block-0005', text: 'resizable compute', createdAt: 1 }] },
          onRemove: vi.fn(),
          onEditNote,
        }}
      >
        <BodyProseBlocks blocks={[paragraph]} folder="dsa-merge-sort" />
      </HighlightsProvider>
    );
    fireEvent.click(document.querySelector('[data-note-trigger-id="hl-8"]')!);
    fireEvent.change(screen.getByPlaceholderText('Add a note about this highlight…'), {
      target: { value: 'remember this for the exam' },
    });
    fireEvent.click(screen.getByText('Save'));
    expect(onEditNote).toHaveBeenCalledWith('hl-8', 'remember this for the exam');
    expect(screen.queryByRole('dialog', { name: 'Highlight note' })).not.toBeInTheDocument();
  });

  it('"Remove highlight" inside the editor calls onRemove and closes the editor', () => {
    const onRemove = vi.fn();
    render(
      <HighlightsProvider
        value={{
          byBlock: { 'block-0005': [{ id: 'hl-9', blockId: 'block-0005', text: 'resizable compute', createdAt: 1 }] },
          onRemove,
          onEditNote: vi.fn(),
        }}
      >
        <BodyProseBlocks blocks={[paragraph]} folder="dsa-merge-sort" />
      </HighlightsProvider>
    );
    fireEvent.click(document.querySelector('[data-note-trigger-id="hl-9"]')!);
    fireEvent.click(screen.getByText('Remove highlight'));
    expect(onRemove).toHaveBeenCalledWith('hl-9');
    expect(screen.queryByRole('dialog', { name: 'Highlight note' })).not.toBeInTheDocument();
  });
});
