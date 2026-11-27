'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Box,
  Eye,
  EyeOff,
  Hash,
  ImagePlus,
  Lock,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Unlock,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  SETTEI_AUTOFILL_EVENT,
  buildSetteiKaiPrompt,
  dispatchKaiAsk,
  dispatchSetteiDraft,
  mergeSetteiAutofill,
  type SetteiAutofillDetail,
  type SetteiReferenceSlot,
  type SetteiReferenceViews,
} from '@/lib/kai/setteiBridge';
import { Flow } from '../flow-sdk';
import {
  type Character,
  type Project,
  type SetteiEntityType,
  normalizeTagHandle,
  toDataImageSrc,
} from '../types';
import { PillButton, SectionLabel } from './Primitives';
import './CharacterLibrary.css';

type FilterTab = 'all' | 'character' | 'prop' | 'world';

type SetteiCharacter = Character & {
  activeInCanon?: boolean;
  referenceViews?: SetteiReferenceViews;
};

const ENTITY_TYPE_LABELS: Record<SetteiEntityType, string> = {
  character: 'Personaje',
  prop: 'Objeto (Prop)',
  location: 'Escenario',
  lore_rule: 'Regla de Lore',
};

const VIEW_SLOT_LABELS: Record<SetteiReferenceSlot, string> = {
  turnaround: 'Turnaround',
  front: 'Frontal',
  detail: 'Detalle',
};

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

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

function collectCharacterReferences(char: SetteiCharacter): string[] {
  const candidates = [
    char.referenceBase64,
    char.referenceViews?.turnaround,
    char.referenceViews?.front,
    char.referenceViews?.detail,
  ];
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const item of candidates) {
    const normalized = toDataImageSrc(item);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      unique.push(normalized);
    }
  }
  return unique;
}

function countReferenceViews(char: SetteiCharacter): number {
  const views = char.referenceViews;
  const set = new Set<string>();
  if (views?.turnaround || char.referenceBase64) set.add('turnaround');
  if (views?.front) set.add('front');
  if (views?.detail) set.add('detail');
  return set.size;
}

function describeViewsStatus(char: SetteiCharacter): string {
  const labels: string[] = [];
  if (char.referenceViews?.turnaround || char.referenceBase64) labels.push('Turnaround');
  if (char.referenceViews?.front) labels.push('Frontal');
  if (char.referenceViews?.detail) labels.push('Detalle');
  if (labels.length === 0) return 'Sin vistas aún';
  return labels.join(', ');
}

export const CharacterLibrary: React.FC<{
  project: Project;
  updateProject: (updates: Partial<Project>) => void;
  characterLoading: Record<string, boolean>;
  setCharacterLoading: (charId: string, value: boolean) => void;
}> = ({ project, updateProject, characterLoading, setCharacterLoading }) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingChar, setEditingChar] = useState<SetteiCharacter | null>(null);
  const [activeViewSlot, setActiveViewSlot] = useState<SetteiReferenceSlot>('turnaround');
  const [anchorInput, setAnchorInput] = useState('');
  const [error, setError] = useState('');
  const refUploadInputRef = useRef<HTMLInputElement | null>(null);

  const characters = project.characters as SetteiCharacter[];

  const filteredCharacters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return characters.filter((c) => {
      const type = c.entityType || 'character';
      const matchesTab =
        activeTab === 'all'
          ? true
          : activeTab === 'character'
          ? type === 'character'
          : activeTab === 'prop'
          ? type === 'prop'
          : type === 'location' || type === 'lore_rule';
      if (!matchesTab) return false;
      if (!q) return true;
      const haystack = [
        c.name,
        c.tagHandle,
        c.role,
        c.appearance,
        c.clothing,
        c.characterSeed,
        ...(c.visualAnchors ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [characters, activeTab, searchQuery]);

  const counts = useMemo(() => {
    let character = 0;
    let prop = 0;
    let world = 0;
    let activeCanon = 0;
    for (const c of characters) {
      const t = c.entityType || 'character';
      if (t === 'character') character += 1;
      else if (t === 'prop') prop += 1;
      else world += 1;
      if (c.activeInCanon !== false) activeCanon += 1;
    }
    return { all: characters.length, character, prop, world, activeCanon };
  }, [characters]);

  // Broadcast live Settei draft state to Espacio KAI without blocking the workspace.
  useEffect(() => {
    if (!editingChar) {
      dispatchSetteiDraft(false, null);
      return;
    }
    dispatchSetteiDraft(true, {
      id: editingChar.id,
      name: editingChar.name,
      tagHandle: editingChar.tagHandle || '',
      entityType: editingChar.entityType || 'character',
      appearance: editingChar.appearance,
      clothing: editingChar.clothing,
      visualAnchors: editingChar.visualAnchors ?? [],
    });
  }, [editingChar]);

  useEffect(() => {
    return () => {
      dispatchSetteiDraft(false, null);
    };
  }, []);

  // Listen for live KAI autofill events and merge into editingChar without closing the form.
  useEffect(() => {
    const onAutofill = (evt: Event) => {
      const customEvt = evt as CustomEvent<SetteiAutofillDetail>;
      const detail = customEvt.detail;
      if (!detail || typeof detail !== 'object') return;

      setEditingChar((prev) => {
        if (prev) {
          return mergeSetteiAutofill(prev, detail);
        }
        const fallbackType: SetteiEntityType =
          detail.entityType ||
          (activeTab === 'prop' ? 'prop' : activeTab === 'world' ? 'location' : 'character');
        return mergeSetteiAutofill(
          {
            id: crypto.randomUUID(),
            entityType: fallbackType,
            tagHandle: '',
            name: '',
            appearance: '',
            clothing: '',
            role: ENTITY_TYPE_LABELS[fallbackType],
            visualAnchors: [],
            seedLocked: true,
            characterSeed: generateSeedCode(),
            activeInCanon: true,
            referenceViews: {},
          },
          detail,
        );
      });
    };

    window.addEventListener(SETTEI_AUTOFILL_EVENT, onAutofill);
    return () => window.removeEventListener(SETTEI_AUTOFILL_EVENT, onAutofill);
  }, [activeTab]);

  const createNewEntity = (explicitType?: SetteiEntityType) => {
    const defaultType: SetteiEntityType =
      explicitType ??
      (activeTab === 'prop' ? 'prop' : activeTab === 'world' ? 'location' : 'character');
    setError('');
    setAnchorInput('');
    setActiveViewSlot('turnaround');
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
      activeInCanon: true,
      referenceViews: {},
    });
  };

  const openEditor = (char: SetteiCharacter) => {
    setError('');
    setAnchorInput('');
    setActiveViewSlot('turnaround');
    setEditingChar({
      ...char,
      entityType: char.entityType || 'character',
      tagHandle: normalizeTagHandle(char.tagHandle || '', char.name),
      visualAnchors: Array.isArray(char.visualAnchors) ? [...char.visualAnchors] : [],
      seedLocked: Boolean(char.seedLocked),
      characterSeed: char.characterSeed || generateSeedCode(),
      activeInCanon: char.activeInCanon !== false,
      referenceViews: {
        turnaround: char.referenceViews?.turnaround || char.referenceBase64 || undefined,
        front: char.referenceViews?.front,
        detail: char.referenceViews?.detail,
      },
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

  const buildSanitizedCharacter = (draft: SetteiCharacter): SetteiCharacter => {
    const cleanName = draft.name.trim() || 'Entidad sin nombre';
    const pendingAnchor = anchorInput.trim();
    const anchors = [...(draft.visualAnchors ?? [])];
    if (pendingAnchor && !anchors.some((a) => a.toLowerCase() === pendingAnchor.toLowerCase())) {
      anchors.push(pendingAnchor);
    }

    const uniqueHandle = makeUniqueHandle(
      draft.tagHandle || '',
      cleanName,
      project.characters,
      draft.id,
    );

    const views: SetteiReferenceViews = {
      ...(draft.referenceViews ?? {}),
    };
    const primaryRef =
      draft.referenceBase64 || views.turnaround || views.front || views.detail || undefined;

    return {
      ...draft,
      entityType: draft.entityType || 'character',
      tagHandle: uniqueHandle,
      name: cleanName,
      appearance: draft.appearance.trim(),
      clothing: draft.clothing.trim(),
      role: draft.role?.trim() || ENTITY_TYPE_LABELS[draft.entityType || 'character'],
      visualAnchors: anchors,
      seedLocked: Boolean(draft.seedLocked),
      characterSeed: draft.characterSeed || generateSeedCode(),
      activeInCanon: draft.activeInCanon !== false,
      referenceBase64: primaryRef,
      referenceViews: views,
    };
  };

  const handleSaveProfile = () => {
    if (!editingChar) return;
    const trimmed = buildSanitizedCharacter(editingChar);
    const exists = characters.some((c) => c.id === trimmed.id);
    const nextChars = exists
      ? characters.map((c) => (c.id === trimmed.id ? trimmed : c))
      : [...characters, trimmed];
    updateProject({ characters: nextChars });
    setEditingChar(null);
    setAnchorInput('');
  };

  const handleDeleteCharacter = (e: React.MouseEvent, char: SetteiCharacter) => {
    e.stopPropagation();
    const handle = normalizeTagHandle(char.tagHandle || '', char.name);
    const nextChars = characters.filter((c) => c.id !== char.id);
    const nextPages = project.pages.map((p) => ({
      ...p,
      castIds: p.castIds.filter((cid) => cid !== char.id),
      komas: (p.komas ?? []).map((k) => ({
        ...k,
        taggedHandles: k.taggedHandles.filter((h) => h.toLowerCase() !== handle.toLowerCase()),
      })),
    }));
    updateProject({ characters: nextChars, pages: nextPages });
    if (editingChar?.id === char.id) {
      setEditingChar(null);
    }
  };

  const toggleSeedLockOnCard = (e: React.MouseEvent, char: SetteiCharacter) => {
    e.stopPropagation();
    const nextLocked = !char.seedLocked;
    const nextChars = characters.map((c) =>
      c.id === char.id
        ? {
            ...c,
            seedLocked: nextLocked,
            characterSeed: c.characterSeed || generateSeedCode(),
          }
        : c,
    );
    updateProject({ characters: nextChars });
    if (editingChar?.id === char.id) {
      setEditingChar((prev) =>
        prev
          ? {
              ...prev,
              seedLocked: nextLocked,
              characterSeed: prev.characterSeed || generateSeedCode(),
            }
          : null,
      );
    }
  };

  const toggleActiveInCanonOnCard = (e: React.MouseEvent, char: SetteiCharacter) => {
    e.stopPropagation();
    const nextActive = char.activeInCanon === false;
    const nextChars = characters.map((c) =>
      c.id === char.id ? { ...c, activeInCanon: nextActive } : c,
    );
    updateProject({ characters: nextChars });
    if (editingChar?.id === char.id) {
      setEditingChar((prev) => (prev ? { ...prev, activeInCanon: nextActive } : null));
    }
  };

  const handleUploadReferenceImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editingChar) return;
    if (!/^image\/(png|jpeg|jpg|webp)$/i.test(file.type)) {
      setError('Formato no soportado. Sube una imagen PNG, JPG o WebP.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('La imagen de referencia supera el máximo permitido de 6 MB.');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      setEditingChar((prev) => {
        if (!prev) return null;
        const nextViews: SetteiReferenceViews = {
          ...(prev.referenceViews ?? {}),
          [activeViewSlot]: dataUrl,
        };
        const shouldReplacePrimary =
          activeViewSlot === 'turnaround' || !prev.referenceBase64;
        return {
          ...prev,
          referenceBase64: shouldReplacePrimary ? dataUrl : prev.referenceBase64,
          referenceViews: nextViews,
        };
      });
    };
    reader.readAsDataURL(file);
  };

  const lockConsistency = async (
    charInput: SetteiCharacter,
    slot: SetteiReferenceSlot = 'turnaround',
    fromEditor = false,
  ) => {
    if (characterLoading[charInput.id]) return;
    setError('');
    setCharacterLoading(charInput.id, true);

    try {
      const entityType = charInput.entityType || 'character';
      const anchors = (charInput.visualAnchors ?? []).filter(Boolean);
      const handle = normalizeTagHandle(charInput.tagHandle || '', charInput.name);
      const seedCode = charInput.characterSeed || generateSeedCode();
      const details = [
        charInput.appearance ? `Visual traits: ${charInput.appearance}` : '',
        charInput.clothing ? `Wardrobe/Material: ${charInput.clothing}` : '',
        anchors.length > 0 ? `Mandatory visual anchors: ${anchors.join(', ')}` : '',
        `Consistency seed token: ${seedCode}`,
        charInput.role ? `Role: ${charInput.role}` : '',
      ]
        .filter(Boolean)
        .join('. ');

      const slotFocus =
        slot === 'front'
          ? 'full-body front orthographic portrait view'
          : slot === 'detail'
          ? 'close-up detail sheet focusing on face, emblem, accessories, and textures'
          : entityType === 'character'
          ? 'character reference sheet, manga turnaround, front, side and back view'
          : entityType === 'prop'
          ? 'manga prop design sheet, orthographic multi-angle views'
          : entityType === 'lore_rule'
          ? 'visual lore codex diagram and symbolic manga reference sheet'
          : 'manga environment and architectural reference sheet, crisp lineart';

      const prompt = `${slotFocus}, high contrast black and white ink. Tag: ${handle}. Name: ${charInput.name || 'Settei'}. ${seedCode}. ${details}`;
      const existingRefs = collectCharacterReferences(charInput);

      const res = await Flow.generate.image({
        prompt,
        mode: 'sheet',
        aspectRatio: '1:1',
        name: `${charInput.name || 'Settei'} (${handle})`,
        details,
        notes: `${prompt} Keep exact identity consistency with attached references.`,
        referenceImagesBase64: existingRefs.length > 0 ? existingRefs : undefined,
      });

      const updatedViews: SetteiReferenceViews = {
        ...(charInput.referenceViews ?? {}),
        [slot]: res.dataUrl,
      };
      const nextPrimary =
        slot === 'turnaround' || !charInput.referenceBase64
          ? res.dataUrl
          : charInput.referenceBase64;

      const updatedChar: SetteiCharacter = {
        ...buildSanitizedCharacter(charInput),
        seedLocked: true,
        characterSeed: seedCode,
        activeInCanon: charInput.activeInCanon !== false,
        referenceBase64: nextPrimary,
        referenceMediaId: res.mediaId,
        referenceViews: updatedViews,
      };

      const exists = characters.some((c) => c.id === updatedChar.id);
      const nextChars = exists
        ? characters.map((c) => (c.id === updatedChar.id ? updatedChar : c))
        : [...characters, updatedChar];
      updateProject({ characters: nextChars });

      if (fromEditor || editingChar?.id === updatedChar.id) {
        setEditingChar(updatedChar);
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo generar la hoja de referencia del Settei.',
      );
    } finally {
      setCharacterLoading(charInput.id, false);
    }
  };

  const activeEditorEntityType = editingChar?.entityType || 'character';
  const activeSlotSrc = editingChar
    ? toDataImageSrc(
        editingChar.referenceViews?.[activeViewSlot] ??
          (activeViewSlot === 'turnaround' ? editingChar.referenceBase64 : undefined),
      )
    : '';
  const editingAvatarSrc = editingChar
    ? toDataImageSrc(
        editingChar.referenceBase64 ||
          editingChar.referenceViews?.turnaround ||
          editingChar.referenceViews?.front ||
          editingChar.referenceViews?.detail,
      )
    : '';
  const isEditingBusy = editingChar ? Boolean(characterLoading[editingChar.id]) : false;

  return (
    <div className={`gf-roster-wrap animate-slide-in-right ${editingChar ? 'has-drawer' : ''}`}>
      {/* Minimal Stitch Header */}
      <div className="gf-roster-topbar">
        <div className="gf-roster-heading">
          <div className="gf-settei-kicker-row">
            <span className="gf-settei-kicker">MÓDULO 02 // BIBLIOTECA SETTEI</span>
            <span className="gf-settei-kicker-dot" aria-hidden="true" />
            <span
              className="gf-settei-kicker-meta"
              title="Entidades inyectadas activamente a KAI y Viñetas"
            >
              {counts.activeCanon} / {counts.all} ACTIVOS EN CANON
            </span>
          </div>
          <h1 className="gf-page-title">Elenco y Fichas Settei</h1>
          <p className="gf-page-subtitle">
            Organiza tus referencias visuales, vistas de rotación y anclas{' '}
            <code className="gf-settei-inline-code">@Settei</code> para sostener el estilo del tomo.
          </p>
        </div>

        <div className="gf-roster-header-actions">
          <PillButton
            variant="solid"
            className="gf-settei-primary-cta"
            icon={<UserPlus size={15} strokeWidth={1.9} className="gf-icon-shrink" />}
            onClick={() => createNewEntity()}
          >
            + Nuevo Personaje
          </PillButton>
        </div>
      </div>

      {/* Single-Row Stitch Filter Pill Bar + Compact Search */}
      <div className="gf-settei-control-strip">
        <div className="gf-settei-tabs" role="tablist" aria-label="Filtrar catálogo Settei">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'all'}
            className={`gf-settei-tab ${activeTab === 'all' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span>Todo el Canon</span>
            <span className="gf-settei-tab-count">({counts.all})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'character'}
            className={`gf-settei-tab ${activeTab === 'character' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('character')}
          >
            <Users size={13} strokeWidth={1.8} className="gf-icon-shrink" />
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
            <Box size={13} strokeWidth={1.8} className="gf-icon-shrink" />
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
            <MapPin size={13} strokeWidth={1.8} className="gf-icon-shrink" />
            <span>Escenarios y Lore</span>
            <span className="gf-settei-tab-count">{counts.world}</span>
          </button>
        </div>

        <div className="gf-settei-search-box">
          <Search size={14} strokeWidth={2} className="gf-settei-search-icon gf-icon-shrink" />
          <input
            type="text"
            className="gf-settei-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, @tag o ancla..."
            aria-label="Buscar ficha Settei"
          />
          {searchQuery && (
            <button
              type="button"
              className="gf-settei-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Limpiar búsqueda"
            >
              <X size={13} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {error && <div className="gf-error-banner">{error}</div>}

      <div className={`gf-roster-workspace ${editingChar ? 'has-drawer' : ''}`}>
        <div className="gf-roster-main">
          <div className="gf-roster-grid">
            {filteredCharacters.map((char) => {
              const imgSrc = toDataImageSrc(
                char.referenceBase64 ||
                  char.referenceViews?.turnaround ||
                  char.referenceViews?.front ||
                  char.referenceViews?.detail,
              );
              const isLocked = Boolean(
                char.seedLocked &&
                  (char.referenceMediaId ||
                    char.referenceBase64 ||
                    char.referenceViews?.turnaround ||
                    char.referenceViews?.front),
              );
              const isLocking = Boolean(characterLoading[char.id]);
              const entityType = char.entityType || 'character';
              const handle = normalizeTagHandle(char.tagHandle || '', char.name);
              const anchors = char.visualAnchors ?? [];
              const isCanonActive = char.activeInCanon !== false;
              const viewsCount = countReferenceViews(char);
              const viewsPercent = Math.round((viewsCount / 3) * 100);
              const isCurrentlyEditing = editingChar?.id === char.id;

              return (
                <article
                  key={char.id}
                  onClick={() => openEditor(char)}
                  className={`gf-card gf-char-card ${isCanonActive ? '' : 'is-paused'} ${
                    isCurrentlyEditing ? 'is-editing' : ''
                  }`}
                >
                  {/* Crisp 3:4 Portrait-First Frame */}
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
                          <Box
                            size={30}
                            strokeWidth={1.5}
                            className="gf-char-empty-icon gf-icon-shrink"
                          />
                        ) : entityType === 'location' ? (
                          <MapPin
                            size={30}
                            strokeWidth={1.5}
                            className="gf-char-empty-icon gf-icon-shrink"
                          />
                        ) : entityType === 'lore_rule' ? (
                          <BookOpen
                            size={30}
                            strokeWidth={1.5}
                            className="gf-char-empty-icon gf-icon-shrink"
                          />
                        ) : (
                          <User
                            size={30}
                            strokeWidth={1.5}
                            className="gf-char-empty-icon gf-icon-shrink"
                          />
                        )}
                        <span className="gf-char-empty-label">SIN RETRATO SETTEI</span>
                      </div>
                    )}

                    <div className="gf-char-frame-scrim" aria-hidden="true" />

                    {/* Top Row inside Portrait: Canon Active Toggle + Status Badge */}
                    <div className="gf-char-frame-top">
                      <div className="gf-char-frame-top-left">
                        <button
                          type="button"
                          className={`gf-canon-toggle-btn ${
                            isCanonActive ? 'is-active' : 'is-paused'
                          }`}
                          onClick={(e) => toggleActiveInCanonOnCard(e, char)}
                          title={
                            isCanonActive
                              ? 'Activo en Canon (clic para pausar su inyección en viñetas)'
                              : 'Pausado en Canon (clic para activar)'
                          }
                        >
                          {isCanonActive ? (
                            <Eye size={11} strokeWidth={2} className="gf-icon-shrink" />
                          ) : (
                            <EyeOff size={11} strokeWidth={2} className="gf-icon-shrink" />
                          )}
                          <span>{isCanonActive ? 'Activo' : 'Pausado'}</span>
                        </button>
                        <button
                          type="button"
                          className="gf-char-delete-btn"
                          onClick={(e) => handleDeleteCharacter(e, char)}
                          aria-label={`Eliminar a ${char.name || 'entidad'}`}
                          title="Eliminar ficha Settei"
                        >
                          <Trash2 size={13} strokeWidth={1.85} className="gf-icon-shrink" />
                        </button>
                      </div>

                      <button
                        type="button"
                        className={`gf-status-seal ${isLocked ? 'is-locked' : 'is-draft'}`}
                        onClick={(e) => toggleSeedLockOnCard(e, char)}
                        title={
                          char.seedLocked
                            ? `Canon bloqueado (${char.characterSeed || 'activo'})`
                            : 'Cambiar a Canon Bloqueado'
                        }
                      >
                        {isLocked ? (
                          <Lock size={11} strokeWidth={2.1} className="gf-icon-shrink" />
                        ) : (
                          <Unlock size={11} strokeWidth={2} className="gf-icon-shrink" />
                        )}
                        <span>{isLocked ? 'CANON BLOQUEADO' : 'BORRADOR'}</span>
                      </button>
                    </div>

                    {/* Bottom Row inside Portrait: Handle Tags + Generate/Lock CTA */}
                    <div className="gf-char-frame-bottom">
                      <div className="gf-char-overlay-tags">
                        <span className="gf-overlay-chip">{handle}</span>
                        <span className="gf-overlay-chip is-muted">
                          {ENTITY_TYPE_LABELS[entityType]}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="gf-char-lock-btn"
                        disabled={isLocking}
                        onClick={(e) => {
                          e.stopPropagation();
                          void lockConsistency(char, 'turnaround', false);
                        }}
                        title="Generar o actualizar hoja de referencia con FLUX"
                      >
                        {isLocking ? (
                          <RefreshCw size={12} strokeWidth={2} className="gf-spin gf-icon-shrink" />
                        ) : imgSrc ? (
                          <RefreshCw size={12} strokeWidth={2} className="gf-icon-shrink" />
                        ) : (
                          <Sparkles size={12} strokeWidth={2} className="gf-icon-shrink" />
                        )}
                        <span>
                          {isLocking
                            ? 'Generando...'
                            : imgSrc
                            ? 'Regenerar'
                            : 'Fijar Consistencia'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Clean Metadata Body */}
                  <div className="gf-char-footer">
                    <div className="gf-char-identity-row">
                      <h2 className="gf-char-name">{char.name || 'Sin nombre'}</h2>
                      {char.characterSeed && (
                        <span className="gf-char-seed-tag">{char.characterSeed}</span>
                      )}
                    </div>

                    <p className="gf-char-summary">
                      {char.role ? `${char.role} · ` : ''}
                      {char.appearance || 'Haz clic para definir rasgos visuales y vestuario.'}
                    </p>

                    {anchors.length > 0 && (
                      <div className="gf-anchor-list">
                        {anchors.slice(0, 3).map((anchor) => (
                          <span key={anchor} className="gf-anchor-chip">
                            {anchor}
                          </span>
                        ))}
                        {anchors.length > 3 && (
                          <span className="gf-anchor-chip is-more">+{anchors.length - 3}</span>
                        )}
                      </div>
                    )}

                    <div className="gf-char-progress-box">
                      <div className="gf-char-progress-meta">
                        <span>Vistas Settei</span>
                        <strong>{describeViewsStatus(char)}</strong>
                      </div>
                      <div className="gf-char-progress-track" aria-hidden="true">
                        <div
                          className={`gf-char-progress-fill ${viewsCount >= 2 ? 'is-ready' : ''}`}
                          style={{ width: `${Math.max(viewsCount > 0 ? viewsPercent : 6, 6)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {/* Dashed "+ Nueva Ficha Settei" Card Slot */}
            <button
              type="button"
              className="gf-char-add-slot"
              onClick={() => createNewEntity()}
            >
              <span className="gf-char-add-circle" aria-hidden="true">
                <Plus size={24} strokeWidth={2} />
              </span>
              <span className="gf-char-add-title">+ Nueva Ficha Settei</span>
              <span className="gf-char-add-sub">
                {searchQuery
                  ? 'Crea una nueva ficha o limpia el filtro de búsqueda.'
                  : 'Define rasgos, vistas turnaround y anclas visuales @Settei.'}
              </span>
              <span className="gf-char-add-kicker">
                INICIALIZAR FICHA #{String(characters.length + 1).padStart(2, '0')}
              </span>
            </button>
          </div>
        </div>

        {/* Non-Blocking Workspace-Scoped Settei Inspector Drawer (keeps Espacio KAI 100% interactive) */}
        {editingChar && (
          <aside
            className="gf-settei-workspace-drawer dark-scrollbar"
            aria-label="Editor de Ficha Settei"
          >
            <div className="gf-settei-drawer-head">
              <div className="gf-settei-drawer-identity">
                <div className="gf-settei-drawer-avatar">
                  {editingAvatarSrc ? (
                    <img src={editingAvatarSrc} alt={editingChar.name || 'Avatar Settei'} />
                  ) : (
                    <User size={20} strokeWidth={1.6} />
                  )}
                </div>
                <div className="gf-settei-drawer-title-wrap">
                  <span className="gf-settei-kicker">INSPECTOR SETTEI // CANON</span>
                  <h3 className="gf-modal-title">
                    {editingChar.name.trim() || 'Nueva Ficha Settei'}
                  </h3>
                  <p className="gf-settei-drawer-sub">
                    {normalizeTagHandle(editingChar.tagHandle || '', editingChar.name)} ·{' '}
                    {ENTITY_TYPE_LABELS[activeEditorEntityType]}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="gf-modal-close-btn"
                onClick={() => setEditingChar(null)}
                aria-label="Cerrar ficha Settei"
              >
                <X size={16} strokeWidth={1.75} className="gf-icon-shrink" />
              </button>
            </div>

            {/* Turnaround Angles & Reference Views Gallery */}
            <div className="gf-settei-refs-box">
              <div className="gf-settei-refs-head">
                <SectionLabel>Vistas de Referencia y Turnaround</SectionLabel>
                <span className="gf-settei-refs-count">
                  {countReferenceViews(editingChar)} / 3 VISTAS
                </span>
              </div>

              <div
                className="gf-settei-view-strip"
                role="tablist"
                aria-label="Ángulos y vistas Settei"
              >
                {(['turnaround', 'front', 'detail'] as const).map((slot) => {
                  const thumbSrc = toDataImageSrc(
                    editingChar.referenceViews?.[slot] ??
                      (slot === 'turnaround' ? editingChar.referenceBase64 : undefined),
                  );
                  return (
                    <button
                      key={slot}
                      type="button"
                      role="tab"
                      aria-selected={activeViewSlot === slot}
                      className={`gf-settei-view-tile ${activeViewSlot === slot ? 'is-active' : ''}`}
                      onClick={() => setActiveViewSlot(slot)}
                    >
                      <span className="gf-settei-view-thumb">
                        {thumbSrc ? (
                          <img src={thumbSrc} alt={VIEW_SLOT_LABELS[slot]} />
                        ) : (
                          <ImagePlus size={16} strokeWidth={1.6} />
                        )}
                      </span>
                      <span className="gf-settei-view-label">{VIEW_SLOT_LABELS[slot]}</span>
                    </button>
                  );
                })}
              </div>

              <div className="gf-settei-ref-preview">
                {activeSlotSrc ? (
                  <img
                    src={activeSlotSrc}
                    alt={`Vista ${VIEW_SLOT_LABELS[activeViewSlot]} de ${editingChar.name || 'Settei'}`}
                  />
                ) : (
                  <div className="gf-settei-ref-empty">
                    <ImagePlus size={22} strokeWidth={1.6} />
                    <span>
                      Sin imagen en vista <strong>{VIEW_SLOT_LABELS[activeViewSlot]}</strong>. Sube
                      una referencia o genérala con FLUX.
                    </span>
                  </div>
                )}
              </div>

              <input
                ref={refUploadInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={handleUploadReferenceImage}
              />

              <div className="gf-settei-ref-actions">
                <button
                  type="button"
                  className="gf-settei-mini-btn"
                  onClick={() => refUploadInputRef.current?.click()}
                >
                  <ImagePlus size={13} strokeWidth={2} className="gf-icon-shrink" />
                  <span>Subir Imagen de Referencia</span>
                </button>
                <button
                  type="button"
                  className="gf-settei-mini-btn is-primary"
                  disabled={isEditingBusy}
                  onClick={() => void lockConsistency(editingChar, activeViewSlot, true)}
                >
                  {isEditingBusy ? (
                    <RefreshCw size={13} strokeWidth={2} className="gf-spin gf-icon-shrink" />
                  ) : (
                    <Sparkles size={13} strokeWidth={2} className="gf-icon-shrink" />
                  )}
                  <span>
                    {isEditingBusy ? 'Generando retrato...' : 'Fijar Consistencia'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="button"
              className="gf-settei-kai-autofill-btn"
              onClick={() =>
                dispatchKaiAsk(buildSetteiKaiPrompt(project.name, editingChar), 'mentor')
              }
            >
              <Sparkles size={14} strokeWidth={2} className="gf-icon-shrink" />
              <span>Autocompletar / Redactar con KAI</span>
            </button>

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
                    value={activeEditorEntityType}
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
                  <SectionLabel>Rol / Función</SectionLabel>
                  <input
                    className="gf-modal-input"
                    value={editingChar.role || ''}
                    onChange={(e) => setEditingChar({ ...editingChar, role: e.target.value })}
                    placeholder="Ej. Protagonista, Reliquia, Santuario..."
                  />
                </div>
              </div>

              <div className="gf-settei-drawer-toggles">
                <button
                  type="button"
                  className={`gf-seed-toggle-btn ${
                    editingChar.activeInCanon !== false ? 'is-locked' : ''
                  }`}
                  onClick={() =>
                    setEditingChar({
                      ...editingChar,
                      activeInCanon: editingChar.activeInCanon === false,
                    })
                  }
                >
                  {editingChar.activeInCanon !== false ? (
                    <Eye size={13} strokeWidth={2} className="gf-icon-shrink" />
                  ) : (
                    <EyeOff size={13} strokeWidth={2} className="gf-icon-shrink" />
                  )}
                  <span>
                    {editingChar.activeInCanon !== false ? 'Activo en Canon' : 'Pausado en Canon'}
                  </span>
                </button>

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
                    <Lock size={13} strokeWidth={2} className="gf-icon-shrink" />
                  ) : (
                    <Unlock size={13} strokeWidth={2} className="gf-icon-shrink" />
                  )}
                  <span>{editingChar.seedLocked ? 'Canon Bloqueado' : 'Borrador Libre'}</span>
                </button>
              </div>

              <div className="gf-modal-field-group">
                <SectionLabel>Semilla de Referencia</SectionLabel>
                <div className="gf-seed-code-row">
                  <input
                    className="gf-modal-input gf-mono-input"
                    value={editingChar.characterSeed || ''}
                    onChange={(e) =>
                      setEditingChar({ ...editingChar, characterSeed: e.target.value })
                    }
                    placeholder="SEED-123456"
                  />
                  <button
                    type="button"
                    className="gf-seed-refresh-btn"
                    title="Generar nuevo código Seed"
                    onClick={() =>
                      setEditingChar({ ...editingChar, characterSeed: generateSeedCode() })
                    }
                  >
                    <RefreshCw size={14} strokeWidth={2} />
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
                    placeholder="Ej. cicatriz ceja izquierda, collar de jade..."
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
                <SectionLabel>
                  {activeEditorEntityType === 'location'
                    ? 'Arquitectura, Geografía y Rasgos Visuales'
                    : activeEditorEntityType === 'lore_rule'
                    ? 'Regla Visual de Mundo / Sistema'
                    : activeEditorEntityType === 'prop'
                    ? 'Forma, Silueta y Detalles del Objeto'
                    : 'Atributos Visuales (Rostro, Silueta, Rasgos)'}
                </SectionLabel>
                <textarea
                  className="gf-modal-field-textarea"
                  value={editingChar.appearance}
                  onChange={(e) =>
                    setEditingChar({ ...editingChar, appearance: e.target.value })
                  }
                  placeholder="Describe los rasgos clave que guían la continuidad entre viñetas..."
                />
              </div>

              <div className="gf-modal-field-group">
                <SectionLabel>
                  {activeEditorEntityType === 'location'
                    ? 'Atmósfera, Iluminación y Clima'
                    : activeEditorEntityType === 'lore_rule'
                    ? 'Símbolos, Restricciones y Efectos'
                    : 'Vestuario / Materiales'}
                </SectionLabel>
                <textarea
                  className="gf-modal-field-textarea"
                  value={editingChar.clothing}
                  onChange={(e) => setEditingChar({ ...editingChar, clothing: e.target.value })}
                  placeholder="Ej. túnica marfil con cinturón rojo terracota y brazaletes tallados..."
                />
              </div>
            </div>

            <div className="gf-modal-actions">
              <PillButton
                variant="outline"
                className="gf-settei-secondary-cta"
                onClick={() => setEditingChar(null)}
              >
                Descartar
              </PillButton>
              <PillButton
                variant="solid"
                className="gf-settei-primary-cta"
                onClick={handleSaveProfile}
              >
                Guardar Ficha Settei
              </PillButton>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
