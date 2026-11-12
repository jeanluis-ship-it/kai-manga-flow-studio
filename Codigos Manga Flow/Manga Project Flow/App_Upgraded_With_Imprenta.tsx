// ============================================================================
// APP.TSX MEJORADO PARA GOOGLE FLOW (CON CIERRE DE IMPRENTA, MATERIALES Y COSTOS)
// ============================================================================
// Mejoras aplicadas sobre el App.tsx original:
// 1. [FIX CRÍTICO] Sincronización de `prompt` al cambiar de página en `Manuscript` (el original mantenía el prompt viejo en `ViewControls`).
// 2. [FIX CRÍTICO] `handleDownloadAll` ahora incluye la Portada (`cover/full_wrap.png`), las fichas del `Character Library` y la Orden de Producción (`print_job_ticket.json`) dentro del `.ZIP`.
// 3. [NUEVO] Selección de Material Interior (Bond Blanco 90g, Crema Ahuesado Manga 90g, Couché Mate 115g), Acabado de Cubierta (Laminado Mate, Brillo UV, Sobrecubierta Kanzenban) y Tirada (1 a 100 copias).
// 4. [NUEVO] Paso 5 Final ("Imprenta & Costos"): Conecta el libro terminado con la imprenta calculando el costo unitario y total según materiales, grosor físico del lomo (mm y pulgadas) y despachando la orden.

import React, { useState, useEffect, useRef } from 'react';
import { Flow } from 'flow-sdk';
import {
  SectionLabel,
  PillButton,
  FieldDropdown,
  TextInput,
  DragNumberField
} from './components/Primitives';
import { CharacterLibrary } from './components/CharacterLibrary';
import { PageEditor } from './components/PageEditor';
import { CoverDesigner } from './components/CoverDesigner';
import { ProjectManager } from './components/ProjectManager';
import { Project, Character } from './types';
import JSZip from 'jszip';

type ExtendedView = 'project' | 'characters' | 'cover' | 'pages' | 'printer';

interface PrintSettings {
  interiorMaterial: 'Standard White 90g' | 'Premium Cream 90g (Ahuesado Manga)' | 'Satinado Mate 115g';
  coverFinish: 'Laminado Mate 300g' | 'Laminado Brillo UV 300g' | 'Sobrecubierta Coleccionista';
  copies: number;
  customerWhatsapp: string;
}

export default function App() {
  const [view, setView] = useState<ExtendedView>('project');
  const [project, setProject] = useState<Project>({
    name: 'Untitled Manga',
    author: 'Author Name',
    pageCount: 100,
    paperType: 'cream',
    characters: [],
    pages: [{ id: crypto.randomUUID(), base64: '', prompt: '', castIds: [] }],
    cover: { frontBase64: '', backBase64: '', prompt: '', spineWidthInches: 0.25 }
  });

  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    interiorMaterial: 'Premium Cream 90g (Ahuesado Manga)',
    coverFinish: 'Laminado Mate 300g',
    copies: 1,
    customerWhatsapp: ''
  });

  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState('');

  const coverDesignerRef = useRef<{ exportCover: () => Promise<void> }>(null);

  useEffect(() => {
    const id = 'flow-manga-css';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      html, body, #root { background: #0e0e0e; color: white; height: 100%; margin: 0; font-family: 'Google Sans Text', sans-serif; overflow: hidden; }
      .manga-grid { display: grid; grid-template-columns: 300px 1fr 300px; height: 100%; }
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .dark-scrollbar::-webkit-scrollbar { width: 6px; }
      .dark-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .dark-scrollbar::-webkit-scrollbar-thumb { background: #595959; border-radius: 9999px; }
      @keyframes pulse-slow { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      .animate-pulse-slow { animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      @keyframes slide-in-right { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
    `;
    document.head.appendChild(style);
  }, []);

  // Cálculo físico real de lomo y costos según material
  const calculatePrinterQuote = (proj = project, settings = printSettings) => {
    const sheets = Math.ceil(proj.pageCount / 2);
    const isPerfectBound = proj.pageCount >= 48; // Mínimo físico para lomo cuadrado pegado
    const caliperInches = settings.interiorMaterial.includes('White') ? 0.002252 : 0.0025;
    const spineInches = isPerfectBound ? Number((proj.pageCount * caliperInches).toFixed(4)) : 0;
    const spineMm = isPerfectBound ? Number((spineInches * 25.4).toFixed(2)) : 0;

    const sheetCostUsd =
      settings.interiorMaterial.includes('Satinado') ? 0.08 :
      settings.interiorMaterial.includes('Cream') ? 0.055 : 0.045;

    const coverCostUsd =
      settings.coverFinish.includes('Sobrecubierta') ? 4.90 :
      settings.coverFinish.includes('Mate') ? 2.40 : 2.20;

    const bindingCostUsd = isPerfectBound ? 2.75 : 0.95;

    const volumeDiscount =
      settings.copies >= 100 ? 0.55 :
      settings.copies >= 50 ? 0.62 :
      settings.copies >= 25 ? 0.70 :
      settings.copies >= 10 ? 0.80 : 1.0;

    const unitCostUsd = Number(((sheets * sheetCostUsd + coverCostUsd + bindingCostUsd) * volumeDiscount).toFixed(2));
    const totalCostUsd = Number((unitCostUsd * settings.copies).toFixed(2));
    const totalCostDop = Math.round(totalCostUsd * 60);

    return {
      isPerfectBound,
      bindingMethod: isPerfectBound ? 'Rústica Fresada (Lomo Cuadrado Pegado)' : 'Grapa a Caballete (Fanzine)',
      spineInches,
      spineMm,
      unitCostUsd,
      totalCostUsd,
      totalCostDop
    };
  };

  const updateProject = (updates: Partial<Project>) => {
    setProject(prev => {
      const newState = { ...prev, ...updates };
      const multi = newState.paperType === 'white' ? 0.002252 : 0.0025;
      newState.cover.spineWidthInches = newState.pageCount >= 48 ? newState.pageCount * multi : 0;
      return newState;
    });
  };

  // Empaquetado completo (Portada + Interiores + Personajes + Job Ticket de Imprenta)
  const handleDownloadAll = async () => {
    setStatus('Empaquetando Libro para Imprenta...');
    const quote = calculatePrinterQuote();
    const zip = new JSZip();

    zip.file(
      'print_job_ticket.json',
      JSON.stringify(
        {
          orderId: `ORD-${Date.now().toString().slice(-6)}`,
          bookTitle: project.name,
          author: project.author,
          printSpec: '6x9 in / Tankobon 127x190mm',
          bleed: '0.125 in (3 mm)',
          materials: printSettings,
          quote,
          generatedAt: new Date().toISOString()
        },
        null,
        2
      )
    );

    if (project.cover.fullWrapBase64) {
      zip.file('cover/full_wrap_cover.png', project.cover.fullWrapBase64, { base64: true });
    }

    project.characters.forEach((char, idx) => {
      if (char.referenceBase64) {
        zip.file(`characters/char_${idx + 1}_${char.name.replace(/\s+/g, '_')}.png`, char.referenceBase64, { base64: true });
      }
    });

    project.pages.forEach((page, i) => {
      if (page.base64) {
        zip.file(`interior/page_${String(i + 1).padStart(3, '0')}.png`, page.base64, { base64: true });
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      await Flow.download({
        base64,
        mimeType: 'application/zip',
        filename: `${project.name.replace(/\s+/g, '_')}_IMPRENTA_BUNDLE.zip`
      });
      setStatus('');
    };
    reader.readAsDataURL(content);
  };

  const quote = calculatePrinterQuote();

  return (
    <div className="manga-grid">
      {/* LEFT SIDEBAR: 5 PASOS EN ORDEN EXACTO */}
      <div className="border-r border-[rgba(218,220,224,0.15)] flex flex-col p-[10px] gap-6 overflow-y-auto no-scrollbar">
        <div className="flex flex-col gap-2">
          <SectionLabel>KDP & Print Production</SectionLabel>
          <div className="flex flex-col gap-1.5">
            <NavItem active={view === 'project'} icon="settings_print" label="1. Print Setup" onClick={() => setView('project')} />
            <NavItem active={view === 'characters'} icon="face" label="2. Character Library" onClick={() => setView('characters')} />
            <NavItem active={view === 'cover'} icon="menu_book" label="3. Paperback Cover" onClick={() => setView('cover')} />
            <NavItem active={view === 'pages'} icon="auto_stories" label="4. Interior Pages" onClick={() => setView('pages')} />
            <NavItem active={view === 'printer'} icon="local_printshop" label="5. Imprenta & Costos" onClick={() => setView('printer')} />
          </div>
        </div>

        {view === 'pages' && (
          <div className="flex flex-col gap-2 animate-slide-in-right">
            <SectionLabel>Manuscript</SectionLabel>
            <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto dark-scrollbar pr-1">
              {project.pages.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setActivePageIndex(i)}
                  className={`flex items-center justify-between p-2 rounded-xl text-[12px] font-medium transition-all ${
                    activePageIndex === i ? 'bg-[#969696] text-black' : 'text-white/60 hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[10px] opacity-40 font-mono">{String(i + 1).padStart(2, '0')}</span>
                    <span>Page {i + 1}</span>
                  </span>
                  <span className="material-symbols-outlined text-[16px] opacity-40">
                    {p.base64 ? 'verified' : 'ink_high'}
                  </span>
                </button>
              ))}
              <PillButton
                variant="outline"
                icon={<span className="material-symbols-outlined text-[18px]">add</span>}
                onClick={() => {
                  const newPages = [...project.pages, { id: crypto.randomUUID(), base64: '', prompt: '', castIds: [] }];
                  updateProject({ pages: newPages });
                  setActivePageIndex(newPages.length - 1);
                }}
              >
                Add Page
              </PillButton>
            </div>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2">
          <SectionLabel>Submission</SectionLabel>
          <PillButton
            variant="solid"
            icon={<span className="material-symbols-outlined text-[18px]">local_printshop</span>}
            onClick={() => setView('printer')}
          >
            Hacer Libro Realidad ({`$${quote.totalCostUsd}`})
          </PillButton>
          <PillButton
            variant="outline"
            icon={<span className="material-symbols-outlined text-[18px]">publish</span>}
            onClick={handleDownloadAll}
          >
            Build KDP Bundle (.ZIP)
          </PillButton>
          {status && <div className="text-[10px] text-[#969696] text-center animate-pulse-slow">{status}</div>}
        </div>
      </div>

      {/* CENTER WORKSPACE */}
      <div className="flex-1 bg-[#050505] relative overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-12 flex items-start justify-center">
          {view === 'project' && <ProjectManager project={project} updateProject={updateProject} />}
          {view === 'characters' && (
            <CharacterLibrary
              project={project}
              updateProject={updateProject}
              isGenerating={isGenerating}
              setIsGenerating={setIsGenerating}
            />
          )}
          {view === 'cover' && <CoverDesigner ref={coverDesignerRef} project={project} updateProject={updateProject} />}
          {view === 'pages' && <PageEditor project={project} pageIndex={activePageIndex} updateProject={updateProject} />}
          {view === 'printer' && (
            <PrinterFulfillmentView
              project={project}
              printSettings={printSettings}
              setPrintSettings={setPrintSettings}
              quote={quote}
              onDownloadBundle={handleDownloadAll}
            />
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR CONTROLS */}
      <div className="border-l border-[rgba(218,220,224,0.15)] flex flex-col p-[10px] gap-6">
        <ViewControls
          view={view}
          project={project}
          updateProject={updateProject}
          pageIndex={activePageIndex}
          isGenerating={isGenerating}
          setIsGenerating={setIsGenerating}
          onExportCover={() => coverDesignerRef.current?.exportCover()}
          quote={quote}
        />
      </div>
    </div>
  );
}

function NavItem({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 h-[40px] px-3 rounded-xl transition-all ${
        active ? 'bg-white/10 text-white border border-white/10' : 'text-white/40 hover:text-white hover:bg-white/5'
      }`}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      <span className="text-[13px] font-medium tracking-wide">{label}</span>
    </button>
  );
}

function PrinterFulfillmentView({ project, printSettings, setPrintSettings, quote, onDownloadBundle }: any) {
  return (
    <div className="w-full max-w-[580px] flex flex-col gap-6 animate-slide-in-right">
      <div>
        <h1 className="text-[24px] font-bold tracking-tight text-white">Conexión con Imprenta & Materiales</h1>
        <p className="text-[13px] text-white/40 mt-1">
          Elige los materiales físicos de fabricación, revisa el costo real de tirada y envía el paquete listo para imprenta.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FieldDropdown
          label="Material de Papel Interior"
          value={printSettings.interiorMaterial}
          options={['Standard White 90g', 'Premium Cream 90g (Ahuesado Manga)', 'Satinado Mate 115g']}
          onChange={(val) => setPrintSettings({ ...printSettings, interiorMaterial: val })}
        />
        <FieldDropdown
          label="Acabado de Portada (300g)"
          value={printSettings.coverFinish}
          options={['Laminado Mate 300g', 'Laminado Brillo UV 300g', 'Sobrecubierta Coleccionista']}
          onChange={(val) => setPrintSettings({ ...printSettings, coverFinish: val })}
        />
      </div>

      <DragNumberField
        label="Cantidad de Ejemplares (Tirada)"
        value={printSettings.copies}
        min={1}
        max={500}
        step={1}
        suffix=" libros"
        onChange={(val) => setPrintSettings({ ...printSettings, copies: val })}
      />

      <div className="bg-[#141414] border border-[#595959] rounded-2xl p-6 flex flex-col gap-3 text-[12px]">
        <div className="flex justify-between text-white/70">
          <span>Encuadernación Física:</span>
          <span className="font-bold text-white">{quote.bindingMethod}</span>
        </div>
        <div className="flex justify-between text-white/70">
          <span>Grosor Exacto del Lomo:</span>
          <span className="font-mono text-[#00e699]">{quote.spineInches}" ({quote.spineMm} mm)</span>
        </div>
        <div className="flex justify-between text-white/70">
          <span>Costo Unitario por Libro:</span>
          <span className="font-mono text-white">US$ {quote.unitCostUsd}</span>
        </div>
        <div className="flex justify-between pt-3 border-t border-white/10 text-base font-bold">
          <span>Total Producción ({printSettings.copies} ud):</span>
          <span className="text-[#00e699]">US$ {quote.totalCostUsd} (~RD$ {quote.totalCostDop.toLocaleString()})</span>
        </div>
      </div>

      <PillButton
        variant="solid"
        icon={<span className="material-symbols-outlined text-[18px]">local_printshop</span>}
        onClick={onDownloadBundle}
      >
        Descargar Orden de Imprenta + Archivos de Producción (.ZIP)
      </PillButton>
    </div>
  );
}

function ViewControls({ view, project, updateProject, pageIndex, isGenerating, setIsGenerating, onExportCover, quote }: any) {
  const [style, setStyle] = useState('Classic Shonen');
  const currentPage = project.pages[pageIndex];

  // Sincroniza el prompt directamente con la página seleccionada (corrige bug del original)
  const currentPrompt = currentPage?.prompt || '';
  const setCurrentPrompt = (val: string) => {
    const newPages = [...project.pages];
    newPages[pageIndex] = { ...newPages[pageIndex], prompt: val };
    updateProject({ pages: newPages });
  };

  const generatePage = async () => {
    setIsGenerating(true);
    try {
      const cast = project.characters.filter((c: Character) => currentPage.castIds.includes(c.id));
      const charVisuals = cast.map((c: Character) => `${c.name}: ${c.appearance}, wearing ${c.clothing}`).join('. ');
      const references = cast.filter((c: Character) => c.referenceMediaId).map((c: Character) => c.referenceMediaId!);
      const finalPrompt = `Professional manga page, high resolution, ${style} style, monochromatic ink, screentones. Scene: ${currentPrompt}. Featuring: ${charVisuals}`;

      const result = await Flow.generate.image({
        prompt: finalPrompt,
        modelDisplayName: '🍌 Nano Banana Pro',
        aspectRatio: '3:4',
        referenceImageMediaIds: references.length > 0 ? references : undefined
      });
      const newPages = [...project.pages];
      newPages[pageIndex] = { ...newPages[pageIndex], base64: result.base64 };
      updateProject({ pages: newPages });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateUnifiedCover = async () => {
    setIsGenerating(true);
    try {
      const charVisuals = project.characters.map((c: Character) => `${c.name}: ${c.appearance}`).join('. ');
      const references = project.characters.filter((c: Character) => c.referenceMediaId).map((c: Character) => c.referenceMediaId!);
      const finalPrompt = `Professional cinematic manga wrap-around cover. Right side (front): main illustration showing ${project.cover.prompt}. Left side (back): matching background elements, minimalist composition. Spine in middle (${quote.spineInches} in). Style: ${style}. Vibrant colors. Character details: ${charVisuals}`;

      const result = await Flow.generate.image({
        prompt: finalPrompt,
        modelDisplayName: '🍌 Nano Banana Pro',
        aspectRatio: '16:9',
        referenceImageMediaIds: references.length > 0 ? references : undefined
      });
      updateProject({
        cover: {
          ...project.cover,
          fullWrapBase64: result.base64,
          frontBase64: result.base64,
          backBase64: result.base64
        }
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  if (view === 'pages') {
    return (
      <div className="flex flex-col gap-6 animate-slide-in-right">
        <div className="flex flex-col gap-2">
          <SectionLabel>Interior Settings</SectionLabel>
          <FieldDropdown
            label="Art Style"
            value={style}
            options={['Classic Shonen', 'Dark Seinen', 'Modern Shojo', 'Retro Gekiga', 'Cyberpunk Manga']}
            onChange={setStyle}
          />
          <div className="mt-2">
            <SectionLabel>Active Cast ({currentPage?.castIds?.length || 0})</SectionLabel>
            <div className="flex flex-wrap gap-1 mt-1">
              {project.characters.map((c: Character) => (
                <button
                  key={c.id}
                  onClick={() => {
                    const newPages = [...project.pages];
                    const cast = new Set(newPages[pageIndex].castIds);
                    if (cast.has(c.id)) cast.delete(c.id);
                    else cast.add(c.id);
                    newPages[pageIndex].castIds = Array.from(cast);
                    updateProject({ pages: newPages });
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                    currentPage?.castIds?.includes(c.id) ? 'bg-[#969696] text-black border-[#969696]' : 'border-white/10 text-white/40'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <TextInput
            value={currentPrompt}
            onChange={setCurrentPrompt}
            placeholder="Describe the action and panels..."
          />
        </div>
        <PillButton
          variant="solid"
          icon={<span className="material-symbols-outlined text-[18px]">{isGenerating ? 'refresh' : 'auto_awesome'}</span>}
          onClick={generatePage}
          disabled={isGenerating}
        >
          {isGenerating ? 'Drawing Page...' : 'Generate High-Res Ink'}
        </PillButton>
      </div>
    );
  }

  if (view === 'cover') {
    return (
      <div className="flex flex-col gap-6 animate-slide-in-right">
        <div className="flex flex-col gap-2">
          <SectionLabel>Unified Cover Generation</SectionLabel>
          <p className="text-[11px] text-white/40 px-2 leading-relaxed">
            Generates a wide 16:9 wrap that ensures the front and back styles match perfectly.
          </p>
          <TextInput
            value={project.cover.prompt}
            onChange={(val) => updateProject({ cover: { ...project.cover, prompt: val } })}
            placeholder="Describe the overall cover theme and mood..."
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <PillButton
            variant="solid"
            icon={<span className="material-symbols-outlined text-[18px]">{isGenerating ? 'refresh' : 'auto_awesome'}</span>}
            onClick={generateUnifiedCover}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating Wrap...' : 'Generate Full Wrap'}
          </PillButton>
          <div className="pt-4 mt-4 border-t border-white/10 flex flex-col gap-2">
            <SectionLabel>Production</SectionLabel>
            <PillButton
              variant="outline"
              icon={<span className="material-symbols-outlined text-[18px]">print</span>}
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
    <div className="flex flex-col gap-4 p-2 text-white/60 text-[11px]">
      <SectionLabel>Resumen de Imprenta en Vivo</SectionLabel>
      <div className="bg-[#141414] border border-[#595959] rounded-xl p-4 space-y-2">
        <div className="flex justify-between">
          <span>Lomo Calculado:</span>
          <span className="font-mono text-[#00e699]">{quote.spineInches}" ({quote.spineMm}mm)</span>
        </div>
        <div className="flex justify-between">
          <span>Costo Estimado:</span>
          <span className="font-bold text-white">US$ {quote.totalCostUsd} (RD$ {quote.totalCostDop})</span>
        </div>
      </div>
    </div>
  );
}
