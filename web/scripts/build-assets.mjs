#!/usr/bin/env node
/**
 * scripts/build-assets.mjs
 *
 * Build-time image pipeline. Full-resolution source images live in
 * assets-source/ (git-tracked, untouched, safe to re-export from later)
 * and are NEVER shipped directly. This script resizes + optimizes them
 * into public/, which is what actually gets deployed.
 *
 * Why this exists: 1024px master icons are the right EXPORT spec (clean,
 * re-usable, headroom for future larger uses) but the wrong SHIP spec —
 * at a 20-64px on-screen display size, 1024px is an 8x+ oversample that
 * only adds page weight, never visible sharpness. This script is the
 * automated version of what was previously a manual "resize + pngquant +
 * optipng" step run by hand each time a new asset landed.
 *
 * Run automatically before every `npm run build` (see package.json's
 * "prebuild" script). Can also be run manually any time a source asset
 * changes: `npm run generate:assets`.
 *
 * Per-category ship sizes (keep these in sync with ASSET-TODO.md if
 * they ever change):
 *   - icons/         1024px source -> 512px shipped (square icons, ~20-64px on screen)
 *   - logos/         1536px source -> 1200px-wide shipped (scales up to fill a page banner via Logo's fillWidth, needs more headroom than a small icon)
 *   - illustrations/ 1536px source -> 900px-wide shipped (displayed up to ~320-400px wide)
 *
 * All source images keep their own aspect ratio — only icons/ is forced
 * square (1:1 crop is NOT performed here; sources are expected to already
 * be square, per ASSET-TODO.md's spec. This script resizes, it doesn't crop.)
 */

import sharp from 'sharp';
import { readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const CATEGORIES = [
  {
    name: 'icons',
    sourceDir: path.join(ROOT, 'assets-source', 'icons'),
    outDir: path.join(ROOT, 'public', 'icons'),
    resize: { width: 512, height: 512 },
  },
  {
    name: 'logos',
    sourceDir: path.join(ROOT, 'assets-source', 'logos'),
    outDir: path.join(ROOT, 'public', 'icons'), // logos live alongside icons in public/icons/, per naming convention
    resize: { width: 1200 }, // height omitted -> preserves source aspect ratio
    // logo-icon.png is grouped in this folder (it's a "logo" conceptually
    // — the brand mark) but actually gets USED at small icon scale
    // (compact/sidebar contexts), not banner scale like the horizontal/
    // stacked lockups. Ship it at icon size, not 1200px-wide.
    sizeOverrides: {
      'logo-icon.png': { width: 512, height: 512 },
    },
  },
  {
    name: 'illustrations',
    sourceDir: path.join(ROOT, 'assets-source', 'illustrations'),
    outDir: path.join(ROOT, 'public', 'illustrations'),
    resize: { width: 900 },
  },
];

async function processCategory({ name, sourceDir, outDir, resize, sizeOverrides = {} }) {
  if (!existsSync(sourceDir)) {
    console.log(`  (skipping ${name} — no assets-source/${name}/ directory)`);
    return 0;
  }

  await mkdir(outDir, { recursive: true });
  const files = (await readdir(sourceDir)).filter((f) => f.toLowerCase().endsWith('.png'));

  let count = 0;
  for (const file of files) {
    const src = path.join(sourceDir, file);
    const dest = path.join(outDir, file);
    const targetSize = sizeOverrides[file] ?? resize;

    await sharp(src)
      .resize(targetSize.width, targetSize.height ?? null, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png({ palette: true, quality: 80, compressionLevel: 9, effort: 8 })
      .toFile(dest + '.tmp');

    // Write to a .tmp file then rename, so a failed/interrupted run never
    // leaves a half-written file at the real destination.
    await import('node:fs/promises').then((fs) => fs.rename(dest + '.tmp', dest));
    count++;
    console.log(`  ${name}/${file}${sizeOverrides[file] ? ' (size override)' : ''}`);
  }
  return count;
}

async function main() {
  console.log('Building optimized assets from assets-source/ ...\n');
  let total = 0;
  for (const category of CATEGORIES) {
    total += await processCategory(category);
  }

  // logo.png (no theme suffix) is the canonical default alias used by any
  // context that isn't theme-aware — a copy of logo-horizontal-light.png,
  // not a distinct source asset of its own. Regenerated here so it never
  // goes stale relative to whatever logo-horizontal-light.png currently
  // looks like.
  const iconsDir = path.join(ROOT, 'public', 'icons');
  const lightLogo = path.join(iconsDir, 'logo-horizontal-light.png');
  if (existsSync(lightLogo)) {
    const fs = await import('node:fs/promises');
    await fs.copyFile(lightLogo, path.join(iconsDir, 'logo.png'));
    console.log('  icons/logo.png (canonical default, copied from logo-horizontal-light.png)');
    total++;
  }

  console.log(`\nDone — ${total} image(s) generated into public/.`);
}

main().catch((err) => {
  console.error('Asset build failed:', err);
  process.exit(1);
});
