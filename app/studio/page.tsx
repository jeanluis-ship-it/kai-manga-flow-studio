'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookMarked,
  BookOpen,
  CheckCircle2,
  Cloud,
  HardDrive,
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
import {
  KOMA_LAYOUT_PRESETS,
  type KaiDualOutput,
  type KomaLayoutId,
} from '@/lib/kai/schema';
import {
  buildKomasForLayout,
  createInitialStudioProject,
  loadStudioProject,
  saveStudioProject,
  type StorageMode,
} from '@/lib/storage/studioRepository';
import JSZip from './jszip-lite';
import { Flow } from './flow-sdk';
import { FieldDropdown, PillButton, SectionLabel, TextInput } from './components/Primitives';
import { CharacterLibrary } from './components/CharacterLibrary';
import { CoverDesigner, type CoverDesignerHandle } from './components/CoverDesigner';
import { KaiCopilotDrawer } from './components/KaiCopilotDrawer';
import { PageEditor } from './components/PageEditor';
import { ProjectManager } from './components/ProjectManager';
import {
  KOMA_STATES,
  normalizeTagHandle,
  splitDataUrl,
  type GeneratingState,
  type Koma,
  type KomaState,
  type Page,
  type Project,
  type StudioView,
} from './types';
import './studio.css';

const STUDIO_THEME_KEY = 'mangai-studio-theme-v1';

const ART_STYLES = [
  'Classic Shonen',
  'Dark Seinen',
  'Modern Shojo',
  'Retro Gekiga',
  'Cyberpunk Manga',
];

const CAMERA_ANGLES = [
  'Plano General / Establishing',
  'Plano Medio',
  'Primer Plano Emocional',
  'Contrapicado Heroico',
  'Picado Dramático',
  'Plano Holandés (Acción)',
  'Detalle / Inserto',
  'Doble Página Splash',
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

function createEntityId(prefix: string): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function StudioPage() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [storageMode, setStorageMode] = useState<StorageMode>('local');
  const [view, setView] = useState<StudioView>('project');
  const [project, setProject] = useState<Project>(() => createInitialStudioProject());
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [selectedKomaId, setSelectedKomaId] = useState<string | null>(null);
  const [kaiOpen, setKaiOpen] = useState(false);
  const [generating, setGenerating] = useState<GeneratingState>({
    cover: false,
    bundle: false,
    pages: {},
    komas: {},
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

  const setKomaLoading = useCallback((komaId: string, value: boolean) => {
    setGenerating((prev) => {
      const nextKomas = { ...prev.komas };
      if (value) nextKomas[komaId] = true;
      else delete nextKomas[komaId];
      return { ...prev, komas: nextKomas };
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
    let active = true;
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

    void loadStudioProject().then(({ project: loaded, mode }) => {
      if (!active) return;
      setProject(loaded);
      setStorageMode(mode);
      const firstKoma = loaded.pages[0]?.komas?.[0]?.id ?? null;
      setSelectedKomaId(firstKoma);
      setMounted(true);
    });

    return () => {
      active = false;
    };
  }, []);

  // Debounced persistence via studioRepository (Supabase + localStorage fallback)
  useEffect(() => {
    if (!mounted) return;
    const timer = window.setTimeout(() => {
      void saveStudioProject(project).then((mode) => {
        setStorageMode(mode);
      });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [project, mounted]);

  useEffect(() => {
    if (activePageIndex >= project.pages.length) {
      setActivePageIndex(Math.max(0, project.pages.length - 1));
    }
  }, [project.pages.length, activePageIndex]);

  const safePageIndex = Math.min(activePageIndex, Math.max(0, project.pages.length - 1));
  const activePage = project.pages[safePageIndex];

  // Keep selectedKomaId synchronized with the active page's komas
  useEffect(() => {
    const komas = activePage?.komas ?? [];
    if (komas.length === 0) {
      setSelectedKomaId(null);
      return;
    }
    if (!selectedKomaId || !komas.some((k) => k.id === selectedKomaId)) {
      setSelectedKomaId(komas[0].id);
    }
  }, [activePage, selectedKomaId]);

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

  const updateKomaById = (pageId: string, komaId: string, patch: Partial<Koma>) => {
    setProject((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => {
        if (p.id !== pageId) return p;
        const nextKomas = (p.komas ?? []).map((k) =>
          k.id === komaId ? { ...k, ...patch } : k,
        );
        return { ...p, komas: nextKomas };
      }),
    }));
  };

  const handleChangePageLayout = (pageId: string, layoutId: KomaLayoutId) => {
    setProject((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => {
        if (p.id !== pageId) return p;
        const nextKomas = buildKomasForLayout(layoutId, p.komas ?? [], p.id);
        return {
          ...p,
          layoutTemplate: layoutId,
          komas: nextKomas,
        };
      }),
    }));
  };

  const handleApplyKaiScript = (output: KaiDualOutput) => {
    const activeArtStyle = project.pages[safePageIndex]?.artStyle || 'Classic Shonen';

    const generatedPages: Page[] = output.script_pages.map((sp) => {
      const pageId = createEntityId('page');
      const preset =
        KOMA_LAYOUT_PRESETS[sp.suggested_layout] ?? KOMA_LAYOUT_PRESETS['4_panel_classic'];

      const komas: Koma[] = preset.panels.map((coords, idx) => {
        const scriptKoma = sp.komas[idx];
        const handles = scriptKoma?.tagged_handles ?? [];
        return {
          id: createEntityId('koma'),
          panelIndex: idx + 1,
          state: 'NEMU',
          polygonCoords: coords,
          cameraAngle: scriptKoma?.camera_angle || 'Plano Medio',
          taggedHandles: handles,
          actionPrompt: scriptKoma?.action_prompt || '',
          dialogues: (scriptKoma?.dialogues ?? []).map((d, dIdx) => ({
            id: `${pageId}-d-${idx}-${dIdx}`,
            speaker: d.speaker,
            style: d.style,
            text: d.text,
          })),
          sfxItems: scriptKoma?.sfx
            ? [
                {
                  id: `${pageId}-sfx-${idx}`,
                  text: scriptKoma.sfx,
                },
              ]
            : [],
        };
      });

      const taggedSet = new Set(
        komas.flatMap((k) => k.taggedHandles.map((h) => h.toLowerCase())),
      );
      const castIds = project.characters
        .filter((c) => taggedSet.has(normalizeTagHandle(c.tagHandle || '', c.name).toLowerCase()))
        .map((c) => c.id);

      return {
        id: pageId,
        base64: '',
        prompt: sp.chapter_beat,
        artStyle: activeArtStyle,
        castIds,
        layoutTemplate: sp.suggested_layout,
        chapterBeat: sp.chapter_beat,
        komas,
      };
    });

    if (generatedPages.length === 0) return;

    const firstPage = project.pages[0];
    const isStarterBlank =
      project.pages.length === 1 &&
      !firstPage.base64 &&
      !firstPage.prompt.trim() &&
      !firstPage.chapterBeat?.trim() &&
      (firstPage.komas ?? []).every((k) => !k.inkRenderUrl && !k.actionPrompt.trim());

    const nextPages = isStarterBlank
      ? generatedPages
      : [...project.pages, ...generatedPages];
    const targetPageIndex = isStarterBlank ? 0 : project.pages.length;

    updateProject({ pages: nextPages });
    setActivePageIndex(targetPageIndex);
    setSelectedKomaId(generatedPages[0].komas?.[0]?.id ?? null);
    setKaiOpen(false);
    handleSelectView('pages');
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
        const pageNum = String(i + 1).padStart(3, '0');
        if (page.base64) {
          const { base64 } = splitDataUrl(page.base64);
          if (base64) {
            zip.file(`interior/page_${pageNum}.png`, base64, { base64: true });
          }
        }
        (page.komas ?? []).forEach((koma) => {
          if (koma.inkRenderUrl) {
            const { base64 } = splitDataUrl(koma.inkRenderUrl);
            if (base64) {
              zip.file(
                `interior/page_${pageNum}_koma_${String(koma.panelIndex).padStart(2, '0')}.png`,
                base64,
                { base64: true },
              );
            }
          }
        });
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
          <span
            className={`gf-storage-pill ${storageMode === 'supabase' ? 'is-cloud' : ''}`}
            title={
              storageMode === 'supabase'
                ? 'Sincronizado con Supabase'
                : 'Guardado local automático en este navegador (Modo Demo)'
            }
          >
            {storageMode === 'supabase' ? (
              <Cloud size={12} strokeWidth={2} className="gf-icon-shrink" />
            ) : (
              <HardDrive size={12} strokeWidth={2} className="gf-icon-shrink" />
            )}
            <span>{storageMode === 'supabase' ? 'Supabase Sync' : 'Local / Demo'}</span>
          </span>
        </div>

        <div className="gf-topbar-right">
          <button
            type="button"
            onClick={() => setKaiOpen(true)}
            className="gf-kai-trigger-btn"
            title="Abrir copiloto KAI Sensei de guion y Koma-wari"
          >
            <Sparkles size={15} strokeWidth={2} className="gf-icon-shrink" />
            <span>KAI Sensei</span>
          </button>

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
                  const isThisPageBusy =
                    Boolean(generating.pages[p.id]) ||
                    (p.komas ?? []).some((k) => Boolean(generating.komas[k.id]));
                  const hasInk =
                    Boolean(p.base64) || (p.komas ?? []).some((k) => Boolean(k.inkRenderUrl));
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
                        ) : hasInk ? (
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
                    const newPageId = createEntityId('page');
                    const newKomas = buildKomasForLayout('4_panel_classic', [], newPageId);
                    const newPages: Page[] = [
                      ...project.pages,
                      {
                        id: newPageId,
                        base64: '',
                        prompt: '',
                        artStyle: activeArtStyle,
                        castIds: [],
                        layoutTemplate: '4_panel_classic',
                        chapterBeat: '',
                        komas: newKomas,
                      },
                    ];
                    updateProject({ pages: newPages });
                    setActivePageIndex(newPages.length - 1);
                    setSelectedKomaId(newKomas[0]?.id ?? null);
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
                selectedKomaId={selectedKomaId}
                onSelectKoma={setSelectedKomaId}
                onChangeLayout={handleChangePageLayout}
                updateProject={updateProject}
                isGeneratingPage={Boolean(activePage && generating.pages[activePage.id])}
                komaLoading={generating.komas}
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
            selectedKomaId={selectedKomaId}
            generating={generating}
            setTaskLoading={setTaskLoading}
            setPageLoading={setPageLoading}
            setKomaLoading={setKomaLoading}
            updatePageById={updatePageById}
            updateKomaById={updateKomaById}
            updateCover={updateCover}
            onExportCover={() => coverDesignerRef.current?.exportCover()}
            onOpenKai={() => setKaiOpen(true)}
          />
        </aside>
      </div>

      <KaiCopilotDrawer
        open={kaiOpen}
        onClose={() => setKaiOpen(false)}
        project={project}
        onApplyScript={handleApplyKaiScript}
      />
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
  selectedKomaId,
  generating,
  setTaskLoading,
  setKomaLoading,
  updatePageById,
  updateKomaById,
  updateCover,
  onExportCover,
  onOpenKai,
}: {
  view: StudioView;
  project: Project;
  pageIndex: number;
  selectedKomaId: string | null;
  generating: GeneratingState;
  setTaskLoading: (task: 'cover' | 'bundle', value: boolean) => void;
  setPageLoading: (pageId: string, value: boolean) => void;
  setKomaLoading: (komaId: string, value: boolean) => void;
  updatePageById: (pageId: string, patch: Partial<Page>) => void;
  updateKomaById: (pageId: string, komaId: string, patch: Partial<Koma>) => void;
  updateCover: (patch: Partial<Project['cover']>) => void;
  onExportCover: () => void;
  onOpenKai: () => void;
}) {
  const [style, setStyle] = useState<string>('Classic Shonen');
  const [coverError, setCoverError] = useState<string>('');
  const [komaErrors, setKomaErrors] = useState<Record<string, string>>({});

  const currentPage = project.pages[pageIndex];
  const currentPageId = currentPage?.id ?? '';
  const pageStyle = currentPage?.artStyle || style;
  const coverPrompt = project.cover.prompt ?? '';

  const komas = currentPage?.komas ?? [];
  const selectedKoma = komas.find((k) => k.id === selectedKomaId) ?? komas[0] ?? null;

  const isSelectedKomaBusy = Boolean(selectedKoma && generating.komas[selectedKoma.id]);
  const isCoverBusy = generating.cover;
  const currentKomaError = selectedKoma ? komaErrors[selectedKoma.id] ?? '' : '';

  const toggleKomaSetteiHandle = (handle: string, charId: string) => {
    if (!currentPage || !selectedKoma) return;
    const exists = selectedKoma.taggedHandles.some(
      (h) => h.toLowerCase() === handle.toLowerCase(),
    );
    const nextHandles = exists
      ? selectedKoma.taggedHandles.filter((h) => h.toLowerCase() !== handle.toLowerCase())
      : [...selectedKoma.taggedHandles, handle];

    updateKomaById(currentPage.id, selectedKoma.id, { taggedHandles: nextHandles });

    const castSet = new Set(currentPage.castIds);
    if (!exists) castSet.add(charId);
    updatePageById(currentPage.id, { castIds: Array.from(castSet) });
  };

  const generateKomaInk = async () => {
    if (!currentPage || !selectedKoma) return;
    const targetPageId = currentPage.id;
    const targetKomaId = selectedKoma.id;
    if (generating.komas[targetKomaId]) return;

    setKomaErrors((prev) => ({ ...prev, [targetKomaId]: '' }));
    setKomaLoading(targetKomaId, true);

    const promptSnapshot = selectedKoma.actionPrompt;
    const cameraSnapshot = selectedKoma.cameraAngle || 'Plano Medio';
    const styleSnapshot = pageStyle;
    const handlesSnapshot = selectedKoma.taggedHandles ?? [];

    try {
      const taggedSet = new Set(handlesSnapshot.map((h) => h.toLowerCase()));
      const taggedEntities = project.characters.filter((c) => {
        const handle = normalizeTagHandle(c.tagHandle || '', c.name).toLowerCase();
        return taggedSet.has(handle);
      });

      const entityVisuals = taggedEntities
        .map((c) => {
          const handle = normalizeTagHandle(c.tagHandle || '', c.name);
          const anchors = (c.visualAnchors ?? []).filter(Boolean);
          return [
            `${handle} (${c.name})`,
            c.appearance,
            c.clothing,
            anchors.length > 0 ? `Anclas visuales obligatorias: ${anchors.join(', ')}` : '',
            c.seedLocked && c.characterSeed ? `Seed: ${c.characterSeed}` : '',
          ]
            .filter(Boolean)
            .join(' · ');
        })
        .filter(Boolean)
        .join(' | ');

      const referenceImageMediaIds = taggedEntities
        .map((c) => c.referenceMediaId)
        .filter((id): id is string => Boolean(id));
      const referenceImagesBase64 = taggedEntities
        .map((c) => c.referenceBase64)
        .filter((img): img is string => Boolean(img));

      const finalPrompt = [
        `Professional single manga panel (Viñeta #${selectedKoma.panelIndex}), high contrast black and white Sumi ink, fine G-pen linework, screentones.`,
        `Style: ${styleSnapshot}.`,
        `Camera angle: ${cameraSnapshot}.`,
        `Action: ${promptSnapshot.trim() || currentPage.chapterBeat || 'Dramatic manga moment'}.`,
        entityVisuals ? `Strict Settei consistency: ${entityVisuals}.` : '',
        'No speech bubbles, no text overlays, clean frameless interior panel art.',
      ]
        .filter(Boolean)
        .join(' ');

      const result = await Flow.generate.image({
        prompt: finalPrompt,
        modelDisplayName: '🍌 Nano Banana Pro',
        mode: 'panel',
        aspectRatio: '3:4',
        name:
          taggedEntities.map((c) => c.name).filter(Boolean).join(', ') ||
          `${project.name || 'Manga'} · Viñeta #${selectedKoma.panelIndex}`,
        details: entityVisuals || undefined,
        style: styleSnapshot,
        notes: `${cameraSnapshot} — ${promptSnapshot.trim() || `Viñeta #${selectedKoma.panelIndex}`}`,
        referenceImageMediaIds:
          referenceImageMediaIds.length > 0 ? referenceImageMediaIds : undefined,
        referenceImagesBase64:
          referenceImagesBase64.length > 0 ? referenceImagesBase64 : undefined,
      });

      const nextState: KomaState =
        selectedKoma.state === 'LOCKED' ? 'LOCKED' : 'PEN_IRE';

      updateKomaById(targetPageId, targetKomaId, {
        inkRenderUrl: result.dataUrl,
        state: nextState,
      });
    } catch (err) {
      console.error(err);
      setKomaErrors((prev) => ({
        ...prev,
        [targetKomaId]:
          err instanceof Error
            ? err.message
            : `No se pudo entintar la Viñeta #${selectedKoma.panelIndex}.`,
      }));
    } finally {
      setKomaLoading(targetKomaId, false);
    }
  };

  const generateUnifiedCover = async () => {
    if (generating.cover) return;
    setCoverError('');
    setTaskLoading('cover', true);
    const promptSnapshot = coverPrompt;

    try {
      const charVisuals = project.characters
        .map((c) => {
          const anchors = (c.visualAnchors ?? []).filter(Boolean).join(', ');
          return [c.name, c.appearance, c.clothing, anchors ? `Anchors: ${anchors}` : '']
            .filter(Boolean)
            .join(': ');
        })
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
    const primaryDialogue = selectedKoma?.dialogues?.[0];
    const primarySfx = selectedKoma?.sfxItems?.[0];

    return (
      <div className="gf-controls-stack animate-slide-in-right">
        <div className="gf-controls-group">
          <div className="gf-inspector-head">
            <SectionLabel>
              {selectedKoma ? `Inspector · Viñeta #${selectedKoma.panelIndex}` : 'Inspector de Viñeta'}
            </SectionLabel>
            {selectedKoma && (
              <span className={`gf-koma-state-badge state-${selectedKoma.state.toLowerCase()}`}>
                {selectedKoma.state}
              </span>
            )}
          </div>

          {/* Koma State Machine */}
          {selectedKoma && currentPage && (
            <div className="gf-state-machine" role="group" aria-label="Estado de la viñeta">
              {KOMA_STATES.map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`gf-state-step ${selectedKoma.state === st ? 'is-active' : ''}`}
                  onClick={() => updateKomaById(currentPage.id, selectedKoma.id, { state: st })}
                >
                  {st}
                </button>
              ))}
            </div>
          )}

          <FieldDropdown
            label="Estilo de Tinta (Página)"
            value={pageStyle}
            options={ART_STYLES}
            onChange={(val) => {
              setStyle(val);
              if (currentPage) {
                updatePageById(currentPage.id, { artStyle: val });
              }
            }}
          />

          {selectedKoma && currentPage && (
            <>
              <FieldDropdown
                label="Ángulo de Cámara"
                value={selectedKoma.cameraAngle || 'Plano Medio'}
                options={CAMERA_ANGLES}
                onChange={(val) =>
                  updateKomaById(currentPage.id, selectedKoma.id, { cameraAngle: val })
                }
              />

              <div className="gf-cast-section">
                <SectionLabel>
                  Settei Etiquetados ({selectedKoma.taggedHandles.length})
                </SectionLabel>
                <div className="gf-cast-chips">
                  {project.characters.length === 0 ? (
                    <span className="gf-cast-empty">
                      Crea fichas en «Settei y Personajes» para inyectar @handles y anclas visuales.
                    </span>
                  ) : (
                    project.characters.map((c) => {
                      const handle = normalizeTagHandle(c.tagHandle || '', c.name);
                      const selected = selectedKoma.taggedHandles.some(
                        (h) => h.toLowerCase() === handle.toLowerCase(),
                      );
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggleKomaSetteiHandle(handle, c.id)}
                          className={`gf-cast-chip ${selected ? 'is-active' : ''}`}
                          title={
                            (c.visualAnchors ?? []).length > 0
                              ? `Anclas: ${(c.visualAnchors ?? []).join(', ')}`
                              : c.name
                          }
                        >
                          {handle}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="gf-controls-group">
                <SectionLabel>Acción de Viñeta #{selectedKoma.panelIndex}</SectionLabel>
                <TextInput
                  value={selectedKoma.actionPrompt}
                  onChange={(val) =>
                    updateKomaById(currentPage.id, selectedKoma.id, {
                      actionPrompt: val,
                      state:
                        selectedKoma.state === 'VACIO' && val.trim()
                          ? 'NEMU'
                          : selectedKoma.state,
                    })
                  }
                  placeholder="Describe postura, expresión, fondo y foco dramático de esta viñeta..."
                />
              </div>

              <div className="gf-koma-meta-fields">
                <div className="gf-field-box">
                  <label className="gf-field-label">Globo / Diálogo principal</label>
                  <input
                    type="text"
                    className="gf-text-input gf-text-input-sm"
                    value={primaryDialogue?.text ?? ''}
                    onChange={(e) => {
                      const nextText = e.target.value;
                      const rest = selectedKoma.dialogues.slice(1);
                      const nextDialogues = nextText.trim()
                        ? [
                            {
                              id: primaryDialogue?.id || `${selectedKoma.id}-dlg-0`,
                              speaker:
                                primaryDialogue?.speaker ||
                                selectedKoma.taggedHandles[0] ||
                                'Voz',
                              style: primaryDialogue?.style || 'normal',
                              text: nextText,
                            },
                            ...rest,
                          ]
                        : rest;
                      updateKomaById(currentPage.id, selectedKoma.id, {
                        dialogues: nextDialogues,
                      });
                    }}
                    placeholder="Texto del diálogo en esta viñeta..."
                  />
                </div>

                <div className="gf-field-box">
                  <label className="gf-field-label">SFX / Onomatopeya</label>
                  <input
                    type="text"
                    className="gf-text-input gf-text-input-sm"
                    value={primarySfx?.text ?? ''}
                    onChange={(e) => {
                      const nextText = e.target.value;
                      const rest = selectedKoma.sfxItems.slice(1);
                      const nextSfx = nextText.trim()
                        ? [
                            {
                              id: primarySfx?.id || `${selectedKoma.id}-sfx-0`,
                              text: nextText,
                            },
                            ...rest,
                          ]
                        : rest;
                      updateKomaById(currentPage.id, selectedKoma.id, { sfxItems: nextSfx });
                    }}
                    placeholder="Ej. ドン! (DON!)"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <PillButton
          variant="filled"
          icon={
            isSelectedKomaBusy ? (
              <RefreshCw size={16} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
            ) : (
              <Sparkles size={16} strokeWidth={1.75} className="gf-icon-shrink" />
            )
          }
          onClick={generateKomaInk}
          disabled={isSelectedKomaBusy || !currentPage || !selectedKoma}
        >
          {isSelectedKomaBusy
            ? `Entintando Viñeta #${selectedKoma?.panelIndex ?? 1}...`
            : `Generar Tinta Alta Res. (Viñeta #${selectedKoma?.panelIndex ?? 1})`}
        </PillButton>

        {currentKomaError && <div className="gf-inline-error">{currentKomaError}</div>}

        <div className="gf-controls-divider">
          <SectionLabel>Guionización Asistida</SectionLabel>
          <PillButton
            variant="outline"
            icon={<Sparkles size={15} strokeWidth={1.75} className="gf-icon-shrink" />}
            onClick={onOpenKai}
          >
            Pedir Secuencia a KAI Sensei
          </PillButton>
        </div>
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
        Selecciona «Páginas e Interiores» para dirigir viñetas Koma-wari, o abre{' '}
        <strong>KAI Sensei</strong> arriba para estructurar tu guion automáticamente.
      </span>
      <PillButton
        variant="outline"
        icon={<Sparkles size={15} strokeWidth={1.75} className="gf-icon-shrink" />}
        onClick={onOpenKai}
      >
        Abrir KAI Sensei
      </PillButton>
    </div>
  );
}
