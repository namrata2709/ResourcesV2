# Notebook Buddy — Ticket Queue and Approach (2026-11-06)

**What this is.** The single ordered queue for every open ticket, plus the procedure each one follows. It replaces the short "Sequence" at the end of `sprint-tickets-tracks-PREB.md`. Ticket text stays the source of truth for *what* to build; this file says *in what order* and *how to approach it*.

**Standing rules (from your decisions).** Additive rule: keep every existing feature; add or restyle only; remove something only where a written decision says so. Verify against real source, not ticket text. Docs change in the same pass as code. Nothing is committed until you say so (`AUDIT-1`) — but see Batch 0.

**Sizes** are relative (S = a few files, M = one feature with tests, L = new subsystem or many files), not time estimates.

---

## 1. Why this order (the five principles)

1. **Version control before change.** `web/` and `notebook-buddy-docs/` have never been committed (`AUDIT-1`). Every change below needs a clean diff and a way back, so the baseline is committed first.
2. **Fix what is broken before restyling.** A restyle diff hides bugs. Broken or unreachable features (Daily Goal, slide links) are fixed first, while the screens still look the way the existing tests expect.
3. **Foundations before consumers.** Tokens → primitives → chrome → pages. Nothing consumes a token that does not exist yet.
4. **Small and reversible before large and risky.** Quick wins build confidence and a regression baseline; refactors that touch every storage key (`S0-1`, `ST-1`) stay held.
5. **Data before features.** A feature goes after the data it reads exists (Revision Center after bookmarks/highlights, Games after `DATA-1`).

---

## 2. How every ticket is approached (the same six steps)

| Step | What happens | Gate to pass |
|---|---|---|
| **1. Re-verify** | Read the ticket **and the real source it names** on the current tree; confirm the "Real evidence" lines are still true (docs drift — six ticket claims were wrong on the last check). Note any difference in the ticket before coding | Evidence confirmed or ticket corrected |
| **2. Baseline** | Run the suites and record the numbers: Python `pytest`, web `tsc -b`, `vitest`, `oxlint`. (Last recorded: Python 260 passed; vitest 119 files / 988 tests passed; `tsc -b` clean; oxlint 0 errors, 46 warnings.) | Baseline green before touching code |
| **3. Tests first** | Write the ticket's tests from its Done-when list (they should fail for the right reason), then implement the smallest change that passes them | New tests fail, then pass |
| **4. Additive check** | Existing tests pass **unchanged** (a test edited to make a change pass is a red flag: justify it in the ticket). Compare against the page's inventory: no feature lost | No existing test modified without a stated reason |
| **5. Manual cases** | Run the ticket's manual test cases in all three themes at desktop and mobile width | Each case recorded pass/fail |
| **6. Close in the same pass** | Update the ticket's status with the evidence, the inventory, the manual-test log (`Track M`) and `HANDOFF.md` in the same change | Docs match code |

**Handing a ticket to Gemini (or any builder):** give it the ticket text, the files the ticket names, the page inventory, and the prototype view id from the design map. Ask for the diff, the new tests, and the before/after suite counts. Reject the result if it edits existing tests without a reason, adds a dependency the ticket did not name, or removes a control the inventory lists.

---

## 3. Calls to make once (so builders are never blocked)

**Status 2026-11-06: all twelve are decided — the recommendations below were accepted as the decisions (`D9`–`D20` in the PREB file, plus two minor defaults `D21`, `D22`).** Twelve decisions sat between the queue and the code. Each is analysed below against what the real code and CI actually do (checked in the 2026-10-05 upload), with options, a recommendation, and what changes if you choose differently. **A call you leave open falls back to my recommendation**, so nothing stalls.

**Summary**

| # | Call | Decision (accepted) | Confidence | Unblocks |
|---|---|---|---|---|
| C1 | Caveat font and brand files | **Defer Caveat**; ship Poppins + Atkinson self-hosting; logos do not block the redesign | Medium | `R1-2` (Caveat part), `R1-1`, `R7-1`, `R5-1`, `B-5` |
| C2 | Study Plan day handling | **One persistent list**; show open tasks plus tasks done today | High | `DASH-5` |
| C3 | Study Loop "current stage" | **Three live stages**; "Repeat" becomes current only when nothing is left to do | High | `DASH-7`, `S3-1` |
| C4 | Slide-count source | **Add `slideCount` in the Python index generator** | Medium | catalogue half of `PRES-1` |
| C5 | Mobile filter pattern | **One bottom sheet** on all three pages | High | `LIST-1` |
| C6 | Games points | **No points in v1** | High | `G0-1`, `GH-1` |
| C7 | Quick Actions "Revision" target | **Keep `/quiz-index` until `/revision` exists** (my earlier URL suggestion was wrong, see below) | High | none |
| C8 | Make the Python check block merges | **Yes for pytest only**; keep visual and Lighthouse non-blocking (this changes my earlier default) | Medium | none |
| C9 | Performance page placement | **Park it** | High | `B-9a` |
| C10 | Note → quiz link | **Explicit `related_quiz` frontmatter** | High | `NOTE-1` |
| C11 | Weak Areas threshold | **Below 70% over each quiz's last 3 attempts** (the app's own pass mark) | High | `S2-1` |
| C12 | `R0-1` vanilla rename | **Close as obsolete** | High | none |

---

### C1 — Caveat font and brand files (`PROTO-9`)
**What the code shows.** The Brand Guide specifies Poppins only; the real app loads Poppins and Atkinson Hyperlegible and has no Caveat. Caveat's approved role (decision `D2`) is decorative accents only: the Dashboard motto, the Scratchpad heading, small tips. The lean upload contains no logo or mascot files; the real app already ships the horizontal and icon-only logos, so the missing pieces are only the `stacked` and `wordmark` variants (`R1-1`) and mascot art (`R5-1`/`R7-1`).
| Option | For | Against |
|---|---|---|
| **A. Approve Caveat** (Brand Guide addendum + load Caveat 600/700) | Matches the prototype's personality | A third font family for two or three decorative spots; a handwriting face is the least legible choice for users who need accessible text, so it must follow the Dyslexia toggle (fall back to Atkinson); more bytes on first load (measure in `R1-2`); the Brand Guide gains an exception |
| **B. Drop Caveat** | Brand Guide untouched; one fewer font | The motto and Scratchpad lose the handwritten feel |
| **C. Defer** | `R1-2` ships now without waiting; Caveat can be added later in one small change | The accents look plain until then |

**Decided (recommendation accepted): C.** The decorative gain is small, the accessibility cost is real, and nothing else depends on it. Ship `R1-2` with Poppins and Atkinson; if you later want Caveat, approve the Brand Guide line and add it in a follow-up that also makes the Dyslexia toggle override it. **Logo files:** do not block on them; supply the stacked/wordmark variants when you reach `R1-1`.
**If you choose A:** `R1-2` gains Caveat, a `.font-accent` utility, and a test that `data-dyslexia-font="on"` overrides it.

### C2 — Study Plan day handling (`DASH-5`)
**What the code shows.** Daily Goal resets every day (`lib/dailyGoal.ts` compares a stored date); the Calendar and streak read dated activity; the prototype shows "2 / 4 completed" and a "Clear completed" action.
| Option | For | Against |
|---|---|---|
| **A. One persistent list**; visible = open tasks + tasks completed today | Nothing is lost at midnight; one small data shape; "N / M" stays meaningful | Old completed tasks are hidden until cleared, so storage grows slowly |
| **B. List resets daily** (like Daily Goal) | Mirrors Daily Goal | Unfinished tasks vanish at midnight — the opposite of what a planner is for |
| **C. Dated tasks** (each has a day; a planner view per day) | The most powerful | A calendar-sized feature; duplicates the Calendar; far beyond the prototype |

**Decided (recommendation accepted): A.** It matches the prototype's behaviour exactly and costs one field (`doneAt`). Add dates later only if you find yourself planning ahead.
**If you choose C:** treat it as a separate ticket after `DASH-5`, and keep A's storage shape (`v:1`) so migration is additive.

### C3 — Study Loop "current stage" rule (`DASH-7`)
**What the code shows.** Inputs that exist today: open tasks (`DASH-5`), the Daily Goal state (`DASH-4`), bookmark/highlight counts, the streak. **Nothing records that a review happened** — Revision Mode is a view filter on the note page (`pages/Note/revisionFilter.ts`), so a "review done today" signal does not exist until `V1-1`.
| Option | For | Against |
|---|---|---|
| **A. Derived rule** from existing data | Nothing to store; always consistent with the rest of the Dashboard | "Repeat" cannot be derived honestly yet |
| **B. User picks the stage** | Simple | A manual toggle that drifts out of date |
| **C. Time of day** | Cheap | Arbitrary; says nothing about what the learner has done |

**Decided (recommendation accepted): A, with this exact rule:** no open task and no goal → **Plan**; open tasks or an incomplete goal → **Study**; everything done and revision items exist → **Review**; everything done and no revision items → **Repeat** (shows the streak). When `V1-1` lands, add "reviewed today" to move from Review to Repeat. Four fixture states in the ticket's tests.
**If you choose B:** store the chosen stage in the Study Loop key and drop the fixture tests; lose the "always accurate" property.

### C4 — Slide-count source (`PRES-1` part B)
**What the code shows.** Slide data is written by the pipeline (`write_slides_json` in `python/generate_notes.py`); the index generator (`generate_notes_index.py`) is a separate script that currently detects slide *type* from files and does not know the count. The React `notes-index.json` has no count.
| Option | For | Against |
|---|---|---|
| **A. Generator adds `slideCount`** | One cheap read at build time; the catalogue needs no extra requests | Python change, regenerate, tests; the index schema grows by one number |
| **B. Read each deck's `slides.json` when the catalogue opens** | No Python change | One request per deck on the catalogue page; slower as decks grow |
| **C. Omit the count in v1** | Zero work | A catalogue card with less information than the prototype shows |

**Decided (recommendation accepted): A** — it is the same kind of change as `PY-1`'s reading-time field, it keeps the page fast, and it fits Lane B. If you want the catalogue sooner, do **C** first and add the count when the generator change is ready.
**If you choose B:** cache results in memory per session and cap concurrent requests.

### C5 — Mobile filter pattern (`LIST-1`)
**What the code shows.** Filters apply **instantly** (no Apply button) on Notes and Gallery. Notes uses a right-side drawer with 4 filters (Session, Category, Type, Tags); Gallery uses a bottom sheet with 3 (Subject, Category, Tags); Quiz has one inline Topic select.
| Option | For | Against |
|---|---|---|
| **A. Bottom sheet everywhere** | Reachable with a thumb; one shared component; Gallery already has it | Notes' longer form needs a tall, scrollable sheet |
| **B. Right drawer everywhere** | Notes already has it; roomy | Harder to reach one-handed on phones |
| **C. Leave them different** | No work | Three different mental models for the same task |

**Decided (recommendation accepted): A**, with a maximum height of about 85% and the same instant-apply behaviour plus a visible count of active filters. Quiz adopts it only when `LIST-4` gives it a second filter.
**If you choose B:** rebuild Gallery's sheet as a drawer; the component work is the same size.

### C6 — Games points (`G0-1`, `GH-1`)
**What the code shows.** `G0-1`'s progress shape stores `{attempts, bestScore, lastPlayedAt, completed}` per game; the prototype hub shows points and a total. Games score differently (matching counts flips, ordering gives partial credit, decisions are right/wrong), so a total needs a normalisation rule that does not exist.
| Option | For | Against |
|---|---|---|
| **A. No points in v1** | Fewer decisions; honest per-game numbers (best score, completed count, last played) | The hub looks plainer than the prototype |
| **B. Per-game points, no total** | Some reward feeling | Still need a rule per game |
| **C. Cross-game total** | Strongest motivation | Needs a fairness model; easy to inflate; commits the data shape early |

**Decided (recommendation accepted): A.** After `G1-1` to `G1-3` are built you will know how scores behave; add B or C then, with the shape bumped through `v`.
**If you choose C:** define points per game in `G0-1` before building any game, and store them alongside `bestScore`.

### C7 — Quick Actions "Revision" target (`DASH-2`) — **correction to my earlier ticket text**
**What the code shows.** The Revision action currently points to `/quiz-index`. **My earlier suggestion — `/quiz-index?favorites=true` — would not work:** `QuizIndex` reads no URL parameters at all (the Favorites quick action works because **Gallery** reads `?favorites=true`). The tickets that repeated it (`DASH-2`) are corrected in this pass.
| Option | For | Against |
|---|---|---|
| **A. Keep `/quiz-index` until `V0-1` exists** | Works today; no change | The label "Revision" opens a generic list |
| **B. Add `?favorites=true` support to Quiz Index, then point there** | A narrower destination | A ticket (small) for an interim; "favorites" is not the same as "revision" |
| **C. Hide the action until `/revision` exists** | Never misleading | Removes a built action (breaks the additive rule) |

**Decided (recommendation accepted): A**, then repoint to `/revision` when `V0-1` ships (one line in `lib/quickActions.ts`). Do not spend a ticket on B.
**If you choose B:** read `favorites` in `QuizIndex` the way `Gallery.tsx` does, and add a test.

### C8 — Should the Python check block merges? (`T0-3`)
**What the code shows.** `deploy.yml` already runs `pytest python/tests/` on every push to `main`, **before** the build, so a failing Python test already blocks the *deploy* — but only after the code is on `main`. The PR-level run (`coverage.yml`) is `continue-on-error: true`. In `ci.yml`, **Lint + Vitest** and **Production build** block; JS coverage, **Visual regression** and **Lighthouse** do not. Whether a failing check can actually stop a merge also depends on a GitHub setting (branch protection) that is not visible in the repo.
| Option | For | Against |
|---|---|---|
| **A. Keep the Python PR check non-blocking** | No change | Failures surface only after merging |
| **B. Make the pytest step blocking** (keep the coverage summary non-blocking) | Catches regressions before `main`; the suite is deterministic (260 passed); valuable when an AI builder makes many changes | Needs branch protection to enforce it |
| **C. Block everything including visual and Lighthouse** | Maximum safety | **Visual regression will fail by design during the restyle (`UI-1`, `UI-2`)**; Lighthouse scores will swing |

**Decided (recommendation accepted): B**, and keep visual and Lighthouse non-blocking until after Batch 6 when the new look is the baseline. **This changes my earlier default** (non-blocking): checking `deploy.yml` showed the tests already gate deployment, so moving them to the PR is cheap and earlier.
**If you choose A:** nothing to do; accept that a broken test is found at deploy time.
**Related check for the first commit:** `deploy.yml` caches on `web/package-lock.json`; the lean upload contains no lockfile (the packager may exclude it). Confirm the lockfile is committed in Batch 0.3.

### C9 — Where a Performance page lives (`B-9a`)
**What the code shows.** No runtime performance measurement exists (no `PerformanceObserver` use); Lighthouse CI already measures from CI (`B-4c`). The approved navigation (`D1`) has no place for it, and the prototype does not show one.
| Option | For | Against |
|---|---|---|
| **A. Park it** | Nothing to design or maintain | No in-app view |
| **B. Settings → More Settings → "Diagnostics" row** | No navigation change | A page most learners will never open |
| **C. A System & Tools item** | Discoverable | Adds a nav item the design did not approve |

**Decided (recommendation accepted): A.** The audience is you, and Lighthouse CI plus the `B-9b` build report cover the developer need. If you want it later, take **B**.
**If you choose B:** build it as a Settings section through the existing registry (`SET-1`'s `group: 'more'`).

### C10 — Note → quiz link method (`NOTE-1`)
**What the code shows.** Notes have a `category` (Containers, Searching, Sorting, …) and quizzes a `topic` (Networking in the sample data); the names do not overlap, so name-matching would show nothing.
| Option | For | Against |
|---|---|---|
| **A. `related_quiz` frontmatter field** | Exact; the panel only appears when you choose; no false matches | One line of authoring per note that wants a link |
| **B. Auto-match by tag overlap** | No authoring | Guesses; wrong suggestions look like bugs |
| **C. A hand-maintained mapping file** | Central | Drifts from the notes; a second place to edit |
| **D. No panel** | Zero work | The prototype's feature is lost |

**Decided (recommendation accepted): A.** Optional by design, so no note is forced to carry it; the generator validates against `quiz-index.json` and drops unknown ids silently.
**If you choose C:** the generator reads the mapping at index time instead of frontmatter; the React side is identical.

### C11 — Weak Areas threshold (`S2-1`)
**What the code shows.** The app's own pass mark is **70%** (`PASS_THRESHOLD_PCT = 70` in `useQuizEngine.ts`, and "You need 70% to pass" in `ScoreSummary.tsx`). History keeps up to 20 attempts per quiz with `{score, total, pct}`.
| Option | For | Against |
|---|---|---|
| **A. Below 70% over each quiz's last 3 attempts, at least 2 attempts in the topic** | Consistent with what the app already calls "passing"; recent attempts, so improvement shows quickly | Needs three attempts to be fully meaningful |
| **B. 60%** | Fewer flags | Flags only badly weak topics; disagrees with the pass mark |
| **C. 80%** | Stricter | Flags topics the learner has actually passed |
| **D. All-time average** | Simple | Old failures keep a topic flagged after it is learned |

**Decided (recommendation accepted): A**, weighting by question count (total correct ÷ total asked), and never flagging a topic on one attempt.
**If you choose C:** change one constant; the ticket's fixtures update with it.

### C12 — `R0-1` vanilla rename pass
**What the code shows.** The ticket's whole Done-when is edits to vanilla `.html` pages; vanilla `src/` no longer exists in the tree (the deletion is intentional, `T6-1`), and the React `index.html` title is already "Notebook Buddy". A search finds one leftover mention of "Learning Dashboard" in `web/src`: a code comment recording the old name, which is history, not a user-facing string.
| Option | For | Against |
|---|---|---|
| **A. Close as obsolete** | Matches reality; one less open ticket | None |
| **B. Keep it open** | — | Its Done-when cannot be met |

**Decided (recommendation accepted): A**, with a one-line note ("vanilla removed; React uses the new name").

---

## 4. The queue

### Batch 0 — Gate: clean baseline (no feature work)
| # | Ticket | Size | Approach |
|---|---|---|---|
| 0.1 | **Verify the audits** (`AUDIT-2`, `-3`, `-4`, `-5`, `-6`) against a fresh `dashboard package` zip | S | Pass/fail per ticket from the files, not from status text |
| 0.2 | **`DX-5`** packaging fixes (self-inclusion, `DEFAULT_DEAD_CODE`, markdown trailing spaces, `*.egg-info`, label `DX-4`→`DX-5`) | S | Do first so every later zip is clean and small |
| 0.3 | **`AUDIT-1`** first commit, in chunks: (a) vanilla removal, (b) `web/`, (c) `notebook-buddy-docs/`, (d) Python and CI | S | Your decision to release; **recommended before any Batch 1+ change** |
| 0.4 | **`T6-1`** close-out: run the full regression pass its status says is missing, then mark done | S | Needs 0.3 |
| 0.5 | **`DX-1`** retitle to the recurring cadence; **`R0-1`** closed (C12, `D20`) | S | Docs only |

**Batch 0 status, 2026-11-13** (work done on the 2026-10-05 snapshot; apply it with `APPLY-INSTRUCTIONS.md`):
| # | Result |
|---|---|
| 0.1 | ✅ `AUDIT-2` to `AUDIT-6` done and tested on the snapshot; **re-run the checks on your tree** after applying |
| 0.2 | ✅ `DX-5` done (5 code bugs, 10 tests; `pytest` 270 passed) |
| 0.3 | ⬜ **Yours to run:** commit commands, in four chunks, are in `APPLY-INSTRUCTIONS.md` (Step 6). Pushing to `main` triggers the deploy workflow |
| 0.4 | 🟡 Close-out checklist written into `T6-1`; closes when you tick its lines 1, 3, 4, 5, 6 |
| 0.5 | ✅ `DX-1` retitled to the recurring cadence; `R0-1` closed |

### Batch 1 — Truth and safety net
| # | Ticket | Size | Approach |
|---|---|---|---|
| 1.1 | **Click-throughs**: `P0-2`, `P0-8`, `P0-9`, `P0-5` (Recently Viewed on the real UI), `NAV-1` (is `Breadcrumb` really gone?) | S | Manual only; record pass/fail in each ticket and flip 🟡 to ✅ with evidence |
| 1.2 | **`Track M` drift fixes** `M0-1`, `M0-2`, `M0-3`, `M0-4`, `M0-5` | S | Spreadsheet work, runs in parallel (Lane D) |
| 1.3 | **`T0-3`** make the pytest step blocking (C8, `D16`) | S | Remove `continue-on-error` on that step; you enable branch protection in GitHub |

### Batch 2 — Fix what is broken or unreachable (before any restyle)
| # | Ticket | Size | Approach |
|---|---|---|---|
| 2.1 | **`DASH-4`** Daily Goal: single ticker owner, MCQ wiring, mount the widget | M | Context refactor first (tests: one tick per minute with two consumers), then MCQ increment, then mount |
| 2.2 | **`PRES-1` part A**: route Presentation cards and the folder picker to `/slides/<folder>` | S | Fix both dead links; viewer untouched. The catalogue (part B) waits for Batch 4 |
| 2.3 | **`T5-3c-6`** Export highlights to `.txt` (unblocked since `P1-1` was fixed) | S | Small, independent; reuse `loadHighlights()` |
| 2.4 | **`T3-7c`** subject-registry description/education helpers | S | Python lane; independent |

### Batch 3 — Foundations for the new look
| # | Ticket | Size | Approach |
|---|---|---|---|
| 3.1 | **`UI-1`** design tokens (additive; keep Brand Guide values) | M | Contrast test per theme; visual suite should show no diff |
| 3.2 | **`SHARED-3`** Button / Card / EmptyState primitives | M | Built from the prototype's component panel; adopted by pages later |
| 3.3 | **`R1-2`** self-hosted fonts (Poppins + Atkinson only; Caveat deferred, `D9`) | M | Verify no Google request with the network off |
| 3.4 | **`SHARED-4`** bell/user-menu content spec | S | Folded into `HDR-1`; close it there |

### Batch 4 — Navigation and chrome
| # | Ticket | Size | Approach |
|---|---|---|---|
| 4.1 | **`NAV-1`** finish (remove `Breadcrumb`, keep `lib/navigation.ts` for active state) | M | One page per commit |
| 4.2 | **`NAV-2`** groups, holding page, `?type=lab` | M | Grouped model first, then holding page, then Labs param |
| 4.3 | **`HDR-1`** header search entry, theme dropdown, user menu | M | Keep announcements and the bell's behaviour |
| 4.4 | **`PRES-1` part B** Presentations catalogue (C4 decided: generator adds `slideCount`) | M | After 4.2 so the nav item exists |

### Batch 5 — Dashboard
| # | Ticket | Size | Approach |
|---|---|---|---|
| 5.1 | **`DASH-5`** Today's Study Plan (C2) | M | New key `studyPlanTasks`; Daily Goal untouched |
| 5.2 | **`DASH-6`** Scratchpad | S | Own key; Sticky Note untouched |
| 5.3 | **`DASH-1`** Dashboard rebuild per the "Today" composition, using `SHARED-3` | L | Restyle existing tiles; the 7 stat tiles already exist |
| 5.4 | **`DASH-2`** revision destination (C7) | S | Keep `/quiz-index` until `V0-1`; then one line in `lib/quickActions.ts` |

### Batch 6 — Page restyle and consistency
Order inside this batch follows traffic and risk: Settings → listing pages → reading pages → the rest.
| # | Ticket | Size | Approach |
|---|---|---|---|
| 6.1 | **`SET-1`** Settings restyle + More Settings | M | Optional `group` field on the registry; no control removed |
| 6.2 | **`LIST-1`** one list pattern (C5) | M | Gallery adopts shared bar, icons, persisted view modes |
| 6.3 | **`UI-2`** page by page: Notes → Quiz → Gallery → Note → Quiz player → Slides → Calendar → Search My Notes → Export → Contact → 404 → Link pages | L (12 small steps) | One page per change; existing tests unchanged; re-baseline visuals deliberately |
| 6.4 | **`QZ-1`** Timed Mode | M | Absolute deadline; fake-timer tests for hidden-tab and reload |
| 6.5 | **`NOTE-1`** related-quiz panel (C10) | M | Python lane first (frontmatter → index), then the panel |
| 6.6 | **`EXP-1`** part (a): link cards for existing exports | S | Part (b) formats only if you approve |

### Batch 7 — Plan pages and the cheap Study Loop pieces
| # | Ticket | Size | Approach |
|---|---|---|---|
| 7.1 | **`V0-1`** Revision Center | M | Wire existing Revision Mode and Revision Book |
| 7.2 | **`N1-2`** My Learning (gives `RecentlyViewed` a real home) | M | No new keys |
| 7.3 | **`DASH-7`** strip, then **`S3-1`** page (C3) | M | Strip first with Soon stages, page after 7.1 |
| 7.4 | **`N1-1`** Ctrl K palette | M | Reuses `useSearch()`; registers in the shortcuts panel |
| 7.5 | **`S2-1`** Weak Areas (C11), **`S1-2`** Weekly, **`S1-3`** Monthly | M each | They read data that already exists; no `S0-1` needed |

### Batch 8 — Later features (each needs its own go-ahead)
| # | Ticket | Notes |
|---|---|---|
| 8.1 | `LIST-2`, `LIST-3`, `LIST-4` | Per-row acceptance; Gallery focus trap is the one real accessibility fix — consider pulling it into Batch 6 |
| 8.2 | `V1-1` spaced repetition | After `V0-1`; keyed with anchor text (see the ticket's risk note) |
| 8.3 | `S2-2` confidence, then `S2-3` mastery | Start collecting data early; nothing back-fills |
| 8.4 | `B-2` phase 2 (notification events: achievements, streaks), `B-6` component 3 (404 auto-redirect) | Small, independent |
| 8.5 | `B-5` favicon (needs final logo), `R1-1` / `R7-1` / `R5-1` / `R4-1` assets | Blocked on C1 |
| 8.6 | `B-9b` build report | Small; `B-9a` parked (C9) |
| 8.7 | `Track M`: `M1-1`, `M1-2`, `M1-3`, `M2-1`, `M2-2`, `M3-1`, `M3-2`, `M3-3` | After `UI-2`, so new rows describe the final pages |
| 8.8 | `DX-2` storage table | Documentation; do it before adding more keys |

### Batch 9 — Games (long lane; content review starts early)
| # | Ticket | Notes |
|---|---|---|
| 9.0 | **`DATA-1`** review of the 28,292 records | **Start any time, in parallel (Lane C)** — it is the long pole and blocks shipping |
| 9.1 | `G0-1` shared infrastructure (C6) | Proof-of-concept with `G1-1` |
| 9.2 | `G1-1` Guess the Service, then `GH-1` hub | Sidebar item stays a Soon item until here |
| 9.3 | Simplest to hardest: `G1-4`, `G1-2`, `G1-5`, `G1-6`, `G1-3`, `G1-7`, `G1-9`, `G1-10`, `G1-8` | `G1-8` last (open-ended rubric question) |

### Parked (not scheduled, with the reason)
| Ticket | Why parked |
|---|---|
| `S0-1`, `S1-1` | `S0-1` rewires shipped stats/streak/calendar for no visible gain; `S1-1` needs its events. Revisit only after Batch 7 |
| `ST-1`, `ST-2` | `ST-1` would break backup and make every reader async; start `ST-2` only if you want it for hygiene |
| `DX-4` local admin UI | Scope undecided (Flask vs Vite page); not needed for the redesign |
| `T7-1` mobile audit | Deliberately deferred; the new mobile nav in Batch 4 changes what it would audit |
| `B-9a` | No approved place in the navigation (C9) |

---

### Covered by another ticket (no separate work)
| Ticket | Where it is handled |
|---|---|
| `P0-6` Daily Goal (reopened) | Closes with `DASH-4` (2.1) |
| `SHARED-1` sidebar | `NAV-1` (4.1) and `NAV-2` (4.2) |
| `SHARED-2` contact link | Already done (the sidebar links `/contact`) |
| `SHARED-5` Appearance tokens | `P0-2` click-through (1.1) and `UI-1` (3.1) |
| `SHARED-6` Accessibility tokens | `P0-9` click-through (1.1) |
| `DASH-3` future items | Tracking only; its items are `DASH-5`, `DASH-6`, `DASH-7` |
| `B-4` parent, `B-9c` | Children `B-4a`/`B-4b`/`B-4c` are done; `B-9c` is `B-4c` |

---

## 5. Parallel lanes (for one developer plus Gemini)

| Lane | Work | Why independent |
|---|---|---|
| **A — React app** | Batches 2–7 in order | One lane at a time through shared files (`App.tsx`, `index.css`, `storageKeys.ts`) to avoid merge conflicts |
| **B — Python pipeline** | `DX-5`, `T3-7c`, `PRES-1` `slideCount`, `NOTE-1` frontmatter, `LIST-4` difficulty | Touches `python/` only; the React side consumes the new index fields later |
| **C — Content** | `DATA-1` review | Pure review work; no code |
| **D — Docs and QA** | `Track M`, inventories, `HANDOFF.md`, click-throughs | Runs beside code but must finish in the same pass as each ticket |

**Shared-file warning:** `index.css`, `tailwind.config.js`, `App.tsx`, `lib/storageKeys.ts` and `SidebarNav.tsx` are touched by many tickets. Merge one ticket into them at a time.

---

## 6. Rhythm

- **One ticket per change**, one batch at a time; do not start Batch N+1 until Batch N's manual cases pass.
- After each batch: run the full suites, update the docs, take a lean snapshot with `dashboard package` and upload it, so statuses are re-checked against the real tree rather than remembered.
- If a ticket's evidence is no longer true when step 1 runs, fix the ticket first, then build.
