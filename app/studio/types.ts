export type PaperType = 'white' | 'cream';

export interface Character {
  id: string;
  name: string;
  appearance: string;
  clothing: string;
  role: string;
  referenceMediaId?: string;
  referenceBase64?: string;
}

export interface Page {
  id: string;
  base64: string;
  prompt: string;
  artStyle?: string;
  castIds: string[];
}

export interface Cover {
  frontBase64: string;
  backBase64: string;
  fullWrapBase64?: string;
  prompt: string;
  spineWidthInches: number;
}

export interface Project {
  name: string;
  author: string;
  pageCount: number;
  paperType: PaperType;
  characters: Character[];
  pages: Page[];
  cover: Cover;
}

function inferImageMimeFromBase64(base64: string): string {
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('UklGR')) return 'image/webp';
  if (base64.startsWith('R0lGOD')) return 'image/gif';
  if (base64.startsWith('PHN2Z') || base64.startsWith('PD94b')) return 'image/svg+xml';
  return 'image/png';
}

function normalizeMimeType(mime: string): string {
  const clean = mime.trim().toLowerCase();
  return clean === 'image/jpg' ? 'image/jpeg' : clean || 'image/png';
}

function encodeUtf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  if (typeof btoa === 'function') {
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64');
}

/**
 * Splits a `data:` URL (or raw base64 payload) into its normalized MIME type
 * and pure base64 body.
 */
export function splitDataUrl(raw: string): { mimeType: string; base64: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { mimeType: 'image/png', base64: '' };
  }

  const base64Match = trimmed.match(/^data:([^;,]+)(?:;[^,]*)?;base64,([\s\S]*)$/i);
  if (base64Match) {
    return {
      mimeType: normalizeMimeType(base64Match[1]),
      base64: base64Match[2].replace(/\s+/g, ''),
    };
  }

  const plainDataMatch = trimmed.match(/^data:([^;,]+)(?:;[^,]*)?,([\s\S]*)$/i);
  if (plainDataMatch) {
    let decoded = plainDataMatch[2];
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // Keep raw payload if URI decoding fails (e.g., unescaped '%' in inline SVG).
    }
    return {
      mimeType: normalizeMimeType(plainDataMatch[1]),
      base64: encodeUtf8ToBase64(decoded),
    };
  }

  const cleanBase64 = trimmed.replace(/\s+/g, '');
  return {
    mimeType: inferImageMimeFromBase64(cleanBase64),
    base64: cleanBase64,
  };
}

/**
 * Normalizes a stored image string (full `data:` URL, URL path, or raw base64)
 * into a browser-ready `<img src>` value.
 */
export function toDataImageSrc(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (/^(blob:|https?:\/\/|\/)/i.test(trimmed)) {
    return trimmed;
  }

  if (/^data:/i.test(trimmed)) {
    if (/^data:[^;,]+(?:;[^,]*)?;base64,\s*$/i.test(trimmed)) {
      return '';
    }
    return trimmed;
  }

  const { mimeType, base64 } = splitDataUrl(trimmed);
  return base64 ? `data:${mimeType};base64,${base64}` : '';
}
