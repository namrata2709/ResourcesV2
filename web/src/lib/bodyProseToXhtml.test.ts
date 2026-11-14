import { describe, it, expect } from 'vitest';
import { blocksToXhtml, convertBlockToXhtml } from './bodyProseToXhtml';
import type { BodyProseBlock, BodyProseRun } from '../pages/Note/types';

const run = (text: string, mark: BodyProseRun['mark'] = null, url?: string): BodyProseRun =>
  url ? { text, mark, url } : { text, mark };

describe('lib/bodyProseToXhtml', () => {
  it('renders a heading with its id preserved', () => {
    const block: BodyProseBlock = { type: 'heading', level: 2, id: 'intro', text: [run('Introduction')] };
    expect(convertBlockToXhtml(block)).toBe('<h2 id="intro">Introduction</h2>');
  });

  it('renders a paragraph with inline marks as real tags', () => {
    const block: BodyProseBlock = {
      type: 'paragraph',
      runs: [run('This is '), run('bold', 'bold'), run(' and '), run('italic', 'italic'), run(' text.')],
    };
    const html = convertBlockToXhtml(block);
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
  });

  it('renders an unordered and ordered list', () => {
    const ul: BodyProseBlock = { type: 'list', ordered: false, items: [[run('First')], [run('Second')]] };
    const ol: BodyProseBlock = { type: 'list', ordered: true, items: [[run('Step one')]] };
    expect(convertBlockToXhtml(ul)).toContain('<ul>');
    expect(convertBlockToXhtml(ul)).toContain('<li>First</li>');
    expect(convertBlockToXhtml(ol)).toContain('<ol>');
  });

  it('renders a table with header and body rows', () => {
    const block: BodyProseBlock = {
      type: 'table',
      headers: ['Name', 'Value'],
      rows: [[[run('a')], [run('1')]]],
    };
    const html = convertBlockToXhtml(block);
    expect(html).toContain('<th>Name</th>');
    expect(html).toContain('<td>a</td>');
  });

  it('renders a code block with escaped content, no interpreted marks', () => {
    const block: BodyProseBlock = { type: 'code', lang: 'js', code: 'if (a < b) { return "x"; }' };
    const html = convertBlockToXhtml(block);
    expect(html).toContain('&lt;');
    expect(html).toContain('&quot;');
    expect(html).toMatch(/<pre><code>.*<\/code><\/pre>/s);
  });

  it('renders a callout with its label', () => {
    const block: BodyProseBlock = { type: 'callout', kind: 'warning', runs: [run('Be careful')] };
    const html = convertBlockToXhtml(block);
    expect(html).toContain('Warning:');
    expect(html).toContain('Be careful');
    expect(html).toContain('class="callout"');
  });

  it('renders a link run as a real anchor', () => {
    const block: BodyProseBlock = {
      type: 'paragraph',
      runs: [run('See ', null), run('AWS docs', 'link', 'https://aws.amazon.com')],
    };
    const html = convertBlockToXhtml(block);
    expect(html).toContain('<a href="https://aws.amazon.com">AWS docs</a>');
  });

  it('renders a collapsible as a flattened heading + children, in order', () => {
    const block: BodyProseBlock = {
      type: 'collapsible',
      level: 3,
      id: 'deep-dive',
      heading: 'Deep Dive',
      open: false,
      children: [{ type: 'paragraph', runs: [run('nested content')] }],
    };
    const html = convertBlockToXhtml(block);
    expect(html).toContain('<h3 id="deep-dive">Deep Dive</h3>');
    expect(html).toContain('nested content');
    expect(html.indexOf('Deep Dive')).toBeLessThan(html.indexOf('nested content'));
  });

  it('renders an image block as an italic placeholder, not an embedded image', () => {
    const block: BodyProseBlock = { type: 'image', filename: 'diagram.png', caption: 'System overview' };
    const html = convertBlockToXhtml(block);
    expect(html).toContain('[Image: diagram.png');
    expect(html).toContain('System overview');
    expect(html).not.toContain('<img');
  });

  it('treats code_tabs_raw and raw_html as no-ops', () => {
    expect(convertBlockToXhtml({ type: 'code_tabs_raw' })).toBe('');
    expect(convertBlockToXhtml({ type: 'raw_html', html: '<div>x</div>' })).toBe('');
  });

  it('joins multiple blocks with blocksToXhtml', () => {
    const blocks: BodyProseBlock[] = [
      { type: 'heading', level: 1, id: null, text: [run('Title')] },
      { type: 'paragraph', runs: [run('Body')] },
    ];
    const html = blocksToXhtml(blocks);
    expect(html).toContain('Title');
    expect(html).toContain('Body');
  });
});
