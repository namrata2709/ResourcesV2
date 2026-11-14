import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * P0-9 regression guard.
 *
 * The original bug wasn't in lib/a11y.ts or A11yContext — applyA11yToDocument()
 * always set all 5 data-* attributes correctly. The bug was that nothing in
 * index.css (or anywhere else) ever read them, so every toggle was a real,
 * persisted, silently-inert no-op. jsdom doesn't apply an actual loaded
 * stylesheet's cascade the way a browser does, so a DOM-level test can't
 * catch "attribute set but unconsumed" — this test reads the real source
 * file and asserts each attribute still appears as a genuine CSS selector,
 * so a future edit that strips one of these rules fails loudly here instead
 * of shipping silently, the same way this one did.
 */
const css = readFileSync(resolve(__dirname, '../index.css'), 'utf-8');

describe('index.css consumes every P0-9 accessibility attribute', () => {
  it.each([
    'data-high-contrast',
    'data-reduced-motion',
    'data-focus-mode',
    'data-dyslexia-font',
    'data-larger-ui',
  ])('has at least one real selector for [%s=\'on\']', (attr) => {
    expect(css).toContain(`[${attr}='on']`);
  });
});
