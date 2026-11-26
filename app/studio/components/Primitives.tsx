'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Crown, FileStack, FolderPlus, Sparkles, X, Zap } from 'lucide-react';
import {
  PLAN_CATALOG,
  normalizePlanTier,
  type PlanTier,
  type UsageSnapshot,
  type UserQuotaProfile,
} from '@/lib/plans/quotas';

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="gf-section-label-wrap">
    <span className="gf-section-label">{children}</span>
  </div>
);

export const PillButton: React.FC<{
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: 'filled' | 'outline' | 'solid';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}> = ({ icon, children, variant = 'filled', onClick, disabled, className = '', type = 'button' }) => (
  <button
    type={type}
    className={`gf-pill-btn gf-pill-btn-${variant} ${className}`.trim()}
    onClick={onClick}
    disabled={disabled}
  >
    {icon && <span className="gf-pill-icon">{icon}</span>}
    <span>{children}</span>
  </button>
);

export const FieldDropdown: React.FC<{
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  className?: string;
}> = ({ label, value, options, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, []);

  return (
    <div ref={ref} className={`gf-dropdown ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="gf-field-box gf-dropdown-trigger"
        aria-expanded={isOpen}
      >
        <p className="gf-field-label">{label}</p>
        <div className="gf-dropdown-value-row">
          <span className="gf-field-value">{value}</span>
          <ChevronDown
            size={16}
            strokeWidth={1.75}
            className={`gf-dropdown-arrow gf-icon-shrink ${isOpen ? 'is-open' : ''}`}
          />
        </div>
      </button>
      {isOpen && (
        <div className="gf-dropdown-menu">
          <div className="gf-dropdown-list dark-scrollbar">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`gf-dropdown-option ${value === opt ? 'is-selected' : ''}`}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const TextInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}> = ({ value, onChange, placeholder, rows, className = '' }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    rows={rows}
    style={rows ? { height: 'auto' } : undefined}
    className={`gf-textarea ${className}`.trim()}
  />
);

export const SegmentedToggle: React.FC<{
  value: string;
  items: { value: string; label: string }[];
  onChange: (val: string) => void;
}> = ({ value, items, onChange }) => (
  <div className="gf-segmented">
    {items.map((item) => (
      <button
        key={item.value}
        type="button"
        onClick={() => onChange(item.value)}
        className={`gf-segmented-btn ${value === item.value ? 'is-active' : ''}`}
      >
        <span>{item.label}</span>
      </button>
    ))}
  </div>
);

export const DragNumberField: React.FC<{
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onChange: (val: number) => void;
  className?: string;
}> = ({ label, value, min = 0, max = 999, step = 1, suffix = 'px', onChange, className = '' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const dragStartRef = useRef<{ x: number; startValue: number; moved: boolean } | null>(null);

  const clampAndStep = (num: number) => {
    const stepped = Math.round(num / step) * step;
    return Math.min(max, Math.max(min, stepped));
  };

  const commitEdit = (raw: string) => {
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed)) {
      onChange(clampAndStep(parsed));
    }
    setIsEditing(false);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isEditing) return;
    dragStartRef.current = { x: e.clientX, startValue: value, moved: false };
    const onMove = (moveEvt: PointerEvent) => {
      if (!dragStartRef.current) return;
      const dx = moveEvt.clientX - dragStartRef.current.x;
      if (Math.abs(dx) >= 4) {
        dragStartRef.current.moved = true;
        const deltaSteps = Math.round(dx / 8);
        onChange(clampAndStep(dragStartRef.current.startValue + deltaSteps * step));
      }
    };
    const onUp = () => {
      const wasMoved = dragStartRef.current?.moved ?? false;
      dragStartRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (!wasMoved) {
        setEditValue(String(value));
        setIsEditing(true);
        window.setTimeout(() => inputRef.current?.select(), 0);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      className={`gf-field-box gf-number-field ${className}`.trim()}
      onPointerDown={handlePointerDown}
    >
      <p className="gf-field-label">{label}</p>
      <div className="gf-number-row">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit(editValue);
              if (e.key === 'Escape') setIsEditing(false);
            }}
            onBlur={() => commitEdit(editValue)}
            className="gf-number-input"
            autoFocus
          />
        ) : (
          <span className="gf-number-display">
            {value}
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
};

export const PromptModal: React.FC<{
  isOpen: boolean;
  title: string;
  onAccept: (value: string) => void;
  onCancel: () => void;
}> = ({ isOpen, title, onAccept, onCancel }) => {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (isOpen) setValue('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="gf-modal-backdrop" onClick={onCancel}>
      <div className="gf-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="gf-modal-head">
          <h3 className="gf-modal-title">{title}</h3>
          <button
            type="button"
            className="gf-modal-close-btn"
            onClick={onCancel}
            aria-label="Cerrar ventana"
          >
            <X size={16} strokeWidth={1.75} className="gf-icon-shrink" />
          </button>
        </div>
        <textarea
          autoFocus
          className="gf-modal-textarea"
          placeholder="Escribe aquí..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="gf-modal-actions">
          <PillButton variant="outline" onClick={onCancel}>
            Cancelar
          </PillButton>
          <PillButton
            variant="solid"
            onClick={() => {
              onAccept(value);
              setValue('');
            }}
          >
            Añadir
          </PillButton>
        </div>
      </div>
    </div>
  );
};

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
    usedPages >= limitPages ? 'is-danger' : pagesPct >= 80 ? 'is-warn' : 'is-ok';
  const projectsMeterTone =
    usedProjects >= limitProjects ? 'is-danger' : projectsPct >= 80 ? 'is-warn' : 'is-ok';

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onOpenUpgrade}
        className={`gf-quota-top-pill gf-plan-topbar-pill gf-quota-meter-compact ${pagesMeterTone} ${className}`.trim()}
        title={`Plan ${planCfg.name} (${planCfg.priceLabel} ${planCfg.periodLabel}) — Ver cuotas y gestionar plan`}
      >
        <Crown size={13} strokeWidth={2} className="gf-icon-shrink" />
        <span>{planCfg.name}</span>
        <span aria-hidden="true">·</span>
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
    >
      <div className="gf-quota-card-head">
        <span
          className="gf-section-label"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
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
          <strong>
            {usedPages} / {limitPages}
          </strong>
        </div>
        <div
          className="gf-quota-bar-track"
          role="progressbar"
          aria-label={`Páginas: ${usedPages} / ${limitPages}`}
          aria-valuemin={0}
          aria-valuemax={limitPages}
          aria-valuenow={usedPages}
        >
          <div
            className={`gf-quota-bar-fill ${pagesMeterTone}`}
            style={{ width: `${pagesPct}%` }}
          />
        </div>
      </div>

      <div className="gf-quota-meter">
        <div className="gf-quota-meter-row">
          <span>
            Proyectos: {usedProjects} / {limitProjects}
          </span>
          <strong>
            {usedProjects} / {limitProjects}
          </strong>
        </div>
        <div
          className="gf-quota-bar-track"
          role="progressbar"
          aria-label={`Proyectos: ${usedProjects} / ${limitProjects}`}
          aria-valuemin={0}
          aria-valuemax={limitProjects}
          aria-valuenow={usedProjects}
        >
          <div
            className={`gf-quota-bar-fill ${projectsMeterTone}`}
            style={{ width: `${projectsPct}%` }}
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
        >
          <FolderPlus size={13} strokeWidth={2} className="gf-icon-shrink" />
          <span>+ Nuevo Proyecto</span>
        </button>
      )}
    </div>
  );
};
