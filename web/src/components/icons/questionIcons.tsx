/**
 * components/icons/questionIcons.tsx — hand-drawn Lucide-style fallback
 * SVGs for Bookmark and Flag, used by the per-question bookmark/flag
 * toggles.
 *
 * Relocated here from pages/Quiz/icons.tsx by T5-3a, per QuestionCard's
 * own header note: now that QuestionCard has a second real consumer
 * (Note's embedded MCQ module, alongside Quiz), its icon fallbacks need
 * to live somewhere both pages can reach — components/icons/, not
 * pages/Quiz/. Same file, same exports, just moved out of a
 * page-specific folder now that it's genuinely shared.
 *
 * Same convention as every other fallback in this codebase
 * (GearIconFallback in App.tsx, SunIconFallback/MoonIconFallback/
 * ComfortIconFallback in ThemeToggle.tsx, ScrollTextIconFallback/
 * AlertIconFallback in Footer.tsx): a plain inline SVG passed as
 * <Icon>'s `fallback` prop, rendered only until a real
 * `/icons/{name}.png` lands — at which point Icon swaps to the real
 * asset automatically, no code change needed here.
 *
 * State (bookmarked vs not, which flag state is active) is communicated
 * via the button's className/aria-pressed/aria-label at the call site —
 * not by swapping to a different SVG per state. Filled vs. outline is
 * done with `fill: currentColor` vs `fill: none` toggled by the
 * consumer, matching the existing ♥/♡ pattern.
 *
 * Usage:
 *   <Icon name="quiz-bookmark" size={20} fallback={<BookmarkIconFallback />} />
 *   <Icon name="quiz-flag" size={20} fallback={<FlagIconFallback />} />
 *
 * See ASSET-TODO.md's "Still needed" table for the real-asset entries this
 * fallback stands in for.
 */

export function BookmarkIconFallback({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export function FlagIconFallback({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}
