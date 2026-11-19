'use client';

import React, { forwardRef, useImperativeHandle } from 'react';
import { BookOpen, Palette, RefreshCw, Ruler } from 'lucide-react';
import { encodeEan13 } from '@/lib/print/ean13';
import { getPrintPreset } from '@/lib/print/presets';
import { type Project, toDataImageSrc } from '../types';

export interface CoverDesignerHandle {
  exportCover: () => Promise<void>;
}

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
          const isGuard =
            idx < 3 || (idx >= 45 && idx < 50) || idx >= 92;
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

export const CoverDesigner = forwardRef<
  CoverDesignerHandle,
  {
    project: Project;
    updateProject: (updates: Partial<Project>) => void;
    isGeneratingCover?: boolean;
  }
>(({ project, isGeneratingCover = false }, ref) => {
  useImperativeHandle(ref, () => ({
    exportCover: async () => {
      if (typeof window !== 'undefined') {
        window.print();
      }
    },
  }));

  const preset = getPrintPreset(project.trimFormat);
  const spineMm = (project.cover.spineWidthInches * 25.4).toFixed(2);
  const wrapSrc = toDataImageSrc(project.cover.fullWrapBase64);
  const includeIsbn = project.cover.includeIsbn !== false;
  const spineTitle = project.cover.spineTitle?.trim() || project.name || 'Manga sin título';
  const backSynopsis = project.cover.backSynopsis?.trim() || '';

  // Proportional spine width in px clamped cleanly for visual preview
  const spineWidthPx = Math.min(54, Math.max(28, Math.round(project.cover.spineWidthInches * 92)));

  return (
    <div className="gf-cover-wrap animate-slide-in-right">
      <div className="gf-cover-header">
        <h1 className="gf-page-title">Portada Tankōbon</h1>
        <p className="gf-cover-subtitle">
          {preset.name} ({preset.trimLabel}) · Sangrado {preset.bleedLabel} · Lomo:{' '}
          {project.cover.spineWidthInches.toFixed(3)}&quot; ({spineMm} mm)
        </p>
      </div>

      <div className="gf-cover-stage">
        {isGeneratingCover && (
          <div className="gf-task-overlay" role="status" aria-live="polite">
            <RefreshCw size={22} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
            <span>Generando cubierta envolvente 16:9...</span>
          </div>
        )}

        {wrapSrc ? (
          <div className="gf-cover-canvas">
            <img
              src={wrapSrc}
              alt={`Cubierta completa de ${project.name || 'Manga'}`}
              className="gf-cover-img"
            />
            <div className="gf-cover-guides">
              {/* Back Cover (Left Half) */}
              <div className="gf-cover-half gf-cover-back">
                <span className="gf-cover-guide-label">Contraportada</span>

                {backSynopsis && (
                  <div className="gf-cover-synopsis-card">
                    <p className="gf-cover-synopsis-text">{backSynopsis}</p>
                    <span className="gf-cover-synopsis-author">{project.author || 'Autor'}</span>
                  </div>
                )}

                {includeIsbn && (
                  <Ean13BarcodeSvg isbn={project.cover.isbn || '978-9945-0000-0-0'} />
                )}
              </div>

              {/* Spine (Center) */}
              <div className="gf-cover-spine" style={{ width: `${spineWidthPx}px` }}>
                <span className="gf-cover-spine-label">
                  {spineTitle} · {project.author || 'Autor'} ({spineMm} mm)
                </span>
              </div>

              {/* Front Cover (Right Half) */}
              <div className="gf-cover-half gf-cover-front">
                <span className="gf-cover-guide-label">Portada Frontal</span>
                <div className="gf-cover-front-meta">
                  <span className="gf-cover-front-title">{project.name || 'Manga sin título'}</span>
                  <span className="gf-cover-front-author">{project.author || 'Autor'}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="gf-cover-empty">
            <BookOpen size={38} strokeWidth={1.5} className="gf-cover-empty-icon gf-icon-shrink" />
            <span className="gf-cover-empty-text">
              GENERA LA CUBIERTA COMPLETA EN EL PANEL DERECHO
            </span>
            {includeIsbn && (
              <div className="gf-cover-empty-isbn">
                <Ean13BarcodeSvg isbn={project.cover.isbn || '978-9945-0000-0-0'} />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="gf-cover-info-grid">
        <div className="gf-card gf-cover-info-card">
          <Palette size={18} strokeWidth={1.75} className="gf-cover-info-icon gf-icon-shrink" />
          <div>
            <p className="gf-cover-info-title">Tipografía y Continuidad Full Wrap</p>
            <p className="gf-cover-info-text">
              Título en lomo («{spineTitle}»), autor y sinopsis se reflejan en tiempo real sobre
              el lienzo 16:9 junto con el código EAN-13 vectorial.
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
