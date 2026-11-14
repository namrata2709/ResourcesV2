# Notebook Buddy — Chat Handoff

## Role
Planner. Own `sprint-tickets.md`, `sprint-tickets-tracks-PREB.md`, `CHANGELOG.md`, `PROJECT.md`. Not a one-off Q&A — the ongoing maintainer of these four documents across sessions.

## Core discipline
- Verify every claim against real uploaded source. Never trust a ticket's own description, a code comment, or a prior session's summary without checking. This project has repeatedly found comments/tickets claiming a feature exists when a direct grep proves it doesn't (found 4×: T1-5's MCQ comment, a stray "T3-7c" comment, P1-1's `blockId` claim, `a11y.ts`'s `prefers-reduced-motion` claim).
- Edit ticket files directly when scope changes — never just describe changes in chat.
- Flag ambiguity/conflicts explicitly. Don't silently pick a path on a real product decision (e.g. the `R2-1` sidebar reversal was asked, not assumed).
- Keep tickets lean, current-scope-only. History/reasoning goes in `CHANGELOG.md`.
- When ticket-body text and a status-table summary can drift apart (found 2×: `B-6`, `P0-8`), watch for it — fix both together, not just whichever you're looking at.
- After real work: update tickets + `CHANGELOG.md` + re-present files, every time.
- A recurring real bug pattern in this codebase, found 3× independently (`P0-2` accent/radius, `P0-9`'s 5 accessibility toggles, `reducedMotion`'s OS fallback): a Context/state layer is built and correctly persists to `localStorage`, but nothing downstream (CSS, a component) ever consumes it. Worth grep-checking both ends — the write side AND a real consumer — before marking anything "done."

## Doc structure (reorganized 2026-09-22)

```
docs/
  PROJECT.md
  HANDOFF.md
  CHANGELOG.md
  Brand_Guide.md
  icon-inventory.md
  manual-test-case-log.xlsx
  sprint-tickets/
    sprint-tickets.md
    sprint-tickets-tracks-PREB.md
  page-inventories/
    dashboard.md            (formerly DASHBOARD-INVENTORY.md — first of a
                              per-page series; settings.md, linktree.md,
                              etc. land here as each page goes through
                              the inventory step)
  archive/
    consistency-and-tech-roadmap.md
    audit-findings.md
    log-analysis.md
    sprint-tickets-R3-1-scoping.md   (added this pass — R3-1a/b/c mostly
                                       shipped or resolved; the one live
                                       thread, SHARED-4's spec, now carries
                                       a pointer back into this file)
```

**Removed outright (superseded, no unique remaining info):**
- `PROJECT_STATE.md` — fully superseded by `PROJECT.md`; was describing a
  since-completed stage of the React port.
- `sprint-tickets-feature-audit.md` — one-time gap audit, fully folded
  into `sprint-tickets.md`/`-PREB.md` already.

## Docs to attach, by situation

**Always useful, attach every session:**
- `PROJECT.md` — architecture/scope/requirements reference (refresh only when the project's shape changes, not every session)
- `sprint-tickets/sprint-tickets.md` — main ticket tracker (T/NAV/DX tracks + status)
- `sprint-tickets/sprint-tickets-tracks-PREB.md` — P/E/R/B/G/SHARED/DASH/S/V/N/ST tracks
- `CHANGELOG.md` — decision/verification history

**Attach when doing any verification or build work:**
- `python.zip` — the Python content pipeline (`generate_notes.py`, `dashboard.py`, etc.)
- `web.zip` — the React app; unpacks to `merged/` (this is the real repo's `web/` subtree; `.github/` is shared at the true monorepo root alongside `python/`/`web/`/`src/`, not per-subfolder — don't re-derive the "two checkouts merging" theory, it was wrong and corrected)

**Attach only when working in that specific area:**
- `src.zip` — the frozen vanilla site. **Frozen since 2026-08-13, no further edits** except the one exercised exception (`T1-4`'s CSS). Needed as a porting/removal reference for `T6-1` and for `NAV-1`'s `Breadcrumb` removal (6 pages currently use it: Note, NotesIndex, QuizIndex, Gallery, SearchMyNotes, Slides).
- `instructions.zip` (`aws-standard-instructions.md`, `dsa-instructions.md`, `video-slides-instructions.md`) — content-authoring specs, needed for `T5-2`-adjacent Python/content work.
- `manual-test-case-log.xlsx` — needed for `Track M` (test log maintenance) work only.
- `icon-inventory.md`, `ASSET-TODO.md` — needed for Track R (design/brand) work only.
- `aws-knowledge-json.zip` — the real 28,292-record dataset for `DATA-1`/Track G. Needed for any Games work.
- Design mockup images (Dashboard/Settings/etc.) — needed when doing page-by-page inventory or reconciling design against ticket scope.

**Historical, rarely need re-attaching (already fully mined into the docs above, now in `archive/`):** `consistency-and-tech-roadmap.md` (source of Track G, most Epics), `audit-findings.md`, `log-analysis.md`, `sprint-tickets-R3-1-scoping.md` (R3-1a/b/c shipped or resolved; `SHARED-4` in `sprint-tickets-tracks-PREB.md` points back here for the one still-live detail).

## Current architecture (see `PROJECT.md` for full detail)
Static React (Vite) app + Python content-generation pipeline, no backend, `localStorage`-only state. One monorepo: `.github/`, `python/`, `web/`, `src/` as top-level siblings. Vanilla (`src/`) is frozen, slated for deletion via `T6-1`, held until Track R's design-independent work settles.

## Real decisions on record (don't re-litigate without a new reason)
- Vanilla frozen (2026-08-13), one exception exercised (`T1-4`).
- `B-2`: in-app-only notifications, no push/email.
- `R2-1` **reopened and reversed** (2026-08-19): persistent sidebar (web) + icon rail (tablet) + bottom tab bar (app) adopted; `Breadcrumb` being removed app-wide. Tracked as `NAV-1`. This supersedes `R2-1`'s original 2026-08-13 "breadcrumb-only" closure — both decisions are real and dated, the newer one wins.
- `T6-1` sequenced *inside* Track R (after vanilla-independent design work, before the vanilla-dependent tail `R7-1`→`R5-1`/`B-5`), not "after all of Track R" — that framing was a self-created circular dependency, fixed.
- Process going forward: **page-by-page**, not whole-app. Per page: inventory (React + Python/JSON + background/invisible mechanisms) → hand to designer → design lands (web + app) → write that page's track + shared-resource contributions → subdivide into tickets. Order given: Dashboard → Settings → Linktree (small proof) → larger pages.

**Per-page status, current as of 2026-08-22:**

| Page | Inventory | Design (web+app) | Tracked |
|---|---|---|---|
| Dashboard | ✅ Done | ✅ Reviewed (light/dark/tablet/app + "More" screen) | ✅ `Track DASH` |
| Settings | ✅ Done | ⬜ Not yet designed | ✅ Bugs found+fixed (`P0-2`, `P0-9`); page-specific layout not yet redesigned |
| Linktree (`/namu` etc.) | ⬜ Not started | ⬜ Not started | Existing ticket only (`B-1`) — next in line, deliberately small, proves the process |
| Notes (`Note.tsx`) | ⬜ Not started | ⬜ Not started | Existing tickets only (`T5-3a`/`T5-3c-*`) |
| Quiz + QuizIndex | ⬜ Not started | ⬜ Not started | Existing tickets only (`T5-1`/`T3-4`) |
| NotesIndex | ⬜ Not started | ⬜ Not started | Existing ticket only (`T3-3`) |
| Gallery | ⬜ Not started | ⬜ Not started | Existing ticket only (`T4-1`) |
| Calendar | ⬜ Not started | ⬜ Not started | Existing ticket only (`R3-1c`) |
| Slides | ⬜ Not started | ⬜ Not started | Existing tickets only (`T5-4a`–`e`) |
| Export | ⬜ Not started | ⬜ Not started | Existing tickets only (`E0-1`/`E0-2`/`E1-1`) |
| SearchMyNotes | ⬜ Not started | ⬜ Not started | Existing ticket only (`P3-1`) |
| Contact, NotFound | ⬜ Not started | ⬜ Not started | Existing tickets only (`B-1`, `B-6`) |

**What "existing tickets only" means:** those pages are functionally built and ticketed for correctness/bugs, but haven't been through this project's *design* inventory pass — no fresh component list handed to a designer, no web+app mockup reviewed yet. `NAV-1`'s sidebar/rail/tab-bar will visually touch every one of them regardless of this per-page order, since it's shared app-shell chrome, not page-specific.

## Remaining work — ticket flow (full detail in `sprint-tickets.md`/`-PREB.md`)

**Phase 0 (no deps):** `DX-1`, `DX-2`, `DATA-1`, `B-2` Phase 2, `B-4c`, `B-9a`/`B-9b`, `N1-1`, close `R0-1`.

**Phase 1 (bug fixes, no deps, high value):** `P0-2`, `P0-9`, `P0-8`, `P0-5`, `T5-3c-6`, `DX-3`.

**Phase 2 (foundational, gates downstream work) — `NAV-1` and `SHARED-3` are parallel-safe with each other:**
```
NAV-1 → SHARED-2, SHARED-4
SHARED-3 → DASH-1 → DASH-2 (needs your product call, not build work)
```

**Phase 3 (held, explicit, don't start without a reason):** `Track S` (regression risk on working widgets), `Track ST` (no urgency), `T7-1`, `T6-1` (sequencing, see above).

**Phase 4 (gated behind Phase 2/3 clearing):**
```
V0-1 → V1-1, N1-2
G0-1 (blocked on DATA-1, not code) → G1-1 (build first) → G1-2…G1-10 (parallel-safe after)
```

## Open product questions, not yet decided (surface, don't guess)
- `DASH-2`: Quick Actions' "Revision" action currently links to `/quiz-index` — needs a real destination decision.
- `NAV-1`: `Note.tsx`'s removed breadcrumb carried a real subject/title trail the flat sidebar doesn't automatically replace — where does that info go?
- `SHARED-4`: `NotificationsBell`/`UserMenu` panel contents never fully spec'd.
- Whether `S0-1` (Activity Event Model) is worth its regression risk given `P2-1`/`P2-2`/`R3-1c` already work independently.
