/**
 * Lightweight, zero-dependency EAN-13 / ISBN-13 encoder & validator
 * for crisp pure-SVG barcode rendering on Tankōbon back covers.
 */

const L_CODES = [
  '0001101',
  '0011001',
  '0010011',
  '0111101',
  '0100011',
  '0110001',
  '0101111',
  '0111011',
  '0110111',
  '0001011',
];

const G_CODES = [
  '0100111',
  '0110011',
  '0011011',
  '0100001',
  '0011101',
  '0111001',
  '0000101',
  '0010001',
  '0001001',
  '0010111',
];

const R_CODES = [
  '1110010',
  '1100110',
  '1101100',
  '1000010',
  '1011100',
  '1001110',
  '1010000',
  '1000100',
  '1001000',
  '1110100',
];

const PARITY_MAP = [
  'LLLLLL',
  'LLGLGG',
  'LLGGLG',
  'LLGGGL',
  'LGLLGG',
  'LGGLLG',
  'LGGGLL',
  'LGLGLG',
  'LGLGGL',
  'LGGLGL',
];

export interface Ean13Result {
  valid: boolean;
  checksumValid: boolean;
  digits: string;
  formatted: string;
  /** 95-bit binary module string ('1' = black bar, '0' = white space) */
  bits: string;
  message: string;
}

export function extractIsbnDigits(raw: string): string {
  return (raw || '').replace(/\D+/g, '').slice(0, 13);
}

export function computeEan13CheckDigit(first12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const n = Number(first12[i] || 0);
    sum += i % 2 === 0 ? n : n * 3;
  }
  return (10 - (sum % 10)) % 10;
}

export function formatIsbn13(raw: string): string {
  const d = extractIsbnDigits(raw);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 12) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}-${d.slice(11)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}-${d.slice(11, 12)}-${d.slice(12, 13)}`;
}

/**
 * Encodes a raw ISBN-13 string into a 95-module EAN-13 bit pattern.
 * When fewer than 13 digits are typed, pads preview with deterministic zeros
 * while marking `valid: false` so the UI informs the user clearly.
 */
export function encodeEan13(raw: string): Ean13Result {
  const digits = extractIsbnDigits(raw);
  const formatted = formatIsbn13(digits);

  if (digits.length !== 13) {
    const padded12 = digits.padEnd(12, '0').slice(0, 12);
    const check = computeEan13CheckDigit(padded12);
    const previewDigits = `${padded12}${check}`;
    return {
      valid: false,
      checksumValid: false,
      digits,
      formatted: formatted || '978-9945-0000-0-0',
      bits: buildBits(previewDigits),
      message: `Ingresa los 13 dígitos del ISBN-13 (${digits.length}/13).`,
    };
  }

  const expectedCheck = computeEan13CheckDigit(digits.slice(0, 12));
  const actualCheck = Number(digits[12]);
  const checksumValid = expectedCheck === actualCheck;

  return {
    valid: true,
    checksumValid,
    digits,
    formatted,
    bits: buildBits(digits),
    message: checksumValid
      ? 'ISBN-13 válido (dígito verificador correcto).'
      : `13 dígitos completos (dígito verificador sugerido: ${expectedCheck}).`,
  };
}

function buildBits(digits13: string): string {
  const first = Number(digits13[0] || 9);
  const parity = PARITY_MAP[first] || PARITY_MAP[9];

  let out = '101'; // Left guard
  for (let i = 0; i < 6; i++) {
    const d = Number(digits13[i + 1] || 0);
    out += parity[i] === 'G' ? G_CODES[d] : L_CODES[d];
  }
  out += '01010'; // Center guard
  for (let i = 0; i < 6; i++) {
    const d = Number(digits13[i + 7] || 0);
    out += R_CODES[d];
  }
  out += '101'; // Right guard
  return out;
}
