import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

/**
 * components/JumpToTopButton/JumpToTopButton.tsx — T5-3c-4's other
 * half ("Jump-to-top + in-page section search").
 *
 * Deliberately its own tiny component, not folded into Note.tsx's FAB
 * cluster or into FloatingMenu — it isn't a menu (nothing opens), just
 * one action, so FloatingMenu's open/close/submenu machinery doesn't
 * fit it. Positioned in the same fixed bottom-right column as the
 * Settings/Tools FABs, one slot further up, following FloatingMenu's
 * own `1.5rem + stackIndex * 4rem` spacing formula (stackIndex 2 here)
 * so it sits above both without needing to coordinate through that
 * component's internal stacking state.
 *
 * Visibility is scroll-position-driven rather than always-on, matching
 * the feature's own name — appears only once there's somewhere to jump
 * back *from*.
 */

const SHOW_THRESHOLD_PX = 480;

export function JumpToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > SHOW_THRESHOLD_PX);
    }
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!visible) return null;

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Jump to top"
      title="Jump to top"
      className="
        fixed z-40
        inline-flex items-center justify-center
        h-12 w-12 rounded-full
        bg-bg-card text-text-primary
        border border-border-color
        shadow-[0_4px_12px_var(--shadow)]
        transition-shadow duration-150
        hover:shadow-[0_6px_20px_var(--shadow)]
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
      "
      style={{ right: '1.5rem', bottom: 'calc(1.5rem + 2 * 4rem)' }}
    >
      <ArrowUp size={20} aria-hidden="true" />
    </button>
  );
}
