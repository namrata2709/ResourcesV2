# Notebook Buddy — Feature Inventory (baseline + additions) — Notes Index, Quiz Index, Gallery, with locked decisions

**Status 2026-11-02: the supplied prototype is the design reference; Track PROTO is closed and Track UX is released (see the PREB ticket file).** **Revision 2 — 2026-10-31 (corrected after the ticket pass: AWS/DSA are path routes, Export formats, Labs needs a `?type=lab` param).** Adds the locked decisions in §0 (sidebar, typography, Dashboard, Labs, Presentations, Coming Soon, offline). Nothing from revision 1 was removed; §2–§8 still apply unless §0 says otherwise.

**Purpose.** Rounds 2–3 of the prototype. Every element of the three listing pages as it exists today, every shared pattern they use, and every planned or deferred feature, so the prototype can show the *whole* end product. Anything not built yet is drawn in the prototype and shows **"Coming soon"** when clicked.

**Evidence.** Read directly from `web/src/pages/NotesIndex/NotesIndex.tsx`, `QuizIndex/QuizIndex.tsx`, `Gallery/Gallery.tsx` and the shared components they import (`ResourcesV2-lean.zip`, 2026-10 upload), plus the planned/deferred items in the source comments, `sprint-tickets*.md`, and `archive/consistency-and-tech-roadmap.md`. Not verified by running the app in a browser. Where a source comment and the rendered JSX could disagree, the JSX was used.

---

## 0. Locked decisions (2026-10-31)

### 0.0 The additive rule (overrides everything below)

The prototype = **every existing real feature** + **the new experiences from `notebook_buddy_interactive_dashboard_settings_prototype.html`**. That file is a *sample* of the desired Dashboard look and of added features, not the end product. It omits many built features (for example Gallery's different views). Nothing is deleted or replaced unless a decision below says so explicitly.

### 0.1 Decision log

| # | Decision | Supersedes |
|---|---|---|
| 1 | Sidebar keeps **Learn / Plan / Library**, plus a separate **System & Tools** area | The sample's "Learn & Plan / Explore & Practice / System & Tools" |
| 2 | Typography: **Poppins** primary, **Atkinson Hyperlegible** for accessibility, **Caveat** for accents; follow the Brand Guide | The Round 2 choice of "Inter" |
| 3 | **Daily Goal** (3 types) and **Today's Study Plan & Goals** (tasks) both stay, grouped in one Dashboard area | The idea that the Study Plan replaces Daily Goal |
| 4 | **Dashboard Scratchpad** and the **global floating Sticky Note** both stay | — |
| 5 | **Labs** = a note entry / content type in the Notes Library, not a separate page | The sample's standalone Labs page |
| 6 | **Presentations**: existing slide viewer is preserved; a catalogue page is an extra; every deck opens in the real viewer | — |
| 7 | **Coming Soon** holding page is for genuinely planned features only; existing features are never marked Coming Soon | — |
| 8 | Prototype is **self-contained and offline** (no CDN Tailwind, Lucide or Google Fonts); brand assets and local styling | The sample's CDN links |

### 0.2 Navigation (sidebar, desktop; mobile gets a bottom bar + "More" sheet with the same groups)

| Group | Item | Opens | Status |
|---|---|---|---|
| **Learn** | Home | Dashboard `/` | ✅ Built |
| | AWS | Notes Library scoped to AWS (`/notes-index/aws` — a path route; the old `?subject=` query is redirected) | ✅ Built |
| | DSA | Notes Library scoped to DSA (`/notes-index/dsa`) | ✅ Built |
| | Notes | Notes Library, all subjects (`/notes-index`) | ✅ Built |
| | Quiz | Quiz Index (`/quiz-index`) | ✅ Built |
| | Presentations | Presentations catalogue; each deck opens `/slides/<folder>` | 🆕 Catalogue is new; the viewer is ✅ Built (see §0.5) |
| **Plan** | Study Loop | Study Loop page (sample design) | 🆕 Planned, designed in the sample |
| | My Learning | My Learning hub (sample design) | 🔜 `N1-2` |
| | Revision Center | Revision Center (sample design); links to existing Revision Mode and Revision Book | 🔜 `V0-1` (the pieces `P3-2` and `E0-2` are ✅ Built) |
| | Calendar | Activity Calendar `/calendar` | ✅ Built |
| **Library** | Gallery | `/gallery` | ✅ Built |
| | Games | Games Hub (sample design) | 🔜 Track G (blocked on `DATA-1` review) |
| | Labs | **Shortcut** to Notes Library with Type = Lab (not a page, see §0.4) | ✅ Type filter exists; the `?type=lab` URL parameter is ⬜ (small addition in `NAV-2`) |
| | Search My Notes | `/search-my-notes` | ✅ Built. *Not in your latest Library list; kept here under the additive rule and the earlier decision that it sits in Library.* |
| **System & Tools** | Settings | `/settings` (all 7 sections) | ✅ Built |
| | Export | `/export` (Word `.docx` and EPUB across 4 scopes, plus Quiz Book and Revision Book; PowerPoint is exported from the Slides page, JSON backup from Settings) | ✅ Built |
| | Contact | `/contact` | ✅ Built |

**Header, kept from the real app and the sample:** global search with **Ctrl K** palette (🔜 `N1-1`), theme switcher (Comfort / Light / Dark ✅), notifications bell (✅ in-app inbox; richer events 🔜 `B-2` phase 2), user menu with profile, Settings and **Keyboard Shortcuts** (✅ panel exists, opens with Shift+?). Streak chip in the sidebar footer (✅ data exists).

### 0.3 Typography and brand (Brand Guide v1.0 is the source of truth)

| Role | Font | Where | Status |
|---|---|---|---|
| Primary | **Poppins** — headings Bold/ExtraBold, body/UI Regular/Medium, accent word SemiBold/Bold | Everything by default; the wordmark is Poppins only | ✅ In the Brand Guide and the real app |
| Accessibility | **Atkinson Hyperlegible** | The existing Dyslexia-friendly toggle, and as a Reading Preferences font option | ✅ Real app (the toggle is built); not named in the Brand Guide |
| Accent | **Caveat** (SemiBold/Bold) | Handwritten flourishes only: Dashboard motto line, Scratchpad heading, small "tip" callouts. Never in the logo/wordmark, never for body or UI text | 🆕 Not in the Brand Guide or the real app today |

Rules carried over from the Brand Guide: wordmark is "Notebook" `#0F1F4E` + "Buddy" gradient `#7C4DFF → #512DAB`, no letter-spacing changes, no other fonts in it. Palette: Buddy Purple `#7C4DFF` (primary accent), Dark Navy `#0F1F4E` (primary text), Paper Cream `#FFF9EE`, Tab Orange `#FFB347`, Text Gray `#64748B`. Themes: Light (bright), Dark (navy/near-black), Comfort (warm cream/tan, muted accents). The sample's `--bg-page`, `--bg-surface` and shadow/radius tokens are used as the *look*; colours must stay inside the Brand Guide palette.

### 0.4 Labs

Labs are `lab`-type files inside a note's folder, shown in the Notes Library with the 🧪 Lab badge and the **Type = Lab** filter (✅ built). There is **no standalone Labs page** in the real app. The sidebar "Labs" item is a shortcut that opens the Notes Library pre-filtered to Lab. The sample's separate Labs page and its "Interactive Step Guide" overlay are not treated as existing features; the step-by-step guide look can be shown on the Note page for lab entries as a 🆕 prototype addition.

### 0.5 Presentations

| Piece | Status |
|---|---|
| Slide viewer at `/slides/<folder>` (title/bullets, keyboard navigation, fullscreen chrome, speaker notes, engage blocks) | ✅ Built (`T5-4a`–`T5-4e`); preserved untouched |
| Notes Library type badge "Presentation" and the Type = Presentation filter | ✅ Built |
| Presentations **catalogue** page (deck cards: title, slide count, summary) | 🆕 Prototype addition |
| Opening a deck from the catalogue | Must go to the real viewer (`/slides/<folder>`), never an inline mini-viewer |
| Finding: from the Notes Library, a Presentation card's **Open** does not use the `/slides/<folder>` route yet. `getPrimaryFileRoute()` still returns nothing for slides ("pending T5-4" in its comment, though the route now exists). `/notes/<folder>` does redirect slides-only folders to the viewer. | ⚠️ Gap to fix when the prototype becomes real |

### 0.6 Dashboard composition (baseline + additions)

**Existing, stays:**

| Piece | Notes |
|---|---|
| Greeting from the profile (`buildGreetingText`) and logo | ✅ |
| Motivational line (rotating, no short-cycle repeats) | ✅ (`MotivationalWidget`); Caveat accent allowed here |
| Quick Actions bar (reorderable, saved order; Settings "Configure") | ✅ |
| Study Statistics — 7 tiles: Notes read, Quiz attempts, Average score, Highlights, Bookmarks, Study time, Day streak | ✅ (corrected 2026-11-02: the highlights, bookmarks and study-time tiles the sample shows already exist) |
| Continue Reading (scroll position restored) | ✅ plus the sample's empty-state design |
| Achievements (unlock once, timestamped) | ✅ |
| Dashboard Cards Grid (drag reorder + Move earlier/later buttons, Calendar card, corrupt-order fallback) | ✅ |
| **Daily Goal**: 3 types — **study time, chapters, MCQs**; progress bar; "Change goal"; resets on day rollover | ✅ component built. ⚠️ In the uploaded zip it is not mounted on the Dashboard (only referenced in comments), so the prototype shows it as a Dashboard card and the real Dashboard needs it re-mounted |
| **Global floating Sticky Note** (every page, scoped per page) | ✅ in `App.tsx` |

**New from the sample (🆕), added without removing anything:**

| Piece | Behaviour to keep from the sample |
|---|---|
| **Today's Study Plan & Goals** | Task list with add, tick complete, remove, clear completed; "N / M completed"; "Manage Planner" modal. Task-based; no goal types |
| **Study Loop** strip (Plan → Study → Review → Repeat) | Four stages with a "current stage" marker and one action each; links to the Study Loop page |
| **Scratchpad & Quick Note** card | Free-form draft with Clear; separate from the floating Sticky Note |

**Grouping (decision 3, proposed layout):** one "Today" area holds Daily Goal and Today's Study Plan side by side (stacked on mobile). Each keeps its own title, controls and storage. The Plan card's own "Daily Target" line is replaced by a link to the Daily Goal card, so two competing "targets" don't appear. **Sticky Note vs Scratchpad (decision 4):** Scratchpad is a Dashboard card for a long-lived draft; the Sticky Note is a floating per-page note. Labels stay different ("Scratchpad" / "Sticky note") so users don't mix them up.

### 0.7 Status legend and Coming Soon rules (replaces revision 1's)

| Tag | Meaning | Prototype behaviour |
|---|---|---|
| ✅ **Built** | Exists in the React app today | Works fully, restyled. **Never gets a Soon pill or a Coming Soon page** |
| 🆕 **Prototype addition** | Designed in the sample, not built, no ticket yet | Shown with sample data and a "Prototype" label |
| 🔜 **Ticketed / deferred** | Named in a ticket or code comment, not built | See rules below |
| 💡 **Design proposal** | New idea from this round, no ticket | See rules below |
| ⚠️ **Gap** | Built but incomplete or inconsistent | Shown as built; listed in the decision sheet |

**Coming Soon rules.**
1. **Controls** inside an existing page (a button, a view mode, a sort option) that are 🔜 or 💡: drawn in place with a small **Soon** pill; click or Enter shows a toast *"Coming soon — [feature]"*; no navigation, no state change; the tooltip shows the ticket ID (or "Proposed").
2. **Whole pages** that are planned but have a sample design (Study Loop, My Learning, Revision Center, Games Hub, Presentations catalogue): the sidebar item opens the designed page with sample data and a "Prototype — not built yet" banner.
3. **Whole pages** that are planned with no design yet: the sidebar item or button opens the **Coming Soon holding page** ("Something useful is on the way", with Back to Dashboard and Browse Notes).
4. An item marked ✅ is never routed to the holding page, including when its data is empty (it shows its own empty state).
5. Every such control carries `data-status="built|prototype|soon|proposed"` and `data-ref="<ticket>"`, so the decision sheet can be generated from the HTML.

### 0.8 Offline, self-contained build (decision 8)

| Requirement | How it will be met |
|---|---|
| No CDN Tailwind | Compile the needed Tailwind CSS locally and inline it in the HTML |
| No CDN Lucide | Inline the used icons as SVG symbols |
| No Google Fonts | Embed Poppins, Atkinson Hyperlegible and Caveat as base64 WOFF2 (Latin subset), from the open-licensed packages |
| Brand assets | Use the supplied logo/mascot files when available; the Brand Guide forbids regenerating them |

⚠️ **Open dependency — brand files.** The uploaded zip is a "lean" package, so it contains no logo or mascot images. Only `favicon.svg` and `icons.svg` are in `web/public`. The sample HTML files also contain no embedded images. I can't use "the supplied brand assets" until the logo files (horizontal per theme, icon-only, mascot, and any illustrations) are uploaded. Until then, the prototype uses a clearly marked placeholder: the wordmark rendered per the Brand Guide, and simple SVG stand-ins for the mascot.

⚠️ **Observation (not a prototype change).** The real app also loads Poppins and Atkinson from Google Fonts at runtime (`index.css`), so it is not fully offline-capable today. This is relevant to `P5-1` (Offline Mode) and could become a ticket.

---

## 1. Shared patterns (used by all three pages)

### 1.1 Page skeleton (top → bottom)

1. Page title + meta description (`PageMeta`). *(Breadcrumb is rendered on all three today; the sidebar in §0.2 replaces it in the prototype, per `NAV-1`.)*
2. Search box (full width, `Search notes…` / `Search quizzes…` / `Search images…`).
3. Quick Filters bar (Notes and Quiz use `QuickFiltersBar`; Gallery has its own Favorites button instead — see §6).
4. Filter row: `FilterGroup` selects with `SelectedChip` removable chips.
5. Sort + view-mode toggle (+ "Clear all" when any filter is active).
6. Results grid/list.
7. Pagination (Notes and Quiz only).
8. Empty state / error state text.

### 1.2 Shared components

| Component | What it does | Used by |
|---|---|---|
| `useSearch` (FlexSearch-backed hook) | Weighted fuzzy search over per-page field config | Notes, Quiz, Gallery, Search My Notes |
| `QuickFiltersBar` | Row of toggle buttons (`aria-pressed`), optional Favorites toggle, "Clear all" | Notes, Quiz |
| `FilterGroup` + `SelectedChip` | Labelled select + removable chip showing the chosen value | Notes, Quiz, Gallery |
| `ViewModeToggle` | Config-driven mode switch (Grid / List today) | Notes, Quiz, Gallery |
| `Pagination` | Page buttons | Notes, Quiz (9 per page each) |
| `CardQuickActions` | Icon-button row on a card (Open / Favorite / Copy link / Gallery) | Notes, Quiz, Gallery |
| `CompletionBadge` | Not Started (0%) · In Progress (1–94%) · Completed (≥95%) | Notes, Quiz |
| `ProgressBar` | Thin bar with `aria-label` | Notes, Quiz |
| `TypeBadges` | Icon badges per file type on a card | Notes |
| `useLiveRegion` | Screen-reader announcements (e.g. result counts, favorite toggled) | Notes, Quiz, Gallery |
| `PageMeta` | Title / description / OG tags per route | all |

### 1.3 Storage keys behind the three pages

| Data | Key | Notes |
|---|---|---|
| Notes favorites | `notesFavorites` | Independent of the other two |
| Quiz favorites | `quizFavorites` | Independent |
| Gallery favorites | `galleryFavorites` | Independent |
| Note reading progress | `readingProgress-folder-<folder>` | `percent` drives the card badge/bar |
| Quiz progress | `quiz_progress_<quizFile>` | Percent = answered ÷ `questionOrder.length`; timestamp from `savedAt` |
| Gallery view mode | `galleryView` | **Only Gallery persists its view mode** |

### 1.4 Behaviour that differs between pages (kept as-is in the prototype unless §6 says otherwise)

| Behaviour | Notes | Quiz | Gallery |
|---|---|---|---|
| Tag filter logic | Any selected tag matches (OR) | — (no tags) | All selected tags must match (AND) |
| Search vs sort | Relevance wins; Sort dropdown is inert while searching | Sort always applies | Sort applies |
| Pagination | 9 per page | 9 per page | None (all images; native lazy-loading) |
| Mobile filter UI | Right-side drawer (Session/Category/Type/Tags) | None seen in code (Topic select only) | Bottom sheet (Subject/Category/Tags) |
| View-mode memory | Not saved | Not saved | Saved (`galleryView`) |

---

## 2. Notes Index

### 2.1 Current ✅

**Header and search**
- Page title from the subject registry (`subjects.json`), driven by the path route `/notes-index/:subject` (the old `?subject=` query is redirected); generic "Notes" fallback if the subject is missing.
- Search box, weighted fields: title (4), tags (3), category (2), session (1).
- `?q=` pre-fills and runs a search on load (landing point for the Dashboard/404 search boxes).

**Quick Filters bar**
- ♥ Favorites (toggle) · Recently Updated · Reading Time · Completed · In Progress · Not Started · Clear all.

**Filters (mobile: slide-in drawer)**
- Session, Category, Type (Notes / Lab / Presentation), Tags (add several; each shows as a chip). Selected values show as removable chips.

**Sort (9 options)**
Date newest/oldest · Title A–Z/Z–A · Recently Updated ↑/↓ · Reading Time ↑/↓ · Random (+ **Shuffle Again**, seeded so order is stable between renders).

**View and paging**
- Grid / List toggle · 9 notes per page · result count announced to screen readers.

**Card anatomy**
1. Category icon (from `category-icons.json`).
2. Type badges (Notes 📄, Lab 🧪, Presentation 📊; link-type notes show their own icon).
3. Title.
4. Category chip (primary colour) and session badge (🗓️ Session).
5. 📅 last-updated date · ⏱️ N min read.
6. Completion badge + progress bar (from reading progress).
7. Quick actions: **Open**, **Favorite**, **Copy link**, **View in gallery** (only when the note has images).

**Open behaviour**
- Notes and labs open the internal route `/notes/<folder>`; **Open** shows a multi-file picker (FolderModal) listing every file in the note; external `link` files open the URL as-is; Presentation cards and the folder picker's slides entry point at a raw `slides.html` path instead of `/slides/<folder>` (⚠️ see §0.5; ticket `PRES-1`).
- Whole card is keyboard-activatable (Enter/Space).

**States:** loading, error ("Error Loading Notes"), empty ("No notes found.").

### 2.2 Future

| # | Feature | Status | Source | Prototype click |
|---|---|---|---|---|
| N-1 | **Compact** view mode (third option in the toggle) | 🔜 | Deferred in `NotesIndex.tsx` header | Coming soon |
| N-2 | **Recently Viewed** quick-sort (needs view tracking) | 🔜 | Deferred in `NotesIndex.tsx`; related `P0-5` | Coming soon |
| N-3 | Search suggestions dropdown with keyboard navigation | 🔜 | Deferred in `NotesIndex.tsx` | Coming soon |
| N-4 | Highlight matching words in results (mark.js-style) | 🔜 | Deferred in `NotesIndex.tsx` | Coming soon |
| N-5 | Remember filters between visits | 🔜 | Deferred in `NotesIndex.tsx` | Coming soon |
| N-6 | Search + sort together (relevance first, sort breaks ties) | 🔜 | Documented simplification in `NotesIndex.tsx` (needs scores from `useSearch`) | Sort stays inert; tooltip "Coming soon" |
| N-7 | Bookmarks / highlights count on each card | 💡 | Data exists (`T5-3c-7`, `P1-1`); not shown on cards | Coming soon |
| N-8 | "Due for revision" badge + Revision filter | 💡 | Depends on `V0-1` / `V1-1` | Coming soon |
| N-9 | Mastery / confidence chip | 💡 | Depends on `S2-2` / `S2-3` | Coming soon |
| N-10 | Select several notes → Export (Word / EPUB) | 💡 | Export scopes exist on `/export` (`E0-2`) | Coming soon |
| N-11 | "Continue reading" highlight on the note the user left mid-way | 💡 | `P0-3` data exists on Dashboard | Coming soon |
| N-12 | Command palette (Ctrl K) button in the search box | 🔜 | `N1-1` | Coming soon |

---

## 3. Quiz Index

### 3.1 Current ✅

**Header and search**
- Search box over quiz title and topic via `useSearch` (the same engine as Notes).

**Quick Filters bar**
- ♥ Favorites · Recently Attempted · Quickest · Completed · In Progress · Not Started · Clear all.

**Filters**
- Filter by Topic (select + removable chip). No Session/Category/Type/Tags.

**Sort (7 options)**
Title A–Z/Z–A · Topic A–Z/Z–A · Recently Attempted · Time ↑ (quickest first) · Time ↓ (longest first).

**View and paging**
- Grid / List · 9 quizzes per page.

**Card anatomy**
1. Title.
2. 📚 Topic.
3. ⏱️ *N questions · ~M min* (shown only when the generated index includes both numbers).
4. Completion badge + progress bar (answered ÷ total for the most recent attempt).
5. Quick actions: **Open**, **Favorite**, **Copy link** (no Gallery action, by design).

**Open behaviour:** card click, Open and Copy link all use the same route, `/quiz/<quizId>`.

**States:** loading, error ("Error Loading Quizzes"), empty ("No quizzes found matching your criteria.").

### 3.2 Future

| # | Feature | Status | Source | Prototype click |
|---|---|---|---|---|
| Q-1 | Best score / last score and attempt count on the card | 💡 | Not shown today; progress only | Coming soon |
| Q-2 | **Weak Areas** panel (topics below an accuracy threshold) | 🔜 | `S2-1`. *Note: an earlier decision dropped category/tag-based weak areas; `S2-1` is quiz-history-based and needs a fresh go/no-go.* | Coming soon |
| Q-3 | Confidence rating and question mastery shown per quiz | 🔜 | `S2-2`, `S2-3` | Coming soon |
| Q-4 | "Due for review" badge and filter (spaced repetition) | 🔜 | `V1-1` | Coming soon |
| Q-5 | Shareable fixed-order quiz link / QR (trivia style) | 🔜 | Planned on `T5-1` (seed param + two QR types) | Coming soon |
| Q-6 | Compact view mode | 💡 | Parity with Notes `N-1` | Coming soon |
| Q-7 | Recently Viewed quick-sort and remember filters | 💡 | Parity with Notes `N-2`, `N-5` | Coming soon |
| Q-8 | Difficulty chip and difficulty filter | 💡 | Games schema already carries `difficulty`; quizzes do not | Coming soon |
| Q-9 | Games entry ("AWS Decision Challenge", Match the Pair, etc.) | 🔜 | Track G (`G1-1`…`G1-10`), blocked on `DATA-1` review | Sidebar: Library → Games opens the designed Games Hub (§0.7 rule 2); the Quiz Index entry is a Soon control |
| Q-10 | Command palette button | 🔜 | `N1-1` | Coming soon |

---

## 4. Gallery

### 4.1 Current ✅

**Header and search**
- Search images (via `useSearch`).
- `?folder=<folder>` scopes the gallery to one note's images (used by the Notes card's "View in gallery").
- `?favorites=true` pre-selects the Favorites toggle (used by the Dashboard Quick Action).

**Filters (mobile: bottom sheet)**
- Subject, Category, Tags (all selected tags must match). Chips are removable; a count badge shows active filters on mobile.

**Other controls**
- ♥ Favorites toggle (a standalone button, not the shared Quick Filters bar) · Sort: Recently Added ↑/↓, Title A–Z/Z–A · Grid / List (saved between visits) · Clear all.

**Card anatomy**
1. Thumbnail (native lazy-loading).
2. Type badge: **📸 Screenshot** or **🖼️ Image** (detected from the file name).
3. Category chip.
4. Related-note link.
5. Quick actions: **Favorite**, **Copy link**. (The whole card opens the lightbox, so there is no Open action.)

**Lightbox**
- Previous / Next and a counter.
- Keys: **Esc** close · **← →** navigate · **+ / −** zoom · **0** reset · **F** favorite.
- Zoom 1× to 4×, click-to-zoom, reset.
- Metadata panel (Category, Last Updated, Related Note link).
- Download · Favorite.
- Touch: swipe left/right navigates (only at 1× zoom); two-finger pinch zooms.
- All actions announced via the live region.

**Copy link** creates `/gallery?folder=<folder>&image=<file>`; this URL does **not** yet open the image on load (see `G-9`).

**States:** loading, empty ("No images found.").

### 4.2 Future

| # | Feature | Status | Source | Prototype click |
|---|---|---|---|---|
| G-1 | **Masonry** view mode | 🔜 | Deferred in `Gallery.tsx` header | Coming soon |
| G-2 | Drag-to-pan when zoomed | 🔜 | Deferred in `Gallery.tsx` | Coming soon |
| G-3 | Double-tap to zoom (touch) | 🔜 | Deferred in `Gallery.tsx` | Coming soon |
| G-4 | Native **Fullscreen** toggle | 🔜 | Deferred in `Gallery.tsx` | Coming soon |
| G-5 | Real **Resolution / File size** in metadata + sort options | 🔜 | Deferred in `Gallery.tsx` (measured in the browser) | Coming soon |
| G-6 | **Recently Viewed** tracking + sort | 🔜 | Deferred in `Gallery.tsx` | Coming soon |
| G-7 | **Random** sort + reshuffle | 🔜 | Deferred in `Gallery.tsx` (Notes already has it) | Coming soon |
| G-8 | Screenshot / Image **type filter** chip | 🔜 | Deferred in `Gallery.tsx` (the card badge exists) | Coming soon |
| G-9 | Deep link: the Copy-link URL opens that image in the lightbox | 🔜 | Flagged as "next step" in `Gallery.tsx` | Coming soon |
| G-10 | Lightbox **focus trap** (Tab stays inside) | 🔜 | Deferred in `Gallery.tsx` (accessibility gap) | Not a visible control; listed in the decision sheet only |
| G-11 | Pagination or "load more" for large galleries | 💡 | No paging today | Coming soon |
| G-12 | Add the shared Quick Filters bar (replace the bespoke Favorites button) | 💡 | Consistency, see §6 | Shown in prototype as a restyle, no "Soon" |
| G-13 | Favorites collections / albums | 💡 | — | Coming soon |

---

## 5. Cross-page future features (one control, appears on all three pages)

| # | Feature | Status | Source | Prototype click |
|---|---|---|---|---|
| X-1 | Command palette (**Ctrl K**) | 🔜 | `N1-1` | Coming soon |
| X-2 | Unified progress rollup across notes, quizzes, games | 🔜 | Roadmap US-112 | Coming soon |
| X-3 | "My Learning" hub (Continue, Recent, Favorites, Bookmarks, Highlights) | 🔜 | `N1-2` | Plan → My Learning opens the designed page (§0.7 rule 2) |
| X-4 | Revision Center entry | 🔜 | `V0-1` | Plan → Revision Center opens the designed page (§0.7 rule 2) |
| X-5 | One shared Favorites view across Notes / Quiz / Gallery | 💡 | Three separate stores today (`DX-2` open question) | Coming soon |
| X-6 | Mascot illustrations in empty states | 🔜 | `R5-1` (needs `R7-1` assets) | Placeholder art, no "Soon" |
| X-7 | Notifications for new content / streaks | 🔜 | `B-2` phase 2 | Coming soon |

---

## 6. Inconsistencies to settle in the prototype (design decisions, not new features)

| # | Issue today | Proposed prototype choice (needs your OK) |
|---|---|---|
| D-1 | Gallery has its own Favorites button; Notes/Quiz use the shared Quick Filters bar | Use the shared bar on all three |
| D-2 | Gallery's Grid/List icons are text glyphs (▦ ☰); Notes/Quiz use Lucide icons | Lucide everywhere |
| D-3 | Only Gallery remembers its view mode | Remember it on all three |
| D-4 | Mobile filters: right drawer (Notes) vs bottom sheet (Gallery) vs none (Quiz) | One bottom sheet on all three |
| D-5 | Notes tags use OR, Gallery tags use AND | Keep each (they are different filters), but label it: "Any of" vs "All of" |
| D-6 | Gallery has no pagination; Notes/Quiz use 9 per page | Decide: paginate, or "load more" (see `G-11`) |
| D-7 | Notes shows session and type; Quiz shows only topic | Keep; Quiz card layout otherwise matches Notes |
| D-8 | Three separate favorites stores | Keep separate in the prototype; see `X-5` |

---

## 7. Decision-sheet seed (what the prototype will report)

| Group | Items |
|---|---|
| **Existing functionality (restyle only)** | §2.1, §3.1, §4.1 in full, plus the shared components in §1.2 |
| **Prototype-only behaviour** | Sample data for 🆕 and 💡 items, "Soon" pills, toasts, "Prototype" banners, placeholder brand art, the Presentations catalogue, Study Loop strip/page, Today's Study Plan, Scratchpad, Games Hub, My Learning, Revision Center pages |
| **Needs implementation (🔜)** | N-1…N-6, N-12; Q-2…Q-5, Q-9, Q-10; G-1…G-10; X-1…X-4, X-6, X-7 |
| **Gaps in built features (⚠️)** | Daily Goal not mounted on the Dashboard; Presentation cards not routed to `/slides/<folder>`; Gallery deep link; the Gallery focus trap (`G-10`) |
| **Needs a decision first (💡)** | N-7…N-11; Q-1, Q-6…Q-8; G-11, G-12 (a restyle, same as D-1), G-13; X-5; and D-1…D-8 |

**Count:** 29 🔜 items and 13 💡 items across the three pages and the shared list (42 in total, counting `G-10`, which has no visible control), plus 8 design decisions.

---

## 8. Open items

Answered in §0: sidebar, typography, Daily Goal, Sticky Notes, Labs, Presentations, Coming Soon, offline. Still open:

1. **Brand files:** please upload the logo (horizontal per theme, icon-only) and mascot/illustration files, or confirm placeholders are fine for the prototype.
2. **Caveat:** it is not in the Brand Guide. Approve adding one line to the Brand Guide ("Caveat: handwritten accent only, never in the wordmark"), or drop Caveat from the prototype.
3. **Search My Notes:** confirm it stays under Library (it was missing from your latest Library list).
4. **Weak Areas (`Q-2`):** keep as "Coming soon", or leave out given the earlier decision to drop category-based weak areas?
5. **Gallery pagination (`D-6`)** and **Favorites (`X-5`):** paginate or "load more"? Three separate stores, or a combined view as the target?
