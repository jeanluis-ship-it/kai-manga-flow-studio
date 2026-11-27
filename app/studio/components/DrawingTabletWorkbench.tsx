'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getStroke } from 'perfect-freehand';
import {
  Check,
  Download,
  Eraser,
  ImagePlus,
  Layers,
  Maximize2,
  Minimize2,
  PenTool,
  RefreshCw,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  KOMA_SKETCH_BRIDGE_EVENT,
  clearPendingKomaSketch,
  readPendingKomaSketch,
  type KomaSketchBridgeDetail,
} from '@/lib/kai/setteiBridge';
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
    label: 'Lápiz',
    color: '#00aeef',
    minFactor: 0.45,
    maxFactor: 1.05,
    alpha: 0.78,
  },
  {
    id: 'g_pen',
    label: 'G-Pen',
    color: '#111111',
    minFactor: 0.22,
    maxFactor: 1.45,
    alpha: 0.98,
  },
  {
    id: 'maru_pen',
    label: 'Tinta',
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

function getSvgPathFromStroke(stroke: number[][]): string {
  if (!stroke.length) return '';
  const d = stroke.reduce<Array<string | number>>(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q'],
  );
  d.push('Z');
  return d.join(' ');
}

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
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const smoothedPointRef = useRef<{ x: number; y: number } | null>(null);
  const activeStrokePointsRef = useRef<Array<[number, number, number]>>([]);
  const strokeBaseImageRef = useRef<ImageData | null>(null);
  const pendingBridgeImageRef = useRef<string | null>(null);

  const [canvasAspect, setCanvasAspect] = useState<'3:4' | '16:9' | '1:1'>('3:4');
  const [brushId, setBrushId] = useState<BrushId>('nemu_blue');
  const [inkVariant, setInkVariant] = useState<'maru_pen' | 'akai_crimson'>('maru_pen');
  const [brushSize, setBrushSize] = useState<number>(6);
  const [stabilizer, setStabilizer] = useState<number>(45);
  const [penOnlyMode, setPenOnlyMode] = useState<boolean>(false);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [underlaySrc, setUnderlaySrc] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fullscreenKaiOpen, setFullscreenKaiOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [bridgeBanner, setBridgeBanner] = useState<string>('');

  // Live hardware stylus telemetry
  const [stylusDetected, setStylusDetected] = useState<boolean>(false);
  const [pointerKind, setPointerKind] = useState<string>('mouse');
  const [livePressure, setLivePressure] = useState<number>(0);
  const [liveTilt, setLiveTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [strokeCount, setStrokeCount] = useState<number>(0);

  // Undo / Redo snapshots (ImageData dataURLs)
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const historyIndexRef = useRef<number>(-1);
  historyIndexRef.current = historyIndex;

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
      const sliced = prev.slice(0, historyIndexRef.current + 1).slice(-24);
      const next = [...sliced, snap];
      setHistoryIndex(next.length - 1);
      return next;
    });
  }, []);

  const drawImageOntoCanvas = useCallback(
    (src: string) => {
      const normalized = toDataImageSrc(src);
      if (!normalized) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) {
        pendingBridgeImageRef.current = normalized;
        return;
      }
      const img = new Image();
      if (!normalized.startsWith('data:') && !normalized.startsWith('blob:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
        setStrokeCount((c) => c + 1);
        pushSnapshot();
      };
      img.src = normalized;
    },
    [pushSnapshot],
  );

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

    if (pendingBridgeImageRef.current) {
      const pending = pendingBridgeImageRef.current;
      pendingBridgeImageRef.current = null;
      drawImageOntoCanvas(pending);
    }
  }, [canvasDims.width, canvasDims.height, drawImageOntoCanvas]);

  const applyKomaBridgePayload = useCallback(
    (detail: KomaSketchBridgeDetail) => {
      const safePage = Math.min(
        Math.max(0, detail.pageIndex),
        Math.max(0, project.pages.length - 1),
      );
      setDestination('koma');
      setTargetPageIdx(safePage);
      if (detail.komaId) {
        setTargetKomaId(detail.komaId);
      }
      if (detail.taggedHandle?.trim()) {
        setSelectedSetteiHandle(normalizeTagHandle(detail.taggedHandle));
      }
      if (detail.actionPrompt?.trim()) {
        setRefinePrompt(detail.actionPrompt.trim());
      }
      if (detail.nemuSketchUrl) {
        drawImageOntoCanvas(detail.nemuSketchUrl);
      }
      const panelNum =
        project.pages[safePage]?.komas?.find((k) => k.id === detail.komaId)?.panelIndex;
      setBridgeBanner(
        panelNum
          ? `Conectado a Página ${safePage + 1} · Viñeta #${panelNum}`
          : `Conectado a Página ${safePage + 1}`,
      );
    },
    [drawImageOntoCanvas, project.pages],
  );

  // Consume pending Koma bridge from sessionStorage and listen for live bridge events
  useEffect(() => {
    const pending = readPendingKomaSketch();
    if (pending) {
      clearPendingKomaSketch();
      applyKomaBridgePayload(pending);
    }

    const onBridge = (evt: Event) => {
      const customEvt = evt as CustomEvent<KomaSketchBridgeDetail>;
      if (!customEvt.detail?.komaId) return;
      clearPendingKomaSketch();
      applyKomaBridgePayload(customEvt.detail);
    };

    window.addEventListener(KOMA_SKETCH_BRIDGE_EVENT, onBridge);
    return () => window.removeEventListener(KOMA_SKETCH_BRIDGE_EVENT, onBridge);
  }, [applyKomaBridgePayload]);

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

  // Keyboard shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Y, and Escape to close popover or exit fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (settingsOpen) {
          setSettingsOpen(false);
          return;
        }
        if (isFullscreen) {
          setIsFullscreen(false);
          return;
        }
      }
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
  }, [handleUndo, handleRedo, isFullscreen, settingsOpen]);

  // Close Ajustes popover when clicking outside
  useEffect(() => {
    if (!settingsOpen) return;
    const onPointerDownOutside = (evt: MouseEvent) => {
      if (!settingsRef.current || settingsRef.current.contains(evt.target as Node)) return;
      setSettingsOpen(false);
    };
    document.addEventListener('mousedown', onPointerDownOutside);
    return () => document.removeEventListener('mousedown', onPointerDownOutside);
  }, [settingsOpen]);

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
  const isInkActive = brushId === 'maru_pen' || brushId === 'akai_crimson';
  const activeInkPreset = BRUSHES.find((b) => b.id === inkVariant) ?? BRUSHES[2];

  const renderFreehandStroke = (
    points: Array<[number, number, number]>,
    pointerType: string,
    useBarrelEraser: boolean,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tool = useBarrelEraser
      ? BRUSHES.find((b) => b.id === 'eraser')!
      : activeBrush;

    if (strokeBaseImageRef.current) {
      ctx.putImageData(strokeBaseImageRef.current, 0, 0);
    }

    const smoothRatio = Math.min(0.88, Math.max(0, stabilizer / 100));
    const isGpen = tool.id === 'g_pen';
    const isMaru = tool.id === 'maru_pen';
    const simulatePressure = pointerType !== 'pen';

    const strokeOutline = getStroke(points, {
      size: Math.max(2, brushSize * (isGpen ? 1.55 : tool.isEraser ? 1.8 : 1.15)),
      thinning: tool.isEraser ? 0.15 : isGpen ? 0.74 : isMaru ? 0.56 : 0.45,
      smoothing: 0.5 + smoothRatio * 0.32,
      streamline: 0.45 + smoothRatio * 0.4,
      easing: (t) => t,
      simulatePressure,
      start: tool.isEraser
        ? { cap: true, taper: 0 }
        : { cap: true, taper: isGpen ? Math.max(4, brushSize * 0.75) : Math.max(2, brushSize * 0.35) },
      end: tool.isEraser
        ? { cap: true, taper: 0 }
        : { cap: true, taper: isGpen ? Math.max(6, brushSize * 1.1) : Math.max(3, brushSize * 0.45) },
    });

    const pathData = getSvgPathFromStroke(strokeOutline);
    if (!pathData) return;

    ctx.save();
    if (tool.isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = tool.color;
      ctx.globalAlpha = tool.alpha;
    }

    if (typeof Path2D !== 'undefined') {
      ctx.fill(new Path2D(pathData));
    } else {
      ctx.beginPath();
      strokeOutline.forEach(([x, y], idx) => {
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
    }
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

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      strokeBaseImageRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    const pt = getCanvasCoords(e);
    lastPointRef.current = pt;
    smoothedPointRef.current = pt;

    const pressure = pType === 'pen' ? e.pressure || 0.5 : 0.62;
    setLivePressure(pressure);
    setLiveTilt({ x: e.tiltX || 0, y: e.tiltY || 0 });

    activeStrokePointsRef.current = [[pt.x, pt.y, pressure]];
    const barrelEraser = (e.buttons & 32) === 32;
    renderFreehandStroke(activeStrokePointsRef.current, pType, barrelEraser);
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
      activeStrokePointsRef.current.push([nextSmooth.x, nextSmooth.y, pressure]);
      lastPointRef.current = nextSmooth;
      smoothedPointRef.current = nextSmooth;
    }

    renderFreehandStroke(activeStrokePointsRef.current, pType, barrelEraser);
  };

  const finishStroke = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    smoothedPointRef.current = null;
    activeStrokePointsRef.current = [];
    strokeBaseImageRef.current = null;
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
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      drawImageOntoCanvas(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRefineWithKai = async () => {
    if (isRefining) return;
    setRefineError('');
    setAppliedToast('');
    setIsRefining(true);
    if (isFullscreen) {
      setFullscreenKaiOpen(true);
    }

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
            linkedChar.seedLocked && linkedChar.characterSeed
              ? `Seed: ${linkedChar.characterSeed}`
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

  const canvasRatioValue = canvasDims.width / canvasDims.height;
  const aspectSpecBadge =
    canvasAspect === '16:9'
      ? 'PORTADA 16:9'
      : canvasAspect === '1:1'
      ? 'SETTEI 1:1'
      : 'CANVA B4 · 3:4';

  return (
    <div
      className={`gf-tablet-wrap ${isFullscreen ? 'is-fullscreen' : 'animate-slide-in-right'}`}
    >
      {!isFullscreen && (
        <div className="gf-tablet-header">
          <div className="gf-tablet-header-copy">
            <span className="gf-tablet-kicker">Mesa de Entintado · Papel Genkō</span>
            <h1 className="gf-page-title">Tabla de Dibujo Digital + KAI</h1>
            <p className="gf-page-subtitle">
              Dibuja con presión real (Wacom, Huion, Apple Pencil o mouse) y mejora tu boceto junto
              a KAI con <code>{KAI_IMAGE_MODEL_DEFAULT}</code>.
            </p>
          </div>
          <div className="gf-tablet-header-meta" aria-label="Especificaciones del lienzo">
            <span className="gf-tablet-spec-badge is-crimson">{aspectSpecBadge}</span>
            <span className="gf-tablet-spec-badge">600 DPI · G-PEN</span>
            <span className="gf-tablet-spec-badge">
              {canvasDims.width}×{canvasDims.height} PX
            </span>
            {bridgeBanner && <span className="gf-tablet-bridge-pill">{bridgeBanner}</span>}
          </div>
        </div>
      )}

      {/* Minimalist Toolbar: Essentials Only + Ajustes Popover */}
      <div className="gf-tablet-toolbar">
        <div className="gf-brush-group" role="toolbar" aria-label="Herramientas esenciales">
          <button
            type="button"
            className={`gf-brush-btn ${brushId === 'nemu_blue' ? 'is-active' : ''}`}
            onClick={() => setBrushId('nemu_blue')}
          >
            <span className="gf-brush-swatch" style={{ background: '#00aeef' }} aria-hidden="true" />
            <span>Lápiz</span>
          </button>

          <button
            type="button"
            className={`gf-brush-btn ${brushId === 'g_pen' ? 'is-active' : ''}`}
            onClick={() => setBrushId('g_pen')}
          >
            <span className="gf-brush-swatch" style={{ background: '#111111' }} aria-hidden="true" />
            <span>G-Pen</span>
          </button>

          <button
            type="button"
            className={`gf-brush-btn ${isInkActive ? 'is-active' : ''}`}
            onClick={() => setBrushId(inkVariant)}
          >
            <span
              className="gf-brush-swatch"
              style={{ background: activeInkPreset.color }}
              aria-hidden="true"
            />
            <span>Tinta</span>
          </button>

          <button
            type="button"
            className={`gf-brush-btn ${brushId === 'eraser' ? 'is-active' : ''}`}
            onClick={() => setBrushId('eraser')}
          >
            <Eraser size={13} strokeWidth={2} className="gf-icon-shrink" />
            <span>Borrador</span>
          </button>

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
        </div>

        <div className="gf-brush-group">
          <button
            type="button"
            className="gf-brush-btn"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Deshacer trazo (Ctrl+Z)"
            aria-label="Deshacer"
          >
            <RotateCcw size={13} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="gf-brush-btn"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Rehacer trazo (Ctrl+Y)"
            aria-label="Rehacer"
          >
            <RotateCw size={13} strokeWidth={2} />
          </button>

          <button
            type="button"
            className="gf-brush-btn"
            onClick={() => uploadInputRef.current?.click()}
            title="Importar boceto o foto de papel"
          >
            <ImagePlus size={13} strokeWidth={2} className="gf-icon-shrink" />
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
            className="gf-brush-btn is-accent"
            onClick={() => void handleRefineWithKai()}
            disabled={isRefining}
          >
            {isRefining ? (
              <RefreshCw size={13} strokeWidth={2} className="gf-spin gf-icon-shrink" />
            ) : (
              <Sparkles size={13} strokeWidth={2} className="gf-icon-shrink" />
            )}
            <span>{isRefining ? 'Mejorando...' : 'Mejorar con KAI'}</span>
          </button>

          {isFullscreen && (
            <button
              type="button"
              className={`gf-brush-btn ${fullscreenKaiOpen ? 'is-active' : ''}`}
              onClick={() => setFullscreenKaiOpen((v) => !v)}
              title="Mostrar / ocultar panel KAI y destino"
            >
              <Layers size={13} strokeWidth={2} className="gf-icon-shrink" />
              <span>KAI / Destino</span>
            </button>
          )}

          <button
            type="button"
            className={`gf-brush-btn is-fullscreen-btn ${isFullscreen ? 'is-active' : ''}`}
            onClick={() => setIsFullscreen((v) => !v)}
            title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Ampliar al 100%'}
          >
            {isFullscreen ? (
              <Minimize2 size={14} strokeWidth={2} className="gf-icon-shrink" />
            ) : (
              <Maximize2 size={14} strokeWidth={2} className="gf-icon-shrink" />
            )}
            <span>{isFullscreen ? 'Salir 100%' : 'Ampliar 100%'}</span>
          </button>

          <div ref={settingsRef} className="gf-tablet-settings-anchor">
            <button
              type="button"
              className={`gf-brush-btn ${settingsOpen ? 'is-active' : ''}`}
              aria-expanded={settingsOpen}
              aria-haspopup="dialog"
              onClick={() => setSettingsOpen((v) => !v)}
            >
              <SlidersHorizontal size={13} strokeWidth={2} className="gf-icon-shrink" />
              <span>Ajustes</span>
            </button>

            {settingsOpen && (
              <div className="gf-tablet-settings-popover" role="dialog" aria-label="Ajustes de la Tabla de Dibujo">
                <div className="gf-tablet-popover-section">
                  <span className="gf-tablet-popover-label">Tipo de Tinta</span>
                  <div className="gf-tablet-preset-chips">
                    <button
                      type="button"
                      className={`gf-tablet-chip ${inkVariant === 'maru_pen' ? 'is-active' : ''}`}
                      onClick={() => {
                        setInkVariant('maru_pen');
                        if (isInkActive) setBrushId('maru_pen');
                      }}
                    >
                      Maru-Pen Negra
                    </button>
                    <button
                      type="button"
                      className={`gf-tablet-chip ${inkVariant === 'akai_crimson' ? 'is-active' : ''}`}
                      onClick={() => {
                        setInkVariant('akai_crimson');
                        if (isInkActive) setBrushId('akai_crimson');
                      }}
                    >
                      Tinta Akai (#DC2626)
                    </button>
                  </div>
                </div>

                <div className="gf-tablet-popover-section">
                  <div className="gf-tablet-popover-row">
                    <span className="gf-tablet-popover-label">Estabilizador</span>
                    <span className="gf-tablet-popover-label">{stabilizer}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={85}
                    step={5}
                    value={stabilizer}
                    onChange={(e) => setStabilizer(Number(e.target.value))}
                  />
                </div>

                <div className="gf-tablet-popover-section">
                  <span className="gf-tablet-popover-label">Aspecto de Lienzo</span>
                  <div className="gf-tablet-preset-chips">
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
                  </div>
                </div>

                <div className="gf-tablet-popover-row">
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
                    className={`gf-palm-toggle is-guide ${showGuides ? 'is-on' : ''}`}
                    onClick={() => setShowGuides((g) => !g)}
                  >
                    <span>Guías {showGuides ? 'ON' : 'OFF'}</span>
                  </button>
                </div>

                <div className="gf-tablet-telemetry">
                  <div className={`gf-stylus-badge is-compact ${stylusDetected ? 'is-pen' : ''}`}>
                    <span className="gf-stylus-dot" aria-hidden="true" />
                    <PenTool size={12} strokeWidth={2} className="gf-icon-shrink" />
                    <span>
                      {stylusDetected
                        ? `Stylus activo · ${Math.round(livePressure * 100)}%`
                        : `Entrada: ${pointerKind === 'touch' ? 'Táctil' : 'Mouse'}`}
                    </span>
                  </div>
                  <span>
                    Presión: <strong>{Math.round(livePressure * 100)}%</strong> · Inclinación:{' '}
                    {liveTilt.x}°, {liveTilt.y}° · Trazos: {strokeCount}
                  </span>
                  <span className="gf-pressure-bar" aria-hidden="true">
                    <span
                      className="gf-pressure-fill"
                      style={{ width: `${Math.round(livePressure * 100)}%` }}
                    />
                  </span>
                </div>

                <button
                  type="button"
                  className="gf-brush-btn is-danger"
                  onClick={() => {
                    handleClearCanvas();
                    setSettingsOpen(false);
                  }}
                >
                  <Trash2 size={13} strokeWidth={2} className="gf-icon-shrink" />
                  <span>Limpiar Lienzo</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="gf-tablet-stage-grid">
        {/* Pressure-sensitive Genkō Drawing Board */}
        <div className="gf-tablet-board-card">
          <div className="gf-tablet-canvas-stage">
            <div
              className="gf-tablet-canvas-frame"
              style={
                {
                  aspectRatio: `${canvasDims.width} / ${canvasDims.height}`,
                  '--gf-canvas-ratio': `${canvasRatioValue}`,
                } as React.CSSProperties
              }
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
          </div>
          <div className="gf-tablet-canvas-statusbar" aria-live="polite">
            <span>
              {activeBrush.label} · {brushSize}PX · ESTAB. {stabilizer}%
            </span>
            <span>
              {aspectSpecBadge} · TRAZOS: {strokeCount}
            </span>
          </div>
        </div>

        {/* Right: Co-Creation & Enhancement Bridge with KAI */}
        {(!isFullscreen || fullscreenKaiOpen) && (
          <div className="gf-tablet-kai-panel dark-scrollbar">
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
                onClick={() => void handleRefineWithKai()}
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
        )}
      </div>
    </div>
  );
};
