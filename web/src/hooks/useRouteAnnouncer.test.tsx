import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { useRouteAnnouncer } from './useRouteAnnouncer';

/**
 * useRouteAnnouncer.test.tsx
 *
 * Covers T3-2b's "Done when" items for route-change behavior, previously
 * untested despite the hook itself already being built and wired into
 * App.tsx:
 *   - scroll-to-top fires on every route change (the explicit decision
 *     documented in the hook's own header, not React Router's default)
 *   - focus moves to #main-content on every route change, so a
 *     screen-reader user isn't left focused on whatever they clicked
 *   - the new page is announced via the shared live region — but NOT on
 *     the very first render, since a page's own title/heading already
 *     covers that case (announcing there would be redundant noise)
 */

function Page({ label }: { label: string }) {
  useRouteAnnouncer();
  return <span>{label}</span>;
}

function Harness() {
  return (
    <>
      <div id="main-content" tabIndex={-1} />
      <Routes>
        <Route path="/" element={<Page label="home" />} />
        <Route path="/quiz-index" element={<Page label="quizzes" />} />
      </Routes>
    </>
  );
}

afterEach(() => {
  document.getElementById('app-live-region')?.remove();
});

describe('useRouteAnnouncer', () => {
  it('scrolls to top and focuses #main-content on route change, but does not announce the initial route', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );

    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    expect(document.activeElement).toBe(document.getElementById('main-content'));
    // Initial load: no "Navigated to X" announcement — see the hook's
    // own header for why this would be redundant with the page's title.
    expect(document.getElementById('app-live-region')).toHaveTextContent('');

    scrollToSpy.mockRestore();
  });

  it('scrolls to top, refocuses #main-content, and announces the new page on a real navigation', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    function App() {
      return (
        <MemoryRouter initialEntries={['/']}>
          <Link to="/quiz-index">Go to quizzes</Link>
          <Harness />
        </MemoryRouter>
      );
    }

    render(<App />);
    scrollToSpy.mockClear();

    act(() => {
      screen.getByText('Go to quizzes').click();
    });

    expect(scrollToSpy).toHaveBeenCalledWith(0, 0);
    expect(document.activeElement).toBe(document.getElementById('main-content'));

    await waitFor(() => {
      expect(document.getElementById('app-live-region')).toHaveTextContent('Navigated to Quizzes');
    });

    scrollToSpy.mockRestore();
  });
});
