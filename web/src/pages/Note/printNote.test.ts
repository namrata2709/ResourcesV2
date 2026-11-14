import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { printFullPage, printCoreOnly } from './printNote';

describe('printNote', () => {
  beforeEach(() => {
    document.body.className = '';
    vi.spyOn(window, 'print').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('printFullPage calls window.print without adding a class', () => {
    printFullPage();
    expect(window.print).toHaveBeenCalledTimes(1);
    expect(document.body.classList.contains('print-core-only')).toBe(false);
  });

  it('printCoreOnly adds print-core-only before printing, and removes it on afterprint', () => {
    printCoreOnly();
    expect(document.body.classList.contains('print-core-only')).toBe(true);
    expect(window.print).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('afterprint'));
    expect(document.body.classList.contains('print-core-only')).toBe(false);
  });
});
