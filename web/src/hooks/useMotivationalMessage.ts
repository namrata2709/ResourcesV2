import { useState } from 'react';
import { getNextMessage, type MotivationalMessage } from '../lib/motivationalMessages';

/**
 * useMotivationalMessage — P2-4. Thin React wrapper around
 * lib/motivationalMessages.ts, same shape as useAchievements.ts.
 *
 * Draws exactly once, in useState's lazy initializer, so remounting
 * MotivationalWidget within the same render tree (e.g. React strict
 * double-invoke in dev) doesn't burn two draws for one real visit —
 * same "draw on real mount, not on every render" discipline
 * useDailyGoal.ts's ticker is careful about elsewhere.
 */
export function useMotivationalMessage(): MotivationalMessage {
  const [message] = useState<MotivationalMessage>(() => getNextMessage());
  return message;
}
