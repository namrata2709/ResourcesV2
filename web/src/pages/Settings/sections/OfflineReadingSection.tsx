import { useEffect, useState } from 'react';
import {
  isOfflineReadingEnabled,
  enableOfflineReading,
  disableOfflineReading,
  clearOfflineCaches,
  estimateOfflineStorageUsage,
} from '../../../lib/serviceWorker';
import { registerSettingsSection } from '../registry';

/**
 * OfflineReadingSection — P5-1 (Offline Mode), registered into P0-0's
 * shared Settings page. Same registration shape as every other section
 * here: the registerSettingsSection() call below plus the one-line
 * side-effect import in sections/index.ts.
 *
 * This is the ONLY place a student can turn the service worker on —
 * see lib/serviceWorker.ts's header comment for why the feature moved
 * from "registers automatically for everyone" to opt-in here. Nothing
 * downloads ahead of time: turning this on just makes the existing
 * runtime caching (vite.config.ts's StaleWhileRevalidate/CacheFirst
 * rules) start taking effect — a note only becomes available offline
 * once the student has actually opened it once while online, so
 * storage grows with what's actually read, not with the whole site.
 */

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) return '< 0.1 MB';
  return `${mb.toFixed(1)} MB`;
}

type ClearState = 'idle' | 'clearing' | 'cleared';

function OfflineReadingSectionPanel() {
  const [enabled, setEnabled] = useState(isOfflineReadingEnabled());
  const [unavailable, setUnavailable] = useState(false);
  const [usageBytes, setUsageBytes] = useState<number | null>(null);
  const [usageSupported, setUsageSupported] = useState(true);
  const [clearState, setClearState] = useState<ClearState>('idle');

  useEffect(() => {
    let cancelled = false;

    estimateOfflineStorageUsage().then((bytes) => {
      if (cancelled) return;
      if (bytes === null) {
        setUsageSupported(false);
        return;
      }
      setUsageBytes(bytes);
    });

    return () => {
      cancelled = true;
    };
    // Re-measure whenever the toggle or a clear operation changes what's
    // actually cached, not just once on mount.
  }, [enabled, clearState]);

  function handleToggle(next: boolean) {
    setUnavailable(false);

    if (next) {
      const succeeded = enableOfflineReading();
      if (!succeeded) {
        setUnavailable(true);
        return;
      }
      setEnabled(true);
      return;
    }

    // Fire-and-forget from the UI's perspective — the toggle flips
    // immediately since the student's intent ("turn this off") is
    // already satisfied; the actual unregister+clear work finishing a
    // moment later doesn't need to block the switch itself.
    setEnabled(false);
    disableOfflineReading();
  }

  async function handleClearData() {
    setClearState('clearing');
    await clearOfflineCaches();
    setClearState('cleared');
  }

  return (
    <div className="offline-reading-section space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Offline Reading</h2>
        <p className="text-sm text-text-secondary">
          Read your notes without an internet connection. When enabled, ResourcesV2 stores the app
          and previously visited learning content on this device.
        </p>
      </div>

      <label
        htmlFor="offline-reading-toggle"
        className="flex items-center justify-between max-w-sm gap-4 cursor-pointer rounded-lg border border-border-color bg-bg-card px-3 py-2"
      >
        <span>
          <span className="block text-sm font-medium text-text-primary">Offline reading</span>
          <span className="block text-xs text-text-muted">
            When enabled, your previously visited notes can be opened without an internet
            connection.
          </span>
        </span>
        <input
          id="offline-reading-toggle"
          type="checkbox"
          role="switch"
          aria-checked={enabled}
          checked={enabled}
          onChange={(e) => handleToggle(e.target.checked)}
          className="h-5 w-9 accent-primary shrink-0"
        />
      </label>

      {unavailable && (
        <p className="text-xs text-amber-600 max-w-sm" role="alert">
          Offline reading isn't available while running locally (dev/preview) — it only works on
          the real deployed site.
        </p>
      )}

      <div className="max-w-sm space-y-2">
        <p className="text-xs text-text-muted">
          {!usageSupported
            ? 'Storage usage isn\u2019t available in this browser.'
            : usageBytes === null
              ? 'Checking storage usage\u2026'
              : `Storage: approximately ${formatBytes(usageBytes)} used`}
        </p>

        <button
          type="button"
          onClick={handleClearData}
          disabled={clearState === 'clearing'}
          className="text-xs font-medium text-primary hover:underline disabled:opacity-50 disabled:no-underline"
        >
          {clearState === 'clearing' ? 'Clearing…' : 'Clear offline data'}
        </button>

        {clearState === 'cleared' && (
          <p className="text-xs text-text-muted">Offline data cleared.</p>
        )}
      </div>
    </div>
  );
}

registerSettingsSection({
  id: 'offline-reading',
  label: 'Offline Reading',
  Component: OfflineReadingSectionPanel,
});
