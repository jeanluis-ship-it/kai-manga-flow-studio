'use client';

import React, { useState } from 'react';
import { Lock, Plus, RefreshCw, Trash2, User, Users, X } from 'lucide-react';
import { Flow } from '../flow-sdk';
import { Project, Character, toDataImageSrc } from '../types';
import { SectionLabel, PillButton } from './Primitives';

export const CharacterLibrary: React.FC<{
  project: Project;
  updateProject: (updates: Partial<Project>) => void;
  characterLoading: Record<string, boolean>;
  setCharacterLoading: (charId: string, value: boolean) => void;
}> = ({ project, updateProject, characterLoading, setCharacterLoading }) => {
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [error, setError] = useState('');

  const createNewCharacter = () => {
    setEditingChar({
      id: crypto.randomUUID(),
      name: '',
      appearance: '',
      clothing: '',
      role: 'Protagonista',
    });
  };

  const handleSaveProfile = () => {
    if (!editingChar) return;
    const trimmed: Character = {
      ...editingChar,
      name: editingChar.name.trim() || 'Personaje sin nombre',
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
    if (characterLoading[char.id]) return;
    setError('');
    setCharacterLoading(char.id, true);

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
          : c,
      );
      updateProject({ characters: nextChars });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : 'No se pudo generar la hoja de referencia del personaje.',
      );
    } finally {
      setCharacterLoading(char.id, false);
    }
  };

  return (
    <div className="gf-roster-wrap animate-slide-in-right">
      <div className="gf-roster-topbar">
        <div>
          <h1 className="gf-page-title">Settei y Personajes</h1>
          <p className="gf-page-subtitle">
            Fija la identidad visual de tu elenco para mantener consistencia en portada y viñetas.
          </p>
        </div>
        <div className="gf-roster-cta">
          <PillButton
            variant="solid"
            icon={<Plus size={16} strokeWidth={1.75} className="gf-icon-shrink" />}
            onClick={createNewCharacter}
          >
            Nuevo Personaje
          </PillButton>
        </div>
      </div>

      {error && <div className="gf-error-banner">{error}</div>}

      {project.characters.length === 0 ? (
        <div className="gf-roster-empty">
          <Users size={34} strokeWidth={1.5} className="gf-char-empty-icon gf-icon-shrink" />
          <span>Aún no tienes personajes en tu elenco. Pulsa «+ Nuevo Personaje» para crear el primero.</span>
        </div>
      ) : (
        <div className="gf-roster-grid">
          {project.characters.map((char) => {
            const imgSrc = toDataImageSrc(char.referenceBase64);
            const isLocked = Boolean(char.referenceMediaId || char.referenceBase64);
            const isLocking = Boolean(characterLoading[char.id]);

            return (
              <div
                key={char.id}
                onClick={() => setEditingChar({ ...char })}
                className="gf-card gf-char-card"
              >
                <div className="gf-char-header">
                  <p className="gf-char-name">{char.name || 'Sin nombre'}</p>
                  <button
                    type="button"
                    className="gf-char-delete-btn"
                    onClick={(e) => handleDeleteCharacter(e, char.id)}
                    aria-label={`Eliminar a ${char.name || 'personaje'}`}
                  >
                    <Trash2 size={15} strokeWidth={1.75} className="gf-icon-shrink" />
                  </button>
                </div>

                <div className="gf-char-frame">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={char.name || 'Referencia de personaje'}
                      className="gf-char-img"
                    />
                  ) : (
                    <div className="gf-char-empty">
                      <User size={34} strokeWidth={1.5} className="gf-char-empty-icon gf-icon-shrink" />
                      <span className="gf-char-empty-label">SIN REFERENCIA</span>
                    </div>
                  )}

                  {isLocked && (
                    <div className="gf-locked-badge">
                      <Lock size={11} strokeWidth={2} className="gf-icon-shrink" />
                      <span>FIJADO</span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="gf-char-lock-btn"
                    disabled={isLocking}
                    onClick={(e) => lockConsistency(e, char)}
                  >
                    {isLocking ? (
                      <RefreshCw size={13} strokeWidth={1.75} className="gf-spin gf-icon-shrink" />
                    ) : imgSrc ? (
                      <RefreshCw size={13} strokeWidth={1.75} className="gf-icon-shrink" />
                    ) : (
                      <Lock size={13} strokeWidth={1.75} className="gf-icon-shrink" />
                    )}
                    <span>
                      {isLocking
                        ? 'Fijando...'
                        : imgSrc
                        ? 'Regenerar Hoja'
                        : 'Fijar Consistencia'}
                    </span>
                  </button>
                </div>

                <div className="gf-char-footer">
                  <div className="gf-char-attr">
                    <span className="gf-char-attr-key">ROSTRO:</span>
                    <span className="gf-char-attr-val">
                      {char.appearance || 'Haz clic para definir rasgos faciales'}
                    </span>
                  </div>
                  <div className="gf-char-attr">
                    <span className="gf-char-attr-key">VESTUARIO:</span>
                    <span className="gf-char-attr-val">
                      {char.clothing || 'Haz clic para definir vestuario'}
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
            <div className="gf-modal-head">
              <h3 className="gf-modal-title">Identidad del Personaje</h3>
              <button
                type="button"
                className="gf-modal-close-btn"
                onClick={() => setEditingChar(null)}
                aria-label="Cerrar ficha de personaje"
              >
                <X size={16} strokeWidth={1.75} className="gf-icon-shrink" />
              </button>
            </div>

            <div className="gf-modal-fields">
              <div className="gf-modal-field-group">
                <SectionLabel>Nombre</SectionLabel>
                <input
                  className="gf-modal-input"
                  value={editingChar.name}
                  onChange={(e) => setEditingChar({ ...editingChar, name: e.target.value })}
                  placeholder="Ej. Anacaona o Kenji"
                />
              </div>

              <div className="gf-modal-field-group">
                <SectionLabel>Atributos Visuales (Rostro, Cabello, Rasgos)</SectionLabel>
                <textarea
                  className="gf-modal-field-textarea"
                  value={editingChar.appearance}
                  onChange={(e) =>
                    setEditingChar({ ...editingChar, appearance: e.target.value })
                  }
                  placeholder="Fija estos rasgos: cabello negro largo con trenzas, ojos ámbar, expresión decidida..."
                />
              </div>

              <div className="gf-modal-field-group">
                <SectionLabel>Vestuario Principal</SectionLabel>
                <textarea
                  className="gf-modal-field-textarea"
                  value={editingChar.clothing}
                  onChange={(e) => setEditingChar({ ...editingChar, clothing: e.target.value })}
                  placeholder="Ej. túnica marfil con cinturón rojo terracota y collar verde jade..."
                />
              </div>
            </div>

            <div className="gf-modal-actions">
              <PillButton variant="outline" onClick={() => setEditingChar(null)}>
                Descartar
              </PillButton>
              <PillButton variant="solid" onClick={handleSaveProfile}>
                Guardar Ficha
              </PillButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
