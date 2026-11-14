import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VisualisationModule } from './VisualisationModule';

function mockFetch(payload: unknown, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => (ok ? Promise.resolve({ ok: true, json: () => Promise.resolve(payload) }) : Promise.resolve({ ok: false, status: 404 }))),
  );
}

describe('VisualisationModule', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('renders the Images/Animation toggle via TabPanel when both exist', async () => {
    mockFetch({
      images: ['/img/merge-sort-1.png', '/img/merge-sort-2.png'],
      animationSrc: '/data/notes/dsa-merge-sort/animation/merge-sort.html',
    });
    render(<VisualisationModule folder="dsa-merge-sort" title="Merge Sort" />);
    expect(await screen.findByRole('tablist', { name: 'Visualisation view' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /image 1 of 2/ })).toBeInTheDocument();
    expect(screen.queryByTitle('Merge Sort animation')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Animation' }));
    expect(screen.getByTitle('Merge Sort animation')).toHaveAttribute(
      'src',
      '/data/notes/dsa-merge-sort/animation/merge-sort.html',
    );
  });

  it('renders just the image slideshow, no tab strip, when there is no animation (a single real pane, not a fake choice)', async () => {
    mockFetch({ images: ['/img/merge-sort-1.png'] });
    render(<VisualisationModule folder="dsa-merge-sort" title="Merge Sort" />);
    expect(await screen.findByRole('img', { name: /image 1 of 1/ })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    // Single image -> no prev/next controls.
    expect(screen.queryByRole('button', { name: 'Next image' })).not.toBeInTheDocument();
  });

  it('supports prev/next navigation through multiple images', async () => {
    mockFetch({ images: ['/img/1.png', '/img/2.png', '/img/3.png'] });
    render(<VisualisationModule folder="dsa-merge-sort" title="Merge Sort" />);
    expect(await screen.findByRole('img', { name: /image 1 of 3/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next image' }));
    expect(screen.getByRole('img', { name: /image 2 of 3/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Previous image' }));
    expect(screen.getByRole('img', { name: /image 1 of 3/ })).toBeInTheDocument();
  });

  it('renders just the animation, no tab strip, when there are no images', async () => {
    mockFetch({ animationSrc: '/data/notes/dsa-merge-sort/animation/merge-sort.html' });
    render(<VisualisationModule folder="dsa-merge-sort" title="Merge Sort" />);
    expect(await screen.findByTitle('Merge Sort animation')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('renders nothing when the note has no visualisation.json', async () => {
    mockFetch(null, false);
    const { container } = render(<VisualisationModule folder="dsa-merge-sort" title="Merge Sort" />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});
