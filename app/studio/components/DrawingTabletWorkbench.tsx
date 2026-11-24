'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Download,
  Eraser,
  ImagePlus,
  Layers,
  PenTool,
  RefreshCw,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { KAI_IMAGE_MODEL_DEFAULT } from '@/lib/kai/studioCanvas';
import type { PlanTier } from '@/lib/plans/quotas';
import { Flow, QuotaExceededError } from '../flow-sdk';
import {
  normalizeTagHandle,
  toDataImageSrc,
  type Character,
  type KomaState,
  type Project,
} from '../types';
import { PillButton, SectionLabel } from './Primitives';
import './DrawingTabletWorkbench.css';

type BrushId = 'nemu_blue' | 'g_pen' | 'maru_pen' | 'akai_crimson' | 'eraser';
type ApplyDestination = 'koma' | 'settei' | 'cover';

interface BrushPreset {
  id: BrushId;
  label: string;
  color: string;
  minFactor: number;
  maxFactor: number;
  alpha: number;
  isEraser?: boolean;
}

const BRUSHES: readonly BrushPreset[] = [
  {
    id: 'nemu_blue',
    label: 'Lápiz Nemu (#00AEEF)',
    color: '#00aeef',
    minFactor: 0.45,
    maxFactor: 1.05,
    alpha: 0.78,
  },
  {
    id: 'g_pen',
    label: 'Plumilla G-Pen',
    color: '#111111',
    minFactor: 0.22,
    maxFactor: 1.45,
    alpha: 0.98,
  },
  {
    id: 'maru_pen',
    label: 'Maru-Pen Fina',
    color: '#111111',
    minFactor: 0.35,
    maxFactor: 0.75,
    alpha: 0.95,
  },
  {
    id: 'akai_crimson',
    label: 'Tinta Akai',
    color: '#dc2626',
    minFactor: 0.3,
    maxFactor: 1.25,
    alpha: 0.92,
  },
  {
    id: 'eraser',
    label: 'Borrador',
    color: '#ffffff',
    minFactor: 0.6,
    maxFactor: 1.5,
    alpha: 1,
    isEraser: true,
  },
];

const REFINE_MODES = [
  {
    id: 'clean_ink',
    label: 'Pasar Boceto a Tinta G-Pen Limpia',
    directive:
      'Clean up rough sketch lines into razor-sharp black and white Japanese G-Pen manga ink lineart and balanced screentones, strictly respecting character pose and framing.',
  },
  {
    id: 'anatomy_polish',
    label: 'Mejorar Diseño, Anatomía y Sombras',
    directive:
      'Upgrade character anatomy, facial proportions, fabric folds, and dramatic manga shadows based on this rough draft while keeping the exact scene layout.',
  },
  {
    id: 'color_cover',
    label: 'Acabado Ilustración a Color',
    directive:
      'Transform this hand-drawn manga draft into a vibrant cel-shaded editorial manga illustration with dramatic rim lighting while preserving exact pose and framing.',
  },
] as const;

export interface DrawingTabletWorkbenchProps {
  project: Project;
  activePageIndex: number;
  selectedKomaId: string | null;
  externalPrompt?: string;
  onConsumeExternalPrompt?: () => void;
  updateProject: (updates: Partial<Project>) => void;
  onAskKaiForSketch: (contextNote: string) => void;
  onQuotaBlocked: (reason?: string, requiredPlan?: PlanTier) => void;
}

export const DrawingTabletWorkbench: React.FC<DrawingTabletWorkbenchProps> = ({
  project,
  activePageIndex,
  selectedKomaId,
  externalPrompt,
  onConsumeExternalPrompt,
  updateProject,
  onAskKaiForSketch,
  onQuotaBlocked,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const smoothedPointRef = useRef<{ x: number; y: number } | null>(null);

  const [canvasAspect, setCanvasAspect] = useState<'3:4' | '16:9' | '1:1'>('3:4');
  const [brushId, setBrushId] = useState<BrushId>('nemu_blue');
  const [brushSize, setBrushSize] = useState<number>(6);
  const [stabilizer, setStabilizer] = useState<number>(45);
  const [penOnlyMode, setPenOnlyMode] = useState<boolean>(false);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [underlaySrc, setUnderlaySrc] = useState<string>('');

  // Live hardware stylus telemetry
  const [stylusDetected, setStylusDetected] = useState<boolean>(false);
  const [pointerKind, setPointerKind] = useState<string>('mouse');
  const [livePressure, setLivePressure] = useState<number>(0);
  const [liveTilt, setLiveTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [strokeCount, setStrokeCount] = useState<number>(0);

  // Undo / Redo snapshots (ImageData dataURLs)
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // KAI Sketch Refinement state
  const [refineModeId, setRefineModeId] = useState<string>('clean_ink');
  const [refinePrompt, setRefinePrompt] = useState<string>(
    'Mantén mi composición y postura dibujada; limpia la anatomía, entinta con plumilla G-Pen japonesa y añade tramas dramáticas.',
  );
  const [selectedSetteiHandle, setSelectedSetteiHandle] = useState<string>('');
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [refineError, setRefineError] = useState<string>('');
  const [refinedDataUrl, setRefinedDataUrl] = useState<string>('');
  const [destination, setDestination] = useState<ApplyDestination>('koma');
  const [targetPageIdx, setTargetPageIdx] = useState<number>(activePageIndex);
  const [targetKomaId, setTargetKomaId] = useState<string>(selectedKomaId || '');
  const [newSetteiName, setNewSetteiName] = useState<string>('');
  const [appliedToast, setAppliedToast] = useState<string>('');

  const canvasDims =
    canvasAspect === '16:9'
      ? { width: 1280, height: 720 }
      : canvasAspect === '1:1'
      ? { width: 1024, height: 1024 }
      : { width: 900, height: 1200 };

  useEffect(() => {
    setTargetPageIdx(activePageIndex);
  }, [activePageIndex]);

  useEffect(() => {
    if (selectedKomaId) setTargetKomaId(selectedKomaId);
  }, [selectedKomaId]);

  useEffect(() => {
    if (externalPrompt && externalPrompt.trim()) {
      setRefinePrompt(externalPrompt.trim());
      onConsumeExternalPrompt?.();
    }
  }, [externalPrompt, onConsumeExternalPrompt]);

  const pushSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const snap = canvas.toDataURL('image/png');
    setHistory((prev) => {
      const sliced = prev.slice(0, historyIndex + 1).slice(-24);
      const next = [...sliced, snap];
      setHistoryIndex(next.length - 1);
      return next;
    });
  }, [historyIndex]);

  // Initialize blank transparent layer on mount or aspect change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const initial = canvas.toDataURL('image/png');
    setHistory([initial]);
    setHistoryIndex(0);
    setStrokeCount(0);
  }, [canvasDims.width, canvasDims.height]);

  const restoreSnapshot = useCallback((idx: number, stack: string[]) => {
    const canvas = canvasRef.current;
    const target = stack[idx];
    if (!canvas || !target) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = target;
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const nextIdx = historyIndex - 1;
    setHistoryIndex(nextIdx);
    restoreSnapshot(nextIdx, history);
  }, [historyIndex, history, restoreSnapshot]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const nextIdx = historyIndex + 1;
    setHistoryIndex(nextIdx);
    restoreSnapshot(nextIdx, history);
  }, [historyIndex, history, restoreSnapshot]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndo, handleRedo]);

  const getCanvasCoords = (e: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const activeBrush = BRUSHES.find((b) => b.id === brushId) ?? BRUSHES[0];

  const drawSegment = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    pressure: number,
    useBarrelEraser: boolean,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tool = useBarrelEraser
      ? BRUSHES.find((b) => b.id === 'eraser')!
      : activeBrush;

    const clampedP = Math.min(1, Math.max(0.08, pressure));
    const widthFactor =
      tool.minFactor + (tool.maxFactor - tool.minFactor) * Math.pow(clampedP, 1.15);
    const dynamicWidth = Math.max(1, brushSize * widthFactor);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = dynamicWidth;
    if (tool.isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = tool.color;
      ctx.globalAlpha = Math.min(1, tool.alpha * (0.55 + clampedP * 0.45));
    }

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pType = e.pointerType || 'mouse';
    setPointerKind(pType);
    if (pType === 'pen') {
      setStylusDetected(true);
    }
    if (penOnlyMode && pType === 'touch') {
      return; // Palm rejection ignores touch input when Pen-Only is active
    }
    if (e.button !== 0 && e.buttons !== 32) return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;

    const pt = getCanvasCoords(e);
    lastPointRef.current = pt;
    smoothedPointRef.current = pt;

    const pressure = pType === 'pen' ? e.pressure || 0.5 : 0.62;
    setLivePressure(pressure);
    setLiveTilt({ x: e.tiltX || 0, y: e.tiltY || 0 });

    const barrelEraser = (e.buttons & 32) === 32;
    drawSegment(pt, { x: pt.x + 0.1, y: pt.y + 0.1 }, pressure, barrelEraser);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pType = e.pointerType || 'mouse';
    if (pType === 'pen' && !stylusDetected) {
      setStylusDetected(true);
      setPointerKind('pen');
    }
    if (pType === 'pen') {
      setLivePressure(e.pressure || 0);
      setLiveTilt({ x: e.tiltX || 0, y: e.tiltY || 0 });
    }

    if (!isDrawingRef.current) return;
    if (penOnlyMode && pType === 'touch') return;

    const nativeEvt = e.nativeEvent as PointerEvent;
    const coalesced =
      typeof nativeEvt.getCoalescedEvents === 'function'
        ? nativeEvt.getCoalescedEvents()
        : [nativeEvt];

    const smoothRatio = Math.min(0.88, Math.max(0, stabilizer / 100));
    const barrelEraser = (e.buttons & 32) === 32;

    for (const sample of coalesced) {
      const rawPt = getCanvasCoords(sample);
      const prevSmooth = smoothedPointRef.current ?? rawPt;
      const nextSmooth = {
        x: prevSmooth.x * smoothRatio + rawPt.x * (1 - smoothRatio),
        y: prevSmooth.y * smoothRatio + rawPt.y * (1 - smoothRatio),
      };
      const pressure = pType === 'pen' ? sample.pressure || 0.5 : 0.62;
      if (lastPointRef.current) {
        drawSegment(lastPointRef.current, nextSmooth, pressure, barrelEraser);
      }
      lastPointRef.current = nextSmooth;
      smoothedPointRef.current = nextSmooth;
    }
  };

  const finishStroke = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    smoothedPointRef.current = null;
    setLivePressure(0);
    setStrokeCount((c) => c + 1);
    pushSnapshot();
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setUnderlaySrc('');
    pushSnapshot();
  };

  const exportCompositeSketchPng = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return '';
    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, offscreen.width, offscreen.height);
    ctx.drawImage(canvas, 0, 0);
    return offscreen.toDataURL('image/png');
  };

  const exportTransparentNemuPng = (): string => {
    const canvas = canvasRef.current;
    return canvas ? canvas.toDataURL('image/png') : '';
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        setStrokeCount((c) => c + 1);
        pushSnapshot();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRefineWithKai = async () => {
    if (isRefining) return;
    setRefineError('');
    setAppliedToast('');
    setIsRefining(true);

    try {
      const sketchPng = exportCompositeSketchPng();
      const modeObj =
        REFINE_MODES.find((m) => m.id === refineModeId) ?? REFINE_MODES[0];

      const linkedChar: Character | undefined = project.characters.find(
        (c) =>
          normalizeTagHandle(c.tagHandle || '', c.name).toLowerCase() ===
          selectedSetteiHandle.toLowerCase(),
      );

      const charDetails = linkedChar
        ? [
            `${normalizeTagHandle(linkedChar.tagHandle || '', linkedChar.name)} (${linkedChar.name})`,
            linkedChar.appearance,
            linkedChar.clothing,
            (linkedChar.visualAnchors ?? []).length > 0
              ? `Anclas visuales: ${(linkedChar.visualAnchors ?? []).join(', ')}`
              : '',
          ]
            .filter(Boolean)
            .join(' · ')
        : undefined;

      const references: string[] = [sketchPng];
      if (linkedChar?.referenceBase64) {
        references.push(linkedChar.referenceBase64);
      }

      const result = await Flow.generate.image({
        prompt: `${modeObj.directive} ${refinePrompt.trim()}`,
        mode: 'sketch_refine',
        aspectRatio: canvasAspect,
        name: linkedChar?.name || project.name || 'Boceto Digital Mangai',
        details: charDetails,
        notes: `${modeObj.directive} Instrucción del autor: ${refinePrompt.trim()}`,
        referenceImagesBase64: references,
      });

      setRefinedDataUrl(result.dataUrl);
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        onQuotaBlocked(err.message, err.requiredPlan as PlanTier | undefined);
      }
      setRefineError(
        err instanceof Error
          ? err.message
          : 'No se pudo mejorar el boceto con Gemini 3.1 Flash Image.',
      );
    } finally {
      setIsRefining(false);
    }
  };

  const activeTargetPage =
    project.pages[Math.min(Math.max(0, targetPageIdx), Math.max(0, project.pages.length - 1))];
  const targetKomas = activeTargetPage?.komas ?? [];
  const effectiveKoma =
    targetKomas.find((k) => k.id === targetKomaId) ?? targetKomas[0] ?? null;

  const handleApplyToProject = () => {
    const assetToSave = refinedDataUrl || exportCompositeSketchPng();
    if (!assetToSave) return;

    if (destination === 'koma' && activeTargetPage && effectiveKoma) {
      const nemuPng = exportTransparentNemuPng();
      const nextPages = project.pages.map((p) => {
        if (p.id !== activeTargetPage.id) return p;
        return {
          ...p,
          komas: (p.komas ?? []).map((k) => {
            if (k.id !== effectiveKoma.id) return k;
            const nextState: KomaState = k.state === 'LOCKED' ? 'LOCKED' : 'PEN_IRE';
            return {
              ...k,
              nemuSketchUrl: nemuPng || k.nemuSketchUrl,
              inkRenderUrl: assetToSave,
              state: nextState,
              actionPrompt: k.actionPrompt || refinePrompt,
            };
          }),
        };
      });
      updateProject({ pages: nextPages });
      setAppliedToast(
        `Guardado en Página ${targetPageIdx + 1} · Viñeta #${effectiveKoma.panelIndex} (Capa L0 Boceto + Capa L2 Tinta).`,
      );
      return;
    }

    if (destination === 'settei') {
      const nameClean =
        newSetteiName.trim() ||
        project.characters.find(
          (c) =>
            normalizeTagHandle(c.tagHandle || '', c.name).toLowerCase() ===
            selectedSetteiHandle.toLowerCase(),
        )?.name ||
        `Personaje #${project.characters.length + 1}`;
      const handle = normalizeTagHandle('', nameClean);
      const existing = project.characters.find(
        (c) => normalizeTagHandle(c.tagHandle || '', c.name).toLowerCase() === handle.toLowerCase(),
      );

      const nextChars = existing
        ? project.characters.map((c) =>
            c.id === existing.id ? { ...c, referenceBase64: assetToSave, seedLocked: true } : c,
          )
        : [
            ...project.characters,
            {
              id: crypto.randomUUID(),
              entityType: 'character' as const,
              tagHandle: handle,
              name: nameClean,
              appearance: refinePrompt,
              clothing: '',
              role: 'Creado desde Tabla de Dibujo',
              visualAnchors: [],
              seedLocked: true,
              referenceBase64: assetToSave,
            },
          ];
      updateProject({ characters: nextChars });
      setAppliedToast(`Guardado en Settei y Personajes (${handle}).`);
      return;
    }

    if (destination === 'cover') {
      updateProject({
        cover: {
          ...project.cover,
          fullWrapBase64: assetToSave,
          frontBase64: assetToSave,
          backBase64: assetToSave,
          prompt: refinePrompt || project.cover.prompt,
        },
      });
      setAppliedToast('Aplicado directamente a Portada Tankōbon.');
    }
  };

  const handleLoadRefinedOntoBoard = () => {
    if (!refinedDataUrl) return;
    setUnderlaySrc(refinedDataUrl);
    setAppliedToast('Arte mejorado colocado como calco inferior para seguir dibujando encima.');
  };

  return (
    <div className="gf-tablet-wrap animate-slide-in-right">
      <div className="gf-tablet-header">
        <div>
          <h1 className="gf-page-title">Tabla de Dibujo Digital + KAI</h1>
          <p className="gf-page-subtitle">
            Conecta tu tableta gráfica o lápiz digital (Wacom, Huion, XP-Pen, Apple Pencil), dibuja
            tu borrador Nemu con presión real y mejóralo junto a KAI con{' '}
            <code>{KAI_IMAGE_MODEL_DEFAULT}</code>.
          </p>
        </div>

        <div className={`gf-stylus-badge ${stylusDetected ? 'is-pen' : ''}`}>
          <span className="gf-stylus-dot" aria-hidden="true" />
          <PenTool size={13} strokeWidth={2} className="gf-icon-shrink" />
          <span>
            {stylusDetected
              ? `Lápiz Digital Activo · Presión ${Math.round(livePressure * 100)}%`
              : `Entrada: ${pointerKind === 'touch' ? 'Táctil' : 'Mouse'} (toca con tu lápiz digital para activar presión)`}
          </span>
        </div>
      </div>

      {/* Digital Pen & Brush Toolbar */}
      <div className="gf-tablet-toolbar">
        <div className="gf-brush-group" role="toolbar" aria-label="Pinceles de manga">
          {BRUSHES.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`gf-brush-btn ${brushId === b.id ? 'is-active' : ''}`}
              onClick={() => setBrushId(b.id)}
            >
              {b.isEraser ? (
                <Eraser size={13} strokeWidth={2} className="gf-icon-shrink" />
              ) : (
                <span
                  className="gf-brush-swatch"
                  style={{ background: b.color }}
                  aria-hidden="true"
                />
              )}
              <span>{b.label}</span>
            </button>
          ))}
        </div>

        <div className="gf-brush-group">
          <label className="gf-slider-inline">
            <span>Grosor {brushSize}px</span>
            <input
              type="range"
              min={1}
              max={28}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
            />
          </label>

          <label className="gf-slider-inline">
            <span>Estabilizador {stabilizer}%</span>
            <input
              type="range"
              min={0}
              max={85}
              step={5}
              value={stabilizer}
              onChange={(e) => setStabilizer(Number(e.target.value))}
            />
          </label>

          <button
            type="button"
            className={`gf-palm-toggle ${penOnlyMode ? 'is-on' : ''}`}
            onClick={() => setPenOnlyMode((v) => !v)}
            title="Ignora toques de la mano en pantallas táctiles y dibuja solo con lápiz digital"
          >
            <ShieldCheck size={13} strokeWidth={2} className="gf-icon-shrink" />
            <span>Rechazo Palma {penOnlyMode ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            className="gf-brush-btn"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Deshacer trazo (Ctrl+Z)"
          >
            <RotateCcw size={13} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="gf-brush-btn"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Rehacer trazo (Ctrl+Y)"
          >
            <RotateCw size={13} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="gf-brush-btn"
            onClick={() => uploadInputRef.current?.click()}
            title="Importar boceto o foto de papel"
          >
            <ImagePlus size={13} strokeWidth={2} />
            <span>Importar Boceto</span>
          </button>
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={handleUploadImage}
          />
          <button
            type="button"
            className="gf-brush-btn"
            onClick={handleClearCanvas}
            title="Limpiar lienzo"
          >
            <Trash2 size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="gf-tablet-stage-grid">
        {/* Left: Pressure-sensitive Genkō Drawing Board */}
        <div className="gf-tablet-board-card">
          <div className="gf-inspector-head">
            <SectionLabel>
              Mesa de Luz Genkō · {canvasDims.width}×{canvasDims.height} px ({canvasAspect})
            </SectionLabel>
            <div className="gf-brush-group">
              {(['3:4', '1:1', '16:9'] as const).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  className={`gf-tablet-chip ${canvasAspect === ratio ? 'is-active' : ''}`}
                  onClick={() => setCanvasAspect(ratio)}
                >
                  {ratio === '3:4' ? '3:4 Página' : ratio === '1:1' ? '1:1 Settei' : '16:9 Portada'}
                </button>
              ))}
              <button
                type="button"
                className={`gf-tablet-chip ${showGuides ? 'is-active' : ''}`}
                onClick={() => setShowGuides((g) => !g)}
              >
                Guías
              </button>
            </div>
          </div>

          <div
            className="gf-tablet-canvas-frame"
            style={{ aspectRatio: `${canvasDims.width} / ${canvasDims.height}` }}
          >
            {underlaySrc && (
              <img src={toDataImageSrc(underlaySrc)} alt="" className="gf-tablet-underlay-img" />
            )}
            {showGuides && <div className="gf-tablet-canvas-grid" aria-hidden="true" />}
            <canvas
              ref={canvasRef}
              width={canvasDims.width}
              height={canvasDims.height}
              className="gf-tablet-canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishStroke}
              onPointerCancel={finishStroke}
              aria-label="Lienzo digital sensible a presión para boceto manga"
            />
          </div>

          <div className="gf-tablet-telemetry">
            <span>
              Presión Stylus:{' '}
              <strong>{Math.round(livePressure * 100)}%</strong>
              <span className="gf-pressure-bar" aria-hidden="true">
                <span
                  className="gf-pressure-fill"
                  style={{ width: `${Math.round(livePressure * 100)}%` }}
                />
              </span>
            </span>
            <span>
              Inclinación: {liveTilt.x}°, {liveTilt.y}° · Trazos: {strokeCount}
            </span>
          </div>
        </div>

        {/* Right: Co-Creation & Enhancement Bridge with KAI */}
        <div className="gf-tablet-kai-panel">
          <div className="gf-inspector-head">
            <SectionLabel>Mejora de Boceto en Conjunto con KAI</SectionLabel>
            <span className="gf-handle-badge">{KAI_IMAGE_MODEL_DEFAULT}</span>
          </div>

          <div className="gf-tablet-preset-chips">
            {REFINE_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`gf-tablet-chip ${refineModeId === m.id ? 'is-active' : ''}`}
                onClick={() => setRefineModeId(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          {project.characters.length > 0 && (
            <div className="gf-field-box">
              <label className="gf-field-label" htmlFor="gf-tablet-settei">
                Vincular Identidad @Settei al Boceto
              </label>
              <select
                id="gf-tablet-settei"
                className="gf-select-native"
                value={selectedSetteiHandle}
                onChange={(e) => setSelectedSetteiHandle(e.target.value)}
              >
                <option value="">Sin personaje fijo (libre)</option>
                {project.characters.map((c) => {
                  const h = normalizeTagHandle(c.tagHandle || '', c.name);
                  return (
                    <option key={c.id} value={h}>
                      {h} — {c.name}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="gf-field-box">
            <label className="gf-field-label" htmlFor="gf-tablet-prompt">
              Instrucción de Mejora sobre tu Dibujo
            </label>
            <textarea
              id="gf-tablet-prompt"
              className="gf-synopsis-textarea"
              rows={3}
              value={refinePrompt}
              onChange={(e) => setRefinePrompt(e.target.value)}
              placeholder="Ej. Respeta la postura de mi boceto, define armadura taína, mirada intensa y entintado G-Pen..."
            />
          </div>

          <div className="gf-controls-actions">
            <PillButton
              variant="filled"
              icon={
                isRefining ? (
                  <RefreshCw size={15} strokeWidth={2} className="gf-spin gf-icon-shrink" />
                ) : (
                  <Sparkles size={15} strokeWidth={2} className="gf-icon-shrink" />
                )
              }
              onClick={handleRefineWithKai}
              disabled={isRefining}
            >
              {isRefining
                ? 'KAI está entintando y mejorando tu boceto...'
                : 'Mejorar mi Boceto con KAI'}
            </PillButton>

            <PillButton
              variant="outline"
              icon={<Sparkles size={14} strokeWidth={1.75} className="gf-icon-shrink" />}
              onClick={() =>
                onAskKaiForSketch(
                  `Estoy dibujando en la Tabla de Dibujo (${canvasAspect}, ${strokeCount} trazos${selectedSetteiHandle ? `, con ${selectedSetteiHandle}` : ''}). Ayúdame a pulir el diseño y dame un [PROMPT VISUAL]: para mejorar mi borrador: ${refinePrompt}`,
                )
              }
            >
              Consultar Dirección de Diseño con KAI →
            </PillButton>
          </div>

          {refineError && <div className="gf-inline-error">{refineError}</div>}

          {refinedDataUrl && (
            <div className="gf-tablet-result-box">
              <SectionLabel>Diseño Mejorado desde tu Boceto</SectionLabel>
              <img
                src={refinedDataUrl}
                alt="Boceto mejorado con KAI"
                className="gf-tablet-result-img"
              />
              <div className="gf-controls-actions">
                <PillButton
                  variant="outline"
                  icon={<Layers size={14} strokeWidth={1.75} />}
                  onClick={handleLoadRefinedOntoBoard}
                >
                  Usar como Calco para Seguir Dibujando Encima
                </PillButton>
                <PillButton
                  variant="outline"
                  icon={<Download size={14} strokeWidth={1.75} />}
                  onClick={() =>
                    Flow.download({
                      base64: refinedDataUrl,
                      mimeType: 'image/png',
                      filename: `${(project.name || 'mangai').replace(/\s+/g, '_')}_boceto_kai.png`,
                    })
                  }
                >
                  Descargar PNG Mejorado
                </PillButton>
              </div>
            </div>
          )}

          {/* Save Sketch or Refined Art Directly into Active Project */}
          <div className="gf-tablet-target-box">
            <SectionLabel>Enviar al Proyecto Activo</SectionLabel>
            <div className="gf-field-box">
              <label className="gf-field-label" htmlFor="gf-tablet-dest">
                Destino en «{project.name || 'Manga'}»
              </label>
              <select
                id="gf-tablet-dest"
                className="gf-select-native"
                value={destination}
                onChange={(e) => setDestination(e.target.value as ApplyDestination)}
              >
                <option value="koma">Viñeta de Página Interior (L0 Boceto + L2 Tinta)</option>
                <option value="settei">Ficha Settei / Personaje</option>
                <option value="cover">Portada Tankōbon</option>
              </select>
            </div>

            {destination === 'koma' && activeTargetPage && (
              <div className="gf-grid-2">
                <div className="gf-field-box">
                  <label className="gf-field-label" htmlFor="gf-tablet-page">
                    Página
                  </label>
                  <select
                    id="gf-tablet-page"
                    className="gf-select-native"
                    value={targetPageIdx}
                    onChange={(e) => setTargetPageIdx(Number(e.target.value))}
                  >
                    {project.pages.map((p, idx) => (
                      <option key={p.id} value={idx}>
                        Página {idx + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="gf-field-box">
                  <label className="gf-field-label" htmlFor="gf-tablet-koma">
                    Viñeta
                  </label>
                  <select
                    id="gf-tablet-koma"
                    className="gf-select-native"
                    value={effectiveKoma?.id || ''}
                    onChange={(e) => setTargetKomaId(e.target.value)}
                  >
                    {targetKomas.map((k) => (
                      <option key={k.id} value={k.id}>
                        Viñeta #{k.panelIndex} ({k.state})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {destination === 'settei' && (
              <div className="gf-field-box">
                <label className="gf-field-label" htmlFor="gf-tablet-charname">
                  Nombre de Ficha Settei
                </label>
                <input
                  id="gf-tablet-charname"
                  type="text"
                  className="gf-text-input gf-text-input-sm"
                  value={newSetteiName}
                  onChange={(e) => setNewSetteiName(e.target.value)}
                  placeholder="Ej. Anacaona o Espada Ceremonial"
                />
              </div>
            )}

            <PillButton
              variant="solid"
              icon={<Check size={15} strokeWidth={2} className="gf-icon-shrink" />}
              onClick={handleApplyToProject}
            >
              {refinedDataUrl
                ? 'Aplicar Diseño Mejorado al Proyecto'
                : 'Guardar Boceto Directo en el Proyecto'}
            </PillButton>

            {appliedToast && <p className="gf-helper-copy">{appliedToast}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
