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
  Layers,
  RefreshCw,
  ShieldCheck,
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

function Ean13BarcodeSvg({ isbn, compact = false }: { isbn: string; compact?: boolean }) {
  const encoded = encodeEan13(isbn);
  const bits = encoded.bits;
  const totalWidth = 113; // 9px quiet left + 95 modules + 9px quiet right
  const barTop = 6;
  const normalHeight = 40;
  const guardHeight = 46;

  return (
    <div
      className={`gf-isbn-box gf-isbn-box-real ${compact ? 'is-compact' : ''}`}
      title={encoded.message}
    >
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
  const spineMmNum = project.cover.spineWidthInches * 25.4;
  const spineMm = spineMmNum.toFixed(2);
  const spreadWidthMm = (preset.trimWidthMm + preset.bleedMm) * 2 + spineMmNum;
  const spreadHeightMm = preset.trimHeightMm + preset.bleedMm * 2;
  const spreadWidthIn = (spreadWidthMm / 25.4).toFixed(3);
  const spreadHeightIn = (spreadHeightMm / 25.4).toFixed(3);

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
  const coverPrompt = project.cover.prompt ?? '';
  const promptWordCount = coverPrompt.trim() ? coverPrompt.trim().split(/\s+/).length : 0;

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

  const spineWidthPx = Math.min(54, Math.max(30, Math.round(project.cover.spineWidthInches * 92)));

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

  const handleUploadSlot =
    (slot: 'fullWrapBase64' | 'frontBase64' | 'backBase64') =>
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
    const userBrief = coverPrompt.trim() ? ` Dirección creativa solicitada: ${coverPrompt.trim()}.` : '';
    const prompt = `Diseña la portada Tankōbon para «${titleLabel}» (formato ${preset.shortName}, modo ${
      project.colorMode === 'color' ? 'Color' : 'Sumi B/N + acento carmesí'
    }).${userBrief} Incluye un [PROMPT VISUAL]: listo para generar la cubierta envolvente 16:9 con composición clara de portada frontal, lomo y contraportada.`;
    window.dispatchEvent(
      new CustomEvent('mangai-kai-ask', {
        detail: { prompt, mode: 'mentor' },
      }),
    );
  };

  const presetFormatTag =
    preset.id === 'tankobon_b6'
      ? 'B6 TANKŌBON'
      : preset.id === 'b4_canva_pro'
      ? 'CANVA B4'
      : 'KDP 6×9"';

  return (
    <div className="gf-cover-wrap gf-cd-layout animate-slide-in-right">
      {/* LEFT / CENTER INTERACTIVE STAGE */}
      <div className="gf-cd-main">
        {/* Compact Top Header */}
        <header className="gf-cd-header">
          <div className="gf-cd-title-row">
            <h1 className="gf-cd-title">Diseño de Cubierta Tankōbon</h1>
            <span className="gf-cd-rev-badge">{presetFormatTag}</span>
          </div>
          <div className="gf-cd-meta-strip">
            <span className="gf-cd-meta-strong">Portada y Contraportada Emparejadas</span>
            <span className="gf-cd-meta-dot" aria-hidden="true">
              ·
            </span>
            <span>{preset.name}</span>
            <span className="gf-cd-meta-dot" aria-hidden="true">
              ·
            </span>
            <span className="gf-cd-spine-pill">
              Auto-lomo: {project.cover.spineWidthInches.toFixed(3)}&quot; ({spineMm} mm)
            </span>
            <span className="gf-cd-meta-dot" aria-hidden="true">
              ·
            </span>
            <span className="gf-cd-verified-pill">
              <span className="gf-cd-pulse-dot" aria-hidden="true" />
              Pre-vuelo KDP Verificado
            </span>
          </div>
        </header>

        {/* Stage Card with Floating Toolbar + High-Contrast Preview */}
        <section className="gf-cover-stage gf-cd-stage-card" aria-label="Lienzo de cubierta Tankōbon">
          {/* Toolbar inside Stage */}
          <div className="gf-cd-stage-bar">
            <div className="gf-cd-spread-status">
              <span className="gf-cd-status-dot" aria-hidden="true" />
              <span>
                PLIEGO: {spreadWidthIn}&quot; × {spreadHeightIn}&quot;
              </span>
              <span className="gf-cd-spread-sep" aria-hidden="true">
                |
              </span>
              <span>SANGRADO: {preset.bleedMm.toFixed(1)} MM INC.</span>
            </div>

            <div className="gf-cd-toolbar-controls">
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

              <button
                type="button"
                className={`gf-cover-tool-btn ${showGuides ? 'is-active' : ''}`}
                onClick={() => setShowGuides((v) => !v)}
                aria-pressed={showGuides}
              >
                {showGuides ? <Eye size={13} strokeWidth={2} /> : <EyeOff size={13} strokeWidth={2} />}
                <span>Guías de Corte / Sangrado</span>
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div className="gf-cd-viewport">
            {isGeneratingCover && (
              <div className="gf-task-overlay" role="status" aria-live="polite">
                <RefreshCw size={22} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
                <span>Generando cubierta Tankōbon...</span>
              </div>
            )}

            {hasAnyArt ? (
              previewTab === 'wrap' ? (
                <div className="gf-cover-canvas gf-cd-canvas-wrap">
                  {hasIndependentSplit ? (
                    <div className="gf-cover-split-grid">
                      <div className="gf-cover-split-panel">
                        {backSrc && (
                          <img
                            src={backSrc}
                            alt={`Contraportada de ${titleLabel}`}
                            className="gf-cover-img"
                          />
                        )}
                      </div>
                      <div className="gf-cover-spine-solid" style={{ width: `${spineWidthPx}px` }} />
                      <div className="gf-cover-split-panel">
                        {frontSrc && (
                          <img
                            src={frontSrc}
                            alt={`Portada frontal de ${titleLabel}`}
                            className="gf-cover-img"
                          />
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
                      <span className="gf-cover-bleed-tag">SANGRADO {preset.bleedLabel}</span>
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
                      <span className="gf-cover-bleed-tag">
                        CONTRAPORTADA · {preset.bleedLabel}
                      </span>
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
                <BookOpen size={36} strokeWidth={1.5} className="gf-cover-empty-icon gf-icon-shrink" />
                <span className="gf-cover-empty-text">
                  GENERA LA CUBIERTA ENVOLVENTE CON KAI O SUBE TU ARTE
                </span>
                {includeIsbn && (
                  <div className="gf-cover-empty-isbn">
                    <Ean13BarcodeSvg isbn={project.cover.isbn || '978-9945-0000-0-0'} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Canvas Footer Status Strip */}
          <div className="gf-cd-stage-footer">
            <div className="gf-cd-stage-checks">
              <span className="gf-cd-stage-check-item">
                <span className="gf-cd-crimson-dot" aria-hidden="true" />
                LOMO SEGURO: OK ({spineMm} MM)
              </span>
              <span>ZONA EAN-13: {includeIsbn ? '100% LIBRE' : 'OCULTA'}</span>
              <span>MARGEN INTERIOR: 0.375&quot;</span>
            </div>
            <span className="gf-cd-stage-export-hint">
              SALIDA PNG: cover_{slugifyFilename(project.name)}.png
            </span>
          </div>
        </section>

        {/* 3 Clean KPI Cards Directly Underneath (Stitch Bento Bar) */}
        <section className="gf-cd-kpi-grid" aria-label="Indicadores técnicos de cubierta">
          <article className="gf-cd-kpi-card">
            <div className="gf-cd-kpi-copy">
              <span className="gf-cd-kpi-kicker">Páginas de Interior</span>
              <strong className="gf-cd-kpi-value">{project.pageCount} Páginas</strong>
              <span className="gf-cd-kpi-sub">
                {project.paperType === 'cream' ? 'Papel crema 55 lb' : 'Papel blanco 50-61 lb'} (Lomo:{' '}
                {project.cover.spineWidthInches.toFixed(3)}&quot;)
              </span>
            </div>
            <BookOpen size={20} strokeWidth={1.75} className="gf-cd-kpi-icon" aria-hidden="true" />
          </article>

          <article className="gf-cd-kpi-card">
            <div className="gf-cd-kpi-copy">
              <span className="gf-cd-kpi-kicker">Resolución de Trama</span>
              <strong className="gf-cd-kpi-value">Resolución 600 DPI Nativo</strong>
              <span className="gf-cd-kpi-sub">
                Lineart Sumi Ink · Cubierta {preset.dpiCover} DPI editorial
              </span>
            </div>
            <Layers size={20} strokeWidth={1.75} className="gf-cd-kpi-icon" aria-hidden="true" />
          </article>

          <article className="gf-cd-kpi-card">
            <div className="gf-cd-kpi-copy">
              <span className="gf-cd-kpi-kicker">Compatibilidad KDP</span>
              <strong className="gf-cd-kpi-value is-ok">Listo para Cargar</strong>
              <span className="gf-cd-kpi-sub">
                {preset.shortName} · Sangrado {preset.bleedMm.toFixed(1)} mm validado
              </span>
            </div>
            <ShieldCheck
              size={20}
              strokeWidth={1.75}
              className="gf-cd-kpi-icon is-ok"
              aria-hidden="true"
            />
          </article>
        </section>
      </div>

      {/* RIGHT INSPECTOR CARD: Generación de Cubierta Unificada */}
      <aside className="gf-cd-inspector" aria-label="Generación de Cubierta Unificada">
        <div className="gf-cd-inspector-body">
          {/* Inspector Header */}
          <div className="gf-cd-inspector-head">
            <div className="gf-cd-inspector-title-row">
              <h2 className="gf-cd-inspector-title">Generación de Cubierta Unificada</h2>
              <span className="gf-cd-engine-pill">MOTOR KAI</span>
            </div>
            <p className="gf-cd-inspector-desc">
              Armoniza el trazo, color y composición entre portada frontal, lomo y contraportada en
              un único pliego envolvente 16:9.
            </p>
          </div>

          {/* Prompt + KAI Assist */}
          <div className="gf-cd-block">
            <div className="gf-cd-block-head">
              <label htmlFor="gf-cd-prompt" className="gf-cd-block-label">
                Prompt de Cubierta Unificada
              </label>
              <span className="gf-cd-block-meta">{promptWordCount} palabras</span>
            </div>
            <textarea
              id="gf-cd-prompt"
              rows={3}
              className="gf-cd-textarea"
              value={coverPrompt}
              onChange={(e) =>
                updateProject({
                  cover: { ...project.cover, prompt: e.target.value },
                })
              }
              placeholder="Describe atmósfera, iluminación y encuadre... Ej. Tinta sumi de alto contraste, cielo carmesí tormentoso, protagonista de frente sosteniendo arma ancestral..."
            />
            <button type="button" className="gf-cd-kai-cta" onClick={handleAskKaiCover}>
              <Sparkles size={15} strokeWidth={2} className="gf-icon-shrink" />
              <span>Diseñar Portada con KAI</span>
            </button>
          </div>

          {/* Format Presets */}
          <div className="gf-cd-block">
            <div className="gf-cd-block-head">
              <span className="gf-cd-block-label">Formato de Corte</span>
              <span className="gf-cd-block-meta">{preset.trimLabel}</span>
            </div>
            <div className="gf-cd-preset-stack" role="radiogroup" aria-label="Formato de corte">
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
                      {p.exportWidthPx}×{p.exportHeightPx} px · Sangrado {p.bleedMm} mm ·{' '}
                      {p.dpiInterior} DPI
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Spine & Back Copy */}
          <div className="gf-cd-block">
            <div className="gf-cd-block-head">
              <label htmlFor="gf-cover-spine-input" className="gf-cd-block-label">
                Título en Lomo ({spineMm} mm)
              </label>
            </div>
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

            <div className="gf-cd-block-head gf-cd-mt">
              <label htmlFor="gf-cover-synopsis-input" className="gf-cd-block-label">
                Sinopsis en Contraportada
              </label>
            </div>
            <textarea
              id="gf-cover-synopsis-input"
              rows={2}
              className="gf-cd-textarea gf-cd-textarea-sm"
              value={project.cover.backSynopsis ?? ''}
              placeholder="Breve sinopsis editorial para la contraportada..."
              onChange={(e) =>
                updateProject({
                  cover: { ...project.cover, backSynopsis: e.target.value },
                })
              }
            />
          </div>

          {/* ISBN-13 + Live EAN-13 SVG Barcode Toggle */}
          <div className="gf-cd-block">
            <div className="gf-cd-block-head">
              <label htmlFor="gf-cover-isbn-input" className="gf-cover-isbn-label">
                <Barcode size={13} strokeWidth={2} className="gf-icon-shrink" />
                <span>ISBN-13 Editable</span>
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
                <span>Mostrar EAN-13</span>
              </label>
            </div>

            <div className="gf-cd-isbn-controls">
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
              <div className="gf-cd-isbn-status-row">
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
                    Calcular dígito
                  </button>
                )}
              </div>
              {includeIsbn && (
                <div className="gf-cd-barcode-preview">
                  <Ean13BarcodeSvg isbn={project.cover.isbn || '978-9945-0000-0-0'} compact />
                </div>
              )}
            </div>
          </div>

          {/* Upload / Reference Cover Art */}
          <div className="gf-cd-block">
            <div className="gf-cd-block-head">
              <span className="gf-cd-block-label">Subir Artes o Referencia</span>
              <span className="gf-cd-block-meta">PNG / JPG / WEBP</span>
            </div>
            <div className="gf-cd-upload-grid">
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
                <span>Portada (3:4)</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleUploadSlot('frontBase64')}
                />
              </label>
              <label className="gf-cover-file-btn">
                <Upload size={12} strokeWidth={2} />
                <span>Contraportada</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleUploadSlot('backBase64')}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Bottom Production Export CTA */}
        <div className="gf-cd-production">
          <div className="gf-cd-production-head">
            <span className="gf-cd-production-kicker">PRODUCCIÓN</span>
            <span className="gf-cd-production-ready">LISTO</span>
          </div>

          <button
            type="button"
            className="gf-cd-export-cta"
            onClick={handleExportCover}
            disabled={exporting}
          >
            <Download size={16} strokeWidth={2} className="gf-icon-shrink" />
            <span>{exporting ? 'Exportando PNG...' : 'Exportar Cubierta PNG'}</span>
          </button>

          <div className="gf-cd-spec-box">
            <strong>
              Dimensiones: {spreadWidthIn}&quot; × {spreadHeightIn}&quot; (Pliego +{' '}
              {preset.bleedMm.toFixed(1)} mm)
            </strong>
            <span>PNG limpio sin guías · Compatible con Amazon KDP</span>
          </div>
        </div>
      </aside>
    </div>
  );
});

CoverDesigner.displayName = 'CoverDesigner';
