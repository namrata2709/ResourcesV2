import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../../context/ProfileContext';
import { useDailyGoal } from '../../hooks/useDailyGoal';
import { buildGreetingText } from '../../lib/profile';

/**
 * UserMenu — R3-1b's header avatar/menu.
 *
 * Not an account switcher — there's no authentication anywhere in this
 * app, everything is local-only localStorage (see R3-1b's own spec for
 * why "user avatar/menu" can't mean what it would on a site with real
 * accounts). This is a convenience menu: the user's own P0-1 profile
 * avatar/name in the header, opening shortcuts into personalization
 * surfaces that already exist. It reads ProfileContext directly rather
 * than duplicating or shadowing lib/profile.ts's stored state — no new
 * storage of its own.
 *
 * Achievements (P2-3) isn't linked here — that page doesn't exist yet.
 * Per R3-1b's own done-when: no dead links to not-yet-built pages.
 *
 * Same anchored-dropdown shape as NotificationsBell (R3-1a): click the
 * avatar, click outside or Escape to close.
 */

const GOAL_TYPE_UNIT: Record<string, string> = {
  time: 'min',
  chapters: 'chapters',
  mcqs: 'MCQs',
};

export function UserMenu() {
  const { profile } = useProfile();
  const { goal } = useDailyGoal();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const greeting = buildGreetingText(profile);
  const displayName = profile.name.trim() || 'there';
  const triggerLabel = profile.name.trim() ? `Menu for ${profile.name.trim()}` : 'User menu';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={triggerLabel}
        aria-expanded={open}
        aria-haspopup="true"
        title={triggerLabel}
        className="
          inline-flex items-center justify-center
          h-10 w-10 rounded-full
          bg-bg-card text-lg
          border border-border-color
          shadow-[0_4px_12px_var(--shadow)]
          transition-shadow duration-150
          hover:shadow-[0_6px_20px_var(--shadow)]
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
        "
      >
        <span aria-hidden="true">{profile.avatar}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="User menu"
          className="
            absolute right-0 mt-2 w-64 max-w-[90vw] z-50
            bg-bg-card border border-border-color rounded-xl
            shadow-[0_8px_30px_var(--shadow)]
            flex flex-col
          "
        >
          <div className="px-4 py-3 border-b border-border-color">
            <p className="text-sm font-semibold text-text-primary">
              {greeting || `Hi, ${displayName}`} <span aria-hidden="true">{profile.avatar}</span>
            </p>
            {profile.goal.trim() && (
              <p className="text-xs text-text-muted mt-0.5">{profile.goal.trim()}</p>
            )}
          </div>

          <div className="px-4 py-3 border-b border-border-color">
            <p className="text-xs font-medium text-text-secondary mb-1">Today's goal</p>
            {goal ? (
              <p className="text-sm text-text-primary">
                {Math.min(goal.progress, goal.target)} / {goal.target} {GOAL_TYPE_UNIT[goal.type]}
              </p>
            ) : (
              <p className="text-sm text-text-muted">No daily goal set</p>
            )}
          </div>

          <nav className="flex flex-col py-1">
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="px-4 py-2 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
            >
              Settings
            </Link>
            {/* Achievements (P2-3) isn't built yet — deliberately not
                linked here until it exists, per R3-1b's own
                no-dead-links done-when criterion. */}
          </nav>
        </div>
      )}
    </div>
  );
}
