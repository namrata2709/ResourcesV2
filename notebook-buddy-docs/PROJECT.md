# Notebook Buddy — Project Overview

**Refreshed 2026-08-17.** This document was last substantively accurate
around 2026-07-08, before the React migration (`T0-1`–`T6-1`) existed at
all — it described a vanilla HTML/CSS/JS site. Everything below is
rewritten against the real current source (`python.zip`/`web.zip`,
verified directly, same discipline as `sprint-tickets.md`). The old
vanilla architecture is condensed into §9 (Legacy Note) rather than
deleted outright — it's still real, still on disk, and still the thing
`T6-1` will eventually delete — but it no longer describes what ships.

Full day-to-day ticket status lives in `sprint-tickets.md` /
`sprint-tickets-tracks-PREB.md`; verification history and decisions live
in `CHANGELOG.md`. This document stays a stable reference: what the
project *is*, not what changed *this session*.

---

## 1. Project Overview

**Notebook Buddy** (renamed from "Learning Dashboard," 2026-07-06) is a
free, static React study site for AWS and DSA content, built and
maintained by Namrata Mulwani for the AWS re/Start cohort and shared
publicly as a free training resource.

**Architecture, in one line:** static content generated at build time by
a Python pipeline, served as a client-side React app with no backend —
everything a user does (progress, favorites, highlights, settings) lives
in that browser's `localStorage`, nowhere else.

**License:** CC BY-NC 4.0 (educational use, attribution required, no
commercial use without permission).

**What Notebook Buddy is not, stated explicitly to prevent scope
creep:** not a commercial EdTech product, not a SaaS platform. No user
accounts, no login, no cloud sync, no backend database, no server-side
personalization. This isn't a limitation to work around — it's a
deliberate constraint that shapes every technical decision in this
document. A feature proposal that needs a server or a database is out
of scope until that constraint itself is revisited, not something to
quietly design around.

---

## 2. Core Purpose

The site exists to turn live AWS re/Start training sessions (instructors
Todd Pritsky and Chandra Dunn) into a permanent, searchable,
self-testable study resource — for personal exam prep and for sharing
with the wider cohort. This hasn't changed since the vanilla era.

**Primary goals:**
- **Capture session content durably.** Convert live lecture/lab content
  into structured notes once, rather than relying on memory or
  scattered raw notes.
- **Make studying active, not passive.** Every note pairs reading
  material with MCQs, flashcard-style interview questions, a glossary,
  and a progress checklist — not just a wall of text.
- **Support exam recall specifically.** The highlight system exists
  around "could this be asked on the exam?", not general emphasis.
- **Be usable with zero setup.** No login, no build step for the end
  user, no backend — anyone with the URL can study immediately.
- **Stay free and shareable.** CC BY-NC licensing keeps the material
  usable by cohort-mates and other learners while protecting it from
  commercial reuse.

---

## 3. Product Scope

A feature inventory, framed as a real Keep/Improve/Remove/Future
decision table rather than a flat list — this is the section that
prevents scope drift, per the "what should change to make the project
better" discussion that produced this document. State reflects real
verification against source as of 2026-08-16/17, not aspiration.

| Area | Feature | State | Call |
|---|---|---|---|
| Dashboard | Cards, rearrangeable layout, greeting | ✅ Done | Keep |
| Dashboard | Continue Reading, Daily Goal, Study Stats widgets | ✅ Done | Keep |
| Notes | Reading, body-prose rendering, TOC, reading progress | ✅ Done | Keep |
| Notes | Highlighting | ✅ Done (fixed 2026-08-16 — see §9) | Keep |
| Notes | Bookmarks (per-section star) | ✅ Done | Keep |
| Notes | Personal notes on highlights | ✅ Done (unblocked with highlighting) | Keep |
| Notes | Lite Mode, Exam Mode, Study Timer | ✅ Done | Keep |
| Notes | Reading Preferences (font/line-height/width) | ✅ Done | Keep |
| Notes | Export highlights to `.txt` | ⬜ Not built (unblocked, still stubbed) | Finish — `T5-3c-6` |
| Quiz | Quiz engine, Study Mode, timed mode, search/filter | ✅ Done | Keep |
| Quiz | "Open as Quiz" link from note MCQs | ✅ Done | Keep |
| Revision | Revision Mode (bookmark + highlight filtering) | ✅ Done | Keep |
| Calendar | Read-only study-activity calendar (real ticket id: `R3-1c`) | ✅ Done | Keep — see §9 for one open design question |
| Gallery | Grid/list, filters, favorites, download | ✅ Done | Keep |
| Search | Notes-index search, Search My Notes | ✅ Done | Keep |
| Settings | Profile, Appearance, Accessibility, Quick Actions, Reading Preferences | ✅ Done, all 5 sections reachable | Keep |
| Personalization | Sticky Notes, Daily Goal, Study Streak, Achievements, Motivational widget | ✅ Done | Keep |
| Export | DOCX, PPTX, EPUB (incl. Quiz Book + Revision Book) | ✅ Done | Keep |
| Export | JSON backup/import | ⬜ Not built | Finish — `P4-1`, flagged as a real gap given how much state now lives only in one browser |
| Games | 10-game platform + shared infra | ⬜ Not started, real design proposed | Future — see `Track G` |
| Offline/PWA | Service Worker, offline mode | ⬜ Not built | Future — `P5-1`, see §6's Storage & Offline subsection for the real implementation pattern to follow when picked up |
| Notifications | In-app Notifications Bell | ✅ Done (`R3-1a`) | Keep |
| Notifications | Push / email delivery | ❌ Decided against | Removed from scope — `B-2`'s real decision: in-app only, chosen specifically to avoid a server dependency |
| Navigation | Persistent sidebar nav (web) + icon rail (tablet) + bottom tab bar (app) | ⬜ Not built, real design exists | **Reversed 2026-08-19** — `R2-1` reopened, sidebar adopted, breadcrumbs being removed app-wide. See `NAV-1`. Superseded its own earlier "not planned" entry in this same table. |
| Study | Standalone "Study Mode" page | ❌ Not built as a page | Clarified, not a gap — "Study Mode" is a real quiz-runtime toggle (self-rating widget vs. Reset), not a separate page; an old rebrand mockup implied a dedicated page that was never actually planned as one |
| Performance | User-facing runtime dashboard | ⬜ Not started | Future — `B-9a` |
| Performance | Build-time bundle/payload report | ⬜ Not started | Future — `B-9b` |
| Accounts | Login/signup/cloud sync | ❌ Not present | **Out of scope, permanently**, per §1 |
| Collaboration | Shared notebooks, real-time editing | ❌ Not present | **Out of scope, permanently** — would need a backend this project deliberately doesn't have |

---

## 4. Product Requirements

High-level expected behavior per feature area — what the product should
do, not how. Full acceptance detail lives in each ticket's Done-when
list in `sprint-tickets.md`/`sprint-tickets-tracks-PREB.md`; this stays
intentionally brief, one paragraph per area, so it doesn't fork into a
second source of truth that drifts from the tickets.

**Notes.** A user can browse by subject, search, read a note with real
generated prose (headings, callouts, collapsibles, code, images),
highlight text, bookmark a section, add a personal note to a highlight,
adjust reading preferences, and have their scroll position restored on
return. Highlighting must survive a content regeneration as long as the
underlying markdown is unchanged.

**Quiz.** A user can take a quiz standalone or launched from a note's
embedded MCQs (as a genuinely separate attempt, not shared progress),
search/filter questions, use Study Mode (self-rated correctness) as an
alternative to score-based Reset, and see their progress reflected on
the Quiz-index listing.

**Revision.** A user can see a filtered view of a note containing only
their bookmarked and highlighted content, toggle it on/off without
losing the underlying full content, and export a combined
favorites/bookmarks/highlights view as an EPUB "Revision Book."

**Calendar.** A user can see which days they studied, one month at a
time, computed from the same underlying activity data the Study
Statistics widget uses — not a separate calculation. Read-only by
design: not a personal planner, no ability to schedule future study
sessions on it.

**Export.** A user can export a note, chapter, or their whole notebook
as DOCX, EPUB (including Quiz Book and Revision Book variants), or
PPTX (for slide decks), entirely client-side, with no server round-trip.

**Settings & Personalization.** A user can control theme (light/dark/
comfort), accessibility (high contrast/reduced motion/dyslexia font),
profile info, reading preferences, and which Quick Actions appear on
their Dashboard — all local, all reversible, all independent of each
other (changing one setting domain never silently affects another).

**Data ownership.** Since there's no account and no server, the user's
local browser is the only copy of their progress, favorites,
highlights, and settings. The product's stated responsibility here
(not yet fulfilled — see `P4-1`) is to make that fact visible and give
the user a real way to back it up, not to pretend the risk doesn't
exist.

---

## 5. UX / UI / Brand Spec

**Scope, stated explicitly per how this section was scoped:** this
documents only what's real and shipped today. Track R's actual brand
system (logo variants, mascot, illustration set) hasn't been built by a
designer yet — see `sprint-tickets-tracks-PREB.md`'s Track R for the
planned-but-not-built brand work. Nothing aspirational is listed here.

**Themes.** Three real modes — `light`, `dark`, `comfort` — driven by a
`data-theme` attribute and a shared set of CSS custom properties
(`--bg-primary`, `--bg-card`, `--text-primary`, `--text-muted`,
`--border-color`, `--primary`, `--primary-hover`). Every themed surface
in the real app, including the DSA animation pages, reads from these
same variables — confirmed directly, not just by convention. Semantic/
feedback colors (quiz correct/incorrect, algorithm-state colors in DSA
animations) are a deliberate exception: they stay constant regardless
of theme, because they encode meaning (correct/wrong, found/eliminated)
rather than page chrome.

**Appearance controls.** Beyond the 3-theme cycle, a separate
`AppearanceContext` controls accent color, corner radius, density, and
an animation on/off toggle — deliberately a sibling of theme, not
nested inside it, so changing one never implicitly touches the other.

**Accessibility, real and shipped:** `highContrast`, `reducedMotion`,
`dyslexiaFont` toggles (`A11yContext`); full keyboard navigation
including a real shortcut set (`Alt+E` cycles Exam Mode); visible focus
rings; skip links and ARIA live regions carried forward from the
vanilla site's a11y work. `reducedMotion`'s own toggle is independent
of (and doesn't override) the OS-level `prefers-reduced-motion` media
query — both signals are honored.

**Icons.** A centralized icon strategy exists (`R4-1`'s real, wired
mapping) — `lucide-react` for UI chrome, real branded PNGs for the 3
subject/quiz cards (with the standalone Calendar card still on emoji
fallback, unconfirmed whether that's deliberate), SVG fallbacks for
bookmark/flag icons pending a custom-PNG upgrade. One meaning maps to
one icon consistently — a real, enforced rule, not aspirational.

**What's explicitly not built yet:** stacked/wordmark logo variants,
the mascot, branded illustrations for empty/error/success states, a
formal component design system (buttons/cards/modals/toasts
standardized as reusable primitives with defined states). All real
Track R scope, none of it started.

---

## 6. Technical Architecture

### Stack
React 19.2, TypeScript ~6.0, Vite 8, React Router 7.18, Tailwind 3.4,
`lucide-react` for icons, `flexsearch` powering all client-side search
(Notes-index, Quiz-index, Gallery, Search My Notes — one shared
`useSearch()` hook, not reimplemented per page). Test stack: Vitest +
Testing Library + `jsdom`; `oxlint` for linting (not ESLint); Playwright
for visual regression (`e2e/visual/*.spec.ts`, 6 real specs). A real
`.github/workflows/ci.yml` exists with an honest split: JS tests/
coverage/visual-regression run for real; the Python-side pytest job is
an explicit, labeled placeholder pending a cross-repo merge (see
"Repo structure" below).

### Content pipeline (Python, still manual — no CI hook re-runs it)
Markdown authored per-subject (`aws-standard-instructions.md`/
`dsa-instructions.md`) → `generate_notes.py` (one unified script,
subject auto-detected via `subjects.json`'s registry, not hardcoded
`TYPE_CONFIG` anymore — `T3-7a`/`b`/`c`) → real body-prose JSON with a
stable `blockId` stamped on every block, at every nesting level (fixed
2026-08-16, `_extract_blocks()`'s shared `emit()` wrapper) → `mcq.json`/
`glossary.json`/`interview.json`/`checklist.json` per note →
`generate_notes_index.py`/`generate_quiz_index.py`/
`generate_dashboard_cards.py` rebuild the real index files React reads.
`dashboard.py` remains the single CLI entry point wrapping every
generator (`dashboard notes`/`quiz`/`sitemap`/`audit`/`all`/`serve`/
`test`/`build`), and `audit_content.py` remains a real, report-only
content validator — both confirmed still present and real in the
current Python source.

**Subject registry, not hardcoded subjects:** `subjects.json` is the
single source of truth for AWS/DSA (and any future subject) —
`generate_notes.py` loads its type config from it, `build_description()`/
`build_edu_level()` are fully registry-driven, and an unrecognized
subject now fails the build loudly (`raise ValueError`) instead of
silently defaulting to DSA, the way it did before `T3-7b` fixed it.

**Slides/Presentations:** one shared `parse_slides.py` builder handles
3 real slide types (`regular`/`comparison`/`engage`, the latter with 5
real `kind`s: `think`/`scenario`/`poll`/`predict`/`pause`) and both
authoring conventions for speaker notes (external `[notes]` block,
or nested inside `[slide]`) — Python normalizes both into one
`notes_html` field, React never needs to know which convention a given
deck used.

### React app structure
Route table (real, from `App.tsx`):
```
/                          Dashboard
/notes-index[/:subject]    Notes listing (all or subject-scoped)
/notes/:folder             Note (redirects to /slides/:folder if slides-only)
/quiz-index                Quiz listing
/quiz/:quizId               Quiz (supports ?source=notes for note-embedded MCQs)
/slides/:folder             Presentation deck
/gallery                    Image gallery
/search-my-notes            Scoped search (highlights/bookmarks)
/export                     DOCX/EPUB/PPTX export hub
/settings                   5 real sections (Profile/Appearance/Accessibility/
                             Quick Actions/Reading Preferences)
/calendar                   Read-only study-activity calendar (R3-1c)
/contact                    Contact page
/<profile-slug>              Per-instructor link pages (B-8, e.g. /namu)
/notes, /quiz                Legacy redirects to the clean-path equivalents
*                            404, with Popular Notes + Recently Viewed
```
Base path is `/ResourcesV2/` (GitHub Pages project-subpath hosting) —
`vite.config.ts` rewrites root-absolute asset paths accordingly; dev
server and built-output preview resolve this differently, a real,
confirmed-different code path worth testing separately, not assumed
identical.

**State management:** 4 sibling React Contexts (`Theme`, `Profile`,
`Appearance`, `A11y`) — deliberately flat, not nested, so no settings
domain implicitly depends on another. A 5th (Reading Preferences) was
proposed in earlier planning but shipped as a Settings section with its
own hook rather than a 5th context — worth reconciling that naming if
touched again, not a functional gap.

### Repo structure note — corrected 2026-08-17
**The real main project repo is one monorepo with `.github/`, `python/`, `web/`, `src/` (vanilla) as top-level siblings** — confirmed directly by the user, not inferred. `.github/` is shared at the true repo root; it doesn't belong nested inside `python/`, and `python/` correctly has no `.github/` of its own — that was never a gap, it was the earlier session's misreading of the CI file's own comment (which referenced "the two checkouts merging," itself likely a stale artifact from before this repo was consolidated, or a confusing way of describing the same shared-root-`.github` fact). What this session has been calling `web.zip` → `merged/` is a zip of the `web/` subtree specifically, packaged in a way that happens to include a copy of the shared root `.github/` alongside it — not evidence of two separate checkouts merging.

**Real consequence for `T0-3`/`B-4b`:** there is no missing `python/.github/workflows/coverage.yml` to wait on — that file was never supposed to exist. The actual remaining work is simpler than previously framed: wire a real `pytest` job into the one shared `.github/workflows/ci.yml` (already real, already has an honest placeholder `python-tests` job) so it correctly runs against the `python/` subtree of the full repo. This isn't blocked on a repo merge that hasn't happened — the repo is already one thing. Both tickets corrected accordingly.

### Storage & Offline (real state + the pattern for `P5-1` when it's built)
No IndexedDB yet — everything real today is `localStorage`. See §7 for
the actual key inventory. `P5-1` (Service Worker/offline mode) is
**genuinely not started** — confirmed directly, 2026-08-17: no
`registerServiceWorker()` call anywhere in `main.tsx`, no
`serviceWorker.ts`, no Workbox config, no `.github`/build artifact
referencing one. (A review document this same session described
`main.tsx` as already having automatic SW registration causing a real
production 404 problem — that doesn't match the current source; either
it describes a hypothetical future state or a version not yet uploaded
here. Flagged rather than assumed either way — don't treat that
production-bug claim as confirmed.)

**Recommended design for whenever `P5-1` is actually picked up — refined
this session into something more specific than a generic dev/prod
split, still entirely proposed, not built:**

- **Opt-in, not automatic.** No Service Worker registers on a normal
  visit. A real Settings section — "Offline Reading," fitting the
  existing self-registering Settings pattern (`P0-0`'s registry, same
  one `P0-8`/`P0-7`/`P0-9` already use) — defaults OFF for every new
  visitor. Registration only happens when the user explicitly turns it
  on. This is a meaningfully better design than a blanket dev-off/
  prod-on split: it avoids the whole class of "SW intercepted a request
  unexpectedly" problem in production too, not just in development,
  and nobody pays the storage cost who didn't ask for the feature.
- **`serviceWorker.ts` becomes an on-demand API** (`enableOfflineReading()`
  / `disableOfflineReading()` / `isOfflineReadingEnabled()`), not a
  side effect of app boot. State lives in `localStorage`
  (`offlineReadingEnabled`), absent = off, matching this project's
  existing convention of treating a missing key as the safe default.
- **Storage grows from what's actually read, not a bulk pre-cache.**
  Enabling the setting caches the app shell only; each note/quiz page
  gets cached the moment the user actually visits it (Stale-While-
  Revalidate on `/data/`), not all-at-once on enable. Nobody is forced
  to download the whole site to get offline access to the 3 notes they
  actually study.
- **Turning it off unregisters the worker and clears the offline
  cache** — a real "Clear offline data" action, separate from clearing
  all browser storage, so disabling doesn't silently leave stale
  content behind.
- **Different cache strategies for different content**, not one
  blanket policy: Cache-First for the app shell (JS/CSS/fonts/logos/
  icons); Stale-While-Revalidate for `/data/` (notes/quiz JSON —
  avoids serving stale educational content while still working offline
  once cached).
- **User data (progress, favorites, highlights) never goes in Cache
  Storage** — stays in `localStorage`/`IndexedDB`, a separate browser
  mechanism from the Service Worker's request/response cache.
- **Test via `npm run build && npm run preview`**, not the dev server.

---

## 7. Data & Content Spec

### Real JSON schemas (confirmed against source, not inferred)

**`subjects.json`** (`data/config/subjects.json`) — the subject
registry `T3-7a` introduced:
```json
{
  "aws": { "label": "AWS", "icon": "☁️", "folderPrefix": "aws",
           "titleSuffix": "AWS Notes", "hasAnimation": false,
           "features": ["reflection", "handsOn"] },
  "dsa": { "label": "DSA", "icon": "🧩", "folderPrefix": "dsa",
           "titleSuffix": "DSA Notes", "hasAnimation": true,
           "features": ["animation", "visualMcq", "contest"] }
}
```

**Body-prose blocks** (`json/body-prose.json` per note) — every block,
every type, every nesting level now carries a real `blockId`:
```json
{ "type": "paragraph", "blockId": "block-4", "runs": [...] }
{ "type": "collapsible", "blockId": "block-2", "level": 2,
  "id": "vpc-basics", "children": [...] }
```
`blockId` is positional (document order), not content-hashed — stable
across a same-content regeneration, but renumbers after an insert/
delete/reorder. This is a deliberate tradeoff, not an oversight; React's
highlight-anchoring code already treats an unresolvable `blockId` as
"orphaned" gracefully.

**MCQ options** (`json/mcq.json`, and standalone `quiz.json`) — the
real per-option shape from `[mcq]`-block authoring:
```json
{ "id": "A", "text": "...", "isCorrect": true,
  "explanation": { "why": "..." } }
```
Wrong-option explanations can be authored two ways: a shared `w:` field
(one explanation for every wrong option) or per-letter `wA:`/`wB:`/
`wC:`/`wD:` overrides (wins over `w:` for that specific letter) — both
real, both tested, `wA`-style is now the preferred format for new
content. **Real, unresolved limitation:** `multiSelect` is permanently
unreachable from `[mcq]`-block authoring (hardcoded `false`); no
`ms:` field exists. The richer 13-field explanation shape (`readMore`,
`keywords`, etc.) only ever exists on hand-authored standalone
`quiz.json` files — this parser never produces it, and an earlier
version of this project's own ticket text incorrectly implied it did.

**`dashboard-cards.json`** — generated, not hand-authored
(`generate_dashboard_cards.py`), one `type:"subject"` card per
`subjects.json` entry plus standalone cards (`quiz`, `calendar`),
clean-path URLs (`/notes-index/aws`, not the old query-string shape).

### `localStorage` key reference (real, comprehensive, as of 2026-08-17)

Centralized key builders live in `src/lib/storageKeys.ts` — most keys
go through it; a few older/simpler ones are still written as literal
strings directly where used, noted below.

| Key | Shape | Scope | Notes |
|---|---|---|---|
| `theme` | `"light"\|"dark"\|"comfort"` | Global | |
| `notesFavorites` | array of folder ids | Global | Now via `useNotesFavorites.ts`, with real cross-tab `storage`-event sync |
| `galleryFavorites` | array of image filenames | Global | |
| `quizFavorites` | array of quiz ids | Global | |
| `galleryView` | `"grid"\|"list"` | Global | |
| `examMode` | `"none"\|"highlight"\|"test"` | Global | Alt+E cycles this |
| `liteMode` | `"true"\|"false"` (string) | Global | |
| `studyTimerVisible` | `"true"\|"false"` (string) | Global | |
| `revisionMode` | boolean-ish | Global | |
| `a11yPrefs` | `{highContrast, reducedMotion, dyslexiaFont}` | Global | |
| `appearancePrefs` | accent/radius/density/animation | Global | |
| `readingPreferences` | font/line-height/width/family | Global | |
| `userProfile` | name/avatar/greeting | Global | |
| `dailyGoal` | `{type, target, progress, date}` | Global | 3 types: time/chapters/mcqs |
| `dashboardCardOrder` | array of card ids | Global | Corrupt/non-array value falls back to default order, confirmed graceful |
| `quickActions` | ordered array of action ids | Global | |
| `unlockedAchievements` | `{id, unlockedAt}[]` | Global | Unlock-once guard confirmed real |
| `motivationalMessageState` | freshDeck shuffle state | Global | |
| `notificationsInbox` | in-app notification list | Global | `B-2`'s in-app-only mechanism |
| `readingProgress-folder-<folder>` | `{v:1, percent, timestamp, scrollY?}` | Per-note | `scrollY` added for `P0-3`, optional not a version bump |
| `readingProgress-quiz-<quizId>` | same shape | Per-quiz | Distinct prefix, deliberately not colliding with `quiz_progress_` |
| `bookmarks-<pageId>` | section-id list | Per-page | Older literal-string pattern, not yet migrated into `storageKeys.ts` |
| `highlights-<pageId>` | highlight records incl. `blockId` | Per-page | Real as of the 2026-08-16 fix |
| `stickyNotes-<pageId>` | sticky note content | Per-page | |
| `<pageId>-checklist-state` | `{v:1, data}` | Per-note | |
| `<pageId>-interview-state` / `-interview-viewed` | `{v:1, ...}` | Per-note | |
| `notes_mcq_progress_<folder>` | MCQ attempt state | Per-note | Deliberately separate from `quiz_progress_` — "Open as Quiz" starts a fresh attempt by design |
| `quiz_progress_<quizId>` | full quiz state | Per-quiz | |
| `quiz_history_<quizId>` | attempt history | Per-quiz | |
| `visualMcqProgress-<folder>` | DSA visual-MCQ state | Per-note | |

**For new code:** wrap every read/write in `try/catch` (fails silently —
correct for private-browsing/quota errors); version-envelope JSON-shaped
values (`{v:1, ...}`) where the shape might need to evolve. This
convention carries forward unchanged from the vanilla era.

**Real, still-open question, not yet resolved:** whether Gallery's
favorites (`galleryFavorites`) should logically unify with Notes/Quiz
favorites, or stay a deliberately separate concept — flagged on `T4-1`,
tracked as `DX-2` (storage source-of-truth table).

---

## 8. Legacy Note (vanilla architecture, condensed)

The original site (`src/` → `dist/`, vanilla HTML/CSS/ES6, no
framework, `tools/minify.js` build, GitHub Pages via
`.github/workflows/deploy.yml`) is **frozen as of 2026-08-13** — no
further changes go into it, with exactly one narrow exception exercised
since (a `T1-4` CSS fix, required to unblock `T6-1`). It's slated for
full deletion via `T6-1`, currently held until Track R's
vanilla-independent design work settles, not because anything technical
still blocks it.

What's worth remembering about it while it still exists on disk:
- Query-string routing (`notes-index.html?subject=aws`), a
  `site-config.js` central bootloader, and a fixed per-page script-load
  boot order — all superseded by React Router + Context in the current
  app, not ported forward as patterns.
- The Python content pipeline is the one part that carried forward
  essentially unchanged in spirit (markdown → generated HTML/JSON),
  even though its internals (`subjects.json` registry, `blockId`
  stamping) have evolved since.
- A handful of vanilla-only code-quality issues (duplicated
  `.theme-toggle` CSS, inconsistent bookmark/favorite terminology
  between quiz and notes/gallery, 15 duplicated classnames between
  `notes-index.css`/`gallery.css`) are real but moot — they'll be
  deleted with the rest of vanilla via `T6-1`, not worth fixing in a
  frozen tree.

Full historical detail, if ever needed, lives in this document's own
prior versions and in `log-analysis.md`/`audit-findings.md` — not
reproduced here.

---

## 9. Open Items

Current, real, and actionable — resolved items removed rather than
marked done-and-kept (that history lives in `CHANGELOG.md`).

- **`R2-1` (persistent sidebar nav) reopened and reversed, 2026-08-19.**
  Real, dated decision — supersedes its own earlier 2026-08-13 closure
  ("Option A: breadcrumb-only"), not a mistake to correct back. Real
  design work (web light/dark/tablet mockups, plus a mobile-app
  bottom-tab pattern) made the case; the call was made directly: adopt
  the sidebar, remove `Breadcrumb` and back buttons entirely. Tracked
  as `NAV-1`. `Breadcrumb` is currently real and rendered on 6 pages
  (`Note`/`NotesIndex`/`QuizIndex`/`Gallery`/`SearchMyNotes`/`Slides`)
  — all 6 need it removed once the sidebar ships, not left in
  alongside it.
- **Calendar's real ticket id is `R3-1c`**, discovered in
  `Calendar.tsx`'s own header comment, referencing a
  `sprint-tickets-R3-1-scoping.md` document not currently held by this
  session — worth requesting if `R3-1a`/`b`/`d` (siblings implied by
  the naming) need auditing the same way `R3-1c` just was. Confirms
  `T-CAL-1`'s open question about matching the Statistics widget's
  calculation: **yes**, `Calendar.tsx` reads `getStudyActivityDates()`
  from the same `lib/studyStats.ts` `P2-1` already built — not a
  separate calculation.
- **One real design question left open on Calendar, by its own
  comment, not guessed at here:** should `P2-2`'s Study Streak also
  surface on the Calendar page (header badge, per-day streak-run
  styling), or stay Dashboard-only as it is today? Needs an explicit
  product decision.
- **`T5-3c-6`** (export highlights to `.txt`) is unblocked by the
  `P1-1` fix but still genuinely not built — its export function is
  still a stub. The smallest, cleanest fully-unblocked piece of work
  left in the highlighting chain.
- **`P4-1`** (JSON backup/import) doesn't exist. Given how much real
  state now lives only in `localStorage` (see §7's key table — it's
  substantial), this is a real product risk, not a nice-to-have,
  worth prioritizing before the storage surface grows further.
- **`DX-2`** (storage source-of-truth table) — the Gallery-favorites
  question above is exactly the kind of ambiguity it exists to
  resolve; not yet done.
- **Track G (Games)** — real proposed design exists for all 10 games
  plus shared infra, zero implementation. Correctly deferred until
  after Track R/`T6-1`, per the source roadmap's own sequencing
  advice.
- **`T0-3`/`B-4b`** — both blocked on the same missing
  `python/.github/workflows/coverage.yml`, itself likely explained by
  the `merged/` repo-consolidation question noted in §6. One root
  cause, not two separate gaps.

---

## 10. Process Note

Day-to-day ticket status, dependency tracking, and manual test cases
live in `sprint-tickets.md`/`sprint-tickets-tracks-PREB.md`. Session
verification history, decisions, and corrections live in
`CHANGELOG.md`. This document stays a stable architecture + scope
reference — refresh it when the *shape* of the project changes (a new
track, a completed migration, a scope decision), not every session.
