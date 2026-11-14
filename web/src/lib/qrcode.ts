/**
 * lib/qrcode.ts
 *
 * Framework-agnostic QR code encoder (B-7). Per src/lib/README.md: plain
 * TS, no React, no DOM assumptions beyond what's passed in. This is the
 * ONE QR-generation implementation the app uses — components/ShareQR
 * imports generateQRMatrix() and renders it; nothing else builds its own
 * QR bits, the same "one shared interface" shape as lib/liveRegion.ts
 * and lib/notifications.ts already apply to their own concerns.
 *
 * This is a small from-scratch implementation of the ISO/IEC 18004 QR
 * encoding pipeline (byte mode only — URLs are ASCII/UTF-8, so numeric
 * and alphanumeric modes buy nothing here) rather than a dependency,
 * because the goal is "no external service call" and a pure client-side
 * generator with zero runtime dependencies is the smallest, most
 * auditable way to get there. It supports versions 1-10 (up to ~213
 * bytes of data at error-correction level M — comfortably more than a
 * typical share URL needs). Longer input throws a clear error rather
 * than silently truncating.
 *
 * The bit-level layout (format-info placement, version-info placement,
 * mask-penalty scoring) follows the standard algorithm shared by nearly
 * every open-source QR encoder; this implementation was round-trip
 * verified against a real QR decoder (OpenCV's QRCodeDetector) across
 * multiple versions, error-correction levels, and data lengths during
 * development.
 *
 * Usage:
 *   const matrix = generateQRMatrix('https://example.com/quiz/123');
 *   // matrix is a square boolean[][], true = dark module
 */

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

const EC_LEVEL_BITS: Record<ErrorCorrectionLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };

// ---------------------------------------------------------------------
// GF(256) arithmetic, primitive polynomial x^8+x^4+x^3+x^2+1 (0x11d)
// ---------------------------------------------------------------------

const EXP_TABLE: number[] = new Array(512);
const LOG_TABLE: number[] = new Array(256);
(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP_TABLE[i] = EXP_TABLE[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[LOG_TABLE[a] + LOG_TABLE[b]];
}

class Poly {
  coeffs: number[];
  constructor(coeffs: number[]) {
    let offset = 0;
    while (offset < coeffs.length - 1 && coeffs[offset] === 0) offset++;
    this.coeffs = coeffs.slice(offset);
  }
  get degree(): number {
    return this.coeffs.length - 1;
  }
  get(i: number): number {
    return this.coeffs[i];
  }
  multiply(other: Poly): Poly {
    const result = new Array(this.coeffs.length + other.coeffs.length - 1).fill(0);
    for (let i = 0; i < this.coeffs.length; i++) {
      for (let j = 0; j < other.coeffs.length; j++) {
        result[i + j] ^= gfMul(this.coeffs[i], other.coeffs[j]);
      }
    }
    return new Poly(result);
  }
  mod(other: Poly): Poly {
    let cur: Poly = new Poly(this.coeffs.slice());
    while (cur.degree >= other.degree && !(cur.coeffs.length === 1 && cur.coeffs[0] === 0)) {
      const diff = cur.degree - other.degree;
      const coeff = cur.get(0);
      if (coeff === 0) {
        cur = new Poly(cur.coeffs.slice(1));
        continue;
      }
      const scale = EXP_TABLE[(LOG_TABLE[coeff] + 255 - LOG_TABLE[other.get(0)]) % 255];
      const scaled = other.coeffs.map((c) => gfMul(c, scale));
      const padded = scaled.concat(new Array(diff).fill(0));
      const newCoeffs = cur.coeffs.slice();
      for (let i = 0; i < padded.length; i++) newCoeffs[i] ^= padded[i];
      cur = new Poly(newCoeffs);
    }
    return cur;
  }
}

function rsGeneratorPoly(degree: number): Poly {
  let g = new Poly([1]);
  for (let i = 0; i < degree; i++) g = g.multiply(new Poly([1, EXP_TABLE[i]]));
  return g;
}

function rsEncode(dataCodewords: number[], ecCount: number): number[] {
  const gen = rsGeneratorPoly(ecCount);
  const padded = dataCodewords.concat(new Array(ecCount).fill(0));
  const remainder = new Poly(padded).mod(gen);
  const ec = remainder.coeffs.slice();
  while (ec.length < ecCount) ec.unshift(0);
  return ec.slice(ec.length - ecCount);
}

// ---------------------------------------------------------------------
// Per-version tables (versions 1-10 only — see module doc for why)
// ---------------------------------------------------------------------

type RSGroup = [numBlocks: number, dataCodewordsPerBlock: number];
type RSBlockInfo = [ecCodewordsPerBlock: number, groups: RSGroup[]];

const RS_BLOCK_TABLE: Record<number, Record<ErrorCorrectionLevel, RSBlockInfo>> = {
  1: { L: [7, [[1, 19]]], M: [10, [[1, 16]]], Q: [13, [[1, 13]]], H: [17, [[1, 9]]] },
  2: { L: [10, [[1, 34]]], M: [16, [[1, 28]]], Q: [22, [[1, 22]]], H: [28, [[1, 16]]] },
  3: { L: [15, [[1, 55]]], M: [26, [[1, 44]]], Q: [18, [[2, 17]]], H: [22, [[2, 13]]] },
  4: { L: [20, [[1, 80]]], M: [18, [[2, 32]]], Q: [26, [[2, 24]]], H: [16, [[4, 9]]] },
  5: {
    L: [26, [[1, 108]]],
    M: [24, [[2, 43]]],
    Q: [
      18,
      [
        [2, 15],
        [2, 16],
      ],
    ],
    H: [
      22,
      [
        [2, 11],
        [2, 12],
      ],
    ],
  },
  6: { L: [18, [[2, 68]]], M: [16, [[4, 27]]], Q: [24, [[4, 19]]], H: [28, [[4, 15]]] },
  7: {
    L: [20, [[2, 78]]],
    M: [18, [[4, 31]]],
    Q: [
      18,
      [
        [2, 14],
        [4, 15],
      ],
    ],
    H: [
      26,
      [
        [4, 13],
        [1, 14],
      ],
    ],
  },
  8: {
    L: [24, [[2, 97]]],
    M: [
      22,
      [
        [2, 38],
        [2, 39],
      ],
    ],
    Q: [
      22,
      [
        [4, 18],
        [2, 19],
      ],
    ],
    H: [
      26,
      [
        [4, 14],
        [2, 15],
      ],
    ],
  },
  9: {
    L: [30, [[2, 116]]],
    M: [
      22,
      [
        [3, 36],
        [2, 37],
      ],
    ],
    Q: [
      20,
      [
        [4, 16],
        [4, 17],
      ],
    ],
    H: [
      24,
      [
        [4, 12],
        [4, 13],
      ],
    ],
  },
  10: {
    L: [
      18,
      [
        [2, 68],
        [2, 69],
      ],
    ],
    M: [
      26,
      [
        [4, 43],
        [1, 44],
      ],
    ],
    Q: [
      24,
      [
        [6, 19],
        [2, 20],
      ],
    ],
    H: [
      28,
      [
        [6, 15],
        [2, 16],
      ],
    ],
  },
};

const ALIGNMENT_POSITIONS: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

const REMAINDER_BITS = [0, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0]; // indexed by version 1-10

const MAX_SUPPORTED_VERSION = 10;

// ---------------------------------------------------------------------
// Data encoding (byte mode only)
// ---------------------------------------------------------------------

class BitBuffer {
  bits: number[] = [];
  put(val: number, len: number): void {
    for (let i = len - 1; i >= 0; i--) this.bits.push((val >>> i) & 1);
  }
  get length(): number {
    return this.bits.length;
  }
}

function getCharCountBits(version: number): number {
  return version <= 9 ? 8 : 16;
}

function moduleCount(version: number): number {
  return version * 4 + 17;
}

function chooseVersion(byteLength: number, ecLevel: ErrorCorrectionLevel): number | null {
  for (let version = 1; version <= MAX_SUPPORTED_VERSION; version++) {
    const [, groups] = RS_BLOCK_TABLE[version][ecLevel];
    const totalDataCodewords = groups.reduce((sum, [n, c]) => sum + n * c, 0);
    const headerBits = 4 + getCharCountBits(version);
    const neededBits = headerBits + byteLength * 8;
    if (neededBits <= totalDataCodewords * 8) return version;
  }
  return null;
}

function buildDataCodewords(
  bytes: number[],
  version: number,
  ecLevel: ErrorCorrectionLevel
): { dataCodewords: number[]; groups: RSGroup[]; ecPerBlock: number } {
  const buf = new BitBuffer();
  buf.put(0b0100, 4); // byte mode indicator
  buf.put(bytes.length, getCharCountBits(version));
  for (const b of bytes) buf.put(b, 8);

  const [ecPerBlock, groups] = RS_BLOCK_TABLE[version][ecLevel];
  const totalDataCodewords = groups.reduce((sum, [n, c]) => sum + n * c, 0);
  const totalDataBits = totalDataCodewords * 8;

  for (let i = 0; i < 4 && buf.length < totalDataBits; i++) buf.bits.push(0); // terminator
  while (buf.length % 8 !== 0) buf.bits.push(0); // byte-align

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (buf.length < totalDataBits) {
    buf.put(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  const dataCodewords: number[] = [];
  for (let i = 0; i < buf.bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (buf.bits[i + j] || 0);
    dataCodewords.push(byte);
  }
  return { dataCodewords, groups, ecPerBlock };
}

function interleave(dataCodewords: number[], groups: RSGroup[], ecPerBlock: number): number[] {
  const blocks: { data: number[]; ec: number[] }[] = [];
  let offset = 0;
  for (const [numBlocks, blockSize] of groups) {
    for (let i = 0; i < numBlocks; i++) {
      const data = dataCodewords.slice(offset, offset + blockSize);
      offset += blockSize;
      blocks.push({ data, ec: rsEncode(data, ecPerBlock) });
    }
  }
  const maxDataLen = Math.max(...blocks.map((b) => b.data.length));
  const result: number[] = [];
  for (let i = 0; i < maxDataLen; i++) {
    for (const b of blocks) if (i < b.data.length) result.push(b.data[i]);
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const b of blocks) result.push(b.ec[i]);
  }
  return result;
}

function codewordsToBits(codewords: number[]): number[] {
  const bits: number[] = [];
  for (const c of codewords) for (let i = 7; i >= 0; i--) bits.push((c >>> i) & 1);
  return bits;
}

// ---------------------------------------------------------------------
// Matrix construction: function patterns, data placement, masking
// ---------------------------------------------------------------------

interface MatrixState {
  n: number;
  modules: (boolean | null)[][];
  isFunction: boolean[][];
}

function createMatrix(version: number): MatrixState {
  const n = moduleCount(version);
  const modules: (boolean | null)[][] = Array.from({ length: n }, () => new Array(n).fill(null));
  const isFunction: boolean[][] = Array.from({ length: n }, () => new Array(n).fill(false));

  function setFn(r: number, c: number, val: boolean): void {
    if (r < 0 || r >= n || c < 0 || c >= n) return;
    modules[r][c] = val;
    isFunction[r][c] = true;
  }

  function placeFinder(r: number, c: number): void {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
        const isBorder = dr === -1 || dr === 7 || dc === -1 || dc === 7;
        const inner = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        let val = false;
        if (!isBorder) {
          if (dr === 0 || dr === 6 || dc === 0 || dc === 6) val = true;
          else if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) val = true;
        }
        if (inner || isBorder) setFn(rr, cc, val);
      }
    }
  }

  placeFinder(0, 0);
  placeFinder(0, n - 7);
  placeFinder(n - 7, 0);

  for (let i = 8; i < n - 8; i++) {
    setFn(6, i, i % 2 === 0);
    setFn(i, 6, i % 2 === 0);
  }

  const positions = ALIGNMENT_POSITIONS[version];
  for (const r of positions) {
    for (const c of positions) {
      if ((r <= 7 && c <= 7) || (r <= 7 && c >= n - 8) || (r >= n - 8 && c <= 7)) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          setFn(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
        }
      }
    }
  }

  setFn(n - 8, 8, true); // dark module

  // Reserve format-info areas (actual bits written later, after masking).
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) setFn(8, i, false);
    if (!isFunction[i][8]) setFn(i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    setFn(8, n - 1 - i, false);
    setFn(n - 1 - i, 8, false);
  }
  setFn(n - 8, 8, true); // re-affirm; must not be clobbered by the reservation pass above

  if (version >= 7) {
    for (let i = 0; i < 18; i++) {
      const row = Math.floor(i / 3);
      const col = i % 3;
      setFn(n - 11 + col, row, false);
      setFn(row, n - 11 + col, false);
    }
  }

  return { n, modules, isFunction };
}

function placeData(matrix: MatrixState, bits: number[]): void {
  const { n, modules, isFunction } = matrix;
  let bitIdx = 0;
  let dir = -1; // -1 = upward, 1 = downward
  let col = n - 1;
  while (col > 0) {
    if (col === 6) col--; // skip the vertical timing column
    for (let count = 0; count < n; count++) {
      const row = dir === -1 ? n - 1 - count : count;
      for (const c of [col, col - 1]) {
        if (!isFunction[row][c]) {
          const bit = bitIdx < bits.length ? bits[bitIdx] : 0;
          modules[row][c] = bit === 1;
          bitIdx++;
        }
      }
    }
    dir = -dir;
    col -= 2;
  }
}

function applyMask(matrix: MatrixState, maskId: number): boolean[][] {
  const { n, modules, isFunction } = matrix;
  const masked: boolean[][] = Array.from({ length: n }, (_, r) => modules[r].slice() as boolean[]);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (isFunction[r][c]) continue;
      let invert = false;
      switch (maskId) {
        case 0:
          invert = (r + c) % 2 === 0;
          break;
        case 1:
          invert = r % 2 === 0;
          break;
        case 2:
          invert = c % 3 === 0;
          break;
        case 3:
          invert = (r + c) % 3 === 0;
          break;
        case 4:
          invert = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
          break;
        case 5:
          invert = ((r * c) % 2) + ((r * c) % 3) === 0;
          break;
        case 6:
          invert = (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
          break;
        case 7:
          invert = (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
          break;
      }
      if (invert) masked[r][c] = !masked[r][c];
    }
  }
  return masked;
}

// BCH(15,5) format-info encoding, generator 0x537, mask 0x5412 — see
// ISO/IEC 18004 Annex C. Verified programmatically (remainder-zero
// property) and against real decode during development.
function computeFormatBits(ecLevel: ErrorCorrectionLevel, maskId: number): number {
  const data = (EC_LEVEL_BITS[ecLevel] << 3) | maskId;
  const gen = 0b10100110111;
  let d = data << 10;
  const tmp = d;
  let rem = tmp;
  while (true) {
    const msb = rem === 0 ? -1 : rem.toString(2).length - 1;
    if (msb < 10) break;
    rem ^= gen << (msb - 10);
  }
  const bits = (data << 10) | rem;
  return bits ^ 0b101010000010010;
}

function placeFormatInfo(matrix: MatrixState, masked: boolean[][], ecLevel: ErrorCorrectionLevel, maskId: number): void {
  const { n } = matrix;
  const bits = computeFormatBits(ecLevel, maskId);
  const get = (i: number) => ((bits >>> i) & 1) === 1;

  for (let i = 0; i < 15; i++) {
    const val = get(i);
    if (i < 6) masked[i][8] = val;
    else if (i < 8) masked[i + 1][8] = val;
    else masked[n - 15 + i][8] = val;
  }
  for (let i = 0; i < 15; i++) {
    const val = get(i);
    if (i < 8) masked[8][n - i - 1] = val;
    else if (i < 9) masked[8][15 - i - 1 + 1] = val;
    else masked[8][15 - i - 1] = val;
  }
  masked[n - 8][8] = true; // fixed dark module
}

// BCH(18,6) version-info encoding, generator 0x1F25 — only needed for
// version >= 7 (this module supports up to version 10).
function computeVersionBits(version: number): number {
  const gen = 0b1111100100101;
  let rem = version << 12;
  while (true) {
    const msb = rem === 0 ? -1 : rem.toString(2).length - 1;
    if (msb < 12) break;
    rem ^= gen << (msb - 12);
  }
  return (version << 12) | rem;
}

function placeVersionInfo(masked: boolean[][], n: number, version: number): void {
  if (version < 7) return;
  const bits = computeVersionBits(version);
  const get = (i: number) => ((bits >>> i) & 1) === 1;
  for (let i = 0; i < 18; i++) {
    const val = get(i);
    const row = Math.floor(i / 3);
    const col = i % 3;
    masked[n - 11 + col][row] = val;
    masked[row][n - 11 + col] = val;
  }
}

function maskPenalty(modules: boolean[][]): number {
  const n = modules.length;
  let penalty = 0;

  for (let r = 0; r < n; r++) {
    let runColor = modules[r][0];
    let runLen = 1;
    for (let c = 1; c < n; c++) {
      if (modules[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }
  for (let c = 0; c < n; c++) {
    let runColor = modules[0][c];
    let runLen = 1;
    for (let r = 1; r < n; r++) {
      if (modules[r][c] === runColor) {
        runLen++;
      } else {
        if (runLen >= 5) penalty += 3 + (runLen - 5);
        runColor = modules[r][c];
        runLen = 1;
      }
    }
    if (runLen >= 5) penalty += 3 + (runLen - 5);
  }

  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = modules[r][c];
      if (v === modules[r][c + 1] && v === modules[r + 1][c] && v === modules[r + 1][c + 1]) {
        penalty += 3;
      }
    }
  }

  const pattern1 = [true, false, true, true, true, false, true, false, false, false, false];
  const pattern2 = [false, false, false, false, true, false, true, true, true, false, true];
  const matchesAt = (arr: boolean[], start: number, pattern: boolean[]) => {
    for (let i = 0; i < pattern.length; i++) if (arr[start + i] !== pattern[i]) return false;
    return true;
  };
  for (let r = 0; r < n; r++) {
    for (let c = 0; c <= n - 11; c++) {
      const row = modules[r].slice(c, c + 11);
      if (matchesAt(row, 0, pattern1) || matchesAt(row, 0, pattern2)) penalty += 40;
    }
  }
  for (let c = 0; c < n; c++) {
    const col: boolean[] = [];
    for (let r = 0; r < n; r++) col.push(modules[r][c]);
    for (let r = 0; r <= n - 11; r++) {
      if (matchesAt(col, r, pattern1) || matchesAt(col, r, pattern2)) penalty += 40;
    }
  }

  let dark = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (modules[r][c]) dark++;
  const percent = (dark * 100) / (n * n);
  const prev5 = Math.floor(percent / 5) * 5;
  penalty += Math.min(Math.abs(prev5 - 50) / 5, Math.abs(prev5 + 5 - 50) / 5) * 10;

  return penalty;
}

export interface GenerateQROptions {
  /** Error-correction level: L (~7% recovery) through H (~30%). Default 'M'. */
  errorCorrectionLevel?: ErrorCorrectionLevel;
}

/**
 * Encodes `text` as a QR code and returns its module matrix — a square
 * boolean[][] where true means "dark module". Byte mode only (fine for
 * URLs); fully client-side, no network call.
 *
 * Throws if `text` is too long to fit within the supported version range
 * (versions 1-10, i.e. up to ~213 bytes at the default 'M' level).
 */
export function generateQRMatrix(text: string, options: GenerateQROptions = {}): boolean[][] {
  const ecLevel = options.errorCorrectionLevel ?? 'M';
  const bytes = Array.from(new TextEncoder().encode(text));

  const version = chooseVersion(bytes.length, ecLevel);
  if (!version) {
    throw new Error(
      `URL is too long to encode as a QR code (${bytes.length} bytes at error-correction level ${ecLevel}).`
    );
  }

  const { dataCodewords, groups, ecPerBlock } = buildDataCodewords(bytes, version, ecLevel);
  const allCodewords = interleave(dataCodewords, groups, ecPerBlock);
  let bits = codewordsToBits(allCodewords);
  bits = bits.concat(new Array(REMAINDER_BITS[version] || 0).fill(0));

  let best: { penalty: number; modules: boolean[][] } | null = null;
  for (let maskId = 0; maskId < 8; maskId++) {
    const matrix = createMatrix(version);
    placeData(matrix, bits);
    const masked = applyMask(matrix, maskId);
    placeFormatInfo(matrix, masked, ecLevel, maskId);
    placeVersionInfo(masked, matrix.n, version);
    const penalty = maskPenalty(masked);
    if (!best || penalty < best.penalty) best = { penalty, modules: masked };
  }

  return best!.modules;
}
