export type TrimFormatId = 'tankobon_b6' | 'b4_canva_pro' | 'kdp_6x9';

export interface PrintPresetSpec {
  id: TrimFormatId;
  name: string;
  shortName: string;
  badge: string;
  description: string;
  trimWidthMm: number;
  trimHeightMm: number;
  trimLabel: string;
  bleedMm: number;
  bleedLabel: string;
  dpiInterior: number;
  dpiCover: number;
  exportWidthPx: number;
  exportHeightPx: number;
  aspectRatio: string;
  /** Bleed inset from outer sheet edge (%) */
  bleedInsetPct: { x: number; y: number };
  /** Naiwaku safe area inset from outer sheet edge (%) */
  naiwakuInsetPct: { left: number; right: number; top: number; bottom: number };
  /** Gutter (spine side) width in % */
  gutterWidthPct: number;
}

export const PRINT_PRESETS: Record<TrimFormatId, PrintPresetSpec> = {
  tankobon_b6: {
    id: 'tankobon_b6',
    name: 'Tankōbon B6 Estándar',
    shortName: 'Tankōbon B6',
    badge: 'DEFAULT JAPÓN',
    description: 'Formato editorial manga japonés estándar con sangrado de 3.0 mm y salida a 600 DPI.',
    trimWidthMm: 128,
    trimHeightMm: 182,
    trimLabel: '128 × 182 mm (5.04" × 7.17")',
    bleedMm: 3.0,
    bleedLabel: '3.0 mm exterior',
    dpiInterior: 600,
    dpiCover: 300,
    exportWidthPx: 1583,
    exportHeightPx: 2220,
    aspectRatio: '134 / 188',
    bleedInsetPct: { x: 2.24, y: 1.6 },
    naiwakuInsetPct: { left: 9.0, right: 9.0, top: 7.0, bottom: 7.0 },
    gutterWidthPct: 6.5,
  },
  b4_canva_pro: {
    id: 'b4_canva_pro',
    name: 'Canva Bridge B4 Pro',
    shortName: 'Canva B4 (2150×3035)',
    badge: '2150×3035 PX',
    description:
      'Lienzo exacto de 2150 × 3035 px con 3.5 mm de sangrado listo para importar en Canva sin recortes.',
    trimWidthMm: 182,
    trimHeightMm: 257,
    trimLabel: '2150 × 3035 px (B4 Pro)',
    bleedMm: 3.5,
    bleedLabel: '3.5 mm sangrado',
    dpiInterior: 300,
    dpiCover: 300,
    exportWidthPx: 2150,
    exportHeightPx: 3035,
    aspectRatio: '2150 / 3035',
    bleedInsetPct: { x: 1.92, y: 1.36 },
    naiwakuInsetPct: { left: 8.5, right: 8.5, top: 6.8, bottom: 6.8 },
    gutterWidthPct: 6.0,
  },
  kdp_6x9: {
    id: 'kdp_6x9',
    name: 'Amazon KDP Paperback',
    shortName: 'KDP 6×9"',
    badge: 'AMAZON KDP',
    description: 'Formato rústico estadounidense 6" × 9" con sangrado estándar de 0.125" (3.18 mm).',
    trimWidthMm: 152.4,
    trimHeightMm: 228.6,
    trimLabel: '6.0" × 9.0" (152.4 × 228.6 mm)',
    bleedMm: 3.175,
    bleedLabel: '0.125" (3.18 mm)',
    dpiInterior: 300,
    dpiCover: 300,
    exportWidthPx: 1838,
    exportHeightPx: 2775,
    aspectRatio: '1838 / 2775',
    bleedInsetPct: { x: 2.04, y: 1.35 },
    naiwakuInsetPct: { left: 8.5, right: 8.5, top: 6.5, bottom: 6.5 },
    gutterWidthPct: 6.5,
  },
};

export const PRINT_PRESET_LIST: PrintPresetSpec[] = [
  PRINT_PRESETS.tankobon_b6,
  PRINT_PRESETS.b4_canva_pro,
  PRINT_PRESETS.kdp_6x9,
];

export function getPrintPreset(id?: string): PrintPresetSpec {
  if (id && id in PRINT_PRESETS) {
    return PRINT_PRESETS[id as TrimFormatId];
  }
  return PRINT_PRESETS.tankobon_b6;
}

export function computeSpineInches(pageCount: number, paperType: 'white' | 'cream'): number {
  const safePages = Number.isFinite(pageCount) && pageCount > 0 ? pageCount : 100;
  const factor = paperType === 'cream' ? 0.0025 : 0.002252;
  return Math.max(0.1, safePages * factor);
}

export function slugifyFilename(raw: string): string {
  const clean = (raw || 'manga')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean || 'manga_sin_titulo';
}

export interface BalloonBoundsCheck {
  x: number;
  y: number;
  width?: number;
  text?: string;
}

/**
 * Checks whether a speech balloon center + estimated half-size stays inside
 * the Naiwaku safe area of the selected print preset.
 */
export function isBalloonInsideNaiwaku(
  balloon: BalloonBoundsCheck,
  preset: PrintPresetSpec,
): boolean {
  const halfW = Math.max(6, (balloon.width ?? 18) / 2);
  const lines = Math.max(1, Math.ceil((balloon.text?.length ?? 12) / 16));
  const halfH = Math.min(12, Math.max(4.5, 3 + lines * 1.8));

  const minX = preset.naiwakuInsetPct.left;
  const maxX = 100 - preset.naiwakuInsetPct.right;
  const minY = preset.naiwakuInsetPct.top;
  const maxY = 100 - preset.naiwakuInsetPct.bottom;

  return (
    balloon.x - halfW >= minX &&
    balloon.x + halfW <= maxX &&
    balloon.y - halfH >= minY &&
    balloon.y + halfH <= maxY
  );
}
