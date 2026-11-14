import { useLocation } from 'react-router-dom';
import { getPageId } from '../lib/pageId';

/**
 * usePageId — thin React wrapper around lib/pageId.ts, same shape as
 * useAppearance()/AppearanceContext for P0-2. Reads the current route's
 * pathname via useLocation() (already basename-relative under
 * BrowserRouter's `basename="/ResourcesV2"`, per main.tsx) and derives the
 * stable id every `<pageId>-<feature>` consumer keys off.
 */
export function usePageId(): string {
  const location = useLocation();
  return getPageId(location.pathname);
}
