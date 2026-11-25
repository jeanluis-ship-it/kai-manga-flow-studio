'use client';

import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { BookOpen, ChevronLeft, ChevronRight, RefreshCw, X } from 'lucide-react';
import { renderPrintablePageToPngBase64 } from '@/lib/export/buildPrintBundle';
import { getPrintPreset } from '@/lib/print/presets';
import { toDataImageSrc, type Project } from '../types';
import './MangaFlipbookViewer.css';

interface FlipSheetProps {
  pageNumberLabel: string;
  imageSrc?: string;
  title?: string;
  subtitle?: string;
  variant?: 'cover' | 'interior' | 'back';
}

const FlipSheet = forwardRef<HTMLDivElement, FlipSheetProps>(
  ({ pageNumberLabel, imageSrc, title, subtitle, variant = 'interior' }, ref) => {
    return (
      <div
        ref={ref}
        className={`gf-flip-sheet is-${variant}`}
        data-density={variant === 'cover' || variant === 'back' ? 'hard' : 'soft'}
      >
        <div className="gf-flip-sheet-inner">
          {imageSrc ? (
            <img src={imageSrc} alt={title || pageNumberLabel} className="gf-flip-sheet-img" />
          ) : (
            <div className="gf-flip-sheet-placeholder">
              <span className="gf-flip-sheet-badge">{pageNumberLabel}</span>
              {title && <h4>{title}</h4>}
              {subtitle && <p>{subtitle}</p>}
            </div>
          )}
          <span className="gf-flip-sheet-folio">{pageNumberLabel}</span>
        </div>
      </div>
    );
  },
);

FlipSheet.displayName = 'FlipSheet';

interface FlipBookHandle {
  pageFlip?: () => {
    flipNext: (corner?: 'top' | 'bottom') => void;
    flipPrev: (corner?: 'top' | 'bottom') => void;
    getCurrentPageIndex: () => number;
    getPageCount: () => number;
  };
}

export interface MangaFlipbookViewerProps {
  open: boolean;
  project: Project;
  onClose: () => void;
}

export const MangaFlipbookViewer: React.FC<MangaFlipbookViewerProps> = ({
  open,
  project,
  onClose,
}) => {
  const flipBookRef = useRef<FlipBookHandle | null>(null);
  const [renderedPages, setRenderedPages] = useState<string[]>([]);
  const [isRendering, setIsRendering] = useState(false);
  const [currentSheet, setCurrentSheet] = useState(0);

  const preset = useMemo(() => getPrintPreset(project.trimFormat), [project.trimFormat]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setIsRendering(true);
    setCurrentSheet(0);

    const buildSheets = async () => {
      const results: string[] = [];
      for (const page of project.pages) {
        try {
          const base64 = await renderPrintablePageToPngBase64(page, preset);
          results.push(base64 ? `data:image/png;base64,${base64}` : '');
        } catch {
          results.push('');
        }
      }
      if (active) {
        setRenderedPages(results);
        setIsRendering(false);
      }
    };

    void buildSheets();
    return () => {
      active = false;
    };
  }, [open, project.pages, preset]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable="true"], .gf-sidebar-right')) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        flipBookRef.current?.pageFlip?.().flipNext();
      } else if (e.key === 'ArrowLeft') {
        flipBookRef.current?.pageFlip?.().flipPrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const frontCoverSrc = toDataImageSrc(
    project.cover.frontBase64 || project.cover.fullWrapBase64 || '',
  );
  const backCoverSrc = toDataImageSrc(project.cover.backBase64 || '');

  // Build unique sheet list (front cover + interior pages + back cover) with zero duplicates
  const totalSheets = 2 + project.pages.length;

  return (
    <div
      className="gf-flipbook-overlay"
      role="dialog"
      aria-modal="false"
      aria-label={`Visor 3D PageFlip — ${project.name || 'Tomo Manga'}`}
      onClick={onClose}
    >
      <div className="gf-flipbook-shell" onClick={(e) => e.stopPropagation()}>
        <div className="gf-flipbook-header">
          <div className="gf-flipbook-title-group">
            <BookOpen size={17} strokeWidth={2} className="gf-icon-shrink" />
            <div>
              <h3>{project.name || 'Tomo sin título'}</h3>
              <p>
                Visor realista PageFlip · {preset.shortName} ·{' '}
                {(project.readingDirection || 'rtl').toUpperCase()} · {project.pages.length}{' '}
                páginas interiores
              </p>
            </div>
          </div>

          <div className="gf-flipbook-controls">
            <button
              type="button"
              className="gf-flipbook-nav-btn"
              onClick={() => flipBookRef.current?.pageFlip?.().flipPrev()}
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} strokeWidth={2} />
              <span>Anterior</span>
            </button>
            <span className="gf-flipbook-counter">
              Hoja {Math.min(totalSheets, currentSheet + 1)} / {totalSheets}
            </span>
            <button
              type="button"
              className="gf-flipbook-nav-btn"
              onClick={() => flipBookRef.current?.pageFlip?.().flipNext()}
              aria-label="Página siguiente"
            >
              <span>Siguiente</span>
              <ChevronRight size={16} strokeWidth={2} />
            </button>
            <button
              type="button"
              className="gf-flipbook-close-btn"
              onClick={onClose}
              aria-label="Cerrar visor de tomo"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="gf-flipbook-stage">
          {isRendering ? (
            <div className="gf-flipbook-loading" role="status">
              <RefreshCw size={22} strokeWidth={2} className="gf-spin" />
              <span>Aplanando páginas L1 → L5 para lectura realista...</span>
            </div>
          ) : (
            <HTMLFlipBook
              ref={flipBookRef as never}
              width={360}
              height={512}
              size="stretch"
              minWidth={240}
              maxWidth={480}
              minHeight={340}
              maxHeight={680}
              drawShadow={true}
              flippingTime={650}
              usePortrait={true}
              startZIndex={0}
              autoSize={true}
              maxShadowOpacity={0.45}
              showCover={true}
              mobileScrollSupport={true}
              clickEventForward={true}
              useMouseEvents={true}
              swipeDistance={24}
              showPageCorners={true}
              disableFlipByClick={false}
              startPage={0}
              className="gf-flipbook-book"
              style={{}}
              onFlip={(e: { data?: number }) => {
                if (typeof e?.data === 'number') {
                  setCurrentSheet(e.data);
                }
              }}
            >
              <FlipSheet
                key="sheet-front-cover"
                variant="cover"
                pageNumberLabel="PORTADA"
                imageSrc={frontCoverSrc}
                title={project.name || 'Manga sin título'}
                subtitle={`Por ${project.author || 'Mangaka'} · ${preset.shortName}`}
              />

              {project.pages.map((page, idx) => (
                <FlipSheet
                  key={`sheet-page-${page.id || idx}`}
                  variant="interior"
                  pageNumberLabel={`PÁG. ${String(idx + 1).padStart(2, '0')}`}
                  imageSrc={renderedPages[idx] || ''}
                  title={page.chapterBeat || `Página ${idx + 1}`}
                  subtitle={`${page.komas?.length ?? 0} viñetas · ${page.artStyle}`}
                />
              ))}

              <FlipSheet
                key="sheet-back-cover"
                variant="back"
                pageNumberLabel="CONTRAPORTADA"
                imageSrc={backCoverSrc}
                title={project.name || 'MANGAI Studio'}
                subtitle={
                  project.cover.backSynopsis ||
                  'Editado y maquetado en MANGAI Studio OS listo para imprenta.'
                }
              />
            </HTMLFlipBook>
          )}
        </div>

        <p className="gf-flipbook-hint">
          Arrastra las esquinas de la página o usa las flechas <strong>← / →</strong> para pasar
          hojas sin recortes laterales.
        </p>
      </div>
    </div>
  );
};

export default MangaFlipbookViewer;
