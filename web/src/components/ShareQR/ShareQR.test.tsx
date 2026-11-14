import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ShareQR } from './ShareQR';

/**
 * ShareQR.test.tsx — covers the trigger/modal wiring that B-8, T5-3a,
 * and T5-1 all rely on identically: open on click, render the URL and a
 * canvas, close on the close button / Escape / backdrop click, and
 * don't leak a click to a parent card (same guard CardQuickActions'
 * buttons already need, since this button is meant to sit in the same
 * card row).
 */
describe('ShareQR', () => {
  afterEach(() => cleanup());

  it('is closed by default and opens the QR modal on click', () => {
    render(<ShareQR url="https://example.com/quiz/aws-101" label="this quiz" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Show QR code for this quiz'));

    expect(screen.getByRole('dialog', { name: 'QR code for this quiz' })).toBeInTheDocument();
    expect(screen.getByText('https://example.com/quiz/aws-101')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'QR code' })).toBeInTheDocument();
  });

  it("stops click propagation, so a parent card's onClick doesn't also fire", () => {
    const cardClick = vi.fn();
    render(
      <div onClick={cardClick}>
        <ShareQR url="https://example.com/note/ec2" label="this note" />
      </div>
    );
    fireEvent.click(screen.getByLabelText('Show QR code for this note'));
    expect(cardClick).not.toHaveBeenCalled();
  });

  it('closes on the close button', () => {
    render(<ShareQR url="https://example.com" label="the hub" />);
    fireEvent.click(screen.getByLabelText('Show QR code for the hub'));
    fireEvent.click(screen.getByLabelText('Close QR code dialog'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<ShareQR url="https://example.com" label="the hub" />);
    fireEvent.click(screen.getByLabelText('Show QR code for the hub'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on backdrop click', () => {
    const { container } = render(<ShareQR url="https://example.com" label="the hub" />);
    fireEvent.click(screen.getByLabelText('Show QR code for the hub'));
    const backdrop = container.querySelector('.bg-black\\/40');
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop as Element);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('copies the link to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ShareQR url="https://example.com/quiz/aws-101" label="this quiz" />);
    fireEvent.click(screen.getByLabelText('Show QR code for this quiz'));
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    expect(writeText).toHaveBeenCalledWith('https://example.com/quiz/aws-101');
    expect(await screen.findByRole('button', { name: 'Copied!' })).toBeInTheDocument();
  });
});
