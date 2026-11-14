import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useLiveRegion } from './useLiveRegion';

/**
 * useLiveRegion.test.ts
 *
 * Covers the fixed contract (see lib/liveRegion.ts's ensureLiveRegion):
 *   - the shared #app-live-region node exists with aria-live="polite"
 *     as soon as a component using this hook mounts — NOT only after the
 *     first announce() call. (This was a real gap caught by this test
 *     spec: the node used to be created lazily inside
 *     announceToLiveRegion() itself. Fixed in lib/liveRegion.ts +
 *     hooks/useLiveRegion.ts alongside adding this test.)
 *   - announce(message) updates that node's text content
 */

describe('useLiveRegion', () => {
  it('creates the live region with aria-live="polite" at mount, before any announce() call', () => {
    renderHook(() => useLiveRegion());

    const region = document.getElementById('app-live-region');
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('updates the live region text content when announce() is called', async () => {
    const { result } = renderHook(() => useLiveRegion());

    act(() => {
      result.current.announce('Theme switched to Dark mode');
    });

    // announceToLiveRegion clears then re-sets text on a short delay (so
    // identical consecutive messages still get announced) — wait for it
    // rather than asserting synchronously.
    await waitFor(() => {
      expect(document.getElementById('app-live-region')).toHaveTextContent('Theme switched to Dark mode');
    });
  });

  it('does not create a second node if the region already exists', () => {
    renderHook(() => useLiveRegion());
    renderHook(() => useLiveRegion());

    expect(document.querySelectorAll('#app-live-region')).toHaveLength(1);
  });
});
