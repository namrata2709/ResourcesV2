import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { useAnalyticsPageView } from './useAnalyticsPageView';
import { _resetAnalyticsForTests } from '../lib/analytics';

/**
 * Covers the T3-2a testing spec: "Route change fires an analytics
 * page-view event (mock gtag, assert it's called with the new path)".
 */

function TrackerOnPage({ label }: { label: string }) {
  useAnalyticsPageView();
  return <span>{label}</span>;
}

function Harness() {
  return (
    <Routes>
      <Route path="/" element={<TrackerOnPage label="home" />} />
      <Route path="/notes-index/aws" element={<TrackerOnPage label="aws-notes" />} />
    </Routes>
  );
}

afterEach(() => {
  _resetAnalyticsForTests();
  delete (window as unknown as { gtag?: unknown }).gtag;
});

describe('useAnalyticsPageView', () => {
  it('fires a page_view for the initial route', () => {
    window.gtag = vi.fn();

    render(
      <MemoryRouter initialEntries={['/']}>
        <Harness />
      </MemoryRouter>,
    );

    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'page_view',
      expect.objectContaining({ page_path: '/' }),
    );
  });

  it('fires a new page_view when the route changes', () => {
    window.gtag = vi.fn();

    function App() {
      return (
        <MemoryRouter initialEntries={['/']}>
          <Link to="/notes-index/aws">Go to AWS notes</Link>
          <Harness />
        </MemoryRouter>
      );
    }

    render(<App />);
    (window.gtag as ReturnType<typeof vi.fn>).mockClear();

    act(() => {
      screen.getByText('Go to AWS notes').click();
    });

    expect(window.gtag).toHaveBeenCalledWith(
      'event',
      'page_view',
      expect.objectContaining({ page_path: '/notes-index/aws' }),
    );
  });
});
