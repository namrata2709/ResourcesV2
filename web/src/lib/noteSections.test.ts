import { describe, it, expect, afterEach } from 'vitest';
import { getNoteSections } from './noteSections';

function appendContainer(html: string, id = 'note-content'): HTMLElement {
  const el = document.createElement('div');
  el.id = id;
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

describe('getNoteSections', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns an empty list when the container does not exist', () => {
    expect(getNoteSections()).toEqual([]);
  });

  it('collects every [id] element inside the container, in document order', () => {
    appendContainer(`
      <h2 id="a">Alpha</h2>
      <p>filler</p>
      <h3 id="b">Beta</h3>
    `);
    expect(getNoteSections()).toEqual([
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ]);
  });

  it('skips elements with an id but no text content', () => {
    appendContainer(`<h2 id="a"></h2><h2 id="b">Real heading</h2>`);
    expect(getNoteSections()).toEqual([{ id: 'b', label: 'Real heading' }]);
  });

  it('de-duplicates repeated ids, keeping the first occurrence', () => {
    appendContainer(`<h2 id="a">First</h2><h2 id="a">Second</h2>`);
    expect(getNoteSections()).toEqual([{ id: 'a', label: 'First' }]);
  });

  it('never returns elements outside the container (no cross-note leak)', () => {
    appendContainer(`<h2 id="in-note">Inside</h2>`);
    const outside = document.createElement('h2');
    outside.id = 'outside';
    outside.textContent = 'Outside';
    document.body.appendChild(outside);

    expect(getNoteSections()).toEqual([{ id: 'in-note', label: 'Inside' }]);
  });

  it('respects a custom container id', () => {
    appendContainer('<h2 id="a">Alpha</h2>', 'note-content');
    appendContainer('<h2 id="b">Beta</h2>', 'other-container');
    expect(getNoteSections('other-container')).toEqual([{ id: 'b', label: 'Beta' }]);
  });
});
