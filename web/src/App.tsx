import { useEffect } from 'react';
import { Routes, Route, Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ProfileProvider } from './context/ProfileContext';
import { AppearanceProvider } from './context/AppearanceContext';
import { A11yProvider } from './context/A11yContext';
import { ReadingPreferencesProvider } from './context/ReadingPreferencesContext';
import { ThemeToggle } from './components/ThemeToggle';
import { Icon } from './components/Icon';
import { Dashboard } from './components/Dashboard';
import { Footer } from './components/Footer';
import { NotificationToasts } from './components/NotificationToasts';
import { KeyboardShortcutsPanel } from './components/KeyboardShortcutsPanel';
import { StickyNoteWidget } from './components/StickyNoteWidget';
import { NotificationsBell } from './components/NotificationsBell';
import { UserMenu } from './components/UserMenu';
import { PrintGuard } from './components/PrintGuard';
import { SidebarNav } from './components/SidebarNav';
import { NotesIndex } from './pages/NotesIndex';
import { QuizIndex } from './pages/QuizIndex';
import { Quiz } from './pages/Quiz';
import { Note } from './pages/Note';
import { Slides } from './pages/Slides';
import { Gallery } from './pages/Gallery';
import { NotFound } from './pages/NotFound';
import { Settings } from './pages/Settings';
import { Contact } from './pages/Contact';
import { LinkPage } from './pages/LinkPage';
import { Calendar } from './pages/Calendar';
import { SearchMyNotes } from './pages/SearchMyNotes';
import { Export } from './pages/Export';
import { ACTIVE_LINK_PROFILE_SLUGS } from './lib/links';
import { initAnalytics } from './lib/analytics';
import { useAnalyticsPageView } from './hooks/useAnalyticsPageView';
import { useRouteAnnouncer } from './hooks/useRouteAnnouncer';
import { useStudyTimeTracker } from './hooks/useStudyTimeTracker';
import { useAchievementsTracker } from './hooks/useAchievementsTracker';

// Hand-drawn fallback for the settings link, same pattern as the icon
// fallbacks in Footer.tsx/ThemeToggle.tsx — used only if
// public/icons/settings.png isn't there yet.
function GearIconFallback() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/**
 * App — real routing (T3-3), updated by T3-1c to clean, path-based URLs
 * for the listing pages.
 *
 * Route table:
 *   /                        -> Dashboard
 *   /notes-index              -> NotesIndex, unscoped (all subjects)
 *   /notes-index/:subject     -> NotesIndex, scoped to that subject —
 *                                replaces /notes?subject=aws|dsa (T3-1c)
 *   /notes-index?q=<term>     -> NotesIndex, pre-filled + auto-run search
 *                                (T3-1's audit gap — the landing point for
 *                                NotFound's search box; NotesIndex reads
 *                                `q` itself via useSearchParams(), no prop
 *                                needed here — `q` stays a query param,
 *                                it was never part of this ticket's
 *                                path-based scope, see T3-1c's own note)
 *   /quiz-index                -> QuizIndex — replaces /quiz. Path-only,
 *                                no :param: QuizIndex's topic filter is
 *                                local component state, never URL-driven
 *                                (confirmed against the real QuizIndex.tsx
 *                                before assuming a "quiz-index equivalent"
 *                                of :subject existed to convert)
 *   /quiz/:quizId               -> Quiz (T5-1b) — the per-quiz page,
 *                                replacing quiz.html?quiz=<file>.
 *                                QuizIndex's Open/Copy Link now point
 *                                here. Reuses T3-1c's 404.html redirect
 *                                rather than a second copy of it — no
 *                                separate GitHub Pages config needed for
 *                                this route. Note: the component behind
 *                                this route is currently a placeholder
 *                                stub — the full QuizEngine feature port
 *                                is T5-1b's own separate scope, not part
 *                                of this routing change.
 *   /gallery?folder=...        -> Gallery (T4-1a), unchanged — out of
 *                                scope for T3-1c, which only covers
 *                                NotesIndex/QuizIndex per the ticket
 *   /slides/:folder             -> Slides (T5-4a) — the presentation-
 *                                deck page, replacing slides.html.
 *                                Route/shell/fullscreen-chrome only;
 *                                see Slides.tsx's own header for the
 *                                T5-4b/c/d work still ahead of it
 *   /settings                  -> Settings (P0-0)
 *   /calendar                  -> Calendar (R3-1c) — read-only activity
 *                                calendar; ships with an honest empty
 *                                state until P2-1/P2-2 exist (see
 *                                Calendar.tsx's own header)
 *   /contact                   -> Contact (B-1) — feedback form + project/
 *                                contributor/GitHub/FAQ info
 *   /namu, /chandra, /todd      -> LinkPage (B-8) — one route per entry in
 *                                lib/links.ts's ACTIVE_LINK_PROFILE_SLUGS,
 *                                generated here rather than hand-listed so
 *                                the route table and the fetch-by-slug
 *                                logic can't drift out of sync
 *   /notes, /quiz               -> old shape, explicit redirects to the
 *                                new paths (below), not left half-working
 *   *                          -> NotFound
 *
 * NotesRoute is a thin adapter: it reads the `subject` *path* param via
 * useParams() (was useSearchParams() pre-T3-1c) and forwards it as
 * NotesIndex's existing `subjectOverride` prop (T3-2a) — NotesIndex
 * itself doesn't need to know it's being rendered by a router at all for
 * `subject`. Exported so tests can render exactly this route-to-prop
 * wiring in isolation (see App.routing.test.tsx).
 */
export function NotesRoute() {
  const { subject } = useParams();
  return (
    <PrintGuard>
      <NotesIndex subjectOverride={subject ?? ''} />
    </PrintGuard>
  );
}

/**
 * Old-URL redirects (T3-1c "Done when": old query-string URLs must not
 * be silently left half-working). Both are exact, deliberate decisions:
 * an old /notes?subject=aws link (pasted into a past lecture, bookmarked,
 * whatever) still lands on real content at /notes-index/aws instead of
 * 404ing — but the address bar updates to the new shape rather than
 * quietly keeping the old one alive forever.
 */
function OldNotesRedirect() {
  const [searchParams] = useSearchParams();
  const subject = searchParams.get('subject');
  const q = searchParams.get('q');
  const target = subject ? `/notes-index/${encodeURIComponent(subject)}` : '/notes-index';
  const qs = q ? `?q=${encodeURIComponent(q)}` : '';
  return <Navigate to={`${target}${qs}`} replace />;
}

function App() {
  // T3-2a: analytics.js's gtag.js self-injection, ported once here (was
  // once per vanilla page load) — see lib/analytics.ts for why
  // send_page_view is off and page views are tracked explicitly instead.
  useEffect(() => {
    initAnalytics();
  }, []);

  // Fires a page_view for the initial route and every route change after
  // it — React Router doesn't do this on its own (see the hook's header).
  useAnalyticsPageView();

  // T3-1b: scroll-to-top, focus the main landmark, and announce the new
  // page on every route change — see the hook's own header for the
  // scroll-restoration/focus-target decisions this makes explicitly.
  useRouteAnnouncer();

  // P2-1: cumulative "study time" signal, mounted once here (like
  // useAnalyticsPageView above) so it accumulates regardless of which
  // page is open, independent of useDailyGoal's own per-day 'time'
  // ticker — see the hook's own header for why these are two different
  // signals, not a duplicate.
  useStudyTimeTracker();

  // P2-3: checks P2-1/P2-2's stats against the achievement list and
  // fires a toast for anything newly crossed — mounted once here (not
  // inside AchievementsWidget) so an unlock is detected/fired exactly
  // once no matter which page the user is actually on when it happens.
  useAchievementsTracker();

  return (
    <ThemeProvider>
      <ProfileProvider>
        <AppearanceProvider>
        <A11yProvider>
        <ReadingPreferencesProvider>
          <div className="min-h-screen flex flex-col md:flex-row bg-bg-primary">
            {/* NAV-1a: shared sidebar (desktop) / icon rail (tablet) /
                bottom tab bar (mobile) navigation chrome — real routes,
                real active-item highlighting. Runs alongside the
                existing floating header cluster. NAV-1b (done) retired
                Breadcrumb's trail nav app-wide, replacing it with
                PageHeader on all 6 former call sites — see
                SidebarNav.tsx's/PageHeader.tsx's headers for what's
                still left for NAV-1c. */}
            <SidebarNav />
            <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
            {/* T3-1b: one real skip link for every route, not just
                note-shaped ones (Finding 13's actual fix, not a port of
                the gap) — jumps straight to #main-content below. */}
            <a
              href="#main-content"
              className="
                sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50
                focus:px-4 focus:py-2 focus:rounded-lg
                focus:bg-primary focus:text-white
              "
            >
              Skip to main content
            </a>

            {/* T3-1b: one shared shortcuts-help panel, mounted once,
                toggled by '?' — lists only whatever's actually
                registered via useKeyboardShortcut on the current page. */}
            <KeyboardShortcutsPanel />

            {/* T3-2a audit addition: single shared toast renderer for
                lib/notifications.ts's showNotification(), callable from
                anywhere in the app. */}
            <NotificationToasts />

            {/* P0-10: one freeform sticky note per page, mounted once —
                useStickyNote() re-keys off usePageId() on every route
                change, so this single instance is correct on every page. */}
            <StickyNoteWidget />
            {/* id="appChromeHeader": T5-4a's fullscreen-chrome mechanism
                (useFullscreenChrome) hides this cluster while the
                Slides page is fullscreen — see that hook's header
                comment for why this is one deliberate addition beyond
                vanilla slides.js's own 3-selector chrome list. */}
            <div id="appChromeHeader" className="fixed top-4 right-4 z-10 flex items-center gap-2">
              {/* R3-1a: in-app notification center, alongside the
                  Settings link and theme toggle in the same fixed
                  header cluster. */}
              <NotificationsBell />
              {/* R3-1b: header avatar/menu — shortcuts into Settings
                  and a Daily Goal glance, reading P0-1's profile
                  directly rather than a new storage key. */}
              <UserMenu />
              {/* P0-0: visible link into the shared Settings page — a gear
                  icon alongside the theme toggle, following the same
                  Icon+fallback convention as everything else in this
                  cluster. */}
              <Link
                to="/settings"
                aria-label="Settings"
                title="Settings"
                className="
                  inline-flex items-center justify-center
                  h-10 w-10 rounded-full
                  bg-bg-card text-primary
                  border border-border-color
                  shadow-[0_4px_12px_var(--shadow)]
                  transition-shadow duration-150
                  hover:shadow-[0_6px_20px_var(--shadow)]
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
                "
              >
                <Icon name="settings" size={20} fallback={<GearIconFallback />} />
              </Link>
              <ThemeToggle />
            </div>

            {/* T3-1b: the route-change focus target — id="main-content"
                matches the skip link's href, tabIndex={-1} lets it
                receive programmatic focus (useRouteAnnouncer) even
                though it's not natively focusable. */}
            <div id="main-content" tabIndex={-1} className="flex-1 outline-none">
              <Routes>
                <Route path="/" element={<PrintGuard><Dashboard /></PrintGuard>} />
                <Route path="/notes-index" element={<NotesRoute />} />
                <Route path="/notes-index/:subject" element={<NotesRoute />} />
                <Route path="/quiz-index" element={<PrintGuard><QuizIndex /></PrintGuard>} />
                <Route path="/quiz/:quizId" element={<Quiz />} />
                <Route path="/gallery" element={<PrintGuard><Gallery /></PrintGuard>} />
                <Route path="/notes/:folder" element={<Note />} />
                {/* P3-1: "Search Only My Notes" — scoped to notes with
                    at least one saved highlight (P1-1) or bookmarked
                    section (T5-3c-7), ranked via the same
                    useSearch()+SEARCH_FIELDS as /notes-index (T3-3).
                    Deliberately NOT PrintGuard-wrapped — that
                    component's own scope note (T3-2b) limits it to
                    Dashboard/NotesIndex/QuizIndex/Gallery specifically,
                    not every listing-shaped page added after it. */}
                <Route path="/search-my-notes" element={<SearchMyNotes />} />
                <Route path="/export" element={<Export />} />
                {/* T5-4a: presentation decks — see Slides.tsx's header
                    for what's built here vs. deferred to T5-4b/c/d. */}
                <Route path="/slides/:folder" element={<Slides />} />
                <Route path="/settings" element={<Settings />} />
                {/* R3-1c: read-only activity calendar — see Calendar.tsx's
                    header for why it's scoped as read-only, not a
                    personal planner. */}
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/contact" element={<Contact />} />

                {/* B-8: one route per active instructor profile slug,
                    generated from the same list LinkPage's fetch-by-slug
                    logic reads — see this file's header comment. */}
                {ACTIVE_LINK_PROFILE_SLUGS.map((slug) => (
                  <Route key={slug} path={`/${slug}`} element={<LinkPage slug={slug} />} />
                ))}

                {/* Old query-string shape — explicit redirects, see the
                    OldNotesRedirect comment above. */}
                <Route path="/notes" element={<OldNotesRedirect />} />
                <Route path="/quiz" element={<Navigate to="/quiz-index" replace />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>

            {/* id="footerRoot": matches vanilla slides.html's own
                #footerRoot mount id, so T5-4a's fullscreen-chrome
                selector list (useFullscreenChrome) can target it
                directly without inventing a new id. */}
            <div id="footerRoot">
              <Footer />
            </div>
            </div>
          </div>
        </ReadingPreferencesProvider>
        </A11yProvider>
        </AppearanceProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}

export default App;
