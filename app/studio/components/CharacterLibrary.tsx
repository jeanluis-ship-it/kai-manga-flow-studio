'use client';

import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Box,
  Hash,
  Lock,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Unlock,
  User,
  Users,
  X,
} from 'lucide-react';
import { Flow } from '../flow-sdk';
import {
  type Character,
  type Project,
  type SetteiEntityType,
  normalizeTagHandle,
  toDataImageSrc,
} from '../types';
import { PillButton, SectionLabel } from './Primitives';

type FilterTab = 'all' | 'character' | 'prop' | 'world';

const ENTITY_TYPE_LABELS: Record<SetteiEntityType, string> = {
  character: 'Personaje',
  prop: 'Objeto (Prop)',
  location: 'Escenario',
  lore_rule: 'Regla de Lore',
};

function generateSeedCode(): string {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `SEED-${random}`;
}

function makeUniqueHandle(
  rawHandle: string,
  fallbackName: string,
  characters: Character[],
  selfId: string,
): string {
  const base = normalizeTagHandle(rawHandle, fallbackName);
  const used = new Set(
    characters
      .filter((c) => c.id !== selfId)
      .map((c) => normalizeTagHandle(c.tagHandle || '', c.name).toLowerCase()),
  );
  if (!used.has(base.toLowerCase())) return base;
  let suffix = 2;
  while (used.has(`${base}${suffix}`.toLowerCase())) {
    suffix += 1;
  }
  return `${base}${suffix}`;
}

export const CharacterLibrary: React.FC<{
  project: Project;
  updateProject: (updates: Partial<Project>) => void;
  characterLoading: Record<string, boolean>;
  setCharacterLoading: (charId: string, value: boolean) => void;
}> = ({ project, updateProject, characterLoading, setCharacterLoading }) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [anchorInput, setAnchorInput] = useState('');
  const [error, setError] = useState('');

  const filteredCharacters = useMemo(() => {
    return project.characters.filter((c) => {
      const type = c.entityType || 'character';
      if (activeTab === 'all') return true;
      if (activeTab === 'character') return type === 'character';
      if (activeTab === 'prop') return type === 'prop';
      return type === 'location' || type === 'lore_rule';
    });
  }, [project.characters, activeTab]);

  const counts = useMemo(() => {
    let character = 0;
    let prop = 0;
    let world = 0;
    for (const c of project.characters) {
      const t = c.entityType || 'character';
      if (t === 'character') character += 1;
      else if (t === 'prop') prop += 1;
      else world += 1;
    }
    return { all: project.characters.length, character, prop, world };
  }, [project.characters]);

  const createNewEntity = () => {
    const defaultType: SetteiEntityType =
      activeTab === 'prop' ? 'prop' : activeTab === 'world' ? 'location' : 'character';
    setAnchorInput('');
    setEditingChar({
      id: crypto.randomUUID(),
      entityType: defaultType,
      tagHandle: '',
      name: '',
      appearance: '',
      clothing: '',
      role: defaultType === 'character' ? 'Protagonista' : ENTITY_TYPE_LABELS[defaultType],
      visualAnchors: [],
      seedLocked: true,
      characterSeed: generateSeedCode(),
    });
  };

  const openEditor = (char: Character) => {
    setAnchorInput('');
    setEditingChar({
      ...char,
      entityType: char.entityType || 'character',
      tagHandle: normalizeTagHandle(char.tagHandle || '', char.name),
      visualAnchors: Array.isArray(char.visualAnchors) ? [...char.visualAnchors] : [],
      seedLocked: Boolean(char.seedLocked),
      characterSeed: char.characterSeed || generateSeedCode(),
    });
  };

  const handleAddAnchor = () => {
    if (!editingChar) return;
    const clean = anchorInput.trim();
    if (!clean) return;
    const existing = editingChar.visualAnchors ?? [];
    if (!existing.some((a) => a.toLowerCase() === clean.toLowerCase())) {
      setEditingChar({
        ...editingChar,
        visualAnchors: [...existing, clean],
      });
    }
    setAnchorInput('');
  };

  const handleRemoveAnchor = (anchor: string) => {
    if (!editingChar) return;
    setEditingChar({
      ...editingChar,
      visualAnchors: (editingChar.visualAnchors ?? []).filter((a) => a !== anchor),
    });
  };

  const handleSaveProfile = () => {
    if (!editingChar) return;
    const cleanName = editingChar.name.trim() || 'Entidad sin nombre';
    const pendingAnchor = anchorInput.trim();
    const anchors = [...(editingChar.visualAnchors ?? [])];
    if (pendingAnchor && !anchors.some((a) => a.toLowerCase() === pendingAnchor.toLowerCase())) {
      anchors.push(pendingAnchor);
    }

    const uniqueHandle = makeUniqueHandle(
      editingChar.tagHandle || '',
      cleanName,
      project.characters,
      editingChar.id,
    );

    const trimmed: Character = {
      ...editingChar,
      entityType: editingChar.entityType || 'character',
      tagHandle: uniqueHandle,
      name: cleanName,
      appearance: editingChar.appearance.trim(),
      clothing: editingChar.clothing.trim(),
      visualAnchors: anchors,
      seedLocked: Boolean(editingChar.seedLocked),
      characterSeed: editingChar.seedLocked
        ? editingChar.characterSeed || generateSeedCode()
        : editingChar.characterSeed,
    };

    const exists = project.characters.some((c) => c.id === trimmed.id);
    const nextChars = exists
      ? project.characters.map((c) => (c.id === trimmed.id ? trimmed : c))
      : [...project.characters, trimmed];
    updateProject({ characters: nextChars });
    setEditingChar(null);
    setAnchorInput('');
  };

  const handleDeleteCharacter = (e: React.MouseEvent, char: Character) => {
    e.stopPropagation();
    const handle = normalizeTagHandle(char.tagHandle || '', char.name);
    const nextChars = project.characters.filter((c) => c.id !== char.id);
    const nextPages = project.pages.map((p) => ({
      ...p,
      castIds: p.castIds.filter((cid) => cid !== char.id),
      komas: (p.komas ?? []).map((k) => ({
        ...k,
        taggedHandles: k.taggedHandles.filter((h) => h.toLowerCase() !== handle.toLowerCase()),
      })),
    }));
    updateProject({ characters: nextChars, pages: nextPages });
  };

  const toggleSeedLockOnCard = (e: React.MouseEvent, char: Character) => {
    e.stopPropagation();
    const nextLocked = !char.seedLocked;
    const nextChars = project.characters.map((c) =>
      c.id === char.id
        ? {
            ...c,
            seedLocked: nextLocked,
            characterSeed: c.characterSeed || generateSeedCode(),
          }
        : c,
    );
    updateProject({ characters: nextChars });
  };

  const lockConsistency = async (e: React.MouseEvent, char: Character) => {
    e.stopPropagation();
    if (characterLoading[char.id]) return;
    setError('');
    setCharacterLoading(char.id, true);

    try {
      const entityType = char.entityType || 'character';
      const anchors = (char.visualAnchors ?? []).filter(Boolean);
      const handle = normalizeTagHandle(char.tagHandle || '', char.name);
      const details = [
        char.appearance ? `Visual traits: ${char.appearance}` : '',
        char.clothing ? `Wardrobe/Material: ${char.clothing}` : '',
        anchors.length > 0 ? `Mandatory visual anchors: ${anchors.join(', ')}` : '',
        char.seedLocked && char.characterSeed ? `Consistency seed token: ${char.characterSeed}` : '',
        char.role ? `Role: ${char.role}` : '',
      ]
        .filter(Boolean)
        .join('. ');

      const sheetPrefix =
        entityType === 'character'
          ? 'Character reference sheet, manga turnaround, front and side view'
          : entityType === 'prop'
          ? 'Manga prop design sheet, orthographic multi-angle views'
          : 'Manga environment & architectural reference sheet, crisp lineart';

      const prompt = `${sheetPrefix}, high contrast black and white ink. Tag: ${handle}. Name: ${char.name || 'Settei'}. ${details}`;

      const res = await Flow.generate.image({
        prompt,
        mode: 'sheet',
        aspectRatio: '1:1',
        name: `${char.name || 'Settei'} (${handle})`,
        details,
      });

      const nextChars = project.characters.map((c) =>
        c.id === char.id
          ? {
              ...c,
              seedLocked: true,
              characterSeed: c.characterSeed || generateSeedCode(),
              referenceBase64: res.dataUrl,
              referenceMediaId: res.mediaId,
            }
          : c,
      );
      updateProject({ characters: nextChars });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo generar la hoja de referencia del Settei.',
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
            Define handles <code>@Settei</code>, anclas visuales inmutables y semillas fijadas para
            mantener consistencia entre viñetas.
          </p>
        </div>
        <div className="gf-roster-cta">
          <PillButton
            variant="solid"
            icon={<Plus size={16} strokeWidth={1.75} className="gf-icon-shrink" />}
            onClick={createNewEntity}
          >
            Nueva Ficha Settei
          </PillButton>
        </div>
      </div>

      <div className="gf-settei-tabs" role="tablist" aria-label="Filtrar catálogo Settei">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          className={`gf-settei-tab ${activeTab === 'all' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <span>Todo el Canon</span>
          <span className="gf-settei-tab-count">{counts.all}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'character'}
          className={`gf-settei-tab ${activeTab === 'character' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('character')}
        >
          <Users size={13} strokeWidth={1.75} className="gf-icon-shrink" />
          <span>Personajes</span>
          <span className="gf-settei-tab-count">{counts.character}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'prop'}
          className={`gf-settei-tab ${activeTab === 'prop' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('prop')}
        >
          <Box size={13} strokeWidth={1.75} className="gf-icon-shrink" />
          <span>Objetos (Props)</span>
          <span className="gf-settei-tab-count">{counts.prop}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'world'}
          className={`gf-settei-tab ${activeTab === 'world' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('world')}
        >
          <MapPin size={13} strokeWidth={1.75} className="gf-icon-shrink" />
          <span>Escenarios y Lore</span>
          <span className="gf-settei-tab-count">{counts.world}</span>
        </button>
      </div>

      {error && <div className="gf-error-banner">{error}</div>}

      {filteredCharacters.length === 0 ? (
        <div className="gf-roster-empty">
          <Users size={34} strokeWidth={1.5} className="gf-char-empty-icon gf-icon-shrink" />
          <span>
            {project.characters.length === 0
              ? 'Aún no tienes fichas Settei en tu Biblia. Pulsa «+ Nueva Ficha Settei» para crear la primera.'
              : 'No hay fichas en esta categoría. Cambia de pestaña o crea una nueva ficha.'}
          </span>
        </div>
      ) : (
        <div className="gf-roster-grid">
          {filteredCharacters.map((char) => {
            const imgSrc = toDataImageSrc(char.referenceBase64);
            const isLocked = Boolean(char.referenceMediaId || char.referenceBase64);
            const isLocking = Boolean(characterLoading[char.id]);
            const entityType = char.entityType || 'character';
            const handle = normalizeTagHandle(char.tagHandle || '', char.name);
            const anchors = char.visualAnchors ?? [];

            return (
              <div
                key={char.id}
                onClick={() => openEditor(char)}
                className="gf-card gf-char-card"
              >
                <div className="gf-char-header">
                  <div className="gf-char-title-group">
                    <p className="gf-char-name">{char.name || 'Sin nombre'}</p>
                    <div className="gf-char-meta-row">
                      <span className="gf-handle-badge">{handle}</span>
                      <span className="gf-entity-pill">{ENTITY_TYPE_LABELS[entityType]}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="gf-char-delete-btn"
                    onClick={(e) => handleDeleteCharacter(e, char)}
                    aria-label={`Eliminar a ${char.name || 'entidad'}`}
                  >
                    <Trash2 size={15} strokeWidth={1.75} className="gf-icon-shrink" />
                  </button>
                </div>

                <div className="gf-char-frame">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={char.name || 'Referencia Settei'}
                      className="gf-char-img"
                    />
                  ) : (
                    <div className="gf-char-empty">
                      {entityType === 'prop' ? (
                        <Box size={32} strokeWidth={1.5} className="gf-char-empty-icon gf-icon-shrink" />
                      ) : entityType === 'location' ? (
                        <MapPin size={32} strokeWidth={1.5} className="gf-char-empty-icon gf-icon-shrink" />
                      ) : entityType === 'lore_rule' ? (
                        <BookOpen size={32} strokeWidth={1.5} className="gf-char-empty-icon gf-icon-shrink" />
                      ) : (
                        <User size={32} strokeWidth={1.5} className="gf-char-empty-icon gf-icon-shrink" />
                      )}
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
                    className={`gf-seed-pill ${char.seedLocked ? 'is-locked' : ''}`}
                    onClick={(e) => toggleSeedLockOnCard(e, char)}
                    title={
                      char.seedLocked
                        ? `Seed Bloqueado (${char.characterSeed || 'activo'})`
                        : 'Activar Seed Bloqueado'
                    }
                  >
                    {char.seedLocked ? (
                      <ShieldCheck size={11} strokeWidth={2} className="gf-icon-shrink" />
                    ) : (
                      <Unlock size={11} strokeWidth={2} className="gf-icon-shrink" />
                    )}
                    <span>{char.seedLocked ? 'Seed Bloqueado' : 'Seed Libre'}</span>
                  </button>

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
                  {anchors.length > 0 && (
                    <div className="gf-anchor-list">
                      {anchors.slice(0, 4).map((anchor) => (
                        <span key={anchor} className="gf-anchor-chip">
                          {anchor}
                        </span>
                      ))}
                      {anchors.length > 4 && (
                        <span className="gf-anchor-chip is-more">+{anchors.length - 4}</span>
                      )}
                    </div>
                  )}

                  <div className="gf-char-attr">
                    <span className="gf-char-attr-key">RASGOS:</span>
                    <span className="gf-char-attr-val">
                      {char.appearance || 'Haz clic para definir atributos visuales'}
                    </span>
                  </div>
                  {entityType === 'character' && (
                    <div className="gf-char-attr">
                      <span className="gf-char-attr-key">VESTUARIO:</span>
                      <span className="gf-char-attr-val">
                        {char.clothing || 'Haz clic para definir vestuario'}
                      </span>
                    </div>
                  )}
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
              <h3 className="gf-modal-title">Ficha Settei (Biblia Visual)</h3>
              <button
                type="button"
                className="gf-modal-close-btn"
                onClick={() => setEditingChar(null)}
                aria-label="Cerrar ficha Settei"
              >
                <X size={16} strokeWidth={1.75} className="gf-icon-shrink" />
              </button>
            </div>

            <div className="gf-modal-fields">
              <div className="gf-grid-2">
                <div className="gf-modal-field-group">
                  <SectionLabel>Nombre</SectionLabel>
                  <input
                    className="gf-modal-input"
                    value={editingChar.name}
                    onChange={(e) => {
                      const nextName = e.target.value;
                      setEditingChar((prev) =>
                        prev
                          ? {
                              ...prev,
                              name: nextName,
                              tagHandle:
                                prev.tagHandle && prev.tagHandle !== normalizeTagHandle('', prev.name)
                                  ? prev.tagHandle
                                  : nextName
                                  ? normalizeTagHandle('', nextName)
                                  : '',
                            }
                          : null,
                      );
                    }}
                    placeholder="Ej. Anacaona o Espada de Jade"
                  />
                </div>

                <div className="gf-modal-field-group">
                  <SectionLabel>Tag Único (@Settei)</SectionLabel>
                  <input
                    className="gf-modal-input gf-mono-input"
                    value={editingChar.tagHandle ?? ''}
                    onChange={(e) =>
                      setEditingChar({ ...editingChar, tagHandle: e.target.value })
                    }
                    placeholder="@Anacaona"
                  />
                </div>
              </div>

              <div className="gf-grid-2">
                <div className="gf-modal-field-group">
                  <SectionLabel>Categoría</SectionLabel>
                  <select
                    className="gf-modal-input"
                    value={editingChar.entityType || 'character'}
                    onChange={(e) =>
                      setEditingChar({
                        ...editingChar,
                        entityType: e.target.value as SetteiEntityType,
                      })
                    }
                  >
                    <option value="character">Personaje</option>
                    <option value="prop">Objeto (Prop)</option>
                    <option value="location">Escenario</option>
                    <option value="lore_rule">Regla de Lore</option>
                  </select>
                </div>

                <div className="gf-modal-field-group">
                  <SectionLabel>Consistencia de Semilla</SectionLabel>
                  <button
                    type="button"
                    className={`gf-seed-toggle-btn ${editingChar.seedLocked ? 'is-locked' : ''}`}
                    onClick={() =>
                      setEditingChar({
                        ...editingChar,
                        seedLocked: !editingChar.seedLocked,
                        characterSeed: editingChar.characterSeed || generateSeedCode(),
                      })
                    }
                  >
                    {editingChar.seedLocked ? (
                      <Lock size={14} strokeWidth={2} className="gf-icon-shrink" />
                    ) : (
                      <Unlock size={14} strokeWidth={2} className="gf-icon-shrink" />
                    )}
                    <span>
                      {editingChar.seedLocked
                        ? `Seed Bloqueado (${editingChar.characterSeed || 'AUTO'})`
                        : 'Seed Bloqueado: OFF'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="gf-modal-field-group">
                <SectionLabel>Anclas Visuales (Inyectadas en cada viñeta)</SectionLabel>
                <div className="gf-anchor-input-row">
                  <input
                    className="gf-modal-input"
                    value={anchorInput}
                    onChange={(e) => setAnchorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAnchor();
                      }
                    }}
                    placeholder="Ej. cicatriz ceja izquierda, collar de jade, túnica marfil..."
                  />
                  <button
                    type="button"
                    className="gf-anchor-add-btn"
                    onClick={handleAddAnchor}
                  >
                    <Hash size={13} strokeWidth={2} className="gf-icon-shrink" />
                    <span>Añadir</span>
                  </button>
                </div>
                {(editingChar.visualAnchors ?? []).length > 0 && (
                  <div className="gf-anchor-list gf-anchor-list-editable">
                    {(editingChar.visualAnchors ?? []).map((anchor) => (
                      <span key={anchor} className="gf-anchor-chip is-editable">
                        <span>{anchor}</span>
                        <button
                          type="button"
                          className="gf-anchor-remove-btn"
                          onClick={() => handleRemoveAnchor(anchor)}
                          aria-label={`Quitar ancla ${anchor}`}
                        >
                          <X size={11} strokeWidth={2.2} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="gf-modal-field-group">
                <SectionLabel>Atributos Visuales (Rostro, Silueta, Rasgos)</SectionLabel>
                <textarea
                  className="gf-modal-field-textarea"
                  value={editingChar.appearance}
                  onChange={(e) =>
                    setEditingChar({ ...editingChar, appearance: e.target.value })
                  }
                  placeholder="Describe los rasgos clave que nunca deben cambiar entre viñetas..."
                />
              </div>

              <div className="gf-modal-field-group">
                <SectionLabel>Vestuario / Materiales</SectionLabel>
                <textarea
                  className="gf-modal-field-textarea"
                  value={editingChar.clothing}
                  onChange={(e) => setEditingChar({ ...editingChar, clothing: e.target.value })}
                  placeholder="Ej. túnica marfil con cinturón rojo terracota y brazaletes tallados..."
                />
              </div>
            </div>

            <div className="gf-modal-actions">
              <PillButton variant="outline" onClick={() => setEditingChar(null)}>
                Descartar
              </PillButton>
              <PillButton variant="solid" onClick={handleSaveProfile}>
                Guardar Ficha Settei
              </PillButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
