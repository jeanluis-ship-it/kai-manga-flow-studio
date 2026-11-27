'use client';

import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  Layers,
  Palette,
  Ruler,
  Scale,
  Sparkles,
  Type,
  User,
} from 'lucide-react';
import {
  PRINT_PRESET_LIST,
  computePrintBudget,
  getPrintPreset,
  type TrimFormatId,
} from '@/lib/print/presets';
import type { BindingType, ColorMode, Project } from '../types';
import './ProjectManager.css';

const COPY_TIERS = [1, 10, 50, 100, 500] as const;

const COLOR_OPTIONS: Array<{ id: ColorMode; label: string; sub: string }> = [
  { id: 'bw', label: 'Blanco y Negro', sub: 'Tinta Sumi pura + tramas B/N' },
  { id: 'color', label: 'Color', sub: 'Estucado CMYK editorial' },
];

const BINDING_OPTIONS: Array<{ id: BindingType; label: string; sub: string }> = [
  { id: 'rustica_pegada', label: 'Rústica Pegada', sub: 'Tankōbon clásico PUR' },
  { id: 'tapa_dura', label: 'Tapa Dura', sub: 'Cartoné coleccionista' },
  { id: 'grapa', label: 'Grapa', sub: 'Revista / One-shot ligero' },
];

export const ProjectManager: React.FC<{
  project: Project;
  updateProject: (updates: Partial<Project>) => void;
  onOpenFlipbook?: () => void;
  onOpenPages?: () => void;
}> = ({ project, updateProject }) => {
  const [copies, setCopies] = useState<number>(50);

  const activePreset = getPrintPreset(project.trimFormat);
  const colorMode: ColorMode = project.colorMode === 'color' ? 'color' : 'bw';
  const bindingType: BindingType =
    project.bindingType === 'tapa_dura' || project.bindingType === 'grapa'
      ? project.bindingType
      : 'rustica_pegada';

  const budget = useMemo(
    () =>
      computePrintBudget({
        trimFormat: activePreset.id,
        pageCount: project.pageCount,
        paperType: project.paperType,
        colorMode,
        bindingType,
        copies,
      }),
    [activePreset.id, project.pageCount, project.paperType, colorMode, bindingType, copies],
  );

  const kdpFactor =
    colorMode === 'color'
      ? project.paperType === 'cream'
        ? 0.00268
        : 0.00242
      : project.paperType === 'cream'
      ? 0.0025
      : 0.002252;

  const gutterInches = project.pageCount > 300 ? 0.625 : project.pageCount > 150 ? 0.5 : 0.375;
  const gutterMm = gutterInches * 25.4;

  const coverPanelWidthMm = activePreset.trimWidthMm + activePreset.bleedMm;
  const fullWrapWidthMm = coverPanelWidthMm * 2 + budget.spineMm;
  const fullWrapHeightMm = activePreset.trimHeightMm + activePreset.bleedMm * 2;
  const fullWrapWidthIn = fullWrapWidthMm / 25.4;
  const fullWrapHeightIn = fullWrapHeightMm / 25.4;

  // Dynamic SVG spine width clamped for visual clarity inside 700px blueprint
  const svgSpineWidth = Math.min(82, Math.max(36, Math.round(budget.spineMm * 3.4)));
  const svgOuterPad = 12;
  const svgGap = 6;
  const svgPanelWidth = Math.floor((700 - svgOuterPad * 2 - svgSpineWidth - svgGap * 2) / 2);
  const svgSpineX = svgOuterPad + svgPanelWidth + svgGap;
  const svgFrontX = svgSpineX + svgSpineWidth + svgGap;

  const handlePageCountChange = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.max(24, Math.min(828, parsed));
    updateProject({ pageCount: clamped });
  };

  const handleAskKaiProject = () => {
    if (typeof window === 'undefined') return;
    const prompt = `Ayúdame a definir el Título, Gancho Editorial y Sinopsis de Contraportada para mi proyecto «${
      project.name || 'Manga sin título'
    }» (${activePreset.shortName}, ${project.pageCount} págs., modo ${
      colorMode === 'color' ? 'Color' : 'Blanco y Negro'
    }, encuadernación ${budget.breakdown.bindingLabel}).`;
    window.dispatchEvent(
      new CustomEvent('mangai-kai-ask', {
        detail: { prompt, mode: 'mentor' },
      }),
    );
  };

  return (
    <div className="gf-project-wrap gf-pm-stitch animate-slide-in-right">
      {/* Header Group — Stitch KDP Print Setup */}
      <header className="gf-pm-header">
        <div className="gf-pm-header-copy">
          <div className="gf-pm-kicker-row">
            <span className="gf-pm-kicker-pill">MÓDULO DE ESPECIFICACIÓN</span>
            <span className="gf-pm-kicker-dot" aria-hidden="true">
              ·
            </span>
            <span className="gf-pm-kicker-sub">PAPERBACK TANKŌBON</span>
          </div>
          <h1 className="gf-pm-title">Configuración KDP y Lomo</h1>
          <p className="gf-pm-subtitle">
            Configura la geometría del manuscrito, dimensiones exactas de lomo y parámetros de
            impresión para {activePreset.name} ({activePreset.trimLabel}).
          </p>
        </div>

        <button type="button" className="gf-pm-kai-btn" onClick={handleAskKaiProject}>
          <Sparkles size={14} strokeWidth={2} className="gf-icon-shrink" />
          <span>Asistir Obra y Sinopsis con KAI</span>
        </button>
      </header>

      {/* Main Minimal Form Stack */}
      <section className="gf-pm-form" aria-label="Especificación editorial del manuscrito">
        {/* Series Title */}
        <div className="gf-pm-field">
          <div className="gf-pm-field-head">
            <label className="gf-pm-label" htmlFor="gf-series-title">
              Título de la Serie / Obra
            </label>
            <span className="gf-pm-meta-code">METADATA_FIELD_01</span>
          </div>
          <div className="gf-pm-input-shell">
            <input
              id="gf-series-title"
              type="text"
              value={project.name}
              onChange={(e) => updateProject({ name: e.target.value })}
              className="gf-pm-input gf-pm-input-display"
              placeholder="Ej. AnaCaona: Flor Guerrera"
            />
            <Type size={16} strokeWidth={1.75} className="gf-pm-input-icon" aria-hidden="true" />
          </div>
        </div>

        {/* Author + Reading Direction */}
        <div className="gf-pm-grid-2">
          <div className="gf-pm-field">
            <div className="gf-pm-field-head">
              <label className="gf-pm-label" htmlFor="gf-lead-author">
                Autor / Mangaka
              </label>
              <span className="gf-pm-meta-code">CRÉDITO_LEGAL</span>
            </div>
            <div className="gf-pm-input-shell">
              <input
                id="gf-lead-author"
                type="text"
                value={project.author}
                onChange={(e) => updateProject({ author: e.target.value })}
                className="gf-pm-input"
                placeholder="Nombre del autor o seudónimo"
              />
              <User size={16} strokeWidth={1.75} className="gf-pm-input-icon" aria-hidden="true" />
            </div>
          </div>

          <div className="gf-pm-field">
            <div className="gf-pm-field-head">
              <label className="gf-pm-label" htmlFor="gf-reading-dir">
                Dirección de Lectura
              </label>
              <span className="gf-pm-meta-code">
                {project.readingDirection === 'ltr' ? 'OCCIDENTAL LTR' : 'MANGA RTL'}
              </span>
            </div>
            <div className="gf-pm-input-shell">
              <select
                id="gf-reading-dir"
                className="gf-pm-select"
                value={project.readingDirection === 'ltr' ? 'ltr' : 'rtl'}
                onChange={(e) =>
                  updateProject({
                    readingDirection: e.target.value === 'ltr' ? 'ltr' : 'rtl',
                  })
                }
              >
                <option value="rtl">Manga Japonés (Der. → Izq.)</option>
                <option value="ltr">Occidental (Izq. → Der.)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Page Count + Paper Type & Grammage */}
        <div className="gf-pm-grid-2">
          <div className="gf-pm-field">
            <div className="gf-pm-field-head">
              <label className="gf-pm-label" htmlFor="gf-page-count">
                Total de Páginas
              </label>
              <span className="gf-pm-meta-code">MIN 24 · MAX 828</span>
            </div>
            <div className="gf-pm-input-shell">
              <input
                id="gf-page-count"
                type="number"
                min={24}
                max={828}
                step={2}
                value={project.pageCount}
                onChange={(e) => handlePageCountChange(e.target.value)}
                className="gf-pm-input gf-pm-input-mono"
              />
              <span className="gf-pm-input-suffix">PÁGINAS</span>
            </div>
          </div>

          <div className="gf-pm-field">
            <div className="gf-pm-field-head">
              <label className="gf-pm-label" htmlFor="gf-paper-density">
                Tipo de Papel y Gramaje
              </label>
              <span className="gf-pm-meta-code">FACTOR KDP: {kdpFactor.toFixed(6)}</span>
            </div>
            <div className="gf-pm-input-shell">
              <select
                id="gf-paper-density"
                className="gf-pm-select"
                value={project.paperType}
                onChange={(e) =>
                  updateProject({
                    paperType: e.target.value === 'cream' ? 'cream' : 'white',
                  })
                }
              >
                <option value="white">Papel Blanco Estándar (50-61 lb / 80 g)</option>
                <option value="cream">Papel Crema Manga Clásico (55 lb / 90 g)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Trim Format Cards */}
        <div className="gf-pm-field">
          <div className="gf-pm-field-head">
            <span className="gf-pm-label">Formato de Corte y Pre-Prensa</span>
            <span className="gf-pm-meta-code">
              {activePreset.exportWidthPx}×{activePreset.exportHeightPx} PX · {activePreset.dpiInterior} DPI
            </span>
          </div>
          <div className="gf-pm-trim-grid" role="radiogroup" aria-label="Formato de corte">
            {PRINT_PRESET_LIST.map((preset) => {
              const selected = activePreset.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`gf-pm-trim-card ${selected ? 'is-active' : ''}`}
                  onClick={() => updateProject({ trimFormat: preset.id as TrimFormatId })}
                >
                  <div className="gf-pm-trim-top">
                    <span className="gf-pm-trim-badge">{preset.badge}</span>
                    {selected && (
                      <span className="gf-pm-trim-check" aria-hidden="true">
                        <Check size={12} strokeWidth={2.5} />
                      </span>
                    )}
                  </div>
                  <strong className="gf-pm-trim-name">{preset.shortName}</strong>
                  <span className="gf-pm-trim-spec">{preset.trimLabel}</span>
                  <span className="gf-pm-trim-foot">
                    <Layers size={11} strokeWidth={2} className="gf-icon-shrink" />
                    Sangrado {preset.bleedMm.toFixed(1)} mm · {preset.dpiInterior} DPI
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Mode & Binding Type */}
        <div className="gf-pm-grid-2">
          <div className="gf-pm-field">
            <div className="gf-pm-field-head">
              <span className="gf-pm-label">Modo de Tinta</span>
              <span className="gf-pm-meta-code">
                {colorMode === 'color' ? 'CMYK ESTUCADO' : 'SUMI 600 DPI'}
              </span>
            </div>
            <div className="gf-pm-mode-pills" role="radiogroup" aria-label="Modo de impresión">
              {COLOR_OPTIONS.map((opt) => {
                const active = colorMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`gf-pm-choice-btn ${active ? 'is-active' : ''}`}
                    onClick={() => updateProject({ colorMode: opt.id })}
                  >
                    <span className="gf-pm-choice-title">
                      <Palette size={13} strokeWidth={2} className="gf-icon-shrink" />
                      {opt.label}
                    </span>
                    <span className="gf-pm-choice-sub">{opt.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="gf-pm-field">
            <div className="gf-pm-field-head">
              <span className="gf-pm-label">Encuadernación</span>
              <span className="gf-pm-meta-code">{budget.breakdown.bindingLabel.toUpperCase()}</span>
            </div>
            <div className="gf-pm-binding-pills" role="radiogroup" aria-label="Tipo de encuadernación">
              {BINDING_OPTIONS.map((opt) => {
                const active = bindingType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`gf-pm-choice-btn ${active ? 'is-active' : ''}`}
                    onClick={() => updateProject({ bindingType: opt.id })}
                  >
                    <span className="gf-pm-choice-title">
                      <BookOpen size={13} strokeWidth={2} className="gf-icon-shrink" />
                      {opt.label}
                    </span>
                    <span className="gf-pm-choice-sub">{opt.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Card: Cálculo de Lomo (Stitch Spine Width Calculation Blueprint) */}
      <section className="gf-pm-spine-card" aria-label="Cálculo de Lomo">
        <div className="gf-pm-spine-head">
          <div className="gf-pm-spine-head-left">
            <div className="gf-pm-spine-icon" aria-hidden="true">
              <Ruler size={20} strokeWidth={1.85} />
            </div>
            <div>
              <h2 className="gf-pm-spine-title">Cálculo de Lomo</h2>
              <p className="gf-pm-spine-desc">
                Fórmula KDP automática aplicada según densidad del papel, encuadernación y pliegos.
              </p>
            </div>
          </div>
          <span className="gf-pm-precision-badge">PRECISIÓN L2</span>
        </div>

        {/* Giant Monospace Readout */}
        <div className="gf-pm-spine-readout-box">
          <div className="gf-pm-spine-readout-copy">
            <span className="gf-pm-spine-readout-kicker">ANCHO DE LOMO CALCULADO</span>
            <span className="gf-pm-spine-readout-sub">
              Incluye tolerancia de bisagra en portada y contraportada ({activePreset.shortName})
            </span>
          </div>
          <div className="gf-pm-spine-readout-nums">
            <span className="gf-pm-spine-big">{budget.spineInches.toFixed(4)}&quot;</span>
            <span className="gf-pm-spine-mm">({budget.spineMm.toFixed(2)} mm)</span>
          </div>
        </div>

        {/* 4 Clean Metric Cells */}
        <div className="gf-pm-metrics-4">
          <div className="gf-pm-metric-cell">
            <span className="gf-pm-metric-label">Lomo interior / Gutter</span>
            <strong className="gf-pm-metric-val">
              {gutterInches.toFixed(3)}&quot; ({gutterMm.toFixed(1)} mm)
            </strong>
          </div>
          <div className="gf-pm-metric-cell">
            <span className="gf-pm-metric-label">Margen exterior</span>
            <strong className="gf-pm-metric-val">0.250&quot; (6.4 mm)</strong>
          </div>
          <div className="gf-pm-metric-cell">
            <span className="gf-pm-metric-label">Sangrado +3.5mm</span>
            <strong className="gf-pm-metric-val is-crimson">
              +{activePreset.bleedMm.toFixed(1)} mm / borde
            </strong>
          </div>
          <div className="gf-pm-metric-cell">
            <span className="gf-pm-metric-label">Peso unitario</span>
            <strong className="gf-pm-metric-val">
              {budget.unitWeightGrams} g ({budget.sheetsCount} pliegos)
            </strong>
          </div>
        </div>

        {/* Horizontal 3-Part Wrap Schematic */}
        <div className="gf-pm-schematic">
          <div className="gf-pm-schematic-top">
            <span>CONTRAPORTADA ({coverPanelWidthMm.toFixed(1)} mm)</span>
            <span className="is-crimson">LOMO ({budget.spineMm.toFixed(2)} mm)</span>
            <span>PORTADA ({coverPanelWidthMm.toFixed(1)} mm)</span>
          </div>

          <svg
            className="gf-pm-schematic-svg"
            viewBox="0 0 700 84"
            role="img"
            aria-label={`Esquema horizontal de cubierta: Contraportada, Lomo de ${budget.spineMm.toFixed(
              2,
            )} mm y Portada`}
          >
            {/* Outer bleed container */}
            <rect
              x="2"
              y="2"
              width="696"
              height="80"
              rx="4"
              className="gf-pm-svg-bleed"
            />
            {/* Back cover */}
            <rect
              x={svgOuterPad}
              y="12"
              width={svgPanelWidth}
              height="60"
              rx="3"
              className="gf-pm-svg-panel"
            />
            <text
              x={svgOuterPad + svgPanelWidth / 2}
              y="46"
              textAnchor="middle"
              className="gf-pm-svg-text"
            >
              CONTRAPORTADA
            </text>

            {/* Spine highlighted in Carmesí */}
            <rect
              x={svgSpineX}
              y="12"
              width={svgSpineWidth}
              height="60"
              rx="2"
              className="gf-pm-svg-spine"
            />
            <line
              x1={svgSpineX}
              y1="12"
              x2={svgSpineX}
              y2="72"
              className="gf-pm-svg-spine-line"
            />
            <line
              x1={svgSpineX + svgSpineWidth}
              y1="12"
              x2={svgSpineX + svgSpineWidth}
              y2="72"
              className="gf-pm-svg-spine-line"
            />
            <text
              x={svgSpineX + svgSpineWidth / 2}
              y="40"
              textAnchor="middle"
              className="gf-pm-svg-spine-text"
            >
              LOMO
            </text>
            <text
              x={svgSpineX + svgSpineWidth / 2}
              y="54"
              textAnchor="middle"
              className="gf-pm-svg-spine-sub"
            >
              {budget.spineMm.toFixed(1)}mm
            </text>

            {/* Front cover */}
            <rect
              x={svgFrontX}
              y="12"
              width={svgPanelWidth}
              height="60"
              rx="3"
              className="gf-pm-svg-panel"
            />
            <text
              x={svgFrontX + svgPanelWidth / 2}
              y="46"
              textAnchor="middle"
              className="gf-pm-svg-text"
            >
              PORTADA · {activePreset.shortName.toUpperCase()}
            </text>

            {/* Trim corner ticks */}
            <line x1={svgOuterPad} y1="2" x2={svgOuterPad} y2="9" className="gf-pm-svg-tick" />
            <line
              x1={700 - svgOuterPad}
              y1="2"
              x2={700 - svgOuterPad}
              y2="9"
              className="gf-pm-svg-tick"
            />
            <line x1={svgOuterPad} y1="75" x2={svgOuterPad} y2="82" className="gf-pm-svg-tick" />
            <line
              x1={700 - svgOuterPad}
              y1="75"
              x2={700 - svgOuterPad}
              y2="82"
              className="gf-pm-svg-tick"
            />
          </svg>

          <div className="gf-pm-schematic-foot">
            <span>
              CUBIERTA ENVOLVENTE: {fullWrapWidthIn.toFixed(3)}&quot; × {fullWrapHeightIn.toFixed(3)}
              &quot; ({fullWrapWidthMm.toFixed(1)} × {fullWrapHeightMm.toFixed(1)} mm)
            </span>
            <span className="gf-pm-schematic-status">ESTADO: ESPECIFICACIÓN KDP VÁLIDA</span>
          </div>
        </div>
      </section>

      {/* Compact Presupuesto de Tirada */}
      <section className="gf-pm-budget-card" aria-label="Presupuesto de Tirada">
        <div className="gf-pm-budget-top">
          <div>
            <span className="gf-pm-budget-kicker">PRESUPUESTO DE TIRADA</span>
            <h2 className="gf-pm-budget-title">Estimación de Imprenta y Margen Editorial</h2>
          </div>

          <div className="gf-pm-copies-pills" role="group" aria-label="Ejemplares a cotizar">
            {COPY_TIERS.map((qty) => (
              <button
                key={qty}
                type="button"
                className={`gf-pm-copy-chip ${copies === qty ? 'is-active' : ''}`}
                onClick={() => setCopies(qty)}
              >
                {qty} {qty === 1 ? 'ud.' : 'uds.'}
              </button>
            ))}
          </div>
        </div>

        <div className="gf-pm-budget-kpis">
          <div className="gf-pm-budget-kpi">
            <span className="gf-pm-budget-kpi-label">Costo Unitario</span>
            <strong className="gf-pm-budget-kpi-val">${budget.unitCostUsd.toFixed(2)}</strong>
            <span className="gf-pm-budget-kpi-sub">
              {budget.discountPct > 0
                ? `Incluye -${budget.discountPct}% por volumen`
                : 'Tirada unitaria base'}
            </span>
          </div>

          <div className="gf-pm-budget-kpi is-featured">
            <span className="gf-pm-budget-kpi-label">Total Tirada ({copies} uds.)</span>
            <strong className="gf-pm-budget-kpi-val">${budget.batchTotalUsd.toFixed(2)}</strong>
            <span className="gf-pm-budget-kpi-sub">
              {budget.sheetsCount} pliegos · {budget.breakdown.colorLabel}
            </span>
          </div>

          <div className="gf-pm-budget-kpi">
            <span className="gf-pm-budget-kpi-label">PVP Sugerido</span>
            <strong className="gf-pm-budget-kpi-val">${budget.suggestedPvpUsd.toFixed(2)}</strong>
            <span className="gf-pm-budget-kpi-sub">Peso estimado: {budget.unitWeightGrams} g</span>
          </div>
        </div>

        <div className="gf-pm-breakdown">
          <span>
            <Scale size={12} strokeWidth={2} className="gf-icon-shrink" />
            Encuadernación: <strong>${budget.breakdown.bindingCostPerUnitUsd.toFixed(2)}</strong>
          </span>
          <span>
            Papel ({budget.breakdown.paperLabel}):{' '}
            <strong>${budget.breakdown.paperCostPerUnitUsd.toFixed(2)}</strong>
          </span>
          <span>
            Impresión ({colorMode === 'color' ? 'Color' : 'B/N'}):{' '}
            <strong>${budget.breakdown.colorCostPerUnitUsd.toFixed(2)}</strong>
          </span>
        </div>
      </section>
    </div>
  );
};
