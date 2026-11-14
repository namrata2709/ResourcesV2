import { Logo } from '../Logo';
import { DashboardCardsGrid } from '../DashboardCardsGrid';
import { ContinueReading } from '../ContinueReading';
import { QuickActionsBar } from '../QuickActionsBar';
import { StudyStatisticsWidget } from '../StudyStatisticsWidget';
import { AchievementsWidget } from '../AchievementsWidget';
import { MotivationalWidget } from '../MotivationalWidget';
import { PageMeta } from '../PageMeta';
import { useProfile } from '../../context/ProfileContext';
import { buildGreetingText } from '../../lib/profile';

/**
 * Dashboard — React port of dashboard.js.
 *
 * The card-grid fetch+render logic itself now lives in DashboardCardsGrid
 * (extracted so NotFound/404 can reuse the exact same component — see
 * sprint-tickets-feature-audit.md Part B's T3-1 gap, "same dashboard
 * cards as index.html"). Dashboard.tsx is now just the branded header +
 * page shell around it.
 *
 * Branding applied per T3-1 (not deferred): the old "🎓 Learning Dashboard"
 * header is replaced with the actual Notebook Buddy logo lockup.
 */
export function Dashboard() {
  const { profile } = useProfile();
  const greeting = buildGreetingText(profile);

  return (
    <div className="dashboard-page font-poppins">
      {/* T3-2a: per-route meta. Title left empty so PageMeta falls back to
          the bare site name ("Notebook Buddy") for the homepage, rather
          than "Home · Notebook Buddy" — matches how index.html's static
          <title> read before this was wired up. */}
      <PageMeta
        title=""
        description="A personal study dashboard for AWS and DSA notes, labs, quizzes, and slides."
        canonicalPath="/"
      />
      <header className="flex flex-col items-center text-center gap-2 py-10 px-4">
        {/* Same max-w-5xl + px-6 as <main> below, so the logo's rendered
            width always matches the card row's width exactly — not a
            fixed pixel guess that happens to look right at one viewport. */}
        <div className="w-full max-w-5xl mx-auto px-6">
          <Logo variant="horizontal" fillWidth />
        </div>

        {/* P0-1: personal greeting, sourced from ProfileContext. Renders a
            sensible default ("Good evening 👋") with no profile set, since
            ProfileContext falls back to DEFAULT_PROFILE — no branching
            needed here for the "no profile" case. */}
        <p className="dashboard-greeting text-lg text-text-primary">
          {greeting} <span aria-hidden="true">{profile.avatar}</span>
        </p>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        {/* P0-7: previously stored a value with zero real Dashboard
            consumer anywhere in the app — this is that consumer. */}
        <QuickActionsBar />
        {/* P0-3: renders nothing on a first-time visitor / once nothing
            valid is left to resume — see ContinueReading's own comment. */}
        <div className="mb-6">
          <ContinueReading />
        </div>
        {/* P2-4: one rotating line of encouragement per real dashboard
            visit — see MotivationalWidget/useMotivationalMessage for
            the shuffle-bag logic that keeps it from repeating itself
            in a short cycle. */}
        <MotivationalWidget />
        {/* P2-1: always renders (an honest all-zero state, not hidden)
            so a first-time visitor sees what gets tracked. Purely
            localStorage-driven — no fetch, so it's safe alongside
            DashboardCardsGrid's own network-dependent rendering. */}
        <StudyStatisticsWidget />
        {/* P2-3: reads whatever useAchievementsTracker (mounted at
            App.tsx root) has already unlocked — see its own comment
            for why the unlock check itself doesn't live here. */}
        <AchievementsWidget />
        <DashboardCardsGrid />
      </main>
    </div>
  );
}
