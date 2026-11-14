import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Settings } from './Settings';
import { registerSettingsSection, __resetSettingsSectionsForTests } from './registry';

/**
 * Settings.test.tsx
 *
 * Covers P0-0's two "done when" contracts:
 *   - /settings renders correctly with zero sections registered (P0-0
 *     lands before any of P0-1/P0-2/P0-7/P0-8/P0-9 register anything)
 *   - registering a section is a one-line addition that Settings.tsx
 *     itself needs no change to pick up — proven by registering a fake
 *     section here, entirely outside Settings.tsx's own code
 *
 * Real sections (e.g. ProfileSection from P0-1) are imported via
 * ./sections in Settings.tsx itself, so importing Settings here already
 * registers whatever real sections exist. __resetSettingsSectionsForTests
 * clears the registry between tests so these two concerns (zero-state vs.
 * fake-section-registration) don't bleed into each other.
 */

afterEach(() => {
  __resetSettingsSectionsForTests();
});

function FakeSectionA() {
  return <p>Fake section A content</p>;
}

function FakeSectionB() {
  return <p>Fake section B content</p>;
}

describe('Settings', () => {
  it('renders the heading and an empty-state message with zero sections registered', () => {
    __resetSettingsSectionsForTests();
    render(<Settings />);

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('No settings available yet.')).toBeInTheDocument();
    // No section nav should render at all when there's nothing to navigate.
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('picks up a section registered entirely outside Settings.tsx, with zero page-code changes', () => {
    __resetSettingsSectionsForTests();
    registerSettingsSection({ id: 'fake-a', label: 'Fake A', Component: FakeSectionA });
    registerSettingsSection({ id: 'fake-b', label: 'Fake B', Component: FakeSectionB });

    render(<Settings />);

    expect(screen.getByRole('button', { name: 'Fake A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fake B' })).toBeInTheDocument();
    // First registered section is shown by default.
    expect(screen.getByText('Fake section A content')).toBeInTheDocument();
    expect(screen.queryByText('Fake section B content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fake B' }));

    expect(screen.getByText('Fake section B content')).toBeInTheDocument();
    expect(screen.queryByText('Fake section A content')).not.toBeInTheDocument();
  });
});
