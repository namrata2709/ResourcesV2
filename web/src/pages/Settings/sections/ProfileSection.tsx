import { useProfile } from '../../../context/ProfileContext';
import { registerSettingsSection } from '../registry';

/**
 * ProfileSection — P0-1 (Personal Profile).
 *
 * Originally scoped as its own standalone settings panel; folded into the
 * shared /settings page once P0-0 introduced the section registry, so this
 * file's only integration point is the registerSettingsSection() call
 * below plus the one-line import in sections/index.ts — no routing or
 * App.tsx changes of its own.
 */

const AVATAR_OPTIONS = ['👋', '🎓', '🚀', '🦉', '🐢', '🌱', '⚡', '📚'];

function ProfileSectionPanel() {
  const { profile, updateProfile } = useProfile();

  return (
    <div className="profile-section space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Profile</h2>
        <p className="text-sm text-text-secondary">
          Shown on your dashboard greeting.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="profile-name" className="block text-sm font-medium text-text-primary">
          Name
        </label>
        <input
          id="profile-name"
          type="text"
          value={profile.name}
          onChange={(e) => updateProfile({ name: e.target.value })}
          placeholder="Your name"
          className="w-full max-w-sm rounded-md border border-border-color bg-bg-card px-3 py-2 text-sm text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />
      </div>

      <div className="space-y-1">
        <span className="block text-sm font-medium text-text-primary">Avatar</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Avatar">
          {AVATAR_OPTIONS.map((emoji) => {
            const isSelected = profile.avatar === emoji;
            return (
              <button
                key={emoji}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`Avatar ${emoji}`}
                onClick={() => updateProfile({ avatar: emoji })}
                className={`
                  h-10 w-10 rounded-full flex items-center justify-center text-lg
                  border transition-colors
                  ${isSelected
                    ? 'border-primary bg-bg-card ring-2 ring-primary'
                    : 'border-border-color hover:border-primary/60'}
                `}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="profile-greeting" className="block text-sm font-medium text-text-primary">
          Greeting
        </label>
        <input
          id="profile-greeting"
          type="text"
          value={profile.greeting}
          onChange={(e) => updateProfile({ greeting: e.target.value })}
          placeholder="Good {timeOfDay}{name}"
          className="w-full max-w-sm rounded-md border border-border-color bg-bg-card px-3 py-2 text-sm text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />
        <p className="text-xs text-text-muted">
          Use <code>{'{timeOfDay}'}</code> and <code>{'{name}'}</code> as placeholders.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="profile-goal" className="block text-sm font-medium text-text-primary">
          Study goal <span className="text-text-muted font-normal">(optional)</span>
        </label>
        <input
          id="profile-goal"
          type="text"
          value={profile.goal}
          onChange={(e) => updateProfile({ goal: e.target.value })}
          placeholder="e.g. Finish the AWS SAA track by September"
          className="w-full max-w-sm rounded-md border border-border-color bg-bg-card px-3 py-2 text-sm text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        />
      </div>
    </div>
  );
}

registerSettingsSection({
  id: 'profile',
  label: 'Profile',
  Component: ProfileSectionPanel,
});
