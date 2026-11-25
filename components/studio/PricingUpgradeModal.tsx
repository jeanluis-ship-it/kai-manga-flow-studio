'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Crown,
  ExternalLink,
  RefreshCw,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import {
  PLAN_CATALOG,
  PLAN_ORDER,
  type PlanTier,
} from '@/lib/plans/quotas';

export interface PricingUpgradeModalProps {
  open: boolean;
  currentPlan: PlanTier;
  isGuest: boolean;
  blockReason?: string;
  recommendedPlan?: PlanTier;
  onClose: () => void;
  onSimulatePlan: (tier: PlanTier) => void;
}

interface CheckoutFeedback {
  targetPlan: PlanTier;
  planName: string;
  priceLabel: string;
  message: string;
  canSimulate: boolean;
}

export const PricingUpgradeModal: React.FC<PricingUpgradeModalProps> = ({
  open,
  currentPlan,
  isGuest,
  blockReason,
  recommendedPlan,
  onClose,
  onSimulatePlan,
}) => {
  const [loadingPlan, setLoadingPlan] = useState<PlanTier | null>(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<CheckoutFeedback | null>(null);

  if (!open) return null;

  const handleChoosePlan = async (tier: PlanTier) => {
    if (tier === 'trial' || tier === currentPlan || loadingPlan) return;
    setError('');
    setFeedback(null);
    setLoadingPlan(tier);

    try {
      const resp = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPlan: tier }),
      });

      const data = (await resp.json()) as {
        mode?: string;
        checkoutUrl?: string;
        message?: string;
        canSimulate?: boolean;
        planName?: string;
        priceLabel?: string;
        error?: string;
      };

      if (!resp.ok) {
        throw new Error(data.error || 'No se pudo iniciar el proceso de suscripción.');
      }

      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }

      setFeedback({
        targetPlan: tier,
        planName: data.planName || PLAN_CATALOG[tier].name,
        priceLabel: data.priceLabel || `${PLAN_CATALOG[tier].priceLabel} ${PLAN_CATALOG[tier].periodLabel}`,
        message:
          data.message ||
          `Pre-registro Fundador confirmado para el Plan ${PLAN_CATALOG[tier].name}.`,
        canSimulate: Boolean(data.canSimulate),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al consultar el plan seleccionado.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="gf-modal-backdrop" onClick={onClose}>
      <div
        className="gf-modal-card gf-pricing-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="false"
        aria-label="Planes y Upgrade de MANGAI Studio"
      >
        <div className="gf-modal-head">
          <div className="gf-pricing-head-title">
            <div className="gf-pricing-crown">
              <Crown size={18} strokeWidth={2} className="gf-icon-shrink" />
            </div>
            <div>
              <h3 className="gf-modal-title">Planes MANGAI Studio OS</h3>
              <p className="gf-preflight-sub">
                Escala tus tomos, páginas mensuales, Gemini 3.1 Flash Image HD y prioridad de render.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="gf-modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar modal de planes"
          >
            <X size={16} strokeWidth={1.75} className="gf-icon-shrink" />
          </button>
        </div>

        {blockReason && (
          <div className="gf-pricing-block-banner" role="alert">
            <AlertTriangle size={16} strokeWidth={2} className="gf-icon-shrink" />
            <span>{blockReason}</span>
          </div>
        )}

        {isGuest && (
          <div className="gf-pricing-guest-note">
            <span>
              Estás en <strong>Modo Invitado</strong> (cuota Trial local). Inicia sesión en{' '}
              <code>/login</code> para vincular tu suscripción y proyectos en la nube Supabase.
            </span>
          </div>
        )}

        <div className="gf-pricing-grid">
          {PLAN_ORDER.map((tier) => {
            const cfg = PLAN_CATALOG[tier];
            const isCurrent = currentPlan === tier;
            const isRecommended = recommendedPlan === tier;
            const isBusy = loadingPlan === tier;

            return (
              <div
                key={tier}
                className={`gf-plan-card ${cfg.highlighted ? 'is-popular' : ''} ${
                  isCurrent ? 'is-current' : ''
                } ${isRecommended && !cfg.highlighted ? 'is-recommended' : ''}`}
              >
                <div className="gf-plan-card-head">
                  <span className="gf-plan-name">{cfg.name}</span>
                  {cfg.highlighted && (
                    <span className="gf-plan-popular-badge">Más Popular</span>
                  )}
                  {!cfg.highlighted && isRecommended && (
                    <span className="gf-plan-rec-badge">Requerido</span>
                  )}
                </div>

                <div className="gf-plan-price-row">
                  <span className="gf-plan-price">{cfg.priceLabel}</span>
                  <span className="gf-plan-period">{cfg.periodLabel}</span>
                </div>

                <div className="gf-plan-quota-pills">
                  <span>{cfg.maxProjects} proy.</span>
                  <span>{cfg.maxPages} págs.</span>
                  {cfg.hdModelEnabled && <span className="is-hd">HD</span>}
                  {cfg.renderPriority && <span className="is-priority">Prioridad</span>}
                </div>

                <ul className="gf-plan-features">
                  {cfg.features.map((feat) => (
                    <li key={feat}>
                      <Check size={13} strokeWidth={2.4} className="gf-icon-shrink gf-plan-check" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <div className="gf-plan-cta-wrap">
                  {isCurrent ? (
                    <button type="button" className="gf-plan-btn is-current" disabled>
                      Plan Actual ✓
                    </button>
                  ) : tier === 'trial' ? (
                    <button
                      type="button"
                      className="gf-plan-btn is-outline"
                      onClick={() => {
                        onSimulatePlan('trial');
                        onClose();
                      }}
                    >
                      Volver a Trial
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`gf-plan-btn ${cfg.highlighted ? 'is-gold' : 'is-solid'}`}
                      disabled={Boolean(loadingPlan)}
                      onClick={() => handleChoosePlan(tier)}
                    >
                      {isBusy ? (
                        <RefreshCw size={14} strokeWidth={2} className="gf-spin gf-icon-shrink" />
                      ) : (
                        <Zap size={14} strokeWidth={2} className="gf-icon-shrink" />
                      )}
                      <span>{isBusy ? 'Conectando...' : `Elegir ${cfg.name}`}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {error && <div className="gf-inline-error">{error}</div>}

        {feedback && (
          <div className="gf-pricing-feedback">
            <div className="gf-pricing-feedback-copy">
              <Sparkles size={16} strokeWidth={2} className="gf-icon-shrink" />
              <div>
                <p className="gf-pricing-feedback-title">
                  Pre-registro Fundador · Plan {feedback.planName} ({feedback.priceLabel})
                </p>
                <p className="gf-pricing-feedback-text">{feedback.message}</p>
              </div>
            </div>

            {feedback.canSimulate && (
              <div className="gf-pricing-sim-actions">
                <button
                  type="button"
                  className="gf-pricing-sim-btn"
                  onClick={() => {
                    onSimulatePlan(feedback.targetPlan);
                    setFeedback(null);
                    onClose();
                  }}
                >
                  <ExternalLink size={13} strokeWidth={2} className="gf-icon-shrink" />
                  <span>Simular Plan {feedback.planName} en este entorno</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
