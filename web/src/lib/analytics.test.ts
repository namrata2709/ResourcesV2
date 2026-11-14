import { describe, it, expect, vi, afterEach } from 'vitest';
import { initAnalytics, trackPageView, GA_MEASUREMENT_ID, _resetAnalyticsForTests } from './analytics';

afterEach(() => {
  _resetAnalyticsForTests();
  delete (window as unknown as { gtag?: unknown }).gtag;
  delete (window as unknown as { dataLayer?: unknown }).dataLayer;
  document.head.querySelectorAll('script[src*="googletagmanager"]').forEach((el) => el.remove());
});

describe('lib/analytics', () => {
  it('initAnalytics injects the gtag.js script with the measurement ID', () => {
    initAnalytics();
    const script = document.head.querySelector<HTMLScriptElement>(
      'script[src*="googletagmanager.com/gtag/js"]',
    );
    expect(script).not.toBeNull();
    expect(script!.src).toContain(GA_MEASUREMENT_ID);
  });

  it('initAnalytics configures gtag with send_page_view disabled', () => {
    initAnalytics();
    expect(window.dataLayer).toBeDefined();
    // gtag pushes arrays onto dataLayer; find the 'config' call.
    const configCall = window.dataLayer!.find(
      (entry) => Array.isArray(entry) && entry[0] === 'config',
    ) as unknown[];
    expect(configCall).toEqual([
      'config',
      GA_MEASUREMENT_ID,
      { send_page_view: false },
    ]);
  });

  it('initAnalytics only initializes once', () => {
    initAnalytics();
    initAnalytics();
    const scripts = document.head.querySelectorAll('script[src*="googletagmanager"]');
    expect(scripts.length).toBe(1);
  });

  it('trackPageView sends a page_view event with the given path', () => {
    window.gtag = vi.fn();
    trackPageView('/notes-index/aws', 'AWS Notes');
    expect(window.gtag).toHaveBeenCalledWith('event', 'page_view', expect.objectContaining({
      page_path: '/notes-index/aws',
      page_title: 'AWS Notes',
    }));
  });

  it('trackPageView is a no-op when gtag is unavailable', () => {
    expect(() => trackPageView('/quiz-index')).not.toThrow();
  });
});
