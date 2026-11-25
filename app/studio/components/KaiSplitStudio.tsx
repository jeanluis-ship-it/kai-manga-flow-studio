'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Download,
  ImageIcon,
  Palette,
  Ratio,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import {
  KAI_ASPECT_RATIOS,
  KAI_CANVAS_STYLES,
  KAI_IMAGE_MODEL_DEFAULT,
  KAI_TEXT_MODEL_DEFAULT,
  KaiServiceError,
  askKaiAssistant,
  extractVisualPrompt,
  generateMangaPanel,
  type KaiCanvasAspectRatio,
  type KaiCanvasStyleId,
  type KaiChatHistoryTurn,
} from '@/lib/kai/studioCanvas';
import type { PlanTier } from '@/lib/plans/quotas';
import { Flow } from '../flow-sdk';
import { normalizeTagHandle, toDataImageSrc, type Project } from '../types';
import './KaiSplitStudio.css';

export interface KaiSplitStudioProps {
  project: Project;
  onQuotaBlocked?: (reason: string, requiredPlan?: PlanTier) => void;
}

interface ChatMessageItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  visualPrompt: string | null;
  model?: string;
  isWelcome?: boolean;
}

interface GeneratedPanelItem {
  id: string;
  image: string;
  mimeType: string;
  model: string;
  prompt: string;
  promptUsed: string;
  style: KaiCanvasStyleId;
  aspectRatio: KaiCanvasAspectRatio;
  createdAt: number;
}

const MAX_SESSION_GALLERY = 6;

const STARTER_PROMPTS: readonly string[] = [
  'Diseña una escena épica de duelo bajo lluvia nocturna con plano contrapicado y mucha tensión.',
  'Crea un protagonista dark fantasy estilo manhwa con aura sombría, cicatriz luminosa y mirada fría.',
  'Propón la composición de portada de volumen con héroe en primer plano y ciudad en ruinas detrás.',
];

const DEFAULT_WELCOME_VISUAL_PROMPT =
  'Dramatic low-angle shot of a lone swordswoman standing on a rain-slicked ancient temple roof at midnight, tattered cloak billowing in storm wind, crescent moon behind dark ink clouds, stark rim lighting, dynamic speedlines, high-contrast Japanese manga ink aesthetic';

const WELCOME_MESSAGE_TEXT = [
  'Soy Kai, tu Director de Arte de Manga y Manhwa. Describe una escena, diseño de personaje, encuadre o portada y prepararé un prompt visual listo para generar.',
  '',
  `[PROMPT VISUAL]: ${DEFAULT_WELCOME_VISUAL_PROMPT}`,
].join('\n');

const VALID_CANVAS_STYLES: ReadonlySet<KaiCanvasStyleId> = new Set([
  'manga_ink',
  'webtoon_color',
  'cover_art',
  'chibi_kai',
]);

function isValidCanvasStyle(raw: string | null): raw is KaiCanvasStyleId {
  return raw !== null && VALID_CANVAS_STYLES.has(raw as KaiCanvasStyleId);
}

function buildDeepLinkWelcomeText(title: string, prompt: string): string {
  const cleanTitle = title.trim();
  const cleanPrompt = prompt.trim();
  const fallbackPrompt = cleanTitle
    ? `Dramatic manga key visual and scene illustration for "${cleanTitle}", dynamic framing, crisp ink lineart, dramatic rim lighting, detailed background`
    : DEFAULT_WELCOME_VISUAL_PROMPT;
  const visualPrompt = cleanPrompt || fallbackPrompt;
  const intro = cleanTitle
    ? `Abriste "${cleanTitle}" desde el visor 3D de MANGAI. Ya preparé su dirección visual en el Lienzo IA; pídeme ajustes de cámara, personajes o viñetas, o pulsa «Generar Ilustración» al instante.`
    : 'Recibí tu escena desde el visor 3D de MANGAI y la preparé en el Lienzo IA. Pídeme ajustes de cámara, iluminación o personajes, o pulsa «Generar Ilustración» al instante.';

  return [intro, '', `[PROMPT VISUAL]: ${visualPrompt}`].join('\n');
}

const RATIO_NUMBERS: Record<KaiCanvasAspectRatio, number> = {
  '3:4': 3 / 4,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
  '1:1': 1,
};

const RATIO_GLYPH_CLASSES: Record<KaiCanvasAspectRatio, string> = {
  '3:4': 'ratio-3-4',
  '9:16': 'ratio-9-16',
  '16:9': 'ratio-16-9',
  '1:1': 'ratio-1-1',
};

let localIdSeq = 0;
function createLocalId(prefix: string): string {
  localIdSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${localIdSeq}`;
}

function createWelcomeMessage(customText?: string, explicitVisualPrompt?: string): ChatMessageItem {
  const text = customText ?? WELCOME_MESSAGE_TEXT;
  return {
    id: 'kai-split-welcome',
    role: 'model',
    text,
    visualPrompt: extractVisualPrompt(text) ?? (explicitVisualPrompt || null),
    model: KAI_TEXT_MODEL_DEFAULT,
    isWelcome: true,
  };
}

function toPlanTier(raw?: string): PlanTier | undefined {
  if (raw === 'trial' || raw === 'starter' || raw === 'pro' || raw === 'master') {
    return raw;
  }
  return undefined;
}

function mimeTypeToExtension(mimeType: string): string {
  const clean = mimeType.toLowerCase();
  if (clean.includes('jpeg') || clean.includes('jpg')) return 'jpg';
  if (clean.includes('webp')) return 'webp';
  if (clean.includes('gif')) return 'gif';
  return 'png';
}

function buildDownloadFilename(item: Pick<GeneratedPanelItem, 'style' | 'aspectRatio' | 'mimeType'>): string {
  const ext = mimeTypeToExtension(item.mimeType);
  return `mangai-${item.style}-${item.aspectRatio.replace(':', 'x')}.${ext}`;
}

function splitMessageNarrative(
  text: string,
  resolvedVisualPrompt: string | null,
): { narrative: string; hasEmbeddedTag: boolean } {
  if (!resolvedVisualPrompt) {
    return { narrative: text, hasEmbeddedTag: false };
  }
  const normalized = text.replace(/\r\n/g, '\n');
  const tagMatch = normalized.match(
    /(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*{1,2}|_{1,2})?\[PROMPT\s+VISUAL\](?:\*{1,2}|_{1,2})?\s*:?/i,
  );
  if (!tagMatch || tagMatch.index === undefined) {
    return { narrative: text, hasEmbeddedTag: false };
  }

  const before = normalized.slice(0, tagMatch.index).trim();
  const afterTag = normalized.slice(tagMatch.index + tagMatch[0].length);
  const nextSection = afterTag.match(
    /\n\s*(?:#{1,4}\s|(?:\*{1,2}|_{1,2})?\[[^\]\n]{2,40}\](?:\*{1,2}|_{1,2})?\s*:)/,
  );
  const trailing =
    nextSection?.index !== undefined ? afterTag.slice(nextSection.index).trim() : '';

  return {
    narrative: [before, trailing].filter(Boolean).join('\n\n'),
    hasEmbeddedTag: true,
  };
}

function buildChatHistoryForApi(messages: ChatMessageItem[]): KaiChatHistoryTurn[] {
  const nonWelcome = messages.filter((m) => !m.isWelcome);
  // Keep valid alternating history ending on the last model turn so follow-ups stay valid.
  const lastModelIndex = [...nonWelcome].reverse().findIndex((m) => m.role === 'model');
  const sliceEnd = lastModelIndex === -1 ? 0 : nonWelcome.length - lastModelIndex;
  const paired = nonWelcome.slice(0, sliceEnd);

  return paired.slice(-30).map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));
}

export const KaiSplitStudio: React.FC<KaiSplitStudioProps> = ({
  project,
  onQuotaBlocked,
}) => {
  const [messages, setMessages] = useState<ChatMessageItem[]>(() => [createWelcomeMessage()]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const [activeTextModel, setActiveTextModel] = useState<string>(KAI_TEXT_MODEL_DEFAULT);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const [canvasPrompt, setCanvasPrompt] = useState('');
  const [style, setStyle] = useState<KaiCanvasStyleId>('manga_ink');
  const [aspectRatio, setAspectRatio] = useState<KaiCanvasAspectRatio>('3:4');
  const [canvasLoading, setCanvasLoading] = useState(false);
  const [canvasError, setCanvasError] = useState('');
  const [activeImageModel, setActiveImageModel] = useState<string>(KAI_IMAGE_MODEL_DEFAULT);
  const [promptFlash, setPromptFlash] = useState(false);
  const [gallery, setGallery] = useState<GeneratedPanelItem[]>([]);
  const [activeResultId, setActiveResultId] = useState<string | null>(null);

  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const copiedTimerRef = useRef<number | null>(null);
  const flashTimerRef = useRef<number | null>(null);
  const chatSessionRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current);
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const incomingVolume = (params.get('volume') || '').trim().slice(0, 80);
      const incomingTitle = (params.get('title') || '').trim().slice(0, 140);
      const incomingStyle = (params.get('style') || '').trim();
      const incomingPrompt = (params.get('prompt') || '').trim().slice(0, 2000);

      if (isValidCanvasStyle(incomingStyle)) {
        setStyle(incomingStyle);
      }

      const displayTitle = incomingTitle || incomingVolume;
      if (displayTitle || incomingPrompt) {
        const welcomeText = buildDeepLinkWelcomeText(displayTitle, incomingPrompt);
        setMessages((prev) => {
          if (prev.length !== 1 || !prev[0]?.isWelcome) {
            return prev;
          }
          return [createWelcomeMessage(welcomeText, incomingPrompt)];
        });
      }

      if (incomingPrompt) {
        setCanvasPrompt(incomingPrompt);
        setPromptFlash(true);
        if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
        const timerId = window.setTimeout(() => {
          if (mountedRef.current) setPromptFlash(false);
        }, 900);
        flashTimerRef.current = timerId;

        return () => {
          window.clearTimeout(timerId);
          if (flashTimerRef.current === timerId) {
            flashTimerRef.current = null;
          }
        };
      }
    }

    return undefined;
  }, []);

  useEffect(() => {
    if (messages.length > 1 || chatLoading) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length, chatLoading]);

  const setteiItems = useMemo(() => {
    const chars = Array.isArray(project?.characters) ? project.characters : [];
    return chars.slice(0, 20).map((c, idx) => {
      const handle = normalizeTagHandle(c.tagHandle || '', c.name);
      const summary = [
        `${handle} (${c.name || 'Sin nombre'})`,
        c.role ? `Rol: ${c.role}` : '',
        c.appearance ? `Apariencia: ${c.appearance}` : '',
        c.clothing ? `Vestimenta: ${c.clothing}` : '',
        c.visualAnchors?.length ? `Anclas: ${c.visualAnchors.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join(' · ')
        .slice(0, 950);
      return {
        key: c.id || `${handle}-${idx}`,
        handle,
        name: c.name || 'Sin nombre',
        summary,
      };
    });
  }, [project?.characters]);

  const activeSetteiStrings = useMemo(
    () => setteiItems.map((item) => item.summary),
    [setteiItems],
  );

  const selectedStyleOption = useMemo(
    () => KAI_CANVAS_STYLES.find((s) => s.id === style) ?? KAI_CANVAS_STYLES[0],
    [style],
  );

  const selectedRatioOption = useMemo(
    () => KAI_ASPECT_RATIOS.find((r) => r.id === aspectRatio) ?? KAI_ASPECT_RATIOS[0],
    [aspectRatio],
  );

  const activeResult = useMemo(
    () => gallery.find((item) => item.id === activeResultId) ?? gallery[0] ?? null,
    [gallery, activeResultId],
  );

  const frameRatioOption = useMemo(() => {
    if (!canvasLoading && activeResult) {
      return (
        KAI_ASPECT_RATIOS.find((r) => r.id === activeResult.aspectRatio) ?? selectedRatioOption
      );
    }
    return selectedRatioOption;
  }, [canvasLoading, activeResult, selectedRatioOption]);

  const showStarterPills = messages.every((m) => m.isWelcome);

  const handleInsertSetteiHandle = (handle: string) => {
    setChatInput((prev) => {
      const trimmed = prev.trimEnd();
      if (!trimmed) return `${handle} `;
      return `${trimmed} ${handle} `;
    });
    chatInputRef.current?.focus();
  };

  const handleNewChat = () => {
    chatSessionRef.current += 1;
    setMessages([createWelcomeMessage()]);
    setChatInput('');
    setChatError('');
    setChatLoading(false);
    setCopiedMsgId(null);
    chatInputRef.current?.focus();
  };

  const handleSendChat = async (customText?: string) => {
    const cleanMessage = (customText ?? chatInput).trim();
    if (!cleanMessage || chatLoading) return;

    const sessionToken = chatSessionRef.current;
    const historyPayload = buildChatHistoryForApi(messages);

    setChatError('');
    setChatLoading(true);
    if (!customText) setChatInput('');

    const userTurn: ChatMessageItem = {
      id: createLocalId('user'),
      role: 'user',
      text: cleanMessage,
      visualPrompt: null,
    };
    setMessages((prev) => [...prev, userTurn]);

    try {
      const result = await askKaiAssistant(
        cleanMessage,
        historyPayload,
        activeSetteiStrings.length > 0 ? { activeSettei: activeSetteiStrings } : undefined,
      );

      if (!mountedRef.current || sessionToken !== chatSessionRef.current) return;

      const resolvedModel = result.model || KAI_TEXT_MODEL_DEFAULT;
      setActiveTextModel(resolvedModel);

      const resolvedVisual = result.visualPrompt || extractVisualPrompt(result.reply);
      const modelTurn: ChatMessageItem = {
        id: createLocalId('model'),
        role: 'model',
        text: result.reply,
        visualPrompt: resolvedVisual,
        model: resolvedModel,
      };
      setMessages((prev) => [...prev, modelTurn]);
    } catch (err) {
      if (!mountedRef.current || sessionToken !== chatSessionRef.current) return;

      if (err instanceof KaiServiceError) {
        setChatError(err.message);
        if (err.code === 'QUOTA_EXCEEDED' || err.status === 402) {
          onQuotaBlocked?.(err.message, toPlanTier(err.requiredPlan));
        }
      } else {
        setChatError(
          err instanceof Error ? err.message : 'No se pudo obtener respuesta de Kai.',
        );
      }
    } finally {
      if (mountedRef.current && sessionToken === chatSessionRef.current) {
        setChatLoading(false);
      }
    }
  };

  const handleSendToCanvas = (msg: ChatMessageItem) => {
    const payloadPrompt = (
      msg.visualPrompt ||
      extractVisualPrompt(msg.text) ||
      msg.text
    ).trim();

    setCanvasPrompt(payloadPrompt);
    setCanvasError('');
    setCopiedMsgId(msg.id);

    if (copiedTimerRef.current !== null) window.clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current) setCopiedMsgId(null);
    }, 1800);

    setPromptFlash(false);
    if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    window.requestAnimationFrame(() => {
      if (!mountedRef.current) return;
      setPromptFlash(true);
      flashTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) setPromptFlash(false);
      }, 760);
    });

    promptInputRef.current?.focus();
  };

  const handleGeneratePanel = async () => {
    const cleanPrompt = canvasPrompt.trim();
    if (cleanPrompt.length < 2 || canvasLoading) return;

    setCanvasError('');
    setCanvasLoading(true);

    try {
      const result = await generateMangaPanel({
        prompt: cleanPrompt,
        style,
        aspectRatio,
      });

      if (!mountedRef.current) return;

      const resolvedModel = result.model || KAI_IMAGE_MODEL_DEFAULT;
      setActiveImageModel(resolvedModel);

      const created: GeneratedPanelItem = {
        id: createLocalId('panel'),
        image: result.image,
        mimeType: result.mimeType || 'image/png',
        model: resolvedModel,
        prompt: cleanPrompt,
        promptUsed: result.promptUsed,
        style,
        aspectRatio,
        createdAt: Date.now(),
      };

      setGallery((prev) => [created, ...prev].slice(0, MAX_SESSION_GALLERY));
      setActiveResultId(created.id);
    } catch (err) {
      if (!mountedRef.current) return;

      if (err instanceof KaiServiceError) {
        setCanvasError(err.message);
        if (err.code === 'QUOTA_EXCEEDED' || err.status === 402) {
          onQuotaBlocked?.(err.message, toPlanTier(err.requiredPlan));
        }
      } else {
        setCanvasError(
          err instanceof Error
            ? err.message
            : 'Error inesperado al generar la ilustración.',
        );
      }
    } finally {
      if (mountedRef.current) {
        setCanvasLoading(false);
      }
    }
  };

  const handleDownloadResult = async (item: GeneratedPanelItem) => {
    try {
      setCanvasError('');
      await Flow.download({
        base64: item.image,
        mimeType: item.mimeType,
        filename: buildDownloadFilename(item),
      });
    } catch (err) {
      setCanvasError(
        err instanceof Error ? err.message : 'No se pudo descargar la imagen.',
      );
    }
  };

  const frameStyle = {
    aspectRatio: frameRatioOption.cssRatio,
    '--kss-ratio-num': String(RATIO_NUMBERS[frameRatioOption.id]),
  } as React.CSSProperties;

  return (
    <section className="kss-split-root" aria-label="Espacio dividido Kai y Lienzo IA">
      {/* LEFT PANE — CHAT CON KAI */}
      <div className="kss-pane-chat">
        <header className="kss-pane-header">
          <div className="kss-pane-title-group">
            <div className="kss-avatar-badge" aria-hidden="true">
              <Sparkles size={16} strokeWidth={2} className="gf-icon-shrink" />
            </div>
            <div className="kss-pane-title-text">
              <h2 className="kss-pane-title">Chat con Kai</h2>
              <p className="kss-pane-subtitle">Director de Arte de Manga y Manhwa</p>
            </div>
          </div>

          <div className="kss-header-actions">
            <span className="kss-model-badge" title={`Modelo activo: ${activeTextModel}`}>
              {activeTextModel}
            </span>
            <button
              type="button"
              className="kss-ghost-btn"
              onClick={handleNewChat}
              title="Iniciar una nueva conversación con Kai"
            >
              <Trash2 size={13} strokeWidth={1.85} className="gf-icon-shrink" />
              <span>Nuevo chat</span>
            </button>
          </div>
        </header>

        {setteiItems.length > 0 && (
          <div className="kss-settei-strip">
            <span className="kss-settei-label">
              Canon Settei conectado ({setteiItems.length}):
            </span>
            <div className="kss-settei-pills">
              {setteiItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className="kss-settei-pill"
                  onClick={() => handleInsertSetteiHandle(item.handle)}
                  title={`Insertar ${item.handle} (${item.name}) en el chat`}
                >
                  {item.handle}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="kss-chat-feed dark-scrollbar" aria-live="polite">
          {messages.map((msg) => {
            const resolvedVisual =
              msg.role === 'model'
                ? msg.visualPrompt || extractVisualPrompt(msg.text)
                : null;
            const { narrative } = splitMessageNarrative(msg.text, resolvedVisual);
            const isCopied = copiedMsgId === msg.id;

            return (
              <div
                key={msg.id}
                className={`kss-msg-row ${msg.role === 'user' ? 'is-user' : 'is-model'}`}
              >
                <div className="kss-msg-bubble">
                  {msg.role === 'model' && (
                    <div className="kss-msg-role-row">
                      <span className="kss-msg-role-tag">
                        {msg.isWelcome ? 'Kai · Guía Inicial' : 'Kai · Director de Arte'}
                      </span>
                      {msg.model && <span className="kss-msg-model-chip">{msg.model === 'kai-beta-guide' ? 'Guía local Beta' : msg.model}</span>}
                    </div>
                  )}

                  {narrative && <p className="kss-msg-text">{narrative}</p>}

                  {msg.role === 'model' && resolvedVisual && (
                    <div className="kss-visual-prompt-card">
                      <div className="kss-visual-prompt-head">
                        <span>[PROMPT VISUAL]</span>
                        <span>Listo para el lienzo</span>
                      </div>
                      <pre className="kss-visual-prompt-code">{resolvedVisual}</pre>
                    </div>
                  )}

                  {msg.role === 'model' && (
                    <div className="kss-msg-actions">
                      <button
                        type="button"
                        className={`kss-send-canvas-btn ${isCopied ? 'is-copied' : ''}`}
                        onClick={() => handleSendToCanvas(msg)}
                      >
                        {isCopied ? (
                          <>
                            <Check size={14} strokeWidth={2.25} className="gf-icon-shrink" />
                            <span>Enviado al Lienzo</span>
                          </>
                        ) : (
                          <>
                            <span>Enviar al Lienzo</span>
                            <ArrowRight size={14} strokeWidth={2} className="gf-icon-shrink" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {showStarterPills && (
            <div className="kss-starters-box">
              <span className="kss-starters-label">Ideas rápidas para empezar</span>
              {STARTER_PROMPTS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  className="kss-starter-pill"
                  onClick={() => handleSendChat(starter)}
                  disabled={chatLoading}
                >
                  {starter}
                </button>
              ))}
            </div>
          )}

          {chatLoading && (
            <div className="kss-thinking-row">
              <RefreshCw size={14} strokeWidth={2} className="gf-spin gf-icon-shrink" />
              <span>Kai está componiendo encuadre y prompt visual...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {chatError && (
          <div className="kss-error-banner kss-chat-error" role="alert">
            <AlertCircle size={15} strokeWidth={2} className="gf-icon-shrink" />
            <span>{chatError}</span>
          </div>
        )}

        <form
          className="kss-chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSendChat();
          }}
        >
          <textarea
            ref={chatInputRef}
            className="kss-chat-textarea"
            rows={3}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSendChat();
              }
            }}
            placeholder="Describe tu escena, personaje, cámara o emoción para que Kai redacte el prompt..."
            disabled={chatLoading}
            aria-label="Mensaje para Kai"
          />
          <div className="kss-chat-composer-footer">
            <span className="kss-composer-hint">Enter para enviar · Shift+Enter nueva línea</span>
            <button
              type="submit"
              className="kss-chat-send-btn"
              disabled={chatLoading || !chatInput.trim()}
            >
              {chatLoading ? (
                <RefreshCw size={14} strokeWidth={2} className="gf-spin gf-icon-shrink" />
              ) : (
                <Send size={14} strokeWidth={2} className="gf-icon-shrink" />
              )}
              <span>Enviar</span>
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT PANE — LIENZO GENERADOR DE MANGA */}
      <div className="kss-pane-canvas">
        <header className="kss-pane-header">
          <div className="kss-pane-title-group">
            <div className="kss-avatar-badge is-canvas" aria-hidden="true">
              <Wand2 size={16} strokeWidth={2} className="gf-icon-shrink" />
            </div>
            <div className="kss-pane-title-text">
              <h2 className="kss-pane-title">Lienzo Generador de Manga</h2>
              <p className="kss-pane-subtitle">
                {selectedStyleOption.label} · {selectedRatioOption.usage}
              </p>
            </div>
          </div>

          <div className="kss-header-actions">
            <span className="kss-model-badge" title={`Modelo de imagen: ${activeImageModel}`}>
              {activeImageModel}
            </span>
            <span className="kss-ratio-badge">
              <Ratio size={12} strokeWidth={2} className="gf-icon-shrink" />
              <span>
                {selectedRatioOption.label} · {selectedRatioOption.usage}
              </span>
            </span>
          </div>
        </header>

        <div className="kss-canvas-body dark-scrollbar">
          {/* Prompt Box */}
          <div className="kss-section-block">
            <div className="kss-section-header">
              <label htmlFor="kai-canvas-prompt" className="kss-section-label">
                Prompt de Ilustración
              </label>
              {canvasPrompt.trim().length > 0 && (
                <button
                  type="button"
                  className="kss-clear-link"
                  onClick={() => setCanvasPrompt('')}
                >
                  Limpiar prompt
                </button>
              )}
            </div>
            <div className={`kss-prompt-box ${promptFlash ? 'is-flashing' : ''}`}>
              <textarea
                id="kai-canvas-prompt"
                ref={promptInputRef}
                className="kss-canvas-textarea"
                rows={3}
                value={canvasPrompt}
                onChange={(e) => setCanvasPrompt(e.target.value)}
                placeholder="Escribe tu descripción en inglés o español, o pulsa «Enviar al Lienzo» desde cualquier respuesta de Kai..."
                disabled={canvasLoading}
              />
            </div>
          </div>

          {/* Style Selector */}
          <div className="kss-section-block">
            <div className="kss-section-header">
              <span className="kss-section-label">
                <Palette size={13} strokeWidth={2} className="gf-icon-shrink" />
                <span>Estilo Artístico</span>
              </span>
            </div>
            <div className="kss-style-grid" role="radiogroup" aria-label="Estilo artístico del lienzo">
              {KAI_CANVAS_STYLES.map((opt) => {
                const isSelected = style === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`kss-style-card ${isSelected ? 'is-active' : ''}`}
                    onClick={() => setStyle(opt.id)}
                    disabled={canvasLoading}
                  >
                    <div className="kss-style-card-top">
                      <span className="kss-style-name">{opt.label}</span>
                      {isSelected && (
                        <span className="kss-style-check" aria-hidden="true">
                          <Check size={11} strokeWidth={2.5} />
                        </span>
                      )}
                    </div>
                    <p className="kss-style-desc">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aspect Ratio Selector */}
          <div className="kss-section-block">
            <div className="kss-section-header">
              <span className="kss-section-label">
                <Ratio size={13} strokeWidth={2} className="gf-icon-shrink" />
                <span>Relación de Aspecto</span>
              </span>
            </div>
            <div className="kss-ratio-grid" role="radiogroup" aria-label="Relación de aspecto del lienzo">
              {KAI_ASPECT_RATIOS.map((opt) => {
                const isSelected = aspectRatio === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`kss-ratio-btn ${isSelected ? 'is-active' : ''}`}
                    onClick={() => setAspectRatio(opt.id)}
                    disabled={canvasLoading}
                  >
                    <span className="kss-ratio-glyph-wrap" aria-hidden="true">
                      <span className={`kss-ratio-glyph ${RATIO_GLYPH_CLASSES[opt.id]}`} />
                    </span>
                    <span className="kss-ratio-code">{opt.label}</span>
                    <span className="kss-ratio-usage">{opt.usage}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate CTA + Download */}
          <div className="kss-cta-row">
            <button
              type="button"
              className="kss-generate-btn"
              onClick={() => void handleGeneratePanel()}
              disabled={canvasLoading || canvasPrompt.trim().length < 2}
            >
              {canvasLoading ? (
                <>
                  <RefreshCw size={16} strokeWidth={2} className="gf-spin gf-icon-shrink" />
                  <span>Generando Ilustración...</span>
                </>
              ) : (
                <>
                  <Wand2 size={16} strokeWidth={2} className="gf-icon-shrink" />
                  <span>Generar Ilustración</span>
                </>
              )}
            </button>

            {activeResult && (
              <button
                type="button"
                className="kss-download-btn"
                onClick={() => void handleDownloadResult(activeResult)}
                disabled={canvasLoading}
              >
                <Download size={15} strokeWidth={2} className="gf-icon-shrink" />
                <span>Descargar Imagen</span>
              </button>
            )}
          </div>

          {canvasError && (
            <div className="kss-error-banner" role="alert">
              <AlertCircle size={15} strokeWidth={2} className="gf-icon-shrink" />
              <span>{canvasError}</span>
            </div>
          )}

          {/* Canvas Preview Stage */}
          <div className="kss-preview-card">
            <div className="kss-preview-stage">
              <div
                className={`kss-preview-frame ${!activeResult ? 'is-empty' : ''}`}
                style={frameStyle}
              >
                {activeResult ? (
                  <img
                    src={toDataImageSrc(activeResult.image)}
                    alt={`Ilustración generada (${activeResult.style} · ${activeResult.aspectRatio})`}
                    className="kss-preview-img"
                  />
                ) : (
                  <div className="kss-empty-state">
                    <div className="kss-empty-icon" aria-hidden="true">
                      <ImageIcon size={24} strokeWidth={1.75} className="gf-icon-shrink" />
                    </div>
                    <p className="kss-empty-title">Lienzo listo para ilustrar</p>
                    <span className="kss-studio-empty-spec">
                      {selectedStyleOption.label} · {selectedRatioOption.label} (
                      {selectedRatioOption.usage})
                    </span>
                    <p className="kss-empty-copy">
                      Redacta una escena o usa «Enviar al Lienzo» desde el mensaje de bienvenida de
                      Kai para probar al instante.
                    </p>
                  </div>
                )}

                {canvasLoading && (
                  <div className="kss-loading-overlay" role="status" aria-live="polite">
                    <RefreshCw size={24} strokeWidth={2} className="gf-spin gf-icon-shrink" />
                    <p className="kss-loading-title">Trazando viñeta en el lienzo...</p>
                    <p className="kss-loading-sub">
                      {selectedStyleOption.shortLabel} · {selectedRatioOption.label}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {activeResult && (
              <div className="kss-result-meta">
                <div className="kss-result-badges">
                  <span className="kss-meta-chip">
                    {KAI_CANVAS_STYLES.find((s) => s.id === activeResult.style)?.label ||
                      activeResult.style}
                  </span>
                  <span className="kss-meta-chip is-mono">{activeResult.aspectRatio}</span>
                  <span className="kss-meta-chip is-mono">{activeResult.model === 'local-manga-synthesizer-beta' ? 'Boceto local Beta' : activeResult.model}</span>
                </div>
                <button
                  type="button"
                  className="kss-ghost-btn"
                  onClick={() => void handleDownloadResult(activeResult)}
                >
                  <Download size={13} strokeWidth={2} className="gf-icon-shrink" />
                  <span>Descargar Imagen</span>
                </button>
              </div>
            )}
          </div>

          {/* Session Gallery Strip (up to 6 results) */}
          {gallery.length > 0 && (
            <div className="kss-gallery-card">
              <div className="kss-section-header">
                <span className="kss-section-label">
                  <ImageIcon size={13} strokeWidth={2} className="gf-icon-shrink" />
                  <span>
                    Galería de Sesión ({gallery.length}/{MAX_SESSION_GALLERY})
                  </span>
                </span>
              </div>

              <div className="kss-gallery-strip">
                {gallery.map((item) => {
                  const isActive = activeResult?.id === item.id;
                  const styleShort =
                    KAI_CANVAS_STYLES.find((s) => s.id === item.style)?.shortLabel || item.style;
                  return (
                    <div
                      key={item.id}
                      className={`kss-gallery-item ${isActive ? 'is-active' : ''}`}
                    >
                      <button
                        type="button"
                        className="kss-gallery-select-btn"
                        aria-pressed={isActive}
                        onClick={() => setActiveResultId(item.id)}
                        title={`Ver resultado: ${styleShort} (${item.aspectRatio})`}
                      >
                        <img
                          src={toDataImageSrc(item.image)}
                          alt={`${styleShort} ${item.aspectRatio}`}
                          className="kss-gallery-thumb"
                        />
                        <div className="kss-gallery-caption">
                          <span>{styleShort}</span>
                          <span>{item.aspectRatio}</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        className="kss-gallery-mini-dl"
                        onClick={() => void handleDownloadResult(item)}
                        aria-label={`Descargar ${styleShort} ${item.aspectRatio}`}
                        title="Descargar imagen"
                      >
                        <Download size={12} strokeWidth={2} className="gf-icon-shrink" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
