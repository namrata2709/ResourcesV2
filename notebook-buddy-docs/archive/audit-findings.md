# Audit Findings — Learning Dashboard

Dedicated log of cross-file consistency findings — duplicated logic,
diverged "same feature, different file" behavior, and features one module
has that a sibling module could inherit. Companion to `PROJECT.md` (current
state) and `log-analysis.md` (session-by-session verification detail).
Each finding is tagged **Bug** (confirmed or likely-visible defect),
**Suggestion** (works fine today, but worth consolidating/aligning), or
**Question** (can't be resolved without more files).

Convention matches `log-analysis.md`: dated batches, most recent first.

---

## 2026-07-06 (batch 1 — first pass, 20 HTML/CSS/JSON files)

### 1. Shared listing-page CSS duplicated between `notes-index.css` and `gallery.css` — Suggestion + Bug

15 classnames are independently redefined in both files rather than
living in one shared stylesheet: `.chip-row`, `.selected-chip`,
`.chip-remove`, `.quick-filter-btn`, `.quick-filter-icon`,
`.quick-filters-bar`, `.quick-filters-label`, `.quick-filters-section`,
`.notes-count-label`, `.notes-toolbar`, `.view-mode-toggle`,
`.view-mode-btn`, `.filter-controls`, `.shuffle-again-btn`, `.type-badge`.

**Bug — `.selected-chip` background color diverges:**
```
notes-index.css:  background: var(--primary, #ff9900);
gallery.css:      background: var(--accent, #ff9900);
```
`--primary` and `--accent` are two genuinely different theme colors (per
`styles.css`, e.g. light theme `--primary:#3b82f6` vs. `--accent:#0056b3`).
A selected filter chip will render a visibly different color depending on
whether the user is on the notes listing page or the gallery page. Fix:
pick one variable (recommend `--accent`, since chips read as a filter
UI accent rather than the primary brand color) and align both files.

**Bug risk — `.type-badge` means two unrelated things under one name:**
- `notes-index.css`: inline text styling next to a card's type label
  (`font-size: 0.8em; opacity: 0.8;`).
- `gallery.css`: an absolutely-positioned overlay badge pinned to an image
  thumbnail's corner (`position: absolute; top: 8px; left: 8px; background: rgba(0,0,0,.55); color:#fff; ...`).

Harmless today because the two files never load on the same page — but
it's a landmine for any future shared component, or if a card template
ever gets reused across both listing types. Recommend renaming one (e.g.
`.gallery-type-badge` for the image-overlay version) so the name always
means the same thing.

**Minor — `.chip-row` margin-top:** `6px` in `notes-index.css`, `4px` in
`gallery.css`. Cosmetic only.

**Recommended fix:** extract the 15 shared, non-diverged rules into a new
`css/notes/listing-shared.css` (or fold into `styles.css` if they're
truly global), loaded by both `notes-index.html` and `gallery.html`, then
delete the duplicated copies. Resolve the two diverged rules first so the
merge doesn't silently pick one page's behavior for both.

---

### 2. `.theme-toggle` duplicated and diverged between `styles.css` and `notes.css` — Bug

Both files independently define `.theme-toggle` and the three
`.theme-icon::before` emoji rules (☀️ light / 🌙 dark / 👁️ comfort — byte
identical in both). The button styling itself has drifted:

| Property | `styles.css` | `notes.css` |
|---|---|---|
| `background` | `var(--bg-card)` | `var(--bg-secondary)` |
| `box-shadow` | `0 4px 12px var(--shadow)` | `0 2px 8px var(--shadow)` |
| `box-shadow` (hover) | `0 6px 20px var(--shadow)` | `0 4px 12px var(--shadow)` |

Since `notes.css` only loads on individual note pages and `styles.css`
loads everywhere, the theme toggle button is literally a different
background/depth on a note page vs. every other page (dashboard, gallery,
quiz, listings). Recommend deleting the `notes.css` copy entirely and
letting it inherit from `styles.css`, which is already loaded on every
page including notes. **Correction, 2026-07-08:** an earlier version of
this finding claimed `notes.css` was "documented as currently minified in
the repo" as a reason to defer this fix — checked directly against the
actual uploaded `notes.css` and that claim was wrong; the file is normal,
readable, fully-commented CSS, not minified. That claim didn't come from
any real source (not `PROJECT.md`, not `log-analysis.md`, not the file
itself) — it was an error introduced while writing this finding. No
reason to defer this fix on file-format grounds; it can be done directly.

---

### 3. Bookmarks (quiz) vs. Favorites (notes/gallery) — same feature, two different patterns — Question

`notes.css`/`gallery.css` use "Favorite" naming, a heart glyph (♡ empty /
♥ filled), and an accent-color-on-active state (`.note-favorite-btn`,
`.image-favorite-btn`, both fed by the `notes-favorite.js` module per
prior session history). `quiz.css` still uses "Bookmark" naming
(`.bookmark-btn`), a different icon convention, an amber/`--warning`-color
scheme, and an opacity-fade-in-on-hover-or-bookmarked interaction instead
of a persistent heart glyph.

**Open question, not a confirmed bug:** is "bookmark a question" meant to
be conceptually distinct from "favorite a note/image" (e.g. a bookmark is
a transient in-quiz marker, a favorite is a durable saved-item list), or
is this simply the pre-rename pattern that never got updated when
Favorites shipped elsewhere? Can't be resolved from CSS alone —
`quiz-toolbar.js` (which the `PROJECT.md` file table says owns bookmarks)
would need to be reviewed to see whether it shares any code path with
`notes-favorite.js` or is fully independent.

---

### 4. Inconsistent static `#themeToggle` markup across pages — Suggestion

`index.html`, `404.html`, and `gallery.html` all hardcode
`<button id="themeToggle" class="theme-toggle" aria-label="Toggle theme"><span class="theme-icon"></span></button>`
directly in their markup. `notes-index.html`, `quiz.html`, and
`quiz-index.html` have no such markup at all and rely entirely on
`theme.js`'s self-injection (documented behavior: "self-injects
`#themeToggle` if not already in DOM"). Both paths produce a working
button, so this isn't a bug — but the split doesn't track any obvious
page-type distinction (it's not "listing pages omit it" or "detail pages
include it" — `gallery.html` is a listing-style page and has it,
`notes-index.html` is also a listing page and doesn't). Recommend picking
one pattern (self-injection everywhere is simpler to maintain — one fewer
place to keep markup in sync) and removing the hardcoded copies.

---

### 5. Three divergent `.search-bar`/search-input implementations — Suggestion

`styles.css` defines a global `.search-bar input` (12px border-radius,
1rem/1.5rem padding) that `notes-index.html` and `quiz.html`/
`quiz-index.html` all use as-is via `id="searchInput"`. `gallery.html`
instead gives its input `class="search-box" id="searchBox"` — a unique
class not shared with any sibling page — and `gallery.css` both overrides
`.search-bar`'s margin and defines its own `.search-box` rule (8px
border-radius, different padding). Functionally fine in isolation, but
it means the "search this list" input looks and is coded slightly
differently on gallery vs. every other listing page for no stated reason.
Recommend gallery reuse the shared `#searchInput`/`.search-bar input`
pattern unless there's a deliberate visual reason for gallery's search box
to differ.

---

### 6. Print action surfaced two different ways: standalone FAB (quiz) vs. FAB-menu item (notes) — Suggestion

`quiz.html` hardcodes a dedicated floating `.print-button` (🖨️, fixed
bottom-right, its own always-visible circle button). Note pages instead
surface print as one entry inside `notes-fab.js`'s top-right tools menu,
alongside search/bookmarks/export/timer — there's no equivalent
standalone floating print button on note pages. Not a bug (quiz's action
set is simpler, a single dedicated button may be the right call there),
but flagged per the audit brief's "feature one module has that another
could take" category — worth a deliberate decision on whether note pages
would benefit from print's own always-visible button too, or whether quiz
should fold print into a toolbar menu as it gains more actions.

---

## Still open / needs more files to resolve

- Whether `.selected-chip`/`.type-badge` divergences (Finding 1) produce a
  visible runtime difference depends on `notes-index.js`/`gallery.js`,
  neither uploaded this session.
- Whether the Bookmark/Favorite split (Finding 3) is intentional depends
  on `quiz-toolbar.js`, not uploaded this session.
- Search *logic* (ranking, fuzzy matching, filter combination order) not
  yet compared — this batch only covered HTML/CSS. `notes-index.js` uses
  FlexSearch + mark.js per `notes-index.html`'s script tags; `gallery.js`
  and `quiz-index.js`'s search implementations aren't confirmed to use the
  same approach. Needs those three JS files to compare directly.
- Accessibility feature parity (skip links, ARIA live regions) — see
  `icon-inventory.md`'s notes section; `notes.css` defines a fully-styled
  `.skip-link`/`.aria-live-region` pair that has no equivalent definition
  in `gallery.css`, `quiz.css`, or `styles.css`, meaning skip-link/live-
  region support may currently be note-pages-only rather than site-wide.
  Needs `notes-accessibility.js` (documented as the module that owns this)
  to confirm what it actually injects and on which pages.

---

## 2026-07-06 (batch 2 — JS files: quiz engine/toolbar, shared bootloader chain, dashboard, index JSONs)

### Resolved from batch 1

**Finding 3 (Bookmarks vs. Favorites) — resolved, not a bug.** With
`quiz-engine.js`/`quiz-toolbar.js` now in hand: the quiz "bookmark" (🔖) is
a distinct, fully-realized feature — a per-question marker with its own
toolbar filter button, empty-state message, and `_toggleBookmark()`
logic — clearly intentional design, not a stale pre-rename leftover.
It sits alongside a *second*, separate per-question marker: a flag (🚩
confusing / ⛳ incorrect, cycled via `_cycleFlag()`). Neither shares code
or naming with `notes-favorite.js`'s heart-icon Favorites. Conclusion:
quiz's "bookmark a question mid-attempt" and notes/gallery's "favorite a
note/image for later" are two conceptually different features that
happen to sound similar in English — no rename or consolidation needed.
Downgraded from Question to **Closed, working as intended.**

**Finding 4 (inconsistent static `#themeToggle` markup) — resolved,
intentional legacy-compat, not an accidental inconsistency.** `theme.js`'s
own header comment states it directly: *"Pages that hardcode #themeToggle
(legacy) keep working — injection is skipped."* `index.html`/`404.html`/
`gallery.html` are the pre-`theme.js` pages that still carry the old
hardcoded markup; `notes-index.html`/`quiz.html`/`quiz-index.html` are
presumably newer or already-cleaned-up pages relying on injection. Still
worth eventually deleting the three hardcoded copies for one less thing to
keep in sync, but it's documented, deliberate compatibility handling, not
an unexplained split. Downgraded from Suggestion to **Suggestion (cleanup
opportunity), no longer a mystery.**

### New findings

#### 8. Search logic confirmed to differ sharply between listing pages — Bug/Suggestion (confirmed)

`quiz-index.js`'s `filterQuizzes()` is a plain case-lowered
`.includes()` substring match against `title`/`topic` — no ranking, no
fuzzy matching, no highlighting. This is a real, confirmed divergence from
`notes-index.html`, which loads FlexSearch + mark.js specifically for
weighted/fuzzy ranked search with match highlighting (per its own `<script>`
tags and the project's history of "began a FlexSearch-based search
overhaul"). `gallery.html` also does not load FlexSearch/mark.js, so its
search (in `gallery.js`, not yet uploaded) is very likely the same plain
substring style as quiz's, not notes-index's ranked approach — to be
confirmed once `gallery.js` is available. Net effect: searching "aws" on
the notes listing ranks/highlights results; the identical search box on
the quiz listing (and likely gallery) does a dumb substring filter with
no highlighting. This is exactly the kind of "search logic differs
between files" case flagged as a priority at the start of this audit.
**Recommend:** either bring quiz/gallery search up to the same
FlexSearch+mark.js standard, or explicitly document why quiz/gallery
don't need it (e.g. much smaller list size making fuzzy ranking overkill)
so it reads as a deliberate scope decision rather than an oversight.

#### 9. Swipe-gesture detection reimplemented independently in `quiz-toolbar.js` — Suggestion

`quiz-toolbar.js._initSwipe()` is a from-scratch `touchstart`/`touchend`
delta-based swipe detector for quiz question navigation. `PROJECT.md`
already documents a separate `notes-touch.js` providing "swipe gesture
support for MCQ carousel and interview flashcard deck." Two independent
swipe-detection implementations for conceptually the same gesture
(swipe left/right to advance) is a candidate for a shared
`js/shared/swipe.js` utility — but this can't be confirmed as true
duplication (rather than two implementations with genuinely different
requirements) without `notes-touch.js` in hand. Flagged as a to-check
item once that file is uploaded.

#### 10. Two different "default icon" fallbacks for missing data — Suggestion

`dashboard.js`'s card renderer falls back to `'📘'` when a
`dashboard-cards.json` entry has no `icon` field. `category-icons.json`
(reviewed batch 1) has its own separate `"default": {"icon": "📂", ...}`
entry for the same kind of "no icon configured" case. Two different
default glyphs for the same fallback concept, defined in two different
places (one hardcoded in JS, one in JSON config). Minor, but worth
aligning — or better, having `dashboard.js` read its fallback from a
config value too, so there's one place to change the site's "no icon"
default.

#### 11. `notes-index.json`/`quiz-index.json` use different field names for the same "grouping" concept — Suggestion

`notes-index.json` entries have a `category` field (`"Serverless"`,
`"Containers"`, etc., matching `category-icons.json`'s keys).
`quiz-index.json` entries have a `topic` field (`"Networking"`) serving
the identical filtering/grouping purpose on the quiz listing page. Not a
bug — each JSON only needs to be internally consistent with its own
consuming JS — but it's an avoidable naming mismatch between two schemas
doing the same job, worth a mental note if the two index formats are ever
unified or a shared list-rendering component is built.

#### 12. `recently-viewed.js` documented as intended for `index.html` but not yet wired up — confirmed, not a bug

`recently-viewed.js`'s own header states it's "Currently used by:
404.html. Intended to also be used by index.html / dashboard.js later."
Confirmed directly: `dashboard.js` has no reference to
`window.RecentlyViewed` anywhere. Not a bug — the file's own comment
already flags this as a known future step — but noting it here so it
doesn't get lost; `PROJECT.md`'s Open Items is the more durable home for
this than a one-off note, added there too.

### Not fixed / not in scope this session

All of the above are logged as findings, not code changes — no JS files
were edited this session (would need the actual `notes-index.js`/
`gallery.js`/`notes-touch.js` in hand to safely change the diverged
pieces without guessing at behavior those files own).

---

## Still open / needs more files to resolve (updated)

- Whether `.selected-chip`/`.type-badge` CSS divergences (batch 1,
  Finding 1) produce a visible runtime difference — **resolved, batch 3:
  yes.** `gallery.js` directly renders both classes (`.selected-chip` for
  selected tag chips, `.type-badge` on every image card) — this is a live,
  user-visible bug, not theoretical. See Finding 1 update below.
- Whether `gallery.js`'s search matches quiz's plain-substring style or
  something closer to `notes-index.js`'s FlexSearch approach — **resolved,
  batch 3: confirmed plain substring**, same style as `quiz-index.js`. See
  Finding 8 update below.
- Whether `quiz-toolbar.js`'s swipe detector and `notes-touch.js`'s swipe
  support are true duplicates or genuinely different requirements —
  **resolved, batch 4: confirmed genuine duplication** (same feature,
  two independent implementations with different feature sets). See
  Finding 9 update below.
- Accessibility feature parity — **resolved, batch 3.** See Finding 13
  below: confirmed note-pages-only skip link, and a new finding that three
  separate live-region implementations exist across the site.

All items in this list are now resolved as of batch 4 — see the batch 4
section below for full detail on each.

---

## 2026-07-06 (batch 4 — notes-index.js, notes-touch.js, notes-reader.js, notes-search.js, notes-page-core.js, sitemap.xml)

### Resolved from earlier batches

**Finding 8 (search logic divergence) — fully confirmed.** `notes-index.js`
directly confirms what batches 1–3 inferred: it builds a `FlexSearch.Document`
index once per subject load (`buildSearchIndex()`), with an explicit plain-
substring fallback (`matchesPlainSubstring()`) only used if FlexSearch fails
to load. This is now a fully three-way confirmed divergence: `notes-index.js`
(FlexSearch, ranked) vs. `gallery.js`/`quiz-index.js` (plain substring,
always). Closed — no longer needs further files.

**Finding 9 (swipe-gesture duplication) — fully confirmed, not just
suspected.** With both files now in hand: `notes-touch.js` and
`quiz-toolbar.js`'s `_initSwipe()` are two separately-written
touchstart/touchend delta detectors that happen to share one constant
(50px threshold) by coincidence, not shared code. They diverge in every
other respect — `notes-touch.js` adds live drag visual feedback
(`translateX` during `touchmove`) and haptic feedback (`navigator.vibrate`),
neither of which `quiz-toolbar.js`'s version has; `notes-touch.js` targets
specific button ids per deck type (`#nextBtn`/`#prevBtn` for the MCQ
carousel, `#nextInterviewBtn`/`#prevInterviewBtn` for flashcards) while
`quiz-toolbar.js` finds the nearest visible question card by bounding-box
position and looks up its array index. Genuinely the same feature
(swipe left/right to advance), independently built twice with different
polish levels. Recommend extracting a shared `js/shared/swipe.js` that
takes a callback + optional haptics/visual-feedback flags, then both
`notes-touch.js` and `quiz-toolbar.js` become thin callers.

**Finding 1 (`.selected-chip`/`.type-badge`) — fully confirmed via
`notes-index.js` too.** It renders `.selected-chip` (lines rendering
selected category/tag chips) and `.type-badge` (small per-file-type icon
span, e.g. 📄/🧪/🖥️, next to a note's title) — confirming the CSS
divergence spans all three files that use these classnames (`notes-index.css`
`--primary`, `gallery.css` `--accent`; and `.type-badge` meaning "tiny inline
icon" in `notes-index.css` vs. "corner overlay label" in `gallery.css`).
No longer theoretical in any sense — three live call sites, two
incompatible styling contracts.

### New findings

#### 18. Confirmed: the Python build pipeline itself writes two different domains into the same `sitemap.xml` — Bug (confirmed by code, no live-site check needed for this part)

Batch 4 flagged a domain mismatch between `sitemap.xml` and
`site-config.js`/`index.html` as unresolvable without checking the live
URL. This batch's Python files resolve the *cause*, and it's worse than a
stale artifact — **the generator scripts themselves disagree with each
other:**

- `generate_notes.py` (`SITE_BASE`, both subjects' `base_url`) and
  `generate_notes_index.py` (`BASE_URL`) all hardcode
  `https://namrata2709.github.io/Resources/` — **no** `V2`.
- `generate_sitemap.py` and `generate_quiz_index.py` both hardcode
  `https://namrata2709.github.io/ResourcesV2` — **with** `V2`. (Confirmed
  further by `test_generate_sitemap.py`'s own fixtures, which seed and
  assert against `ResourcesV2` URLs specifically.)

Since `dashboard.py`'s `cmd_all` runs all of these in one pipeline
(`notes` → `quiz` → `sitemap`), a single `dashboard all` run produces a
`sitemap.xml` containing **both** domains simultaneously — note pages
upserted by `generate_notes_index.py` under `/Resources/data/notes/...`,
then quiz and main-page URLs added by `generate_quiz_index.py`/
`generate_sitemap.py` under `/ResourcesV2/...`. Worse:
`generate_sitemap.py` *also* independently re-scans `NOTES_DIR` itself
(its own "Notes — scan every valid folder's actual content files"
section) and touches note URLs using **its own** `BASE_URL`
(`ResourcesV2`) — a different `loc` string than what
`generate_notes_index.py` already added for the same file
(`/Resources/...`). Because `add_url`'s upsert logic matches on exact
`loc` (trailing-slash-normalized, per `test_sitemap_utils.py`, but not
domain-normalized), these do **not** dedupe against each other — the
pipeline would produce two separate sitemap entries for the same physical
note page, one per domain, every time `dashboard all` or `dashboard
sitemap` runs after `dashboard notes`.

This is no longer a "which one is live" question to defer — it's a
confirmed, reproducible bug in the generator pipeline regardless of which
domain turns out to be the real one: **two scripts that write to the same
file disagree on a hardcoded constant that should be centralized.**
Recommend moving `BASE_URL`/`SITE_BASE` into one shared constant (e.g.
`utils/site_config.py`, mirroring how `js/shared/site-config.js` centralizes
this exact same value for the JS side) that all four scripts import,
rather than four independent hardcoded string literals.

**Update, final batch (2026-07-06) — domain question now well-resolved,
not just internally inconsistent.** `README.md` states the live URL
explicitly: *"🔗 Live site: https://namrata2709.github.io/ResourcesV2/"*.
Full evidence tally across every file reviewed this entire audit:

| Uses `ResourcesV2` | Uses `Resources` (no `V2`) |
|---|---|
| `README.md` | `PROJECT.md`'s own §1 header (now corrected) |
| `index.html` (canonical, OG, JSON-LD) | `LICENSE.md`'s GitHub issues link (`github.com/.../Resources/issues` — a repo URL, not a Pages URL, so not directly comparable, but the same old name) |
| `site-config.js`'s `basePath` | `sitemap.xml` (stale artifact, already tracked separately) |
| `generate_sitemap.py` | `generate_notes.py` |
| `generate_quiz_index.py` | `generate_notes_index.py` |
| `test_generate_sitemap.py`'s fixtures | |

`ResourcesV2` wins 6 sources to 3, and critically, the three "no `V2`"
holdouts are exactly the kind of thing that goes stale after a rename —
a hardcoded string in two scripts that don't run often, a doc header, and
a contact link — while the `ResourcesV2` side includes the two files that
would break most visibly and immediately if wrong (`index.html`'s own
canonical URL and `site-config.js`'s `basePath`, which drives every fetch
site-wide). **Most likely explanation:** the GitHub repo was renamed from
`Resources` to `ResourcesV2` at some point, and `index.html`/
`site-config.js`/`generate_sitemap.py`/`generate_quiz_index.py` were
updated at or after that rename, while `generate_notes.py`/
`generate_notes_index.py`, `sitemap.xml`, this project's own header, and
one contact link were simply missed. (GitHub's automatic redirect from an
old repo name to a new one may explain why old links kept working long
enough to go unnoticed.)

Treating this as resolved: `PROJECT.md`'s header has been corrected to
`ResourcesV2` this batch. Still recommend fixing `generate_notes.py`/
`generate_notes_index.py`'s hardcoded `BASE_URL`/`SITE_BASE` to match
(via the shared-constant approach above) and updating `LICENSE.md`'s
issues link, next time either file is touched for other reasons — neither
is urgent enough to justify a standalone fix-only commit, but both are
now confidently identified as the stale side rather than an open
question.

#### 19. Fourth confirmed distinct "bookmark-ish" feature: `notes-reader.js`'s per-section ⭐/☆ bookmarks

`notes-reader.js` has its own `initBookmarkSystem()` — adds a ⭐/☆
star-toggle button to each collapsible section header on a note page,
storing bookmarked section ids under a `bookmarks-<pageId>` `localStorage`
key. This is what `notes-fab.js`'s "📑 Bookmarks" tools-menu item
(batch 3, Finding 17) actually opens — a panel of a note's own bookmarked
sections, for jumping around one long page. Updates Finding 17: the
"three-way" bookmark/favorite naming overlap is actually **four** distinct
icons for four distinct behaviors once fully traced:

| Feature | Icon | Storage | Scope |
|---|---|---|---|
| Favorites (notes) | ♡/♥ | `notesFavorites` | Whole notes |
| Favorites (gallery) | ♡/♥ | `galleryFavorites` | Whole images |
| Bookmarks (quiz) | 🔖 | embedded in `quiz_progress_<file>` | Individual questions, one attempt |
| Bookmarks (notes, in-page) | ⭐/☆ | `bookmarks-<pageId>` | Sections within one note |

All four are legitimate, working, independently-justified features — no
bug, no rename needed — but the audit's original icon-collision concern
(batch 3, Finding 17) is now fully resolved with concrete evidence rather
than partial inference. Updated in `icon-inventory.md` too.

#### 20. `notes-search.js` and `notes-index.js` each build their own independent FlexSearch index — Suggestion (minor)

`notes-index.js` builds one `FlexSearch.Document` per subject load,
indexing whole notes (for the notes *listing* page). `notes-search.js`
builds a separate `FlexSearch.Document`, indexing one document per
`.collapsible-section` (for *in-page* search on an individual note).
These index genuinely different granularities (a whole note vs. a
section within one note) for genuinely different UIs (a listing grid vs.
an in-page overlay), so this is a much weaker duplication claim than
Findings 8/9 — flagging only as a "worth a glance" item, not recommending
any consolidation work, since the two use cases may not share enough
structure to make a shared abstraction worthwhile.

#### 21. Stale, already-inaccurate Open Item found in `PROJECT.md` — corrected

`PROJECT.md`'s existing Open Items list contained: *"`generate_quiz_list.py`/`generate_sitemap.py`'s
docstrings both say 'Run from the repo root'..."* — checked directly
against the real files this batch: the file is named
`generate_quiz_index.py`, not `generate_quiz_list.py` (likely a rename
that happened without updating this note), and its actual current
docstring says *"Run from `python/`: `python generate_quiz_index.py
[--rebuild]`"* — not "run from the repo root" at all.
`generate_sitemap.py`'s docstring says the same "Run from `python/`"
thing. Whatever prompted this Open Item appears to have already been
fixed (docstrings corrected, file renamed) without the note being
updated or removed. **Corrected in `PROJECT.md`** — old item removed,
this note left in its place for the record.

#### 22. Test suite and `dashboard.py` CLI entirely undocumented in `PROJECT.md`

This batch uploaded a real, substantial pytest suite (`conftest.py`,
`test_audit_content.py`, `test_dashboard.py`,
`test_generate_notes_index.py`, `test_generate_notes_index_validation.py`,
`test_generate_sitemap.py`, `test_sitemap_utils.py`) plus `dashboard.py` —
a single CLI entry point wrapping every generator script
(`notes`/`new-notes`/`quiz`/`sitemap`/`all`/`serve`/`test`/`build`/`audit`
subcommands) — and `audit_content.py`, a cross-repo content validator
(missing images, broken links, duplicate topics, invalid JSON, unused
files, build statistics). None of these appear anywhere in `PROJECT.md`
today; the doc's Python section only covers the individual generator
scripts (`generate_notes.py`, `generate_notes_index.py`, etc.), not the
CLI that wraps them or the tests that cover them. Given how much real
behavior lives in `dashboard.py` specifically (e.g. the documented fix
where `dashboard notes` used to skip the markdown→HTML conversion step
entirely) this is a meaningful gap, not just a missing row — added a new
`## Python CLI & Testing` subsection to `PROJECT.md` this batch covering
all of it at a summary level.

### Not fixed / not in scope this session

All findings logged, not code-edited, consistent with every prior batch.
`PROJECT.md`'s stale Open Item (Finding 21) was corrected as a
documentation fix, not a code change.

---

## 2026-07-06 (final batch — repo-root config files: package.json, package-lock.json, requirements.txt, README.md, LICENSE.md, deploy.yml, dashboard.bat, minify.js, tasks.json, .gitignore, .gitattributes)

### 23. `pytest` is listed as an npm dependency in `package.json`/`package-lock.json` — Bug (minor, harmless but wasteful)

`package.json`'s `dependencies` includes `"pytest": "^1.0.0"`, and
`package-lock.json` confirms it actually resolves to a real (if
unrelated) npm package at `registry.npmjs.org/pytest` — not Python's
pytest, which is correctly listed separately in `requirements.txt`
(`pytest==9.1.1`) where it belongs. This npm `pytest` package is almost
certainly an accidental addition — likely muscle-memory from typing a
familiar package name, or a stray `npm install pytest` run at some point
— since a Python testing framework has no legitimate reason to be an npm
dependency of a project with zero JS test files. Harmless in practice
(nothing in `minify.js` or any `.js` file imports it), but it makes every
`npm ci` in `deploy.yml`'s CI run download and install a completely
unused package, and it's confusing for anyone reading `package.json` and
wondering why a Python tool is listed there. Recommend
`npm uninstall pytest` (which will clean up both `package.json` and
`package-lock.json` in one step) next time `package.json` is touched for
any other reason.

### 24. Domain question fully resolved this batch — see updated Finding 18 above

`README.md`'s explicit "Live site: .../ResourcesV2/" line was the missing
piece needed to move Finding 18 from "internally inconsistent, live URL
unconfirmed" to "very likely resolved, with a plausible explanation for
how it happened (a repo rename that some files/docs missed)." Full
evidence tally and recommendation folded into Finding 18 directly rather
than kept as a separate entry, since it's the same underlying question.

### Not fixed / not in scope this session

Findings logged only. `PROJECT.md`'s live-site header (Finding 18/24) was
corrected as a documentation fix. No code changes made to `package.json`
or any generator script — the `pytest` npm cleanup and the
`generate_notes.py`/`generate_notes_index.py` domain-constant fix are
both flagged as "next time that file is touched," not urgent enough to
justify a standalone commit on their own.

---

## 2026-07-06 (batch 8 — consistency solutions pass + `slides.html` gap analysis + rebrand/tech-stack reconciliation)

Requested this batch: concrete DRY/KISS/SOLID solutions for every finding
above (not just problem statements), a `localStorage` reference for new
developers, a gap analysis for `slides.html`, and reconciliation of three
pasted planning documents (roadmap/decisions log, detailed sprint plan,
rebrand plan, backlog) plus a proposed React/Tailwind/CSS-Modules stack
decision. Full write-up of all of this lives in a new companion file,
**`consistency-and-tech-roadmap.md`** — this entry summarizes what's in
it; see that file for full reasoning.

### 25–31. `slides.html` missing back button/breadcrumb, favorite, footer, and accessibility — Bug (traced to one root cause)

`slides.js`'s own header comment documents the cause directly:
`slides.html` sets `data-no-nav="true"`, which skips `navigation.js`
entirely — "since a full-viewport deck has no breadcrumb/page-header
container for it to attach to." That one deliberate call cascades into
several accidental gaps, since `footer.js` needs `#footerRoot`,
`notes-favorite.js` needs `.page-header`/`.note-header`/`.note-container`,
and `notes-accessibility.js` isn't even in `slides.html`'s script chain
in the first place (it uses its own bootloader, not
`notes-page-core.js`'s shared 11-script chain per `dashboard.py`'s
docstring) — none of these three actually require navigation to be
present, they just never got added independently. Filter/search
correctly don't apply (slides is a single document, not a list); print
is a "download as PDF" concept better modeled on `quiz-export.js`'s
approach than `notes-print.js`'s multi-format picker, if wanted at all.
Full gap table with per-item root cause and fix in
`consistency-and-tech-roadmap.md` Part 3.

### DRY/KISS/SOLID solutions for every open finding

Every "Bug"/"Suggestion" finding from batches 1–7 now has a concrete,
actionable fix mapped to it — not just a diagnosis — in
`consistency-and-tech-roadmap.md` Part 1. Headline pattern across nearly
all of them: **a value or behavior that should live in one shared file
currently lives in two-to-four copies that have quietly drifted** — the
fix is almost always "extract a shared module" (`css/shared/chips.css`,
`js/shared/swipe.js`, `js/shared/aria-live.js`, a search-adapter
interface, `python/utils/site_config.py`), never "add configuration."
One explicit non-fix: Findings 3 (bookmarks/favorites/in-page-bookmarks)
and 6/15 (print/search chrome density differences) are confirmed
legitimate differences, not violations — documented as "keep as-is,
write down the rule" rather than merged.

### `localStorage` keys reference

Full table of every key written anywhere in the codebase — owner file,
shape, scope — added to `PROJECT.md` §6.5 directly (quick-reference
version) with the full naming-convention analysis in
`consistency-and-tech-roadmap.md` Part 2. One inconsistency surfaced:
two different key-naming conventions coexist
(`<pageId>-<feature>` vs. `<feature>-<pageId>`) — flagged as a "pick one
next time a key is touched," not a migration to do now, since existing
users' browsers already hold the old key shapes.

### Rebrand (Notebook Buddy) reconciled against current files

Cross-checked the rebrand plan's Phase 1–3 scope and the four brand-kit
mockups against every file reviewed this audit. Name, font, and color
tokens are straightforward — the color change in particular is a
values-only edit to CSS variables the theming system already uses. But
the mockups also show a persistent sidebar nav, notifications bell, user
menu, Calendar page, and Study Mode page that **don't exist anywhere in
this codebase** — flagged clearly as net-new feature work rather than
rebrand work, so scope doesn't silently expand. Full detail in
`consistency-and-tech-roadmap.md` Part 4.

### Old planning docs reconciled

Confirmed the sprint-plan/roadmap docs' own "✅ CLOSED" claims (Sprint A,
CLI wrapper, `slides.html` generation, search rewrite, `audit_content.py`)
against direct file review — genuinely matches. Found two things the
planning docs didn't know yet: (1) the search-rewrite entry's own flagged
gap ("element ids assumed, not confirmed") is now closable since
`notes-search.js` was reviewed directly in batch 5; (2) Sprint B's
"✅ CLOSED" status for `slides.html` covers the *generation pipeline*
only — this audit's direct read of `slides.js` shows the *page* itself
is still missing chrome (see Findings 25–31), worth reopening that scope
specifically. Full reconciliation in
`consistency-and-tech-roadmap.md` Part 5.

### Tech-stack decision (React + TS + Vite + Tailwind + CSS Modules)

Confirmed this can start immediately, fully in parallel with current
vanilla work — a new `web/` folder is invisible to `tools/minify.js`'s
`src/`-only glob. No hard blocker found; the one soft recommendation is
sequencing the Part 1 vanilla DRY extractions just before each one's
corresponding component gets ported in Sprint E, so there's one canonical
version to port from instead of several to reconcile mid-port. Full
reasoning in `consistency-and-tech-roadmap.md` Part 6.

### Not fixed / not in scope this session

Everything in this batch is analysis and planning, not code changes —
consistent with every prior batch. `PROJECT.md` was updated with the new
`localStorage` reference section and three new Open Items pointing at
the companion doc.

---

## 2026-07-06 (batch 3 — gallery.js, notes-accessibility.js, notes-fab.js, notes-favorite.js, DSA renderers/animation-core, notes-checklist/exam/glossary)

### Resolved from batch 1/2

**Finding 1 (`.selected-chip`/`.type-badge` CSS divergence) — confirmed real, not just theoretical.** `gallery.js` renders `<span class="selected-chip">` for each selected tag filter chip (so gallery genuinely picks up `var(--accent)`, not `var(--primary)`) and `<span class="type-badge">${typeLabel}</span>` on every image card (an absolutely-positioned corner overlay per `gallery.css`). Both classes are live in production markup, not dead CSS — the chip-color and badge-role divergence documented in batch 1 is a confirmed, currently-shipping inconsistency, not a latent risk. Recommend prioritizing the fix already proposed in batch 1 (align on `--accent`, rename gallery's `.type-badge` to something gallery-specific).

**Finding 8 (search logic divergence) — confirmed.** `gallery.js`'s search
(`document.getElementById('searchBox')?.value` → `.toLowerCase()` →
`.some(field => field.includes(searchQuery))`) is plain substring
matching, structurally identical in style to `quiz-index.js`'s approach —
neither uses FlexSearch or any ranking/highlighting. `notes-index.js`
itself still hasn't been uploaded, so its actual implementation remains
unconfirmed directly, but everything gathered so far (FlexSearch/mark.js
CDN scripts loaded only by `notes-index.html`, per batch 1) continues to
point the same direction. Treat as effectively confirmed pending that one
file.

### New findings

#### 13. Three independent screen-reader live-region implementations — Suggestion (duplication)

`notes-accessibility.js` creates a shared, page-wide `#aria-live-region`
div and exposes `window.announceToScreenReader(message)` — used by itself
and by `dsa-visual-mcq.js` for answer feedback. Separately,
`quiz-engine.js` builds its own ad hoc `.sr-only` live region via a
private `_getLiveRegion()`/`_announce()` pair (batch 2 finding, not
previously cross-referenced). Separately again, `gallery.js` has its own
`#galleryAriaLive` div (seen as static markup in `gallery.html`, batch 1;
confirmed populated by `gallery.js` itself, batch 3). Three pages, three
independent "announce something to a screen reader" mechanisms, none
sharing code. Good candidate for a small shared `js/shared/aria-live.js`
exposing one `window.announceToScreenReader()` used everywhere — would
also resolve part of the accessibility-parity question below, since
notes' skip link and this live-region utility currently travel together
as one file (`notes-accessibility.js`) that only loads on note pages.

Relatedly — **confirmed: the skip link truly is note-pages-only.**
`notes-accessibility.js`'s `initSkipLinks()` is the sole place `.skip-link`
markup is created anywhere in the reviewed code; no equivalent exists in
`gallery.js`, `quiz-engine.js`/`quiz-toolbar.js`, `dashboard.js`, or any
quiz/gallery/dashboard HTML. So: quiz, gallery, and the dashboard/404
pages have no skip-to-content link at all today. Whether that's an
acceptable scope decision (those pages are much shorter, less to skip
past) or a gap worth closing is a product call, not something the code
resolves on its own — flagged here as a confirmed, not just suspected,
gap.

#### 14. Gallery favorites intentionally use a separate localStorage key from note favorites — confirmed, not a bug

`gallery.js`'s own comment states it directly: `// Favorites (image-level,
separate from note favorites)`, backed by its own `IMAGE_FAVORITES_KEY =
'galleryFavorites'`, distinct from `notes-favorite.js`'s `FAVORITES_KEY =
'notesFavorites'`. Two deliberately separate favorite lists (images vs.
notes) rather than one shared list — makes sense conceptually (favoriting
an image folder is a different action from favoriting a written note) and
is clearly intentional given the explicit comment. No action needed; noted
here only because it was worth verifying rather than assuming given how
much of this audit has been about naming/pattern splits.

#### 15. `notes-fab.js`'s Tools menu duplicates entry points that already exist elsewhere as their own controls

The top-right "Tools" FAB menu (`notes-fab.js`) includes Search, Print,
Bookmarks, Export Highlights, and a Study Timer toggle — all as menu-item
rows with their own icons. Meanwhile `notes-index.html`/`gallery.html`
surface search as a persistent top-of-page input (not menu-gated), and
quiz surfaces print as its own standalone floating button (batch 1,
Finding 6). This isn't a bug — note pages have more simultaneous features
competing for chrome space than listing pages, so a consolidated menu
makes sense there specifically — but it means "how do I search/print on
this page" has three different answers depending on page type (always-
visible input, a dedicated floating button, or a menu item one click
deep). Worth a deliberate design note rather than three independent
organic outcomes, but not something to "fix" without a product decision
on which pattern should win where.

### Icon additions this batch — see `icon-inventory.md` batch 3 section

`notes-fab.js` alone introduces 8 new UI-facing icons (☰ used twice for
two different menus, ⬆️, 🌙, 📑, 📚, 📤, 🔍, 🖨️, 🪶) not previously
catalogued, since Phase 1 of the inventory (batch 1) explicitly flagged
FAB-menu icons as out of reach until this file was available. `gallery.js`
adds 📐 (image resolution stat) to the lightbox metadata icons already
listed in batch 1. Full detail in `icon-inventory.md`.

### Not fixed / not in scope this session

All findings above are logged, not code-edited — consistent with every
prior batch, no source files were modified.
