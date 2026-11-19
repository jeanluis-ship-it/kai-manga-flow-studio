'use client';

import React, { forwardRef, useImperativeHandle } from 'react';
import { Project, toDataImageSrc } from '../types';

export interface CoverDesignerHandle {
  exportCover: () => Promise<void>;
}

export const CoverDesigner = forwardRef<
  CoverDesignerHandle,
  {
    project: Project;
    updateProject: (updates: Partial<Project>) => void;
  }
>(({ project }, ref) => {
  useImperativeHandle(ref, () => ({
    exportCover: async () => {
      if (typeof window !== 'undefined') {
        window.print();
      }
    },
  }));

  const wrapSrc = toDataImageSrc(project.cover.fullWrapBase64);

  return (
    <div className="gf-cover-wrap animate-slide-in-right">
      <div className="gf-cover-header">
        <h1 className="gf-page-title">Paperback Wrap Designer</h1>
        <p className="gf-cover-subtitle">
          Matched Front &amp; Back · 6x9&quot; Standard Format · Auto-spine:{' '}
          {project.cover.spineWidthInches.toFixed(3)}&quot;
        </p>
      </div>

      <div className="gf-cover-stage">
        {wrapSrc ? (
          <div className="gf-cover-canvas">
            <img
              src={wrapSrc}
              alt={`${project.name || 'Manga'} full paperback wrap`}
              className="gf-cover-img"
            />
            <div className="gf-cover-guides">
              <div className="gf-cover-half gf-cover-back">
                <span className="gf-cover-guide-label">Back Cover</span>
                <div className="gf-isbn-box">
                  <div className="gf-isbn-bars" />
                  <span className="gf-isbn-code">ISBN 978-0-00000-000-0</span>
                </div>
              </div>
              <div className="gf-cover-spine">
                <span className="gf-cover-spine-label">
                  Spine ({project.cover.spineWidthInches.toFixed(2)}&quot;)
                </span>
              </div>
              <div className="gf-cover-half gf-cover-front">
                <span className="gf-cover-guide-label">Front Cover</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="gf-cover-empty">
            <span className="material-symbols-outlined gf-cover-empty-icon">auto_stories</span>
            <span className="gf-cover-empty-text">GENERATE UNIFIED WRAP IN SIDEBAR</span>
          </div>
        )}
      </div>

      <div className="gf-cover-info-grid">
        <div className="gf-card gf-cover-info-card">
          <span className="material-symbols-outlined gf-cover-info-icon">palette</span>
          <div>
            <p className="gf-cover-info-title">Visual Matching</p>
            <p className="gf-cover-info-text">
              Single-pass 16:9 wrap ensures lighting, atmosphere, and character styling flow
              continuously from back cover across the spine to the front.
            </p>
          </div>
        </div>

        <div className="gf-card gf-cover-info-card">
          <span className="material-symbols-outlined gf-cover-info-icon">straighten</span>
          <div>
            <p className="gf-cover-info-title">Print Resolution</p>
            <p className="gf-cover-info-text">
              Formatted for Amazon KDP 6x9&quot; paperback trim with dynamic{' '}
              {project.cover.spineWidthInches.toFixed(3)}&quot; spine width and bleed allowance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

CoverDesigner.displayName = 'CoverDesigner';
