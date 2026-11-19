'use client';

import React from 'react';
import { Calculator, Check, Layers, Ruler } from 'lucide-react';
import {
  PRINT_PRESET_LIST,
  getPrintPreset,
  type TrimFormatId,
} from '@/lib/print/presets';
import type { Project } from '../types';
import { DragNumberField, FieldDropdown, SectionLabel } from './Primitives';

export const ProjectManager: React.FC<{
  project: Project;
  updateProject: (updates: Partial<Project>) => void;
}> = ({ project, updateProject }) => {
  const activePreset = getPrintPreset(project.trimFormat);
  const spineMm = (project.cover.spineWidthInches * 25.4).toFixed(2);

  return (
    <div className="gf-project-wrap animate-slide-in-right">
      <div>
        <h1 className="gf-page-title">Configuración y Lomo</h1>
        <p className="gf-page-subtitle">
          Elige tu estándar editorial (Tankōbon B6, Canva B4 Pro o Amazon KDP) con cálculo exacto de
          sangrado, área segura Naiwaku y ancho de lomo.
        </p>
      </div>

      {/* Block 3: 3 Real Print Presets */}
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
            value={project.readingDirection === 'ltr' ? 'Occidental (Izq. → Der.)' : 'Manga Japonés (Der. → Izq.)'}
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

        <div className="gf-card gf-spine-card">
          <div className="gf-spine-head">
            <div className="gf-icon-badge">
              <Calculator size={22} strokeWidth={1.75} className="gf-icon-shrink" />
            </div>
            <div>
              <p className="gf-spine-title">Cálculo de Lomo y Salida ({activePreset.shortName})</p>
              <p className="gf-spine-desc">
                Sincronizado con lienzo {activePreset.exportWidthPx}×{activePreset.exportHeightPx} px,
                sangrado {activePreset.bleedLabel} y densidad de papel.
              </p>
            </div>
          </div>

          <div className="gf-spine-metric">
            <span className="gf-spine-metric-label">Ancho de Lomo Exacto</span>
            <span className="gf-spine-metric-value">
              {project.cover.spineWidthInches.toFixed(4)}&quot;{' '}
              <span className="gf-spine-metric-mm">({spineMm} mm)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
