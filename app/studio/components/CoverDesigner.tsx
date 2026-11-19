'use client';

import React, { forwardRef, useImperativeHandle } from 'react';
import { BookOpen, Palette, RefreshCw, Ruler } from 'lucide-react';
import { Project, toDataImageSrc } from '../types';

export interface CoverDesignerHandle {
  exportCover: () => Promise<void>;
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

  const wrapSrc = toDataImageSrc(project.cover.fullWrapBase64);

  return (
    <div className="gf-cover-wrap animate-slide-in-right">
      <div className="gf-cover-header">
        <h1 className="gf-page-title">Portada Tankōbon</h1>
        <p className="gf-cover-subtitle">
          Portada y Contraportada Continuas · Formato 6×9&quot; · Lomo automático:{' '}
          {project.cover.spineWidthInches.toFixed(3)}&quot;
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
              <div className="gf-cover-half gf-cover-back">
                <span className="gf-cover-guide-label">Contraportada</span>
                <div className="gf-isbn-box">
                  <div className="gf-isbn-bars" />
                  <span className="gf-isbn-code">ISBN 978-0-00000-000-0</span>
                </div>
              </div>
              <div className="gf-cover-spine">
                <span className="gf-cover-spine-label">
                  Lomo ({project.cover.spineWidthInches.toFixed(2)}&quot;)
                </span>
              </div>
              <div className="gf-cover-half gf-cover-front">
                <span className="gf-cover-guide-label">Portada Frontal</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="gf-cover-empty">
            <BookOpen size={38} strokeWidth={1.5} className="gf-cover-empty-icon gf-icon-shrink" />
            <span className="gf-cover-empty-text">
              GENERA LA CUBIERTA COMPLETA EN EL PANEL DERECHO
            </span>
          </div>
        )}
      </div>

      <div className="gf-cover-info-grid">
        <div className="gf-card gf-cover-info-card">
          <Palette size={18} strokeWidth={1.75} className="gf-cover-info-icon gf-icon-shrink" />
          <div>
            <p className="gf-cover-info-title">Continuidad Visual</p>
            <p className="gf-cover-info-text">
              La composición envolvente 16:9 mantiene la iluminación, atmósfera y vestuario del
              elenco desde la contraportada, cruzando el lomo hasta la portada.
            </p>
          </div>
        </div>

        <div className="gf-card gf-cover-info-card">
          <Ruler size={18} strokeWidth={1.75} className="gf-cover-info-icon gf-icon-shrink" />
          <div>
            <p className="gf-cover-info-title">Resolución de Imprenta</p>
            <p className="gf-cover-info-text">
              Configurado para corte editorial 6×9&quot; con ancho de lomo dinámico de{' '}
              {project.cover.spineWidthInches.toFixed(3)}&quot; y márgenes de sangrado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

CoverDesigner.displayName = 'CoverDesigner';
