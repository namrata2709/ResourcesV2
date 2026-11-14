import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SidebarNav } from './SidebarNav';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SidebarNav />
    </MemoryRouter>,
  );
}

describe('SidebarNav', () => {
  it('renders the 5 primary destinations, each pointing at a real route', () => {
    renderAt('/');
    const home = screen.getAllByRole('link', { name: /home/i });
    expect(home.length).toBeGreaterThan(0);
    home.forEach((link) => expect(link).toHaveAttribute('href', '/'));

    const aws = screen.getAllByRole('link', { name: /^aws$/i });
    aws.forEach((link) => expect(link).toHaveAttribute('href', '/notes-index/aws'));

    const dsa = screen.getAllByRole('link', { name: /^dsa$/i });
    dsa.forEach((link) => expect(link).toHaveAttribute('href', '/notes-index/dsa'));

    const quizzes = screen.getAllByRole('link', { name: /quizzes/i });
    quizzes.forEach((link) => expect(link).toHaveAttribute('href', '/quiz-index'));

    const calendar = screen.getAllByRole('link', { name: /calendar/i });
    calendar.forEach((link) => expect(link).toHaveAttribute('href', '/calendar'));
  });

  it('marks Home as the current page at "/"', () => {
    renderAt('/');
    const home = screen.getAllByRole('link', { name: /home/i });
    home.forEach((link) => expect(link).toHaveAttribute('aria-current', 'page'));

    const aws = screen.getAllByRole('link', { name: /^aws$/i });
    aws.forEach((link) => expect(link).not.toHaveAttribute('aria-current'));
  });

  it('marks AWS as the current page under /notes-index/aws, not Home or DSA', () => {
    renderAt('/notes-index/aws');
    const aws = screen.getAllByRole('link', { name: /^aws$/i });
    aws.forEach((link) => expect(link).toHaveAttribute('aria-current', 'page'));

    const home = screen.getAllByRole('link', { name: /home/i });
    home.forEach((link) => expect(link).not.toHaveAttribute('aria-current'));

    const dsa = screen.getAllByRole('link', { name: /^dsa$/i });
    dsa.forEach((link) => expect(link).not.toHaveAttribute('aria-current'));
  });

  it('renders secondary destinations (Settings, Contact, Gallery, etc.) in the full nav', () => {
    renderAt('/');
    expect(screen.getAllByRole('link', { name: /settings/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /contact/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /gallery/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /search my notes/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /export/i }).length).toBeGreaterThan(0);
  });

  it('the mobile "More" button opens a sheet exposing the secondary destinations', () => {
    renderAt('/');
    const moreButton = screen.getByRole('button', { name: /more/i });
    expect(moreButton).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(moreButton);
    expect(moreButton).toHaveAttribute('aria-expanded', 'true');

    const sheet = screen.getByRole('dialog', { name: /more navigation/i });
    expect(within(sheet).getByRole('link', { name: /settings/i })).toHaveAttribute(
      'href',
      '/settings',
    );
    expect(within(sheet).getByRole('link', { name: /contact/i })).toHaveAttribute(
      'href',
      '/contact',
    );
  });

  it('closes the "More" sheet via its close button', () => {
    renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: /more/i }));
    expect(screen.getByRole('dialog', { name: /more navigation/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog', { name: /more navigation/i })).not.toBeInTheDocument();
  });
});
