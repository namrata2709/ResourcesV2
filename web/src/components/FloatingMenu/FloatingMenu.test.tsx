import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloatingMenu, type FloatingMenuItem } from './FloatingMenu';

describe('FloatingMenu', () => {
  it('is closed by default and opens the panel on trigger click', () => {
    render(<FloatingMenu label="Settings" icon={<span>icon</span>} items={[]} />);
    expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
  });

  it('fires onSelect and closes the menu for a plain item', () => {
    const onSelect = vi.fn();
    const items: FloatingMenuItem[] = [{ key: 'a', label: 'Item A', onSelect }];
    render(<FloatingMenu label="Tools" icon={<span>icon</span>} items={items} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tools' }));
    fireEvent.click(screen.getByRole('button', { name: 'Item A' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Tools' })).not.toBeInTheDocument();
  });

  it('expands an inline submenu instead of firing onSelect, and closes the whole menu once a sub-item is chosen', () => {
    const subSelect = vi.fn();
    const items: FloatingMenuItem[] = [
      {
        key: 'print',
        label: 'Print',
        submenu: [{ key: 'full', label: 'Full page', onSelect: subSelect }],
      },
    ];
    render(<FloatingMenu label="Tools" icon={<span>icon</span>} items={items} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tools' }));
    fireEvent.click(screen.getByRole('button', { name: 'Print' }));
    expect(screen.getByRole('button', { name: 'Full page' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Full page' }));
    expect(subSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Tools' })).not.toBeInTheDocument();
  });

  it('omits items marked hidden', () => {
    const items: FloatingMenuItem[] = [
      { key: 'a', label: 'Visible item', onSelect: vi.fn() },
      { key: 'b', label: 'Hidden item', onSelect: vi.fn(), hidden: true },
    ];
    render(<FloatingMenu label="Tools" icon={<span>icon</span>} items={items} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tools' }));

    expect(screen.getByRole('button', { name: 'Visible item' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hidden item' })).not.toBeInTheDocument();
  });

  it('closes on Escape and on an outside click', () => {
    render(<FloatingMenu label="Settings" icon={<span>icon</span>} items={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument();
  });

  it('shows a detail line under the label and marks toggle items as aria-pressed', () => {
    const items: FloatingMenuItem[] = [
      { key: 'lite', label: 'Lite Mode', detail: 'Off', pressed: false, onSelect: vi.fn() },
    ];
    render(<FloatingMenu label="Settings" icon={<span>icon</span>} items={items} />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    const btn = screen.getByRole('button', { name: 'Lite Mode: Off' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });
});
