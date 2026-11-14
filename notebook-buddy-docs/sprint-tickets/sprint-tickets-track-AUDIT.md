> **Note added 2026-11-03.** Everything below this note is your `Track AUDIT` text, copied unchanged from the version you pasted into the chat (snapshot of 2026-09-28). It was not part of the zip's ticket folder, so it is added here to make the ticket set complete. **Status:** you reported on 2026-11-03 that all audits are done. I have **not** verified that — the only repo snapshot I have is the 2026-10-05 upload, in which `AUDIT-2`, `AUDIT-3`, `AUDIT-4`, `AUDIT-5` and `DX-5` were still open. Upload a fresh `dashboard package` zip and each ticket will be checked against the files and marked pass or fail. `AUDIT-1` (commits) stays gated on your instruction. Halted by direction on 2026-10-31 and resumed in the "Sequence" at the end of `sprint-tickets-tracks-PREB.md` (`Track UX`).

---

# Notebook Buddy — Track AUDIT (new, 2026-09-23)

**Priority: everything else in `sprint-tickets.md` / `sprint-tickets-tracks-PREB.md`
is halted until this track clears.** Requested directly, not inferred.

## Scope

A repo-wide sweep, folder by folder (including `.git` itself — history,
staged/unstaged state, untracked files — not just file contents), for:
- legacy or dead code
- code not related to any open ticket
- anything needing add / delete / update / merge
- **every ticket's stated `Status:` rechecked against real, current
  source as its folder comes up** — not a separate pass done after,
  folded into this same sweep. Added 2026-09-23, in response to a
  direct question about whether ticket statuses had been rechecked
  session-start: they hadn't, only what `HANDOFF.md`/`PROJECT.md`
  themselves claimed was reported back. This track is where that gap
  closes, ticket by ticket, as each one's real code comes into a
  folder pass — not deferred to some later, separate audit.

Every real finding gets its own ticket below (`AUDIT-N`). Where a
finding also touches an existing ticket's scope or status, that's
called out and, per the standing discipline, the existing ticket file
is edited directly rather than just described here.

**Relationship to `DX-1` (`sprint-tickets-tracks-PREB.md`):** `DX-1`
("Dead code and duplicate audit") already existed as an unstarted,
recurring-maintenance ticket with the same scope, opened from one
incidental find (`QuestionCard.tsx`). This track *is* that audit,
run for real, once, at priority — not a duplicate. `DX-1` should be
retitled to describe the recurring cadence and point at this track's
outcome as its first real run; not closed outright, since "run before
every `T6-1`-style milestone" is still a real future need.

**Process:** one folder (or coherent unit — `.git` counts as one) per
pass, real grep/read verification only, no status taken on faith from
a comment, a prior ticket, or a prior session's summary. Findings that
are genuinely just a ticket (add/delete/update/merge some code) become
an `AUDIT-N` ticket. Findings that are a product/process decision, not
buildable work, are flagged as **Needs a call** and left for you,
per the "don't silently pick a path" rule — not guessed at. **As of
2026-09-23, each folder pass also rechecks every ticket whose real
code lives in that folder** — not just hunting for dead code, but
reading each relevant ticket's `Status:` line against what the real
source actually does, the same discipline already used incidentally on
`DX-3`, `T6-1`, `T0-3`/`B-4b`, and `T3-1`. `web/src/` is where most of
the ticket set's real code lives (`T3-*`, `T4-*`, `T5-*`, `P0-*`–`P2-*`,
`R*`, `B-*`, `DASH-*`, `SHARED-*`, `NAV-1`, and more) — its pass will
be the bulk of this reconciliation, not a quick one.

---

## AUDIT-0 — Uncommitted working tree contradicts every status this track would otherwise trust — **partially resolved 2026-09-23**

**Status:** 🟡 Confirmed real, deliberately staying uncommitted. Not a
normal ticket — a baseline correction.

**Resolved, by your direct answer:** the vanilla `src/`(+`dist/`)
deletion is intentional, in-progress work — not accidental. **You are
deliberately not committing anything in `ResourcesV2` until this track
finishes checking every file/folder**, and separately, **a new
Dashboard redesign (substantial, already built in `web/src/`) is being
held back from commit/tickets on purpose**, since folding it in now
would churn the ticket set significantly before this sweep is even
done. Both noted — this track will keep reading the real working tree
directly (not `git log`) throughout, and will **not** touch
`DASH-1`/`DASH-2`/Dashboard-page ticket content until you say the
redesign is ready to reconcile. Committing itself stays out of scope
for this whole track, not just this ticket.

**What `git status`/`git diff` show, directly (kept for the record —
this is what "up to date" is being checked against each pass):**

1. **`web/` — the entire React app — has never been committed.**
   `git ls-files web/` returns zero tracked files. Every ticket in
   `sprint-tickets.md`/`-PREB.md` that says a React feature is "✅ Done"
   is describing code that exists only in this working tree.
2. **Vanilla `src/` (149 files) + `dist/`(never present, always
   build-only) deleted — confirmed intentional.** This is `T6-1`'s core
   deliverable; `sprint-tickets.md` still marks `T6-1` "⬜ technically
   ready... held for sequencing." Real code state is ahead of that —
   **`T6-1`'s status will be reconciled once this whole track clears**,
   not piecemeal now, since you don't want ticket churn mid-sweep.
3. **New `.github/workflows/coverage.yml` (repo root) appears to
   resolve `T0-3`/`B-4b`'s long-standing missing-coverage-workflow
   gap** — same reconcile-at-the-end treatment as `T6-1`.
4. **`python/generate_notes_backup.py` deleted** — genuine dead-code
   removal, consistent with this track's purpose.
5. **`notebook-buddy-docs/` itself is untracked** — planning record has
   zero commit history, same as `web/`. See `AUDIT-1`.
6. **Still open, not resolved by your last message — needs a call:**
   `deploy.yml`'s and `python/requirements.txt`'s uncommitted comments
   both claim the root `package.json`, `package-lock.json`,
   `tools/minify.js`, and root `requirements.txt` were "deleted
   alongside this fix." **Re-checked this pass — all four are still
   present, unmodified.** Since vanilla's real removal is now confirmed
   intentional, these 4 files (vanilla's actual build toolchain) read
   like an intentional next step that just hasn't happened yet, not a
   false claim about something unrelated — but that's an assumption,
   not confirmed. **Folded into `AUDIT-2` below** rather than guessed
   at further.

**Done when:** [ ] this whole track (every folder in the queue) clears;
[ ] `T6-1`/`T0-3`/`B-4b` statuses reconciled in one pass at that point,
not incrementally; [ ] `AUDIT-2`'s question resolved.

---

### AUDIT-1 — Nothing critical is under version control
**Components:** [Build/Config] · **Status:** ⬜ Not started — deliberately not actioned until this whole track clears (no commits mid-sweep, per direct instruction).
**Finding:** `web/` (0 tracked files) and `notebook-buddy-docs/` (0
tracked files) are both entirely untracked. An app with real users and
the planning record this project depends on session-to-session both
currently have zero commit history and zero recoverability if this
working tree is lost.
**Scope:** `git add` + commit both (in whatever chunking makes sense —
likely not one giant commit mixing the vanilla-removal refactor, the
held-back Dashboard redesign, and the first-ever commit of `web/`) —
once the full audit clears and you're ready to commit.
**Done when:** [ ] `git ls-files web/` and `git ls-files
notebook-buddy-docs/` both return real counts; [ ] working tree is
clean or only has genuinely-in-progress changes, not entire
subsystems.
**Manual test:** N/A — repo hygiene, not a feature.
**Prepared 2026-11-13:** the commit is written out as four chunks (vanilla removal, `web/`, `notebook-buddy-docs/`, everything else) with the checks that must print 0 or empty before each commit, in `APPLY-INSTRUCTIONS.md` Step 6. Hygiene added first: root `.gitignore` now also ignores `*-lean.zip` and `.*_staging/` (so a stray package or scratch folder can never be committed); `web/.gitignore` already ignores `playwright-report/`, `test-results/` and `coverage/`. **Not committed by me** — the zips have no `.git`, and the commit is your decision.

---

### AUDIT-2 — Repo-root docs describe a site that no longer exists — ✅ **done 2026-11-13 on the 2026-10-05 snapshot (re-verify on your current tree)**
**Detail (built vs mockups, evidence, decisions):** `design/change-notes/2026-09-28-audit2-audit3-nav1.md`
**Verified done:** `README.md` rewritten for Notebook Buddy / React + Vite (title, feature list, tech section); `dashboard.bat`'s comment now says "next to `web/`, `python/`".
**Still open — the vanilla toolchain is still there:** root `package.json`, `package-lock.json`, `requirements.txt` and `tools/minify.js` all still exist (root `package.json` is still the `learning-dashboard` / `tools/minify.js` config; `tools/minify.js` still hardcodes `SRC = <root>/src`, which no longer exists, so `npm run build` at the root is broken). Whether they are deleted or deliberately kept was never answered; the evidence says delete. `deploy.yml`/`python/requirements.txt` comments still claim they were deleted — false until they are.
**New small findings 2026-09-28:** README tagline still says "hands-on labs" (Labs deferred); its `Issues:` link is `namrata2909/Resources` while `Contact.tsx` uses `namrata2909/ResourcesV2`; root `requirements.txt` is UTF-16 LE (pip cannot reliably read it). Nothing references the root files (only `package.json`'s `build` script mentions `tools/minify.js`).
**Done when:** [x] README describes Notebook Buddy / React; [x] `dashboard.bat` comment updated; [ ] README labs wording + Issues link checked; [ ] root `package.json`, `package-lock.json`, `tools/minify.js`, root `requirements.txt` deleted (or kept with a written reason), and the "already deleted" comments made true.
**Update 2026-11-13 — done on the 2026-10-05 snapshot, by direct edit:** deleted root `package.json`, `tools/minify.js` (and the now-empty `tools/`) and the UTF-16 root `requirements.txt`; the 2026-10-05 snapshot had no root `package-lock.json` to delete. Nothing referenced them (grep of workflows, Python, `dashboard.bat`, source). Before deleting `requirements.txt` its package list was compared with `python/requirements.txt`: the only extras were transitive dependencies (`colorama`, `iniconfig`, `packaging`, `pluggy`, `pygments`, `soupsieve`, `typing_extensions`); every direct dependency (`beautifulsoup4`, `pyyaml`, `pytest`, `pytest-cov`) is in `python/requirements.txt`. The "already deleted" comments in `deploy.yml` and `python/requirements.txt` are now true. README: the Issues link now points at `namrata2709/ResourcesV2/issues`; the "hands-on labs" wording was checked and **kept** — labs are note entries (decision `D5`; the data has `lab` entries). Evidence: `pytest` 260 passed; `tsc -b` clean; `vitest` 119 files / 988 tests passed; `oxlint` 0 errors; `npm run build` succeeded. **Caveat:** done on the 2026-10-05 snapshot — if your tree has moved, re-run the same checks.

---

### AUDIT-3 — Orphaned duplicate `pages/Quiz/QuestionCard.tsx` — ✅ **done 2026-11-13 on the 2026-10-05 snapshot (re-verify on your current tree)**
**Detail (built vs mockups, evidence, decisions):** `design/change-notes/2026-09-28-audit2-audit3-nav1.md`
**Verified:** the file still exists and nothing imports it (only `components/QuestionCard/QuestionCard.tsx` is used, by `McqModule` and Quiz). **But** its entry was **removed from `DEFAULT_DEAD_CODE`** in `package_for_claude.py`, so `dashboard package --strip-dead-code` now ships a known-dead file. The entry should come out only when the file is actually deleted.
**Done when:** [ ] file deleted **and** `pages/Quiz/icons.tsx` (its only importer is this file; contents already live in `components/icons/questionIcons.tsx`); [ ] `DEFAULT_DEAD_CODE` matches the tree; [ ] `web` build + tests pass.
**Update 2026-11-13:** deleted `web/src/pages/Quiz/QuestionCard.tsx` and `web/src/pages/Quiz/icons.tsx` after re-confirming nothing imports them (`Quiz.tsx` imports the shared `components/QuestionCard`; the icons live in `components/icons/questionIcons.tsx`). `DEFAULT_DEAD_CODE` in `python/package_for_claude.py` now matches the tree: it is **empty** (it listed only the already-deleted `useOnlineStatus.ts`; `QuestionCard.tsx` had been removed from it, and is now genuinely gone). Neither deleted file had a test of its own; vitest is unchanged at 119 files / 988 tests, `tsc -b` is clean, oxlint warnings fell from 46 to 45, and `npm run build` succeeds. The only remaining text mentioning the old paths is explanatory comments.

### AUDIT-4 — `useOnlineStatus.ts` (built for `P5-1`, never consumed) — ✅ **done (2026-09-28)**
**Verified:** `web/src/hooks/useOnlineStatus.ts` is deleted and nothing references it (the decision taken: delete, not wire). **Leftover:** `DEFAULT_DEAD_CODE` in `package_for_claude.py` still lists that now-nonexistent path — harmless, but tracked under `DX-5` bug 2.
**Done when:** [x] hook deleted, no dangling imports; [x] stale `DEFAULT_DEAD_CODE` entry cleaned (2026-11-13, via `AUDIT-3`: the list is now empty).
**Update 2026-11-13:** re-verified on the 2026-10-05 snapshot — `web/src/hooks/useOnlineStatus.ts` does not exist, no source or Python file references it (only an explanatory comment in `package_for_claude.py`), and `DEFAULT_DEAD_CODE` is empty. Nothing further to do.

### AUDIT-5 — Root `favicon new not done/` folder — ✅ **fully done 2026-11-13 (on the 2026-10-05 snapshot; re-verify on your current tree)**
**Verified:** the folder no longer exists at the repo root. **Leftover:** `.gitignore` still has `favicon new not done.zip` and `favicon new not done/*` — dead lines now.
**Done when:** [x] folder deleted; [x] the two `.gitignore` lines removed (2026-11-13).
**Update 2026-11-13:** re-confirmed the folder does not exist, then removed exactly `favicon new not done.zip` and `favicon new not done/*` from `.gitignore`; nothing else in the repo mentions the name. `pytest` 260 passed (no source touched). **Observation, not changed (outside this ticket):** the next line, `src/output-onlinegiftools.gif`, ignores a path under the deleted vanilla `src/` and is probably dead too — **Removed 2026-11-13** at your request (the `.gitignore` now ends at `changes-summary.txt`).
(Separate finding it surfaced: the *shipped* `web/public/favicon.svg` is 1.2 MB — see `B-5`.)

### AUDIT-6 — `instructions/` → `notebook-buddy-docs/claude-instructions/` — ✅ **fully done 2026-11-13 (on the 2026-10-05 snapshot; re-verify on your current tree)**
**Verified:** `instructions/` is gone; all 7 files now live in `notebook-buddy-docs/claude-instructions/`; nothing in `python/` or `web/` referenced the old path. The docs in the uploaded zip had not been updated to say so — done here.
**Done when:** [x] folder moved; [x] nothing broke; [x] any doc that still says `instructions/` uses the new path (older changelog entries stay as history) — done 2026-11-13.
**Update 2026-11-13:** searched every `.md`, `.py`, `.yml`, `.ts`, `.tsx`, `.json` and `.bat` file for `instructions/`. The only real stale reference was `HANDOFF.md`, which told you to attach a separate `instructions.zip`; it now says the specs live in `notebook-buddy-docs/claude-instructions/` and are inside the `dashboard package` zip. Left as history: the `CHANGELOG.md` entries that mention `instructions.zip` and its 2026-07-25 heading. A false positive in `sprint-tickets-tracks-PREB.md` ("owns instructions/timer/restart/exit chrome" is ordinary English). `python/` and `web/` reference neither path.

---

## `.github/`, `.vscode/`, `node_modules` — checked, nothing new

- **`.github/`** — only the 3 workflow files already reviewed under `AUDIT-0`/`AUDIT-2` (`ci.yml`, `deploy.yml`, `coverage.yml`). No `CODEOWNERS`, issue/PR templates, or anything else in there. Nothing further to flag.
- **`.vscode/`** — only `tasks.json`, already reviewed (correctly points at `web/`, not stale). Nothing further to flag.
- **`node_modules` governance** — present at repo root and in `web/`, both correctly matched by `.gitignore`'s `node_modules/` pattern (it's a recursive-match pattern, covers both). The one nested `node_modules/terser/node_modules` is a normal npm de-duplication artifact, not a real issue. Root `node_modules` itself becomes pure dead weight once `AUDIT-2`'s root-toolchain deletion happens — not a separate ticket, folded into `AUDIT-2`.
- **`.gitattributes`** — 2 lines, standard `text=auto` LF-normalization. Fine as-is.
- **`.gitignore`** — reviewed in full; well-maintained, and its `favicon new not done/*` / `.zip` lines directly corroborate `AUDIT-5`.

---

All 4 resolved directly, 2026-09-23 — reconciled for real once the
status-recheck reached them, rather than held to "end of track":

- **`T6-1`** — ✅ resolved. Vanilla `src/`/`dist/` deletion and the
  `web/dist` deploy repoint both confirmed real in the working tree.
  Sequencing gate (`R0-1`/`R1-1`/`R4-1`) re-checked, genuinely clear.
  Kept 🟡, not ✅, in `sprint-tickets.md` itself — real on disk, not
  yet committed, full regression pass not yet run.
- **`T0-3`** — 🟡 resolved with a real nuance, not a clean ✅.
  `coverage.yml` runs pytest for real, but `continue-on-error: true` —
  reports failures, doesn't gate merges. Partially closes the original
  ask; a real blocking gate is separate, undecided scope.
- **`B-4b`** — ✅ resolved, same evidence as `T0-3`'s Python half.
- **`DX-3`** — ✅ resolved. Found already-fixed, not fixed this
  session — `dashboard.py`'s description string and all 3 `web-*`
  subcommands are real.

---

## Snapshot 2026-09-28 — re-verification of every AUDIT ticket against the new upload
`AUDIT-2` 🟡 (README + `dashboard.bat` done; root vanilla toolchain files still present) · `AUDIT-3` ⬜ (file still there; its `DEFAULT_DEAD_CODE` entry wrongly removed) · `AUDIT-4` ✅ · `AUDIT-5` ✅ (`.gitignore` leftovers) · `AUDIT-6` ✅ · `AUDIT-1` ⬜ (still uncommitted: `git ls-files web` = 0, `notebook-buddy-docs` = 0; working tree 156 deleted / 21 modified / 26 untracked). Python suite on the new snapshot: **260 passed**. Track can close once `AUDIT-2`'s deletions, `AUDIT-3`, and the `.gitignore` leftovers are done; `AUDIT-1` waits for the commit gate.


## Folder-by-folder queue (this session's plan)

- [x] `.git` (state, not history) — `AUDIT-0`/`AUDIT-1`
- [x] repo root — `AUDIT-2`
- [x] `python/` — `AUDIT-3`, `AUDIT-4`, `DX-3` status correction queued. **Status-recheck retrofitted 2026-09-23:** `T3-7a`/`T3-7b`/`T3-7c` already correctly ✅ Done (re-confirmed against source, matches). `PY-1`'s one leftover caveat ("not independently re-verified — no pytest run happened") closed for real: ran `python3 -m pytest` — 14/14 on `test_generate_quiz_index.py`, 258/258 on the full `python/` suite. `M0-*`/`M1-*`/`M2-*`/`M3-*` (the manual-test-spreadsheet tickets) are process/doc tickets about `notebook-buddy-docs/`, not `python/` source — deferred to that folder's own pass, not owed here.
- [x] `.github/` — checked, nothing new (see above)
- [x] `.vscode/` — checked, nothing new (see above)
- [x] `.venv/`, `node_modules` — governance checked, correctly gitignored, folded into `AUDIT-2` (see above)
- [x] `favicon new not done/` — `AUDIT-5`
- [x] `instructions/` — `AUDIT-6`
- [x] `tools/` — confirmed non-functional, folded into `AUDIT-2` (see above)
- [x] misc root files (`.gitignore`, `.gitattributes`, `README.md`, `sitemap.xml`, `LICENSE.md`, `dashboard.bat`) — all reviewed, folded into `AUDIT-2` where relevant, no separate issues
- [x] `web/src/` — **dead-code sweep run 2026-09-23**, programmatic this time, not spot-check: every one of the 224 real `.ts`/`.tsx` source files checked for zero references anywhere else in the tree. **Exactly one true orphan found: `hooks/useOnlineStatus.ts` — already `AUDIT-4`, nothing new.** `pages/Quiz/QuestionCard.tsx` (`AUDIT-3`) doesn't show up in this kind of scan since its name string-matches the real, actively-used `components/QuestionCard/QuestionCard.tsx` — already known, not a contradiction. Stray-marker scan (`TODO`/`FIXME`/`deprecated`/"dead code") found nothing real — every hit was a legitimate `ASSET-TODO.md` cross-reference or an explicit "not dead code" comment. Settings barrel (`sections/index.ts`) re-checked directly — clean, matches the real 7 registered sections, no stray commented-out imports.
- [x] `web/` root config — **one real, high-value finding: `B-4c` (Lighthouse audits) is done, not "still not built."** `ci.yml` has a real `lighthouse` job labeled `(B-4c)`, `web/lighthouserc.json` is real and specific (4 real URLs), non-blocking. This is genuinely new since `B-4c` was last checked, not a stale claim — part of the same uncommitted CI rewrite `AUDIT-0` already found. `.oxlintrc.json` checked, real and wired (`package.json`'s `lint` script). `vite.config.ts`/`tailwind.config.js`/`tsconfig*.json`/`playwright.config.ts`/`vitest.config.ts` — no issues found.
- [x] `notebook-buddy-docs/` itself — **checked 2026-09-28 against the new upload: the zip's docs were byte-identical to the 2026-09-22 originals — none of this track's edits (this file, the status recheck, ticket corrections) were in it, while the code had moved on (`AUDIT-3..6`, `NAV-1`, `P0-9b`, `DX-5`-adjacent changes). That is exactly the drift this track exists to find; rule added to `HANDOFF.md`: docs change in the same pass as code.** Old wording: `notebook-buddy-docs/` itself (the doc-hygiene pass `HANDOFF.md` already ran 2026-09-22 — confirm nothing drifted since, and this is where `AUDIT-6`'s moved `instructions/` would land)

**Next step:** `notebook-buddy-docs/` self-check — the last folder in the queue. `Track AUDIT` closes once that's done.
