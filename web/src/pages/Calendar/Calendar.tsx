import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageMeta } from '../../components/PageMeta';
import { getStudyActivityDates } from '../../lib/studyStats';

/**
 * Calendar — R3-1c.
 *
 * Scoped (per sprint-tickets-R3-1-scoping.md's R3-1c) as the
 * **read-only activity calendar** variant, not a personal planner: a
 * month grid that colors in days the user actually studied, fed by
 * P2-1 (Study Statistics)'s per-day-keyed aggregation. Deliberately no
 * new localStorage of its own for this variant — see getMonthActivity()
 * below.
 *
 * P2-1 now exists (lib/studyStats.ts's getStudyActivityDates()) —
 * getMonthActivity() below is real as of this session, no longer the
 * empty placeholder R3-1c shipped with. P2-2 (Study Streak,
 * lib/studyStats.ts's getStudyStreak()) is also now real, surfaced on
 * the Dashboard's StudyStatisticsWidget — but NOT wired into this page.
 * Whether the streak number itself should also appear here (header
 * badge, per-day streak-run styling, etc.) is a real design choice this
 * session left open rather than guessed at; this page still only shows
 * which individual days had activity, one month at a time.
 */

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DayActivity {
  /** True if the user studied at all on this day (P2-1/P2-2's signal). */
  active: boolean;
}

/**
 * Reads lib/studyStats.ts's getStudyActivityDates() (P2-1) and narrows
 * it to just the days in the given month, keyed the same way this
 * function always keyed its return value: local YYYY-MM-DD ->
 * DayActivity. Every call site below already expected exactly this
 * shape, so nothing else in this file changed when this landed.
 */
function getMonthActivity(monthStart: Date): Map<string, DayActivity> {
  const activeDates = getStudyActivityDates();
  const map = new Map<string, DayActivity>();
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const key = toDateKey(new Date(year, month, day));
    if (activeDates.has(key)) {
      map.set(key, { active: true });
    }
  }

  return map;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const DAY_DETAIL_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

interface CalendarCell {
  date: Date;
  inCurrentMonth: boolean;
}

/** Builds a full 6-row grid (42 cells) so every month renders a stable height, leading/trailing days from the adjacent months dimmed via `inCurrentMonth`. */
function buildMonthGrid(monthStart: Date): CalendarCell[] {
  const firstWeekday = monthStart.getDay();
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    return { date, inCurrentMonth: date.getMonth() === monthStart.getMonth() };
  });
}

export function Calendar() {
  const today = useMemo(() => new Date(), []);
  const [monthStart, setMonthStart] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const activity = useMemo(() => getMonthActivity(monthStart), [monthStart]);
  const cells = useMemo(() => buildMonthGrid(monthStart), [monthStart]);
  const hasAnyActivity = activity.size > 0;

  function goToMonth(delta: number) {
    setMonthStart((current) => addMonths(current, delta));
    setSelectedDate(null);
  }

  function goToToday() {
    setMonthStart(startOfMonth(today));
    setSelectedDate(today);
  }

  const selectedActivity = selectedDate ? activity.get(toDateKey(selectedDate)) : undefined;

  return (
    <div className="calendar-page font-poppins">
      <PageMeta
        title="Calendar"
        description="A month view of your study activity."
        canonicalPath="/calendar"
      />

      <header className="flex flex-col items-center text-center gap-2 py-10 px-4">
        <span className="text-primary" aria-hidden="true">
          <CalendarIcon size={32} />
        </span>
        <h1 className="text-2xl font-bold text-text-primary">Calendar</h1>
        <p className="subtitle text-text-muted max-w-md">
          A month view of the days you studied.
        </p>
      </header>

      <main className="max-w-3xl mx-auto px-6 pb-16 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            aria-label="Previous month"
            title="Previous month"
            className="
              inline-flex items-center justify-center h-9 w-9 rounded-full
              bg-bg-card text-text-primary border border-border-color
              hover:bg-bg-secondary transition-colors
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
            "
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>

          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-text-primary" aria-live="polite">
              {MONTH_FORMATTER.format(monthStart)}
            </h2>
            <button
              type="button"
              onClick={goToToday}
              className="text-xs font-medium text-primary hover:underline"
            >
              Today
            </button>
          </div>

          <button
            type="button"
            onClick={() => goToMonth(1)}
            aria-label="Next month"
            title="Next month"
            className="
              inline-flex items-center justify-center h-9 w-9 rounded-full
              bg-bg-card text-text-primary border border-border-color
              hover:bg-bg-secondary transition-colors
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
            "
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>

        <div
          role="grid"
          aria-label={MONTH_FORMATTER.format(monthStart)}
          className="rounded-xl border border-border-color bg-bg-card p-2 sm:p-3"
        >
          <div role="row" className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                role="columnheader"
                className="text-center text-xs font-medium text-text-muted py-1"
              >
                {label}
              </div>
            ))}
          </div>

          <div role="rowgroup" className="grid grid-cols-7 gap-1">
            {cells.map(({ date, inCurrentMonth }) => {
              const key = toDateKey(date);
              const dayActivity = activity.get(key);
              const isToday = isSameDay(date, today);
              const isSelected = selectedDate !== null && isSameDay(date, selectedDate);

              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  aria-current={isToday ? 'date' : undefined}
                  aria-selected={isSelected}
                  aria-label={
                    dayActivity?.active
                      ? `${DAY_DETAIL_FORMATTER.format(date)}, studied`
                      : DAY_DETAIL_FORMATTER.format(date)
                  }
                  onClick={() => setSelectedDate(date)}
                  className={`
                    relative aspect-square rounded-lg flex items-center justify-center text-sm
                    transition-colors duration-100
                    focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
                    ${inCurrentMonth ? 'text-text-primary' : 'text-text-muted/50'}
                    ${isSelected ? 'bg-primary text-white' : 'hover:bg-bg-secondary'}
                    ${isToday && !isSelected ? 'ring-1 ring-inset ring-primary font-semibold' : ''}
                  `}
                >
                  {date.getDate()}
                  {/* P2-1/P2-2 HOOK POINT: this dot is the "day with
                      tracked activity" indicator R3-1c's spec calls
                      for — matches DailyGoalWidget/streak's existing
                      dot-indicator visual language rather than a new
                      style. Renders once getMonthActivity() above
                      returns real days. */}
                  {dayActivity?.active && (
                    <span
                      aria-hidden="true"
                      className={`
                        absolute bottom-1 h-1.5 w-1.5 rounded-full
                        ${isSelected ? 'bg-white' : 'bg-primary'}
                      `}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {!hasAnyActivity && (
          <p className="text-sm text-text-muted text-center">
            No tracked activity yet — once your study stats are available, days you studied will
            show up here.
          </p>
        )}

        {selectedDate && (
          <div
            role="region"
            aria-label="Selected day detail"
            className="rounded-xl border border-border-color bg-bg-card p-4"
          >
            <h3 className="text-sm font-semibold text-text-primary mb-1">
              {DAY_DETAIL_FORMATTER.format(selectedDate)}
            </h3>
            {selectedActivity?.active ? (
              <p className="text-sm text-text-secondary">Studied this day.</p>
            ) : (
              <p className="text-sm text-text-muted">No tracked activity for this day yet.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
