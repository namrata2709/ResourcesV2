import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { NotificationsBell } from './NotificationsBell';
import { addInboxNotification, _resetInboxForTests } from '../../lib/notificationsInbox';

afterEach(() => {
  _resetInboxForTests();
});

describe('NotificationsBell', () => {
  it('shows no unread badge when the inbox is empty', () => {
    render(<NotificationsBell />);
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('shows an accurate unread count on the badge', () => {
    addInboxNotification('First', 'info');
    addInboxNotification('Second', 'warning');
    render(<NotificationsBell />);

    expect(screen.getByRole('button', { name: 'Notifications, 2 unread' })).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('caps the visible badge count at "9+"', () => {
    for (let i = 0; i < 12; i++) addInboxNotification(`Item ${i}`, 'info');
    render(<NotificationsBell />);
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('opens the panel on click and lists items newest-first', () => {
    addInboxNotification('Older', 'info');
    addInboxNotification('Newer', 'success');
    render(<NotificationsBell />);

    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));

    const panel = screen.getByRole('dialog', { name: 'Notifications' });
    const rows = within(panel).getAllByRole('button', { name: /Older|Newer/ });
    expect(rows[0]).toHaveTextContent('Newer');
    expect(rows[1]).toHaveTextContent('Older');
  });

  it('shows an empty state when there are no notifications', () => {
    render(<NotificationsBell />);
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByText("You're all caught up.")).toBeInTheDocument();
  });

  it('clicking an item marks it read, clearing the unread count', () => {
    addInboxNotification('Unread item', 'info');
    render(<NotificationsBell />);

    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    fireEvent.click(screen.getByRole('button', { name: /Unread item/ }));

    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('"Mark all read" clears the unread count without removing items', () => {
    addInboxNotification('First', 'info');
    addInboxNotification('Second', 'info');
    render(<NotificationsBell />);

    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }));

    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    const panel = screen.getByRole('dialog', { name: 'Notifications' });
    expect(within(panel).getByText('First')).toBeInTheDocument();
    expect(within(panel).getByText('Second')).toBeInTheDocument();
  });

  it('"Clear all" empties the inbox and shows the empty state', () => {
    addInboxNotification('First', 'info');
    render(<NotificationsBell />);

    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(screen.getByText("You're all caught up.")).toBeInTheDocument();
  });

  it('closes the panel on Escape', () => {
    addInboxNotification('Something', 'info');
    render(<NotificationsBell />);

    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
  });

  it('closes the panel on an outside click', () => {
    addInboxNotification('Something', 'info');
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <NotificationsBell />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Notifications/ }));
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument();
  });
});
