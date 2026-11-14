import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ContestModule } from './ContestModule';

const CONTEST_FIXTURE = {
  title: 'Contest Problems',
  problems: [{ id: 'c1', title: 'Weekly 400 - Q2', difficulty: 'Medium', url: 'https://leetcode.com/contest/weekly-400/problems/q2/' }],
};

const YOUTUBE_FIXTURE = {
  title: 'YouTube Recommendations',
  videos: [{ id: 'y1', title: 'Merge Sort Visualized', url: 'https://youtube.com/watch?v=abc', channel: 'CS Dojo', duration: '12:34' }],
};

function mockFetch(overrides: { contest?: unknown; youtube?: unknown } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      if (url.includes('/json/contest.json')) {
        if (overrides.contest === 'missing') return Promise.resolve({ ok: false, status: 404 });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(overrides.contest ?? CONTEST_FIXTURE) });
      }
      if (url.includes('/json/youtube.json')) {
        if (overrides.youtube === 'missing') return Promise.resolve({ ok: false, status: 404 });
        return Promise.resolve({ ok: true, json: () => Promise.resolve(overrides.youtube ?? YOUTUBE_FIXTURE) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }),
  );
}

describe('ContestModule', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders Contest Problems and YouTube Recommendations, both as card Lists (NOT tables — the confirmed vanilla shape)', async () => {
    mockFetch();
    render(<ContestModule folder="dsa-merge-sort" />);
    expect(await screen.findByRole('list', { name: 'Contest Problems' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'YouTube Recommendations' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Weekly 400 - Q2' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Merge Sort Visualized' })).toBeInTheDocument();
    expect(screen.getByText(/CS Dojo/)).toBeInTheDocument();
  });

  it('renders only the section that has data when the other is missing', async () => {
    mockFetch({ youtube: 'missing' });
    render(<ContestModule folder="dsa-merge-sort" />);
    expect(await screen.findByRole('list', { name: 'Contest Problems' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'YouTube Recommendations' })).not.toBeInTheDocument();
  });

  it('renders nothing when neither contest.json nor youtube.json exist', async () => {
    mockFetch({ contest: 'missing', youtube: 'missing' });
    const { container } = render(<ContestModule folder="dsa-merge-sort" />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
