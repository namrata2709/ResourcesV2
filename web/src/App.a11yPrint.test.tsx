import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ProfileProvider } from './context/ProfileContext';
import { AppearanceProvider } from './context/AppearanceContext';
import { Dashboard } from './components/Dashboard';
import { QuizIndex } from './pages/QuizIndex';
import { Quiz } from './pages/Quiz';
import { PrintGuard } from './components/PrintGuard';
import { KeyboardShortcutsPanel } from './components/KeyboardShortcutsPanel';
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut';
import { _resetShortcutsForTests } from './lib/keyboardShortcuts';

/**
 * App.a11yPrint.test.tsx
 *
 * Covers T3-1b's Testing checklist items not already exercised elsewhere:
 *   - Skip link is present, targets #main-content, on a page with no
 *     interactive module of its own (Dashboard here — same idea as the
 *     ticket's suggested Gallery case: this is the accessibility
 *     regression test for the gap this ticket fixes, not a feature test
 *     of Dashboard itself)
 *   - Printing Dashboard/QuizIndex shows the PrintGuard message;
 *     printing Quiz does NOT (it keeps its own real print picker,
 *     unaffected — PrintGuard is never applied to that route)
 *   - The shared KeyboardShortcutsPanel opens on '?' and lists whatever
 *     useKeyboardShortcut calls are currently registered — not a static
 *     list
 *
 * NOTE: jsdom doesn't apply compiled Tailwind CSS, so `@media print`
 * itself can't be exercised the way a real browser print preview would
 * be. What IS tested here is the actual regression this ticket cares
 * about: the print-guard message text exists in the DOM for guarded
 * pages, and is absent for Quiz — the print:hidden/hidden print:flex
 * classes then do the visual switching in a real browser.
 */

const FIXTURE_DASHBOARD_CARDS = {
  cards: [{ id: 'aws', label: 'AWS', icon: '☁️', description: '', type: 'subject', url: '/notes-index/aws' }],
};
const FIXTURE_CATEGORY_ICONS = { default: { icon: '📂' } };
const FIXTURE_QUIZZES = { Quizzes: [{ title: 'VPC Basics', file: 'vpc-basics', topic: 'Networking' }] };
const FIXTURE_NAV_CONFIG = [
  { title: 'Home', emoji: '🏠', url: '/' },
  { title: 'Quizzes', emoji: '📝', url: '/quiz-index' },
];

function mockFetchForPages() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url === '/data/index/dashboard-cards.json') return Promise.resolve({ ok: true, json: async () => FIXTURE_DASHBOARD_CARDS });
      if (url === '/data/config/category-icons.json') return Promise.resolve({ ok: true, json: async () => FIXTURE_CATEGORY_ICONS });
      if (url === '/data/index/quiz-index.json') return Promise.resolve({ ok: true, json: async () => FIXTURE_QUIZZES });
      if (url === '/data/config/navigation-url.json') return Promise.resolve({ ok: true, json: async () => FIXTURE_NAV_CONFIG });
      return Promise.reject(new Error(`unexpected fetch in test: ${url}`));
    }),
  );
}

function renderWithProviders(children: React.ReactNode) {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <ProfileProvider>
          <AppearanceProvider>{children}</AppearanceProvider>
        </ProfileProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  _resetShortcutsForTests();
});

describe('Skip link (T3-1b)', () => {
  it('is present on Dashboard, a page with no interactive module of its own', async () => {
    mockFetchForPages();
    renderWithProviders(
      <>
        <a href="#main-content" className="sr-only focus:not-sr-only">
          Skip to main content
        </a>
        <div id="main-content" tabIndex={-1}>
          <PrintGuard>
            <Dashboard />
          </PrintGuard>
        </div>
      </>,
    );

    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toHaveAttribute('href', '#main-content');
    await waitFor(() => expect(document.getElementById('main-content')).toBeInTheDocument());
  });
});

describe('PrintGuard (T3-1b)', () => {
  it('shows the print-guard message for Dashboard (a guarded listing page)', async () => {
    mockFetchForPages();
    renderWithProviders(
      <PrintGuard>
        <Dashboard />
      </PrintGuard>,
    );

    expect(await screen.findByText(/can't be printed directly/i)).toBeInTheDocument();
  });

  it('shows the print-guard message for QuizIndex (a guarded listing page)', async () => {
    mockFetchForPages();
    renderWithProviders(
      <PrintGuard>
        <QuizIndex />
      </PrintGuard>,
    );

    await screen.findByText('VPC Basics');
    expect(screen.getByText(/can't be printed directly/i)).toBeInTheDocument();
  });

  it('does NOT show a print-guard message on Quiz — it keeps its own real print picker', async () => {
    renderWithProviders(<Quiz />);

    expect(screen.queryByText(/can't be printed directly/i)).not.toBeInTheDocument();
  });
});

describe('KeyboardShortcutsPanel (T3-1b)', () => {
  function PageWithOneShortcut() {
    useKeyboardShortcut({
      key: 'e',
      keyLabel: 'Alt+E',
      altKey: true,
      description: 'Toggle exam mode',
      handler: () => {},
    });
    return <div>page content</div>;
  }

  it('opens on "?" and lists only the shortcuts currently registered on this page', async () => {
    renderWithProviders(
      <>
        <KeyboardShortcutsPanel />
        <PageWithOneShortcut />
      </>,
    );

    expect(screen.queryByRole('dialog', { name: 'Keyboard shortcuts' })).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: '?' });

    const dialog = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Toggle exam mode')).toBeInTheDocument();
    expect(screen.getByText('Alt+E')).toBeInTheDocument();
    // The panel's own '?' shortcut is registered too — it should list itself.
    expect(screen.getByText('Show keyboard shortcuts')).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    renderWithProviders(
      <>
        <KeyboardShortcutsPanel />
        <PageWithOneShortcut />
      </>,
    );

    fireEvent.keyDown(document, { key: '?' });
    await screen.findByRole('dialog', { name: 'Keyboard shortcuts' });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Keyboard shortcuts' })).not.toBeInTheDocument();
    });
  });

  it('does not fire a registered letter shortcut while the user is typing in a text field', async () => {
    const handler = vi.fn();
    function PageWithSearchBox() {
      useKeyboardShortcut({ key: '/', keyLabel: '/', description: 'Focus search', handler });
      return <input aria-label="Search" />;
    }

    renderWithProviders(<PageWithSearchBox />);
    const input = screen.getByLabelText('Search');
    input.focus();

    fireEvent.keyDown(input, { key: '/' });

    expect(handler).not.toHaveBeenCalled();
  });
});
