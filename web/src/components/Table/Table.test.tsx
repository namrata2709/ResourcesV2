import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Table } from './Table';

interface Term {
  id: string;
  term: string;
  definition: string;
}

const ROWS: Term[] = [
  { id: 't1', term: 'IAM', definition: 'Identity and Access Management' },
  { id: 't2', term: 'VPC', definition: 'Virtual Private Cloud' },
];

describe('Table', () => {
  it('renders one row per item, with the caption as the accessible table name', () => {
    render(
      <Table
        caption="AWS glossary terms"
        rows={ROWS}
        rowKey={(r) => r.id}
        columns={[
          { key: 'term', header: 'Term', render: (r) => r.term },
          { key: 'definition', header: 'Definition', render: (r) => r.definition },
        ]}
      />,
    );
    const table = screen.getByRole('table', { name: 'AWS glossary terms' });
    expect(table).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2 data rows
    expect(screen.getByText('IAM')).toBeInTheDocument();
    expect(screen.getByText('Virtual Private Cloud')).toBeInTheDocument();
  });

  it('renders whatever a column\'s render() returns, not just plain text (e.g. a checklist checkbox)', () => {
    render(
      <Table
        caption="Checklist"
        rows={ROWS}
        rowKey={(r) => r.id}
        columns={[
          {
            key: 'checked',
            header: 'Done',
            align: 'center',
            render: (r) => <input type="checkbox" aria-label={`Mark ${r.term} done`} />,
          },
          { key: 'term', header: 'Checkpoint', render: (r) => r.term },
        ]}
      />,
    );
    expect(screen.getByRole('checkbox', { name: 'Mark IAM done' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Mark VPC done' })).toBeInTheDocument();
  });

  it('renders nothing (not an empty table shell) when rows is empty', () => {
    const { container } = render(
      <Table caption="Empty" rows={[]} rowKey={(r: Term) => r.id} columns={[{ key: 'term', header: 'Term', render: (r: Term) => r.term }]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('column headers use scope="col" for accessible header association', () => {
    render(
      <Table
        caption="AWS glossary terms"
        rows={ROWS}
        rowKey={(r) => r.id}
        columns={[{ key: 'term', header: 'Term', render: (r) => r.term }]}
      />,
    );
    const header = screen.getByRole('columnheader', { name: 'Term' });
    expect(header).toHaveAttribute('scope', 'col');
  });
});
