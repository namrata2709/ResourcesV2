import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('renders page buttons and reports clicks correctly', () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={2} totalPages={4} onPageChange={onPageChange} />);

    expect(screen.getByLabelText('Page 2')).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByLabelText('Page 3'));
    expect(onPageChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByLabelText('Next page'));
    expect(onPageChange).toHaveBeenCalledWith(3);

    fireEvent.click(screen.getByLabelText('Previous page'));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('disables Previous on page 1 and Next on the last page', () => {
    render(<Pagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />);
    // totalPages <= 1 -> renders nothing at all
    expect(screen.queryByLabelText('Next page')).not.toBeInTheDocument();
  });

  it('disables the correct edge button at each boundary', () => {
    const { rerender } = render(<Pagination currentPage={1} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('Next page')).not.toBeDisabled();

    rerender(<Pagination currentPage={3} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });
});
