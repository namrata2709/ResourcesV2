import { describe, it, expect } from 'vitest';
import { BASE_URL, dataPath, assetPath } from './siteConfig';

describe('lib/siteConfig', () => {
  it('exposes the trailing-slash-terminated BASE_URL', () => {
    expect(BASE_URL.endsWith('/')).toBe(true);
  });

  it('dataPath builds a path under /data using BASE_URL', () => {
    expect(dataPath('config', 'navigation-url.json')).toBe(
      `${BASE_URL.replace(/\/$/, '')}/data/config/navigation-url.json`,
    );
  });

  it('assetPath builds a root-relative path using BASE_URL', () => {
    expect(assetPath('icons', 'logo.png')).toBe(
      `${BASE_URL.replace(/\/$/, '')}/icons/logo.png`,
    );
  });

  it('assetPath with no segments resolves to just the base', () => {
    expect(assetPath()).toBe(BASE_URL);
  });
});
