import { useAppearance } from '../../../context/AppearanceContext';
import { ACCENT_SWATCHES, RADIUS_OPTIONS, type Density } from '../../../lib/appearance';
import { registerSettingsSection } from '../registry';

/**
 * AppearanceSection — P0-2 (Extended Theme & Appearance).
 *
 * Layers accent color / card radius / density / animations on top of the
 * existing light/dark/comfort theme cycle (see ThemeToggle for that) —
 * this panel never touches theme.ts's "theme" key, only the new
 * "appearancePrefs" one via useAppearance(). Same registration shape as
 * ProfileSection.tsx: the registerSettingsSection() call below plus the
 * one-line side-effect import in sections/index.ts is this file's entire
 * integration with /settings.
 */

const DENSITY_OPTIONS: { value: Density; label: string; hint: string }[] = [
  { value: 'comfortable', label: 'Comfortable', hint: 'More breathing room' },
  { value: 'compact', label: 'Compact', hint: 'Tighter spacing, more on screen' },
];

function AppearanceSectionPanel() {
  const { prefs, updatePrefs } = useAppearance();

  return (
    <div className="appearance-section space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Appearance</h2>
        <p className="text-sm text-text-secondary">
          Fine-tune accent color, card shape, spacing, and motion — on top of your light/dark/comfort theme.
        </p>
      </div>

      {/* Accent color */}
      <div className="space-y-1">
        <span className="block text-sm font-medium text-text-primary">Accent color</span>
        <p className="text-xs text-text-muted mb-2">Overrides the theme's default accent. Doesn't change your theme.</p>
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Accent color">
          <button
            type="button"
            role="radio"
            aria-checked={prefs.accent === 'theme'}
            onClick={() => updatePrefs({ accent: 'theme' })}
            className={`
              h-9 px-3 rounded-full text-xs font-medium border transition-colors
              ${prefs.accent === 'theme'
                ? 'border-primary bg-bg-card ring-2 ring-primary text-text-primary'
                : 'border-border-color text-text-secondary hover:border-primary/60'}
            `}
          >
            Theme default
          </button>
          {ACCENT_SWATCHES.map((hex) => {
            const isSelected = prefs.accent === hex;
            return (
              <button
                key={hex}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`Accent ${hex}`}
                onClick={() => updatePrefs({ accent: hex })}
                style={{ backgroundColor: hex }}
                className={`
                  h-9 w-9 rounded-full border-2 transition-transform
                  ${isSelected ? 'border-text-primary scale-110' : 'border-transparent hover:scale-105'}
                `}
              />
            );
          })}
          <label className="inline-flex items-center gap-2 text-xs text-text-muted">
            Custom
            <input
              type="color"
              aria-label="Custom accent color"
              value={prefs.accent === 'theme' ? '#7c4dff' : prefs.accent}
              onChange={(e) => updatePrefs({ accent: e.target.value })}
              className="h-8 w-10 rounded border border-border-color bg-transparent p-0.5"
            />
          </label>
        </div>
      </div>

      {/* Card radius */}
      <div className="space-y-1">
        <span className="block text-sm font-medium text-text-primary">Card radius</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Card radius">
          {RADIUS_OPTIONS.map((option) => {
            const isSelected = prefs.radius === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => updatePrefs({ radius: option.value })}
                className={`
                  px-3 py-2 text-sm border transition-colors
                  ${isSelected
                    ? 'border-primary bg-bg-card ring-2 ring-primary text-text-primary'
                    : 'border-border-color text-text-secondary hover:border-primary/60'}
                `}
                style={{ borderRadius: option.cssValue }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Density */}
      <div className="space-y-1">
        <span className="block text-sm font-medium text-text-primary">Density</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Density">
          {DENSITY_OPTIONS.map((option) => {
            const isSelected = prefs.density === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => updatePrefs({ density: option.value })}
                className={`
                  flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-left border transition-colors
                  ${isSelected
                    ? 'border-primary bg-bg-card ring-2 ring-primary'
                    : 'border-border-color hover:border-primary/60'}
                `}
              >
                <span className="text-sm font-medium text-text-primary">{option.label}</span>
                <span className="text-xs text-text-muted">{option.hint}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Animations */}
      <div className="space-y-1">
        <label htmlFor="appearance-animations" className="flex items-center justify-between max-w-sm gap-4 cursor-pointer">
          <span>
            <span className="block text-sm font-medium text-text-primary">Animations</span>
            <span className="block text-xs text-text-muted">Hover, transition, and motion effects</span>
          </span>
          <input
            id="appearance-animations"
            type="checkbox"
            role="switch"
            aria-checked={prefs.animations}
            checked={prefs.animations}
            onChange={(e) => updatePrefs({ animations: e.target.checked })}
            className="h-5 w-9 accent-primary"
          />
        </label>
      </div>
    </div>
  );
}

registerSettingsSection({
  id: 'appearance',
  label: 'Appearance',
  Component: AppearanceSectionPanel,
});
