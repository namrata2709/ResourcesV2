import { useEffect, useState } from 'react';
import { useA11y } from '../../../context/A11yContext';
import { getShortcuts, subscribeShortcuts, type ShortcutEntry } from '../../../lib/keyboardShortcuts';
import { registerSettingsSection } from '../registry';

/**
 * AccessibilitySection — P0-9 (Accessibility options), registered into
 * P0-0's shared Settings page. Same registration shape as
 * AppearanceSection.tsx: the registerSettingsSection() call below plus the
 * one-line side-effect import in sections/index.ts is this file's entire
 * integration.
 *
 * Five real toggles (high contrast, reduced motion, focus mode,
 * dyslexia-friendly font, larger UI) live in lib/a11y.ts's "a11yPrefs" key,
 * applied to <html> as data-* attributes by A11yContext — see that file's
 * doc comments for exactly what each attribute does in index.css.
 *
 * "Keyboard shortcuts reference" is deliberately NOT a toggle — it's a
 * live read-only list sourced from the same lib/keyboardShortcuts.ts
 * registry KeyboardShortcutsPanel already reads, so this section never
 * drifts from what "?" actually shows. Nothing here duplicates that
 * registry or its listener wiring.
 */

interface ToggleRowProps {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ id, label, hint, checked, onChange }: ToggleRowProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-center justify-between max-w-sm gap-4 cursor-pointer rounded-lg border border-border-color bg-bg-card px-3 py-2"
    >
      <span>
        <span className="block text-sm font-medium text-text-primary">{label}</span>
        <span className="block text-xs text-text-muted">{hint}</span>
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-9 accent-primary shrink-0"
      />
    </label>
  );
}

function AccessibilitySectionPanel() {
  const { prefs, updatePrefs } = useA11y();
  const [shortcuts, setShortcuts] = useState<ShortcutEntry[]>(getShortcuts());

  // Live-updating, not a snapshot: whatever's registered right now on
  // whichever page you were just on, same source KeyboardShortcutsPanel
  // itself reads.
  useEffect(() => subscribeShortcuts(() => setShortcuts(getShortcuts())), []);

  return (
    <div className="accessibility-section space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Accessibility</h2>
        <p className="text-sm text-text-secondary">
          Adjust contrast, motion, focus visibility, and typography — on top of your theme and appearance choices.
        </p>
      </div>

      <div className="flex flex-col gap-2 max-w-sm">
        <ToggleRow
          id="a11y-high-contrast"
          label="High contrast"
          hint="Stronger text, border, and shadow contrast"
          checked={prefs.highContrast}
          onChange={(checked) => updatePrefs({ highContrast: checked })}
        />
        <ToggleRow
          id="a11y-reduced-motion"
          label="Reduced motion"
          hint="Turns off animations and transitions"
          checked={prefs.reducedMotion}
          onChange={(checked) => updatePrefs({ reducedMotion: checked })}
        />
        <ToggleRow
          id="a11y-focus-mode"
          label="Focus mode"
          hint="Bigger, higher-contrast focus outlines"
          checked={prefs.focusMode}
          onChange={(checked) => updatePrefs({ focusMode: checked })}
        />
        <ToggleRow
          id="a11y-dyslexia-font"
          label="Dyslexia-friendly font"
          hint="Switches body text to a dyslexia-friendly typeface"
          checked={prefs.dyslexiaFont}
          onChange={(checked) => updatePrefs({ dyslexiaFont: checked })}
        />
        <ToggleRow
          id="a11y-larger-ui"
          label="Larger UI"
          hint="Increases text and control size across the app"
          checked={prefs.largerUI}
          onChange={(checked) => updatePrefs({ largerUI: checked })}
        />
      </div>

      <p className="text-xs text-text-muted max-w-sm">
        Your device's reduced-motion setting is always honored automatically, whether or not the toggle above is on.
      </p>

      <div className="space-y-2 max-w-sm">
        <h3 className="text-sm font-medium text-text-primary">Keyboard shortcuts</h3>
        <p className="text-xs text-text-muted">
          Press <kbd className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border-color font-mono text-[0.7rem]">?</kbd> anywhere to open this list. Shown here for reference — it reflects whatever page you were last on.
        </p>
        {shortcuts.length === 0 ? (
          <p className="text-xs text-text-muted italic">No shortcuts are currently active.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 rounded-lg border border-border-color bg-bg-card px-3 py-2">
            {shortcuts.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-text-secondary">{s.description}</span>
                <kbd className="px-2 py-0.5 rounded bg-bg-secondary border border-border-color text-text-primary font-mono text-xs">
                  {s.keyLabel}
                </kbd>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

registerSettingsSection({
  id: 'accessibility',
  label: 'Accessibility',
  Component: AccessibilitySectionPanel,
});
