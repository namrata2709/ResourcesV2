import { useState } from 'react';
// Imported once, for its side effects only — each registered section calls
// registerSettingsSection() at module scope when this barrel pulls it in.
// See sections/index.ts for how a ticket adds a section.
import './sections';
import { getSettingsSections } from './registry';
import { PageMeta } from '../../components/PageMeta';

/**
 * Settings — shared settings page (P0-0).
 *
 * Built once so P0-1/P0-2/P0-7/P0-8/P0-9 each register a section instead of
 * building their own separate settings surface (modal, inline Dashboard
 * toggle, etc.) — see P0-0's ticket for the duplication this avoids.
 *
 * Deliberately a real route, not a modal: appearance/accessibility settings
 * aren't Dashboard content, and a modal gets cramped past two fields.
 *
 * Must render correctly with zero sections registered (P0-0 lands before
 * any section-owning ticket is picked up) — see the emptyState branch.
 */
export function Settings() {
  const sections = getSettingsSections();
  const [activeId, setActiveId] = useState<string | undefined>(sections[0]?.id);

  const active = sections.find((section) => section.id === activeId) ?? sections[0];

  return (
    <div className="settings-page font-poppins">
      <PageMeta title="Settings" description="Manage your profile, appearance, and accessibility preferences." canonicalPath="/settings" />
      <header className="max-w-5xl mx-auto px-6 pt-10 pb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        {sections.length === 0 ? (
          <p className="text-text-secondary">No settings available yet.</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-8">
            <nav aria-label="Settings sections" className="sm:w-48 shrink-0">
              <ul className="flex sm:flex-col gap-1 flex-wrap">
                {sections.map((section) => {
                  const isActive = section.id === active?.id;
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        onClick={() => setActiveId(section.id)}
                        aria-current={isActive ? 'true' : undefined}
                        className={`
                          w-full text-left px-3 py-2 rounded-md text-sm transition-colors
                          ${isActive
                            ? 'bg-bg-card text-primary font-medium border border-border-color'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-card/60'}
                        `}
                      >
                        {section.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="flex-1 min-w-0">
              {active && <active.Component />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
