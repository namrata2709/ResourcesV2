import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as useSearchModule from '../../hooks/useSearch';
import * as CardQuickActionsModule from '../../components/CardQuickActions';
import * as ViewModeToggleModule from '../../components/ViewModeToggle';
import { Gallery } from './Gallery';

/**
 * Gallery.test.tsx
 *
 * Covers the T4-1a Testing spec, including the follow-up pass that
 * confirmed CardQuickActions/ViewModeToggle weren't actually reused yet:
 *   - lightbox zoom in/out changes rendered scale within [1x, 4x] bounds
 *   - keyboard Left/Right moves prev/next; Escape closes
 *   - favorite toggle writes/removes from `galleryFavorites`,
 *     independently of `notesFavorites`/`quizFavorites` (PROJECT.md
 *     §6.5) — a regression guard against the three accidentally merging
 *     during the port
 *   - Copy Link copies the correct /gallery-route-based URL for the
 *     specific image, not just the bare gallery page
 *   - Grid/List toggle switches layout without losing filter/search state
 *   - CardQuickActions renders only Favorite + Copy Link here (no Open,
 *     no Gallery-pointing-at-itself) — confirms the subset config, not
 *     just that the component renders something
 *   - Gallery imports the LITERAL SAME CardQuickActions/ViewModeToggle/
 *     useSearch modules T3-2a exports — spied on directly against the
 *     real modules (not a mock replacing them), same anti-duplication
 *     guard as NotesIndex/QuizIndex's own tests
 *
 * T4-1a SECOND FOLLOW-UP PASS additions (feature-parity audit):
 *   - Mobile filter drawer: the "☰ Filters" toggle opens/closes a
 *     bottom-sheet (role="dialog") wrapping Subject/Category/Tags
 *   - Lightbox swipe: a leftward/rightward touch swipe navigates
 *     prev/next while at 1x zoom, but is a no-op while zoomed in
 *   - Lightbox pinch: a two-finger pinch adjusts zoom, clamped to
 *     [1x, 4x], regardless of the swipe/zoom gate above
 */

const FIXTURE_NOTES = {
  notes: [
    {
      title: 'EC2 Deep Dive',
      folder: 'aws-ec2',
      subject: 'aws',
      category: 'Compute',
      tags: ['AWS', 'EC2'],
      date: '2026-07-01',
      lastModified: '2026-07-01',
      hasImages: true,
      images: [
        { name: 'EC2 Architecture', file: 'ec2-architecture.png' },
        { name: 'EC2 Networking', file: 'ec2-networking.png' },
      ],
      files: [{ name: 'Notes', file: 'notes.html', type: 'notes', icon: '📄' }],
    },
    {
      title: 'Merge Sort',
      folder: 'dsa-merge-sort',
      subject: 'dsa',
      category: 'Sorting',
      tags: ['sorting'],
      date: '2026-06-20',
      lastModified: '2026-06-20',
      hasImages: true,
      images: [{ name: 'Merge Sort Diagram', file: 'merge-sort-diagram.png' }],
      files: [{ name: 'Notes', file: 'notes.html', type: 'notes', icon: '📄' }],
    },
  ],
};

// Gallery now renders <Breadcrumb> (fixed after being missed entirely
// when this page was first built) — it fetches navigation-url.json on
// its own. Routing it here keeps Breadcrumb from silently failing.
const FIXTURE_NAV_CONFIG = [
  { title: 'Home', emoji: '🏠', url: '/' },
  { title: 'Images Gallery', emoji: '🖼️', url: '/gallery' },
];

function mockFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/data/index/notes-index.json') {
        return Promise.resolve({ ok: true, json: async () => FIXTURE_NOTES });
      }
      if (url === '/data/config/navigation-url.json') {
        return Promise.resolve({ ok: true, json: async () => FIXTURE_NAV_CONFIG });
      }
      return Promise.reject(new Error(`unexpected fetch in test: ${url}`));
    }),
  );
}

function renderGallery() {
  return render(
    <MemoryRouter>
      <Gallery />
    </MemoryRouter>,
  );
}

describe('Gallery', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('zoom in/out changes the rendered scale within [1x, 4x] bounds', async () => {
    mockFetch();
    renderGallery();

    fireEvent.click(await screen.findByText('EC2 Architecture'));
    const image = await screen.findByTestId('lightbox-image');

    // Starts at 1x.
    expect(image).toHaveStyle({ transform: 'scale(1)' });

    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(image).toHaveStyle({ transform: 'scale(1.5)' });

    // Zoom in repeatedly past the 4x ceiling — must clamp, not exceed it.
    for (let i = 0; i < 10; i++) fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(image).toHaveStyle({ transform: 'scale(4)' });

    // Zoom out repeatedly past the 1x floor — must clamp, not go below it.
    for (let i = 0; i < 10; i++) fireEvent.click(screen.getByLabelText('Zoom out'));
    expect(image).toHaveStyle({ transform: 'scale(1)' });
  });

  /**
   * T3-2b: zoom/reset-zoom/favorite are now real useKeyboardShortcut
   * registrations too (previously only reachable via button click in
   * tests, even though the vanilla keys always worked) — the '+'/'='
   * and '-'/'_' pairs are exactly the array-key case
   * useKeyboardShortcut.test.tsx added coverage for at the hook level;
   * this confirms the real page wiring, not just the hook in isolation.
   */
  it('keyboard +/=, -/_, 0, and F drive zoom, reset, and favorite the same as their buttons', async () => {
    mockFetch();
    renderGallery();

    fireEvent.click(await screen.findByText('EC2 Architecture'));
    const image = await screen.findByTestId('lightbox-image');
    expect(image).toHaveStyle({ transform: 'scale(1)' });

    fireEvent.keyDown(document, { key: '=' });
    expect(image).toHaveStyle({ transform: 'scale(1.5)' });

    fireEvent.keyDown(document, { key: '+' });
    expect(image).toHaveStyle({ transform: 'scale(2)' });

    fireEvent.keyDown(document, { key: '_' });
    expect(image).toHaveStyle({ transform: 'scale(1.5)' });

    fireEvent.keyDown(document, { key: '-' });
    expect(image).toHaveStyle({ transform: 'scale(1)' });

    fireEvent.keyDown(document, { key: '=' });
    fireEvent.keyDown(document, { key: '0' });
    expect(image).toHaveStyle({ transform: 'scale(1)' });

    expect(JSON.parse(localStorage.getItem('galleryFavorites') || '[]')).toEqual([]);
    fireEvent.keyDown(document, { key: 'f' });
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('galleryFavorites') || '[]')).toHaveLength(1);
    });
  });

  it("gallery's keyboard shortcuts are only active while the lightbox is open", async () => {
    mockFetch();
    renderGallery();

    await screen.findByText('EC2 Architecture');
    // No lightbox open yet — Escape/arrows/etc. must be no-ops, not
    // errors, and must not register in the shared shortcuts panel.
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('lightbox-image')).not.toBeInTheDocument();
  });

  it('keyboard Left/Right navigates prev/next, Escape closes', async () => {
    mockFetch();
    renderGallery();

    fireEvent.click(await screen.findByText('EC2 Architecture'));
    expect(await screen.findByTestId('lightbox-counter')).toHaveTextContent('1 of 3');

    // T3-2b: keyboard nav now goes through the shared useKeyboardShortcut
    // hook (lib/keyboardShortcuts.ts), which listens on `document` — not
    // `window`, where the old page-rolled handler used to listen. Events
    // dispatched directly on `window` don't bubble down to `document`
    // listeners (window isn't a descendant of document in the DOM tree,
    // so there's nothing to bubble through), so these fire on `document`
    // to match where real keydown events actually originate and bubble
    // through in a browser.
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    await waitFor(() => expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('2 of 3'));

    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    await waitFor(() => expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('1 of 3'));

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByTestId('lightbox-image')).not.toBeInTheDocument());
  });

  it('favorite toggle writes to galleryFavorites, independent of notesFavorites/quizFavorites', async () => {
    // Seed pre-existing, unrelated keys to prove the gallery toggle
    // below doesn't touch either of the other two families.
    localStorage.setItem('notesFavorites', JSON.stringify(['some-other-note']));
    localStorage.setItem('quizFavorites', JSON.stringify(['some-other-quiz']));

    mockFetch();
    renderGallery();

    const favoriteButtons = await screen.findAllByLabelText('Add to favorites');
    fireEvent.click(favoriteButtons[0]);

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('galleryFavorites') || '[]');
      expect(saved).toEqual(['/data/notes/aws-ec2/images/ec2-architecture.png']);
    });

    // Both other families' favorites must be completely untouched.
    expect(JSON.parse(localStorage.getItem('notesFavorites') || '[]')).toEqual(['some-other-note']);
    expect(JSON.parse(localStorage.getItem('quizFavorites') || '[]')).toEqual(['some-other-quiz']);

    // Toggling again removes it.
    fireEvent.click(screen.getAllByLabelText('Remove from favorites')[0]);
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('galleryFavorites') || '[]')).toEqual([]);
    });
  });

  it('P0-7: ?favorites=true lands pre-filtered to favorites-only, matching the Quick Actions "Favorites" shortcut', async () => {
    // Seed one favorite so the pre-filtered view has something to show.
    localStorage.setItem('galleryFavorites', JSON.stringify(['/data/notes/aws-ec2/images/ec2-architecture.png']));

    mockFetch();
    render(
      <MemoryRouter initialEntries={['/gallery?favorites=true']}>
        <Gallery />
      </MemoryRouter>,
    );

    // The toggle itself should reflect the pre-applied filter state.
    const favoritesToggle = await screen.findByRole('button', { name: /Favorites/ });
    expect(favoritesToggle).toHaveAttribute('aria-pressed', 'true');

    // And the filtered result set should already be favorites-only, not
    // requiring a manual click before it takes effect.
    await waitFor(() => {
      expect(screen.getByText('EC2 Architecture')).toBeInTheDocument();
      expect(screen.queryByText('Merge Sort Diagram')).not.toBeInTheDocument();
    });
  });

  it('Grid/List toggle switches layout without losing the active search', async () => {
    mockFetch();
    renderGallery();

    await screen.findByText('EC2 Architecture');

    fireEvent.change(screen.getByLabelText('Search images'), { target: { value: 'EC2' } });
    await waitFor(() => {
      expect(screen.getByText('EC2 Architecture')).toBeInTheDocument();
      expect(screen.queryByText('Merge Sort Diagram')).not.toBeInTheDocument();
    });

    const grid = screen.getByTestId('gallery-grid');
    expect(grid.className).toContain('grid');

    fireEvent.click(screen.getByLabelText('List'));

    // Layout changed...
    await waitFor(() => expect(screen.getByTestId('gallery-grid').className).not.toContain('grid'));
    // ...but the search filter is still applied, not reset.
    expect(screen.getByText('EC2 Architecture')).toBeInTheDocument();
    expect(screen.queryByText('Merge Sort Diagram')).not.toBeInTheDocument();
  });

  it('imports the same shared CardQuickActions, ViewModeToggle, and useSearch modules T3-2a exports', async () => {
    const quickActionsSpy = vi.spyOn(CardQuickActionsModule, 'CardQuickActions');
    const viewModeSpy = vi.spyOn(ViewModeToggleModule, 'ViewModeToggle');
    const useSearchSpy = vi.spyOn(useSearchModule, 'useSearch');

    mockFetch();
    renderGallery();

    await screen.findByText('EC2 Architecture');
    expect(quickActionsSpy).toHaveBeenCalled();
    expect(viewModeSpy).toHaveBeenCalled();
    expect(useSearchSpy).toHaveBeenCalled();
  });

  it('CardQuickActions renders only Favorite + Copy Link on an image card — no Open, no Gallery action', async () => {
    mockFetch();
    renderGallery();

    const card = (await screen.findByText('EC2 Architecture')).closest('.image-card') as HTMLElement;
    const group = within(card).getByRole('group', { name: 'Quick actions' });

    expect(within(group).getByLabelText('Add to favorites')).toBeInTheDocument();
    expect(within(group).getByLabelText('Copy link')).toBeInTheDocument();
    expect(within(group).queryByLabelText('Open')).not.toBeInTheDocument();
    expect(within(group).queryByLabelText(/gallery/i)).not.toBeInTheDocument();
  });

  it('mobile filter drawer opens as a bottom-sheet dialog and can be closed', async () => {
    mockFetch();
    renderGallery();

    await screen.findByText('EC2 Architecture');

    // The dialog element itself is always mounted (CSS-driven slide
    // transition, matching NotesIndex's own drawer pattern) — "closed"
    // means translated off-screen, not unmounted. The backdrop, however,
    // IS conditionally rendered, so that's what distinguishes open/closed.
    const dialog = screen.getByRole('dialog', { name: 'Filters' });
    expect(dialog.className).toContain('translate-y-full');

    fireEvent.click(screen.getByText('Filters'));
    expect(dialog.className).toContain('translate-y-0');

    fireEvent.click(screen.getByLabelText('Close filters'));
    expect(dialog.className).toContain('translate-y-full');
  });

  it('lightbox swipe navigates prev/next only while at 1x zoom', async () => {
    mockFetch();
    renderGallery();

    fireEvent.click(await screen.findByText('EC2 Architecture'));
    expect(await screen.findByTestId('lightbox-counter')).toHaveTextContent('1 of 3');

    const container = screen.getByTestId('lightbox-image').closest('div') as HTMLElement;

    // Swipe left at 1x zoom -> navigates to next image.
    fireEvent.touchStart(container, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(container, { changedTouches: [{ clientX: 100, clientY: 100 }] });
    await waitFor(() => expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('2 of 3'));

    // Zoom in, then swipe again — must NOT navigate while zoomed in.
    fireEvent.click(screen.getByLabelText('Zoom in'));
    fireEvent.touchStart(container, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchEnd(container, { changedTouches: [{ clientX: 100, clientY: 100 }] });
    expect(screen.getByTestId('lightbox-counter')).toHaveTextContent('2 of 3');
  });

  it('lightbox pinch adjusts zoom, clamped to [1x, 4x], regardless of the swipe zoom gate', async () => {
    mockFetch();
    renderGallery();

    fireEvent.click(await screen.findByText('EC2 Architecture'));
    const image = await screen.findByTestId('lightbox-image');
    const container = image.closest('div') as HTMLElement;

    // Two fingers 100px apart, spreading to 200px -> 2x incremental factor.
    fireEvent.touchStart(container, {
      touches: [
        { clientX: 0, clientY: 0 },
        { clientX: 100, clientY: 0 },
      ],
    });
    fireEvent.touchMove(container, {
      touches: [
        { clientX: 0, clientY: 0 },
        { clientX: 200, clientY: 0 },
      ],
    });
    expect(image).toHaveStyle({ transform: 'scale(2)' });

    // Pinching further must still clamp at the 4x ceiling.
    fireEvent.touchMove(container, {
      touches: [
        { clientX: 0, clientY: 0 },
        { clientX: 2000, clientY: 0 },
      ],
    });
    expect(image).toHaveStyle({ transform: 'scale(4)' });
  });

  it('Copy Link copies the correct /gallery-route-based URL for the specific image', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    mockFetch();
    renderGallery();

    const card = (await screen.findByText('EC2 Architecture')).closest('.image-card') as HTMLElement;
    fireEvent.click(within(card).getByLabelText('Copy link'));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        `${window.location.origin}/gallery?folder=aws-ec2&image=ec2-architecture.png`,
      );
    });

    // Not just the bare gallery page — a different image must copy a
    // different URL.
    writeText.mockClear();
    const secondCard = (await screen.findByText('Merge Sort Diagram')).closest('.image-card') as HTMLElement;
    fireEvent.click(within(secondCard).getByLabelText('Copy link'));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        `${window.location.origin}/gallery?folder=dsa-merge-sort&image=merge-sort-diagram.png`,
      );
    });
  });
});
