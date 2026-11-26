import { getPolygonBounds, type PolygonPoint } from '@/lib/kai/schema';
import {
  buildShoutPath,
  buildTailPoints,
  buildThoughtBubbles,
  buildThoughtPath,
  computeBalloonGeometry,
} from '@/lib/print/fukidashiGeometry';
import {
  computeSpineInches,
  getPrintPreset,
  isBalloonInsideNaiwaku,
  slugifyFilename,
  type PrintPresetSpec,
  type TrimFormatId,
} from '@/lib/print/presets';
import JSZip from '@/app/studio/jszip-lite';
import {
  DEFAULT_LAYERS_VISIBILITY,
  DEFAULT_LAYER_OPACITY,
  splitDataUrl,
  toDataImageSrc,
  type Koma,
  type Page,
  type Project,
} from '@/app/studio/types';

export interface PreflightCheck {
  id: 'non_printable_layers' | 'naiwaku_balloons' | 'spine_sync' | 'output_format';
  status: 'ok' | 'warn';
  title: string;
  detail: string;
}

export interface PreflightReport {
  checks: PreflightCheck[];
  outOfBoundsPages: number[];
  zipFilename: string;
  preset: PrintPresetSpec;
  spineInches: number;
  spineMm: number;
}

export function getPrintBundleFilename(project: Project): string {
  const format: TrimFormatId = project.trimFormat || 'tankobon_b6';
  const slug = slugifyFilename(project.name || 'manga_sin_titulo');
  return `${slug}_${format}_PRINT_BUNDLE.zip`;
}

export function runPreflightChecks(project: Project): PreflightReport {
  const preset = getPrintPreset(project.trimFormat);
  const expectedSpine = computeSpineInches(
    project.pageCount,
    project.paperType,
    project.colorMode,
    project.bindingType,
  );
  const actualSpine = project.cover.spineWidthInches;
  const spineSynced = Math.abs(expectedSpine - actualSpine) < 0.002;
  const spineMm = Number((expectedSpine * 25.4).toFixed(2));

  const outOfBoundsPages: number[] = [];
  let totalBalloons = 0;

  project.pages.forEach((page, pageIdx) => {
    let pageHasWarning = false;
    for (const koma of page.komas ?? []) {
      for (const dlg of koma.dialogues ?? []) {
        totalBalloons += 1;
        const ok = isBalloonInsideNaiwaku(
          {
            x: typeof dlg.x === 'number' ? dlg.x : 50,
            y: typeof dlg.y === 'number' ? dlg.y : 25,
            width: dlg.width ?? 18,
            text: dlg.text,
          },
          preset,
        );
        if (!ok) pageHasWarning = true;
      }
    }
    if (pageHasWarning) {
      outOfBoundsPages.push(pageIdx + 1);
    }
  });

  const checks: PreflightCheck[] = [
    {
      id: 'non_printable_layers',
      status: 'ok',
      title: 'Capas no imprimibles (L0 y L6) excluidas del export',
      detail:
        'El motor de aplanado compone estrictamente L1 → L5. El boceto azul Nemu (L0) y las guías #00AEEF (L6) se omiten automáticamente.',
    },
    {
      id: 'naiwaku_balloons',
      status: outOfBoundsPages.length === 0 ? 'ok' : 'warn',
      title:
        outOfBoundsPages.length === 0
          ? 'Globos de diálogo dentro del área segura Naiwaku'
          : `Riesgo de corte en Naiwaku (Pág. ${outOfBoundsPages.join(', ')})`,
      detail:
        outOfBoundsPages.length === 0
          ? totalBalloons > 0
            ? `${totalBalloons} globo(s) verificados dentro del margen seguro de ${preset.shortName}.`
            : 'Sin globos fuera de margen (aún puedes añadir globos en capa L5).'
          : `Mueve los globos señalados en rojo/ámbar hacia el interior del área segura en: Página ${outOfBoundsPages.join(', ')}.`,
    },
    {
      id: 'spine_sync',
      status: spineSynced ? 'ok' : 'warn',
      title: 'Ancho de lomo sincronizado con el número real de páginas',
      detail: `${project.pageCount} págs. (${project.paperType === 'cream' ? 'Crema' : 'Blanco'}) → ${expectedSpine.toFixed(4)}" (${spineMm} mm).`,
    },
    {
      id: 'output_format',
      status: 'ok',
      title: `Formato de salida verificado (${preset.shortName})`,
      detail: `${preset.exportWidthPx} × ${preset.exportHeightPx} px · Sangrado ${preset.bleedLabel} · Interiores ${preset.dpiInterior} DPI.`,
    },
  ];

  return {
    checks,
    outOfBoundsPages,
    zipFilename: getPrintBundleFilename(project),
    preset,
    spineInches: expectedSpine,
    spineMm,
  };
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src || typeof Image === 'undefined') {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function tracePolygonPath(
  ctx: CanvasRenderingContext2D,
  coords: PolygonPoint[],
  w: number,
  h: number,
) {
  ctx.beginPath();
  coords.forEach((pt, idx) => {
    const px = (pt.x / 100) * w;
    const py = (pt.y / 100) * h;
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
}

function drawScreentone(
  ctx: CanvasRenderingContext2D,
  koma: Koma,
  w: number,
  h: number,
  opacityPct: number,
) {
  const tone = koma.screentonePreset || 'none';
  if (tone === 'none') return;

  const alpha = Math.min(1, Math.max(0, opacityPct / 100));
  ctx.save();
  tracePolygonPath(ctx, koma.polygonCoords, w, h);
  ctx.clip();
  ctx.globalAlpha = alpha;

  const bounds = getPolygonBounds(koma.polygonCoords);
  const bx = (bounds.left / 100) * w;
  const by = (bounds.top / 100) * h;
  const bw = (bounds.width / 100) * w;
  const bh = (bounds.height / 100) * h;

  if (tone === 'beta_black') {
    ctx.fillStyle = '#111111';
    ctx.fillRect(bx, by, bw, bh);
  } else if (tone === 'gradient') {
    const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
    grad.addColorStop(0, 'rgba(17,17,17,0.55)');
    grad.addColorStop(1, 'rgba(17,17,17,0.03)');
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, bw, bh);
  } else {
    // Halftone dot screentone (15%, 30%, 60%)
    const step = Math.max(10, Math.round(w / 140));
    const radius =
      tone === 'dots_60' ? step * 0.34 : tone === 'dots_30' ? step * 0.23 : step * 0.14;
    ctx.fillStyle = '#111111';
    for (let y = by; y <= by + bh; y += step) {
      for (let x = bx; x <= bx + bw; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawSpeedlines(
  ctx: CanvasRenderingContext2D,
  koma: Koma,
  w: number,
  h: number,
) {
  const fx = koma.speedlinePreset || 'none';
  if (fx === 'none') return;

  const bounds = getPolygonBounds(koma.polygonCoords);
  const bx = (bounds.left / 100) * w;
  const by = (bounds.top / 100) * h;
  const bw = (bounds.width / 100) * w;
  const bh = (bounds.height / 100) * h;

  ctx.save();
  tracePolygonPath(ctx, koma.polygonCoords, w, h);
  ctx.clip();
  ctx.strokeStyle = 'rgba(17,17,17,0.72)';

  if (fx === 'ryusen') {
    const count = 28;
    for (let i = 0; i < count; i++) {
      const y = by + (bh * i) / count;
      ctx.lineWidth = i % 3 === 0 ? Math.max(2, w * 0.0016) : Math.max(1, w * 0.0008);
      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.lineTo(bx + bw, y - bh * 0.06);
      ctx.stroke();
    }
  } else if (fx === 'shuchusen') {
    const cx = bx + bw / 2;
    const cy = by + bh / 2;
    const maxR = Math.hypot(bw, bh) * 0.72;
    const innerR = Math.min(bw, bh) * 0.24;
    const rays = 48;
    for (let i = 0; i < rays; i++) {
      const angle = (Math.PI * 2 * i) / rays;
      ctx.lineWidth = i % 2 === 0 ? Math.max(2, w * 0.0018) : Math.max(1, w * 0.0009);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
      ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawSvgPathOnCanvas(
  ctx: CanvasRenderingContext2D,
  svgPathData: string,
  w: number,
  h: number,
) {
  // Convert percentage-space SVG path commands (M/L/Q/Z) into pixel-space Canvas calls
  const tokens = svgPathData.match(/[MLQZ]|-?\d+(?:\.\d+)?/g);
  if (!tokens) return;

  ctx.beginPath();
  let i = 0;
  let cmd = '';
  while (i < tokens.length) {
    const t = tokens[i];
    if (t === 'M' || t === 'L' || t === 'Q' || t === 'Z') {
      cmd = t;
      i += 1;
      if (cmd === 'Z') {
        ctx.closePath();
      }
      continue;
    }
    if (cmd === 'M') {
      const x = (Number(tokens[i]) / 100) * w;
      const y = (Number(tokens[i + 1]) / 100) * h;
      ctx.moveTo(x, y);
      i += 2;
    } else if (cmd === 'L') {
      const x = (Number(tokens[i]) / 100) * w;
      const y = (Number(tokens[i + 1]) / 100) * h;
      ctx.lineTo(x, y);
      i += 2;
    } else if (cmd === 'Q') {
      const cx = (Number(tokens[i]) / 100) * w;
      const cy = (Number(tokens[i + 1]) / 100) * h;
      const x = (Number(tokens[i + 2]) / 100) * w;
      const y = (Number(tokens[i + 3]) / 100) * h;
      ctx.quadraticCurveTo(cx, cy, x, y);
      i += 4;
    } else {
      i += 1;
    }
  }
}

/**
 * STRICT PRE-PRESS FLATTENER (L1 → L5 ONLY):
 * Renders a printable page PNG at exact preset pixel dimensions.
 * GUARANTEES that L0_nemu (blue sketch) and L6_guides (#00AEEF) are NEVER rendered.
 */
export async function renderPrintablePageToPngBase64(
  page: Page,
  preset: PrintPresetSpec,
): Promise<string | null> {
  if (typeof document === 'undefined') return null;

  const w = preset.exportWidthPx;
  const h = preset.exportHeightPx;
  const aspectFactor = h / w;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const vis = {
    ...DEFAULT_LAYERS_VISIBILITY,
    ...(page.layersVisibility ?? {}),
    // Force non-printable layers OFF regardless of UI toggle state:
    L0_nemu: false,
    L6_guides: false,
  };
  const toneOpacity = page.layerOpacity?.L1_tones ?? DEFAULT_LAYER_OPACITY.L1_tones;

  // Clean pure white print stock base
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);

  const komas = page.komas ?? [];

  // Fallback legacy full-page base64 if no komas have ink
  const hasAnyKomaInk = komas.some((k) => Boolean(k.inkRenderUrl));
  if (!hasAnyKomaInk && page.base64 && vis.L2_ink) {
    const legacyImg = await loadImage(toDataImageSrc(page.base64));
    if (legacyImg) {
      ctx.drawImage(legacyImg, 0, 0, w, h);
    }
  }

  // ===== LAYER L1: Screentones & Beta Black =====
  if (vis.L1_tones) {
    for (const koma of komas) {
      drawScreentone(ctx, koma, w, h, toneOpacity);
    }
  }

  // ===== LAYER L2: Inked Panel Art clipped inside Koma Polygons =====
  if (vis.L2_ink) {
    for (const koma of komas) {
      if (!koma.inkRenderUrl) continue;
      const img = await loadImage(toDataImageSrc(koma.inkRenderUrl));
      if (!img) continue;

      const bounds = getPolygonBounds(koma.polygonCoords);
      const bx = (bounds.left / 100) * w;
      const by = (bounds.top / 100) * h;
      const bw = (bounds.width / 100) * w;
      const bh = (bounds.height / 100) * h;

      // Object-fit: cover math inside panel bounds
      const scale = Math.max(bw / img.width, bh / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const dx = bx + (bw - drawW) / 2;
      const dy = by + (bh - drawH) / 2;

      ctx.save();
      tracePolygonPath(ctx, koma.polygonCoords, w, h);
      ctx.clip();
      ctx.drawImage(img, dx, dy, drawW, drawH);
      ctx.restore();
    }
  }

  // ===== LAYER L3: 0.8mm Sumi Ink Borders + Kinetic Speedlines =====
  if (vis.L3_borders_fx) {
    const borderPx = Math.max(4, Math.round(w * 0.0032));
    for (const koma of komas) {
      drawSpeedlines(ctx, koma, w, h);
      ctx.save();
      tracePolygonPath(ctx, koma.polygonCoords, w, h);
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = borderPx;
      ctx.lineJoin = 'miter';
      ctx.stroke();
      ctx.restore();
    }
  }

  // ===== LAYER L4: Kakimoji / SFX with white outer stroke =====
  if (vis.L4_sfx) {
    for (const koma of komas) {
      for (const sfx of koma.sfxItems ?? []) {
        const px = ((typeof sfx.x === 'number' ? sfx.x : 74) / 100) * w;
        const py = ((typeof sfx.y === 'number' ? sfx.y : 76) / 100) * h;
        const rot = ((typeof sfx.rotation === 'number' ? sfx.rotation : -8) * Math.PI) / 180;
        const fontPx = Math.round(w * 0.042);

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rot);
        ctx.font = `italic 900 ${fontPx}px Inter, "Segoe UI", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(10, Math.round(fontPx * 0.26));
        ctx.strokeStyle = '#FFFFFF';
        ctx.strokeText(sfx.text, 0, 0);
        ctx.fillStyle = '#111111';
        ctx.fillText(sfx.text, 0, 0);
        ctx.restore();
      }
    }
  }

  // ===== LAYER L5: Fukidashi Speech Balloons & Editable Text =====
  if (vis.L5_balloons) {
    const strokePx = Math.max(3, Math.round(w * 0.0024));
    for (const koma of komas) {
      for (const dlg of koma.dialogues ?? []) {
        const geom = computeBalloonGeometry(dlg, aspectFactor);
        const cx = (geom.cx / 100) * w;
        const cy = (geom.cy / 100) * h;
        const rx = (geom.rx / 100) * w;
        const ry = (geom.ry / 100) * h;

        ctx.save();
        ctx.lineWidth = strokePx;
        ctx.strokeStyle = '#111111';
        ctx.fillStyle = dlg.style === 'narrator' ? '#FAF8F5' : '#FFFFFF';

        // Tail behind main bubble
        if (dlg.style === 'normal' || dlg.style === 'shout') {
          const ptsStr = buildTailPoints(
            geom.cx,
            geom.cy,
            geom.rx,
            geom.ry,
            geom.tailX,
            geom.tailY,
          );
          const pts = ptsStr.split(' ').map((pair) => {
            const [px, py] = pair.split(',').map(Number);
            return { x: (px / 100) * w, y: (py / 100) * h };
          });
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[1].x, pts[1].y);
          ctx.lineTo(pts[2].x, pts[2].y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (dlg.style === 'thought') {
          const bubbles = buildThoughtBubbles(
            geom.cx,
            geom.cy,
            geom.rx,
            geom.ry,
            geom.tailX,
            geom.tailY,
          );
          for (const b of bubbles) {
            ctx.beginPath();
            ctx.arc((b.x / 100) * w, (b.y / 100) * h, (b.r / 100) * w, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }

        // Balloon body
        if (dlg.style === 'normal') {
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (dlg.style === 'whisper') {
          ctx.setLineDash([strokePx * 3, strokePx * 3]);
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (dlg.style === 'shout') {
          drawSvgPathOnCanvas(ctx, buildShoutPath(geom.cx, geom.cy, geom.rx, geom.ry), w, h);
          ctx.fill();
          ctx.stroke();
        } else if (dlg.style === 'thought') {
          drawSvgPathOnCanvas(ctx, buildThoughtPath(geom.cx, geom.cy, geom.rx, geom.ry), w, h);
          ctx.fill();
          ctx.stroke();
        } else if (dlg.style === 'narrator') {
          ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
          ctx.strokeRect(cx - rx, cy - ry, rx * 2, ry * 2);
        } else if (dlg.style === 'system') {
          ctx.fillStyle = '#111111';
          ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
          ctx.strokeStyle = '#111111';
          ctx.strokeRect(cx - rx, cy - ry, rx * 2, ry * 2);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = Math.max(2, strokePx * 0.65);
          const inset = Math.max(8, strokePx * 2.5);
          ctx.strokeRect(cx - rx + inset, cy - ry + inset, rx * 2 - inset * 2, ry * 2 - inset * 2);
        }

        // Balloon text
        const textPx = Math.max(22, Math.round((geom.fontSize / 100) * w * 1.15));
        const lineStep = textPx * 1.24;
        ctx.font =
          dlg.style === 'shout'
            ? `800 ${textPx}px Inter, "Segoe UI", sans-serif`
            : dlg.style === 'system'
            ? `700 ${Math.round(textPx * 0.92)}px "JetBrains Mono", monospace`
            : `600 ${textPx}px Inter, "Segoe UI", sans-serif`;
        ctx.fillStyle = dlg.style === 'system' ? '#FFFFFF' : '#111111';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const startY = cy - ((geom.lines.length - 1) * lineStep) / 2;
        geom.lines.forEach((line, lIdx) => {
          ctx.fillText(line, cx, startY + lIdx * lineStep, rx * 1.75);
        });

        ctx.restore();
      }
    }
  }

  const dataUrl = canvas.toDataURL('image/png');
  return splitDataUrl(dataUrl).base64 || null;
}

function buildReadmeImprenta(project: Project, report: PreflightReport): string {
  const { preset, spineInches, spineMm, outOfBoundsPages } = report;
  return [
    '============================================================',
    `MANGAI STUDIO OS — ESPECIFICACIONES DE IMPRENTA (${preset.name})`,
    '============================================================',
    '',
    `Obra:                 ${project.name || 'Manga sin título'}`,
    `Autor / Mangaka:      ${project.author || 'Autor'}`,
    `Dirección de lectura: ${(project.readingDirection || 'rtl').toUpperCase()}`,
    `Formato de salida:    ${preset.name} (${preset.id})`,
    `Dimensiones exactas:  ${preset.exportWidthPx} x ${preset.exportHeightPx} px`,
    `Corte (Trim):         ${preset.trimLabel}`,
    `Sangrado (Bleed):     ${preset.bleedLabel} (${preset.bleedMm} mm)`,
    `Resolución objetivo:  Interiores ${preset.dpiInterior} DPI / Portada ${preset.dpiCover} DPI`,
    `Total de páginas:     ${project.pageCount} páginas (${project.paperType === 'cream' ? 'Crema Premium' : 'Blanco Estándar'})`,
    `Ancho de lomo exacto: ${spineInches.toFixed(4)}" (${spineMm} mm)`,
    `ISBN-13:              ${project.cover.includeIsbn === false ? 'Omitido (Edición sin ISBN)' : project.cover.isbn || 'Sin asignar'}`,
    '',
    'APLANADO ESTRICTO DE CAPAS (PRE-PRENSA):',
    '- Incluidas: L1 (Tramas Screentone/Beta), L2 (Tinta), L3 (Marcos y Líneas Cinéticas), L4 (SFX Kakimoji), L5 (Globos Fukidashi).',
    '- Omitidas automáticamente: L0 (Boceto Azul Nemu) y L6 (Guías Técnicas #00AEEF).',
    '',
    outOfBoundsPages.length === 0
      ? 'VERIFICACIÓN NAIWAKU: Todos los globos están dentro del área segura de corte.'
      : `AVISO NAIWAKU: Revisa los globos cercanos al borde en Página(s): ${outOfBoundsPages.join(', ')}.`,
    '',
    preset.id === 'b4_canva_pro'
      ? 'GUÍA CANVA BRIDGE B4: Crea un diseño personalizado en Canva de 2150 x 3035 px y arrastra cada archivo de /interior/page_XXX_print.png al 100% sin escalar.'
      : 'GUÍA EDITORIAL: Importa los archivos de /interior/page_XXX_print.png en orden secuencial para maquetación o subida directa a imprenta.',
    '',
  ].join('\n');
}

export async function buildPrintBundle(project: Project): Promise<{
  base64: string;
  filename: string;
  report: PreflightReport;
}> {
  const report = runPreflightChecks(project);
  const { preset } = report;
  const zip = new JSZip();

  const manifest = {
    schemaVersion: '3.0.0',
    exportedAt: new Date().toISOString(),
    title: project.name,
    author: project.author,
    trimFormat: preset.id,
    printSpec: {
      name: preset.name,
      trim: preset.trimLabel,
      bleedMm: preset.bleedMm,
      exportPixels: `${preset.exportWidthPx}x${preset.exportHeightPx}`,
      dpiInterior: preset.dpiInterior,
      dpiCover: preset.dpiCover,
      spineWidthInches: Number(report.spineInches.toFixed(4)),
      spineWidthMm: report.spineMm,
      isbn: project.cover.includeIsbn === false ? null : project.cover.isbn || null,
    },
    flattenedLayersIncluded: ['L1_tones', 'L2_ink', 'L3_borders_fx', 'L4_sfx', 'L5_balloons'],
    nonPrintableLayersExcluded: ['L0_nemu', 'L6_guides'],
    preflightChecks: report.checks,
    pageCount: project.pageCount,
    manuscriptPagesRendered: project.pages.length,
  };

  zip.file('print_manifest.json', JSON.stringify(manifest, null, 2));
  zip.file('kdp_manifest.json', JSON.stringify({ ...project, printSpec: preset.name }, null, 2));
  zip.file('README_IMPRENTA.txt', buildReadmeImprenta(project, report));

  if (project.cover.fullWrapBase64) {
    const { base64 } = splitDataUrl(project.cover.fullWrapBase64);
    if (base64) {
      zip.file('cover/paperback_wrap.png', base64, { base64: true });
    }
  }

  for (let i = 0; i < project.pages.length; i++) {
    const page = project.pages[i];
    const pageNum = String(i + 1).padStart(3, '0');

    // Render strict L1 -> L5 flattened print page at exact preset pixel size
    const flattenedBase64 = await renderPrintablePageToPngBase64(page, preset);
    if (flattenedBase64) {
      zip.file(`interior/page_${pageNum}_print.png`, flattenedBase64, { base64: true });
    }

    // Also include raw inked panels as separate reference assets
    for (const koma of page.komas ?? []) {
      if (koma.inkRenderUrl) {
        const { base64 } = splitDataUrl(koma.inkRenderUrl);
        if (base64) {
          zip.file(
            `interior/raw_komas/page_${pageNum}_koma_${String(koma.panelIndex).padStart(2, '0')}.png`,
            base64,
            { base64: true },
          );
        }
      }
    }
  }

  const base64 = await zip.generateAsync({ type: 'base64' });
  return {
    base64,
    filename: report.zipFilename,
    report,
  };
}
