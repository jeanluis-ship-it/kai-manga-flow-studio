import { normalizeTagHandle, type SetteiEntityType } from '@/app/studio/types';

export type SetteiReferenceSlot = 'turnaround' | 'front' | 'detail';

export interface SetteiReferenceViews {
  turnaround?: string;
  front?: string;
  detail?: string;
}

export interface SetteiDraftPayload {
  id: string;
  name: string;
  tagHandle: string;
  entityType: SetteiEntityType;
  appearance: string;
  clothing: string;
  visualAnchors: string[];
}

export interface SetteiDraftEventDetail {
  open: boolean;
  draft: SetteiDraftPayload | null;
}

export interface SetteiAutofillDetail {
  name?: string;
  tagHandle?: string;
  entityType?: SetteiEntityType;
  appearance?: string;
  clothing?: string;
  visualAnchors?: string[];
}

export interface KomaSketchBridgeDetail {
  pageIndex: number;
  komaId: string;
  nemuSketchUrl?: string;
  taggedHandle?: string;
  actionPrompt?: string;
}

export const SETTEI_DRAFT_EVENT = 'mangai-settei-draft';
export const SETTEI_AUTOFILL_EVENT = 'mangai-settei-autofill';
export const KAI_ASK_EVENT = 'mangai-kai-ask';
export const KOMA_SKETCH_BRIDGE_EVENT = 'mangai-koma-sketch-bridge';
export const PENDING_KOMA_SKETCH_KEY = 'mangai-pending-koma-sketch';

const VALID_ENTITY_TYPES: ReadonlySet<SetteiEntityType> = new Set([
  'character',
  'prop',
  'location',
  'lore_rule',
]);

export function dispatchSetteiDraft(
  open: boolean,
  draft: SetteiDraftPayload | null,
): void {
  if (typeof window === 'undefined') return;
  const detail: SetteiDraftEventDetail = { open, draft };
  window.dispatchEvent(new CustomEvent<SetteiDraftEventDetail>(SETTEI_DRAFT_EVENT, { detail }));
}

export function dispatchKaiAsk(prompt: string, mode: 'mentor' | 'script' = 'mentor'): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(KAI_ASK_EVENT, {
      detail: { prompt, mode },
    }),
  );
}

export function mergeSetteiAutofill<
  T extends {
    name: string;
    tagHandle?: string;
    entityType?: SetteiEntityType;
    appearance: string;
    clothing: string;
    visualAnchors?: string[];
  },
>(current: T, incoming: SetteiAutofillDetail): T {
  const nextName =
    typeof incoming.name === 'string' && incoming.name.trim()
      ? incoming.name.trim()
      : current.name;

  const nextHandle =
    typeof incoming.tagHandle === 'string' && incoming.tagHandle.trim()
      ? normalizeTagHandle(incoming.tagHandle, nextName)
      : current.tagHandle || (nextName ? normalizeTagHandle('', nextName) : '');

  const nextType =
    incoming.entityType && VALID_ENTITY_TYPES.has(incoming.entityType)
      ? incoming.entityType
      : current.entityType || 'character';

  const nextAppearance =
    typeof incoming.appearance === 'string' && incoming.appearance.trim()
      ? incoming.appearance.trim()
      : current.appearance;

  const nextClothing =
    typeof incoming.clothing === 'string' && incoming.clothing.trim()
      ? incoming.clothing.trim()
      : current.clothing;

  let nextAnchors = Array.isArray(current.visualAnchors) ? [...current.visualAnchors] : [];
  if (Array.isArray(incoming.visualAnchors)) {
    const seen = new Set(nextAnchors.map((a) => a.toLowerCase()));
    for (const rawAnchor of incoming.visualAnchors) {
      const clean = typeof rawAnchor === 'string' ? rawAnchor.trim() : '';
      if (clean && !seen.has(clean.toLowerCase())) {
        seen.add(clean.toLowerCase());
        nextAnchors.push(clean);
      }
    }
    nextAnchors = nextAnchors.slice(0, 12);
  }

  return {
    ...current,
    name: nextName,
    tagHandle: nextHandle,
    entityType: nextType,
    appearance: nextAppearance,
    clothing: nextClothing,
    visualAnchors: nextAnchors,
  };
}

export function buildSetteiKaiPrompt(
  projectName: string,
  draft: Partial<SetteiDraftPayload> & { role?: string },
): string {
  const entityLabel =
    draft.entityType === 'prop'
      ? 'Objeto (Prop)'
      : draft.entityType === 'location'
      ? 'Escenario'
      : draft.entityType === 'lore_rule'
      ? 'Regla de Lore'
      : 'Personaje';

  const parts = [
    `Estoy editando una ficha Settei (${entityLabel}) para mi manga «${projectName || 'Manga sin título'}».`,
    draft.name ? `Nombre actual: ${draft.name}.` : 'Aún no tiene nombre definido.',
    draft.tagHandle ? `Handle: ${draft.tagHandle}.` : '',
    draft.role ? `Rol: ${draft.role}.` : '',
    draft.appearance ? `Rasgos actuales: ${draft.appearance}.` : '',
    draft.clothing ? `Vestuario/Materiales actuales: ${draft.clothing}.` : '',
    draft.visualAnchors && draft.visualAnchors.length > 0
      ? `Anclas actuales: ${draft.visualAnchors.join(', ')}.`
      : '',
    'Redacta o completa esta ficha Settei devolviendo Nombre, @Handle, Rasgos Visuales, Vestuario/Materiales y 4 Anclas Visuales concretas listas para aplicar con el botón "Rellenar Ficha Settei Abierta", más un [PROMPT VISUAL]: para fijar su hoja de referencia.',
  ];

  return parts.filter(Boolean).join(' ');
}

export function readPendingKomaSketch(): KomaSketchBridgeDetail | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage?.getItem(PENDING_KOMA_SKETCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<KomaSketchBridgeDetail>;
    if (typeof parsed.komaId !== 'string' || !parsed.komaId) return null;
    return {
      pageIndex: typeof parsed.pageIndex === 'number' && parsed.pageIndex >= 0 ? parsed.pageIndex : 0,
      komaId: parsed.komaId,
      nemuSketchUrl: typeof parsed.nemuSketchUrl === 'string' ? parsed.nemuSketchUrl : undefined,
      taggedHandle: typeof parsed.taggedHandle === 'string' ? parsed.taggedHandle : undefined,
      actionPrompt: typeof parsed.actionPrompt === 'string' ? parsed.actionPrompt : undefined,
    };
  } catch {
    return null;
  }
}

export function clearPendingKomaSketch(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage?.removeItem(PENDING_KOMA_SKETCH_KEY);
  } catch {
    // Ignore storage errors in restricted environments.
  }
}
