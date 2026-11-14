import { useEffect, useState } from 'react';
import { Logo } from '../Logo';
import { Icon } from '../Icon';
import { dataPath } from '../../lib/siteConfig';

// Hand-drawn Lucide-style stand-ins — used as the `fallback` for the Icon
// component below if public/icons/footer-terms.png or footer-alert.png is
// ever missing. Real masters are in place now (approved batch, see
// ASSET-TODO.md), so these are a safety net, not the primary render path.
function ScrollTextIconFallback() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 21h8a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
      <path d="M19 17V5a2 2 0 0 0-2-2H6" />
      <path d="M9 7h6M9 11h6" />
    </svg>
  );
}

function AlertIconFallback() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

/**
 * Footer — React port of footer.js.
 *
 * Same contract as vanilla:
 *   - optional data-subject disclaimer lookup against disclaimers.json
 *   - omit `subject` entirely on subject-agnostic pages (dashboard, quiz
 *     list) to render with no fetch and no disclaimer, same as vanilla
 *     omitting data-subject
 *
 * Branding applied per T3-1 (not deferred): logo mark + gradient link
 * styling, Poppins throughout.
 */

interface FooterProps {
  /** Same meaning as footer.js's data-subject attribute. Omit for none. */
  subject?: string;
}

async function fetchDisclaimer(subject: string | undefined): Promise<string | null> {
  if (!subject) return null;
  try {
    const res = await fetch(dataPath('config', 'disclaimers.json'));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.disclaimers?.[subject] ?? null;
  } catch (error) {
    console.error('Error loading disclaimers:', error);
    return null;
  }
}

export function Footer({ subject }: FooterProps) {
  const [disclaimer, setDisclaimer] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDisclaimer(subject).then((text) => {
      if (!cancelled) setDisclaimer(text);
    });
    return () => {
      cancelled = true;
    };
  }, [subject]);

  const year = new Date().getFullYear();

  return (
    <footer className="content-footer border-t border-border-color bg-bg-secondary font-poppins">
      <div className="footer-container max-w-5xl mx-auto px-6 py-8 grid gap-8 sm:grid-cols-2">
        {/* Brand block — new this ticket: logo mark + copyright/license */}
        <div className="footer-block space-y-2">
          <Logo variant="horizontal" size={88} />
          <p className="footer-copyright text-sm text-text-secondary">
            © {year} Namrata Mulwani. All rights reserved.
          </p>
          <p className="footer-license text-sm text-text-muted">
            Licensed under{' '}
            <a
              href="https://creativecommons.org/licenses/by-nc/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-accent underline underline-offset-2"
            >
              CC BY-NC 4.0
            </a>
          </p>
        </div>

        {/* Usage terms */}
        <div className="footer-block space-y-2">
          <h4 className="footer-heading font-semibold text-text-primary flex items-center gap-1.5">
            <Icon name="footer-terms" size={16} fallback={<ScrollTextIconFallback />} /> Usage Terms
          </h4>
          <ul className="footer-list text-sm text-text-secondary space-y-1 list-disc list-inside">
            <li>
              <strong>You are free to:</strong> Share and adapt this material for educational purposes.
            </li>
            <li>
              <strong>You must:</strong> Give appropriate credit and link to the license.
            </li>
            <li>
              <strong>You cannot:</strong> Use this material for commercial purposes without permission.
            </li>
          </ul>
          <p className="footer-contact text-sm text-text-muted">
            For commercial licensing:{' '}
            <a
              href="mailto:awslecturenotes@gmail.com"
              className="text-primary hover:text-accent underline underline-offset-2"
            >
              awslecturenotes@gmail.com
            </a>
          </p>
        </div>

        {disclaimer && (
          <div className="footer-disclaimer sm:col-span-2 rounded-lg bg-bg-card border border-border-color p-4 text-sm text-text-secondary flex gap-2">
            <span className="text-accent shrink-0 mt-0.5">
              <Icon name="footer-alert" size={16} fallback={<AlertIconFallback />} />
            </span>
            <span>
              <strong className="text-text-primary">Disclaimer:</strong> {disclaimer}
            </span>
          </div>
        )}
      </div>
    </footer>
  );
}
