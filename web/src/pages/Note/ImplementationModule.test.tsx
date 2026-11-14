import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImplementationModule } from './ImplementationModule';

const IMPLEMENTATION_FIXTURE = {
  languages: [
    { id: 'python', label: 'Python', code: 'def merge_sort(arr): ...' },
    { id: 'java', label: 'Java', code: 'void mergeSort(int[] arr) { ... }' },
  ],
};

function mockFetch(payload: unknown = IMPLEMENTATION_FIXTURE, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => (ok ? Promise.resolve({ ok: true, json: () => Promise.resolve(payload) }) : Promise.resolve({ ok: false, status: 404 }))),
  );
}

describe('ImplementationModule', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders code-language tabs via the shared TabPanel, one pane per language', async () => {
    mockFetch();
    render(<ImplementationModule folder="dsa-merge-sort" />);
    expect(await screen.findByRole('tablist', { name: 'Implementation language' })).toBeInTheDocument();
    expect(screen.getByText('def merge_sort(arr): ...')).toBeInTheDocument();
    expect(screen.queryByText('void mergeSort(int[] arr) { ... }')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Java' }));
    expect(screen.getByText('void mergeSort(int[] arr) { ... }')).toBeInTheDocument();
  });

  it('renders nothing when the note has no implementation.json', async () => {
    mockFetch(null, false);
    const { container } = render(<ImplementationModule folder="dsa-merge-sort" />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
