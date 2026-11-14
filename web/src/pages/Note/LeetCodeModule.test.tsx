import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LeetCodeModule } from './LeetCodeModule';

const LEETCODE_FIXTURE = {
  title: 'LeetCode Problems',
  problems: [
    { id: 'l1', title: 'Merge Sorted Array', difficulty: 'Easy', url: 'https://leetcode.com/problems/merge-sorted-array/', pattern: 'Two Pointers' },
    { id: 'l2', title: 'Sort List', difficulty: 'Medium', url: 'https://leetcode.com/problems/sort-list/' },
  ],
};

function mockFetch(payload: unknown = LEETCODE_FIXTURE, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => (ok ? Promise.resolve({ ok: true, json: () => Promise.resolve(payload) }) : Promise.resolve({ ok: false, status: 404 }))),
  );
}

describe('LeetCodeModule', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders LeetCode problems via the shared Table, as a real <table> (confirmed vanilla shape)', async () => {
    mockFetch();
    render(<LeetCodeModule folder="dsa-merge-sort" />);
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Merge Sorted Array' })).toHaveAttribute(
      'href',
      'https://leetcode.com/problems/merge-sorted-array/',
    );
    expect(screen.getByText('Two Pointers')).toBeInTheDocument();
    expect(screen.getByText('Sort List')).toBeInTheDocument();
    // No url on the second row's pattern column -> falls back to em-dash.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('renders nothing when the note has no leetcode.json', async () => {
    mockFetch(null, false);
    const { container } = render(<LeetCodeModule folder="dsa-merge-sort" />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
