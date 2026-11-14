import { describe, it, expect } from 'vitest';
import { parseLinkProfile, isLinkProfileSlug, ACTIVE_LINK_PROFILE_SLUGS } from './links';

const SAMPLE = `---
name: Namu
title: Instructor & Course Creator
description: Welcome! Here's where to find everything for this course.
avatar: /assets/profiles/namu.jpg
social:
  github: https://github.com/namu
  linkedin: https://linkedin.com/in/namu
---

## Resources

- [AWS Notes](https://example.com/aws): Full notes for the AWS course
- [DSA Notes](https://example.com/dsa): Full notes for the DSA course

> Next live session: Saturday 10:00 AM

## Community

- [Discord](https://example.com/discord): Join the community
<!-- - [Old Slack](https://example.com/slack): Retired, kept for reference -->
`;

describe('parseLinkProfile', () => {
  it('parses frontmatter into profile metadata', () => {
    const profile = parseLinkProfile(SAMPLE);
    expect(profile.name).toBe('Namu');
    expect(profile.title).toBe('Instructor & Course Creator');
    expect(profile.avatar).toBe('/assets/profiles/namu.jpg');
    expect(profile.social).toEqual({
      github: 'https://github.com/namu',
      linkedin: 'https://linkedin.com/in/namu',
    });
  });

  it('turns each ## heading into a section, in document order', () => {
    const profile = parseLinkProfile(SAMPLE);
    expect(profile.sections.map((s) => s.heading)).toEqual(['Resources', 'Community']);
  });

  it('parses "- [Title](URL): Description" lines into link blocks', () => {
    const profile = parseLinkProfile(SAMPLE);
    expect(profile.sections[0].blocks[0]).toEqual({
      type: 'link',
      title: 'AWS Notes',
      url: 'https://example.com/aws',
      description: 'Full notes for the AWS course',
    });
  });

  it('parses "> text" lines into announcement blocks', () => {
    const profile = parseLinkProfile(SAMPLE);
    expect(profile.sections[0].blocks[2]).toEqual({
      type: 'announcement',
      text: 'Next live session: Saturday 10:00 AM',
    });
  });

  it('hides a line wrapped in an HTML comment instead of deleting it', () => {
    const profile = parseLinkProfile(SAMPLE);
    const community = profile.sections[1];
    expect(community.blocks).toHaveLength(1);
    expect(community.blocks[0]).toMatchObject({ title: 'Discord' });
  });

  it('throws on a file missing its frontmatter fence', () => {
    expect(() => parseLinkProfile('## Resources\n- [X](y): z')).toThrow(/frontmatter/);
  });
});

describe('isLinkProfileSlug', () => {
  it('accepts every active slug', () => {
    for (const slug of ACTIVE_LINK_PROFILE_SLUGS) {
      expect(isLinkProfileSlug(slug)).toBe(true);
    }
  });

  it('rejects an unknown slug', () => {
    expect(isLinkProfileSlug('not-a-real-profile')).toBe(false);
  });
});
