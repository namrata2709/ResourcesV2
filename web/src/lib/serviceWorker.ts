/**
 * lib/serviceWorker.ts — P5-1 (Offline Mode), opt-in.
 *
 * Redesigned from "registers automatically for every production
 * visitor" to "registers only once a student explicitly turns on
 * Offline Reading in Settings" (see pages/Settings/sections/
 * OfflineReadingSection.tsx). The original always-on design is what
 * caused this project's real stale-service-worker incident: a worker
 * installed for every visitor whether they wanted offline support or
 * not, and a stale one could end up serving an old precached app shell
 * indefinitely. Nobody gets a worker at all now unless they ask for it,
 * which makes that whole failure mode impossible for the vast majority
 * of students who never touch the setting.
 *
 * vite-plugin-pwa/workbox still generates the real service worker file
 * at build time (see vite.config.ts's own comment for why a library
 * rather than a hand-rolled worker) — this file only controls WHEN that
 * generated worker gets registered, which is now entirely on-demand
 * rather than at app boot. `injectRegister: null` in vite.config.ts
 * keeps the plugin from auto-injecting its own registration snippet, so
 * this file remains the one real place registration happens.
 *
 * The exported surface is now:
 *   - isOfflineReadingEnabled()   — read the stored preference
 *   - initOfflineReadingOnBoot()  — called once from main.tsx; re-
 *     registers ONLY if a previous visit already turned the setting on,
 *     so the feature persists across reloads without silently opting
 *     new students in
 *   - enableOfflineReading()      — student explicitly turns it on
 *   - disableOfflineReading()     — student explicitly turns it off:
 *     unregisters the worker AND clears this app's caches, so opting
 *     out doesn't leave stale offline data sitting on the device
 *   - clearOfflineCaches()        — the "Clear offline data" button,
 *     usable independently of the on/off toggle
 *   - estimateOfflineStorageUsage() — backs the "Storage: approximately
 *     X MB used" line in Settings
 *
 * Dev-mode / localhost note (kept from this file's pre-redesign
 * history, still relevant here): registration is refused outside a
 * real `vite build` output (`import.meta.env.PROD`) and on
 * localhost/127.0.0.1 — by DEFAULT, even if a student — or a developer
 * testing locally — explicitly asks for it. `npm run preview` during
 * active development runs repeatedly against a changing codebase on
 * the same port, and a worker registered during one of those sessions
 * can outlive the code that installed it, serving a stale precached
 * app shell to a LATER preview of newer code (this is exactly how the
 * original incident happened: fetches silently missing the
 * /ResourcesV2/ base-path prefix because the JS actually running
 * predated dataPath()/BASE_URL-aware fetches, from a worker installed
 * in an earlier session).
 *
 * That said, sometimes you genuinely need to test the real offline
 * behavior against a local build before deploying it. Visiting
 * `http://localhost:PORT/ResourcesV2/?debugSW=1` once lifts the
 * localhost block for that browser profile (persisted to localStorage,
 * so it survives reloads/navigation without needing the query param
 * every time) — see isLocalhostDebugOverrideActive() below. Turn it
 * back off with disableLocalhostServiceWorkerDebugOverride() (or just
 * clear localStorage's "debugAllowServiceWorkerOnLocalhost" key) once
 * you're done testing, so an ordinary later `npm run preview` session
 * doesn't silently register a worker and risk the exact stale-worker
 * incident this whole redesign exists to prevent. This override never
 * does anything outside of localhost/127.0.0.1 — it only ever relaxes
 * the one guard it's named for.
 */
import { registerSW } from 'virtual:pwa-register';

const STORAGE_KEY = 'offlineReadingEnabled';
const LOCALHOST_DEBUG_KEY = 'debugAllowServiceWorkerOnLocalhost';

/** Cache-name prefixes this app owns — see clearOfflineCaches(). */
const OWNED_CACHE_PREFIXES = ['notebook-buddy-', 'workbox-precache'];

export function isOfflineReadingEnabled(): boolean {
  return window.localStorage.getItem(STORAGE_KEY) === 'true';
}

/**
 * Deliberate escape hatch for testing the real Offline Reading behavior
 * against a local `npm run build && npm run preview` — without this,
 * there is NO way to see a service worker actually register on
 * localhost, by design (see the file header). Visiting with
 * `?debugSW=1` once persists the override to localStorage so it
 * survives reloads/navigations for the rest of that testing session,
 * without needing the query param on every URL. Call
 * disableLocalhostServiceWorkerDebugOverride() (or clear localStorage)
 * when done, so a later, ordinary local preview session doesn't
 * accidentally register a worker and risk this project's original
 * stale-worker incident all over again.
 */
function isLocalhostDebugOverrideActive(): boolean {
  if (new URLSearchParams(window.location.search).get('debugSW') === '1') {
    window.localStorage.setItem(LOCALHOST_DEBUG_KEY, 'true');
    return true;
  }
  return window.localStorage.getItem(LOCALHOST_DEBUG_KEY) === 'true';
}

/** Turns off the `?debugSW=1` override — see isLocalhostDebugOverrideActive(). */
export function disableLocalhostServiceWorkerDebugOverride(): void {
  window.localStorage.removeItem(LOCALHOST_DEBUG_KEY);
}

function canUseServiceWorker(): boolean {
  if (!import.meta.env.PROD) return false;
  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return isLocalhostDebugOverrideActive();
  }
  return true;
}

function doRegister(): void {
  if (!canUseServiceWorker()) return;
  registerSW({ immediate: true });
}

/**
 * Called once at app boot (main.tsx). Deliberately NOT "register
 * unconditionally" — only re-registers if a previous visit already
 * turned Offline Reading on, so the feature survives a reload/new
 * session without ever silently opting a first-time visitor in.
 */
export function initOfflineReadingOnBoot(): void {
  if (!isOfflineReadingEnabled()) return;
  doRegister();
}

/**
 * Turns Offline Reading on. Returns false (and leaves the stored
 * preference untouched) if service workers aren't usable in this
 * context — e.g. local dev/preview — so the Settings UI can show an
 * honest "not available here" message instead of a toggle that quietly
 * does nothing.
 */
export function enableOfflineReading(): boolean {
  if (!canUseServiceWorker()) return false;
  window.localStorage.setItem(STORAGE_KEY, 'true');
  doRegister();
  return true;
}

/**
 * Turns Offline Reading off: persists the preference, unregisters any
 * active worker, and clears this app's own caches — so a student who
 * opts out doesn't keep however many MB of cached notes sitting on
 * their device indefinitely for a feature they just turned off.
 */
export async function disableOfflineReading(): Promise<void> {
  window.localStorage.setItem(STORAGE_KEY, 'false');
  await unregisterServiceWorker();
  await clearOfflineCaches();
}

async function unregisterServiceWorker(): Promise<void> {
  if (typeof navigator.serviceWorker === 'undefined') return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

/**
 * Deletes every Cache Storage entry this app owns — the two runtime
 * caches vite.config.ts names explicitly ("notebook-buddy-data",
 * "notebook-buddy-images") plus Workbox's own generated precache
 * (named "workbox-precache-<revision>", not a literal string we control
 * directly). Matching by prefix means this never needs to be kept in
 * sync by hand if vite.config.ts's cache names or Workbox's own
 * precache-naming scheme change. Exposed standalone (not just called
 * from disableOfflineReading) so "Clear offline data" in Settings can
 * free up space without also turning the feature off.
 */
export async function clearOfflineCaches(): Promise<void> {
  if (typeof window.caches === 'undefined') return;
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((name) => OWNED_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix)))
      .map((name) => caches.delete(name))
  );
}

/**
 * Best-effort estimate of on-device storage usage, for Settings'
 * "Storage: approximately X MB used" line. navigator.storage.estimate()
 * reports the whole ORIGIN's usage (this app has no other meaningful
 * localStorage/IndexedDB footprint beyond small preference keys, so in
 * practice this is a reasonable proxy for "how much offline content is
 * cached") — not byte-exact, and null in browsers without the API
 * (Settings should show a "not available in this browser" fallback,
 * not a broken number).
 */
export async function estimateOfflineStorageUsage(): Promise<number | null> {
  if (typeof navigator.storage === 'undefined' || typeof navigator.storage.estimate !== 'function') return null;
  const estimate = await navigator.storage.estimate();
  return estimate.usage ?? null;
}

