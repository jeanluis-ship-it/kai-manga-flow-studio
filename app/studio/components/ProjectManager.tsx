'use client';

import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Calculator,
  Check,
  Layers,
  Palette,
  Ruler,
  Scale,
  Sparkles,
} from 'lucide-react';
import {
  PRINT_PRESET_LIST,
  computePrintBudget,
  getPrintPreset,
  type TrimFormatId,
} from '@/lib/print/presets';
import type { BindingType, ColorMode, Project } from '../types';
import { DragNumberField, FieldDropdown, SectionLabel } from './Primitives';
import './ProjectManager.css';

const COPY_TIERS = [1, 10, 50, 100, 500] as const;

const COLOR_OPTIONS: Array<{ id: ColorMode; label: string; sub: string }> = [
  { id: 'bw', label: 'Blanco y Negro', sub: 'Tinta Sumi + tramas B/N' },
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
    <div className="gf-project-wrap animate-slide-in-right">
      <div className="gf-pm-header-row">
        <div>
          <h1 className="gf-page-title">Configuración y Lomo</h1>
          <p className="gf-page-subtitle">
            Elige estándar editorial, color, encuadernación y tirada con cálculo vivo de lomo, peso y
            presupuesto de imprenta.
          </p>
        </div>

        <button type="button" className="gf-pm-kai-btn" onClick={handleAskKaiProject}>
          <Sparkles size={14} strokeWidth={2} className="gf-icon-shrink" />
          <span>Asistir Obra y Sinopsis con KAI</span>
        </button>
      </div>

      {/* 3 Real Print Presets */}
      <div className="gf-preset-section">
        <SectionLabel>Formato Editorial y Pre-Prensa</SectionLabel>
        <div className="gf-preset-grid" role="radiogroup" aria-label="Formato de impresión">
          {PRINT_PRESET_LIST.map((preset) => {
            const selected = activePreset.id === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`gf-preset-card ${selected ? 'is-active' : ''}`}
                onClick={() => updateProject({ trimFormat: preset.id as TrimFormatId })}
              >
                <div className="gf-preset-card-top">
                  <span className="gf-preset-badge">{preset.badge}</span>
                  {selected && (
                    <span className="gf-preset-check" aria-hidden="true">
                      <Check size={12} strokeWidth={2.5} />
                    </span>
                  )}
                </div>
                <p className="gf-preset-name">{preset.name}</p>
                <p className="gf-preset-desc">{preset.description}</p>
                <div className="gf-preset-specs">
                  <span>
                    <Ruler size={11} strokeWidth={2} className="gf-icon-shrink" />
                    {preset.trimLabel}
                  </span>
                  <span>
                    <Layers size={11} strokeWidth={2} className="gf-icon-shrink" />
                    Bleed: {preset.bleedLabel} · {preset.dpiInterior} DPI
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="gf-project-form">
        <div className="gf-field-box gf-field-box-lg">
          <label className="gf-field-label" htmlFor="gf-series-title">
            Título de la Obra
          </label>
          <input
            id="gf-series-title"
            type="text"
            value={project.name}
            onChange={(e) => updateProject({ name: e.target.value })}
            className="gf-text-input gf-text-input-lg"
            placeholder="Manga sin título"
          />
        </div>

        <div className="gf-grid-2">
          <div className="gf-field-box gf-field-box-lg">
            <label className="gf-field-label" htmlFor="gf-lead-author">
              Autor / Mangaka
            </label>
            <input
              id="gf-lead-author"
              type="text"
              value={project.author}
              onChange={(e) => updateProject({ author: e.target.value })}
              className="gf-text-input"
              placeholder="Nombre del autor"
            />
          </div>

          <FieldDropdown
            label="Dirección de Lectura"
            value={
              project.readingDirection === 'ltr'
                ? 'Occidental (Izq. → Der.)'
                : 'Manga Japonés (Der. → Izq.)'
            }
            options={['Manga Japonés (Der. → Izq.)', 'Occidental (Izq. → Der.)']}
            onChange={(val) =>
              updateProject({
                readingDirection: val.includes('Occidental') ? 'ltr' : 'rtl',
              })
            }
          />
        </div>

        <div className="gf-grid-2">
          <DragNumberField
            label="Total de Páginas"
            value={project.pageCount}
            min={24}
            max={600}
            step={4}
            suffix=" págs."
            onChange={(val) => updateProject({ pageCount: val })}
          />

          <FieldDropdown
            label="Tipo de Papel"
            value={project.paperType === 'white' ? 'Blanco Estándar' : 'Crema Premium'}
            options={['Blanco Estándar', 'Crema Premium']}
            onChange={(val) =>
              updateProject({ paperType: val === 'Blanco Estándar' ? 'white' : 'cream' })
            }
          />
        </div>

        {/* Color Mode & Binding Type */}
        <div className="gf-pm-segmented-group">
          <SectionLabel>Modo de Impresión</SectionLabel>
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

        <div className="gf-pm-segmented-group">
          <SectionLabel>Tipo de Encuadernación</SectionLabel>
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

        {/* Live Spine & Print Budget Calculator */}
        <div className="gf-card gf-spine-card">
          <div className="gf-pm-budget-head">
            <div className="gf-spine-head">
              <div className="gf-icon-badge">
                <Calculator size={22} strokeWidth={1.75} className="gf-icon-shrink" />
              </div>
              <div>
                <p className="gf-spine-title">Cálculo de Lomo y Salida ({activePreset.shortName})</p>
                <p className="gf-spine-desc">
                  Lienzo {activePreset.exportWidthPx}×{activePreset.exportHeightPx} px · sangrado{' '}
                  {activePreset.bleedLabel} · {budget.breakdown.colorLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="gf-pm-copies-bar">
            <span className="gf-pm-copies-label">Tirada del Lote (Ejemplares)</span>
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

          <div className="gf-pm-metrics-grid">
            <div className="gf-pm-stat-box is-highlight">
              <span className="gf-pm-stat-label">Ancho de Lomo</span>
              <span className="gf-pm-stat-val">{budget.spineInches.toFixed(4)}&quot;</span>
              <span className="gf-pm-stat-sub">{budget.spineMm.toFixed(2)} mm exactos</span>
            </div>

            <div className="gf-pm-stat-box">
              <span className="gf-pm-stat-label">Costo Unitario</span>
              <span className="gf-pm-stat-val">${budget.unitCostUsd.toFixed(2)}</span>
              <span className="gf-pm-stat-sub">
                {budget.discountPct > 0
                  ? `Incluye -${budget.discountPct}% por volumen`
                  : 'Tirada unitaria base'}
              </span>
            </div>

            <div className="gf-pm-stat-box">
              <span className="gf-pm-stat-label">Total Lote ({copies})</span>
              <span className="gf-pm-stat-val">${budget.batchTotalUsd.toFixed(2)}</span>
              <span className="gf-pm-stat-sub">{budget.sheetsCount} pliegos/tomo</span>
            </div>

            <div className="gf-pm-stat-box">
              <span className="gf-pm-stat-label">PVP Sugerido</span>
              <span className="gf-pm-stat-val">${budget.suggestedPvpUsd.toFixed(2)}</span>
              <span className="gf-pm-stat-sub">Peso est.: {budget.unitWeightGrams} g</span>
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
        </div>
      </div>
    </div>
  );
};
