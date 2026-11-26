'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Check,
  Download,
  Eraser,
  Eye,
  EyeOff,
  Layers,
  LayoutGrid,
  Magnet,
  MessageSquarePlus,
  Move,
  PenTool,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import {
  KOMA_LAYOUT_LIST,
  getPolygonBounds,
  polygonToClipPath,
  polygonToSvgPoints,
  type KomaLayoutId,
  type PolygonPoint,
} from '@/lib/kai/schema';
import { renderPrintablePageToPngBase64 } from '@/lib/export/buildPrintBundle';
import { PRINT_PRESET_LIST, getPrintPreset, type TrimFormatId } from '@/lib/print/presets';
import { FukidashiLayer } from '@/components/studio/FukidashiLayer';
import { KakimojiLayer } from '@/components/studio/KakimojiLayer';
import { Flow, QuotaExceededError } from '../flow-sdk';
import {
  DEFAULT_LAYERS_VISIBILITY,
  DEFAULT_LAYER_OPACITY,
  KOMA_STATES,
  LAYER_DEFINITIONS,
  normalizeTagHandle,
  toDataImageSrc,
  type Character,
  type DialogueStyle,
  type Koma,
  type KomaDialogue,
  type KomaSfx,
  type KomaState,
  type LayerKey,
  type Project,
  type ScreentonePreset,
  type SpeedlinePreset,
} from '../types';
import { PillButton, SectionLabel } from './Primitives';
import './PageEditor.css';

const KonvaKomaCanvas = dynamic(() => import('./KonvaKomaCanvas'), {
  ssr: false,
});

const KOMA_STATE_LABELS: Record<Koma['state'], string> = {
  VACIO: 'VACÍO',
  NEMU: 'NEMU',
  PEN_IRE: 'PEN-IRE',
  TONE_FX: 'TONE FX',
  SHIAGE: 'SHIAGE',
  LOCKED: 'LOCKED',
};

const INLINE_CAMERA_ANGLES = [
  'Plano Medio',
  'Primer Plano Dramático',
  'Gran Plano General',
  'Picado Dramático',
  'Contrapicado Heroico',
  'Plano Holandés (Acción)',
];

const INLINE_SCREENTONES: Array<{ value: ScreentonePreset; label: string }> = [
  { value: 'none', label: 'Sin trama (Blanco)' },
  { value: 'dots_15', label: 'Puntos 15% (Luz)' },
  { value: 'dots_30', label: 'Puntos 30% (Tono medio)' },
  { value: 'dots_60', label: 'Puntos 60% (Sombra)' },
  { value: 'gradient', label: 'Degradado Atmosférico' },
  { value: 'beta_black', label: 'Beta Negro Sólido' },
];

const INLINE_SPEEDLINES: Array<{ value: SpeedlinePreset; label: string }> = [
  { value: 'none', label: 'Sin líneas cinéticas' },
  { value: 'ryusen', label: 'Ryūsen (Velocidad horizontal)' },
  { value: 'shuchusen', label: 'Shūchūsen (Foco radial)' },
];

const INLINE_DIALOGUE_STYLES: Array<{ value: DialogueStyle; label: string }> = [
  { value: 'normal', label: 'Normal (Óvalo)' },
  { value: 'shout', label: 'Grito (Explosivo)' },
  { value: 'whisper', label: 'Susurro (Punteado)' },
  { value: 'thought', label: 'Pensamiento (Nube)' },
  { value: 'narrator', label: 'Narrador (Caja)' },
  { value: 'system', label: 'Sistema (Invertido)' },
];

function clampCoord(value: number): number {
  return Math.round(Math.min(98, Math.max(2, value)) * 10) / 10;
}

function createLocalKomaId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `koma-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `koma-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function splitLongestPolygonEdge(coords: PolygonPoint[]): PolygonPoint[] {
  if (coords.length < 3) return coords;
  let longestIdx = 0;
  let longestDist = -1;
  for (let i = 0; i < coords.length; i += 1) {
    const a = coords[i];
    const b = coords[(i + 1) % coords.length];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    if (dist > longestDist) {
      longestDist = dist;
      longestIdx = i;
    }
  }
  const start = coords[longestIdx];
  const end = coords[(longestIdx + 1) % coords.length];
  const mid: PolygonPoint = {
    x: clampCoord((start.x + end.x) / 2),
    y: clampCoord((start.y + end.y) / 2),
  };
  return [
    ...coords.slice(0, longestIdx + 1),
    mid,
    ...coords.slice(longestIdx + 1),
  ];
}

function renderSpeedlineGroup(koma: Koma, clipId: string) {
  const fx = koma.speedlinePreset || 'none';
  if (fx === 'none') return null;

  const bounds = getPolygonBounds(koma.polygonCoords);
  if (fx === 'ryusen') {
    const lines = Array.from({ length: 16 }, (_, i) => {
      const y = bounds.top + (bounds.height * (i + 0.5)) / 16;
      return (
        <line
          key={i}
          x1={bounds.left}
          y1={y}
          x2={bounds.left + bounds.width}
          y2={y - bounds.height * 0.06}
          stroke="#111111"
          strokeOpacity="0.58"
          strokeWidth={i % 3 === 0 ? '0.45' : '0.22'}
          vectorEffect="non-scaling-stroke"
        />
      );
    });
    return <g clipPath={`url(#${clipId})`}>{lines}</g>;
  }

  // Shūchūsen (radial focus lines)
  const cx = bounds.left + bounds.width / 2;
  const cy = bounds.top + bounds.height / 2;
  const outerR = Math.hypot(bounds.width, bounds.height) * 0.65;
  const innerR = Math.min(bounds.width, bounds.height) * 0.28;
  const rays = Array.from({ length: 32 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 32;
    return (
      <line
        key={i}
        x1={cx + Math.cos(angle) * innerR}
        y1={cy + Math.sin(angle) * innerR}
        x2={cx + Math.cos(angle) * outerR}
        y2={cy + Math.sin(angle) * outerR}
        stroke="#111111"
        strokeOpacity="0.62"
        strokeWidth={i % 2 === 0 ? '0.42' : '0.2'}
        vectorEffect="non-scaling-stroke"
      />
    );
  });
  return <g clipPath={`url(#${clipId})`}>{rays}</g>;
}

export const PageEditor: React.FC<{
  project: Project;
  pageIndex: number;
  selectedKomaId: string | null;
  selectedDialogueId: string | null;
  onSelectKoma: (komaId: string) => void;
  onSelectDialogue: (komaId: string, dialogueId: string) => void;
  onUpdateDialogue: (
    pageId: string,
    komaId: string,
    dialogueId: string,
    patch: Partial<KomaDialogue>,
  ) => void;
  onUpdateSfx: (
    pageId: string,
    komaId: string,
    sfxId: string,
    patch: Partial<KomaSfx>,
  ) => void;
  onToggleLayer: (pageId: string, layer: LayerKey) => void;
  onChangeLayout: (pageId: string, layoutId: KomaLayoutId) => void;
  updateProject: (updates: Partial<Project>) => void;
  isGeneratingPage?: boolean;
  komaLoading: Record<string, boolean>;
}> = ({
  project,
  pageIndex,
  selectedKomaId,
  selectedDialogueId,
  onSelectKoma,
  onSelectDialogue,
  onUpdateDialogue,
  onUpdateSfx,
  onToggleLayer,
  onChangeLayout,
  updateProject,
  isGeneratingPage = false,
  komaLoading,
}) => {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const sketchUploadRef = useRef<HTMLInputElement | null>(null);

  const [downloadingPng, setDownloadingPng] = useState(false);

  // Vector Panel Builder state
  const [isDrawingVector, setIsDrawingVector] = useState(false);
  const [isEditingVertices, setIsEditingVertices] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [draftPoints, setDraftPoints] = useState<PolygonPoint[]>([]);
  const [cursorPoint, setCursorPoint] = useState<PolygonPoint | null>(null);
  const [draggingVertexIdx, setDraggingVertexIdx] = useState<number | null>(null);

  // Draft L0 -> Final Art L2 (KAI) state
  const [refiningKomaId, setRefiningKomaId] = useState<string | null>(null);
  const [draftFlowError, setDraftFlowError] = useState<string>('');

  const safeIndex = Math.min(Math.max(0, pageIndex), Math.max(0, project.pages.length - 1));
  const page = project.pages[safeIndex];
  const komas = page?.komas ?? [];
  const activeLayout: KomaLayoutId = page?.layoutTemplate || '4_panel_classic';
  const selectedKoma = komas.find((k) => k.id === selectedKomaId) ?? komas[0] ?? null;

  useEffect(() => {
    setDraftPoints([]);
    setCursorPoint(null);
    setDraggingVertexIdx(null);
    setIsDrawingVector(false);
    setDraftFlowError('');
  }, [page?.id]);

  const preset = getPrintPreset(project.trimFormat);
  const vis = {
    ...DEFAULT_LAYERS_VISIBILITY,
    ...(page?.layersVisibility ?? {}),
  };
  const opacity = {
    ...DEFAULT_LAYER_OPACITY,
    ...(page?.layerOpacity ?? {}),
  };

  const updateCurrentPageKomas = useCallback(
    (updater: (prevKomas: Koma[]) => Koma[]) => {
      if (!page) return;
      const nextPages = project.pages.map((p, idx) =>
        idx === safeIndex ? { ...p, komas: updater(p.komas ?? []) } : p,
      );
      updateProject({ pages: nextPages });
    },
    [page, project.pages, safeIndex, updateProject],
  );

  const handleInlineLayerOpacity = useCallback(
    (layerKey: 'L0_nemu' | 'L1_tones', value: number) => {
      if (!page) return;
      const nextPages = project.pages.map((p, idx) =>
        idx === safeIndex
          ? {
              ...p,
              layerOpacity: {
                ...DEFAULT_LAYER_OPACITY,
                ...(p.layerOpacity ?? {}),
                [layerKey]: value,
              },
            }
          : p,
      );
      updateProject({ pages: nextPages });
    },
    [page, project.pages, safeIndex, updateProject],
  );

  const handleInlineAddBalloon = useCallback(() => {
    if (!page || !selectedKoma) return;
    const bounds = getPolygonBounds(selectedKoma.polygonCoords);
    const count = selectedKoma.dialogues.length;
    const cx = Number(
      Math.min(82, Math.max(18, bounds.left + bounds.width * (0.32 + (count % 3) * 0.18))).toFixed(1),
    );
    const cy = Number(
      Math.min(82, Math.max(16, bounds.top + bounds.height * (0.28 + (count % 2) * 0.24))).toFixed(1),
    );
    const newBalloon: KomaDialogue = {
      id: `${selectedKoma.id}-dlg-${Date.now().toString(36)}`,
      speaker: project.characters[0]?.name || 'Personaje',
      style: 'normal',
      text: '¡Escribe tu diálogo aquí!',
      x: cx,
      y: cy,
      tailX: Number(Math.min(90, Math.max(10, cx - 4)).toFixed(1)),
      tailY: Number(Math.min(92, Math.max(10, cy + 9)).toFixed(1)),
      fontSize: 2.35,
      width: 18,
    };
    updateCurrentPageKomas((prev) =>
      prev.map((k) =>
        k.id === selectedKoma.id ? { ...k, dialogues: [...k.dialogues, newBalloon] } : k,
      ),
    );
    onSelectDialogue(selectedKoma.id, newBalloon.id);
    if (!vis.L5_balloons) {
      onToggleLayer(page.id, 'L5_balloons');
    }
  }, [
    onSelectDialogue,
    onToggleLayer,
    page,
    project.characters,
    selectedKoma,
    updateCurrentPageKomas,
    vis.L5_balloons,
  ]);

  const handleInlineDeleteBalloon = useCallback(
    (dialogueId: string) => {
      if (!selectedKoma) return;
      const remaining = selectedKoma.dialogues.filter((d) => d.id !== dialogueId);
      updateCurrentPageKomas((prev) =>
        prev.map((k) => (k.id === selectedKoma.id ? { ...k, dialogues: remaining } : k)),
      );
      if (remaining[0]) {
        onSelectDialogue(selectedKoma.id, remaining[0].id);
      }
    },
    [onSelectDialogue, selectedKoma, updateCurrentPageKomas],
  );

  const snapAndClampPoint = useCallback(
    (rawX: number, rawY: number): PolygonPoint => {
      let x = rawX;
      let y = rawY;
      if (snapToGrid) {
        const snapTargetsX = [
          4,
          preset.naiwakuInsetPct.left,
          50,
          100 - preset.naiwakuInsetPct.right,
          96,
        ];
        const snapTargetsY = [
          4,
          preset.naiwakuInsetPct.top,
          50,
          100 - preset.naiwakuInsetPct.bottom,
          96,
        ];
        const nearestX = snapTargetsX.find((t) => Math.abs(t - x) <= 2.2);
        const nearestY = snapTargetsY.find((t) => Math.abs(t - y) <= 2.2);
        x = nearestX !== undefined ? nearestX : Math.round(x / 2) * 2;
        y = nearestY !== undefined ? nearestY : Math.round(y / 2) * 2;
      }
      return { x: clampCoord(x), y: clampCoord(y) };
    },
    [preset.naiwakuInsetPct, snapToGrid],
  );

  const clientToSheetPoint = useCallback(
    (clientX: number, clientY: number): PolygonPoint | null => {
      const sheetEl = sheetRef.current;
      if (!sheetEl) return null;
      const rect = sheetEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const pctX = ((clientX - rect.left) / rect.width) * 100;
      const pctY = ((clientY - rect.top) / rect.height) * 100;
      return snapAndClampPoint(pctX, pctY);
    },
    [snapAndClampPoint],
  );

  const closeVectorPolygon = useCallback(
    (pointsToCommit: PolygonPoint[]) => {
      if (!page || pointsToCommit.length < 3) return;
      const newKoma: Koma = {
        id: createLocalKomaId(),
        panelIndex: komas.length + 1,
        state: 'VACIO',
        polygonCoords: pointsToCommit,
        cameraAngle: 'Plano Medio',
        taggedHandles: [],
        actionPrompt: '',
        screentonePreset: 'none',
        speedlinePreset: 'none',
        dialogues: [],
        sfxItems: [],
      };
      updateCurrentPageKomas((prev) => [...prev, newKoma]);
      onSelectKoma(newKoma.id);
      setDraftPoints([]);
      setCursorPoint(null);
      setIsDrawingVector(false);
    },
    [komas.length, onSelectKoma, page, updateCurrentPageKomas],
  );

  // Keyboard shortcuts during vector polygon drawing
  useEffect(() => {
    if (!isDrawingVector) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setDraftPoints([]);
        setCursorPoint(null);
        setIsDrawingVector(false);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setDraftPoints((prev) => prev.slice(0, -1));
      } else if (e.key === 'Enter' && draftPoints.length >= 3) {
        e.preventDefault();
        closeVectorPolygon(draftPoints);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeVectorPolygon, draftPoints, isDrawingVector]);

  // Smooth vertex dragging via window pointer listeners
  useEffect(() => {
    if (draggingVertexIdx === null || !selectedKoma || !isEditingVertices) return;

    const handlePointerMove = (e: PointerEvent) => {
      const nextPt = clientToSheetPoint(e.clientX, e.clientY);
      if (!nextPt) return;
      updateCurrentPageKomas((prev) =>
        prev.map((k) => {
          if (k.id !== selectedKoma.id) return k;
          const nextCoords = k.polygonCoords.map((pt, idx) =>
            idx === draggingVertexIdx ? nextPt : pt,
          );
          return { ...k, polygonCoords: nextCoords };
        }),
      );
    };

    const stopDragging = () => {
      setDraggingVertexIdx(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopDragging);
    window.addEventListener('pointercancel', stopDragging);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
    };
  }, [
    clientToSheetPoint,
    draggingVertexIdx,
    isEditingVertices,
    selectedKoma,
    updateCurrentPageKomas,
  ]);

  const handleToggleDrawingMode = () => {
    setIsEditingVertices(false);
    setDraggingVertexIdx(null);
    setIsDrawingVector((prev) => {
      const next = !prev;
      if (!next) {
        setDraftPoints([]);
        setCursorPoint(null);
      }
      return next;
    });
  };

  const handleToggleEditVertices = () => {
    if (!selectedKoma) return;
    setIsDrawingVector(false);
    setDraftPoints([]);
    setCursorPoint(null);
    setDraggingVertexIdx(null);
    setIsEditingVertices((prev) => !prev);
  };

  const handleAddVertexToSelected = () => {
    if (!selectedKoma) return;
    updateCurrentPageKomas((prev) =>
      prev.map((k) =>
        k.id === selectedKoma.id
          ? { ...k, polygonCoords: splitLongestPolygonEdge(k.polygonCoords) }
          : k,
      ),
    );
  };

  const handleDeleteSelectedKoma = () => {
    if (!selectedKoma || komas.length <= 1) return;
    const remaining = komas
      .filter((k) => k.id !== selectedKoma.id)
      .map((k, idx) => ({ ...k, panelIndex: idx + 1 }));
    updateCurrentPageKomas(() => remaining);
    if (remaining[0]) {
      onSelectKoma(remaining[0].id);
    }
    setDraggingVertexIdx(null);
  };

  const handleClearCanvas = () => {
    if (!page || komas.length === 0) return;
    updateCurrentPageKomas(() => []);
    setIsEditingVertices(false);
    setDraggingVertexIdx(null);
  };

  const handleVectorCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawingVector) return;
    const pt = clientToSheetPoint(e.clientX, e.clientY);
    if (!pt) return;

    if (draftPoints.length >= 3) {
      const first = draftPoints[0];
      if (Math.hypot(pt.x - first.x, pt.y - first.y) <= 3.5) {
        closeVectorPolygon(draftPoints);
        return;
      }
    }

    const last = draftPoints[draftPoints.length - 1];
    if (last && Math.hypot(pt.x - last.x, pt.y - last.y) < 0.8) {
      return;
    }

    setDraftPoints((prev) => [...prev, pt]);
  };

  const handleVectorCanvasDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawingVector) return;
    e.preventDefault();
    if (draftPoints.length >= 3) {
      closeVectorPolygon(draftPoints);
    }
  };

  const handleVectorCanvasMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDrawingVector) return;
    const pt = clientToSheetPoint(e.clientX, e.clientY);
    if (pt) setCursorPoint(pt);
  };

  const handleOpenInDrawingTablet = () => {
    if (!selectedKoma) return;
    const detail = {
      pageIndex: safeIndex,
      komaId: selectedKoma.id,
      nemuSketchUrl: selectedKoma.nemuSketchUrl,
      taggedHandle: selectedKoma.taggedHandles[0] || '',
      actionPrompt: selectedKoma.actionPrompt,
    };
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('mangai-pending-koma-sketch', JSON.stringify(detail));
      }
    } catch {
      // Ignore restricted storage errors.
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mangai-koma-sketch-bridge', { detail }));
    }
  };

  const handleSketchFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedKoma || !page) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setDraftFlowError('Formato inválido. Sube un boceto PNG, JPG o WebP.');
      return;
    }
    setDraftFlowError('');
    const targetKomaId = selectedKoma.id;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      updateCurrentPageKomas((prev) =>
        prev.map((k) => {
          if (k.id !== targetKomaId) return k;
          const nextState: KomaState = k.state === 'LOCKED' ? 'LOCKED' : 'NEMU';
          return {
            ...k,
            nemuSketchUrl: dataUrl,
            state: nextState,
          };
        }),
      );
      if (!vis.L0_nemu) {
        onToggleLayer(page.id, 'L0_nemu');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRefineDraftToFinalArt = async () => {
    if (!page || !selectedKoma) return;
    const targetKomaId = selectedKoma.id;
    if (refiningKomaId === targetKomaId || komaLoading[targetKomaId]) return;

    setDraftFlowError('');
    setRefiningKomaId(targetKomaId);

    try {
      const taggedSet = new Set((selectedKoma.taggedHandles ?? []).map((h) => h.toLowerCase()));
      const matchedEntities = project.characters.filter((c) => {
        const isActive = (c as Character & { activeInCanon?: boolean }).activeInCanon !== false;
        if (!isActive) return false;
        const handle = normalizeTagHandle(c.tagHandle || '', c.name).toLowerCase();
        return taggedSet.has(handle);
      });

      const entityVisuals = matchedEntities
        .map((c) => {
          const handle = normalizeTagHandle(c.tagHandle || '', c.name);
          const anchors = (c.visualAnchors ?? []).filter(Boolean);
          return [
            `${handle} (${c.name})`,
            c.appearance,
            c.clothing,
            anchors.length > 0 ? `Anclas visuales obligatorias: ${anchors.join(', ')}` : '',
            c.characterSeed ? `characterSeed: ${c.characterSeed}` : '',
          ]
            .filter(Boolean)
            .join(' · ');
        })
        .filter(Boolean)
        .join(' | ');

      const referenceImagesBase64: string[] = [];
      if (selectedKoma.nemuSketchUrl) {
        referenceImagesBase64.push(selectedKoma.nemuSketchUrl);
      }
      for (const entity of matchedEntities) {
        if (entity.referenceBase64) {
          referenceImagesBase64.push(entity.referenceBase64);
        }
      }

      const referenceImageMediaIds = matchedEntities
        .map((c) => c.referenceMediaId)
        .filter((id): id is string => Boolean(id));

      const pageStyle = page.artStyle || 'Classic Shonen';
      const camera = selectedKoma.cameraAngle || 'Plano Medio';
      const action =
        selectedKoma.actionPrompt.trim() ||
        page.chapterBeat?.trim() ||
        `Escena de manga para la viñeta #${selectedKoma.panelIndex}`;

      const finalPrompt = [
        selectedKoma.nemuSketchUrl
          ? 'Refine and ink this rough L0 Nemu sketch into final publication-grade black and white Sumi ink manga art (L2), strictly preserving pose, silhouette, framing, and composition.'
          : `Professional manga panel #${selectedKoma.panelIndex} in crisp G-Pen Sumi ink and balanced screentones.`,
        `Style: ${pageStyle}.`,
        `Camera: ${camera}.`,
        `Action: ${action}.`,
        entityVisuals ? `Active @Settei canon, visual anchors & characterSeed: ${entityVisuals}.` : '',
        'No speech bubbles, no text overlays, clean frameless interior panel art.',
      ]
        .filter(Boolean)
        .join(' ');

      const result = await Flow.generate.image({
        prompt: finalPrompt,
        mode: 'sketch_refine',
        aspectRatio: '3:4',
        name:
          matchedEntities.map((c) => c.name).filter(Boolean).join(', ') ||
          `${project.name || 'Manga'} · Viñeta #${selectedKoma.panelIndex}`,
        details: entityVisuals || undefined,
        canon: entityVisuals || undefined,
        style: pageStyle,
        notes: `${camera} — ${action}`,
        referenceImagesBase64:
          referenceImagesBase64.length > 0 ? referenceImagesBase64 : undefined,
        referenceImageMediaIds:
          referenceImageMediaIds.length > 0 ? referenceImageMediaIds : undefined,
      });

      const preservedNemu = selectedKoma.nemuSketchUrl;
      updateCurrentPageKomas((prev) =>
        prev.map((k) => {
          if (k.id !== targetKomaId) return k;
          const nextState: KomaState = k.state === 'LOCKED' ? 'LOCKED' : 'PEN_IRE';
          return {
            ...k,
            nemuSketchUrl: k.nemuSketchUrl ?? preservedNemu,
            inkRenderUrl: result.dataUrl,
            state: nextState,
          };
        }),
      );
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        setDraftFlowError(err.message);
      } else {
        setDraftFlowError(
          err instanceof Error
            ? err.message
            : `No se pudo transformar la Viñeta #${selectedKoma.panelIndex} a arte final.`,
        );
      }
    } finally {
      setRefiningKomaId(null);
    }
  };

  const handleAskKaiForPanel = () => {
    if (!page) return;
    const panelNote = selectedKoma
      ? `en la Viñeta #${selectedKoma.panelIndex} (${selectedKoma.cameraAngle}${
          selectedKoma.actionPrompt ? `: ${selectedKoma.actionPrompt}` : ''
        })`
      : 'en esta página';
    const prompt = `Ayúdame a dirigir y mejorar la composición Koma-wari y guion ${panelNote} de la Página ${safeIndex + 1} (${project.name || 'mi manga'}).`;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('mangai-kai-ask', {
          detail: { prompt, mode: 'script' },
        }),
      );
    }
  };

  const handleDelete = () => {
    if (project.pages.length <= 1) return;
    const nextPages = project.pages.filter((_, idx) => idx !== safeIndex);
    updateProject({ pages: nextPages });
  };

  const handleDownloadFlattenedPage = async () => {
    if (!page || downloadingPng) return;
    setDownloadingPng(true);
    try {
      const base64 = await renderPrintablePageToPngBase64(page, preset);
      if (!base64) return;
      const baseName = (project.name || 'manga').trim().replace(/\s+/g, '_');
      await Flow.download({
        base64,
        mimeType: 'image/png',
        filename: `${baseName}_pagina_${String(safeIndex + 1).padStart(3, '0')}_${preset.id}_L1-L5.png`,
      });
    } finally {
      setDownloadingPng(false);
    }
  };

  const anyKomaBusy = komas.some((k) => Boolean(komaLoading[k.id]) || refiningKomaId === k.id);
  const isSelectedRefining = Boolean(
    selectedKoma && (refiningKomaId === selectedKoma.id || komaLoading[selectedKoma.id]),
  );
  // In Japanese RTL manga, binding gutter is on the right for odd pages / left for even pages
  const isGutterRight =
    (project.readingDirection || 'rtl') === 'rtl'
      ? safeIndex % 2 === 0
      : safeIndex % 2 === 1;

  const isNearFirstVertex = Boolean(
    isDrawingVector &&
      draftPoints.length >= 3 &&
      cursorPoint &&
      Math.hypot(cursorPoint.x - draftPoints[0].x, cursorPoint.y - draftPoints[0].y) <= 3.5,
  );

  return (
    <div className="gf-editor-wrap animate-slide-in-right">
      <div className="gf-editor-header">
        <div>
          <h2 className="gf-editor-title">Páginas e Interiores</h2>
          <p className="gf-editor-counter">
            PÁG. {safeIndex + 1} / {project.pages.length} · {komas.length} VIÑETAS ·{' '}
            {preset.shortName.toUpperCase()} ({preset.exportWidthPx}×{preset.exportHeightPx} px ·{' '}
            Sangrado {preset.bleedMm} mm)
          </p>
        </div>

        <div className="gf-editor-header-controls">
          <div className="gf-editor-preset-pills" role="group" aria-label="Formato de página">
            {PRINT_PRESET_LIST.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`gf-editor-preset-pill ${preset.id === p.id ? 'is-active' : ''}`}
                onClick={() => updateProject({ trimFormat: p.id as TrimFormatId })}
                title={`${p.name} (${p.exportWidthPx}×${p.exportHeightPx} px · Bleed ${p.bleedMm} mm)`}
              >
                {p.shortName}
              </button>
            ))}
          </div>

          {page && (
            <button
              type="button"
              onClick={() => onToggleLayer(page.id, 'L6_guides')}
              className={`gf-guides-btn ${vis.L6_guides ? 'is-active' : ''}`}
            >
              <LayoutGrid size={14} strokeWidth={1.75} className="gf-icon-shrink" />
              <span>{vis.L6_guides ? 'OCULTAR GUÍAS L6' : 'MOSTRAR GUÍAS L6'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Koma-wari Geometric Template Picker */}
      {page && (
        <div className="gf-koma-templates" role="group" aria-label="Plantillas Koma-wari">
          {KOMA_LAYOUT_LIST.map((tmpl) => {
            const isActive = activeLayout === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                className={`gf-koma-template-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => onChangeLayout(page.id, tmpl.id)}
                title={tmpl.description}
              >
                <svg
                  viewBox="0 0 100 100"
                  className="gf-koma-template-svg"
                  aria-hidden="true"
                >
                  {tmpl.panels.map((poly, idx) => (
                    <polygon
                      key={idx}
                      points={polygonToSvgPoints(poly)}
                      fill={isActive ? 'rgba(79,70,229,0.16)' : 'rgba(17,17,17,0.06)'}
                      stroke={isActive ? '#4F46E5' : 'currentColor'}
                      strokeWidth="3.2"
                      strokeLinejoin="round"
                    />
                  ))}
                </svg>
                <span className="gf-koma-template-label">{tmpl.shortLabel}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Interactive Vector Panel Builder */}
      {page && (
        <div className="gf-vector-toolbar" role="toolbar" aria-label="Constructor de Viñetas Vectoriales">
          <div className="gf-vector-toolbar-row">
            <div className="gf-vector-btn-group">
              <button
                type="button"
                className={`gf-vector-btn ${isDrawingVector ? 'is-primary' : ''}`}
                onClick={handleToggleDrawingMode}
              >
                <PenTool size={13} strokeWidth={2} className="gf-icon-shrink" />
                <span>+ Trazar Viñeta Vectorial</span>
              </button>

              <button
                type="button"
                className={`gf-vector-btn ${isEditingVertices ? 'is-active' : ''}`}
                onClick={handleToggleEditVertices}
                disabled={!selectedKoma}
              >
                <Move size={13} strokeWidth={2} className="gf-icon-shrink" />
                <span>Editar Vértices</span>
              </button>

              {isEditingVertices && selectedKoma && (
                <button
                  type="button"
                  className="gf-vector-btn"
                  onClick={handleAddVertexToSelected}
                  title="Divide el borde más largo para añadir un nuevo vértice manipulable"
                >
                  <Plus size={13} strokeWidth={2} className="gf-icon-shrink" />
                  <span>+ Vértice</span>
                </button>
              )}

              <button
                type="button"
                className={`gf-vector-btn ${snapToGrid ? 'is-active' : ''}`}
                onClick={() => setSnapToGrid((s) => !s)}
                title="Ajustar vértices automáticamente a cuadrícula y área segura Naiwaku"
              >
                <Magnet size={13} strokeWidth={2} className="gf-icon-shrink" />
                <span>Imán {snapToGrid ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <div className="gf-vector-btn-group">
              {isDrawingVector && (
                <>
                  <button
                    type="button"
                    className="gf-vector-btn"
                    onClick={() => setDraftPoints((prev) => prev.slice(0, -1))}
                    disabled={draftPoints.length === 0}
                    title="Deshacer último vértice (Backspace)"
                  >
                    <Undo2 size={13} strokeWidth={2} className="gf-icon-shrink" />
                    <span>Deshacer</span>
                  </button>
                  <button
                    type="button"
                    className="gf-vector-btn is-primary"
                    onClick={() => closeVectorPolygon(draftPoints)}
                    disabled={draftPoints.length < 3}
                    title="Cerrar polígono y añadir viñeta (Enter)"
                  >
                    <Check size={13} strokeWidth={2} className="gf-icon-shrink" />
                    <span>Cerrar Viñeta</span>
                  </button>
                  <button
                    type="button"
                    className="gf-vector-btn"
                    onClick={() => {
                      setDraftPoints([]);
                      setCursorPoint(null);
                      setIsDrawingVector(false);
                    }}
                    title="Cancelar trazado (Escape)"
                  >
                    <X size={13} strokeWidth={2} className="gf-icon-shrink" />
                  </button>
                </>
              )}

              {!isDrawingVector && (
                <>
                  <button
                    type="button"
                    className="gf-vector-btn is-danger"
                    onClick={handleDeleteSelectedKoma}
                    disabled={!selectedKoma || komas.length <= 1}
                    title="Eliminar la viñeta seleccionada"
                  >
                    <Trash2 size={13} strokeWidth={2} className="gf-icon-shrink" />
                    <span>Eliminar Viñeta</span>
                  </button>
                  <button
                    type="button"
                    className="gf-vector-btn is-danger"
                    onClick={handleClearCanvas}
                    disabled={komas.length === 0}
                    title="Vaciar viñetas para diseñar un layout vectorial desde cero"
                  >
                    <Eraser size={13} strokeWidth={2} className="gf-icon-shrink" />
                    <span>Lienzo Vacío</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {isDrawingVector && (
            <div className="gf-vector-hint" role="status">
              <span>
                Haz clic sobre la hoja Genkō para colocar vértices. Cierra tocando el{' '}
                <strong>vértice #1</strong>, doble clic, <strong>Enter</strong> o{' '}
                <strong>Cerrar Viñeta</strong>. (<code>Backspace</code> deshace ·{' '}
                <code>Esc</code> cancela)
              </span>
              <span className="gf-vector-hint-meta">{draftPoints.length} vértices</span>
            </div>
          )}

          {isEditingVertices && selectedKoma && !isDrawingVector && (
            <div className="gf-vector-hint" role="status">
              <span>
                Arrastra los vértices de la <strong>Viñeta #{selectedKoma.panelIndex}</strong> para
                crear cortes diagonales o trapezoides. Usa <strong>+ Vértice</strong> para dividir el
                borde más largo.
              </span>
              <span className="gf-vector-hint-meta">
                {selectedKoma.polygonCoords.length} vértices
              </span>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          STRICT 7-LAYER GENKŌ YŌSHI CANVAS (L0 z=10 → L6 z=70)
          ========================================================= */}
      <div
        ref={sheetRef}
        className="gf-sheet gf-sheet-koma"
        style={{ aspectRatio: preset.aspectRatio }}
      >
        {isGeneratingPage && (
          <div className="gf-task-overlay" role="status" aria-live="polite">
            <RefreshCw size={22} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
            <span>Entintando Página {safeIndex + 1}...</span>
          </div>
        )}

        {/* ===== LAYER L0 (z-index: 10) — Non-Photo Blue Nemu Sketch (Non-Printable) ===== */}
        {vis.L0_nemu && (
          <div
            className="gf-layer gf-layer-l0"
            style={{ opacity: opacity.L0_nemu / 100 }}
            aria-hidden="true"
          >
            {komas.map((koma) => {
              const nemuSrc = toDataImageSrc(koma.nemuSketchUrl);
              if (!nemuSrc) return null;
              const b = getPolygonBounds(koma.polygonCoords);
              return (
                <div
                  key={`nemu-img-${koma.id}`}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    clipPath: polygonToClipPath(koma.polygonCoords),
                    pointerEvents: 'none',
                  }}
                >
                  <img
                    src={nemuSrc}
                    alt=""
                    style={{
                      position: 'absolute',
                      left: `${b.left}%`,
                      top: `${b.top}%`,
                      width: `${b.width}%`,
                      height: `${b.height}%`,
                      objectFit: 'cover',
                    }}
                  />
                </div>
              );
            })}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="gf-layer-svg">
              {komas.map((koma) => {
                const b = getPolygonBounds(koma.polygonCoords);
                const cx = b.left + b.width / 2;
                const cy = b.top + b.height / 2;
                return (
                  <g key={`nemu-${koma.id}`}>
                    <polygon
                      points={polygonToSvgPoints(koma.polygonCoords)}
                      fill="rgba(0, 174, 239, 0.06)"
                      stroke="#00AEEF"
                      strokeWidth="0.35"
                      strokeDasharray="2.5 2"
                      vectorEffect="non-scaling-stroke"
                    />
                    {/* Rule-of-thirds Nemu composition crosshair */}
                    <line
                      x1={b.left + b.width * 0.33}
                      y1={b.top}
                      x2={b.left + b.width * 0.33}
                      y2={b.top + b.height}
                      stroke="#00AEEF"
                      strokeWidth="0.2"
                      strokeDasharray="1.5 2"
                      vectorEffect="non-scaling-stroke"
                    />
                    <line
                      x1={b.left}
                      y1={cy}
                      x2={b.left + b.width}
                      y2={cy}
                      stroke="#00AEEF"
                      strokeWidth="0.2"
                      strokeDasharray="1.5 2"
                      vectorEffect="non-scaling-stroke"
                    />
                    <ellipse
                      cx={cx}
                      cy={cy}
                      rx={Math.min(12, b.width * 0.16)}
                      ry={Math.min(9, b.height * 0.22)}
                      fill="none"
                      stroke="#00AEEF"
                      strokeWidth="0.28"
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* ===== LAYER L1 (z-index: 20) — Screentones & Beta Black ===== */}
        {vis.L1_tones && (
          <div
            className="gf-layer gf-layer-l1"
            style={{ opacity: opacity.L1_tones / 100 }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="gf-layer-svg">
              <defs>
                <pattern id="gf-tone-15" width="2.2" height="2.2" patternUnits="userSpaceOnUse">
                  <circle cx="1.1" cy="1.1" r="0.32" fill="#111111" />
                </pattern>
                <pattern id="gf-tone-30" width="2.0" height="2.0" patternUnits="userSpaceOnUse">
                  <circle cx="1.0" cy="1.0" r="0.5" fill="#111111" />
                </pattern>
                <pattern id="gf-tone-60" width="1.8" height="1.8" patternUnits="userSpaceOnUse">
                  <circle cx="0.9" cy="0.9" r="0.68" fill="#111111" />
                </pattern>
                <linearGradient id="gf-tone-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#111111" stopOpacity="0.58" />
                  <stop offset="100%" stopColor="#111111" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {komas.map((koma) => {
                const tone = koma.screentonePreset || 'none';
                if (tone === 'none') return null;
                const fill =
                  tone === 'dots_15'
                    ? 'url(#gf-tone-15)'
                    : tone === 'dots_30'
                    ? 'url(#gf-tone-30)'
                    : tone === 'dots_60'
                    ? 'url(#gf-tone-60)'
                    : tone === 'gradient'
                    ? 'url(#gf-tone-grad)'
                    : '#111111';
                return (
                  <polygon
                    key={`tone-${koma.id}`}
                    points={polygonToSvgPoints(koma.polygonCoords)}
                    fill={fill}
                  />
                );
              })}
            </svg>
          </div>
        )}

        {/* ===== KONVA VECTOR ENGINE (react-konva clipFunc + point-by-point polygon editor) ===== */}
        <KonvaKomaCanvas
          komas={komas}
          selectedKomaId={selectedKoma?.id ?? null}
          showInk={vis.L2_ink}
          showBorders={vis.L3_borders_fx}
          isDrawingVector={isDrawingVector}
          isEditingVertices={isEditingVertices}
          draftPoints={draftPoints}
          cursorPoint={cursorPoint}
          isNearFirstVertex={isNearFirstVertex}
          snapPoint={snapAndClampPoint}
          onSelectKoma={onSelectKoma}
          onAddDraftPoint={(pt) => setDraftPoints((prev) => [...prev, pt])}
          onCursorMove={setCursorPoint}
          onCloseDraftPolygon={() => closeVectorPolygon(draftPoints)}
          onMoveVertex={(komaId, vertexIdx, nextPt) => {
            updateCurrentPageKomas((prev) =>
              prev.map((k) => {
                if (k.id !== komaId) return k;
                const nextCoords = k.polygonCoords.map((pt, idx) =>
                  idx === vertexIdx ? nextPt : pt,
                );
                return { ...k, polygonCoords: nextCoords };
              }),
            );
          }}
        />

        {/* ===== LAYER L2 (z-index: 30) — Clipped Ink Art & Koma Interactive Selection ===== */}
        <div className="gf-layer gf-layer-l2">
          {komas.map((koma) => {
            const isSelected = selectedKoma?.id === koma.id;
            const isKomaBusy = Boolean(komaLoading[koma.id] || refiningKomaId === koma.id);
            const imgSrc = vis.L2_ink ? toDataImageSrc(koma.inkRenderUrl) : '';
            const bounds = getPolygonBounds(koma.polygonCoords);

            return (
              <div
                key={koma.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Seleccionar Viñeta ${koma.panelIndex} (${koma.state})`}
                className={`gf-koma-layer ${isSelected ? 'is-selected' : ''} ${imgSrc ? 'has-ink' : ''}`}
                style={{ clipPath: polygonToClipPath(koma.polygonCoords) }}
                onClick={() => onSelectKoma(koma.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectKoma(koma.id);
                  }
                }}
              >
                {imgSrc && (
                  <img
                    src={imgSrc}
                    alt={`Viñeta ${koma.panelIndex} de página ${safeIndex + 1}`}
                    className="gf-koma-ink-img"
                    style={{
                      left: `${bounds.left}%`,
                      top: `${bounds.top}%`,
                      width: `${bounds.width}%`,
                      height: `${bounds.height}%`,
                    }}
                  />
                )}

                <div
                  className="gf-koma-content"
                  style={{
                    left: `${bounds.left}%`,
                    top: `${bounds.top}%`,
                    width: `${bounds.width}%`,
                    height: `${bounds.height}%`,
                  }}
                >
                  <div className="gf-koma-top-badges">
                    <span className={`gf-koma-num-pill ${isSelected ? 'is-selected' : ''}`}>
                      #{koma.panelIndex}
                    </span>
                    <span className={`gf-koma-state-badge state-${koma.state.toLowerCase()}`}>
                      {KOMA_STATE_LABELS[koma.state]}
                    </span>
                  </div>

                  {!imgSrc && (
                    <div className="gf-koma-placeholder">
                      <span className="gf-koma-angle">{koma.cameraAngle}</span>
                      {koma.taggedHandles.length > 0 && (
                        <div className="gf-koma-handle-row">
                          {koma.taggedHandles.slice(0, 3).map((handle) => (
                            <span key={handle} className="gf-koma-handle-tag">
                              {handle}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="gf-koma-brief">
                        {koma.actionPrompt
                          ? koma.actionPrompt
                          : `Viñeta #${koma.panelIndex} · Haz clic para dirigir en el inspector`}
                      </p>
                    </div>
                  )}

                  {isKomaBusy && (
                    <div className="gf-koma-busy-overlay" role="status" aria-live="polite">
                      <RefreshCw size={18} strokeWidth={2} className="gf-spin gf-icon-shrink" />
                      <span>Entintando #{koma.panelIndex}...</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ===== LAYER L3 (z-index: 40) — Sumi Borders (0.8mm) + Kinetic Speedlines ===== */}
        {vis.L3_borders_fx && (
          <div className="gf-layer gf-layer-l3" aria-hidden="true">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="gf-layer-svg">
              <defs>
                {komas.map((koma) => (
                  <clipPath key={`clip-${koma.id}`} id={`gf-koma-clip-${koma.id}`}>
                    <polygon points={polygonToSvgPoints(koma.polygonCoords)} />
                  </clipPath>
                ))}
              </defs>

              {komas.map((koma) => (
                <React.Fragment key={`fx-${koma.id}`}>
                  {renderSpeedlineGroup(koma, `gf-koma-clip-${koma.id}`)}
                  <polygon
                    points={polygonToSvgPoints(koma.polygonCoords)}
                    fill="none"
                    stroke={selectedKoma?.id === koma.id ? '#4F46E5' : '#111111'}
                    strokeWidth={selectedKoma?.id === koma.id ? '1.05' : '0.65'}
                    strokeLinejoin="miter"
                    vectorEffect="non-scaling-stroke"
                  />
                </React.Fragment>
              ))}
            </svg>
          </div>
        )}

        {/* ===== LAYER L4 (z-index: 50) — Kakimoji / Graphic SFX ===== */}
        {vis.L4_sfx && page && (
          <KakimojiLayer
            komas={komas}
            onSelectKoma={onSelectKoma}
            onUpdateSfx={(komaId, sfxId, patch) =>
              onUpdateSfx(page.id, komaId, sfxId, patch)
            }
          />
        )}

        {/* ===== LAYER L5 (z-index: 60) — Vector Fukidashi Speech Balloons ===== */}
        {vis.L5_balloons && page && (
          <FukidashiLayer
            komas={komas}
            preset={preset}
            selectedDialogueId={selectedDialogueId}
            onSelectDialogue={onSelectDialogue}
            onUpdateDialogue={(komaId, dialogueId, patch) =>
              onUpdateDialogue(page.id, komaId, dialogueId, patch)
            }
          />
        )}

        {/* ===== LAYER L6 (z-index: 70) — Technical Guides #00AEEF (Non-Printable) ===== */}
        {vis.L6_guides && (
          <div className="gf-layer gf-layer-l6" aria-hidden="true">
            {/* Trim (Corte) Line inset by bleed */}
            <div
              className="gf-guide-trim"
              style={{
                left: `${preset.bleedInsetPct.x}%`,
                right: `${preset.bleedInsetPct.x}%`,
                top: `${preset.bleedInsetPct.y}%`,
                bottom: `${preset.bleedInsetPct.y}%`,
              }}
            >
              <span className="gf-guide-tag gf-guide-tag-trim">
                CORTE · BLEED {preset.bleedMm}mm
              </span>
            </div>

            {/* Naiwaku Safe Area */}
            <div
              className="gf-guide-naiwaku"
              style={{
                left: `${preset.naiwakuInsetPct.left}%`,
                right: `${preset.naiwakuInsetPct.right}%`,
                top: `${preset.naiwakuInsetPct.top}%`,
                bottom: `${preset.naiwakuInsetPct.bottom}%`,
              }}
            >
              <span className="gf-guide-tag gf-guide-tag-safe">NAIWAKU (ÁREA SEGURA)</span>
            </div>

            {/* Gutter (Lomo) Zone */}
            <div
              className={`gf-guide-gutter ${isGutterRight ? 'is-right' : 'is-left'}`}
              style={{ width: `${preset.gutterWidthPct}%` }}
            >
              <span>LOMO / GUTTER</span>
            </div>
          </div>
        )}

        {/* ===== INTERACTIVE VECTOR POLYGON OVERLAY (z-index: 80) ===== */}
        {(isDrawingVector || (isEditingVertices && selectedKoma)) && (
          <div className={`gf-vector-overlay ${isDrawingVector ? 'is-drawing' : ''}`}>
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="gf-vector-svg"
              aria-label={
                isDrawingVector
                  ? 'Lienzo de trazado vectorial de viñetas'
                  : 'Editor de vértices vectoriales'
              }
              onClick={handleVectorCanvasClick}
              onDoubleClick={handleVectorCanvasDoubleClick}
              onPointerMove={handleVectorCanvasMove}
              onPointerLeave={() => {
                if (isDrawingVector) setCursorPoint(null);
              }}
            >
              {/* Point-by-point Polygon Drawing Preview */}
              {isDrawingVector && (
                <g>
                  {draftPoints.length >= 3 && (
                    <polygon
                      points={polygonToSvgPoints(draftPoints)}
                      fill="rgba(79, 70, 229, 0.14)"
                      stroke="#4F46E5"
                      strokeWidth="0.65"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {draftPoints.length >= 2 && (
                    <polyline
                      points={polygonToSvgPoints(draftPoints)}
                      fill="none"
                      stroke="#4F46E5"
                      strokeWidth="0.7"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  {draftPoints.length >= 1 && cursorPoint && (
                    <>
                      <line
                        x1={draftPoints[draftPoints.length - 1].x}
                        y1={draftPoints[draftPoints.length - 1].y}
                        x2={cursorPoint.x}
                        y2={cursorPoint.y}
                        stroke="#00AEEF"
                        strokeWidth="0.55"
                        strokeDasharray="1.8 1.4"
                        vectorEffect="non-scaling-stroke"
                      />
                      {draftPoints.length >= 2 && (
                        <line
                          x1={cursorPoint.x}
                          y1={cursorPoint.y}
                          x2={draftPoints[0].x}
                          y2={draftPoints[0].y}
                          stroke="#4F46E5"
                          strokeOpacity="0.45"
                          strokeWidth="0.4"
                          strokeDasharray="1.4 1.8"
                          vectorEffect="non-scaling-stroke"
                        />
                      )}
                    </>
                  )}
                  {draftPoints.map((pt, idx) => {
                    const isFirst = idx === 0;
                    const canClose = isFirst && draftPoints.length >= 3;
                    return (
                      <g key={`draft-v-${idx}`}>
                        {isFirst && (
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isNearFirstVertex ? 2.6 : 1.9}
                            fill="rgba(79, 70, 229, 0.18)"
                            stroke="#4F46E5"
                            strokeWidth="0.45"
                            vectorEffect="non-scaling-stroke"
                          />
                        )}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isFirst ? 1.35 : 1.05}
                          fill={canClose && isNearFirstVertex ? '#E11D48' : isFirst ? '#4F46E5' : '#00AEEF'}
                          stroke="#FFFFFF"
                          strokeWidth="0.35"
                          vectorEffect="non-scaling-stroke"
                          className={canClose ? 'gf-vector-first-vertex' : undefined}
                          onClick={(e) => {
                            if (canClose) {
                              e.stopPropagation();
                              closeVectorPolygon(draftPoints);
                            }
                          }}
                        />
                      </g>
                    );
                  })}
                  {cursorPoint && (
                    <text
                      x={Math.min(86, cursorPoint.x + 1.8)}
                      y={Math.max(5, cursorPoint.y - 1.8)}
                      className="gf-vector-coord-tag"
                    >
                      {cursorPoint.x}, {cursorPoint.y}
                    </text>
                  )}
                </g>
              )}

              {/* Selected Koma Vertex Handle Editor */}
              {!isDrawingVector && isEditingVertices && selectedKoma && (
                <g>
                  <polygon
                    points={polygonToSvgPoints(selectedKoma.polygonCoords)}
                    fill="rgba(79, 70, 229, 0.08)"
                    stroke="#4F46E5"
                    strokeWidth="0.85"
                    strokeDasharray="2 1.2"
                    vectorEffect="non-scaling-stroke"
                  />
                  {selectedKoma.polygonCoords.map((pt, idx) => {
                    const isDragging = draggingVertexIdx === idx;
                    return (
                      <g key={`edit-v-${selectedKoma.id}-${idx}`}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isDragging ? 2.2 : 1.55}
                          fill={isDragging ? '#E11D48' : '#4F46E5'}
                          stroke="#FFFFFF"
                          strokeWidth="0.45"
                          vectorEffect="non-scaling-stroke"
                          className={`gf-vector-vertex-hit ${isDragging ? 'is-dragging' : ''}`}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setDraggingVertexIdx(idx);
                          }}
                        />
                        <text
                          x={Math.min(88, pt.x + 1.7)}
                          y={Math.max(5, pt.y - 1.5)}
                          className="gf-vector-coord-tag"
                        >
                          V{idx + 1}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}
            </svg>
          </div>
        )}

        {komas.length === 0 && !isDrawingVector && (
          <div className="gf-sheet-empty">
            <PenTool size={28} strokeWidth={1.5} className="gf-sheet-empty-icon gf-icon-shrink" />
            <span className="gf-sheet-empty-text">
              SELECCIONA UNA PLANTILLA KOMA-WARI O PULSA + TRAZAR VIÑETA VECTORIAL
            </span>
          </div>
        )}
      </div>

      {/* Inline 7-Layer Stack (L6 → L0) & Koma / Fukidashi Quick Inspector */}
      {page && (
        <div className="gf-inline-workbench-grid" aria-label="Pila de 7 Capas L0-L6 e Inspector Rápido de Viñeta">
          {/* 7-Layer Panel L6 -> L0 */}
          <div className="gf-inline-layers-card">
            <div className="gf-inline-card-head">
              <span className="gf-inline-card-title">
                <Layers size={13} strokeWidth={2} className="gf-icon-shrink" />
                <span>Pila de 7 Capas (L6 → L0)</span>
              </span>
              <span className="gf-inline-card-badge">Export aplana L1 → L5 (excluye L0 y L6)</span>
            </div>

            <div className="gf-inline-layers-pills">
              {LAYER_DEFINITIONS.map((layer) => {
                const isVisible = vis[layer.key];
                const opVal =
                  layer.key === 'L0_nemu'
                    ? opacity.L0_nemu
                    : layer.key === 'L1_tones'
                    ? opacity.L1_tones
                    : null;

                return (
                  <div
                    key={layer.key}
                    className={`gf-inline-layer-chip ${isVisible ? 'is-visible' : 'is-hidden'} ${
                      !layer.printable ? 'is-nonprint' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="gf-inline-layer-toggle"
                      onClick={() => onToggleLayer(page.id, layer.key)}
                      title={`${layer.code}: ${layer.label}${
                        !layer.printable ? ' (No imprimible — excluida en export)' : ''
                      }`}
                    >
                      {isVisible ? (
                        <Eye size={12} strokeWidth={2} className="gf-icon-shrink" />
                      ) : (
                        <EyeOff size={12} strokeWidth={2} className="gf-icon-shrink" />
                      )}
                      <span className="gf-inline-layer-code">{layer.code}</span>
                      <span className="gf-inline-layer-label">{layer.label}</span>
                      {!layer.printable && (
                        <span className="gf-inline-layer-nonprint">No export</span>
                      )}
                    </button>

                    {layer.hasOpacity && opVal !== null && (
                      <div className="gf-inline-layer-opacity">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={opVal}
                          onChange={(e) =>
                            handleInlineLayerOpacity(
                              layer.key as 'L0_nemu' | 'L1_tones',
                              Number(e.target.value),
                            )
                          }
                          aria-label={`Opacidad ${layer.code}`}
                        />
                        <span>{opVal}%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel Inspector & Editable Vector Fukidashi (L5) Quick Controls */}
          {selectedKoma && (
            <div className="gf-inline-inspector-card">
              <div className="gf-inline-card-head">
                <span className="gf-inline-card-title">
                  <SlidersHorizontal size={13} strokeWidth={2} className="gf-icon-shrink" />
                  <span>Inspector · Viñeta #{selectedKoma.panelIndex}</span>
                </span>
                <div className="gf-inline-state-pills" role="group" aria-label="Estado de la viñeta">
                  {KOMA_STATES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`gf-inline-state-btn ${selectedKoma.state === st ? 'is-active' : ''}`}
                      onClick={() =>
                        updateCurrentPageKomas((prev) =>
                          prev.map((k) => (k.id === selectedKoma.id ? { ...k, state: st } : k)),
                        )
                      }
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="gf-inline-inspector-fields">
                <div className="gf-inline-field">
                  <label htmlFor="gf-inline-camera">Cámara</label>
                  <select
                    id="gf-inline-camera"
                    value={selectedKoma.cameraAngle || 'Plano Medio'}
                    onChange={(e) =>
                      updateCurrentPageKomas((prev) =>
                        prev.map((k) =>
                          k.id === selectedKoma.id ? { ...k, cameraAngle: e.target.value } : k,
                        ),
                      )
                    }
                  >
                    {INLINE_CAMERA_ANGLES.map((ang) => (
                      <option key={ang} value={ang}>
                        {ang}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="gf-inline-field">
                  <label htmlFor="gf-inline-tone">Trama L1</label>
                  <select
                    id="gf-inline-tone"
                    value={selectedKoma.screentonePreset || 'none'}
                    onChange={(e) =>
                      updateCurrentPageKomas((prev) =>
                        prev.map((k) =>
                          k.id === selectedKoma.id
                            ? {
                                ...k,
                                screentonePreset: e.target.value as ScreentonePreset,
                                state: k.state === 'PEN_IRE' ? 'TONE_FX' : k.state,
                              }
                            : k,
                        ),
                      )
                    }
                  >
                    {INLINE_SCREENTONES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="gf-inline-field">
                  <label htmlFor="gf-inline-speed">Líneas L3</label>
                  <select
                    id="gf-inline-speed"
                    value={selectedKoma.speedlinePreset || 'none'}
                    onChange={(e) =>
                      updateCurrentPageKomas((prev) =>
                        prev.map((k) =>
                          k.id === selectedKoma.id
                            ? { ...k, speedlinePreset: e.target.value as SpeedlinePreset }
                            : k,
                        ),
                      )
                    }
                  >
                    {INLINE_SPEEDLINES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Editable Vector Fukidashi Balloons (L5) Quick Bar */}
              <div className="gf-inline-fukidashi-bar">
                <div className="gf-inline-fukidashi-head">
                  <span className="gf-inline-card-title">
                    Globos Vectoriales Fukidashi L5 ({selectedKoma.dialogues.length})
                  </span>
                  <button
                    type="button"
                    className="gf-vector-btn is-active"
                    onClick={handleInlineAddBalloon}
                  >
                    <MessageSquarePlus size={12} strokeWidth={2} className="gf-icon-shrink" />
                    <span>+ Añadir Globo</span>
                  </button>
                </div>

                {selectedKoma.dialogues.length > 0 && (() => {
                  const activeDlg =
                    selectedKoma.dialogues.find((d) => d.id === selectedDialogueId) ??
                    selectedKoma.dialogues[0];
                  if (!activeDlg) return null;

                  return (
                    <div className="gf-inline-fukidashi-controls">
                      {selectedKoma.dialogues.length > 1 && (
                        <div className="gf-inline-dialogue-tabs">
                          {selectedKoma.dialogues.map((d, idx) => (
                            <button
                              key={d.id}
                              type="button"
                              className={`gf-inline-state-btn ${
                                activeDlg.id === d.id ? 'is-active' : ''
                              }`}
                              onClick={() => onSelectDialogue(selectedKoma.id, d.id)}
                            >
                              Globo #{idx + 1}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="gf-inline-fukidashi-inputs">
                        <select
                          aria-label="Estilo de globo Fukidashi"
                          value={activeDlg.style}
                          onChange={(e) =>
                            onUpdateDialogue(page.id, selectedKoma.id, activeDlg.id, {
                              style: e.target.value as DialogueStyle,
                            })
                          }
                        >
                          {INLINE_DIALOGUE_STYLES.map((st) => (
                            <option key={st.value} value={st.value}>
                              {st.label}
                            </option>
                          ))}
                        </select>

                        <input
                          type="text"
                          aria-label="Texto del globo Fukidashi"
                          value={activeDlg.text}
                          placeholder="Diálogo del globo..."
                          onChange={(e) =>
                            onUpdateDialogue(page.id, selectedKoma.id, activeDlg.id, {
                              text: e.target.value,
                            })
                          }
                        />

                        <input
                          type="range"
                          aria-label="Tamaño de fuente del globo"
                          min={1.6}
                          max={3.6}
                          step={0.1}
                          value={activeDlg.fontSize ?? 2.35}
                          onChange={(e) =>
                            onUpdateDialogue(page.id, selectedKoma.id, activeDlg.id, {
                              fontSize: Number(e.target.value),
                            })
                          }
                        />

                        <button
                          type="button"
                          className="gf-vector-btn is-danger"
                          title="Eliminar globo Fukidashi"
                          onClick={() => handleInlineDeleteBalloon(activeDlg.id)}
                        >
                          <Trash2 size={12} strokeWidth={2} className="gf-icon-shrink" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Draft (L0) -> Final Art (L2) Flow with KAI */}
      {page && (
        <div className="gf-draft-flow-bar" aria-label="Flujo Borrador a Arte Final con KAI">
          <div className="gf-draft-flow-head">
            <span className="gf-draft-flow-title">
              <Sparkles size={13} strokeWidth={2} className="gf-icon-shrink" />
              <span>Flujo Borrador → Arte Final (KAI)</span>
            </span>

            {selectedKoma ? (
              <div className="gf-draft-flow-status">
                <span>Viñeta #{selectedKoma.panelIndex}</span>
                <span
                  className={`gf-draft-flow-badge ${selectedKoma.nemuSketchUrl ? 'has-draft' : ''}`}
                >
                  {selectedKoma.nemuSketchUrl ? 'L0 Nemu Listo' : 'Sin Boceto L0'}
                </span>
                <span
                  className={`gf-draft-flow-badge ${selectedKoma.inkRenderUrl ? 'has-ink' : ''}`}
                >
                  {selectedKoma.inkRenderUrl ? 'L2 Tinta Lista' : 'Sin Tinta L2'}
                </span>
              </div>
            ) : (
              <span className="gf-draft-flow-status">Crea o selecciona una viñeta</span>
            )}
          </div>

          <div className="gf-draft-flow-actions">
            <button
              type="button"
              className="gf-draft-btn"
              onClick={handleOpenInDrawingTablet}
              disabled={!selectedKoma}
            >
              <PenTool size={14} strokeWidth={1.85} className="gf-icon-shrink" />
              <span>Bocetar en Tabla de Dibujo</span>
            </button>

            <button
              type="button"
              className="gf-draft-btn"
              onClick={() => sketchUploadRef.current?.click()}
              disabled={!selectedKoma}
            >
              <Upload size={14} strokeWidth={1.85} className="gf-icon-shrink" />
              <span>Subir Boceto L0</span>
            </button>
            <input
              ref={sketchUploadRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              onChange={handleSketchFileChange}
            />

            <button
              type="button"
              className="gf-draft-btn is-kai"
              onClick={handleRefineDraftToFinalArt}
              disabled={!selectedKoma || isSelectedRefining}
            >
              {isSelectedRefining ? (
                <RefreshCw size={14} strokeWidth={1.85} className="gf-spin gf-icon-shrink" />
              ) : (
                <Sparkles size={14} strokeWidth={1.85} className="gf-icon-shrink" />
              )}
              <span>
                {isSelectedRefining
                  ? 'Refinando L0 → L2...'
                  : 'Transformar Borrador → Arte Final con KAI'}
              </span>
            </button>
          </div>

          {draftFlowError && (
            <div className="gf-draft-flow-error" role="alert">
              {draftFlowError}
            </div>
          )}

          <div className="gf-draft-flow-note">
            <span>
              Conserva el boceto original en capa <strong>L0 (Nemu)</strong> mientras KAI entinta el
              arte final en capa <strong>L2</strong> respetando tus anclas <code>@Settei</code>.
            </span>
            <button
              type="button"
              className="gf-draft-kai-link"
              onClick={handleAskKaiForPanel}
            >
              <Sparkles size={12} strokeWidth={2} className="gf-icon-shrink" />
              <span>Consultar guion a KAI</span>
            </button>
          </div>
        </div>
      )}

      {/* Chapter Beat & Page Actions */}
      <div className="gf-card gf-prompt-card">
        <SectionLabel>
          {page?.chapterBeat
            ? `BEAT DE CAPÍTULO · PÁGINA ${safeIndex + 1}`
            : `GUION DE LA PÁGINA ${safeIndex + 1}`}
        </SectionLabel>
        <p className="gf-prompt-text">
          {page?.chapterBeat ||
            page?.prompt ||
            'Arrastra los globos Fukidashi (L5) u onomatopeyas (L4) directamente sobre el papel Genkō. Doble clic en un globo para editar el texto inline.'}
        </p>
        <div className="gf-prompt-actions">
          <PillButton
            variant="outline"
            icon={<Trash2 size={15} strokeWidth={1.75} className="gf-icon-shrink" />}
            onClick={handleDelete}
            disabled={project.pages.length <= 1 || isGeneratingPage || anyKomaBusy}
          >
            Eliminar Página
          </PillButton>
          <PillButton
            variant="outline"
            icon={
              downloadingPng ? (
                <RefreshCw size={15} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
              ) : (
                <Download size={15} strokeWidth={1.75} className="gf-icon-shrink" />
              )
            }
            onClick={handleDownloadFlattenedPage}
            disabled={!page || downloadingPng}
          >
            {downloadingPng ? 'Aplanando L1→L5...' : 'Descargar PNG (L1→L5)'}
          </PillButton>
        </div>
      </div>
    </div>
  );
};
