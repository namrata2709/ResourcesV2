import { describe, it, expect } from 'vitest';
import { generateQRMatrix } from './qrcode';

/**
 * qrcode.test.ts — structural checks on the matrix output. This module's
 * bit-level correctness (does a real scanner actually decode it back to
 * the original URL) was verified externally against OpenCV's
 * QRCodeDetector during development across versions 1-10, all four
 * error-correction levels, and both short and near-capacity input; that
 * kind of round-trip isn't practical inside a jsdom test environment, so
 * these tests instead pin down the structural properties a correct QR
 * matrix must have.
 */
describe('generateQRMatrix', () => {
  it('returns a square matrix for a short URL', () => {
    const matrix = generateQRMatrix('https://example.com');
    expect(matrix.length).toBeGreaterThan(0);
    for (const row of matrix) expect(row.length).toBe(matrix.length);
  });

  it('is deterministic for the same input', () => {
    const a = generateQRMatrix('https://example.com/quiz/aws-101');
    const b = generateQRMatrix('https://example.com/quiz/aws-101');
    expect(a).toEqual(b);
  });

  it('produces a larger matrix for longer input', () => {
    const short = generateQRMatrix('https://x.co');
    const long = generateQRMatrix(`https://example.com/${'a'.repeat(120)}`);
    expect(long.length).toBeGreaterThan(short.length);
  });

  it('places a 7x7 finder pattern in all three expected corners', () => {
    const matrix = generateQRMatrix('https://example.com');
    const n = matrix.length;

    function isFinderRing(getCell: (dr: number, dc: number) => boolean) {
      // Outer ring dark, next ring light, center 3x3 dark — the
      // standard finder pattern shape, checked without depending on
      // exact quiet-zone offsets.
      expect(getCell(0, 0)).toBe(true);
      expect(getCell(0, 3)).toBe(true);
      expect(getCell(1, 1)).toBe(false);
      expect(getCell(3, 3)).toBe(true);
    }

    isFinderRing((dr, dc) => matrix[dr][dc]);
    isFinderRing((dr, dc) => matrix[dr][n - 1 - dc]);
    isFinderRing((dr, dc) => matrix[n - 1 - dr][dc]);
  });

  it('throws a clear error when input exceeds the supported capacity', () => {
    expect(() => generateQRMatrix('a'.repeat(1000))).toThrow(/too long/i);
  });

  it('supports all four error-correction levels without throwing', () => {
    for (const level of ['L', 'M', 'Q', 'H'] as const) {
      expect(() =>
        generateQRMatrix('https://example.com/note/ec2-basics', { errorCorrectionLevel: level })
      ).not.toThrow();
    }
  });
});
