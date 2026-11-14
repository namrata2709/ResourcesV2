import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../lib/analytics';

/**
 * useAnalyticsPageView — thin React Router wrapper around
 * lib/analytics.ts's trackPageView(), mounted once near the top of App.tsx
 * (alongside initAnalytics()).
 *
 * React Router doesn't fire a page-view event on client-side navigation
 * the way a full page load does, so without this, every route after the
 * first is invisible to analytics — see lib/analytics.ts's file header.
 *
 * Fires on the initial render AND on every subsequent location change,
 * since useEffect's dependency array covers both cases identically.
 */
export function useAnalyticsPageView(): void {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);
}
