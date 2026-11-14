import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { PageMeta } from './PageMeta';

/**
 * Covers the T3-2a testing spec: "PageMeta sets the correct
 * <title>/canonical for a given route, confirmed different between at
 * least two routes (guards against a static default that never actually
 * updates)".
 */

afterEach(() => {
  cleanup();
  document.title = '';
  document.head.querySelector('link[rel="canonical"]')?.remove();
  document.head.querySelector('meta[name="description"]')?.remove();
});

describe('PageMeta', () => {
  it('sets the document title and canonical link for one route', () => {
    render(
      <PageMeta
        title="EC2 Basics"
        description="Notes on EC2 fundamentals."
        canonicalPath="/notes-index/aws"
      />,
    );

    expect(document.title).toBe('EC2 Basics · Notebook Buddy');
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    expect(canonical?.href).toContain('/notes-index/aws');
  });

  it('produces a different title/canonical for a different route', () => {
    const { unmount } = render(
      <PageMeta title="EC2 Basics" canonicalPath="/notes-index/aws" />,
    );
    const firstTitle = document.title;
    const firstCanonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    )?.href;
    unmount();

    render(<PageMeta title="Merge Sort" canonicalPath="/notes-index/dsa" />);
    const secondTitle = document.title;
    const secondCanonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    )?.href;

    expect(secondTitle).not.toBe(firstTitle);
    expect(secondCanonical).not.toBe(firstCanonical);
    expect(secondTitle).toBe('Merge Sort · Notebook Buddy');
    expect(secondCanonical).toContain('/notes-index/dsa');
  });

  it('sets description and og:description when provided', () => {
    render(<PageMeta title="Quiz Index" description="Test your AWS knowledge." />);
    const desc = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    const ogDesc = document.head.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    expect(desc?.content).toBe('Test your AWS knowledge.');
    expect(ogDesc?.content).toBe('Test your AWS knowledge.');
  });
});
