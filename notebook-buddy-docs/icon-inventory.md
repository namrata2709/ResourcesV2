# Icon Inventory — Custom Icon Replacement Project

Every icon, emoji glyph, and icon-shaped visual found across the 20 files
reviewed 2026-07-06, grouped by role. Purpose: a working checklist for
replacing generic emoji/Unicode icons with the custom mascot-based icon
set (see the Comfort/Light/Dark brand-kit reference — "LOON System
Preview" panel — for the target icon shapes: Home, Dashboard, Notes, Labs,
Quizzes, Books, Bookmarks, Search, Filter, More, Favorites, Clock, Eye,
Timer, Check Circle, In Progress, Completed, Share, Print, Download,
Calendar, Settings, User, Bell, Info, Warning, Help, Folder, File, Link,
Lite Mode, Study Mode, Gallery, Games, Progress, Continue Reading).

**Coverage note:** this pass covers every HTML file's static markup, every
CSS file's `content:` declarations, and the two icon-bearing JSON configs.
It does **not** yet cover icons rendered purely by JavaScript (e.g.
whatever `notes-fab.js`'s FAB menus, `quiz-toolbar.js`'s toolbar, or
`notes-index.js`'s card-rendering inject at runtime) — none of those `.js`
files were part of this upload batch. Treat this as Phase 1 of the
inventory; a Phase 2 pass is needed once the JS files are available.

---

## 1. Global chrome (every page)

| Icon | Where | Source | LOON equivalent |
|---|---|---|---|
| ☀️ / 🌙 / 👁️ | Theme toggle (light/dark/comfort) | `styles.css` + duplicated in `notes.css`, `.theme-icon::before` | — (custom mascot has no direct theme icon in the kit; consider a sun/moon/eye redraw in the mascot's line style) |
| 🔍 | Search input placeholder — appears in `404.html`, `notes-index.html`, `quiz-index.html`, `gallery.html` (as leading placeholder glyph, not an actual icon element) | inline in `placeholder="🔍 Search..."` text across 4 HTML files | **Search** |
| ⚙️ | "Filters" toggle button (`notes-index.html`'s `#filtersToggleBtn`) | inline HTML | **Filter** |
| ✕ | Close buttons — filter sheet close, modal close, lightbox close | `notes-index.html`, `gallery.html` | (generic close — not in LOON list; may stay a simple glyph/X) |

---

## 2. Filter / sort / quick-filter row (`notes-index.html`, `gallery.html`)

| Icon | Meaning | Files |
|---|---|---|
| ♡ | Favorites-only toggle (quick filter) | `notes-index.html`, `gallery.html` — `.favorites-filter-icon` |
| 🕐 | Recently Updated / Recently Added sort shortcut | both listing pages |
| 👁️ | Recently Viewed sort shortcut | both listing pages |
| ⏱️ | Reading Time sort shortcut | `notes-index.html` only |
| ✅ | Completed status filter | `notes-index.html` only |
| 🔵 | In Progress status filter | `notes-index.html` only |
| ⭕ | Not Started status filter | `notes-index.html` only |
| ↺ | "Clear all" quick filters | both listing pages |
| 🎲 | "Random — Surprise Me" sort option | both listing pages |
| 🔀 | "Shuffle Again" button (appears after random sort) | both listing pages |
| ▦ / ☰ / ▤ | Grid / List / Compact view-mode toggle (`notes-index.html`) | `notes-index.html` |
| ⊞ / ▦ / ☰ | Grid / Masonry / List view-mode toggle (`gallery.html`) — **note:** `gallery.html` uses ⊞ for grid where `notes-index.html` uses ▦ for the same concept — inconsistent glyph choice for "grid view" between the two pages, worth reconciling during the custom-icon pass | `gallery.html` |
| 📸 | "Screenshots" type filter | `gallery.html` only |
| 🖼️ | "Images" type filter (gallery) / Images Gallery breadcrumb (nav) | `gallery.html`, `navigation-url.json` |

**LOON equivalents available:** Favorites (heart), Clock, Eye, Timer,
Check Circle, In Progress, Completed — direct matches. Grid/List/Compact
view toggle and Random/Shuffle have no obvious LOON equivalent in the kit;
may need custom additions or can stay as simple line-icons rather than
mascot icons.

---

## 3. Favorites / heart icon (per-item, not the quick filter)

| Icon | Where | Notes |
|---|---|---|
| ♡ (outline) / ♥ (filled) | Note-page favorite button (`.note-favorite-btn`, injected by `notes-favorite.js` per prior session notes) | `notes.css` |
| ♡ / ♥ | Gallery image favorite button (`.image-favorite-btn`) and lightbox favorite button (`#favoriteBtn`) | `gallery.css`, `gallery.html` |
| (icon TBD — not emoji-based) | Quiz `.bookmark-btn` — styled via CSS border/background only, actual glyph likely set by JS (not confirmed, `quiz-toolbar.js` not uploaded) | `quiz.css` |

**LOON equivalent:** Favorites (heart) — direct match for the note/gallery
pattern. Quiz's bookmark icon should be resolved (see `audit-findings.md`
#3) before deciding whether it becomes the same heart icon or stays a
distinct "bookmark" glyph.

---

## 4. Gallery / Lightbox controls (`gallery.html`)

| Icon | Meaning |
|---|---|
| − / + | Zoom out / Zoom in |
| ⟲ | Reset zoom |
| ⓘ | Toggle metadata/info panel |
| ⛶ | Toggle fullscreen |
| ✕ | Close lightbox |
| ‹ / › | Previous / Next image |
| ⬇ | Download image |
| 📄 | "Open Note" (related note link) |
| 🖼️ | Image count stat icon |
| 📁 | Folder name stat icon |
| 📅 | Date info stat icon |

**LOON equivalents available:** Share/Download, Calendar, Folder, File —
direct matches for download/date/folder/note-link icons. Zoom/fullscreen/
info/close have no direct LOON equivalent in the kit as listed; likely
stay as simple symbol icons unless the mascot set is extended.

---

## 5. Empty / error / loading states

| Icon | Where |
|---|---|
| 🔍 | Gallery empty-state icon ("No images found") |
| ⚠️ / ⚠ | Gallery error state; note-page error box (`notes.css` `content: '⚠ '`) |
| 🔄 | Gallery "Retry" button |

**LOON equivalents available:** the brand kit's Empty State Illustrations
panel already has purpose-built states for exactly this (No Search
Results, No Favorites Yet, No Recent Activity, No Images Found, Offline,
Error Something went wrong) — this is the most direct, ready-to-use swap
in the whole inventory. Recommend prioritizing this set first.

---

## 6. Quiz-specific

| Icon | Where |
|---|---|
| 🖨️ | Standalone floating print button (`.print-button`/`.print-icon`) |
| ★ (referenced in CSS, exact usage not fully traced) | `quiz.css` — appears among quiz UI icons, likely a rating/difficulty star; not confirmed without `quiz-engine.js` |
| ✓ / ✗ | Quiz answer feedback (correct/incorrect) |

**LOON equivalent:** Print — direct match for the print button.

---

## 7. Print stylesheet icons (only visible in the print preview window)

| Icon | Where |
|---|---|
| ☐ | Checklist item placeholder (`notes-print.css`, replaces the real checkbox for paper) |
| ✓ | Various print confirmation marks |
| 🎬 | "Interactive animation" label prefix in DSA print view (`dsa-print.css`) |
| ↗ | Referenced alongside the animation print link (`dsa-print.css`) |

Low priority for the custom-icon project since these only render inside a
print window, never on-screen — but listed for completeness.

---

## 8. Category icons — `data/config/category-icons.json`

47 emoji icons mapping AWS/DSA categories to a glyph (📂 General, 📚
Fundamentals, ⚙️ Compute, 💾 Storage, 🗄️ Database, 🌐 Networking, 🔒
Security, 📊 Monitoring, 🛠️ Management, 📈 Analytics, 🤖 Machine
Learning/Automation, 📦 Containers, ⚡ Serverless, ✉️ Messaging, 🪪
Identity, 💰 Cost Management, 🧾 Billing, 🔁 DevOps, 🚚 Migration, 🔗
Integration, 📋 Governance, 📡 Content Delivery, 🧰 Developer Tools, 🎬
Media Services, 🖥️ Machine Images, 🖱️ End User Computing, plus 21 DSA
topic icons: 🔢 Arrays, 🔤 Strings, 🔗 Linked List, 🌳 Trees, 🕸️ Graphs,
↕️ Sorting, 🔍 Searching, 🧮 Dynamic Programming, 🔁 Recursion, 📚 Stack,
🚶 Queue, 🏔️ Heap, #️⃣ Hashing, 🎯 Greedy, 🧩 Backtracking, 🧷 Bit
Manipulation, ➗ Math, 👉 Two Pointers, 🪟 Sliding Window, ✂️ Divide and
Conquer, 🔲 Matrix, 🌲 Trie, 🧺 Sets).

This is the single largest icon set in the project and the one least
likely to map neatly onto the mascot kit (the brand kit's icon set is
UI-chrome-oriented — Home/Notes/Labs/Settings/etc. — not built for
per-topic subject-matter icons like "Dynamic Programming" or "VPC"). Two
options worth deciding between before starting this part of the
replacement:
1. Keep these as emoji (they're subject-matter icons, arguably fine to
   stay expressive/colorful rather than converting to the mascot's
   line-icon style), and scope the custom-icon project to **UI chrome
   only** (sections 1–7 above).
2. Commission a matching custom icon per category in the same visual
   style as the mascot kit — a much larger, separate design effort (47+
   icons) rather than a straightforward swap.

Recommend confirming which of these is intended before treating this
section as in-scope for the current replacement pass.

---

## 9. Navigation / breadcrumb icons — `data/config/navigation-url.json`

| Icon | Title |
|---|---|
| 🏠 | Home |
| 📝 | Quizzes |
| 📓 | Notes |
| ☁️ | AWS |
| 🧩 | DSA |
| 🖼️ | Images Gallery |

**LOON equivalents available:** Home, Quiz, Notes, Gallery — direct
matches in the brand kit's icon system. AWS (☁️) and DSA (🧩) are
subject-specific rather than UI-chrome, similar to the category-icons
question above — worth deciding whether they get bespoke mascot-styled
subject badges or stay as-is.

---

## 10. Dashboard header

| Icon | Where |
|---|---|
| 🎓 | `index.html` `<h1>` — "🎓 Learning Dashboard" |
| ✅ | `index.html` version-info "Status: ✅ Active" |
| 🔍 | `404.html` `<h1>` — "🔍 Page Not Found" |

**LOON equivalent:** the mascot's Logo Lockups panel (Icon Only / Stacked
/ Horizontal) is the direct replacement candidate for the 🎓 dashboard
header glyph — this is effectively the site's de facto logo position
today.

---

## Priority recommendation

If tackling this incrementally rather than all at once, the highest-value
first pass would be:
1. **Empty state illustrations** (section 5) — the brand kit has
   purpose-built matches ready to drop in.
2. **Logo/header** (section 10) — one glyph, high visibility, direct
   Logo Lockup match.
3. **Global chrome + per-item favorites** (sections 1–3) — theme toggle,
   search, filter, favorites heart — highest-frequency icons site-wide.
4. **Gallery/lightbox + quiz-specific** (sections 4, 6) — contained to one
   page each, lower total icon count.
5. **Category icons + subject badges** (sections 8–9) — largest count but
   lowest visual real estate per instance; needs the scope decision above
   before starting.

---

## Batch 2 additions (2026-07-06) — from `quiz-engine.js`, `quiz-toolbar.js`, `dashboard.js`, `dashboard-cards.json`, `notes-index.json`

### 11. Quiz per-question markers (distinct from Favorites — see `audit-findings.md` #3)

| Icon | Meaning |
|---|---|
| 🔖 | Bookmark this question (per-question button + toolbar filter button) |
| 🚩 | Flag as confusing (first flag state) |
| ⛳ | Flag as incorrect (second flag state, cycles from 🚩) |
| ✓ / ✗ | Correct/incorrect explanation markers (`renderExplanation`) |
| ↺ | "Reset answer" button (note: same ↺ glyph already used for "Clear all quick filters" on listing pages — reused for a different action; low risk since context makes the meaning clear, but worth knowing before a 1:1 icon swap) |

**LOON equivalent:** Bookmarks (direct match for 🔖), Check Circle (for ✓).
🚩/⛳ have no obvious LOON match — likely stays a custom pair or gets a
"flag" mascot icon commissioned.

### 12. Quiz toolbar/session icons

| Icon | Meaning |
|---|---|
| 🔀 | Shuffle questions (toolbar button — same glyph already used for "Shuffle Again" on listing pages, consistent reuse) |
| ⏱ | Elapsed-time timer display |
| ⏳ | Timed/countdown mode toggle + the countdown display itself (same glyph used for two related-but-distinct timer concepts within the same page) |
| 💾 | "Progress saved" resume banner icon |
| 📋 | "Copy summary" export button |
| ⬇️ | "Download PDF" export button |
| 📝 | Quiz title prefix (`📝 ${title}` in page title/breadcrumb) — same glyph as the Quiz dashboard card icon and the Quizzes breadcrumb icon in `navigation-url.json`, i.e. already consistent site-wide for "this is quiz content" |
| 📄 / ✅ / 💡 / 📚 | Print-format picker's four mode icons (Question paper / Answer key / Correct answers + reasons / Full answer guide) |

**LOON equivalent:** Timer (⏱/⏳ — direct match, though the kit's Timer
icon would need to cover two now-conflated uses), Share/Download (⬇️),
File (📄), Info-adjacent (💡 has no direct match).

### 13. Data-driven icon sources (JSON configs, not CSS/HTML)

Two more icon sources beyond `category-icons.json`/`navigation-url.json`
(batch 1):

- **`dashboard-cards.json`** — `icon` field per card: ☁️ AWS, 🧩 DSA, 📝
  Quiz. Already consistent with `navigation-url.json`'s AWS/DSA/Quizzes
  icons and the quiz title-prefix glyph above — no divergence found here.
- **`notes-index.json`** — each note's `files[]` array carries a
  per-file-type `icon`: 📄 Notes, 🧪 Lab, 🖥️ Presentation. This is a
  fourth independent icon source (alongside category, navigation, and
  dashboard-card icons) and the most directly swappable for the LOON
  kit's Notes/Labs icons, since `notes.html`/`lab.html`/`slides.html` map
  almost 1:1 onto the kit's Notes/Labs/(Slides has no direct match —
  closest is "Continue Reading" or a new Slides icon).

### 14. Confirmed default-icon fallback mismatch

`dashboard.js` falls back to `📘` when a card has no `icon`;
`category-icons.json`'s own `"default"` entry uses `📂` for the same
"nothing configured" case. Two different default glyphs for the same
concept — noted in `audit-findings.md` #10. Worth deciding on one
"unknown/default" icon (a candidate for the LOON kit's own default/misc
icon, if it has one) rather than two different emoji doing the same job
in two different files.

---

## Batch 3 additions (2026-07-06) — from `notes-fab.js`, `gallery.js`, `notes-accessibility.js`

### 15. `notes-fab.js` — Settings menu (bottom-left) and Tools menu (top-right)

Both menus reuse the same ☰ hamburger glyph for their trigger button —
two different buttons, same icon, disambiguated only by screen position
and `aria-label` ("Settings menu" vs. "Tools menu"). Worth flagging for
the custom-icon pass: if both become mascot icons, they'll need visually
distinct icons (e.g. a gear for Settings, a wrench/toolbox for Tools)
rather than both mapping to the same "hamburger" mascot glyph, or the
disambiguation problem just moves from "same emoji" to "same custom icon."

| Icon | Menu item |
|---|---|
| ☰ | Both menu trigger buttons (Settings + Tools) |
| 📚 | Exam Mode (Settings menu) — same glyph already used for Stack (DSA category icon) and Full Answer Guide (quiz print picker) — a glyph reused for a 4th unrelated purpose across the site |
| 🌙 | Theme (Settings menu) — same glyph as the dark-mode theme-toggle icon itself, a sensible intentional reuse |
| 🪶 | Lite Mode (Settings menu) — unique to this feature, no reuse elsewhere found |
| 🔍 | Search (Tools menu) — consistent with every other search icon site-wide |
| 🖨️ | Print (Tools menu) — consistent with quiz's print button and the print-picker title |
| 📑 | Bookmarks (Tools menu) — **note:** this is a *third* bookmark-adjacent glyph alongside quiz's 🔖 and notes/gallery's ♡/♥ Favorites. **Update, batch 4:** confirmed via `notes-reader.js` that this menu item opens a panel of ⭐/☆-marked sections within the current note — a *fourth* distinct icon (⭐/☆) for a fourth distinct "save/mark this" behavior (bookmark a section within one note, vs. bookmark a quiz question, vs. favorite a whole note/image). Full four-way breakdown in `audit-findings.md` Finding 19. |
| 📤 | Export Highlights (Tools menu, complete-notes only) |
| ⏱️ | Study Timer toggle (Tools menu) — same glyph as the quiz elapsed-timer icon (batch 2), consistent reuse for "a timer" generally |
| ⬆️ | Jump-to-top button |

**LOON equivalents available:** Settings (gear) for the Settings-menu
trigger, Help (for Lite Mode? no direct match), Bookmarks (direct match —
though see the three-way naming note above, worth resolving which of the
three "bookmark-ish" features actually gets the kit's one Bookmarks icon),
Timer, Print, Search — most of this menu maps cleanly.

### 16. `gallery.js` — one more lightbox metadata icon found

| Icon | Meaning |
|---|---|
| 📐 | Image resolution/dimensions stat (e.g. "📐 1920×1080") in the lightbox metadata panel — not previously catalogued in batch 1's gallery/lightbox section (section 4), since that pass only covered `gallery.html`'s static markup, and this stat row is rendered by `gallery.js` at runtime |

No direct LOON equivalent — likely stays a simple ruler/dimension glyph
unless the kit is extended.

---

## Batch 4 additions (2026-07-06) — from `notes-reader.js`

| Icon | Meaning |
|---|---|
| ⭐ / ☆ | Per-section bookmark toggle on note pages (filled star = bookmarked, outline star = not) — the fourth "save/mark this" icon site-wide; see Finding 19/updated Finding 17 in `audit-findings.md` and section 17 above for the full four-way comparison |

**LOON equivalent:** none of the kit's icon list is a star specifically —
Bookmarks (the kit's icon) is the closest conceptual match, but using it
here would collide visually with quiz's 🔖, which is arguably a stronger
candidate for the kit's actual Bookmarks icon given "bookmark" is quiz's
own word for its feature. Recommend keeping this one as a distinct
star-shaped icon (custom or kept as a simple glyph) precisely to preserve
the disambiguation the current icon mix provides.

### 17. Confirmed: four visually-similar but functionally distinct "bookmark-ish" features exist site-wide

Consolidating a thread that runs through batches 1–4: the site has
**four** separate "mark/save this for later" features, each with its own
icon and its own storage (updated batch 4 with `notes-reader.js`'s
confirmed section-bookmark system):

| Feature | Icon | Storage key | Scope |
|---|---|---|---|
| Favorites (notes) | ♡/♥ | `notesFavorites` | Whole notes, saved across sessions |
| Favorites (gallery) | ♡/♥ | `galleryFavorites` | Whole images, saved across sessions |
| Bookmarks (quiz) | 🔖 | `quiz_progress_<quizFile>` (embedded in per-quiz state) | Individual questions within one quiz attempt |
| Bookmarks (notes, in-page) | ⭐/☆ | `bookmarks-<pageId>` | Collapsible sections within one long note |

Four genuinely different concepts (save a whole item / mark a question /
jump to a spot in a page) that all reasonably get called "bookmark" or
"favorite" in casual English. Not proposing to merge them — they serve
different purposes — but flagging that the custom-icon project should
assign each a **visually distinct** icon rather than letting any of them
end up looking like variations on the same glyph, which would undo the
disambiguation the current mix of ♡/🔖/⭐ accidentally provides today.
