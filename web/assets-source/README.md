# assets-source/

Full-resolution, untouched source images — never shipped directly.
`public/icons/` and `public/illustrations/` are **generated** from these
by `scripts/build-assets.mjs`, which runs automatically before every
`npm run build` (via the `prebuild` script), or manually any time:

```bash
npm run generate:assets
```

## Why two copies exist

1024px icon masters are the right *export* spec — clean, re-usable,
enough headroom to re-crop or re-export at other sizes later. They're
the wrong *ship* spec — at a 20–64px on-screen icon size, 1024px is an
8x+ oversample that only adds page weight, never visible sharpness.

So: **edit/regenerate files in here.** Never hand-edit anything in
`public/icons/` or `public/illustrations/` — those are build output and
get overwritten the next time the pipeline runs.

## Layout

```
assets-source/
├── icons/           1024×1024 masters -> shipped at 512×512
├── logos/           ~1536px masters   -> shipped at 1200px wide
│                    (logo-icon.png is the one exception — shipped at
│                    512×512, since it's used at icon scale despite
│                    living in this folder conceptually as a "logo")
└── illustrations/   ~1536px masters   -> shipped at 900px wide
```

Filenames here must exactly match what the component expects in
`public/` (see `public/icons/README.md` for the full naming contract) —
the pipeline just resizes/optimizes, it doesn't rename anything.

## Known gap

`logos/logo-comfort.png` is currently a re-upload of the *already-resized*
1200×800 version, not the true full-resolution original (that file was
lost before this pipeline existed). It works fine as a source today, but
has no more headroom above 1200px if a larger export is ever needed —
worth regenerating from the original mascot art if that happens.
