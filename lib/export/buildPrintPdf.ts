import { jsPDF } from 'jspdf';
import { getPrintPreset, slugifyFilename, type TrimFormatId } from '@/lib/print/presets';
import { splitDataUrl, toDataImageSrc, type Project } from '@/app/studio/types';
import { renderPrintablePageToPngBase64 } from './buildPrintBundle';

export interface PrintPdfResult {
  base64: string;
  filename: string;
  pageCount: number;
  widthMm: number;
  heightMm: number;
  formatName: string;
}

export function getPrintPdfFilename(project: Project): string {
  const format: TrimFormatId = project.trimFormat || 'tankobon_b6';
  const slug = slugifyFilename(project.name || 'manga_sin_titulo');
  return `${slug}_${format}_KDP_PRINT.pdf`;
}

/**
 * Generates a real downloadable PDF using jsPDF respecting the exact selected
 * print trim format (Tankōbon B6 / Canva B4 / Amazon KDP 6x9") + bleed margins.
 * Strictly flattens layers L1 -> L5 (excluding L0 Nemu sketch and L6 guides).
 */
export async function buildPrintPdf(project: Project): Promise<PrintPdfResult> {
  const preset = getPrintPreset(project.trimFormat);
  const pageWidthMm = Number((preset.trimWidthMm + preset.bleedMm * 2).toFixed(2));
  const pageHeightMm = Number((preset.trimHeightMm + preset.bleedMm * 2).toFixed(2));

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [pageWidthMm, pageHeightMm],
    compress: true,
  });

  doc.setProperties({
    title: project.name || 'Manga sin título',
    author: project.author || 'MANGAI Studio',
    subject: `${preset.name} (${preset.trimLabel}, Bleed ${preset.bleedMm}mm)`,
    creator: 'MANGAI Studio OS',
  });

  let addedPages = 0;

  // Optional front cover as Page 1 if artwork exists
  const frontCoverSrc = toDataImageSrc(
    project.cover.frontBase64 || project.cover.fullWrapBase64 || '',
  );
  if (frontCoverSrc && frontCoverSrc.startsWith('data:image/')) {
    const imgFormat = frontCoverSrc.includes('image/jpeg') || frontCoverSrc.includes('image/jpg')
      ? 'JPEG'
      : 'PNG';
    try {
      doc.addImage(frontCoverSrc, imgFormat, 0, 0, pageWidthMm, pageHeightMm, undefined, 'FAST');
      addedPages += 1;
    } catch {
      // Skip unsupported cover format gracefully and continue with interior pages.
    }
  }

  for (let i = 0; i < project.pages.length; i += 1) {
    const page = project.pages[i];
    if (addedPages > 0) {
      doc.addPage([pageWidthMm, pageHeightMm], 'portrait');
    }

    const flattenedBase64 = await renderPrintablePageToPngBase64(page, preset);
    if (flattenedBase64) {
      doc.addImage(
        `data:image/png;base64,${flattenedBase64}`,
        'PNG',
        0,
        0,
        pageWidthMm,
        pageHeightMm,
        undefined,
        'FAST',
      );
    } else {
      // Fallback clean print sheet header if running in a headless/no-canvas context
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidthMm, pageHeightMm, 'F');
      doc.setTextColor(17, 17, 17);
      doc.setFontSize(12);
      doc.text(
        `${project.name || 'Manga'} — Página ${i + 1} (${preset.shortName})`,
        preset.bleedMm + 8,
        preset.bleedMm + 14,
      );
    }

    addedPages += 1;
  }

  const dataUri = doc.output('datauristring');
  const { base64 } = splitDataUrl(dataUri);

  return {
    base64,
    filename: getPrintPdfFilename(project),
    pageCount: addedPages,
    widthMm: pageWidthMm,
    heightMm: pageHeightMm,
    formatName: preset.name,
  };
}
