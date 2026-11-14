import { describe, it, expect } from 'vitest';
import { extractTitleAndBullets } from './htmlToBullets';

describe('lib/htmlToBullets', () => {
  it('returns null title and no bullets for null html', () => {
    expect(extractTitleAndBullets(null)).toEqual({ title: null, bullets: [] });
  });

  it('extracts a heading as the title and removes it from the bullet content', () => {
    const result = extractTitleAndBullets('<h1>Welcome</h1><p>Some intro text</p>');
    expect(result.title).toBe('Welcome');
    expect(result.bullets).toEqual(['Some intro text']);
  });

  it('prefers list items over paragraphs when both are present', () => {
    const result = extractTitleAndBullets(
      '<h2>Key Points</h2><ul><li>First point</li><li>Second point</li></ul><p>ignored paragraph</p>',
    );
    expect(result.title).toBe('Key Points');
    expect(result.bullets).toEqual(['First point', 'Second point']);
  });

  it('falls back to one bullet per paragraph when there is no list', () => {
    const result = extractTitleAndBullets('<h3>Concept</h3><p>Paragraph one.</p><p>Paragraph two.</p>');
    expect(result.bullets).toEqual(['Paragraph one.', 'Paragraph two.']);
  });

  it('falls back to remaining text as a single bullet when there are no li/p elements', () => {
    const result = extractTitleAndBullets('<h1>Just a Title</h1><div>Bare div text</div>');
    expect(result.title).toBe('Just a Title');
    expect(result.bullets).toEqual(['Bare div text']);
  });

  it('returns a null title when there is no heading', () => {
    const result = extractTitleAndBullets('<p>No heading here</p>');
    expect(result.title).toBeNull();
    expect(result.bullets).toEqual(['No heading here']);
  });

  it('collapses whitespace and strips inline formatting to plain text', () => {
    const result = extractTitleAndBullets('<h2>Title</h2><ul><li>Bold <strong>word</strong>  and   spaces</li></ul>');
    expect(result.bullets).toEqual(['Bold word and spaces']);
  });

  it('flattens nested list items to one flat bullet list', () => {
    const result = extractTitleAndBullets(
      '<h2>Nested</h2><ul><li>Parent<ul><li>Child</li></ul></li></ul>',
    );
    expect(result.bullets.length).toBe(2);
    expect(result.bullets).toContain('Child');
  });

  it('drops empty bullet strings', () => {
    const result = extractTitleAndBullets('<h2>Title</h2><ul><li>Real</li><li>   </li></ul>');
    expect(result.bullets).toEqual(['Real']);
  });
});
