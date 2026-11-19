'use client';

import React, { useState } from 'react';
import { Flow } from '../flow-sdk';
import { Project, Character, toDataImageSrc } from '../types';
import { SectionLabel, PillButton } from './Primitives';

export const CharacterLibrary: React.FC<{
  project: Project;
  updateProject: (updates: Partial<Project>) => void;
  isGenerating: boolean;
  setIsGenerating: (val: boolean) => void;
}> = ({ project, updateProject, isGenerating, setIsGenerating }) => {
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [lockingCharId, setLockingCharId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const createNewCharacter = () => {
    setEditingChar({
      id: crypto.randomUUID(),
      name: '',
      appearance: '',
      clothing: '',
      role: 'Protagonist',
    });
  };

  const handleSaveProfile = () => {
    if (!editingChar) return;
    const trimmed: Character = {
      ...editingChar,
      name: editingChar.name.trim() || 'Unnamed Character',
      appearance: editingChar.appearance.trim(),
      clothing: editingChar.clothing.trim(),
    };
    const exists = project.characters.some((c) => c.id === trimmed.id);
    const nextChars = exists
      ? project.characters.map((c) => (c.id === trimmed.id ? trimmed : c))
      : [...project.characters, trimmed];
    updateProject({ characters: nextChars });
    setEditingChar(null);
  };

  const handleDeleteCharacter = (e: React.MouseEvent, charId: string) => {
    e.stopPropagation();
    const nextChars = project.characters.filter((c) => c.id !== charId);
    const nextPages = project.pages.map((p) => ({
      ...p,
      castIds: p.castIds.filter((cid) => cid !== charId),
    }));
    updateProject({ characters: nextChars, pages: nextPages });
  };

  const lockConsistency = async (e: React.MouseEvent, char: Character) => {
    e.stopPropagation();
    if (isGenerating) return;
    setError('');
    setLockingCharId(char.id);
    setIsGenerating(true);

    try {
      const details = [
        char.appearance ? `Face & features: ${char.appearance}` : '',
        char.clothing ? `Outfit: ${char.clothing}` : '',
        char.role ? `Role: ${char.role}` : '',
      ]
        .filter(Boolean)
        .join('. ');

      const prompt = `Character reference sheet, manga turnaround, front and side view, high contrast black and white ink. Name: ${char.name || 'Character'}. ${details}`;

      const res = await Flow.generate.image({
        prompt,
        mode: 'sheet',
        aspectRatio: '1:1',
        name: char.name || 'Character',
        details,
        modelDisplayName: '🍌 Nano Banana Pro',
      });

      const nextChars = project.characters.map((c) =>
        c.id === char.id
          ? {
              ...c,
              referenceBase64: res.dataUrl,
              referenceMediaId: res.mediaId,
            }
          : c
      );
      updateProject({ characters: nextChars });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to lock character reference.');
    } finally {
      setLockingCharId(null);
      setIsGenerating(false);
    }
  };

  return (
    <div className="gf-roster-wrap animate-slide-in-right">
      <div className="gf-roster-topbar">
        <div>
          <h1 className="gf-page-title">Character Roster</h1>
          <p className="gf-page-subtitle">
            Lock in character visuals to maintain consistency across every panel.
          </p>
        </div>
        <div className="gf-roster-cta">
          <PillButton
            variant="solid"
            icon={<span className="material-symbols-outlined">add</span>}
            onClick={createNewCharacter}
          >
            New Character
          </PillButton>
        </div>
      </div>

      {error && <div className="gf-error-banner">{error}</div>}

      {project.characters.length === 0 ? (
        <div className="gf-roster-empty">
          <span className="material-symbols-outlined gf-char-empty-icon">face</span>
          <span>No characters in your roster yet. Click + New Character to create one.</span>
        </div>
      ) : (
        <div className="gf-roster-grid">
          {project.characters.map((char) => {
            const imgSrc = toDataImageSrc(char.referenceBase64);
            const isLocked = Boolean(char.referenceMediaId || char.referenceBase64);
            const isLocking = lockingCharId === char.id;

            return (
              <div
                key={char.id}
                onClick={() => setEditingChar({ ...char })}
                className="gf-card gf-char-card"
              >
                <div className="gf-char-header">
                  <p className="gf-char-name">{char.name || 'Unnamed'}</p>
                  <button
                    type="button"
                    className="gf-char-delete-btn"
                    onClick={(e) => handleDeleteCharacter(e, char.id)}
                    aria-label={`Delete ${char.name || 'character'}`}
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>

                <div className="gf-char-frame">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={char.name || 'Character reference'}
                      className="gf-char-img"
                    />
                  ) : (
                    <div className="gf-char-empty">
                      <span className="material-symbols-outlined gf-char-empty-icon">person</span>
                      <span className="gf-char-empty-label">NO REFERENCE</span>
                    </div>
                  )}

                  {isLocked && (
                    <div className="gf-locked-badge">
                      <span className="material-symbols-outlined gf-locked-icon">lock</span>
                      <span>LOCKED</span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="gf-char-lock-btn"
                    disabled={isGenerating}
                    onClick={(e) => lockConsistency(e, char)}
                  >
                    <span className="material-symbols-outlined gf-char-lock-icon">
                      {isLocking ? 'refresh' : imgSrc ? 'sync' : 'lock'}
                    </span>
                    <span>
                      {isLocking
                        ? 'Locking...'
                        : imgSrc
                        ? 'Refresh Lock'
                        : 'Lock Consistency'}
                    </span>
                  </button>
                </div>

                <div className="gf-char-footer">
                  <div className="gf-char-attr">
                    <span className="gf-char-attr-key">FACE:</span>
                    <span className="gf-char-attr-val">
                      {char.appearance || 'Click card to define facial traits'}
                    </span>
                  </div>
                  <div className="gf-char-attr">
                    <span className="gf-char-attr-key">OUTFIT:</span>
                    <span className="gf-char-attr-val">
                      {char.clothing || 'Click card to define wardrobe'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingChar && (
        <div className="gf-modal-backdrop" onClick={() => setEditingChar(null)}>
          <div className="gf-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="gf-modal-title">Character Identity</h3>

            <div className="gf-modal-fields">
              <div className="gf-modal-field-group">
                <SectionLabel>Name</SectionLabel>
                <input
                  className="gf-modal-input"
                  value={editingChar.name}
                  onChange={(e) => setEditingChar({ ...editingChar, name: e.target.value })}
                  placeholder="e.g. Kenji"
                />
              </div>

              <div className="gf-modal-field-group">
                <SectionLabel>Visual Attributes (Face, Hair, Features)</SectionLabel>
                <textarea
                  className="gf-modal-field-textarea"
                  value={editingChar.appearance}
                  onChange={(e) =>
                    setEditingChar({ ...editingChar, appearance: e.target.value })
                  }
                  placeholder="Lock these features: e.g. spiky blue hair, scar on left eye, intense yellow eyes"
                />
              </div>

              <div className="gf-modal-field-group">
                <SectionLabel>Default Wardrobe</SectionLabel>
                <textarea
                  className="gf-modal-field-textarea"
                  value={editingChar.clothing}
                  onChange={(e) => setEditingChar({ ...editingChar, clothing: e.target.value })}
                  placeholder="e.g. high-collared techwear jacket, cargo pants"
                />
              </div>
            </div>

            <div className="gf-modal-actions">
              <PillButton variant="outline" onClick={() => setEditingChar(null)}>
                Discard
              </PillButton>
              <PillButton variant="solid" onClick={handleSaveProfile}>
                Update Profile
              </PillButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
