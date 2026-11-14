/**
 * lib/liveRegion.ts
 *
 * Framework-agnostic ARIA live-region announcer. Per src/lib/README.md's
 * forward-compat note: this is the ONE live-region implementation the
 * React app uses — T3-2/T4-1/T5-1 all import useLiveRegion() (see
 * src/hooks/useLiveRegion.ts) instead of building their own.
 *
 * This consolidates a pattern the vanilla site never actually shared:
 * notes-accessibility.js, quiz-engine.js, and gallery.js each built their
 * own independent live-region div (audit-findings.md Finding 13). The
 * React port fixes that at the root instead of porting the duplication.
 *
 * A single #app-live-region div is created once and reused — creating a
 * fresh node per announcement is unnecessary and risks screen readers
 * missing rapid-fire announcements if the node itself keeps getting
 * replaced.
 */

const LIVE_REGION_ID = 'app-live-region';

/**
 * Creates the shared live-region node if it doesn't already exist, and
 * returns it. Exported (not just used internally by announceToLiveRegion)
 * so useLiveRegion() can call this eagerly on mount — a live region
 * needs to already exist in the DOM with its aria-live attribute in place
 * *before* the first announcement, not get created in the same tick as
 * that first announcement. Some screen readers won't reliably pick up
 * content changes on a node that's brand new to the accessibility tree.
 */
export function ensureLiveRegion(): HTMLElement {
  let node = document.getElementById(LIVE_REGION_ID);
  if (!node) {
    node = document.createElement('div');
    node.id = LIVE_REGION_ID;
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.setAttribute('aria-atomic', 'true');
    // Visually hidden but readable by assistive tech — same intent as
    // notes.css's .sr-only pattern, kept inline so this module has no
    // stylesheet dependency of its own.
    Object.assign(node.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      border: '0',
    });
    document.body.appendChild(node);
  }
  return node;
}

/**
 * Announces a message to screen readers via a shared polite live region.
 * Clears and re-sets the text on a microtask delay so identical consecutive
 * messages are still announced (some screen readers ignore a live-region
 * update if the text content doesn't change).
 */
export function announceToLiveRegion(message: string): void {
  if (!message) return;
  const node = ensureLiveRegion();
  node.textContent = '';
  window.setTimeout(() => {
    node.textContent = message;
  }, 50);
}
