# Consistency Solutions, Rebrand & Tech-Stack Roadmap

Companion to `PROJECT.md` (architecture), `log-analysis.md` (session log),
`audit-findings.md` (problem log), and `icon-inventory.md` (icon catalog).
This file answers the specific questions raised 2026-07-06: concrete fixes
for every consistency finding (not just problems), a localStorage
reference for new developers, the `slides.html` gap list, the Notebook
Buddy rebrand, reconciling the pasted sprint-plan/backlog docs against
current reality, and what of the proposed React/Tailwind/CSS-Modules
stack can start now vs. must wait.

---

## Part 1 — DRY / KISS / SOLID solutions for every audit finding

Design principle for all of these: **quiz, notes, and gallery should share
underlying mechanics, not visual identity.** A shared module should own
*behavior* (how search indexes text, how a favorite toggles, how a live
region announces) while each page keeps its own icon, color, and copy.
That's the line between "consistent" and "loses its identity" — share the
verb, not the noun.

| # | Finding | Root cause (SOLID lens) | Concrete fix |
|---|---|---|---|
| 1 | `.selected-chip`/`.type-badge` diverge between `notes-index.css`/`gallery.css` | No Single Responsibility for "chip" styling — two files each own a copy | Extract `css/shared/chips.css` (`.chip-row`, `.selected-chip`, `.chip-remove`, `.quick-filter-*`, `.view-mode-*`) with `--chip-accent` as a CSS variable each page can override for its own color if it genuinely wants to differ. Rename gallery's overlay badge to `.gallery-type-badge` so `.type-badge` only ever means one thing. |
| 2 | `.theme-toggle` duplicated in `styles.css`/`notes.css` | DRY violation, plain copy-paste | Delete the `notes.css` copy. `styles.css` already loads everywhere, including note pages — nothing to gain from a second copy. |
| 3 | Bookmarks (quiz 🔖) / Favorites (♡) / in-page bookmarks (⭐) | **Not a violation** — three genuinely different responsibilities (single-item save / mid-quiz marker / in-page jump point) | No merge. Do standardize the *mechanism* each uses (see `localStorage` table, Part 2) — e.g. all four should use the same `try/catch` fail-silent pattern, which they mostly already do. |
| 4 | Inconsistent hardcoded `#themeToggle` markup | Two valid patterns coexisting (legacy hardcode vs. self-inject) | Remove the hardcoded copies from `index.html`/`404.html`/`gallery.html`. `theme.js` already handles injection — one code path, not two. |
| 5 | Three divergent search-input markups | No shared "search box" component | Extract one consistently-classed markup: always `class="search-bar"` wrapper + `id="searchInput"` + `.search-input-wrapper` for suggestion-dropdown pages. Gallery's `#searchBox`/`.search-box` gets renamed to match, `gallery.css`'s divergent rule gets deleted in favor of the shared one. |
| 6 | Print: standalone FAB (quiz) vs. FAB-menu item (notes) | Legitimate difference in chrome density, not a bug | Keep as-is; document the rule explicitly ("a page with ≤3 actions gets standalone buttons; ≥4 gets a menu") so it reads as a deliberate rule instead of an accident next time someone adds a 4th quiz action. |
| 8 | Search logic: FlexSearch (notes) vs. plain substring (gallery/quiz) | Interface Segregation done backwards — one "smart" implementation, two "dumb" ones, no shared interface between them | Define one tiny interface: `search(items, query, fields) → rankedResults`. Give it two implementations — a FlexSearch adapter (notes, already exists in effect) and a basic adapter (gallery/quiz) that both satisfy the same call shape. Callers (`notes-index.js`, `gallery.js`, `quiz-index.js`) don't care which one runs underneath — swapping gallery/quiz to FlexSearch later is a one-line adapter swap, not a rewrite. This is the single highest-leverage refactor in the whole audit for future-proofing search. |
| 9 | Swipe gesture duplicated (`notes-touch.js` vs. `quiz-toolbar.js`) | DRY violation | Extract `js/shared/swipe.js`: `attachSwipe(element, {onLeft, onRight, haptics, visualFeedback})`. Both callers pass their own button-click callbacks; the detection math (threshold/velocity/haptics) lives once. |
| 10 | Two different "no icon" fallbacks (`📘` vs `📂`) | Two independent defaults for one concept | Pick one (`📂` matches `category-icons.json`'s own default, so keep that), have `dashboard.js` read it from the same JSON rather than hardcoding `📘`. |
| 11 | `category` (notes) vs. `topic` (quiz) field naming | Two schemas for the same "grouping" concept, not urgent to unify | Leave as-is unless the two index formats are ever merged — renaming now would touch every consumer for a cosmetic gain only. |
| 13 | Three independent screen-reader live-region implementations | DRY violation | Extract `js/shared/aria-live.js` exposing `window.announceToScreenReader(msg)` — `notes-accessibility.js`, `quiz-engine.js`, and `gallery.js` all call the same function instead of each building their own live-region `div`. |
| 15 | `notes-fab.js`'s Tools menu vs. quiz's standalone button vs. always-visible search bar | Same as #6 — legitimate density difference | Document the rule (see #6); no code change needed. |
| 18 | Sitemap domain split (`Resources` vs `ResourcesV2`) across 4 Python scripts | DRY violation — one constant, four copies | Create `python/utils/site_config.py` with one `BASE_URL = "https://namrata2709.github.io/ResourcesV2"`. All four generator scripts import it. Mirrors `js/shared/site-config.js`'s exact role on the JS side — same fix shape, different language. |
| 20 | `notes-search.js` and `notes-index.js` both build separate FlexSearch indices | Different granularities (section vs. whole-note) — likely not worth merging | Leave as-is; flagged only for awareness, not action. |
| 23 | `pytest` accidentally an npm dependency | Copy-paste/muscle-memory error | `npm uninstall pytest`. One command. |

### The one structural theme underneath most of these

Almost every "Bug" finding above reduces to the same shape: **a value or
behavior that should live in exactly one shared file currently lives in
two-to-four copies that have quietly drifted.** The fix is nearly always
"extract a shared module," never "add more configuration" — this
codebase doesn't need a plugin system or a settings panel, it needs the
copies deleted. That's the KISS argument for doing this before React:
these are the same extractions React's own component boundaries will
eventually force anyway (a shared `<Chip>`, a shared `useSwipe()` hook, a
shared `useLiveRegion()`) — doing them in vanilla JS first means the
React port in Sprint E has fewer places to introduce *new* drift, not
more.

---

## Part 2 — `localStorage` keys reference (for new developers)

Every key currently written anywhere in the codebase, one row each. Two
naming conventions currently coexist — see the note below the table.

| Key | Written by | Read by | Shape | Scope |
|---|---|---|---|---|
| `theme` | `theme.js` | `theme.js`, `notes-fab.js` (settings menu label) | `"light"` \| `"dark"` \| `"comfort"` | Global |
| `notesFavorites` | `notes-favorite.js`, `notes-index.js` | same two | JSON array of note `folder` ids | Global |
| `galleryFavorites` | `gallery.js` | `gallery.js` | JSON array of image file names | Global |
| `examMode` | `notes-exam.js` | `notes-exam.js`, `notes-fab.js` (settings menu label) | `"none"` \| `"highlight"` \| `"test"` | Global |
| `liteMode` | `notes-page-core.js` | `notes-page-core.js`, `notes-fab.js` | `"true"` \| `"false"` (string, not boolean) | Global |
| `timerHidden` | `notes-fab.js` | `notes-fab.js` | `"true"` \| `"false"` (string) | Global |
| `readingProgress-folder-<folder>` | `notes-reader.js` | `notes-index.js` (sort), `recently-viewed.js` | `{v:1, timestamp}` | Per-note |
| `bookmarks-<pageId>` | `notes-reader.js` | `notes-reader.js` | array/object of bookmarked section ids | Per-note |
| `<pageId>-checklist-state` | `notes-checklist.js` | same | `{v:1, data:{...}}` | Per-note |
| `<pageId>-visual-mcq` | `dsa-visual-mcq.js` | same | `{v:1, current, answered}` | Per-note (DSA) |
| `<pageId>-interview-state` | `notes-interview.js` | same | `{v:1, currentQuestion, lastUpdated}` | Per-note |
| `<pageId>-interview-viewed` | `notes-interview.js` | same | `{v:1, data:{...}}` | Per-note |
| `quiz_progress_<quizFile>` — **confirmed 2026-07-08**, exact string from `quiz-engine.js`'s own `_storageKey()` method | `quiz-engine.js` | `quiz-engine.js`, `quiz-toolbar.js` | full quiz state: answers, flags, bookmarks, elapsed time, ratings | Per-quiz |

**Two naming conventions currently in use — worth picking one:**
- `<pageId>-<feature>` (checklist-state, visual-mcq, interview-state,
  interview-viewed) — pageId first.
- `<feature>-<pageId>` (`bookmarks-<pageId>`, `readingProgress-folder-<folder>`)
  — feature first.

Neither is wrong on its own, but a new developer adding a fifth
per-note feature has no clear rule to follow. **Recommend standardizing
on `<pageId>-<feature>`** (the majority pattern) next time any of the
minority-pattern keys are touched for another reason — not worth a
dedicated migration commit on its own, since `pageId` values are already
in the wild in real users' browsers and a rename would silently "lose"
their existing progress unless a one-time migration reads both key
shapes.

**General conventions already followed consistently (worth keeping):**
- Every write is wrapped in `try/catch`, fails silently — correct for
  private browsing / storage-quota edge cases, don't change this.
- Every JSON-shaped value includes a `{v: 1, ...}` version envelope,
  checked on read (`if (!parsed.v) { localStorage.removeItem(...) }`) —
  a clean, deliberate pattern for handling schema changes without ever
  crashing on an old stored shape. Any new localStorage feature should
  copy this pattern exactly.

---

## Part 3 — `slides.html` gap list (new audit findings, 25–31)

Confirmed by re-reading `slides.js`'s own header comment: it explicitly
documents `navigation.js` as **skipped entirely**
(`data-no-nav="true"` on `<body>`) — "since a full-viewport deck has no
breadcrumb/page-header container for it to attach to." That single
documented decision cascades into every gap below; they're not six
independent oversights, they're six consequences of one earlier call
that's worth revisiting now that slides is a first-class page type, not
a stub.

| # | Missing | Why it's missing (per `slides.js`'s own comments) | Fix |
|---|---|---|---|
| 25 | Back button / breadcrumb | `data-no-nav="true"` skips `navigation.js` entirely, which is what injects `.page-header`'s back button | Slides could run `navigation.js` in a collapsed/minimal mode (just the back button, no breadcrumb trail) rather than fully opting out — needs a small `navigation.js` option, not a rewrite. |
| 26 | Favorite button | `notes-favorite.js` targets `.page-header` first, `.note-header`/`.note-container` as fallback — slides has none of these | Once #25 adds *some* header container, `notes-favorite.js`'s existing fallback chain would just work — this may resolve for free once #25 lands. |
| 27 | Filter/search | Slides is a single-document deck, not a list — filter genuinely doesn't apply here the way it does on a listing page | Not a real gap — different page category, correctly has no filter. |
| 28 | Accessibility (skip link, live region) | `notes-accessibility.js` isn't in `slides.html`'s script chain (per `dashboard.js`'s docstring — `slides.html` uses its own bootloader, not `notes-page-core.js`'s shared 11-script chain) | Add `notes-accessibility.js` to `slides.html`'s script tags directly — it's self-contained per Finding 13's writeup, doesn't depend on `.page-header` existing. |
| 29 | Footer | Same root cause as #25 — `footer.js` needs `#footerRoot` in markup, which `slides.html` likely omits since it was built full-viewport, no page chrome | Add `<div id="footerRoot"></div>` to `slides.html`'s markup — `footer.js` itself needs no changes. |
| 30 | Theme toggle | Not confirmed missing — `theme.js` self-injects regardless of `data-no-nav`, so this one likely already works; flagged only for confirmation once `slides.html`'s actual markup is next uploaded | Verify, don't assume fixed. |
| 31 | Print | Not in scope for a presentation deck in the same sense as a note — printing a slide deck is a "download as PDF" concept, closer to `quiz-export.js`'s PDF button than `notes-print.js`'s format picker | If wanted, model it on `quiz-export.js`'s `window.print()` + print-only body class approach, not `notes-print.js`'s multi-format picker (overkill for a deck). |

**Net recommendation:** don't treat this as "slides is broken," treat it
as "slides was deliberately built minimal for a full-viewport experience,
and a few of those minimalism choices (no nav) accidentally took features
with them (footer, favorites, a11y) that don't actually depend on the nav
choice at all." Fixing #28/#29 is close to free (add a script tag, add a
div). #25/#26 need one small `navigation.js` addition. #27/#31 aren't
really gaps once you look at what slides actually is.

---

## Part 4 — Notebook Buddy rebrand: what's decided vs. what's still open

The rebrand plan (Phases 1–10) and the four brand-kit mockup images are
now the reference for this. Cross-checked against current file reality:

**Decided, per the rebrand doc's own Phase 1 + "stop after Empty State
Illustrations" recommendation:**
- Product name → **Notebook Buddy**. Dashboard page title becomes
  "Notebook Buddy Dashboard" (or similar) rather than "Learning
  Dashboard." This touches: `index.html`'s `<title>`/OG/JSON-LD "name"
  fields, every other page's `<title>`, `README.md`'s heading,
  `package.json`'s `"name"` field (currently `"learning-dashboard"` —
  could stay as the npm package name even if the product-facing name
  changes; these don't have to match).
- Font → Poppins, per the brand kit images (all four mockups use it
  consistently already).
- Color tokens → `--primary: #7C4DFF`, plus the dark navy/cream/brown
  set shown in the mockups — these map onto `styles.css`'s existing
  `--primary`/`--accent` CSS variable system almost directly, since that
  variable-based theming is already how the site's three themes work.
  This is good news: the rebrand's color phase is a **values-only**
  change to existing variables, not a restructuring.
- Three existing themes (light/dark/comfort) map 1:1 onto the three
  mockup images provided — no new theme to build, just re-skin the
  existing three.

**Genuinely new work implied by the mockups, not yet in any file
reviewed this audit:**
- A **sidebar navigation** layout (Dashboard/Notes/Quizzes/Labs/Gallery/
  Bookmarks/Calendar/Study Mode/Settings/Help) — current site has no
  persistent sidebar; navigation today is breadcrumb + dashboard cards
  only. This is a bigger structural change than the rebrand doc's Phase
  1–3 framing suggests — it's closer to a layout rewrite than a coat of
  paint. Worth flagging explicitly since it changes the estimate for
  "Phase 1: Foundation" from CSS-only to CSS + new HTML structure on
  every page.
- **Notifications bell**, **user avatar/name menu**, **Calendar page**,
  **Study Mode page** — none of these exist in any file reviewed across
  this entire audit. They're shown in the mockups as if already part of
  the product. These are net-new features, not rebrand work — recommend
  explicitly separating "rebrand the pages that exist" from "build the
  pages the mockup imagines" so the rebrand doesn't quietly balloon into
  a feature-complete redesign before Phase 1 even ships.
- **Mascot illustrations** (per-theme, contextual — "Good morning" vs.
  "Good evening" vs. Comfort-mode reading pose) — matches the rebrand
  doc's own Phase 6 ("Mascot Integration"), correctly sequenced late.

**Recommendation, combining the rebrand doc's own priority call with
this audit's findings:** do the Part 1 DRY/KISS extractions *before*
Phase 1's CSS variable rename — right now, fixing `.theme-toggle`'s
duplication or centralizing chip styles is touching plain, unbranded
CSS. Doing it after a full color/token rebrand means redoing that same
extraction work against new class names and new variables, twice. Same
logic the rebrand doc itself uses for sequencing icons/mascot last
applies one level earlier: consolidate the shared plumbing first, then
reskin it once, not reskin four divergent copies separately.

---

## Part 5 — Old sprint plan & backlog: what's already done vs. still real

Reconciled `feature-sprint-plan.md`/`roadmap-and-decisions.md`/the backlog
doc against every file actually reviewed in this audit (batches 1–7):

**Confirmed already shipped (matches what these docs claim closed):**
- Sprint A (pipeline stabilization), CLI wrapper (`dashboard.py`), pytest
  coverage, `slides.html`/`slides-overview.html` existing, category
  detection reading `category-icons.json`, read-time/last-modified in the
  index, `audit_content.py` — all independently confirmed by direct file
  review this audit, not just taken on the docs' word. Genuinely done.
- US-G01 (FlexSearch + mark.js search rewrite) — confirmed via
  `notes-index.js` and `notes-search.js` review (batch 5): both build
  real `FlexSearch.Document` indices, matching the "delivered" claim.

**This audit adds new information these planning docs didn't have yet:**
- The planning docs' own US-G01 entry flags "element ids assumed, not
  confirmed" as a known gap needing the real `notes-search.js` uploaded.
  That gap is now closed — `notes-search.js` was reviewed directly in
  batch 5 (Finding 20), so whatever `CONFIG` mismatch that entry worried
  about can be checked directly now instead of remaining an assumption.
- The sitemap-domain bug (Finding 18) and the CSS/JS duplication findings
  (1, 2, 5, 8, 9, 13) aren't mentioned anywhere in the sprint plan/backlog
  — they were found through this direct-file audit, not through the
  planning process. Recommend folding Part 1 of this document into
  **Sprint G** (vanilla feature completion) as new stories — they're
  exactly the kind of "resilience/consistency" work Sprint G's US-G03 was
  already scoped for, just not yet itemized at this level of detail.
- **Sprint G03 (shared error handling, `<noscript>`, branded 404) overlaps
  almost completely with the separately-pasted priority note** (JSON
  caching / `showError()` / `<noscript>` / 404 improvements). That note's
  recommendation — skip JSON caching (React will replace it), keep the
  other three — is consistent with Sprint G03's own scope and doesn't
  need reconciling further; it's the same plan described twice, once at
  sprint-story granularity and once as a standalone priority call.
- **`slides.html`'s gaps (Part 3 above) aren't mentioned anywhere in
  Sprint B's "✅ CLOSED" status.** Sprint B closed on "generation pipeline
  confirmed working" — true for the *build* step, but this audit's direct
  read of `slides.js` shows the *page* itself is missing chrome every
  other page type has. Recommend reopening Sprint B just for this scope
  (or folding it into Sprint G04 "labs — full interactive parity with
  notes," since the same "make X feel like every other page" framing
  applies to both labs and slides).

**Nothing in the old backlog is now dead that wasn't already flagged
dead** in the sprint-plan doc's own §3.1 salvage analysis — this audit
doesn't add any new "don't build this" calls.

---

## Part 6 — New tech stack: what can start now vs. what must wait

The proposed stack — **React + TypeScript + Vite + Tailwind (layout) +
CSS Modules (components)** — is a good fit for this codebase specifically
*because* of how much bespoke, stateful component CSS already exists
(quiz carousel, exam mode, floating menus, print preview) — that's
already a CSS-Modules-shaped problem today, this audit just confirms it.

**Can start today, fully in parallel with vanilla-JS work, zero risk to
the live site (per `feature-sprint-plan.md`'s own Sprint C scope):**
- Project scaffolding (`US-C01`) — Vite + React + TS + Tailwind in a new
  top-level folder (e.g. `web/`), completely separate from `src/`/`dist/`.
  `tools/minify.js` globs `src/` only, so a sibling `web/` folder is
  invisible to the existing build until someone deliberately wires it in.
  **This can begin literally today** — there's no dependency on
  finishing Part 1's DRY extractions, the rebrand, or Sprint G first.
- Tailwind config + CSS variable mapping — since the rebrand's color
  tokens (Part 4) are "just" CSS custom property values, the same
  `--primary`/`--accent`/etc. set can be typed into a `tailwind.config.js`
  theme block in parallel with vanilla `styles.css` being updated with
  the same values. Same source of truth, two consumers, no conflict.
- Writing the first CSS Modules for genuinely new components (a
  `<QuizCard>`, a `<ThemeToggle>`) — nothing here touches `src/`, so this
  can run alongside Sprint G's vanilla fixes without either blocking the
  other.

**Should wait for Part 1's DRY extractions first, not for a hard technical
reason but a leverage one:** porting `.theme-toggle`, chip styling, or
search logic into React components is strictly easier once there's one
canonical vanilla version to port *from*, instead of two-to-four
divergent ones to reconcile mid-port. This isn't a blocker — it's saying
"do the 30-minute vanilla fix before the 3-hour React port of the same
thing," not "React can't start until vanilla is perfect."

**Should genuinely wait (per the existing Sprint E framing, unchanged by
anything in this audit):**
- Porting the note page / quiz engine (`US-E02`) — the highest-risk,
  most cross-cutting phase. Nothing found in this audit changes that
  risk assessment.
- Deleting any vanilla file (`US-E03`) — hard-gated on full regression
  parity, as already decided.

**One new consideration this audit adds to the stack decision:** the
Part 1 shared-module extractions (`swipe.js`, `aria-live.js`, a search
adapter interface) are worth writing as **plain functions with no DOM
framework dependency**, specifically so they can be reused as-is inside
React components later (a `useSwipe()` hook can just call the same
`attachSwipe()` under the hood) rather than needing a second
React-specific rewrite. Small extra discipline now, real savings during
the Sprint E port.

**Bottom line:** yes, the new stack can start immediately, in parallel —
nothing in this audit found a reason to delay `US-C01`. The one adjustment
worth making to the existing sequencing is doing Part 1's cheap vanilla
consolidations *just before* whichever component each one maps to gets
ported, rather than either fully before or fully after the React work
starts.

---

## Part 7 — Full backlog status, epic by epic

Part 5 only covered the sprint-plan doc's Sprints A/B/G. This covers the
separate **backlog** doc (Epics 1–8) item by item — including Games and
JSON caching, which weren't addressed above. Status is based only on
what's been directly confirmed by file review across this audit; "Not
started" means no file reviewed shows any trace of it, not that it's
impossible it exists somewhere unreviewed.

### Epic 1 — Games Platform (US-101–110): **Not started, but not un-planned either**

None of the ten games exist in any file reviewed. For completeness (the
first pass through this section only named one by number, which isn't
rigorous enough given how many items got summarized rather than checked
individually elsewhere — see Part 8's note below), all ten by name:
US-101 Guess the Service, US-102 Match the Pair, US-103 Order the Flow,
US-104 Flashcard Flip, US-105 Fill in the Blanks, US-106 Service
Classification, US-107 Architecture Puzzle, US-108 Architect Builder,
US-109 Debug the Architecture, US-110 Cost Optimization Challenge — zero
trace of any of them in any file reviewed this audit.
`dashboard-cards.json` has only AWS/DSA/Quiz entries; `navigation-url.json`
has no Games entry. **Worth noting:** the brand-kit mockup's own LOON icon
system already includes a dedicated **Games** icon alongside
Notes/Labs/Quiz/Gallery — meaning the rebrand's icon design already
anticipated this epic existing as a peer to the other subject areas, even
though no game has been built yet. If Games ships later, it slots into
the icon system and (per the mockup's sidebar) navigation with no
redesign needed — the design already budgeted for it. Recommend treating
Games as "sequenced correctly at low priority," not "forgotten" — per the
backlog doc's own ⭐⭐⭐⭐⭐ rating this is high-value *eventually*, but every
game needs its own JSON schema + scoring + a11y + progress tracking (per
the epic's own "Build Order" framing), which is a lot of net-new surface
area to add before the vanilla-to-React transition, not after. Building
even one game (US-101, the simplest per its own framing) directly in
vanilla now would mean porting it *again* in Sprint E — better to
prototype the first game in React directly once Sprint C's scaffolding
lands, rather than build it twice.

### Epic 2 — Study Experience: **Mostly done, two explicit gaps**

| Story | Status | Evidence |
|---|---|---|
| US-111 Lite Mode | ✅ Done | `notes-page-core.js`'s `getLiteMode`/`setLiteMode`/`toggleLiteMode`, `liteMode` key |
| US-112 Progress Tracking | 🟡 Partial | Per-feature progress exists (reading, checklist, quiz, interview, visual-MCQ — see the `localStorage` table) but there's no **unified** cross-feature view (study streak, overall completion %, dashboard badges) — each feature tracks its own progress in isolation, nothing rolls them up |
| US-113 Fuzzy Search | 🟡 Partial | Done for notes (`notes-index.js`/`notes-search.js`, real FlexSearch) — **not** done for gallery/quiz, which still do plain substring matching (Finding 8) |
| US-114 Reading History | ✅ Done | `recently-viewed.js` |
| US-115 Favorites | 🟡 Partial | Done for notes/gallery (♡); the backlog spec asks for notes/quizzes/labs/games — quiz has Bookmarks (a related but different mechanism, Finding 3), labs/games don't exist yet as favoritable items |

**US-112's gap is the concrete, buildable piece of this epic still
missing** — a small `js/shared/progress-summary.js` that reads the
existing per-feature keys (already all confirmed real, per the
`localStorage` table) and computes one rollup, rather than a new tracking
mechanism. Low effort, matches this epic's own framing ("Future: study
streak, completion percentage, dashboard badges").

### Epic 3 — Performance & Optimization: **JSON caching explicitly addressed below; rest mostly done or intentionally deferred**

- **US-116 JSON Caching — the pasted priority-recommendation doc already
  gave this a clear call, consistent with this audit's own findings: skip
  it.** Every fetch site-wide (`dashboard.js`, `notes-index.js`,
  `gallery.js`, `quiz-index.js`, `quiz-engine.js`, etc.) currently does a
  plain uncached `fetch()` per page load — confirmed, no caching layer
  exists anywhere. Building a hand-rolled cache now means either (a)
  writing a `loadJSON()` wrapper that every module has to be individually
  updated to call instead of `fetch()` directly (a real, if small,
  refactor across ~8 files), or (b) building it once and throwing it away
  when React lands, since **TanStack Query** (already the backlog's own
  proposed answer, `US-136`) solves this exact problem with cache
  invalidation, background refetch, and dedup built in — better than
  anything worth hand-rolling in vanilla JS. **Recommendation: don't
  build this in vanilla.** The one case where it'd genuinely help today —
  re-visiting the same note/quiz repeatedly in one session — is a minor
  UX nicety, not a broken experience, so there's no urgency pulling
  against "wait for TanStack Query."
- US-117 Lazy Loading — 🟡 partial: `gallery.js`/`gallery.html`
  (reviewed batch 2) load images progressively as part of the gallery's
  own rendering, but this hasn't been confirmed as true `loading="lazy"`/
  intersection-observer-based lazy load vs. just "renders what's visible
  in the current view mode" — worth a direct check next time `gallery.js`
  is revisited for anything else, not urgent enough alone.
- US-118 Minification Pipeline — ✅ done (`tools/minify.js` +
  `deploy.yml`, confirmed batch 7).
- US-119 Performance Dashboard — ❌ not started. `audit_content.py`
  produces *content* statistics (note/quiz/image counts, reading time)
  but nothing about bundle size, JSON payload size, or load timing — a
  genuinely different, not-yet-built feature.

### Epic 4 — Community & Communication: **Not started**

US-120 (Feedback System), US-121 (Contact Page), US-122
(Notifications) — no trace of any of these in any file reviewed.
`LICENSE.md` has a contact email and a GitHub issues link, which covers
the *minimum* of US-121 informally, but there's no dedicated Contact
page. **Notable:** the brand-kit mockup shows a notifications bell icon
in the header (with a badge count) as if this already exists — same
situation as Games: the *design* has budgeted for this feature, the
*implementation* hasn't started. Worth the same explicit callout as
Games in Part 4 above — don't let the mockup's confident rendering of a
bell icon imply the feature is further along than it is.

### Epic 5 — Content Authoring: **US-123 is the one worth flagging directly**

- **US-123 MCQ Schema Unification — genuinely still open, and directly
  relevant to this audit's Finding 8/Part 1 findings.** `parse_mcq.py`'s
  own docstring states its output "matches `notes-mcq.js` (shared, reused
  from AWS) EXACTLY" — so DSA and AWS notes already share one MCQ schema.
  Whether *that* schema also matches the standalone quiz JSON schema
  consumed by `quiz-engine.js` (the files behind `quiz.html`) hasn't been
  directly confirmed this audit — the two systems were reviewed
  separately (`parse_mcq.py`/`notes-mcq.js` in one batch, `quiz-engine.js`
  in another) and never diffed against each other directly. This is
  exactly the kind of check this audit's Part 1 approach is built for —
  recommend a dedicated pass next time both `notes-mcq.js` and a sample
  quiz JSON file are available together, diffing their schemas the same
  way Finding 8 diffed search implementations.
- US-124 Presentation Generation — ✅ done (`slides-overview.html`,
  confirmed existing per Sprint B).
- US-125 Authoring Improvements — 🟡 ongoing, not a discrete "done/not
  done" — `instructions.md` has already been modularized into companion
  files (`linkedin-instructions.md`, `youtube-metadata-instructions.md`,
  `video-slides-instructions.md`) per earlier session history; extending
  this to labs/presentations/games as they're built is naturally ongoing
  work, not a backlog item with a clear finish line.

### Epic 6 — Testing & Developer Experience: **Real pytest suite exists; CI doesn't run it**

- US-126 Visual Regression Testing — ❌ not started.
- **US-127 Continuous Integration — 🟡 partial, and this is a real,
  concrete gap worth fixing.** `deploy.yml` (reviewed batch 7) runs
  `npm ci` → `npm run build` → deploy, on every push to `main`. It does
  **not** run the pytest suite (`python/tests/`, confirmed real and
  substantial per batch 6) anywhere in that workflow. So the real test
  suite that exists today never gates a deploy — a broken
  `generate_notes_index.py` change could ship straight to production
  without the tests that would have caught it ever running. This is a
  small, concrete fix: add a `pytest` step to `deploy.yml` before the
  build step (install `requirements.txt`, run `pytest`, fail the workflow
  on any failure) — much higher leverage than most items in this list
  since the coverage already exists, it's just not wired to anything.
- US-128 Code Coverage — ❌ not started (no `coverage.py`/`nyc`/similar
  tooling found).
- US-129 Lighthouse Audits — ❌ not started.

### Epic 7 — Branding & Polish: **Overlaps directly with the Notebook Buddy rebrand (Part 4)**

- US-130 Adaptive SVG Favicon — ❌ not started. `shared-meta.js`
  (reviewed batch 2) injects fixed-size PNG favicons
  (16×16/32×32/180×180) from `favicon_io/`, not a single adaptive SVG
  responding to `prefers-color-scheme`. Directly actionable once the
  Notebook Buddy icon/logo assets exist (Part 4) — same asset, two
  formats, not sequenced separately.
- US-131 Project Branding — 🟡 in progress — this **is** the Notebook
  Buddy rebrand itself (Part 4). Not a separate item.
- US-132 Enhanced 404 — 🟡 partial. `404.html` (reviewed batch 1)
  already has a search box and a "Recently Viewed" list via
  `recently-viewed.js` — genuinely ahead of a bare "Page Not Found, Go
  Home" page. Missing, per the backlog's own spec: "popular resources"
  (would need a new `popular-notes.json`, not yet generated by any
  Python script reviewed) and "automatic redirect" (not implemented).
  Matches the separately-pasted priority note's own "404 Improvements"
  section almost exactly — same gap identified twice, once at
  epic-story granularity and once as a standalone recommendation.

### Epic 8 — React Migration

**Correction, 2026-07-08:** the first pass of this section said "already
fully covered in Part 6" — true in substance, but Part 6 uses the
sprint-plan doc's own numbering (`US-C01`–`US-C03`, `US-E01`–`US-E03`),
never explicitly cross-referenced against **this** document's numbering
(`US-133`–`US-137`). Reconciled properly now:

| Backlog # | Backlog story | Sprint-plan equivalent | Match? |
|---|---|---|---|
| US-133 | Project Foundation (React/Vite/TS/Tailwind) | `US-C01` Project scaffolding | ✅ same work |
| US-134 | Component Migration (Dashboard/Notes/Quiz listing/Gallery/shared layouts) | `US-C02` (dashboard+layout) + `US-C03` (notes/quiz index) + part of `US-E01` (gallery) | ✅ same work, split across 3 stories instead of 1 |
| US-135 | **State Management** (theme/progress/search/bookmarks) | *(not explicitly covered anywhere in Part 6)* | ❌ **genuine gap, flagged now** |
| US-136 | Data Layer (TanStack Query) | Mentioned in Part 7's Epic 3/JSON-caching discussion, not cross-referenced back to Part 6 | 🟡 covered elsewhere, not linked |
| US-137 | Complete Migration (notes/labs/quizzes/games, preserving JSON/URLs) | `US-E01`+`US-E02`+`US-E03` combined | ✅ same work |

**US-135 (State Management) is the one real gap this reconciliation
surfaces.** Neither `feature-sprint-plan.md`'s phase table nor Part 6
above ever names a specific state-management approach for the React
port — they describe *which pages* get ported, not *how cross-cutting
state* (theme, progress, search, bookmarks — all currently
`localStorage`-backed, per Part 2's table) gets architected once
multiple React components need to read/write the same state. Worth
deciding explicitly before `US-C02` (the first component-porting story)
starts: React Context is likely sufficient given the state here is
mostly per-key preferences rather than complex derived state, so a
dedicated library (Redux/Zustand) may be more than this project needs —
but that's a call worth making on purpose, not by default.

---

## Part 7 summary table

| Epic | Status |
|---|---|
| 1. Games Platform | ❌ Not started — correctly low-priority, icon system already budgets for it |
| 2. Study Experience | 🟡 Mostly done — unified progress rollup (US-112) and gallery/quiz fuzzy search (US-113) are the real gaps |
| 3. Performance | 🟡 Minification done; **JSON caching explicitly recommended to skip** (React/TanStack Query will replace it); lazy-load needs confirming; performance dashboard not started |
| 4. Community | ❌ Not started — mockup's notification bell is design-only, not built |
| 5. Content Authoring | 🟡 MCQ schema unification (US-123) needs a direct diff check; presentation generation done |
| 6. Testing & DX | 🟡 Real pytest suite exists but **isn't wired into `deploy.yml`** — highest-leverage cheap fix in this whole section |
| 7. Branding & Polish | 🟡 In progress — is the Notebook Buddy rebrand; 404 already partially ahead of spec |
| 8. React Migration | See Part 6 |

---

## Part 8 — Conversation completeness check (2026-07-08)

Requested directly: re-verify every file uploaded across this entire
thread actually made it into these docs, not just the ones processed
most recently. Result below — most files were fully read; three were
previously only grep-checked for one specific fact (the domain string)
rather than fully reviewed, which is now corrected.

**Just closed this pass:** `audit_content.py`, `generate_notes.py`, and
`generate_notes_index.py` (all from batch 6) had only been grepped for
`BASE_URL`/domain strings, not read in full — their `PROJECT.md`
descriptions were built from `test_*.py` behavior and the pasted
`roadmap-and-decisions.md`'s own claims, which is reliable but indirect.
Directly confirmed this pass: `audit_content.py`'s 19 real functions
(duplicate topics/slugs, resource detection, session checks,
related-resource validation, build statistics, three report writers,
console summary) match what was documented; `generate_notes_index.py`'s
22 functions (`smart_title`, `detect_category`, `load_category_keywords`,
`validate_note`, the diff-based `main()`) match; `generate_notes.py`'s
`calculate_read_time`/`build_version_info_bar`/`build_read_time_badge`/
`insert_after_title_block` and its `beautifulsoup4` import all confirmed
present exactly as the roadmap doc described. **No discrepancies found**
— everything already written about these three files holds up under a
direct read, nothing needs correcting.

**Still only partially reconciled:** the separately-pasted Tailwind/CSS-
Modules hybrid recommendation (the "40% Tailwind / 40% CSS Modules / 20%
global" split, its specific folder structure, and its named component
list — QuizCard/SearchBar/Sidebar/Header/Footer/Timer/ExamMode) was
folded into Part 6 only at a high level ("Tailwind for layout, CSS
Modules for components"). The specific 40/40/20 ratio and folder
structure weren't individually endorsed or challenged. **Worth stating
directly now:** the ratio and structure both look reasonable and don't
conflict with anything found in this audit — `styles.css`'s existing
CSS-variable theming maps cleanly onto "20% global" (design tokens,
typography, print styles), and the named component list
(QuizCard/Timer/ExamMode/etc.) matches real, confirmed complexity in the
current CSS (`.quiz-carousel-container`, `.floating-menu-panel`,
`.exam-mode-*` body classes) — nothing in the codebase argues against
this split. No changes recommended to that plan.

**Everything else uploaded this thread was already fully read and
reflected** in `PROJECT.md`/`log-analysis.md`/`audit-findings.md`/
`icon-inventory.md` at the time each batch was processed — re-confirmed
by re-scanning this document's own batch-by-batch file lists against
what's cited throughout the other four docs.

---

## Part 9 — `slides.html` revised design: windowed vs. fullscreen (supersedes part of Part 3)

New framing, replacing the "minimal nav mode" suggestion in Part 3
(Findings 25/26) with something more precise: **model it on Google
Slides' own windowed/fullscreen split**, not a single fixed layout.

- **Windowed (default) state:** the deck sits in the middle of a normal
  page — breadcrumb, back button, and footer all present, exactly like
  a note page. This is the state `slides.js`'s current `data-no-nav="true"`
  prevents entirely; removing that flag and letting `navigation.js`/
  `footer.js` run normally in this state resolves Findings 25/26/29 in
  one move, no special "minimal nav" variant needed.
- **Fullscreen state:** triggered by the existing `toggleFullscreen()`
  (already implemented in `slides.js`, bound to the `F` key and a
  fullscreen button) — chrome (breadcrumb/header/footer) hides, deck
  fills the viewport, exactly current behavior. No change needed here;
  this part already works.
- **The only real code change:** stop setting `data-no-nav="true"` on
  `slides.html`'s `<body>`, and have `slides.js` hide `nav.breadcrumb`/
  `.page-header`/`#footerRoot` (rather than never rendering them) when
  entering fullscreen, showing them again on exit — a CSS/class toggle
  keyed off the existing fullscreen state, not a new nav mode.
- Favorites (Finding 26) resolves for free once `.page-header` exists in
  the windowed state, since `notes-favorite.js`'s injection target search
  already checks for it first.
- Accessibility (Finding 28) is unaffected by this change either way —
  `notes-accessibility.js` still needs adding to `slides.html`'s script
  chain regardless of windowed/fullscreen, since skip-links/live-regions
  matter in both states.

This is a smaller, more surgical fix than Part 3 originally proposed —
worth updating `audit-findings.md`'s Findings 25/26/29 description to
point here instead of "add a navigation.js minimal mode."

---

## Part 10 — Export formats: PPT (slides), DOCX (notes), EPUB (all content)

Three separate asks, three different feasibility levels. None of these
exist anywhere in the codebase today — confirmed across every JS/Python
file reviewed this audit, the only export capability that exists at all
is `quiz-export.js`'s "Download PDF" button, which is actually just
`window.print()` with a print-only body class, not a real file-generation
step, and its "Copy summary" clipboard export (plain text).

| Format | Feasible client-side (static site, no backend)? | Notes |
|---|---|---|
| **Slides → PPT** | 🟡 Partial | No pure-client PPT generator exists that handles rich HTML/CSS layouts well — libraries like `pptxgenjs` can build a `.pptx` file entirely in-browser, but would need each slide's content re-expressed as `pptxgenjs`'s own shape/text API, not a direct HTML→PPTX conversion. Realistic scope: a "reasonable approximation" export (title + bullet text per slide), not pixel-perfect fidelity to the on-screen deck. |
| **Notes → DOCX** | ✅ Yes, genuinely feasible | Notes are already structured HTML with headings/paragraphs/tables/code blocks — libraries like `docx` (npm) or `html-docx-js` can convert this reasonably faithfully entirely client-side, no server needed. This is the most realistic of the three "download as X" asks. |
| **Any content → EPUB** | ✅ Yes, feasible, and matches the separately-pasted EPUB proposal closely | EPUB is fundamentally a zip of XHTML files, which is what notes already are. `JSZip` (client-side zip creation) + hand-built EPUB manifest/OPF/NCX XML, or a library like `epub-gen-memory`, can package existing note HTML into a valid EPUB entirely in-browser. The pasted proposal's own framing (quiz → "Quiz Book" with question/page-break/answer-key structure, revision-book export combining favorites+highlights+bookmarks) is a good design and doesn't require anything not already in the data model — `notes-index.json`'s `files` array and the favorites/bookmarks keys (Part 2 table) already have everything needed to select what goes into an export. |

**Recommended sequencing, combining feasibility with existing priorities:**
EPUB and DOCX are both realistic, client-side-only, and reuse data
already in the index — worth treating as one Sprint G-style story
(`js/shared/export.js` with format-specific adapters) rather than three
separate builds. PPT export is worth scoping down to "title + bullets"
rather than promising visual parity with the on-screen deck, or holding
it until after the React port (a component-based slide structure — see
`US-E01`'s slides port — will make "walk each slide, emit a PPTX shape"
meaningfully easier than doing the same walk against today's hand-built
HTML).

---

## Part 11 — Personalization roadmap: what's possible on a static site, what isn't

**Corrected 2026-07-08 — the version below replaces an earlier pass that
silently dropped 5 of the pasted doc's 25 numbered items** (Dashboard
Widgets, Sticky Notes, Search Only My Notes, Revision Mode, Motivational
Dashboard never appeared anywhere in the first version of this section).
Every item is listed below by its original number so none can go missing
again. Triaged against the hard constraint the pasted doc itself states
correctly: **no backend, no accounts, no server — everything must live
in `localStorage`/`IndexedDB` on one browser.**
✅ = fully possible today. 🟡 = possible, nontrivial. ❌ = needs a backend.

| # | Item | Status | Note |
|---|---|---|---|
| 1 | Personal Profile | ✅ | One new `localStorage` key, same pattern as every existing preference key (Part 2). |
| 2 | Theme & Appearance | ✅ | Extends the existing 3-theme CSS-variable system; accent color/radius/compact-mode are all just more variables. |
| 3 | Continue Where You Left Off | ✅ | `notes-reader.js` already tracks `readingProgress-folder-<folder>` with a timestamp; adding scroll position is additive. |
| 4 | Favorites | ✅ Already built | `notesFavorites`/`galleryFavorites` (Part 2). Doc asks for quizzes/labs too — quiz currently has Bookmarks instead (a related, different mechanism, Finding 3) — extending Favorites proper to quizzes/labs is the remaining scope. |
| 5 | Recently Opened | ✅ Already built | `recently-viewed.js`. |
| 6 | Highlighting | 🟡 | Doc's own callout (stable HTML ids, not character offsets) is exactly right and matches this project's existing pattern of stable ids (`note.folder`, `pageId`). Real effort is the selection UI, not storage design. |
| 7 | Personal Notes (on highlights) | 🟡 | Depends on #6 landing first — same popup-editor effort the doc itself flags. |
| 8 | Bookmarks | ✅ Already built | `bookmarks-<pageId>`, ⭐/☆ (Finding 19). Doc's "bookmark specific headings" ask is exactly what this already does. |
| 9 | Study Statistics | 🟡 | Computable from data already accumulating (quiz scores, reading/checklist progress) — the gap is one aggregation layer, not new tracking (same missing piece as Part 7's Epic 2 progress-rollup gap). |
| 10 | Daily Goal | ✅ | Pure `localStorage` + a daily-reset check (compare stored date to today) — no new infrastructure. |
| 11 | Reading Progress | ✅ Already built | Per-note, via `readingProgress-folder-<folder>` — doc's ask is a *display* of this (e.g. "Networking 82%"), which is a UI addition on top of data that already exists. |
| 12 | Study Streak | 🟡 | Same aggregation-layer dependency as #9 — needs reliable "did the user do anything yesterday" date logic, which the doc itself flags as the hard part. |
| 13 | Achievements | 🟡 | Depends on #9/#12 existing first — an achievement engine is just threshold-checks against stats that don't exist as a rollup yet. |
| 14 | Dashboard Widgets (rearrangeable cards) | 🟡 | **Missed in the first pass of this section — added now.** Needs drag-and-drop (a real, if well-trodden, UI feature) plus a stored card-order array — both fully client-side, no backend needed, but genuinely more UI work than most items on this list. |
| 15 | Sticky Notes | ✅ | **Missed in the first pass — added now.** A freeform text `localStorage` entry per note/page — simpler than #7 (Personal Notes on highlights) since it's not anchored to a specific highlighted span, just a page-level note. |
| 16 | Quick Actions (customizable homepage buttons) | ✅ | Pure `localStorage` (an ordered list of action ids) + reading `dashboard-cards.json`-style data to render them — no new infrastructure. |
| 17 | Search Only My Notes (highlights/bookmarks/personal notes) | 🟡 | **Missed in the first pass — added now.** Depends on #6/#7/#8 existing with real data first; the search mechanism itself can reuse whichever adapter Finding 8's proposed shared search interface (Part 1) produces, rather than building a fourth separate search implementation. |
| 18 | Export (JSON/Markdown/PDF) | 🟡 | JSON export is straightforward (`JSON.stringify` the relevant keys); PDF reuses the existing `window.print()` pattern already in `quiz-export.js`; see Part 10 for the fuller DOCX/EPUB export discussion this prompted. |
| 19 | Import | 🟡 | Reverse of #18 — the real design decision is a versioned schema so importing an old export doesn't corrupt newer key shapes, which the project's existing `{v:1, ...}` envelope convention (Part 2) already sets a precedent for. |
| 20 | Reading Preferences (font size, line height, width) | ✅ | CSS variables + a settings panel, same shape as theme switching. |
| 21 | Accessibility (contrast, reduced motion, dyslexia font, larger UI) | ✅ | Same shape as #20; `prefers-reduced-motion` can also be respected automatically via CSS media query with no setting needed for that one specifically. |
| 22 | Offline Mode | 🟡 | Needs a Service Worker for asset caching — new infrastructure (nothing currently registers one) but still 100% static-site-compatible; GitHub Pages serves static assets, a Service Worker just caches them. |
| 23 | Revision Mode (show only highlights/bookmarks/notes) | 🟡 | **Missed in the first pass — added now.** A filtered view over #6/#7/#8's data — depends on those existing first, but the filtering itself is straightforward once they do. |
| 24 | Random Revision ("Surprise Me") | ✅ Already built | The notes listing's existing `random` sort option (batch 1 review) does exactly this for notes; extending to "any content type" is a small scope increase. |
| 25 | Motivational Dashboard (contextual encouragement messages) | ✅ | **Missed in the first pass — added now.** Straightforward once #9/#11's stats exist to reference ("18 hours this week," "5 chapters left") — otherwise just static rotating copy, which needs no data at all as a first version. |

**❌ Correctly identified as needing a backend — the doc's own "Features I
Would Avoid" list is accurate and complete:** chat, friends, online sync
across devices, leaderboards, comments, shared notes. All need either
persistent server-side storage or real-time cross-user communication,
neither of which a static GitHub Pages site can provide. Nothing to add
or dispute here.

**IndexedDB note (from the doc's own "Technical Challenges" section):**
correctly identified as the right tool once highlights/personal-notes
data (#6/#7) grows past what plain `localStorage` handles comfortably (its
own stated ~5–10MB limit) — still fully client-side, just a different
browser API, not a new architectural requirement.

**Net recommendation, unchanged from the original pass:** the doc's own
"Recommended Development Order" is reasonable — treat this whole
personalization roadmap as **Epic 2's natural successor** (a new Epic
2.5, sequenced after the existing Study Experience gaps close, before
Games) rather than competing with Sprint G's current active work for
priority.
