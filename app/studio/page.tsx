'use client';

import React, { useEffect, useRef, useState } from 'react';
import JSZip from './jszip-lite';
import { Flow } from './flow-sdk';
import { FieldDropdown, PillButton, SectionLabel, TextInput } from './components/Primitives';
import { CharacterLibrary } from './components/CharacterLibrary';
import { CoverDesigner, type CoverDesignerHandle } from './components/CoverDesigner';
import { PageEditor } from './components/PageEditor';
import { ProjectManager } from './components/ProjectManager';
import { type Page, type Project, splitDataUrl } from './types';
import './studio.css';

type StudioView = 'cover' | 'pages' | 'characters' | 'project';

const STUDIO_STORAGE_KEY = 'mangai-flow-studio-v1';

const ART_STYLES = [
  'Classic Shonen',
  'Dark Seinen',
  'Modern Shojo',
  'Retro Gekiga',
  'Cyberpunk Manga',
];

function createPageId(): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `page-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createInitialProject(pageId = 'page-1'): Project {
  return {
    name: 'Untitled Manga',
    author: 'Author Name',
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
  const [view, setView] = useState<StudioView>('project');
  const [project, setProject] = useState<Project>(() => createInitialProject());
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [bundleError, setBundleError] = useState('');

  const coverDesignerRef = useRef<CoverDesignerHandle>(null);

  useEffect(() => {
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
            name: parsed.name || 'Untitled Manga',
            author: typeof parsed.author === 'string' ? parsed.author : 'Author Name',
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

  const safePageIndex = Math.min(activePageIndex, Math.max(0, project.pages.length - 1));

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
    setStatus('Preparing KDP Package...');
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
      const safeName = (project.name || 'Untitled_Manga').trim().replace(/\s+/g, '_') || 'Manga';
      await Flow.download({
        base64,
        mimeType: 'application/zip',
        filename: `${safeName}_KDP_BUNDLE.zip`,
      });
    } catch (err) {
      console.error(err);
      setBundleError(err instanceof Error ? err.message : 'Unable to build KDP bundle.');
    } finally {
      setStatus('');
    }
  };

  if (!mounted) {
    return <div className="gf-loading" aria-hidden="true" />;
  }

  return (
    <div className="manga-grid">
      <aside className="gf-sidebar-left no-scrollbar">
        <div className="gf-sidebar-section">
          <SectionLabel>KDP Production</SectionLabel>
          <div className="gf-nav-list">
            <NavItem
              active={view === 'project'}
              icon="settings_print"
              label="Print Setup"
              onClick={() => setView('project')}
            />
            <NavItem
              active={view === 'characters'}
              icon="face"
              label="Character Library"
              onClick={() => setView('characters')}
            />
            <NavItem
              active={view === 'cover'}
              icon="menu_book"
              label="Paperback Cover"
              onClick={() => setView('cover')}
            />
            <NavItem
              active={view === 'pages'}
              icon="auto_stories"
              label="Interior Pages"
              onClick={() => setView('pages')}
            />
          </div>
        </div>

        {view === 'pages' && (
          <div className="gf-sidebar-section animate-slide-in-right">
            <SectionLabel>Manuscript</SectionLabel>
            <div className="gf-manuscript-list dark-scrollbar">
              {project.pages.map((p, i) => (
                <button
                  key={p.id || i}
                  type="button"
                  onClick={() => setActivePageIndex(i)}
                  className={`gf-page-item ${safePageIndex === i ? 'is-active' : ''}`}
                >
                  <span className="gf-page-item-left">
                    <span className="gf-page-item-num">{String(i + 1).padStart(2, '0')}</span>
                    <span>Page {i + 1}</span>
                  </span>
                  <span className="material-symbols-outlined gf-page-item-icon">
                    {p.base64 ? 'verified' : 'ink_high'}
                  </span>
                </button>
              ))}
              <PillButton
                variant="outline"
                icon={<span className="material-symbols-outlined">add</span>}
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
                Add Page
              </PillButton>
            </div>
          </div>
        )}

        <div className="gf-sidebar-bottom">
          <SectionLabel>Submission</SectionLabel>
          <PillButton
            variant="solid"
            icon={<span className="material-symbols-outlined">publish</span>}
            onClick={handleDownloadAll}
            disabled={Boolean(status)}
          >
            Build KDP Bundle
          </PillButton>
          {status && <div className="gf-status-text animate-pulse-slow">{status}</div>}
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
            />
          )}
          {view === 'characters' && (
            <CharacterLibrary
              project={project}
              updateProject={updateProject}
              isGenerating={isGenerating}
              setIsGenerating={setIsGenerating}
            />
          )}
          {view === 'cover' && (
            <CoverDesigner
              ref={coverDesignerRef}
              project={project}
              updateProject={updateProject}
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
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating}
          updatePageById={updatePageById}
          updateCover={updateCover}
          onExportCover={() => coverDesignerRef.current?.exportCover()}
        />
      </aside>
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
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`gf-nav-item ${active ? 'is-active' : ''}`}
    >
      <span className="material-symbols-outlined gf-nav-icon">{icon}</span>
      <span className="gf-nav-label">{label}</span>
    </button>
  );
}

function ViewControls({
  view,
  project,
  pageIndex,
  isGenerating,
  setIsGenerating,
  updatePageById,
  updateCover,
  onExportCover,
}: {
  view: StudioView;
  project: Project;
  pageIndex: number;
  isGenerating: boolean;
  setIsGenerating: (val: boolean) => void;
  updatePageById: (pageId: string, patch: Partial<Page>) => void;
  updateCover: (patch: Partial<Project['cover']>) => void;
  onExportCover: () => void;
}) {
  const [style, setStyle] = useState<string>('Classic Shonen');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const currentPage = project.pages[pageIndex];
  const currentPageId = currentPage?.id;
  const pagePrompt = currentPage?.prompt ?? '';
  const pageStyle = currentPage?.artStyle || style;
  const coverPrompt = project.cover.prompt ?? '';

  useEffect(() => {
    setErrorMsg('');
  }, [view, currentPageId]);

  const generatePage = async () => {
    if (!currentPage) return;
    setErrorMsg('');
    setIsGenerating(true);
    const targetPageId = currentPage.id;
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
        name: cast.map((c) => c.name).filter(Boolean).join(', ') || project.name || 'Manga Page',
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
      setErrorMsg(err instanceof Error ? err.message : 'Unable to generate page.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateUnifiedCover = async () => {
    setErrorMsg('');
    setIsGenerating(true);
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
        name: project.name || 'Untitled Manga',
        details: charVisuals || undefined,
        style,
        notes: promptSnapshot.trim() || `Wrap cover artwork for ${project.name || 'Untitled Manga'}`,
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
      setErrorMsg(err instanceof Error ? err.message : 'Unable to generate cover wrap.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (view === 'pages') {
    return (
      <div className="gf-controls-stack animate-slide-in-right">
        <div className="gf-controls-group">
          <SectionLabel>Interior Settings</SectionLabel>
          <FieldDropdown
            label="Art Style"
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
            <SectionLabel>Active Cast ({currentPage?.castIds?.length || 0})</SectionLabel>
            <div className="gf-cast-chips">
              {project.characters.length === 0 ? (
                <span className="gf-cast-empty">No characters in roster yet.</span>
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
                      {c.name || 'Unnamed'}
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
            placeholder="Describe the action and panels..."
          />
        </div>

        <PillButton
          variant="solid"
          icon={
            <span className={`material-symbols-outlined ${isGenerating ? 'gf-spin' : ''}`}>
              {isGenerating ? 'refresh' : 'auto_awesome'}
            </span>
          }
          onClick={generatePage}
          disabled={isGenerating || !currentPage}
        >
          {isGenerating ? 'Drawing Page...' : 'Generate High-Res Ink'}
        </PillButton>

        {errorMsg && <div className="gf-inline-error">{errorMsg}</div>}
      </div>
    );
  }

  if (view === 'cover') {
    return (
      <div className="gf-controls-stack animate-slide-in-right">
        <div className="gf-controls-group">
          <SectionLabel>Unified Cover Generation</SectionLabel>
          <p className="gf-helper-copy">
            Generates a wide 16:9 wrap that ensures the front and back styles match perfectly.
          </p>
          <TextInput
            value={coverPrompt}
            onChange={(val) => updateCover({ prompt: val })}
            placeholder="Describe the overall cover theme and mood..."
          />
        </div>

        <div className="gf-controls-actions">
          <PillButton
            variant="solid"
            icon={
              <span className={`material-symbols-outlined ${isGenerating ? 'gf-spin' : ''}`}>
                {isGenerating ? 'refresh' : 'auto_awesome'}
              </span>
            }
            onClick={generateUnifiedCover}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating Wrap...' : 'Generate Full Wrap'}
          </PillButton>

          {errorMsg && <div className="gf-inline-error">{errorMsg}</div>}

          <div className="gf-controls-divider">
            <SectionLabel>Production</SectionLabel>
            <PillButton
              variant="outline"
              icon={<span className="material-symbols-outlined">print</span>}
              onClick={onExportCover}
            >
              Export KDP PDF-Ready
            </PillButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gf-controls-empty">
      <span className="material-symbols-outlined gf-controls-empty-icon">info</span>
      <span>Select a view from the sidebar to access generation controls.</span>
    </div>
  );
}
