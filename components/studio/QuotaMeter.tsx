'use client';

import React from 'react';
import { Crown, FileStack, FolderPlus, Sparkles, Zap } from 'lucide-react';
import {
  PLAN_CATALOG,
  normalizePlanTier,
  type PlanTier,
  type UsageSnapshot,
  type UserQuotaProfile,
} from '@/lib/plans/quotas';

export interface QuotaMeterProps {
  profile?: UserQuotaProfile;
  usage?: UsageSnapshot;
  planTier?: PlanTier;
  totalPages?: number;
  maxPages?: number;
  projectCount?: number;
  maxProjects?: number;
  onOpenUpgrade?: () => void;
  onCreateProject?: () => void;
  variant?: 'card' | 'compact';
  className?: string;
  children?: React.ReactNode;
}

export const QuotaMeter: React.FC<QuotaMeterProps> = ({
  profile,
  usage,
  planTier,
  totalPages,
  maxPages,
  projectCount,
  maxProjects,
  onOpenUpgrade,
  onCreateProject,
  variant = 'card',
  className = '',
  children,
}) => {
  const tier = normalizePlanTier(planTier ?? profile?.planTier ?? 'trial');
  const planCfg = PLAN_CATALOG[tier];

  const usedPages = Math.max(0, totalPages ?? usage?.totalPages ?? 1);
  const limitPages = Math.max(1, maxPages ?? profile?.maxPages ?? planCfg.maxPages);
  const pagesPct = Math.min(100, Math.round((usedPages / limitPages) * 100));

  const usedProjects = Math.max(1, projectCount ?? usage?.projectCount ?? 1);
  const limitProjects = Math.max(1, maxProjects ?? profile?.maxProjects ?? planCfg.maxProjects);
  const projectsPct = Math.min(100, Math.round((usedProjects / limitProjects) * 100));

  const hdEnabled = Boolean(profile?.hdRenderEnabled ?? planCfg.hdModelEnabled);
  const priorityEnabled = Boolean(profile?.renderPriority ?? planCfg.renderPriority);

  const pagesMeterTone =
    usedPages >= limitPages ? 'is-danger' : pagesPct >= 80 ? 'is-warn' : '';
  const projectsMeterTone =
    usedProjects >= limitProjects ? 'is-danger' : projectsPct >= 80 ? 'is-warn' : '';

  const pagesFillColor =
    usedPages >= limitPages
      ? '#E11D48'
      : pagesPct >= 80
      ? '#D97706'
      : 'var(--genko-kai, var(--gf-ai-accent, #4F46E5))';

  const projectsFillColor =
    usedProjects >= limitProjects
      ? '#E11D48'
      : projectsPct >= 80
      ? '#D97706'
      : 'var(--genko-guide, var(--gf-guide, #00AEEF))';

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onOpenUpgrade}
        className={`gf-plan-topbar-pill gf-quota-meter-compact ${className}`.trim()}
        title={`Plan ${planCfg.name} (${planCfg.priceLabel} ${planCfg.periodLabel}) — Ver planes y cuotas`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          padding: '5px 10px',
          borderRadius: '9999px',
          border: '1px solid var(--genko-border, var(--gf-border-strong, #E2E0D8))',
          background: 'var(--genko-panel, var(--gf-surface, #FFFFFF))',
          color: 'var(--genko-ink, var(--gf-ink, #111111))',
          fontSize: '11px',
          fontWeight: 700,
          cursor: onOpenUpgrade ? 'pointer' : 'default',
        }}
      >
        <Crown
          size={12}
          strokeWidth={2.2}
          className="gf-icon-shrink"
          style={{ color: 'var(--genko-kai, var(--gf-ai-accent, #4F46E5))' }}
        />
        <span>{planCfg.name}</span>
        <span style={{ opacity: 0.45 }}>·</span>
        <span>
          Páginas: {usedPages} / {limitPages}
        </span>
      </button>
    );
  }

  return (
    <div
      className={`gf-sidebar-section gf-quota-card ${className}`.trim()}
      aria-label="Medidor de cuota del plan"
      style={{
        background: 'var(--genko-panel, var(--gf-surface, #FFFFFF))',
        border: '1px solid var(--genko-border, var(--gf-border, #E2E0D8))',
        color: 'var(--genko-ink, var(--gf-ink, #111111))',
      }}
    >
      <div className="gf-quota-card-head">
        <span
          className="gf-section-label"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            color: 'var(--genko-ink, var(--gf-ink, #111111))',
          }}
        >
          <FileStack size={12} strokeWidth={2} className="gf-icon-shrink" />
          <span>
            Plan {planCfg.name} ({planCfg.priceLabel})
          </span>
        </span>
        {onOpenUpgrade && (
          <button
            type="button"
            className="gf-quota-upgrade-link"
            onClick={onOpenUpgrade}
            style={{
              borderColor: 'var(--genko-kai, var(--gf-ai-accent, #4F46E5))',
              color: 'var(--genko-kai, var(--gf-ai-accent, #4F46E5))',
            }}
          >
            <Crown size={11} strokeWidth={2.2} className="gf-icon-shrink" />
            <span>Upgrade</span>
          </button>
        )}
      </div>

      {children}

      <div className="gf-quota-meter">
        <div className="gf-quota-meter-row">
          <span>
            Páginas: {usedPages} / {limitPages}
          </span>
          <strong>{pagesPct}%</strong>
        </div>
        <div
          className="gf-quota-bar-track"
          role="progressbar"
          aria-label={`Páginas: ${usedPages} / ${limitPages}`}
          aria-valuemin={0}
          aria-valuemax={limitPages}
          aria-valuenow={usedPages}
          style={{
            background: 'var(--genko-desk, var(--gf-border, #ECEAE4))',
          }}
        >
          <div
            className={`gf-quota-bar-fill ${pagesMeterTone}`.trim()}
            style={{
              width: `${pagesPct}%`,
              background: pagesFillColor,
            }}
          />
        </div>
      </div>

      <div className="gf-quota-meter">
        <div className="gf-quota-meter-row">
          <span>
            Proyectos: {usedProjects} / {limitProjects}
          </span>
          <strong>{projectsPct}%</strong>
        </div>
        <div
          className="gf-quota-bar-track"
          role="progressbar"
          aria-label={`Proyectos: ${usedProjects} / ${limitProjects}`}
          aria-valuemin={0}
          aria-valuemax={limitProjects}
          aria-valuenow={usedProjects}
          style={{
            background: 'var(--genko-desk, var(--gf-border, #ECEAE4))',
          }}
        >
          <div
            className={`gf-quota-bar-fill ${projectsMeterTone}`.trim()}
            style={{
              width: `${projectsPct}%`,
              background: projectsFillColor,
            }}
          />
        </div>
      </div>

      <div
        className="gf-quota-engine-tags"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '5px',
          fontSize: '10px',
          fontWeight: 700,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 7px',
            borderRadius: '999px',
            border: '1px solid var(--genko-border, var(--gf-border, #E2E0D8))',
            opacity: hdEnabled ? 1 : 0.65,
          }}
        >
          <Zap size={10} strokeWidth={2.2} className="gf-icon-shrink" />
          <span>{hdEnabled ? 'Nano Banana 2 HD' : 'HD (Pro)'}</span>
        </span>
        {priorityEnabled && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 7px',
              borderRadius: '999px',
              border: '1px solid var(--genko-kai, var(--gf-ai-accent, #4F46E5))',
              color: 'var(--genko-kai, var(--gf-ai-accent, #4F46E5))',
            }}
          >
            <Sparkles size={10} strokeWidth={2.2} className="gf-icon-shrink" />
            <span>Prioridad Render</span>
          </span>
        )}
      </div>

      {onCreateProject && (
        <button
          type="button"
          className="gf-new-project-btn"
          onClick={onCreateProject}
          style={{
            borderColor: 'var(--genko-border, var(--gf-border-strong, #E2E0D8))',
            color: 'var(--genko-ink, var(--gf-ink, #111111))',
          }}
        >
          <FolderPlus size={13} strokeWidth={2} className="gf-icon-shrink" />
          <span>+ Nuevo Proyecto</span>
        </button>
      )}
    </div>
  );
};

export default QuotaMeter;
