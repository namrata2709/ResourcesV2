import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { List } from './List';

interface ContestProblem {
  id: string;
  title: string;
  difficulty: string;
}

const PROBLEMS: ContestProblem[] = [
  { id: 'p1', title: 'Two Sum', difficulty: 'Easy' },
  { id: 'p2', title: 'Merge Intervals', difficulty: 'Medium' },
];

describe('List', () => {
  it('renders one card per item, inside an accessible <ul>', () => {
    render(
      <List
        ariaLabel="Contest problems"
        items={PROBLEMS}
        itemKey={(p) => p.id}
        renderItem={(p) => (
          <>
            <p>{p.title}</p>
            <p>{p.difficulty}</p>
          </>
        )}
      />,
    );
    expect(screen.getByRole('list', { name: 'Contest problems' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Two Sum')).toBeInTheDocument();
    expect(screen.getByText('Merge Intervals')).toBeInTheDocument();
  });

  it('renders as a card list, NOT a table — the exact vanilla inconsistency this component exists to fix (dsa-contest.js renders cards, despite dead #contestContainer table CSS)', () => {
    render(
      <List
        ariaLabel="Contest problems"
        items={PROBLEMS}
        itemKey={(p) => p.id}
        renderItem={(p) => <p>{p.title}</p>}
      />,
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('row')).not.toBeInTheDocument();
  });

  it('renders nothing when items is empty', () => {
    const { container } = render(
      <List ariaLabel="Empty" items={[]} itemKey={(p: ContestProblem) => p.id} renderItem={(p: ContestProblem) => p.title} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('is generic over item shape — works for a YouTube-recommendation-style item just as well as a contest problem', () => {
    interface VideoRec {
      videoId: string;
      title: string;
      channel: string;
    }
    const videos: VideoRec[] = [{ videoId: 'v1', title: 'Merge Sort Explained', channel: 'CS Dojo' }];
    render(
      <List
        ariaLabel="Recommended videos"
        items={videos}
        itemKey={(v) => v.videoId}
        renderItem={(v) => (
          <>
            <p>{v.title}</p>
            <p>{v.channel}</p>
          </>
        )}
      />,
    );
    expect(screen.getByText('Merge Sort Explained')).toBeInTheDocument();
    expect(screen.getByText('CS Dojo')).toBeInTheDocument();
  });
});
