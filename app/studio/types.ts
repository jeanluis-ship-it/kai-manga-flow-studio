import type { KomaLayoutId, PolygonPoint } from '@/lib/kai/schema';
import type { TrimFormatId } from '@/lib/print/presets';

export type PaperType = 'white' | 'cream';

export type ColorMode = 'bw' | 'color';

export type BindingType = 'rustica_pegada' | 'tapa_dura' | 'grapa';

export type StudioView = 'project' | 'characters' | 'cover' | 'pages' | 'drawing_tablet' | 'flux';

export type SetteiEntityType = 'character' | 'prop' | 'location' | 'lore_rule';

export type KomaState = 'VACIO' | 'NEMU' | 'PEN_IRE' | 'TONE_FX' | 'SHIAGE' | 'LOCKED';

export type LayerKey =
  | 'L6_guides'
  | 'L5_balloons'
  | 'L4_sfx'
  | 'L3_borders_fx'
  | 'L2_ink'
  | 'L1_tones'
  | 'L0_nemu';

export type LayersVisibility = Record<LayerKey, boolean>;

export interface LayerOpacity {
  L0_nemu: number;
  L1_tones: number;
}

export interface LayerDefinition {
  key: LayerKey;
  code: string;
  label: string;
  zIndex: number;
  printable: boolean;
  hasOpacity?: boolean;
}

export const LAYER_DEFINITIONS: LayerDefinition[] = [
  {
    key: 'L6_guides',
    code: 'L6',
    label: 'Guías Técnicas (#00AEEF)',
    zIndex: 70,
    printable: false,
  },
  {
    key: 'L5_balloons',
    code: 'L5',
    label: 'Globos Fukidashi y Texto',
    zIndex: 60,
    printable: true,
  },
  {
    key: 'L4_sfx',
    code: 'L4',
    label: 'Onomatopeyas (Kakimoji)',
    zIndex: 50,
    printable: true,
  },
  {
    key: 'L3_borders_fx',
    code: 'L3',
    label: 'Marcos y Líneas Cinéticas',
    zIndex: 40,
    printable: true,
  },
  {
    key: 'L2_ink',
    code: 'L2',
    label: 'Tinta Blanca y Negra',
    zIndex: 30,
    printable: true,
  },
  {
    key: 'L1_tones',
    code: 'L1',
    label: 'Tramas (Screentones / Beta)',
    zIndex: 20,
    printable: true,
    hasOpacity: true,
  },
  {
    key: 'L0_nemu',
    code: 'L0',
    label: 'Boceto Azul Nemu',
    zIndex: 10,
    printable: false,
    hasOpacity: true,
  },
];

export const DEFAULT_LAYERS_VISIBILITY: LayersVisibility = {
  L6_guides: true,
  L5_balloons: true,
  L4_sfx: true,
  L3_borders_fx: true,
  L2_ink: true,
  L1_tones: true,
  L0_nemu: true,
};

export const DEFAULT_LAYER_OPACITY: LayerOpacity = {
  L0_nemu: 40,
  L1_tones: 100,
};

export type ScreentonePreset =
  | 'none'
  | 'dots_15'
  | 'dots_30'
  | 'dots_60'
  | 'gradient'
  | 'beta_black';

export type SpeedlinePreset = 'none' | 'ryusen' | 'shuchusen';

export const KOMA_STATES: KomaState[] = [
  'VACIO',
  'NEMU',
  'PEN_IRE',
  'TONE_FX',
  'SHIAGE',
  'LOCKED',
];

export type GeneratingState = {
  cover: boolean;
  bundle: boolean;
  pages: Record<string, boolean>;
  komas: Record<string, boolean>;
  characters: Record<string, boolean>;
};

export interface Character {
  id: string;
  entityType?: SetteiEntityType;
  tagHandle?: string;
  name: string;
  appearance: string;
  clothing: string;
  role: string;
  activeInCanon?: boolean;
  visualAnchors?: string[];
  seedLocked?: boolean;
  characterSeed?: string;
  referenceMediaId?: string;
  referenceBase64?: string;
  referenceViews?: {
    turnaround?: string;
    front?: string;
    detail?: string;
  };
}

export type DialogueStyle = 'normal' | 'shout' | 'whisper' | 'thought' | 'narrator' | 'system';

export interface KomaDialogue {
  id: string;
  speaker: string;
  style: DialogueStyle;
  text: string;
  /** Balloon center X in canvas percentage (0..100) */
  x?: number;
  /** Balloon center Y in canvas percentage (0..100) */
  y?: number;
  /** Tail tip X in canvas percentage (0..100) */
  tailX?: number;
  /** Tail tip Y in canvas percentage (0..100) */
  tailY?: number;
  /** Font size in SVG/canvas reference units (default 2.45) */
  fontSize?: number;
  /** Optional width hint in canvas % */
  width?: number;
}

export interface KomaSfx {
  id: string;
  text: string;
  x?: number;
  y?: number;
  rotation?: number;
  fontSize?: number;
}

export interface Koma {
  id: string;
  panelIndex: number;
  state: KomaState;
  polygonCoords: PolygonPoint[];
  cameraAngle: string;
  taggedHandles: string[];
  actionPrompt: string;
  nemuSketchUrl?: string;
  inkRenderUrl?: string;
  screentonePreset?: ScreentonePreset;
  speedlinePreset?: SpeedlinePreset;
  dialogues: KomaDialogue[];
  sfxItems: KomaSfx[];
}

export interface Page {
  id: string;
  base64: string;
  prompt: string;
  artStyle?: string;
  castIds: string[];
  layoutTemplate?: KomaLayoutId;
  chapterBeat?: string;
  layersVisibility?: LayersVisibility;
  layerOpacity?: LayerOpacity;
  komas?: Koma[];
}

export interface Cover {
  frontBase64: string;
  backBase64: string;
  fullWrapBase64?: string;
  prompt: string;
  spineWidthInches: number;
  isbn?: string;
  includeIsbn?: boolean;
  spineTitle?: string;
  backSynopsis?: string;
}

export interface Project {
  id?: string;
  volumeSlug?: string;
  name: string;
  author: string;
  pageCount: number;
  paperType: PaperType;
  colorMode?: ColorMode;
  bindingType?: BindingType;
  trimFormat?: TrimFormatId;
  readingDirection?: 'rtl' | 'ltr';
  characters: Character[];
  pages: Page[];
  cover: Cover;
}

export function normalizeTagHandle(raw: string, fallbackName = 'Settei'): string {
  const source = (raw || fallbackName).trim().replace(/^@+/, '');
  const clean = source
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]+/g, '');
  return `@${clean || 'Settei'}`;
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
