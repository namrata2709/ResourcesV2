import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuickActions } from './QuickActions';
import { saveQuickActionIds } from '../../lib/quickActions';

describe('QuickActions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the default action set when nothing is saved', () => {
    render(
      <MemoryRouter>
        <QuickActions />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Continue Reading' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start Quiz' })).toBeInTheDocument();
  });

  it('renders only the saved subset, in the saved order', () => {
    saveQuickActionIds(['search', 'gallery']);
    render(
      <MemoryRouter>
        <QuickActions />
      </MemoryRouter>
    );
    const links = screen.getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['Search', 'Gallery']);
  });

  it('links each action to its real route', () => {
    saveQuickActionIds(['favorites']);
    render(
      <MemoryRouter>
        <QuickActions />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Favorites' })).toHaveAttribute(
      'href',
      '/gallery?favorites=true'
    );
  });
});
