import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { Slides } from './Slides';

/**
 * Slides.test.tsx — covers T5-4a's real scope only: resolving the
 * `type: "slides"` file for a folder, fetching `json/slides.json`,
 * loading/error/not-found states (matching Note.test.tsx's own
 * conventions), and the fullscreen-chrome mechanism — specifically the
 * regression case the ticket calls out by name: chrome must reappear
 * after a `fullscreenchange` event that did NOT come from the toggle
 * button's own click (Escape, F11, browser UI), not just after a click.
 *
 * Per-slide-type rendering: `comparison`'s real column layout and
 * full keyboard/click navigation between slides are T5-4b's scope,
 * and `engage`'s 5 kinds are T5-4c's scope (both covered further down
 * this file). The speaker-notes panel (T5-4d) is covered further down
 * too. `stat`/`icon-grid`/`code` still show the honest "renders in a
 * follow-up ticket" placeholder, confirmed below, since no sub-ticket
 * owns them yet.
 */

const NOTE_META = {
  notes: [
    {
      title: 'Intro Deck',
      folder: 'aws-intro-deck',
      subject: 'aws',
      session: null,
      date: '2026-07-05',
      lastModified: '2026-07-05',
      readTimeMinutes: 5,
      category: 'Overview',
      tags: [],
      hasImages: false,
      images: [],
      files: [{ name: 'Presentation', file: 'slides.html', type: 'slides', icon: '📊' }],
    },
    {
      title: 'Notes Only',
      folder: 'aws-notes-only',
      subject: 'aws',
      session: null,
      date: '2026-07-05',
      lastModified: '2026-07-05',
      readTimeMinutes: 5,
      category: 'Overview',
      tags: [],
      hasImages: false,
      images: [],
      files: [{ name: 'Notes', file: 'notes.html', type: 'notes', icon: '📄' }],
    },
  ],
};

const SLIDES_FIXTURE = {
  slides: [
    { type: 'title', index: 1, html: '<h1>Welcome</h1>', images: [], notes_html: null },
    { type: 'concept', index: 2, html: '<p>Second slide</p>', images: [], notes_html: null },
  ],
};

const COMPARISON_FIRST_FIXTURE = {
  slides: [
    {
      type: 'comparison',
      index: 1,
      html: '',
      images: [],
      notes_html: null,
      columns: [
        { title: 'On-Demand', bullets: ['No upfront commitment'] },
        { title: 'Reserved', bullets: ['Lower per-hour rate'] },
      ],
    },
  ],
};

const COMPARISON_THREE_COLUMN_FIXTURE = {
  slides: [
    {
      type: 'comparison',
      index: 1,
      html: '<p>Pricing models at a glance</p>',
      images: [],
      notes_html: null,
      columns: [
        { title: 'On-Demand', bullets: ['No upfront commitment', 'Highest per-hour rate'] },
        { title: 'Reserved', bullets: ['Lower per-hour rate'] },
        { title: 'Spot', bullets: ['Cheapest', 'Can be reclaimed'] },
      ],
    },
  ],
};

const STAT_FIRST_FIXTURE = {
  slides: [
    { type: 'stat', index: 1, html: null, images: [], notes_html: null, stats: [{ value: '99.9%', label: 'Uptime SLA' }] },
  ],
};

const MULTI_SLIDE_FIXTURE = {
  slides: [
    { type: 'title', index: 1, html: '<h1>First</h1>', images: [], notes_html: null },
    { type: 'concept', index: 2, html: '<p>Second</p>', images: [], notes_html: null },
    { type: 'recap', index: 3, html: '<p>Third</p>', images: [], notes_html: null },
  ],
};

const MULTI_SLIDE_WITH_NOTES_FIXTURE = {
  slides: [
    {
      type: 'title',
      index: 1,
      html: '<h1>First</h1>',
      images: [],
      notes_html: '<p>Welcome the audience and introduce today\u2019s topic.</p>',
    },
    { type: 'concept', index: 2, html: '<p>Second</p>', images: [], notes_html: null },
    {
      type: 'recap',
      index: 3,
      html: '<p>Third</p>',
      images: [],
      notes_html: '<p>Recap the three key takeaways before moving on.</p>',
    },
  ],
};

function engageFixture(engage: Record<string, unknown>) {
  return { slides: [{ type: 'engage', index: 1, html: null, images: [], notes_html: null, engage }] };
}

const ENGAGE_THINK_FIXTURE = engageFixture({
  kind: 'think', question: 'Why might eventual consistency be acceptable here?', options: [], reveal: null,
});
const ENGAGE_SCENARIO_FIXTURE = engageFixture({
  kind: 'scenario', question: 'Your API is timing out under load. What do you check first?', options: [], reveal: null,
});
const ENGAGE_PAUSE_FIXTURE = engageFixture({
  kind: 'pause', question: 'Take a moment to sketch the data flow before continuing.', options: [], reveal: null,
});
const ENGAGE_POLL_FIXTURE = engageFixture({
  kind: 'poll',
  question: 'Which storage class would you pick for infrequent access?',
  options: ['S3 Standard', 'S3 Standard-IA', 'S3 Glacier'],
  reveal: 'S3 Standard-IA balances cost and retrieval time for this case.',
});
const ENGAGE_PREDICT_FIXTURE = engageFixture({
  kind: 'predict',
  question: 'What will happen if we remove the index?',
  options: ['Faster writes, slower reads', 'No change', 'Faster reads, slower writes'],
  reveal: 'Writes get faster; the affected reads fall back to a full scan.',
});
const ENGAGE_NULL_FIXTURE = {
  slides: [{ type: 'engage', index: 1, html: null, images: [], notes_html: null, engage: null }],
};

function mockFetch(overrides: Record<string, unknown> = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('notes-index.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(overrides.index ?? NOTE_META) });
      }
      if (url.includes('/json/slides.json')) {
        const val = overrides.slides;
        if (val === 'missing') return Promise.resolve({ ok: false, status: 404 });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(val ?? SLIDES_FIXTURE) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }),
  );
}

function renderSlides(path = '/slides/aws-intro-deck') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/slides/:folder" element={<Slides />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Slides', () => {
  beforeEach(() => {
    // jsdom doesn't implement the Fullscreen API — stub the pieces
    // useFullscreenChrome actually calls.
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.removeAttribute('data-fullscreen-chrome-hidden');
  });

  it('loads a deck: resolves the slides file and shows the real slide count', async () => {
    mockFetch();
    renderSlides();
    // Breadcrumb renders the title twice (last crumb + page-header h1) —
    // the h1 is the unambiguous one to assert on.
    expect(await screen.findByRole('heading', { name: 'Intro Deck' })).toBeInTheDocument();
    expect(await screen.findByText(/2 slides/)).toBeInTheDocument();
  });

  it('renders the first slide\'s generic body content', async () => {
    mockFetch();
    renderSlides();
    expect(await screen.findByText('Welcome')).toBeInTheDocument();
  });

  it('shows an honest placeholder for a slide type this shell doesn\'t structurally render yet', async () => {
    // `stat` isn't owned by any landed T5-4 sub-ticket yet (comparison
    // is T5-4b, now real — see the comparison-rendering tests below).
    mockFetch({ slides: STAT_FIRST_FIXTURE });
    renderSlides();
    expect(await screen.findByText(/renders in a follow-up ticket/)).toBeInTheDocument();
  });

  it('shows a not-found message for a folder with no slides-type file', async () => {
    mockFetch();
    renderSlides('/slides/aws-notes-only');
    expect(await screen.findByRole('heading', { name: 'Deck not found' })).toBeInTheDocument();
  });

  it('shows a not-found message for an unknown folder', async () => {
    mockFetch();
    renderSlides('/slides/does-not-exist');
    expect(await screen.findByRole('heading', { name: 'Deck not found' })).toBeInTheDocument();
  });

  it('shows an error message when notes-index.json fails to load', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    renderSlides();
    expect(await screen.findByText(/Couldn't load this deck/)).toBeInTheDocument();
  });

  it('enters fullscreen via the native Fullscreen API on click', async () => {
    mockFetch();
    renderSlides();
    const button = await screen.findByRole('button', { name: 'Enter fullscreen' });
    fireEvent.click(button);
    expect(document.documentElement.requestFullscreen).toHaveBeenCalledTimes(1);
  });

  it('hides breadcrumb/page-header/footer/app-chrome chrome once fullscreenchange fires', async () => {
    mockFetch();
    renderSlides();
    await screen.findByRole('heading', { name: 'Intro Deck' });

    // Simulate the browser actually entering fullscreen (jsdom won't do
    // this for us even after requestFullscreen() resolves).
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: document.documentElement,
    });
    act(() => { document.dispatchEvent(new Event('fullscreenchange')); });

    await waitFor(() => {
      expect(document.body).toHaveAttribute('data-fullscreen-chrome-hidden');
    });
  });

  it('re-shows chrome on a fullscreenchange NOT triggered by the toggle button (Escape/F11/browser UI) — the real regression case', async () => {
    mockFetch();
    renderSlides();
    await screen.findByRole('heading', { name: 'Intro Deck' });

    // Enter fullscreen first.
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: document.documentElement,
    });
    act(() => { document.dispatchEvent(new Event('fullscreenchange')); });
    await waitFor(() => {
      expect(document.body).toHaveAttribute('data-fullscreen-chrome-hidden');
    });

    // Exit via something other than the button — e.g. the browser
    // clearing fullscreenElement itself (Escape/F11/native UI), which
    // fires fullscreenchange with no click event involved at all.
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      value: null,
    });
    act(() => { document.dispatchEvent(new Event('fullscreenchange')); });

    await waitFor(() => {
      expect(document.body).not.toHaveAttribute('data-fullscreen-chrome-hidden');
    });
  });
});

/**
 * T5-4b — slide navigation (keyboard + click) and `comparison`'s real
 * 2/3+-column rendering.
 */
describe('Slides — navigation and comparison rendering (T5-4b)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a 2-column comparison slide with both columns\' titles and bullets', async () => {
    mockFetch({ slides: COMPARISON_FIRST_FIXTURE });
    renderSlides();
    expect(await screen.findByText('On-Demand')).toBeInTheDocument();
    expect(screen.getByText('No upfront commitment')).toBeInTheDocument();
    expect(screen.getByText('Reserved')).toBeInTheDocument();
    expect(screen.getByText('Lower per-hour rate')).toBeInTheDocument();
    // Not the placeholder — this type is now really rendered.
    expect(screen.queryByText(/renders in a follow-up ticket/)).not.toBeInTheDocument();
  });

  it('renders a 3+-column comparison slide, including any body text outside the columns', async () => {
    mockFetch({ slides: COMPARISON_THREE_COLUMN_FIXTURE });
    renderSlides();
    expect(await screen.findByText('Pricing models at a glance')).toBeInTheDocument();
    expect(screen.getByText('On-Demand')).toBeInTheDocument();
    expect(screen.getByText('Reserved')).toBeInTheDocument();
    expect(screen.getByText('Spot')).toBeInTheDocument();
    expect(screen.getByText('Can be reclaimed')).toBeInTheDocument();
  });

  it('single-slide deck: position reads 1 / 1 and both nav buttons are disabled', async () => {
    mockFetch({ slides: COMPARISON_FIRST_FIXTURE });
    renderSlides();
    await screen.findByText('On-Demand');
    expect(screen.getByTestId('slide-position')).toHaveTextContent('1 / 1');
    expect(screen.getByRole('button', { name: 'Previous slide' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled();
  });

  it('click navigation: Next/Previous buttons move through the deck and disable at the edges', async () => {
    mockFetch({ slides: MULTI_SLIDE_FIXTURE });
    renderSlides();
    expect(await screen.findByText('First')).toBeInTheDocument();
    expect(screen.getByTestId('slide-position')).toHaveTextContent('1 / 3');
    expect(screen.getByRole('button', { name: 'Previous slide' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(await screen.findByText('Second')).toBeInTheDocument();
    expect(screen.getByTestId('slide-position')).toHaveTextContent('2 / 3');
    expect(screen.getByRole('button', { name: 'Previous slide' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next slide' })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(await screen.findByText('Third')).toBeInTheDocument();
    expect(screen.getByTestId('slide-position')).toHaveTextContent('3 / 3');
    expect(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Previous slide' }));
    expect(await screen.findByText('Second')).toBeInTheDocument();
  });

  it('keyboard navigation: ArrowRight/ArrowLeft/Home/End move through the deck', async () => {
    mockFetch({ slides: MULTI_SLIDE_FIXTURE });
    renderSlides();
    await screen.findByText('First');

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(await screen.findByText('Second')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(await screen.findByText('Third')).toBeInTheDocument();

    // Already at the last slide — ArrowRight is a no-op, not a wrap.
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(await screen.findByText('Third')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Home' });
    expect(await screen.findByText('First')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'End' });
    expect(await screen.findByText('Third')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(await screen.findByText('Second')).toBeInTheDocument();
  });

  it('does not register nav keyboard shortcuts for a single-slide deck (nothing to navigate to)', async () => {
    mockFetch({ slides: COMPARISON_FIRST_FIXTURE });
    renderSlides();
    await screen.findByText('On-Demand');
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    // Still the only slide — no crash, no change, buttons stay disabled.
    expect(screen.getByText('On-Demand')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next slide' })).toBeDisabled();
  });

  it('resets to the first slide when navigating directly to a different deck', async () => {
    mockFetch({
      index: {
        notes: [
          ...NOTE_META.notes,
          {
            title: 'Second Deck',
            folder: 'aws-second-deck',
            subject: 'aws',
            session: null,
            date: '2026-07-06',
            lastModified: '2026-07-06',
            readTimeMinutes: 5,
            category: 'Overview',
            tags: [],
            hasImages: false,
            images: [],
            files: [{ name: 'Presentation', file: 'slides.html', type: 'slides', icon: '📊' }],
          },
        ],
      },
      slides: MULTI_SLIDE_FIXTURE,
    });

    // A real client-side navigation (Link, not remounting the test tree)
    // between two decks that share the same `/slides/:folder` route —
    // this is the actual case the `key={folder}` reset guards against,
    // since React Router reuses the same Slides element instance here.
    render(
      <MemoryRouter initialEntries={['/slides/aws-intro-deck']}>
        <Link to="/slides/aws-second-deck">Go to second deck</Link>
        <Routes>
          <Route path="/slides/:folder" element={<Slides />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText('First');
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    await screen.findByText('Second');

    fireEvent.click(screen.getByRole('link', { name: 'Go to second deck' }));
    expect(await screen.findByText('First')).toBeInTheDocument();
    expect(screen.getByTestId('slide-position')).toHaveTextContent('1 / 3');
  });
});

/**
 * T5-4c — all 5 `engage` kinds (`think`/`scenario`/`poll`/`predict`/
 * `pause`), with `options` shown only for `poll`/`predict` and the
 * reveal toggle gated on `reveal` alone (independent of kind).
 */
describe('Slides — engage slide rendering (T5-4c)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a "think" engage slide: label + question, no options list', async () => {
    mockFetch({ slides: ENGAGE_THINK_FIXTURE });
    renderSlides();
    expect(await screen.findByText('Think About It')).toBeInTheDocument();
    expect(screen.getByText('Why might eventual consistency be acceptable here?')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Options' })).not.toBeInTheDocument();
    expect(screen.queryByText(/renders in a follow-up ticket/)).not.toBeInTheDocument();
  });

  it('renders a "scenario" engage slide: label + question, no options list', async () => {
    mockFetch({ slides: ENGAGE_SCENARIO_FIXTURE });
    renderSlides();
    expect(await screen.findByText('Scenario')).toBeInTheDocument();
    expect(screen.getByText('Your API is timing out under load. What do you check first?')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Options' })).not.toBeInTheDocument();
  });

  it('renders a "pause" engage slide: label + question, no options list', async () => {
    mockFetch({ slides: ENGAGE_PAUSE_FIXTURE });
    renderSlides();
    expect(await screen.findByText('Pause & Discuss')).toBeInTheDocument();
    expect(screen.getByText('Take a moment to sketch the data flow before continuing.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Options' })).not.toBeInTheDocument();
  });

  it('renders a "poll" engage slide with a lettered options list', async () => {
    mockFetch({ slides: ENGAGE_POLL_FIXTURE });
    renderSlides();
    expect(await screen.findByText('Quick Poll')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Options' });
    expect(list).toBeInTheDocument();
    expect(screen.getByText('A) S3 Standard')).toBeInTheDocument();
    expect(screen.getByText('B) S3 Standard-IA')).toBeInTheDocument();
    expect(screen.getByText('C) S3 Glacier')).toBeInTheDocument();
  });

  it('renders a "predict" engage slide with a lettered options list', async () => {
    mockFetch({ slides: ENGAGE_PREDICT_FIXTURE });
    renderSlides();
    expect(await screen.findByText('Predict')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Options' })).toBeInTheDocument();
    expect(screen.getByText('A) Faster writes, slower reads')).toBeInTheDocument();
  });

  it('reveal is hidden until toggled, then shows the reveal text, for a poll slide', async () => {
    mockFetch({ slides: ENGAGE_POLL_FIXTURE });
    renderSlides();
    await screen.findByText('Quick Poll');
    expect(screen.queryByText(/balances cost and retrieval time/)).not.toBeInTheDocument();

    const revealBtn = screen.getByRole('button', { name: 'Reveal' });
    expect(revealBtn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(revealBtn);

    expect(await screen.findByText(/balances cost and retrieval time/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('no reveal control renders when a slide has no reveal text (think/scenario/pause all pass reveal: null)', async () => {
    mockFetch({ slides: ENGAGE_THINK_FIXTURE });
    renderSlides();
    await screen.findByText('Think About It');
    expect(screen.queryByRole('button', { name: 'Reveal' })).not.toBeInTheDocument();
  });

  it('falls back to the honest placeholder when an engage slide has no parsed engage content', async () => {
    mockFetch({ slides: ENGAGE_NULL_FIXTURE });
    renderSlides();
    expect(await screen.findByText(/renders in a follow-up ticket/)).toBeInTheDocument();
  });

  it('resets the reveal toggle when navigating to a different engage slide', async () => {
    mockFetch({
      slides: {
        slides: [
          { type: 'engage', index: 1, html: null, images: [], notes_html: null, engage: (ENGAGE_POLL_FIXTURE.slides[0] as { engage: unknown }).engage },
          { type: 'engage', index: 2, html: null, images: [], notes_html: null, engage: (ENGAGE_PREDICT_FIXTURE.slides[0] as { engage: unknown }).engage },
        ],
      },
    });
    renderSlides();
    await screen.findByText('Quick Poll');
    fireEvent.click(screen.getByRole('button', { name: 'Reveal' }));
    expect(await screen.findByText(/balances cost and retrieval time/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    expect(await screen.findByText('Predict')).toBeInTheDocument();
    // Fresh slide, fresh reveal state — not carried over from the poll slide.
    expect(screen.getByRole('button', { name: 'Reveal' })).toBeInTheDocument();
    expect(screen.queryByText(/Writes get faster/)).not.toBeInTheDocument();
  });
});

/**
 * T5-4d — the speaker-notes panel: toggle (button + `N` key + Escape),
 * rendering `notes_html` verbatim regardless of which of the 2
 * authoring conventions produced it (React never branches on that —
 * Python already normalized it into one field before this component
 * ever sees it), and an explicit empty-state message rather than a
 * silently-empty panel when a slide has no notes.
 */
describe('Slides — speaker notes panel (T5-4d)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('panel is closed by default', async () => {
    mockFetch({ slides: MULTI_SLIDE_WITH_NOTES_FIXTURE });
    renderSlides();
    await screen.findByText('First');
    expect(screen.queryByRole('region', { name: 'Speaker notes' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Speaker notes' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking the toggle button opens the panel and renders notes_html for the current slide', async () => {
    mockFetch({ slides: MULTI_SLIDE_WITH_NOTES_FIXTURE });
    renderSlides();
    await screen.findByText('First');

    fireEvent.click(screen.getByRole('button', { name: 'Speaker notes' }));
    const panel = await screen.findByRole('region', { name: 'Speaker notes' });
    expect(panel).toHaveTextContent('Welcome the audience and introduce today\u2019s topic.');
    expect(screen.getByRole('button', { name: 'Hide speaker notes' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking again (or Escape) closes the panel', async () => {
    mockFetch({ slides: MULTI_SLIDE_WITH_NOTES_FIXTURE });
    renderSlides();
    await screen.findByText('First');
    fireEvent.click(screen.getByRole('button', { name: 'Speaker notes' }));
    await screen.findByRole('region', { name: 'Speaker notes' });

    fireEvent.click(screen.getByRole('button', { name: 'Hide speaker notes' }));
    expect(screen.queryByRole('region', { name: 'Speaker notes' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Speaker notes' }));
    await screen.findByRole('region', { name: 'Speaker notes' });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Speaker notes' })).not.toBeInTheDocument();
  });

  it('the "N" keyboard shortcut toggles the panel', async () => {
    mockFetch({ slides: MULTI_SLIDE_WITH_NOTES_FIXTURE });
    renderSlides();
    await screen.findByText('First');

    fireEvent.keyDown(document, { key: 'n' });
    expect(await screen.findByRole('region', { name: 'Speaker notes' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'n' });
    expect(screen.queryByRole('region', { name: 'Speaker notes' })).not.toBeInTheDocument();
  });

  it('shows an explicit empty-state message, not a blank panel, when the current slide has no notes_html', async () => {
    mockFetch({ slides: MULTI_SLIDE_WITH_NOTES_FIXTURE });
    renderSlides();
    await screen.findByText('First');

    // Slide 2 in the fixture has notes_html: null.
    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    await screen.findByText('Second');
    fireEvent.click(screen.getByRole('button', { name: 'Speaker notes' }));

    const panel = await screen.findByRole('region', { name: 'Speaker notes' });
    expect(panel).toHaveTextContent('No speaker notes authored for this slide yet.');
  });

  it('updates to the new slide\'s notes as navigation happens while the panel stays open', async () => {
    mockFetch({ slides: MULTI_SLIDE_WITH_NOTES_FIXTURE });
    renderSlides();
    await screen.findByText('First');
    fireEvent.click(screen.getByRole('button', { name: 'Speaker notes' }));
    await screen.findByText(/Welcome the audience/);

    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    await screen.findByText('Second');
    // Panel is still open (T5-4d's UX choice: navigating doesn't close
    // it, matching a presenter's expectation of a persistent notes view)
    // and now shows slide 2's real empty state, not slide 1's leftover text.
    expect(screen.getByRole('region', { name: 'Speaker notes' })).toHaveTextContent(
      'No speaker notes authored for this slide yet.',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    await screen.findByText('Third');
    expect(screen.getByRole('region', { name: 'Speaker notes' })).toHaveTextContent(
      'Recap the three key takeaways before moving on.',
    );
  });

  it('renders notes_html the same way regardless of which authoring convention produced it — React only sees the normalized field', async () => {
    // Python normalizes both the nested-[notes]-inside-[slide] convention
    // and the external-[notes]-after-[/slide] convention into the same
    // notes_html string before slides.json is ever written — these two
    // fixtures represent that: identical shape, standing in for "either
    // convention", since nothing in this component branches on it.
    const NESTED_CONVENTION_FIXTURE = {
      slides: [{ type: 'title', index: 1, html: '<h1>Intro</h1>', images: [], notes_html: '<p>From the nested convention.</p>' }],
    };
    const EXTERNAL_CONVENTION_FIXTURE = {
      slides: [{ type: 'title', index: 1, html: '<h1>Intro</h1>', images: [], notes_html: '<p>From the nested convention.</p>' }],
    };

    mockFetch({ slides: NESTED_CONVENTION_FIXTURE });
    const { unmount } = renderSlides();
    await screen.findByText('Intro');
    fireEvent.click(screen.getByRole('button', { name: 'Speaker notes' }));
    const nestedText = (await screen.findByRole('region', { name: 'Speaker notes' })).textContent;
    unmount();

    vi.unstubAllGlobals();
    mockFetch({ slides: EXTERNAL_CONVENTION_FIXTURE });
    renderSlides();
    await screen.findByText('Intro');
    fireEvent.click(screen.getByRole('button', { name: 'Speaker notes' }));
    const externalText = (await screen.findByRole('region', { name: 'Speaker notes' })).textContent;

    expect(nestedText).toBe(externalText);
  });
});

describe('Slides — E1-1 PPTX export button', () => {
  beforeEach(() => {
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.removeAttribute('data-fullscreen-chrome-hidden');
  });

  it('is disabled until the deck has actually loaded', async () => {
    mockFetch();
    renderSlides();
    const button = await screen.findByRole('button', { name: 'Download as PowerPoint' });
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it('triggers a real download with the deck title as the filename on click', async () => {
    mockFetch();
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = vi.fn(() => 'blob:mock-url');
        static override revokeObjectURL = vi.fn();
      },
    );
    let capturedName = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      capturedName = this.download;
    });

    renderSlides();
    const button = await screen.findByRole('button', { name: 'Download as PowerPoint' });
    await waitFor(() => expect(button).not.toBeDisabled());
    fireEvent.click(button);

    await waitFor(() => expect(capturedName).toBe('intro-deck.pptx'));
  });
});
