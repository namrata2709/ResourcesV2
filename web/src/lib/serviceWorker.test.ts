import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * serviceWorker.test.ts
 *
 * Rewritten for the opt-in redesign (see lib/serviceWorker.ts's own
 * header comment for the full rationale): the old always-on
 * `registerServiceWorker()` is gone, replaced by
 * `isOfflineReadingEnabled` / `initOfflineReadingOnBoot` /
 * `enableOfflineReading` / `disableOfflineReading` /
 * `clearOfflineCaches` / `estimateOfflineStorageUsage`.
 *
 * registerSW is mocked so these tests assert on whether it was CALLED,
 * not on real service-worker/browser behavior -- that part is
 * vite-plugin-pwa's own tested responsibility, not this file's.
 */

const registerSW = vi.fn();
vi.mock('virtual:pwa-register', () => ({
  registerSW: (...args: unknown[]) => registerSW(...args),
}));

const STORAGE_KEY = 'offlineReadingEnabled';

async function importFresh() {
  vi.resetModules();
  return import('./serviceWorker');
}

function setHostname(hostname: string) {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, hostname },
    writable: true,
    configurable: true,
  });
}

function setLocation(hostname: string, search = '') {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, hostname, search },
    writable: true,
    configurable: true,
  });
}

function mockServiceWorkerRegistrations(registrations: { unregister: ReturnType<typeof vi.fn> }[]) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { getRegistrations: vi.fn().mockResolvedValue(registrations) },
    writable: true,
    configurable: true,
  });
}

function mockCaches(cacheNames: string[]) {
  const deletedNames: string[] = [];
  Object.defineProperty(window, 'caches', {
    value: {
      keys: vi.fn().mockResolvedValue(cacheNames),
      delete: vi.fn((name: string) => {
        deletedNames.push(name);
        return Promise.resolve(true);
      }),
    },
    writable: true,
    configurable: true,
  });
  return deletedNames;
}

describe('lib/serviceWorker (opt-in offline reading)', () => {
  const originalHostname = window.location.hostname;

  beforeEach(() => {
    registerSW.mockClear();
    window.localStorage.clear();
  });

  afterEach(() => {
    setHostname(originalHostname);
    vi.unstubAllEnvs();
  });

  describe('isOfflineReadingEnabled', () => {
    it('is false when nothing has been stored (new visitor default)', async () => {
      const { isOfflineReadingEnabled } = await importFresh();
      expect(isOfflineReadingEnabled()).toBe(false);
    });

    it('reflects a previously stored "true" value', async () => {
      window.localStorage.setItem(STORAGE_KEY, 'true');
      const { isOfflineReadingEnabled } = await importFresh();
      expect(isOfflineReadingEnabled()).toBe(true);
    });
  });

  describe('initOfflineReadingOnBoot', () => {
    it('does not register when the preference was never set (new visitor)', async () => {
      vi.stubEnv('PROD', true);
      setHostname('namrata2709.github.io');

      const { initOfflineReadingOnBoot } = await importFresh();
      initOfflineReadingOnBoot();

      expect(registerSW).not.toHaveBeenCalled();
    });

    it('re-registers when a previous visit already turned it on', async () => {
      vi.stubEnv('PROD', true);
      setHostname('namrata2709.github.io');
      window.localStorage.setItem(STORAGE_KEY, 'true');

      const { initOfflineReadingOnBoot } = await importFresh();
      initOfflineReadingOnBoot();

      expect(registerSW).toHaveBeenCalledWith({ immediate: true });
    });

    it('does not register on localhost even if previously enabled', async () => {
      vi.stubEnv('PROD', true);
      setHostname('localhost');
      window.localStorage.setItem(STORAGE_KEY, 'true');

      const { initOfflineReadingOnBoot } = await importFresh();
      initOfflineReadingOnBoot();

      expect(registerSW).not.toHaveBeenCalled();
    });
  });

  describe('enableOfflineReading', () => {
    it('registers and persists the preference on a real deployed host', async () => {
      vi.stubEnv('PROD', true);
      setHostname('namrata2709.github.io');

      const { enableOfflineReading, isOfflineReadingEnabled } = await importFresh();
      const succeeded = enableOfflineReading();

      expect(succeeded).toBe(true);
      expect(registerSW).toHaveBeenCalledWith({ immediate: true });
      expect(isOfflineReadingEnabled()).toBe(true);
    });

    it('refuses on localhost and leaves the preference untouched', async () => {
      vi.stubEnv('PROD', true);
      setHostname('localhost');

      const { enableOfflineReading, isOfflineReadingEnabled } = await importFresh();
      const succeeded = enableOfflineReading();

      expect(succeeded).toBe(false);
      expect(registerSW).not.toHaveBeenCalled();
      expect(isOfflineReadingEnabled()).toBe(false);
    });

    it('refuses when not a production build', async () => {
      vi.stubEnv('PROD', false);
      setHostname('namrata2709.github.io');

      const { enableOfflineReading } = await importFresh();
      const succeeded = enableOfflineReading();

      expect(succeeded).toBe(false);
      expect(registerSW).not.toHaveBeenCalled();
    });
  });

  describe('localhost debug override (?debugSW=1)', () => {
    it('still refuses on localhost by default, with no override present', async () => {
      vi.stubEnv('PROD', true);
      setLocation('localhost');

      const { enableOfflineReading } = await importFresh();
      expect(enableOfflineReading()).toBe(false);
      expect(registerSW).not.toHaveBeenCalled();
    });

    it('?debugSW=1 lifts the localhost block', async () => {
      vi.stubEnv('PROD', true);
      setLocation('localhost', '?debugSW=1');

      const { enableOfflineReading } = await importFresh();
      expect(enableOfflineReading()).toBe(true);
      expect(registerSW).toHaveBeenCalledWith({ immediate: true });
    });

    it('persists the override to localStorage, so it survives a later visit without the query param', async () => {
      vi.stubEnv('PROD', true);
      setLocation('localhost', '?debugSW=1');
      await (await importFresh()).enableOfflineReading();
      registerSW.mockClear();

      // Simulate a fresh navigation: no query param this time, module re-imported.
      setLocation('localhost', '');
      const { enableOfflineReading } = await importFresh();

      expect(enableOfflineReading()).toBe(true);
      expect(registerSW).toHaveBeenCalledWith({ immediate: true });
    });

    it('never affects a real deployed hostname, with or without the param', async () => {
      vi.stubEnv('PROD', true);
      setLocation('namrata2709.github.io', '?debugSW=1');

      const { enableOfflineReading, isOfflineReadingEnabled } = await importFresh();
      // The param is meaningless off localhost — this should behave
      // exactly like the ordinary "real deployed host" case, not grant
      // any extra access.
      expect(enableOfflineReading()).toBe(true);
      expect(isOfflineReadingEnabled()).toBe(true);
    });

    it('disableLocalhostServiceWorkerDebugOverride() turns the override back off', async () => {
      vi.stubEnv('PROD', true);
      setLocation('localhost', '?debugSW=1');
      const mod = await importFresh();
      mod.enableOfflineReading();
      expect(registerSW).toHaveBeenCalledTimes(1);

      mod.disableLocalhostServiceWorkerDebugOverride();
      registerSW.mockClear();
      setLocation('localhost', '');

      const modAgain = await importFresh();
      expect(modAgain.enableOfflineReading()).toBe(false);
      expect(registerSW).not.toHaveBeenCalled();
    });
  });

  describe('disableOfflineReading', () => {
    it('persists the preference as off, unregisters workers, and clears owned caches', async () => {
      window.localStorage.setItem(STORAGE_KEY, 'true');
      const unregister = vi.fn().mockResolvedValue(undefined);
      mockServiceWorkerRegistrations([{ unregister }]);
      const deleted = mockCaches(['notebook-buddy-data', 'notebook-buddy-images', 'workbox-precache-v1']);

      const { disableOfflineReading, isOfflineReadingEnabled } = await importFresh();
      await disableOfflineReading();

      expect(isOfflineReadingEnabled()).toBe(false);
      expect(unregister).toHaveBeenCalled();
      expect(deleted).toEqual(
        expect.arrayContaining(['notebook-buddy-data', 'notebook-buddy-images', 'workbox-precache-v1'])
      );
    });

    it('does not throw when there is nothing to unregister or clear', async () => {
      mockServiceWorkerRegistrations([]);
      mockCaches([]);

      const { disableOfflineReading } = await importFresh();
      await expect(disableOfflineReading()).resolves.toBeUndefined();
    });
  });

  describe('clearOfflineCaches', () => {
    it('deletes only caches owned by this app, by prefix', async () => {
      const deleted = mockCaches(['notebook-buddy-data', 'notebook-buddy-images', 'workbox-precache-v2', 'some-other-sites-cache']);

      const { clearOfflineCaches } = await importFresh();
      await clearOfflineCaches();

      expect(deleted).toEqual(
        expect.arrayContaining(['notebook-buddy-data', 'notebook-buddy-images', 'workbox-precache-v2'])
      );
      expect(deleted).not.toContain('some-other-sites-cache');
    });

    it('is a no-op without throwing when the Cache Storage API is unavailable', async () => {
      Object.defineProperty(window, 'caches', { value: undefined, writable: true, configurable: true });

      const { clearOfflineCaches } = await importFresh();
      await expect(clearOfflineCaches()).resolves.toBeUndefined();
    });
  });

  describe('estimateOfflineStorageUsage', () => {
    it('returns the usage figure when the Storage API is available', async () => {
      Object.defineProperty(navigator, 'storage', {
        value: { estimate: vi.fn().mockResolvedValue({ usage: 12_582_912 }) },
        writable: true,
        configurable: true,
      });

      const { estimateOfflineStorageUsage } = await importFresh();
      await expect(estimateOfflineStorageUsage()).resolves.toBe(12_582_912);
    });

    it('returns null when the Storage API is unavailable', async () => {
      Object.defineProperty(navigator, 'storage', { value: undefined, writable: true, configurable: true });

      const { estimateOfflineStorageUsage } = await importFresh();
      await expect(estimateOfflineStorageUsage()).resolves.toBeNull();
    });
  });
});
