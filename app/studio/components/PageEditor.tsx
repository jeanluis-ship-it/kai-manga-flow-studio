'use client';

import React, { useState } from 'react';
import {
  Download,
  LayoutGrid,
  PenTool,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  KOMA_LAYOUT_LIST,
  getPolygonBounds,
  polygonToClipPath,
  polygonToSvgPoints,
  type KomaLayoutId,
} from '@/lib/kai/schema';
import { renderPrintablePageToPngBase64 } from '@/lib/export/buildPrintBundle';
import { getPrintPreset } from '@/lib/print/presets';
import { FukidashiLayer } from '@/components/studio/FukidashiLayer';
import { KakimojiLayer } from '@/components/studio/KakimojiLayer';
import { Flow } from '../flow-sdk';
import {
  DEFAULT_LAYERS_VISIBILITY,
  DEFAULT_LAYER_OPACITY,
  type Koma,
  type KomaDialogue,
  type KomaSfx,
  type LayerKey,
  type Project,
  toDataImageSrc,
} from '../types';
import { PillButton, SectionLabel } from './Primitives';

const KOMA_STATE_LABELS: Record<Koma['state'], string> = {
  VACIO: 'VACÍO',
  NEMU: 'NEMU',
  PEN_IRE: 'PEN-IRE',
  TONE_FX: 'TONE FX',
  SHIAGE: 'SHIAGE',
  LOCKED: 'LOCKED',
};

function renderSpeedlineGroup(koma: Koma, clipId: string) {
  const fx = koma.speedlinePreset || 'none';
  if (fx === 'none') return null;

  const bounds = getPolygonBounds(koma.polygonCoords);
  if (fx === 'ryusen') {
    const lines = Array.from({ length: 16 }, (_, i) => {
      const y = bounds.top + (bounds.height * (i + 0.5)) / 16;
      return (
        <line
          key={i}
          x1={bounds.left}
          y1={y}
          x2={bounds.left + bounds.width}
          y2={y - bounds.height * 0.06}
          stroke="#111111"
          strokeOpacity="0.58"
          strokeWidth={i % 3 === 0 ? '0.45' : '0.22'}
          vectorEffect="non-scaling-stroke"
        />
      );
    });
    return <g clipPath={`url(#${clipId})`}>{lines}</g>;
  }

  // Shūchūsen (radial focus lines)
  const cx = bounds.left + bounds.width / 2;
  const cy = bounds.top + bounds.height / 2;
  const outerR = Math.hypot(bounds.width, bounds.height) * 0.65;
  const innerR = Math.min(bounds.width, bounds.height) * 0.28;
  const rays = Array.from({ length: 32 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 32;
    return (
      <line
        key={i}
        x1={cx + Math.cos(angle) * innerR}
        y1={cy + Math.sin(angle) * innerR}
        x2={cx + Math.cos(angle) * outerR}
        y2={cy + Math.sin(angle) * outerR}
        stroke="#111111"
        strokeOpacity="0.62"
        strokeWidth={i % 2 === 0 ? '0.42' : '0.2'}
        vectorEffect="non-scaling-stroke"
      />
    );
  });
  return <g clipPath={`url(#${clipId})`}>{rays}</g>;
}

export const PageEditor: React.FC<{
  project: Project;
  pageIndex: number;
  selectedKomaId: string | null;
  selectedDialogueId: string | null;
  onSelectKoma: (komaId: string) => void;
  onSelectDialogue: (komaId: string, dialogueId: string) => void;
  onUpdateDialogue: (
    pageId: string,
    komaId: string,
    dialogueId: string,
    patch: Partial<KomaDialogue>,
  ) => void;
  onUpdateSfx: (
    pageId: string,
    komaId: string,
    sfxId: string,
    patch: Partial<KomaSfx>,
  ) => void;
  onToggleLayer: (pageId: string, layer: LayerKey) => void;
  onChangeLayout: (pageId: string, layoutId: KomaLayoutId) => void;
  updateProject: (updates: Partial<Project>) => void;
  isGeneratingPage?: boolean;
  komaLoading: Record<string, boolean>;
}> = ({
  project,
  pageIndex,
  selectedKomaId,
  selectedDialogueId,
  onSelectKoma,
  onSelectDialogue,
  onUpdateDialogue,
  onUpdateSfx,
  onToggleLayer,
  onChangeLayout,
  updateProject,
  isGeneratingPage = false,
  komaLoading,
}) => {
  const [downloadingPng, setDownloadingPng] = useState(false);

  const safeIndex = Math.min(Math.max(0, pageIndex), Math.max(0, project.pages.length - 1));
  const page = project.pages[safeIndex];
  const komas = page?.komas ?? [];
  const activeLayout: KomaLayoutId = page?.layoutTemplate || '4_panel_classic';
  const selectedKoma = komas.find((k) => k.id === selectedKomaId) ?? komas[0] ?? null;

  const preset = getPrintPreset(project.trimFormat);
  const vis = {
    ...DEFAULT_LAYERS_VISIBILITY,
    ...(page?.layersVisibility ?? {}),
  };
  const opacity = {
    ...DEFAULT_LAYER_OPACITY,
    ...(page?.layerOpacity ?? {}),
  };

  const handleDelete = () => {
    if (project.pages.length <= 1) return;
    const nextPages = project.pages.filter((_, idx) => idx !== safeIndex);
    updateProject({ pages: nextPages });
  };

  const handleDownloadFlattenedPage = async () => {
    if (!page || downloadingPng) return;
    setDownloadingPng(true);
    try {
      const base64 = await renderPrintablePageToPngBase64(page, preset);
      if (!base64) return;
      const baseName = (project.name || 'manga').trim().replace(/\s+/g, '_');
      await Flow.download({
        base64,
        mimeType: 'image/png',
        filename: `${baseName}_pagina_${String(safeIndex + 1).padStart(3, '0')}_${preset.id}_L1-L5.png`,
      });
    } finally {
      setDownloadingPng(false);
    }
  };

  const anyKomaBusy = komas.some((k) => Boolean(komaLoading[k.id]));
  // In Japanese RTL manga, binding gutter is on the right for odd pages / left for even pages
  const isGutterRight =
    (project.readingDirection || 'rtl') === 'rtl'
      ? safeIndex % 2 === 0
      : safeIndex % 2 === 1;

  return (
    <div className="gf-editor-wrap animate-slide-in-right">
      <div className="gf-editor-header">
        <div>
          <h2 className="gf-editor-title">Páginas e Interiores</h2>
          <p className="gf-editor-counter">
            PÁG. {safeIndex + 1} / {project.pages.length} · {komas.length} VIÑETAS ·{' '}
            {preset.shortName.toUpperCase()} ({preset.exportWidthPx}×{preset.exportHeightPx})
          </p>
        </div>

        {page && (
          <button
            type="button"
            onClick={() => onToggleLayer(page.id, 'L6_guides')}
            className={`gf-guides-btn ${vis.L6_guides ? 'is-active' : ''}`}
          >
            <LayoutGrid size={14} strokeWidth={1.75} className="gf-icon-shrink" />
            <span>{vis.L6_guides ? 'OCULTAR GUÍAS L6' : 'MOSTRAR GUÍAS L6'}</span>
          </button>
        )}
      </div>

      {/* Koma-wari Geometric Template Picker */}
      {page && (
        <div className="gf-koma-templates" role="group" aria-label="Plantillas Koma-wari">
          {KOMA_LAYOUT_LIST.map((tmpl) => {
            const isActive = activeLayout === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                className={`gf-koma-template-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => onChangeLayout(page.id, tmpl.id)}
                title={tmpl.description}
              >
                <svg
                  viewBox="0 0 100 100"
                  className="gf-koma-template-svg"
                  aria-hidden="true"
                >
                  {tmpl.panels.map((poly, idx) => (
                    <polygon
                      key={idx}
                      points={polygonToSvgPoints(poly)}
                      fill={isActive ? 'rgba(79,70,229,0.16)' : 'rgba(17,17,17,0.06)'}
                      stroke={isActive ? '#4F46E5' : 'currentColor'}
                      strokeWidth="3.2"
                      strokeLinejoin="round"
                    />
                  ))}
                </svg>
                <span className="gf-koma-template-label">{tmpl.shortLabel}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* =========================================================
          STRICT 7-LAYER GENKŌ YŌSHI CANVAS (L0 z=10 → L6 z=70)
          ========================================================= */}
      <div
        className="gf-sheet gf-sheet-koma"
        style={{ aspectRatio: preset.aspectRatio }}
      >
        {isGeneratingPage && (
          <div className="gf-task-overlay" role="status" aria-live="polite">
            <RefreshCw size={22} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
            <span>Entintando Página {safeIndex + 1}...</span>
          </div>
        )}

        {/* ===== LAYER L0 (z-index: 10) — Non-Photo Blue Nemu Sketch (Non-Printable) ===== */}
        {vis.L0_nemu && (
          <div
            className="gf-layer gf-layer-l0"
            style={{ opacity: opacity.L0_nemu / 100 }}
            aria-hidden="true"
          >
            {komas.map((koma) => {
              const nemuSrc = toDataImageSrc(koma.nemuSketchUrl);
              if (!nemuSrc) return null;
              const b = getPolygonBounds(koma.polygonCoords);
              return (
                <div
                  key={`nemu-img-${koma.id}`}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    clipPath: polygonToClipPath(koma.polygonCoords),
                    pointerEvents: 'none',
                  }}
                >
                  <img
                    src={nemuSrc}
                    alt=""
                    style={{
                      position: 'absolute',
                      left: `${b.left}%`,
                      top: `${b.top}%`,
                      width: `${b.width}%`,
                      height: `${b.height}%`,
                      objectFit: 'cover',
                    }}
                  />
                </div>
              );
            })}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="gf-layer-svg">
              {komas.map((koma) => {
                const b = getPolygonBounds(koma.polygonCoords);
                const cx = b.left + b.width / 2;
                const cy = b.top + b.height / 2;
                return (
                  <g key={`nemu-${koma.id}`}>
                    <polygon
                      points={polygonToSvgPoints(koma.polygonCoords)}
                      fill="rgba(0, 174, 239, 0.06)"
                      stroke="#00AEEF"
                      strokeWidth="0.35"
                      strokeDasharray="2.5 2"
                      vectorEffect="non-scaling-stroke"
                    />
                    {/* Rule-of-thirds Nemu composition crosshair */}
                    <line
                      x1={b.left + b.width * 0.33}
                      y1={b.top}
                      x2={b.left + b.width * 0.33}
                      y2={b.top + b.height}
                      stroke="#00AEEF"
                      strokeWidth="0.2"
                      strokeDasharray="1.5 2"
                      vectorEffect="non-scaling-stroke"
                    />
                    <line
                      x1={b.left}
                      y1={cy}
                      x2={b.left + b.width}
                      y2={cy}
                      stroke="#00AEEF"
                      strokeWidth="0.2"
                      strokeDasharray="1.5 2"
                      vectorEffect="non-scaling-stroke"
                    />
                    <ellipse
                      cx={cx}
                      cy={cy}
                      rx={Math.min(12, b.width * 0.16)}
                      ry={Math.min(9, b.height * 0.22)}
                      fill="none"
                      stroke="#00AEEF"
                      strokeWidth="0.28"
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* ===== LAYER L1 (z-index: 20) — Screentones & Beta Black ===== */}
        {vis.L1_tones && (
          <div
            className="gf-layer gf-layer-l1"
            style={{ opacity: opacity.L1_tones / 100 }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="gf-layer-svg">
              <defs>
                <pattern id="gf-tone-15" width="2.2" height="2.2" patternUnits="userSpaceOnUse">
                  <circle cx="1.1" cy="1.1" r="0.32" fill="#111111" />
                </pattern>
                <pattern id="gf-tone-30" width="2.0" height="2.0" patternUnits="userSpaceOnUse">
                  <circle cx="1.0" cy="1.0" r="0.5" fill="#111111" />
                </pattern>
                <pattern id="gf-tone-60" width="1.8" height="1.8" patternUnits="userSpaceOnUse">
                  <circle cx="0.9" cy="0.9" r="0.68" fill="#111111" />
                </pattern>
                <linearGradient id="gf-tone-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#111111" stopOpacity="0.58" />
                  <stop offset="100%" stopColor="#111111" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {komas.map((koma) => {
                const tone = koma.screentonePreset || 'none';
                if (tone === 'none') return null;
                const fill =
                  tone === 'dots_15'
                    ? 'url(#gf-tone-15)'
                    : tone === 'dots_30'
                    ? 'url(#gf-tone-30)'
                    : tone === 'dots_60'
                    ? 'url(#gf-tone-60)'
                    : tone === 'gradient'
                    ? 'url(#gf-tone-grad)'
                    : '#111111';
                return (
                  <polygon
                    key={`tone-${koma.id}`}
                    points={polygonToSvgPoints(koma.polygonCoords)}
                    fill={fill}
                  />
                );
              })}
            </svg>
          </div>
        )}

        {/* ===== LAYER L2 (z-index: 30) — Clipped Ink Art & Koma Interactive Selection ===== */}
        <div className="gf-layer gf-layer-l2">
          {komas.map((koma) => {
            const isSelected = selectedKoma?.id === koma.id;
            const isKomaBusy = Boolean(komaLoading[koma.id]);
            const imgSrc = vis.L2_ink ? toDataImageSrc(koma.inkRenderUrl) : '';
            const bounds = getPolygonBounds(koma.polygonCoords);

            return (
              <div
                key={koma.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Seleccionar Viñeta ${koma.panelIndex} (${koma.state})`}
                className={`gf-koma-layer ${isSelected ? 'is-selected' : ''} ${imgSrc ? 'has-ink' : ''}`}
                style={{ clipPath: polygonToClipPath(koma.polygonCoords) }}
                onClick={() => onSelectKoma(koma.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectKoma(koma.id);
                  }
                }}
              >
                {imgSrc && (
                  <img
                    src={imgSrc}
                    alt={`Viñeta ${koma.panelIndex} de página ${safeIndex + 1}`}
                    className="gf-koma-ink-img"
                    style={{
                      left: `${bounds.left}%`,
                      top: `${bounds.top}%`,
                      width: `${bounds.width}%`,
                      height: `${bounds.height}%`,
                    }}
                  />
                )}

                <div
                  className="gf-koma-content"
                  style={{
                    left: `${bounds.left}%`,
                    top: `${bounds.top}%`,
                    width: `${bounds.width}%`,
                    height: `${bounds.height}%`,
                  }}
                >
                  <div className="gf-koma-top-badges">
                    <span className={`gf-koma-num-pill ${isSelected ? 'is-selected' : ''}`}>
                      #{koma.panelIndex}
                    </span>
                    <span className={`gf-koma-state-badge state-${koma.state.toLowerCase()}`}>
                      {KOMA_STATE_LABELS[koma.state]}
                    </span>
                  </div>

                  {!imgSrc && (
                    <div className="gf-koma-placeholder">
                      <span className="gf-koma-angle">{koma.cameraAngle}</span>
                      {koma.taggedHandles.length > 0 && (
                        <div className="gf-koma-handle-row">
                          {koma.taggedHandles.slice(0, 3).map((handle) => (
                            <span key={handle} className="gf-koma-handle-tag">
                              {handle}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="gf-koma-brief">
                        {koma.actionPrompt
                          ? koma.actionPrompt
                          : `Viñeta #${koma.panelIndex} · Haz clic para dirigir en el inspector`}
                      </p>
                    </div>
                  )}

                  {isKomaBusy && (
                    <div className="gf-koma-busy-overlay" role="status" aria-live="polite">
                      <RefreshCw size={18} strokeWidth={2} className="gf-spin gf-icon-shrink" />
                      <span>Entintando #{koma.panelIndex}...</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ===== LAYER L3 (z-index: 40) — Sumi Borders (0.8mm) + Kinetic Speedlines ===== */}
        {vis.L3_borders_fx && (
          <div className="gf-layer gf-layer-l3" aria-hidden="true">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="gf-layer-svg">
              <defs>
                {komas.map((koma) => (
                  <clipPath key={`clip-${koma.id}`} id={`gf-koma-clip-${koma.id}`}>
                    <polygon points={polygonToSvgPoints(koma.polygonCoords)} />
                  </clipPath>
                ))}
              </defs>

              {komas.map((koma) => (
                <React.Fragment key={`fx-${koma.id}`}>
                  {renderSpeedlineGroup(koma, `gf-koma-clip-${koma.id}`)}
                  <polygon
                    points={polygonToSvgPoints(koma.polygonCoords)}
                    fill="none"
                    stroke={selectedKoma?.id === koma.id ? '#4F46E5' : '#111111'}
                    strokeWidth={selectedKoma?.id === koma.id ? '1.05' : '0.65'}
                    strokeLinejoin="miter"
                    vectorEffect="non-scaling-stroke"
                  />
                </React.Fragment>
              ))}
            </svg>
          </div>
        )}

        {/* ===== LAYER L4 (z-index: 50) — Kakimoji / Graphic SFX ===== */}
        {vis.L4_sfx && page && (
          <KakimojiLayer
            komas={komas}
            onSelectKoma={onSelectKoma}
            onUpdateSfx={(komaId, sfxId, patch) =>
              onUpdateSfx(page.id, komaId, sfxId, patch)
            }
          />
        )}

        {/* ===== LAYER L5 (z-index: 60) — Vector Fukidashi Speech Balloons ===== */}
        {vis.L5_balloons && page && (
          <FukidashiLayer
            komas={komas}
            preset={preset}
            selectedDialogueId={selectedDialogueId}
            onSelectDialogue={onSelectDialogue}
            onUpdateDialogue={(komaId, dialogueId, patch) =>
              onUpdateDialogue(page.id, komaId, dialogueId, patch)
            }
          />
        )}

        {/* ===== LAYER L6 (z-index: 70) — Technical Guides #00AEEF (Non-Printable) ===== */}
        {vis.L6_guides && (
          <div className="gf-layer gf-layer-l6" aria-hidden="true">
            {/* Trim (Corte) Line inset by bleed */}
            <div
              className="gf-guide-trim"
              style={{
                left: `${preset.bleedInsetPct.x}%`,
                right: `${preset.bleedInsetPct.x}%`,
                top: `${preset.bleedInsetPct.y}%`,
                bottom: `${preset.bleedInsetPct.y}%`,
              }}
            >
              <span className="gf-guide-tag gf-guide-tag-trim">
                CORTE · BLEED {preset.bleedMm}mm
              </span>
            </div>

            {/* Naiwaku Safe Area */}
            <div
              className="gf-guide-naiwaku"
              style={{
                left: `${preset.naiwakuInsetPct.left}%`,
                right: `${preset.naiwakuInsetPct.right}%`,
                top: `${preset.naiwakuInsetPct.top}%`,
                bottom: `${preset.naiwakuInsetPct.bottom}%`,
              }}
            >
              <span className="gf-guide-tag gf-guide-tag-safe">NAIWAKU (ÁREA SEGURA)</span>
            </div>

            {/* Gutter (Lomo) Zone */}
            <div
              className={`gf-guide-gutter ${isGutterRight ? 'is-right' : 'is-left'}`}
              style={{ width: `${preset.gutterWidthPct}%` }}
            >
              <span>LOMO / GUTTER</span>
            </div>
          </div>
        )}

        {komas.length === 0 && (
          <div className="gf-sheet-empty">
            <PenTool size={28} strokeWidth={1.5} className="gf-sheet-empty-icon gf-icon-shrink" />
            <span className="gf-sheet-empty-text">
              SELECCIONA UNA PLANTILLA KOMA-WARI ARRIBA
            </span>
          </div>
        )}
      </div>

      {/* Chapter Beat & Page Actions */}
      <div className="gf-card gf-prompt-card">
        <SectionLabel>
          {page?.chapterBeat
            ? `BEAT DE CAPÍTULO · PÁGINA ${safeIndex + 1}`
            : `GUION DE LA PÁGINA ${safeIndex + 1}`}
        </SectionLabel>
        <p className="gf-prompt-text">
          {page?.chapterBeat ||
            page?.prompt ||
            'Arrastra los globos Fukidashi (L5) u onomatopeyas (L4) directamente sobre el papel Genkō. Doble clic en un globo para editar el texto inline.'}
        </p>
        <div className="gf-prompt-actions">
          <PillButton
            variant="outline"
            icon={<Trash2 size={15} strokeWidth={1.75} className="gf-icon-shrink" />}
            onClick={handleDelete}
            disabled={project.pages.length <= 1 || isGeneratingPage || anyKomaBusy}
          >
            Eliminar Página
          </PillButton>
          <PillButton
            variant="outline"
            icon={
              downloadingPng ? (
                <RefreshCw size={15} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
              ) : (
                <Download size={15} strokeWidth={1.75} className="gf-icon-shrink" />
              )
            }
            onClick={handleDownloadFlattenedPage}
            disabled={!page || downloadingPng}
          >
            {downloadingPng ? 'Aplanando L1→L5...' : 'Descargar PNG (L1→L5)'}
          </PillButton>
        </div>
      </div>
    </div>
  );
};
