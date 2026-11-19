'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Info,
  Moon,
  PackageCheck,
  PenTool,
  Plus,
  Printer,
  RefreshCw,
  Sparkles,
  Sun,
  Users,
} from 'lucide-react';
import JSZip from './jszip-lite';
import { Flow } from './flow-sdk';
import { FieldDropdown, PillButton, SectionLabel, TextInput } from './components/Primitives';
import { CharacterLibrary } from './components/CharacterLibrary';
import { CoverDesigner, type CoverDesignerHandle } from './components/CoverDesigner';
import { PageEditor } from './components/PageEditor';
import { ProjectManager } from './components/ProjectManager';
import {
  type GeneratingState,
  type Page,
  type Project,
  type StudioView,
  splitDataUrl,
} from './types';
import './studio.css';

const STUDIO_STORAGE_KEY = 'mangai-flow-studio-v1';
const STUDIO_THEME_KEY = 'mangai-studio-theme-v1';

const ART_STYLES = [
  'Classic Shonen',
  'Dark Seinen',
  'Modern Shojo',
  'Retro Gekiga',
  'Cyberpunk Manga',
];

function resolveTabParam(raw: string | null): StudioView | null {
  if (!raw) return null;
  const slug = raw.trim().toLowerCase();
  if (slug === 'project' || slug === 'lore' || slug === 'setup' || slug === 'config') {
    return 'project';
  }
  if (slug === 'characters' || slug === 'settei' || slug === 'personajes') {
    return 'characters';
  }
  if (slug === 'cover' || slug === 'print' || slug === 'portada' || slug === 'tankobon') {
    return 'cover';
  }
  if (slug === 'pages' || slug === 'panels' || slug === 'paginas' || slug === 'interiores') {
    return 'pages';
  }
  return null;
}

function createPageId(): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `page-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createInitialProject(pageId = 'page-1'): Project {
  return {
    name: 'Manga sin título',
    author: 'Autor',
    pageCount: 100,
    paperType: 'white',
    characters: [],
    pages: [{ id: pageId, base64: '', prompt: '', artStyle: 'Classic Shonen', castIds: [] }],
    cover: {
      frontBase64: '',
      backBase64: '',
      fullWrapBase64: '',
      prompt: '',
      spineWidthInches: 0.2252,
    },
  };
}

export default function StudioPage() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [view, setView] = useState<StudioView>('project');
  const [project, setProject] = useState<Project>(() => createInitialProject());
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [generating, setGenerating] = useState<GeneratingState>({
    cover: false,
    bundle: false,
    pages: {},
    characters: {},
  });
  const [bundleError, setBundleError] = useState('');

  const coverDesignerRef = useRef<CoverDesignerHandle>(null);

  const setTaskLoading = useCallback((task: 'cover' | 'bundle', value: boolean) => {
    setGenerating((prev) => ({ ...prev, [task]: value }));
  }, []);

  const setPageLoading = useCallback((pageId: string, value: boolean) => {
    setGenerating((prev) => {
      const nextPages = { ...prev.pages };
      if (value) nextPages[pageId] = true;
      else delete nextPages[pageId];
      return { ...prev, pages: nextPages };
    });
  }, []);

  const setCharacterLoading = useCallback((charId: string, value: boolean) => {
    setGenerating((prev) => {
      const nextCharacters = { ...prev.characters };
      if (value) nextCharacters[charId] = true;
      else delete nextCharacters[charId];
      return { ...prev, characters: nextCharacters };
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialTab = resolveTabParam(params.get('tab'));
    if (initialTab) {
      setView(initialTab);
    }

    try {
      const savedTheme = window.localStorage.getItem(STUDIO_THEME_KEY);
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      }
    } catch {
      // Ignore storage access errors.
    }

    try {
      const raw = window.localStorage.getItem(STUDIO_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Project>;
        if (
          parsed &&
          typeof parsed.name === 'string' &&
          Array.isArray(parsed.pages) &&
          parsed.pages.length > 0
        ) {
          const paperType = parsed.paperType === 'cream' ? 'cream' : 'white';
          const pageCount =
            typeof parsed.pageCount === 'number' && parsed.pageCount > 0 ? parsed.pageCount : 100;
          const multi = paperType === 'white' ? 0.002252 : 0.0025;
          setProject({
            name: parsed.name || 'Manga sin título',
            author: typeof parsed.author === 'string' ? parsed.author : 'Autor',
            pageCount,
            paperType,
            characters: Array.isArray(parsed.characters) ? parsed.characters : [],
            pages: parsed.pages.map((p, idx) => ({
              id: typeof p.id === 'string' && p.id ? p.id : `page-${idx + 1}`,
              base64: typeof p.base64 === 'string' ? p.base64 : '',
              prompt: typeof p.prompt === 'string' ? p.prompt : '',
              artStyle: typeof p.artStyle === 'string' ? p.artStyle : 'Classic Shonen',
              castIds: Array.isArray(p.castIds) ? p.castIds : [],
            })),
            cover: {
              frontBase64: parsed.cover?.frontBase64 ?? '',
              backBase64: parsed.cover?.backBase64 ?? '',
              fullWrapBase64: parsed.cover?.fullWrapBase64 ?? '',
              prompt: parsed.cover?.prompt ?? '',
              spineWidthInches:
                typeof parsed.cover?.spineWidthInches === 'number'
                  ? parsed.cover.spineWidthInches
                  : Math.max(0.1, pageCount * multi),
            },
          });
          setMounted(true);
          return;
        }
      }
    } catch {
      // Ignore malformed localStorage state and fall back to fresh project.
    }
    setProject(createInitialProject(createPageId()));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(project));
    } catch {
      try {
        const lightweight: Project = {
          ...project,
          characters: project.characters.map((c) => ({ ...c, referenceBase64: undefined })),
          pages: project.pages.map((p) => ({ ...p, base64: '' })),
          cover: { ...project.cover, frontBase64: '', backBase64: '', fullWrapBase64: undefined },
        };
        window.localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(lightweight));
      } catch {
        // Ignore storage quota overflow gracefully.
      }
    }
  }, [project, mounted]);

  useEffect(() => {
    if (activePageIndex >= project.pages.length) {
      setActivePageIndex(Math.max(0, project.pages.length - 1));
    }
  }, [project.pages.length, activePageIndex]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        window.localStorage.setItem(STUDIO_THEME_KEY, next);
      } catch {
        // Ignore storage access errors.
      }
      return next;
    });
  };

  const handleSelectView = (nextView: StudioView) => {
    setView(nextView);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', nextView);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const safePageIndex = Math.min(activePageIndex, Math.max(0, project.pages.length - 1));
  const activePage = project.pages[safePageIndex];

  const updateProject = (updates: Partial<Project>) => {
    setProject((prev) => {
      const mergedCover = updates.cover
        ? { ...prev.cover, ...updates.cover }
        : { ...prev.cover };
      const nextState: Project = {
        ...prev,
        ...updates,
        cover: mergedCover,
      };
      const multi = nextState.paperType === 'white' ? 0.002252 : 0.0025;
      nextState.cover.spineWidthInches = Math.max(0.1, nextState.pageCount * multi);
      return nextState;
    });
  };

  const updatePageById = (pageId: string, patch: Partial<Page>) => {
    setProject((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => (p.id === pageId ? { ...p, ...patch } : p)),
    }));
  };

  const updateCover = (patch: Partial<Project['cover']>) => {
    setProject((prev) => ({
      ...prev,
      cover: {
        ...prev.cover,
        ...patch,
      },
    }));
  };

  const handleDownloadAll = async () => {
    if (generating.bundle) return;
    setTaskLoading('bundle', true);
    setBundleError('');
    try {
      const zip = new JSZip();
      zip.file(
        'kdp_manifest.json',
        JSON.stringify(
          {
            ...project,
            printSpec: '6x9 Paperback',
            bleed: '0.125in',
          },
          null,
          2,
        ),
      );
      if (project.cover.fullWrapBase64) {
        const { base64 } = splitDataUrl(project.cover.fullWrapBase64);
        if (base64) {
          zip.file('cover/paperback_wrap.png', base64, { base64: true });
        }
      }
      project.pages.forEach((page, i) => {
        if (page.base64) {
          const { base64 } = splitDataUrl(page.base64);
          if (base64) {
            zip.file(`interior/page_${String(i + 1).padStart(3, '0')}.png`, base64, {
              base64: true,
            });
          }
        }
      });
      const base64 = await zip.generateAsync({ type: 'base64' });
      const safeName = (project.name || 'Manga_Sin_Titulo').trim().replace(/\s+/g, '_') || 'Manga';
      await Flow.download({
        base64,
        mimeType: 'application/zip',
        filename: `${safeName}_KDP_BUNDLE.zip`,
      });
    } catch (err) {
      console.error(err);
      setBundleError(err instanceof Error ? err.message : 'No se pudo generar el paquete ZIP.');
    } finally {
      setTaskLoading('bundle', false);
    }
  };

  if (!mounted) {
    return <div className="gf-loading" aria-hidden="true" />;
  }

  return (
    <div className="gf-studio-root" data-theme={theme}>
      <header className="gf-topbar">
        <div className="gf-topbar-left">
          <Link
            href="/"
            prefetch={false}
            title="Volver al inicio"
            className="gf-brand-link"
          >
            <ArrowLeft size={16} strokeWidth={1.75} className="gf-icon-shrink" />
            <span>MANGAI STUDIO</span>
          </Link>
          <span className="gf-topbar-divider" aria-hidden="true" />
          <span className="gf-topbar-project">{project.name || 'Manga sin título'}</span>
        </div>

        <div className="gf-topbar-right">
          <button
            type="button"
            onClick={toggleTheme}
            className="gf-theme-toggle"
            title={theme === 'light' ? 'Cambiar a Modo Estudio Oscuro' : 'Cambiar a Modo Papel Genkō'}
            aria-label={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo Papel Genkō claro'}
          >
            {theme === 'light' ? (
              <>
                <Moon size={15} strokeWidth={1.75} className="gf-icon-shrink" />
                <span>Modo Oscuro</span>
              </>
            ) : (
              <>
                <Sun size={15} strokeWidth={1.75} className="gf-icon-shrink" />
                <span>Papel Genkō</span>
              </>
            )}
          </button>
        </div>
      </header>

      <div className="manga-grid">
        <aside className="gf-sidebar-left no-scrollbar">
          <div className="gf-sidebar-section">
            <Link
              href="/"
              prefetch={false}
              title="Volver al inicio"
              className="gf-sidebar-brand"
            >
              <ArrowLeft size={14} strokeWidth={1.75} className="gf-icon-shrink" />
              <span>MANGAI STUDIO</span>
            </Link>
            <div className="gf-nav-list">
              <NavItem
                active={view === 'project'}
                icon={<Printer size={17} strokeWidth={1.75} className="gf-icon-shrink" />}
                label="Configuración y Lomo"
                onClick={() => handleSelectView('project')}
              />
              <NavItem
                active={view === 'characters'}
                icon={<Users size={17} strokeWidth={1.75} className="gf-icon-shrink" />}
                label="Settei y Personajes"
                onClick={() => handleSelectView('characters')}
              />
              <NavItem
                active={view === 'cover'}
                icon={<BookOpen size={17} strokeWidth={1.75} className="gf-icon-shrink" />}
                label="Portada Tankōbon"
                onClick={() => handleSelectView('cover')}
              />
              <NavItem
                active={view === 'pages'}
                icon={<BookMarked size={17} strokeWidth={1.75} className="gf-icon-shrink" />}
                label="Páginas e Interiores"
                onClick={() => handleSelectView('pages')}
              />
            </div>
          </div>

          {view === 'pages' && (
            <div className="gf-sidebar-section animate-slide-in-right">
              <SectionLabel>Manuscrito</SectionLabel>
              <div className="gf-manuscript-list dark-scrollbar">
                {project.pages.map((p, i) => {
                  const isThisPageBusy = Boolean(generating.pages[p.id]);
                  return (
                    <button
                      key={p.id || i}
                      type="button"
                      onClick={() => setActivePageIndex(i)}
                      className={`gf-page-item ${safePageIndex === i ? 'is-active' : ''}`}
                    >
                      <span className="gf-page-item-left">
                        <span className="gf-page-item-num">{String(i + 1).padStart(2, '0')}</span>
                        <span>Página {i + 1}</span>
                      </span>
                      <span className="gf-page-item-icon">
                        {isThisPageBusy ? (
                          <RefreshCw size={14} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
                        ) : p.base64 ? (
                          <CheckCircle2 size={14} strokeWidth={1.75} className="gf-icon-shrink" />
                        ) : (
                          <PenTool size={14} strokeWidth={1.75} className="gf-icon-shrink" />
                        )}
                      </span>
                    </button>
                  );
                })}
                <PillButton
                  variant="outline"
                  icon={<Plus size={16} strokeWidth={1.75} className="gf-icon-shrink" />}
                  onClick={() => {
                    const activeArtStyle = project.pages[safePageIndex]?.artStyle || 'Classic Shonen';
                    const newPages: Page[] = [
                      ...project.pages,
                      {
                        id: createPageId(),
                        base64: '',
                        prompt: '',
                        artStyle: activeArtStyle,
                        castIds: [],
                      },
                    ];
                    updateProject({ pages: newPages });
                    setActivePageIndex(newPages.length - 1);
                  }}
                >
                  Añadir Página
                </PillButton>
              </div>
            </div>
          )}

          <div className="gf-sidebar-bottom">
            <SectionLabel>Entrega Final</SectionLabel>
            <PillButton
              variant="solid"
              icon={
                generating.bundle ? (
                  <RefreshCw size={16} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
                ) : (
                  <PackageCheck size={16} strokeWidth={1.75} className="gf-icon-shrink" />
                )
              }
              onClick={handleDownloadAll}
              disabled={generating.bundle}
            >
              {generating.bundle ? 'Empaquetando ZIP...' : 'Exportar Paquete ZIP'}
            </PillButton>
            {generating.bundle && (
              <div className="gf-status-text animate-pulse-slow">
                Preparando archivos editoriales...
              </div>
            )}
            {bundleError && <div className="gf-inline-error">{bundleError}</div>}
          </div>
        </aside>

        <main className="gf-canvas-shell">
          <div className="gf-canvas-scroll dark-scrollbar">
            {view === 'pages' && (
              <PageEditor
                project={project}
                pageIndex={safePageIndex}
                updateProject={updateProject}
                isGeneratingPage={Boolean(activePage && generating.pages[activePage.id])}
              />
            )}
            {view === 'characters' && (
              <CharacterLibrary
                project={project}
                updateProject={updateProject}
                characterLoading={generating.characters}
                setCharacterLoading={setCharacterLoading}
              />
            )}
            {view === 'cover' && (
              <CoverDesigner
                ref={coverDesignerRef}
                project={project}
                updateProject={updateProject}
                isGeneratingCover={generating.cover}
              />
            )}
            {view === 'project' && (
              <ProjectManager project={project} updateProject={updateProject} />
            )}
          </div>
        </main>

        <aside className="gf-sidebar-right dark-scrollbar">
          <ViewControls
            view={view}
            project={project}
            pageIndex={safePageIndex}
            generating={generating}
            setTaskLoading={setTaskLoading}
            setPageLoading={setPageLoading}
            updatePageById={updatePageById}
            updateCover={updateCover}
            onExportCover={() => coverDesignerRef.current?.exportCover()}
          />
        </aside>
      </div>
    </div>
  );
}

function NavItem({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`gf-nav-item ${active ? 'is-active' : ''}`}
    >
      <span className="gf-nav-icon">{icon}</span>
      <span className="gf-nav-label">{label}</span>
    </button>
  );
}

function ViewControls({
  view,
  project,
  pageIndex,
  generating,
  setTaskLoading,
  setPageLoading,
  updatePageById,
  updateCover,
  onExportCover,
}: {
  view: StudioView;
  project: Project;
  pageIndex: number;
  generating: GeneratingState;
  setTaskLoading: (task: 'cover' | 'bundle', value: boolean) => void;
  setPageLoading: (pageId: string, value: boolean) => void;
  updatePageById: (pageId: string, patch: Partial<Page>) => void;
  updateCover: (patch: Partial<Project['cover']>) => void;
  onExportCover: () => void;
}) {
  const [style, setStyle] = useState<string>('Classic Shonen');
  const [coverError, setCoverError] = useState<string>('');
  const [pageErrors, setPageErrors] = useState<Record<string, string>>({});

  const currentPage = project.pages[pageIndex];
  const currentPageId = currentPage?.id ?? '';
  const pagePrompt = currentPage?.prompt ?? '';
  const pageStyle = currentPage?.artStyle || style;
  const coverPrompt = project.cover.prompt ?? '';

  const isCurrentPageBusy = Boolean(currentPageId && generating.pages[currentPageId]);
  const isCoverBusy = generating.cover;
  const currentPageError = currentPageId ? pageErrors[currentPageId] ?? '' : '';

  const generatePage = async () => {
    if (!currentPage) return;
    const targetPageId = currentPage.id;
    if (generating.pages[targetPageId]) return;

    setPageErrors((prev) => ({ ...prev, [targetPageId]: '' }));
    setPageLoading(targetPageId, true);
    const promptSnapshot = pagePrompt;
    const styleSnapshot = pageStyle;

    try {
      const cast = project.characters.filter((c) => currentPage.castIds.includes(c.id));
      const charVisuals = cast
        .map((c) => [c.name, c.appearance, c.clothing].filter(Boolean).join(': '))
        .filter(Boolean)
        .join('. ');
      const referenceImageMediaIds = cast
        .map((c) => c.referenceMediaId)
        .filter((id): id is string => Boolean(id));
      const referenceImagesBase64 = cast
        .map((c) => c.referenceBase64)
        .filter((img): img is string => Boolean(img));
      const finalPrompt = `Professional manga page, high resolution, ${styleSnapshot} style, monochromatic ink, screentones. Scene: ${promptSnapshot}. Featuring: ${charVisuals}`;

      const result = await Flow.generate.image({
        prompt: finalPrompt,
        modelDisplayName: '🍌 Nano Banana Pro',
        mode: 'panel',
        aspectRatio: '3:4',
        name: cast.map((c) => c.name).filter(Boolean).join(', ') || project.name || 'Página Manga',
        details: charVisuals || undefined,
        style: styleSnapshot,
        notes: promptSnapshot.trim() || `Interior manga page ${pageIndex + 1}`,
        referenceImageMediaIds:
          referenceImageMediaIds.length > 0 ? referenceImageMediaIds : undefined,
        referenceImagesBase64:
          referenceImagesBase64.length > 0 ? referenceImagesBase64 : undefined,
      });

      updatePageById(targetPageId, {
        base64: result.dataUrl,
        prompt: promptSnapshot,
        artStyle: styleSnapshot,
      });
    } catch (err) {
      console.error(err);
      setPageErrors((prev) => ({
        ...prev,
        [targetPageId]:
          err instanceof Error ? err.message : 'No se pudo generar la página interior.',
      }));
    } finally {
      setPageLoading(targetPageId, false);
    }
  };

  const generateUnifiedCover = async () => {
    if (generating.cover) return;
    setCoverError('');
    setTaskLoading('cover', true);
    const promptSnapshot = coverPrompt;

    try {
      const charVisuals = project.characters
        .map((c) => [c.name, c.appearance, c.clothing].filter(Boolean).join(': '))
        .filter(Boolean)
        .join('. ');
      const referenceImageMediaIds = project.characters
        .map((c) => c.referenceMediaId)
        .filter((id): id is string => Boolean(id));
      const referenceImagesBase64 = project.characters
        .map((c) => c.referenceBase64)
        .filter((img): img is string => Boolean(img));
      const finalPrompt = `Professional cinematic manga wrap-around cover. Right side (front): main illustration showing ${promptSnapshot}. Left side (back): matching background elements, minimalist composition. Spine in middle. Style: ${style}. Vibrant colors. Character details: ${charVisuals}`;

      const result = await Flow.generate.image({
        prompt: finalPrompt,
        modelDisplayName: '🍌 Nano Banana Pro',
        mode: 'cover_wrap',
        aspectRatio: '16:9',
        name: project.name || 'Manga sin título',
        details: charVisuals || undefined,
        style,
        notes: promptSnapshot.trim() || `Wrap cover artwork for ${project.name || 'Manga'}`,
        referenceImageMediaIds:
          referenceImageMediaIds.length > 0 ? referenceImageMediaIds : undefined,
        referenceImagesBase64:
          referenceImagesBase64.length > 0 ? referenceImagesBase64 : undefined,
      });

      updateCover({
        fullWrapBase64: result.dataUrl,
        frontBase64: result.dataUrl,
        backBase64: result.dataUrl,
        prompt: promptSnapshot,
      });
    } catch (err) {
      console.error(err);
      setCoverError(
        err instanceof Error ? err.message : 'No se pudo generar la cubierta envolvente.',
      );
    } finally {
      setTaskLoading('cover', false);
    }
  };

  if (view === 'pages') {
    return (
      <div className="gf-controls-stack animate-slide-in-right">
        <div className="gf-controls-group">
          <SectionLabel>Ajustes de Página</SectionLabel>
          <FieldDropdown
            label="Estilo de Dibujo"
            value={pageStyle}
            options={ART_STYLES}
            onChange={(val) => {
              setStyle(val);
              if (currentPage) {
                updatePageById(currentPage.id, { artStyle: val });
              }
            }}
          />

          <div className="gf-cast-section">
            <SectionLabel>Elenco Activo ({currentPage?.castIds?.length || 0})</SectionLabel>
            <div className="gf-cast-chips">
              {project.characters.length === 0 ? (
                <span className="gf-cast-empty">
                  Aún no hay personajes en «Settei y Personajes».
                </span>
              ) : (
                project.characters.map((c) => {
                  const selected = currentPage?.castIds?.includes(c.id) ?? false;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        if (!currentPage) return;
                        const cast = new Set(currentPage.castIds);
                        if (cast.has(c.id)) cast.delete(c.id);
                        else cast.add(c.id);
                        updatePageById(currentPage.id, { castIds: Array.from(cast) });
                      }}
                      className={`gf-cast-chip ${selected ? 'is-active' : ''}`}
                    >
                      {c.name || 'Sin nombre'}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <TextInput
            value={pagePrompt}
            onChange={(val) => {
              if (currentPage) {
                updatePageById(currentPage.id, { prompt: val });
              }
            }}
            placeholder="Describe la acción, planos y viñetas de esta página..."
          />
        </div>

        <PillButton
          variant="solid"
          icon={
            isCurrentPageBusy ? (
              <RefreshCw size={16} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
            ) : (
              <Sparkles size={16} strokeWidth={1.75} className="gf-icon-shrink" />
            )
          }
          onClick={generatePage}
          disabled={isCurrentPageBusy || !currentPage}
        >
          {isCurrentPageBusy ? 'Entintando Página...' : 'Generar Tinta Alta Res.'}
        </PillButton>

        {currentPageError && <div className="gf-inline-error">{currentPageError}</div>}
      </div>
    );
  }

  if (view === 'cover') {
    return (
      <div className="gf-controls-stack animate-slide-in-right">
        <div className="gf-controls-group">
          <SectionLabel>Generación de Cubierta Completa</SectionLabel>
          <p className="gf-helper-copy">
            Genera un lienzo panorámico 16:9 que unifica portada, lomo y contraportada en el mismo estilo.
          </p>
          <TextInput
            value={coverPrompt}
            onChange={(val) => updateCover({ prompt: val })}
            placeholder="Describe el ambiente, personajes y composición de la portada..."
          />
        </div>

        <div className="gf-controls-actions">
          <PillButton
            variant="solid"
            icon={
              isCoverBusy ? (
                <RefreshCw size={16} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
              ) : (
                <Sparkles size={16} strokeWidth={1.75} className="gf-icon-shrink" />
              )
            }
            onClick={generateUnifiedCover}
            disabled={isCoverBusy}
          >
            {isCoverBusy ? 'Generando Cubierta...' : 'Generar Cubierta Completa'}
          </PillButton>

          {coverError && <div className="gf-inline-error">{coverError}</div>}

          <div className="gf-controls-divider">
            <SectionLabel>Producción</SectionLabel>
            <PillButton
              variant="outline"
              icon={<Printer size={16} strokeWidth={1.75} className="gf-icon-shrink" />}
              onClick={onExportCover}
            >
              Exportar PDF Listo para Imprenta
            </PillButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gf-controls-empty">
      <Info size={28} strokeWidth={1.5} className="gf-controls-empty-icon gf-icon-shrink" />
      <span>
        Selecciona «Portada Tankōbon» o «Páginas e Interiores» en la barra lateral para acceder a
        los controles de generación IA.
      </span>
    </div>
  );
}
