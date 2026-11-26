'use client';

import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import {
  AlertTriangle,
  Barcode,
  BookOpen,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Palette,
  RefreshCw,
  Ruler,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  computeEan13CheckDigit,
  encodeEan13,
  extractIsbnDigits,
  formatIsbn13,
} from '@/lib/print/ean13';
import {
  PRINT_PRESET_LIST,
  getPrintPreset,
  slugifyFilename,
  type TrimFormatId,
} from '@/lib/print/presets';
import { type Project, toDataImageSrc } from '../types';
import './CoverDesigner.css';

export interface CoverDesignerHandle {
  exportCover: () => Promise<void>;
}

type CoverPreviewTab = 'wrap' | 'front' | 'back';

function Ean13BarcodeSvg({ isbn }: { isbn: string }) {
  const encoded = encodeEan13(isbn);
  const bits = encoded.bits;
  const totalWidth = 113; // 9px quiet left + 95 modules + 9px quiet right
  const barTop = 6;
  const normalHeight = 40;
  const guardHeight = 46;

  return (
    <div className="gf-isbn-box gf-isbn-box-real" title={encoded.message}>
      <svg
        viewBox={`0 0 ${totalWidth} 60`}
        className="gf-ean13-svg"
        role="img"
        aria-label={`Código de barras EAN-13 ${encoded.formatted}`}
      >
        <rect x="0" y="0" width={totalWidth} height="60" fill="#FFFFFF" />
        <text
          x={totalWidth / 2}
          y="4.8"
          textAnchor="middle"
          fill="#111111"
          fontSize="4.6"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="700"
        >
          ISBN {encoded.formatted}
        </text>
        {Array.from(bits).map((bit, idx) => {
          if (bit !== '1') return null;
          const isGuard = idx < 3 || (idx >= 45 && idx < 50) || idx >= 92;
          return (
            <rect
              key={idx}
              x={9 + idx}
              y={barTop}
              width="1.05"
              height={isGuard ? guardHeight : normalHeight}
              fill="#111111"
            />
          );
        })}
        <text
          x="5.5"
          y="55"
          textAnchor="middle"
          fill="#111111"
          fontSize="6.4"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="700"
        >
          {encoded.digits[0] || '9'}
        </text>
        <text
          x="33"
          y="55"
          textAnchor="middle"
          fill="#111111"
          fontSize="6.4"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="700"
          letterSpacing="1.1"
        >
          {(encoded.digits.slice(1, 7) || '789945').padEnd(6, '0')}
        </text>
        <text
          x="80"
          y="55"
          textAnchor="middle"
          fill="#111111"
          fontSize="6.4"
          fontFamily="JetBrains Mono, monospace"
          fontWeight="700"
          letterSpacing="1.1"
        >
          {(encoded.digits.slice(7, 13) || '000000').padEnd(6, '0')}
        </text>
      </svg>
    </div>
  );
}

function loadCanvasImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCoverImageFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const iw = img.naturalWidth || img.width || dw;
  const ih = img.naturalHeight || img.height || dh;
  const scale = Math.max(dw / iw, dh / ih);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = Math.max(0, (iw - sw) / 2);
  const sy = Math.max(0, (ih - sh) / 2);
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 6);
}

function drawEan13OnCanvas(
  ctx: CanvasRenderingContext2D,
  isbn: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const encoded = encodeEan13(isbn);
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(17,17,17,0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = '#111111';
  ctx.font = `700 ${Math.round(h * 0.11)}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(`ISBN ${encoded.formatted}`, x + w / 2, y + h * 0.14);

  const moduleWidth = (w * 0.84) / 95;
  const startX = x + w * 0.08;
  const barTop = y + h * 0.2;
  const normalH = h * 0.56;
  const guardH = h * 0.64;

  for (let i = 0; i < encoded.bits.length; i++) {
    if (encoded.bits[i] !== '1') continue;
    const isGuard = i < 3 || (i >= 45 && i < 50) || i >= 92;
    ctx.fillRect(
      startX + i * moduleWidth,
      barTop,
      Math.max(1.2, moduleWidth),
      isGuard ? guardH : normalH,
    );
  }

  ctx.font = `700 ${Math.round(h * 0.13)}px "JetBrains Mono", monospace`;
  ctx.fillText(encoded.digits || '9789945000000', x + w / 2, y + h * 0.93);
  ctx.restore();
}

export const CoverDesigner = forwardRef<
  CoverDesignerHandle,
  {
    project: Project;
    updateProject: (updates: Partial<Project>) => void;
    isGeneratingCover?: boolean;
  }
>(({ project, updateProject, isGeneratingCover = false }, ref) => {
  const [previewTab, setPreviewTab] = useState<CoverPreviewTab>('wrap');
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  const preset = getPrintPreset(project.trimFormat);
  const spineMm = (project.cover.spineWidthInches * 25.4).toFixed(2);
  const wrapSrc = toDataImageSrc(project.cover.fullWrapBase64);
  const frontSrc = toDataImageSrc(project.cover.frontBase64) || wrapSrc;
  const backSrc = toDataImageSrc(project.cover.backBase64) || wrapSrc;
  const hasAnyArt = Boolean(wrapSrc || frontSrc || backSrc);
  const hasIndependentSplit = Boolean(
    (project.cover.frontBase64 && project.cover.frontBase64 !== project.cover.fullWrapBase64) ||
      (project.cover.backBase64 && project.cover.backBase64 !== project.cover.fullWrapBase64),
  );

  const includeIsbn = project.cover.includeIsbn !== false;
  const rawIsbn = project.cover.isbn ?? '978-9945-0000-0-0';
  const isbnEncoded = encodeEan13(rawIsbn);
  const isbnDigits = extractIsbnDigits(rawIsbn);
  const spineTitle = project.cover.spineTitle?.trim() || project.name || 'Manga sin título';
  const backSynopsis = project.cover.backSynopsis?.trim() || '';
  const authorLabel = project.author || 'Autor';
  const titleLabel = project.name || 'Manga sin título';

  const handleSelectPreset = (formatId: TrimFormatId) => {
    updateProject({ trimFormat: formatId });
  };

  const handleAutofixIsbnCheckDigit = () => {
    const first12 = isbnDigits.padEnd(12, '0').slice(0, 12);
    const check = computeEan13CheckDigit(first12);
    const fixed = formatIsbn13(`${first12}${check}`);
    updateProject({
      cover: {
        ...project.cover,
        isbn: fixed,
        includeIsbn: true,
      },
    });
  };

  // Proportional spine width in px clamped cleanly for visual preview
  const spineWidthPx = Math.min(54, Math.max(28, Math.round(project.cover.spineWidthInches * 92)));

  const handleExportCover = useCallback(async () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    setExporting(true);
    try {
      const canvasWidth = 2400;
      const canvasHeight = 1520;
      const spinePx = Math.min(180, Math.max(64, Math.round(project.cover.spineWidthInches * 240)));
      const panelWidth = Math.floor((canvasWidth - spinePx) / 2);

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Base sheet background (no cyan guides included in export)
      ctx.fillStyle = project.paperType === 'cream' ? '#FAF5E8' : '#FAF8F5';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      const [wrapImg, frontImg, backImg] = await Promise.all([
        loadCanvasImage(wrapSrc),
        loadCanvasImage(frontSrc),
        loadCanvasImage(backSrc),
      ]);

      if (wrapImg && !hasIndependentSplit) {
        drawCoverImageFit(ctx, wrapImg, 0, 0, canvasWidth, canvasHeight);
      } else {
        if (backImg) {
          drawCoverImageFit(ctx, backImg, 0, 0, panelWidth, canvasHeight);
        }
        if (frontImg) {
          drawCoverImageFit(ctx, frontImg, panelWidth + spinePx, 0, panelWidth, canvasHeight);
        }
      }

      // Center Spine Band + Rotated Spine Title
      ctx.save();
      ctx.fillStyle = 'rgba(17, 17, 17, 0.72)';
      ctx.fillRect(panelWidth, 0, spinePx, canvasHeight);
      ctx.translate(panelWidth + spinePx / 2, canvasHeight / 2);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 28px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${spineTitle.toUpperCase()} · ${authorLabel.toUpperCase()}`, 0, 0);
      ctx.restore();

      // Back Cover Synopsis Card (Left panel)
      if (backSynopsis) {
        ctx.save();
        const boxX = 96;
        const boxY = 260;
        const boxW = panelWidth - 192;
        const boxH = 420;
        ctx.fillStyle = 'rgba(17, 17, 17, 0.76)';
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxW, boxH);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '500 28px "Inter", sans-serif';
        const lines = wrapLines(ctx, backSynopsis, boxW - 64);
        lines.forEach((line, idx) => {
          ctx.fillText(line, boxX + 32, boxY + 68 + idx * 44);
        });
        ctx.font = '700 20px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(authorLabel.toUpperCase(), boxX + 32, boxY + boxH - 36);
        ctx.restore();
      }

      // Back Cover EAN-13 Barcode (Bottom-right of Back Cover)
      if (includeIsbn) {
        drawEan13OnCanvas(
          ctx,
          project.cover.isbn || '978-9945-0000-0-0',
          panelWidth - 410,
          canvasHeight - 235,
          340,
          170,
        );
      }

      // Front Cover Title + Author Bar (Right panel)
      ctx.save();
      const frontX = panelWidth + spinePx + 64;
      const frontW = panelWidth - 128;
      const grad = ctx.createLinearGradient(0, canvasHeight - 320, 0, canvasHeight - 40);
      grad.addColorStop(0, 'rgba(17,17,17,0)');
      grad.addColorStop(1, 'rgba(17,17,17,0.86)');
      ctx.fillStyle = grad;
      ctx.fillRect(frontX, canvasHeight - 300, frontW, 240);

      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'right';
      ctx.font = '800 54px "Inter", sans-serif';
      ctx.fillText(titleLabel, frontX + frontW - 28, canvasHeight - 132);
      ctx.font = '700 24px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillText(authorLabel.toUpperCase(), frontX + frontW - 28, canvasHeight - 84);
      ctx.restore();

      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngUrl;
      link.download = `cover_${slugifyFilename(project.name)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setExporting(false);
    }
  }, [
    authorLabel,
    backSrc,
    backSynopsis,
    frontSrc,
    hasIndependentSplit,
    includeIsbn,
    project.cover.isbn,
    project.cover.spineWidthInches,
    project.name,
    project.paperType,
    spineTitle,
    titleLabel,
    wrapSrc,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      exportCover: handleExportCover,
    }),
    [handleExportCover],
  );

  const handleUploadSlot = (slot: 'fullWrapBase64' | 'frontBase64' | 'backBase64') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') return;
        const dataUrl = reader.result;
        if (slot === 'fullWrapBase64') {
          updateProject({
            cover: {
              ...project.cover,
              fullWrapBase64: dataUrl,
              frontBase64: dataUrl,
              backBase64: dataUrl,
            },
          });
          setPreviewTab('wrap');
        } else {
          updateProject({
            cover: {
              ...project.cover,
              [slot]: dataUrl,
            },
          });
          setPreviewTab(slot === 'frontBase64' ? 'front' : 'back');
        }
      };
      reader.readAsDataURL(file);
    };

  const handleAskKaiCover = () => {
    if (typeof window === 'undefined') return;
    const prompt = `Diseña la portada Tankōbon para «${titleLabel}» (formato ${preset.shortName}, modo ${
      project.colorMode === 'color' ? 'Color' : 'Sumi B/N + acento carmesí'
    }). Incluye un [PROMPT VISUAL]: listo para generar la cubierta envolvente 16:9 con composición clara de portada frontal, lomo y contraportada.`;
    window.dispatchEvent(
      new CustomEvent('mangai-kai-ask', {
        detail: { prompt, mode: 'mentor' },
      }),
    );
  };

  return (
    <div className="gf-cover-wrap animate-slide-in-right">
      <div className="gf-cover-header">
        <h1 className="gf-page-title">Portada Tankōbon</h1>
        <p className="gf-cover-subtitle">
          {preset.name} ({preset.trimLabel}) · Sangrado {preset.bleedLabel} · Lomo:{' '}
          {project.cover.spineWidthInches.toFixed(3)}&quot; ({spineMm} mm)
        </p>
      </div>

      {/* Format Presets (Tankōbon B6, Canva B4 2150×3035 + 3.5mm, KDP 6×9") & Editable ISBN-13 */}
      <div className="gf-cover-prepress-panel" aria-label="Presets de Imprenta e ISBN-13 Editable">
        <div className="gf-cover-presets-row" role="radiogroup" aria-label="Formato de corte y sangrado">
          {PRINT_PRESET_LIST.map((p) => {
            const active = preset.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`gf-cover-preset-card ${active ? 'is-active' : ''}`}
                onClick={() => handleSelectPreset(p.id)}
              >
                <div className="gf-cover-preset-top">
                  <span className="gf-cover-preset-name">{p.shortName}</span>
                  <span className="gf-cover-preset-badge">{p.badge}</span>
                </div>
                <span className="gf-cover-preset-meta">
                  {p.exportWidthPx}×{p.exportHeightPx} px · Sangrado {p.bleedMm} mm · {p.dpiInterior} DPI
                </span>
              </button>
            );
          })}
        </div>

        <div className="gf-cover-isbn-bar">
          <div className="gf-cover-isbn-field">
            <div className="gf-cover-isbn-label-row">
              <label htmlFor="gf-cover-isbn-input" className="gf-cover-isbn-label">
                <Barcode size={13} strokeWidth={2} className="gf-icon-shrink" />
                <span>ISBN-13 Editable (EAN-13 Vectorial)</span>
              </label>
              <label className="gf-cover-isbn-toggle">
                <input
                  type="checkbox"
                  checked={includeIsbn}
                  onChange={(e) =>
                    updateProject({
                      cover: { ...project.cover, includeIsbn: e.target.checked },
                    })
                  }
                />
                <span>Imprimir código en contraportada</span>
              </label>
            </div>

            <div className="gf-cover-isbn-input-row">
              <input
                id="gf-cover-isbn-input"
                type="text"
                className="gf-cover-text-input gf-cover-isbn-input"
                value={project.cover.isbn ?? '978-9945-0000-0-0'}
                disabled={!includeIsbn}
                placeholder="978-9945-0000-0-0"
                onChange={(e) =>
                  updateProject({
                    cover: {
                      ...project.cover,
                      isbn: formatIsbn13(e.target.value),
                    },
                  })
                }
              />
              <span
                className={`gf-cover-isbn-status ${
                  isbnEncoded.valid && isbnEncoded.checksumValid ? 'is-valid' : 'is-warn'
                }`}
              >
                {isbnEncoded.valid && isbnEncoded.checksumValid ? (
                  <CheckCircle2 size={12} strokeWidth={2.2} className="gf-icon-shrink" />
                ) : (
                  <AlertTriangle size={12} strokeWidth={2.2} className="gf-icon-shrink" />
                )}
                <span>{isbnEncoded.message}</span>
              </span>
              {(!isbnEncoded.valid || !isbnEncoded.checksumValid) && includeIsbn && (
                <button
                  type="button"
                  className="gf-cover-isbn-fix-btn"
                  onClick={handleAutofixIsbnCheckDigit}
                >
                  Calcular dígito EAN-13
                </button>
              )}
            </div>
          </div>

          <div className="gf-cover-meta-fields">
            <div className="gf-cover-meta-col">
              <label htmlFor="gf-cover-spine-input" className="gf-cover-isbn-label">
                Título en Lomo ({spineMm} mm)
              </label>
              <input
                id="gf-cover-spine-input"
                type="text"
                className="gf-cover-text-input"
                value={project.cover.spineTitle ?? ''}
                placeholder={project.name || 'Título en el lomo'}
                onChange={(e) =>
                  updateProject({
                    cover: { ...project.cover, spineTitle: e.target.value },
                  })
                }
              />
            </div>
            <div className="gf-cover-meta-col">
              <label htmlFor="gf-cover-synopsis-input" className="gf-cover-isbn-label">
                Sinopsis en Contraportada
              </label>
              <input
                id="gf-cover-synopsis-input"
                type="text"
                className="gf-cover-text-input"
                value={project.cover.backSynopsis ?? ''}
                placeholder="Breve sinopsis editorial para la contraportada..."
                onChange={(e) =>
                  updateProject({
                    cover: { ...project.cover, backSynopsis: e.target.value },
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preview Tabs + Guides Toggle + KAI + Canvas PNG Export */}
      <div className="gf-cover-toolbar">
        <div className="gf-cover-tabs" role="tablist" aria-label="Vista de cubierta Tankōbon">
          <button
            type="button"
            role="tab"
            aria-selected={previewTab === 'wrap'}
            className={`gf-cover-tab-btn ${previewTab === 'wrap' ? 'is-active' : ''}`}
            onClick={() => setPreviewTab('wrap')}
          >
            Full Wrap 16:9
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={previewTab === 'front'}
            className={`gf-cover-tab-btn ${previewTab === 'front' ? 'is-active' : ''}`}
            onClick={() => setPreviewTab('front')}
          >
            Portada Frontal
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={previewTab === 'back'}
            className={`gf-cover-tab-btn ${previewTab === 'back' ? 'is-active' : ''}`}
            onClick={() => setPreviewTab('back')}
          >
            Contraportada + EAN-13
          </button>
        </div>

        <div className="gf-cover-tools-right">
          <button
            type="button"
            className={`gf-cover-tool-btn ${showGuides ? 'is-active' : ''}`}
            onClick={() => setShowGuides((v) => !v)}
            aria-pressed={showGuides}
          >
            {showGuides ? <Eye size={13} strokeWidth={2} /> : <EyeOff size={13} strokeWidth={2} />}
            <span>Guías de Corte / Sangrado</span>
          </button>

          <button type="button" className="gf-cover-tool-btn is-kai" onClick={handleAskKaiCover}>
            <Sparkles size={13} strokeWidth={2} />
            <span>Diseñar Portada con KAI</span>
          </button>

          <button
            type="button"
            className="gf-cover-tool-btn is-primary"
            onClick={handleExportCover}
            disabled={exporting}
          >
            <Download size={13} strokeWidth={2} />
            <span>{exporting ? 'Exportando PNG...' : 'Exportar PNG'}</span>
          </button>
        </div>
      </div>

      <div className="gf-cover-stage">
        {isGeneratingCover && (
          <div className="gf-task-overlay" role="status" aria-live="polite">
            <RefreshCw size={22} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
            <span>Generando cubierta Tankōbon...</span>
          </div>
        )}

        {hasAnyArt ? (
          previewTab === 'wrap' ? (
            <div className="gf-cover-canvas">
              {hasIndependentSplit ? (
                <div className="gf-cover-split-grid">
                  <div className="gf-cover-split-panel">
                    {backSrc && (
                      <img src={backSrc} alt={`Contraportada de ${titleLabel}`} className="gf-cover-img" />
                    )}
                  </div>
                  <div className="gf-cover-spine-solid" style={{ width: `${spineWidthPx}px` }} />
                  <div className="gf-cover-split-panel">
                    {frontSrc && (
                      <img src={frontSrc} alt={`Portada frontal de ${titleLabel}`} className="gf-cover-img" />
                    )}
                  </div>
                </div>
              ) : (
                <img
                  src={wrapSrc}
                  alt={`Cubierta completa de ${titleLabel}`}
                  className="gf-cover-img"
                />
              )}

              {showGuides && (
                <div className="gf-cover-bleed-frame" aria-hidden="true">
                  <span className="gf-cover-bleed-tag">BLEED {preset.bleedLabel}</span>
                </div>
              )}

              <div className={`gf-cover-guides ${showGuides ? '' : 'is-hidden'}`}>
                <div className="gf-cover-half gf-cover-back">
                  <span className="gf-cover-guide-label">Contraportada</span>
                  {backSynopsis && (
                    <div className="gf-cover-synopsis-card">
                      <p className="gf-cover-synopsis-text">{backSynopsis}</p>
                      <span className="gf-cover-synopsis-author">{authorLabel}</span>
                    </div>
                  )}
                  {includeIsbn && (
                    <Ean13BarcodeSvg isbn={project.cover.isbn || '978-9945-0000-0-0'} />
                  )}
                </div>

                <div className="gf-cover-spine" style={{ width: `${spineWidthPx}px` }}>
                  <span className="gf-cover-spine-label">
                    {spineTitle} · {authorLabel} ({spineMm} mm)
                  </span>
                </div>

                <div className="gf-cover-half gf-cover-front">
                  <span className="gf-cover-guide-label">Portada Frontal</span>
                  <div className="gf-cover-front-meta">
                    <span className="gf-cover-front-title">{titleLabel}</span>
                    <span className="gf-cover-front-author">{authorLabel}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : previewTab === 'front' ? (
            <div className="gf-cover-canvas-single">
              <img
                src={frontSrc}
                alt={`Portada frontal de ${titleLabel}`}
                className="gf-cover-img"
              />
              {showGuides && (
                <div className="gf-cover-bleed-frame" aria-hidden="true">
                  <span className="gf-cover-bleed-tag">PORTADA 3:4 · {preset.bleedLabel}</span>
                </div>
              )}
              <div className="gf-cover-front-meta">
                <span className="gf-cover-front-title">{titleLabel}</span>
                <span className="gf-cover-front-author">{authorLabel}</span>
              </div>
            </div>
          ) : (
            <div className="gf-cover-canvas-single">
              <img
                src={backSrc}
                alt={`Contraportada de ${titleLabel}`}
                className="gf-cover-img"
              />
              {showGuides && (
                <div className="gf-cover-bleed-frame" aria-hidden="true">
                  <span className="gf-cover-bleed-tag">CONTRAPORTADA · {preset.bleedLabel}</span>
                </div>
              )}
              {backSynopsis && (
                <div className="gf-cover-synopsis-card">
                  <p className="gf-cover-synopsis-text">{backSynopsis}</p>
                  <span className="gf-cover-synopsis-author">{authorLabel}</span>
                </div>
              )}
              {includeIsbn && (
                <Ean13BarcodeSvg isbn={project.cover.isbn || '978-9945-0000-0-0'} />
              )}
            </div>
          )
        ) : (
          <div className="gf-cover-empty">
            <BookOpen size={38} strokeWidth={1.5} className="gf-cover-empty-icon gf-icon-shrink" />
            <span className="gf-cover-empty-text">
              GENERA LA CUBIERTA COMPLETA O SUBE PORTADA / CONTRAPORTADA
            </span>
            {includeIsbn && (
              <div className="gf-cover-empty-isbn">
                <Ean13BarcodeSvg isbn={project.cover.isbn || '978-9945-0000-0-0'} />
              </div>
            )}
          </div>
        )}

        <div className="gf-cover-upload-strip">
          <span className="gf-cover-upload-label">Subir artes propios (PNG / JPG / WebP):</span>
          <div className="gf-cover-upload-actions">
            <label className="gf-cover-file-btn">
              <Upload size={12} strokeWidth={2} />
              <span>Full Wrap 16:9</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleUploadSlot('fullWrapBase64')}
              />
            </label>
            <label className="gf-cover-file-btn">
              <Upload size={12} strokeWidth={2} />
              <span>Portada Frontal (3:4)</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleUploadSlot('frontBase64')}
              />
            </label>
            <label className="gf-cover-file-btn">
              <Upload size={12} strokeWidth={2} />
              <span>Contraportada (3:4)</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleUploadSlot('backBase64')}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="gf-cover-info-grid">
        <div className="gf-card gf-cover-info-card">
          <Palette size={18} strokeWidth={1.75} className="gf-cover-info-icon gf-icon-shrink" />
          <div>
            <p className="gf-cover-info-title">Tipografía, Capas y Exportación PNG</p>
            <p className="gf-cover-info-text">
              Título en lomo («{spineTitle}»), autor, sinopsis y código EAN-13 vectorial se combinan
              en un PNG limpio (`cover_{slugifyFilename(project.name)}.png`) sin guías cian.
            </p>
          </div>
        </div>

        <div className="gf-card gf-cover-info-card">
          <Ruler size={18} strokeWidth={1.75} className="gf-cover-info-icon gf-icon-shrink" />
          <div>
            <p className="gf-cover-info-title">Especificación {preset.shortName}</p>
            <p className="gf-cover-info-text">
              Corte {preset.trimLabel}, sangrado {preset.bleedLabel} y lomo dinámico de{' '}
              {project.cover.spineWidthInches.toFixed(3)}&quot; ({spineMm} mm) a {preset.dpiCover}{' '}
              DPI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

CoverDesigner.displayName = 'CoverDesigner';
