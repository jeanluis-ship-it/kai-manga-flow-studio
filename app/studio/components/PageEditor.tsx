'use client';

import React, { useState } from 'react';
import { Flow } from '../flow-sdk';
import { Project, splitDataUrl, toDataImageSrc } from '../types';
import { SectionLabel, PillButton } from './Primitives';

export const PageEditor: React.FC<{
  project: Project;
  pageIndex: number;
  updateProject: (updates: Partial<Project>) => void;
}> = ({ project, pageIndex, updateProject }) => {
  const [showGuides, setShowGuides] = useState(false);

  const safeIndex = Math.min(Math.max(0, pageIndex), Math.max(0, project.pages.length - 1));
  const page = project.pages[safeIndex];
  const pageSrc = toDataImageSrc(page?.base64);

  const handleDelete = () => {
    if (project.pages.length <= 1) return;
    const nextPages = project.pages.filter((_, idx) => idx !== safeIndex);
    updateProject({ pages: nextPages });
  };

  const handleDownload = async () => {
    if (!page?.base64) return;
    const { mimeType, base64 } = splitDataUrl(page.base64);
    if (!base64) return;
    const ext = mimeType.includes('webp')
      ? 'webp'
      : mimeType.includes('jpeg')
      ? 'jpg'
      : mimeType.includes('svg')
      ? 'svg'
      : 'png';
    const baseName = (project.name || 'manga').trim().replace(/\s+/g, '_');
    await Flow.download({
      base64,
      mimeType,
      filename: `${baseName}_page_${String(safeIndex + 1).padStart(3, '0')}.${ext}`,
    });
  };

  return (
    <div className="gf-editor-wrap animate-slide-in-right">
      <div className="gf-editor-header">
        <div>
          <h2 className="gf-editor-title">Interior View</h2>
          <p className="gf-editor-counter">
            PAGE {safeIndex + 1} / {project.pages.length}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowGuides((prev) => !prev)}
          className={`gf-guides-btn ${showGuides ? 'is-active' : ''}`}
        >
          <span className="material-symbols-outlined gf-guides-icon">grid_on</span>
          <span>{showGuides ? 'HIDE GUIDES' : 'SHOW GUIDES'}</span>
        </button>
      </div>

      <div className="gf-sheet">
        {showGuides && <div className="gf-sheet-guide" />}
        {pageSrc ? (
          <img
            src={pageSrc}
            alt={`Interior page ${safeIndex + 1}`}
            className="gf-sheet-img"
          />
        ) : (
          <div className="gf-sheet-empty">
            <span className="material-symbols-outlined gf-sheet-empty-icon">draw</span>
            <span className="gf-sheet-empty-text">INK AWAITING</span>
          </div>
        )}
      </div>

      <div className="gf-card gf-prompt-card">
        <SectionLabel>PAGE PROMPT</SectionLabel>
        <p className="gf-prompt-text">
          {page?.prompt || 'No instructions provided. Use the sidebar to generate ink.'}
        </p>
        <div className="gf-prompt-actions">
          <PillButton
            variant="outline"
            onClick={handleDelete}
            disabled={project.pages.length <= 1}
          >
            Delete Page
          </PillButton>
          <PillButton
            variant="outline"
            onClick={handleDownload}
            disabled={!page?.base64}
          >
            Download Asset
          </PillButton>
        </div>
      </div>
    </div>
  );
};
