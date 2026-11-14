/**
 * lib/moduleRegistry.ts — T5-3c-1's module tag registry.
 *
 * A note page is built from several independent modules (body-prose,
 * MCQ, checklist, glossary, interview-prep, and — for DSA notes —
 * visualisation/implementation/LeetCode/contest/visual-MCQ). Two real
 * features need to know, per module, "is this core reading content or
 * something extra": Lite Mode (hide everything but core content) and
 * the print picker (T5-3c-2's Tools > Print, not yet built).
 *
 * Ticket instruction, explicit: "one source, not two lists that can
 * drift." So the tag lives here, in `lib/`, not inside Note.tsx or
 * duplicated between a Lite Mode check and a print check — the same
 * class of bug T3-7b is separately cleaning up (12 scattered
 * `if subject ==` checks instead of one registry read). When T5-3c-2
 * builds the print picker, it should read MODULE_TAGS directly rather
 * than write its own categorization list.
 *
 * Three tags, deliberately not a boolean:
 *   - 'core'        — the note's actual reading content. Always visible
 *                      in Lite Mode. Body-prose (headings/paragraphs/
 *                      callouts/etc.) and the glossary (reference
 *                      material, not an interactive check) both qualify
 *                      — neither asks anything of the reader.
 *   - 'interactive'  — anything with its own answer/check/toggle state
 *                      (MCQ, visual MCQ, checklist, interview-prep
 *                      reveal cards, the DSA visualisation/animation
 *                      panel, the DSA implementation code-tabs). Hidden
 *                      in Lite Mode — that's the point of a lite,
 *                      read-only pass.
 *   - 'links'        — external link lists with no content of their own
 *                      beyond the links (LeetCode problems, contest
 *                      problems + YouTube recommendations). Hidden in
 *                      Lite Mode for the same reason as 'interactive':
 *                      not something to read top-to-bottom.
 */

export type ModuleTag = 'core' | 'interactive' | 'links';

export type ModuleId =
  | 'bodyProse'
  | 'mcq'
  | 'checklist'
  | 'glossary'
  | 'interview'
  | 'visualisation'
  | 'implementation'
  | 'leetcode'
  | 'contest'
  | 'visualMcq';

export const MODULE_TAGS: Record<ModuleId, ModuleTag> = {
  bodyProse: 'core',
  glossary: 'core',
  mcq: 'interactive',
  checklist: 'interactive',
  interview: 'interactive',
  visualMcq: 'interactive',
  implementation: 'interactive',
  visualisation: 'interactive',
  leetcode: 'links',
  contest: 'links',
};

/** Whether this module should still render while Lite Mode is on. Only
 * 'core' modules stay visible — 'interactive' and 'links' both hide. */
export function isLiteModeVisible(moduleId: ModuleId): boolean {
  return MODULE_TAGS[moduleId] === 'core';
}
