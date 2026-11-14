import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import './OfflineReadingSection'; // registers itself as a side effect — see sections/index.ts's own comment
import { getSettingsSections } from '../registry';
import * as serviceWorkerLib from '../../../lib/serviceWorker';

/**
 * OfflineReadingSection.test.tsx — same shape as AccessibilitySection's
 * own test file. lib/serviceWorker.ts's real functions are mocked here
 * (that module's own real behavior is covered by serviceWorker.test.ts)
 * so these tests focus purely on: does the toggle call the right
 * function, does an unavailable-on-localhost refusal show the right
 * message, does "Clear offline data" call through correctly.
 */

function renderOfflineReadingSection() {
  const section = getSettingsSections().find((s) => s.id === 'offline-reading');
  if (!section) throw new Error('OfflineReadingSection did not register itself — check the side-effect import above');
  return render(<section.Component />);
}

describe('OfflineReadingSection', () => {
  beforeEach(() => {
    vi.spyOn(serviceWorkerLib, 'isOfflineReadingEnabled').mockReturnValue(false);
    vi.spyOn(serviceWorkerLib, 'enableOfflineReading').mockReturnValue(true);
    vi.spyOn(serviceWorkerLib, 'disableOfflineReading').mockResolvedValue(undefined);
    vi.spyOn(serviceWorkerLib, 'clearOfflineCaches').mockResolvedValue(undefined);
    vi.spyOn(serviceWorkerLib, 'estimateOfflineStorageUsage').mockResolvedValue(12_582_912); // ~12 MB
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers itself under the "offline-reading" id with label "Offline Reading"', () => {
    const section = getSettingsSections().find((s) => s.id === 'offline-reading');
    expect(section?.label).toBe('Offline Reading');
  });

  it('defaults to off for a first-time visitor', async () => {
    renderOfflineReadingSection();
    expect(screen.getByRole('switch', { name: /Offline reading/ })).not.toBeChecked();
    await waitFor(() => expect(serviceWorkerLib.estimateOfflineStorageUsage).toHaveBeenCalled());
  });

  it('reflects a previously enabled preference on mount', async () => {
    vi.mocked(serviceWorkerLib.isOfflineReadingEnabled).mockReturnValue(true);
    renderOfflineReadingSection();
    expect(screen.getByRole('switch', { name: /Offline reading/ })).toBeChecked();
    await waitFor(() => expect(serviceWorkerLib.estimateOfflineStorageUsage).toHaveBeenCalled());
  });

  it('turning the toggle on calls enableOfflineReading()', async () => {
    renderOfflineReadingSection();

    await act(async () => {
      fireEvent.click(screen.getByRole('switch', { name: /Offline reading/ }));
    });

    expect(serviceWorkerLib.enableOfflineReading).toHaveBeenCalled();
    expect(screen.getByRole('switch', { name: /Offline reading/ })).toBeChecked();
  });

  it('shows an explanatory message and leaves the toggle off when enabling is refused (e.g. localhost)', async () => {
    vi.mocked(serviceWorkerLib.enableOfflineReading).mockReturnValue(false);
    renderOfflineReadingSection();

    await act(async () => {
      fireEvent.click(screen.getByRole('switch', { name: /Offline reading/ }));
    });

    expect(screen.getByRole('switch', { name: /Offline reading/ })).not.toBeChecked();
    expect(screen.getByRole('alert')).toHaveTextContent(/isn't available while running locally/i);
  });

  it('turning the toggle off calls disableOfflineReading()', async () => {
    vi.mocked(serviceWorkerLib.isOfflineReadingEnabled).mockReturnValue(true);
    renderOfflineReadingSection();

    await act(async () => {
      fireEvent.click(screen.getByRole('switch', { name: /Offline reading/ }));
    });

    expect(serviceWorkerLib.disableOfflineReading).toHaveBeenCalled();
    expect(screen.getByRole('switch', { name: /Offline reading/ })).not.toBeChecked();
  });

  it('shows the estimated storage usage once it resolves', async () => {
    renderOfflineReadingSection();
    await waitFor(() => {
      expect(screen.getByText(/approximately 12\.0 MB used/i)).toBeInTheDocument();
    });
  });

  it('shows a fallback message when storage usage is unavailable', async () => {
    vi.mocked(serviceWorkerLib.estimateOfflineStorageUsage).mockResolvedValue(null);
    renderOfflineReadingSection();
    await waitFor(() => {
      expect(screen.getByText(/storage usage isn.t available/i)).toBeInTheDocument();
    });
  });

  it('"Clear offline data" calls clearOfflineCaches() and shows confirmation', async () => {
    renderOfflineReadingSection();

    fireEvent.click(screen.getByRole('button', { name: /Clear offline data/i }));

    await waitFor(() => {
      expect(serviceWorkerLib.clearOfflineCaches).toHaveBeenCalled();
    });
    expect(await screen.findByText(/offline data cleared/i)).toBeInTheDocument();
  });
});
