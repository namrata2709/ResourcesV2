/**
 * pptxgenjs.d.ts
 *
 * pptxgenjs ships its own types (types/index.d.ts, referenced via its
 * package.json's "types" field), and tsconfig.app.json already uses
 * `moduleResolution: "bundler"`, which should resolve them correctly.
 * This ambient fallback exists only for environments where that
 * resolution doesn't happen (e.g. a partial/corrupted local install --
 * OneDrive-synced project folders are a known source of this kind of
 * flakiness with node_modules on Windows). TypeScript prefers a real,
 * more specific declaration when one is found; this only takes effect
 * as a fallback if none is.
 */
declare module 'pptxgenjs';
