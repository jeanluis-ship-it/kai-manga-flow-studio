'use client';

import React, { useState } from 'react';
import {
  Download,
  LayoutGrid,
  MessageSquare,
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
import { Flow } from '../flow-sdk';
import {
  type Koma,
  type Project,
  splitDataUrl,
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

export const PageEditor: React.FC<{
  project: Project;
  pageIndex: number;
  selectedKomaId: string | null;
  onSelectKoma: (komaId: string) => void;
  onChangeLayout: (pageId: string, layoutId: KomaLayoutId) => void;
  updateProject: (updates: Partial<Project>) => void;
  isGeneratingPage?: boolean;
  komaLoading: Record<string, boolean>;
}> = ({
  project,
  pageIndex,
  selectedKomaId,
  onSelectKoma,
  onChangeLayout,
  updateProject,
  isGeneratingPage = false,
  komaLoading,
}) => {
  const [showGuides, setShowGuides] = useState(true);

  const safeIndex = Math.min(Math.max(0, pageIndex), Math.max(0, project.pages.length - 1));
  const page = project.pages[safeIndex];
  const komas = page?.komas ?? [];
  const activeLayout: KomaLayoutId = page?.layoutTemplate || '4_panel_classic';
  const selectedKoma = komas.find((k) => k.id === selectedKomaId) ?? komas[0] ?? null;
  const downloadableSource = selectedKoma?.inkRenderUrl || page?.base64 || '';

  const handleDelete = () => {
    if (project.pages.length <= 1) return;
    const nextPages = project.pages.filter((_, idx) => idx !== safeIndex);
    updateProject({ pages: nextPages });
  };

  const handleDownload = async () => {
    if (!downloadableSource) return;
    const { mimeType, base64 } = splitDataUrl(downloadableSource);
    if (!base64) return;
    const ext = mimeType.includes('webp')
      ? 'webp'
      : mimeType.includes('jpeg')
      ? 'jpg'
      : mimeType.includes('svg')
      ? 'svg'
      : 'png';
    const baseName = (project.name || 'manga').trim().replace(/\s+/g, '_');
    const suffix = selectedKoma?.inkRenderUrl
      ? `pagina_${String(safeIndex + 1).padStart(3, '0')}_vineta_${selectedKoma.panelIndex}`
      : `pagina_${String(safeIndex + 1).padStart(3, '0')}`;
    await Flow.download({
      base64,
      mimeType,
      filename: `${baseName}_${suffix}.${ext}`,
    });
  };

  const anyKomaBusy = komas.some((k) => Boolean(komaLoading[k.id]));

  return (
    <div className="gf-editor-wrap animate-slide-in-right">
      <div className="gf-editor-header">
        <div>
          <h2 className="gf-editor-title">Páginas e Interiores</h2>
          <p className="gf-editor-counter">
            PÁGINA {safeIndex + 1} / {project.pages.length} · {komas.length} VIÑETAS · PAPEL GENKŌ 135KG
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowGuides((prev) => !prev)}
          className={`gf-guides-btn ${showGuides ? 'is-active' : ''}`}
        >
          <LayoutGrid size={14} strokeWidth={1.75} className="gf-icon-shrink" />
          <span>{showGuides ? 'OCULTAR GUÍAS' : 'MOSTRAR GUÍAS'}</span>
        </button>
      </div>

      {/* Koma-wari Geometric Template Picker */}
      {page && (
        <div className="gf-koma-templates" role="group" aria-label="Plantillas Koma-wari">
          {KOMA_LAYOUT_LIST.map((preset) => {
            const isActive = activeLayout === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={`gf-koma-template-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => onChangeLayout(page.id, preset.id)}
                title={preset.description}
              >
                <svg
                  viewBox="0 0 100 100"
                  className="gf-koma-template-svg"
                  aria-hidden="true"
                >
                  {preset.panels.map((poly, idx) => (
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
                <span className="gf-koma-template-label">{preset.shortLabel}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Genkō Yōshi 3:4 Interactive Koma-wari Sheet */}
      <div className="gf-sheet gf-sheet-koma">
        {showGuides && <div className="gf-sheet-guide" />}

        {isGeneratingPage && (
          <div className="gf-task-overlay" role="status" aria-live="polite">
            <RefreshCw size={22} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
            <span>Entintando Página {safeIndex + 1}...</span>
          </div>
        )}

        {/* Interactive Clipped Koma Layers */}
        {komas.map((koma) => {
          const isSelected = selectedKoma?.id === koma.id;
          const isKomaBusy = Boolean(komaLoading[koma.id]);
          const imgSrc = toDataImageSrc(koma.inkRenderUrl);
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

                {(koma.dialogues.length > 0 || koma.sfxItems.length > 0) && (
                  <div className="gf-koma-overlay-notes">
                    {koma.dialogues.slice(0, 1).map((dlg) => (
                      <span key={dlg.id} className="gf-koma-bubble-chip">
                        <MessageSquare size={10} strokeWidth={2} className="gf-icon-shrink" />
                        <span>
                          <strong>{dlg.speaker}:</strong> {dlg.text}
                        </span>
                      </span>
                    ))}
                    {koma.sfxItems.slice(0, 1).map((sfx) => (
                      <span key={sfx.id} className="gf-koma-sfx-chip">
                        {sfx.text}
                      </span>
                    ))}
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

        {/* Crisp Vector Borders Overlay (Sumi Ink + Active Indigo #4F46E5) */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="gf-koma-border-svg"
          aria-hidden="true"
        >
          {komas.map((koma) => {
            const isSelected = selectedKoma?.id === koma.id;
            return (
              <polygon
                key={koma.id}
                points={polygonToSvgPoints(koma.polygonCoords)}
                fill="none"
                stroke={isSelected ? '#4F46E5' : '#111111'}
                strokeWidth={isSelected ? '0.95' : '0.55'}
                strokeLinejoin="miter"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>

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
            'Selecciona una viñeta en el papel Genkō para dirigirla en el inspector derecho o pide a KAI Sensei que estructure la secuencia.'}
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
            icon={<Download size={15} strokeWidth={1.75} className="gf-icon-shrink" />}
            onClick={handleDownload}
            disabled={!downloadableSource}
          >
            {selectedKoma?.inkRenderUrl
              ? `Descargar Viñeta #${selectedKoma.panelIndex}`
              : 'Descargar Imagen'}
          </PillButton>
        </div>
      </div>
    </div>
  );
};
