import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Cloud,
  Binary,
  ListChecks,
  CalendarDays,
  MoreHorizontal,
  Images,
  Search,
  Download,
  Settings as SettingsIcon,
  Mail,
  X,
} from 'lucide-react';

/**
 * SidebarNav — NAV-1a.
 *
 * Real scope of this first slice of `NAV-1` (see sprint-tickets.md's
 * `NAV-1` for the full ticket): build the shared, persistent navigation
 * chrome itself — sidebar (web), collapsible icon-only rail (tablet),
 * bottom tab bar (mobile) — and wire it to real routes with real active-
 * item highlighting.
 *
 * Deliberately NOT in this slice (left for `NAV-1b`/`NAV-1c`, see the
 * ticket split): removing `Breadcrumb` from the 6 pages that still render
 * it, or repointing `lib/navigation.ts`'s `NavEntry[]` output into this
 * component's active/expanded state. `Breadcrumb` also renders each
 * page's <h1> page-header (see its own `showPageHeader` prop) — pulling
 * it out isn't just deleting a trail, every one of those 6 pages needs
 * a replacement header first. That's real, separate risk, not bundled
 * here. This component and `Breadcrumb` intentionally run side by side
 * for now.
 *
 * Breakpoints (Tailwind defaults): <768px mobile (bottom tab bar),
 * 768–1023px tablet (icon rail), >=1024px desktop (full sidebar).
 */

interface NavItem {
  label: string;
  to: string;
  icon: ReactNode;
  /** Route is "active" when the current pathname starts with this. */
  matchPrefix: string;
}

const PRIMARY_ITEMS: NavItem[] = [
  { label: 'Home', to: '/', icon: <Home size={20} />, matchPrefix: '/' },
  { label: 'AWS', to: '/notes-index/aws', icon: <Cloud size={20} />, matchPrefix: '/notes-index/aws' },
  { label: 'DSA', to: '/notes-index/dsa', icon: <Binary size={20} />, matchPrefix: '/notes-index/dsa' },
  { label: 'Quizzes', to: '/quiz-index', icon: <ListChecks size={20} />, matchPrefix: '/quiz-index' },
  { label: 'Calendar', to: '/calendar', icon: <CalendarDays size={20} />, matchPrefix: '/calendar' },
];

/** Secondary items: always real destinations, just less frequently used —
 * shown in the full sidebar/rail, folded into mobile's "More" sheet. */
const SECONDARY_ITEMS: NavItem[] = [
  { label: 'Gallery', to: '/gallery', icon: <Images size={20} />, matchPrefix: '/gallery' },
  { label: 'Search My Notes', to: '/search-my-notes', icon: <Search size={20} />, matchPrefix: '/search-my-notes' },
  { label: 'Export', to: '/export', icon: <Download size={20} />, matchPrefix: '/export' },
  { label: 'Settings', to: '/settings', icon: <SettingsIcon size={20} />, matchPrefix: '/settings' },
  { label: 'Contact', to: '/contact', icon: <Mail size={20} />, matchPrefix: '/contact' },
];

function isActive(pathname: string, matchPrefix: string): boolean {
  if (matchPrefix === '/') return pathname === '/';
  return pathname === matchPrefix || pathname.startsWith(`${matchPrefix}/`);
}

function NavLink({ item, active, iconOnly }: { item: NavItem; active: boolean; iconOnly?: boolean }) {
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      title={iconOnly ? item.label : undefined}
      className={`
        flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium
        transition-colors
        ${iconOnly ? 'justify-center px-0' : ''}
        ${
          active
            ? 'bg-primary text-white'
            : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
        }
      `}
    >
      <span aria-hidden="true">{item.icon}</span>
      {!iconOnly && <span>{item.label}</span>}
    </Link>
  );
}

/** Full persistent sidebar — desktop (lg+) only. */
function DesktopSidebar({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Main navigation"
      className="
        hidden lg:flex lg:flex-col lg:w-56 lg:shrink-0
        h-screen sticky top-0 overflow-y-auto
        border-r border-border-color bg-bg-card
        px-3 py-4 gap-1
      "
    >
      <div className="px-3 pb-3 mb-1 font-poppins font-bold text-lg text-text-primary">
        Notebook Buddy
      </div>
      {PRIMARY_ITEMS.map((item) => (
        <NavLink key={item.to} item={item} active={isActive(pathname, item.matchPrefix)} />
      ))}
      <div className="my-2 border-t border-border-color" />
      {SECONDARY_ITEMS.map((item) => (
        <NavLink key={item.to} item={item} active={isActive(pathname, item.matchPrefix)} />
      ))}
    </nav>
  );
}

/** Collapsed icon-only rail — tablet (md to lg) only. */
function IconRail({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Main navigation"
      className="
        hidden md:flex lg:hidden md:flex-col md:w-16 md:shrink-0
        h-screen sticky top-0 overflow-y-auto
        border-r border-border-color bg-bg-card
        px-2 py-4 gap-1 items-center
      "
    >
      {PRIMARY_ITEMS.map((item) => (
        <NavLink key={item.to} item={item} active={isActive(pathname, item.matchPrefix)} iconOnly />
      ))}
      <div className="my-1 w-8 border-t border-border-color" />
      {SECONDARY_ITEMS.map((item) => (
        <NavLink key={item.to} item={item} active={isActive(pathname, item.matchPrefix)} iconOnly />
      ))}
    </nav>
  );
}

/** Bottom tab bar — mobile (<md) only. 6 destinations per the ticket's
 * own manual test: Home / AWS / DSA / Quiz / Calendar / More. "More"
 * opens a lightweight in-app sheet with the secondary destinations —
 * a dedicated "About/legal" screen was referenced in an earlier design
 * review but no real spec for it exists in this project's docs yet, so
 * this sheet is real navigation only, not a stand-in for that screen. */
function BottomTabBar({ pathname }: { pathname: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = SECONDARY_ITEMS.some((item) => isActive(pathname, item.matchPrefix));

  return (
    <>
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          role="presentation"
          onClick={() => setMoreOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            className="
              absolute bottom-0 left-0 right-0
              bg-bg-card border-t border-border-color
              rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]
            "
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-poppins font-semibold text-text-primary">More</span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setMoreOpen(false)}
                className="p-1 rounded-full hover:bg-bg-secondary text-text-secondary"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {SECONDARY_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  aria-current={isActive(pathname, item.matchPrefix) ? 'page' : undefined}
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium
                    ${
                      isActive(pathname, item.matchPrefix)
                        ? 'bg-primary text-white'
                        : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
                    }
                  `}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Main navigation"
        className="
          md:hidden fixed bottom-0 left-0 right-0 z-30
          flex items-stretch justify-between
          border-t border-border-color bg-bg-card
          pb-[env(safe-area-inset-bottom)]
        "
      >
        {PRIMARY_ITEMS.map((item) => {
          const active = isActive(pathname, item.matchPrefix);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`
                flex-1 flex flex-col items-center justify-center gap-0.5
                py-2 text-[11px] font-medium
                ${active ? 'text-primary' : 'text-text-secondary'}
              `}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          className={`
            flex-1 flex flex-col items-center justify-center gap-0.5
            py-2 text-[11px] font-medium
            ${moreActive ? 'text-primary' : 'text-text-secondary'}
          `}
        >
          <span aria-hidden="true">
            <MoreHorizontal size={20} />
          </span>
          More
        </button>
      </nav>
    </>
  );
}

/**
 * Renders all three real-navigation shapes at once; each one's own
 * Tailwind responsive classes (`hidden lg:flex`, `hidden md:flex
 * lg:hidden`, `md:hidden`) decide which is actually visible at a given
 * viewport width — exactly one at a time, never zero, never more than
 * one. `App.tsx` mounts this once, alongside the existing floating
 * header cluster (unchanged in this slice).
 */
export function SidebarNav() {
  const { pathname } = useLocation();
  return (
    <div id="appSidebarNav">
      <DesktopSidebar pathname={pathname} />
      <IconRail pathname={pathname} />
      <BottomTabBar pathname={pathname} />
    </div>
  );
}
