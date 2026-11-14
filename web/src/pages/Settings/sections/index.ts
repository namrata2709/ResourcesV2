/**
 * sections/index.ts — the ONLY file a settings-owning ticket touches to
 * plug a section into /settings. Each import below is a side effect: the
 * section module calls registerSettingsSection(...) at module scope (see
 * ProfileSection.tsx), so importing it here is the entire integration.
 *
 * Settings.tsx never imports section files directly — it imports this
 * barrel once and reads the registry. That's what keeps "add a section"
 * a one-line change instead of a page-code change.
 *
 * P0-1 (Personal Profile) registers here:
 */
import './ProfileSection';
import './AppearanceSection';
import './QuickActionsSection';
import './AccessibilitySection';
import './ReadingPreferencesSection';
import './DataBackupSection';
import './OfflineReadingSection';
