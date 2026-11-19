'use client';

import React from 'react';
import { Calculator } from 'lucide-react';
import { Project } from '../types';
import { DragNumberField, FieldDropdown } from './Primitives';

export const ProjectManager: React.FC<{
  project: Project;
  updateProject: (updates: Partial<Project>) => void;
}> = ({ project, updateProject }) => {
  const spineMm = (project.cover.spineWidthInches * 25.4).toFixed(2);

  return (
    <div className="gf-project-wrap animate-slide-in-right">
      <div>
        <h1 className="gf-page-title">Configuración y Lomo</h1>
        <p className="gf-page-subtitle">
          Prepara tu manuscrito en formato Tankōbon / Amazon KDP (6×9&quot;) con cálculo automático de lomo.
        </p>
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
              <p className="gf-spine-title">Cálculo de Ancho de Lomo</p>
              <p className="gf-spine-desc">
                Fórmula editorial KDP aplicada automáticamente según la densidad del papel.
              </p>
            </div>
          </div>

          <div className="gf-spine-metric">
            <span className="gf-spine-metric-label">Ancho de Lomo Estimado</span>
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
