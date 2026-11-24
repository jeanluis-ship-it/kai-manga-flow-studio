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

const STEP_PIPELINE: Array<{
  id: StudioView;
  stepNum: number;
  shortLabel: string;
  title: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'project',
    stepNum: 1,
    shortLabel: '1. Obra',
    title: 'Configuración y Lomo',
    icon: <Printer size={12} strokeWidth={2} />,
  },
  {
    id: 'characters',
    stepNum: 2,
    shortLabel: '2. Settei',
    title: 'Settei y Personajes',
    icon: <Users size={12} strokeWidth={2} />,
  },
  {
    id: 'cover',
    stepNum: 3,
    shortLabel: '3. Portada',
    title: 'Portada Tankōbon',
    icon: <BookOpen size={12} strokeWidth={2} />,
  },
  {
    id: 'pages',
    stepNum: 4,
    shortLabel: '4. Páginas',
    title: 'Páginas e Interiores',
    icon: <BookMarked size={12} strokeWidth={2} />,
  },
  {
    id: 'drawing_tablet',
    stepNum: 5,
    shortLabel: '5. Tabla',
    title: 'Tabla de Dibujo Digital',
    icon: <PenTool size={12} strokeWidth={2} />,
  },
];

const STEP_SUGGESTIONS: Record<StudioView, string[]> = {
  project: [
    'Propón un título potente, tono editorial y sinopsis de contraportada para mi manga.',
    'Ayúdame a estructurar el primer volumen de fantasía oscura en formato Tankōbon B6.',
  ],
  characters: [
    'Diseña al protagonista principal con rasgos únicos, vestuario icónico y anclas visuales.',
    'Crea un antagonista memorable con silueta contrastante lista para ficha Settei.',
  ],
  cover: [
    'Diseña la composición envolvente 16:9 de portada, lomo y contraportada para este tomo.',
    'Propón una portada dramática de alto impacto con iluminación carmesí y tinta sumi.',
  ],
  pages: [
    'Estructura una página de tensión bajo la lluvia en 4 viñetas con giro final.',
    'Arma un combate dinámico en 5 viñetas con corte diagonal y diálogos breves.',
  ],
  drawing_tablet: [
    'Dame instrucciones de entintado G-Pen y anatomía para mejorar el boceto de mi Tabla de Dibujo.',
    'Prepara un [PROMPT VISUAL]: para pasar mi borrador dibujado a manga profesional con tramas.',
  ],
};

export interface KaiCopilotDrawerProps {
  project: Project;
  activeView: StudioView;
  activePageIndex: number;
  selectedKomaId: string | null;
  pendingExternalMessage?: string;
  onConsumeExternalMessage?: () => void;
  onNavigateView: (view: StudioView) => void;
  updateProject: (updates: Partial<Project>) => void;
  onApplyScript: (output: KaiDualOutput) => boolean;
  onSendPromptToTablet: (visualPrompt: string) => void;
  onQuotaBlocked?: (reason: string, requiredPlan?: PlanTier) => void;
}

export const KaiCopilotDrawer: React.FC<KaiCopilotDrawerProps> = ({
  project,
  activeView,
  activePageIndex,
  selectedKomaId,
  pendingExternalMessage,
  onConsumeExternalMessage,
  onNavigateView,
  updateProject,
  onApplyScript,
  onSendPromptToTablet,
  onQuotaBlocked,
}) => {
  const [mode, setMode] = useState<'mentor' | 'script'>('mentor');
  const [prompt, setPrompt] = useState('');
  const [targetPages, setTargetPages] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<KaiMessage[]>([
    {
      id: 'kai-welcome',
      role: 'assistant',
      text: 'Soy KAI, conectado en vivo a cada paso de tu proyecto con Gemini 3 Flash. Todo lo que diseñemos aquí se aplica directo a tu Configuración, fichas @Settei, Portada Tankōbon, Páginas Koma-wari o tu Tabla de Dibujo.',
    },
  ]);

  const feedEndRef = useRef<HTMLDivElement | null>(null);
  const consumedUrlRef = useRef(false);

  const activeSetteiPayload = useMemo(
    () =>
      project.characters.map((c) => ({
        tag_handle: normalizeTagHandle(c.tagHandle || '', c.name),
        name: c.name || 'Sin nombre',
        entity_type: c.entityType || 'character',
        visual_anchors: c.visualAnchors ?? [],
      })),
    [project.characters],
  );

  const activeSetteiStrings = useMemo(
    () =>
      project.characters.map((c) => {
        const handle = normalizeTagHandle(c.tagHandle || '', c.name);
        const anchors = (c.visualAnchors ?? []).join(', ');
        return `${handle} (${c.name}): ${c.appearance} ${c.clothing} ${anchors ? `[Anclas: ${anchors}]` : ''}`.trim();
      }),
    [project.characters],
  );

  const currentPage = project.pages[activePageIndex];
  const selectedKoma =
    currentPage?.komas?.find((k) => k.id === selectedKomaId) ??
    currentPage?.komas?.[0] ??
    null;

  const projectContextSummary = useMemo(() => {
    const stepMeta = STEP_PIPELINE.find((s) => s.id === activeView);
    return [
      `Paso actual del usuario: ${stepMeta?.title || activeView}.`,
      `Título del proyecto: "${project.name || 'Manga sin título'}" por ${project.author || 'Autor'}.`,
      `Formato: ${project.trimFormat || 'tankobon_b6'}, Lectura: ${(project.readingDirection || 'rtl').toUpperCase()}, Fichas Settei: ${project.characters.length}, Páginas en manuscrito: ${project.pages.length}.`,
      selectedKoma && activeView === 'pages'
        ? `Viñeta seleccionada: Página ${activePageIndex + 1}, Viñeta #${selectedKoma.panelIndex} (${selectedKoma.cameraAngle}).`
        : '',
    ]
      .filter(Boolean)
      .join(' ');
  }, [activeView, project, activePageIndex, selectedKoma]);

  // Read deep-link parameters from Landing Hero (?volume=...&title=...&prompt=...)
  useEffect(() => {
    if (consumedUrlRef.current || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const incomingTitle = params.get('title')?.trim();
    const incomingPrompt = params.get('prompt')?.trim();
    if (!incomingTitle && !incomingPrompt) return;
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

    if (incomingPrompt) {
      setMessages((prev) => [
        ...prev,
        {
          id: `kai-deeplink-${Date.now()}`,
          role: 'assistant',
          text: `Cargué el universo «${incomingTitle || project.name}» en tu proyecto. Usa los botones de abajo para generar su protagonista en @Settei, su Portada 16:9, enviarlo a tu Tabla de Dibujo o estructurar su primera página.`,
          visualPrompt: incomingPrompt,
        },
      ]);
    }
  }, [project.cover, project.name, updateProject]);

  useEffect(() => {
    if (!pendingExternalMessage?.trim()) return;
    const msg = pendingExternalMessage.trim();
    onConsumeExternalMessage?.();
    setMode('mentor');
    void handleSendMessage(msg, 'mentor');
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
        const response = await fetch('/api/kai/script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

  const handleCreateSetteiFromKai = async (msg: KaiMessage) => {
    if (!msg.visualPrompt || msg.actionBusy) return;
    setError('');
    setMsgBusy(msg.id, true);
    try {
      const charNum = project.characters.length + 1;
      const inferredNameMatch = msg.text.match(/(?:Nombre|Personaje|Protagonista)\s*:\s*([^\n.,*]+)/i);
      const nameClean = inferredNameMatch?.[1]?.trim().slice(0, 36) || `Personaje ${charNum}`;
      const handle = normalizeTagHandle('', nameClean);

      const generated = await Flow.generate.image({
        prompt: `Character turnaround reference sheet, clean white background, front and side views: ${msg.visualPrompt}`,
        mode: 'sheet',
        aspectRatio: '1:1',
        name: `${nameClean} (${handle})`,
        details: msg.visualPrompt,
      });

      const newChar: Character = {
        id: crypto.randomUUID(),
        entityType: 'character',
        tagHandle: handle,
        name: nameClean,
        appearance: msg.visualPrompt,
        clothing: '',
        role: 'Diseñado con KAI',
        visualAnchors: [],
        seedLocked: true,
        characterSeed: `SEED-${Math.floor(100000 + Math.random() * 900000)}`,
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
    }
  };

  const handleGenerateCoverFromKai = async (msg: KaiMessage) => {
    if (!msg.visualPrompt || msg.actionBusy) return;
    setError('');
    setMsgBusy(msg.id, true);
    try {
      const generated = await Flow.generate.image({
        prompt: `Wide 16:9 manga wraparound Tankobon book cover: ${msg.visualPrompt}`,
        mode: 'cover_wrap',
        aspectRatio: '16:9',
        name: project.name || 'Manga',
        notes: msg.visualPrompt,
      });

      updateProject({
        cover: {
          ...project.cover,
          prompt: msg.visualPrompt,
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
    }
  };

  const handleGenerateActiveKomaFromKai = async (msg: KaiMessage) => {
    if (!msg.visualPrompt || !currentPage || !selectedKoma || msg.actionBusy) return;
    setError('');
    setMsgBusy(msg.id, true);
    try {
      const generated = await Flow.generate.image({
        prompt: msg.visualPrompt,
        mode: 'panel',
        aspectRatio: '3:4',
        name: `${project.name || 'Manga'} · Viñeta #${selectedKoma.panelIndex}`,
        notes: msg.visualPrompt,
      });

      const nextPages = project.pages.map((p) => {
        if (p.id !== currentPage.id) return p;
        return {
          ...p,
          komas: (p.komas ?? []).map((k) =>
            k.id === selectedKoma.id
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
    }
  };

  const handleApplySynopsisToProject = (msg: KaiMessage) => {
    const titleMatch = msg.text.match(/(?:Título|Obra)\s*:\s*["«*]*([^"\n»*]+)/i);
    const cleanSynopsis = msg.text.replace(/\[PROMPT\s+VISUAL\][\s\S]*$/i, '').trim().slice(0, 360);
    updateProject({
      ...(titleMatch?.[1]?.trim() ? { name: titleMatch[1].trim() } : {}),
      cover: {
        ...project.cover,
        ...(titleMatch?.[1]?.trim() ? { spineTitle: titleMatch[1].trim() } : {}),
        backSynopsis: cleanSynopsis,
      },
    });
    setMsgBusy(msg.id, false, true);
  };

  const suggestions = STEP_SUGGESTIONS[activeView] || STEP_SUGGESTIONS.project;

  return (
    <div className="gf-kai-docked" aria-label="Espacio KAI conectado al proyecto">
      {/* Header with active Gemini 3 Flash badges */}
      <div className="gf-kai-docked-head">
        <div className="gf-kai-title-row">
          <div className="gf-kai-avatar">
            <Sparkles size={15} strokeWidth={2} className="gf-icon-shrink" />
          </div>
          <div>
            <h2 className="gf-kai-title">Espacio KAI · Proyecto</h2>
            <p className="gf-kai-subtitle">
              {KAI_TEXT_MODEL_DEFAULT} · {KAI_IMAGE_MODEL_DEFAULT}
            </p>
          </div>
        </div>
      </div>

      {/* Interactive 5-Step Project Pipeline */}
      <div className="gf-kai-pipeline" role="navigation" aria-label="Pasos del proyecto con KAI">
        {STEP_PIPELINE.map((step) => {
          const isCurrent = activeView === step.id;
          const isCompleted =
            (step.id === 'project' && project.name && project.name !== 'Manga sin título') ||
            (step.id === 'characters' && project.characters.length > 0) ||
            (step.id === 'cover' && Boolean(project.cover.fullWrapBase64)) ||
            (step.id === 'pages' &&
              project.pages.some((p) => (p.komas ?? []).some((k) => Boolean(k.inkRenderUrl))));

          return (
            <button
              key={step.id}
              type="button"
              className={`gf-kai-step-pill ${isCurrent ? 'is-current' : ''} ${
                isCompleted ? 'is-done' : ''
              }`}
              onClick={() => onNavigateView(step.id)}
              title={`Ir a ${step.title}`}
            >
              {step.icon}
              <span>{step.shortLabel}</span>
            </button>
          );
        })}
      </div>

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

            {/* Direct Project Execution Bridge when KAI generates a [PROMPT VISUAL]: */}
            {msg.role === 'assistant' && msg.visualPrompt && (
              <div className="gf-kai-action-card">
                <div className="gf-kai-action-head">
                  <Sparkles size={13} strokeWidth={2} className="gf-icon-shrink" />
                  <span>Aplicar con Gemini 3.1 Flash Image</span>
                </div>

                <div className="gf-controls-actions">
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

                  <PillButton
                    variant="outline"
                    disabled={Boolean(msg.actionBusy)}
                    icon={<BookOpen size={14} strokeWidth={1.75} />}
                    onClick={() => handleGenerateCoverFromKai(msg)}
                  >
                    Generar Portada 16:9 del Proyecto
                  </PillButton>

                  {selectedKoma && (
                    <PillButton
                      variant="outline"
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

            {/* Project Metadata Helper on Step 1 */}
            {msg.role === 'assistant' &&
              msg.id !== 'kai-welcome' &&
              !msg.scriptOutput &&
              activeView === 'project' && (
                <PillButton
                  variant="outline"
                  icon={<Check size={13} strokeWidth={2} />}
                  onClick={() => handleApplySynopsisToProject(msg)}
                >
                  {msg.applied ? 'Sinopsis Aplicada ✓' : 'Guardar Sinopsis en Contraportada'}
                </PillButton>
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
        {suggestions.map((sample) => (
          <button
            key={sample}
            type="button"
            className="gf-kai-suggestion-btn"
            onClick={() =>
              handleSendMessage(sample, activeView === 'pages' ? 'script' : mode)
            }
            disabled={loading}
          >
            {sample}
          </button>
        ))}
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
                : 'Habla con KAI sobre el paso actual de tu manga...'
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
