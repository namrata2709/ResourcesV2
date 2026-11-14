import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders correct ARIA attributes for a mid-range percent', () => {
    render(<ProgressBar percent={42} ariaLabel="Test progress" />);
    const bar = screen.getByRole('progressbar', { name: 'Test progress' });
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps values above 100', () => {
    render(<ProgressBar percent={150} ariaLabel="Over" />);
    expect(screen.getByRole('progressbar', { name: 'Over' })).toHaveAttribute('aria-valuenow', '100');
  });

  it('clamps values below 0', () => {
    render(<ProgressBar percent={-20} ariaLabel="Under" />);
    expect(screen.getByRole('progressbar', { name: 'Under' })).toHaveAttribute('aria-valuenow', '0');
  });

  it('supports a custom label override, for non-percent use cases like quiz answered/total', () => {
    render(<ProgressBar percent={30} labelText="3 / 10 answered" ariaLabel="Quiz progress" />);
    expect(screen.getByText('3 / 10 answered')).toBeInTheDocument();
  });
});
