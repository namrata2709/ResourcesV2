import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
import { Icon } from '../Icon';
import { Illustration } from '../Illustration';
import { dataPath } from '../../lib/siteConfig';
import { applyCardOrder, getSavedCardOrder, saveCardOrder } from '../../lib/dashboardCardOrder';

/**
 * DashboardCardsGrid — extracted from Dashboard.tsx (T3-1) so NotFound
 * (T3-1's audit gap — sprint-tickets-feature-audit.md Part B) can render
 * "the same dashboard cards as index.html" exactly like 404.html's real
 * comment says, by reusing this component instead of a second, drifting
 * copy of the fetch+render logic.
 *
 * Same contract as dashboard.js/Dashboard.tsx:
 *   - fetches data/index/dashboard-cards.json, renders one card per entry
 *   - falls back to category-icons.json's default.icon when a card has
 *     no `icon` of its own (T1-3's fix)
 *
 * P0-11: drag-and-drop (+ keyboard) reordering. Native HTML5 drag
 * events rather than pulling in a library — the ticket's own file list
 * explicitly allows either ("a small library like dnd-kit ... or native
 * HTML5 drag events"), and this app has no drag dependency today. Since
 * native drag-and-drop has no keyboard story on its own, every card
 * also gets explicit Move earlier/later buttons (same
 * stop-propagation-inside-a-Link convention CardQuickActions already
 * established) so reordering isn't mouse/touch-only. Order persists via
 * lib/dashboardCardOrder.ts under its own "dashboardCardOrder" key —
 * applied once on load, re-saved after every drag or button move.
 */

export interface DashboardCard {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  type: 'subject' | 'standalone';
  url: string;
}

async function loadCards(): Promise<{ cards: DashboardCard[]; fallbackIcon: string }> {
  const [cardsRes, iconsRes] = await Promise.all([
    fetch(dataPath('index', 'dashboard-cards.json')),
    fetch(dataPath('config', 'category-icons.json')),
  ]);
  if (!cardsRes.ok) throw new Error(`HTTP ${cardsRes.status}`);

  const data = await cardsRes.json();
  const cards: DashboardCard[] = data.cards ?? [];

  let fallbackIcon = '';
  if (iconsRes.ok) {
    const icons = await iconsRes.json();
    fallbackIcon = icons.default?.icon ?? '';
  } else {
    console.warn(`DashboardCardsGrid: could not load category-icons.json (HTTP ${iconsRes.status})`);
  }

  return { cards, fallbackIcon };
}

export function DashboardCardsGrid() {
  const [cards, setCards] = useState<DashboardCard[] | null>(null);
  const [fallbackIcon, setFallbackIcon] = useState('');
  const [error, setError] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCards()
      .then(({ cards, fallbackIcon }) => {
        if (!cancelled) {
          setCards(applyCardOrder(cards, getSavedCardOrder()));
          setFallbackIcon(fallbackIcon);
        }
      })
      .catch((err) => {
        console.error('Error loading dashboard cards:', err);
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Moves the card at `index` by `delta` positions and persists the result. Used by both the Move buttons and drag-and-drop's onDrop. */
  function reorder(index: number, targetIndex: number) {
    setCards((current) => {
      if (!current || targetIndex < 0 || targetIndex >= current.length || index === targetIndex) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      saveCardOrder(next.map((c) => c.id));
      return next;
    });
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (draggedIndex !== null) reorder(draggedIndex, dropIndex);
    setDraggedIndex(null);
  }

  if (error) {
    return (
      <div className="error rounded-lg border border-border-color bg-bg-card p-6 text-center">
        <Illustration name="error-dashboard" maxWidth={280} className="mb-4" alt="" />
        <h2 className="text-lg font-semibold text-text-primary mb-1">Error Loading Dashboard</h2>
        <p className="text-text-muted text-sm">
          Could not load data/index/dashboard-cards.json. Please ensure the file exists.
        </p>
      </div>
    );
  }

  if (cards === null) {
    return <div className="loading text-center text-text-muted py-12">Loading…</div>;
  }

  if (cards.length === 0) {
    return (
      <div className="loading text-center text-text-muted py-12">
        <Illustration name="empty-dashboard" maxWidth={320} className="mb-4" alt="" />
        No dashboard cards configured yet.
      </div>
    );
  }

  return (
    <div id="modulesGrid" className="grid gap-[var(--grid-gap)] sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card, index) => (
        <div
          key={card.id}
          draggable
          onDragStart={() => setDraggedIndex(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={() => setDraggedIndex(null)}
          className={`relative group/card ${draggedIndex === index ? 'opacity-50' : ''}`}
        >
          <Link
            to={card.url}
            draggable={false}
            className="
              module-card group flex flex-col gap-[var(--card-gap)] rounded-[var(--card-radius)]
              bg-bg-card border border-border-color p-[var(--card-padding)]
              shadow-[0_4px_12px_var(--shadow)]
              transition-transform duration-[var(--motion-duration)]
              hover:-translate-y-0.5 hover:shadow-[0_8px_24px_var(--shadow)]
            "
          >
            <div className="module-icon text-3xl leading-none">
              <Icon name={card.id} size={40} fallback={card.icon || fallbackIcon} />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">{card.label}</h2>
            <p className="text-sm text-text-muted flex-1">{card.description ?? ''}</p>
            {/* P0-2 fix: was `bg-bg-secondary text-accent` — --accent only
                tinted this badge's *text* on a theme-neutral background,
                so a real accent-color change was technically applied but
                easy to miss glancing at Dashboard. Switched to a solid
                accent background so the swatch itself is visible on
                every card, not just its label color.
                Deliberately NOT `bg-accent/15` (the softer tint Gallery's
                `image-category-chip` uses) — confirmed via a built CSS
                check that Tailwind's `/NN` opacity-modifier syntax
                silently fails to compile for every color in this config
                that's defined as a bare `var(--x)` string (accent,
                primary, bg-*, text-*, border-color — all of them, not
                just this one). That's a real, separate, wider bug
                (Gallery's own `bg-accent/15` and several of BodyProse's
                bg-accent/10, bg-accent/5, border-accent/30 highlight
                styles are silently the same theme-neutral no-op today)
                worth its own ticket — flagged, not fixed here, since
                fixing it means adding an alpha-channel-aware color
                function to every affected token in tailwind.config.js,
                a config-wide change well past this ticket's scope. */}
            <span
              className="
                module-badge self-start text-xs font-medium px-2.5 py-1 rounded-full
                bg-accent text-white
              "
            >
              {card.type === 'standalone' ? 'All Subjects' : 'Subject'}
            </span>
          </Link>

          {/* P0-11: reorder controls — hidden until hover/focus so they
              don't visually compete with the card's own content, but
              always present in the DOM (not conditionally rendered) so
              keyboard/screen-reader users tabbing through the grid can
              reach them without a pointer hover first. */}
          <div
            className="
              absolute top-2 right-2 flex items-center gap-0.5
              rounded-full bg-bg-card/95 border border-border-color px-1 py-0.5
              opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100
              transition-opacity
            "
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                reorder(index, index - 1);
              }}
              disabled={index === 0}
              aria-label={`Move ${card.label} earlier`}
              title={`Move ${card.label} earlier`}
              className="
                h-6 w-6 rounded-full flex items-center justify-center
                text-text-muted hover:bg-bg-secondary hover:text-text-primary
                disabled:opacity-30 disabled:hover:bg-transparent
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
              "
            >
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <span
              aria-hidden="true"
              title="Drag to reorder"
              className="h-6 w-6 flex items-center justify-center text-text-muted cursor-grab"
            >
              <GripVertical size={14} />
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                reorder(index, index + 1);
              }}
              disabled={index === cards.length - 1}
              aria-label={`Move ${card.label} later`}
              title={`Move ${card.label} later`}
              className="
                h-6 w-6 rounded-full flex items-center justify-center
                text-text-muted hover:bg-bg-secondary hover:text-text-primary
                disabled:opacity-30 disabled:hover:bg-transparent
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary
              "
            >
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

