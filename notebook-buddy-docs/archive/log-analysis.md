# Log Analysis — Learning Dashboard

Companion to `PROJECT.md`. `PROJECT.md` stays a clean reference (architecture
+ current open items + a one-line-per-item closed log). This file holds the
detailed "what did Claude check, against what evidence, what's still
unconfirmed" record for each session, so PROJECT.md doesn't grow into a
session-log transcript again.

Starts fresh from 2026-07-02 — no retroactive backfill of prior sessions.

Convention: one dated entry per session. Each entry lists what was reviewed,
what evidence supported any closure, and what remains unverified (e.g. "fix
given, not confirmed applied on disk" vs. "confirmed applied — file
directly inspected").

---

## 2026-07-06 (batch 9 — cross-file consistency audit + icon inventory)

**Purpose:** three-part request — (1) update `PROJECT.md`/this file for a
re-upload of 20 previously-seen files, (2) a dedicated cross-file
consistency audit logged as bugs/suggestions in a new file
(`audit-findings.md`), (3) a full icon inventory in a new file
(`icon-inventory.md`) for a future custom-icon replacement project.

**Files reviewed directly:** `gallery.html`, `gallery.css`, `notes.css`,
`notes-index.css`, `slides.css`, `quiz.css`, `styles.css`, `404.html`,
`index.html`, `notes-index.html`, `quiz.html`, `quiz-index.html`,
`animation-core.css`, `dsa-notes.css`, `dsa-print.css`, `notes-print.css`,
`quiz-index.css`, `category-icons.json`, `disclaimers.json`,
`navigation-url.json`. All 20 already existed in a prior session's upload
batch in substance (same filenames, same documented responsibilities in
`PROJECT.md`) — this batch re-confirms current file content directly
rather than assuming the prior session's notes still hold.

### Finding 1 — `404.html` missing from `PROJECT.md`'s Pages table

Direct inspection: `PROJECT.md` §4's Pages table lists `index.html`,
`notes-index.html`, `quiz-index.html`, `quiz.html`, `gallery.html` — no
`404.html` row, despite this file being reviewed and fixed in an earlier
session (per the existing 2026-07-0x log entries referencing a missing
`js/dashboard.js` script tag and a breadcrumb question). This was a
straightforward omission, not a stale/renamed reference. **Fixed** — row
added to the Pages table.

### Finding 2 — shared listing-page CSS duplicated between `notes-index.css` and `gallery.css`, two classes already diverged

Diffed every top-level classname defined in both files: 15 are defined
identically in both (`.chip-row`, `.quick-filter-btn`, `.quick-filter-icon`,
`.notes-count-label`, `.shuffle-again-btn`, `.view-mode-toggle`,
`.view-mode-btn`, `.filter-controls`, `.notes-toolbar`,
`.quick-filters-bar/-label/-section`, `.selected-chip`, `.chip-remove`,
`.type-badge`). Two have already silently diverged:

- `.selected-chip` background — `var(--primary, #ff9900)` in
  `notes-index.css`, `var(--accent, #ff9900)` in `gallery.css`. Confirmed
  via `styles.css` that `--primary` and `--accent` are genuinely different
  colors per theme (e.g. light theme: `--primary:#3b82f6` vs.
  `--accent:#0056b3`) — not a typo'd alias for the same value. Net effect:
  a selected filter chip renders a different color on the notes listing
  page vs. the gallery page for no documented reason.
- `.type-badge` — in `notes-index.css` this is inline text styling
  (`font-size`/`opacity` only, next to a card's type label). In
  `gallery.css` the same classname is an absolutely-positioned overlay
  badge in the top-left corner of an image thumbnail. Same name, two
  unrelated visual roles — a latent collision risk if either file is ever
  loaded on the other's page, or if a future shared component reuses the
  name expecting one behavior and gets the other.

Also noted: `.chip-row` margin-top is `6px` in `notes-index.css` vs. `4px`
in `gallery.css` — minor, cosmetic only.

Not fixed this session (flagged in `audit-findings.md` and `PROJECT.md`
Open Items) — resolving this means picking one canonical set of rules
(likely a new shared `css/notes/listing-shared.css` or folding into
`styles.css`) and confirming neither page relies on the other's diverged
value, which needs the corresponding JS (`notes-index.js`, `gallery.js`)
in hand to check what actually triggers `.selected-chip`/`.type-badge` at
runtime — not yet uploaded this session.

### Finding 3 — `.theme-toggle` duplicated and diverged between `styles.css` and `notes.css`

`styles.css` (loaded on every page) and `notes.css` (loaded only on note
detail pages) both define `.theme-toggle` and `.theme-icon::before`
(including the identical three-theme emoji content rule) independently.
The two `.theme-toggle` copies have drifted: `styles.css` uses
`background: var(--bg-card)` with a `0 4px 12px` shadow (`0 6px 20px` on
hover); `notes.css` uses `background: var(--bg-secondary)` with a
`0 2px 8px` shadow (`0 4px 12px` on hover) — a real visible difference in
button background/depth depending on page type, not just redundant code.
Flagged, not fixed this session — **correction, 2026-07-08:** this entry
originally said `notes.css` was "documented as currently minified in the
repo" as the reason the fix wasn't applied directly; checked against the
real file and that was wrong — `notes.css` is normal, fully-commented,
readable CSS. That claim wasn't sourced from anything real. No format
reason to defer this fix.

### Finding 4 — Bookmarks vs. Favorites naming/pattern split between quiz and notes/gallery

`PROJECT.md`'s existing history already documents a Bookmarks →
Favorites rename for the notes/gallery per-item save feature (heart glyph,
`.note-favorite-btn`/`.image-favorite-btn`, accent-color-on-active,
`notes-favorite.js`). Confirmed directly this session that `quiz.css`
never received the equivalent rename or visual pattern: it still defines
`.bookmark-btn` (question-card corner button), uses an amber/`--warning`
color scheme, and an opacity-fade-in-on-hover-or-bookmarked interaction —
structurally different from the heart-icon pattern used everywhere else.
Whether this is an intentional distinction (quiz "bookmark" ≠ note
"favorite" conceptually) or leftover from before the rename shipped
elsewhere isn't something the CSS alone can answer — flagged as a
question in `audit-findings.md`, not a confirmed bug.

### Finding 5 — inconsistent static `#themeToggle` markup across pages

`index.html`, `404.html`, `gallery.html` all hardcode
`<button id="themeToggle" class="theme-toggle">...<span class="theme-icon">` directly in markup. `notes-index.html`, `quiz.html`,
`quiz-index.html` have no such markup, relying on `theme.js`'s documented
self-injection behavior ("self-injects `#themeToggle` if not already in
DOM" — `PROJECT.md` §4). Both are functionally equivalent end states but
the inconsistency itself isn't explained anywhere, and it means the theme
button's exact DOM position/attributes can differ slightly by page
depending on which code path created it. Flagged as a style-consistency
suggestion, not a bug.

### Finding 6 — three independent `.search-bar`/search-input implementations

`styles.css` defines a global `.search-bar input` (border-radius 12px,
1rem/1.5rem padding) used as-is by `notes-index.html` (`#searchInput`),
`quiz.html`/`quiz-index.html` (`#searchInput`). `gallery.html` instead
gives its input a unique `class="search-box" id="searchBox"`, and
`gallery.css` overrides `.search-bar` margin and defines an entirely
separate `.search-box` rule (border-radius 8px, different padding) — the
only listing-style page that doesn't reuse the shared input styling by
id-based fallback. Not a bug (gallery's search box renders fine on its own
page), but it's a third divergent pattern for what is conceptually the
same "search this list" input across `notes-index.html`/`quiz-index.html`/
`gallery.html`. Logged as a suggestion.

### Finding 7 — quiz has a standalone floating print button; notes pages route print through the FAB menu

`quiz.html` hardcodes a dedicated floating `.print-button` (🖨️, bottom-
right, its own `quiz.css` rules ~line 517+). Per `PROJECT.md` §4,
note-page printing instead lives inside `notes-fab.js`'s top-right tools
menu alongside search/bookmarks/export/timer — no equivalent standalone
floating print button on note pages. Not necessarily wrong (quiz pages
have a simpler action set than note pages), but it's the same feature
(print) surfaced through two different UI patterns depending on page
type. Logged as a suggestion, not a bug — a candidate for the "feature one
module has that another could take" category from the audit brief.

### Icon inventory

Full glyph-by-glyph inventory across all 20 files compiled into
`icon-inventory.md` (new file) — every emoji/Unicode glyph used in CSS
`content:` rules, inline HTML text/buttons, and the two icon-bearing JSON
configs (`category-icons.json`, `navigation-url.json`), grouped by UI role,
as a working list for the custom mascot-icon replacement project. Not
attempted this session: JS-only icons (any icon set purely by `.js` files
not yet uploaded, e.g. `notes-fab.js`'s FAB menu icons, `quiz-toolbar.js`'s
toolbar icons) — flagged as incomplete in that file's own header, pending
those files.

**Not independently verified this session:** whether any of the CSS
divergences above (Findings 2–4) actually produce a visible bug in the
live site, since none of the corresponding runtime JS
(`notes-index.js`, `gallery.js`, `quiz-page.js`, `theme.js`,
`notes-favorite.js`) was part of this upload batch.

---

## 2026-07-06 (batch 3 — quiz-engine.js, quiz-toolbar.js, shared bootloader chain, dashboard.js + index JSONs)

**Files reviewed directly:** `quiz-engine.js`, `quiz-toolbar.js`,
`dashboard-cards.json`, `notes-index.json`, `quiz-index.json`,
`dashboard.js`, `analytics.js`, `footer.js`, `navigation.js`,
`page-loader.js`, `recently-viewed.js`, `shared-meta.js`, `site-config.js`,
`theme.js`, `quiz-export.js`, `quiz-index.js`, `quiz-page.js`,
`quiz-print.js`, `quiz-search.js`, `aws-page.js`.

**PROJECT.md fixes this batch:** added a missing `recently-viewed.js` row
to the Shared JS table (it existed in the file/behavior sense — 404.html
already referenced it — but had no row of its own); expanded
`quiz-toolbar.js`'s description, which only mentioned shuffle/bookmarks/
history/timer/study-mode despite the file also containing flag-cycling,
swipe navigation, weak-areas breakdown, timed countdown mode, and
show-all-answers — all real, substantial features that were simply
undocumented rather than missing.

**Key resolution:** batch 1's open Question about Bookmarks (quiz) vs.
Favorites (notes/gallery) is now closed — confirmed via direct code
inspection that these are two intentionally distinct features (quiz
bookmark = mid-attempt question marker; notes/gallery favorite = durable
saved-item list), not a naming leftover. Full detail in `audit-findings.md`.

**New confirmed finding:** `quiz-index.js`'s search is a plain
case-insensitive substring filter with no ranking or highlighting — a
real, confirmed divergence from `notes-index.html`'s FlexSearch+mark.js
setup (whether `gallery.js` matches quiz's simpler style still needs that
file directly). This is the clearest instance yet of the "search logic
differs between files" pattern flagged as a priority at the very start of
this audit.

Full write-up of all batch 3 findings (8 new items, 2 resolved from
batch 1) in `audit-findings.md`. Icon additions in `icon-inventory.md`
(quiz bookmark/flag/timer icons, print-picker mode icons, two more
data-driven icon sources found in `dashboard-cards.json`/
`notes-index.json`).

**Not independently verified this session:** `gallery.js`'s actual search
implementation (Finding 8), whether `quiz-toolbar.js`'s swipe detector
duplicates `notes-touch.js` (Finding 9), and full accessibility parity
(`notes-accessibility.js` not yet uploaded).

---

## 2026-07-06 (batch 4 — gallery.js, notes-accessibility.js, notes-fab.js, notes-favorite.js, DSA renderers/animation-core, notes-checklist/exam/glossary, dsa-contest/problems/visualisation/visual-mcq/page)

**Files reviewed directly:** `dsa-print.js`, `gallery.js`,
`notes-accessibility.js`, `animation-core.js`, `renderer-array.js`,
`renderer-graph.js`, `renderer-grid.js`, `renderer-number.js`,
`renderer-string.js`, `renderer-tree.js`, `dsa-contest.js`, `dsa-page.js`,
`dsa-problems.js`, `dsa-visualisation.js`, `dsa-visual-mcq.js`,
`notes-checklist.js`, `notes-exam.js`, `notes-fab.js`,
`notes-favorite.js`, `notes-glossary.js`.

**PROJECT.md fix this batch:** added a missing `notes-favorite.js` row to
the Notes shared JS table — same pattern as `recently-viewed.js` (batch 3)
and `404.html` (batch 1): a file that's real, working, and referenced
elsewhere in the doc (`notes-favorite.js` is mentioned by name in the
project's own history of the Bookmarks→Favorites rename) but never got
its own table row. Worth noting as a recurring pattern — three omissions
across four batches suggests the file-responsibility tables may be worth
a one-time full pass against the actual `js/`/`css/` directory listing
rather than continuing to catch these one at a time as each file happens
to get re-uploaded.

**Key resolutions this batch:**
- Confirmed (not just suspected) that `.selected-chip`/`.type-badge`
  (batch 1, Finding 1) are live in production markup via `gallery.js` —
  real bug, not theoretical.
- Confirmed `gallery.js` search is plain substring matching, same style
  as `quiz-index.js` — batch 3's Finding 8 fully confirmed for 2 of the 3
  listing pages now (only `notes-index.js` itself remains unconfirmed
  directly, though everything gathered continues to point the same way).
- Confirmed the skip link is genuinely note-pages-only
  (`notes-accessibility.js`'s `initSkipLinks()` is its sole source
  site-wide) — plus a new finding that three separate pages each built
  their own independent live-region mechanism rather than sharing one.
- Confirmed gallery's Favorites intentionally uses a separate
  `localStorage` key from notes' Favorites (own code comment says so
  directly) — not a bug, a deliberate scope split.
- Identified a third "bookmark-ish" feature (`notes-fab.js`'s 📑
  Bookmarks menu item → `#bookmarksPanel`) which `notes-reader.js` (per
  `PROJECT.md`'s existing table) actually owns — an in-page reading
  bookmark panel, distinct from both quiz's question-bookmarks and notes/
  gallery's whole-item Favorites. Three similar-sounding, functionally
  distinct "save/mark this" features now fully mapped across the site;
  detail in `audit-findings.md` Finding 17.

Full write-up in `audit-findings.md` (Findings 13–17) and
`icon-inventory.md` (batch 3 section — `notes-fab.js`'s 8 menu icons,
`gallery.js`'s resolution-stat icon, and the three-way bookmark/favorite
icon-collision note).

**Still not independently verified:** whether `quiz-toolbar.js`'s swipe
detector duplicates `notes-touch.js` (that file still not uploaded), and
`notes-index.js` itself (the one remaining listing-page JS file needed to
fully close out the search-logic and CSS-divergence threads with direct
evidence rather than strong inference).

---

## 2026-07-06 (batch 5 — notes-index.js, notes-touch.js, notes-reader.js, notes-search.js, notes-page-core.js, sitemap.xml, remaining notes/*.js + parse_*.py utility scripts)

**Files reviewed directly:** `notes-index.js`, `notes-mcq.js`,
`notes-print.js`, `notes-reader.js`, `notes-search.js`, `sitemap.xml`,
`notes-glossary.js`, `notes-interview.js`, `notes-page-core.js`,
`notes-touch.js`, `slides.js`, `animate.py`, `parse_checklist.py`,
`parse_contest.py`, `parse_glossary.py`, `parse_hands_on.py`,
`parse_interview.py`, `parse_mcq.py`, `parse_problems.py`,
`parse_reflection.py`.

**All three remaining open threads from prior batches fully closed this
batch:**
1. Search logic divergence (batch 2/3 Finding 8) — `notes-index.js`
   directly confirms the `FlexSearch.Document` + plain-substring-fallback
   implementation inferred from `notes-index.html`'s script tags. Three-
   way divergence (`notes-index.js` ranked vs. `gallery.js`/`quiz-index.js`
   plain substring) now fully evidenced, not inferred.
2. Swipe-gesture duplication (batch 2/3 Finding 9) — with `notes-touch.js`
   now in hand alongside `quiz-toolbar.js`, confirmed as genuine
   independent duplication: same 50px threshold by coincidence, otherwise
   different feature sets (haptics + visual drag feedback in
   `notes-touch.js`, neither in `quiz-toolbar.js`) and different
   targeting logic.
3. `.selected-chip`/`.type-badge` CSS divergence (batch 1/3 Finding 1) —
   `notes-index.js` itself renders both classes, confirming the divergence
   spans all three files that share these classnames, not just two.

**New, high-severity finding:** `sitemap.xml`'s domain
(`.../Resources/...`, no `V2`) contradicts `index.html`/`site-config.js`'s
domain (`.../ResourcesV2/...`, with `V2`) — and this document's own §1
header currently states `/Resources/` (no `V2`) is the live site, which
would mean `site-config.js`'s `basePath` — used to build literally every
`fetch()` URL site-wide in production — is the one that's wrong, not the
sitemap. This can't be resolved by further file inspection; it needs a
direct check against the actual deployed GitHub Pages URL. Full detail
and both possible directions laid out in `audit-findings.md` Finding 18
and a new prominent entry in `PROJECT.md`'s Open Items.

No new documentation gaps found this batch — all reviewed files already
had accurate table rows in `PROJECT.md`.

Full write-up in `audit-findings.md` (Findings 18–20) and
`icon-inventory.md` (batch 4 section — `notes-reader.js`'s ⭐/☆ section-
bookmark icon, completing the four-way bookmark/favorite comparison
started in batch 3).

**Nothing remains open from the original three-task brief** as of this
batch — every thread flagged "needs more files" in batches 1–4 has now
either been fully confirmed, fully resolved as not-a-bug, or (in the
sitemap domain case) correctly identified as unresolvable without
checking the live deployment directly rather than more file reads.

---

## 2026-07-06 (batch 6 — audit_content.py, generate_notes.py, generate_notes_index.py, dashboard.py, generate_quiz_index.py, generate_sitemap.py, full pytest suite)

**Files reviewed directly:** `audit_content.py`, `generate_notes.py`,
`generate_notes_index.py`, `conftest.py`, `test_audit_content.py`,
`test_dashboard.py`, `test_generate_notes_index.py`,
`test_generate_notes_index_validation.py`, `test_generate_sitemap.py`,
`test_sitemap_utils.py`, `dashboard.py`, `generate_quiz_index.py`,
`generate_sitemap.py`.

**Major upgrade to batch 4's sitemap-domain finding:** batch 4 left this
as "needs a live-URL check" — genuinely unresolvable from files alone.
This batch's direct read of the four generator scripts closes that gap
from a different angle: `generate_notes.py`/`generate_notes_index.py`
hardcode `/Resources/` (no `V2`) while `generate_sitemap.py`/
`generate_quiz_index.py` hardcode `/ResourcesV2/` (with `V2`) — confirmed
further by `test_generate_sitemap.py`'s own fixtures using `ResourcesV2`
URLs. This means the *scripts disagree with each other*, provable by
reading code alone, regardless of which domain is actually live. Given
`dashboard.py`'s `cmd_all` chains all of them in one pipeline, this isn't
a hypothetical — every full pipeline run produces a `sitemap.xml` with
both domains mixed in, and duplicate (non-deduped) entries for the same
note pages. Full detail in `audit-findings.md` Finding 18 (substantially
rewritten from the batch-4 version) and a new prominent `PROJECT.md`
Open Items entry.

**Two stale documentation issues corrected in `PROJECT.md` this batch:**
1. An existing Open Item referenced a file called `generate_quiz_list.py`
   — the real file (confirmed against this batch's upload) is
   `generate_quiz_index.py`, and its docstring already says "Run from
   `python/`," not "run from the repo root" as the old item claimed.
   Every other stale `generate_quiz_list.py` reference found elsewhere in
   the document (§4's file tables, §5's data-flow notes) was corrected to
   match in the same pass, along with one wrong output filename
   (`data/quiz-list.json` → the real `data/index/quiz-index.json`).
2. A real, substantial pytest suite plus `dashboard.py` (the project's
   actual CLI entry point) and `audit_content.py` (a cross-repo content
   validator) had no presence anywhere in `PROJECT.md`. Added a new
   `## 5.7. Python CLI & Testing` section covering `dashboard.py`'s
   subcommands, `audit_content.py`'s validation categories, and a
   per-file summary of what each test file covers.

Full write-up in `audit-findings.md` (Findings 18 rewrite, 21, 22).
No icon findings this batch (pure Python tooling, no user-facing UI).

---

## 2026-07-06 (final batch — repo-root config: package.json, package-lock.json, requirements.txt, README.md, LICENSE.md, deploy.yml, dashboard.bat, minify.js, tasks.json, .gitignore, .gitattributes)

**Files reviewed directly:** `_gitattributes`, `_gitignore`,
`package-lock.json`, `deploy.yml`, `tasks.json`, `minify.js`,
`dashboard.bat`, `LICENSE.md`, `package.json`, `README.md`,
`requirements.txt`.

**Domain question (batches 4 and 6's Finding 18) now confidently
resolved.** `README.md` states the live URL explicitly:
"🔗 Live site: https://namrata2709.github.io/ResourcesV2/". Tallied
against every file reviewed across this entire audit: 6 sources
(`README.md`, `index.html`, `site-config.js`, `generate_sitemap.py`,
`generate_quiz_index.py`, `test_generate_sitemap.py`) agree on
`ResourcesV2`; 3 (`generate_notes.py`, `generate_notes_index.py`,
`sitemap.xml`) plus this document's own header and `LICENSE.md`'s issues
link disagree. Most likely explanation: a repo rename from `Resources` to
`ResourcesV2` that a couple of infrequently-touched files and this
project's own docs never picked up. **`PROJECT.md`'s §1 header corrected
to `ResourcesV2` this batch** rather than continuing to carry a now
well-evidenced stale value.

**New minor finding:** `package.json`/`package-lock.json` list `pytest`
as a genuine (if unrelated) npm dependency — almost certainly an
accidental addition confused with Python's pytest, which is correctly
listed separately in `requirements.txt`. Harmless, but wastes install
time in `deploy.yml`'s CI. Flagged as a cheap cleanup for next time
`package.json` is touched.

No new documentation gaps found — `README.md`, `LICENSE.md`,
`deploy.yml`, `package.json`, `.vscode/tasks.json`, and `dashboard.bat`
were already accurately covered in `PROJECT.md` from earlier sessions;
`_gitignore`/`_gitattributes`/`package-lock.json`/`requirements.txt` are
supporting config files with nothing project-specific worth a table row.

**This closes out the full multi-batch review.** All three original
tasks are complete:
1. `PROJECT.md`/`log-analysis.md` updated across every batch as new files
   arrived, including several corrections to stale content found along
   the way (missing table rows, a renamed script never fully propagated,
   the domain header).
2. `audit-findings.md` — 24 numbered findings spanning CSS duplication,
   JS logic divergence, accessibility gaps, a four-way icon/feature
   naming collision, and the sitemap domain-split bug (the highest-
   severity confirmed issue across the whole audit).
3. `icon-inventory.md` — a complete, phased inventory of every icon
   site-wide, mapped against the brand kit's LOON icon system, with a
   priority order for the replacement project.

Nothing from the original brief remains open. Any items still listed
under "not urgent enough for a standalone fix" (the `pytest` npm cleanup,
`generate_notes.py`/`generate_notes_index.py`'s domain constant,
`LICENSE.md`'s issues link) are deliberately left as "next time that file
is touched" rather than treated as blocking, per how they were each
individually scoped above.

---

## 2026-07-06 (batch 8 — consistency solutions, `slides.html` gaps, rebrand + planning-doc reconciliation, tech-stack decision)

**New companion file added: `consistency-and-tech-roadmap.md`** — this
batch's request went beyond "find more problems": concrete DRY/KISS/SOLID
fixes for every existing finding, a `localStorage` reference table, a
`slides.html` gap analysis, and reconciling three pasted planning
documents (a decisions/roadmap log, a detailed sprint plan, a backlog)
plus a rebrand plan and a proposed React/Tailwind/CSS-Modules stack.
Rather than stretch `audit-findings.md`/`PROJECT.md` to cover all of that
inline, the solutions/reconciliation/roadmap content lives in the new
file, with short pointers added to both existing docs.

**New findings (25–31):** `slides.html` is missing back button/
breadcrumb, footer, favorites, and accessibility — all traced to one
documented root cause in `slides.js`'s own header comment
(`data-no-nav="true"` skipping `navigation.js` entirely, which
accidentally took three unrelated features down with it). Filter/print
correctly don't apply to a single-document deck.

**Solutions, not just problems:** every prior finding from batches 1–7
now has a concrete fix mapped to it in the new file's Part 1 — almost
all reduce to "extract one shared module," never "add configuration."
Three findings (bookmarks/favorites split, print/search chrome density)
are explicitly confirmed as legitimate differences to keep, not bugs to
merge.

**`localStorage` reference added to `PROJECT.md` §6.5** — every key,
owner file, shape, and scope, plus one naming-convention inconsistency
surfaced (`<pageId>-<feature>` vs. `<feature>-<pageId>`) flagged as a
"pick one for new keys" note, not a migration.

**Rebrand (Notebook Buddy) and old planning docs reconciled** against
every file reviewed this audit — name/font/color changes are
straightforward CSS-variable edits; a sidebar nav, notifications bell,
Calendar, and Study Mode shown in the brand mockups don't exist anywhere
in the codebase yet, flagged as net-new feature work rather than rebrand
scope. The sprint-plan's own "closed" claims were independently confirmed
against direct file review (genuinely matching), and one gap the
planning docs didn't know about was surfaced: Sprint B's `slides.html`
closure covered generation only, not the page-chrome gaps found this
batch.

**Tech-stack decision:** React/TS/Vite/Tailwind/CSS-Modules scaffolding
can start immediately, fully parallel to current vanilla work — confirmed
no technical blocker, only a soft sequencing recommendation (do the
cheap vanilla DRY fixes just before each maps to a ported component).

Full detail throughout in `consistency-and-tech-roadmap.md`.

---

## 2026-07-08 (completeness re-check + slides redesign + exports + personalization triage)

**Requested:** re-verify every file uploaded across the entire thread
actually made it into these docs, plus address three previously-uploaded
files that were only grep-checked rather than fully read
(`audit_content.py`, `generate_notes.py`, `generate_notes_index.py`),
plus new requests: a Google-Slides-style windowed/fullscreen redesign for
`slides.html`, export-to-PPT/DOCX/EPUB feasibility, and a large pasted
personalization roadmap triaged against the static-site/no-backend
constraint.

**Completeness check result:** the three previously grep-only files were
read in full this pass — no discrepancies found, everything already
documented about them holds up (19 real functions in `audit_content.py`,
22 in `generate_notes_index.py`, all the specific functions
`roadmap-and-decisions.md` described in `generate_notes.py`, all
confirmed present exactly as claimed). One planning document (the
Tailwind/CSS-Modules hybrid recommendation) had only been folded into
`consistency-and-tech-roadmap.md` Part 6 at a high level — its specific
40/40/20 split and folder structure are now explicitly endorsed as
consistent with everything found in this audit, no changes recommended.
Everything else uploaded this thread was already fully reflected at the
time each batch was processed.

**`slides.html` redesign updated:** rather than a special "minimal nav"
mode (Part 3's original proposal), model it on Google Slides' own
windowed/fullscreen split — windowed state gets full chrome like any note
page, fullscreen (already implemented in `slides.js`) hides it. Smaller,
more surgical fix than originally proposed.

**Export formats (PPT/DOCX/EPUB) and the personalization roadmap** both
triaged for feasibility against the static-site/no-backend constraint —
DOCX and EPUB are genuinely feasible client-side and reuse existing data;
PPT is feasible only as a content approximation; most personalization
items are already partly built or straightforward extensions of existing
patterns, with chat/sync/leaderboards correctly identified as needing a
backend this project doesn't have.

Full detail in `consistency-and-tech-roadmap.md` Parts 8–11. `PROJECT.md`
Open Items updated with pointers to all three.

---

## 2026-07-03 (batch 5 — gallery.html regression claim + listing-page audit)

**Purpose:** user flagged four potential issues (a claimed `gallery.html`
footer regression, a retraction of a prior unsubstantiated claim about
`notes-index.js`, a `quiz.html` attribute question, and two minor
inconsistencies) and asked to resolve and log them.

**Files reviewed directly:** `gallery.html`, `notes-index.html`,
`quiz.html`, `quiz-index.html`, `404.html`, `index.html` (all from this
session's upload batch).

### Finding 1 — claimed `gallery.html` footer regression does not reproduce

The user's claim quoted `gallery.html` as containing `<footer
id="footer"></footer>` plus a redundant explicit `<script
src="js/shared/footer.js">` tag alongside `js/notes/gallery.js`. Grepped
the actual uploaded file directly: it contains neither. The footer markup
is `<div id="footerRoot"></div>` (line 182) and the only script tag beyond
`site-config.js`/the JSON-LD block is `js/notes/gallery.js` (line 185) —
no `js/shared/footer.js` reference anywhere in the file. This matches
what the 2026-06-30/07-01 log entry already recorded as complete
("hardcoded footer → `#footerRoot`"), not a regression from it. **No code
change made** — the file already matches the documented fix. Flagging
that whatever the user was quoting from wasn't this uploaded file; if a
`#footer`/redundant-`footer.js` version exists somewhere, it's a stale
copy, not the one in this batch.

### Finding 2 — retraction accepted, nothing to correct

`notes-index.js` isn't part of this upload batch and no claim about it is
being made this session — no action needed.

### Finding 3 — `quiz.html` `data-subject`/`data-back-label` — open question, not resolved

Confirmed directly: the comment above `<body>` documents both attributes
as read by `footer.js`, but `<body>` itself carries neither. Whether
`quiz-page.js` sets them dynamically post-fetch (and if so, whether
`footer.js` — described in the same comment block as loading early/async
— could run first and render the disclaimer before `data-subject` exists)
can't be confirmed without `quiz-page.js` or `footer.js`, neither
uploaded this session. Added to Open Items in `PROJECT.md` as a question,
not a confirmed bug.

### Finding 4 — minor inconsistencies: one fixed, one corrected

- `gallery.js` script tag was missing `defer` while `notes-index.js` and
  `quiz-index.js` (sibling listing-page engines) both use it. **Fixed** —
  added `defer` to `gallery.html`'s script tag for consistency. Functionally
  inert either way since the tag sits at the end of `<body>`, but now
  matches the sibling pattern.
- The claim that `quiz-index.html` is uniquely missing a static
  `twitter:card` tag doesn't hold up under direct inspection: `quiz.html`
  also has no static `twitter:card` meta tag — it relies on `shared-meta.js`
  injection, per its own inline comment ("shared-meta.js → ...twitter:card...").
  So `quiz.html` and `quiz-index.html` are actually consistent with each
  other (both injected); only `gallery.html` and `notes-index.html` declare
  it statically. Not a `quiz-index.html`-specific inconsistency — no fix
  applied.

---

## 2026-07-03 (batch 6 — JSON/XML data review + quiz.html disclaimer bug)

**Purpose:** user uploaded `sitemap.xml`, `disclaimers.json`,
`navigation-url.json`, `dashboard-cards.json`, `notes-index.json`,
`quiz-index.json`, `quiz-page.js`, and `footer.js` to close out the two
Open Items from the previous session (`quiz.html` attribute question,
`generate_sitemap.py` overlap), and to review the JSON/XML data files.
Python build scripts explicitly deferred to a future session per user
("very big chunk").

### Finding 1 — `quiz.html` AWS disclaimer bug, confirmed and fixed

Previously an open question; now confirmed as a real bug with both files
in hand. `footer.js`'s `injectFooter()` reads `root.dataset.subject` where
`root = document.getElementById('footerRoot')` — **not** `document.body`.
`quiz.html`'s inline comment claimed the opposite (`data-subject` on
`<body>`), and its `#footerRoot` div had no `data-subject` attribute at
all. Nothing else sets one dynamically — `quiz-page.js` only sets
`window.QuizPageFile`, loads quiz modules, and calls `callNavigation`; it
never touches `#footerRoot` or any subject-related state. Net effect: the
AWS trademark disclaimer has never rendered on `quiz.html`, for any quiz.
**Fixed:** added `data-subject="aws"` directly to `quiz.html`'s
`#footerRoot` div (safe today since every entry in `quiz-index.json` is
AWS-topic), and rewrote the misleading `<body>`-comment to point at the
correct element and note the fix. Flagged in `PROJECT.md` Open Items that
this hardcode will need to become dynamic if a DSA quiz is ever added.

Also resolves the secondary timing-hazard question from the prior
session: moot, since neither script ever set the attribute in the first
place — there was no race to worry about, just a missing value.

`data-back-label` (the other attribute in the same stale comment) — still
unconfirmed; `navigation.js` (which the comment attributes it to) hasn't
been uploaded. Comment now scoped to just that open question.

### Finding 2 — `sitemap.xml` is substantially stale

Direct inspection against the newly uploaded `notes-index.json`:

- **Confirmed dead entry removed:** `src/data/notes/aws-sample1-session-sample/ppt.html`.
  The 2026-07-02 log entry already established no `ppt.html` is generated
  anywhere in the current pipeline (superseded by `slides.html`/
  `slides-overview.html`). Removed from `sitemap.xml`.
- **Orphaned, not removed:** `dsa-sample` and `dsa_linear-search`
  (underscore variant) don't correspond to any folder in the current
  `notes-index.json` (which has `dsa-merge-sort` and `dsa-linear-search`,
  hyphenated). Left in place rather than deleted — unlike `ppt.html`,
  there's no prior direct confirmation these folders are actually gone,
  just that they don't appear in this particular JSON snapshot. Added to
  Open Items as a question rather than acted on.
- **Missing entries:** 7 of the 11 folders in `notes-index.json` have no
  sitemap entry at all, and `gallery.html` isn't listed. Combined with the
  `lastmod` dates (mostly April–June 2026, while `notes-index.json`'s
  dates run through 2026-07-02), this sitemap simply hasn't been
  regenerated recently — consistent with, but not proof of, the
  `generate_sitemap.py`/`generate_notes_index.py` overlap question already
  in Open Items.
- **Path shape questioned, not changed:** every note URL uses a
  `src/data/notes/...` prefix, which reads as a source-tree path rather
  than a published one, given `PROJECT.md` §5.6's `src/` → `dist/` build
  step. Didn't rewrite these — doing so without `generate_notes.py`/
  `generate_sitemap.py` in hand would be guessing at the real deployed URL
  shape.

Full sitemap regeneration (matching all current note folders, correct
published paths) intentionally not attempted this session — needs the
build scripts to get right rather than reverse-engineering from JSON
alone.

### Finding 3 — `quiz-index.json` key casing, flagged not fixed

`quiz-index.json`'s top-level array key is `"Quizzes"` (capital Q), while
every sibling index file uses lowercase (`notes-index.json` → `"notes"`,
`dashboard-cards.json` → `"cards"`). Whether `quiz-index.js` actually
reads `data.Quizzes` (matching) or `data.quizzes` (would silently break
quiz listing — no error, just an empty list) can't be determined without
that file. Added to Open Items as a question.

### Reviewed, no issues found

- `disclaimers.json` — only an `"aws"` key, consistent with `footer.js`'s
  own documented fallback behavior ("if that subject has no entry, e.g.
  DSA today, no disclaimer is rendered").
- `navigation-url.json` — matches the already-"decided, not a bug" Home
  `url: " "` entry from the 2026-06-30/07-01 log; no new issue.
- `dashboard-cards.json` — matches `index.html`'s three-card dashboard
  (`aws`, `dsa`, `quiz`) with no inconsistency found.
- `notes-index.json` — schema (title/folder/subject/session/date/
  category/tags/hasImages/images/files) is internally consistent across
  all 11 entries; nothing that would break `notes-index.html`'s filter/
  sort/search logic as far as can be told without `notes-index.js` itself.

**Deferred to next session, per user:** the Python build scripts
(`generate_notes.py`, `generate_notes_index.py`, `generate_sitemap.py`,
etc.) — described by the user as "a very big chunk," to be reviewed after
JSON/XML and JS.

---

## 2026-07-03 (batch 7 — Python sitemap generators; both prior Open Items resolved)

**Purpose:** user uploaded the full Python build/generator layer
(`generate_notes.py`, `parse_slides.py`, `generate_notes_index.py`,
`generate_quiz_list.py`, `generate_sitemap.py`, `sitemap_utils.py`,
`animate.py`, and 9 `parse_*.py` block parsers) to resolve the two
remaining sitemap-related Open Items from prior sessions, per the user's
context that the sitemap is meant to be dynamically maintained by these
scripts, not hand-edited.

### Finding 1 — `generate_sitemap.py` directory bug: would have wiped the sitemap

Confirmed via direct cross-reference: `generate_notes.py` (`NOTES_ROOT =
"../src/data/notes"`), `generate_notes_index.py` (`ROOT = "../src/data/notes"`),
and `generate_quiz_list.py` (`ROOT = "../src/data/quiz"`) all agree on the
`src/data/...` convention. `generate_sitemap.py` alone used `NOTES_DIR =
"../data/notes"` and `QUIZ_DIR = "../data/quiz"` — missing `src/`.

This is more than a stale-path nit: `generate_sitemap.py`'s `main()`
starts from `urls = []` (a full rebuild, not an upsert against the
existing file) and its notes section is already commented out. With
`QUIZ_DIR` pointing at a folder that doesn't exist, `quiz_path.exists()`
would be `False`, the quiz loop would add nothing, and `write_sitemap()`
would overwrite `sitemap.xml` with only the 3 hardcoded main-page URLs —
silently deleting every quiz and note URL the other two scripts had
built up. **Fixed:** both constants corrected to `../src/data/notes` and
`../src/data/quiz`.

### Finding 2 — `generate_notes_index.py` never pruned stale sitemap entries

This explains last session's `dsa-sample`/`dsa_linear-search` orphan
question directly: `generate_notes_index.py`'s sitemap block only ever
called `add_url()` (upsert) for the notes currently in
`notes-index.json` — it had no equivalent of `generate_quiz_list.py`'s
prune loop (which removes any `quiz.html?quiz=<stem>` sitemap entry whose
source JSON no longer exists). So any renamed or deleted note folder, or
retired file type (the old `ppt.html`, confirmed dead in an earlier
session), stays in `sitemap.xml` forever once written. **Fixed:** added a
prune step mirroring `generate_quiz_list.py`'s pattern — after upserting
current note URLs, any existing `src/data/notes/...` sitemap entry not in
this run's output is removed via `sitemap_utils.remove_url`.

Together, Findings 1 and 2 fully resolve the two Open Items carried since
the previous session (`generate_sitemap.py`/`generate_notes_index.py`
overlap question; `sitemap.xml` staleness). The overlap itself was never
actually a duplication risk — `add_url` upserts by `loc`, so re-running
either script just refreshes `lastmod` — the real risk was the directory
bug combined with the full-rebuild pattern, now fixed. Note: the
`sitemap.xml` file itself still needs to be regenerated for real (this
session only had a static snapshot to review, not a live repo to run the
script against), so the specific stale entries observed last session are
still present on disk until that next run.

### Finding 3 — `quiz-index.json` capitalized key confirmed intentional

`generate_quiz_list.py` writes `json.dump({"Quizzes": items}, ...)`
explicitly — not a JSON-authoring accident, a deliberate choice in the
generator. Whether `quiz-index.js` (still not uploaded) matches with
`data.Quizzes` remains the only unconfirmed piece; left as an Open Item
since getting it wrong would silently return an empty quiz list rather
than error, so it's worth a direct check next time that file is available.

### Finding 4 — `sitemap_utils.py`'s `BASE_URL` constant is dead code, minor

Defined (`BASE_URL = "https://namrata2709.github.io/Resources/src"`) but
never referenced anywhere else in the file — `add_url()` takes a
caller-supplied full `loc` instead. Each of the three generator scripts
defines and uses its own `BASE_URL` (with differing trailing-slash
conventions, each internally consistent with how that script concatenates
it). Not fixed — genuinely inert, not worth the churn of removing a
constant that costs nothing at runtime.

### Reviewed, no issues found

`animate.py` and the nine `parse_*.py` block parsers (`parse_checklist`,
`parse_contest`, `parse_glossary`, `parse_hands_on`, `parse_interview`,
`parse_mcq`, `parse_problems`, `parse_reflection`,
`parse_screenshot_guide`) — each read top-to-bottom for field-parsing
correctness. All follow the same `field:`-line-parsing convention
consistently, validate required fields before emitting, and print a
`⚠️` skip warning rather than crashing on a malformed block. No new bugs
found beyond the already-fixed `parse_visual_mcq.py` field-prefix issue
from a prior session.

**Not read this session:** `generate_notes.py` (1943 lines) and
`parse_slides.py` (647 lines) in full — both grepped for path constants
and sitemap references only (confirming Finding 1's `src/data/notes`
convention and that neither file touches `sitemap.xml` directly). A full
read of either wasn't needed to resolve this session's two target Open
Items; flag if a future session needs deeper coverage of the main
pipeline or the slides builder specifically.

---

## 2026-07-03 (batch 8 — build config, README, and a correction to a prior finding)

**Purpose:** user uploaded the remaining project-level files (`deploy.yml`,
`tasks.json`, `minify.js`, `package.json`, `README.md`, `LICENSE.md`,
`_gitignore`, `_gitattributes`, `package-lock.json`) plus the last of the
content-authoring instruction files (`aws-standard-instructions.md`,
`dsa-instructions.md`, `aws-presentation-instructions.md`,
`video-slides-instructions.md`, `aws-additional-lab-instructions.md`,
`linkedin-instructions.md`, `youtube-metadata-instructions.md`).

### Finding 1 — sitemap note-URL prefix: prior "confirmed correct" was wrong

Tracing `minify.js` directly revealed the bug the previous session missed.
`minify.js`'s `build()` globs `**/*` with `cwd: SRC` (`SRC = ROOT/"src"`),
so every path it copies into `dist/` is already relative to `src/` — the
`src` segment itself never appears in the output tree. A file at
`src/data/notes/foo/notes.html` is published at `data/notes/foo/notes.html`,
not `src/data/notes/foo/notes.html`.

The prior session verified `generate_notes_index.py`'s sitemap URLs
("`.../Resources/src/data/notes/...`") only against that same script's own
`BASE_URL` concatenation — circular reasoning, checking the code against
itself rather than against the actual build output. Two independent
content-authoring files settle it: `linkedin-instructions.md` and
`youtube-metadata-instructions.md` both document a note's real page URL as
`https://namrata2709.github.io/Resources/data/notes/[type-prefix]-[slug]/notes.html`
— no `src/`. **Fixed:** `generate_notes_index.py`'s `note_prefix` changed
from `{BASE_URL}src/data/notes/` to `{BASE_URL}data/notes/`. `PROJECT.md`
Open Items updated to record the correction rather than silently overwrite
the earlier (wrong) conclusion.

### Finding 2 — sitemap.xml may never reach the deployed site at all (flagged, not fixed)

Following the same trace one step further: `sitemap_utils.py`'s
`SITEMAP_FILE = "../sitemap.xml"` is relative to wherever the Python
scripts run from. `README.md` says those scripts live in a `python/`
folder; `package.json`'s build script references a sibling `tools/`
folder the same way (`"node tools/minify.js"`, resolved from a repo-root
`npm run build`) — consistent with `python/` also being a repo-root-level
folder, not nested inside `src/`. If that's right, `"../sitemap.xml"`
resolves to a repo-root `sitemap.xml`, sitting *outside* `src/`. Since
`minify.js` only copies what it finds inside `src/`, and `deploy.yml`
uploads only `./dist` as the Pages artifact, a repo-root `sitemap.xml`
would never make it into the deployed site — it would 404 regardless of
how accurately its contents are maintained.

This is flagged rather than fixed: moving `SITEMAP_FILE` without directly
confirming the real folder layout risks creating a second, diverging
`sitemap.xml` rather than fixing the real one. Needs either a file-tree
screenshot (as was provided once before, for the DSA animation folder
question) or direct confirmation of where `python/` and `sitemap.xml`
actually sit.

### Finding 3 — README.md's "no build step" claim is wrong

`deploy.yml` runs `npm ci` then `npm run build` before every deploy;
`package.json`'s `build` script runs `tools/minify.js`, which minifies
HTML/CSS/JS and copies `src/` → `dist/`. **Fixed** — reworded to describe
the real build step instead of denying one exists.

### Finding 4 — package.json name field, minor

`"name": "python"` — almost certainly a leftover `npm init` default from
being run inside the `python/` tooling folder before the file was moved to
the repo root (`npm init` defaults `name` to the current directory).
Harmless (package is never published), but confusing. **Fixed** — renamed
to `"learning-dashboard"`.

### Finding 5 — docstring/reality mismatch, cosmetic, not fixed

`generate_quiz_list.py` and `generate_sitemap.py` both say "Run from the
repo root" in their module docstrings, but their own relative-path
constants (`ROOT = "../src/data/quiz"`, `SITEMAP_FILE = "../sitemap.xml"`)
only resolve correctly one level below the repo root — i.e. from inside
`python/`, not the root itself. Doesn't affect behavior (whoever actually
runs these presumably already knows to `cd python/` first), just flagged
as misleading documentation. Not fixed — low priority, cosmetic only.

### Reviewed, no issues found

`aws-standard-instructions.md` (1330 lines), `dsa-instructions.md` (913
lines), `aws-presentation-instructions.md` (393 lines),
`video-slides-instructions.md` (413 lines) — grepped for the same
`Resources/data/notes` vs `Resources/src/data/notes` URL question (both
came back clean/consistent with the no-`src/` convention, reinforcing
Finding 1) and for any other structural claims worth cross-checking; no
new contradictions found against `PROJECT.md`. Not read end-to-end this
session — these are large, stable authoring specs that haven't changed
since earlier sessions established their content; flagged here rather
than fully re-read, since this session's purpose was the build/deploy
layer specifically. `deploy.yml`, `tasks.json`, `LICENSE.md`,
`_gitignore`, `_gitattributes`, `package-lock.json` — read directly, no
issues found (`.gitignore` correctly excludes `dist/`, confirming it's
build output as expected; `package-lock.json` versions match
`package.json`'s stated dependencies).

---

## 2026-07-03 (batch 9 — sitemap.xml location resolved, per user)

User confirmed directly: `sitemap.xml` lives inside `src/`, and reaches
`dist/` through `minify.js`'s verbatim-copy path — `.xml` isn't one of the
extensions the build minifies (only `.html`/`.css`/`.js`/`.json` get
transformed), so it falls through to the `COPY_EXTENSIONS` check and is
copied byte-for-byte. This resolves Finding 2 from the previous entry:
the deployment mechanism itself was never broken.

What *was* broken, given that: `sitemap_utils.py`'s `SITEMAP_FILE =
"../sitemap.xml"` is relative to the Python scripts, which sit in a
repo-root-level `python/` folder (required for `ROOT = "../src/data/notes"`
elsewhere in the same file family to resolve correctly). One level up from
`python/` is the repo root, not `src/` — so `"../sitemap.xml"` was pointing
at a nonexistent repo-root file, not the real `src/sitemap.xml`. **Fixed:**
changed to `"../src/sitemap.xml"`.

Moved out of Open Items into the closed/decided record; superseded by this
entry rather than left as two separate open threads.

---

## 2026-07-03 (batch 10 — sitemap_utils.py moved into python/utils/, renamed)

**Purpose:** user asked to move `sitemap_utils.py` into the `utils/` folder
with a better name, then sync the docs.

**Change made:** `sitemap_utils.py` → `python/utils/sitemap.py`, matching
the existing `python/utils/` convention where library modules aren't
suffixed with `_utils` (`animate.py`, `parse_mcq.py`, etc.) and are
imported dotted (`import utils.animate as animate`). Import updated in all
three callers to `from utils.sitemap import ...`:
`generate_sitemap.py`, `generate_quiz_list.py`, `generate_notes_index.py`
(the last one inside its existing `try`/`except ImportError` fallback,
whose print message was also updated to name `utils.sitemap`). Module-level
docstrings in all four files updated to reference the new module path.

**Not changed:** none of the path constants inside `sitemap.py`
(`SITEMAP_FILE = "../src/sitemap.xml"`) or the other scripts
(`ROOT = "../src/data/quiz"`, etc.) — these are plain relative paths that
resolve against the process's working directory at runtime, not the
importing/imported file's location on disk, so they're unaffected by
moving the file into a subfolder. This only holds as long as every script
is still invoked from inside `python/`, which matches the existing
(if docstring-mislabeled — see Open Items) convention.

**Not verified this session:** whether `python/utils/` already has an
`__init__.py` making it a regular package (implied by the pre-existing
`import utils.animate as animate` pattern working) — not part of this
upload batch, so assumed present rather than confirmed. If it's missing,
`from utils.sitemap import ...` would still work as a Python 3 namespace
package as long as `python/` itself is the working directory, but this
wasn't independently checked.

PROJECT.md §4/§5.5 updated to document `sitemap.py`'s new location and
import path alongside the other `python/utils/` modules.

---

## Closed & Decided Log

One line per item, most recent first. This section moved here from
`PROJECT.md` on 2026-07-02 so that file could stay a pure reference doc.

**2026-07-03 (batch 4 — CSS review)**
- ✅ `notes-index.css` `.view-all-images-btn:hover` — `var(--bg-hover)` →
  `var(--bg-card)`. `--bg-hover` is never defined in `styles.css` or any
  other CSS file (grepped all of them); no fallback either, so the hover
  state was a silent no-op.
- ✅ `notes.css` `.toc-row::before` (TOC arrow icon) — `var(--accent-color)`
  → `var(--accent)`. `--accent-color` doesn't exist anywhere; the real
  variable is `--accent`. Only occurrence of this typo in the file (28
  other `var(--accent)` usages nearby, confirming the naming convention).
- ⚠️ Noted, not fixed: `dsa-notes.css` also references `--bg-tertiary`
  (lines 127, 144), `--bg-hover` (line 156), and `--accent-color` (lines
  164–165) with no fallback — all undefined. Currently harmless because
  each is immediately followed by higher-specificity
  `[data-theme="light/dark/comfort"] .viz-tab...` rules that always win,
  so the generic rule never actually paints. Left as-is since fixing would
  touch code that's provably dead under the current CSS, not a live bug —
  flagging in case that theme-override structure ever changes.


- ✅ `quiz-engine.js` line 921 — `window.siteConfig.dataPath(...)` (lowercase
  `s`) → `window.SiteConfig.dataPath(...)`. Every other file in the codebase
  uses `window.SiteConfig` (capital S); `window.siteConfig` doesn't exist —
  this was a `TypeError` on every `quiz.html` load, breaking the whole quiz
  page. Confirmed by grepping all 12 newly uploaded files: this is the only
  occurrence of the wrong casing.


- ✅ `notes-reader.js` search-history feature — **fixed via load-order, not
  a code change in the file itself.** `initSearchHistory()` runs
  synchronously at `initReader()` time and bails on `if (!searchInput)
  return;` because `#search-input` didn't exist yet — `notes-search.js`
  (which creates it via `createSearchUI()`) loaded 4 positions later in
  `notes-page-core.js`'s `SHARED_SCRIPTS` array. Since `script.async =
  false` makes array order = execution order, and `notes-search.js` has no
  load-time dependencies of its own (confirmed via its header: "Dependencies:
  none directly"), moved it ahead of `notes-reader.js` in `SHARED_SCRIPTS`.
  Search autocomplete/history should now actually initialize. Not yet
  verified live in a browser — only reasoned from load order + the
  `if (!searchInput) return;` guard.
- ✅ `notes-index.js` `FILE_META` — replaced the dead `ppt` key
  (`ppt.html` never shipped, confirmed retired in the 2026-07-02 log entry
  below) with `slides` (icon 📊, label "Presentation"), matching the
  `type:"slides"` value `notes-index.json` actually emits. Header comment
  ("notes/lab/ppt icons") corrected to "notes/lab/slides icons" too.
- ✅ `notes-mcq.js` default JSON path — `"mcq.json"` → `"json/mcq.json"`,
  matching the `json/` subfolder convention every sibling module
  (`dsa-contest.js`, `dsa-problems.js`, `notes-checklist.js`,
  `notes-glossary.js`, `notes-interview.js`, `dsa-visual-mcq.js`) already
  uses. Any note page not explicitly setting `data-mcq-source` would have
  404'd on this alone.

**2026-07-03 (batch 1 — animation renderer review)**
- ✅ `renderer-tree.js` non-BST topic gap — **fix applied, not yet verified
  against a real topic.** `buildVisual()` previously always called
  `insertBST()` regardless of topic shape, which is wrong for Heap, Trie,
  Segment Tree, DSU-as-forest, Treap, Splay Tree, and B-Tree (none are
  BST-ordered; Trie isn't even binary). Added a `input.treeStructure =
  {nodes, root}` path that's used as-is when present, falling back to
  `insertBST(input.treeValues)` only when absent. **Open sub-item:**
  whether `animate.py`/the affected topics' `computeSteps()` actually emit
  `treeStructure` yet is unverified — this change only makes the renderer
  ready to accept it. Trie's non-binary branching may also need a
  `children[]` shape instead of `left`/`right`, not addressed this pass.
- ✅ `dsa-visual-mcq.js` dead `card.dataset.correct` attribute — removed.
  Was set on every quiz option but never read anywhere in the file.

**2026-07-03**
- ✅ **DSA animation folder path — resolved, PROJECT.md was correct.** Initial
  file-only review flagged a contradiction: PROJECT.md §4 says animation
  files live nested at `js/notes/dsa/animation/`, but all 7 uploaded files'
  own header `Path:` comments said flat `js/notes/dsa/*.js`. A VS Code file
  tree screenshot confirmed the nested `animation/` folder genuinely exists
  on disk with all 7 files inside it — so PROJECT.md's row was right all
  along; the 7 headers were the stale side. **Confirmed fixed by user
  directly** (not independently re-verified file-by-file by Claude this
  session).
- ✅ `dsa-print.js` PROJECT.md description — was a stale one-liner ("patches
  `window.openPrintModal` to inject `dsa-print.css`") that predated most of
  the file's actual functionality. Updated in `PROJECT.md` §4 to also cover:
  marking Visualisation/Implementation/Visual-Questions as print-interactive,
  the Python/Java/C++ Implementation sub-toggles, the Visual-Questions
  "Include explanations" sub-toggle, and the Visualisation print transform
  (all-step-images-at-once). Confirmed directly against the uploaded file's
  own header + code, not just the file's docstring claims.

**2026-07-02 (Presentation Mode / Video Slides review)**
- ✅ **"Presentations module (referenced, not built)"** (was Open Item /
  Feature Inventory note) — **superseded, not just closed.** The module is
  fully built: `parse_slides.py` (634 lines, shared builder), `slides.js`,
  `slides.css` (pre-existing), and routing in `generate_notes.py`
  (`detect_presentation_mode`, `detect_video_slides_mode`,
  `scan_and_build_video_slides`) are all present and wired together. Moved
  from "Not yet active" to the active Feature Inventory in `PROJECT.md`.
- ✅ `ppt.html` naming question — confirmed permanently moot, not just
  deferred. `generate_notes_index.py`'s own docstring states nothing
  generates `ppt.html` anymore and the index no longer recognizes it;
  everything is `slides.html` (Presentation Mode, own folder) or
  `slides-overview.html` (Video Slides, companion inside an existing note's
  folder), both indexed as `type:"slides"`.
- ✅ `slides.js` location — decided: `js/notes/slides.js` (confirmed by the
  file's own header comment), same folder as the rest of the notes JS,
  consistent with the earlier `slides.css` "stays in `css/notes/`" decision.
  `aws-presentation-instructions.md` had left this as an either/or
  (`js/notes/slides.js` or `js/slides/slides.js`) — resolved by the actual
  uploaded file.
- ✅ Monolithic `instructions.md` — confirmed fully retired, not partially.
  Both `linkedin-instructions.md` and `youtube-metadata-instructions.md`
  state explicitly that they replace sections that used to live inside it.
  The authoring spec is now a base file per subject
  (`aws-standard-instructions.md`, `dsa-instructions.md`) plus delta/
  companion files layered on top (`aws-additional-lab-instructions.md`,
  `aws-presentation-instructions.md`, `video-slides-instructions.md`,
  `linkedin-instructions.md`, `youtube-metadata-instructions.md`).
  `PROJECT.md` §4 updated from a single `instructions.md` row to the full
  file list.
- ✅ Labs vs. Presentations subject scoping — **correction, not just an
  addition.** `PROJECT.md` previously said "Labs and Presentations are
  AWS-specific sub-pages." That's only true for Labs. Presentations are
  explicitly subject-agnostic per `aws-presentation-instructions.md` (kept
  under the AWS-named file only because AWS is where it's used most today)
  and `generate_notes_index.py`'s docstring ("Presentation Mode — see
  aws-presentation-instructions.md; any subject"). Corrected in §3.

**2026-07-02**
- ✅ `parse_visual_mcq.py` code-block premature termination — **fixed and
  tested.** Replaced the `re.match(r'^[a-z]+:', line)` end-of-code check
  with an explicit tuple of the block's real field prefixes
  (`q:`, `o:`, `c:`, `e:`, `d:`, `img:`, `type:`). Verified with a code
  sample containing `else:`, `except:`, and a dict-literal `key:` line
  (previously all three would have truncated the capture) — the full code
  block now comes through intact and the following fields parse correctly.
  Fixed file delivered to the user as `parse_visual_mcq.py`.
- ✅ **"AWS notes markdown→HTML pipeline — not started"** (was Open Item)
  — **this was stale, not actually true.** Direct review of the uploaded
  `generate_notes.py` (1768 lines) shows a fully built, working unified
  pipeline for both AWS and DSA. The open item's reference to `build.py`
  was an incorrect name — the real script has always been `generate_notes.py`.
  Removed from Open Items entirely rather than marked done, since it was
  never actually a gap.
- ✅ `quiz-page.js` `showError()` stale link (`href="quiz-list.html"` →
  `quiz-index.html`) — confirmed applied, per user. Not independently
  re-verified by Claude (no file provided this pass).
- ✅ `gallery.js` unreachable `callNavigation` fallback (`||` always
  truthy) — confirmed applied, per user. Not independently re-verified by
  Claude.
- ✅ `gallery.js` `loadImages()` path inconsistency (`'all'` branch vs.
  specific-folder branch) — confirmed resolved, per user. Not independently
  re-verified by Claude.
- ✅ `dsa-print.css` duplicate `.viz-tab`/`.viz-fullscreen-link` rules —
  confirmed cleaned up, per user. Not independently re-verified by Claude.
- ✅ Visualisation step counter printing raw template markup — confirmed
  fixed, per user. Not independently investigated by Claude.
- ✅ h3-level collapsible subsections not expanding on click — confirmed
  fixed, per user. Not independently investigated by Claude.
- ✅ `animation-core.js` stale `window.steps`/`current`/`animInput` (was
  open item, formerly bug #14) — **verified fixed** in the uploaded file:
  `renderCurrentStep()` now reassigns all three globals on every step
  change, `initAnimation()` call, and autoplay tick, and the file header
  now documents this explicitly. This was the "real fix" option that had
  been the leaning choice — confirmed applied, not just planned.
- ✅ Filter by Program / dead `"type"` field — dropped entirely. All notes
  default to program `"generic"`; `instructions.md` and
  `generate_notes_json.py` no longer reference a program field; the dead
  "Filter by Type" dropdown removed from `notes-index.html`;
  `data/index/programs.json` discarded (never shipped).
- ✅ `--info`/`--accent` CSS variable consolidation — re-verified directly
  against `styles.css`, `notes.css`, `quiz.css` (not just re-asserted from
  a prior session note). `styles.css` is the sole definition site across
  all three theme blocks; no leftover duplication or naming drift found.
- ✅ `slides.css` location — final decision: stays permanently at
  `css/notes/slides.css`. Not to be re-flagged unless the Presentations
  module is actually built.
- ✅ JSON `_metadata` headers on bare-array JSON files — **permanently
  rejected** (not just deferred). Would break every consumer that reads
  the file as a bare array/object at the root (e.g. `navigation.js` on
  `navigation-url.json`); not worth patching every consumer for
  authorship/last-updated provenance alone.

**2026-06-30 to 2026-07-01**
- Architecture refactor: `notes-page.js` + `dsa-page.js` duplication →
  single `notes-page-core.js` bootloader reading `data-subject`. Structurally
  fixes the old "callNavigation only fires on one branch" bug class.
- CSS palette consolidation across `styles.css` / `notes.css` / `slides.css`
  — `notes.css`'s values became the site-wide standard; duplicate
  `:root`/theme blocks removed from `notes.css`; `slides.css` variable names
  aligned (`--accent-warning` → `--warning`, etc.), values kept distinct.
- Doc-comment header rollout — complete across all 65 JS/CSS/HTML files,
  including path corrections in 6 CSS files and several JS files; CRLF → LF
  on 5 files.
- `quiz-page.js` `callNavigation` only firing on one branch + two debug
  `console.log` leftovers — fixed.
- `gallery.js` stale `notes-list.json` reference → `notes-index.json` — fixed.
- `notes-accessibility.js` hardcoded `"AWS training notes"` label — fixed to
  read `document.body.dataset.subject`, so DSA pages are labeled correctly.
- `dsa-notes.css` duplicate `.viz-tab-bar` rule — removed.
- `site-config.js` misleading `"Theme script loaded"` log — fixed.
- `footer.js` hardcoded `© 2025` — fixed to compute the current year.
- `404.html` missing `<script src="js/dashboard.js">` — added.
- `gallery.html` migration (inline GA/loader removed, hardcoded footer →
  `#footerRoot`, stale meta/canonical/JSON-LD values corrected) — complete.
- `shared-meta.js` bare `SiteConfig` reference — fixed to `window.SiteConfig`.
- `data-subject="aws|dsa"` attribute added to all real note page templates,
  satisfying the hard dependency for `notes-page-core.js` self-routing.

**Decided, not bugs** (no further action expected):
- Presentations module, if/when built, should be `slides.html`, not
  `ppt.html` — per user, for consistency with the existing `slides.css`
  system. Checked: no literal `ppt.html` exists anywhere in the codebase
  or current docs to rename; the only "ppt" mention found was inside the
  already-discarded Filter-by-Program naming scheme (a dead, never-shipped
  plan). This is filed as a forward decision, not an active rename.
- `navigation-url.json`'s Home entry has `"url": " "` (a space) instead of
  `"index.html"`, so the Home back-button gets a malformed `basePath + " "`.
  User confirmed current behavior (falls through to the main site) is
  acceptable for now — a deliberate deferral, not an active problem. Revisit
  as part of a future JSON cleanup batch rather than a standalone fix.
- Overview-only AWS note pages loading all 11 shared scripts unconditionally,
  each self-guarding with `if (!container) return` — accepted as-is.
- `index.html`'s `data-no-nav` (navigation.js loads but sits idle) — accepted.
- `404.html`'s breadcrumb resolves fine without a `"404"` entry in
  `navigation-url.json`, since the last segment is never looked up — no fix
  was ever needed here.
- `labs.html` as a standalone page — deprecated. Labs are `type:"lab"`
  entries in `notes-index.json`, opened via the notes-index folder modal.

---

## 2026-07-02 (build/deploy pipeline added)

**Files reviewed:** `README.md`, `minify.js`, `deploy.yml`, `tasks.json`,
plus a VS Code file-tree screenshot confirming the new folder layout
(`src/`, `dist/`, `tools/`, `.github/`, `.vscode/`).

**What changed:** a Node-based build/deploy pipeline was added. This isn't
a bug closure — it's a real architecture change, so it was written into
`PROJECT.md` directly (§2.b Tech Stack, §5.A Data Flow, new §5.6 Build &
Deploy Pipeline, §4 Other files table) rather than logged here as a
one-liner. Summary of what's now true:

- `src/` is the authoring tree (hand-written + Python-generated files,
  same structure as before). `dist/` is what GitHub Pages actually serves.
- `tools/minify.js` mirrors `src/` → `dist/` file-for-file (identical
  relative paths, so no link/path changes needed elsewhere), minifying
  HTML (via `html-minifier-terser`, with `<pre><code>` blocks specifically
  protected from mangling), CSS (`clean-css` level 2), JS (`terser`,
  `drop_console: true` + mangle), and JSON (compacted, not restructured).
  Unrecognized extensions are silently skipped, not copied.
- `.github/workflows/deploy.yml` — GitHub Actions, triggers on push to
  `main`: `npm ci` → `npm run build` → upload `dist/` → deploy to Pages.
  Fully automatic.
- `.vscode/tasks.json` — local-only "Build Website" task for building
  `dist/` without pushing. Confirmed gitignored, so it's a personal
  shortcut, not shared tooling.

**Not independently verified by Claude:** the actual contents of
`package.json`/`package-lock.json` (referenced by `npm ci`/`npm run build`
but not uploaded this session), and whether `dist/` is itself gitignored
or committed. Worth confirming if either becomes relevant later.

---

## 2026-07-02 (bug closures + PROJECT.md restructuring)

**Files reviewed this session:** `animation-core.js` (real file, direct
inspection), plus a session-log excerpt closing four other items (Filter by
Program, `--info`/`--accent` CSS consolidation, `slides.css` location, JSON
`_metadata` headers) that was carried into `PROJECT.md` §9 as-is.

### `animation-core.js` — bug #14 (stale `window.steps`/`current`/`animInput`)

**Closed. Confirmed applied — direct file inspection, not inference.**

Previous status: `window.steps`/`window.current`/`window.animInput` were
believed to be assigned once at file load (when `steps = []`), then never
updated as the local `steps`/`current`/`animInput` variables changed inside
`initAnimation()`, `goStep()`, and `autoPlay()`. Decision on a fix had been
deferred to JSON-driven feature planning, with a lean toward the "real fix":
re-assigning all three inside `renderCurrentStep()` on every call.

What the uploaded file actually shows:
```js
function renderCurrentStep() {
    const step = steps[current];
    if (!step) return;

    window.steps = steps;
    window.current = current;
    window.animInput = animInput;
    ...
}
```
`renderCurrentStep()` is called from `initAnimation()` (after the first
`buildVisual`), from `goStep()` (every prev/next click), and from
`autoPlay()` indirectly via `goStep()`. So the three globals are re-bound on
every step change, on init, and on every autoplay tick — exactly the "real
fix" option, already implemented. The file's header comment now also states
this explicitly ("Only one renderer is loaded per page...") and a comment
directly above the three assignments documents the live-sync behavior.

**Not independently re-verified:** whether any `renderer-*.js` file actually
*reads* `window.steps`/`window.current`/`window.animInput` (vs. reading the
plain local `steps`/`current` the way `animation-core.js` itself does) — no
renderer file was provided this session. If a renderer only needs the
window-scoped versions for external/debugging access rather than its own
rendering logic, this doesn't matter; worth a quick check if a renderer file
comes up in a future session.

### Other closures (carried from user-provided session-log excerpt)

These four were reported as closed/decided in a session-log excerpt handed
to Claude this session. Claude did not independently re-open or re-verify
them beyond what the excerpt already described (which itself claimed direct
file inspection for the CSS item) — recorded here for traceability:

- Filter by Program / dead `"type"` field — dropped per excerpt.
- `--info`/`--accent` CSS consolidation — re-verified per excerpt against
  `styles.css`/`quiz.css`/`notes.css`.
- `slides.css` location — decided to stay put, per excerpt.
- JSON `_metadata` headers — permanently rejected, per excerpt.

### PROJECT.md restructuring

`PROJECT.md` was decluttered this session: sections 1–6 (architecture
reference) kept verbatim, aside from adding a missing `## 6.` heading to an
orphaned feature-inventory block. Sections 7/8/10/11/13 (session-log-style
"Completed Work Log", "Bug List", "Bug-Fix Pass Status" sections, ~900 lines
combined) were consolidated into §7 (architecture reference), §8 (Open
Items), and a Change Log section. No content was silently dropped — every
open item and every closed item from the original file is represented,
just without the repeated narration across multiple sections.

**Follow-up same session:** the Change Log section was moved out of
`PROJECT.md` entirely and into this file (see "Closed & Decided Log" above),
per request — `PROJECT.md` now only carries architecture + open items + a
short process note pointing here. Final `PROJECT.md`: ~500 lines, down from
1331.

**Second follow-up, same session:** user reported items 1–4, 7, and 8 of
the then-8-item Open Items list as done (see "Closed & Decided Log" above).
These were taken on the user's word — Claude did not independently
re-inspect any of the underlying files for this batch. Open Items in
`PROJECT.md` is now down to 2: the `navigation-url.json` Home-space entry
(deferred/accepted, not a live bug) and the AWS markdown→HTML pipeline
(not started).

*(Correction, later same day: the "AWS markdown→HTML pipeline not started"
item above turned out to be stale — see the 2026-07-02 note-generation
review entry below. It's been removed from Open Items.)*

---

## 2026-07-02 (note generation system review — instructions + python/utils)

**Files reviewed:** `aws-standard-instructions.md`, `dsa-instructions.md`
(uploaded but not read in full — spot-checked relevant sections),
`aws-additional-lab-instructions.md`, `generate_notes.py` (read in full,
1768 lines), `animate.py`, and all uploaded `parse_*.py` files
(`checklist`, `contest`, `glossary`, `hands_on`, `interview`, `mcq`,
`problems`, `reflection`, `screenshot_guide`, `visual_mcq`).

**Purpose:** user asked (1) to rename any `ppt.html` references to
`slides.html`, and (2) to check for any other open bugs given these files.

### Finding 1 — `generate_notes.py` is a single unified script, not two

`PROJECT.md` had documented `generate_notes.py` (AWS) and
`generate_dsa_notes.py` (DSA) as two separate scripts. The real file is one
unified script (`generate_notes.py`, docstring: "Unified AWS + DSA Notes
Markdown → HTML converter") that auto-detects subject from frontmatter
`type` first, then filename prefix (`aws-*.md` / `dsa-*.md`). There is no
`generate_dsa_notes.py` anywhere. Corrected in `PROJECT.md` §5.5 (Python
scripts table, AWS/DSA folder structure notes, Subject differences table)
and §5.A (Data Flow diagram).

**Also found:** if a filename doesn't start with `aws-`/`dsa-` and
frontmatter `type` doesn't resolve either, `detect_subject()` defaults to
`"dsa"` (with a printed warning, not silent). Edge case, low risk since
Claude always names files correctly — noted here for completeness, not
added as an Open Item.

### Finding 2 — `animate.py` runs automatically, not as a separate step

`PROJECT.md` §5.A described running `animate.py [slug]` as a separate
manual step after `generate_notes.py`. The real code
(`generate_notes.py` line ~1664) calls `animate.run()` automatically as a
side effect whenever a DSA note has an `[animation]` block — wrapped in a
try/except so a failure there doesn't break the main HTML build. Corrected
in `PROJECT.md` §5.5 and §5.A.

### Finding 3 — AWS Hands-On Projects & Reflection Questions are static HTML, not JSON

Confirmed via `parse_hands_on.py`, `parse_reflection.py`, and their call
sites in `generate_notes.py`: unlike MCQ/glossary/interview/checklist,
these two AWS-only sections render straight to static HTML at generation
time (no `json/*.json` file, no JS renderer needed at runtime). This
wasn't documented anywhere in `PROJECT.md`'s AWS note folder structure —
added, along with `screenshot-guide.md` as a possible AWS output file
(via `parse_screenshot_guide.py`, expected on nearly every lab note, rare
on standard notes).

### Finding 4 — stale Open Item: "AWS pipeline not started"

The pre-existing Open Item referencing an unbuilt `build.py` pipeline for
AWS was simply wrong — `generate_notes.py` is a complete, working 1768-line
implementation. Removed from Open Items (see Closed & Decided Log above).

### Finding 5 — new bug: `parse_visual_mcq.py` code-block premature termination

The `code:` field's multi-line capture loop ends on any line matching
`^[a-z]+:` — intended to detect the start of the next field, but this
also matches ordinary code content like `else:`, `except:`, `finally:`,
`default:`, or a dict-literal `key:` line. Any of those inside a code
sample truncates the capture silently (the rest of the code is lost, not
just mis-parsed). Added to Open Items with a suggested fix: match only the
known visual-mcq field prefixes instead of any lowercase-word-then-colon
pattern.

### `ppt.html` → `slides.html`

Searched all newly uploaded files plus the current `PROJECT.md` and
`log-analysis.md` — no literal `ppt.html` exists anywhere. The only "ppt"
text found at all was inside the long-discarded Filter-by-Program naming
scheme (closed, never shipped — see Closed & Decided Log, 2026-07-02 entry
from the earlier session). Recorded the naming preference (`slides.html`,
not `ppt.html`) as a forward decision in `PROJECT.md`'s Feature Inventory,
next to the "Presentations module (not built)" line, so it's not lost
before that module actually gets built.

---

## 2026-07-02 (Presentation Mode / Video Slides — module now built)

**Files reviewed:** `aws-presentation-instructions.md`,
`video-slides-instructions.md`, `linkedin-instructions.md`,
`youtube-metadata-instructions.md`, `aws-additional-lab-instructions.md`
(re-read for cross-reference), `slides.js` (full file), `slides.css`
(header + spot-checked rules), `parse_slides.py` (header + spot-checked,
not read in full — 634 lines), `generate_notes.py` (grepped for
`TYPE_CONFIG`, `detect_subject`, presentation/video-slides routing —
not re-read in full this pass), `generate_notes_index.py` (full file, new
upload this session).

**Purpose:** user asked to update `PROJECT.md` and this file to reflect the
newly uploaded files.

### Finding 1 — the "Presentations module (referenced, not built)" line was stale

The previous session's entry (2026-07-02, note generation system review)
correctly found no `ppt.html` reference anywhere and recorded a *forward*
naming decision for "whenever the module is actually built." That module is
now built. `generate_notes.py` routes to it via `detect_presentation_mode()`
and `detect_video_slides_mode()` (both call into `utils/parse_slides.py`),
and a standalone `scan_and_build_video_slides()` function walks
`NOTES_ROOT` for `markdown/slides-overview.md` files to rebuild
`slides-overview.html` on existing note folders. Moved out of "Not yet
active" in `PROJECT.md`'s Feature Inventory into an active bullet, with a
new §5.5 subsection documenting both content types' folder structures.

### Finding 2 — two distinct content types share one deck engine

`aws-presentation-instructions.md` (Presentation Mode: rewrites an uploaded
`.pptx`/`.pdf`, own `[subject]-[slug]-slides/` folder, copyright-rewrite
rules apply) and `video-slides-instructions.md` (Video Slides: companion
deck built from an already-existing note, no upload, mandatory speaker
notes as the video script) are two different triggers and folder
conventions but call the exact same `parse_slides.py` builder and load the
exact same `slides.css`/`slides.js`. `parse_slides.py`'s own header
confirms this ("Both modes share every function in this file unchanged").
Documented both structures side by side in `PROJECT.md` §5.5, and noted the
ordering hazard: `generate_notes.py` must check the Video Slides trigger
before the Presentation Mode trigger, since a `-slides-overview.md` file
also internally sets `presentation: true` (reusing the same engine) and
would otherwise be misdetected.

### Finding 3 — Presentations are subject-agnostic; Labs are not

`PROJECT.md` §3 previously grouped Labs and Presentations together as
"AWS-specific sub-pages." `aws-presentation-instructions.md` states
explicitly it's kept under the AWS-named file only because AWS is where
it's used most today, but the mechanism (and `parse_slides.py`'s
`SUBJECT_LABELS`/`SUBJECT_KEYWORDS`) is subject-agnostic — a DSA
presentation deck is equally supported. `generate_notes_index.py`'s module
docstring confirms this too ("slides.html → type 'slides' ... any
subject"). Labs remain AWS-only (`aws-additional-lab-instructions.md` has
no DSA equivalent). Corrected in `PROJECT.md` §3.

### Finding 4 — the monolithic `instructions.md` is fully retired

Both `linkedin-instructions.md` and `youtube-metadata-instructions.md`
state they replace a section that "used to live inside the monolithic
instructions.md." Combined with the already-known delta-file split for
labs and presentations, this confirms the authoring spec is now: one base
file per subject (`aws-standard-instructions.md`, `dsa-instructions.md`)
plus five delta/companion files layered on top. `PROJECT.md` §4's "Other"
table previously listed a single generic `instructions.md` row — replaced
with the full file list and each file's role.

### Finding 5 — `generate_notes_json.py` renamed to `generate_notes_index.py`, scope grew

The newly uploaded `generate_notes_index.py` is functionally the successor
to the `generate_notes_json.py` referenced everywhere in the previous
`PROJECT.md` (same job: scan `src/data/notes/`, write
`data/index/notes-index.json`). Not independently confirmed that the old
filename is literally gone from the repo (no deletion/rename diff was
provided, only the new file) — treated as a rename based on identical
responsibility and no remaining reference to the old name in any uploaded
file. **New in this version:** it also upserts every note file's URL into
`sitemap.xml` directly via `sitemap_utils.add_url`/`write_sitemap`, in the
same `main()` run. This appears to overlap with the standalone
`generate_sitemap.py`'s job (not uploaded this session, so its current
scope wasn't checked). **Added as an Open Item** in `PROJECT.md` rather
than resolved, since whether this is intentional consolidation or
accidental duplication isn't verifiable from the files available this
session.

### Finding 6 — `slides.js` file location resolved

`aws-presentation-instructions.md` left the script's location as an
either/or: `js/notes/slides.js` or `js/slides/slides.js`. The actual
uploaded `slides.js` file's header comment states its path as
`js/notes/slides.js` — treated as the resolved answer, consistent with the
earlier permanent decision to keep `slides.css` at `css/notes/slides.css`
rather than splitting a `css/slides/`/`js/slides/` structure out. No further
action needed; recorded as closed in the Closed & Decided Log above.

**Not independently verified this session:** the full contents of
`generate_notes.py`'s presentation/video-slides routing code (only grepped
for key function/line matches, not read end to end), the full 634 lines of
`parse_slides.py` (header and slide-type list read, not every parsing
branch), and whether `generate_sitemap.py` itself has changed to avoid
double-writing URLs now that `generate_notes_index.py` also writes them
(that file wasn't part of this upload batch).
