'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Copy,
  Download,
  Maximize2,
  PenTool,
  Plus,
  PlusCircle,
  RefreshCw,
  Ruler,
} from 'lucide-react';
import type { PreflightReport } from '@/lib/export/buildPrintBundle';
import { computeSpineInches, getPrintPreset } from '@/lib/print/presets';
import { getSeedProjectForVolume } from '@/lib/storage/seedProjects';
import { toDataImageSrc, type Page, type Project } from '../types';
import './CollectionShelf.css';

export interface CollectionShelfProps {
  project: Project;
  extraProjects: Project[];
  preflightReport: PreflightReport;
  buildingPdf: boolean;
  onSelectProject: (target: Project) => void;
  onCreateProject: () => void;
  onDuplicateProject: () => void;
  onOpenPages: () => void;
  onOpenProject: () => void;
  onOpenFlipbook: () => void;
  onExportPdf: () => void;
  onOpenPreflight: () => void;
}

type ShelfFilter = 'all' | 'production' | 'ready';

type SpineTone = 'crimson' | 'sky' | 'amber' | 'emerald' | 'indigo';

interface ShelfItem {
  key: string;
  project: Project;
  isActive: boolean;
  statusBucket: 'production' | 'ready';
  statusLabel: string;
  volumeCode: string;
  tone: SpineTone;
  overallPct: number;
  inkPct: number;
  scriptPct: number;
}

interface SpreadSheet {
  id: string;
  kind: 'cover' | 'page' | 'back';
  label: string;
  pageNumber?: number;
  page?: Page;
  imageSrc?: string;
}

const FEATURED_SEED_SLUGS = [
  'anacaona-vol1',
  'huracan-vol2',
  'akai-ronin-vol1',
  'kuro-vol1',
] as const;

const SPINE_TONES: SpineTone[] = ['sky', 'amber', 'emerald', 'indigo'];

function computeProjectMetrics(proj: Project) {
  const pages = proj.pages ?? [];
  let totalKomas = 0;
  let inkedKomas = 0;
  let scriptedKomas = 0;
  let pagesWithInk = 0;

  for (const pg of pages) {
    const komas = pg.komas ?? [];
    const pageHasFullArt = Boolean(pg.base64);
    const pageHasKomaInk = komas.some((k) => Boolean(k.inkRenderUrl));
    if (pageHasFullArt || pageHasKomaInk) {
      pagesWithInk += 1;
    }

    if (komas.length === 0) {
      totalKomas += 1;
      if (pageHasFullArt) inkedKomas += 1;
      if (pg.prompt?.trim() || pg.chapterBeat?.trim()) scriptedKomas += 1;
    } else {
      for (const k of komas) {
        totalKomas += 1;
        if (pageHasFullArt || Boolean(k.inkRenderUrl)) {
          inkedKomas += 1;
        }
        if (k.actionPrompt?.trim() || (k.dialogues?.length ?? 0) > 0) {
          scriptedKomas += 1;
        }
      }
    }
  }

  const safeTotal = Math.max(1, totalKomas);
  const inkPct = Math.round((inkedKomas / safeTotal) * 100);
  const scriptPct = Math.round((scriptedKomas / safeTotal) * 100);
  const hasCover = Boolean(proj.cover.frontBase64 || proj.cover.fullWrapBase64);
  const overallPct = Math.min(
    100,
    Math.round(inkPct * 0.65 + scriptPct * 0.2 + (hasCover ? 15 : 0)),
  );
  const isReady = hasCover && inkPct >= 75 && Boolean(proj.cover.isbn?.trim());

  return {
    inkPct,
    scriptPct,
    overallPct,
    pagesWithInk,
    totalPages: pages.length,
    isReady,
  };
}

function getBindingShortLabel(binding?: Project['bindingType']): string {
  if (binding === 'tapa_dura') return 'Tapa Dura';
  if (binding === 'grapa') return 'Grapa';
  return 'Lomo Cuadrado';
}

function getVolumeCode(proj: Project, idx: number, isReady: boolean, inkPct: number): string {
  if (proj.pageCount <= 68) return 'ONE-SHOT';
  if (!isReady && inkPct === 0) return `NEMU ${String(idx + 1).padStart(2, '0')}`;
  return `VOL. ${String(idx + 1).padStart(2, '0')}`;
}

export const CollectionShelf: React.FC<CollectionShelfProps> = ({
  project,
  extraProjects,
  preflightReport,
  buildingPdf,
  onSelectProject,
  onCreateProject,
  onDuplicateProject,
  onOpenPages,
  onOpenProject,
  onOpenFlipbook,
  onExportPdf,
  onOpenPreflight,
}) => {
  const [filter, setFilter] = useState<ShelfFilter>('all');
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    setSpreadIndex(0);
  }, [project.id, project.name]);

  const shelfItems = useMemo<ShelfItem[]>(() => {
    const items: Project[] = [project];
    const seenKeys = new Set<string>([
      (project.id || '').toLowerCase(),
      (project.volumeSlug || '').toLowerCase(),
      (project.name || '').trim().toLowerCase(),
    ]);

    const addUnique = (candidate: Project | null) => {
      if (!candidate) return;
      const idKey = (candidate.id || '').toLowerCase();
      const slugKey = (candidate.volumeSlug || '').toLowerCase();
      const nameKey = (candidate.name || '').trim().toLowerCase();
      if (
        (idKey && seenKeys.has(idKey)) ||
        (slugKey && seenKeys.has(slugKey)) ||
        (nameKey && seenKeys.has(nameKey))
      ) {
        return;
      }
      if (idKey) seenKeys.add(idKey);
      if (slugKey) seenKeys.add(slugKey);
      if (nameKey) seenKeys.add(nameKey);
      items.push(candidate);
    };

    for (const ep of extraProjects) {
      addUnique(ep);
    }

    for (const slug of FEATURED_SEED_SLUGS) {
      if (items.length >= 6) break;
      addUnique(getSeedProjectForVolume(slug));
    }

    return items.map((item, idx) => {
      const isActive = idx === 0;
      const metrics = computeProjectMetrics(item);
      const statusBucket: 'production' | 'ready' = metrics.isReady ? 'ready' : 'production';
      const statusLabel = isActive
        ? 'Activo'
        : metrics.isReady
        ? 'Listo KDP'
        : metrics.inkPct > 0
        ? 'Entintado'
        : 'Boceto';
      const tone: SpineTone = isActive
        ? 'crimson'
        : metrics.isReady
        ? 'emerald'
        : SPINE_TONES[(idx - 1) % SPINE_TONES.length];

      return {
        key: item.id || item.volumeSlug || `vol-${idx}`,
        project: item,
        isActive,
        statusBucket,
        statusLabel,
        volumeCode: getVolumeCode(item, idx, metrics.isReady, metrics.inkPct),
        tone,
        overallPct: metrics.overallPct,
        inkPct: metrics.inkPct,
        scriptPct: metrics.scriptPct,
      };
    });
  }, [project, extraProjects]);

  const counts = useMemo(() => {
    const production = shelfItems.filter((item) => item.statusBucket === 'production').length;
    const ready = shelfItems.filter((item) => item.statusBucket === 'ready').length;
    return { all: shelfItems.length, production, ready };
  }, [shelfItems]);

  const visibleShelfItems = useMemo(() => {
    if (filter === 'all') return shelfItems;
    return shelfItems.filter((item) => item.statusBucket === filter);
  }, [shelfItems, filter]);

  const activePreset = useMemo(() => getPrintPreset(project.trimFormat), [project.trimFormat]);
  const activeMetrics = useMemo(() => computeProjectMetrics(project), [project]);
  const spineInches = useMemo(
    () =>
      computeSpineInches(
        project.pageCount,
        project.paperType,
        project.colorMode ?? 'bw',
        project.bindingType ?? 'rustica_pegada',
      ),
    [project.pageCount, project.paperType, project.colorMode, project.bindingType],
  );
  const spineMm = Number((spineInches * 25.4).toFixed(2));
  const warnCount = useMemo(
    () => preflightReport.checks.filter((c) => c.status !== 'ok').length,
    [preflightReport.checks],
  );

  const sheets = useMemo<SpreadSheet[]>(() => {
    const list: SpreadSheet[] = [];
    const coverImg = toDataImageSrc(project.cover.frontBase64 || project.cover.fullWrapBase64);
    if (coverImg) {
      list.push({
        id: 'sheet-cover',
        kind: 'cover',
        label: 'PORTADA',
        imageSrc: coverImg,
      });
    }
    project.pages.forEach((pg, idx) => {
      list.push({
        id: pg.id || `sheet-p-${idx + 1}`,
        kind: 'page',
        label: `P. ${String(idx + 1).padStart(2, '0')}`,
        pageNumber: idx + 1,
        page: pg,
        imageSrc: toDataImageSrc(pg.base64),
      });
    });
    const backImg = toDataImageSrc(project.cover.backBase64);
    if (backImg) {
      list.push({
        id: 'sheet-back',
        kind: 'back',
        label: 'CONTRAPORTADA',
        imageSrc: backImg,
      });
    }
    return list;
  }, [project]);

  const spreads = useMemo<Array<[SpreadSheet, SpreadSheet | null]>>(() => {
    const pairs: Array<[SpreadSheet, SpreadSheet | null]> = [];
    for (let i = 0; i < sheets.length; i += 2) {
      pairs.push([sheets[i], sheets[i + 1] ?? null]);
    }
    if (pairs.length === 0) {
      pairs.push([
        { id: 'blank-1', kind: 'page', label: 'P. 01', pageNumber: 1 },
        null,
      ]);
    }
    return pairs;
  }, [sheets]);

  const safeSpreadIndex = Math.min(spreadIndex, spreads.length - 1);
  const [firstSheet, secondSheet] = spreads[safeSpreadIndex];
  const isRtl = project.readingDirection !== 'ltr';
  const rightSheet = isRtl ? firstSheet : secondSheet;
  const leftSheet = isRtl ? secondSheet : firstSheet;

  const triggerStepSpread = (delta: number) => {
    const next = Math.max(0, Math.min(spreads.length - 1, safeSpreadIndex + delta));
    if (next === safeSpreadIndex) return;
    setIsFlipping(true);
    window.setTimeout(() => {
      setSpreadIndex(next);
      setIsFlipping(false);
    }, 130);
  };

  const coverThumbSrc = toDataImageSrc(project.cover.frontBase64 || project.cover.fullWrapBase64);
  const lockedCanonCount = project.characters.filter((c) => c.seedLocked).length;

  const renderSpreadPage = (sheet: SpreadSheet | null, side: 'left' | 'right') => {
    const isStartSide = (isRtl && side === 'right') || (!isRtl && side === 'left');
    if (!sheet) {
      return (
        <div className={`cs-spread-page is-${side} is-empty`}>
          <div className="cs-spread-page-head">
            <span>{(project.name || 'MANGA').toUpperCase()}</span>
            <span>FIN DE MUESTRA</span>
          </div>
          <div className="cs-spread-blank-body">
            <span className="cs-spread-blank-kicker">PLIEGO EN BLANCO</span>
            <p>Añade páginas interiores en el editor Koma-wari para completar este pliego.</p>
            <button type="button" className="cs-spread-inline-btn" onClick={onOpenPages}>
              <PenTool size={12} strokeWidth={2} />
              <span>Abrir Páginas Interiores</span>
            </button>
          </div>
          <div className="cs-spread-page-foot">
            <span>{activePreset.shortName.toUpperCase()}</span>
            <span>SANGRADO OK</span>
          </div>
        </div>
      );
    }

    if (sheet.kind === 'cover' || sheet.kind === 'back') {
      return (
        <div className={`cs-spread-page is-${side}`}>
          <div className="cs-spread-page-head">
            <span className="cs-spread-page-num">{sheet.label}</span>
            {isStartSide && <span className="cs-spread-start-tag">INICIO PLIEGO</span>}
          </div>
          <div className="cs-spread-cover-frame">
            {sheet.imageSrc ? (
              <img src={sheet.imageSrc} alt={`${project.name} - ${sheet.label}`} />
            ) : (
              <div className="cs-spread-cover-fallback">{project.name || 'Manga sin título'}</div>
            )}
            {sheet.kind === 'cover' && (
              <div className="cs-spread-cover-caption">
                <strong>{project.name || 'Manga sin título'}</strong>
                <span>{project.author || 'MANGAI Editorial'}</span>
              </div>
            )}
          </div>
          <div className="cs-spread-page-foot">
            <span>{activePreset.dpiCover} DPI COVER</span>
            <span>KAI ENGINE</span>
          </div>
        </div>
      );
    }

    const pg = sheet.page;
    const komas = pg?.komas ?? [];
    const isColor = project.colorMode === 'color';

    return (
      <div className={`cs-spread-page is-${side}`}>
        <div className="cs-spread-page-head">
          {side === 'left' ? (
            <>
              <span className="cs-spread-page-series">
                {(project.cover.spineTitle || project.name || 'MANGAI').toUpperCase()}
              </span>
              <span className="cs-spread-page-num">{sheet.label}</span>
            </>
          ) : (
            <>
              <span className="cs-spread-page-num">{sheet.label}</span>
              {isStartSide ? (
                <span className="cs-spread-start-tag">INICIO PLIEGO</span>
              ) : (
                <span className="cs-spread-page-series">
                  {(project.cover.spineTitle || project.name || 'MANGAI').toUpperCase()}
                </span>
              )}
            </>
          )}
        </div>

        <div className="cs-spread-art-area">
          {sheet.imageSrc ? (
            <div className="cs-spread-full-art">
              <img
                src={sheet.imageSrc}
                alt={`Página ${sheet.pageNumber}`}
                className={isColor ? '' : 'is-bw'}
              />
            </div>
          ) : komas.length > 0 ? (
            <div className={`cs-spread-koma-grid count-${Math.min(4, komas.length)}`}>
              {komas.slice(0, 4).map((koma) => {
                const artSrc = toDataImageSrc(koma.inkRenderUrl || koma.nemuSketchUrl);
                const firstDialogue = koma.dialogues?.[0];
                const firstSfx = koma.sfxItems?.[0];
                return (
                  <div key={koma.id} className="cs-spread-koma-cell">
                    {artSrc ? (
                      <img
                        src={artSrc}
                        alt={`Viñeta #${koma.panelIndex}`}
                        className={isColor ? '' : 'is-bw'}
                      />
                    ) : (
                      <div className="cs-spread-koma-empty">
                        <span>K{koma.panelIndex}</span>
                        <small>{koma.state}</small>
                      </div>
                    )}
                    {firstSfx?.text && <span className="cs-spread-sfx">{firstSfx.text}</span>}
                    {firstDialogue?.text && (
                      <span className="cs-spread-balloon">{firstDialogue.text}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cs-spread-blank-body">
              <span className="cs-spread-blank-kicker">LIENZO GENKŌ</span>
              <p>{pg?.chapterBeat || 'Página lista para entintar en Viñetas e Interiores.'}</p>
            </div>
          )}
        </div>

        <div className="cs-spread-page-foot">
          <span>{side === 'left' ? 'SANGRADO OK' : 'G-PEN 0.38MM'}</span>
          <span>{activePreset.dpiInterior} DPI</span>
        </div>
      </div>
    );
  };

  return (
    <section className="cs-root" aria-label="Colección de Mangas y Estante Virtual">
      {/* Header & Filter Bar */}
      <header className="cs-header">
        <div className="cs-header-copy">
          <div className="cs-kicker-row">
            <span className="cs-kicker-badge">ARCHIVO TANKŌBON B6</span>
            <span className="cs-kicker-dot" aria-hidden="true">
              ·
            </span>
            <span className="cs-kicker-dim">
              {activePreset.trimWidthMm} × {activePreset.trimHeightMm} mm
            </span>
          </div>
          <h1 className="cs-title">Colección de Mangas</h1>
          <p className="cs-subtitle">
            Gestión de tomos físicos Tankōbon y visor de pliegos interactivo para publicación KDP.
          </p>
        </div>

        <div className="cs-header-actions">
          <div className="cs-filter-group" role="tablist" aria-label="Filtrar colección">
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              className={`cs-filter-pill ${filter === 'all' ? 'is-active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Todos ({counts.all})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'production'}
              className={`cs-filter-pill ${filter === 'production' ? 'is-active' : ''}`}
              onClick={() => setFilter('production')}
            >
              En Producción ({counts.production})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'ready'}
              className={`cs-filter-pill ${filter === 'ready' ? 'is-active' : ''}`}
              onClick={() => setFilter('ready')}
            >
              Listos KDP ({counts.ready})
            </button>
          </div>

          <button type="button" className="cs-btn-primary" onClick={onCreateProject}>
            <Plus size={15} strokeWidth={2.2} className="gf-icon-shrink" />
            <span>+ Nuevo Tomo</span>
          </button>
        </div>
      </header>

      {/* 3D Virtual Tankōbon Shelf */}
      <div className="cs-shelf-card">
        <div className="cs-shelf-ambient" aria-hidden="true" />
        <div className="cs-shelf-topbar">
          <span className="cs-shelf-live">
            <span className="cs-shelf-dot" aria-hidden="true" />
            <span>SERIALIZACIONES EN CURSO</span>
          </span>
          <span className="cs-shelf-hint">FORMATO JAPONÉS B6 · HAZ CLIC PARA INSPECCIONAR</span>
        </div>

        <div className="cs-shelf-stage no-scrollbar">
          {visibleShelfItems.length === 0 ? (
            <div className="cs-shelf-empty">
              <span>No hay tomos en esta categoría.</span>
              <button type="button" className="cs-link-btn" onClick={() => setFilter('all')}>
                Ver todos los tomos
              </button>
            </div>
          ) : (
            visibleShelfItems.map((item) => {
              const heightClass =
                item.project.pageCount >= 180
                  ? 'h-tall'
                  : item.project.pageCount <= 80
                  ? 'h-short'
                  : 'h-mid';
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectProject(item.project)}
                  className={`cs-spine-slot ${item.isActive ? 'is-active' : ''} tone-${item.tone}`}
                  aria-pressed={item.isActive}
                  title={`Inspeccionar ${item.project.name}`}
                >
                  <span className={`cs-spine-status tone-${item.tone}`}>{item.statusLabel}</span>
                  <div className={`cs-spine-body ${heightClass} tone-${item.tone}`}>
                    <span className="cs-spine-vol">{item.volumeCode}</span>
                    <span className="cs-spine-title">
                      {(item.project.cover.spineTitle || item.project.name || 'TOMO').toUpperCase()}
                    </span>
                    <div className="cs-spine-foot">
                      {item.isActive && <span className="cs-spine-hanko">開</span>}
                      <span className="cs-spine-pages">{item.project.pageCount}P</span>
                    </div>
                  </div>
                  <span className="cs-spine-shadow" aria-hidden="true" />
                </button>
              );
            })
          )}

          {/* Dashed + Nuevo Tomo Slot */}
          <div className="cs-spine-add-wrap">
            <span className="cs-spine-status is-spacer" aria-hidden="true">
              &nbsp;
            </span>
            <button
              type="button"
              className="cs-spine-add"
              onClick={onCreateProject}
              title="Crear un nuevo tomo Tankōbon"
            >
              <PlusCircle size={20} strokeWidth={1.75} className="gf-icon-shrink" />
              <span>
                + NUEVO
                <br />
                TOMO
              </span>
            </button>
            <span className="cs-spine-shadow is-spacer" aria-hidden="true" />
          </div>
        </div>

        <div className="cs-shelf-plank" aria-hidden="true">
          <div className="cs-shelf-plank-highlight" />
        </div>
        <div className="cs-shelf-under-shadow" aria-hidden="true" />
      </div>

      {/* Lower 2-Column Stage */}
      <div className="cs-lower-grid">
        {/* Left Card: Pliego Imprenta RTL */}
        <article className="cs-card cs-viewer-card">
          <div className="cs-card-head">
            <div className="cs-card-title-row">
              <BookOpen size={17} strokeWidth={2} className="cs-accent-icon gf-icon-shrink" />
              <h2 className="cs-card-title">
                {project.name || 'Manga sin título'} · Pliego Imprenta
              </h2>
            </div>
            <div className="cs-viewer-tools">
              <button
                type="button"
                className="cs-icon-btn"
                onClick={() => triggerStepSpread(safeSpreadIndex + 1 < spreads.length ? 1 : -safeSpreadIndex)}
                title="Simular paso de pliego"
                aria-label="Pasar al siguiente pliego"
              >
                <RefreshCw size={15} strokeWidth={2} />
              </button>
              <button
                type="button"
                className="cs-icon-btn cs-flipbook-pill"
                onClick={onOpenFlipbook}
                title="Abrir Visor 3D PageFlip en pantalla completa"
              >
                <Maximize2 size={14} strokeWidth={2} />
                <span>Visor 3D</span>
              </button>
            </div>
          </div>

          <div className={`cs-spread-stage ${isFlipping ? 'is-flipping' : ''}`}>
            <div className="cs-spread-meta">
              <span className="cs-spread-dir">
                <ArrowLeft size={12} strokeWidth={2} />
                <span>
                  {isRtl
                    ? 'LECTURA DERECHA A IZQUIERDA (RTL)'
                    : 'LECTURA IZQUIERDA A DERECHA (LTR)'}
                </span>
              </span>
              <span>FORMATO {activePreset.shortName.toUpperCase()}</span>
            </div>

            <div className="cs-spread-book" onClick={onOpenFlipbook} role="button" tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenFlipbook();
                }
              }}
              aria-label="Abrir visor interactivo 3D PageFlip"
            >
              <div className="cs-spread-gutter" aria-hidden="true" />
              {renderSpreadPage(leftSheet, 'left')}
              {renderSpreadPage(rightSheet, 'right')}
            </div>
          </div>

          <div className="cs-spread-nav">
            <button
              type="button"
              className="cs-nav-step-btn"
              onClick={() => triggerStepSpread(-1)}
              disabled={safeSpreadIndex === 0}
            >
              <ArrowLeft size={14} strokeWidth={2} />
              <span>← Pág Anterior (RTL)</span>
            </button>

            <div className="cs-spread-counter">
              <strong>
                {firstSheet.label}
                {secondSheet ? ` - ${secondSheet.label}` : ''}
              </strong>
              <span>de {project.pageCount} págs</span>
            </div>

            <button
              type="button"
              className="cs-nav-step-btn"
              onClick={() => triggerStepSpread(1)}
              disabled={safeSpreadIndex >= spreads.length - 1}
            >
              <span>Pág Siguiente →</span>
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          </div>
        </article>

        {/* Right Card: Proyecto Activo — Ficha Técnica KDP */}
        <aside className="cs-card cs-spec-card">
          <div className="cs-active-head">
            <div className="cs-cover-thumb">
              {coverThumbSrc ? (
                <img src={coverThumbSrc} alt={`Portada de ${project.name}`} />
              ) : (
                <div className="cs-cover-thumb-empty">
                  <span>開</span>
                </div>
              )}
              <span className="cs-cover-thumb-tag">
                {activePreset.id === 'tankobon_b6' ? 'B6' : activePreset.id === 'b4_canva_pro' ? 'B4' : '6×9'} ·{' '}
                {activePreset.dpiInterior} DPI
              </span>
            </div>

            <div className="cs-active-meta">
              <span className="cs-active-kicker">PROYECTO ACTIVO</span>
              <h3 className="cs-active-title">{project.name || 'Manga sin título'}</h3>
              <p className="cs-active-specs">
                {activePreset.name} ({activePreset.trimWidthMm} × {activePreset.trimHeightMm} mm) ·{' '}
                {project.pageCount} Págs
              </p>
              <div className="cs-active-chips">
                <span className="cs-spec-chip">
                  {project.paperType === 'cream' ? 'Papel Crema 55lb' : 'Papel Blanco 50lb'}
                </span>
                <span className="cs-spec-chip">{getBindingShortLabel(project.bindingType)}</span>
              </div>
            </div>
          </div>

          {/* Production Progress */}
          <div className="cs-progress-box">
            <div className="cs-progress-head">
              <span>Estado Global de Producción</span>
              <strong>{activeMetrics.overallPct}% Completado</strong>
            </div>
            <div
              className="cs-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={activeMetrics.overallPct}
              aria-label="Progreso de producción del tomo"
            >
              <div className="cs-progress-fill" style={{ width: `${activeMetrics.overallPct}%` }} />
            </div>
            <div className="cs-progress-metrics">
              <div>
                <span>Guion</span>
                <strong>{activeMetrics.scriptPct}%</strong>
              </div>
              <div>
                <span>Entintado</span>
                <strong className="is-crimson">{activeMetrics.inkPct}%</strong>
              </div>
              <div>
                <span>Settei</span>
                <strong className="is-indigo">
                  {lockedCanonCount}/{project.characters.length}
                </strong>
              </div>
            </div>
          </div>

          {/* 2x2 KDP Spec Grid */}
          <div className="cs-kdp-section">
            <span className="cs-kdp-label">FICHA TÉCNICA KDP</span>
            <div className="cs-kdp-grid">
              <div className="cs-kdp-cell">
                <span>Lomo (Spine)</span>
                <strong>
                  {spineInches.toFixed(4)}&quot; ({spineMm.toFixed(2)} mm)
                </strong>
              </div>
              <div className="cs-kdp-cell">
                <span>Sangrado 3.5 mm</span>
                <strong>{activePreset.bleedLabel}</strong>
              </div>
              <div className="cs-kdp-cell">
                <span>ISBN-13</span>
                <strong>{project.cover.isbn?.trim() || 'Pendiente'}</strong>
              </div>
              <button
                type="button"
                className="cs-kdp-cell cs-kdp-cell-btn"
                onClick={onOpenPreflight}
                title="Ver diagnóstico Pre-flight KDP"
              >
                <span>Pre-flight</span>
                <strong className={warnCount === 0 ? 'is-ok' : 'is-warn'}>
                  {warnCount === 0 ? (
                    <>
                      <CheckCircle2 size={13} strokeWidth={2.2} className="gf-icon-shrink" />
                      <span>Verificado KDP</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={13} strokeWidth={2.2} className="gf-icon-shrink" />
                      <span>{warnCount} por revisar</span>
                    </>
                  )}
                </strong>
              </button>
            </div>
          </div>

          {/* Primary & Secondary Actions */}
          <div className="cs-spec-actions">
            <button type="button" className="cs-btn-primary cs-btn-block" onClick={onOpenPages}>
              <PenTool size={15} strokeWidth={2} className="gf-icon-shrink" />
              <span>Abrir en Mesa de Dibujo / Estudio</span>
              <ArrowUpRight size={14} strokeWidth={2.2} className="gf-icon-shrink" />
            </button>
            <button
              type="button"
              className="cs-btn-secondary cs-btn-block"
              onClick={onExportPdf}
              disabled={buildingPdf}
            >
              {buildingPdf ? (
                <RefreshCw size={15} strokeWidth={2} className="gf-spin gf-icon-shrink" />
              ) : (
                <Download size={15} strokeWidth={2} className="gf-icon-shrink" />
              )}
              <span>{buildingPdf ? 'Generando Prueba PDF KDP...' : 'Descargar Prueba PDF KDP'}</span>
            </button>
          </div>

          {/* Quick Footer Links */}
          <div className="cs-spec-footer">
            <button type="button" className="cs-foot-link" onClick={onDuplicateProject}>
              <Copy size={13} strokeWidth={2} className="gf-icon-shrink" />
              <span>Duplicar Tomo</span>
            </button>
            <button type="button" className="cs-foot-link" onClick={onOpenProject}>
              <Ruler size={13} strokeWidth={2} className="gf-icon-shrink" />
              <span>Ajustes de Lomo</span>
            </button>
            <button type="button" className="cs-foot-link" onClick={onOpenFlipbook}>
              <BookOpen size={13} strokeWidth={2} className="gf-icon-shrink" />
              <span>Visor 3D</span>
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
};
