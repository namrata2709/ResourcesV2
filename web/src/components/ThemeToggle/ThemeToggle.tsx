import { useTheme } from '../../context/ThemeContext';
import { useLiveRegion } from '../../hooks/useLiveRegion';
import { Icon } from '../Icon';

/**
 * ThemeToggle — React port of theme.js's #themeToggle button.
 *
 * Same contract as vanilla:
 *   - 3-mode cycle: light -> dark -> comfort -> light
 *   - same "theme" localStorage key (via ThemeContext -> lib/theme.ts)
 *   - tooltip/aria-label shows the NEXT theme, same as theme.js's
 *     updateTooltip()
 *
 * Icons: renders the real branded masters (public/icons/theme-{light,dark,
 * comfort}.png — approved batch, see ASSET-TODO.md) via the shared `Icon`
 * component. Falls back to the hand-drawn Lucide-style SVG stand-ins below
 * if a master is ever missing, so this never breaks even mid-asset-swap.
 */

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function SunIconFallback() {
  return (
    <svg {...ICON_PROPS} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIconFallback() {
  return (
    <svg {...ICON_PROPS} aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
    </svg>
  );
}

function ComfortIconFallback() {
  return (
    <svg {...ICON_PROPS} aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const THEME_ICON_NAME = {
  light: 'theme-light',
  dark: 'theme-dark',
  comfort: 'theme-comfort',
};

const THEME_ICON_FALLBACK = {
  light: <SunIconFallback />,
  dark: <MoonIconFallback />,
  comfort: <ComfortIconFallback />,
};

export function ThemeToggle() {
  const { theme, nextThemeLabel, toggleTheme } = useTheme();
  const { announce } = useLiveRegion();

  const label = `Switch to ${nextThemeLabel}`;

  function handleClick() {
    toggleTheme();
    // Announce the *incoming* state to screen readers, mirroring how the
    // vanilla site's visual tooltip is presented as the destination, not
    // the state you were just in.
    announce(`Theme switched to ${nextThemeLabel}`);
  }

  return (
    <button
      id="themeToggle"
      type="button"
      onClick={handleClick}
      title={label}
      aria-label={label}
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
      <span className="theme-icon">
        <Icon name={THEME_ICON_NAME[theme]} size={20} fallback={THEME_ICON_FALLBACK[theme]} />
      </span>
    </button>
  );
}
