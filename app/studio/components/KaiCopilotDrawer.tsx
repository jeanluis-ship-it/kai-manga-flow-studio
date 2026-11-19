'use client';

import React, { useState } from 'react';
import {
  BookMarked,
  Check,
  Layers,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import {
  KOMA_LAYOUT_PRESETS,
  type KaiDualOutput,
} from '@/lib/kai/schema';
import type { PlanTier } from '@/lib/plans/quotas';
import { normalizeTagHandle, type Project } from '../types';
import { PillButton } from './Primitives';

interface KaiMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  mode?: string;
  scriptOutput?: KaiDualOutput;
  applied?: boolean;
}

const MODE_LABELS: Record<string, string> = {
  gemini: 'Gemini Live',
  openai: 'OpenAI Live',
  fallback: 'Plantilla Editorial (Local)',
};

const QUICK_PROMPTS = [
  'Escena de tensión bajo lluvia nocturna: un encuentro inesperado rompe el silencio.',
  'Combate rápido en 5 viñetas con corte diagonal y revelación final en silencio.',
  'Página splash de descubrimiento ante una ciudad antigua envuelta en niebla.',
];

export const KaiCopilotDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  project: Project;
  onApplyScript: (output: KaiDualOutput) => boolean;
  onQuotaBlocked?: (reason: string, requiredPlan?: PlanTier) => void;
}> = ({ open, onClose, project, onApplyScript, onQuotaBlocked }) => {
  const [prompt, setPrompt] = useState('');
  const [targetPages, setTargetPages] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastMode, setLastMode] = useState<string>('');
  const [messages, setMessages] = useState<KaiMessage[]>([
    {
      id: 'kai-welcome',
      role: 'assistant',
      text: 'Soy KAI Sensei, tu editor de guion y ritmo Koma-wari. Describe una escena o capítulo (puedes mencionar tus handles @Settei) y estructuraré las páginas, planos y diálogos listos para inyectar al manuscrito.',
    },
  ]);

  if (!open) return null;

  const activeSetteiPayload = project.characters.map((c) => ({
    tag_handle: normalizeTagHandle(c.tagHandle || '', c.name),
    name: c.name || 'Sin nombre',
    entity_type: c.entityType || 'character',
    visual_anchors: c.visualAnchors ?? [],
  }));

  const handleSubmit = async (customPrompt?: string) => {
    const cleanPrompt = (customPrompt ?? prompt).trim();
    if (!cleanPrompt || loading) return;

    setError('');
    setLoading(true);
    const userMsg: KaiMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: cleanPrompt,
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setPrompt('');

    try {
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

      const modeHeader = response.headers.get('X-KAI-Mode') || 'fallback';
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
        throw new Error(payload.error || 'KAI Sensei no pudo estructurar el guion.');
      }

      setLastMode(modeHeader);
      const assistantMsg: KaiMessage = {
        id: `kai-${Date.now()}`,
        role: 'assistant',
        text: payload.reply,
        mode: modeHeader,
        scriptOutput: payload,
        applied: false,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al conectar con el copiloto KAI Sensei.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCard = (msgId: string, output: KaiDualOutput) => {
    const applied = onApplyScript(output);
    if (!applied) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, applied: true } : m)),
    );
  };

  return (
    <div className="gf-kai-backdrop" onClick={onClose}>
      <aside
        className="gf-kai-drawer animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
        aria-label="Copiloto KAI Sensei"
      >
        <div className="gf-kai-header">
          <div className="gf-kai-title-row">
            <div className="gf-kai-avatar">
              <Sparkles size={16} strokeWidth={2} className="gf-icon-shrink" />
            </div>
            <div>
              <h2 className="gf-kai-title">KAI Sensei</h2>
              <p className="gf-kai-subtitle">
                Copiloto de Guion y Koma-wari
                {lastMode ? ` · ${MODE_LABELS[lastMode] || lastMode}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="gf-modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar panel KAI Sensei"
          >
            <X size={16} strokeWidth={1.75} className="gf-icon-shrink" />
          </button>
        </div>

        {/* Active Settei Context Strip */}
        <div className="gf-kai-context-bar">
          <span className="gf-kai-context-label">
            Settei inyectados ({activeSetteiPayload.length}):
          </span>
          {activeSetteiPayload.length === 0 ? (
            <span className="gf-kai-context-empty">Ninguno (crea fichas en Settei y Personajes)</span>
          ) : (
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
                  title={`Insertar ${item.tag_handle} en el prompt`}
                >
                  {item.tag_handle}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversation Feed */}
        <div className="gf-kai-messages dark-scrollbar">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`gf-kai-msg ${msg.role === 'user' ? 'is-user' : 'is-assistant'}`}
            >
              <div className="gf-kai-msg-bubble">
                <p className="gf-kai-msg-text">{msg.text}</p>
                {msg.mode && (
                  <span className={`gf-kai-mode-tag mode-${msg.mode}`}>
                    {MODE_LABELS[msg.mode] || msg.mode}
                  </span>
                )}
              </div>

              {msg.scriptOutput && (
                <div className="gf-kai-action-card">
                  <div className="gf-kai-action-head">
                    <Layers size={14} strokeWidth={2} className="gf-icon-shrink" />
                    <span>
                      Guion Estructurado · {msg.scriptOutput.script_pages.length}{' '}
                      {msg.scriptOutput.script_pages.length === 1 ? 'Página' : 'Páginas'}
                    </span>
                  </div>

                  <div className="gf-kai-page-summaries">
                    {msg.scriptOutput.script_pages.map((sp) => {
                      const presetLabel =
                        KOMA_LAYOUT_PRESETS[sp.suggested_layout]?.shortLabel ||
                        sp.suggested_layout;
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
                        <Check size={15} strokeWidth={2} className="gf-icon-shrink" />
                      ) : (
                        <BookMarked size={15} strokeWidth={1.75} className="gf-icon-shrink" />
                      )
                    }
                    onClick={() => handleApplyCard(msg.id, msg.scriptOutput!)}
                  >
                    {msg.applied
                      ? 'Aplicado al Manuscrito (Ver Páginas)'
                      : 'Aplicar al Manuscrito (Crear Páginas y Viñetas)'}
                  </PillButton>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="gf-kai-thinking">
              <RefreshCw size={14} strokeWidth={2} className="gf-spin gf-icon-shrink" />
              <span>KAI Sensei está estructurando ritmo, planos y viñetas...</span>
            </div>
          )}
        </div>

        {/* Quick suggestions when chat is fresh */}
        {messages.length <= 1 && (
          <div className="gf-kai-suggestions">
            {QUICK_PROMPTS.map((sample) => (
              <button
                key={sample}
                type="button"
                className="gf-kai-suggestion-btn"
                onClick={() => handleSubmit(sample)}
                disabled={loading}
              >
                {sample}
              </button>
            ))}
          </div>
        )}

        {error && <div className="gf-inline-error gf-kai-error">{error}</div>}

        {/* Composer */}
        <form
          className="gf-kai-composer"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="gf-kai-composer-meta">
            <label className="gf-kai-pages-select">
              <span>Páginas a estructurar:</span>
              <select
                value={targetPages}
                onChange={(e) => setTargetPages(Number(e.target.value))}
                disabled={loading}
              >
                <option value={1}>1 página</option>
                <option value={2}>2 páginas</option>
                <option value={3}>3 páginas</option>
              </select>
            </label>
            <span className="gf-kai-dir-pill">
              Lectura {(project.readingDirection || 'rtl').toUpperCase()}
            </span>
          </div>

          <div className="gf-kai-input-wrap">
            <textarea
              className="gf-kai-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Ej. @Anacaona entra al templo bajo tormenta eléctrica y descubre la reliquia..."
              rows={3}
              disabled={loading}
            />
            <button
              type="submit"
              className="gf-kai-send-btn"
              disabled={loading || !prompt.trim()}
              aria-label="Enviar escena a KAI Sensei"
            >
              {loading ? (
                <RefreshCw size={15} strokeWidth={2} className="gf-spin gf-icon-shrink" />
              ) : (
                <Send size={15} strokeWidth={2} className="gf-icon-shrink" />
              )}
              <span>Estructurar Guion</span>
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
};
