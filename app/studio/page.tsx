'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Check,
  Download,
  FileJson,
  Grid,
  KeyRound,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  AI_MODELS,
  ANACAONA_CHARACTER_PRESET,
  ANACAONA_COVER_PROMPT_PRESET,
  ANACAONA_PAGE_1_SCRIPT_PRESET,
  MANGA_STYLES,
} from '@/lib/prompts';
import {
  blankCharacter,
  defaultPages,
  exampleProject,
  type MangaCharacter,
  type MangaPage,
  type MangaProject,
} from '@/lib/schema';
import { exportKdpBundleSnapshot, exportProject, loadProject, saveProject } from '@/lib/storage';
import './studio.css';

type StudioView = 'project' | 'characters' | 'cover' | 'pages';

interface EngineStatusItem {
  configured: boolean;
  ok: boolean;
  code?: number;
  detail: string;
}

interface EngineDiagnosticsState {
  ok: boolean;
  source: string;
  summary: string;
  recommendation: string;
  geminiTextStatus: EngineStatusItem;
  geminiImageStatus: EngineStatusItem;
  hfStatus: EngineStatusItem;
  openaiStatus: EngineStatusItem;
}

function isLikelyRealApiKey(key: string) {
  const clean = key.trim();
  return (
    clean.length >= 24 &&
    !clean.includes('...') &&
    !clean.includes('••') &&
    (clean.startsWith('hf_') || clean.startsWith('AIza') || clean.startsWith('sk-'))
  );
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File | null> {
  try {
    const resp = await fetch(dataUrl);
    const blob = await resp.blob();
    const mime = ['image/png', 'image/jpeg', 'image/webp'].includes(blob.type) ? blob.type : 'image/png';
    return new File([blob], filename, { type: mime });
  } catch {
    return null;
  }
}

export default function StudioPage() {
  const [project, setProject] = useState<MangaProject>(exampleProject);
  const [view, setView] = useState<StudioView>('characters');
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Selected generation model, diagnostics & live key tester
  const [selectedModel, setSelectedModel] = useState<string>(AI_MODELS[0].id);
  const [showGuides, setShowGuides] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lockingCharId, setLockingCharId] = useState<string | null>(null);
  const [lastModelReport, setLastModelReport] = useState('');
  const [lastProviderStatus, setLastProviderStatus] = useState<'official-ai' | 'free-fallback' | ''>('');
  const [lastDiagnosticReason, setLastDiagnosticReason] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [showKeyDrawer, setShowKeyDrawer] = useState(false);
  const [isTestingEngines, setIsTestingEngines] = useState(false);
  const [engineDiagnostics, setEngineDiagnostics] = useState<EngineDiagnosticsState | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [trialCredits, setTrialCredits] = useState(5);

  // Modal Character Identity (matching video_2.mp4)
  const [editingChar, setEditingChar] = useState<MangaCharacter | null>(null);
  const [importError, setImportError] = useState('');

  useEffect(() => {
    const loaded = loadProject();
    setProject(loaded);
    if (loaded.selectedModel) {
      setSelectedModel(loaded.selectedModel);
    }
    const savedCredits = window.localStorage.getItem('mangai-trial-credits-v1');
    if (savedCredits !== null) {
      const parsed = Number(savedCredits);
      if (Number.isFinite(parsed) && parsed >= 0) setTrialCredits(parsed);
    }
    const savedCustomKey = window.localStorage.getItem('mangai-custom-key-v1');
    if (savedCustomKey && isLikelyRealApiKey(savedCustomKey)) {
      setCustomApiKey(savedCustomKey.trim());
    } else if (savedCustomKey) {
      window.localStorage.removeItem('mangai-custom-key-v1');
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveProject(project);
  }, [project, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 4400);
    return () => clearTimeout(id);
  }, [toast]);

  const pages = useMemo<MangaPage[]>(() => {
    if (project.pages && project.pages.length > 0) return project.pages;
    return defaultPages(project.characters[0] ? [project.characters[0].id] : []);
  }, [project.pages, project.characters]);

  const currentPage = pages[activePageIndex] ?? pages[0];
  const totalPages = Math.max(24, Number(project.totalPages) || 100);
  const paperType = project.paperType === 'white' ? 'white' : 'cream';
  const spineInches = Math.max(0.1, totalPages * (paperType === 'white' ? 0.002252 : 0.0025));
  const spineMm = ((totalPages / 2) * (Number(project.paperThicknessMm) || 0.12)).toFixed(2);

  function updateProject(patch: Partial<MangaProject>) {
    setProject((old) => ({
      ...old,
      ...patch,
      updatedAt: new Date().toISOString(),
    }));
  }

  function updatePage(idx: number, patch: Partial<MangaPage>) {
    const nextPages = [...pages];
    nextPages[idx] = { ...nextPages[idx], ...patch };
    updateProject({ pages: nextPages });
  }

  function rechargeCredits() {
    setTrialCredits(5);
    window.localStorage.setItem('mangai-trial-credits-v1', '5');
    setError('');
    setToast('🎨 Créditos recargados: 5 generaciones disponibles.');
  }

  function consumeCredit() {
    setTrialCredits((old) => {
      const next = Math.max(0, old - 1);
      window.localStorage.setItem('mangai-trial-credits-v1', String(next));
      return next;
    });
  }

  async function runConnectionProbe(keyOverride?: string, modelOverride?: string) {
    setIsTestingEngines(true);
    setError('');
    const candidateKey = (keyOverride ?? customApiKey).trim();
    const validKey = isLikelyRealApiKey(candidateKey) ? candidateKey : '';
    try {
      const resp = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customApiKey: validKey,
          preferredModel: modelOverride ?? selectedModel,
        }),
      });
      if (!resp.ok) {
        throw new Error(`No se pudo completar la prueba (HTTP ${resp.status}).`);
      }
      const data = (await resp.json()) as EngineDiagnosticsState;
      setEngineDiagnostics(data);
      setToast(data.ok ? '✅ Motor HD listo para generar sin marca de agua.' : '⚠️ Diagnóstico completado: revisa el estado.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error probando la conexión de motores.');
    } finally {
      setIsTestingEngines(false);
    }
  }

  function handleSaveCustomKey(nextKeyRaw: string) {
    const clean = nextKeyRaw.trim();
    setCustomApiKey(nextKeyRaw);
    if (isLikelyRealApiKey(clean)) {
      window.localStorage.setItem('mangai-custom-key-v1', clean);
      if (clean.startsWith('hf_') && selectedModel !== 'flux-schnell-hf') {
        setSelectedModel('flux-schnell-hf');
        updateProject({ selectedModel: 'flux-schnell-hf' });
      } else if (clean.startsWith('sk-') && !selectedModel.startsWith('gpt-')) {
        setSelectedModel('gpt-image-2.5-flare');
        updateProject({ selectedModel: 'gpt-image-2.5-flare' });
      } else if (clean.startsWith('AIza') && (selectedModel === 'flux-schnell-hf' || selectedModel.startsWith('gpt-'))) {
        setSelectedModel('gemini-3-pro-image');
        updateProject({ selectedModel: 'gemini-3-pro-image' });
      }
    } else if (!clean) {
      window.localStorage.removeItem('mangai-custom-key-v1');
    } else {
      window.localStorage.removeItem('mangai-custom-key-v1');
    }
  }

  async function callImageEndpoint(opts: {
    mode: 'sheet' | 'cover_wrap' | 'panel';
    aspectRatio: '1:1' | '16:9' | '3:4';
    name: string;
    details: string;
    style: string;
    notes: string;
    referenceDataUrls?: string[];
  }) {
    if (trialCredits <= 0) {
      throw new Error('Agotaste tus 5 créditos de prueba. Pulsa "+ Recargar" arriba o en el inspector.');
    }

    const fd = new FormData();
    fd.set('mode', opts.mode);
    fd.set('aspectRatio', opts.aspectRatio);
    fd.set('preferredModel', selectedModel);
    if (isLikelyRealApiKey(customApiKey)) {
      fd.set('customApiKey', customApiKey.trim());
    }
    fd.set('name', opts.name);
    fd.set('details', opts.details);
    fd.set('style', opts.style);
    fd.set('canon', `Obra: ${project.title}. Género: ${project.genre}. Universo: ${project.world}. Reglas: ${project.worldRules}`);
    fd.set('notes', opts.notes);

    const refList = (opts.referenceDataUrls ?? []).filter((u) => u && u.startsWith('data:image/'));
    for (let i = 0; i < refList.length; i++) {
      const file = await dataUrlToFile(refList[i], `ref-${i + 1}.png`);
      if (file) fd.append('references', file);
    }

    const resp = await fetch('/api/images/generate', {
      method: 'POST',
      body: fd,
    });
    const data = (await resp.json()) as {
      image?: string;
      error?: string;
      model?: string;
      note?: string;
      providerStatus?: 'official-ai' | 'free-fallback';
      diagnosticReason?: string;
    };
    if (!resp.ok || !data.image) {
      throw new Error(data.error || `Error HTTP ${resp.status}`);
    }
    consumeCredit();
    const report = data.note ? `${data.model || selectedModel} (${data.note})` : data.model || selectedModel;
    setLastModelReport(report);
    setLastProviderStatus(data.providerStatus ?? '');
    setLastDiagnosticReason(data.diagnosticReason ?? '');
    return { image: data.image, model: data.model || selectedModel };
  }

  // Action 1: Lock Consistency & Generate 4-View Turnaround Sheet on Character Card
  async function handleSaveAndLockCharacter(charToLock: MangaCharacter, generateSheet: boolean) {
    if (!charToLock.name.trim() || !charToLock.appearance.trim()) {
      setError('Escribe al menos el Name y Visual Attributes antes de fijar el personaje.');
      return;
    }
    setError('');

    const exists = project.characters.some((c) => c.id === charToLock.id);
    const savedChars = exists
      ? project.characters.map((c) => (c.id === charToLock.id ? charToLock : c))
      : [...project.characters, charToLock];
    updateProject({ characters: savedChars });
    setEditingChar(null);

    if (!generateSheet) {
      setToast(`Ficha de ${charToLock.name} guardada.`);
      return;
    }

    setLockingCharId(charToLock.id);
    setIsGenerating(true);
    try {
      const res = await callImageEndpoint({
        mode: 'sheet',
        aspectRatio: '1:1',
        name: charToLock.name,
        details: `${charToLock.appearance}. Vestimenta: ${charToLock.wardrobe}`,
        style: charToLock.visualStyle || 'Dark Seinen',
        notes: 'Generate a clean 4-view character turnaround reference sheet (front view, side profile, back view, facial close-up) on plain background.',
      });
      setProject((old) => ({
        ...old,
        updatedAt: new Date().toISOString(),
        characters: old.characters.map((c) =>
          c.id === charToLock.id
            ? { ...c, canonLocked: true, status: 'approved', referenceImage: res.image }
            : c,
        ),
      }));
      setToast(`🔒 ${charToLock.name} bloqueado con hoja de referencia (${res.model}).`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar la hoja del personaje.');
    } finally {
      setLockingCharId(null);
      setIsGenerating(false);
    }
  }

  // Action 2: Generate Unified 16:9 Paperback Wrap (Back Cover + Spine + Front Cover)
  async function handleGenerateFullWrap() {
    const promptText = (project.coverPrompt || '').trim() || ANACAONA_COVER_PROMPT_PRESET;
    setError('');
    setIsGenerating(true);
    try {
      const castDetails = project.characters.map((c) => `${c.name}: ${c.appearance}. Vestimenta: ${c.wardrobe}`).join(' | ');
      const refImages = project.characters.map((c) => c.referenceImage || '').filter(Boolean);
      const res = await callImageEndpoint({
        mode: 'cover_wrap',
        aspectRatio: '16:9',
        name: project.characters[0]?.name || project.title,
        details: castDetails || project.premise,
        style: 'Concept art a color para portada de tankōbon',
        notes: promptText,
        referenceDataUrls: refImages,
      });
      updateProject({ coverWrapImage: res.image, coverPrompt: promptText });
      setToast(`✓ Cubierta 16:9 generada con ${res.model}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar la cubierta.');
    } finally {
      setIsGenerating(false);
    }
  }

  // Action 3: Generate High-Res 3:4 Interior Manga Page with Active Cast
  async function handleGenerateInteriorPage() {
    if (!currentPage) return;
    const promptText = (currentPage.prompt || '').trim();
    if (!promptText) {
      setError('Describe la escena y viñetas de la página o carga el guion de ejemplo con 1 clic.');
      return;
    }
    setError('');
    setIsGenerating(true);
    try {
      const cast = project.characters.filter((c) => currentPage.castIds.includes(c.id));
      const castDetails = cast.map((c) => `${c.name}: ${c.appearance}. Ropa: ${c.wardrobe}`).join(' | ');
      const refImages = cast.map((c) => c.referenceImage || '').filter(Boolean);
      const res = await callImageEndpoint({
        mode: 'panel',
        aspectRatio: '3:4',
        name: cast.map((c) => c.name).join(', ') || project.title,
        details: castDetails || project.premise,
        style: currentPage.artStyle || 'Dark Seinen',
        notes: promptText,
        referenceDataUrls: refImages,
      });
      updatePage(activePageIndex, { image: res.image, modelUsed: res.model });
      setToast(`✓ Página ${currentPage.pageNumber} entintada con ${res.model}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar la página.');
    } finally {
      setIsGenerating(false);
    }
  }

  function addInteriorPage() {
    const nextNum = pages.length + 1;
    const nextPages: MangaPage[] = [
      ...pages,
      {
        id: crypto.randomUUID(),
        pageNumber: nextNum,
        artStyle: currentPage?.artStyle || 'Dark Seinen',
        prompt: '',
        castIds: currentPage?.castIds ?? project.characters.slice(0, 1).map((c) => c.id),
        image: '',
        modelUsed: '',
      },
    ];
    updateProject({ pages: nextPages });
    setActivePageIndex(nextPages.length - 1);
    setToast(`Página ${nextNum} añadida al manuscrito.`);
  }

  function startBlankProject() {
    const blank: MangaProject = {
      id: crypto.randomUUID(),
      version: 1,
      updatedAt: new Date().toISOString(),
      title: 'Mi Nuevo Manga',
      author: 'Autor',
      premise: '',
      genre: 'Seinen / Aventura',
      world: '',
      worldRules: '',
      worldLocked: false,
      paperType: 'cream',
      totalPages: 100,
      paperThicknessMm: 0.12,
      coverPrompt: '',
      coverWrapImage: '',
      selectedModel,
      characters: [],
      pages: [
        {
          id: 'page-1',
          pageNumber: 1,
          artStyle: 'Dark Seinen',
          prompt: '',
          castIds: [],
          image: '',
        },
      ],
    };
    setProject(blank);
    setActivePageIndex(0);
    setView('characters');
    setToast('Proyecto en blanco listo. Crea tu primer personaje.');
  }

  async function importJSON(evt: ChangeEvent<HTMLInputElement>) {
    const f = evt.target.files?.[0];
    if (!f) return;
    try {
      const obj: unknown = JSON.parse(await f.text());
      if (
        typeof obj !== 'object' ||
        !obj ||
        !('version' in obj) ||
        obj.version !== 1 ||
        !('characters' in obj) ||
        !Array.isArray(obj.characters) ||
        !('title' in obj) ||
        typeof obj.title !== 'string'
      ) {
        throw Error('Formato incompatible');
      }
      const imported = obj as MangaProject;
      setProject(imported);
      setActivePageIndex(0);
      setImportError('');
      setToast('Proyecto JSON importado.');
    } catch {
      setImportError('No se pudo importar. Debe ser un JSON de MANGAI v1.');
    }
    evt.target.value = '';
  }

  function downloadDataUrl(url: string, filename: string) {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }

  if (!hydrated) {
    return <div className="studio-loading">MANGAI STUDIO</div>;
  }

  return (
    <div className="studio-shell">
      {/* TOP BAR CONNECTED WITH HOME */}
      <header className="studio-topbar">
        <div className="topbar-left">
          <a className="home-brand" href="/">
            <span className="home-brandmark">✦</span>
            <span>
              MANGAI<span style={{ color: '#8c5fb7' }}>.</span>
            </span>
          </a>
          <div className="topbar-sep" />
          <a className="back-home-pill" href="/">
            <ArrowLeft size={14} /> Volver al Home
          </a>
          <div className="project-badge">
            <span>Proyecto:</span>
            <strong>{project.title}</strong>
          </div>
        </div>
        <div className="topbar-right">
          <div className="credits-pill">
            <span>🎨 Créditos: {trialCredits} / 5</span>
            <button type="button" onClick={rechargeCredits}>
              + Recargar
            </button>
          </div>
        </div>
      </header>

      {/* 3-COLUMN STUDIO WORKSPACE (VIDEO WORKFLOW ON PAPEL CARTÓN THEME) */}
      <div className="manga-grid">
        {/* COLUMN 1: LEFT NAVIGATION RAIL */}
        <aside className="left-rail">
          <div className="field-group">
            <span className="section-label">KDP &amp; Manga Production</span>
            <nav className="nav-stack" aria-label="Etapas de Producción">
              <button
                type="button"
                className={`nav-btn ${view === 'project' ? 'active' : ''}`}
                onClick={() => setView('project')}
              >
                <Settings2 size={17} /> Print Setup
              </button>
              <button
                type="button"
                className={`nav-btn ${view === 'characters' ? 'active' : ''}`}
                onClick={() => setView('characters')}
              >
                <Users size={17} /> Character Library
              </button>
              <button
                type="button"
                className={`nav-btn ${view === 'cover' ? 'active' : ''}`}
                onClick={() => setView('cover')}
              >
                <BookOpen size={17} /> Paperback Cover
              </button>
              <button
                type="button"
                className={`nav-btn ${view === 'pages' ? 'active' : ''}`}
                onClick={() => setView('pages')}
              >
                <Grid size={17} /> Interior Pages
              </button>
            </nav>
          </div>

          {view === 'pages' && (
            <div className="field-group">
              <span className="section-label">Manuscript</span>
              <div className="manuscript-list">
                {pages.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`page-row-btn ${activePageIndex === idx ? 'active' : ''}`}
                    onClick={() => setActivePageIndex(idx)}
                  >
                    <span>
                      <span className="page-row-num">{String(idx + 1).padStart(2, '0')}</span>
                      Page {p.pageNumber}
                    </span>
                    <span style={{ fontSize: 11, color: p.image ? '#059669' : '#57515e' }}>
                      {p.image ? '✓' : '○'}
                    </span>
                  </button>
                ))}
              </div>
              <button type="button" className="pill-btn pill-outline" onClick={addInteriorPage}>
                <Plus size={15} /> Add Page
              </button>
            </div>
          )}

          <div className="rail-bottom">
            <span className="section-label">Submission</span>
            <button
              type="button"
              className="pill-btn pill-solid"
              onClick={() => {
                exportKdpBundleSnapshot(project);
                setToast('📦 Paquete KDP Bundle JSON descargado.');
              }}
            >
              <Download size={15} /> Build KDP Bundle
            </button>
          </div>
        </aside>

        {/* COLUMN 2: CENTER CANVAS */}
        <main className="center-stage">
          {view === 'characters' && (
            <div className="stage-container">
              <div className="stage-header">
                <div>
                  <h1>Character Roster</h1>
                  <p>Fija la identidad visual de tus personajes para mantener consistencia en portada y páginas.</p>
                </div>
                <button
                  type="button"
                  className="pill-btn pill-solid"
                  onClick={() => setEditingChar(blankCharacter())}
                >
                  <Plus size={16} /> New Character
                </button>
              </div>

              {project.characters.length === 0 ? (
                <div className="editorial-card" style={{ textAlign: 'center', padding: 48 }}>
                  <p style={{ marginBottom: 16, color: 'var(--sub)' }}>
                    Aún no tienes personajes en este proyecto. Crea uno desde cero o carga el ejemplo real de Anacaona.
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="pill-btn pill-solid"
                      onClick={() => setEditingChar(blankCharacter())}
                    >
                      <Plus size={16} /> Crear Primer Personaje
                    </button>
                    <button
                      type="button"
                      className="pill-btn pill-outline"
                      onClick={() => {
                        setProject(exampleProject);
                        setToast('Ejemplo Anacaona cargado.');
                      }}
                    >
                      ✨ Cargar Ejemplo Anacaona
                    </button>
                  </div>
                </div>
              ) : (
                <div className="roster-grid">
                  {project.characters.map((char) => (
                    <article key={char.id} className="char-card">
                      <div className="char-thumb">
                        {char.referenceImage ? (
                          <img src={char.referenceImage} alt={`Hoja de referencia de ${char.name}`} />
                        ) : (
                          <div style={{ textAlign: 'center', color: 'var(--sub)', padding: 16 }}>
                            <Users size={34} style={{ opacity: 0.3, marginBottom: 6 }} />
                            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>
                              SIN REFERENCIA AÚN
                            </div>
                          </div>
                        )}
                        {char.canonLocked && (
                          <span className="locked-badge">
                            <Lock size={10} /> LOCKED
                          </span>
                        )}
                        <button
                          type="button"
                          className="char-lock-btn"
                          disabled={isGenerating}
                          onClick={() => handleSaveAndLockCharacter(char, true)}
                        >
                          {lockingCharId === char.id ? (
                            <>
                              <RefreshCw size={11} className="spin" /> Locking...
                            </>
                          ) : char.referenceImage ? (
                            <>
                              <RefreshCw size={11} /> Refresh Lock
                            </>
                          ) : (
                            <>
                              <Lock size={11} /> Lock Consistency
                            </>
                          )}
                        </button>
                      </div>
                      <div className="char-body">
                        <div className="char-body-top">
                          <strong>{char.name || 'Sin nombre'}</strong>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className="pill-outline"
                              style={{ padding: '4px 9px', borderRadius: 8, fontSize: 11 }}
                              onClick={() => setEditingChar(char)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="pill-outline"
                              style={{ padding: '4px 7px', borderRadius: 8, color: '#bf3f47' }}
                              aria-label="Eliminar personaje"
                              onClick={() => {
                                updateProject({
                                  characters: project.characters.filter((c) => c.id !== char.id),
                                });
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <p>{char.appearance}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {view === 'cover' && (
            <div className="stage-container">
              <div className="stage-header">
                <div>
                  <h1>Paperback Wrap Designer</h1>
                  <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                    Matched Front &amp; Back · 6×9&quot; Standard Format · Auto-spine: {spineInches.toFixed(3)}&quot; ({spineMm} mm)
                  </p>
                </div>
                {project.coverWrapImage && (
                  <button
                    type="button"
                    className="pill-btn pill-outline"
                    onClick={() =>
                      downloadDataUrl(
                        project.coverWrapImage!,
                        `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-full-wrap.png`,
                      )
                    }
                  >
                    <Download size={15} /> Descargar Wrap
                  </button>
                )}
              </div>

              <div className="wrap-frame">
                {project.coverWrapImage ? (
                  <img src={project.coverWrapImage} alt="Cubierta completa 16:9 de manga" />
                ) : (
                  <div className="sheet-placeholder">
                    <BookOpen size={44} />
                    <strong style={{ fontSize: 13, letterSpacing: '0.16em' }}>
                      GENERATE UNIFIED WRAP IN RIGHT INSPECTOR
                    </strong>
                    <span style={{ fontSize: 12 }}>
                      Portada frontal (derecha), lomo central y contraportada continua (izquierda) en 16:9.
                    </span>
                  </div>
                )}

                <div className="wrap-guides">
                  <div className="wrap-half">
                    <span className="wrap-half-label">Back Cover (Contraportada)</span>
                    <div className="barcode-box">
                      <div className="barcode-bars" />
                      <span>ISBN 978-4-08</span>
                    </div>
                  </div>
                  <div className="wrap-spine">
                    <span>SPINE ({spineInches.toFixed(2)}&quot;)</span>
                  </div>
                  <div className="wrap-half">
                    <span className="wrap-half-label">Front Cover (Portada)</span>
                    <span />
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'pages' && currentPage && (
            <div className="stage-container">
              <div className="manga-sheet-wrap">
                <div className="stage-header">
                  <div>
                    <h1 style={{ fontSize: 22 }}>Interior View</h1>
                    <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
                      PAGE {currentPage.pageNumber} / {pages.length} · B/N MANGA 3:4
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="pill-btn pill-outline"
                      onClick={() => setShowGuides((s) => !s)}
                    >
                      <Grid size={14} /> {showGuides ? 'HIDE GUIDES' : 'SHOW GUIDES'}
                    </button>
                    {currentPage.image && (
                      <button
                        type="button"
                        className="pill-btn pill-outline"
                        onClick={() =>
                          downloadDataUrl(
                            currentPage.image!,
                            `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-page-${currentPage.pageNumber}.png`,
                          )
                        }
                      >
                        <Download size={14} /> PNG
                      </button>
                    )}
                  </div>
                </div>

                <div className="manga-sheet">
                  {showGuides && <div className="sheet-bleed-guide" />}
                  {currentPage.image ? (
                    <img src={currentPage.image} alt={`Página ${currentPage.pageNumber} generada`} />
                  ) : (
                    <div className="sheet-placeholder">
                      <Sparkles size={36} />
                      <strong style={{ fontSize: 13, letterSpacing: '0.2em' }}>INK AWAITING</strong>
                      <span style={{ fontSize: 12 }}>
                        Activa el reparto en el panel derecho, elige el modelo y pulsa &quot;Generate High-Res Ink&quot;.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {view === 'project' && (
            <div className="stage-container">
              <div className="stage-header">
                <div>
                  <h1>Print Setup &amp; Universo</h1>
                  <p>Configura el libro físico (lomo KDP/Tankōbon), el lore base y respaldos del proyecto.</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="pill-btn pill-outline" onClick={startBlankProject}>
                    <Plus size={15} /> Nuevo Proyecto en Blanco
                  </button>
                  <button
                    type="button"
                    className="pill-btn pill-solid"
                    onClick={() => {
                      setProject(exampleProject);
                      setActivePageIndex(0);
                      setToast('Ejemplo real "Anacaona: Flor de Guerra" cargado.');
                    }}
                  >
                    ✨ Cargar Ejemplo Anacaona
                  </button>
                </div>
              </div>

              <div className="editorial-card" style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="field-group">
                    <label>Título de la obra</label>
                    <input
                      className="field-input"
                      value={project.title}
                      onChange={(e) => updateProject({ title: e.target.value })}
                    />
                  </div>
                  <div className="field-group">
                    <label>Autor / Estudio</label>
                    <input
                      className="field-input"
                      value={project.author || ''}
                      onChange={(e) => updateProject({ author: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div className="field-group">
                    <label>Total de páginas</label>
                    <input
                      type="number"
                      min={24}
                      max={600}
                      className="field-input"
                      value={totalPages}
                      onChange={(e) => updateProject({ totalPages: Number(e.target.value) || 100 })}
                    />
                  </div>
                  <div className="field-group">
                    <label>Tipo de papel</label>
                    <select
                      className="field-select"
                      value={paperType}
                      onChange={(e) =>
                        updateProject({
                          paperType: e.target.value === 'white' ? 'white' : 'cream',
                          paperThicknessMm: e.target.value === 'white' ? 0.1 : 0.12,
                        })
                      }
                    >
                      <option value="cream">Crema Manga (0.12 mm)</option>
                      <option value="white">Blanco Nítido (0.10 mm)</option>
                    </select>
                  </div>
                  <div className="field-group">
                    <label>Lomo calculado</label>
                    <div
                      className="field-input"
                      style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, background: 'var(--cream)' }}
                    >
                      {spineInches.toFixed(3)}&quot; / {spineMm} mm
                    </div>
                  </div>
                </div>

                <div className="field-group">
                  <label>Premisa y Universo (Settei)</label>
                  <textarea
                    rows={3}
                    className="field-textarea"
                    value={project.world}
                    onChange={(e) => updateProject({ world: e.target.value })}
                    placeholder="Describe el mundo y tono visual de tu historia..."
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 6 }}>
                  <button
                    type="button"
                    className="pill-btn pill-outline"
                    onClick={() => exportProject(project)}
                  >
                    <FileJson size={15} /> Exportar Proyecto JSON
                  </button>
                  <label className="pill-btn pill-outline" style={{ position: 'relative' }}>
                    <Upload size={15} /> Importar Proyecto JSON
                    <input
                      type="file"
                      accept=".json,application/json"
                      style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
                      onChange={importJSON}
                    />
                  </label>
                </div>
                {importError && <div className="error-banner">{importError}</div>}
              </div>
            </div>
          )}
        </main>

        {/* COLUMN 3: RIGHT CONTEXTUAL INSPECTOR (PRIMARY ACTIONS FIRST, ENGINE AT BOTTOM) */}
        <aside className="right-inspector">
          <div className="stage-stepper" aria-label="Avance rápido de etapas">
            <button
              type="button"
              className={`step-pill ${view === 'project' ? 'active' : ''}`}
              onClick={() => setView('project')}
            >
              1 Config
            </button>
            <button
              type="button"
              className={`step-pill ${view === 'characters' ? 'active' : ''}`}
              onClick={() => setView('characters')}
            >
              2 Personajes
            </button>
            <button
              type="button"
              className={`step-pill ${view === 'cover' ? 'active' : ''}`}
              onClick={() => setView('cover')}
            >
              3 Portada
            </button>
            <button
              type="button"
              className={`step-pill ${view === 'pages' ? 'active' : ''}`}
              onClick={() => setView('pages')}
            >
              4 Páginas
            </button>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}

          {view === 'characters' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span className="section-label" style={{ padding: 0 }}>
                Acción de Personaje &amp; Avance
              </span>
              {project.characters[0] ? (
                <button
                  type="button"
                  className="pill-btn pill-accent"
                  disabled={isGenerating}
                  onClick={() => handleSaveAndLockCharacter(project.characters[0], true)}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw size={15} className="spin" /> Generando hoja 1:1...
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} /> Generar Hoja de {project.characters[0].name}
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  className="pill-btn pill-accent"
                  onClick={() => setEditingChar(blankCharacter())}
                >
                  <Plus size={15} /> Crear Primer Personaje
                </button>
              )}
              <button
                type="button"
                className="pill-btn pill-solid"
                onClick={() => setView('cover')}
              >
                Siguiente: Paperback Cover →
              </button>
              <button
                type="button"
                className="pill-btn pill-outline"
                onClick={() => setView('pages')}
              >
                Ir a Interior Pages →
              </button>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--sub)', lineHeight: 1.5 }}>
                1. Crea o edita con <strong>Visual Attributes</strong> y <strong>Default Wardrobe</strong>.<br />
                2. Pulsa <strong>Generar Hoja</strong> para fijar la referencia 1:1.<br />
                3. Avanza a <strong>Paperback Cover</strong> o <strong>Interior Pages</strong>.
              </p>
            </div>
          )}

          {view === 'cover' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span className="section-label" style={{ padding: 0 }}>
                Unified Cover Generation
              </span>
              <button
                type="button"
                className="pill-preset"
                onClick={() => {
                  updateProject({ coverPrompt: ANACAONA_COVER_PROMPT_PRESET });
                  setToast('Ejemplo real de portada Anacaona cargado.');
                }}
              >
                ✨ Cargar ejemplo real (Portada Anacaona)
              </button>
              <div className="field-group">
                <label>Descripción de Portada + Contraportada (16:9)</label>
                <textarea
                  rows={5}
                  className="field-textarea"
                  value={project.coverPrompt || ''}
                  onChange={(e) => updateProject({ coverPrompt: e.target.value })}
                  placeholder="Describe el paisaje continuo entre contraportada, lomo y portada..."
                />
              </div>
              <button
                type="button"
                className="pill-btn pill-accent"
                disabled={isGenerating}
                onClick={handleGenerateFullWrap}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={15} className="spin" /> Generating Wrap...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> Generate Full Wrap
                  </>
                )}
              </button>
              <button
                type="button"
                className="pill-btn pill-solid"
                onClick={() => setView('pages')}
              >
                Siguiente: Interior Pages →
              </button>
              <button
                type="button"
                className="pill-btn pill-outline"
                onClick={() => window.print()}
              >
                <Printer size={15} /> Export KDP PDF-Ready
              </button>
            </div>
          )}

          {view === 'pages' && currentPage && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span className="section-label" style={{ padding: 0 }}>
                Interior Settings
              </span>
              <div className="field-group">
                <label>Art Style</label>
                <select
                  className="field-select"
                  value={currentPage.artStyle}
                  onChange={(e) => updatePage(activePageIndex, { artStyle: e.target.value })}
                >
                  {MANGA_STYLES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-group">
                <label>Active Cast ({currentPage.castIds.length})</label>
                <div className="cast-chips">
                  {project.characters.length === 0 ? (
                    <span style={{ fontSize: 11, color: 'var(--sub)' }}>Sin personajes aún</span>
                  ) : (
                    project.characters.map((c) => {
                      const active = currentPage.castIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={`cast-chip ${active ? 'active' : ''}`}
                          onClick={() => {
                            const next = active
                              ? currentPage.castIds.filter((id) => id !== c.id)
                              : [...currentPage.castIds, c.id];
                            updatePage(activePageIndex, { castIds: next });
                          }}
                        >
                          {active && <UserCheck size={12} />} {c.name || 'Personaje'}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <button
                type="button"
                className="pill-preset"
                onClick={() => {
                  updatePage(activePageIndex, {
                    artStyle: 'Dark Seinen',
                    prompt: ANACAONA_PAGE_1_SCRIPT_PRESET,
                  });
                  setToast('Guion real de 5 viñetas (Anacaona Pág. 1) cargado.');
                }}
              >
                ✨ Cargar guion real (5 viñetas Anacaona)
              </button>

              <div className="field-group">
                <label>Describe the action &amp; panels (Página {currentPage.pageNumber})</label>
                <textarea
                  rows={6}
                  className="field-textarea"
                  value={currentPage.prompt}
                  onChange={(e) => updatePage(activePageIndex, { prompt: e.target.value })}
                  placeholder="Describe las viñetas de arriba hacia abajo y de derecha a izquierda..."
                />
              </div>

              <button
                type="button"
                className="pill-btn pill-accent"
                disabled={isGenerating}
                onClick={handleGenerateInteriorPage}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={15} className="spin" /> Drawing Page...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> Generate High-Res Ink
                  </>
                )}
              </button>
            </div>
          )}

          {view === 'project' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span className="section-label" style={{ padding: 0 }}>
                Guía Rápida en 3 Pasos
              </span>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--sub)', lineHeight: 1.65 }}>
                1. Ve a <strong>Character Library</strong> y bloquea tu personaje.<br />
                2. Diseña tu portada 16:9 en <strong>Paperback Cover</strong>.<br />
                3. Entinta las páginas completas en <strong>Interior Pages</strong> eligiendo el modelo abajo.
              </p>
              <button
                type="button"
                className="pill-btn pill-solid"
                onClick={() => setView('characters')}
              >
                Siguiente: Character Library →
              </button>
            </div>
          )}

          <div className="inspector-card">
            <span className="section-label" style={{ padding: 0 }}>
              Motor de Imagen IA (Elegible)
            </span>
            <div className="field-group">
              <label>Modelo activo</label>
              <select
                className="field-select"
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  updateProject({ selectedModel: e.target.value });
                  setToast(`Modelo seleccionado: ${e.target.options[e.target.selectedIndex].text}`);
                }}
              >
                {AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <small style={{ fontSize: 11, color: 'var(--sub)', lineHeight: 1.4 }}>
              Incluye FLUX.1 Schnell HD directo y gratis sin clave ni marca de agua.
            </small>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="pill-btn pill-outline"
                style={{ padding: '7px 11px', fontSize: 11, flex: 1 }}
                disabled={isTestingEngines}
                onClick={() => runConnectionProbe()}
              >
                {isTestingEngines ? (
                  <>
                    <RefreshCw size={12} className="spin" /> Probando...
                  </>
                ) : (
                  <>
                    <Activity size={12} /> 🩺 Probar Conexión
                  </>
                )}
              </button>
              <button
                type="button"
                className="pill-btn pill-outline"
                style={{ padding: '7px 10px', fontSize: 11 }}
                onClick={() => setShowKeyDrawer((v) => !v)}
              >
                <KeyRound size={12} /> {isLikelyRealApiKey(customApiKey) ? 'Llave Activa' : '🔑 Llave (Opcional)'}
              </button>
            </div>

            {showKeyDrawer && (
              <div className="key-drawer">
                <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em' }}>
                  🔑 Llave opcional (Gemini Tier 1 / HF hf_ / OpenAI sk-)
                </label>
                <input
                  type="password"
                  className="field-input"
                  style={{ fontSize: 11, padding: '8px 10px', fontFamily: 'JetBrains Mono, monospace' }}
                  placeholder="Opcional: pega tu token real aquí..."
                  value={customApiKey}
                  onChange={(e) => handleSaveCustomKey(e.target.value)}
                />
                {customApiKey.trim() && !isLikelyRealApiKey(customApiKey) && (
                  <span style={{ fontSize: 10, color: '#9a3412', fontWeight: 700 }}>
                    Texto muy corto para ser clave real: se usará el motor directo sin clave.
                  </span>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="pill-btn pill-solid"
                    style={{ padding: '6px 12px', fontSize: 11 }}
                    disabled={isTestingEngines}
                    onClick={() => {
                      const clean = customApiKey.trim();
                      const nextModel = isLikelyRealApiKey(clean) && clean.startsWith('hf_')
                        ? 'flux-schnell-hf'
                        : isLikelyRealApiKey(clean) && clean.startsWith('sk-')
                        ? 'gpt-image-2.5-flare'
                        : selectedModel;
                      runConnectionProbe(customApiKey, nextModel);
                    }}
                  >
                    Probar
                  </button>
                  {customApiKey && (
                    <button
                      type="button"
                      className="pill-btn pill-outline"
                      style={{ padding: '6px 10px', fontSize: 11 }}
                      onClick={() => {
                        handleSaveCustomKey('');
                        setToast('Llave eliminada.');
                      }}
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
            )}

            {engineDiagnostics && (
              <div className={`diag-box ${engineDiagnostics.ok ? 'diag-ok' : 'diag-warn'}`}>
                <strong>{engineDiagnostics.summary}</strong>
                <div className="diag-row">
                  <span>HF FLUX.1-schnell:</span>
                  <span>{engineDiagnostics.hfStatus.detail}</span>
                </div>
                <div className="diag-row">
                  <span>Nano Banana Img:</span>
                  <span>{engineDiagnostics.geminiImageStatus.detail}</span>
                </div>
                <div className="diag-row">
                  <span>OpenAI Img:</span>
                  <span>{engineDiagnostics.openaiStatus.detail}</span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 10, lineHeight: 1.45 }}>
                  {engineDiagnostics.recommendation}
                </p>
              </div>
            )}

            {lastModelReport && (
              <div
                style={{
                  fontSize: 11,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: lastProviderStatus === 'free-fallback' ? '#9a3412' : 'var(--violet)',
                  fontWeight: 700,
                }}
              >
                Último render: {lastModelReport}
              </div>
            )}
            {lastProviderStatus === 'free-fallback' && lastDiagnosticReason && (
              <div className="diag-warn-inline">
                ⚠️ {lastDiagnosticReason}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* MODAL: CHARACTER IDENTITY (MATCHING VIDEO_2.MP4) */}
      {editingChar && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="char-modal-title">
          <div className="modal-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 id="char-modal-title" style={{ margin: 0, fontFamily: 'Space Grotesk, sans-serif', fontSize: 22 }}>
                Character Identity
              </h2>
              <button
                type="button"
                className="pill-outline"
                style={{ borderRadius: '50%', width: 32, height: 32, padding: 0, display: 'grid', placeItems: 'center' }}
                onClick={() => setEditingChar(null)}
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <button
              type="button"
              className="pill-preset"
              onClick={() =>
                setEditingChar({
                  ...editingChar,
                  name: ANACAONA_CHARACTER_PRESET.name,
                  role: ANACAONA_CHARACTER_PRESET.role,
                  appearance: ANACAONA_CHARACTER_PRESET.appearance,
                  wardrobe: ANACAONA_CHARACTER_PRESET.wardrobe,
                  visualStyle: ANACAONA_CHARACTER_PRESET.visualStyle,
                })
              }
            >
              ✨ Rellenar con datos reales del video (Anacaona)
            </button>

            <div className="field-group">
              <label>Name</label>
              <input
                className="field-input"
                value={editingChar.name}
                onChange={(e) => setEditingChar({ ...editingChar, name: e.target.value })}
                placeholder="e.g. Anacaona"
              />
            </div>

            <div className="field-group">
              <label>Visual Attributes (Face, Hair, Features)</label>
              <textarea
                rows={4}
                className="field-textarea"
                value={editingChar.appearance}
                onChange={(e) => setEditingChar({ ...editingChar, appearance: e.target.value })}
                placeholder="Cabello, rostro, ojos, tono de piel, complexión física..."
              />
            </div>

            <div className="field-group">
              <label>Default Wardrobe</label>
              <textarea
                rows={4}
                className="field-textarea"
                value={editingChar.wardrobe}
                onChange={(e) => setEditingChar({ ...editingChar, wardrobe: e.target.value })}
                placeholder="Vestimenta característica, colores fijos, accesorios..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 6 }}>
              <button type="button" className="pill-btn pill-outline" onClick={() => setEditingChar(null)}>
                Discard
              </button>
              <button
                type="button"
                className="pill-btn pill-outline"
                onClick={() => handleSaveAndLockCharacter(editingChar, false)}
              >
                Save Draft
              </button>
              <button
                type="button"
                className="pill-btn pill-solid"
                onClick={() => handleSaveAndLockCharacter(editingChar, true)}
              >
                Update &amp; Lock Reference
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="studio-toast" role="status">
          <Check size={15} />
          <span>{toast}</span>
          <button type="button" aria-label="Cerrar aviso" onClick={() => setToast('')}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
