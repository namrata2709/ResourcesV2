import { BarChart3, BookOpen, ClipboardCheck, Percent, Highlighter, Bookmark, Clock, Flame } from 'lucide-react';
import { useStudyStats } from '../../hooks/useStudyStats';

/**
 * StudyStatisticsWidget — P2-1 (+ P2-2's streak stat, added this
 * session). Lives on the Dashboard, alongside ContinueReading (P0-3) —
 * same "small dashboard card, all-localStorage, no network fetch" shape
 * DailyGoalWidget (P0-6) already established.
 *
 * The first six stats come straight from lib/studyStats.ts's
 * computeStudyStatistics(): notes read (all-time completions), quiz
 * attempts + average score (across every quiz's history), highlights
 * and bookmarks (summed across every note), and cumulative study time
 * (hooks/useStudyTimeTracker.ts's minute ticker, mounted once at
 * App.tsx root). The seventh, Day streak, comes from the sibling
 * getStudyStreak() (P2-2) — current consecutive days, with the
 * all-time longest run available as a hover tooltip via `title` rather
 * than a second visible number, to keep the grid uncluttered.
 *
 * Renders every stat even at zero — an honest "nothing tracked yet"
 * state (0 everywhere, "—" for average score) rather than hiding the
 * widget entirely, so a first-time visitor sees what gets tracked
 * before they've done anything.
 */

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  /** Optional hover tooltip on the whole card — used by Day streak to
   * surface the all-time longest run without a second visible number. */
  title?: string;
}

function StatItem({ icon, label, value, title }: StatItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-bg-secondary px-3 py-2.5" title={title}>
      <span className="text-primary shrink-0" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-base font-semibold text-text-primary leading-tight">{value}</p>
        <p className="text-xs text-text-muted leading-tight">{label}</p>
      </div>
    </div>
  );
}

export function StudyStatisticsWidget() {
  const { stats, streak } = useStudyStats();

  const hours = Math.floor(stats.studyTimeMinutes / 60);
  const minutes = stats.studyTimeMinutes % 60;
  const studyTimeLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return (
    <div className="study-statistics-widget rounded-lg border border-border-color p-4 mb-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-3">
        <BarChart3 size={16} aria-hidden="true" />
        Study Statistics
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <StatItem icon={<BookOpen size={18} aria-hidden="true" />} label="Notes read" value={String(stats.notesRead)} />
        <StatItem
          icon={<ClipboardCheck size={18} aria-hidden="true" />}
          label="Quiz attempts"
          value={String(stats.quizAttempts)}
        />
        <StatItem
          icon={<Percent size={18} aria-hidden="true" />}
          label="Average score"
          value={stats.avgScorePercent === null ? '—' : `${stats.avgScorePercent}%`}
        />
        <StatItem
          icon={<Highlighter size={18} aria-hidden="true" />}
          label="Highlights"
          value={String(stats.highlightsCount)}
        />
        <StatItem icon={<Bookmark size={18} aria-hidden="true" />} label="Bookmarks" value={String(stats.bookmarksCount)} />
        <StatItem icon={<Clock size={18} aria-hidden="true" />} label="Study time" value={studyTimeLabel} />
        <StatItem
          icon={<Flame size={18} aria-hidden="true" />}
          label="Day streak"
          value={`${streak.current}`}
          title={`Longest streak: ${streak.longest} day${streak.longest === 1 ? '' : 's'}`}
        />
      </div>
    </div>
  );
}
