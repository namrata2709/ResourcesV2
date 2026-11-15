# Notebook Buddy — Sprint Tickets: Tracks P / E / R / B (rewritten, 2026-08-09; corrected 2026-08-13)

Replaces the previous `sprint-tickets-tracks-PREB.md`. These tracks
aren't gated by the main tier sequence in `sprint-tickets.md`. Same
format as that file — components tagged by what they touch, decisions
moved out to `CHANGELOG.md` instead of sitting in the ticket list.

**Removed from the active ticket list this rewrite (pure decisions or
pointers, zero buildable work — moved to `CHANGELOG.md`):**
- `P0-4`, `R2-1`, `R4-2`, `R6-1`, `B-3`

**Recommend closing (its own Done-when is already satisfied):** `R3-1`
— its scoping work produced `R3-1a`–`d`, three of which are already
built.

**Split into smaller tickets this rewrite:** `B-4` → `B-4a`/`B-4b`/`B-4c`.

**2026-08-13 correction, applies to `P0-0` below:** the 2026-08-09 text
claimed "exactly 4" sections were registered (`Profile`, `Appearance`,
`QuickActions`, `Accessibility`). Direct inspection of the real barrel
file (`pages/Settings/sections/index.ts`) this session shows only **2**
uncommented imports — `ProfileSection` and `AppearanceSection`. The
`QuickActionsSection`/`AccessibilitySection` imports are commented out,
consistent with — not contradicting — what `P0-7`/`P0-9`'s own entries
already say elsewhere in this same document. `P0-0`'s "confirmed by file
listing" claim was simply wrong; corrected in place below rather than
left standing next to the two entries that already said otherwise.

---

## ✅ Status as of 2026-11-02 — halt lifted: prototype delivered, `Track UX` released

**Halt lifted 2026-11-02.** The prototype was supplied (`notebook_buddy_interactive_dashboard_settings_prototype.html`) and is the design reference; `Track PROTO` is closed and `Track UX` is released, to be built in the sequence at the end of the PREB file. **Unchanged and still binding:** the additive rule — the prototype is a *sample* of the look and of added features and omits many built features, so it never justifies removing anything. The original halt notice is kept below as history.

### Original halt notice (2026-10-31), kept

**ALL TICKETS HALTED for `Track PROTO` (prototype-first redesign).**

Every ticket in this file and in `sprint-tickets.md` is paused until the full-site prototype is signed off (`PROTO-8`, below). Paused = not started / not continued; nothing is cancelled or closed by this banner. The additive rule governs everything that follows: **keep every existing real feature, add the new experiences, remove or replace only what a written decision (`D1`–`D8`, `Track PROTO`) explicitly replaces.** New tickets from the design direction live in `Track PROTO` (the prototype itself) and `Track UX` (the real-app changes, all held until `PROTO-8`) at the end of this file; existing tickets amended in place this pass are marked **"Amended 2026-10-31"**.

---


# Track P — Personalization

### P0-0 — Shared Settings page
**Components:** [React]
**Status:** ✅ Done, confirmed directly. **History: on 2026-08-13, the original "4 sections registered" claim was corrected to 2 (only `ProfileSection`/`AppearanceSection` were actually uncommented at the time). As of this session (2026-08-14), the barrel now genuinely has 4 uncommented imports again — `P0-7`/`P0-9` both landed their barrel-wiring fix.** Not the same claim being re-validated; the real underlying gap it described has since closed.

**Reverse-engineered exactly — a real self-registration pattern, not a hardcoded page:** `pages/Settings/registry.ts` exports `registerSettingsSection({id, label, Component})`, called at module scope by each section file. `Settings.tsx` itself never imports a fixed list of sections — it calls `getSettingsSections()` and renders whatever's registered. Adding a new section is a one-line side-effect import in `sections/index.ts`, never a change to `registry.ts` or `Settings.tsx` itself. The registry's own comment explicitly names this as existing because 5 separate P0 tickets each independently needed "a settings panel" — this ticket is what stopped that from becoming 5 hardcoded imports.

**Two real safety details, confirmed in source, worth knowing before adding a new section:** duplicate `id` registration doesn't crash the page — it's a dev-mode `console.warn` and the duplicate is silently ignored (`sections.some(existing => existing.id === section.id)` guard), which specifically protects against hot-reload re-running a module during development. A separate `__resetSettingsSectionsForTests()` export exists purely because the registry is a module-level singleton — without it, one test file registering a section would leak that registration into every other test file sharing the same module graph.

**Real currently-registered sections, re-verified 2026-08-19 against a fresh `web.zip`:** `ProfileSection`, `AppearanceSection`, `QuickActionsSection`, `AccessibilitySection`, `ReadingPreferencesSection`, `DataBackupSection`, `OfflineReadingSection` — **7**, all uncommented. Grown from 5 to 7 as real developer work landed on `P4-1`/`P5-1` this session, both now confirmed done. Section count has moved three times in this document's own history (4 → 2 → 5 → 7) — each move reflected the real state at the time, not a repeated re-litigation of the same claim.

**Real navigation gap found 2026-08-18, tracked as `NAV-1`:** `/settings` has no `Breadcrumb`, unlike `Note.tsx`, which does. **Superseded, not just tracked, as of 2026-08-19** — `NAV-1`'s real fix is no longer "add a breadcrumb here," it's the app-wide sidebar/rail/tab-bar replacing breadcrumbs everywhere (`R2-1` reopened and reversed). Settings' own internal section tab-nav (the list of section names on the left, distinct from the removed app-wide `Breadcrumb`) is unaffected either way — that's real page-level sub-navigation, not the thing being replaced.

**Done when:**
- [x] Registry pattern in place, sections self-register
- [x] Dev-mode duplicate-id guard and test-reset escape hatch both present
- [x] All built sections actually reachable — **true as of this session**, `P0-7`/`P0-9`'s wiring gap is closed

**Manual test cases:**
1. Visit `/settings`, confirm all **7** real sections (Profile, Appearance, Quick Actions, Accessibility, Reading Preferences, Data Backup, Offline Reading) render, in registration order. **Corrected 2026-11-03:** this line said 5; `pages/Settings/sections/index.ts` in the 2026-10-05 upload has 7 uncommented imports.
2. In a dev build, attempt to register two sections with the same `id` (or trigger a hot-reload double-registration), confirm a console warning appears and the page doesn't crash or duplicate the section visually.
3. Confirm `/settings` is reachable via a visible in-app link (not just a typed URL) — check header/nav for the actual entry point.

### P0-1 — Personal Profile
**Components:** [React]
**Status:** ✅ Done, confirmed this session — `ProfileSection.tsx` registered via `P0-0`'s registry (one of the 2 real uncommented imports), backed by `ProfileContext` (one of `T2-1`'s 4 sibling contexts).
**Manual test cases:**
1. Set a name/avatar/greeting, reload Dashboard, confirm the greeting text (`buildGreetingText(profile)`, confirmed real function in `Dashboard.tsx`) reflects it.
2. Clear the profile entirely, confirm Dashboard falls back to a sensible default greeting, not a blank/broken header.

### P0-1b — Study goal field on Profile (**closed 2026-09-28 — already built; the ticket's premise was wrong**)
**Depends on:** `P0-1` (done) · **Components:** [React] · **Status:** ✅ Already exists — no work needed. Opened 2026-09-23 from the Settings redesign mockup as "genuinely new, not present in any real ticket." **That was wrong:** only ticket text was checked, not code. `ProfileSection.tsx` already renders an optional "Study goal" input backed by `profile.goal` (`ProfileContext`), and `UserMenu.tsx` already shows it back to the user (`profile.goal.trim()` line under the name), with tests (`ProfileSection.test.tsx`, `UserMenu.test.tsx`). It is separate from `P0-6`'s Daily Goal (`useDailyGoal`), which the same menu also shows — descriptive text only, no tracking.
**Remaining:** nothing. If the Dashboard redesign wants the goal shown in the hero, that belongs in `DASH-1`, not here.

### P0-2 — Extended Theme & Appearance
**Re-test 2026-11-14 (your local run): 🔴 confirmed — the Appearance settings change nothing visible on the pages you checked.** **Decision: do not fix it on the old look.** The fix belongs to the new design: `UI-1` defines the tokens and each page restyle (`DASH-1`, `UI-2`) must show a visible effect for accent, card radius, density and animations (added to their Done-when). Stays 🔴 and is **not** a Batch 1 blocker.

**Components:** [React]
**Status:** 🟡 **Amended 2026-10-31 — re-checked against the 2026-10-05 upload: the consuming code now exists; needs a visual click-through before this can be called done.** In that upload `--accent` is consumed through Tailwind `accent` utilities (`bg-accent`, `text-accent`, `border-accent`, `ring-accent`) in roughly 28 component files (about 66 uses), not one; `--card-radius` drives `rounded-[var(--card-radius)]` in `DashboardCardsGrid` and Gallery cards. Not verified in a browser, and the live-QA "no visible change" report below has not been re-run against this build. The token-vocabulary work for the approved design is `UI-1` (Track UX). *History, kept:* 🔴 **Corrected 2026-08-19 — confirmed via direct live QA, and worse than the source-only read suggested.** Real bug found via a user report + direct source verification, not from the manual test case below, which was written too generously ("confirm each visibly changes its own CSS custom property" is true at the variable level but misses that almost nothing reads it).

**Real root cause, traced precisely:** `AppearanceContext`'s `useEffect` → `applyAppearanceToDocument()` correctly sets `--accent`/`--card-radius` on `document.documentElement`, and both providers are correctly mounted in `App.tsx` — the data layer is genuinely fine. The bug is one level up: **`--accent` is consumed by exactly one component in the entire app** (`SelectedChip`, a small filter-chip element on Notes-index) — everything a user would actually look at (Dashboard cards, buttons, achievement cards, the profile/settings/notification icon circles) is hardcoded Tailwind, not reading the token. **`--card-radius` is consumed by exactly two components** (`DashboardCardsGrid`, Gallery image cards). A user changing Accent color in Settings and then looking at Dashboard — the most natural thing to do — will see no visible change, correctly, because Dashboard doesn't use `--accent` anywhere.

**Live QA confirms this exactly, plus one real discrepancy worth re-checking with fresh source:** direct report — "accent color never changes much anywhere, card radius, Density, Animations also no changes in dashboard cards." Accent/Density/Animations all matches the diagnosis above precisely (near-zero real consumers). **But `--card-radius` was already confirmed as consumed by `DashboardCardsGrid.tsx` in this same source** — if a live radius change genuinely shows no effect there too, either the consuming code has its own separate bug (e.g. a hardcoded Tailwind radius class winning over the inline style), or something changed between the source checked and the live instance tested. Needs a fresh source check specifically on `DashboardCardsGrid.tsx`'s real rendered radius, not assumed either way from the earlier finding alone.

**Confirmed NOT broken, worth not conflating with this:** Reading Preferences (`P0-8`) — see that ticket's own updated entry; deliberately scoped to note body text only, needs its own direct re-test in the right place, not lumped in with this bug.

**Done when:**
- [x] `AppearanceContext`'s data layer works (already true, not the gap)
- [ ] `--accent`/`--card-radius`/density/animations consumed broadly enough that changing them has a real, visible effect on the pages a user actually looks at (Dashboard, at minimum)
- [ ] The `DashboardCardsGrid` radius discrepancy specifically re-checked against fresh source — real consumer exists per this source, but live QA says no visible effect; resolve which is true
- [ ] Manual test case below rewritten to test visible effect on a real page, not just "the CSS variable changed in devtools"

**Manual test cases:**
1. Change accent color, look at Dashboard (not devtools) — **currently fails**, confirms the gap rather than assuming.
2. Change card radius specifically, check `DashboardCardsGrid` cards directly — **live QA says fails; source suggests it should work; needs fresh re-verification**, don't assume either finding without checking again.
3. Once fixed: confirm a real visible change on Dashboard specifically, not just Notes-index's filter chips.
4. Cycle the 3-theme toggle, confirm Appearance settings are unaffected and vice versa (this part was already correct, unchanged).

### P0-3 — Continue Where You Left Off
**Components:** [React — `T5-3a` is done, built here]
**Status:** ✅ **Done — confirmed this session against the new `web.zip`.** Real `ContinueReading` component + a new `hooks/useReadingProgress.ts` with genuine `scrollY` save/restore (throttled while reading, restored on return via `window.scrollTo(0, saved.scrollY)`), wired onto Dashboard. The old placeholder link in `lib/quickActions.ts` has been superseded by this real component.
**Done when:** [x] reopening a note restores scroll position, [x] dashboard shows a working "Continue Reading" deep link to the single most recent note.
**Manual test cases:**
1. Scroll halfway through a note, navigate away, return — confirm scroll position restored.
2. Check dashboard's Continue Reading card links to that exact note.
3. Regression: confirm pre-existing `readingProgress-folder-<folder>` entries still parse correctly — real shape confirmed: `{v:1, percent, timestamp}`, `scrollY` added as optional, not a version bump. `RecentlyViewed.tsx` was refactored this session to share the same `getRecentReadingEntries()` scan logic from `lib/readingProgress.ts` rather than duplicating it — confirmed intentional, not drift.

### P0-5 — Extend Recently Opened to quizzes
**Re-test 2026-11-14 (your local run): ✅ Recently Viewed looks right, and the 404 page works.** Closed.

**Components:** [React, current page]
**Status:** ✅ **Amended 2026-10-31 — found built in the 2026-10-05 upload; the ⬜ below is stale history.** `pages/Quiz/useQuizEngine.ts` calls `writeQuizOpened(quizId)` (`lib/readingProgress.ts:147`), which writes `readingProgress-quiz-<quizId>` — the name this ticket required, not the colliding `quizProgress-` shape. `components/RecentlyViewed/RecentlyViewed.tsx` interleaves notes and quizzes most-recent-first and cross-references `quiz-index.json`, silently dropping entries that no longer exist. **One real gap found while checking:** `RecentlyViewed` is mounted only on the 404 page (`pages/NotFound/NotFound.tsx`), **not on the Dashboard** — surfaced for `N1-2` / `DASH-1`, not fixed here. Manual-test cases below are unchanged and still worth one pass. *History, kept:* ⬜ **Still not built — re-checked this session against the new `web.zip`.** `RecentlyViewed.tsx` changed this session, but only to share its folder-scanning logic with `P0-3`'s new hook — it still reads only the `readingProgress-folder-` prefix, zero quiz-key handling.
**Naming reminder (already flagged in the doc, worth repeating):** use `readingProgress-quiz-<quizFile>`, NOT `quizProgress-<quizFile>` — one typo from colliding with the real, different `quiz_progress_<quizFile>` key.
**Manual test cases:**
1. Open a quiz, check dashboard Recently Viewed shows it interleaved correctly with notes, most-recent-first.
2. Confirm the new key name doesn't collide with `quiz_progress_<quizFile>` — check both keys exist independently in `localStorage` after opening a quiz.

### P0-6 — Daily Goal
**Components:** [React]
**Status:** 🟡 **Reopened 2026-10-31 — built and tested, but unreachable, and one of the three goal types is inert. Three real findings from the 2026-10-05 upload (fix = `DASH-4`, Track UX):** (1) `DailyGoalWidget` is imported nowhere — `components/Dashboard/Dashboard.tsx` mounts `QuickActionsBar`, `ContinueReading`, `MotivationalWidget`, `StudyStatisticsWidget`, `AchievementsWidget` and `DashboardCardsGrid` only; the only mentions are comments. `components/UserMenu/UserMenu.tsx` calls `useDailyGoal()` and shows "Today's goal" or "No daily goal set", but `chooseGoal`/`clearGoal` are used only inside the widget — **so no screen can set a goal.** (2) **The MCQ goal never advances:** `lib/dailyGoal.ts`'s header says `useQuizEngine.ts` increments it in `selectOption`, but a search of the non-test source finds no caller of `incrementDailyGoalProgress` except the hook's own `'time'` ticker (`useQuizEngine.ts` does not reference the daily goal at all). (3) **Mounting the widget as-is would double-count time:** `useDailyGoal()` starts its own 60-second `setInterval` in every component that calls it when the goal type is `time`, `UserMenu` already calls it app-wide, and each instance keeps its own copy of the goal, so a change made in one is invisible to the other until it re-reads. *History, kept:* ✅ Done, confirmed this session — `DailyGoalWidget.tsx`, reachable from the live Dashboard (unlike `P0-7`/`P0-9`, this one isn't gated behind Settings' barrel-import mechanism at all — it's a standalone dashboard widget, not a Settings section).

**Reverse-engineered exactly:** 3 goal types (`time`/`chapters`/`mcqs`), each with its own label formatter (`GOAL_TYPE_LABEL`, e.g. `"${target} min of study time"`). Progress computed as `goal.progress / goal.target * 100` via the shared `ProgressBar` component. Its own comment notes it tracks "across notes/quiz percent" — drawing from existing reading/quiz-progress data rather than a separate tracking mechanism — plus a "Change goal" escape hatch, since otherwise a picked goal could only change by manually clearing localStorage.

**Manual test cases:**
1. Set each of the 3 goal types, do the mapped activity, confirm progress increments correctly for that specific type only.
2. Use "Change goal," confirm it resets to a fresh target, not just relabeling existing progress.
3. Let the day roll over (or manipulate the stored date), confirm reset.
**Done when (added 2026-11-03):** [ ] closed by `DASH-4` — widget mounted, single ticker owner, MCQ progress wired; [ ] the manual cases above re-run against the mounted widget; [ ] the "reachable from the live Dashboard" claim re-verified by evidence, not assertion.

### P0-7 — Quick Actions
**Components:** [React]
**Status:** ✅ **Both real bugs confirmed fixed, 2026-08-19, against a fresh `web.zip` — not just reported as "being worked on."** `Dashboard.tsx` now imports and renders the real `QuickActionsBar` (renamed from `QuickActions`). `QuickActionsSection.tsx` now builds a real `selectedActions` array via `selectedIds.map(id => catalogById.get(id))`, so the visible Settings list order genuinely matches the live, reorderable order — not the static catalog anymore.

**New real finding, not a bug — a product question:** the **Revision** quick action's real destination is `/quiz-index` — the plain Quiz listing, not anything Revision-specific. Confirmed intentional-looking (a real, deliberate `href` in the catalog) rather than a bug, but worth a direct call on whether that's the intended long-term behavior or a placeholder pending a real Revision hub.

**Done when:**
- [x] `QuickActions.tsx` (now `QuickActionsBar`) actually rendered on Dashboard, reading the real saved order
- [x] `QuickActionsSection.tsx`'s list render order driven by `selectedIds`
- [ ] Favorites/Revision action destinations — Favorites confirmed correct (`Gallery?favorites=true`); Revision's `/quiz-index` destination — **decided 2026-11-06 (`D15`): keep it until `V0-1` ships, then repoint to `/revision`**

**Manual test cases:**
1. Reorder actions in Settings, confirm the visible list order changes immediately — **now passes**.
2. Toggle an action off, confirm it visually moves to an unselected group — confirm this specific behavior against the fresh source's actual unselected-item treatment (not yet re-checked this pass).
3. Save a specific order, visit Dashboard, confirm the Quick Actions bar renders that order — **now passes**.
4. Click Favorites specifically, confirm it lands pre-filtered on Gallery.
5. Click Revision specifically — confirm it opens `/quiz-index` (decided 2026-11-06, `D15`: stays until `V0-1` ships, then repoints to `/revision`).

### P0-8 — Reading Preferences
**Test blocked 2026-11-14:** your notes had no converted body text, so there was nothing to change. A ready-made sample note (`aws-reading-test`) and the conversion command are in `APPLY-INSTRUCTIONS-BATCH1.md`; the test is still to be run.

**Components:** [React] · **Status:** 🟡 **Corrected 2026-08-19 — re-flagged by live QA as "doesn't change anything," but source confirms the mechanism is real and deliberately scoped, not broken. Needs a direct re-test in the right place before concluding either way.**
Real: `applyReadingPreferencesToDocument()` sets 4 real CSS variables, consumed by `.notes-body-prose` in `index.css` — but **only there**, deliberately, since reading prefs are meant to affect note body text specifically, not the whole UI. If this was tested by looking at Settings itself, Dashboard, or a page other than an actual note's body content, it would correctly show no visible change — that's expected scope, not the bug. **Needs an explicit re-test opening a real note and checking the body text specifically before this can be called broken or confirmed working.**
**Manual test cases:**
1. Change font size/line height/family/width in Settings, then open an actual note (not Settings, not Dashboard) and check the body prose text specifically — this is the real test, not yet confirmed pass or fail this session.
2. Confirm it registers via the real self-registration pattern — confirmed structurally correct, not yet re-verified via click-through.
**Done when (added 2026-11-03):** [ ] with a real note open, changing font size, line height, family and width visibly changes the body text (`.notes-body-prose`); [ ] the same changes visibly do *not* alter Settings or the Dashboard (deliberate scope); [ ] Reading Preferences persists across reload; [ ] result recorded here as pass or fail — this ticket stays 🟡 until that click-through is done.

### P0-9 — Accessibility options
**Re-test 2026-11-14 (your local run):** Reduced motion and Focus mode showed no visible change; the other three toggles were not reported as problems (**please confirm**). **This is expected from what the rules do**, not necessarily a bug: Focus mode only restyles the *keyboard focus ring* (`[data-focus-mode='on'] :focus-visible` → a 3px outline in the primary colour) so nothing changes until you press **Tab**; Reduced motion only sets animation/transition durations to ~0 so there is nothing to *see* — you notice the **absence** of animation. How to test each is in `APPLY-INSTRUCTIONS-BATCH1.md`. Because both are hard to verify by eye, a small live preview in Settings is proposed (`SET-1`).

**Components:** [React]
**Status:** 🟡 **Amended 2026-10-31 — re-checked against the 2026-10-05 upload: all 5 attributes now have CSS rules; needs a click-through.** `index.css` contains rules for `data-high-contrast` (9 occurrences), `data-reduced-motion` (3), `data-focus-mode` (1), `data-dyslexia-font` (2, swapping to Atkinson Hyperlegible) and `data-larger-ui` (1, root font-size 112.5%), plus a regression test, `lib/a11yCssConsumption.test.ts`. Not verified in a browser; the "0 of 5" text below is history, not current state. The Settings → Accessibility "Show keyboard shortcuts" entry point (`P0-9b`) is outside these docs' older copy. *History, kept:* 🔴 **Corrected 2026-08-19 — reachable, but confirmed via exhaustive search that ALL 5 real toggles are functionally inert. Worse than previously documented (previously assumed working based on 3 toggles' existence, never verified end-to-end).**

**Real, exhaustive verification this session:** `applyA11yToDocument()` (`lib/a11y.ts`) correctly sets 5 real `data-*` attributes on `document.documentElement` — `data-high-contrast`, `data-reduced-motion`, `data-focus-mode`, `data-dyslexia-font`, `data-larger-ui`. Searched every `.css`/`.tsx`/`.ts` file in the app for any of these 5 attribute names outside `a11y.ts` itself — **zero results, for all 5, not just the 2 newer toggles (Focus mode, Larger UI) this session discovered.** The exact same root-cause pattern as `P0-2` (Appearance): the data layer is genuinely correct, nothing in the component/CSS layer consumes any of it. Confirmed independently by live QA: "No accessibilities is applied, just stores value."

**With this and `P0-7` both landing (and `P0-8` separately confirmed done this session), `P0-0`'s section count has moved twice in its own document history: 4 (claimed 2026-08-09) → 2 (corrected 2026-08-13) → 5 (real, current, this session).** Each correction reflected the real state at the time it was made, not a repeated re-litigation of the same wrong claim — `P0-0` itself now reflects current reality.

**Done when:**
- [x] `import './AccessibilitySection';` uncommented in the barrel
- [x] Confirmed visible on a real visit to `/settings`
- [ ] All 5 toggles have a real, visible effect — currently 0 of 5 do
- [ ] `[data-focus-mode="on"]`, `[data-larger-ui="on"]`, `[data-high-contrast="on"]`, `[data-dyslexia-font="on"]` all get real CSS rules; `[data-reduced-motion="on"]` gets a real animation/transition-disable rule (parallel to `AppearanceContext`'s separate `data-animations` mechanism — worth checking these two don't end up as two different, inconsistent ways of turning off motion)

**Manual test cases:**
1. Toggle each of the 5 options individually, confirm a real, distinct visible effect for each — **currently fails for all 5**.
2. With `reducedMotion` toggle OFF, confirm the OS-level `prefers-reduced-motion` media query is still independently honored (this part may already work via the OS-level query itself, independent of this app's own broken toggle — worth checking separately).

### P0-9b — Keyboard shortcuts: Settings button + labelling (**✅ Done 2026-09-28 — scope was smaller than opened as**)
**Depends on:** none · **Components:** [React] · **Status:** ✅ Done, verified in the 2026-09-28 snapshot (**that snapshot's code is not in the 2026-10-05 upload these copies were checked against** — `requestOpenShortcutsPanel` is absent there; treat as done in your newer tree and re-verify on the next upload). **Correction to the 2026-09-23 opening:** it said "no real ticket covers this, genuinely new UI." The panel already existed — `KeyboardShortcutsPanel` (built under `T3-1b`, mounted once in `App.tsx`, reads the shared `lib/keyboardShortcuts.ts` registry, opens on Shift+?). What was really missing was (a) a way to open it from Settings and (b) honest labelling (Settings said bare "?", which needs Shift).
**What shipped (per the 2026-09-28 snapshot):** `requestOpenShortcutsPanel()`/`subscribeOpenShortcutsPanel()` request channel in `lib/keyboardShortcuts.ts` so the Settings button opens the *same* single panel (never a second copy); "Show keyboard shortcuts" button in `AccessibilitySection.tsx`; hint text now says "Shift + ?"; new `KeyboardShortcutsPanel.test.tsx` (closed by default, opens on Shift+?, opens via the request channel, closes on Escape).
**Manual test:** press Shift+? from two different pages → panel opens; Settings → Accessibility → "Show keyboard shortcuts" → same panel; Escape closes.

### P0-10 — Sticky Notes
**Amended 2026-10-31 (`PROTO` decision `D4`):** this floating, per-page Sticky Note **stays as it is**. The Dashboard gets a *separate* Scratchpad card (`DASH-6`) for a long-lived draft; the two have different labels, storage and scope and must not be merged. Real evidence: `StickyNoteWidget` is mounted once in `App.tsx`, outside any page.

**Components:** [React]
**Status:** ✅ Done, confirmed this session — `StickyNoteWidget.tsx` + `hooks/useStickyNote.ts`, and (unlike `P0-7`/`P0-9`) not Settings-gated at all, so no barrel-wiring risk applies here.

**Reverse-engineered exactly:** genuinely per-page scoped via `usePageId()`, with an explicit re-sync `useEffect` on `pageId` change — confirmed this is real navigation-aware scoping, not a global note that happens to look page-specific.

**Manual test cases:**
1. Add a sticky note on page A, navigate to page B, confirm no bleed-through.
2. Return to page A, confirm the note persisted.
3. Delete a note, confirm actual removal from storage (devtools check), not just visual hiding.

### P0-11 — Dashboard Widgets (rearrangeable)
**Components:** [React]
**Status:** ✅ Done, confirmed this session — `lib/dashboardCardOrder.ts` + `DashboardCardsGrid.tsx`.

**Reverse-engineered exactly:** native HTML5 drag events, not a library — confirmed no drag dependency exists in `package.json`, and the ticket's own file list explicitly allowed either approach. Since native drag has no keyboard story on its own, every card also gets explicit Move-earlier/Move-later buttons (hidden until hover/focus, but always present in the DOM — not conditionally rendered — specifically so keyboard/screen-reader users can reach them without a pointer hover first). Order persists to a `dashboardCardOrder` key, deliberately knowing nothing about a card's actual shape — it only orders ids.

**Note found this session:** now that a real `"calendar"` standalone card exists (`T-CAL-1`, undocumented elsewhere), confirm it participates correctly in this drag-reorder mechanism too — not checked yet, since the card itself was only discovered this session.

**Manual test cases:**
1. Drag-reorder cards, reload, confirm persistence.
2. Using keyboard only (Tab to Move buttons, Enter/Space), reorder cards — confirm this works fully without a mouse.
3. Manually corrupt the `dashboardCardOrder` value in devtools (non-array), reload, confirm graceful fallback to default order, not a crash.
4. New: confirm the Calendar card can be reordered same as any other card.

### P1-1 — Highlighting
**Components:** [Python] [React]
**Status:** ✅ **Fixed and confirmed this session — real, well-tested resolution.** `generate_notes.py`'s `_extract_blocks()` now genuinely stamps `blockId` on every block via a shared `emit()` wrapper — confirmed every block type (`paragraph`, `list`, `table`, `code`, `heading`, `collapsible`, stashed callout/youtube/references/takeaways/image blocks) routes through it, not just the two types that had ids before. Sequential, document-order, one shared `itertools.count()` threaded through recursive calls so a collapsible's own id numbers lower than its children's — matches reading order.

**Real test coverage added alongside the fix, confirmed in `tests/test_body_prose_extraction.py`:** `test_every_block_at_every_nesting_level_gets_a_blockid` (its own docstring literally quotes the bug this session found: *"generate_notes.py must actually stamp blockId... zero blockId/block_id hits anywhere in this file"*), `test_blockids_are_unique_and_sequential_in_document_order`, `test_blockids_are_stable_across_two_regenerations_of_identical_markdown` — all 3 of this ticket's real correctness requirements now have a dedicated regression test, not just manual verification.

**Documented tradeoff, matching what the React side already assumed:** ids are positional, not content-hashed — stable across a same-content regeneration, but every block after an insert/delete/reorder renumbers. The fix's own docstring notes this is deliberate, not an oversight, and that React's highlight-anchoring code already treats an unresolvable `blockId` as "orphaned" gracefully rather than assuming permanence — confirmed this matches the defensive `blockId?: string` design found in `types.ts` last session, so no React-side change was needed to consume this fix.

**`types.ts`'s stale comment (which had claimed this was already done) is now simply true** — no correction needed there anymore, the claim caught up to reality.

**Done when:**
- [x] `generate_notes.py`'s `_extract_blocks()` stamps a stable `blockId` on every block, at every nesting level
- [x] Confirmed unique and sequential — real test, not just manual check
- [x] Confirmed stable across regeneration — real test, not just manual check

**Manual test cases:**
1. Select text in a note's body-prose, confirm the highlight UI now appears (this previously "passed" as bug-reproduction — now it should genuinely work, re-test to confirm the flip).
2. Highlight text with mouse (desktop), reload, confirm it persists.
3. Highlight text with touch selection (mobile/emulated), confirm it works.
4. Regenerate the note's HTML without changing content, confirm the highlight survives.
5. Regression: run `generate_notes.py`'s pytest suite (not independently re-run this session, source-confirmed only), confirm still green.

### P1-2 — Personal Notes (on highlights)
**Components:** [React]
**Status:** ✅ **Unblocked — `P1-1`'s real gap is fixed.** `HighlightNoteEditor.tsx` was already real and complete; it was waiting on data that now exists. Not independently re-verified via click-through this session (`web.zip` was unchanged — this fix was Python-only) — worth a QA-sweep pass to confirm the full chain works end-to-end now, but nothing here should still be blocked.
**Manual test:** click an existing highlight, add a note, confirm it displays with and persists alongside that highlight.

### P2-1 — Study Statistics
**Components:** [React] · **Status:** ✅ **Done — confirmed this session.** Real `lib/studyStats.ts` + `hooks/useStudyStats.ts` + `StudyStatisticsWidget`.
**Manual test:** seed `localStorage` with a known fixture set of the tracked keys, confirm every computed stat matches hand-calculated expected values.

### P2-2 — Study Streak
**Components:** [Same location as P2-1] · **Status:** ✅ **Done — confirmed this session.** Real, careful backward-walk streak calculation in `studyStats.ts` — explicitly handles the "today not yet over" edge case (doesn't zero out an ongoing streak just because today has no activity yet) separately from a genuine zero-activity day breaking the streak.
**Manual test:** simulate a multi-day activity fixture including a zero-activity day, confirm the streak correctly breaks on that day.

### P2-3 — Achievements
**Components:** [Same location] · **Status:** ✅ **Done — confirmed this session.** Real `lib/achievements.ts` with an explicit unlock-once guard (own comment: reports zero newly-unlocked achievements on a later check even if the threshold is still met) and a real `unlockedAt` epoch timestamp stored per achievement.
**Manual test:** seed fixture data crossing exactly one achievement threshold, confirm it unlocks exactly once.

### P2-4 — Motivational Dashboard
**Components:** [React] · **Status:** ✅ **Done — confirmed this session.** Real `lib/motivationalMessages.ts`, deliberately built with a `freshDeck()` shuffle-without-immediate-repeat mechanism specifically to satisfy "rotate without obvious short-cycle repetition" — the ticket's own phrasing is quoted directly in the code's comment, confirming it was built against this exact requirement, not a generic rotation.
**Manual test:** load the widget repeatedly across sessions, confirm messages rotate without obvious short-cycle repetition.

### P3-1 — Search Only My Notes
**Components:** [React, reusing `useSearch()` from `T3-3`] · **Status:** ✅ **Done — confirmed this session.** Real `pages/SearchMyNotes/SearchMyNotes.tsx`, genuinely reuses `useSearch()` — confirmed it imports the exact same hook, and `NotesIndex.tsx`'s `SEARCH_FIELDS` was exported specifically so this page shares the identical field/weight config rather than a re-typed copy that could drift.
**Depends on:** `P1-1` (now fixed), `P1-2` (now unblocked) — **still worth checking**: this ticket's original scope was "search scoped to highlights/bookmarks," but confirmed real code scopes it to favorited/bookmarked notes, not highlight content specifically — now that `P1-1` is real, worth confirming whether highlight-content search was intentionally descoped or is still pending, since the blocker that made this ambiguous is gone.
**Manual test:** search scoped to bookmarked notes, confirm results are limited correctly and ranked the same way main search ranks results.

### P3-2 — Revision Mode
**Components:** [React, on the Note page] · **Status:** ✅ **Unblocked — `P1-1`'s real gap is fixed.** Real, carefully-reasoned `pages/Note/revisionFilter.ts` — a heading/collapsible qualifies if its own id is bookmarked or contains a bookmarked/highlighted descendant. Both halves (bookmark and highlight) should now work; the highlight half was the only part genuinely blocked.
**Depends on:** `P1-1` (fixed), `P1-2` (unblocked), `T5-3c-7` (done), `T5-3a` (done)
**Manual test:** toggle Revision Mode on a note with a mix of bookmarked and highlighted content, confirm both categories show correctly — this is now a real end-to-end test, not a "bookmark-only for now" partial check.

### P4-1 — Export/Import (JSON backup)
**Components:** [React] · **Status:** ✅ **Confirmed done and well-engineered, 2026-08-19, against a fresh `web.zip`.** Real `lib/dataBackup.ts` + `DataBackupSection.tsx`. Genuinely thoughtful design: rather than hand-listing every storage key (confirmed ~20 files each own a key, plus per-item key builders in `storageKeys.ts` — a hand-maintained allowlist would silently go stale the moment any future ticket adds a key), it snapshots the *whole* of `localStorage` — the file's own comment confirms this app owns 100% of its own origin's storage, checked by grepping every `localStorage.setItem` call site. Import is version-aware per key (only overwrites when the incoming `v` is ≥ what's already stored), so an old backup restored after a shape change can't silently downgrade a newer key.

**The exact bug reported via live QA this session — "shows restore, but no actual restore" — is already fixed, and the fix's own comment names the bug report directly.** Root cause was real and precise: `importBackup()` correctly writes to raw `localStorage`, but every already-mounted React Context only reads its value once on mount — so restored data was real on disk but invisible in the running UI until a refresh. Fixed with a genuine `window.setTimeout(() => window.location.reload(), REFRESH_DELAY_MS)` after a successful import, giving the user time to read the real summary line first.

**Done when:**
- [x] Export produces a real file with every known key
- [x] Import actually restores (via the reload fix, confirmed)
- [x] Version-aware conflict handling prevents downgrade

**Manual test cases:**
1. Export, inspect the JSON, confirm every known personalization key is present.
2. Import that file, confirm the reload happens and restored values are genuinely visible afterward — **now passes**.
3. Hand-craft an import file with an older version number on one key, confirm it's correctly skipped rather than overwriting a newer value.

### P5-1 — Offline Mode
**Amended 2026-10-31:** `index.css` lines 1–2 `@import` Poppins and Atkinson Hyperlegible from `fonts.googleapis.com`, so a user who enables Offline Reading still depends on the network for fonts on a cold cache. Closing that is **`R1-2`**. The worker itself is `vite-plugin-pwa`; confirm the self-hosted font files are included in its precache list when `R1-2` lands.

**Components:** [React/Service Worker]
**Status:** ✅ **Confirmed real, 2026-08-19, and matches the opt-in design recorded in `PROJECT.md` §6 closely.** Real `OfflineReadingSection.tsx` calling real `enableOfflineReading()`/`disableOfflineReading()` — not a side effect of app boot. Confirmed `main.tsx` still has no automatic `registerServiceWorker()` call — registration is genuinely opt-in, not just an on/off UI sitting in front of an always-active worker.
**Not yet independently verified this session:** the real cache strategy split (Cache-First for shell vs. Stale-While-Revalidate for `/data/`), whether disabling truly unregisters + clears cache, and real offline behavior (needs a genuine network-drop test, not localhost — correctly flagged as untestable by the live QA report itself, not a gap in that report).
**Merge risk:** medium-high, per the original ticket — still budget real review time even though the opt-in shell is confirmed sound.
**Manual test cases:**
1. Confirm the toggle defaults OFF for a fresh visitor (no prior `offlineReadingEnabled` key).
2. Enable it, visit a few notes, go genuinely offline (network throttling, not localhost), reload, confirm those specific notes still render.
3. Disable it, confirm the worker unregisters and a real "Clear offline data" action exists, not just the toggle flipping.
4. Deploy a new build, confirm old caches don't serve stale assets forever.

---

# Track E — Export formats (DOCX / EPUB / PPT)

### E0-1 — Export scaffold + DOCX adapter
**Components:** [React] shared `exportAs(content, format)` entry point; [React] DOCX adapter (client-side library)
**Status:** ✅ **Done — confirmed this session.** Real `lib/exportAs.ts` scaffold + `lib/docxExport.ts` using the real `docx` library (`Document`/`Packer.toBlob`, client-side, no server round-trip). Wired into `Note.tsx`'s Tools > Download FAB item.
**Manual test cases:**
1. Download a note as DOCX, open in Word and separately in Google Docs, confirm both open without corruption warnings.
2. Confirm headings, paragraphs, code blocks, and tables all convert to something readable and correctly structured.

### E0-2 — EPUB adapter
**Components:** [React] EPUB adapter; [React] Export options UI; [React] Quiz Book variant; [React] Revision Book variant
**Status:** ✅ **Fully done now — `P1-1`'s fix closes the one real gap this ticket had.** Real dedicated `/export` page (`pages/Export/Export.tsx`), real scope options, real `lib/epubExport.ts`/`epubBook.ts`, real `quizBookExport.ts` and `revisionBookExport.ts` both wired to buttons. **Confirmed this session: `revisionBookExport.ts` genuinely imports and calls the real `loadHighlights()`/`groupHighlightsByBlock()` functions** — no stub, no placeholder — so unlike `T5-3c-6`, this one needed no React-side work at all; it was correctly built against the real data contract all along and was only ever blocked by `P1-1`'s Python gap, which is now fixed. The highlights portion should work automatically on the next real content regeneration.
**Depends on:** `E0-1` (done), `P1-1` (fixed)
**Also confirmed this session (completeness sweep):** `lib/notebookExport.ts` was previously undocumented and resolves its own real scope question — the exact selection rule for "whole notebook"/"favorites"/"bookmarked" (the 3 named scopes) is decided and documented in its own header comment: whole notebook = every note, full content; favorites = full content for favorited notes (favoriting is a "keep the whole thing" signal, not an excerpt request); bookmarked = only qualifying sections, reusing `revisionFilter.ts`'s exact rule rather than a second competing definition. "Current chapter" needed no separate logic — it's `Note.tsx`'s existing single-note export calls.
**Manual test cases:**
1. Generate an EPUB, open in a real e-reader (Apple Books or Calibre), confirm it opens correctly.
2. Generate a Quiz Book variant, confirm question → page break → answer key structure.
3. Generate a Revision Book variant on a note with real favorites + bookmarks + highlights, confirm all three now appear correctly — this is the real regression test now that the blocker is gone.
4. Check any SVG content converts to PNG or renders correctly.

### E1-1 — PPT adapter (title + bullets only, explicitly not visual parity)
**Depends on:** `E0-1` (done) · **Status:** ✅ **Done — confirmed this session.** Real `lib/pptxExport.ts`, dynamically imports the real `pptxgenjs` library.
**Components:** [React] `pptxgenjs`-based export
**Manual test cases:**
1. Generate a PPTX from a real deck, open in PowerPoint and separately in Google Slides, confirm both open correctly.
2. Confirm title + bullet content is present and correctly ordered per slide.

---

# Track R — Rebrand

### Ticket R0-1 — Vanilla site naming pass
**🗄️ LEGACY/VANILLA — frozen, recommend-closed, not active work.**
**Track:** R · **Tier:** 0 · **Type:** Build
**Depends on:** none · **Blocks:** none
**Status:** ➖ **Closed 2026-11-06 as obsolete (`D20`).** Vanilla `src/` no longer exists in the working tree (intentional — `T6-1`), so this ticket's Done-when (edits to vanilla pages) cannot be met; the React `index.html` title is already "Notebook Buddy", and the only remaining "Learning Dashboard" text in `web/src` is a code comment recording the old name. *History, kept:* ⬜ **Recommend closing without doing the work — real conflict with the 2026-08-13 vanilla-freeze policy ("no further changes go into vanilla, React only").** Re-checked directly against real vanilla source this session (`src.zip`, uploaded for reference): every field this ticket targets still says "Learning Dashboard" — `<title>`/`og:title`/`twitter:title`/JSON-LD `"name"`/visible `<h1>` in `index.html`, plus the string appears across every other vanilla HTML/CSS/JS file in the tree (60+ files, confirmed by grep). The gap is real and exactly as originally scoped — but this ticket's entire Done-when is vanilla edits, and vanilla is frozen. Two real options, not silently picked: (1) close this ticket as won't-do, accept "Learning Dashboard" stays visible on the live vanilla site until `T6-1` deletes it outright; (2) do the minimum external-facing subset only (OG/Twitter/JSON-LD meta, since those affect link-preview cards shared *before* `T6-1` lands) as a one-time exception, explicitly justified by user-facing impact rather than treated as a precedent for further vanilla work. Left as an open decision for you, not closed either way here.

**Components:**
1. [Vanilla/HTML] Page titles, OG tags, JSON-LD across every vanilla page
2. [Content] `README.md` heading
3. [Content] `package.json` product-facing strings (npm package name itself can stay `learning-dashboard`)

**Defined element list (every string to change):**
| # | File | Field | Current | Target |
|---|---|---|---|---|
| 1 | `index.html` | `<title>` | "Free AWS & DSA Notes, Quizzes \| Learning Dashboard" | "...\| Notebook Buddy" |
| 2 | `index.html` | `og:title` | same as above | same swap |
| 3 | `index.html` | `twitter:title` | same as above | same swap |
| 4 | `index.html` | JSON-LD `"name"` | "Learning Dashboard" | "Notebook Buddy" |
| 5 | `index.html` | visible `<h1>` | "🎓 Learning Dashboard" | "🎓 Notebook Buddy" |
| 6 | every other vanilla page (`quiz.html`, `notes-index.html`, etc.) | same 5 fields | same pattern | same swap — audit each page, don't assume `index.html`'s fix propagates |
| 7 | `README.md` | top heading | "Learning Dashboard" | "Notebook Buddy" |
| 8 | `package.json` | `"description"`/any product-facing string | old name | new name (package `"name"` field itself stays `learning-dashboard`) |

**Done when:**
- [ ] Item 1–5 done in `index.html`
- [ ] Item 6 done and independently verified per remaining vanilla page
- [ ] Item 7, 8 done

**Manual test cases:**
1. Open each vanilla page, check the browser tab title reads "Notebook Buddy," not "Learning Dashboard."
2. View page source, confirm OG/Twitter/JSON-LD all say "Notebook Buddy."
3. Share a link to any vanilla page on a platform that renders OG previews (or use a link-preview debugger) — confirm the preview card shows the new name.
4. Grep the whole vanilla source tree for the literal string "Learning Dashboard" after the change — zero remaining hits except in the npm package name itself.

---

### Ticket R1-1 — Finalize color tokens + font
**Amended 2026-10-31:** brand files (stacked/wordmark variants, and the logo/mascot files themselves) are no longer a prototype dependency (`PROTO-9` decided 2026-11-06, `D9`): logo files do not block the redesign and are needed only when this ticket is reached. The 2026-10-05 lean upload contains no logo or mascot images (only `favicon.svg` and `icons.svg`); the Brand Guide forbids regenerating them.

**Track:** R · **Tier:** 1 · **Type:** Build
**Depends on:** none · **Historically blocked `T0-5`** (`T0-5` seeded `tailwind.config.js` from these values) — **wording corrected this session:** `T0-5` is done and already carries R1-1's final values, not placeholders, so this relationship is resolved history, not a live blocker. Leaving the note only so no one re-derives a false "R1-1 must land before T0-5" ordering from ticket numbering alone.
**Status:** Re-confirmed this session against the real `ASSET-TODO.md` — accurate as previously documented, no correction needed. `tailwind.config.js` holds final values. Horizontal lockup delivered for all 3 themes, icon-only variant delivered (deliberately shared, not per-theme). **`stacked` and `wordmark` variants are the only real gap** — confirmed still listed as "genuinely not generated" in the real file this session.

**Components:**
1. [Design/Content] `stacked` and `wordmark` logo variants — export only, style already established by the horizontal/icon variants
2. [Vanilla CSS] / [Tailwind] — done (confirmed)

**Defined element list:**
| Variant | Per-theme or shared? | Status |
|---|---|---|
| Horizontal | Per-theme (3 files) | ✅ Delivered |
| Icon-only | Shared (1 file, intentional) | ✅ Delivered |
| Stacked | Per-theme (3 files, following the horizontal pattern) | ⬜ Missing, re-confirmed |
| Wordmark | Not yet determined whether shared or per-theme | ⬜ Missing, re-confirmed |

**Done when:**
- [x] All 3 themes' color values match brand-kit mockups
- [x] Horizontal + icon-only variants delivered
- [ ] Stacked + wordmark variants exported and placed alongside the existing ones
- [ ] `Logo.tsx`'s variant prop extended to actually offer `stacked`/`wordmark` once files exist

**Manual test cases:**
1. Toggle theme light → dark → comfort with `variant="horizontal"`, confirm correct per-theme asset renders in each (already passes today).
2. Once stacked/wordmark exist: render each variant explicitly, confirm `Logo.tsx` actually offers them as valid prop values, not just that the files exist unreferenced.
3. Regression: confirm the real hard rule from `Logo.tsx`'s own header comment — no component may reconstruct brand copy as text next to a logo image — still holds for any new usage of the new variants.

---

### Ticket R4-1 — Icon strategy: `lucide-react` + emoji fallback mapping
**Track:** R · **Tier:** 4 · **Type:** Build
**Depends on:** none · **Blocks:** nothing structurally — every Tier 3–7 ticket should check against this
**Status:** Re-confirmed this session against real `ASSET-TODO.md` — accurate as previously documented. Real production assets exist and are wired: `aws.png`/`quiz.png`/`dsa.png`, a full favicon/PWA icon set, and the automated `assets-source/` → `build-assets.mjs` → `public/` pipeline.

**New this session:** the undocumented Calendar card (`T-CAL-1`) needs its own icon-mapping decision — not yet covered by this ticket's scope, since the card itself wasn't known when this ticket was last scoped.

**Components:**
1. [Content/Reference] Consume `icon-inventory.md`'s existing sections 1–18, resolve its own flagged open items, publish as the canonical mapping for whatever hasn't been produced as a real asset yet

**Open items, updated:**
- Section 3 (Quiz bookmark icon source) — resolvable now, `quiz-toolbar.js` reviewed directly this session.
- Section 2 (grid-view icon inconsistency, Gallery vs Notes-index) — still needs reconciling.
- Section 8 (~47 category icons in scope or not) — still an open scope call.
- **New:** Calendar card icon — real PNG or emoji-fallback decision needed.

**Done when:**
- [ ] Every `icon-inventory.md` section has a final mapping OR a confirmed real asset already covers it
- [ ] The open items above resolved, including the new Calendar item

**Manual test cases:**
1. Pick 5 icons at random from the finalized mapping, confirm live usage matches.
2. Confirm grid-view icon consistency between Notes-index and Gallery.
3. New: confirm the Calendar card's icon renders correctly (real PNG or a deliberate, documented emoji fallback).

---

### Ticket R7-1 — Custom visual assets (icons, mascot GIFs, diagrams)
**Amended 2026-10-31:** `PROTO-9` was decided 2026-11-06 (`D9`) and adds no dependency. Typography is now decided (`D2`) and built by **`R1-2`**, not here.

**Track:** R · **Tier:** 7 (hard-gated after `T6-1`) · **Type:** Build
**Depends on:** `T6-1` (vanilla removed) + `R1-1` (stacked/wordmark logo variants — the only real remaining gap there)
**Status:** Re-confirmed this session against real `ASSET-TODO.md` — accurate as previously documented. Logo (delivered variants), full favicon/PWA set, 6 UI-chrome/subject icons, 2 dashboard illustrations all real and shipped. Bookmark/flag icon PNG upgrade still outstanding (real working SVG fallbacks exist today, confirmed — this is polish, not a functional gap). The stale "T5-1b" ticket-id reference inside the real `ASSET-TODO.md` itself is still present — don't misread it as evidence a feature is incomplete; the feature (bookmark/flag) is built, only the custom PNG is pending.

**Components — genuinely just the small real remainder now, not the original large bundle:**
1. [Design] `stacked`/`wordmark` logo variants (blocks on `R1-1` closing first, or lands together with it)
2. [Design] Bookmark/flag icon PNG upgrade (currently real, working SVG fallbacks — this is a polish upgrade, not a functional gap)
3. [Design] Any remaining category/chrome icons `R4-1` scopes in as still-needed, including the new Calendar icon decision

**Done when:**
- [ ] Component 1–3 delivered via the real `assets-source/` → `build-assets.mjs` pipeline (confirmed automated, not a manual step)
- [ ] Bookmark/flag SVG fallbacks confirmed still functioning correctly once/if PNGs are added (fallback path shouldn't regress)

**Manual test cases:**
1. Add a new asset to `assets-source/`, run the real generate-assets script, confirm it lands correctly sized in `public/` with no manual step.
2. Toggle themes for each new/updated asset, confirm no contrast failures.
3. Regression: re-run `R4-1`'s and `R1-1`'s manual tests.

---

### Ticket R5-1 — Mascot integration + marketing assets
**Amended 2026-10-31:** no prototype dependency remains (`PROTO-9` decided 2026-11-06, `D9`); the mascot files are still needed when this ticket is reached; real-app scope unchanged.

**Track:** R · **Tier:** 5 · **Type:** Build
**Depends on:** `R7-1` (needs the mascot set to exist) · **Blocks:** none

**Components:**
1. [React] Mascot at welcome/loading/empty-states/success moments only
2. [Content] Hero banner, OG images, README banner, social preview, doc cover

**Defined element list:**
| Moment | Mascot shown? | Asset needed |
|---|---|---|
| Welcome/first-load | ✅ | loader GIF (from `R7-1`) |
| Loading states | ✅ | loader GIF |
| Empty states | ✅ | empty-state illustration |
| Success moments (e.g. quiz complete) | ✅ | success illustration |
| Everywhere else | ❌ — explicit "avoid putting the mascot everywhere" | — |

**Done when:**
- [ ] Mascot appears in exactly the 4 moments above, confirmed absent elsewhere
- [ ] Hero banner, OG image, README banner, social preview, doc cover all exist and are wired into their real meta tags/files (not just created and unused)

**Manual test cases:**
1. Walk through the 4 listed moments in the live app, confirm mascot presence.
2. Walk through 5 other random pages, confirm mascot absence.
3. Share a link and check the OG image renders (same method as `R0-1`'s test 3).

---

# Track B — Backlog

### Ticket B-1 — Feedback system + Contact page
**Track:** B · **Tier:** 0 · **Type:** Build · **Status:** ✅ Confirmed done (Contact page real and routed at `/contact`, confirmed this session via `App.tsx`).

**Components:**
1. [React] Contact page (project info, contributor info, GitHub links, FAQ)
2. [Content/Integration] Embedded Google Form for feedback

**Manual test cases:**
1. Submit a real test entry through the embedded form, confirm it lands in the connected Google Sheet.
2. Visit the Contact page, confirm all 4 sections (project info, contributor info, GitHub links, FAQ) are present and each link resolves.

---

### Ticket B-2 — Notifications delivery mechanism
**Track:** B · **Tier:** 0 · **Type:** Decision-then-Build · **Status:** 🟡 **Phase 1 closed, 2026-08-14 — In-app only chosen.** Phase 2 now open.
**Depends on:** none

**Decision, recorded:** **In-app only.** Chosen over Push API and Email specifically because it's buildable today with zero new dependencies, and it extends something already real (`R3-1a`'s Notifications Bell for in-app-generated events) rather than starting from scratch. Push API was the stronger long-term reach option but is gated on `P5-1` (Service Worker, not built) — revisit as a phase-2 upgrade once `P5-1` lands for offline support anyway, rather than blocking this ticket on it now. Email was ruled out: needs a signup flow built from scratch plus an ongoing third-party service dependency, for marginal benefit on this audience.

| Option | Status |
|---|---|
| Browser Push API | Not chosen — revisit once `P5-1` ships |
| Email (Mailchimp/Buttondown) | Ruled out |
| **In-app only** | ✅ **Chosen** |

**Components:**
1. [React] Extend `R3-1a`'s Notifications Bell to cover whatever new in-app event types this ticket needs beyond what it already handles — check `R3-1a`'s real current event coverage first, don't assume it's empty
2. [Python or React, depends on what triggers a notification] Whatever produces the actual notification-worthy events (e.g. new content published, achievement unlocked per `P2-3`, streak milestone per `P2-2`) — real event sources to wire in, not invented here

**Done when:**
- [x] Phase 1 — option chosen and written down
- [ ] Phase 2 — real Done-when: notification events defined (which real app events trigger one — check `P2-2`/`P2-3`/`T-CAL-1` and any content-publish signal as candidates); Bell UI extended to show them; read/unread state persists

**Manual test cases:**
1. Trigger a real defined event (e.g. unlock an achievement), confirm a notification appears in the Bell.
2. Mark as read, reload, confirm read state persists.
3. Confirm no notification fires for an event not on the real defined list — proves the trigger set is intentional, not accidentally broad.

---

### Ticket B-4 — Testing/DX: CI additions (split into 3)
**Track:** B · **Tier:** 0 · **Type:** Build
**Depends on:** `T0-3` — ✅ confirmed real and running as of 2026-09-23 (non-blocking, see `T0-3`'s own entry); all 3 children (`B-4a`/`B-4b`/`B-4c`) now confirmed done

#### B-4a — Visual regression testing
**Components:** [Tooling] Playwright screenshot-diff config, added to existing Playwright suites
**Status:** ✅ **Done — confirmed this session.** Real `e2e/visual/*.spec.ts` suite (Dashboard, Gallery, Notes-index, Quiz-index, Note, NotFound — 6 real spec files) + `playwright.config.ts`/`tsconfig.playwright.json`. Wired into the real `.github/workflows/ci.yml`.
**Done when:** [x] a CI run produces a real screenshot diff report between two commits, non-blocking.
**Manual test:** intentionally change one component's visual style, confirm the CI report flags it.

#### B-4b — Code coverage tracking
**Components:** [Tooling] Python coverage + JS coverage, both reported in CI
**Status:** ✅ **Both halves real, 2026-09-23 status recheck.** JS half unchanged (real `js-coverage` job). **Python half found real:** `.github/workflows/coverage.yml` runs the actual `python/` pytest suite and posts a coverage summary via `print_coverage_summary.py` — same root cause and fix as `T0-3` (a relocated, real workflow file, not a missing one). **Caveat:** non-blocking (`continue-on-error: true`) — reported, not gated. *History, kept:* 🟡 **JS half done. Python half corrected 2026-08-17 — real work, not blocked on anything.** Real `js-coverage` job in `.github/workflows/ci.yml` (`npm run test:coverage`, uploads a real artifact, posts a real summary table to the job). Python coverage isn't wired yet — **same root cause as `T0-3`, and the same correction applies**: this isn't a missing file or an unmerged-repo problem, it's simply that the one shared `ci.yml` doesn't yet have a real Python coverage step pointed at the `python/` subtree of the monorepo. Do this alongside `T0-3`, not as a separate investigation.
**Done when:** [x] JS coverage — a CI run produces a real coverage percentage, non-blocking; [ ] Python coverage — real remaining work, sequence with `T0-3`.
**Manual test:** intentionally add an untested function, confirm coverage % drops in the report.

#### B-4c — Lighthouse audits
**Components:** [Tooling] Lighthouse CI step (performance/accessibility/SEO/best-practices)
**Status:** ✅ **Done — found real, 2026-09-23 status recheck.** Genuinely new since this ticket was last checked: a real `lighthouse` job in `.github/workflows/ci.yml`, labeled `(B-4c)`, running `npx @lhci/cli autorun --config=./lighthouserc.json` against 4 real URLs (`web/lighthouserc.json`: home, notes-index, quiz-index, one real note page); non-blocking (`continue-on-error: true`); report uploaded as an artifact. *History, kept:* ⬜ Still not built — confirmed earlier, no Lighthouse reference anywhere in the real `ci.yml`.
**Done when:** [ ] a CI run produces a real Lighthouse report, non-blocking
**Manual test:** intentionally add an accessibility violation (e.g. an image with no `alt`), confirm the report flags it.

*(All three: none block deploy, matching `audit_content.py`'s existing "warnings don't block" philosophy.)*

---

### Ticket B-5 — Adaptive SVG favicon
**Weight finding, 2026-09-28 (found via `DX-5`'s packaging run):** the current `web/public/favicon.svg` is **1,221,279 bytes** — an embedded raster (`data:image`) wrapped in SVG by RealFaviconGenerator, and `index.html` links it as the SVG icon, so browsers that prefer SVG fetch 1.2 MB on first load for a tab icon. This makes the real vector redo more valuable than the light/dark nicety alone; a clean vector favicon should be a few KB. Until then, consider dropping the `<link rel="icon" type="image/svg+xml">` line so browsers use the PNG/ICO set already shipped (needs a product call — it changes what modern browsers show). *(Re-confirmed present in the 2026-10-05 upload.)*

**Amended 2026-10-31:** page-weight and offline relevance — fonts are also loaded from Google Fonts at runtime; self-hosting is **`R1-2`**. Together with this ticket's 1.2 MB `favicon.svg`, those are the two largest avoidable first-load costs found in the 2026-10-05 upload.

**Track:** B · **Tier:** 1 · **Type:** Build
**Depends on:** `R7-1` (needs final logo/icon assets)

**Components:**
1. [Design] Adaptive SVG favicon asset (light/dark variants, `prefers-color-scheme`-driven)
2. [React] Wire the new favicon link, replacing the fixed PNG set — **corrected 2026-08-13:** this ticket depends on `R7-1`, which is hard-gated after `T6-1` (vanilla already deleted by then), and the 2026-08-13 vanilla-freeze policy means "whichever is live at build time" was never going to resolve to vanilla in practice. Simplified to React-only, no real scope change.

**Done when:**
- [ ] Favicon adapts to system light/dark mode in browsers that support SVG favicons
- [ ] PNG fallback still present for browsers that don't

**Manual test cases:**
1. Toggle OS-level light/dark mode, reload the site, confirm favicon changes in a supporting browser.
2. Open in a browser without SVG favicon support (or simulate via devtools), confirm the PNG fallback still renders.

---

### Ticket B-6 — 404 enhancements (popular resources)
**Track:** B · **Tier:** 0 · **Type:** Build · **Status:** 🟡 **Components 1–2 done, confirmed earlier this session** (`popular-notes.json` real, `PopularNotes` component wired into `NotFound.tsx`) — **this ticket's own text hadn't been updated to reflect that until now, only the status-table summary had.** Component 3 (automatic redirect, below) is a newly-added real scope gap, not done.

**Components:**
1. [Python] New script generating `popular-notes.json` (most-favorited/most-visited if that data exists; otherwise a manually-curated list as v1)
2. [React] `NotFound` page — render a "Popular Notes" section alongside existing `RecentlyViewed`

**Scope gap found this session, added — not previously in this ticket:** the original backlog spec this ticket is based on (`consistency-and-tech-roadmap.md`'s US-132) names two missing pieces, "popular resources" (component 2 above) **and** "automatic redirect" — the latter was dropped somewhere between that doc and this ticket's current text. Real scope, not yet designed: after some real delay (e.g. 5–8 seconds) on the 404 page with no user action, redirect automatically to the closest sensible destination (Dashboard, or a fuzzy-matched real route if the broken URL closely resembles one) rather than leaving the user stranded indefinitely. Needs its own small design pass (exact delay, cancel-on-interaction behavior, redirect target logic) before a real Done-when can be written for this half.
3. [React] Automatic redirect after a real inactivity delay, cancelable by any user interaction

**Done when:**
- [ ] Component 1: `popular-notes.json` generates successfully, real data or a documented manual-curation fallback
- [ ] Component 2: `NotFound` shows a real popular-notes list, not just search + recently viewed
- [ ] Component 3: automatic redirect fires after the chosen delay, is cancelable, and targets a sensible destination — real behavior TBD pending the design pass above

**Manual test cases:**
1. Navigate to a broken URL, confirm the 404 page shows a non-empty Popular Notes section.
2. Click a Popular Notes entry, confirm it navigates to a real, working note.
3. Regression: re-confirm search and Recently Viewed (the parts already built) still work.
4. Once component 3 exists: land on the 404 page, take no action, confirm automatic redirect fires after the real delay; land again and interact (scroll, click), confirm the redirect is canceled.

---

### Ticket B-7 — Shared QR-share component
**Track:** B · **Tier:** 0 · **Type:** Build · **Status:** ✅ Confirmed done (`ShareQR`, tested, consumed by `B-8`/`T5-1`).

**Components:**
1. [React] `ShareQR` component — URL string in, client-side QR out, no network call

**Manual test cases:**
1. Generate a QR for a real quiz URL, scan it with a phone camera, confirm it opens that exact quiz.
2. Confirm the same component instance is imported (not copy-pasted) at all 3 real call sites (`B-8`, `T5-3a`, `T5-1`) — grep for a second implementation, confirm there isn't one.

---

### Ticket B-8 — Link pages (multi-profile Linktree)
**Track:** B · **Tier:** 0 · **Type:** Build · **Status:** ✅ Confirmed done this session directly against `App.tsx` — `/namu`, `/chandra`, `/todd` routes real, `LinkPage` component real, slug-based routing confirmed.

**Components:**
1. [Python] Markdown-per-profile → JSON generator
2. [React] `LinkPage` — profile header + grouped link cards, Link/Announcement block types
3. [Content] Real profile markdown files (`/namu`, `/chandra`, `/todd`)

**Manual test cases:**
1. Visit each of the 3 live profile URLs, confirm profile info + all link cards render correctly.
2. Add a 4th test profile's markdown file, run the generator, confirm a new route appears with no code change.
3. Scan the `ShareQR` button on a profile page, confirm it opens that exact profile.

---

### Ticket B-9a — Performance Dashboard (user-facing, in-app runtime view)
**Track:** B · **Tier:** 0 · **Type:** Build · **Status:** ⬜ Not started. **Parked 2026-11-06 (`D17`).** A performance page has no place in the approved navigation (`D1`) or the prototype; Lighthouse CI (`B-4c`) and the `B-9b` build report cover the developer need. If it is wanted later, the recommended home is a Settings → More Settings "Diagnostics" row built through the existing section registry (`SET-1`).
**Real evidence:** the app has no runtime performance measurement — a search of `web/src` finds no `PerformanceObserver` or `performance.getEntries` use, and `web-vitals` is not a dependency. Lighthouse (`B-4c`) measures from CI, not the visitor's session. `useAnalyticsPageView` (`T3-2a`) exists for page views only.
**Scope:** read the browser's own `PerformanceObserver` entries (navigation timing, first contentful paint, largest contentful paint, layout shift) for the **current session only**, entirely client-side — no network call, nothing stored beyond the session (or one small versioned key if history is wanted). A plain table with good/needs-work labels using the published thresholds; unsupported metrics (e.g. Safari lacks some entry types) show "not available", never a fake value.
**Done when:** [ ] the page lists each metric with a value or "not available"; [ ] no network request is made; [ ] a browser lacking an entry type does not throw; [ ] unit tests feed fixture entries and assert the labels.
**Manual test cases:** open the page after loading Notes, confirm values appear and are plausible against DevTools' Performance panel; open it in a browser without LCP support and confirm "not available".

### Ticket B-9b — Build artifact report (developer-only bundle/data-size report)
**Track:** B · **Tier:** 0 · **Type:** Build · **Status:** ⬜ Not started.
**Real evidence:** `web/` builds with Vite; there is no bundle analyser or size report today (`package.json` has no visualizer/report plugin). Largest data payloads are the JSON indexes under `web/public/data/index/` (`notes-index.json`, `quiz-index.json`, `dashboard-cards.json`, `popular-notes.json`) — only a few KB in the lean upload (sample data), so the report's value is catching growth, not today's size. Overlaps in spirit with `B-4b`/`B-4c` but measures output size, not tests or quality scores.
**Scope:** a build-time step (a small Vite plugin or post-build script, wrapped by a `dashboard.py` subcommand consistent with `DX-3`) writing `build/performance-report.json`: per-chunk sizes (raw and gzip), total JS/CSS, and the size of each file in `public/data/index/`; uploaded as a CI artifact next to the visual-diff report. Optional soft budget (warn above a threshold, never fail the build — same "warnings don't block" philosophy).
**Done when:** [ ] one `npm run build` produces the report with every route chunk listed; [ ] a deliberately added large dependency changes the totals; [ ] CI uploads it as an artifact; [ ] a Python or Node test covers the report's shape.
**Manual test cases:** run the build, open the report, compare the total against `dist/` on disk; import a large library in one page and rebuild to confirm the chunk grows.

### Ticket B-9c — Lighthouse audits (CI quality gate)
**Status:** this is `B-4c`, already ticketed above in Track B's `B-4` split — not a new ticket, just confirming it's the third leg of the same 3-way distinction (CI/build quality) and shouldn't be duplicated here.

---

# Track M — Manual Test Log Maintenance (new, 2026-08-14)

The real `manual-test-case-log.xlsx` (184 rows, 2 sheets: `Test Case Log` + `Summary`) was generated once, from the **2026-08-09** ticket rewrite, and never updated since. Cross-checked directly against the current ticket files this session: it's stale in three concrete ways (ticket-ID drift from splits, missing coverage for tickets created after 2026-08-09, and untagged coverage), plus genuinely missing category coverage the project doesn't have at all yet. Each ticket below is one scoped, closeable unit — same discipline as everywhere else in this doc: real findings, real done-when, no bundling unrelated fixes into one ticket.

**Not a ticket, a standing rule once `M0-*` closes:** whenever a ticket in `sprint-tickets.md`/`sprint-tickets-tracks-PREB.md` splits, gets created, or changes status, the log gets touched in the same pass — the drift documented in `M0-1`–`M0-5` is exactly what happens when this doesn't happen. Worth a one-line note at the top of the spreadsheet itself once `M0-1` lands, so whoever edits ticket status next sees the reminder in the artifact, not just in this doc.

## Tier M0 — Fix drift (do first, cheap, unblocks accurate coverage numbers)

### M0-1 — Re-sync `Ticket Status (as scoped)` and `Ticket Title` columns
**Depends on:** none · **Type:** Data fix
**Real scope:** every row's `Ticket Status (as scoped)` column reflects a 2026-08-09 snapshot. At minimum, the following tickets have flipped status at least once since (some twice) and every row for them needs the column updated to match the current ticket file: `T1-4`, `T1-5`, `T3-7a`/`T3-7b`/`T3-7c` (see `M0-2`), `T3-8`, `PY-1`, `T5-3a`, `T5-3c-1`, `T5-3c-2`, `T5-3c-3`, `T5-4a`–`T5-4e` (see `M0-3`), `P0-3`, `P0-7`, `P0-9`. Don't hand-guess the new value — pull it directly from the current ticket text for each, the same discipline used everywhere else in this project.
**Done when:** [ ] every row's status column matches its ticket's real current status; [ ] a spot-check of 10 random rows against the live ticket files shows zero mismatches.

### M0-2 — Split `T3-7`'s 4 existing rows into `T3-7a`/`T3-7b`/`T3-7c`
**Depends on:** none · **Type:** Data fix
**Real rows to reassign** (content read directly from the log this session):
- `TC-0033` (fake subject through pipeline to Dashboard card) and `TC-0036` (per-subject output vs. `features` list) → `T3-7a` (registry + loader — this is what they actually test)
- `TC-0034` (drop a feature from AWS, confirm section absent) → `T3-7b` (the `features`-driven section-gating this exercises)
- `TC-0035` (subject missing required `label` field) → `T3-7c` if it's testing `metaDescription`-style validation, or `T3-7b` if it's testing `detect_subject`'s fail-loud path — **check the row's own Preconditions/Expected Result text directly before assigning, don't guess from the row ID alone**
**Done when:** [ ] all 4 rows reassigned to a real `T3-7a`/`b`/`c` id, none left under the retired parent `T3-7`; [ ] each reassignment double-checked against what the row's steps actually exercise, not assumed from position.

### M0-3 — Split `T5-4`'s 6 existing rows into `T5-4a`–`T5-4e`
**Depends on:** none · **Type:** Data fix
**Real rows to reassign:**
- `TC-0082` (keyboard-only deck navigation) → `T5-4b`
- `TC-0083` (fullscreen chrome vs. `T1-2`) → `T5-4a`
- `TC-0084` (engage block against real generated JSON) → `T5-4c`
- `TC-0085` (regression: re-run `T5-2`'s tests) → applies to all of `T5-4a`–`e` collectively, per the current ticket text's own regression note — either duplicate this row under all 5, or keep one row tagged at the `T5-4` parent level as a cross-cutting regression check (pick one convention, don't leave it ambiguously under a retired id)
- `TC-0086` (375px width) → `T5-4a`/`T5-4b` (Responsive type — check which sub-ticket's manual tests actually cover viewport width; may need a new row if neither currently does)
- `TC-0087` (malformed engage block) → `T5-4c`
**Also add:** no existing row covers `T5-4d` (speaker-notes panel) specifically — confirmed by content, not just id, since none of the 6 mention notes/speaker panel. Needs a net-new row, not just a reassignment. Same for `T5-4e` (slides fallback redirect) — didn't exist as a ticket in the 2026-08-09 log generation at all.
**Done when:** [ ] all 6 original rows reassigned per above; [ ] `T5-4d` and `T5-4e` each have at least 1 real row, added not just relabeled.

### M0-4 — Remove the stale `B-4` parent stub row
**Depends on:** none · **Type:** Data fix
**Real finding:** `TC-0166` is a single placeholder row under the retired parent `B-4` reading "(No manual test defined yet in ticket text — needs authoring)" — superseded by `B-4a`/`B-4b`/`B-4c`, which already have their own real rows. Delete `TC-0166` outright rather than leaving a dead parent-id row alongside its 3 real children.
**Done when:** [ ] `TC-0166` removed; [ ] `B-4` (bare, unsuffixed) no longer appears anywhere in the `Ticket` column.

### M0-5 — Add coverage for tickets with zero rows
**Depends on:** none · **Type:** New content
**Real gap, confirmed by full cross-reference against the current ticket files this session:** `T5-3c-7` (bookmark star UI — created this week, genuinely never had rows) and `T-CAL-1` (Calendar — undocumented feature, its own ticket's Done-when isn't even fully scoped yet, so full test authoring should wait on that, but a placeholder row set following the ticket's own "provisional" manual tests should exist now rather than leaving it invisible in the log).
**Done when:** [ ] `T5-3c-7` has real rows derived from its actual Done-when/manual tests; [ ] `T-CAL-1` has at minimum the 2 provisional rows from its own ticket text, clearly marked provisional pending real scope.

## Tier M1 — High-priority missing categories (real risk in this specific app, not generic advice)

### M1-1 — Add Accessibility as a dedicated Test Type; retag + extend
**Depends on:** `M0-1` · **Type:** New category
**Real scope:** ~20 existing rows already exercise keyboard/focus/aria/contrast behavior (from `T3-2b`, `P0-9`) but are tagged `Functional` — nobody can currently answer "have we done an accessibility pass" without reading every row. Retag those rows `Accessibility` where that's genuinely their primary purpose (not every row that happens to mention a button). Then add net-new rows for what isn't covered yet: `P0-9`'s 3 real toggles (`highContrast`/`reducedMotion`/`dyslexiaFont`) tested as a dedicated pass rather than incidentally; the real `Alt+E` Exam Mode shortcut (`T5-3c-3`); a full keyboard-only pass across `T5-4`'s Slides deck (not just `TC-0082`'s nav-only check — tab order through the FAB menus, engage-block options, comparison-slide columns).
**Done when:** [ ] existing rows retagged where accurate; [ ] net-new rows added for the 3 items above; [ ] `Summary` sheet's "By Test Type" table includes a real `Accessibility` count.

### M1-2 — Add Deployment as a dedicated Test Type; retag + extend
**Depends on:** `M0-1` · **Type:** New category
**Real scope, and why this is higher-risk here than generic advice suggests:** this app runs client-side routing under a real GitHub Pages project-subpath (`vite.config.ts`'s `base: '/ResourcesV2/'`) — `T0-5`'s own manual tests already flagged dev-server vs. built-output as genuinely different code paths, and `T3-6`'s real route table has multiple legacy-redirect shapes (`OldNotesRedirect`, `/quiz` → `/quiz-index`) that only work because React Router runs client-side. `T6-1` (vanilla removal, all blockers now cleared) makes this materially higher-risk the moment it ships — external links/search-engine-indexed URLs pointing at deleted vanilla `.html` pages need to resolve through React Router's catch-all, not 404, and nothing currently tests that systematically. Retag `T0-5`'s/`T3-6`'s existing base-path/redirect rows to `Deployment`. Add net-new rows: full route table (every real route from `T3-6`'s table) loaded fresh on the actual deployed URL, not `localhost`; every old-style vanilla URL shape hit directly once `T6-1` ships; asset-path 404 check via DevTools Network tab on the deployed build specifically.
**Done when:** [ ] existing rows retagged; [ ] net-new rows cover the full real route table on the deployed URL; [ ] a dedicated pass scheduled to run again specifically after `T6-1` ships (not just once, generically).

### M1-3 — Add Cross-Browser as a dedicated Test Type
**Depends on:** `M0-1` · **Type:** New category
**Real scope:** 3 stray mentions in 184 rows today. Add net-new rows (Chrome/Firefox/Edge minimum, Safari if available) for the highest-risk real features specifically: `T5-4a`'s native Fullscreen API chrome (browser fullscreen support/behavior genuinely varies), the Quiz engine's core flow, theme switching (`T0-5`'s CSS custom property mechanism), and `T5-3c-1`'s Lite Mode print-categorization (print rendering is a classic cross-browser trap).
**Done when:** [ ] net-new rows added for the 4 features above, each across Chrome/Firefox/Edge at minimum.

## Tier M2 — Medium priority

### M2-1 — Add Recovery as a dedicated Test Type
**Depends on:** `M0-1` · **Type:** New category
**Real scope:** quiz and note state are entirely `localStorage`-driven in this app — this is a real risk class given how many separate keys exist (`quiz_progress_<file>`, `notes_mcq_progress_<folder>`, `readingProgress-folder-<folder>`, `dashboardCardOrder`, `a11yPrefs`, `quickActions`, and more). Add rows: refresh mid-quiz (confirm in-progress answers aren't lost, or confirm the documented reset behavior if that's real intended behavior — check first, don't assume); clear `localStorage` mid-session on a note with an active reading-progress entry; close-tab-and-reopen for both quiz and note progress; corrupt a single known key (e.g. `dashboardCardOrder` — `P0-11`'s own ticket already documents the expected graceful-fallback behavior) and confirm the documented fallback actually fires.
**Done when:** [ ] rows added for all 4 scenarios above, each citing the specific real storage key involved.

### M2-2 — Add Performance as a dedicated Test Type (manual spot-check, not the automated `B-4c` Lighthouse CI)
**Depends on:** `M0-1`, informed by (not blocked on) `B-4c` · **Type:** New category
**Real scope:** `B-4c` automates Lighthouse in CI — this is a different, human spot-check pass before a release, not a duplicate. Add rows: manual Lighthouse run on Dashboard, a real Note page (with `T5-3a`'s body-prose + all module types), Quiz, and Slides (`T5-4`, likely the heaviest page given SVG/engage rendering) — record Performance/Accessibility/Best-Practices/SEO scores each time as a baseline, not just pass/fail.
**Done when:** [ ] 4 rows added, one per page type; [ ] a real baseline score recorded at least once so future runs have something to compare against.

## Tier M3 — Lower priority, still worth adding

### M3-1 — Add SEO as a dedicated Test Type
**Depends on:** `M0-1` · **Type:** New category
**Real scope:** `T3-2a` built real analytics/SEO meta infrastructure (`gtag.js`, `send_page_view: false` + `useAnalyticsPageView`); 2 stray mentions exist in the log today. Add rows verifying real OG/Twitter/JSON-LD meta per major route, and confirming `useAnalyticsPageView` fires a tracked `page_view` on client-side navigation (the specific real mechanism `T3-2a`'s ticket text already documents as non-obvious).
**Done when:** [ ] rows added covering meta tags on at least Dashboard/Note/Quiz, and the `page_view`-on-navigation check.

### M3-2 — Add Security as a dedicated Test Type (intentionally small scope)
**Depends on:** `M0-1` · **Type:** New category
**Real scope:** zero backend, zero auth — so this stays deliberately small, not padded to look thorough. Add rows: grep the real built bundle for accidentally-included secrets/API keys; confirm no sensitive data is ever written to `localStorage` (the app's own real keys are all study-progress/preference data, worth a one-time confirmation this stays true); a dependency-audit spot check (`npm audit` or equivalent) as a recorded manual step, not just assumed clean.
**Done when:** [ ] 3 rows added per above, each with a real recorded result, not just "looks fine."

### M3-3 — Add an Exploratory session log (not scripted rows)
**Depends on:** none · **Type:** New process, not new spreadsheet rows
**Why this doesn't fit the existing row format:** exploratory testing is deliberately unscripted — forcing it into `Test Step / Scenario` columns defeats the point. Given how much this session alone found wrong purely from source-reading (see `CHANGELOG.md`'s repeated corrections), a real "click around like a confused user" pass by someone who didn't build the feature would likely surface UI-level bugs no scripted case catches.
**Done when:** [ ] a new tab/sheet added to the workbook (not new rows in `Test Case Log`) for free-form exploratory session notes: date, tester, area explored, anything unexpected found — logged as a running list, not a pass/fail table.

---

**Track M summary, for the `Summary` sheet once these land:** `M0-*` fixes drift in the existing 184 rows without adding new categories. `M1-*`/`M2-*`/`M3-*` add 7 new Test Type values (`Accessibility`, `Deployment`, `Cross-Browser`, `Recovery`, `Performance`, `SEO`, `Security`) plus one new non-tabular sheet (`M3-3`). Do `M0-*` first — the coverage numbers `M1`–`M3` are working toward are meaningless until the existing rows are attributed to the right, current ticket ids.

---

# Track G — Games Platform (new, 2026-08-14; major update 2026-08-19 — real knowledge dataset now exists)

**Major update, 2026-08-19: this track is no longer 0% built.** A real, structurally-corrected knowledge+game dataset (`aws-knowledge-json-corrected/`) now exists — 247 services, 121 concepts, 202 relationships, 135 architectures, 448 mistakes, 14,932 decision questions, 5,810 flashcards, 4,481 fill-in-the-blanks, 659 matching pairs, 1,738 guess-the-service clues, 424 classification items, 125 order-flows, 99 architect-builder scenarios — **28,292 total game-ready records**. Every record is real JSON, matches the exact shapes discussed in this session's earlier design proposals, and a real review report (`15-review-report.json`) documents what was corrected and what's still outstanding. This changes `G0-1`'s "design detail is proposed, not source-verified" framing — the data layer is now real and source-verified; what's still proposed is the React/game-engine side.

**Architecture decision, adopted from the review discussion, now matching the real dataset's own structure:** knowledge and games are two separate layers, not one. `02-services.json`/`03-concepts.json`/`04-relationships.json`/`05-architectures.json`/`06-decisions.json`/`07-mistakes.json` are the **knowledge layer** — sourced from official AWS documentation (`01-source-index.json` tracks provenance per record), not from this project's own professor notes. `08-flashcards.json` through `14-architect-builder.json` are the **per-game layer**, each record referencing knowledge-layer IDs (`knowledgeId`/`answerId`/`itemId`) rather than duplicating display text. This deliberately keeps the learning content (professor notes, analogies, teaching style) and the game content (verified AWS facts) as two different things, per the real reasoning already discussed: a game shouldn't depend on a teaching analogy being exactly right, and a note shouldn't have to be written like a quiz question.

**Real, confirmed compliance with the "no live AWS data" hard rule already agreed on:** the review report explicitly confirms **zero literal pricing figures anywhere in the 14,932-question decisions dataset** — this is why `US-110` is being renamed below.

**`US-110` renamed: "Cost Optimization Challenge" → "AWS Decision Challenge," scope widened.** Per the real discussion: live/simulated pricing is a maintenance trap for a static site (AWS pricing changes, regions differ, Free Tier rules change) — testing decision-making concepts ("which purchasing option suits an interruptible workload?") stays valid far longer than testing today's dollar figures. The real dataset already reflects this — `06-decisions.json`'s 14,932 questions cover cost, performance, security, availability, and scalability decisions generally, not a cost-only game. `G1-10` below is renamed and rescoped to match.

**Real, honest limitations from the dataset's own review report, not glossed over:** all 28,292 records are `"reviewStatus": "needs-review"` — structurally corrected (deduped, broken references fixed, placeholder syntax fixed) but not yet individually fact-checked against live AWS docs. 244 of 247 services cite a broad category-level source rather than a service-specific doc page — a real source-depth gap. New `DATA-1` ticket below owns getting this to `"approved"` before production use, matching the review pipeline (`draft → needs-review → approved`) already discussed and already reflected in every record's real `reviewStatus` field.

**Original context, still accurate:** a real, planned Epic — `consistency-and-tech-roadmap.md`'s "Epic 1 — Games Platform (US-101–110)," rated ⭐⭐⭐⭐⭐ ("high-value eventually"). The roadmap doc's own recommendation, still followed: build directly in React, not vanilla. The rebrand's icon system (`R4-1`/`R7-1`) already has a dedicated Games icon.

**Sequencing — unchanged, still correct:** after Track R (design) fully wraps, including `T6-1` (sequenced inside Track R). The real dataset existing doesn't change this — it just means the eventual build has real data ready, rather than needing to be generated from scratch when the time comes.

### DATA-1 — Human review pass on the real knowledge dataset
**Depends on:** none, can run independently of Games' own build sequencing · **Status:** ⬜ Not started.
**Real scope, per the dataset's own honest self-assessment:** move records from `needs-review` to `approved` per the pipeline already implicit in the data (`reviewStatus` field on every record). Priority order, per the review report's own findings: (1) spot-check the 244 of 247 services relying on broad category sources rather than service-specific pages; (2) verify the 6 newly-added sources citing category-index pages rather than dedicated per-category docs; (3) a semantic-similarity dedupe pass for near-duplicate (not exact-duplicate) records, which the structural correction pass didn't catch.
**Real constraint, matching the hard rule already agreed:** only `approved` records should ever ship in a production game build — this ticket is what makes that gate meaningful, not just aspirational.
**Done when:** [ ] a real review workflow exists (even a simple spreadsheet/checklist is fine, doesn't need new tooling); [ ] a meaningful fraction of the 28,292 records reach `approved` before `G0-1`/any `G1-*` ticket starts consuming them in a real build.
**Manual test:** N/A — this is a content-review process, not a feature.

### G0-1 — Games shared infrastructure
**Amended 2026-10-31 — two review items from the prototype's Games Hub (not decisions):** (1) the design shows **points and a total-points figure** and groups games into four sets (quick challenges, memory & pairs, logic & sequencing, architecture & debugging) with **Easy / Medium / Hard** difficulty; `G0-1`'s `game_progress_<gameId>` shape stores `{attempts, bestScore, lastPlayedAt, completed}` only — **there is no points or cross-game total in the model.** **Decided 2026-11-06 (`D14`): no points in v1** — keep `attempts`, `bestScore`, `completed`, `lastPlayedAt`; drop the points line and total from the hub design; revisit after `G1-1`–`G1-3` show how scores behave (any later points shape enters through `v`). (2) Library → Games exists in the new sidebar (`D1`) as a Soon item until Track G is built.

**Depends on:** none, but blocks every `G1-*` ticket below · **Components:** [React] [Python] [JSON]
**Status:** ⬜ Not started.
**Real scope, per the epic's own "Build Order" framing (quoted in the roadmap doc, not invented here):** every game needs its own JSON schema, scoring, accessibility, and progress tracking — this ticket is the shared foundation those 10 games build on, not a 10x duplication of the same plumbing.

**Corrected 2026-08-19: the data shape below is now real, not proposed.** The real dataset (`aws-knowledge-json-corrected/`) already defines and populates every shape discussed — see the real samples in `CHANGELOG.md`'s 2026-08-19 entries for confirmed examples pulled directly from the files. What's still proposed here is the React-side shell/engine consuming that real data, not the data itself.

**Real data shape, confirmed directly from the dataset (not proposed):**
```json
{
  "gameId": "guess-the-service",
  "subject": "aws",
  "difficulty": "beginner",
  "estimatedMinutes": 5,
  "rounds": [ /* shape varies per game type, see each G1-* ticket */ ]
}
```
Mirrors `quiz.json`'s existing `subject`/`difficulty`/`estimatedMinutes` fields deliberately, so `PY-1`'s reading-time pattern and `subjects.json`'s registry (`T3-7a`) extend to games with no new concepts.

**Proposed shared progress/scoring key**, parallel to `quiz_progress_<file>`:
```
game_progress_<gameId>  →  { attempts, bestScore, lastPlayedAt, completed }
```

**Proposed shared game-shell component** (`GameShell`), parallel to `T5-4a`'s Slides chrome: mounts the game-type-specific content, owns instructions/timer/restart/exit chrome, and reports completion + score back through one callback (`onComplete(score, meta)`) so every game's actual scoring logic stays in the game itself, not duplicated in the shell.

**Proposed shared game-type taxonomy** (which underlying interaction pattern each of the 10 maps to — most games share a pattern, so shared components cover more than one game):
| Pattern | Games using it |
|---|---|
| Multiple choice / riddle | `G1-1` |
| Card matching | `G1-2` |
| Drag-to-sequence | `G1-3` |
| Flip card | `G1-4` |
| Cloze / fill-in | `G1-5` |
| Drag-to-bucket / sort | `G1-6` |
| Drag-and-drop assembly | `G1-7`, `G1-8` |
| Spot-the-error | `G1-9` |
| Constraint/budget puzzle | `G1-10` |

**Done when:** [ ] JSON schema convention documented and has at least one working fixture; [ ] shared scoring/progress storage-key convention defined; [ ] `GameShell` exists and is used by `G1-1` (the proof-of-concept, per the roadmap doc's own recommendation); [ ] the taxonomy above confirmed or revised — if two "different" games turn out to need genuinely different shell behavior, that's a real finding worth recording, not silently working around.
**Manual test cases:** none yet — this is infrastructure; real test cases belong on each `G1-*` game once built against it.

### G1-1 — US-101 Guess the Service
**Depends on:** `G0-1` · **Components:** [React] [Python] [JSON]
**Status:** ⬜ Not started. **Build this one first** — the roadmap doc calls it the simplest, and `G0-1` needs a real proof-of-concept before its shell design is trustworthy.

**Proposed design (first pass, not confirmed):** a riddle/clue is shown ("Serverless compute that runs code in response to events, no server management"); the player picks the matching AWS service from 4–6 multiple-choice options. Each round draws from a Python-generated pool of `{clue, correctService, distractors[]}` — content-pipeline work, not hand-authored per round, reusing the same explanation text already authored for `T5-2`'s MCQ content where overlap exists (don't re-author clues for services that already have good MCQ `why` text).
**Proposed scoring:** +1 per correct answer, streak bonus for consecutive correct, round timer optional (off by default — this is a study aid, not an arcade game).
**Done when:** [ ] real clue/distractor pool generated for at least one subject; [ ] round flow works via `GameShell`; [ ] score/streak persists via the shared progress key.
**Manual test cases:** write once built — should include at minimum: complete a full round set, confirm score persists; get one wrong, confirm streak resets; replay, confirm a fresh session doesn't inherit the previous attempt's streak.

### G1-2 — US-102 Match the Pair
**Depends on:** `G0-1` · **Components:** [React] [Python] [JSON]
**Status:** ⬜ Not started.
**Proposed design:** classic memory-match grid — service icon/name on one card, its one-line definition on its pair. Flip two cards; match = both stay revealed; mismatch = both flip back after a short delay. Grid size scales with difficulty (e.g. 6 pairs beginner, 10+ pairs advanced).
**Proposed scoring:** fewer flips = better; track best-flip-count per subject in the shared progress key, not just completion.
**Done when:** [ ] grid renders and flip/match logic works; [ ] mismatch delay is real (not instant), giving the player time to actually memorize; [ ] best-flip-count persists and displays on replay.
**Manual test cases:** match all pairs, confirm completion fires; deliberately mismatch, confirm both cards flip back, not stay revealed; keyboard-only play (arrow keys + Enter to flip) for accessibility parity with mouse.

### G1-3 — US-103 Order the Flow
**Depends on:** `G0-1` · **Components:** [React] [Python] [JSON]
**Status:** ⬜ Not started.
**Proposed design:** a real process (e.g. "request flow through a 3-tier VPC," "CI/CD deploy pipeline steps") shown as shuffled steps; player drags them into correct order. Content-wise, this is the one game most naturally authored from existing DSA/AWS instructional sequences already in the markdown source — worth checking `aws-standard-instructions.md`/`dsa-instructions.md` for content that's already sequence-shaped before authoring net-new content.
**Proposed scoring:** correct-position count out of total steps; partial credit for close-but-wrong ordering (off-by-one shouldn't score identically to fully reversed).
**Done when:** [ ] drag-to-reorder works via mouse; [ ] a real non-drag fallback exists for keyboard/touch (move-up/move-down buttons, same pattern `P0-11`'s dashboard-card reordering already uses — reuse that interaction, don't reinvent it); [ ] partial-credit scoring is real, not just binary correct/wrong.
**Manual test cases:** reorder to fully correct, confirm max score; reorder with one adjacent-pair swap, confirm partial (not zero) score; keyboard-only reorder via the move buttons.

### G1-4 — US-104 Flashcard Flip
**Depends on:** `G0-1` · **Components:** [React] [Python] [JSON]
**Status:** ⬜ Not started.
**Proposed design:** single-card front/back flip — term on front, definition/explanation on back, "Next"/"Previous" through a deck. The simplest of the 10 mechanically; real value is in content reuse — flashcard content should be generated from the same explanation text already authored for notes/quiz `why` fields (per the earlier session's static-architecture review: "don't create a separate flashcard authoring system... generate from the note/quiz pipeline"), not hand-authored separately.
**Proposed scoring:** self-reported (player marks each card "got it" / "still learning" after flipping, not an objectively-graded game) — deck reshuffles to prioritize "still learning" cards on the next pass.
**Done when:** [ ] deck flip/next/previous works; [ ] self-report persists per card; [ ] "still learning" cards are demonstrably resurfaced more often on replay, not just recorded and ignored.
**Manual test cases:** flip through a full deck, mark half "still learning," replay, confirm those resurface first.

### G1-5 — US-105 Fill in the Blanks
**Depends on:** `G0-1` · **Components:** [React] [Python] [JSON]
**Status:** ⬜ Not started.
**Proposed design:** a real explanatory sentence/paragraph with 1–3 key terms blanked out; player types or selects (word-bank mode for younger/easier difficulty) the missing terms. Same content-reuse principle as `G1-4` — blank out terms in existing note prose rather than authoring new sentences from scratch.
**Proposed scoring:** exact-match or word-bank-select correctness per blank; partial credit if some but not all blanks in a multi-blank sentence are correct.
**Done when:** [ ] typed-answer mode works with reasonable fuzzy-match (don't fail a correct answer over trailing whitespace or case); [ ] word-bank mode exists as the accessible/easier alternative, not typed-only; [ ] partial credit for multi-blank sentences is real.
**Manual test cases:** answer all blanks correctly, confirm full score; get one of three blanks wrong, confirm partial score; test the fuzzy-match tolerance explicitly (extra space, wrong case) to confirm it's forgiving without being so loose it accepts wrong answers.

### G1-6 — US-106 Service Classification
**Depends on:** `G0-1` · **Components:** [React] [Python] [JSON]
**Status:** ⬜ Not started.
**Proposed design:** services shown one at a time (or as a batch grid); player drags/assigns each into the correct category bucket (Compute / Storage / Networking / Security / Database, etc. — real category taxonomy should reuse whatever category labels `category-icons.json` already defines, not invent a parallel one).
**Proposed scoring:** correct-bucket count out of total items; a service placed in a "reasonable but not primary" category (many AWS services span categories) is a real design question worth flagging, not silently deciding — e.g. is a bucket ever "correct" for more than one category?
**Done when:** [ ] drag-to-bucket works with a real keyboard/touch fallback (select item, select target bucket, confirm — not drag-only); [ ] category taxonomy reuses `category-icons.json`, not a new list; [ ] the multi-category-correctness question above has an explicit answer before scoring is finalized.
**Manual test cases:** classify a full set correctly, confirm max score; misclassify one, confirm it's marked wrong (or partially credited, per whatever the multi-category decision above resolves to) — test explicitly, don't assume.

### G1-7 — US-107 Architecture Puzzle
**Depends on:** `G0-1` · **Components:** [React] [Python] [JSON]
**Status:** ⬜ Not started.
**Proposed design:** a real, simple reference architecture diagram (e.g. "3-tier web app") shown with pieces removed; player drags the correct component icons into the empty slots. Different from `G1-3` (ordering a *process*) — this is assembling a *structure*, more spatial than sequential.
**Proposed scope note:** needs real diagram assets (icons + a layout grid), which overlaps with `R4-1`/`R7-1`'s icon system — coordinate rather than generating a separate icon set for this game alone.
**Done when:** [ ] at least one real diagram fixture with correct/incorrect slot data; [ ] drag-to-slot works with keyboard/touch fallback; [ ] icons reuse the real shared icon system, not game-specific assets.
**Manual test cases:** fill all slots correctly, confirm completion; fill one slot with a wrong-but-plausible component, confirm it's marked wrong with a clear visual signal (not just silently unscored).

### G1-8 — US-108 Architect Builder
**Depends on:** `G0-1` · **Components:** [React] [Python] [JSON]
**Status:** ⬜ Not started. **Flagged as likely the most complex of the 10** — open-ended building vs. the others' constrained-answer formats — confirm this against real design intent before scheduling, don't assume ordering from the list position.
**Proposed design, most speculative of the 10 given the open-ended premise:** given a real-world scenario/requirement ("build a fault-tolerant web app across 2 AZs"), player assembles a diagram from a component palette with no single fixed correct answer — scored against a rubric (required components present, no obviously wrong choices, reasonable connections) rather than exact-match. **Real open question, not resolved here:** does "scored against a rubric" mean a hand-authored per-scenario checklist (buildable, bounded scope) or something closer to open free-form evaluation (much harder to score deterministically in a static/client-only app, per the earlier static-architecture review's "no server, no AI-at-runtime" constraint)? Recommend the hand-authored-rubric approach specifically because it stays fully client-side — resolve this explicitly before building, don't default into open-ended scoring that turns out to need a server.
**Done when:** [ ] the rubric-vs-open-ended question above is explicitly answered; [ ] at least one real scenario + rubric fixture exists; [ ] the builder canvas (drag components, draw connections) works for that one scenario.
**Manual test cases:** write once the rubric question is resolved — premature before that.

### G1-9 — US-109 Debug the Architecture
**Depends on:** `G0-1` · **Components:** [React] [Python] [JSON]
**Status:** ⬜ Not started.
**Proposed design:** a diagram (reusing `G1-7`'s asset/layout approach) shown with 1–3 deliberately wrong or missing elements (e.g. a public subnet where a private one belongs, a missing security group); player clicks/taps the incorrect element(s) and optionally selects the fix from a short list. Conceptually the inverse of `G1-7` — spot-the-error instead of fill-the-gap — likely shares most of its rendering code.
**Proposed scoring:** correct-identification count; bonus for also selecting the right fix, not just spotting that something's wrong.
**Done when:** [ ] at least one real fixture with known-wrong elements + correct fixes; [ ] click-to-flag interaction works with keyboard/touch fallback; [ ] fix-selection is a genuinely separate scoring component from spot-the-error, not conflated into one score.
**Manual test cases:** identify all wrong elements correctly, confirm max score; identify a wrong element but pick the wrong fix, confirm partial (not full) credit.

### G1-10 — US-110 AWS Decision Challenge (renamed 2026-08-19, from "Cost Optimization Challenge")
**Depends on:** `G0-1` · **Components:** [React] [Python] [JSON]
**Status:** ⬜ Not started (build), but **real data now exists** — `06-decisions.json` has 14,932 real questions, structurally corrected, `reviewStatus: needs-review` pending `DATA-1`.
**Rescoped, per the real reasoning discussed:** no live/simulated pricing — dropping the earlier "budget target" framing entirely, not just removing dollar amounts from it. Tests decision-making across cost, performance, security, availability, and scalability concepts generally (confirmed real coverage in the actual dataset — `topic` field spans multiple categories, not cost-only), not a single-purpose cost-optimization puzzle. Real sample, pulled directly from the dataset: *scenario* "You need virtual servers with operating-system level control," 3 options (EC2/Lambda/S3), correct answer EC2, real explanation, real `topic: "compute"`.
**Done when:** [ ] real scoring (correct/incorrect per decision, not a budget-hit/miss binary); [ ] a meaningful subset of the 14,932 real questions reach `approved` via `DATA-1` before shipping.
**Manual test cases:** answer a real decision question correctly and incorrectly, confirm scoring and explanation both display correctly; confirm no `unapproved` (still `needs-review`) question ever appears in a real play session once `DATA-1` establishes the approval gate.

**Cross-cutting note for all of `G1-1`–`G1-10`:** **corrected 2026-08-19 — this is no longer accurate for the data layer.** Real data now exists for every game in this list (`08-flashcards.json` → `G1-4`, `09-fill-blanks.json` → `G1-5`, `10-matching.json` → `G1-2`, `11-guess-service.json` → `G1-1`, `12-classification.json` → `G1-6`, `13-order-flows.json` → `G1-3`, `14-architect-builder.json` → `G1-8`, `07-mistakes.json` → `G1-9`, `06-decisions.json` → `G1-10`). What's still a first-pass proposal, not source-verified, is the React game-engine/UI side of each — the mechanics descriptions in each `G1-*` ticket above remain a starting point for review, but the *content* backing them is real and ready, pending `DATA-1`'s approval pass. `G1-7` (Architecture Puzzle) has no dedicated file in the current dataset — closest real match is `05-architectures.json` (135 real architecture records) — worth confirming whether that's sufficient or a dedicated puzzle-specific file is still needed.

---

# Track DX — Maintenance (new, 2026-08-16, from external review)

Two small, genuinely low-risk additions — not speculative product work, just process gaps a review pass correctly identified.

### DX-1 — Dead code and duplicate audit (recurring; first real run = `Track AUDIT`)
**Track:** DX · **Type:** Recurring maintenance · **Status:** 🟡 **Retitled 2026-11-13 to describe the recurring cadence.** The first real run happened as `Track AUDIT` (2026-09-23 → 2026-11-13) and is complete on the 2026-10-05 snapshot: it found and removed the orphans `hooks/useOnlineStatus.ts` (`AUDIT-4`), `pages/Quiz/QuestionCard.tsx` and `pages/Quiz/icons.tsx` (`AUDIT-3`), the vanilla build toolchain (`AUDIT-2`), the dead `.gitignore` lines (`AUDIT-5`) and the stale `instructions/` references (`AUDIT-6`), and fixed the packager that ships the result (`DX-5`). It stays open because the "run it again before each milestone" need is real.
**Real precedent this generalizes:** `T5-1` already found and flagged one real instance — `pages/Quiz/QuestionCard.tsx`, an orphaned unused duplicate of the real shared `components/QuestionCard/QuestionCard.tsx`. That was caught incidentally while verifying `T5-1`; nothing has swept for a second one since.
**Scope:** a recurring check (run before each release, not continuous) for unused components/hooks/exports, duplicate implementations, dead routes, obsolete CSS/assets/JSON, and stray comment references to retired ticket ids (the "`T3-7c`" stray-comment case found earlier this session is exactly this class of drift).
**Done when:** [x] a real pass run at least once, findings logged (`Track AUDIT`, see `sprint-tickets-track-AUDIT.md`); [ ] a lightweight recurring cadence established — **proposed:** re-run the same checks (zero-reference scan of `web/src`, stray ticket-id comments, stale `DEFAULT_DEAD_CODE`, `dashboard package` size ~2 MB) after each Batch in `ticket-queue.md`, not continuously.
**Manual test:** N/A — this is itself a manual audit process, not a feature with test cases.

### DX-2 — Storage domain source-of-truth table
**Track:** DX · **Type:** Documentation · **Status:** ⬜ Not started.
**Why this matters concretely, not hypothetically:** `T4-1`'s own ticket text already flags a real, still-unconfirmed question — whether Gallery's favorites are the same underlying storage as Notes-index/Quiz-index favorites, or a parallel, separate set. That's exactly the class of ambiguity this table would prevent from recurring as the app adds more overlapping concepts (favorites, bookmarks, highlights, reading progress, quiz progress, study stats, achievements — all real, all shipped, several sharing conceptual territory).
**Scope:** one small table (fits directly in `CHANGELOG.md` or a short new reference section — not a new file/doc restructuring), columns: domain, real storage key, source-of-truth location (which hook/lib module owns writes), real consumers. Populate from source, not from memory — several of these need the same kind of direct-grep verification already used throughout this project.
**Done when:** [ ] table exists with real, source-verified values for at least favorites/bookmarks/highlights/reading-progress/quiz-progress; [ ] `T4-1`'s open Gallery-favorites question specifically answered as part of populating it.
**Manual test:** N/A — documentation, not a feature.

### DX-3 — Reconnect `dashboard.py` to the React app
**Track:** DX · **Type:** Build · **Status:** ✅ **Done — confirmed 2026-09-23 status recheck.** Found already-fixed, not fixed by that session: `dashboard.py`'s `argparse` description is now `"Notebook Buddy CLI"`, and real `web-dev` / `web-build` / `web-preview` subcommands exist, each `cwd`'d into `web/` and wrapping `npm run dev` / `build` / `preview`. *History, kept:* ⬜ Not started. Real, confirmed gap — matches a direct memory of this being lost, not just an inference.
**Real evidence, confirmed directly against source:** `dashboard.py`'s own `argparse` description string is still `"Learning Dashboard CLI"` — the pre-rebrand name (rebrand decided 2026-07-06). Its `serve`/`build` subcommands only know about vanilla `src/`/`dist/`/`tools/minify.js` — zero awareness that a React/Vite app now serves the actual site. It's still fully functional for what it always did (notes/quiz/sitemap/audit generation), but it stopped being "the one file connected to everything" the moment the React migration started, and nothing updated it to catch up.
**Scope:** update the description string; add real subcommands wrapping the React side (`dashboard web-dev` → `npm run dev` in `web/`, `dashboard web-build` → `npm run build`, `dashboard web-preview` → `npm run preview`) so `dashboard.py` is genuinely the single entry point again, not just for the Python half.
**Done when:** [ ] description string says "Notebook Buddy CLI," not the old name; [ ] real subcommands exist for the React dev/build/preview flows; [ ] `dashboard --help` reflects the full real toolchain, not just the Python half of it.
**Manual test:** run `dashboard web-build` from a clean checkout, confirm it produces the same output as running `npm run build` directly in `web/`.

### DX-5 — `package_for_claude.py` correctness + `dashboard package` hardening (new 2026-09-28)
**Track:** DX · **Type:** Fix + test · **Status:** ✅ **Done 2026-11-13 on the 2026-10-05 snapshot (re-verify on your current tree); bug 6 is not a packager bug and stays with `B-5`.** Purpose: the lean zip a Claude chat needs at start (source, tickets, docs — no `.git`, `.venv`, `node_modules`, `dist`, caches). **Label collision to fix:** the dev commit that added `--exclude-file` to `dashboard package` tagged it "DX-4" in `test_dashboard.py` / `test_dashboard_cards_and_package.py`, but `DX-4` is the unrelated "Local admin UI" ticket. Those comments should say `DX-5`.
**Already true (verified by running it):** the tool is wired as `dashboard package` (`dashboard.py::cmd_package`); a dedicated `python/tests/test_package_for_claude.py` exists (exclusions, minify on/off, binaries, dead-code, zip root) plus `dashboard.py` wiring tests; `--exclude-file` (repeatable) threads from `dashboard package` to `pfc.package()` with tests. Full Python suite passes (260 on the 2026-09-28 snapshot; **260 passed again on the 2026-10-05 upload, 2026-10-31 check**). Run on the new snapshot it produced a **1.95 MB zip from a 27 MB tree** (`node_modules` excluded), with `.git`/`.venv`/`dist`/`.vscode` correctly dropped and `.github/`, docs and source kept.
**Real bugs found by running it, not by reading it (all four code bugs re-confirmed present in the 2026-10-05 upload):**
1. **Self-inclusion when output lands in the repo (the default).** `dashboard package` with no `--output` writes `ResourcesV2-lean.zip` into the repo root and stages in `.ResourcesV2-lean_staging/` *inside the source tree*; `os.walk(source)` then descends into that staging dir and copies it in. Reproduced on a scratch copy: **967 files / 3.9 MB instead of 484 / 1.95 MB** — the zip contains itself. **The 2026-10-05 upload itself shipped with `.ResourcesV2-lean_staging/` inside it.** Fix: exclude the staging dir and the output path (and prior `*-lean.zip`) from the walk, or default staging to the system temp dir.
2. `DEFAULT_DEAD_CODE` is out of step with the tree: it still lists the deleted `hooks/useOnlineStatus.ts` (harmless but stale) and **no longer lists `pages/Quiz/QuestionCard.tsx`, which still exists and is still unused** (`AUDIT-3` not done) — so `--strip-dead-code` ships a known-dead file. Restore the entry until the file is really deleted.
3. `_minify_text` docstring says it collapses "3+" blank lines; it collapses **2+** to 1. Also strips trailing spaces, which in Markdown are hard line breaks (`  ` at end of line) — a silent semantic change for `.md` files. Either skip `.md`, or preserve two-space endings.
4. `*.egg-info` sits in `DEFAULT_EXCLUDE_GLOBS`, which is matched against file names only — it is a directory, so it never matches. Move it to `DEFAULT_EXCLUDE_DIRS`.
5. `DEFAULT_EXCLUDE_DIRS` drops any directory named `build`, `coverage`, `dist` at any depth — safe today (no such source dirs), but should be a known, tested rule so a future `web/src/build/` isn't silently omitted.
6. Weight the tool cannot fix: `web/public/favicon.svg` is **1.2 MB** (an embedded raster in an SVG wrapper) — 60% of the whole zip and requested by every visitor via `index.html`. See `B-5`.
**Done when:** [x] bug 1 fixed with a test that packages into the source tree and asserts no `staging`/`lean.zip` entries and no duplicate paths; [x] bug 2 list reconciled with the real tree (`DEFAULT_DEAD_CODE` is empty after `AUDIT-3`) and a test that every entry exists; [x] bugs 3–4 fixed with tests; [x] bug 5 made a known, tested rule; [x] comment labels changed `DX-4`→`DX-5`; [x] one line in `HANDOFF.md`: start a chat with `dashboard package` output (about 2 MB).
**Manual test:** run `dashboard package` from a clean checkout with no `--output`; unzip; file count equals the tree minus exclusions, no `.ResourcesV2-lean_staging`, no nested copies.
**Update 2026-11-13 — what was changed and how it was checked:** (1) the walk now skips the exact staging directory and output zip it was given, never copies `*-lean.zip`, and the default scratch folder is a temporary directory **outside** the repo (`tempfile.mkdtemp`); (2) `DEFAULT_DEAD_CODE` is empty; (3) `_minify_text` docstring says "2+", and Markdown keeps hard line breaks (two trailing spaces) while code still gets stripped; (4) `*.egg-info` moved to a new directory-glob list; (5) `build`/`dist`/`coverage`/`htmlcov`/`playwright-report`/`test-results` are excluded only at the repo root or directly under a top-level project folder (`web/dist`), so a deeper `web/src/build/` is kept — covered by a test that lists exactly what survives. **Tests:** 10 new tests in `test_package_for_claude.py` (21 in the file); **7 of them fail on the old packager**, the other 3 pin behaviour that was already right. Full Python suite: **270 passed** (was 260). **Real tree:** packaging the 2026-10-05 repo with a stale staging folder present, the old packager produced 921 entries / 3.89 MB (441 of them the staging copy); the new one produces 480 entries / 2.01 MB with no staging, no nested zip and no duplicates. Not changed: the stale `.ResourcesV2-lean_staging/` folder that shipped inside your upload is junk you can delete by hand (the packager no longer copies it but, by design, never deletes anything from the repo).

### DX-6 — Python tests and scripts depend on the directory they are started from (new 2026-11-14)
**Track:** DX · **Type:** Fix + test · **Status:** ✅ **Fixed 2026-11-14** (workflow + test suite); one optional hardening left.
**What happened (your GitHub log):** the Deploy workflow ran `pytest python/tests/` from the repo root. The pipeline scripts resolve their data paths relative to the *current directory* (`generate_notes.py`: `"../web/public/data/config/subjects.json"`), which only works when started from `python/`. Importing `generate_notes` at the repo root therefore exited with "❌ subjects.json not found" during collection — "no tests ran", exit code 3 — and the deploy stopped before building. Locally it never showed because every earlier run, mine and yours, started inside `python/`. The PR check (`coverage.yml`) was unaffected: it already uses `working-directory: python`.
**Fix:** (1) `deploy.yml` now runs the step with `working-directory: python` and `pytest tests/`; (2) `python/tests/conftest.py` pins the working directory to `python/`, so the suite behaves the same from anywhere; (3) new test `test_run_from_repo_root.py` starts pytest from the repo root exactly as CI did — **it fails without the fix and passes with it**. Python suite: **271 passed**, from the repo root and from `python/`.
**Still true, optional:** nine modules (`audit_content.py`, `generate_dashboard_cards.py`, `generate_dsa_notes.py`, `generate_notes.py` and others) use `"../web/..."` constants. They are meant to be run through `dashboard.py` (which sets the directory), so this is only a hazard if someone runs a script directly from elsewhere.
**Done when:** [x] deploy workflow runs the suite from `python/`; [x] conftest pins the directory; [x] regression test added and proven to fail without the fix; [ ] *(optional, low priority)* anchor each module's path constants on `Path(__file__)` so every script works from any directory.
**Manual test:** push the change and confirm the Deploy workflow's "Run Python test suite" step passes; run `python -m pytest python/tests/ -q` from the repo root and from `python/`.

### DX-7 — Flaky "saves scroll position" test failed on GitHub (new 2026-11-14)
**Track:** DX · **Type:** Fix · **Status:** 🟡 Fix written, not yet pushed.
**Real evidence (your log):** `ci.yml` "Lint + Vitest" failed with 1 test of 988: `Note > Reading progress (P0-3) > saves scroll position + timestamp …` at `Note.test.tsx:428` — `expected undefined to be 500`, 1078 ms. Cause: the test fires one scroll event as soon as the heading appears, but `useReadingProgress` attaches its listener in an effect a moment later on a slow runner; the event is lost. Reproduced the mechanism by delaying the listener 400 ms (old test fails with the same message; fixed test passes). The app code is correct.
**Fix:** retry the scroll inside `waitFor` (timeout 4000) and restore `scrollY`; set `asyncUtilTimeout` to 4000 in `src/test/setup.ts`.
**Done when:** [ ] both edits applied; [ ] `npm test` 119 files / 988 tests passed locally; [ ] the next two GitHub runs of "Lint + Vitest" are green.

### DX-8 — Update GitHub Actions to Node 24 versions (new 2026-11-14)
**Track:** DX · **Type:** Maintenance · **Status:** ⬜ Ready, low priority (it is only a warning today).
**Scope:** checkout v5, setup-node v5, setup-python v6, upload-artifact v6, configure-pages v6, deploy-pages v5, upload-pages-artifact v5 (versions checked against each action's `action.yml`). Separate commit; Pages actions only run on `main`.
**Done when:** [ ] the "Node.js 20 is deprecated" annotation is gone from all three workflows; [ ] a deploy on `main` still publishes the site.

### DX-4 — Local admin UI (run the Python pipeline from a browser, not the CLI)
**Track:** DX · **Type:** Build, future · **Status:** ⬜ Not started — genuinely new, not recovered. Searched every uploaded doc for a prior mention of this idea; found nothing. Either it lived somewhere not currently uploaded to this session, or it was discussed but never written down. Captured fresh rather than treated as recoverable.
**Real scope, as described directly:** a local (not deployed) web UI that runs the Python content pipeline — the same real operations `dashboard.py` already exposes (`notes`, `quiz`, `sitemap`, `audit`, `serve`, `test`, `build`, plus `DX-3`'s new web ones) — through a browser instead of CLI flags. Not a hosted admin panel, not authenticated, not deployed anywhere — a local-only dev tool.
**Depends on:** `DX-3` (the CLI needs to actually cover the full real toolchain before a UI wraps it — building a UI around a stale CLI would just inherit the same gap)
**Real open questions, not decided here:** local Flask/FastAPI thin wrapper vs. a small Vite dev-only React page reading `dashboard.py`'s subcommands; how build/audit output (currently terminal text and `reports/build-report.{html,md,json}`) gets surfaced in a browser UI rather than reprinted as raw text.
**Done when:** [ ] scope decision made on the two open questions above; [ ] a real design pass, same discipline as Track G's games — this is 0% built, don't invent detailed UI here without that pass.
**Manual test:** none yet — premature before the scope decision above.

---

# Track SHARED — App-wide chrome & design system (new, 2026-08-19)

First real track written under the page-by-page process. Covers anything used across more than one page — nav chrome, design-system primitives, app-wide gaps. Real bugs already found and fixed under `P0-*` (Appearance, Accessibility) are cross-referenced here, not duplicated, since they're already owned tickets.

### SHARED-1 — Persistent sidebar / icon rail / bottom tab bar
**Amended 2026-10-31:** the navigation groups are now fixed by decision `D1` — Learn / Plan / Library + System & Tools — and built by **`NAV-2`** (`sprint-tickets.md`). `NAV-1`'s chrome already exists in the 2026-10-05 upload.

**Status:** this is `NAV-1` (`sprint-tickets.md`) — the single biggest shared-chrome change pending, not repeated here. See that ticket for full scope (sidebar, tablet rail, mobile bottom-tab bar, removing `Breadcrumb` from the 6 pages that have it).

### SHARED-2 — Wire a real `/contact` link into shared chrome
**Amended 2026-10-31 — status: ✅ Done, found built.** The 2026-10-05 upload's `SidebarNav.tsx` lists Contact (`/contact`) in `SECONDARY_ITEMS`, so it appears in the desktop/tablet nav and the mobile `More` sheet — reachable from every page. The `⬜ Not started` and the "zero inbound links" finding below are history. `NAV-2` keeps Contact in the System & Tools area.

**Depends on:** none, but placement is cleanest once `NAV-1`'s nav chrome exists (natural home: a `UserMenu` item, or the mobile "More" screen already shown in the design mockup) · **Status:** ⬜ Not started.
**Real gap, confirmed 2026-08-19:** `/contact` (`B-1`, fully built) has zero inbound links anywhere in the app today — confirmed by exhaustive grep, not just missing from Dashboard. Only reachable by typing the URL.
**Done when:** [ ] a real link exists from at least one piece of shared chrome, reachable from every page, not just Dashboard.
**Manual test:** from any page, confirm a real path to `/contact` exists without typing the URL.

### SHARED-3 — Real Button / Card / Empty-state design-system primitives
**Depends on:** none · **Status:** ⬜ Not started, real design exists (the "Components & States" reference panel from the Dashboard design review — Primary/Secondary/Text-link buttons, a Title/Value/Description card pattern, a mascot-illustrated empty state with "Get Started" CTA).
**Real gap this closes:** `PROJECT.md` §5 already names this as "explicitly not built yet" — no formal component system exists; every page currently hand-styles its own buttons/cards. This ticket is the first real step toward that, scoped to exactly what the design review already specified, not invented beyond it.
**Done when:** [ ] real `Button`/`Card`/`EmptyState` components exist matching the reviewed design; [ ] at least one real page (Dashboard, once `Track DASH` picks it up) uses them instead of one-off styling.
**Manual test:** visually compare the built components against the design reference, all states (default/hover/focus/disabled where applicable).

### SHARED-4 — `NotificationsBell` / `UserMenu` panel content spec
**Depends on:** none · **Status:** ⬜ Not started — both components are real and reachable, but their actual panel/menu contents were never inventoried in this project's own docs, flagged twice now (Dashboard inventory, this session).
**Recommendation, 2026-08-21, not yet confirmed:** Bell — icon + message + timestamp list, mark-all-read, sourced from real event triggers (`B-2`'s achievement/streak/goal-completion notifications). UserMenu — mini profile view (name/avatar) + a link to Settings, nothing else; skip a theme toggle here since one already exists in the top bar, and there's no auth so no sign-out/account items apply.
**Source detail:** the fuller original data-model/interaction spec this recommendation is drawn from (`notificationsInbox` shape, unread-badge behavior, dropdown-vs-route decision, UserMenu fallback/dismiss pattern) lives in `docs/archive/sprint-tickets-R3-1-scoping.md` (tickets `R3-1a`/`R3-1b`) — check there before writing the final content spec rather than re-deriving it.
**Done when:** [ ] a real content spec exists for both (what a notification looks like, what's in the user menu) before any redesign work touches them.
**Manual test:** none yet — this is a spec-writing ticket, not a build ticket.

### SHARED-5 — Appearance tokens not consumed broadly enough
**Status:** this is `P0-2` — cross-referenced, not duplicated. Real, confirmed, actively being worked on as of this session.

### SHARED-6 — Accessibility tokens not consumed at all
**Status:** this is `P0-9` — cross-referenced, not duplicated. Real, confirmed via exhaustive search (0 of 5 real toggles have any visible effect), actively being worked on as of this session.

### SHARED-7 — `NotificationToasts` — real, working, previously undocumented (found 2026-08-22 completeness sweep)
**Status:** ✅ Already built and working — documentation gap only, no build work needed.
**Real finding:** `components/NotificationToasts` is a genuine, distinct notification mechanism from `NotificationsBell` — transient toast messages (info/success/warning/error), one shared renderer consuming `lib/notifications.ts`'s store, mounted once in `App.tsx`. Its own header comment confirms it deliberately consolidates what was 5 duplicated `showNotification` implementations in vanilla into one. Never named in any ticket — `B-2`'s "in-app only" notification decision covers the persistent Bell inbox but never mentioned this second, transient-toast channel exists too.
**Done when:** [x] already functionally complete — this entry exists purely so `SHARED-4`'s eventual content spec (and any redesign) accounts for 2 real notification surfaces, not 1.
**Manual test:** trigger a real toast-producing action (check `lib/notifications.ts`'s real call sites), confirm it appears, auto-dismisses, and doesn't duplicate into the Bell inbox unless the action is genuinely meant to do both.

---

# Track DASH — Dashboard page (new, 2026-08-19)

Dashboard-specific work only — anything reusable elsewhere lives in `Track SHARED` instead, per the process.

### DASH-1 — Rebuild Dashboard layout to match the reviewed design
**Amended 2026-10-31, updated 2026-11-02 (now ⬜ ready — `Depends on: SHARED-3`, `UI-1`, `DASH-4`; `PROTO-8` ✅ signed off, so this is the "ready to reconcile" call `AUDIT-0` was waiting for):** the target layout now comes from the approved prototype (`Track PROTO`), not only the earlier review. Required composition, decision-bound: a **"Today" group holding Daily Goal (`DASH-4`) beside Today's Study Plan (`DASH-5`)** — both stay (`D3`); a **Scratchpad** card (`DASH-6`) *in addition to* the global Sticky Note (`D4`); the Study Loop strip (`DASH-7`); every existing component (`QuickActionsBar`, `StudyStatisticsWidget`, `ContinueReading`, `AchievementsWidget`, `MotivationalWidget`, `DashboardCardsGrid` with its Calendar card and keyboard-reachable Move buttons) retained. Real evidence for "retained": the 2026-10-05 `Dashboard.tsx` mounts exactly those six. This ticket's "Continue Reading + Quick Note two-column rail" wording is superseded by that composition. **Correction 2026-11-02 (my earlier claim was wrong):** the extra stat tiles (highlights, bookmarks, study time) the prototype shows **already exist** — `StudyStatisticsWidget.tsx` renders 7 tiles: Notes read, Quiz attempts, Average score, Highlights, Bookmarks, Study time, Day streak. Restyle them; do not re-add them. Also required from the prototype: the Continue Reading empty state, Achievements "N of M" summary, and a visible "Reorder Cards" control for `DashboardCardsGrid` (which already supports drag and Move earlier/later). **Also required (2026-11-14):** changing accent colour, card radius and density in Settings visibly changes the Dashboard's cards and buttons (`P0-2`).

**Depends on:** `SHARED-3` (design-system primitives should exist before the page that's supposed to showcase them is rebuilt, not after) · **Status:** ⬜ Not started.
**Real scope, per the reviewed design vs. current implementation:** Continue Reading + Quick Note (`StickyNoteWidget`) as a two-column right-rail treatment (current implementation doesn't pair them this way); Study Statistics/Achievements layout and spacing per the design; the mascot-illustrated empty state (`SHARED-3`) applied wherever Dashboard currently has a bare "0" with no illustration.
**Done when:** [ ] real layout matches the reviewed design; [ ] every real component from the Dashboard inventory (`docs/page-inventories/dashboard.md`) accounted for in the new layout, none silently dropped.
**Manual test:** side-by-side comparison against the reviewed design mockup, light/dark/tablet.

### DASH-2 — Quick Actions "Revision" destination — decided 2026-11-06 (`D15`)
**Amended 2026-10-31:** a Revision Center page is now designed in the prototype (`PROTO-6`) and sits under **Plan** in the sidebar (`D1`, built by `V0-1`). The real Quick Actions catalog still has `revision` → `/quiz-index` (`lib/quickActions.ts`). **Correction 2026-11-06:** the interim suggestion below (`/quiz-index?favorites=true`) **would not work** — `QuizIndex` reads no URL parameters (only Gallery reads `?favorites=true`). Recommended instead: keep `/quiz-index` until `V0-1` ships, then repoint to `/revision` (one line in `lib/quickActions.ts`); adding the parameter to Quiz Index is only worth a ticket if you want that interim. **Decided 2026-11-06 (`D15`): keep `/quiz-index` until `V0-1` ships, then repoint to `/revision`; no interim ticket.** Analysis: `ticket-queue.md` §3, `C7`.

**Status:** this is part of `P0-7` — cross-referenced, not duplicated. Real finding: currently links to `/quiz-index`, not a dedicated Revision-scoped page. Needs an explicit call, not further technical work.
**Recommendation, 2026-08-21, not yet confirmed:** point it at a filtered view (`/quiz-index?favorites=true`-shaped, same real pattern `P0-7`'s Favorites action already uses) instead of the bare `/quiz-index` — a real, meaningful destination available today, no `V0-1` dependency. Repoint to `V0-1` (Revision Center) once that ships.

### DASH-3 — Future items to keep in view, not build yet
**Amended 2026-10-31:** three of the "future items to keep in view" are now designed and ticketed (all ready to build as of 2026-11-02): Today's Study Plan (`DASH-5`), Scratchpad (`DASH-6`) and the Study Loop strip (`DASH-7`). My Learning (`N1-2`) and Revision Center (`V0-1`) have designed pages. None is built.

**Status:** tracking only, no build scope. Updated 2026-08-19 now that `Track S`/Revision Center/`Track N`/`Track ST` are real, written tracks (see below), not just discussed. Concretely, if any of these land: `B-9a` (Performance Dashboard) and Track G's Games card both plausibly join `DashboardCardsGrid`; **`S0-1`'s Activity Event Model, if built, would eventually become what `StudyStatisticsWidget` reads from** instead of its own independent calculation — a real future refactor of an already-shipped widget, not new surface area; **the Revision Center (`V0-1`), if built, is a strong Quick Actions and/or `DashboardCardsGrid` candidate** — "Due for Revision" is exactly the kind of thing a Dashboard should surface prominently, more than a generic listing page would.

---

# Track S — Study Loop (new, 2026-08-19, written per direct request)

**Real scope note before the tickets:** this is the biggest, riskiest item discussed this session. Writing the tickets down doesn't mean starting them — `S0-1` alone touches every existing progress feature (`P2-1` stats, `P2-2` streak, Calendar/`R3-1c`). Recommend treating this track as "scoped and ready," not "next up," until there's real bandwidth for the refactor risk, not just the new-feature work.

### S0-1 — Activity event model
**Depends on:** none, but blocks every other `S*` ticket and is a real refactor dependency for `P2-1`/`P2-2`/`R3-1c` if fully adopted · **Status:** ⬜ Not started.
**Real scope:** one shared `recordActivity(event)` function, real event types (`note-read`, `quiz-completed`, `revision-completed`, `game-played`, etc.), one real storage model — everything downstream (Statistics, Streak, Calendar) reads from this instead of each computing independently from raw `localStorage` keys.
**Why this is real refactor risk, not just new work:** `P2-1`/`P2-2` and `R3-1c`'s Calendar are all done, shipped, and already confirmed correct (Calendar already reads from `P2-1`'s `getStudyActivityDates()`, not a separate calculation — this session's own finding). Rewiring them to read from a new activity model instead risks regressing something that currently works correctly.
**Done when:** [ ] real event model + `recordActivity()` exist; [ ] at least one real feature demonstrably reads from it, without regressing the others that haven't migrated yet.
**Recommendation, 2026-08-21, not yet confirmed: HOLD.** `P2-1`/`P2-2`/`R3-1c` are shipped, tested, and already confirmed correct independently — refactoring working code for infrastructure nothing concrete currently needs is the wrong trade. Build this if/when `Track S` itself gets greenlit for real construction, not speculatively ahead of it.
**Manual test:** none yet — this is foundational infrastructure, not a user-facing ticket on its own.

### S1-1 — Study Sessions
**Components:** [React] · **Depends on:** `S0-1` (for "items touched"; the duration part does not need it) · **Status:** ⬜ Not started.
**Real evidence:** the app has no session concept. Study time today is two independent minute tickers: `hooks/useStudyTimeTracker.ts` → `recordStudyMinute()` → `studyTimeLog` (`{ v:1, total, byDay:{ 'YYYY-MM-DD': minutes } }`), and `useDailyGoal`'s own ticker when a `time` goal is set (see `DASH-4` for why per-caller tickers are a hazard). **A session timer must not add a third `setInterval`** — compute duration from timestamps.
**Scope:** `lib/studySessions.ts` + `hooks/useStudySession.ts`; storage key `studySessions` (added to `storageKeys.ts`): `{ v:1, active?: { id, startedAt, pausedAt?, pausedMs }, sessions: { id, startedAt, endedAt, activeSeconds, items: { type:'note'|'quiz', id }[] }[] }`, capped (e.g. last 200). Start / Pause / Resume / Finish control in the Dashboard "Today" group and the Study Loop page. `activeSeconds = (end − start − pausedMs)`; items come from `S0-1` events recorded while a session is active. A session survives reload (it is derived from stored timestamps), and an abandoned one is finished automatically after a fixed idle window (**decided 2026-11-06, `D22`:** 30 minutes).
**Done when:** [ ] start/pause/resume/finish work and persist across reload; [ ] two tabs cannot both hold an active session (the second sees the first); [ ] duration is correct after a 5-minute pause and after a reload (fake-clock tests); [ ] corrupt `studySessions` loads as empty; [ ] included in backup export/import; [ ] `studyTimeLog` and Daily Goal totals unchanged by sessions.
**Manual test cases:** start, read a note, pause 2 minutes, resume, finish — confirm the duration excludes the pause and the note appears under items; reload mid-session and confirm it continues; leave it idle past the window and confirm it auto-finishes.

### S1-2 — Weekly Summary
**Components:** [React] · **Depends on:** originally `S0-1`; ****Re-assessed 2026-11-03 against the 2026-10-05 upload:** 3 of the 4 metrics can ship without it** · **Status:** ⬜ Not started.
**Real evidence for each metric:** *time* — exact, `studyTimeLog.byDay` already stores minutes per local day; *quizzes completed and accuracy* — exact, `quiz_history_<id>` entries carry `{ date, score, total, pct, timeSeconds, passed }` (history is **capped at 20 attempts per quiz**, so a heavily repeated quiz can lose older weeks); *notes read* — **approximate**: reading progress stores `percent` and the last-update `timestamp`, not the date it first crossed 95%, so "read this week" means "reached ≥95% and last updated this week". `S0-1`'s activity events would make this exact.
**Scope:** `lib/weeklySummary.ts` (pure function of a date window and the stored data) + a card. Week definition (**decided 2026-11-06, `D21`:** Monday-start) fixed in one helper shared with `S1-3`. Shows time, notes read, quizzes completed, average accuracy, and the change versus the previous week; an empty week shows a clear empty state, not zeros dressed up as progress.
**Done when:** [ ] fixture data produces hand-calculated values for each metric; [ ] a week with no activity shows the empty state; [ ] the notes-read approximation is labelled in the ticket's tests and in the UI tooltip; [ ] window boundaries (Sunday night/Monday morning, DST change) tested.
**Manual test cases:** seed a known `studyTimeLog` and two quiz histories, compare each figure to a hand calculation; change the stored dates across a week boundary and confirm the counts move.

### S1-3 — Monthly Summary
**Components:** [React] · **Depends on:** `S1-2` (shares its window helper and metric functions) · **Status:** ⬜ Not started.
**Real evidence:** same sources and the same limits as `S1-2`; a calendar month is also the window where the **20-attempt history cap** bites hardest, so the quiz-accuracy figure can understate long-running activity.
**Scope:** the monthly window (calendar month, local time) over `lib/weeklySummary.ts`'s metric functions — no second implementation; compares with the previous month; shows a best-week highlight.
**Done when:** [ ] hand-calculated fixtures pass for a 28-, 30- and 31-day month; [ ] the month boundary uses local dates; [ ] the history-cap limitation is documented in the UI note and the test names; [ ] no metric logic duplicated from `S1-2`.
**Manual test cases:** seed activity across two months, confirm each month shows only its own figures; check February in a leap year.

### S2-1 — Weak Areas
**Components:** [React] · **Depends on:** none technically — ****Re-assessed 2026-11-03 against the 2026-10-05 upload:** this does not need `S0-1`** · **Status:** ⬜ Not started. **Reconciles the earlier decision:** the dropped feature was weak areas by per-question category/tags (authoring burden). This ticket works at **quiz-topic** level, from fields that already exist, so it adds no authoring.
**Real evidence:** each `quiz-index.json` entry has one `topic`; `quiz_history_<id>` holds `{ date, score, total, pct }` per attempt. There is no per-question outcome in history (see `S2-3`).
**Scope:** `lib/weakAreas.ts`: group quizzes by `topic`; for each topic compute accuracy as total correct ÷ total questions across each quiz's most recent 3 attempts; a topic is weak when accuracy is below **70% — the app's own pass mark (`PASS_THRESHOLD_PCT = 70`)** — with at least 2 attempts in the topic (**decided 2026-11-06, `D19`**). A card ("Topics to revisit") lists weak topics, worst first, each linking to that topic's quizzes (Quiz Index filtered by topic). A topic with too little data is not shown as weak.
**Done when:** [ ] fixtures with known attempts produce the expected weak/not-weak topics; [ ] one attempt is never enough to flag a topic; [ ] a quiz with no history is ignored; [ ] the card links to the filtered Quiz Index and that filter exists.
**Manual test cases:** complete two quizzes in one topic below the threshold and confirm it appears; improve the score above the threshold and confirm it disappears.

### S2-2 — Confidence ratings
**Components:** [React] · **Depends on:** none technically (`S0-1` optional) · **Status:** ⬜ Not started.
**Real evidence:** quiz questions carry a numeric `id` (1…N within each quiz file) — unique per quiz but only stable while the quiz file is not reordered, so the key must be `(quizId, questionId)`; the engine (`pages/Quiz/useQuizEngine.ts`) knows when an answer is revealed.
**Scope:** after a question is answered, the learner may rate **Guess / Somewhat sure / Confident**; stored as `questionConfidence-<quizId>` → `{ v:1, byId: { '<id>': { level, at } } }` (key helper in `storageKeys.ts`). Shown **only in Study Mode** (Timed Mode, `QZ-1`, adds no extra clicks). Ratings for question ids that no longer exist are ignored, never crash. Rating is optional; skipping stores nothing.
**Done when:** [ ] rating appears after answering in Study Mode and never in Timed Mode; [ ] it persists per question and per quiz; [ ] a removed question id is ignored; [ ] corrupt value falls back to empty; [ ] included in backup export/import.
**Manual test cases:** answer a question, rate it, reload and reopen the quiz, confirm the rating shows; edit the quiz JSON to remove that question and confirm no error.

### S2-3 — Question mastery
**Components:** [React] · **Depends on:** `S2-2` (confidence feeds mastery) · **Status:** ⬜ Not started.
**Real evidence:** attempt history stores only totals (`score`, `total`, `pct`) — **no per-question outcomes exist anywhere today**, so this ticket must start capturing them; nothing can be back-filled for past attempts.
**Scope:** on each answer, update `questionMastery-<quizId>` → `{ v:1, byId: { '<id>': { attempts, correct, lastSeenAt, lastCorrect } } }`; a "Frequently missed" list (attempts ≥ 2 and correct ratio below a threshold) on the Quiz page or My Learning, each item opening that quiz at the question; mastery combines correctness and the `S2-2` confidence level (a confident wrong answer ranks above a guessed wrong one). Same id-stability caveat as `S2-2`.
**Done when:** [ ] every answered question updates its counters exactly once per attempt; [ ] re-selecting before reveal does not double-count; [ ] the missed list matches fixtures; [ ] no data for past attempts is invented; [ ] included in backup.
**Manual test cases:** answer one question wrong in two attempts, confirm it appears as frequently missed; answer it right twice and confirm it leaves the list.

# Track V — Revision Center (new, 2026-08-19, mostly consolidation not new build)

**Real scope note:** unlike Track S, this is genuinely low-risk — `P1-1`/`P1-2`/`P3-2`/`T5-3c-6`/`E0-2`'s Revision Book already exist or are already ticketed. This track is one new consolidating page plus one genuinely new algorithm.

### V0-1 — Revision Center page
**Amended 2026-10-31 — page designed (prototype), lives under Plan (`D1`) at `/revision`; released 2026-11-02 (`PROTO-8` signed off).** Designed contents: Favorites / Bookmarks / Highlights counts, **Start Revision Mode**, and **Download Revision Book**. Both actions already exist as real code (`P3-2`'s `pages/Note/revisionFilter.ts`, `E0-2`'s `lib/revisionBookExport.ts`) — wire to them; no new data plumbing. The sample's "due for review" / spaced-repetition area is `V1-1` and renders as a Soon control until that ships.

**Depends on:** `P1-1` (fixed), `P1-2`, `P3-2`, `T5-3c-7` (bookmark star, done) · **Status:** ⬜ Not started.
**Real scope:** one real page bringing together Favorites/Bookmarks/Highlights counts, a "Start Revision" entry point, and links into the existing `Revision Mode` (`P3-2`) and `Revision Book` export (`E0-2`) — UI consolidation of real, already-built pieces, not new data plumbing.
**Done when:** [ ] real page exists; [ ] every real count (favorites/bookmarks/highlights) reads from the actual existing storage keys, not new ones.

### V1-1 — Spaced repetition
**Components:** [React] · **Depends on:** `V0-1` · **Status:** ⬜ Not started — the one genuinely new algorithm in Track V.
**Real evidence and a soundness risk:** revision items today are bookmarked/highlighted note sections keyed by `blockId`, and **`blockId`s are positional** (`P1-1`'s documented tradeoff: stable across a same-content regeneration, but every block after an insert or delete renumbers). A schedule keyed only on `blockId` would drift onto the wrong paragraph after a note is edited. Quiz questions are keyed by `(quizId, questionId)`, with the same caveat.
**Scope:** a deterministic, fully client-side scheduler (SM-2-style): ratings **Again / Hard / Good / Easy** update `{ repetitions, interval (days), ease, nextReview, lastReviewedAt }` — Again resets to 1 day; Hard ×1.2; Good ×ease; Easy ×ease×1.3; ease starts 2.5 and is clamped. Item key `note:<folder>#<blockId>` or `quiz:<quizId>#<id>`; each record also stores a short `anchorText` (first ~80 characters of the section) so a drifted `blockId` can be re-anchored or the item shown as "content changed" instead of silently pointing at the wrong text. Storage `revisionSchedule` `{ v:1, items:{ … } }`. "Due" means `nextReview` ≤ today (local date). Surfaces: due count in Revision Center, the Dashboard Review stage (`DASH-7`), Notes and Quiz index badges (inventory `N-8`, `Q-4`).
**Done when:** [ ] interval arithmetic matches fixtures for each rating and clamps ease; [ ] "due" is correct around midnight and across DST; [ ] a record whose anchor no longer matches is surfaced as changed, not reviewed as the wrong text; [ ] corrupt storage falls back to empty; [ ] included in backup.
**Manual test cases:** rate an item Good twice and confirm the interval grows; rate it Again and confirm it is due tomorrow; change the note so the block renumbers and confirm the item is flagged, not mis-targeted.

# Track N — Discovery (new, 2026-08-19)

**Real scope note:** the smallest, safest track discussed — no data-layer risk, reuses what's already built.

### N1-1 — Command palette (Ctrl+K)
**Amended 2026-10-31 — design now exists (prototype header search):** an input in the header that opens a palette with a **suggested-resources** list, `↑`/`↓` to move, `↵` to open, `Esc` to close, and `Ctrl+K` / `⌘K` to focus. Scope additions: also register it in the shared keyboard-shortcuts registry (`lib/keyboardShortcuts.ts`) so it shows in the Shift+? panel; it must not capture `Ctrl+K` while a text field is focused in a way that blocks the browser's own behaviour. Entry-point buttons appear on the three listing pages (inventory items `N-12`, `Q-10`, `X-1`) as Soon controls until this ticket ships.

**Depends on:** none, reuses `useSearch()` (already used by `P3-1`) · **Status:** ⬜ Not started.
**Done when:** [ ] real `Ctrl+K` palette exists, real actions (search notes/quizzes, open Calendar, open Settings, change theme) — not just a mockup of the idea.

### N1-2 — "My Learning" IA area
**Amended 2026-10-31 — page designed (prototype), lives under Plan (`D1`) at `/my-learning`; released 2026-11-02 (`PROTO-8` signed off).** Sections per the design: Continue Learning, Recently Studied, Favorites, Bookmarks, Highlights, Achievements. **Real evidence to reuse, not rebuild:** `RecentlyViewed` (notes + quizzes interleaved, `P0-5`) and `ContinueReading` exist, but **`RecentlyViewed` is mounted only on the 404 page today** — this ticket is where it gets a real home. Favorites come from three separate stores (`notesFavorites`, `quizFavorites`, `galleryFavorites`); do **not** merge them here (see `DX-2`).

**Depends on:** none structurally, but most valuable once `V0-1` exists · **Status:** ⬜ Not started.
**Real scope:** one consolidated area — Continue Learning, Recently Studied, Favorites, Bookmarks, Highlights, Achievements — pulling together existing systems, not duplicating their storage.

---
**Done when:** [ ] `/my-learning` exists and appears under Plan (`NAV-2`); [ ] all six sections render from existing sources — Continue Learning (`ContinueReading`), Recently Studied (`RecentlyViewed`, now mounted outside the 404 page), Favorites (the three existing stores read side by side, not merged), Bookmarks and Highlights counts, Achievements; [ ] empty states for a new visitor; [ ] no new storage keys.
**Manual test cases:** with no data every section shows its empty state; read a note, favorite a quiz, bookmark a section, and confirm each shows in its section; confirm a favorite from Gallery shows under Favorites.

# Track ST — Storage architecture (new, 2026-08-19 — written, explicitly held, per direct recommendation)

**Real scope note, stated plainly:** this is the one track recommended to hold, not build. Real engineering hygiene, real regression risk across every existing `localStorage`-backed feature (12+ real keys already shipped, see `PROJECT.md` §7's key reference table), and no visible user-facing payoff. Written down so the scope exists if it's ever prioritized — not scheduled.

### ST-1 — IndexedDB migration for large datasets
**Components:** [React] · **Depends on:** none, but touches everything · **Status:** ⬜ Not started, **explicitly held**.
**Real evidence for the cost:** about 20 features own their own `localStorage` key (`storageKeys.ts` plus per-item key builders); nearly every read is **synchronous** (`getX()`), and IndexedDB is asynchronous, so each reader would become async; `lib/dataBackup.ts` snapshots **all of `localStorage`** — a migrated key would silently vanish from backups unless backup is rewritten to read IndexedDB too; the test suite relies on `localStorage` fixtures.
**Un-hold only when there is a measured reason:** a dataset approaching the ~5 MB `localStorage` quota (the likely first candidates are highlights/notes at scale and games progress) or a measured main-thread stall — not speculatively.
**If un-held, scope:** migrate one large dataset first behind `ST-2`'s abstraction, dual-read old and new for one release, version the migration, update `dataBackup.ts` in the same change, keep a rollback path.
**Done when (for that first dataset):** [ ] existing data migrates without loss (fixture test with real-shaped data); [ ] backup export/import round-trips it; [ ] no synchronous reader of that key remains; [ ] the quota-pressure case that justified it is demonstrably gone.
**Manual test cases:** export a backup before and after migration and diff; migrate, reload, confirm every highlight is present.

### ST-2 — Storage abstraction layer (`src/lib/storage/`)
**Components:** [React] · **Depends on:** none · **Status:** ⬜ Not started, **explicitly held**. Real value even without `ST-1`: it centralises scattered storage access without changing the storage engine.
**Real evidence (counted in the 2026-10-05 upload):** **90** direct `localStorage.getItem/setItem/removeItem` calls across **33** non-test source files, each re-implementing its own try/catch, JSON parse, `v` check and malformed-value fallback; key names are centralised in `lib/storageKeys.ts` but access is not. `lib/dataBackup.ts` relies on iterating all of `localStorage`, so the abstraction must keep keys in `localStorage` (or update backup in the same change).
**Scope:** `lib/storage/` exposing `readJSON(key, fallback, { version })`, `writeJSON(key, value)`, `removeKey(key)`, with one implementation of quota/privacy-mode errors (private browsing can throw) and one malformed-value rule (return the fallback, never throw). Migrate call sites **one feature per PR**, behaviour identical and each feature's existing tests unchanged; no key renamed.
**Done when:** [ ] the helper has unit tests for missing, malformed, wrong-version and quota-exceeded cases; [ ] migrated features' tests pass unchanged; [ ] a grep shows the migrated files no longer call `localStorage` directly; [ ] backup export/import round-trips unchanged.
**Manual test cases:** corrupt one migrated key in devtools and reload — graceful fallback; fill storage to its quota and trigger a write — no crash, user-visible message where the feature has one.

# Track PROTO — Prototype-first redesign (new, 2026-10-31)

**CLOSED 2026-11-02 — the prototype was supplied; see each ticket's status.** *Original text:* Priority over every other ticket until `PROTO-8` closes. Goal: design the whole site as a self-contained prototype, show the end product, decide what is real, and only then change the app. **The prototype is design work, not application code** — it never changes `web/`.

**Source documents:** `page-inventories/notes-quiz-gallery-inventory.md` (revision 2: current + future feature lists, nav, typography, Dashboard composition, Coming Soon rules); `notebook_buddy_unified_dashboard_settings.html` and `notebook_buddy_interactive_dashboard_settings_prototype.html` (**samples** of the desired Dashboard look and of added features — not the end product); `Brand_Guide.md` v1.0.

**The additive rule:** every existing real feature is present in the prototype; new experiences are added; nothing is deleted or replaced unless a decision below says so.

### Decision log (2026-10-31) — recorded, not buildable

| # | Decision | Supersedes |
|---|---|---|
| D1 | Sidebar groups **Learn / Plan / Library** + separate **System & Tools**. Learn: Home, AWS, DSA, Notes, Quiz, Presentations. Plan: Study Loop, My Learning, Revision Center, Calendar. Library: Gallery, Games, Labs. System & Tools: Settings, Export, Contact | The sample's "Learn & Plan / Explore & Practice / System & Tools" |
| D2 | **Poppins** primary; **Atkinson Hyperlegible** for accessibility; **Caveat** for accents (**deferred 2026-11-06, `D9`**); follow the Brand Guide | The interim idea of switching to Inter |
| D3 | **Daily Goal** (study time / chapters / MCQs) and **Today's Study Plan & Goals** (tasks) both stay, grouped in one Dashboard area; neither loses its own behaviour | "Study Plan replaces Daily Goal" |
| D4 | **Dashboard Scratchpad** and the **global floating Sticky Note** both stay | — |
| D5 | **Labs** stay note entries / a content type in the Notes Library; no Labs page | The sample's Labs page |
| D6 | The existing slide viewer is preserved; a Presentations catalogue is an extra; every deck opens in the real viewer | — |
| D7 | The Coming Soon holding page is for genuinely planned features only; built features are never marked Coming Soon | — |
| D8 | Prototype is self-contained and offline: no CDN Tailwind, Lucide or Google Fonts; supplied brand assets and local styling | The sample's CDN links. **Moot since 2026-11-02:** it governed a prototype build that is no longer needed; the supplied prototype is design reference only and does not affect the real app |

### Decision log addendum (2026-11-06) — recommendations accepted

The twelve open calls were analysed in `ticket-queue.md` §3; the recommendations stand as decisions (nothing was overridden), plus two minor defaults that tickets had flagged.

| # | Decision | Analysis |
|---|---|---|
| D9 | **Caveat is deferred.** `R1-2` ships Poppins and Atkinson only; Caveat can be added later only with an approved Brand Guide line and a Dyslexia-toggle override. **Logo files do not block the redesign** (needed only for `R1-1` stacked/wordmark and `R5-1`/`R7-1` mascot art) | `C1` |
| D10 | **Study Plan:** one persistent list; visible = open tasks + tasks completed today | `C2` |
| D11 | **Study Loop stage rule:** no open task and no goal → Plan; open tasks or incomplete goal → Study; all done and revision items exist → Review; all done and none → Repeat. "Reviewed today" is added with `V1-1` | `C3` |
| D12 | **Slide count:** the Python index generator adds `slideCount` | `C4` |
| D13 | **Mobile filters:** one bottom sheet (`FilterSheet`) on Notes and Gallery; Quiz adopts it with `LIST-4` | `C5` |
| D14 | **Games:** no points or total in v1 | `C6` |
| D15 | **Quick Actions "Revision"** stays `/quiz-index` until `/revision` exists, then repoints | `C7` |
| D16 | **The pytest step becomes blocking**; visual regression and Lighthouse stay non-blocking until after the restyle | `C8` |
| D17 | **Performance page (`B-9a`) is parked** | `C9` |
| D18 | **Note → quiz link:** `related_quiz` frontmatter field | `C10` |
| D19 | **Weak Areas:** below 70% over each quiz's last 3 attempts, at least 2 attempts in the topic | `C11` |
| D20 | **`R0-1` is closed as obsolete** | `C12` |
| D21 | Weekly/monthly summaries use **Monday-start weeks** (`S1-2`, `S1-3`) | minor default |
| D22 | Study sessions auto-finish after **30 idle minutes** (`S1-1`) | minor default |

### PROTO-0 — Record decisions and the additive rule
**Components:** [Docs] · **Depends on:** none · **Status:** ✅ Done 2026-10-31 — the table above plus inventory revision 2 §0.
**Done when:** [x] `D1`–`D8` written down; [ ] the decision log moved into `CHANGELOG.md` at the next docs merge.

### PROTO-1 — Feature inventory (baseline + additions), every page
**Components:** [Docs] · **Depends on:** none · **Status:** ✅ Closed 2026-11-02, scope reduced. Inventories delivered for Notes Index, Quiz Index, Gallery, navigation, typography and Dashboard composition (inventory revision 2). Remaining per-page inventories are done **inside each Track UX ticket** — each reads its own real source before building, the practice that caught the wrong ticket claims — not as a separate documentation pass.
**Real scope:** one inventory per page, **read from real source, not from tickets** (the 2026-10-31 pass overturned six ticket claims that way — see this file's amended `P0-2`, `P0-5`, `P0-6`, `P0-9`, `SHARED-2`, and `NAV-1`). Each item tagged ✅ Built / 🆕 Prototype addition / 🔜 Ticketed / 💡 Proposed / ⚠️ Gap, with ticket IDs.
**Done when:** [ ] every route in `App.tsx`'s route table has an inventory file in `page-inventories/`; [ ] each lists existing features completely (the prototype may not drop any); [ ] each future item carries a ticket ID or "Proposed".
**Manual test cases:** pick 3 built features per page at random, confirm each is in its inventory; pick 3 inventory items, confirm each exists in code.

### PROTO-2 — Self-contained prototype shell
**Components:** [Prototype/HTML] · **Depends on:** `PROTO-1` (navigation inventory — done); `PROTO-9` for real logo files (a labelled placeholder is acceptable meanwhile) · **Status:** ➖ Superseded 2026-11-02 — **the prototype was supplied by you** (`notebook_buddy_interactive_dashboard_settings_prototype.html`), so there is nothing to build. Its design intent is carried into the "Prototype design map" and the Track UX tickets.
**Real scope:** one HTML file that opens with the network off.
- **Styling:** locally compiled Tailwind CSS inlined (not the CDN script); design tokens per `UI-1`'s model but in the **Brand Guide palette** (Buddy Purple `#7C4DFF`, Dark Navy `#0F1F4E`, Paper Cream `#FFF9EE`, Tab Orange `#FFB347`, Text Gray `#64748B`) for the three themes, each with readable contrast.
- **Icons:** the used Lucide icons inlined as SVG (the real app uses `lucide-react`).
- **Fonts:** Poppins, Atkinson Hyperlegible, Caveat embedded as base64 WOFF2 (Latin subset) from the open-licensed packages.
- **Shell:** desktop sidebar (Learn/Plan/Library + System & Tools, per `D1`), tablet rail, mobile bottom bar (5 tabs + More with the groups in the sheet), header (search with `Ctrl+K` palette, theme switcher, notifications bell, user menu with Keyboard Shortcuts), Coming Soon holding page, 404.
- **Convention built in:** every control carries `data-status="built|prototype|soon|proposed"` and `data-ref="<ticket>"`; planned controls show a **Soon** pill and a "Coming soon — <feature>" toast; planned pages with a design open with a "Prototype — not built yet" banner; planned pages with no design open the holding page; built features never use any of these (`D7`).
**Done when:** [ ] zero network requests with the network off (DevTools Network tab plus a grep of the file for `http` in `src=`/`href=`/`@import`); [ ] three themes switch and each passes a contrast check; [ ] sidebar, rail and bottom bar route to every page; [ ] fonts and icons render offline.
**Manual test cases:**
1. Disable the network, open the file, confirm no broken icon or fallback font, and no console error about a blocked request.
2. Switch Comfort / Light / Dark; confirm text is readable on every surface in each.
3. Click every sidebar item; confirm each opens a page, a prototype banner, or the holding page according to its `data-status`.

### PROTO-3 — Dashboard and Settings, full parity
**Components:** [Prototype/HTML] · **Depends on:** `PROTO-2` · **Status:** ➖ Superseded 2026-11-02 — **the prototype was supplied by you** (`notebook_buddy_interactive_dashboard_settings_prototype.html`), so there is nothing to build. Its design intent is carried into the "Prototype design map" and the Track UX tickets.
**Dashboard = existing + additions.** *Existing (all must be present):* greeting from the profile and logo; rotating motivational line; Quick Actions bar (reorderable); Study Statistics with streak; Continue Reading; Achievements; the Dashboard Cards Grid (drag-reorder plus Move earlier/later buttons, Calendar card); the global floating Sticky Note. *Additions from the sample:* a "Today" group holding **Daily Goal (3 types, Change goal, day reset)** beside **Today's Study Plan & Goals (add / tick / remove / clear completed / planner)**; the **Study Loop** strip; the **Scratchpad** card; extra stat tiles (highlights, bookmarks, study time).
**Settings = existing + restyle.** All 7 sections (Profile with study goal; Appearance with accent, card radius, density, animations; Quick Actions; Accessibility with **all 5 toggles** plus "Show keyboard shortcuts"; Reading Preferences with size, line height, family, width; Data Backup; Offline Reading). Primary layout = the mockup's four sections; the other three under a "More Settings" heading.
**Done when:** [ ] every item above present; [ ] nothing missing versus `page-inventories/dashboard.md` and the inventory; [ ] responsive at desktop, tablet and mobile.
**Manual test cases:** walk the Dashboard and Settings against the inventory, item by item; confirm Daily Goal and Study Plan each keep their own controls; confirm the Sticky Note and Scratchpad are both present and labelled differently.

### PROTO-4 — Listing pages: Notes Index, Quiz Index, Gallery
**Components:** [Prototype/HTML] · **Depends on:** `PROTO-2` · **Status:** ➖ Superseded 2026-11-02 — **the prototype was supplied by you** (`notebook_buddy_interactive_dashboard_settings_prototype.html`), so there is nothing to build. Its design intent is carried into the "Prototype design map" and the Track UX tickets.
**Real scope:** every ✅ item in the inventory's §2.1, §3.1 and §4.1 (search; quick filters; filters; the 9 / 7 / 4 sort options; Grid/List; pagination; completion badges and progress bars; card quick actions; the multi-file picker; the Gallery lightbox with zoom, swipe, metadata, download and shortcuts), restyled in one consistent pattern; every 🔜/💡 item in §2.2, §3.2, §4.2 and §5 present as a Soon control (**Masonry**, Compact, Recently Viewed, suggestions, and so on). Lab and Presentation appear as **types** in the Notes Library; the sidebar **Labs** item opens it filtered to Lab (`D5`).
**Done when:** [ ] nothing from the three inventories is missing; [ ] each 🔜/💡 item present with the Soon behaviour; [ ] the eight inconsistencies (`D-1`…`D-8` in the inventory) shown in their proposed consistent form, clearly labelled as proposals.
**Manual test cases:** run the inventory's checklist for each page; click three Soon controls and confirm a toast with no navigation.

### PROTO-5 — Reading pages: Note, Quiz player, Slides, Presentations catalogue
**Components:** [Prototype/HTML] · **Depends on:** `PROTO-2`, `PROTO-1` (these pages' inventories) · **Status:** ➖ Superseded 2026-11-02 — **the prototype was supplied by you** (`notebook_buddy_interactive_dashboard_settings_prototype.html`), so there is nothing to build. Its design intent is carried into the "Prototype design map" and the Track UX tickets.
**Real scope:** Note page with every module type, table of contents, Lite and Exam modes, bookmarks, highlights with personal notes, Revision Mode and the Tools menu; Quiz player with **Study Mode** (built) and **Timed Mode** (Soon); the **slide viewer kept as the real viewer** (deck chrome, keyboard navigation, fullscreen, speaker notes, engage blocks); a **Presentations catalogue** whose deck cards open the viewer.
**Done when:** [ ] every deck card opens the viewer, never an inline substitute (`D6`); [ ] all built Note / Quiz / Slides features present; [ ] Timed Mode is a Soon control.
**Manual test cases:** open three decks from the catalogue; confirm each lands in the viewer chrome; confirm the viewer features list matches `T5-4a`–`T5-4e`.

### PROTO-6 — Plan, Library and utility pages
**Components:** [Prototype/HTML] · **Depends on:** `PROTO-2` · **Status:** ➖ Superseded 2026-11-02 — **the prototype was supplied by you** (`notebook_buddy_interactive_dashboard_settings_prototype.html`), so there is nothing to build. Its design intent is carried into the "Prototype design map" and the Track UX tickets.
**Real scope:** designed prototype pages (with the "Prototype" banner) for **Study Loop, My Learning, Revision Center, Games Hub (with one game player)**; built pages restyled — **Calendar, Search My Notes, Export (Word + EPUB with four scopes, Quiz Book, Revision Book), Contact, 404 with popular notes**, the Link pages (`/namu`, `/chandra`, `/todd`), and Settings reached from System & Tools.
**Done when:** [ ] every page reachable from the sidebar; [ ] built pages lose nothing versus the inventories; [ ] planned pages follow the Coming Soon rules.
**Manual test cases:** visit each page from the nav on all three widths; compare each built page against its inventory.

### PROTO-7 — Decision-sheet generator
**Components:** [Tooling] · **Depends on:** `PROTO-2` (the `data-status` convention) · **Status:** ➖ Superseded 2026-11-02 — **the prototype was supplied by you** (`notebook_buddy_interactive_dashboard_settings_prototype.html`), so there is nothing to build. Its design intent is carried into the "Prototype design map" and the Track UX tickets.
**Real scope:** a small script (a `dashboard.py` subcommand, consistent with `DX-3`) reads `data-status` and `data-ref` across the prototype and writes a sheet in three groups: **existing functionality**, **prototype-only behaviour**, **features requiring implementation**, plus a **gaps** list.
**Done when:** [ ] one run produces the three-group sheet; [ ] counts match the inventory's decision-sheet seed table; [ ] the Python suite has a test for it.
**Manual test cases:** change one control's `data-status`, rerun, confirm it moves group.

### PROTO-8 — Sign-off gate
**Components:** [Process] · **Depends on:** `PROTO-3` to `PROTO-7` · **Status:** ✅ Signed off by direction 2026-11-02 ("proto is completed"). **Scope caveat that stays in force:** sign-off approves the look and the added features; it never approves removing a built feature the sample happens to omit.
**Done when:** [ ] you review the prototype and the decision sheet; [ ] each 🔜/💡 item is accepted, deferred or dropped; [ ] each held `Track UX` ticket is opened, edited or dropped; [ ] the halted tickets are released in the "Sequence" order below.

### PROTO-9 — Brand files and Caveat — **Decided 2026-11-06 (`D9`)**
**Components:** [Design/Docs] · **Depends on:** none · **Status:** ✅ Decided (recommendation accepted). **Caveat is deferred**, so `R1-2` no longer waits on it. **Logo files do not block the redesign.**
**Real findings (2026-10-31, kept):** (1) the 2026-10-05 lean upload has no logo or mascot images (only `favicon.svg` and `icons.svg` in `web/public`) and neither prototype HTML embeds any; the real app already ships the horizontal and icon-only logos, so the genuinely missing files are the `stacked` and `wordmark` variants (`R1-1`) and mascot art (`R5-1`/`R7-1`). (2) The Brand Guide names Poppins only; Caveat is in neither the Brand Guide nor the app; Atkinson Hyperlegible is real (Dyslexia toggle) but not named in the Brand Guide.
**What is still worth doing (small, optional):** one line in `Brand_Guide.md` naming Atkinson Hyperlegible as the accessibility font.
**If Caveat is wanted later (a new ticket, not this one):** approve a Brand Guide line ("handwritten accent only, never in the wordmark or UI text"), load only the weights used, add a `.font-accent` utility, make `data-dyslexia-font="on"` override it, and use it only for decorative text at 18px or larger.
**Done when:** [x] decision made (defer Caveat; logos do not block); [ ] optional Brand Guide line for Atkinson added.

# Track UX — Real-app changes from the approved design direction (new, 2026-10-31; **RELEASED 2026-11-02** — ready to build in the sequence below)

**Released 2026-11-02 (`PROTO-8` signed off).** Each is additive — it adds or repairs and leaves existing behaviour intact — and each cites the real code it was written against (the 2026-10-05 upload, read directly). `NAV-2` is in `sprint-tickets.md` next to `NAV-1`. The calls that were open when this track was written were all decided on 2026-11-06 (`D9`–`D22`, see the addendum in `Track PROTO`).

### Prototype design map (what the supplied prototype shows → what it becomes in the real app)

Source: `notebook_buddy_interactive_dashboard_settings_prototype.html`, one `<main id="view-…">` per screen. **Rule: the prototype only adds or restyles. Anything built that it omits stays.**

| Prototype view | Real route / component today | In the prototype vs the real app | Ticket(s) |
|---|---|---|---|
| `view-dashboard` | `/` — `components/Dashboard` | Adds the Study Loop strip, Today's Study Plan, Scratchpad, "Reorder Cards" control, Continue Reading empty state. Already real: Quick Actions, Study Statistics (7 tiles), Continue Reading, Motivational line, Achievements, Cards Grid | `DASH-1`, `DASH-4`–`DASH-7`, `UI-1` |
| `view-notes-index` | `/notes-index[/:subject]` | Sample has subject filter + sort only; real has search, quick filters, 4 filters, 9 sorts, views, paging, badges, picker — **all stay** | `LIST-1`, `LIST-2`, `UI-2` |
| `view-quiz-index` | `/quiz-index` | Sample is minimal; real features stay | `LIST-1`, `LIST-4`, `UI-2` |
| `view-quiz-player` | `/quiz/:quizId` | **New: Timed Mode** (countdown). Already real: Study Mode toggle, elapsed timer, score summary, review, retry | `QZ-1`, `UI-2` |
| `view-gallery` | `/gallery` | Sample shows 3 cards; real views, lightbox and filters **all stay** | `LIST-1`, `LIST-3`, `UI-2` |
| `view-labs` | *(none — labs are a note type)* | **Not a page** (decision `D5`); the sidebar Labs item filters the Notes Library | `NAV-2` |
| `view-presentations` | `/slides/:folder` viewer (real); catalogue (new) | Catalogue is an extra; decks open in the real viewer | `PRES-1` |
| `view-games-hub` | *(none — Track G)* | New hub: featured game, groups, Recently Played, Unexplored, difficulty, a player | `GH-1`, `G0-1`, `G1-*` |
| `view-study-loop` | *(none)* | New page for the four stages | `DASH-7` / `S3-1` |
| `view-my-learning` | *(none; `RecentlyViewed` only on 404)* | New hub, six sections | `N1-2` |
| `view-note-viewer` | `/notes/:folder` — `pages/Note` | **New: "Take Related Quiz" panel.** Already real: TOC, Lite/Exam modes, bookmark, highlights | `NOTE-1`, `UI-2` |
| `view-calendar` | `/calendar` | Restyle; read the real page first | `UI-2` |
| `view-search-my-notes` | `/search-my-notes` | Restyle; the real page is already highlight- and bookmark-aware | `UI-2` |
| `view-revision-center` | *(none; pieces exist)* | New page; wires existing Revision Mode and Revision Book | `V0-1` |
| `view-settings` | `/settings` — 7 registered sections | Same 7 sections; the sample **drops controls the real app has** (2 of 5 accessibility toggles, reading size/line height/width, density, animations) — they stay | `SET-1` |
| `view-contact` | `/contact` | Sample has a local feedback form; the real page embeds the Google Form (`B-1`) — keep it | `UI-2` |
| `view-export` | `/export` | Sample lists 5 cards; real has Word + EPUB × 4 scopes, Quiz Book, Revision Book | `EXP-1`, `UI-2` |
| `view-coming-soon`, `view-404` | `NotFound` exists; holding page does not | Holding page is new | `NAV-2` |
| Header (search, theme, bell, user menu) | `NotificationsBell`, `UserMenu`, `ThemeToggle` | Search entry, theme dropdown, richer user menu | `HDR-1`, `N1-1` |

### UI-1 — Design tokens from the approved prototype, kept inside the Brand Guide
**Components:** [Tailwind/CSS] [React] · **Depends on:** `PROTO-8` ✅ · **Related:** `SHARED-3` (primitives), `P0-2` (Appearance tokens) · **Status:** ⬜ Ready.

**Real evidence — two different vocabularies:**
- *Real app* (`web/src/index.css`, `web/tailwind.config.js`): 12 tokens per theme — `--bg-primary`, `--bg-secondary`, `--bg-card`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border-color`, `--shadow`, `--primary`, `--primary-hover`, `--accent`, `--accent-hover` — defined for `light`, `dark`, `comfort` and mapped 1:1 in Tailwind's `colors`. Appearance (`P0-2`) adds `--card-radius`, `--card-gap`, `--card-padding`, `--grid-gap`, `--motion-duration`; Reading Preferences (`P0-8`) adds `--reading-*`; high contrast overrides text/border/shadow.
- *Prototype* (`:root` and per-theme blocks): `--bg-page`, `--bg-surface`, `--bg-subtle`, `--bg-hero`, `--border-default`, `--border-subtle`, `--text-main`, `--shadow-card`, `--shadow-float`, `--sidebar-bg`, `--input-bg`, `--header-bg`, `--brand-surface`, `--brand-border`, `--warm-*`, `--semantic-success|info|error`, and a radius scale (`--radius-hero` 20px, `--radius-card` 14px, `--radius-btn` 10px, `--radius-control` 8px).
- **The prototype's neutral values are not Brand Guide colours:** text `#0F172A` / `#1F1D2B` (Brand Guide: Dark Navy `#0F1F4E`), dark page `#13111E` (real app: `#0B1330`), comfort page `#F8F6F2` (Brand Guide: Paper Cream `#FFF9EE`). Under decision `D2` the Brand Guide wins: **take the prototype's structure (more surface levels, two shadow levels, header/sidebar/input surfaces, semantic colours, a radius scale), keep the real app's brand-derived values.**

**Scope (additive — no existing token is renamed or removed):**
1. Add to each of the three themes: `--bg-subtle`, `--bg-hero`, `--border-subtle`, `--shadow-card`, `--shadow-float`, `--sidebar-bg`, `--input-bg`, `--header-bg`, `--success`, `--info`, `--danger`; values derived from the existing brand palette per theme.
2. Add the radius scale as `--radius-hero|card|btn|control`, **with `--radius-card` defined from `--card-radius`** so the Appearance radius setting keeps working (`P0-2`).
3. Extend `tailwind.config.js` `colors`/`boxShadow`/`borderRadius` with the new names; existing class names keep working.
4. No page is restyled in this ticket; consumers adopt tokens in their own tickets.

**Done when:**
- [ ] All 12 existing tokens unchanged per theme (diff-checked); `data-high-contrast` still overrides correctly
- [ ] Each new token defined in all three themes
- [ ] A test asserts body text on each new surface meets WCAG AA (4.5:1) in all three themes
- [ ] `npm run build`, `npm test` and the visual suite (`test:visual`) pass with no unintended snapshot diffs
- [ ] Appearance → card radius still visibly changes cards that use `--radius-card`

**Manual test cases:**
1. Switch Comfort / Light / Dark on the Dashboard; confirm nothing changes visually (no consumers yet).
2. In Settings → Appearance change card radius; confirm any card using `--radius-card` follows it.
3. Enable high contrast in each theme; confirm text and borders still override.
4. Inspect `:root` in devtools; confirm each new token resolves in all three themes.

### DASH-4 — Make Daily Goal reachable, single-ticker, and MCQ-accurate (corrects `P0-6`)
**Components:** [React] · **Depends on:** `PROTO-8` ✅ · **Blocks:** `DASH-5` placement, `DASH-1` · **Status:** ⬜ Ready. **Closes the three real findings recorded on `P0-6`.**

**Real evidence, read from the 2026-10-05 upload:**
- `hooks/useDailyGoal.ts` runs `setInterval(..., 60_000)` **inside the hook, per caller**, when `goal.type === 'time'`, and keeps a private `useState` copy of the goal. `components/UserMenu/UserMenu.tsx` (mounted app-wide) calls it; `DailyGoalWidget` would call it again. Result if mounted as-is: two tickers, **2 minutes credited per minute**, and a goal chosen in the widget invisible to `UserMenu` until it re-reads.
- `chooseGoal`/`clearGoal` are reachable only from `DailyGoalWidget`, which `Dashboard.tsx` does not mount — so today **no screen can set a goal**, and `UserMenu` always reads "No daily goal set".
- `lib/dailyGoal.ts`'s header says `useQuizEngine.ts` increments MCQ progress in `selectOption`; the non-test source has **no caller** of `incrementDailyGoalProgress` besides the `'time'` ticker. `'chapters'` is fine — it is recomputed on every read from `readingProgress-folder-*` (≥95%, today).

**Scope:**
1. **One owner for the goal and its ticker.** New `context/DailyGoalContext.tsx`, mounted in `App.tsx` beside the existing providers (`ThemeContext`, `ProfileContext`, `AppearanceContext`, `A11yContext`, `ReadingPreferencesContext`). It holds the goal state and the single minute ticker. `hooks/useDailyGoal.ts` keeps its public shape `{ goal, chooseGoal, clearGoal, refresh }` but becomes a consumer, so `UserMenu` and the widget need no signature change. `lib/dailyGoal.ts` (storage key, daily reset, 3 types, `notifiedComplete`) is **unchanged**.
2. **Wire MCQs for real:** call `incrementDailyGoalProgress('mcqs', 1)` from `pages/Quiz/useQuizEngine.ts` when a question is **newly** answered (the point `lib/dailyGoal.ts` describes), and refresh the context. Re-answering or changing an answer must not credit again.
3. **Mount `DailyGoalWidget` in a "Today" group in `Dashboard.tsx`** (beside `DASH-5` once that exists). The widget's 3 types, presets, Change goal and day-rollover reset are unchanged.
4. Update `useDailyGoal` tests for the context version and add one regression test: two consumers mounted ⇒ one tick per minute.

**Done when:**
- [ ] The widget is visible on the Dashboard and a user can set each of the 3 goal types
- [ ] With the widget and `UserMenu` both mounted, a `time` goal gains exactly 1 minute per elapsed visible minute (fake-timer test)
- [ ] Setting or clearing a goal in the widget updates `UserMenu`'s "Today's goal" line immediately
- [ ] Answering a **new** quiz question advances an `mcqs` goal by 1; re-selecting on an answered question does not
- [ ] A `chapters` goal still recomputes from reading progress; the daily reset and the once-per-day completion notification (toast + bell entry) still work
- [ ] `P0-6`'s status is restored by this evidence, not by assertion

**Manual test cases:**
1. Open the Dashboard, choose "25 MCQs", answer 3 new questions in a quiz, return; confirm "3 / 25". Re-answer one; confirm it stays 3.
2. Choose "30 min", leave the tab visible for 3 minutes with the user menu open; confirm 3 / 30, not 6.
3. Choose a goal in the widget, open the user menu; confirm the same goal and progress appear without a reload.
4. Finish a note to ≥95%; with a `chapters` goal, confirm progress rises on the next Dashboard visit.
5. Complete a goal; confirm exactly one toast and one bell entry; reload and confirm no second notification.
6. Change the stored date in devtools to yesterday; reload; confirm progress resets to 0.

### DASH-5 — Today's Study Plan & Goals (task planner) — new feature from the prototype
**Components:** [React] · **Depends on:** `DASH-4` (shares the "Today" group), `PROTO-8` · **Status:** ⬜ Ready. **Decision `D3`: this does not replace Daily Goal and has no goal types.**

**Design reference (prototype):** a card listing today's tasks with a tick box each, "N / M completed", Add Task, a **Manage Planner** modal, remove, and Clear completed. It is task-based only.

**Real evidence for fit:** the app already persists per-feature state as small versioned objects under named keys (`lib/storageKeys.ts` centralises key names; e.g. a `StickyNote` is `{ v: 1, text, updatedAt }`); the JSON backup (`lib/dataBackup.ts`) snapshots **all** of `localStorage` and restores per key only when the incoming `v` is not older, so a new `{ v: 1 }` key is included automatically; `lib/notificationsInbox.ts` is the existing event sink (`B-2`).

**Scope:**
1. `lib/studyPlan.ts` — `{ v: 1, tasks: { id, text, done, createdAt, doneAt? }[] }` under a new key `studyPlanTasks` (`STUDY_PLAN_TASKS_KEY` added to `lib/storageKeys.ts`); defensive read: a non-array or malformed value falls back to an empty plan, never throws (same convention as `dashboardCardOrder`).
2. `hooks/useStudyPlan.ts` — add, toggle, remove, clearCompleted; stable ids; trims empty text; caps length (e.g. 140 characters).
3. `components/StudyPlanWidget` — the card; `components/StudyPlanModal` — the planner list with the same actions. Keyboard-operable; counts announced via the live region used elsewhere (`useLiveRegion`).
4. **Day handling (decided 2026-11-06, `D10`):** one persistent list; the widget shows open tasks plus tasks completed today (`doneAt` is today), so "N / M" stays meaningful after midnight; older completed tasks are hidden, not deleted, until Clear completed.
5. Optional, off unless approved: one inbox notification when the last open task is ticked (`addInboxNotification`, same pattern as Daily Goal completion).
6. The prototype's separate "Daily Target" line is **not** carried over (Daily Goal already owns the target); the plan card links to the Daily Goal card instead.

**Done when:**
- [ ] Add, tick, untick, remove and Clear completed all work and persist across reload
- [ ] A corrupt `studyPlanTasks` value (non-array, wrong `v`) loads as an empty plan, no crash
- [ ] Included in a JSON backup export and restored on import
- [ ] Daily Goal behaviour is untouched (its tests unchanged and passing)
- [ ] Full keyboard operation; count announced to assistive tech

**Manual test cases:**
1. Add 4 tasks, tick 2, reload; confirm "2 / 4". Click Clear completed; confirm 2 remain.
2. Add an empty or whitespace-only task; confirm it is rejected.
3. Set `studyPlanTasks` to `"oops"` in devtools, reload; confirm an empty plan and no error.
4. Export a backup, clear storage, import it; confirm the tasks return.
5. Using only the keyboard, add, tick and remove a task.

### DASH-6 — Dashboard Scratchpad card (separate from the global Sticky Note)
**Components:** [React] · **Depends on:** `PROTO-8` ✅ · **Status:** ⬜ Ready. **Decision `D4`: both stay.**

**Real evidence:** the existing Sticky Note is a floating widget mounted once in `App.tsx` (`StickyNoteWidget` + `hooks/useStickyNote.ts` + `lib/stickyNotes.ts`), **scoped per page** via `usePageId()`, stored as `{ v: 1, text, updatedAt }`. The Scratchpad is a different thing: one long-lived Dashboard draft, not tied to a page.

**Scope:** `lib/scratchpad.ts` + `hooks/useScratchpad.ts` + `components/ScratchpadCard`; **own key** `dashboardScratchpad` (added to `storageKeys.ts`), same `{ v: 1, text, updatedAt }` shape (share the type, not the storage — keep one source of truth per domain, see `DX-2`); debounced autosave; a Clear action with confirmation; the heading uses the normal heading style (Caveat is deferred, `D9`). Labels stay distinct — **"Scratchpad"** on the Dashboard, **"Sticky note"** for the floating widget — so users can tell them apart.

**Done when:**
- [ ] Text persists across reload and navigation
- [ ] Clear empties the Scratchpad only; the Sticky Note on every page is untouched
- [ ] A Sticky Note written on the Dashboard page is *not* shown in the Scratchpad, and vice versa
- [ ] Corrupt stored value falls back to empty; included in backup export/import

**Manual test cases:** type in the Scratchpad, reload, confirm it persists; write a sticky note on the Dashboard page and confirm the two are independent; Clear the Scratchpad and confirm the sticky note remains; corrupt the key in devtools and reload.

### DASH-7 — Study Loop strip (Dashboard) and page (`S3-1`) — new feature from the prototype
**Components:** [React] · **Depends on:** `DASH-5` (Plan stage), `V0-1` (Review stage), `PROTO-8` · **Status:** ⬜ Ready. **Stage rule decided 2026-11-06 (`D11`).**

**Design reference:** a four-stage strip — Plan → Study → Review → Repeat — on the Dashboard, with the current stage marked and one action per stage, linked to a Study Loop page under Plan.

**Real data each stage can use today (no new tracking):**
- **Plan:** open tasks and the Daily Goal state (`DASH-5`, `DASH-4`).
- **Study:** the `ContinueReading` target (`P0-3`), else the first not-started note.
- **Review:** counts from bookmarks and highlights (`T5-3c-7`, `P1-1`); *due items* arrive with `V1-1` — until then show "Open Revision Center" without a due count.
- **Repeat:** streak from `lib/studyStats.ts` (`P2-2`).

**"Current stage" rule (decided 2026-11-06, `D11`):** no open task and no goal → **Plan**; open tasks or an incomplete goal → **Study**; everything done (goal complete or none set, no open tasks) and revision items exist → **Review**; everything done and no revision items → **Repeat** (shows the streak). Deterministic, computed from existing data, nothing stored. "Reviewed today" is added with `V1-1`, because nothing records a review today.

**Scope:** `components/StudyLoopStrip` (Dashboard) — ships first with Plan and Study live and Review/Repeat as Soon controls where their data does not exist yet; `pages/StudyLoop` (`S3-1`) after `V0-1`.

**Done when:** [ ] the strip shows the correct current stage for four fixture states; [ ] each stage's link goes to a real page or the holding page (never a dead link); [x] rule decided and written (`D11`); [ ] fixtures cover all four states.
**Manual test cases:** with no tasks and no goal, the strip highlights Plan; add a task, highlight moves to Study; complete the goal and tasks, highlight moves to Review (or its Soon state if Revision Center is not built).

### S3-1 — Study Loop page (the page half of `DASH-7`)
**Components:** [React] · **Depends on:** `DASH-7` (strip and the current-stage rule), `DASH-5` (Plan), `V0-1` (Review) · **Status:** ⬜ Ready after its dependencies. **Design reference:** `view-study-loop` — "The Study Loop Journey" with four sections: 1. Plan, 2. Study, 3. Review, 4. Repeat.
**Real evidence:** no such page or route exists in `App.tsx`; the data each stage needs already exists (open tasks from `DASH-5`, `ContinueReading` target, bookmark/highlight counts, streak from `lib/studyStats.ts`) — **no new tracking is added**.
**Scope:** `pages/StudyLoop` at `/study-loop` (Plan group in the sidebar, `NAV-2`); each stage section shows its current data and one primary action; the stage `DASH-7` marks as current is highlighted; a stage whose data does not exist yet (Review before `V1-1`) renders as a Soon control, not an error.
**Done when:** [ ] route and sidebar item work; [ ] each stage shows real data and its link lands on a real page or the holding page; [ ] the highlighted stage matches the Dashboard strip for the same state.
**Manual test cases:** with fixture states (no tasks; open tasks; goal complete) confirm the highlighted stage matches the Dashboard strip each time; click each stage's action.

### PRES-1 — Presentations: fix dead links to the slide viewer, add the catalogue
**Components:** [React] · **Depends on:** `PROTO-8` ✅ · **Related:** `T5-4a`–`T5-4e`, `NAV-2` · **Status:** ⬜ Ready. **Decision `D6`: the slide viewer is untouched; every deck opens in it.**

**Real evidence, read from the 2026-10-05 upload:**
- The viewer is real: `App.tsx:279` routes `/slides/:folder` to `pages/Slides/Slides.tsx` (title/bullet slides, keyboard navigation, fullscreen, speaker notes, engage blocks).
- **Two Notes-index links to it are dead.** In `pages/NotesIndex/NotesIndex.tsx`, `getPrimaryFileRoute()` returns nothing for a `slides` primary file (its comment still says "pending T5-4"), so `getPrimaryFileUrl()` falls back to `dataPath('notes', folder, 'slides.html')` for slides-only folders; and the folder picker (`FolderModal`) renders its `slides` entry as a plain `<a href={dataPath('notes', folder, 'slides.html')}>`. The lean upload's `public/data/notes/<folder>/` holds only a `json/` directory — no `.html` — so these point at a file the JSON-first pipeline does not publish (**verify against the deployed site before relying on this**).
- The only working path today is indirect: `/notes/<folder>` for a slides-only folder redirects to `/slides/<folder>` (`Note.tsx`, T5-4e).
- Data: in the upload's `notes-index.json`, 4 of the 12 file entries are `slides` type (7 notes, 1 lab); one note folder can hold notes, slides and a lab together.

**Scope:**
1. `getPrimaryFileRoute()` returns `/slides/<folder>` for a `slides` primary file; `FolderModal`'s slides entry becomes a router `<Link>` to the same route; `ContinueReading` (which already prefers `getPrimaryFileRoute`) benefits automatically.
2. New `pages/Presentations/Presentations.tsx` at `/presentations`: lists every note folder that has a `slides` file; each deck card shows title, category, last-updated, and the slide count from the index's new `slideCount` field (**decided 2026-11-06, `D12`:** the Python index generator adds it — scope item 5); card actions reuse `CardQuickActions` (Open, Favorite = the existing `notesFavorites` store, Copy link — do **not** add a fourth favorites store).
3. Search uses the same `useSearch()` + field config pattern as Notes.
4. Adds the Learn → Presentations item (`NAV-2`).
5. **Python lane (`D12`):** `generate_notes_index.py` adds `slideCount` to every index entry that has a slides file, by reading the `slides.json` the pipeline already writes (`write_slides_json` in `generate_notes.py`); **verify the file's location and shape on the current tree before coding.** Entries without slides get no field; a missing or malformed `slides.json` omits the field instead of failing the build.

**Done when:**
- [ ] Every Presentation card and folder-picker entry opens `/slides/<folder>` and the viewer renders it
- [ ] No link to a raw `slides.html` remains (grep)
- [ ] The catalogue lists every folder with a slides file and each card opens the viewer
- [ ] A Python test covers `slideCount` present, absent and malformed; the regenerated index has it for every deck and the catalogue shows it
- [ ] Viewer tests (`Slides.test.tsx`) pass unchanged; new tests cover both link fixes and the catalogue

**Manual test cases:**
1. On Notes index, open a slides-only note via its card; confirm it opens the viewer.
2. Open a multi-file note's folder picker, click its Presentation entry; confirm the viewer, not a raw file or a 404.
3. Open `/presentations`; click three decks; confirm each lands in the viewer.
4. Favorite a deck on the catalogue; confirm the same note shows as favorited on Notes index.
5. Use Continue Reading on a deck-only note after reading part of it; confirm it routes to the viewer.

### R1-2 — Typography: self-hosted Poppins and Atkinson Hyperlegible (Caveat deferred)
**Components:** [React] [Tailwind/CSS] · **Depends on:** none (Caveat decided, `D9`) · **Related:** `P5-1`, `B-5` · **Status:** ⬜ Ready. **Decision `D2` as amended by `D9`: Poppins primary, Atkinson Hyperlegible for accessibility; Caveat is not added.**

**Real evidence:** `web/src/index.css` lines 1–2 `@import` Poppins (400–800) and Atkinson Hyperlegible (400/700, italics) from `fonts.googleapis.com`; `tailwind.config.js` defines only `font-poppins`; `[data-dyslexia-font='on']` (`index.css:196`) swaps `body` and `.notes-body-prose` to Atkinson; there is no Caveat anywhere; `vite-plugin-pwa` is a dependency. The Brand Guide specifies Poppins only and forbids other fonts in the wordmark (which ships as an image, so it is unaffected).

**Scope:**
1. Self-host the two families (open-licensed fontsource packages, Latin subset, only the weights actually used) and import them locally; delete the two Google `@import` lines.
2. **Do not add Caveat.** The Dashboard motivational line and the Scratchpad heading (`DASH-6`) use the normal Poppins heading style.
3. Keep the dyslexia toggle and the Reading Preferences font-family options working unchanged.
4. Ensure the font files are in the service worker's precache so Offline Reading (`P5-1`) works on a cold cache.
5. Record the bundle-size delta in the PR; stay within the existing Lighthouse thresholds (`B-4c`).

**Done when:**
- [ ] No request to `fonts.googleapis.com` or `fonts.gstatic.com` (DevTools Network, cold cache)
- [ ] With the network off after first load, text renders in Poppins and the dyslexia toggle still swaps to Atkinson
- [ ] No Caveat font file or reference anywhere (grep)
- [ ] Build, tests and visual suite pass; font-file sizes recorded

**Manual test cases:** load with an empty cache and watch Network (no Google requests); go offline and reload an opted-in note; toggle Dyslexia-friendly and confirm Atkinson; confirm no handwriting-style text appears anywhere.

### LIST-1 — One consistent list pattern across Notes / Quiz / Gallery
**Components:** [React] · **Depends on:** `PROTO-8` ✅, `UI-1` · **Status:** ⬜ Ready. **Mobile filter pattern decided 2026-11-06 (`D13`): bottom sheet.**

**Real evidence (each verified in the 2026-10-05 source):**
1. **Favorites control:** `Gallery.tsx` renders its own Favorites toggle button (`aria-pressed={showFavoritesOnly}`) and does not use `QuickFiltersBar`; Notes and Quiz do.
2. **View-toggle icons:** `NotesIndex` and `QuizIndex` pass Lucide icons (`Grid2x2`, `List`) to `ViewModeToggle`; `Gallery` passes the text glyph `'▦'`.
3. **View-mode memory:** only Gallery persists it (`GALLERY_VIEW_MODE_KEY`); Notes and Quiz use `useState('grid')`.
4. **Mobile filters:** Notes uses a right-side drawer (`max-md:translate-x-full`), Gallery a bottom sheet (`max-md:bottom-0 … translate-y-full`), Quiz has none (it has one Topic filter).
5. **Tag logic:** Notes tags match with `.some()` (any); Gallery tags with `.every()` (all) — deliberate, documented in both files, but the two look identical to a user.

**Scope:** (1) Gallery adopts `QuickFiltersBar` for Favorites; (2) Lucide icons on Gallery's toggle; (3) add `NOTES_VIEW_MODE_KEY` / `QUIZ_VIEW_MODE_KEY` to `storageKeys.ts` and persist (defensive read, default `grid`); (4) **decided (`D13`):** one shared bottom-sheet component (`FilterSheet`) used by Notes and Gallery — maximum height about 85%, filters apply instantly as they do today (no Apply button), the number of active filters shown on the trigger; Quiz adopts it once `LIST-4` adds a second filter; (5) label the tag filters "Any of" / "All of". **Existing behaviour of every control is unchanged.**
**Done when:** [ ] Gallery favorites works as before through the shared bar; [ ] all three toggles use Lucide and remember the mode; [ ] filters and sort results are identical before and after (existing tests unchanged and passing); [ ] tag labels shown.
**Manual test cases:** switch each page to List, reload, confirm it stays; toggle Gallery favorites and confirm the same filtered list as before; open the mobile filter UI on each page and confirm filters still apply.

### LIST-2 — Notes Index deferred features
**Components:** [React] · **Depends on:** `LIST-1` · **Status:** ⬜ Ready; each row below ships and is accepted on its own. **Source: the "deferred" list in `NotesIndex.tsx`'s header.** Real evidence common to all: `NotesIndex` uses `useSearch` with weighted fields (title 4, tags 3, category 2, session 1), 9 sorts, a seeded random sort, `QuickFiltersBar`, `ViewModeToggle`, and shares `SEARCH_FIELDS` with Search My Notes.

| Item | Approach | Done when | Manual test |
|---|---|---|---|
| **Compact** view | third option in `ViewModeToggle`; one-line rows (title, category, completion) | all existing quick actions still reachable; keyboard focus order intact; mode persists (`LIST-1`) | switch to Compact, confirm Open/Favorite/Copy link work |
| **Recently Viewed** sort | needs a read of `readingProgress-folder-*` timestamps (already stored) — no new tracking | sort orders by last-opened; notes never opened sink to the end | open two notes, confirm they top the list |
| **Search suggestions** | dropdown under the search box from the same index; `↑ ↓ ↵ Esc` | results identical to submitting the query; screen-reader announces the count | type a prefix, pick with keyboard |
| **Match highlighting** | wrap matched terms in `<mark>` in title/category only | no raw HTML injected (text-safe); highlight clears with the query | search "sort", confirm only matches are marked |
| **Remember filters** | persist session/category/type/tags in a versioned key | a stale value that no longer matches any option is dropped; Clear all also clears storage | set filters, reload, confirm they return |
| **Search + sort together** | `useSearch` must expose scores; relevance first, chosen sort breaks ties | the Sort control is no longer inert during a search | search, change sort, confirm order changes |

### LIST-3 — Gallery deferred features
**Components:** [React] · **Depends on:** `LIST-1` · **Status:** ⬜ Ready; each row ships on its own. **Source: `Gallery.tsx`'s header "deferred" list.** Real evidence common to all: the lightbox already has zoom 1×–4×, prev/next, swipe at 1× and pinch zoom, keyboard keys (`Esc ← → + − 0 F`), a metadata panel, and a live region.

| Item | Approach | Done when | Manual test |
|---|---|---|---|
| **Masonry** view | CSS columns variant in `ViewModeToggle`; same card, same quick actions | no card loses favorite/copy-link; mode persists | switch to Masonry, resize |
| **Drag-to-pan** | pointer drag when zoom > 1×, clamped to image bounds | does not conflict with swipe-to-navigate (swipe only at 1×) | zoom, drag around, reset with `0` |
| **Double-tap zoom** | touch double-tap toggles 1× ↔ 2× | single tap still does not close the lightbox unexpectedly | double-tap on a phone |
| **Fullscreen** | Fullscreen API on the lightbox; feature-detected | button hidden where unsupported; `Esc` exits cleanly | enter and exit fullscreen |
| **Resolution / file size** | measured in the browser on load (`naturalWidth/Height`; size via a lightweight HEAD or omitted if unavailable) | shown in metadata; sortable only where measured | open an image, compare to the file |
| **Recently Viewed** | record on lightbox open (small capped list) + sort | capped, versioned key; included in backup | open three images, sort |
| **Random** sort + reshuffle | seeded like Notes' Random | order stable between renders until Shuffle | click Shuffle |
| **Type filter** | Screenshot / Image chip using the existing detection | filter result matches the card badges | filter to Screenshot |
| **Deep link** | `?folder=&image=` (what Copy link already produces) opens that image on load | unknown image id is ignored without error | paste a copied link in a new tab |
| **Focus trap** | Tab/Shift+Tab stay inside the open lightbox; focus returns to the opener on close | verified with keyboard only; a real accessibility fix | open, Tab repeatedly, close |

### LIST-4 — Quiz Index additions
**Components:** [React] [Python] · **Depends on:** `LIST-1` · **Status:** ⬜ Ready, 💡 proposed; each row needs your approval first.

| Item | Real evidence / approach | Done when | Manual test |
|---|---|---|---|
| Best / last score and attempt count on the card | data exists in `quiz_history_<id>` (`{date,score,total,pct}`, capped at 20) — attempt count is capped, say so in the UI | card shows best % and last %; a quiz with no attempts shows nothing extra | finish a quiz twice, check the card |
| Compact view, Recently Viewed | parity with `LIST-2` (`readingProgress-quiz-<id>` already stores last-opened) | same as the Notes rows | as Notes |
| Difficulty chip + filter | **`quiz-index.json` has no `difficulty` field** (fields today: `estimatedMinutes`, `file`, `questionCount`, `title`, `topic`); needs the generator and authoring format to add it | field present for all quizzes or the chip is hidden; filter works | set difficulty in one quiz, regenerate, filter |

### EXP-1 — Export hub: surface what exists, then add (proposed)
**Components:** [React] · **Depends on:** `PROTO-8` ✅ · **Status:** ⬜ Ready, 💡 proposed. **Additive only.**
**Real evidence:** `/export` (`pages/Export/Export.tsx`) offers four scopes (Whole Notebook, Favorites, Bookmarked, Current chapter) × two formats (**EPUB, Word `.docx`**), plus one-click **Quiz Book** and **Revision Book**. **PowerPoint export is not on this page** — it is offered from the Slides page (`Slides.tsx` calls `exportSlidesAsPptx`). The full JSON backup is in Settings → Data Backup (`P4-1`). The prototype's Export hub also lists a Markdown notes compilation and CSV study logs.
**Scope (each a separate acceptance):** (a) add link cards on `/export` for the **existing** JSON backup and PowerPoint entry points (no duplicated logic); (b) *proposed* Markdown compilation and CSV of study activity (`getStudyActivityDates()` data) as new formats. **Done when:** (a) both links reach the real features; (b) only if accepted, each new format has its own Done-when and test.
**Manual test cases:** from `/export`, follow the backup card and confirm Settings → Data Backup opens; follow the PowerPoint card and confirm it lands on the Slides page's export control.

### UI-2 — Apply the approved look to every existing page (additive restyle)
**Components:** [React] [Tailwind/CSS] · **Depends on:** `UI-1` · **Status:** ⬜ Ready. **Rule: visual changes only. No feature is removed because the prototype omits it.**

**Why a ticket and not one big restyle:** the prototype shows simplified versions of pages that are far richer in the real app (Notes index, Quiz index, Gallery, Settings, Export, Contact), so each page needs its own check that nothing built is lost.

**Per-page checklist** (each row is one reviewable change; do them in this order):

| Page | Real source | What the prototype omits that must stay |
|---|---|---|
| Notes Index | `pages/NotesIndex` | search, quick filters, session/category/type/tags filters, 9 sorts, shuffle, grid/list, paging, completion badges, quick actions, folder picker |
| Quiz Index | `pages/QuizIndex` | search, favorites/status/recent filters, 7 sorts, views, paging, progress |
| Gallery | `pages/Gallery` | grid/list, filters, favorites, full lightbox (zoom, swipe, metadata, download, shortcuts) |
| Note | `pages/Note` | every module type, Lite/Exam modes, revision mode, highlights and notes, tools menu |
| Quiz player | `pages/Quiz` | save/resume, flags, bookmarks, attempt history |
| Slides | `pages/Slides` | deck chrome, keyboard navigation, fullscreen, speaker notes, engage blocks, PPTX export |
| Calendar | `pages/Calendar` | whatever the real page offers today (read it first) |
| Search My Notes | `pages/SearchMyNotes` | highlight- and bookmark-aware scoping |
| Export | `pages/Export` | 4 scopes × Word/EPUB, Quiz Book, Revision Book |
| Contact | `pages/Contact` | project info, contributors, GitHub links, FAQ, **embedded Google Form** |
| 404 | `pages/NotFound` | search, Recently Viewed, Popular Notes |
| Link pages | `pages/LinkPage` | profile header, link cards, announcements, QR share |

**Done when (per page):**
- [ ] The page's existing tests pass **unchanged**
- [ ] Visual snapshots (`test:visual`) re-baselined deliberately, with before/after reviewed
- [ ] The page's inventory (or its real source read) shows no feature removed
- [ ] Contrast, focus rings and the 5 accessibility toggles still work on the page
- [ ] **(added 2026-11-14)** The Appearance settings (accent colour, card radius, density, animations) visibly affect this page's cards and buttons — this is how `P0-2` finally closes
**Manual test cases:** for each page, open it in all three themes at desktop and mobile width, run its own existing manual tests (from its original ticket), and confirm each still passes.

### SET-1 — Settings: restyle, "More Settings" grouping, keep every control
**Components:** [React] · **Depends on:** `UI-1` · **Status:** ⬜ Ready. **Design reference:** `view-settings` (Profile, Appearance, Quick Actions, Accessibility, Reading, Data Backup, Offline).

**Real evidence:** `pages/Settings/registry.ts` exposes `registerSettingsSection({ id, label, Component })`; `Settings.tsx` renders whatever is registered; seven sections self-register through `sections/index.ts` (Profile, Appearance, Quick Actions, Accessibility, Reading Preferences, Data Backup, Offline Reading). The registry has a dev-mode duplicate-id guard and a test-reset escape hatch.

**What the prototype drops that stays:** Accessibility — the real section has **5** toggles (high contrast, reduced motion, focus mode, dyslexia font, larger UI) and the prototype shows 3; Reading Preferences — real has size, line height, family and width, the prototype shows typeface only; Appearance — real has accent, card radius, density and animations, the prototype shows accent and radius. (The "Show keyboard shortcuts" button from `P0-9b` lives in the newer docs.)

**Scope:** add an **optional** `group?: 'primary' | 'more'` field to `registerSettingsSection` (default `'primary'`; existing registrations keep working); show Profile, Appearance, Quick Actions, Accessibility as the primary layout and Reading Preferences, Data Backup, Offline Reading under a "More Settings" heading; restyle with `UI-1` tokens. **No section component's controls, storage keys or tests change.**

**Done when:** [ ] all 7 sections reachable; [ ] every control that exists today still exists and works; [ ] duplicate-id guard and test-reset still pass their tests; [ ] `registerSettingsSection` callers without `group` unchanged; [ ] **(added 2026-11-14)** Accessibility shows a small live preview for **Reduced motion** (a looping animated element that stops when the toggle is on) and **Focus mode** (a sample button that shows the thick focus ring when you Tab to it), so both can be seen without DevTools.
**Manual test cases:** visit `/settings`, confirm primary and More groups; change one control in each of the 7 sections and confirm it applies and persists; confirm the Accessibility section still shows all 5 toggles.

### HDR-1 — Header chrome: search entry, theme dropdown, richer user menu
**Components:** [React] · **Depends on:** `UI-1`; the search behaviour itself is `N1-1` · **Status:** ⬜ Ready. **Design reference:** the prototype header.

**Real evidence:** `components/NotificationsBell` already has an unread badge, "Mark all read" and clear-all (`useNotificationsInbox`); `components/UserMenu` shows name, avatar, goal line and a **Settings** link only; `components/ThemeToggle` is a **3-mode cycle** (light → dark → comfort) that announces the change.

**Scope:** (1) a header search field/button showing a `Ctrl K` hint (opens `N1-1`'s palette once it exists; until then it focuses the Notes search); (2) the prototype's **theme dropdown** — selecting a theme directly is an approved replacement for the cycle button; keep the announcement and any existing keyboard shortcut; (3) `UserMenu` gains **Profile & Goals** (→ Settings → Profile), **Appearance & Themes** (→ Settings → Appearance) and **Keyboard Shortcuts** (open the existing `KeyboardShortcutsPanel`; if your tree already has `requestOpenShortcutsPanel()` from `P0-9b`, use it); (4) the bell is restyled, its behaviour unchanged; (5) **floating chrome (from your Quiz-page screenshot, 2026-11-14):** the Quiz page shows a cluster of floating buttons top-right (bell, user menu, settings gear, an eye button) plus the sticky-note button bottom-right; the prototype has no such cluster — its header carries them. Decide here which move into the header. Recommended: bell, user menu and settings into the header; the eye button (**confirm what it controls**) stays with the page feature it belongs to; the sticky note stays floating (decision `D4`).
**Done when:** [ ] theme can be chosen directly and the change is announced; [ ] each new menu item lands on its target; [ ] the bell's unread, mark-all-read and clear-all still work; [ ] existing header tests pass.
**Manual test cases:** pick each theme from the dropdown; open the user menu and use each entry; trigger a notification and confirm the badge and mark-all-read; tab through the header.

### QZ-1 — Quiz Timed Mode (new feature from the prototype)
**Components:** [React] · **Depends on:** `UI-1` · **Status:** ⬜ Ready. **Decision 2026-11-03: the clock keeps running when the tab is hidden, the window loses focus or the browser is closed — a timed attempt behaves like an exam.** **Design reference:** `view-quiz-player` (Study Mode | Timed Mode toggle, countdown, Exit Quiz).

**Real evidence, 2026-10-05 upload:** `pages/Quiz/useQuizEngine.ts` owns an **elapsed** timer (`timerStartedRef`), save/resume and scoring; progress is stored as `quiz_progress_<file>` and finished attempts in the capped history (`AttemptHistory`, `quiz_history_<id>`); `quiz-index.json` entries carry `estimatedMinutes` and `questionCount`. There is no countdown or time limit today. Study Mode and the elapsed timer must not change.

**Builder requirements (the decision, verbatim in intent):**
1. **Absolute deadline.** On starting a timed attempt compute `deadlineAt = Date.now() + limitMs` once and store it. Remaining time is always `deadlineAt - Date.now()`, recomputed on every tick — never a counter that decrements only while the tab is active.
2. **Tab, focus and window changes do nothing.** Switching tabs, minimising, or losing focus must not pause, reset or stretch the timer. Do not use `visibilitychange` or `blur` to stop it.
3. **Return shows the true remaining time.** When the learner comes back, the display immediately re-syncs from the deadline (also on `visibilitychange` → visible, because browsers throttle timers in hidden tabs).
4. **Expiry while hidden auto-submits.** If the deadline passes while the tab is hidden, the attempt is submitted automatically the moment the page next runs (and via a timer while visible): answered questions are scored, unanswered count as incorrect, the result is marked **expired**.
5. **Refresh keeps the timer.** The attempt, its `mode: 'timed'` and `deadlineAt` are saved in `quiz_progress_<file>` (optional fields, no version bump — the same approach `P0-3` used for `scrollY`) as answers are given and at start. Reloading an active attempt restores it with the true remaining time.
6. **Warnings at 5 minutes and 1 minute** remaining: a visible banner/toast **and** an announcement through the existing live region (`useLiveRegion`) so it is not colour- or sight-dependent. If the limit is already ≤ a threshold when the attempt starts, that warning is skipped (a 2-minute quiz gets only the 1-minute warning). Each warning fires once per attempt, including after a refresh.
7. **The timer is visible for the whole attempt** — fixed in the quiz header so it stays on screen while the question list scrolls; it also reads out sensibly to a screen reader (not announced every second).

**Closed-browser case (important):** the deadline is real elapsed time. If the learner closes the browser and returns later, the stored `deadlineAt` is compared with the current time: if it has passed, the attempt is finished as **expired** on load — it is scored from the saved answers, recorded in history with an `expired` flag (optional field), and shown with a short "Time ran out" message; it is **never** resumable. If it has not passed, the attempt resumes with the true remaining time.

**Limit:** defaults to the quiz's `estimatedMinutes` from `quiz-index.json` (the real field, not an invented number); a quiz without it does not offer Timed Mode.

**Honest limitation:** this is a static, client-only app with no server, so a user who changes their device clock can still cheat the deadline. That is acceptable for a study aid and must not be presented as tamper-proof.

**Done when:**
- [ ] The Study | Timed toggle appears; Study Mode and the existing elapsed timer behave exactly as before (existing tests unchanged)
- [ ] The countdown derives from a stored absolute `deadlineAt` (code review: no decrementing counter state)
- [ ] Switching tabs for longer than the remaining time and returning auto-submits as expired
- [ ] Reloading mid-attempt keeps the correct remaining time; a reload after the deadline finishes the attempt as expired
- [ ] 5-minute and 1-minute warnings appear once each, visually and via the live region, and are skipped when not applicable
- [ ] The timer stays visible while scrolling; keyboard and screen-reader use works
- [ ] Fake-timer tests cover: start, tick, hidden-tab expiry, refresh restore, closed-browser expiry, warning thresholds (including a limit below 5 minutes), and a changed-answer-after-expiry rejection

**Manual test cases:**
1. Start a timed quiz with a short limit; switch to another tab until the deadline passes; return; confirm it auto-submitted, answered questions scored, the rest incorrect, marked expired.
2. Start a timed quiz, switch tabs for 30 seconds and return; confirm the clock shows 30 seconds less, not the same as before.
3. Reload mid-attempt; confirm the remaining time continues, not resets.
4. Start a timed quiz, close the browser, reopen after the deadline; confirm it shows "Time ran out", is scored from saved answers and appears in attempt history as expired. Repeat reopening *before* the deadline and confirm it resumes.
5. With a 6-minute limit confirm the 5-minute and 1-minute warnings appear once each; with a 2-minute limit confirm only the 1-minute warning.
6. Scroll a long question list; confirm the timer stays visible.
7. Run a Study Mode quiz; confirm nothing about it changed.

### NOTE-1 — "Take Related Quiz" panel on the Note page
**Components:** [React] [Python] · **Depends on:** `UI-1` · **Status:** ⬜ Ready. **Link method decided 2026-11-06 (`D18`): `related_quiz` frontmatter.** **Design reference:** `view-note-viewer`.

**Real evidence:** `pages/Note` has no related-quiz element. **The data does not link notes to quizzes:** `notes-index.json` entries have `category` (e.g. Containers, Searching, Sorting) while `quiz-index.json` entries have `topic`; in the uploaded data the two sets of names do not overlap, so matching by name would show nothing.
**Scope (decided, `D18`):** an explicit link — the note's markdown frontmatter names a quiz (`related_quiz: <quiz file>`); the generator writes `relatedQuiz` into `notes-index.json` (Python change plus tests, and one line in the authoring instructions); the panel renders at the end of the note only when the field exists **and** resolves in `quiz-index.json`, and is silently absent otherwise.
**Done when:** [ ] a note with a valid `related_quiz` shows the panel linking to `/quiz/<id>`; [ ] a note without one, or with an unknown quiz id, shows nothing; [ ] generator tests cover present, absent and unknown values; [ ] the instructions file documents the field.
**Manual test cases:** add the field to one note, regenerate, open it, click the panel; remove it, regenerate, confirm the panel is gone; set a bogus id and confirm no panel and no error.

### GH-1 — Games Hub page (design from the prototype)
**Components:** [React] · **Depends on:** `G0-1` (registry and `game_progress_<gameId>`), `DATA-1` (approved content) · **Status:** ⬜ Ready in order, but **cannot start until `G0-1` exists** — until then the sidebar item is a Soon item (`NAV-2`).
**Design reference:** `view-games-hub` — featured game, game groups, **Recently Played**, **Unexplored Mini-Games**, a difficulty indicator, a sort control, and a completion screen ("Challenge Complete!"); game 7 is the Architecture Puzzle, matching `G1-7`.
**Scope:** `/games` reads the games registry; *Recently Played* uses `lastPlayedAt` and *Unexplored* uses `attempts === 0` from `game_progress_<gameId>`; each game opens its own route through `GameShell`. **Decided (`D14`): no points or total in v1** — the hub shows each game's best score, completed state and last played.
**Done when:** [ ] hub lists every registered game; [ ] Recently Played and Unexplored are correct for a fixture progress set; [ ] only `approved` records ever reach a game.
**Manual test cases:** with no progress all games are Unexplored; play one and confirm it moves to Recently Played.

---

## Sequence

**Superseded 2026-11-06 — see `ticket-queue.md`** (same folder). It holds the single ordered queue for every open ticket, the six-step approach each ticket follows, the calls to make once (with recommended defaults), the parallel lanes, and the parked tickets with reasons.
