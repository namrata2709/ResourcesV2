# T3-1 Asset TODO

Status: logo (horizontal, all 3 themes), favicon/PWA icon set, all 6
UI-chrome/subject icons, and both dashboard illustrations are done,
approved, and wired into real components. Only 3 additional logo
variants remain outstanding — genuinely not generated, not derived/faked
in code. Everything marked "fallback" below is a graceful stand-in — the
code renders correctly today and upgrades itself automatically the
moment a real file lands, no code change required.

**Standard sizes (confirmed working, keep new assets consistent with these):**
- Icons (square, all UI/subject icons): **1024×1024** source, shipped at 512×512
- Logo (all 3 theme lockups): **~1536px** source, shipped at 1200px wide (3:2)
- Illustrations (dashboard empty/error states): **~1536px** source, shipped at 900px wide (3:2)

**Pipeline (new this pass):** the resize+optimize step used to be a manual
one-off (`pngquant`/`optipng` run by hand). It's now automated —
full-resolution originals live in `assets-source/{icons,logos,illustrations}/`
(git-tracked, never hand-edited) and `scripts/build-assets.mjs` generates
the shipped versions into `public/` automatically before every
`npm run build` (via `prebuild`), or on demand via
`npm run generate:assets`. **To add or update an asset: drop the
full-res file into the matching `assets-source/` subfolder, not directly
into `public/`.** See `assets-source/README.md`.

**Standing rule (corrected mid-ticket):** no component may reconstruct
brand copy as text, and no variant may be derived by cropping another
variant's image. Every logo variant is a real, separately-exported file
or it doesn't exist yet — see `public/icons/README.md` for the full
naming contract.

---

## ✅ Delivered and wired in

| File | Used by | Wired in |
|---|---|---|
| `public/icons/logo-horizontal-light.png` | `Logo` (`variant="horizontal"`, Light theme) | ✅ `Logo.tsx` |
| `public/icons/logo-horizontal-dark.png` | `Logo` (`variant="horizontal"`, Dark theme) | ✅ `Logo.tsx` |
| `public/icons/logo-horizontal-comfort.png` | `Logo` (`variant="horizontal"`, Comfort theme) | ✅ `Logo.tsx` |
| `public/icons/logo-icon.png` | `Logo` (`variant="icon"`) — **one file for all 3 themes**, deliberately not per-theme (mascot stays visually identical, same idea as Octocat/Clyde) | ✅ `Logo.tsx` |
| `public/icons/logo.png` | Canonical default (copy of `logo-horizontal-light.png`) | — |
| `public/icons/aws.png` | `Dashboard` card (`card.id === "aws"`) | ✅ `Dashboard.tsx` |
| `public/icons/quiz.png` | `Dashboard` card (`card.id === "quiz"`) | ✅ `Dashboard.tsx` |
| `public/icons/dsa.png` | `Dashboard` card (`card.id === "dsa"`) | ✅ `Dashboard.tsx` |
| `public/icons/theme-light.png` / `-dark.png` / `-comfort.png` | `ThemeToggle` | ✅ `ThemeToggle.tsx` |
| `public/icons/footer-terms.png` | `Footer`'s "Usage Terms" heading | ✅ `Footer.tsx` |
| `public/icons/footer-alert.png` | `Footer`'s disclaimer block | ✅ `Footer.tsx` |
| `public/illustrations/empty-dashboard.png` | `Dashboard`'s "no cards" state | ✅ `Dashboard.tsx` |
| `public/illustrations/error-dashboard.png` | `Dashboard`'s error state | ✅ `Dashboard.tsx` |
| Favicon/PWA set (`.ico`, `.svg`, `favicon-96x96.png`, `apple-touch-icon.png`, both `web-app-manifest` PNGs, `site.webmanifest`) | Browser tab / PWA install | ✅ `index.html` `<head>` |

Also removed this pass: a hardcoded `"Your learning companion"` `<p>` in
`Dashboard.tsx` that duplicated text already baked into the horizontal
logo image — two sources of truth for the same copy. The tagline now
only exists once, inside the real asset.

---

## Still needed — genuinely not generated

| Asset | Expected file(s) | Used in | Current fallback |
|---|---|---|---|
| **Stacked logo lockup** | `public/icons/logo-stacked-{theme}.png` | `Logo` (`variant="stacked"`) — for a future narrower layout (e.g. a sidebar) | Same textless fallback |
| **Wordmark-only logo** | `public/icons/wordmark-{theme}.png` | `Logo` (`variant="wordmark"`) — for contexts where the mascot is already shown separately | Same textless fallback |
| **Bookmark icon** | `public/icons/quiz-bookmark.png` | Quiz page (T5-1b, not yet built) — per-question bookmark toggle and the toolbar's bookmark-filter button (one shared icon, filled vs. outline for state, same as `Icon.tsx`'s existing per-name convention) | Hand-drawn SVG, `BookmarkIconFallback` in `src/pages/Quiz/icons.tsx` |
| **Flag icon** | `public/icons/quiz-flag.png` | Quiz page (T5-1b, not yet built) — per-question flag button, reflecting `_cycleFlag`'s three states (unflagged / confusing / incorrect) via the consumer's styling, not a different image per state | Hand-drawn SVG, `FlagIconFallback` in `src/pages/Quiz/icons.tsx` |

**On hold per explicit request — do not generate these next, or anything else, until asked.**

An earlier pass tried auto-cropping the mascot out of the horizontal
lockup to fake the icon-only variant, and separately had `Logo.tsx`
rebuild "Notebook"/"Buddy" as CSS text when an image failed to load.
Both were reverted — cropping produced an awkwardly narrow result at true
icon sizes, and reconstructing brand copy in code is a second source of
truth that drifts. Real dedicated exports are the only path for these now.

**Explicitly out of scope for T3-1:** sidebar nav, notifications bell,
search bar — not built anywhere in the codebase yet, separate ticket(s).

---

## Not image-generation — remaining icon *selection* decision

**Decision needed:** keep the hand-drawn Lucide-style fallback SVGs
(theme toggle, footer terms/alert) permanently as-is (zero dependency),
or add `lucide-react` as a real dependency later. Not urgent — every icon
this ticket needs now has a real branded PNG as the primary render path;
these SVGs are only ever seen if a file goes missing.

---

## Deliberately NOT changed this ticket (data-driven, per ticket scope)

| Icon source | Why left alone |
|---|---|
| `navigation-url.json`'s emoji (🏠📝📓☁️🧩🖼️) | Ticket explicitly says "same emoji/URL resolution" for Breadcrumb — unchanged is correct, not a gap |
| `category-icons.json`'s 47 category glyphs | Out of scope per icon-inventory.md §8's own recommendation |
