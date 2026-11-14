# Notebook Buddy — Sprint Tickets (rewritten, 2026-08-09)

Replaces the previous `sprint-tickets.md`. Same rule as before: one
ticket = one executor chat, no outside context beyond the ticket text.
Reasoning/history stays in `CHANGELOG.md` — tickets state current scope
only.

**New this rewrite:** every ticket tags its own components by what they
touch — `[React]` / `[Python]` / `[Tailwind/CSS]` / `[JSON]` /
`[Content]` — instead of one undifferentiated "Files to modify" list.
Pure-decision tickets (no buildable work) are not listed as tickets
here anymore — they're in `CHANGELOG.md`.

---

## ✅ Status as of 2026-11-02 — halt lifted: prototype delivered, `Track UX` released

**Halt lifted 2026-11-02.** The prototype was supplied (`notebook_buddy_interactive_dashboard_settings_prototype.html`) and is the design reference; `Track PROTO` is closed and `Track UX` is released, to be built in the sequence at the end of the PREB file. **Unchanged and still binding:** the additive rule — the prototype is a *sample* of the look and of added features and omits many built features, so it never justifies removing anything. The original halt notice is kept below as history.

### Original halt notice (2026-10-31), kept

**ALL TICKETS HALTED for `Track PROTO` (prototype-first redesign).**

**Direction (2026-10-31):** every ticket in this file and in `sprint-tickets-tracks-PREB.md` is paused until a full-site prototype is signed off (`PROTO-8`, in the PREB file). Paused means not started or not continued — nothing here is cancelled, closed or reordered by this banner. Real-site changes start only after sign-off; the order for releasing halted tickets is the "Sequence" section at the end of the PREB file's `Track UX`.

**The additive rule, governing every change that follows:** keep every existing real feature; add the new experiences; remove or replace something only where a written decision (PREB `Track PROTO` §"Decision log", `D1`–`D8`) says so. The two prototype HTML files are a *sample* of the desired Dashboard look and of added features, not the end product — they omit many built features (for example Gallery's different views), and omission there is never a reason to remove anything.

**What this pass found by reading the 2026-10-05 upload directly (not from ticket text), and where each lands:**
- `NAV-1`'s chrome is built (`components/SidebarNav/SidebarNav.tsx`, mounted in `App.tsx`) but `Breadcrumb` is still rendered on 6 pages; regrouping the sidebar is the new `NAV-2`.
- Presentation links are dead in two places on the Notes index (`slides.html` raw paths) — new `PRES-1`.
- `P0-6` (Daily Goal) is not reachable, its MCQ progress has no caller, and mounting it as-is would double-count study time — reopened, new `DASH-4`.
- Design tokens in the approved prototype are a different vocabulary and different neutrals from the real app and the Brand Guide — new `UI-1`.
- The docs inside the upload predate the 2026-09-28 corrections (no `Track AUDIT`, `P0-1b`, `P0-9b`, `DX-5` in these copies); merge accordingly.

---

## Status as of 2026-08-16b (P1-1's real Python fix landed — `generate_notes.py` now stamps `blockId` correctly, confirmed with real tests)

**Headline this pass:** the `P1-1` bug documented below (still kept for historical accuracy — see the 2026-08-14b entry) is **fixed**. `generate_notes.py`'s `_extract_blocks()` now genuinely stamps a stable `blockId` on every block via a shared `emit()` wrapper, with 3 new real regression tests confirming uniqueness, document-order sequencing, and stability across regeneration. `web.zip` was unchanged in this upload — this was a Python-only fix. Downstream impact: `P1-1` ✅, `P1-2` ✅ (unblocked, not independently re-verified via click-through), `P3-2` ✅ (unblocked, both bookmark and highlight halves should now work), `E0-2`'s Revision Book variant ✅ (confirmed its code already correctly reads from real highlight data with no stub — needed no React-side work at all). **One exception, not fully resolved:** `T5-3c-6` (export highlights to `.txt`) is unblocked but still genuinely not built — its `exportHighlights()` function is still a literal stub in the unchanged `web.zip`, so its dependency clearing doesn't make it done. Full detail on each ticket's own entry.

## Status as of 2026-08-14b (re-verified against a NEWER `python.zip`/`web.zip` upload — the web checkout also restructured to `merged/`, real CI now exists, and a genuine cross-layer bug was found in `P1-1`)

**Headline finding this pass (historical — see 2026-08-16b above for the fix):** `P1-1` (Highlighting)'s React side is substantially built, but its Python half was never actually implemented — `generate_notes.py` never stamps the `blockId` field the React code (and one of its own comments) claims exists. This silently breaks highlighting end-to-end today, plus its two real downstream dependents (`P1-2`, half of `P3-2`, the Revision Book variant of `E0-2`). Full detail on `P1-1`'s own entry in `sprint-tickets-tracks-PREB.md` — read that before touching any of the highlighting-adjacent tickets.

**Whole-suite evidence:** not independently re-run this session — every status below is a direct source read against the new zips. Re-run the real suites before fully trusting pass counts.

| Ticket | Status |
|---|---|
| T0-1, T0-2 | ✅ Done |
| **T0-3** | ⚠️ **Corrected — a real, honest placeholder CI job now exists** (`.github/workflows/ci.yml`'s `python-tests` job explicitly labels itself a placeholder), but the ticket itself is still not done. New real finding: the CI's own comments reference a `python/.github/workflows/coverage.yml` that doesn't exist in the current `python.zip` — a genuine cross-repo gap, not just an unwired step. |
| T0-4 – T0-7 | ✅ Done |
| T1-1 – T1-3 | ✅ Done (vanilla, unchanged) |
| T1-4 | ✅ Done (unchanged from last session) |
| T1-5 | ✅ Done (unchanged) |
| T2-1 | ✅ Done |
| T3-1 – T3-3 | ✅ Done |
| **T3-4** | ✅ **Fully closed this session** — `QuizIndex.tsx` now genuinely sorts using `estimatedMinutes`, with a correct fallback (`?? Infinity`) for quizzes predating `PY-1`'s regeneration. |
| T3-5, T3-6 | ✅ Done |
| T3-7a, T3-7b, T3-7c | ✅ Done (unchanged) |
| T3-8, T3-9, T3-10 | ✅ Done (unchanged) |
| PY-1 | ✅ Done, both data and UI-consumption sides now confirmed closed (see `T3-4`). |
| T4-1 | ✅ Done |
| T5-1, T5-2 | ✅ Done |
| T5-3a, T5-3b | ✅ Done |
| T5-3c-1, T5-3c-2, T5-3c-3 | ✅ Done (unchanged) |
| **T5-3c-4** (jump-to-top + in-page search) | ✅ **Done — new this session.** Real `JumpToTopButton` + real match/scroll logic in `NoteSearchPanel.tsx`. |
| **T5-3c-5** (cross-tab favorites) | ✅ **Done — new this session.** Real `hooks/useNotesFavorites.ts`, genuine `storage` event listener, now the single shared implementation across `NotesIndex.tsx`/`Note.tsx`. |
| **T5-3c-6** (export highlights) | ⬜ **Unblocked (`P1-1` fixed 2026-08-16), but still genuinely not built** — `exportHighlights()` is still the literal stub, `web.zip` unchanged this session. |
| **T5-3c-7** (bookmark star) | ✅ **Done — new this session.** Real `BookmarkStar.tsx`, correctly anchors to `block.id` (unaffected by `P1-1`'s missing `blockId`). |
| T5-4a/b/c/d/e | ✅ Done (unchanged) |
| T6-1 | ⬜ Technically ready. Sequencing **corrected this session** — held until after the vanilla-independent half of Track R (`R0-1`/`R1-1`/`R4-1`), not "all of Track R" — the original note created a circular dependency with `R7-1` (see T6-1's own entry). |
| T7-1 | ⬜ Not started, deliberately deferred |
| **P0-3** | ✅ Done (unchanged) |
| **P0-5** | ⬜ Still not built — not re-checked this specific session, carried over |
| **P0-7, P0-9** | ✅ Done (unchanged) |
| **P0-8** (Reading Preferences) | ✅ **Done — new this session.** Barrel now imports `ReadingPreferencesSection`; real `readingPreferences.ts`/`ReadingPreferencesContext.tsx`. |
| **P1-1** (Highlighting) | ✅ **Fixed 2026-08-16 — see headline above.** Real `blockId` stamping now exists, with 3 new regression tests. |
| **P1-2** (Notes on highlights) | ✅ Unblocked — see `sprint-tickets-tracks-PREB.md`. |
| **P2-1, P2-2, P2-3, P2-4** (Stats/Streak/Achievements/Motivational) | ✅ **All done — new this session.** Real, carefully-implemented logic for each — see `sprint-tickets-tracks-PREB.md` for specifics. |
| **P3-1** (Search My Notes) | ✅ **Done — new this session.** Genuinely reuses `useSearch()`, confirmed via shared `SEARCH_FIELDS` export. |
| **P3-2** (Revision Mode) | ✅ Unblocked — both bookmark and highlight halves should now work, see `sprint-tickets-tracks-PREB.md`. |
| **P4-1** (JSON backup) | ✅ **Done — confirmed 2026-08-19.** Real, well-engineered whole-of-`localStorage` snapshot + version-aware restore. See `sprint-tickets-tracks-PREB.md`. |
| **P5-1** (Offline Mode) | ✅ **Confirmed real — opt-in shell matches recorded design.** Cache-strategy/unregister details not yet independently verified. See `sprint-tickets-tracks-PREB.md`. |
| **E0-1** (DOCX) | ✅ **Done — new this session.** |
| **E0-2** (EPUB) | ✅ **Fully done now — no stub, reads real highlight data.** |
| **E1-1** (PPTX) | ✅ **Done — new this session.** |
| **B-4a** (visual regression) | ✅ **Done — new this session.** Real Playwright suite (6 spec files) wired into the real CI. |
| **B-4b** (coverage tracking) | 🟡 **JS half done, Python half genuinely blocked** — same cross-repo gap as `T0-3`. |
| **B-4c** (Lighthouse) | ⬜ Still not built. |
| **B-6** (Popular Notes) | ✅ **Done — new this session.** Real `popular-notes.json` + `PopularNotes` component wired into `NotFound.tsx`. |
| T-CAL-1 | Unchanged |

**Everything else not listed above** (remaining Track R tickets, `P4-1`'s siblings not already covered) — not re-checked this session.

**New, undocumented in either ticket file — found last session, still true:** the real `/calendar` route and standalone dashboard card. See `T-CAL-1`.

**Policy, still in effect:** vanilla remains frozen; the one exception (`T1-4`) was exercised last session and isn't reopened by anything found this session.

**Repo-structure note:** this session's `web.zip` unpacks to a top-level `merged/` directory (previously `web/web/`), and includes real `.github/`, `e2e/` (Playwright), and `playwright.config.ts` that didn't exist before — consistent with the CI file's own comments about "the two checkouts merging." Worth asking directly what `merged/` represents (a monorepo consolidation of the `web/` and `python/` deliverables?) since it changes where some cross-cutting tickets (`T0-3`, `B-4b`) actually get resolved.

---

## Tier 0

### T0-1 — Centralize the sitemap domain constant
**Components:** [Python] `site_config.py`
**Status:** ✅ Done, confirmed directly against real code.

**Reverse-engineered detail:** `utils/site_config.py` exports one `BASE_URL` constant. All 4 scripts that are actually wired into `dashboard.py`'s pipeline (`generate_notes.py`, `generate_notes_index.py`, `generate_sitemap.py`, `generate_quiz_index.py`) import it — confirmed via direct grep, not inferred. Two files still hardcode the old `/Resources/` domain string (`generate_notes_backup.py`, `generate_dsa_notes.py`), but neither is referenced anywhere in `dashboard.py`, confirmed by grepping for their names across every `.py` file — genuinely dead code, not a live bug, and out of this ticket's scope (nothing calls them, so nothing consuming the wrong domain).

Separately, `utils/sitemap.py` had declared its *own*, second, unused `BASE_URL` constant — a real duplicate-source-of-truth risk even though nothing consumed it. Confirmed removed as part of `T5-2`'s later cleanup pass, not this ticket — noted here so no one re-adds it thinking `T0-1` missed it.

**Files involved:** `utils/site_config.py` (the constant), the 4 pipeline scripts (consumers).

**Done when:**
- [x] `BASE_URL` defined in exactly one place
- [x] All 4 live pipeline scripts import from it, zero hardcoded domain strings among them
- [x] Confirmed the 2 dead scripts are genuinely unreferenced, not silently still in use somewhere

**Manual test cases:**
1. Run `generate_sitemap.py` against a small fixture set, inspect every URL in the output — all share the same domain, sourced from `site_config.py`.
2. Grep the entire Python source tree for the old `/Resources/` domain string — hits should be confined to the 2 known-dead scripts only.
3. Temporarily change `BASE_URL`'s value, re-run all 4 pipeline scripts, confirm every one of them picks up the new value with no separate edit needed.

### T0-2 — Remove `pytest` from npm dependencies
**Components:** [Config] `package.json`
**Status:** ✅ Done, confirmed directly — real `package.json`'s `devDependencies` list has zero mention of `pytest` (it's a Python tool; its presence in an `npm` manifest at all was the original bug this ticket fixed — a copy-paste artifact from some earlier scaffolding step, not a real dependency either ecosystem needs from the other).

**Manual test cases:**
1. `npm ls pytest` from the `web/` directory — no output, confirms it's not installed as an npm package.
2. Confirm Python's own `pytest` still installs and runs correctly via `pip`/`requirements` — this ticket removes a *misplaced* declaration, not the tool itself.

### T0-3 — Wire pytest into CI
**Update 2026-11-14:** the *deploy* workflow's own pytest step (`deploy.yml`) had been failing on GitHub — it ran `pytest python/tests/` from the repo root, where the pipeline's relative data paths do not resolve ("subjects.json not found"), so nothing was deployed. The PR check (`coverage.yml`) was unaffected because it already ran from `python/`. Fixed under `DX-6`.

**Amended 2026-09-23 (from `Track AUDIT`, `AUDIT-0`):** 🟡 resolved with a real nuance, not a clean ✅ — `.github/workflows/coverage.yml` runs the actual `python/` pytest suite for real, but with `continue-on-error: true`: it reports failures, it does not gate merges. **Decided 2026-11-06 (`D16`): the pytest step becomes blocking** (see Done-when below).

**Components:** [CI]
**Status:** ⚠️ **Corrected 2026-08-17 — simpler than previously framed, real work, not blocked on anything.** A real `.github/workflows/ci.yml` exists with an honest placeholder `python-tests` job (`"pytest (Python pipeline) — placeholder, see T0-3"`, real `echo` statements explaining why it's not wired). **Earlier "cross-repo gap" framing was wrong, corrected directly by you:** the main project repo is one monorepo with `.github/`, `python/`, `web/`, `src/` as top-level siblings — `.github/` is shared at the true root, `python/` never had its own `.github/` and was never supposed to. There's no missing file to wait on and no repo-merge to wait for. The real remaining work is just: wire a genuine `pytest` invocation into the one shared `ci.yml`, pointed at the `python/` subtree of the full repo.

**What would need checking once this is done:** does a failing Python test fail the whole CI run (red), or only warn? Is it gated on the same PR-merge check as the JS test suite?

**Manual test cases:**
1. Push a commit that intentionally breaks one Python test, confirm the CI run goes red, not green-with-a-warning.
2. Confirm the pytest step executes the full suite, not a subset.
**Done when (added 2026-11-03):** [x] a workflow runs the real `python/` pytest suite on push/PR (`.github/workflows/coverage.yml`); [x] **decided 2026-11-06 (`D16`): make the pytest step blocking** — remove `continue-on-error: true` from the pytest step of `.github/workflows/coverage.yml` while keeping the coverage summary non-blocking; [ ] a deliberately failing test is shown to fail the check; [ ] enable branch protection requiring the check (a GitHub repository setting, not in the repo — a manual step for you). `deploy.yml` already runs `pytest python/tests/` before every deploy. Visual regression (`B-4a`) and Lighthouse (`B-4c`) stay non-blocking until after the restyle (`ticket-queue.md` Batch 6).

### NAV-1 — Persistent sidebar navigation, replacing `Breadcrumb` app-wide
**Re-test 2026-11-14 (your local run):** the Note page has a breadcrumb **and** a Back link; the Quiz page has neither. The two pages disagree, so `Breadcrumb` removal must not leave a page without a way back — the shared Back control is **`NAV-3`**, built together with this removal.

**Components:** [React] · **Status:** 🟡 **Re-checked 2026-10-31 against the 2026-10-05 upload — the chrome is built, the `Breadcrumb` removal is not.** `components/SidebarNav/SidebarNav.tsx` is mounted once in `App.tsx` and renders all three shapes (desktop sidebar, tablet icon rail, mobile bottom bar with a `More` sheet; landmarks `aria-label="Main navigation"` and `"More navigation"`). It holds two flat arrays: `PRIMARY_ITEMS` (Home `/`, AWS `/notes-index/aws`, DSA `/notes-index/dsa`, Quizzes `/quiz-index`, Calendar `/calendar`) and `SECONDARY_ITEMS` (Gallery, Search My Notes, Export, Settings, Contact). `<Breadcrumb>` is still rendered on the 6 pages named below in this upload (the 2026-09-28 snapshot, which is not in these docs, says it was retired — **verify on the next upload before closing**). Regrouping the items into Learn / Plan / Library + System & Tools is **`NAV-2`**, not this ticket. *Original status line, kept as history:* ⬜ Not started — **scope rewritten 2026-08-19, superseding the original framing entirely.**

**What changed and why:** originally scoped as "add `Breadcrumb`/back-navigation to `Settings`/`Calendar`/`Quiz`/`Export`, the 4 real pages missing it." That's no longer the right fix. **`R2-1` (persistent sidebar nav) has been reopened and reversed** — the design work (real mockups, web light/dark/tablet + a mobile app bottom-tab pattern) made a real case for it, and the decision was made directly: adopt the sidebar, remove breadcrumbs and back buttons entirely. `R2-1`'s original 2026-08-13 closure ("Option A: breadcrumb-only, no sidebar," reasoned and on record in `CHANGELOG.md`) is superseded, not silently forgotten — both decisions are real and dated, this one is just newer.

**Real full scope, now app-wide, not 4 pages:**
- Build the persistent sidebar (web) + collapsible icon-only rail (tablet, per the design) + bottom tab bar (mobile app) as real, shared navigation chrome — this is the actual fix for every page that had a "how do I get back" problem, `Settings`/`Calendar`/`Quiz`/`Export` included.
- **Remove `Breadcrumb` entirely, not just skip adding it** — it's currently real and rendered on 6 pages (`Note`, `NotesIndex`, `QuizIndex`, `Gallery`, `SearchMyNotes`, `Slides`). All 6 need the component removed once the sidebar covers their navigation need, not just left in place alongside a new sidebar (redundant, not additive).
- Confirm no page relied on `Breadcrumb` for something sidebar navigation doesn't cover — e.g. `Note`'s breadcrumb showed `Home / AWS / <note title>`, a real content-hierarchy trail a flat sidebar item list doesn't automatically replace. Worth an explicit check per page, not assumed identical.

**Contact/NotFound:** unaffected either way — never had `Breadcrumb`, not expected to gain sidebar-dependent behavior beyond what the sidebar already gives every page for free.

**Real shared-resource classification:** this is exactly a shared-resource-track item per the page-by-page process — sidebar nav isn't Dashboard-specific, it's app-shell chrome touching every page. Goes in the shared-resources track once that track exists, not folded into Dashboard's own track.

**Done when:**
- [ ] Sidebar (web), icon-rail (tablet), bottom-tab bar (app) all real and wired to real routes
- [ ] `Breadcrumb` removed from all 6 pages that currently render it
- [ ] Each removed breadcrumb's content-hierarchy info (e.g. `Note`'s subject trail) accounted for somewhere, not silently dropped — **updated 2026-08-22: real finding changes the recommendation.** `lib/navigation.ts` (undocumented until now, found in a full completeness sweep) is `Breadcrumb`'s actual real data source — it defines the trail precisely as `NavEntry[]` (title/emoji/url) with two hardcoded rules: **last item = current page (no link), second-last item = the real back-button target.** Removing `Breadcrumb` doesn't just drop cosmetic text, it drops a defined back-navigation target more specific than a generic "go to sidebar" fallback. Recommendation revised: keep `lib/navigation.ts` as-is and repoint its consumer — instead of rendering a breadcrumb bar, use its `NavEntry[]` output to (a) show the page-header subtitle as before, AND (b) drive the sidebar's active-item highlighting/expansion, so the "second-last item" concept maps onto "which sidebar item is expanded/active" rather than being silently dropped.
- [ ] `Settings`/`Calendar`/`Quiz`/`Export` confirmed to have a real way back via the sidebar (the original report's actual concern, now solved structurally rather than patched per-page)

**Manual test cases:**
1. Land on each of the 10 real pages (the 6 that had `Breadcrumb`, plus `Settings`/`Calendar`/`Quiz`/`Export`) via direct URL, confirm the sidebar/rail/tab-bar gives a real way to navigate elsewhere without the browser back button.
2. Confirm `Breadcrumb`'s old content-hierarchy info (subject/note title trail) isn't silently lost — check where it went.
3. Resize through tablet width, confirm the sidebar correctly collapses to the icon-only rail per the design, not just disappearing.
4. Mobile: confirm the bottom tab bar's 6 destinations (Home/AWS/DSA/Quiz/Calendar/More) all route correctly, and `More` reaches the new About/legal screen (see the Dashboard design's "APP – More" mockup).

### NAV-2 — Regroup the sidebar into Learn / Plan / Library + System & Tools
**Components:** [React] · **Depends on:** `NAV-1` (chrome exists; this changes its item model only) · **Blocks:** nothing; pages for the Plan/Library items arrive through their own tickets (see the table) · **Status:** ⬜ Ready — released 2026-11-02 (`PROTO-8` signed off; decision `D1`).

**Real evidence, read from the 2026-10-05 upload:** `SidebarNav.tsx` has two flat arrays (`PRIMARY_ITEMS` × 5, `SECONDARY_ITEMS` × 5), an `isActive(pathname, matchPrefix)` helper, and a mobile bar showing the 5 primary items plus a `More` button that opens a sheet listing the secondary items. There are no group headings. There is no *Notes* (all subjects) entry and no *Presentations* entry. AWS and DSA are **path** routes (`/notes-index/aws`, `/notes-index/dsa`); the old `?subject=` query is redirected by `NotesRoute`, so new links must not be built with it. `NotesIndex` reads only `q` from the query string — there is **no `type` parameter today**, so the Labs shortcut below needs a small addition. There is **no holding page** in `pages/` (`Calendar Contact Export Gallery LinkPage NotFound Note NotesIndex Quiz QuizIndex SearchMyNotes Settings Slides`).

**Target model (decision `D1`):**

| Group | Item | Route | Exists today? |
|---|---|---|---|
| **Learn** | Home | `/` | ✅ |
| | AWS | `/notes-index/aws` | ✅ |
| | DSA | `/notes-index/dsa` | ✅ |
| | Notes | `/notes-index` (all subjects) | ✅ |
| | Quiz | `/quiz-index` | ✅ |
| | Presentations | `/presentations` | ⬜ `PRES-1` |
| **Plan** | Study Loop | `/study-loop` | ⬜ `DASH-7` / `S3-1` |
| | My Learning | `/my-learning` | ⬜ `N1-2` |
| | Revision Center | `/revision` | ⬜ `V0-1` |
| | Calendar | `/calendar` | ✅ |
| **Library** | Gallery | `/gallery` | ✅ |
| | Games | `/games` | ⬜ Track G |
| | Labs | `/notes-index?type=lab` (shortcut, **not a page** — decision `D5`) | ✅ filter exists; URL param ⬜ (this ticket) |
| | Search My Notes | `/search-my-notes` | ✅ (kept under the additive rule; it was missing from the 2026-10-31 Library list) |
| **System & Tools** (separate area) | Settings | `/settings` | ✅ |
| | Export | `/export` | ✅ |
| | Contact | `/contact` | ✅ |

**Scope:**
1. Replace the two flat arrays with one grouped model: `NAV_GROUPS: { id, label, items: NavItem[] }[]`, `NavItem` gaining optional `status?: 'soon'`. Render group headings in the desktop sidebar and in the mobile `More` sheet; on the tablet rail, show a thin separator between groups and keep each item's `aria-label`/tooltip.
2. **Mobile bottom bar keeps its 5 tabs + `More`** (Home, AWS, DSA, Quizzes, Calendar) — unchanged. `More` lists Plan, Library and System & Tools with their headings, so nothing in the old More sheet is lost.
3. Add a minimal **`ComingSoon` page** (`/coming-soon?feature=<name>`, own route, `PageMeta`, "Back to Dashboard" and "Browse Notes" links). Items whose route does not exist yet are drawn with a **Soon** pill and navigate here. **Built items never get the pill, and are never routed here, even when their data is empty** (decision `D7`). When an item's real page ships, only its `status` flag and route change.
4. `NotesIndex` reads an optional `type` query parameter (`notes` / `lab` / `slides`) and pre-selects the existing Type filter. Unknown values are ignored. Additive: existing `?q=` behaviour unchanged.
5. Group headings use `role="group"` + `aria-labelledby`; the active-item highlight must still work for nested subject routes (AWS highlighted on `/notes-index/aws`, **Notes** highlighted on `/notes-index` only).

**Done when:**
- [ ] Desktop sidebar and mobile `More` sheet show the 4 groups with headings; tablet rail shows icons with separators
- [ ] Every ✅ row in the table routes to its real page; Labs lands on Notes with **Type = Lab** pre-selected
- [ ] Every ⬜ row shows a Soon pill and routes to `/coming-soon?feature=…`; no ✅ row does
- [ ] Mobile bottom bar still shows exactly Home / AWS / DSA / Quizzes / Calendar / More
- [ ] `SidebarNav.test.tsx` updated (grouped rendering, active state, Soon pill, More sheet) and new tests for `?type=lab` and the `ComingSoon` page; existing tests still pass
- [ ] `Breadcrumb` status unchanged by this ticket (that is `NAV-1`)

**Manual test cases:**
1. At desktop width, confirm the four group headings and every item appear in the order above; click each ✅ item and confirm it lands on a real page with the right item highlighted.
2. Click **Labs**; confirm Notes opens with the Type filter showing *Lab* and only lab entries listed. Open `/notes-index?type=bogus`; confirm it behaves like an unfiltered list, no crash.
3. Click **Study Loop** (not built); confirm the Soon pill is visible beforehand and the click opens the holding page, whose Back link returns to the Dashboard.
4. Resize to tablet width; confirm group separators and tooltips on the icon rail. Resize to mobile; confirm the bar shows 5 tabs + More and the More sheet lists Plan / Library / System & Tools.
5. Tab through the sidebar with the keyboard; confirm group headings are announced (screen reader or accessibility tree) and focus order follows visual order.

### NAV-3 — One consistent "Back" control on detail pages (Note, Quiz, Slides)
**Components:** [React] · **Depends on:** `NAV-1` (the sidebar exists) · **Status:** ⬜ Ready; build it **with** the `Breadcrumb` removal, not after.
**Real evidence (your local test and screenshots, 2026-11-14; code check of the 2026-10-05 upload):** the Note page shows a `Breadcrumb` ("Home / AWS / <title>") **and** a "← Back" link, and the note title appears twice at the top (once beside Back, once as the page heading). The Quiz player shows **neither** a breadcrumb nor a Back control — only the sidebar. `<Breadcrumb>` is rendered on six pages (Gallery, Quiz Index, Slides, Notes Index, Note, Search My Notes) and not on the Quiz player, so removing breadcrumbs (`NAV-1`) would leave the Note and Slides pages with a Back link only if it is kept, and the Quiz page with none.
**Scope:** one shared component, e.g. `components/BackLink`, used by **Note, Quiz player and Slides**:
1. Label "← Back", top-left of the page content, above the title; it holds **no title text** (the title appears once, as the heading).
2. Behaviour: if the visitor arrived from another page inside the app, go back one step (`navigate(-1)`); if the page was opened directly (a shared link, a fresh tab), go to its parent list instead: Note → `/notes-index/<subject>`, Quiz → `/quiz-index`, Slides → the note's page or `/notes-index`.
3. Keyboard-reachable, visible focus ring, an accessible name that says where it goes ("Back to Quizzes").
4. The list pages (Notes Index, Quiz Index, Gallery, Search My Notes) get no Back control — they are top-level destinations in the sidebar.
**Done when:** [ ] Note, Quiz and Slides all show the same Back control; [ ] no page shows a breadcrumb and a Back control together; [ ] opening a note directly (new tab) and pressing Back lands on its list, not on a blank tab or another site; [ ] navigating list → note → Back returns to the same scroll position and filters where the browser allows; [ ] the note title appears once at the top of the Note page; [ ] component tests cover both behaviours (history present / direct open).
**Manual test cases:** from Notes Index open a note, press Back; open the same note URL in a new tab, press Back; repeat for a quiz and a deck; tab to the control and confirm the focus ring.

### T0-4 — Delete duplicated `.theme-toggle` + hardcoded markup
**🗄️ LEGACY/VANILLA — frozen, historical record only, not active work.**
**Components:** [Vanilla/CSS] · **Status:** ✅ Done (vanilla-only — excluded from this document's React-focused manual test log per your instruction, kept here only because the ticket itself predates the vanilla-exclusion decision and still needs a status record).

### T0-5 — React project scaffolding
**Components:** [React] [Config]
**Status:** ✅ Done, confirmed via a full clean install/build/test/lint pass this session, not self-reported.

**Reverse-engineered detail — the real stack, exact versions from `package.json`:** Vite 8, React 19.2, TypeScript ~6.0 (project-references build via `tsc -b`), Tailwind 3.4, React Router 7.18, `lucide-react` 1.30 for icons, `flexsearch` 0.8 (this is what actually powers `useSearch()` across Notes-index/Quiz-index/Gallery — worth knowing when touching search behavior anywhere in the app). Test stack: Vitest 4.1, Testing Library (`@testing-library/react` 16.3, `jest-dom` 6.9, `user-event` 14.6), `jsdom` environment. Lint: `oxlint`, not ESLint — a faster Rust-based linter, means some ESLint-specific plugin ecosystem assumptions won't apply if anyone reaches for one later.

**A real, non-obvious detail:** `predev`/`prebuild` npm scripts both run `generate:assets` (→ `node scripts/build-assets.mjs`) automatically before `dev`/`build` — the asset pipeline described in `ASSET-TODO.md` isn't a manual step someone has to remember, it's wired into the standard dev/build commands already.

**GitHub Pages base path handling:** `vite.config.ts` sets `base: '/ResourcesV2/'` explicitly, with a comment noting Vite rewrites root-absolute paths in `index.html` and build output to include this prefix — relevant for anyone debugging a broken asset path locally vs. in the deployed project-subpath environment; `npm run dev`/`preview` and the real deployed site resolve paths differently because of this.

**Done when:**
- [x] Fresh clone installs and builds cleanly
- [x] Full test suite passes
- [x] Base-path handling correct for GitHub Pages project-subpath hosting

**Manual test cases:**
1. Fresh clone (or `rm -rf node_modules dist`), run `npm install && npm run build && npm run test -- --run` — all green, no manual fixups required.
2. Run `npm run dev` locally, confirm assets resolve correctly at the dev server's root path.
3. Run `npm run build && npm run preview`, confirm assets resolve correctly under the `/ResourcesV2/` prefix this time — these are genuinely different code paths (dev server vs. built output base path), both need checking, not just one.

### T0-6 — Fix `LICENSE.md`'s stale contact link
**Components:** [Content]
**Status:** ✅ Done (not independently re-verified this session — low-risk, single static link, no code path to check).
**Manual test:** click the link in `LICENSE.md`, confirm it resolves to the intended destination, not a 404 or an unrelated page.

### T0-7 — React unit/component test infrastructure
**Components:** [React] [Config]
**Status:** ✅ Done, confirmed this session: clean `npm run test -- --run` → **504/504 passing across 68 files**.

**Reverse-engineered detail — the real global test setup (`src/test/setup.ts`), worth knowing before writing new tests:**
```ts
afterEach(() => {
  cleanup();
  document.getElementById('app-live-region')?.remove();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});
```
Three things happen automatically after every single test, not just RTL's standard `cleanup()`: the shared `#app-live-region` DOM node (from `lib/liveRegion.ts`, used for accessibility announcements) is explicitly removed — its own comment notes this node is *intentionally* not cleaned up by the app itself between calls (it's meant to persist for the app's real lifetime), so tests have to reset it manually or a later test could see a stale live-region node left by an earlier one. `localStorage.clear()` — meaning **any test relying on persisted state must set it up within that same test**, not assume a previous test's `localStorage` writes survive. `data-theme` attribute reset — meaning theme state also doesn't leak between tests.

**Practical implication for anyone writing a new test:** if a test seems to intermittently fail depending on run order, the most likely cause given this setup is a test that assumed some `localStorage`/live-region/theme state would still be there from a previous test — check `setup.ts`'s reset list first before assuming a flaky test framework issue.

**Done when:**
- [x] Test infra in place, real component tests running against it
- [x] Global reset behavior prevents cross-test state leakage

**Manual test cases:**
1. Run `npm run test -- --run`, confirm pass count and file count — flag to yourself if either drops significantly between sessions (a silent test-suite shrink, e.g. from a test file accidentally excluded by a config change, is worse than a visible failure).
2. Write one throwaway test that reads `localStorage` without setting it up itself, confirm it correctly sees an empty store (not a leftover value) — proves the reset behavior above is actually active, not just documented.

---

## Tier 1

### T1-1 — Consolidate `notes-index.css`/`gallery.css` shared listing UI
**🗄️ LEGACY/VANILLA — frozen, historical record only, not active work.**
**Components:** [Vanilla/CSS] · **Status:** ✅ Done (vanilla, excluded from the React-only manual test log per your instruction).

**Real React-era successor, for context (not this ticket's own scope, but worth recording here since it's the direct continuation of this ticket's intent):** confirmed by direct import comparison, `NotesIndex.tsx`, `QuizIndex.tsx`, and `Gallery.tsx` all import the identical set of shared listing components — `SelectedChip`, `FilterGroup`, `Breadcrumb`, `CardQuickActions`, `ViewModeToggle`, `PageMeta`, plus `CompletionBadge`/`ProgressBar`/`QuickFiltersBar`/`Pagination` on the two index pages. This is the real, verified continuation of "one shared listing UI, not three lookalikes" into the React port — `T1-1`'s original vanilla-CSS consolidation effectively became full component-level sharing once `T3-3`/`T3-4`/`T4-1` landed.

### T1-2 — `slides.html`: windowed/fullscreen chrome
**🗄️ LEGACY/VANILLA — frozen, historical record only, not active work.**
**Components:** [Vanilla] · **Status:** ✅ Done (vanilla, excluded from React-only manual test log). Superseded by `T5-4` once that ships — `T5-4`'s own ticket text explicitly requires porting this exact chrome behavior, not re-inventing it.

### T1-3 — Fix the "no icon" fallback mismatch
**🗄️ LEGACY/VANILLA — frozen, historical record only, not active work.**
**Components:** [Vanilla/CSS] · **Status:** ✅ Done (vanilla, excluded from React-only manual test log).

**Real React-era successor, confirmed directly:** this is the exact behavior `DashboardCardsGrid.tsx` line 156 ports forward — `card.icon || fallbackIcon`, where `fallbackIcon` comes from `category-icons.json`'s `default.icon` — same "if this specific item has no icon, fall back to the site-wide default" contract as the original vanilla fix, now implemented in React and confirmed working (see `T3-9`'s full verification above).

### T1-4 — Standardize DSA animation theming across light/dark/comfort
**Components:** [Python] `animate.py` · [CSS] `animation-core.css`
**Status:** ✅ **Done — resolved this session.** Both Done-when items are now real, and the freeze conflict flagged last session was resolved by exercising a narrow, one-time exception to edit `animation-core.css` directly, rather than any of the CSS-avoidance workarounds — confirmed via the file's own header comment: `Last Updated: 2026-08-13 (T1-4 — theming pass)`.

**What changed, confirmed directly against the uploaded `animation-core.css`:** structural chrome — page/panel backgrounds, borders, primary/secondary/muted text, `.run-btn`, `.cell`'s base state, `.node-circle`'s base state, `.status-bar`, `.ctrl-btn`'s base state — now uses `var(--bg-primary)`/`var(--bg-card)`/`var(--text-primary)`/`var(--text-muted)`/`var(--border-color)`/`var(--primary)`/`var(--primary-hover)` throughout, all 7 of which are exactly the variables `animate.py`'s inline `<style>` block defines for `light`/`dark`/`comfort` — confirmed matching name-for-name.

**Deliberately still hardcoded, and correctly so — not a leftover gap:** semantic/feedback colors (`.pointer-low/mid/high/i/j`, `.cell`'s `active`/`eliminated`/`found`/`compared`/`swapped` states, SVG node/edge `active`/`visited`/`found` states, `.decision-banner`'s amber alert, `.status-bar`'s `val-low/high/mid/found/notfound`, `.ctrl-btn.primary`'s indigo accent) stay constant regardless of theme. The file's own header comment explains why: these encode what's happening in the algorithm, not page chrome, and match the same "constant regardless of theme" convention `val-low`/`val-high` already follow elsewhere in the real app. This is a real, reasoned design decision, not an oversight — don't file it as a remaining gap.

**On the freeze:** this was a deliberate, narrow exception — one file, directly tied to unblocking `T6-1`, not a reopening of vanilla work generally. The freeze policy (no further vanilla changes otherwise) still stands; see the status header's note.

**Done when:**
- [x] `animate.py`'s `build_animation_html()` reads `localStorage.getItem('theme')` on load and sets `data-theme`
- [x] `animation-core.css`'s structural chrome uses the shared theme CSS variables, not hardcoded hex (semantic/feedback colors correctly excluded by design)
- [ ] `DsaAnimation.tsx` re-verified — not independently re-checked this session, low-risk since the component's own job (embedding the already-themed iframe) doesn't change

**Manual test cases:**
1. Set site theme to dark, open a DSA animation via a fresh direct load, confirm both the outer chrome AND the structural elements (input panel, step label, status bar, buttons) all theme correctly — this now passes end-to-end, not just the body background.
2. Confirm semantic colors (found/eliminated/active states, decision banner, ctrl-btn.primary) render identically regardless of theme — this is intentional, verify it's not accidentally reverted in a future edit.
3. Regression: re-run `T5-3b`'s manual tests.

### T1-5 — Notes MCQ ↔ Quiz schema unification + "Open as Quiz" link
**Components:** [Python] ✅ done (via `T5-2`) · [React] ✅ **done — new this session**
**Status:** ✅ **Corrected — was Partial, confirmed fully done against the new `web.zip`.**

**Real, confirmed implementation:** `McqModule.tsx` has a real `<Link to={`/quiz/${folder}?source=notes`}>`. Both of the ticket's original open questions are answered in shipped code, not left implicit:
1. **Ad-hoc load without registration:** `useQuizEngine.ts` now takes an optional `source: 'notes'` param — when set, it fetches the note's `mcq.json` directly (`/data/notes/<folder>/json/mcq.json`) instead of the standalone `/data/quiz/<quizId>.json` path, and never touches `quiz-index.json` at all. No registration needed either way, confirmed by reading the fetch logic directly.
2. **Fresh attempt vs. shared progress:** confirmed as a deliberate fresh-attempt design — `quizProgressKey`/`quizHistoryKey` key off the folder the same way a real quiz file id would, independent of `notesMcqProgressKey`'s separate `notes_mcq_progress_<folder>` entry. Two different keys, two different attempts, by design (per the code's own comment).

`Quiz.tsx`'s `canonicalPath` also correctly includes `?source=notes` when present now — this was independently flagged as a possible gap in the prior session and is now confirmed fixed in the same commit as the rest of this ticket.

**Done when:**
- [x] Link/button visibly present on notes-embedded MCQ modules
- [x] Clicking it lands on a real, working standalone quiz view of the exact same questions
- [x] Both open questions above have explicit answers recorded in code

**Manual test cases:**
1. Open a note with an embedded MCQ, confirm the "Open as Quiz" link is present and navigates to `/quiz/<folder>?source=notes`.
2. Click it, confirm it loads that note's `mcq.json` content directly, same question set, same order.
3. Confirm the embedded MCQ's own progress (`notes_mcq_progress_<folder>`) is untouched by taking the standalone version — the two keys are genuinely independent, confirm both exist separately in `localStorage` after doing both.
4. Share the standalone quiz URL (via `ShareQR` or copy-link), confirm the `?source=notes` param survives and the canonical/OG URL reflects it too.

---

## Tier 2

### T2-1 — React state-management decision (Context API)
**Components:** [React]
**Status:** ✅ Done, confirmed directly against real code.

**Reverse-engineered detail:** 4 real contexts exist — `ThemeContext`, `ProfileContext`, `AppearanceContext`, `A11yContext` (one per `P0-2`/`P0-1`/`P0-2`/`P0-9`'s settings domains) — each a standalone `createContext` + `Provider` + a `useX()` hook that throws if called outside its provider (`if (!ctx) throw new Error('useA11y must be used within an A11yProvider')` — same pattern repeated identically across all 4, confirmed). **Deliberately siblings, not nested inside one another** — `AppearanceContext`'s own comment states this explicitly ("Deliberately a sibling of ThemeProvider, not nested inside/around it"), and `App.tsx`'s real provider composition confirms it: `ThemeProvider` → `ProfileProvider` → `AppearanceProvider` → `A11yProvider`, a flat stack, not nested pairs. This was a real architectural choice, not an oversight — each settings domain is independent, so nesting them would create false coupling (e.g. a component needing Appearance shouldn't be forced to also sit inside a Theme boundary it doesn't care about).

**Practical implication for anyone adding a 5th settings domain later** (per `P0-8`'s Reading Preferences, still unbuilt): follow the exact same 4-part pattern — standalone context, sibling provider in `App.tsx`, a `useX()` hook with the same not-in-provider guard — rather than nesting inside an existing context or reaching for a single mega-context, which this codebase has consistently avoided.

**Manual test cases:**
1. Render a component that calls `useA11y()` (or any of the 4) outside its provider tree — confirm it throws the documented error immediately, not a silent `undefined`/crash-later behavior.
2. Change a value in one context (e.g. toggle a theme), confirm components subscribed only to a *different* context (e.g. Profile) don't unnecessarily re-render — spot-check with React DevTools' profiler, confirms the sibling-not-nested structure is actually preventing cross-domain re-render coupling, not just structured that way superficially.

---

## Tier 3

### T3-1 — Dashboard + shared layout as React
**Components:** [React] · **Status:** ✅ Done, all 4 audit gaps closed, including `SearchRedirect.tsx`'s deletion (confirmed this session).
**Manual test:** load dashboard fresh, no console errors; confirm `SearchRedirect.tsx`/its test are absent.

### T3-2a — Site-wide infra: analytics, SEO meta, page-loader
**Components:** [React]
**Status:** ✅ Done, confirmed directly, with one real mechanism correction from what this ticket previously said.

**Analytics, reverse-engineered exactly:** `lib/analytics.ts` ports `analytics.js`'s `gtag.js` self-injection (same real measurement ID, `G-4JFX5WTGFN`, confirmed in source). The non-obvious part: vanilla got one implicit `page_view` per navigation for free, because every navigation was a full document reload. React Router doesn't reload the document, so `gtag`'s automatic `page_view` only ever fires once, for the first route — everything after that would be invisible to analytics unless explicitly tracked. That's why `send_page_view: false` is set and `hooks/useAnalyticsPageView.ts` exists, wired to `useLocation()`, to fire a tracked page view on every client-side route change. Anyone adding a new route without checking this hook is already wired at the app root (it is, confirmed) would silently lose analytics for that route.

**Random-sort/Shuffle-Again — real mechanism corrected from the previous version of this ticket, which described vanilla's mechanism as if it were also React's:** the React port does NOT use vanilla's lazy per-note `Math.random()`-keys-in-a-`Map` approach. It's a genuinely different, more rigorous implementation: a seeded Mulberry32 PRNG feeding a proper Fisher-Yates shuffle (`seededShuffle(filtered, shuffleSeed)`), with `shuffleSeed` as `useState(0)`, incremented by exactly 1 on "Shuffle Again" click. The component's own comment explains why: `Array.sort()` with a non-transitive random comparator gives inconsistent, engine-dependent results, so a proper shuffle algorithm was used instead of trying to sort randomly. Same user-facing contract as vanilla (stable until explicit reshuffle), different and better underlying mechanism — worth knowing precisely if anyone touches this code expecting the old vanilla approach.

**Manual test cases:**
1. Switch to Random sort, note the order, trigger any unrelated state change (e.g. toggle a filter chip off and on), confirm order is unchanged — proves it's keyed on `shuffleSeed`, not re-randomized on every render.
2. Click "Shuffle Again" twice, confirm two different orders.
3. Navigate between routes, check GA real-time/debug view (or `window.dataLayer` in devtools) for a `page_view` event on each navigation, not just the first.

### T3-2b — Site-wide accessibility: shortcuts, focus, print guard, 404
**Components:** [React]
**Status:** ✅ Done, confirmed.

**`PrintGuard`, reverse-engineered exactly:** a narrow-purpose wrapper, real source confirmed — wraps ONLY Dashboard/NotesIndex/QuizIndex/Gallery (confirmed via `App.tsx`'s route table, all 4 wrapped in `<PrintGuard>`), swapping in a "this page can't be printed directly, open a note or quiz to print it" message via Tailwind's core `print:hidden`/`print:block` variants — no separate print stylesheet file, no plugin. **`Note` and `Quiz` are deliberately NOT wrapped in this component** — they keep their own real print pickers (`T5-3c-2`'s Tools-menu Print item, `Quiz.tsx`'s 4-mode picker) untouched. Mixing this up (wrapping a page that should have its own real print UI) would silently break that page's actual print feature.

**Manual test cases:**
1. Trigger browser print (Ctrl/Cmd+P) on Dashboard, Notes-index, Quiz-index, and Gallery — each shows the "can't be printed directly" message, not a raw card-grid dump.
2. Trigger print on a Note and on a Quiz — confirm each shows its own real print picker, NOT the generic PrintGuard message (this is the regression case that would reveal if someone accidentally wrapped the wrong pages).
3. Full keyboard-only pass across the app — visible focus rings throughout, no keyboard trap.

### T3-3 — Notes-index as React
**Components:** [React]
**Status:** ✅ Done, confirmed — real shared-component imports verified directly (`SelectedChip`, `FilterGroup`, `Breadcrumb`, `CardQuickActions`, `TypeBadges`, `CompletionBadge`, `ProgressBar`, `QuickFiltersBar`, `ViewModeToggle`, `Pagination`), same set `T3-4`/`T4-1` reuse — see `T1-1`'s entry above for the direct import comparison across all 3 listing pages.
**Manual test cases:**
1. Apply every filter type (session, category, type, tags, favorites-only, status) simultaneously, confirm they compose with AND logic, not silently overriding each other.
2. Search while filters are active, confirm search results respect the active filters (or confirm the documented "search overrides sort/relevance wins" behavior if that's the real intended interaction — check the component's own comment on this before assuming either).

### T3-4 — Quiz-index as React (full feature parity, not just a port)
**Components:** [React]
**Status:** ✅ Done — Quick Filters, Favorites, view-mode toggle, quick-action row, Progress/Completion badge all shipped, reusing the exact same shared components as `T3-3`, confirmed via direct import comparison.
**Real data gap fully closed, confirmed this session:** `QuizIndex.tsx` now genuinely sorts using `estimatedMinutes` (`a.estimatedMinutes ?? Infinity`, so quizzes from before `PY-1`'s regeneration correctly sort last rather than crashing or sorting first on `undefined`) — the data existing (`PY-1`) and the UI consuming it are both confirmed real now.
**Manual test cases:**
1. Favorite a quiz, switch view mode, apply a Quick Filter — all three compose correctly, no state fighting.
2. Confirm the Completion badge (`CompletionBadge`/`getCompletionState`, shared with `T3-3`) reflects real `quiz_progress_<file>` data accurately for a partially-attempted quiz.
3. Sort by reading time, confirm quizzes without `estimatedMinutes` (pre-`PY-1` regeneration) sort last, not first or erroring.

### T3-5 — Routing for Notes-index + Quiz-index; update Dashboard cards
**Components:** [React]
**Status:** ✅ Done, confirmed directly against the real route table in `App.tsx`.
**Manual test:** deep-link directly to a clean note/quiz URL (paste fresh into the address bar), confirm it loads correctly, not a 404 or blank shell.

### T3-6 — Clean path-based URLs for listing pages
**Components:** [React]
**Status:** ✅ Done — but the actual URL shape is more specific than "clean," worth recording precisely since it affects anything generating links (`T3-8` needed this and got it right, confirmed this session).

**Real route table, confirmed directly from `App.tsx` this session (also includes `/calendar` and `/contact`, and the `/namu`/`/chandra`/`/todd` `LinkPage` routes — see `T-CAL-1` and `B-8` below):**
```
/                          -> Dashboard
/notes-index               -> NotesIndex (all subjects)
/notes-index/:subject      -> NotesIndex (subject-scoped)
/quiz-index                -> QuizIndex
/quiz/:quizId               -> Quiz
/notes/:folder              -> Note
/gallery                    -> Gallery
/settings                   -> Settings
/calendar                   -> Calendar (undocumented feature, see T-CAL-1)
/contact                    -> Contact
/:slug (namu/chandra/todd)  -> LinkPage (B-8)
/notes                      -> OldNotesRedirect (legacy)
/quiz                       -> redirects to /quiz-index
*                            -> NotFound
```
**Individual content pages use bare clean paths** (`/notes/:folder`, `/quiz/:quizId`), but **listing pages are NOT at bare `/notes`/`/quiz`** — they're at `/notes-index`/`/quiz-index`, specifically because `/notes/:folder` already claims the `/notes` prefix for individual notes; a listing page can't also live there without a route conflict. `/notes` itself is reserved purely as a legacy-redirect target (`OldNotesRedirect`, real code confirmed): it reads old `?subject=`/`?q=` query params and forwards to `/notes-index/:subject?q=...`, preserving old bookmarked/shared URLs.

**Manual test cases:**
1. Visit `/notes?subject=aws&q=lambda` directly, confirm it redirects to `/notes-index/aws?q=lambda` — exact param translation, not just "redirects somewhere plausible."
2. Visit `/quiz` directly, confirm it redirects to `/quiz-index`.
3. Confirm `dashboard-cards.json`-sourced links point at `/notes-index/:subject`, not the legacy `/notes?subject=` shape —**confirmed this session directly against real generated output, this is done, not a pending regression risk.**

### T3-7a — Subject Registry: data + loader (split from T3-7 this session)
**Track:** T · **Tier:** 3 · **Type:** Build · **Status:** ✅ **Done — confirmed directly this session.**
**Components:** [Python] [JSON] [React]

**Confirmed real, exactly matching the original `T3-7` proposal:**
- `subjects.json` exists (`web/public/data/config/subjects.json`, and `generate_notes.py` reads it from `src/data/config/subjects.json`) with real AWS/DSA entries matching the original `TYPE_CONFIG` values field-for-field.
- `generate_notes.py`'s `TYPE_CONFIG` is now `_build_type_config()`, a loader reading `subjects.json` at import time — confirmed by reading the function directly.
- `NotesIndex.tsx` fetches `subjects.json` and reads subject label/title copy from it — the old `subject === 'aws' ? ... : ...` ternary is gone, confirmed by its own comment (now correctly labeled "T3-7a" — the earlier "T3-7c" mislabel flagged in this session's own notes has since been fixed in source).

**Done when:**
- [x] `subjects.json` exists with real AWS/DSA data matching `TYPE_CONFIG`'s old values exactly
- [x] `NotesIndex.tsx` reads from the registry, not a hardcoded ternary
- [x] `generate_notes.py`'s type config is loaded from the registry, not hardcoded

**Manual test cases:**
1. Temporarily change `subjects.json`'s AWS `label`, regenerate/reload, confirm both the Python-generated notes and the React `NotesIndex` page reflect the new label without a code change.
2. Add a fake `"cloud-test"` subject with `"features": []`, confirm `generate_notes.py` picks it up without a `TYPE_CONFIG` code edit (the registry-loading half of this test; `T3-7b`/`T3-7c` cover whether the *rest* of the pipeline handles it correctly).

### T3-7b — Subject Registry: eliminate remaining hardcoded subject checks (split from T3-7 this session)
**Track:** T · **Tier:** 3 · **Type:** Build · **Status:** ✅ **Done — corrected this session, confirmed against the new `python.zip`.**
**Components:** [Python]
**Depends on:** `T3-7a` (done)

**Confirmed directly:** all 12 of the originally-counted `if subject == "aws"`/`"dsa"` checks are gone from live code — a fresh grep for the literal `subject ==` pattern in `generate_notes.py` now returns 0 real hits (only comments/docstrings reference the pattern as documentation of what was removed, e.g. line 2476: `"subject == 'dsa' was fully redundant here — has_animation already resolves per-subject from the registry"`). `detect_subject()` now `raise`s a `ValueError` with a clear message on an unrecognized subject, instead of silently defaulting to `"dsa"` — confirmed by reading the function directly.

**Done when:**
- [x] All 12 scattered `if subject ==` checks replaced with `"<section>" in subject_config["features"]`-style lookups
- [x] `detect_subject()`'s unrecognized-subject case fails the build with a named error, not a silent DSA default

**Manual test cases:**
1. Give a fixture note an unrecognized `type` value with no `aws-`/`dsa-` filename prefix — confirm the build fails with a clear message. **Confirmed this session — real `raise ValueError(...)` with the exact fixable-instruction message present.**
2. Temporarily remove `"reflection"` from AWS's `features` list, regenerate one real AWS note, confirm the Reflection section is genuinely absent from the output HTML.
3. Regression: regenerate all existing real AWS/DSA notes, diff output HTML against pre-change output — should be byte-identical.

### T3-7c — Subject Registry: `build_description()`/`build_edu_level()` checks (split from T3-7b this session)
**Track:** T · **Tier:** 3 · **Type:** Build · **Status:** ✅ **Done — confirmed this session, same pass that found `T3-7b` done.**
**Components:** [Python]
**Depends on:** `T3-7a` (done)

**Confirmed directly:** both `build_description()` and `build_edu_level()` are now fully registry-driven via `subjects.json`'s `metaDescription` config (a `"fixed"` mode for audience-independent subjects like DSA, an `"audience"`-keyed mode for subjects like AWS) — zero hardcoded `cfg["subject"] == "dsa"` checks remain in either function, confirmed by reading both directly. A new `_validate_meta_description()` function fails the build loudly if a registered subject is missing `metaDescription` data, rather than silently falling through to AWS's templates by accident — same fail-loud discipline as `T3-7b`'s `detect_subject()` fix, applied consistently here too.

**Naming collision, resolved:** the stray "T3-7c" comment in `NotesIndex.tsx` (flagged in this ticket's earlier text as actually describing `T3-7a`'s scope) has been fixed in source — it now correctly reads "T3-7a."

**Done when:**
- [x] Both checks replaced with registry-driven lookups
- [x] Grep for `subject ==` and `subject"] ==` across `generate_notes.py` confirms 0 hits outside comments/docstrings — **confirmed this session, combined verification for `T3-7b` + `T3-7c` both pass**

**Manual test cases:**
1. Regenerate a real AWS note and a real DSA note, diff `description`/`edu_level`-derived output fields against pre-change output — should be byte-identical.
2. Add `T3-7a`'s fixture `"cloud-test"` subject with real `metaDescription` config, confirm `build_description()`/`build_edu_level()` produce sensible output for it too, not just AWS/DSA.
3. Add a fixture subject missing `metaDescription` entirely, confirm the build now fails loudly via `_validate_meta_description()`, not a silent AWS-template fallback.
```
— an unrecognized subject is still silently misclassified as DSA, not a build failure. This was the original ticket's explicitly-called-out "subtle bug for a 3rd subject" and it's still present.

**Done when:**
- [ ] All 12 scattered `if subject ==` checks replaced with `"<section>" in subject_config["features"]`-style lookups — grep for `subject ==` post-change, confirm 0 hits among these 12. (The 2 `cfg["subject"] ==`-shaped checks this grep pattern doesn't catch are `T3-7c`, split out separately — see that ticket for the combined final verification covering both shapes.)
- [ ] `detect_subject()`'s unrecognized-subject case fails the build with a named error, not a silent DSA default

**Manual test cases:**
1. Give a fixture note an unrecognized `type` value with no `aws-`/`dsa-` filename prefix — confirm the build now fails with a clear message, not a silent DSA misclassification (this is a behavior *change* from today, test it explicitly).
2. Temporarily remove `"reflection"` from AWS's `features` list, regenerate one real AWS note, confirm the Reflection section is genuinely absent from the output HTML — proves the registry drives real behavior everywhere, not just in the 2 places already migrated.
3. Regression: regenerate all existing real AWS/DSA notes, diff output HTML against pre-change output — should be byte-identical (this ticket is a refactor, not a content change).

---

### T3-7c — Subject Registry: `build_description()`/`build_edu_level()` checks (split from T3-7b this session)
**Track:** T · **Tier:** 3 · **Type:** Build · **Status:** ⬜ Not started
**Components:** [Python]
**Depends on:** `T3-7a` (done)

**Note on naming:** the real codebase already has an unrelated comment using the string "T3-7c" — `NotesIndex.tsx`'s registry-consumption code is annotated `"T3-7c: subjects.json is the registry NotesIndex reads..."` (quoted under `T3-7a` above), predating this ticket ID's assignment here. That comment describes work that's actually part of `T3-7a` (done), not this ticket. Worth a one-line comment fix in `NotesIndex.tsx` when this ticket is picked up, so the id doesn't point two different places in the codebase vs. the ticket docs.

**Real, confirmed scope — found via follow-up, not the original `T3-7b` grep pass (different string shape: `cfg["subject"] == "dsa"`, not `subject == "dsa"`):**
- `build_description()`, line 260: `if cfg["subject"] == "dsa": ...`
- `build_edu_level()`, line 270: `if cfg["subject"] == "dsa": ...`

Same fix pattern as `T3-7b`'s other 12: replace with a `subjects.json`-driven `features`/config lookup instead of a hardcoded subject-name check.

**Done when:**
- [ ] Both checks replaced with registry-driven lookups, matching `T3-7b`'s pattern
- [ ] Grep for `subject ==` **and** `subject"] ==` across `generate_notes.py` post-change, confirm 0 hits outside the loader itself — this is now the combined verification for `T3-7b` + `T3-7c` together, since they were only ever split because of a grep-pattern miss, not a real scope boundary

**Manual test cases:**
1. Regenerate a real AWS note and a real DSA note, diff `description`/`edu_level`-derived output fields against pre-change output — should be byte-identical (refactor, not content change), same discipline as `T3-7b`'s regression test.
2. Add `T3-7a`'s fixture `"cloud-test"` subject, confirm `build_description()`/`build_edu_level()` produce sensible output for it too, not just AWS/DSA — proves these are now genuinely registry-driven, not just DSA/AWS with a 3rd case bolted on.

---

### T3-8 — Generate `dashboard-cards.json` instead of hand-authoring it
**Track:** T · **Tier:** 3 · **Type:** Build · **Status:** ✅ **Corrected this session — was "Not started," confirmed actually done.**
**Components:** [Python] [JSON] · **Depends on:** `T3-7a` (done)

**Confirmed directly this session:** `generate_dashboard_cards.py` is real. It reads `subjects.json`, emits one `type: "subject"` card per entry with `url: /notes-index/{subjectId}`, and generically preserves every non-subject ("standalone") card from the existing output file untouched — confirmed this correctly round-trips the real `"quiz"` card **and** the undocumented `"calendar"` card (see `T-CAL-1`) without needing to know either by name.

**Real generated output, confirmed this session:**
```json
{ "cards": [
  {"id":"aws","label":"AWS","icon":"☁️","description":"Cloud certification prep — notes and labs","type":"subject","url":"/notes-index/aws"},
  {"id":"dsa","label":"DSA","icon":"🧩","description":"Data Structures & Algorithms — notes","type":"subject","url":"/notes-index/dsa"},
  {"id":"quiz","label":"Quiz","icon":"📝","description":"Practice quizzes across all subjects","type":"standalone","url":"/quiz-index"},
  {"id":"calendar","label":"Calendar","icon":"📅","description":"A month view of your study activity","type":"standalone","url":"/calendar"}
]}
```
Clean-path URLs confirmed present, matching `T3-6`'s real route table exactly.

**Done when:**
- [x] Generator output matches AWS/DSA/Quiz cards' `label`/`icon`/`description`/`type` fields, with clean-path `url`s
- [x] Standalone (non-subject) cards preserved exactly, generically — confirmed against 2 real standalone cards, not just the 1 originally assumed

**Manual test cases:**
1. Run the generator, diff output against the current file — confirmed this session, matches spec.
2. Add `T3-7a`'s fake subject, re-run, confirm a matching card appears automatically with no manual JSON edit.
3. Click through from a freshly-generated card to its notes-index page in the running React app, confirm the clean URL actually resolves correctly.

---

### T3-9 — Dashboard card icon plumbing (future-proofing for custom icons)
**Track:** T · **Tier:** 3 · **Type:** Build · **Status:** ✅ Already done (unchanged from 2026-08-09, not re-verified line-by-line this session but no evidence of regression).
**Components:** [React] [Content/assets]

`<Icon name={card.id} size={40} fallback={card.icon || fallbackIcon} />` real, in `DashboardCardsGrid.tsx`. Real PNG assets exist for the 3 original cards; not yet re-checked whether the new `calendar` card (per `T-CAL-1`) has a real PNG or is currently falling back to its emoji — worth a quick check when picking up `T-CAL-1`.

### T3-10 — Rebrand, applied to Dashboard
**Track:** T · **Tier:** 3 · **Type:** Build · **Status:** ✅ Already done (unchanged from 2026-08-09).
**Components:** [React] [Content]

---

### PY-1 — Quiz reading-time estimate, computed at generation time
**Track:** Python (feeds `T3-4`) · **Type:** Build · **Status:** ✅ **Corrected this session — was "Not started," confirmed actually done.**
**Components:** [Python] [JSON] · **Depends on:** none · **Feeds:** `T3-4`

**Confirmed directly this session:** `generate_quiz_index.py` has a real `calculate_quiz_time(question_count, seconds_per_question=SECONDS_PER_QUESTION)` function, matching the ticket's proposed signature almost exactly (a named module-level `SECONDS_PER_QUESTION` constant, not a magic number). Each `quiz-index.json` entry gains `questionCount` and `estimatedMinutes`, confirmed via the real assignment lines (`entry["questionCount"] = ...`, `entry["estimatedMinutes"] = ...`).

**Not independently re-verified this session:** the exact floor-at-1-minute edge case and the pytest fixture assertion — the function's `max(1, round(...))` shape is present in source, but its test coverage wasn't run this session (no `pytest` execution happened, only source inspection). Recommend an actual test run before fully closing this out.

**Done when:**
- [x] `quiz-index.json` entries include `estimatedMinutes`/`questionCount`
- [ ] Confirm via an actual pytest run (not just source reading) that the edge-case and fixture assertions pass
- [ ] Confirm `T3-4`'s React side (`QuizIndex.tsx`) actually surfaces a sort/display using the new fields — data existing isn't the same as the UI consuming it, see `T3-4`'s updated entry above

**Manual test cases:**
1. Run against a real quiz file with a known question count, confirm `estimatedMinutes` present and matches the hand-computed formula exactly.
2. Run against a 0-question edge-case fixture, confirm the floor (1 minute) applies, no crash or negative value.
3. Regression: existing `generate_quiz_index` test coverage still passes unchanged for the fields it already tested.

---

## Tier 4

### T4-1 — Gallery as React
**Components:** [React]
**Status:** ✅ Done, gap closed — confirmed directly: `Gallery.tsx` imports and renders the real shared `CardQuickActions` (Favorite + Copy Link), not a bespoke favorite toggle. Own comment confirms this was a deliberate fix, matching this ticket's original "reuse, don't duplicate" requirement. **Also confirmed 2026-08-22 (completeness sweep):** real touch swipe/pinch-zoom support via `lib/gestures.ts`'s `SwipeTracker` — previously undocumented, real and working, not new scope.

**Reverse-engineered scope, precisely:** filtering by subject/category/tags, favorites-only quick filter, sort (added/title, both directions), Grid/List view toggle, image cards showing category chip + related-note link + favorite/copy-link actions, a metadata panel with download option. Favorites persist to a `Set<string>` keyed by image filename (`favorites.has(img.file)`), loaded via `loadFavorites()` — worth confirming this is genuinely the same underlying storage key Notes-index/Quiz-index favorite state uses, or a parallel-but-separate Gallery-specific favorites set, before assuming full cross-page favorite unification (the component's own comment doesn't make this explicit either way in what's visible here — check `loadFavorites()`'s implementation directly).

**Manual test cases:**
1. Favorite an item from Gallery, check Dashboard/Notes-index/wherever favorites are surfaced elsewhere — confirm whether it's the same shared favorites list or a Gallery-specific one (this needs an actual answer, not an assumption, per the note above).
2. Toggle Grid/List view, confirm favorite state survives the view-mode switch.
3. Apply subject + category + tag filters together with favorites-only active, confirm all filters compose correctly (AND logic), not one silently overriding another.

---

## Tier 5

### T5-1 — Quiz engine as React
**Status:** ✅ Done, confirmed this session (504/504 tests, `SearchRedirect`/`QuizProgressBar` cleaned up, Study Mode/search/status-filter all shipped, both QR variants working). **Also confirmed 2026-08-22 (completeness sweep):** real swipe-between-questions support via `lib/gestures.ts`'s `SwipeTracker` — previously undocumented, real and working, not new scope. This directly satisfies an earlier speculative review's "swipe between quiz questions" mobile suggestion — already built.

**New follow-up found this session (small, not a reopen):** `pages/Quiz/QuestionCard.tsx` (334 lines) is an orphaned, unused duplicate of the real shared `components/QuestionCard/QuestionCard.tsx` — nothing imports it. Delete it, same class of leftover as `SearchRedirect.tsx`.

**Manual test cases:**
1. Complete a quiz, confirm score + review.
2. Toggle Study Mode; confirm it stays unlocked with the self-rating widget instead of Reset.
3. In-quiz search hides non-matching questions (`search-hidden` class, not removed from DOM).
4. Status filter composes correctly with an active search.
5. Both QR variants (plain + seeded) scan correctly; seeded reproduces identical order across two sessions.
6. Delete `pages/Quiz/QuestionCard.tsx`, re-run full suite, confirm nothing breaks.

### T5-2 — Content pipeline: body-prose + Slides get structured JSON
**Status:** ✅ Done, confirmed this session (real `extract_body_prose()`/`write_body_prose_json()` in `generate_notes.py`, wired into the real generation flow — not just present as dead code).

**Ticket-text correction (found this session, replacing an earlier wrong correction):** the schema example previously shown here (`explanation: {why, readMore, keywords}`) does **not** match what `[mcq]`-block authoring actually produces — confirmed directly against `utils/parse_mcq.py`'s real `parse_mcq_block()` and its own test suite (`test_every_option_has_id_text_isCorrect_and_explanation_why`, and no test anywhere asserts `readMore`/`keywords`). The real, shipped per-option shape from this path is just:
```json
{
  "id": "A", "text": "...", "isCorrect": true,
  "explanation": { "why": "..." }
}
```
`readMore`/`keywords`/the other 11 rich fields only ever appear on hand-authored standalone `quiz.json` files (which this parser doesn't touch) — they were never real for notes-embedded MCQ content and the earlier "13 explanation-level fields... several on 100%" framing conflated the two sources. Corrected here so no one builds against a shape this pipeline doesn't produce.

**Real, previously-undocumented authoring capability, confirmed in source and covered by real tests (dated T5-2, 2026-07-26 — already shipped, not new work):** wrong-option explanations can be authored two ways, and both are real:
- `w:` — one shared "why the others are wrong" text, applied to every wrong option. Original syntax, still fully supported; every `[mcq]` block written before this feature existed keeps working unchanged.
- `wA:`/`wB:`/`wC:`/`wD:` — optional, genuinely distinct per-option explanation for that specific letter. Wins over `w:` for that letter when both are present; purely additive, so existing content can be upgraded incrementally without touching `w:`. If neither `w` nor a per-letter field is given, a generic fallback line applies ("The other options describe related but distinct concepts.").

`aws-standard-instructions.md`/`dsa-instructions.md` (re-uploaded this session in a newer form) correctly document `wA`/`wB`/`wC`/`wD` as the now-preferred format for new questions — confirmed the docs and the parser agree.

**Quiz-level fields, confirmed correct, unchanged:** `topic` stays, load-bearing for `QuizIndex`'s filter (`sprint-tickets.md` had already decided this — re-confirmed, not re-litigated). **No `timeLimit` field** — the quiz timer is a runtime UI feature (`quiz-toolbar.js`'s `_initTimedMode`, user picks 5/10/15/20/30 min mid-session), not authored quiz metadata — confirmed against real source, don't add one.

**Two items still open, both re-confirmed directly in `parse_mcq.py` this session with exact line references:**
- [ ] `multiSelect` is permanently unreachable from `[mcq]` block authoring — hardcoded `False` at line 183 (`"the [mcq] block syntax has no multi-select concept today"`), and re-confirmed no `ms:` field exists anywhere in the real, current `aws-standard-instructions.md`/`dsa-instructions.md`. Needs an explicit decision: add an `ms:` authoring field, or document as a permanent limitation.
- [ ] `parse_mcq.py`'s difficulty mapping (line 157: `difficulty_map.get(fields["d"].lower(), "basic")`) silently defaults to `"basic"` for any unrecognized `d:` value with no printed warning, unlike every other field in the same function — small robustness fix.

**Manual test cases:**
1. Author an `[mcq]` block with `wA`/`wB`/`wC`/`wD` per-option fields, run the pipeline, confirm each wrong option's `explanation.why` uses its own specific text, not a shared one.
2. Author an old-style block (shared `w:` only), confirm it still parses identically to before (backward compatible).
3. Author a block mixing `w:` and one `wX:` override, confirm the override wins only for that letter and the others fall back to `w:`.
4. Author a block with an invalid `d:` value, confirm current (silent "basic" default) behavior — documents the known gap, doesn't assert it's fixed.
5. Generate `sitemap.xml`, confirm clean-path URLs.

### T5-3a — Note page as React: core
**Status:** ✅ **Corrected this session — was marked "Partial, still a placeholder," confirmed actually done.**

**Confirmed directly this session:** `Note.tsx`'s own header comment states plainly that body-prose "now renders for real via `BodyProseModule`... the earlier placeholder is gone." `BodyProse.tsx` (block/run rendering), `BodyProseModule.tsx` (fetch wrapper), and `BodyProse.test.tsx` all exist as real files. `Note.test.tsx` has a real test named "renders real body-prose content in place of the old placeholder" — the old placeholder-exclusion comment is gone, not just unmentioned. On the Python side, `generate_notes.py` has a real, wired `extract_body_prose()` → `write_body_prose_json()` call inside the actual generation flow (not dead code sitting unused).

**What this unblocks:** `P0-3` (Continue Reading) and `P1-1` (Highlighting) both listed `T5-3a` actually completing as their real dependency — that dependency is now satisfied. Neither is itself built yet (confirmed separately, see Track P) — this only removes the blocker, it doesn't mean either ticket is done.

**What's still explicitly out of scope here (real, not a gap):** Lite Mode, FAB menus, jump-to-top, cross-tab favorites sync, in-page search, export-highlights (all `T5-3c`'s scope). Per-section Bookmark star — body sections now have real `id`s to attach to, but the star UI itself is still `T5-3c`'s scope.

**Done when:**
- [x] Body-prose placeholder replaced with real rendering, consuming `body-prose.json`'s actual structure
- [x] `Note.test.tsx`'s placeholder-exclusion comment removed, replaced with real coverage

**Manual test cases:**
1. Load any real AWS or DSA note, confirm actual body content renders — headings, callouts, etc. — not the "pending T5-2" box. **Note:** the one fixture note folder in the uploaded `web.zip` (`dsa-merge-sort`) doesn't have a real `body-prose.json` generated for it yet — this is a stale/incomplete fixture, not evidence the feature is broken; test against a note that has the file, or regenerate the fixture first.
2. Confirm `McqModule` etc. still render correctly alongside the now-real body content.

### T5-3b — Note page: DSA-specific features
**Status:** ✅ Done, confirmed this session — `VisualMcqModule` also via shared `QuestionCard`; `ImplementationModule`/`VisualisationModule` both via shared `TabPanel`.
**Real bug found, belongs to `T1-4`, not here:** `DsaAnimation.tsx` assumes a vanilla-side theme fix that doesn't exist yet — see `T1-4`, re-confirmed this session.
**Manual test:** load a note with every module type present, confirm all render; switch theme with a DSA animation visible — expect failure until `T1-4` lands.

### T5-3c-1 — Lite Mode
**Depends on:** `T5-3a` (done) · **Components:** [React]
**Status:** ✅ **Done — confirmed this session against the new `web.zip`.** Real `lib/moduleRegistry.ts` (`core`/`interactive`/`links` tags per module) drives both Lite Mode and print categorization from one source — `LiteModeSection.tsx` reads the registry and hides the whole enclosing section (returns `null` before the child renders at all, explicitly avoiding the "orphaned header" bug the ticket calls out), and the same `data-module-tag` attribute it sets is read by `index.css`'s print rule.
**Done when:** [x] shared module-registry drives both Lite Mode visibility and print categorization; [x] Lite Mode hides the whole enclosing section.
**Manual test:** toggle Lite Mode on a note with interactive+link modules, confirm both fully hidden; trigger print preview, confirm same registry drives exclusion.

### T5-3c-2 — Settings + Tools FAB menus
**Depends on:** `T5-3a` (done) · **Components:** [React]
**Status:** ✅ **Done — confirmed this session.** Real generic `FloatingMenu.tsx` component (confirmed both Settings and Tools menus use it, not two hand-built menus). All 8 items present:

| Menu | Item | Behavior | Confirmed |
|---|---|---|---|
| Settings | Exam Mode | shows current mode | ✅ wired to `T5-3c-3`'s real `cycleExamMode` |
| Settings | Theme | shows current theme | ✅ |
| Settings | Lite Mode | On/Off, reloads | ✅ |
| Tools | Search | opens + focuses search | ✅ — **deliberately narrow**, see `T5-3c-4` |
| Tools | Print | opens format picker | ✅ real `printNote.ts` |
| Tools | Bookmarks | toggles bookmarks panel | ✅ real `BookmarksPanel.tsx` — panel is honest that it'll be empty until `T5-3c-7` lands |
| Tools | Export Highlights | complete-notes pages only | ✅ present, **deliberately stubbed**, see `T5-3c-6` |
| Tools | Study Timer | shows hidden/shown state | ✅ real `StudyTimer.tsx` |

**Done when:** [x] both menus render via one generic `FloatingMenu` component; [x] every item above present with exact behavior (2 items — Search, Export Highlights — are intentionally narrow scope by design, not incomplete; see their own sub-tickets).
**Manual test:** open each menu, confirm live state; confirm Export Highlights absent on overview pages; confirm Lite Mode click reloads.

### T5-3c-3 — Exam Mode
**Depends on:** `T5-3a` (done), `T5-3c-2` (done) · **Components:** [React]
**Status:** ✅ **Done — confirmed this session.** Real `cycleExamMode()` in `Note.tsx`, cycling `none → highlight → test → none`, `Alt+E` binding confirmed, `data-exam-mode` attribute set on the page root, wired into `T5-3c-2`'s FAB menu.
**Done when:** [x] cycles via Alt+E or FAB item, persisted; [x] wired into FAB menu.
**Manual test:** Alt+E three times, confirm cycle + toasts; reload, confirm persistence; confirm no-op on overview pages.

### T5-3c-4 — Jump-to-top + in-page section search
**Depends on:** `T5-3a` (done) · **Components:** [React]
**Status:** ✅ **Done — confirmed this session.** Real `components/JumpToTopButton/JumpToTopButton.tsx` (real scroll-threshold logic, `window.scrollY > SHOW_THRESHOLD_PX`) and `NoteSearchPanel.tsx` now has the real match/scroll logic it previously deferred.
**Done when:** [x] button appears past scroll threshold, scrolls to top; [x] section search is separate from `useSearch()`.
**Manual test:** scroll, confirm button; search a term known to exist only on this note, confirm no other-note results.

### T5-3c-5 — Cross-tab Favorites sync
**Depends on:** `T5-3a` (done), `T3-3` (shares `notesFavorites`) · **Components:** [React]
**Status:** ✅ **Done — confirmed this session.** Real `hooks/useNotesFavorites.ts` with a genuine `window.addEventListener('storage', handleStorage)` — and this session confirmed it's now the single shared favorites implementation `NotesIndex.tsx` and `Note.tsx` both use (`NotesIndex.tsx`'s own comment: "Favorites load/save/toggle + cross-tab sync now live in hooks/useNotesFavorites.ts").
**Done when:** [x] `storage` event listener re-renders on change from another tab.
**Manual test:** favorite in tab A, confirm tab B updates within a second, no refresh.

### T5-3c-6 — Export highlights to .txt
**Depends on:** `T5-3a` (done), `T5-3c-2` (done), `T5-3c-3` (done), `P1-1` (**fixed this session** — see `sprint-tickets-tracks-PREB.md`) · **Components:** [React]
**Status:** ⬜ **Unblocked, but still genuinely not built.** `P1-1`'s real Python fix landed this session, but `web.zip` was unchanged in the same upload — `Note.tsx`'s `exportHighlights()` is still the literal stub showing "No highlights saved yet for this note." The blocker this ticket was correctly waiting on is gone; the actual export logic (reading real highlight data, producing the real `.txt` format below) still needs to be written. Don't mark this done just because its dependency cleared.

**Real format (unchanged):**
```
# Exam Highlights
Generated: <timestamp>
Page: <page title>

## Key Sentences
1. ...

## Key Terms
- term1
```
Terms deduplicated. Filename: slugified `document.title`.

**Done when:** [ ] `exportHighlights()` reads real highlight data instead of the stub message; [ ] output has both sections in this exact shape; [ ] filename correctly slugified.
**Manual test:** highlight the same term twice in different sentences, export, confirm one Key Terms entry but both sentences under Key Sentences.

**Regression note for all of `T5-3c-*`:** re-run `T5-3a`'s manual tests too — they share its page tree.

### T5-3c-7 — Per-section Bookmark star UI
**Depends on:** `T5-3a` (done), `T5-3c-2` (done) · **Components:** [React]
**Status:** ✅ **Done — confirmed this session.** Real `BookmarkStar.tsx` + `bookmarks.ts`, using `sectionId` sourced from `block.id` (the real, existing heading/collapsible id field — correctly NOT the missing `blockId` field `P1-1`'s bug affects, which is why this ticket works today despite `P1-1` not being real). `T5-3c-2`'s Bookmarks panel correctly reflects stars toggled here.
**Done when:** [x] every body-prose section (heading/collapsible) has a visible bookmark-star toggle; [x] toggling it persists via the real key shape; [x] Tools > Bookmarks panel correctly lists sections bookmarked via this star.
**Manual test:** star 2 sections on a note, open Tools > Bookmarks, confirm both listed; un-star one, confirm the panel updates; reload, confirm both states persist correctly.

**Regression note for all of `T5-3c-*`:** re-run `T5-3a`'s manual tests too — they share its page tree.

### T5-4 — Slides as React
**Components:** [React] · **Status:** ✅ **Done — corrected this session, confirmed against the new `web.zip`.** Real `/slides/:folder` route in `App.tsx`; `Slides.tsx` (527 lines) implements all 3 real slide types. **Depends on:** `T5-2` (done) · **Was recommended before `E1-1`** — now shipped, so `E1-1` is unblocked.

**All 4 sub-tickets below confirmed done this session — kept split for the historical record and their individual manual tests, not because any part is still open:**

#### T5-4a — Route + page shell + windowed/fullscreen chrome
**Cross-reference 2026-10-31:** the `/slides/:folder` route and viewer are real and stay untouched (`App.tsx:279`, `pages/Slides/Slides.tsx`). What is broken is how the Notes index *links to* it: see `PRES-1` (PREB file) — Presentation cards and the folder picker point at a raw `slides.html` path instead of this route.

**Components:** [React] · **Status:** ✅ **Done — confirmed this session.** Real `/slides/:folder` route; real `useFullscreenChrome.ts` hook.

**Confirmed matching every requirement flagged in the prior reference pass, and one deliberate improvement beyond a 1:1 port:** native Fullscreen API on `document.documentElement` (not a scoped container, not CSS-only fake-fullscreen); chrome show/hide driven by the `fullscreenchange` **event**, not the toggle button's click handler alone — the hook's own header comment names this as the exact regression case `Slides.test.tsx` checks for. Selector list matches vanilla's `nav.breadcrumb, .page-header, #footerRoot` exactly, **plus** `#appChromeHeader` (the persistent React-shell settings/notifications/theme cluster vanilla never had) — flagged in its own comment as a deliberate addition, not an accidental deviation from the port.

**Done when:** [x] route exists and loads a deck; [x] fullscreen uses the native Fullscreen API; [x] chrome hide/show driven by `fullscreenchange`; [x] chrome matches `T1-2` in side-by-side comparison, plus the one documented improvement.
**Manual test:** toggle fullscreen via the button, compare chrome to `T1-2`'s vanilla version directly, side by side; separately, enter fullscreen then exit via Escape (not the button) — confirm chrome still correctly reappears.

#### T5-4b — Slide navigation + `regular`/`comparison` type rendering
**Components:** [React] · **Status:** ✅ Done — confirmed this session, both slide types render in `Slides.tsx`.
**Done when:** [x] full-deck keyboard navigation works; [x] `comparison` slides render correctly with 2 and with 3+ columns.
**Manual test:** navigate a full deck via keyboard only; trigger a `comparison` slide with 2 columns and one with 3+, confirm both render correctly.

#### T5-4c — `engage` slide type rendering
**Components:** [React] · **Status:** ✅ Done — confirmed this session. All 5 `kind`s (`think`/`scenario`/`poll`/`predict`/`pause`) present in `ENGAGE_LABELS`; `showOptions` correctly gates on `kind === 'poll' || kind === 'predict'` matching the Python parser's own hardcoded gate exactly (confirmed via the component's own comment citing `parse_slides.py`'s `OPTION_RE.findall(...) if kind in ("poll", "predict")`); `reveal` correctly independent of `kind`.
**Done when:** [x] all 5 `kind`s render correctly; [x] `options` list appears only for `poll`/`predict`.
**Manual test:** trigger a `poll` and a `predict` block, confirm options render for both; trigger `think`/`scenario`/`pause`, confirm no empty options list renders where there shouldn't be one.

#### T5-4d — Speaker-notes panel (both authoring conventions)
**Components:** [React] · **Status:** ✅ Done — confirmed this session. Real `SpeakerNotesPanel` renders `current.notes_html`; its own comment notes an empty `notes_html` on a real slide is treated as a content-authoring gap worth flagging, not silently swallowed as an empty state.
**Done when:** [x] speaker-notes panel renders `notes_html` correctly regardless of authoring convention used.
**Manual test:** find or construct one real deck using each of the 2 conventions, confirm both render identically in the speaker-notes panel.

**Regression across all 4 sub-tickets:** re-run `T5-2`'s tests, now that `T5-4` has fully landed.

### T5-4e — Wire Note.tsx's slides-only fallback to the real route
**Depends on:** `T5-4a` (done) · **Components:** [React]
**Status:** ✅ **Done — confirmed this session.** `Note.tsx` now correctly `<Navigate to={`/slides/${note.folder}`} replace />`s for slides-only folders — real automatic redirect, not just an updated link — with its own comment noting "a slides-only folder now has a real home." The old `dataPath`-based fallback to raw generated HTML has been removed, not left as a secondary path.

**Done when:**
- [x] `Note.tsx`'s slides-only branch routes to `/slides/:folder`
- [x] The old fallback path is removed

**Manual test cases:**
1. Visit a real slides-only folder's note URL, confirm it now auto-redirects to `/slides/:folder`.
2. Regression: confirm `Note.test.tsx` no longer asserts the old "isn't available" message text for this case.

---

### T6-1 — Remove vanilla pages
**Amended 2026-09-23 (from `Track AUDIT`, `AUDIT-0`):** the vanilla `src/`/`dist/` deletion and the `web/dist` deploy repoint are confirmed real in the working tree; the sequencing gate (`R0-1`/`R1-1`/`R4-1`) was re-checked and is clear. Kept 🟡, not ✅: real on disk, not yet committed, full regression pass not yet run.

**Components:** [Build/Delete] [Config] · **Status:** ⬜ **All technical blockers cleared. Sequencing corrected this session — held until after the early/vanilla-independent half of Track R, not "all of Track R."** `T5-4` (all 5 parts) ✅. `T5-1` ✅. `T5-3a` ✅. `T1-4` ✅. Every prerequisite in the original Done-when is satisfied; what's left is sequencing, not a technical blocker.

**Real circular dependency found and fixed this session — worth recording so it isn't reintroduced:** the previous version of this note held `T6-1` until "Track R closes," and justified it partly by `R7-1`'s asset work benefiting from a stable vanilla comparison target. But `R7-1`'s own ticket text says it's **"hard-gated after `T6-1`"** — `R7-1` can't start until `T6-1` finishes. Holding `T6-1` for all of Track R to close, when part of Track R (`R7-1`, and everything downstream of it — `R5-1`, `B-5`) can't even start until `T6-1` finishes, is a genuine deadlock, not just an ordering preference.

**Corrected real sequencing:** `T6-1` sits in the *middle* of Track R, not after it —
1. `R0-1` (naming pass, recommend-closed anyway), `R1-1` (color tokens/logo), `R4-1` (icon strategy) — none of these need vanilla gone, do these first
2. **`T6-1` executes here** — once the vanilla-independent design decisions above are settled, so design still had a stable reference point for the parts that needed one, without creating the deadlock
3. `R7-1` (hard-gated after `T6-1`, as it already declared) → `R5-1`, `B-5` (both depend on `R7-1`) follow after

**Done when:**
- [x] `T5-4` ships and passes its own manual tests (all 5 parts, including `T5-4e`)
- [x] `T1-4` ships and passes its own manual tests
- [x] `R0-1` closed as obsolete (2026-11-06, `D20`); `R1-1`/`R4-1` have only design-asset items left (stacked/wordmark logos, Calendar icon) — no longer a reason to wait, because vanilla is already gone from the working tree
- [x] Vanilla `src/` deleted — verified 2026-11-13 on the 2026-10-05 snapshot: no vanilla `src/` in the tree; the Python pipeline and markdown sources are untouched (`pytest` 270 passed)
- [x] Deploy config repointed — verified 2026-11-13: `.github/workflows/deploy.yml` uploads `web/dist` (and runs `pytest python/tests/` first)
- [ ] Full regression pass across every page type, documented — **see the close-out checklist below**

**Close-out checklist (written 2026-11-13) — what is left, in order.** Status stays 🟡 until every line is ticked:
1. [ ] **Baseline committed** (`AUDIT-1`): this ticket's own status says "real on disk, not yet committed". Step-by-step commands are in the `APPLY-INSTRUCTIONS.md` that came with this update.
2. [x] **Automated suites, run on the 2026-10-05 snapshot (re-run on your tree):** `python -m pytest` in `python/` → 270 passed; in `web/`: `npx tsc -b` clean, `npm test` → 119 files / 988 tests passed, `npm run lint` → 0 errors (45 warnings), `npm run build` succeeds.
3. [ ] **Visual suite (your machine):** in `web/`, `npx playwright install` once, then `npm run test:visual`. The baseline screenshots live under `web/e2e/**/__screenshots__/` and **must be committed** (they are PNGs, so the lean package leaves them out); they were generated on one OS and can differ slightly on another — a first-run diff is not automatically a regression. Non-blocking in CI (`B-4a`).
4. [ ] **Click-through on the deployed site, every page type:** Dashboard, Notes Index, Quiz Index, Gallery, a note, a quiz, a slide deck, Calendar, Search My Notes, Export, Contact, a link page (`/namu`), and a deliberately broken URL (the 404 page).
5. [ ] **Deep links survive a hard refresh** (GitHub Pages serves `web/public/404.html` as the single-page-app fallback): open `/ResourcesV2/notes-index/aws`, `/ResourcesV2/quiz-index` and a note URL directly in a fresh tab, and refresh each.
6. [ ] **Old vanilla URL shapes:** try a few old `.html` paths and old query-string URLs (e.g. `notes-index.html?...`) and confirm they land on a React page, not a GitHub 404 — the redirect coverage of `T3-6` was only ever checked for `/notes` and `/quiz`.
7. [ ] Record the result of lines 3–6 here, with the date, then change the status to ✅.

**What "remove vanilla" concretely touches, reverse-engineered from the real repo layout:** the entire `src/src/` vanilla tree (`js/`, `css/`, every `*.html` page, `data/notes/*/markdown/` stays — that's Python's real source input, not vanilla site code — but the generated per-note HTML output and the vanilla listing pages go), plus GitHub Pages deploy config needs to point at `web/web/dist` (Vite's real build output directory, confirmed in `vite.config.ts`) instead of the current vanilla `src/` root.

**One more real dependency this ticket needs, not previously listed:** `T3-6`'s legacy-URL redirects (`OldNotesRedirect`, confirmed real code) only work because React Router is running client-side — once vanilla's static HTML files are gone, any *external* link still pointing at an old vanilla page path (`.html` extensions, old query-string URLs not already covered by `OldNotesRedirect`'s specific `/notes`/`/quiz` handling) needs to resolve through React Router's catch-all, not 404. Worth an explicit check of what old URL shapes exist in the wild (search engine index, any external backlinks) before assuming `T3-6`'s redirect coverage is complete.

**Manual test cases:**
1. Full click-through of every page type (Dashboard, Notes-index, Quiz-index, Gallery, a note, a quiz, slides) on the live deployed React-only site.
2. Visit several old-style vanilla URLs directly (`.html` extensions, old query-string shapes), confirm each resolves correctly via React Router, not a 404.
3. Regression: re-run every manual test case from `T5-1` through `T5-4` one final time, in order, before calling this done.

### T7-1 — Mobile responsive audit, Android-specific
**Components:** [React] [Tailwind/CSS] · **Status:** ⬜ Not started, deliberately deferred. No change recommended to its scope — already correctly framed as "audit first, scope once picked up," and this session's own `Responsive` test-case category (added to the manual test spreadsheet, 24 cases across `T3-1`/`T3-3`/`T3-4`/`T4-1`/`T5-1`/`T5-3a`/`T5-3b`/`T5-3c-*`/`T5-4`/`T6-1` and several `P`/`B`/`R` tickets) already gives this audit a real starting checklist instead of a blank slate — worth reviewing that full list first rather than starting the audit from scratch.

**When picked up: split each found issue into its own small ticket immediately, don't re-bundle them** — same discipline this whole rewrite has applied elsewhere (`T5-3c`'s 6-way split, `B-4`'s 3-way split, and this session's `T3-7`/`T5-4` splits).

---

## T-CAL-1 — Calendar page — **real ticket id found: `R3-1c`**
**Track:** T · **Type:** Backfill → mostly resolved · **Status:** ✅ Feature real and functional; ✅ real scope now found (not a lost ticket, just a doc this session didn't have).

**Resolved this session:** `Calendar.tsx`'s own header comment identifies it as `R3-1c`, scoped per a `sprint-tickets-R3-1-scoping.md` document — real, deliberate scoping work, not off-ticket or lost. That document isn't currently held by this session; worth requesting if `R3-1a`/`b`/`d` (implied siblings) ever need the same kind of audit. **This wasn't a mystery feature — it was a real ticket whose source document this Planner session simply never had.**

**Real scope, confirmed directly:** deliberately the **read-only activity calendar** variant, not a personal planner — a month grid coloring in days the user studied, fed by `P2-1` (Study Statistics)'s `lib/studyStats.ts` `getStudyActivityDates()`. **Answers the "same calculation as the Statistics widget?" question definitively: yes**, confirmed by direct import, not a parallel calculation.

**One real question left open by the code's own comment, not resolved here:** should `P2-2` (Study Streak) also surface on this page (header badge, per-day streak-run styling), or stay Dashboard-only? Explicit product decision needed.

**Still open:**
- Icon: unconfirmed whether a real `/icons/calendar.png` exists or it's on emoji fallback (flagged on `R4-1` too).
- Not yet confirmed whether it's linked from anywhere besides the Dashboard card.
- **New, 2026-08-18: no `Breadcrumb` — same gap as `P0-0`/Settings, tracked together as `NAV-1`.**

**Done when:**
- [x] Real scope written down
- [x] Confirmed whether this was intentional (it was — real, scoped ticket)
- [ ] Manual test cases added to the test-case log
- [ ] Icon-asset question resolved
- [ ] Streak-on-Calendar question explicitly decided
- [ ] `NAV-1` resolved (breadcrumb/back navigation)

**Manual test cases:**
1. Visit `/calendar` directly and via the Dashboard card, confirm it loads without error.
2. Seed known reading/quiz activity, confirm the calendar's colored days exactly match what `P2-1`'s Study Statistics widget reports for the same period — this is now a real cross-consistency test, not a provisional one.
