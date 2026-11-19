'use client';

import React, { useState } from 'react';
import { Download, LayoutGrid, PenTool, RefreshCw, Trash2 } from 'lucide-react';
import { Flow } from '../flow-sdk';
import { Project, splitDataUrl, toDataImageSrc } from '../types';
import { SectionLabel, PillButton } from './Primitives';

export const PageEditor: React.FC<{
  project: Project;
  pageIndex: number;
  updateProject: (updates: Partial<Project>) => void;
  isGeneratingPage?: boolean;
}> = ({ project, pageIndex, updateProject, isGeneratingPage = false }) => {
  const [showGuides, setShowGuides] = useState(true);

  const safeIndex = Math.min(Math.max(0, pageIndex), Math.max(0, project.pages.length - 1));
  const page = project.pages[safeIndex];
  const pageSrc = toDataImageSrc(page?.base64);

  const handleDelete = () => {
    if (project.pages.length <= 1) return;
    const nextPages = project.pages.filter((_, idx) => idx !== safeIndex);
    updateProject({ pages: nextPages });
  };

  const handleDownload = async () => {
    if (!page?.base64) return;
    const { mimeType, base64 } = splitDataUrl(page.base64);
    if (!base64) return;
    const ext = mimeType.includes('webp')
      ? 'webp'
      : mimeType.includes('jpeg')
      ? 'jpg'
      : mimeType.includes('svg')
      ? 'svg'
      : 'png';
    const baseName = (project.name || 'manga').trim().replace(/\s+/g, '_');
    await Flow.download({
      base64,
      mimeType,
      filename: `${baseName}_pagina_${String(safeIndex + 1).padStart(3, '0')}.${ext}`,
    });
  };

  return (
    <div className="gf-editor-wrap animate-slide-in-right">
      <div className="gf-editor-header">
        <div>
          <h2 className="gf-editor-title">Páginas e Interiores</h2>
          <p className="gf-editor-counter">
            PÁGINA {safeIndex + 1} / {project.pages.length} · PAPEL GENKŌ 135KG
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

      <div className="gf-sheet">
        {showGuides && <div className="gf-sheet-guide" />}
        {isGeneratingPage && (
          <div className="gf-task-overlay" role="status" aria-live="polite">
            <RefreshCw size={22} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
            <span>Entintando Página {safeIndex + 1}...</span>
          </div>
        )}
        {pageSrc ? (
          <img
            src={pageSrc}
            alt={`Página interior ${safeIndex + 1}`}
            className="gf-sheet-img"
          />
        ) : (
          <div className="gf-sheet-empty">
            <PenTool size={28} strokeWidth={1.5} className="gf-sheet-empty-icon gf-icon-shrink" />
            <span className="gf-sheet-empty-text">
              ESPERANDO TINTA · Selecciona escena o genera
            </span>
          </div>
        )}
      </div>

      <div className="gf-card gf-prompt-card">
        <SectionLabel>GUION DE LA PÁGINA</SectionLabel>
        <p className="gf-prompt-text">
          {page?.prompt ||
            'Sin instrucciones todavía. Describe la escena y viñetas en el panel derecho para entintar.'}
        </p>
        <div className="gf-prompt-actions">
          <PillButton
            variant="outline"
            icon={<Trash2 size={15} strokeWidth={1.75} className="gf-icon-shrink" />}
            onClick={handleDelete}
            disabled={project.pages.length <= 1 || isGeneratingPage}
          >
            Eliminar Página
          </PillButton>
          <PillButton
            variant="outline"
            icon={<Download size={15} strokeWidth={1.75} className="gf-icon-shrink" />}
            onClick={handleDownload}
            disabled={!page?.base64}
          >
            Descargar Imagen
          </PillButton>
        </div>
      </div>
    </div>
  );
};
