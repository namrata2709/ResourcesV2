/**
 * TabPanel — generic labeled-tabs + content-panes component, first built
 * here (T5-3b) per the same "one component per repeated UI pattern"
 * principle `Table`/`List` already follow. Two confirmed real consumers,
 * both DSA-specific but structurally identical (per T5-3b's own note):
 *   - Implementation section's Python/Java/C++ code-language tabs
 *   - Visualisation panel's Images-vs-Animation toggle
 *     (`dsa-visualisation.js`'s `initTabSwitch()` — same two-tab-switcher
 *     shape, just switching between an image slideshow and
 *     `DsaAnimation`'s iframe instead of code panes)
 *
 * Deliberately generic over what each pane renders (`content: ReactNode`,
 * not a fixed "code" or "image" shape) — this component owns the tab
 * strip and ARIA wiring, callers own what's inside each pane.
 *
 * Follows the WAI-ARIA "tabs" pattern: `tablist`/`tab`/`tabpanel` roles,
 * roving tabindex, and Left/Right arrow-key navigation between tabs
 * (Home/End jump to first/last) — matches the keyboard-first convention
 * `QuestionCard`'s option list already applies elsewhere in this app.
 */

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface TabPanelTab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabPanelProps {
  tabs: TabPanelTab[];
  /** Accessible name for the tablist — required, same "no unlabeled
   * structural element" rule `Table`/`List` already enforce. */
  ariaLabel: string;
  /** Uncontrolled by default (own internal state); pass both to control
   * the active tab from outside. */
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export function TabPanel({ tabs, ariaLabel, activeTabId, onTabChange, className = '' }: TabPanelProps) {
  const uid = useId();
  const [internalActive, setInternalActive] = useState<string | undefined>(tabs[0]?.id);
  const active = activeTabId ?? internalActive ?? tabs[0]?.id;

  if (!tabs || tabs.length === 0) return null;

  function selectTab(tabId: string) {
    setInternalActive(tabId);
    onTabChange?.(tabId);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (e.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === null) return;
    e.preventDefault();
    const next = tabs[nextIndex];
    selectTab(next.id);
    document.getElementById(`${uid}-tab-${next.id}`)?.focus();
  }

  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className={`tab-panel ${className}`}>
      <div role="tablist" aria-label={ariaLabel} className="flex gap-1 border-b border-border-color">
        {tabs.map((tab, index) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`${uid}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${uid}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                selected
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {activeTab && (
        <div
          id={`${uid}-panel-${activeTab.id}`}
          role="tabpanel"
          aria-labelledby={`${uid}-tab-${activeTab.id}`}
          tabIndex={0}
          className="pt-4"
        >
          {activeTab.content}
        </div>
      )}
    </div>
  );
}
