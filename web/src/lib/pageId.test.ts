import { describe, it, expect } from 'vitest';
import { getPageId } from './pageId';

describe('lib/pageId', () => {
  it('returns "home" for the root path', () => {
    expect(getPageId('/')).toBe('home');
    expect(getPageId('')).toBe('home');
  });

  it('strips leading and trailing slashes', () => {
    expect(getPageId('/settings/')).toBe('settings');
    expect(getPageId('settings')).toBe('settings');
  });

  it('joins nested path segments with a double dash', () => {
    expect(getPageId('/notes-index/aws')).toBe('notes-index--aws');
    expect(getPageId('/quiz/aws-vpc-basics')).toBe('quiz--aws-vpc-basics');
  });

  it('lowercases the result', () => {
    expect(getPageId('/Quiz/AWS-VPC')).toBe('quiz--aws-vpc');
  });

  it('collapses repeated slashes', () => {
    expect(getPageId('//notes-index///aws//')).toBe('notes-index--aws');
  });

  it('is stable for the same path across calls', () => {
    expect(getPageId('/gallery')).toBe(getPageId('/gallery'));
  });

  it('is independent of query strings (callers pass pathname only)', () => {
    // getPageId only ever receives location.pathname (see usePageId.ts),
    // which never includes a query string, but confirm directly that a
    // literal "?" isn't treated specially if one somehow appears.
    expect(getPageId('/notes-index')).not.toBe(getPageId('/notes-index?q=vpc'));
  });
});
