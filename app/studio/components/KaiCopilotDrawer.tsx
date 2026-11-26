'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookMarked,
  BookOpen,
  Check,
  Layers,
  PenTool,
  Printer,
  RefreshCw,
  Send,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  KOMA_LAYOUT_PRESETS,
  type KaiDualOutput,
} from '@/lib/kai/schema';
import {
  KAI_IMAGE_MODEL_DEFAULT,
  KAI_TEXT_MODEL_DEFAULT,
  KaiServiceError,
  askKaiAssistant,
  type KaiChatHistoryTurn,
} from '@/lib/kai/studioCanvas';
import type { PlanTier } from '@/lib/plans/quotas';
import { Flow, QuotaExceededError } from '../flow-sdk';
import {
  normalizeTagHandle,
  type Character,
  type KomaState,
  type Project,
  type SetteiEntityType,
  type StudioView,
} from '../types';
import { PillButton } from './Primitives';

interface KaiMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  visualPrompt?: string | null;
  scriptOutput?: KaiDualOutput;
  applied?: boolean;
  actionBusy?: boolean;
}

export interface SetteiDraftDetail {
  open: boolean;
  draft: {
    id: string;
    name: string;
    tagHandle: string;
    entityType: string;
    appearance: string;
    clothing: string;
    visualAnchors: string[];
  } | null;
}

const STEP_PIPELINE: Array<{
  id: StudioView;
  stepNum: number;
  shortLabel: string;
  title: string;
  tip: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'project',
    stepNum: 1,
    shortLabel: '1. Obra',
    title: 'Configuración y Lomo',
    tip: 'Define título, sinopsis editorial y tono del tomo para rellenar la ficha de obra en 1 clic.',
    icon: <Printer size={12} strokeWidth={2} />,
  },
  {
    id: 'characters',
    stepNum: 2,
    shortLabel: '2. Settei',
    title: 'Settei y Personajes',
    tip: 'Co-diseña rasgos, vestuario y anclas visuales; si tienes una ficha abierta, aplícalo en vivo.',
    icon: <Users size={12} strokeWidth={2} />,
  },
  {
    id: 'cover',
    stepNum: 3,
    shortLabel: '3. Portada',
    title: 'Portada Tankōbon',
    tip: 'Redacta el prompt envolvente 16:9, aplícalo a la cubierta o genera el arte Tankōbon.',
    icon: <BookOpen size={12} strokeWidth={2} />,
  },
  {
    id: 'pages',
    stepNum: 4,
    shortLabel: '4. Viñetas',
    title: 'Viñetas e Interiores',
    tip: 'Guioniza secuencias Koma-wari o entinta la viñeta activa con tu Settei en canon.',
    icon: <BookMarked size={12} strokeWidth={2} />,
  },
  {
    id: 'flux', stepNum: 6, shortLabel: 'FLUX', title: 'Ilustrar con FLUX',
    tip: 'Describe el sujeto, el encuadre y la luz para generar una ilustración con tus referencias.',
    icon: <PenTool size={12} strokeWidth={2} />,
  },
  {
    id: 'drawing_tablet',
    stepNum: 5,
    shortLabel: '5. Tabla de Dibujo',
    title: 'Tabla de Dibujo Digital',
    tip: 'Pide guías de anatomía, perspectiva o un [PROMPT VISUAL]: para refinar tu boceto Nemu.',
    icon: <PenTool size={12} strokeWidth={2} />,
  },
];

const STEP_SUGGESTIONS: Record<StudioView, string> = {
  project: 'Revisa el formato y el lomo de mi tomo.',
  characters: 'Ayúdame a definir los rasgos que deben mantenerse en cada viñeta.',
  cover: 'Ayúdame a mejorar la composición de esta cubierta.',
  pages: 'Revisa el ritmo y el orden de lectura de esta página.',
  drawing_tablet: 'Sugiere cómo entintar este boceto con G-Pen.',
  flux: 'Ayúdame a describir la luz y el encuadre de esta escena.',
};

function parseSetteiAutofillFromMessage(
  msg: KaiMessage,
  fallbackEntityType?: string,
): {
  name?: string;
  tagHandle?: string;
  entityType?: SetteiEntityType;
  appearance?: string;
  clothing?: string;
  visualAnchors?: string[];
} {
  const fullText = `${msg.text}\n${msg.visualPrompt || ''}`;
  const cleanLine = (raw?: string) =>
    raw?.replace(/[*_`«»"]/g, '').trim() || '';

  const nameMatch = fullText.match(
    /(?:Nombre|Personaje|Protagonista|Objeto|Escenario|Entidad)\s*:\s*([^\n.;]+)/i,
  );
  const handleMatch = fullText.match(
    /(?:@Handle|Handle|Tag)\s*:\s*(@?[a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]+)/i,
  ) ?? fullText.match(/(@[a-zA-Z0-9_]{2,28})/);
  const appearanceMatch = fullText.match(
    /(?:Rasgos|Apariencia|Silueta|Descripción|Aspecto)\s*:\s*([^\n]+)/i,
  );
  const clothingMatch = fullText.match(
    /(?:Vestuario|Atuendo|Ropa|Equipamiento)\s*:\s*([^\n]+)/i,
  );
  const anchorsMatch = fullText.match(
    /(?:Anclas\s*Visuales|Anclas)\s*:\s*([^\n]+)/i,
  );

  let entityType: SetteiEntityType | undefined;
  const lower = fullText.toLowerCase();
  if (/tipo\s*:\s*prop|objeto\s*\(prop\)/i.test(lower)) entityType = 'prop';
  else if (/tipo\s*:\s*escenario|location/i.test(lower)) entityType = 'location';
  else if (/tipo\s*:\s*lore|regla de lore/i.test(lower)) entityType = 'lore_rule';
  else if (
    fallbackEntityType === 'character' ||
    fallbackEntityType === 'prop' ||
    fallbackEntityType === 'location' ||
    fallbackEntityType === 'lore_rule'
  ) {
    entityType = fallbackEntityType;
  }

  const parsedName = cleanLine(nameMatch?.[1]).slice(0, 48);
  const rawHandle = cleanLine(handleMatch?.[1]);
  const parsedHandle = rawHandle
    ? normalizeTagHandle(rawHandle, parsedName || 'Settei')
    : parsedName
    ? normalizeTagHandle('', parsedName)
    : undefined;

  const parsedAppearance =
    cleanLine(appearanceMatch?.[1]) ||
    (msg.visualPrompt ? msg.visualPrompt.trim().slice(0, 260) : '');
  const parsedClothing = cleanLine(clothingMatch?.[1]);
  const parsedAnchors = anchorsMatch?.[1]
    ? anchorsMatch[1]
        .split(/[,;|•]/)
        .map((s) => cleanLine(s))
        .filter((s) => s.length >= 2)
        .slice(0, 5)
    : undefined;

  return {
    ...(parsedName ? { name: parsedName } : {}),
    ...(parsedHandle ? { tagHandle: parsedHandle } : {}),
    ...(entityType ? { entityType } : {}),
    ...(parsedAppearance ? { appearance: parsedAppearance } : {}),
    ...(parsedClothing ? { clothing: parsedClothing } : {}),
    ...(parsedAnchors && parsedAnchors.length > 0 ? { visualAnchors: parsedAnchors } : {}),
  };
}

export interface KaiCopilotDrawerProps {
  project: Project;
  activeView: StudioView;
  activePageIndex: number;
  selectedKomaId: string | null;
  pendingExternalMessage?: string;
  pendingExternalMode?: 'mentor' | 'script';
  onConsumeExternalMessage?: () => void;
  onNavigateView: (view: StudioView) => void;
  updateProject: (updates: Partial<Project>) => void;
  onApplyScript: (output: KaiDualOutput) => boolean;
  onSendPromptToTablet: (visualPrompt: string) => void;
  onQuotaBlocked?: (reason: string, requiredPlan?: PlanTier) => void;
  setTaskLoading?: (task: 'cover' | 'bundle', value: boolean) => void;
  setKomaLoading?: (komaId: string, value: boolean) => void;
  setCharacterLoading?: (charId: string, value: boolean) => void;
}

export const KaiCopilotDrawer: React.FC<KaiCopilotDrawerProps> = ({
  project,
  activeView,
  activePageIndex,
  selectedKomaId,
  pendingExternalMessage,
  pendingExternalMode,
  onConsumeExternalMessage,
  onNavigateView,
  updateProject,
  onApplyScript,
  onSendPromptToTablet,
  onQuotaBlocked,
  setTaskLoading,
  setKomaLoading,
  setCharacterLoading,
}) => {
  const [mode, setMode] = useState<'mentor' | 'script'>('mentor');
  const [prompt, setPrompt] = useState('');
  const [targetPages, setTargetPages] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [setteiDraft, setSetteiDraft] = useState<SetteiDraftDetail>({
    open: false,
    draft: null,
  });
  const [messages, setMessages] = useState<KaiMessage[]>([
    {
      id: 'kai-welcome',
      role: 'assistant',
      text: 'Soy KAI, conectado en vivo a cada paso de tu proyecto con Gemini 3 Flash. Todo lo que diseñemos aquí se aplica directo a tu Configuración, fichas @Settei, Portada Tankōbon, Viñetas Koma-wari o tu Tabla de Dibujo.',
    },
  ]);

  const feedEndRef = useRef<HTMLDivElement | null>(null);
  const consumedUrlRef = useRef(false);

  // Listen to live Settei editor draft events
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleSetteiDraft = (evt: Event) => {
      const custom = evt as CustomEvent<SetteiDraftDetail>;
      if (!custom.detail) return;
      setSetteiDraft({
        open: Boolean(custom.detail.open),
        draft: custom.detail.draft ?? null,
      });
    };
    window.addEventListener('mangai-settei-draft', handleSetteiDraft);
    return () => window.removeEventListener('mangai-settei-draft', handleSetteiDraft);
  }, []);

  // Active canon characters (activeInCanon !== false)
  const activeCharacters = useMemo(
    () => project.characters.filter((c) => c.activeInCanon !== false),
    [project.characters],
  );

  const activeSetteiPayload = useMemo(
    () =>
      activeCharacters.map((c) => ({
        tag_handle: normalizeTagHandle(c.tagHandle || '', c.name),
        name: c.name || 'Sin nombre',
        entity_type: c.entityType || 'character',
        visual_anchors: c.visualAnchors ?? [],
      })),
    [activeCharacters],
  );

  const activeSetteiStrings = useMemo(
    () =>
      activeCharacters.map((c) => {
        const handle = normalizeTagHandle(c.tagHandle || '', c.name);
        const anchors = (c.visualAnchors ?? []).join(', ');
        const seedStr = c.seedLocked && c.characterSeed ? ` [Seed: ${c.characterSeed}]` : '';
        return `${handle} (${c.name}): ${c.appearance} ${c.clothing} ${
          anchors ? `[Anclas: ${anchors}]` : ''
        }${seedStr}`.trim();
      }),
    [activeCharacters],
  );

  const currentPage = project.pages[activePageIndex];
  const selectedKoma =
    currentPage?.komas?.find((k) => k.id === selectedKomaId) ??
    currentPage?.komas?.[0] ??
    null;

  const activeStepMeta = useMemo(
    () => STEP_PIPELINE.find((s) => s.id === activeView) ?? STEP_PIPELINE[0],
    [activeView],
  );

  const projectContextSummary = useMemo(() => {
    const draftLine =
      setteiDraft.open && setteiDraft.draft
        ? `Ficha Settei abierta en edición: "${setteiDraft.draft.name || 'Sin nombre'}" (${
            setteiDraft.draft.tagHandle || '@Nuevo'
          }, tipo ${setteiDraft.draft.entityType}). Rasgos actuales: ${
            setteiDraft.draft.appearance || 'vacío'
          }. Vestuario: ${setteiDraft.draft.clothing || 'vacío'}. Anclas: ${
            (setteiDraft.draft.visualAnchors ?? []).join(', ') || 'ninguna'
          }.`
        : '';

    return [
      `Paso actual del usuario: ${activeStepMeta.shortLabel} — ${activeStepMeta.title}.`,
      `Título del proyecto: "${project.name || 'Manga sin título'}" por ${project.author || 'Autor'}.`,
      `Modo de color: ${project.colorMode === 'color' ? 'Color' : 'Blanco y Negro (Sumi)'}. Encuadernación: ${
        project.bindingType || 'rustica_pegada'
      }.`,
      `Formato: ${project.trimFormat || 'tankobon_b6'}, Lectura: ${(
        project.readingDirection || 'rtl'
      ).toUpperCase()}, Fichas Settei activas: ${activeCharacters.length}/${
        project.characters.length
      }, Páginas en manuscrito: ${project.pages.length}.`,
      selectedKoma && activeView === 'pages'
        ? `Viñeta seleccionada: Página ${activePageIndex + 1}, Viñeta #${selectedKoma.panelIndex} (${selectedKoma.cameraAngle}).`
        : '',
      draftLine,
    ]
      .filter(Boolean)
      .join(' ');
  }, [
    activeStepMeta,
    activeView,
    project,
    activeCharacters.length,
    activePageIndex,
    selectedKoma,
    setteiDraft,
  ]);

  // Read deep-link parameters from Landing Hero (?volume=...&title=...&prompt=...)
  useEffect(() => {
    if (consumedUrlRef.current || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const incomingVolume = params.get('volume')?.trim();
    const incomingTitle = params.get('title')?.trim();
    const incomingPrompt = params.get('prompt')?.trim();
    if (!incomingTitle && !incomingPrompt && !incomingVolume) return;
    consumedUrlRef.current = true;

    if (
      incomingTitle &&
      (!project.name || project.name === 'Manga sin título' || project.name.startsWith('Nuevo Tomo'))
    ) {
      updateProject({
        name: incomingTitle,
        cover: {
          ...project.cover,
          spineTitle: incomingTitle,
          prompt: incomingPrompt || project.cover.prompt,
        },
      });
    }

    if (incomingPrompt || incomingVolume) {
      setMessages((prev) => [
        ...prev,
        {
          id: `kai-deeplink-${Date.now()}`,
          role: 'assistant',
          text: `Cargué el universo «${incomingTitle || project.name}» en tu proyecto. Usa las acciones contextuales para expandir @Settei, generar tu Portada 16:9, enviarlo a la Tabla de Dibujo o guionizar Viñetas.`,
          visualPrompt: incomingPrompt || project.cover.prompt || null,
        },
      ]);
    }
  }, [project.cover, project.name, updateProject]);

  useEffect(() => {
    if (!pendingExternalMessage?.trim()) return;
    const msg = pendingExternalMessage.trim();
    const nextMode = pendingExternalMode ?? 'mentor';
    onConsumeExternalMessage?.();
    setMode(nextMode);
    void handleSendMessage(msg, nextMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingExternalMessage]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, loading]);

  const buildChatHistory = (): KaiChatHistoryTurn[] =>
    messages
      .filter((m) => m.id !== 'kai-welcome' && !m.scriptOutput)
      .slice(-14)
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }],
      }));

  const handleSendMessage = async (
    overrideText?: string,
    overrideMode?: 'mentor' | 'script',
  ) => {
    const cleanPrompt = (overrideText ?? prompt).trim();
    if (!cleanPrompt || loading) return;

    const effectiveMode = overrideMode ?? mode;
    setError('');
    setLoading(true);

    const userMsg: KaiMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: cleanPrompt,
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!overrideText) setPrompt('');

    try {
      if (effectiveMode === 'script') {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (typeof window !== 'undefined') {
          const savedKey = window.localStorage?.getItem('mangai-google-key-v1')?.trim();
          if (savedKey) headers['x-mangai-llave'] = savedKey;
        }
        const response = await fetch('/api/kai/script', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            userPrompt: cleanPrompt,
            activeSettei: activeSetteiPayload,
            targetPages,
            readingDirection: project.readingDirection || 'rtl',
          }),
        });

        const payload = (await response.json()) as KaiDualOutput & {
          error?: string;
          code?: string;
          requiredPlan?: PlanTier;
        };

        if (response.status === 402 || payload.code === 'QUOTA_EXCEEDED') {
          const msg = payload.error || 'Cuota excedida para tu plan actual.';
          setError(msg);
          onQuotaBlocked?.(msg, payload.requiredPlan);
          return;
        }

        if (!response.ok) {
          throw new Error(payload.error || 'KAI no pudo estructurar el guion.');
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `kai-script-${Date.now()}`,
            role: 'assistant',
            text: payload.reply,
            scriptOutput: payload,
            applied: false,
          },
        ]);
      } else {
        const res = await askKaiAssistant(cleanPrompt, buildChatHistory(), {
          activeSettei: activeSetteiStrings,
          projectContext: projectContextSummary,
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `kai-chat-${Date.now()}`,
            role: 'assistant',
            text: res.reply,
            visualPrompt: res.visualPrompt,
            applied: false,
          },
        ]);
      }
    } catch (err) {
      if (err instanceof KaiServiceError && (err.status === 402 || err.code === 'QUOTA_EXCEEDED')) {
        onQuotaBlocked?.(err.message, err.requiredPlan as PlanTier | undefined);
      }
      if (!overrideText) setPrompt(cleanPrompt);
      setMessages((prev) => prev.filter((msg) => msg.id !== userMsg.id));
      setError(err instanceof Error ? err.message : 'Error al conectar con KAI.');
    } finally {
      setLoading(false);
    }
  };

  const setMsgBusy = (msgId: string, busy: boolean, applied?: boolean) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, actionBusy: busy, ...(applied !== undefined ? { applied } : {}) }
          : m,
      ),
    );
  };

  const handleAutofillOpenSettei = (msg: KaiMessage) => {
    if (typeof window === 'undefined') return;
    const detail = parseSetteiAutofillFromMessage(msg, setteiDraft.draft?.entityType);
    window.dispatchEvent(new CustomEvent('mangai-settei-autofill', { detail }));
    setMsgBusy(msg.id, false, true);
  };

  const handleCreateSetteiFromKai = async (msg: KaiMessage) => {
    if (!msg.visualPrompt || msg.actionBusy) return;
    setError('');
    setMsgBusy(msg.id, true);
    const charId = crypto.randomUUID();
    setCharacterLoading?.(charId, true);
    try {
      const charNum = project.characters.length + 1;
      const parsed = parseSetteiAutofillFromMessage(msg);
      const nameClean = parsed.name || `Personaje ${charNum}`;
      const handle = parsed.tagHandle || normalizeTagHandle('', nameClean);
      const seedCode = `SEED-${Math.floor(100000 + Math.random() * 900000)}`;

      const generated = await Flow.generate.image({
        prompt: `Character turnaround reference sheet, clean white background, front and side views: ${msg.visualPrompt}`,
        mode: 'sheet',
        aspectRatio: '1:1',
        name: `${nameClean} (${handle})`,
        details: msg.visualPrompt,
        canon: `Seed: ${seedCode}`,
        style: project.colorMode === 'color' ? 'Manhwa Color' : 'Manga Entintado B/N',
      });

      const newChar: Character = {
        id: charId,
        entityType: parsed.entityType || 'character',
        tagHandle: handle,
        name: nameClean,
        appearance: parsed.appearance || msg.visualPrompt,
        clothing: parsed.clothing || '',
        role: 'Diseñado con KAI',
        activeInCanon: true,
        visualAnchors: parsed.visualAnchors ?? [],
        seedLocked: true,
        characterSeed: seedCode,
        referenceBase64: generated.dataUrl,
        referenceMediaId: generated.mediaId,
      };

      updateProject({ characters: [...project.characters, newChar] });
      setMsgBusy(msg.id, false, true);
      onNavigateView('characters');
    } catch (err) {
      setMsgBusy(msg.id, false);
      if (err instanceof QuotaExceededError) {
        onQuotaBlocked?.(err.message, err.requiredPlan as PlanTier | undefined);
      }
      setError(err instanceof Error ? err.message : 'No se pudo generar la ficha Settei.');
    } finally {
      setCharacterLoading?.(charId, false);
    }
  };

  const handleApplyPromptToCover = (msg: KaiMessage) => {
    const promptText = (msg.visualPrompt || msg.text).trim().slice(0, 600);
    updateProject({
      cover: {
        ...project.cover,
        prompt: promptText,
      },
    });
    setMsgBusy(msg.id, false, true);
    onNavigateView('cover');
  };

  const handleGenerateCoverFromKai = async (msg: KaiMessage) => {
    const coverPrompt = (msg.visualPrompt || msg.text).trim();
    if (!coverPrompt || msg.actionBusy) return;
    setError('');
    setMsgBusy(msg.id, true);
    setTaskLoading?.('cover', true);
    try {
      const seeds = activeCharacters
        .map((c) => c.characterSeed)
        .filter((s): s is string => Boolean(s))
        .join(', ');
      const refs = activeCharacters
        .map((c) => c.referenceBase64)
        .filter((img): img is string => Boolean(img));
      const colorStyle =
        project.colorMode === 'color'
          ? 'Vibrant full color Tankobon wraparound cover'
          : 'High-contrast Sumi ink monochrome with Akai crimson accent Tankobon wraparound cover';

      const generated = await Flow.generate.image({
        prompt: `Wide 16:9 manga wraparound Tankobon book cover: ${coverPrompt}`,
        mode: 'cover_wrap',
        aspectRatio: '16:9',
        name: project.name || 'Manga',
        style: colorStyle,
        canon: seeds ? `Seeds: ${seeds}` : undefined,
        notes: coverPrompt,
        referenceImagesBase64: refs.length > 0 ? refs : undefined,
      });

      updateProject({
        cover: {
          ...project.cover,
          prompt: coverPrompt,
          fullWrapBase64: generated.dataUrl,
          frontBase64: generated.dataUrl,
          backBase64: generated.dataUrl,
        },
      });
      setMsgBusy(msg.id, false, true);
      onNavigateView('cover');
    } catch (err) {
      setMsgBusy(msg.id, false);
      if (err instanceof QuotaExceededError) {
        onQuotaBlocked?.(err.message, err.requiredPlan as PlanTier | undefined);
      }
      setError(err instanceof Error ? err.message : 'No se pudo generar la portada con KAI.');
    } finally {
      setTaskLoading?.('cover', false);
    }
  };

  const handleGenerateActiveKomaFromKai = async (msg: KaiMessage) => {
    if (!msg.visualPrompt || !currentPage || !selectedKoma || msg.actionBusy) return;
    const targetPageId = currentPage.id;
    const targetKomaId = selectedKoma.id;
    const targetPanelIdx = selectedKoma.panelIndex;
    const targetHandles = selectedKoma.taggedHandles ?? [];
    const targetArtStyle = currentPage.artStyle || 'Classic Shonen';

    setError('');
    setMsgBusy(msg.id, true);
    setKomaLoading?.(targetKomaId, true);
    try {
      const taggedSet = new Set(targetHandles.map((h) => h.toLowerCase()));
      const matchingSettei = activeCharacters.filter((c) =>
        taggedSet.size > 0
          ? taggedSet.has(normalizeTagHandle(c.tagHandle || '', c.name).toLowerCase())
          : true,
      );
      const seeds = matchingSettei
        .map((c) => (c.seedLocked && c.characterSeed ? `${c.name}: ${c.characterSeed}` : ''))
        .filter(Boolean)
        .join(' | ');
      const refs = matchingSettei
        .map((c) => c.referenceBase64)
        .filter((img): img is string => Boolean(img));
      const colorModeLabel =
        project.colorMode === 'color' ? 'Full Color Editorial Manga' : 'Blanco y Negro (Sumi Ink)';

      const generated = await Flow.generate.image({
        prompt: `${msg.visualPrompt} (${colorModeLabel})`,
        mode: 'panel',
        aspectRatio: '3:4',
        name: `${project.name || 'Manga'} · Viñeta #${targetPanelIdx}`,
        style: `${targetArtStyle} · ${colorModeLabel}`,
        canon: seeds || undefined,
        notes: msg.visualPrompt,
        referenceImagesBase64: refs.length > 0 ? refs : undefined,
      });

      const nextPages = project.pages.map((p) => {
        if (p.id !== targetPageId) return p;
        return {
          ...p,
          komas: (p.komas ?? []).map((k) =>
            k.id === targetKomaId
              ? {
                  ...k,
                  actionPrompt: msg.visualPrompt || k.actionPrompt,
                  inkRenderUrl: generated.dataUrl,
                  state: (k.state === 'LOCKED' ? 'LOCKED' : 'PEN_IRE') as KomaState,
                }
              : k,
          ),
        };
      });

      updateProject({ pages: nextPages });
      setMsgBusy(msg.id, false, true);
      onNavigateView('pages');
    } catch (err) {
      setMsgBusy(msg.id, false);
      if (err instanceof QuotaExceededError) {
        onQuotaBlocked?.(err.message, err.requiredPlan as PlanTier | undefined);
      }
      setError(err instanceof Error ? err.message : 'No se pudo entintar la viñeta.');
    } finally {
      setKomaLoading?.(targetKomaId, false);
    }
  };

  const handleAutocompleteProjectFromKai = (msg: KaiMessage) => {
    const titleMatch = msg.text.match(/(?:Título|Obra)\s*:\s*["«*]*([^"\n»*]+)/i);
    const authorMatch = msg.text.match(/(?:Autor|Mangaka)\s*:\s*["«*]*([^"\n»*]+)/i);
    const synopsisMatch = msg.text.match(/(?:Sinopsis|Contraportada)\s*:\s*([\s\S]+?)(?:\n\n|\[PROMPT|$)/i);
    const cleanSynopsis = (
      synopsisMatch?.[1] ||
      msg.text.replace(/\[PROMPT\s+VISUAL\][\s\S]*$/i, '')
    )
      .replace(/[*_`]/g, '')
      .trim()
      .slice(0, 360);
    const nextTitle = titleMatch?.[1]?.trim();
    const nextAuthor = authorMatch?.[1]?.trim();

    updateProject({
      ...(nextTitle ? { name: nextTitle } : {}),
      ...(nextAuthor ? { author: nextAuthor } : {}),
      cover: {
        ...project.cover,
        ...(nextTitle ? { spineTitle: nextTitle } : {}),
        backSynopsis: cleanSynopsis,
      },
    });
    setMsgBusy(msg.id, false, true);
  };

  const suggestion = STEP_SUGGESTIONS[activeView] || STEP_SUGGESTIONS.project;

  return (
    <div className="gf-kai-docked" aria-label="Espacio KAI conectado al proyecto">
      {/* Header with active Gemini 3 Flash badges */}
      <div className="gf-kai-docked-head">
        <div className="gf-kai-title-row">
          <div className="gf-kai-avatar">
            <Sparkles size={15} strokeWidth={2} className="gf-icon-shrink" />
          </div>
          <div>
            <h2 className="gf-kai-title">KAI · {activeStepMeta.title}</h2>
            <small className="gf-kai-subtitle" title={`${KAI_TEXT_MODEL_DEFAULT} · ${KAI_IMAGE_MODEL_DEFAULT}`}>
              Asistente del proyecto
            </small>
          </div>
        </div>
      </div>

      {/* Live Settei Draft Indicator */}
      {setteiDraft.open && setteiDraft.draft && (
        <div className="gf-kai-settei-draft-banner" role="status">
          <span>
            Editando Ficha Settei: {setteiDraft.draft.name || setteiDraft.draft.tagHandle || 'Nueva ficha'}
          </span>
        </div>
      )}

      <details className="kai-options"><summary>Opciones de KAI</summary>
      {/* Mode Switcher: Conversational Co-Design vs Multi-Page Koma-wari Script */}
      <div className="gf-kai-mode-switch" role="tablist" aria-label="Modo de trabajo con KAI">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'mentor'}
          className={`gf-kai-mode-btn ${mode === 'mentor' ? 'is-active' : ''}`}
          onClick={() => setMode('mentor')}
        >
          Co-Diseñar Paso Actual
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'script'}
          className={`gf-kai-mode-btn ${mode === 'script' ? 'is-active' : ''}`}
          onClick={() => setMode('script')}
        >
          Guionizar Páginas
        </button>
      </div>

      {/* Active Settei Handles Strip */}
      {activeSetteiPayload.length > 0 && (
        <div className="gf-kai-context-bar">
          <span className="gf-kai-context-label">
            Canon @Settei activo ({activeSetteiPayload.length}):
          </span>
          <div className="gf-kai-handle-pills">
            {activeSetteiPayload.slice(0, 6).map((item) => (
              <button
                key={item.tag_handle}
                type="button"
                className="gf-kai-handle-pill"
                onClick={() =>
                  setPrompt((prev) =>
                    prev.includes(item.tag_handle)
                      ? prev
                      : `${prev}${prev ? ' ' : ''}${item.tag_handle} `,
                  )
                }
              >
                {item.tag_handle}
              </button>
            ))}
          </div>
        </div>
      )}

      </details>
      {/* Conversation & Executable Project Cards */}
      <div className="gf-kai-messages dark-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`gf-kai-msg ${msg.role === 'user' ? 'is-user' : 'is-assistant'}`}
          >
            <div className="gf-kai-msg-bubble">
              <p className="gf-kai-msg-text">{msg.text}</p>
            </div>

            {/* Structured Multi-Page Script Output */}
            {msg.scriptOutput && (
              <div className="gf-kai-action-card">
                <div className="gf-kai-action-head">
                  <Layers size={14} strokeWidth={2} className="gf-icon-shrink" />
                  <span>
                    Guion Koma-wari · {msg.scriptOutput.script_pages.length}{' '}
                    {msg.scriptOutput.script_pages.length === 1 ? 'Página' : 'Páginas'}
                  </span>
                </div>

                <div className="gf-kai-page-summaries">
                  {msg.scriptOutput.script_pages.map((sp) => {
                    const presetLabel =
                      KOMA_LAYOUT_PRESETS[sp.suggested_layout]?.shortLabel || sp.suggested_layout;
                    return (
                      <div key={sp.page_number} className="gf-kai-page-summary">
                        <div className="gf-kai-page-summary-top">
                          <strong>Pág. {sp.page_number}</strong>
                          <span>
                            {presetLabel} · {sp.komas.length} viñetas
                          </span>
                        </div>
                        <p className="gf-kai-page-beat">{sp.chapter_beat}</p>
                      </div>
                    );
                  })}
                </div>

                <PillButton
                  variant={msg.applied ? 'outline' : 'filled'}
                  icon={
                    msg.applied ? (
                      <Check size={14} strokeWidth={2} />
                    ) : (
                      <BookMarked size={14} strokeWidth={1.75} />
                    )
                  }
                  onClick={() => {
                    const ok = onApplyScript(msg.scriptOutput!);
                    if (ok) setMsgBusy(msg.id, false, true);
                  }}
                >
                  {msg.applied
                    ? 'Páginas Aplicadas al Manuscrito'
                    : 'Inyectar Páginas y Viñetas al Proyecto'}
                </PillButton>
              </div>
            )}

            {/* Open Settei Form Autofill Button */}
            {msg.role === 'assistant' &&
              msg.id !== 'kai-welcome' &&
              !msg.scriptOutput &&
              setteiDraft.open && (
                <PillButton
                  variant="filled"
                  icon={
                    msg.applied ? (
                      <Check size={14} strokeWidth={2} />
                    ) : (
                      <UserCheck size={14} strokeWidth={2} />
                    )
                  }
                  onClick={() => handleAutofillOpenSettei(msg)}
                >
                  {msg.applied ? 'Ficha Settei Rellenada' : 'Rellenar Ficha Settei Abierta'}
                </PillButton>
              )}

            {/* Step 1: Project Title + Synopsis 1-Click Autocomplete */}
            {msg.role === 'assistant' &&
              msg.id !== 'kai-welcome' &&
              !msg.scriptOutput &&
              activeView === 'project' && (
                <PillButton
                  variant="outline"
                  icon={<Check size={13} strokeWidth={2} />}
                  onClick={() => handleAutocompleteProjectFromKai(msg)}
                >
                  {msg.applied
                    ? 'Obra y Sinopsis Aplicadas'
                    : 'Autocompletar Obra (Título + Sinopsis)'}
                </PillButton>
              )}

            {/* Step 3: Cover Quick Actions even without [PROMPT VISUAL] tag */}
            {msg.role === 'assistant' &&
              msg.id !== 'kai-welcome' &&
              !msg.scriptOutput &&
              activeView === 'cover' &&
              !msg.visualPrompt && (
                <div className="gf-kai-action-card">
                  <div className="gf-controls-actions">
                    <PillButton
                      variant="outline"
                      icon={<Check size={13} strokeWidth={2} />}
                      onClick={() => handleApplyPromptToCover(msg)}
                    >
                      Aplicar Prompt a Portada
                    </PillButton>
                    <PillButton
                      variant="filled"
                      disabled={Boolean(msg.actionBusy)}
                      icon={<BookOpen size={14} strokeWidth={1.75} />}
                      onClick={() => handleGenerateCoverFromKai(msg)}
                    >
                      Generar Portada 16:9
                    </PillButton>
                  </div>
                </div>
              )}

            {/* Direct Project Execution Bridge when KAI generates a [PROMPT VISUAL]: */}
            {msg.role === 'assistant' && msg.visualPrompt && (
              <div className="gf-kai-action-card">
                <div className="gf-kai-action-head">
                  <Sparkles size={13} strokeWidth={2} className="gf-icon-shrink" />
                  <span>Aplicar con Gemini 3.1 Flash Image</span>
                </div>

                <div className="gf-controls-actions">
                  {(activeView === 'characters' || activeView === 'project') && (
                    <PillButton
                      variant="filled"
                      disabled={Boolean(msg.actionBusy)}
                      icon={
                        msg.actionBusy ? (
                          <RefreshCw size={14} strokeWidth={2} className="gf-spin" />
                        ) : (
                          <Users size={14} strokeWidth={1.75} />
                        )
                      }
                      onClick={() => handleCreateSetteiFromKai(msg)}
                    >
                      Crear Ficha @Settei + Hoja 1:1
                    </PillButton>
                  )}

                  {activeView === 'cover' && (
                    <PillButton
                      variant="outline"
                      icon={<Check size={13} strokeWidth={2} />}
                      onClick={() => handleApplyPromptToCover(msg)}
                    >
                      Aplicar Prompt a Portada
                    </PillButton>
                  )}

                  <PillButton
                    variant={activeView === 'cover' ? 'filled' : 'outline'}
                    disabled={Boolean(msg.actionBusy)}
                    icon={<BookOpen size={14} strokeWidth={1.75} />}
                    onClick={() => handleGenerateCoverFromKai(msg)}
                  >
                    Generar Portada 16:9
                  </PillButton>

                  {selectedKoma && (
                    <PillButton
                      variant={activeView === 'pages' ? 'filled' : 'outline'}
                      disabled={Boolean(msg.actionBusy)}
                      icon={<BookMarked size={14} strokeWidth={1.75} />}
                      onClick={() => handleGenerateActiveKomaFromKai(msg)}
                    >
                      Entintar Viñeta #{selectedKoma.panelIndex} (Pág. {activePageIndex + 1})
                    </PillButton>
                  )}

                  <PillButton
                    variant="outline"
                    icon={<PenTool size={14} strokeWidth={1.75} />}
                    onClick={() => {
                      onSendPromptToTablet(msg.visualPrompt!);
                      onNavigateView('drawing_tablet');
                    }}
                  >
                    Usar en Tabla de Dibujo Digital
                  </PillButton>
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="gf-kai-thinking">
            <RefreshCw size={14} strokeWidth={2} className="gf-spin gf-icon-shrink" />
            <span>KAI está trabajando sobre «{project.name || 'tu proyecto'}»...</span>
          </div>
        )}
        <div ref={feedEndRef} />
      </div>

      {/* Contextual Quick Prompts for Current Project Step */}
      <div className="gf-kai-suggestions">
        <button type="button" className="gf-kai-suggestion-btn" disabled={loading}
          onClick={() => setPrompt(suggestion)}>{suggestion}</button>
      </div>

      {error && <div className="gf-inline-error gf-kai-error">{error}</div>}

      {/* Composer */}
      <form
        className="gf-kai-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSendMessage();
        }}
      >
        {mode === 'script' && (
          <div className="gf-kai-composer-meta">
            <label className="gf-kai-pages-select">
              <span>Páginas:</span>
              <select
                value={targetPages}
                onChange={(e) => setTargetPages(Number(e.target.value))}
                disabled={loading}
              >
                <option value={1}>1 pág.</option>
                <option value={2}>2 págs.</option>
                <option value={3}>3 págs.</option>
              </select>
            </label>
            <span className="gf-kai-dir-pill">
              Lectura {(project.readingDirection || 'rtl').toUpperCase()}
            </span>
          </div>
        )}

        <div className="gf-kai-input-wrap">
          <textarea
            className="gf-kai-textarea"
            aria-label="Mensaje para KAI"
            maxLength={mode === 'script' ? 3000 : 4000}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void handleSendMessage();
              }
            }}
            placeholder={
              mode === 'script'
                ? 'Describe la escena para crear páginas y viñetas Koma-wari...'
                : activeView === 'cover' ? '¿Qué quieres cambiar de esta cubierta?' : 'Escribe a KAI…'
            }
            rows={2}
            disabled={loading}
          />
          <button
            type="submit"
            className="gf-kai-send-btn"
            disabled={loading || !prompt.trim()}
          >
            {loading ? (
              <RefreshCw size={14} strokeWidth={2} className="gf-spin gf-icon-shrink" />
            ) : (
              <Send size={14} strokeWidth={2} className="gf-icon-shrink" />
            )}
            <span>{mode === 'script' ? 'Estructurar Páginas' : 'Enviar a KAI'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
