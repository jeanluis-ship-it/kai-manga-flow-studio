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

export function computeSpineInches(
  pageCount: number,
  paperType: 'white' | 'cream',
  colorMode: 'bw' | 'color' = 'bw',
  bindingType: 'rustica_pegada' | 'tapa_dura' | 'grapa' = 'rustica_pegada',
): number {
  const safePages = Number.isFinite(pageCount) && pageCount > 0 ? pageCount : 100;
  let factor = paperType === 'cream' ? 0.0025 : 0.002252;
  if (colorMode === 'color') {
    // Coated color stock is slightly denser than uncoated B/W manga paper
    factor = paperType === 'cream' ? 0.00268 : 0.00242;
  }
  if (bindingType === 'grapa') {
    return Math.max(0.06, Number((safePages * factor * 0.45).toFixed(4)));
  }
  const boardAllowance = bindingType === 'tapa_dura' ? 0.14 : 0;
  return Math.max(0.1, Number((safePages * factor + boardAllowance).toFixed(4)));
}

export interface PrintBudgetInput {
  trimFormat?: TrimFormatId | string;
  pageCount: number;
  paperType: 'white' | 'cream';
  colorMode?: 'bw' | 'color';
  bindingType?: 'rustica_pegada' | 'tapa_dura' | 'grapa';
  copies: number;
}

export interface PrintBudgetResult {
  preset: PrintPresetSpec;
  spineInches: number;
  spineMm: number;
  sheetsCount: number;
  unitWeightGrams: number;
  unitCostUsd: number;
  batchTotalUsd: number;
  discountPct: number;
  suggestedPvpUsd: number;
  breakdown: {
    bindingLabel: string;
    colorLabel: string;
    paperLabel: string;
    bindingCostPerUnitUsd: number;
    paperCostPerUnitUsd: number;
    colorCostPerUnitUsd: number;
  };
}

const BINDING_LABELS: Record<'rustica_pegada' | 'tapa_dura' | 'grapa', string> = {
  rustica_pegada: 'Rústica Pegada (PUR)',
  tapa_dura: 'Tapa Dura (Cartoné)',
  grapa: 'Grapa (Revista / One-Shot)',
};

const BINDING_BASE_COST: Record<'rustica_pegada' | 'tapa_dura' | 'grapa', number> = {
  rustica_pegada: 1.15,
  tapa_dura: 4.1,
  grapa: 0.65,
};

const BINDING_COVER_WEIGHT_G: Record<'rustica_pegada' | 'tapa_dura' | 'grapa', number> = {
  rustica_pegada: 34,
  tapa_dura: 145,
  grapa: 18,
};

function getBatchDiscountRate(copies: number): number {
  if (copies >= 500) return 0.44;
  if (copies >= 100) return 0.32;
  if (copies >= 50) return 0.22;
  if (copies >= 10) return 0.1;
  return 0;
}

export function computePrintBudget(input: PrintBudgetInput): PrintBudgetResult {
  const preset = getPrintPreset(input.trimFormat);
  const safePages = Math.max(8, Math.min(800, Math.round(Number(input.pageCount) || 100)));
  const colorMode: 'bw' | 'color' = input.colorMode === 'color' ? 'color' : 'bw';
  const bindingType: 'rustica_pegada' | 'tapa_dura' | 'grapa' =
    input.bindingType === 'tapa_dura' || input.bindingType === 'grapa'
      ? input.bindingType
      : 'rustica_pegada';
  const safeCopies = Math.max(1, Math.min(10000, Math.round(Number(input.copies) || 1)));

  const spineInches = computeSpineInches(safePages, input.paperType, colorMode, bindingType);
  const spineMm = Number((spineInches * 25.4).toFixed(2));
  const sheetsCount = Math.ceil(safePages / 2);

  // Trim area ratio relative to Tankōbon B6 (128x182mm = 23,296 mm²)
  const areaFactor = (preset.trimWidthMm * preset.trimHeightMm) / (128 * 182);
  const paperGsm = colorMode === 'color' ? 115 : input.paperType === 'cream' ? 90 : 80;
  const sheetAreaSqM = (preset.trimWidthMm / 1000) * (preset.trimHeightMm / 1000);
  const interiorWeightG = sheetsCount * sheetAreaSqM * paperGsm;
  const unitWeightGrams = Math.round(interiorWeightG + BINDING_COVER_WEIGHT_G[bindingType]);

  const discountRate = getBatchDiscountRate(safeCopies);
  const scaleFactor = 1 - discountRate;

  const baseBinding = BINDING_BASE_COST[bindingType] * (0.75 + 0.25 * areaFactor);
  const perPagePaper = (input.paperType === 'cream' ? 0.0085 : 0.0072) * areaFactor;
  const perPageColor = colorMode === 'color' ? 0.038 * areaFactor : 0.0075 * areaFactor;

  const bindingCostPerUnitUsd = Number((baseBinding * scaleFactor).toFixed(2));
  const paperCostPerUnitUsd = Number((safePages * perPagePaper * scaleFactor).toFixed(2));
  const colorCostPerUnitUsd = Number((safePages * perPageColor * scaleFactor).toFixed(2));

  const unitCostUsd = Number(
    (bindingCostPerUnitUsd + paperCostPerUnitUsd + colorCostPerUnitUsd).toFixed(2),
  );
  const batchTotalUsd = Number((unitCostUsd * safeCopies).toFixed(2));

  // Retail suggested PVP based on single/small-run editorial margin (~2.35x base unit cost)
  const singleUnitBase = baseBinding + safePages * (perPagePaper + perPageColor);
  const suggestedPvpUsd = Number(Math.max(9.99, Math.ceil(singleUnitBase * 2.35) - 0.01).toFixed(2));

  return {
    preset,
    spineInches,
    spineMm,
    sheetsCount,
    unitWeightGrams,
    unitCostUsd,
    batchTotalUsd,
    discountPct: Math.round(discountRate * 100),
    suggestedPvpUsd,
    breakdown: {
      bindingLabel: BINDING_LABELS[bindingType],
      colorLabel: colorMode === 'color' ? 'Color Editorial (CMYK)' : 'Blanco y Negro (Sumi)',
      paperLabel: input.paperType === 'cream' ? 'Crema Premium' : 'Blanco Estándar',
      bindingCostPerUnitUsd,
      paperCostPerUnitUsd,
      colorCostPerUnitUsd,
    },
  };
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
