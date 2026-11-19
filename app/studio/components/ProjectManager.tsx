'use client';

import React from 'react';
import { Project } from '../types';
import { DragNumberField, FieldDropdown } from './Primitives';

export const ProjectManager: React.FC<{
  project: Project;
  updateProject: (updates: Partial<Project>) => void;
}> = ({ project, updateProject }) => {
  return (
    <div className="gf-project-wrap animate-slide-in-right">
      <div>
        <h1 className="gf-page-title">KDP Print Setup</h1>
        <p className="gf-page-subtitle">
          Configure your manuscript for Amazon Paperback (6x9 in).
        </p>
      </div>

      <div className="gf-project-form">
        <div className="gf-field-box gf-field-box-lg">
          <label className="gf-field-label" htmlFor="gf-series-title">
            Series Title
          </label>
          <input
            id="gf-series-title"
            type="text"
            value={project.name}
            onChange={(e) => updateProject({ name: e.target.value })}
            className="gf-text-input gf-text-input-lg"
            placeholder="Untitled Manga"
          />
        </div>

        <div className="gf-field-box gf-field-box-lg">
          <label className="gf-field-label" htmlFor="gf-lead-author">
            Lead Artist / Author
          </label>
          <input
            id="gf-lead-author"
            type="text"
            value={project.author}
            onChange={(e) => updateProject({ author: e.target.value })}
            className="gf-text-input"
            placeholder="Author Name"
          />
        </div>

        <div className="gf-grid-2">
          <DragNumberField
            label="Total Page Count"
            value={project.pageCount}
            min={24}
            max={600}
            step={4}
            suffix=" pages"
            onChange={(val) => updateProject({ pageCount: val })}
          />

          <FieldDropdown
            label="Paper Type"
            value={project.paperType === 'white' ? 'Standard White' : 'Premium Cream'}
            options={['Standard White', 'Premium Cream']}
            onChange={(val) =>
              updateProject({ paperType: val === 'Standard White' ? 'white' : 'cream' })
            }
          />
        </div>

        <div className="gf-card gf-spine-card">
          <div className="gf-spine-head">
            <div className="gf-icon-badge">
              <span className="material-symbols-outlined">calculate</span>
            </div>
            <div>
              <p className="gf-spine-title">Spine Width Calculation</p>
              <p className="gf-spine-desc">
                Automatic KDP formula applied based on paper density.
              </p>
            </div>
          </div>

          <div className="gf-spine-metric">
            <span className="gf-spine-metric-label">Estimated Spine Width</span>
            <span className="gf-spine-metric-value">
              {project.cover.spineWidthInches.toFixed(4)}&quot;
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
