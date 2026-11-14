import type { CSSProperties } from 'react';
import { useReadingPreferences } from '../../../context/ReadingPreferencesContext';
import {
  FONT_SIZE_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  FONT_FAMILY_OPTIONS,
  WIDTH_OPTIONS,
} from '../../../lib/readingPreferences';
import { registerSettingsSection } from '../registry';

/**
 * ReadingPreferencesSection — P0-8 (Reading Preferences).
 *
 * Font size / line height / font family / content width for note-page
 * body content, layered on top of theme/appearance/accessibility the same
 * way P0-9's Accessibility panel layers on top of P0-2's Appearance —
 * this panel only ever touches the new "readingPreferences" key via
 * useReadingPreferences(), never "theme"/"appearancePrefs"/"a11yPrefs".
 * Same registration shape as every other section here: the
 * registerSettingsSection() call below plus the one-line side-effect
 * import in sections/index.ts is this file's entire integration.
 *
 * These prefs only have a visible effect on a Note page's body-prose
 * content (index.css's `.notes-body-prose` rule is the sole consumer of
 * the CSS vars this section's context sets) — by design, not a gap: see
 * lib/readingPreferences.ts's own header comment.
 */

interface OptionGroupProps<T extends string> {
  legend: string;
  hint?: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  optionStyle?: (value: T) => CSSProperties | undefined;
}

function OptionGroup<T extends string>({ legend, hint, options, value, onChange, optionStyle }: OptionGroupProps<T>) {
  return (
    <div className="space-y-1">
      <span className="block text-sm font-medium text-text-primary">{legend}</span>
      {hint && <p className="text-xs text-text-muted mb-2">{hint}</p>}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={legend}>
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.value)}
              style={optionStyle?.(option.value)}
              className={`
                px-3 py-2 text-sm rounded-lg border transition-colors
                ${isSelected
                  ? 'border-primary bg-bg-card ring-2 ring-primary text-text-primary'
                  : 'border-border-color text-text-secondary hover:border-primary/60'}
              `}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReadingPreferencesSectionPanel() {
  const { prefs, updatePrefs } = useReadingPreferences();

  return (
    <div className="reading-preferences-section space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Reading Preferences</h2>
        <p className="text-sm text-text-secondary">
          Adjust how a note's body text looks — font size, line spacing, typeface, and column width. Applies to note
          pages only.
        </p>
      </div>

      <OptionGroup
        legend="Font size"
        options={FONT_SIZE_OPTIONS}
        value={prefs.fontSize}
        onChange={(fontSize) => updatePrefs({ fontSize })}
      />

      <OptionGroup
        legend="Line height"
        options={LINE_HEIGHT_OPTIONS}
        value={prefs.lineHeight}
        onChange={(lineHeight) => updatePrefs({ lineHeight })}
      />

      <OptionGroup
        legend="Font family"
        options={FONT_FAMILY_OPTIONS}
        value={prefs.fontFamily}
        onChange={(fontFamily) => updatePrefs({ fontFamily })}
        optionStyle={(value) => ({ fontFamily: FONT_FAMILY_OPTIONS.find((o) => o.value === value)?.cssValue })}
      />

      <OptionGroup
        legend="Content width"
        hint="How wide a note's body text column is."
        options={WIDTH_OPTIONS}
        value={prefs.width}
        onChange={(width) => updatePrefs({ width })}
      />
    </div>
  );
}

registerSettingsSection({
  id: 'reading-preferences',
  label: 'Reading Preferences',
  Component: ReadingPreferencesSectionPanel,
});
