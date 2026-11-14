/**
 * pages/Note/LiteModeSection.tsx — T5-3c-1.
 *
 * Every Note module (McqModule, ChecklistModule, LeetCodeModule, etc.)
 * is rendered wrapped in this component instead of being conditionally
 * rendered inline in Note.tsx. That's deliberate, not just a style
 * choice: the whole point of "one registry drives Lite Mode" is that
 * Note.tsx never has to know or check each module's tag itself — it
 * just names which module a child is (`moduleId`) and this component
 * looks the tag up in lib/moduleRegistry.ts.
 *
 * Hides the WHOLE section, not just the module's inner content — this
 * is the specific bug the ticket calls out as already fixed once in
 * vanilla and not to be regressed here: a module that renders its own
 * heading/chrome before checking Lite Mode would leave an empty,
 * orphaned header behind when Lite Mode hides its body. Returning
 * `null` before the child ever renders avoids that outright, rather
 * than relying on each module to hide its own heading correctly.
 */

import type { ReactNode } from 'react';
import { isLiteModeVisible, MODULE_TAGS, type ModuleId } from '../../lib/moduleRegistry';

interface LiteModeSectionProps {
  moduleId: ModuleId;
  liteMode: boolean;
  children: ReactNode;
}

export function LiteModeSection({ moduleId, liteMode, children }: LiteModeSectionProps) {
  if (liteMode && !isLiteModeVisible(moduleId)) return null;
  // data-module-tag: read by index.css's `.print-core-only` rule
  // (T5-3c-2's Tools > Print "Notes only" mode) so print categorization
  // comes from this same registry rather than a second, separately
  // maintained list — the exact thing moduleRegistry.ts's own header
  // comment asks for. Plain block-level div, no styling of its own, so
  // it doesn't change what LiteModeSection.test.tsx already asserts
  // about hidden vs. visible children.
  return <div data-module-tag={MODULE_TAGS[moduleId]}>{children}</div>;
}
