import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProfileProvider } from '../../context/ProfileContext';
import { UserMenu } from './UserMenu';
import { saveProfile, DEFAULT_PROFILE } from '../../lib/profile';
import { setDailyGoal, clearDailyGoal } from '../../lib/dailyGoal';

function renderMenu() {
  return render(
    <MemoryRouter>
      <ProfileProvider>
        <UserMenu />
      </ProfileProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  clearDailyGoal();
});

describe('UserMenu', () => {
  it('shows the default avatar and a sensible default when no profile is set', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: 'User menu' })).toHaveTextContent(
      DEFAULT_PROFILE.avatar,
    );
  });

  it("uses the person's real name in the trigger label once a profile is set", () => {
    saveProfile({ v: 1, name: 'Namrata', avatar: '🚀', greeting: 'Good {timeOfDay}{name}', goal: '' });
    renderMenu();
    expect(screen.getByRole('button', { name: 'Menu for Namrata' })).toBeInTheDocument();
  });

  it('opens the panel on click, showing the greeting and avatar', () => {
    saveProfile({ v: 1, name: 'Namrata', avatar: '🚀', greeting: 'Good {timeOfDay}{name}', goal: '' });
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: 'Menu for Namrata' }));

    const panel = screen.getByRole('dialog', { name: 'User menu' });
    expect(panel).toHaveTextContent('Namrata');
  });

  it('shows the stored study goal when set', () => {
    saveProfile({
      v: 1,
      name: 'Namrata',
      avatar: '🚀',
      greeting: 'Good {timeOfDay}{name}',
      goal: 'Finish the AWS SAA track by September',
    });
    renderMenu();

    fireEvent.click(screen.getByRole('button', { name: 'Menu for Namrata' }));
    expect(screen.getByText('Finish the AWS SAA track by September')).toBeInTheDocument();
  });

  it('shows "No daily goal set" when none is chosen', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'User menu' }));
    expect(screen.getByText('No daily goal set')).toBeInTheDocument();
  });

  it('shows a real daily goal progress summary once one is chosen', () => {
    setDailyGoal('mcqs', 25);
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'User menu' }));
    expect(screen.getByText('0 / 25 MCQs')).toBeInTheDocument();
  });

  it('links to /settings and closes the menu on click', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'User menu' }));

    const settingsLink = screen.getByRole('link', { name: 'Settings' });
    expect(settingsLink).toHaveAttribute('href', '/settings');

    fireEvent.click(settingsLink);
    expect(screen.queryByRole('dialog', { name: 'User menu' })).not.toBeInTheDocument();
  });

  it('does not link to Achievements, since that page does not exist yet', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'User menu' }));
    expect(screen.queryByRole('link', { name: /Achievements/i })).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'User menu' }));
    expect(screen.getByRole('dialog', { name: 'User menu' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'User menu' })).not.toBeInTheDocument();
  });

  it('closes on an outside click', () => {
    render(
      <MemoryRouter>
        <ProfileProvider>
          <div>
            <div data-testid="outside">Outside</div>
            <UserMenu />
          </div>
        </ProfileProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'User menu' }));
    expect(screen.getByRole('dialog', { name: 'User menu' })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('dialog', { name: 'User menu' })).not.toBeInTheDocument();
  });
});
