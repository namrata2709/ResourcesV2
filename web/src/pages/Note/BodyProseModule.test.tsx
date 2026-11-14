import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { BodyProseModule } from './BodyProseModule';

/**
 * BodyProseModule.test.tsx — covers the fetch/loading/missing lifecycle
 * (previously untested by name, exercised indirectly via Note.test.tsx)
 * plus P1-1's selection-capture -> save-highlight -> render-as-<mark>
 * round trip, which only BodyProseModule wires end-to-end (BodyProse.
 * test.tsx covers pure rendering given an already-decided highlight
 * set, via a manually-supplied HighlightsProvider).
 */

const BODY_PROSE_JSON = {
  blocks: [
    {
      type: 'paragraph',
      blockId: 'block-0001',
      runs: [{ text: 'EC2 provides resizable compute capacity.', mark: null }],
    },
  ],
};

function mockFetchOnce(json: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => json,
    })
  );
}

/** Selects the given substring within `container`'s single text node,
 * then fires the `selectionchange` event useHighlightSelection listens
 * for -- jsdom doesn't fire it on its own the way a real browser does. */
function selectText(el: Element, substring: string) {
  const textNode = el.firstChild!;
  const full = textNode.textContent || '';
  const start = full.indexOf(substring);
  const range = document.createRange();
  range.setStart(textNode, start);
  range.setEnd(textNode, start + substring.length);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  act(() => {
    document.dispatchEvent(new Event('selectionchange'));
  });
}

describe('BodyProseModule', () => {
  afterEach(() => {
    localStorage.clear();
    window.getSelection()?.removeAllRanges();
    vi.unstubAllGlobals();
  });

  it('renders nothing while loading and nothing when the fetch fails (missing body-prose.json)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const { container } = render(<BodyProseModule folder="dsa-merge-sort" />);
    await waitFor(() => expect(container.querySelector('.notes-body-prose')).toBeNull());
  });

  it('renders nothing when body-prose.json has zero blocks', async () => {
    mockFetchOnce({ blocks: [] });
    const { container } = render(<BodyProseModule folder="dsa-merge-sort" />);
    await waitFor(() => expect(container.querySelector('.notes-body-prose')).toBeNull());
  });

  it('renders real body-prose content once fetched', async () => {
    mockFetchOnce(BODY_PROSE_JSON);
    render(<BodyProseModule folder="dsa-merge-sort" />);
    await screen.findByText(/EC2 provides resizable compute capacity\./);
  });

  it('shows the Highlight button when text is selected inside a highlightable block', async () => {
    mockFetchOnce(BODY_PROSE_JSON);
    render(<BodyProseModule folder="dsa-merge-sort" />);
    const p = await screen.findByText(/EC2 provides resizable compute capacity\./);

    expect(screen.queryByRole('button', { name: /highlight/i })).toBeNull();
    selectText(p, 'resizable compute');
    expect(await screen.findByRole('button', { name: /highlight/i })).toBeInTheDocument();
  });

  it('clicking Highlight saves the selection and renders it as a <mark>, persisted to localStorage', async () => {
    mockFetchOnce(BODY_PROSE_JSON);
    render(<BodyProseModule folder="dsa-merge-sort" />);
    const p = await screen.findByText(/EC2 provides resizable compute capacity\./);

    selectText(p, 'resizable compute');
    const button = await screen.findByRole('button', { name: /highlight/i });
    fireEvent.click(button);

    const mark = await waitFor(() => {
      const el = document.querySelector('mark[data-highlight-id]');
      expect(el).not.toBeNull();
      return el!;
    });
    expect(mark).toHaveTextContent('resizable compute');

    const saved = JSON.parse(localStorage.getItem('highlights-dsa-merge-sort') || '[]');
    expect(saved).toHaveLength(1);
    expect(saved[0].blockId).toBe('block-0001');
    expect(saved[0].text).toBe('resizable compute');
  });

  it('clicking a rendered highlight removes it and updates localStorage', async () => {
    localStorage.setItem(
      'highlights-dsa-merge-sort',
      JSON.stringify([{ id: 'hl-existing', blockId: 'block-0001', text: 'resizable compute', createdAt: 1 }])
    );
    mockFetchOnce(BODY_PROSE_JSON);
    render(<BodyProseModule folder="dsa-merge-sort" />);

    const mark = await waitFor(() => {
      const el = document.querySelector('mark[data-highlight-id="hl-existing"]');
      expect(el).not.toBeNull();
      return el!;
    });

    fireEvent.click(mark);

    await waitFor(() => {
      expect(document.querySelector('mark[data-highlight-id]')).toBeNull();
    });
    expect(JSON.parse(localStorage.getItem('highlights-dsa-merge-sort') || '[]')).toEqual([]);
  });

  it('loads a different folder\'s own highlight set when folder changes', async () => {
    localStorage.setItem(
      'highlights-note-a',
      JSON.stringify([{ id: 'hl-a', blockId: 'block-0001', text: 'resizable compute', createdAt: 1 }])
    );
    mockFetchOnce(BODY_PROSE_JSON);
    const { rerender } = render(<BodyProseModule folder="note-a" />);
    await waitFor(() => {
      expect(document.querySelector('mark[data-highlight-id="hl-a"]')).not.toBeNull();
    });

    mockFetchOnce(BODY_PROSE_JSON);
    rerender(<BodyProseModule folder="note-b" />);
    await screen.findByText(/EC2 provides resizable compute capacity\./);
    expect(document.querySelector('mark[data-highlight-id]')).toBeNull();
  });

  // -----------------------------------------------------------------
  // P3-2: Revision Mode
  // -----------------------------------------------------------------
  //
  // Manual test (per the ticket): "toggle Revision Mode on a note with
  // a mix of highlighted/bookmarked/plain content, confirm only the
  // three relevant categories show; toggle off, confirm full content
  // restores exactly (no lost state)."
  //
  // A single fixture covering a mix: a plain (non-qualifying) heading
  // section, a heading section that qualifies only via a bookmarked
  // id, and a plain paragraph elsewhere that qualifies only via a
  // highlight -- exercising all three P3-2 categories (highlight,
  // bookmark, and -- via the highlight's personal note, rendered
  // inline with it -- P1-2) plus a block that should NOT survive
  // filtering, so the "only the three relevant categories show" half
  // of the manual test is a real assertion, not just an absence check.
  const REVISION_FIXTURE = {
    blocks: [
      {
        type: 'heading',
        level: 2,
        id: 'sec-plain',
        text: [{ text: 'Plain Section', mark: null }],
      },
      {
        type: 'paragraph',
        blockId: 'block-plain',
        runs: [{ text: 'This paragraph is never highlighted or bookmarked.', mark: null }],
      },
      {
        type: 'heading',
        level: 2,
        id: 'sec-bookmarked',
        text: [{ text: 'Bookmarked Section', mark: null }],
      },
      {
        type: 'paragraph',
        blockId: 'block-under-bookmark',
        runs: [{ text: 'Content under the bookmarked heading.', mark: null }],
      },
      {
        type: 'heading',
        level: 2,
        id: 'sec-highlighted',
        text: [{ text: 'Highlighted Section', mark: null }],
      },
      {
        type: 'paragraph',
        blockId: 'block-highlighted',
        runs: [{ text: 'EC2 provides resizable compute capacity.', mark: null }],
      },
    ],
  };

  it('Revision Mode ON shows only highlighted/bookmarked content, hiding plain sections', async () => {
    localStorage.setItem(
      'highlights-dsa-merge-sort',
      JSON.stringify([{ id: 'hl-1', blockId: 'block-highlighted', text: 'resizable compute', createdAt: 1 }])
    );
    localStorage.setItem('bookmarks-dsa-merge-sort', JSON.stringify(['sec-bookmarked']));
    mockFetchOnce(REVISION_FIXTURE);

    render(<BodyProseModule folder="dsa-merge-sort" revisionMode />);

    // A bookmarked heading with no qualifying content beneath it is
    // kept as a section label (see revisionFilter.ts's own docstring)
    // -- the heading itself is one of the three P3-2 categories;
    // unhighlighted content under it is not pulled in for free.
    await screen.findByText('Bookmarked Section');
    expect(screen.getByText('Highlighted Section')).toBeInTheDocument();
    // The highlighted paragraph's text is split across a <mark> and
    // surrounding <span>s (highlightRuns), so match on the rendered
    // <mark> itself rather than the full sentence as one text node.
    const mark = document.querySelector('mark[data-highlight-id="hl-1"]');
    expect(mark).not.toBeNull();
    expect(mark).toHaveTextContent('resizable compute');

    // Plain, non-qualifying section is genuinely absent, not just
    // visually hidden -- confirms filtering happens before render.
    expect(screen.queryByText('Plain Section')).toBeNull();
    expect(screen.queryByText('This paragraph is never highlighted or bookmarked.')).toBeNull();
    expect(screen.queryByText('Content under the bookmarked heading.')).toBeNull();
  });

  it('Revision Mode OFF (default) shows full content, including plain sections', async () => {
    localStorage.setItem(
      'highlights-dsa-merge-sort',
      JSON.stringify([{ id: 'hl-1', blockId: 'block-highlighted', text: 'resizable compute', createdAt: 1 }])
    );
    localStorage.setItem('bookmarks-dsa-merge-sort', JSON.stringify(['sec-bookmarked']));
    mockFetchOnce(REVISION_FIXTURE);

    render(<BodyProseModule folder="dsa-merge-sort" />);

    await screen.findByText('Plain Section');
    expect(screen.getByText('This paragraph is never highlighted or bookmarked.')).toBeInTheDocument();
    expect(screen.getByText('Bookmarked Section')).toBeInTheDocument();
    expect(screen.getByText('Highlighted Section')).toBeInTheDocument();
  });

  it('toggling Revision Mode off restores full content exactly -- no lost state', async () => {
    localStorage.setItem(
      'highlights-dsa-merge-sort',
      JSON.stringify([{ id: 'hl-1', blockId: 'block-highlighted', text: 'resizable compute', createdAt: 1 }])
    );
    localStorage.setItem('bookmarks-dsa-merge-sort', JSON.stringify(['sec-bookmarked']));
    mockFetchOnce(REVISION_FIXTURE);

    const { rerender } = render(<BodyProseModule folder="dsa-merge-sort" revisionMode />);
    await screen.findByText('Bookmarked Section');
    expect(screen.queryByText('Plain Section')).toBeNull();
    expect(screen.queryByText('Content under the bookmarked heading.')).toBeNull();

    // Toggling off is a prop flip, not a re-fetch -- `data`/`highlights`
    // are untouched by the toggle (see BodyProseModule's own comment),
    // so this doesn't re-mock fetch.
    rerender(<BodyProseModule folder="dsa-merge-sort" revisionMode={false} />);

    await screen.findByText('Plain Section');
    expect(screen.getByText('This paragraph is never highlighted or bookmarked.')).toBeInTheDocument();
    expect(screen.getByText('Bookmarked Section')).toBeInTheDocument();
    expect(screen.getByText('Highlighted Section')).toBeInTheDocument();
    // The highlight itself survived the round trip too -- state isn't
    // just visually restored, the underlying data was never touched.
    const mark = document.querySelector('mark[data-highlight-id="hl-1"]');
    expect(mark).not.toBeNull();
  });

  it('shows an explicit empty-state message in Revision Mode when nothing is highlighted or bookmarked', async () => {
    mockFetchOnce(REVISION_FIXTURE);
    render(<BodyProseModule folder="dsa-merge-sort" revisionMode />);

    await screen.findByText(/no highlights or bookmarks/i);
    expect(screen.queryByText('Plain Section')).toBeNull();
  });

  it('un-starring a bookmarked section live, while Revision Mode is already on, removes it without leaving Revision Mode', async () => {
    // The star is only reachable once its section already qualifies
    // and renders -- a section hidden by the filter has no star to
    // click at all, so this exercises the live un-bookmark direction,
    // via the same BookmarksContext notify path a live bookmark-add
    // would use.
    localStorage.setItem('bookmarks-dsa-merge-sort', JSON.stringify(['sec-bookmarked']));
    mockFetchOnce(REVISION_FIXTURE);
    render(<BodyProseModule folder="dsa-merge-sort" revisionMode />);

    await screen.findByText('Bookmarked Section');
    // BookmarkStar's own `bookmarked` state resolves via a mount-time
    // effect (it doesn't know its section is bookmarked until that
    // runs), so its accessible name starts as "Bookmark: ..." and
    // flips to "Remove bookmark: ..." once that effect settles --
    // find, not get, so this doesn't race that.
    const star = await screen.findByRole('button', { name: /^remove bookmark: bookmarked section$/i });
    fireEvent.click(star);

    await waitFor(() => {
      expect(screen.queryByText('Bookmarked Section')).toBeNull();
    });
    // Confirms the notify path re-filters live rather than requiring a
    // Revision Mode toggle round-trip to pick up the change -- the
    // empty state appears immediately since nothing else qualifies.
    expect(await screen.findByText(/no highlights or bookmarks/i)).toBeInTheDocument();
  });
});
