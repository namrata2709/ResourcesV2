import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JumpToTopButton } from './JumpToTopButton';

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', { value, writable: true, configurable: true });
}

describe('JumpToTopButton', () => {
  afterEach(() => {
    setScrollY(0);
  });

  it('is hidden before the scroll threshold', () => {
    setScrollY(0);
    render(<JumpToTopButton />);
    expect(screen.queryByRole('button', { name: 'Jump to top' })).not.toBeInTheDocument();
  });

  it('appears once scrolled past the threshold', async () => {
    setScrollY(0);
    render(<JumpToTopButton />);
    setScrollY(600);
    fireEvent.scroll(window);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Jump to top' })).toBeInTheDocument();
    });
  });

  it('scrolls to top when clicked', async () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    setScrollY(600);
    render(<JumpToTopButton />);
    fireEvent.scroll(window);
    const button = await screen.findByRole('button', { name: 'Jump to top' });
    fireEvent.click(button);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('hides again once scrolled back above the threshold', async () => {
    setScrollY(600);
    render(<JumpToTopButton />);
    fireEvent.scroll(window);
    await screen.findByRole('button', { name: 'Jump to top' });

    setScrollY(0);
    fireEvent.scroll(window);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Jump to top' })).not.toBeInTheDocument();
    });
  });
});
