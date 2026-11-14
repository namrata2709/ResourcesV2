/**
 * ViewModeToggle — generic over whatever it's toggling, per T3-2a's
 * genericity requirement. Takes its own list of modes as config (icon +
 * label + value) rather than hardcoding "grid/list" — NotesIndex uses
 * grid+list, a future page could add compact without touching this
 * component.
 */

import type { ReactNode } from 'react';

export interface ViewMode<T extends string = string> {
  value: T;
  label: string;
  /** An emoji string, or a ReactNode (e.g. a themed lucide-react icon). Per the icon strategy: lucide-react is the real build, emoji is the fallback. */
  icon: ReactNode;
}

interface ViewModeToggleProps<T extends string> {
  modes: ViewMode<T>[];
  current: T;
  onChange: (mode: T) => void;
  className?: string;
}

export function ViewModeToggle<T extends string>({ modes, current, onChange, className = '' }: ViewModeToggleProps<T>) {
  return (
    <div
      className={`view-mode-toggle flex rounded-full border border-border-color p-0.5 ${className}`}
      role="group"
      aria-label="View mode"
    >
      {modes.map((mode) => (
        <button
          key={mode.value}
          type="button"
          onClick={() => onChange(mode.value)}
          aria-label={mode.label}
          aria-pressed={current === mode.value}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            current === mode.value ? 'bg-primary text-white' : 'text-text-secondary'
          }`}
        >
          <span aria-hidden="true">{mode.icon}</span> {mode.label}
        </button>
      ))}
    </div>
  );
}
