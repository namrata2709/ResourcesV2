import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { LinkPage } from './LinkPage';

const SAMPLE = `---
name: Namu
title: Instructor & Course Creator
description: Welcome!
avatar: /icons/logo-icon.png
social:
  github: https://github.com/namu
---

## Resources

- [AWS Notes](https://example.com/aws): Full notes for the AWS course

> Next live session: Saturday 10:00 AM
`;

describe('LinkPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows a loading state before the profile markdown resolves', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<LinkPage slug="namu" />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('renders the parsed profile once the fetch resolves', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(SAMPLE) })
    );

    render(<LinkPage slug="namu" />);

    expect(await screen.findByRole('heading', { name: 'Namu', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Instructor & Course Creator')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /AWS Notes/ })).toHaveAttribute(
      'href',
      'https://example.com/aws'
    );
    expect(screen.getByText('Next live session: Saturday 10:00 AM')).toBeInTheDocument();
  });

  it('shows an error state when the fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    render(<LinkPage slug="unknown" />);

    expect(await screen.findByText(/isn't available right now/)).toBeInTheDocument();
  });
});
