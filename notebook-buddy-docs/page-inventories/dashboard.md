# Dashboard — Page Inventory (for design handoff)

**Purpose of this document:** every real, visible element on the Dashboard, its data source (React state, `localStorage`, or generated JSON), and every background/invisible mechanism (keyboard shortcuts, accessibility, analytics) that a designer needs to know about even though it's not a box on the screen. This is Phase 1 of the new page-by-page process: **analyze → this document → hand to designer → design → write Dashboard's track + shared-resource contributions → subdivide into tickets.**

Everything below is verified directly against real source (`web.zip`, 2026-08-18) — component names, file paths, and behavior are real, not inferred. Where something is a real open question rather than a settled fact, it's marked as such.

---

## 1. Visible components (top to bottom, left to right)

| # | Element | Real component | Data source | Interaction | Empty/loading state | Notes for designer |
|---|---|---|---|---|---|---|
| 1 | Logo (top-left) | `Logo` | Static asset | Click → likely home, not yet confirmed | N/A | Real horizontal variant only — see `PROJECT.md` §5 for what logo variants exist |
| 2 | Greeting ("Good afternoon, Namrata") | `Dashboard.tsx` → `buildGreetingText(profile)` | `ProfileContext` (`localStorage: userProfile`) | None | Falls back to a generic greeting if no profile set (`P0-1`'s own manual test covers this) | Time-of-day-aware ("Good afternoon"/"Good evening" — confirmed by the dark-mode design mockup) — confirm exact time boundaries if that matters to the design |
| 3 | Notifications bell (badge count) | `NotificationsBell` | `localStorage: notificationsInbox` | Click → opens inbox panel (real, not yet inventoried in detail — candidate for its own small page/panel spec) | Badge absent at 0 unread — not yet confirmed, worth checking | In-app only, no push/email (`B-2`'s real decision) |
| 4 | Wave/hand icon | `UserMenu` | `ProfileContext` | Click → opens a menu, real contents not yet inventoried | — | Name is generic ("UserMenu") — real menu contents worth a follow-up pass |
| 5 | Settings gear | `Icon name="settings"` linking to `/settings` | Static | Click → navigate to Settings | — | Real icon, PNG-backed per `R4-1`'s icon system |
| 6 | Theme toggle (sun/moon) | `ThemeToggle` | `localStorage: theme` | Click → cycles light/dark/comfort | — | 3 states, not 2 — confirm the icon design covers all 3, not just a binary sun/moon |
| 7 | Motivational banner | `MotivationalWidget` | `lib/motivationalMessages.ts`, real `freshDeck()` shuffle-without-repeat logic | None (display only) | Always has content — real fallback message exists | Rotates per visit; won't repeat back-to-back |
| 8 | **Quick Actions bar** — **missed entirely in the first pass of this inventory, corrected 2026-08-19** | `QuickActionsBar` | `lib/quickActions.ts`, `localStorage` (which actions + their order), configured via `P0-7` in Settings | Click → navigates to each action's real destination | Falls back to `DEFAULT_QUICK_ACTION_IDS` if the saved set would otherwise be empty | Real, exact catalog of 8 (confirmed against a real screenshot): **Search** → `/notes-index`, **Start Quiz** → `/quiz-index`, **Export** → `/export`, **Favorites** → `/gallery?favorites=true`, **Revision** → `/quiz-index` (real, but currently just the Quiz listing, not a dedicated Revision-scoped destination — worth a product call on whether that's the intended long-term behavior), **Gallery** → `/gallery`, **Continue Reading** → `/notes-index`, **My Notes** → `/search-my-notes`. Only a user-configured subset actually shows, in the order set in Settings (both real bugs affecting this — Dashboard not rendering it at all, and reorder not visually working in Settings — were confirmed and are being fixed by a developer as of this session, so the design should assume this bar works correctly, not design around either bug) |
| 9 | Study Statistics — 7 real stat cards | `StudyStatisticsWidget` | `lib/studyStats.ts`, computed from real activity data across several `localStorage` keys | None (display only) | Each stat has its own real empty-state subtext (e.g. "Start reading your first note") — not a generic blank | Exact 7, exact labels, confirmed against a real screenshot: Notes read, Quiz attempts, Average score, Highlights, Bookmarks, Study time, Day streak |
| 10 | Achievements — carousel, "(0/10)" count | `AchievementsWidget` | `lib/achievements.ts`, `localStorage: unlockedAchievements` | Carousel dots (paged); "View all" link | Renders every achievement including locked ones — deliberate "honest zero," not a growing list that starts unexplained | Real unlock-once guard exists underneath — not visible in UI, but relevant to how "newly unlocked" states should look if designed |
| 11 | Dashboard cards grid | `DashboardCardsGrid` | Generated `dashboard-cards.json` (Python: `generate_dashboard_cards.py`, reads `subjects.json`) | Drag-to-reorder (desktop) + explicit Move-earlier/Move-later buttons (keyboard/touch, always in DOM not hover-only) | N/A — cards are structural, not user data | Real cards today: AWS, DSA, Quiz, Calendar (all `type:"subject"` or `"standalone"`) |
| 12 | Reorder/edit pencil (floating, bottom-right) | Part of `DashboardCardsGrid` | `localStorage: dashboardCardOrder` | Click → toggle reorder mode | Corrupted/non-array order value falls back to default gracefully (confirmed) | — |
| 13 | Continue Reading (appears conditionally) | `ContinueReading` | `hooks/useReadingProgress.ts`, real `scrollY` restore | Click → deep-links to the exact note + scroll position | **Deliberately renders nothing (not an empty-state message) when there's no reading history** — confirmed in code comment | Ask design specifically whether "disappears entirely" or "shows an empty-state card" is the right call — current code picked disappear, worth revisiting with a designer |
| 14 | Footer | `Footer` (app-level, not Dashboard-specific) | Static | Links: license, commercial-licensing contact | — | Same footer on every page, not Dashboard-only — belongs in the shared-resources track, not this page's track |

**Real, confirmed gap, corrected 2026-08-19: there is no link to `/contact` anywhere in the app — not in Footer, not in Dashboard, not anywhere.** `Contact.tsx` (`B-1`, done) exists as a route and is fully built, but is currently only reachable by typing the URL directly. This isn't a Dashboard-specific miss — it's app-wide — but Dashboard is a reasonable place to fix it, e.g. as a `UserMenu` item, a Quick Action, or a sidebar/bottom-nav entry (the mobile "More" screen from the design mockup already has a real Contact link — worth mirroring that decision on web, not inventing a separate answer).

**Confirmed present, resolved:** `StickyNoteWidget` is mounted globally in `App.tsx` (not Dashboard-specific), so it's real on Dashboard too — just not visible in the reference screenshot, most likely because no sticky note had been added to that page yet (it's real per-page content, `P0-10`). Belongs in the shared-resources track, same as `Footer`.

---

## 2. Background / invisible functionality

Real, and just as important for a designer to know as the visible boxes — some of these directly affect what states need designing (e.g. a focus ring needs a design, a keyboard shortcut needs a discoverable hint).

| Mechanism | Real component/mechanism | What it does | Design implication |
|---|---|---|---|
| Keyboard shortcuts panel | `KeyboardShortcutsPanel`, mounted once globally in `App.tsx` | Press `?` on any page (including Dashboard) → modal listing every shortcut active on the *current* page, built from a live shared registry, not hardcoded per page | Needs its own modal design; content is dynamic, so design the *pattern* (a list of key + description pairs), not fixed content |
| Print handling | `PrintGuard`, wraps Dashboard specifically | Printing the Dashboard shows a "this page can't be printed directly" message instead of a raw card-grid dump | If redesigning Dashboard, the print-blocked message likely needs restyling too — small, easy to miss |
| Page analytics | `useAnalyticsPageView`, wired at app root | Fires a tracked `page_view` on every client-side navigation (Dashboard included) — real `gtag.js`, `send_page_view: false` with this hook compensating | No visual component, but confirms Dashboard visits are tracked like every other page — relevant if the redesign changes what counts as a "Dashboard visit" (e.g. tabs within Dashboard) |
| Accessibility — keyboard nav | Confirmed real: visible focus rings, full keyboard operability of the reorder controls (not just mouse-drag) | A design needs real focus-ring styling for every interactive Dashboard element, not just the reorder buttons |
| Accessibility — reduced motion / high contrast / dyslexia font | `A11yContext`, global, affects Dashboard like every page | These 3 toggles are real and shipped (`P0-9`) — the design should be checked against all 3, not just the default appearance |
| Theme + Appearance | `data-theme` (3 values) + `AppearanceContext` (accent/radius/density/animation toggle) | **Real, confirmed bug as of this session (`P0-2`):** accent color and radius are barely visible anywhere on Dashboard today — only `DashboardCardsGrid` reads `--card-radius`, nothing on Dashboard reads `--accent` at all | **Important for the designer to know directly:** if the redesign wants Accent color to actually mean something on this page, that's real new work (`P0-2`'s fix), not just "make sure the mockup uses the right purple" |
| Route-level meta | `PageMeta` | Sets page title/OG/canonical tags for `/` | Invisible, but relevant for social-share preview design if that's ever in scope |

---

## 3. Data layer summary (for the Python/JSON side of this page)

| What | Generated by | Consumed by |
|---|---|---|
| `dashboard-cards.json` | `generate_dashboard_cards.py`, reading `subjects.json` | `DashboardCardsGrid` |
| Study stats (notes/quiz/highlights/bookmarks/time/streak) | **Not Python-generated** — computed client-side in `lib/studyStats.ts` from real `localStorage` activity | `StudyStatisticsWidget` |
| Achievements | **Not Python-generated** — `lib/achievements.ts`, client-side threshold checks against the same activity data | `AchievementsWidget` |
| Motivational messages | **Not Python-generated** — a real, static message pool in `lib/motivationalMessages.ts` | `MotivationalWidget` |

**Real, worth noting directly:** almost nothing on Dashboard is Python-authored content — it's almost entirely React-computed from local activity data. The one real Python touchpoint is the cards themselves. This matters for the "React/Python/JSON per page" framing — Dashboard is React-and-`localStorage`-heavy, Python-light, unlike a page like Notes which is the reverse.

---

## 4. Real open questions surfaced by this inventory, not resolved here

1. **`ContinueReading`'s disappear-vs-empty-state choice** — the design mockup already resolved this (disappear, matching current code) — no longer open.
2. **`NotificationsBell` and `UserMenu`'s actual panel contents** — still not inventoried in detail, both real, worth their own small spec.
3. **`P0-2`'s accent/radius bug** — still real, actively being worked on by a developer as of this session (see `CHANGELOG.md`'s live-QA entries) — the design should assume it'll be fixed, not designed around.
4. **`/contact` has no link anywhere in the app** — new this pass, see §1. Needs a placement decision (UserMenu item, Quick Action, nav entry).
5. **Quick Actions' "Revision" destination currently just points at `/quiz-index`**, not a dedicated Revision-scoped page — worth a product call on whether that's correct long-term behavior or a placeholder.

## 5. Platform clarification, per direct correction

**"App" means the Android web/mobile experience, not a separate native app development effort.** The earlier "APP – Dashboard (Mobile)" and "APP – More" design mockups describe how this same React site should look and behave on Android (likely as an installed PWA, connecting to `P5-1`), not a second, separately-built application. Worth keeping this framing consistent going forward — "web" and "app" in this project's design docs mean two responsive presentations of the same product, not two products.

## 6. Future/planned items relevant to Dashboard, not just current state

Per the instruction to consider both before finalizing an inventory — real, ticketed, not-yet-built items that would eventually touch this page:

| Item | Ticket | Real status | Dashboard relevance |
|---|---|---|---|
| Performance Dashboard (user-facing) | `B-9a` | Not started | Could plausibly live on/near Dashboard once built — not yet decided |
| Games | Track G | Not started, real design proposed | A Games card would plausibly join `DashboardCardsGrid` alongside AWS/DSA/Quiz/Calendar |
| Offline Reading toggle | `P5-1` | 🟡 Reported live, not yet source-confirmed (see `CHANGELOG.md`) | If real, an offline-status indicator on Dashboard is a reasonable place for it, per the design guidance already recorded in `PROJECT.md` §6 |
| JSON Backup/Restore | `P4-1` | 🟡 Reported live, not yet source-confirmed | Settings-only by nature, unlikely to touch Dashboard directly |
| Sidebar/bottom-tab nav | `NAV-1` | Not started, real design exists | Directly touches Dashboard's own chrome — this is the biggest real pending change to this page specifically |

---

## 7. Suggested next step

Per the agreed process: this document → designer → once Dashboard's design lands, write `Track DASH` (or whatever naming convention you want to settle on) for Dashboard-specific tickets, plus contributions to one shared-resources track for anything here that's reused elsewhere (`Footer`, `KeyboardShortcutsPanel`, `PrintGuard`, `NotificationsBell`, `ThemeToggle`, `QuickActionsBar` — all confirmed used outside Dashboard too or clearly shareable, real shared-resource candidates already, not hypothetical).
