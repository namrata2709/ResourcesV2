import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ThemeProvider } from '../../context/ThemeContext';
import { Contact } from './Contact';

/**
 * Contact.test.tsx
 *
 * Covers B-1's "done when" list:
 *   - Contact page has all four listed sections: project info,
 *     contributor info, GitHub links, FAQ
 *   - the feedback area renders something usable even with no Google
 *     Form connected yet (mailto fallback, not a broken/empty iframe)
 *   - FAQ entries expand/collapse
 *
 * Contact renders <Logo>, which reads theme via useTheme() — needs a
 * real ThemeProvider around it, same as any other Logo consumer.
 */

function renderContact() {
  return render(
    <ThemeProvider>
      <Contact />
    </ThemeProvider>,
  );
}

describe('Contact', () => {
  afterEach(() => cleanup());

  it('renders the page heading', () => {
    renderContact();
    expect(screen.getByRole('heading', { name: 'Contact & Feedback', level: 1 })).toBeInTheDocument();
  });

  it('renders all four required sections: project info, contributor info, GitHub links, FAQ', () => {
    renderContact();
    expect(screen.getByRole('heading', { name: 'About the project' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: "Who's behind this" })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'GitHub' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'FAQ' })).toBeInTheDocument();
  });

  it('shows the mailto fallback (not a broken iframe) while no feedback form is configured', () => {
    renderContact();
    expect(screen.queryByTitle('Feedback form')).not.toBeInTheDocument();
    expect(
      screen.getByText(/feedback form isn't connected yet/i),
    ).toBeInTheDocument();
    const mailLinks = screen.getAllByRole('link', { name: /awslecturenotes@gmail\.com/i });
    expect(mailLinks.length).toBeGreaterThan(0);
    expect(mailLinks[0]).toHaveAttribute('href', expect.stringContaining('mailto:awslecturenotes@gmail.com'));
  });

  it('links to the GitHub repo and issues page', () => {
    renderContact();
    expect(screen.getByRole('link', { name: /source repository/i })).toHaveAttribute(
      'href',
      expect.stringContaining('github.com'),
    );
    expect(screen.getByRole('link', { name: /report an issue/i })).toHaveAttribute(
      'href',
      expect.stringContaining('/issues'),
    );
  });

  it('expands and collapses an FAQ entry on click', () => {
    renderContact();
    const question = screen.getByRole('button', { name: /what is notebook buddy/i });
    expect(question).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/structured notes, quizzes, and a gallery/i)).not.toBeInTheDocument();

    fireEvent.click(question);
    expect(question).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/structured notes, quizzes, and a gallery/i)).toBeInTheDocument();

    fireEvent.click(question);
    expect(question).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/structured notes, quizzes, and a gallery/i)).not.toBeInTheDocument();
  });

  it('links to the CC BY-NC 4.0 license', () => {
    renderContact();
    expect(screen.getByRole('link', { name: 'CC BY-NC 4.0' })).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by-nc/4.0/',
    );
  });
});
