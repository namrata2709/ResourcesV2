import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfileProvider } from '../../../context/ProfileContext';
import './ProfileSection'; // registers itself as a side effect — see sections/index.ts's own comment
import { getSettingsSections } from '../registry';

/**
 * ProfileSection.test.tsx
 *
 * Neither Settings.test.tsx (uses fake sections, deliberately, to prove
 * genericity) nor Dashboard.test.tsx (only reads the saved profile) cover
 * ProfileSection's own editing behavior — this closes that gap: each
 * field actually calls updateProfile() and persists to localStorage via
 * lib/profile.ts's saveProfile().
 *
 * No registry reset here (unlike Settings.test.tsx): Vitest isolates
 * module state per test file, and nothing in this file registers a
 * conflicting section, so the side-effect import above registering
 * 'profile' once is all these tests need.
 */

function renderProfileSection() {
  const section = getSettingsSections().find((s) => s.id === 'profile');
  if (!section) throw new Error('ProfileSection did not register itself — check the side-effect import above');
  return render(
    <ProfileProvider>
      <section.Component />
    </ProfileProvider>,
  );
}

describe('ProfileSection', () => {
  it('registers itself under the "profile" id with label "Profile"', () => {
    const section = getSettingsSections().find((s) => s.id === 'profile');
    expect(section?.label).toBe('Profile');
  });

  it('updating the name field persists to userProfile in localStorage', () => {
    renderProfileSection();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Namu' } });

    expect(JSON.parse(localStorage.getItem('userProfile') || '{}')).toMatchObject({ name: 'Namu' });
  });

  it('selecting an avatar marks it checked and persists it', () => {
    renderProfileSection();

    const rocket = screen.getByRole('radio', { name: 'Avatar 🚀' });
    expect(rocket).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(rocket);

    expect(rocket).toHaveAttribute('aria-checked', 'true');
    expect(JSON.parse(localStorage.getItem('userProfile') || '{}')).toMatchObject({ avatar: '🚀' });
  });

  it('updating the greeting and goal fields persists both independently', () => {
    renderProfileSection();

    fireEvent.change(screen.getByLabelText('Greeting'), { target: { value: 'Yo{name}' } });
    fireEvent.change(screen.getByLabelText(/Study goal/), { target: { value: 'Finish the SAA track' } });

    expect(JSON.parse(localStorage.getItem('userProfile') || '{}')).toMatchObject({
      greeting: 'Yo{name}',
      goal: 'Finish the SAA track',
    });
  });

  it('loads previously saved values on mount rather than starting blank', () => {
    localStorage.setItem(
      'userProfile',
      JSON.stringify({ v: 1, name: 'Existing Name', avatar: '🦉', greeting: 'Hi{name}', goal: 'Existing goal' }),
    );

    renderProfileSection();

    expect(screen.getByLabelText('Name')).toHaveValue('Existing Name');
    expect(screen.getByRole('radio', { name: 'Avatar 🦉' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Greeting')).toHaveValue('Hi{name}');
    expect(screen.getByLabelText(/Study goal/)).toHaveValue('Existing goal');
  });
});
