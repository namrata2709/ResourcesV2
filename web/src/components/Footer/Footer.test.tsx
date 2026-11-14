import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '../../context/ThemeContext';
import { Footer } from './Footer';

/**
 * Footer.test.tsx
 *
 * Covers footer.js's ported contract:
 *   - subject is optional; disclaimer only renders for a subject that's
 *     both provided AND present in disclaimers.json
 *   - omitting `subject` entirely means no fetch at all, not just "fetch
 *     then render nothing" — asserted directly below, not inferred
 *
 * Footer renders <Logo>, which reads theme via useTheme() — needs a real
 * ThemeProvider around it, same as any other consumer.
 */

const FIXTURE_DISCLAIMERS = {
  disclaimers: {
    aws: 'This content is for educational purposes only.',
  },
};

function renderFooter(subject?: string) {
  return render(
    <ThemeProvider>
      <Footer subject={subject} />
    </ThemeProvider>,
  );
}

describe('Footer', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => FIXTURE_DISCLAIMERS,
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the AWS disclaimer when subject="aws" matches disclaimers.json', async () => {
    renderFooter('aws');
    await waitFor(() =>
      expect(screen.getByText(/This content is for educational purposes only\./)).toBeInTheDocument(),
    );
    expect(screen.getByText('Disclaimer:')).toBeInTheDocument();
  });

  it('renders no disclaimer block and makes no fetch when subject is omitted', async () => {
    renderFooter(undefined);

    // Give any stray effects a tick to run, then assert the negative —
    // both that nothing rendered AND that fetch was never called, per
    // the component's own documented contract ("no fetch and no
    // disclaimer" when subject is absent, not just "fetch then hide it").
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText('Disclaimer:')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('renders no disclaimer when subject is provided but has no matching entry', async () => {
    renderFooter('dsa'); // not present in FIXTURE_DISCLAIMERS
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.queryByText('Disclaimer:')).not.toBeInTheDocument();
  });
});
