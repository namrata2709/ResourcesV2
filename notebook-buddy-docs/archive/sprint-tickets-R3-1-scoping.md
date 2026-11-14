# R3-1 Scoping Output — Notifications Bell, User Avatar/Menu, Calendar, Study Mode

Companion to `sprint-tickets-tracks-PREB.md`'s `R3-1`. That ticket's own
"Done when" is satisfied by this document: each of the four net-new
mockup features below gets a real spec (data model, interactions,
done-when criteria) instead of being assumed buildable as-is.

**Caveat up front:** the actual brand mockups referenced by `R3-1`
weren't in the material available for this scoping pass — only the
ticket's own one-line description of each feature (Notifications bell,
user avatar/menu, Calendar page, Study Mode page) and the real,
already-built codebase. Everything below is scoped functionally against
what exists today (Settings' section-registry pattern, `lib/profile.ts`,
`lib/notifications.ts`'s toast system, `ThemeContext`/`AppearanceContext`,
`App.tsx`'s route table) and against the other tickets that touch
adjacent ground (P0-1, P2-1/2/3, P3-2, B-2). Anywhere the real mockup
would pin down something this doc leaves as a decision, that's called
out explicitly — treat those as open questions for whoever picks up the
resulting ticket, not settled design.

Per `R3-1`'s own instruction, these are numbered as children of `R3-1`
(`R3-1a`–`R3-1d`) rather than folded into the R-tier numbering directly,
so the lineage back to the scoping ticket that produced them is obvious.

---

## Ticket R3-1a — Notifications bell (in-app notification center)

Tier: R3 · Depends on: none to start (a static/empty-state version needs
nothing) · richer version depends on whichever of `P2-1`
(Study Statistics) / `P2-3` (Achievements) have landed, since those are
the natural first sources of real notification content · Blocks: none

**This is not the existing toast system — don't confuse the two.**
`lib/notifications.ts`'s `showNotification()` already exists and is
correct for what it does: ephemeral, auto-dismissing, bottom-corner
toasts for in-the-moment feedback (e.g. "Settings saved"). A **bell**
in a header implies the opposite shape: a **persistent, dismiss-on-read
list** the user can open on demand and that survives past the moment it
fired — an inbox, not a toast queue. Building the bell as a second
renderer on top of the existing toast store would be wrong; it needs
its own store with its own shape (read/unread state per item, no
auto-expiry).

**Open question the real mockup should answer, flagged rather than
guessed at:** what actually populates the bell? Two real candidates,
not mutually exclusive:
1. **In-app-generated events** — achievement unlocked (`P2-3`), daily
   goal completed (`P0-6`), streak milestone (`P2-2`). These require no
   new infrastructure — they're existing computed state, just given a
   persistent home instead of (or in addition to) a toast.
2. **`B-2`'s scoped-but-unbuilt reminder notifications** (daily quiz
   reminder, weekly study reminder, new content available) — those
   depend on `B-2` first choosing a real delivery mechanism (Push API +
   Service Worker, or an email service), which is still an open scoping
   question in that ticket. If the mockup's bell is meant to *also*
   surface those, this ticket has a real dependency on `B-2`'s
   mechanism decision that doesn't exist yet.

Recommendation: scope the first build to (1) only — it's buildable
today against real data with no cross-ticket blocking — and treat (2)
as an explicit extension once `B-2` resolves its own mechanism
question, rather than blocking this ticket on that decision.

**Data model**
- New `localStorage` key `notificationsInbox` — versioned envelope,
  matching every other key's convention (`PROJECT.md` §6.5-style):
  `{v:1, items: [{id, message, type, createdAt, read}]}`
- `type` reuses the existing `NotificationType` union
  (`info | success | warning | error`) from `lib/notifications.ts`
  rather than inventing a second taxonomy
- Cap stored items (e.g. most recent 50) so the list can't grow
  unbounded in localStorage

**Interactions**
- Bell icon in the header, alongside the existing gear (Settings) and
  theme toggle in `App.tsx`'s fixed top-right cluster
- Unread count badge on the bell (small number or dot); clears per-item
  as each is opened/read, not all-at-once unless the user explicitly
  clears all
- Click opens a dropdown/panel (not a route — same weight as the
  existing `KeyboardShortcutsPanel`, not a full page) listing items
  newest-first, each markable read individually and a "clear all"
  action
- Achievement/goal events write into `notificationsInbox` at the same
  point they currently would (or could) fire a toast — likely *both*:
  toast for the in-the-moment ping, inbox entry for "I missed it,
  where did it go"

**Files to modify**
- `web/src/lib/notificationsInbox.ts` (new) — plain store, same
  framework-agnostic + thin-hook shape as `lib/notifications.ts`
  (`subscribe`/`markRead`/`clearAll`, not a copy-paste of the toast
  module)
- `web/src/hooks/useNotificationsInbox.ts` (new)
- `web/src/components/NotificationsBell/` (new) — icon + badge +
  dropdown panel, mounted once in `App.tsx`'s header cluster
- Call sites in `P2-3` (achievement unlock) / `P0-6` (goal completion)
  add an inbox write alongside whatever toast/UI they already show —
  additive, not a change to those tickets' own behavior

**Done when**
- [ ] Bell shows an accurate unread count that updates in real time
- [ ] Opening the panel and reading an item clears its unread state,
      persists across reload
- [ ] At least one real event source (achievement unlock or daily goal
      completion) writes a real inbox entry, not placeholder copy
- [ ] Toast and inbox are confirmed to coexist correctly for the same
      event (both fire, neither breaks the other) if a call site is
      wired to do both

---

## Ticket R3-1b — User avatar/menu (header account menu)

Tier: R3 · Depends on: `P0-1` (Personal Profile) — this ticket is a
*consumer* of the profile data P0-1 already stores, not a new profile
system · Blocks: none

**Scoping note:** there's no authentication anywhere in this app —
everything is local-only, browser-scoped `localStorage`. So "user
avatar/menu" can't mean an account-switcher or sign-out control the way
it would on a site with real accounts. What it *can* meaningfully mean,
given what already exists: a clickable representation of the user's
chosen `P0-1` avatar/name in the header, opening a small menu of
shortcuts into the personalization surfaces that already exist
(Settings, Daily Goal progress, Achievements once `P2-3` lands) — a
convenience menu, not an account menu. If the real mockup shows
something that implies actual multi-user accounts, that's a materially
bigger feature than this scoping assumed and needs its own separate
ticket, not a variant of this one.

**Data model**
- No new storage — reads `getSavedProfile()` from `lib/profile.ts`
  directly (`name`, `avatar`). Nothing here should duplicate or shadow
  that key.

**Interactions**
- Header shows the user's `avatar` (emoji or built-in illustration, per
  `P0-1`'s existing shape) in the same fixed top-right cluster as the
  Settings gear / theme toggle / (`R3-1a`'s) bell
- Falls back to a generic default (not blank/broken) when no profile is
  set yet, same "sensible default" bar `P0-1` itself is held to
- Click opens a small dropdown: user's name/greeting at top, then links
  — Settings (`/settings`), and once they exist: Daily Goal progress
  summary (`P0-6`), Achievements (`P2-3`)
- No dropdown items should duplicate `P0-0`'s Settings page content
  wholesale — this menu is a set of *shortcuts into* existing pages, not
  a second copy of Settings' own panels

**Files to modify**
- `web/src/components/UserMenu/` (new) — avatar trigger + dropdown,
  reads `ProfileContext` (already exists, wraps `lib/profile.ts`) rather
  than calling `getSavedProfile()` directly, to stay consistent with how
  the rest of the app already consumes profile state
- `App.tsx` — add to the existing fixed header cluster

**Done when**
- [ ] Avatar reflects the real stored profile, with a working default
      when none is set
- [ ] Menu opens/closes correctly (click-outside and Escape both close
      it — match the existing `KeyboardShortcutsPanel`'s dismiss
      pattern rather than inventing a new one)
- [ ] Every link in the menu goes to a route that actually exists at
      build time — no dead links to not-yet-built pages (Achievements
      link ships only once `P2-3` is live, not before)

---

## Ticket R3-1c — Calendar page

Tier: R3 · Depends on: none to start · richer variants depend on
`P2-1`/`P2-2` (Study Statistics/Streak, for showing real past activity
on the calendar) and optionally `B-8` (Link pages, if instructor
"next live session" announcements should surface here too) · Blocks:
none

**Open question the real mockup should answer, flagged rather than
guessed at:** "Calendar" could mean two genuinely different things, and
nothing in the codebase today points at either:
1. **A personal study planner** — user creates their own entries
   ("finish Chapter 4 by Friday," "quiz retry Tuesday"), purely local
   data, no external source
2. **A read-only activity/content calendar** — a month view coloring in
   days the user actually studied (fed by `P2-1`/`P2-2`'s real
   tracking data) and/or surfacing scheduled content
   (`B-8`'s markdown-sourced `> Next live session: ...` announcement
   blocks, if any active profile has one)

These aren't mutually exclusive but they're different amounts of work
and different data sources, and a mockup showing "a calendar" doesn't
disambiguate which (or both) is intended. Recommendation: scope the
first build as (2) — a **read-only activity calendar** seeded by
`P2-1`/`P2-2` once those land — since it needs no new user-input UI and
gives the page real content on day one; treat (1) personal planner
entries as an additive extension once (2) is confirmed useful, not a
day-one requirement.

**Data model (activity-calendar variant)**
- No new storage of its own for the read-only version — derives
  entirely from `P2-1`'s aggregation layer (`js/shared/study-stats.js`'s
  React equivalent) and `P2-2`'s streak data, both already
  per-day-keyed
- If/when the personal-planner extension is built: new
  `localStorage` key `calendarEntries` (`{v:1, entries: [{id, date,
  title, note}]}`), same versioned-envelope convention as every other
  key

**Interactions**
- New route `/calendar`, added the same way every other page ticket
  adds to `App.tsx`'s route table
- Month-grid view; days with tracked activity visually distinct
  (matches the existing streak/goal visual language already established
  by `P0-6`/`P2-2` rather than inventing a new activity-indicator style)
- Clicking a day shows that day's detail (what was studied, quiz
  attempts, time) once `P2-1` provides per-day breakdowns
- Reachable from the header/nav or Dashboard, same "not just by typing
  the URL" bar `P0-0` held itself to

**Files to modify**
- `web/src/pages/Calendar/` (new) — route, month-grid rendering, day
  detail panel
- Reads from `P2-1`/`P2-2`'s aggregation module once those land; before
  they land, the page can still ship with an empty/placeholder state
  (same "must work correctly at zero data" bar `P0-0` held itself to)
  rather than waiting on both to be fully done first

**Done when**
- [ ] `/calendar` renders a correct month grid with no errors at zero
      tracked activity (empty state, not broken)
- [ ] Once `P2-1`/`P2-2` are available, days with real activity are
      visually distinguishable and clicking one shows accurate detail
- [ ] Reachable from a visible link, not just by typing the URL

---

## Ticket R3-1d — Study Mode page

Tier: R3 · Depends on: none technically, but should be sequenced
alongside/after whichever of vanilla note-page or `sprint-tickets.md`'s
`T5-3a` (React Note page) is current, since "study mode" most likely
launches *from* a note rather than existing as an unreachable standalone
page · Blocks: none

**Name collision worth stating precisely, so this doesn't get
double-built:** `P3-2` "Revision Mode" already exists as a scoped
ticket — a **view-mode toggle on the note page** that filters rendered
content down to highlights/bookmarks/personal notes for pre-exam
review. "Study Mode" in the mockups reads as a **different, session-level
feature**: a focused, timed study session (think pomodoro-style: work
interval, break interval, session length), not a content filter. These
are not the same feature wearing two names — one changes *what content
shows*, the other changes *how the session is structured/timed*. If the
real mockup's "Study Mode" turns out to actually just be `P3-2`
rebranded, that needs a real look at the mockup to confirm before any
code gets written — building both as separate features when they're
meant to be one would be exactly the duplication this roadmap exists to
catch.

Assuming they are genuinely different (session-timer vs. content-filter),
here's the scope for Study Mode as its own thing:

**Data model**
- New `localStorage` key `studyModeSettings` — `{v:1, workMinutes,
  breakMinutes, sessionsBeforeLongBreak}`, user-configurable defaults
- Session completions should feed into `P2-1`'s study-time aggregation
  once that exists, rather than Study Mode keeping its own separate
  time-tracking log — same "one aggregation layer, not a fourth
  tracker" principle `P2-1` itself was built to establish

**Interactions**
- New route `/study-mode` (or launched as a mode from within a note —
  open question the mockup should settle: standalone page vs. an
  overlay/mode entered from an in-progress note)
- Timer UI: work interval countdown, break interval, session count;
  start/pause/reset
- Optional distraction reduction while active (e.g. hiding the
  persistent chrome — sticky note widget, notifications bell — during a
  work interval), scoped as a nice-to-have, not a hard requirement for
  a first version
- Session-complete state contributes to whatever `P2-1` ends up
  counting as "study time," not a second, disconnected number the user
  has to reconcile against their real stats

**Files to modify**
- `web/src/pages/StudyMode/` (new) — timer UI, session state machine
- `web/src/lib/studyMode.ts` (new) — plain timer/session logic, same
  framework-agnostic-lib + thin-hook shape as the rest of the codebase
- Settings section (registered into `P0-0`'s registry, not a separate
  panel) for work/break-length preferences

**Done when**
- [ ] A full work→break→work cycle runs correctly with accurate timing
- [ ] Settings for interval lengths persist and are respected on the
      next session
- [ ] Once `P2-1` exists, a completed session's time is reflected in the
      real aggregate stats, not a separate/duplicate counter
- [ ] Confirmed against the real mockup that this is *not* `P3-2`
      Revision Mode under a different name before implementation starts

---

## Summary for whoever runs `R3-1`'s own "Done when"

All four sub-tickets above satisfy `R3-1`'s literal requirement (a real
spec per feature, not an assumed-buildable one-liner). Before any of
them move from spec to build, the open questions flagged in each —
especially `R3-1a`'s "what populates the bell," `R3-1c`'s "planner vs.
activity calendar," and `R3-1d`'s "is this actually `P3-2` renamed" —
should be checked against the real mockups, since this pass didn't have
access to them. None of the four blocks or is blocked by Tiers 0–6 in
`sprint-tickets.md`; they can be picked up independently once their
respective spec questions are resolved.
