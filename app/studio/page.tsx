'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CircleHelp,
  Database,
  Download,
  ExternalLink,
  FileJson,
  FileText,
  Globe2,
  ImagePlus,
  Layers,
  LayoutGrid,
  Lock,
  LockOpen,
  Menu,
  Plus,
  RefreshCw,
  Ruler,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  WandSparkles,
  X,
} from 'lucide-react';
import {
  blankCharacter,
  defaultKomas,
  exampleProject,
  KOMA_STATES,
  type KomaPanel,
  type KomaState,
  type MangaCharacter,
  type MangaProject,
  type ProductionRoute,
} from '@/lib/schema';
import { exportProject, exportSupabaseSnapshot, loadProject, saveProject } from '@/lib/storage';
import { IMAGE_MODES, MANGA_STYLES } from '@/lib/prompts';
import './studio.css';

type Tab = 'start' | 'settei' | 'characters' | 'image' | 'genko' | 'project';

const nav: { id: Tab; label: string; subtitle: string; Icon: typeof BookOpen }[] = [
  { id: 'settei', label: 'Settei Hub', subtitle: 'Universo y lore', Icon: Globe2 },
  { id: 'characters', label: 'Personajes', subtitle: 'Fichas y canon', Icon: Users },
  { id: 'image', label: 'Generar imágenes', subtitle: 'Motor visual híbrido', Icon: WandSparkles },
  { id: 'genko', label: 'Genkō & Tankōbon', subtitle: 'Viñetas S0-S5 y Lomo', Icon: Layers },
  { id: 'project', label: 'Mi proyecto', subtitle: 'Estado y exportación', Icon: LayoutGrid },
];

const SCREENTONE_OPTIONS = [
  { id: 'none', label: 'Sin trama (blanco puro)' },
  { id: '60L_suave', label: '60L Trama suave (atmósfera)' },
  { id: '60L_dramatico', label: '60L Contraste dramático' },
  { id: 'trama_velocidad', label: 'Líneas cinéticas / beta' },
];

const freshProject = (): MangaProject => ({
  id: crypto.randomUUID(),
  version: 1,
  updatedAt: new Date().toISOString(),
  title: 'Sin título',
  premise: '',
  genre: 'Fantasía',
  world: '',
  worldRules: '',
  worldLocked: false,
  characters: [],
  komas: defaultKomas(),
  totalPages: 192,
  paperThicknessMm: 0.12,
});

export default function StudioPage() {
  const [project, setProject] = useState<MangaProject>(exampleProject);
  const [tab, setTab] = useState<Tab>('start');
  const [selectedId, setSelectedId] = useState('mira');
  const [selectedKomaIndex, setSelectedKomaIndex] = useState(1);
  const [hydrated, setHydrated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [imageMode, setImageMode] = useState('portrait');
  const [visualStyle, setVisualStyle] = useState<string>(MANGA_STYLES[0]);
  const [notes, setNotes] = useState('');
  const [reference, setReference] = useState<File | null>(null);
  const [useGeneratedAsReference, setUseGeneratedAsReference] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [importError, setImportError] = useState('');

  useEffect(() => {
    const saved = window.localStorage.getItem('mangai-project-v1');
    if (saved) {
      const p = loadProject();
      setProject(p);
      setSelectedId(p.characters[0]?.id ?? '');
      setTab('settei');
    }
    setAccessToken(window.sessionStorage.getItem('mangai-studio-access') ?? '');
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveProject(project);
  }, [project, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 4200);
    return () => clearTimeout(id);
  }, [toast]);

  const selected = useMemo(
    () => project.characters.find((c) => c.id === selectedId) ?? project.characters[0] ?? null,
    [project, selectedId],
  );

  const komas = useMemo(
    () => (project.komas && project.komas.length > 0 ? project.komas : defaultKomas()),
    [project.komas],
  );

  const activeKoma = useMemo(
    () => komas.find((k) => k.panelIndex === selectedKomaIndex) ?? komas[0],
    [komas, selectedKomaIndex],
  );

  const totalPages = project.totalPages ?? 192;
  const paperThicknessMm = project.paperThicknessMm ?? 0.12;
  const spineWidthMm = ((totalPages / 2) * paperThicknessMm).toFixed(2);
  const lockedKomasCount = komas.filter((k) => k.state === 'LOCKED').length;

  function updateProject(patch: Partial<MangaProject>) {
    setProject((old) => ({ ...old, ...patch, updatedAt: new Date().toISOString() }));
  }

  function updateChar(patch: Partial<MangaCharacter>) {
    if (!selected || selected.canonLocked) return;
    setProject((old) => ({
      ...old,
      updatedAt: new Date().toISOString(),
      characters: old.characters.map((c) => (c.id === selected.id ? { ...c, ...patch } : c)),
    }));
  }

  function updateKoma(panelIndex: number, patch: Partial<KomaPanel>) {
    setProject((old) => {
      const current = old.komas && old.komas.length > 0 ? old.komas : defaultKomas();
      return {
        ...old,
        updatedAt: new Date().toISOString(),
        komas: current.map((k) => (k.panelIndex === panelIndex ? { ...k, ...patch } : k)),
      };
    });
  }

  function sendKomaToImageTab(koma: KomaPanel) {
    const promptLines = [
      `Koma #${koma.panelIndex} · Plano: ${koma.cameraAngle || 'Plano medio'}.`,
      koma.actionPrompt.trim() ? `Escena: ${koma.actionPrompt.trim()}` : '',
      koma.screentoneL1 && koma.screentoneL1 !== 'none' ? `Trama sugerida: ${koma.screentoneL1}.` : '',
      koma.dialogueL5.trim() ? `Reserva espacio superior para globo de diálogo ("${koma.dialogueL5.trim()}").` : '',
      koma.sfxL4.trim() ? `Acción cinética / SFX referencia: ${koma.sfxL4.trim()}.` : '',
    ].filter(Boolean);
    setNotes(promptLines.join('\n'));
    setImageMode('panel');
    setTab('image');
    setToast(`Koma #${koma.panelIndex} enviado al motor visual en modo Viñeta.`);
  }

  function toggleCharLock() {
    if (!selected) return;
    setProject((old) => ({
      ...old,
      characters: old.characters.map((c) =>
        c.id === selected.id ? { ...c, canonLocked: !c.canonLocked, status: !c.canonLocked ? 'approved' : 'draft' } : c,
      ),
    }));
    setToast(selected.canonLocked ? 'Canon desbloqueado para editar.' : 'Identidad aprobada y bloqueada como canon.');
  }

  function addCharacter() {
    const ch = blankCharacter();
    setProject((old) => ({ ...old, characters: [...old.characters, ch] }));
    setSelectedId(ch.id);
    setTab('characters');
    setToast('Nueva ficha creada.');
  }

  function startNewProject() {
    const p = freshProject();
    setProject(p);
    setSelectedId('');
    setSelectedKomaIndex(1);
    setTab('settei');
    setGeneratedImage(null);
    setToast('Proyecto nuevo creado. Tus datos están en este navegador.');
  }

  function chooseExample() {
    setProject(exampleProject);
    setSelectedId('mira');
    setSelectedKomaIndex(1);
    setTab('settei');
    setToast('Ejemplo cargado. Ahora puedes editarlo.');
  }

  function changeTab(next: Tab) {
    setTab(next);
    setMenuOpen(false);
  }

  function setToken(v: string) {
    setAccessToken(v);
    window.sessionStorage.setItem('mangai-studio-access', v);
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
      setSelectedId(imported.characters[0]?.id ?? '');
      setSelectedKomaIndex(1);
      setImportError('');
      setTab('settei');
      setToast('Proyecto importado.');
    } catch {
      setImportError('No se pudo importar. Debe ser un proyecto JSON de MANGAI v1.');
    }
    evt.target.value = '';
  }

  async function generateImage() {
    if (!selected || isGenerating) return;
    setError('');
    setIsGenerating(true);
    try {
      const fd = new FormData();
      fd.set('name', selected.name);
      fd.set(
        'details',
        `Edad: ${selected.age}. Apariencia: ${selected.appearance}. Personalidad: ${selected.personality}. Ropa: ${selected.wardrobe}. Motivación: ${selected.motivation}`,
      );
      fd.set('style', visualStyle || selected.visualStyle);
      fd.set('canon', `Proyecto ${project.title}. Género ${project.genre}. Universo: ${project.world}. Reglas: ${project.worldRules}`);
      fd.set('mode', imageMode);
      fd.set('notes', notes);
      if (reference) {
        fd.set('reference', reference);
      } else if (useGeneratedAsReference && generatedImage) {
        const blob = await (await fetch(generatedImage)).blob();
        const refType = ['image/png', 'image/jpeg', 'image/webp'].includes(blob.type) ? blob.type : 'image/png';
        fd.set('reference', new File([blob], 'approved-character.png', { type: refType }));
      }
      const res = await fetch('/api/images/generate', {
        method: 'POST',
        body: fd,
        headers: { 'x-mangai-access': accessToken },
      });
      const data = (await res.json()) as { image?: string; error?: string; model?: string };
      if (!res.ok || !data.image) throw Error(data.error ?? `Error ${res.status}`);
      setGeneratedImage(data.image);
      setToast(
        data.model
          ? `Imagen generada (${data.model}). Descárgala o úsala como referencia.`
          : 'Imagen generada. Descárgala o úsala como referencia para una variación.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar la imagen.');
    } finally {
      setIsGenerating(false);
    }
  }

  function downloadImage() {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `mangai-${selected?.name.toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'personaje'}-${imageMode}.png`;
    a.click();
  }

  const canonPct = selected
    ? Math.round(
        ([selected.appearance, selected.personality, selected.motivation, selected.wardrobe, selected.age].filter((v) => v.trim()).length /
          5) *
          100,
      )
    : 0;

  if (!hydrated) return <div className="studio-loading">MANGAI <span>STUDIO</span></div>;

  return (
    <div className="studio-app">
      <aside className={`studio-sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <a className="brand" href="/">
            <span className="brand-logo">✦</span>
            <span>
              MANGAI <small>CREATOR STUDIO</small>
            </span>
          </a>
          <button className="close-mobile" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)}>
            <X size={19} />
          </button>
        </div>
        <div className="sidebar-label">MI TALLER</div>
        <nav aria-label="Módulos del estudio">
          {nav.map((n) => (
            <button key={n.id} className={`nav-item ${tab === n.id ? 'active' : ''}`} onClick={() => changeTab(n.id)}>
              <n.Icon size={18} />
              <span>
                <strong>{n.label}</strong>
                <small>{n.subtitle}</small>
              </span>
              {tab === n.id && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="project-card">
            <span>PROYECTO ACTIVO</span>
            <strong>{project.title}</strong>
            <small>{project.characters.length} personajes · Guardado local</small>
          </div>
          <a href="/" className="return-link">
            <ArrowLeft size={16} /> Volver a MANGAI
          </a>
        </div>
      </aside>
      {menuOpen && <button className="menu-overlay" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú" />}
      <main className="studio-main">
        <header className="studio-header">
          <div className="header-start">
            <button className="mobile-menu" aria-label="Abrir menú" onClick={() => setMenuOpen(true)}>
              <Menu size={21} />
            </button>
            <span className="crumb">MANGAI STUDIO</span>
            <span className="sep">/</span>
            <strong>{tab === 'start' ? 'Comenzar' : nav.find((n) => n.id === tab)?.label}</strong>
          </div>
          <div className="header-end">
            <span className="saved">
              <Save size={14} /> LOCAL
            </span>
            <button
              className="icon-circle"
              title="Ayuda"
              onClick={() => setToast('Tus fichas se guardan en este navegador. Exporta un JSON como respaldo.')}
            >
              <CircleHelp size={17} />
            </button>
          </div>
        </header>

        {tab === 'start' && (
          <section className="start-view">
            <div className="start-orb">
              <Sparkles size={34} />
            </div>
            <span className="eyebrow accent">BIENVENIDO AL TALLER</span>
            <h1>
              El siguiente universo
              <br />
              comienza contigo.
            </h1>
            <p>
              Empieza con una idea. Desarrolla tu lore, diseña personajes, organiza tus viñetas Genkō y crea ilustraciones con el motor visual del estudio.
            </p>
            <div className="start-actions">
              <button className="primary" onClick={startNewProject}>
                <Plus size={18} /> Crear mi manga
              </button>
              <button className="secondary" onClick={chooseExample}>
                <BookOpen size={18} /> Explorar proyecto de ejemplo
              </button>
            </div>
            <div className="start-steps">
              <span>01 IDEA</span>
              <ArrowRight size={17} />
              <span>02 LORE</span>
              <ArrowRight size={17} />
              <span>03 PERSONAJES</span>
              <ArrowRight size={17} />
              <span>04 GENKŌ & ILUSTRAR</span>
            </div>
          </section>
        )}

        {tab === 'settei' && (
          <section className="view">
            <div className="view-head">
              <div>
                <span className="eyebrow accent">01 / SETTEI HUB</span>
                <h1>Tu universo, tus reglas.</h1>
                <p>Construye la biblia de tu mundo. KAI te ayuda a ordenar las ideas; tú decides qué es canon.</p>
              </div>
              <div className={`canon-state ${project.worldLocked ? 'locked' : ''}`}>
                {project.worldLocked ? <Lock size={16} /> : <LockOpen size={16} />}{' '}
                {project.worldLocked ? 'CANON APROBADO' : 'EN DESARROLLO'}
              </div>
            </div>
            <div className="two-col">
              <div className="panel">
                <div className="panel-heading">
                  <Globe2 size={20} />
                  <strong>Biblia del universo</strong>
                </div>
                <label>
                  Título del manga
                  <input
                    disabled={project.worldLocked}
                    value={project.title}
                    onChange={(e) => updateProject({ title: e.target.value })}
                    placeholder="Mi primer manga"
                  />
                </label>
                <label>
                  Género
                  <input
                    disabled={project.worldLocked}
                    value={project.genre}
                    onChange={(e) => updateProject({ genre: e.target.value })}
                    placeholder="Fantasía, sci-fi..."
                  />
                </label>
                <label>
                  Premisa
                  <textarea
                    disabled={project.worldLocked}
                    rows={4}
                    value={project.premise}
                    onChange={(e) => updateProject({ premise: e.target.value })}
                    placeholder="Una historia sobre..."
                  />
                </label>
                <label>
                  Descripción del universo
                  <textarea
                    disabled={project.worldLocked}
                    rows={4}
                    value={project.world}
                    onChange={(e) => updateProject({ world: e.target.value })}
                    placeholder="¿Cómo se ve y funciona el mundo?"
                  />
                </label>
                <label>
                  Reglas inquebrantables
                  <textarea
                    disabled={project.worldLocked}
                    rows={4}
                    value={project.worldRules}
                    onChange={(e) => updateProject({ worldRules: e.target.value })}
                    placeholder="Define los límites, poderes y contradicciones prohibidas."
                  />
                </label>
                <button
                  className={project.worldLocked ? 'secondary' : 'primary'}
                  onClick={() => {
                    updateProject({ worldLocked: !project.worldLocked });
                    setToast(project.worldLocked ? 'Universo desbloqueado.' : 'Universo aprobado como canon.');
                  }}
                >
                  {project.worldLocked ? <LockOpen size={16} /> : <ShieldCheck size={16} />}{' '}
                  {project.worldLocked ? 'Desbloquear para editar' : 'Aprobar canon del universo'}
                </button>
              </div>
              <div className="right-stack">
                <div className="kai-panel">
                  <div className="kai-label">
                    <span className="kai-star">✦</span> KAI / NARRATIVE GUIDE
                  </div>
                  <h3>Hagamos que este mundo tenga sentido.</h3>
                  <p>
                    Una regla fuerte genera historias más interesantes. Identifica qué es posible, qué está prohibido y qué precio pagan los personajes.
                  </p>
                  <button
                    onClick={() =>
                      !project.worldLocked &&
                      updateProject({
                        worldRules: project.worldRules
                          ? project.worldRules + '\nCada poder tiene una consecuencia física o emocional verificable.'
                          : 'Cada poder tiene una consecuencia física o emocional verificable.',
                      })
                    }
                    disabled={project.worldLocked}
                  >
                    + Agregar regla sugerida
                  </button>
                  <span className="kai-note">Sugerencia guiada. La IA narrativa conversacional se conectará en otra fase.</span>
                </div>
                <div className="mini-panel">
                  <span className="eyebrow">CHECKLIST DEL UNIVERSO</span>
                  {[
                    ['Premisa definida', Boolean(project.premise.trim())],
                    ['Mundo descrito', Boolean(project.world.trim())],
                    ['Reglas de continuidad', Boolean(project.worldRules.trim())],
                    ['Canon aprobado', project.worldLocked],
                  ].map(([label, done]) => (
                    <div className="check-row" key={String(label)}>
                      <span className={done ? 'check-done' : 'check-empty'}>{done ? <Check size={12} /> : null}</span>
                      {label}
                    </div>
                  ))}
                </div>
                <button className="text-action" onClick={() => changeTab('characters')}>
                  Continuar a Personajes <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </section>
        )}

        {tab === 'characters' && (
          <section className="view">
            <div className="view-head">
              <div>
                <span className="eyebrow accent">02 / CHARACTER STUDIO</span>
                <h1>Personajes con identidad.</h1>
                <p>Construye fichas de continuidad. Una vez aprobadas, sus rasgos viajan al motor visual.</p>
              </div>
              <button className="primary" onClick={addCharacter}>
                <Plus size={17} /> Nuevo personaje
              </button>
            </div>
            <div className="character-layout">
              <div className="character-list">
                {project.characters.map((c) => (
                  <button
                    key={c.id}
                    className={`character-item ${selected?.id === c.id ? 'selected' : ''}`}
                    onClick={() => setSelectedId(c.id)}
                  >
                    <div className="ch-avatar">{c.name.slice(0, 1).toUpperCase()}</div>
                    <div>
                      <strong>{c.name}</strong>
                      <small>{c.role}</small>
                    </div>
                    {c.canonLocked ? <Lock size={13} /> : null}
                  </button>
                ))}
                {project.characters.length === 0 && (
                  <div className="empty-note">
                    Aún no tienes personajes.
                    <button className="subtle-action" onClick={addCharacter}>
                      Crear el primero
                    </button>
                  </div>
                )}
              </div>
              <div className="panel character-edit">
                {selected ? (
                  <>
                    <div className="panel-heading">
                      <Users size={19} />
                      <strong>Ficha de identidad</strong>
                      <span className={`status-dot ${selected.canonLocked ? 'approved' : ''}`}>
                        {selected.canonLocked ? 'Aprobado' : 'Borrador'}
                      </span>
                    </div>
                    {selected.canonLocked && (
                      <div className="locked-notice">
                        <Lock size={15} /> Identidad bloqueada: desbloquea para cambiar los atributos.
                      </div>
                    )}
                    <div className="fields-2">
                      <label>
                        Nombre
                        <input value={selected.name} disabled={selected.canonLocked} onChange={(e) => updateChar({ name: e.target.value })} />
                      </label>
                      <label>
                        Rol
                        <input value={selected.role} disabled={selected.canonLocked} onChange={(e) => updateChar({ role: e.target.value })} />
                      </label>
                    </div>
                    <label>
                      Edad
                      <input value={selected.age} disabled={selected.canonLocked} onChange={(e) => updateChar({ age: e.target.value })} />
                    </label>
                    <label>
                      Apariencia física
                      <textarea
                        rows={3}
                        value={selected.appearance}
                        disabled={selected.canonLocked}
                        onChange={(e) => updateChar({ appearance: e.target.value })}
                        placeholder="Cabello, rostro, ojos, cicatrices, complexión..."
                      />
                    </label>
                    <label>
                      Vestuario / rasgos únicos
                      <textarea
                        rows={2}
                        value={selected.wardrobe}
                        disabled={selected.canonLocked}
                        onChange={(e) => updateChar({ wardrobe: e.target.value })}
                      />
                    </label>
                    <div className="fields-2">
                      <label>
                        Personalidad
                        <textarea
                          rows={3}
                          value={selected.personality}
                          disabled={selected.canonLocked}
                          onChange={(e) => updateChar({ personality: e.target.value })}
                        />
                      </label>
                      <label>
                        Motivación
                        <textarea
                          rows={3}
                          value={selected.motivation}
                          disabled={selected.canonLocked}
                          onChange={(e) => updateChar({ motivation: e.target.value })}
                        />
                      </label>
                    </div>
                    <label>
                      Estilo visual preferido
                      <textarea
                        rows={2}
                        value={selected.visualStyle}
                        disabled={selected.canonLocked}
                        onChange={(e) => updateChar({ visualStyle: e.target.value })}
                      />
                    </label>
                    <div className="form-actions">
                      <button className={selected.canonLocked ? 'secondary' : 'primary'} onClick={toggleCharLock}>
                        {selected.canonLocked ? <LockOpen size={16} /> : <ShieldCheck size={16} />}{' '}
                        {selected.canonLocked ? 'Desbloquear ficha' : 'Aprobar y bloquear identidad'}
                      </button>
                      <button className="secondary" onClick={() => changeTab('image')}>
                        <ImagePlus size={16} /> Ilustrar personaje
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="empty-note">Selecciona o crea un personaje.</div>
                )}
              </div>
              <div className="right-stack">
                <div className="mini-panel">
                  <span className="eyebrow">CANON INSPECTOR</span>
                  <div className="score">{canonPct}%</div>
                  <div className="progress-track">
                    <span style={{ width: `${canonPct}%` }} />
                  </div>
                  <p>Campos esenciales de identidad completados.</p>
                  <span className="helper">
                    Una ficha completa mejora las instrucciones, pero no garantiza fidelidad visual perfecta. Usa siempre imágenes de referencia aprobadas.
                  </span>
                </div>
                <div className="kai-panel">
                  <div className="kai-label">
                    <span className="kai-star">✦</span> KAI / CHARACTER GUIDE
                  </div>
                  <p>
                    Para mejorar la continuidad, define los rasgos que nunca deben variar: color y corte del pelo, forma del rostro, marcas, accesorios y ropa característica.
                  </p>
                  <button
                    onClick={() => {
                      if (selected && !selected.canonLocked)
                        updateChar({
                          appearance: selected.appearance + '\nRasgos fijos: proporciones faciales, peinado y marcas distintivas.',
                        });
                    }}
                    disabled={!selected || selected.canonLocked}
                  >
                    + Añadir recordatorio de identidad
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === 'image' && (
          <section className="view">
            <div className="view-head">
              <div>
                <span className="eyebrow accent">03 / VISUAL ENGINE</span>
                <h1>De la ficha a la imagen.</h1>
                <p>Genera ilustraciones originales con OpenAI, Gemini o proxy visual del servidor y utiliza referencias para mantener la identidad de tus personajes.</p>
              </div>
              <div className="api-marker">
                <span /> MOTOR VISUAL HÍBRIDO
              </div>
            </div>
            <div className="image-layout">
              <div className="panel">
                <div className="panel-heading">
                  <WandSparkles size={19} />
                  <strong>Generador visual</strong>
                </div>
                <label>
                  Personaje
                  <select
                    value={selected?.id || ''}
                    onChange={(e) => {
                      setSelectedId(e.target.value);
                      setGeneratedImage(null);
                      setReference(null);
                    }}
                  >
                    {project.characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tipo de imagen
                  <select value={imageMode} onChange={(e) => setImageMode(e.target.value)}>
                    {IMAGE_MODES.map((m) => (
                      <option value={m.id} key={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Estilo artístico
                  <select value={visualStyle} onChange={(e) => setVisualStyle(e.target.value)}>
                    {MANGA_STYLES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Ajustes que quieres hacer
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ejemplo: Iluminación nocturna, postura de combate, ángulo tres cuartos..."
                  />
                </label>
                <div className="file-box">
                  <label className="file-label">
                    <Upload size={18} /> Subir imagen de referencia
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setReference(e.target.files?.[0] ?? null)} />
                  </label>
                  <small>{reference ? `Referencia: ${reference.name}` : 'Opcional · PNG / JPG / WebP · Máx. 6 MB'}</small>
                  {reference && (
                    <button className="ref-clear" onClick={() => setReference(null)}>
                      Quitar referencia
                    </button>
                  )}
                </div>
                {generatedImage && (
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={useGeneratedAsReference}
                      onChange={(e) => setUseGeneratedAsReference(e.target.checked)}
                    />{' '}
                    Usar la última imagen como referencia para la próxima generación
                  </label>
                )}
                <div className="access-box">
                  <div className="access-title">
                    <Lock size={15} /> Acceso al motor visual
                  </div>
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder="Introduce tu código de Studio"
                    value={accessToken}
                    onChange={(e) => setToken(e.target.value)}
                  />
                  <small>Las claves de API permanecen en el servidor. Este código privado autoriza la prueba del prototipo.</small>
                </div>
                {error && (
                  <div className="error" role="alert">
                    {error}
                  </div>
                )}
                <button
                  className="primary wide"
                  onClick={generateImage}
                  disabled={isGenerating || !selected || !accessToken || !selected.appearance.trim()}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="spin" size={18} /> Generando ilustración...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} /> {reference ? 'Editar con referencia' : 'Generar imagen'}
                    </>
                  )}
                </button>
                <p className="microcopy">Revisa calidad y derechos antes de publicar cada ilustración generada.</p>
              </div>
              <div className="image-result">
                <div className="preview-head">
                  <strong>Vista previa</strong>
                  <span>768×1152 / 1024×1536 px</span>
                </div>
                <div className="image-canvas">
                  {generatedImage ? (
                    <img src={generatedImage} alt={`Ilustración generada de ${selected?.name || 'personaje'}`} />
                  ) : (
                    <div className="placeholder-canvas">
                      <div className="placeholder-emblem">✦</div>
                      <h3>Tu personaje cobrará vida aquí.</h3>
                      <p>Selecciona un personaje, define el estilo y genera su primera ilustración.</p>
                    </div>
                  )}
                </div>
                <div className="preview-actions">
                  <button className="secondary" disabled={!generatedImage} onClick={downloadImage}>
                    <Download size={16} /> Descargar PNG
                  </button>
                  <button
                    className="secondary"
                    disabled={!generatedImage}
                    onClick={() => {
                      setGeneratedImage(null);
                      setUseGeneratedAsReference(false);
                    }}
                  >
                    <RefreshCw size={16} /> Limpiar
                  </button>
                </div>
                <p className="microcopy">Las imágenes no se guardan permanentemente en esta versión. Descárgalas cuando termines.</p>
              </div>
            </div>
          </section>
        )}

        {tab === 'genko' && (
          <section className="view">
            <div className="view-head">
              <div>
                <span className="eyebrow accent">04 / GENKŌ &amp; TANKŌBON</span>
                <h1>Viñetas S0–S5 y Preprensa.</h1>
                <p>
                  Controla la máquina de estados de tus 4 Komas, calcula el lomo editorial de tu tomo y exporta el snapshot relacional compatible con Supabase.
                </p>
              </div>
              <div className={`canon-state ${lockedKomasCount === komas.length ? 'locked' : ''}`}>
                {lockedKomasCount === komas.length ? <Lock size={16} /> : <Layers size={16} />}{' '}
                {lockedKomasCount}/{komas.length} KOMAS LOCKED
              </div>
            </div>

            <div className="genko-layout">
              <div className="panel">
                <div className="panel-heading">
                  <Layers size={19} />
                  <strong>Koma State Machine (Página activa)</strong>
                  <span className={`status-dot ${activeKoma.state === 'LOCKED' ? 'approved' : ''}`}>{activeKoma.state}</span>
                </div>

                <div className="koma-tabs" role="tablist" aria-label="Selector de viñetas">
                  {komas.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      role="tab"
                      aria-selected={activeKoma.panelIndex === k.panelIndex}
                      className={`koma-tab ${activeKoma.panelIndex === k.panelIndex ? 'active' : ''}`}
                      onClick={() => setSelectedKomaIndex(k.panelIndex)}
                    >
                      <span className="koma-tab-top">
                        <strong>Koma #{k.panelIndex}</strong>
                        {k.state === 'LOCKED' && <Lock size={12} />}
                      </span>
                      <small>
                        {k.state} · {k.route.toUpperCase()}
                      </small>
                    </button>
                  ))}
                </div>

                {activeKoma.state === 'LOCKED' && (
                  <div className="locked-notice">
                    <Lock size={15} /> Viñeta bloqueada para preprensa (S5 LOCKED). Cambia el estado si necesitas reabrir edición.
                  </div>
                )}

                <div className="fields-2">
                  <label>
                    Estado Koma (S0–S5)
                    <select
                      value={activeKoma.state}
                      onChange={(e) => updateKoma(activeKoma.panelIndex, { state: e.target.value as KomaState })}
                    >
                      {KOMA_STATES.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.step} · {st.id} ({st.label})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Ruta de producción
                    <select
                      value={activeKoma.route}
                      disabled={activeKoma.state === 'LOCKED'}
                      onChange={(e) => updateKoma(activeKoma.panelIndex, { route: e.target.value as ProductionRoute })}
                    >
                      <option value="ia">IA (@Personaje + KAI)</option>
                      <option value="manual">Manual (G-Pen / Maru-Pen)</option>
                    </select>
                  </label>
                </div>

                <div className="koma-state-bar" aria-label="Progreso de estados del koma">
                  {KOMA_STATES.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      className={`koma-pill ${activeKoma.state === st.id ? 'active' : ''}`}
                      onClick={() => updateKoma(activeKoma.panelIndex, { state: st.id })}
                    >
                      {st.step} {st.id}
                    </button>
                  ))}
                </div>

                <div className="fields-2">
                  <label>
                    Plano / Ángulo de cámara
                    <input
                      value={activeKoma.cameraAngle}
                      disabled={activeKoma.state === 'LOCKED'}
                      onChange={(e) => updateKoma(activeKoma.panelIndex, { cameraAngle: e.target.value })}
                      placeholder="Plano medio contrapicado, tres cuartos..."
                    />
                  </label>
                  <label>
                    Trama L1 (Screentone)
                    <select
                      value={activeKoma.screentoneL1}
                      disabled={activeKoma.state === 'LOCKED'}
                      onChange={(e) => updateKoma(activeKoma.panelIndex, { screentoneL1: e.target.value })}
                    >
                      {SCREENTONE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  Acción y composición (Prompt de viñeta)
                  <textarea
                    rows={3}
                    value={activeKoma.actionPrompt}
                    disabled={activeKoma.state === 'LOCKED'}
                    onChange={(e) => updateKoma(activeKoma.panelIndex, { actionPrompt: e.target.value })}
                    placeholder="Describe la acción del personaje, encuadre e iluminación..."
                  />
                </label>

                <div className="fields-2">
                  <label>
                    Diálogo L5 (Globo dentro de Naiwaku)
                    <input
                      value={activeKoma.dialogueL5}
                      disabled={activeKoma.state === 'LOCKED'}
                      onChange={(e) => updateKoma(activeKoma.panelIndex, { dialogueL5: e.target.value })}
                      placeholder="Texto del globo principal..."
                    />
                  </label>
                  <label>
                    SFX / Kakimoji L4
                    <input
                      value={activeKoma.sfxL4}
                      disabled={activeKoma.state === 'LOCKED'}
                      onChange={(e) => updateKoma(activeKoma.panelIndex, { sfxL4: e.target.value })}
                      placeholder="ゴゴゴ, バッ, ドキッ..."
                    />
                  </label>
                </div>

                <div className="form-actions">
                  <button type="button" className="primary" onClick={() => sendKomaToImageTab(activeKoma)}>
                    <Send size={16} /> Enviar viñeta a Generar imágenes
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      updateKoma(activeKoma.panelIndex, { state: activeKoma.state === 'LOCKED' ? 'SHIAGE' : 'LOCKED' })
                    }
                  >
                    {activeKoma.state === 'LOCKED' ? <LockOpen size={16} /> : <Lock size={16} />}
                    {activeKoma.state === 'LOCKED' ? 'Desbloquear Koma' : 'Marcar Koma LOCKED'}
                  </button>
                </div>
              </div>

              <div className="right-stack">
                <div className="panel">
                  <div className="panel-heading">
                    <Ruler size={19} />
                    <strong>Calculadora de Lomo y Preprensa Tankōbon</strong>
                  </div>
                  <div className="spine-readout">
                    <span>ANCHO DE LOMO CALCULADO</span>
                    <strong>{spineWidthMm} mm</strong>
                    <small>Fórmula: (páginas / 2) × grosor papel</small>
                  </div>
                  <div className="fields-2">
                    <label>
                      Páginas del tomo
                      <input
                        type="number"
                        min={2}
                        step={2}
                        value={totalPages}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          updateProject({ totalPages: Number.isFinite(v) && v >= 0 ? v : 0 });
                        }}
                      />
                    </label>
                    <label>
                      Grosor de papel (mm)
                      <input
                        type="number"
                        min={0.05}
                        max={0.5}
                        step={0.01}
                        value={paperThicknessMm}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          updateProject({ paperThicknessMm: Number.isFinite(v) && v >= 0 ? v : 0 });
                        }}
                      />
                    </label>
                  </div>
                  <div className="prepress-grid">
                    <div className="prepress-chip">
                      <span>SANGRADO</span>
                      <strong>3.5 mm</strong>
                    </div>
                    <div className="prepress-chip">
                      <span>RESOLUCIÓN</span>
                      <strong>600 DPI</strong>
                    </div>
                    <div className="prepress-chip">
                      <span>KOMAS LOCKED</span>
                      <strong>
                        {lockedKomasCount} / {komas.length}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mini-panel genko-export-card">
                  <span className="eyebrow">SYNC &amp; CABINA HTML</span>
                  <h3>Snapshot Supabase JSONB</h3>
                  <p>
                    Descarga el paquete relacional exacto para <code>profiles</code>, <code>projects</code>, <code>settei_bibles</code>,{' '}
                    <code>pages</code> y <code>komas</code> con sus 7 capas <code>L0..L6</code>.
                  </p>
                  <div className="genko-actions">
                    <button
                      type="button"
                      className="primary wide"
                      onClick={() => {
                        exportSupabaseSnapshot(project);
                        setToast('Snapshot Supabase JSONB (L0–L6) exportado.');
                      }}
                    >
                      <Database size={16} /> Exportar Snapshot Supabase JSONB
                    </button>
                    <a href="/stitch-studio/index.html" className="secondary wide">
                      <ExternalLink size={16} /> Abrir Cabina Genkō HTML completa
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === 'project' && (
          <section className="view">
            <div className="view-head">
              <div>
                <span className="eyebrow accent">05 / PROJECT CONTROL</span>
                <h1>Tu historia tiene estructura.</h1>
                <p>Revisa el estado del proyecto y guarda una copia de tus datos antes de continuar.</p>
              </div>
            </div>
            <div className="project-grid">
              <div className="stat-card">
                <Globe2 />
                <span>UNIVERSO</span>
                <strong>{project.worldLocked ? 'Aprobado' : 'Borrador'}</strong>
              </div>
              <div className="stat-card">
                <Users />
                <span>PERSONAJES</span>
                <strong>{project.characters.length}</strong>
              </div>
              <div className="stat-card">
                <ShieldCheck />
                <span>IDENTIDADES BLOQUEADAS</span>
                <strong>{project.characters.filter((c) => c.canonLocked).length}</strong>
              </div>
            </div>
            <div className="panel project-export">
              <div>
                <h2>Respaldo del proyecto</h2>
                <p>Exporta tu historia en JSON para conservar lore, personajes, viñetas Genkō y decisiones del canon. No incluye las ilustraciones descargadas.</p>
              </div>
              <button className="primary" onClick={() => exportProject(project)}>
                <FileJson size={18} /> Exportar proyecto JSON
              </button>
              <label className="import-button">
                <Upload size={16} /> Importar proyecto JSON
                <input type="file" accept=".json,application/json" onChange={importJSON} />
              </label>
              {importError && <div className="error">{importError}</div>}
            </div>
            <div className="roadmap-note">
              <FileText size={22} />
              <div>
                <h3>Próxima evolución</h3>
                <p>
                  Genkō &amp; Tankōbon ya están integrados en fase interactiva local. La sincronización directa con Auth/Storage en la nube, exportación PDF/KDP y KAI conversacional pertenecen al roadmap de producción.
                </p>
              </div>
            </div>
            <button className="secondary" onClick={() => setTab('start')}>
              Crear otro proyecto <ArrowRight size={16} />
            </button>
          </section>
        )}
      </main>
      {toast && (
        <div className="studio-toast" role="status">
          <Check size={16} />
          {toast}
          <button onClick={() => setToast('')} aria-label="Cerrar aviso">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
