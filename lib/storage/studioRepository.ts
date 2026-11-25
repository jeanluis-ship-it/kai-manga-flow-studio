import { getPolygonBounds, KOMA_LAYOUT_PRESETS, type KomaLayoutId } from '@/lib/kai/schema';
import { computeSpineInches, PRINT_PRESETS, type TrimFormatId } from '@/lib/print/presets';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { uploadMangaAssetToStorage } from '@/lib/supabase/storage';
import {
  DEFAULT_LAYERS_VISIBILITY,
  DEFAULT_LAYER_OPACITY,
  normalizeTagHandle,
  type Character,
  type Koma,
  type KomaDialogue,
  type KomaSfx,
  type KomaState,
  type LayersVisibility,
  type Page,
  type Project,
  type ScreentonePreset,
  type SetteiEntityType,
  type SpeedlinePreset,
} from '@/app/studio/types';

export const STUDIO_STORAGE_KEY = 'mangai-flow-studio-v1';
export const LOCAL_SESSION_KEY = 'mangai-local-session-v1';
export const USER_PROJECTS_PREFIX = 'mangai-user-projects-v1:';
const SUPABASE_META_CACHE_PREFIX = 'mangai-supabase-meta-v1:';

export type StorageMode = 'supabase' | 'local';
export type ColorMode = 'bw' | 'color';
export type BindingType = 'rustica_pegada' | 'tapa_dura' | 'grapa';

export interface ReferenceViews {
  turnaround?: string;
  front?: string;
  detail?: string;
}

export type StudioCharacterRecord = Character & {
  activeInCanon?: boolean;
  referenceViews?: ReferenceViews;
};

export type StudioProjectRecord = Omit<Project, 'characters'> & {
  colorMode?: ColorMode;
  bindingType?: BindingType;
  volumeSlug?: string;
  characters: StudioCharacterRecord[];
};

export interface LocalUserSession {
  email: string;
  displayName: string;
  signedInAt: string;
  mode: 'local-beta';
}

interface SupabaseProjectMetaCache {
  colorMode?: ColorMode;
  bindingType?: BindingType;
  volumeSlug?: string;
  spineTitle?: string;
  backSynopsis?: string;
  frontBase64?: string;
  backBase64?: string;
  fullWrapBase64?: string;
  characters?: Record<
    string,
    {
      activeInCanon?: boolean;
      referenceViews?: ReferenceViews;
      referenceBase64?: string;
    }
  >;
}

function createId(prefix: string): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getUserProjectsStorageKey(email: string): string {
  return `${USER_PROJECTS_PREFIX}${email.trim().toLowerCase()}`;
}

export function getLocalUserSession(): LocalUserSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalUserSession>;
    if (!parsed || typeof parsed.email !== 'string' || !parsed.email.includes('@')) {
      return null;
    }
    return {
      email: parsed.email.trim().toLowerCase(),
      displayName:
        typeof parsed.displayName === 'string' && parsed.displayName.trim()
          ? parsed.displayName.trim()
          : parsed.email.split('@')[0],
      signedInAt: typeof parsed.signedInAt === 'string' ? parsed.signedInAt : new Date().toISOString(),
      mode: 'local-beta',
    };
  } catch {
    return null;
  }
}

export function setLocalUserSession(session: LocalUserSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!session) {
      window.localStorage.removeItem(LOCAL_SESSION_KEY);
      return;
    }
    window.localStorage.setItem(
      LOCAL_SESSION_KEY,
      JSON.stringify({
        email: session.email.trim().toLowerCase(),
        displayName: session.displayName.trim() || session.email.split('@')[0],
        signedInAt: session.signedInAt || new Date().toISOString(),
        mode: 'local-beta',
      } satisfies LocalUserSession),
    );
  } catch {
    // Ignore storage quota / security errors gracefully.
  }
}

function hydrateDialogues(
  rawDialogues: KomaDialogue[] | undefined,
  coords: { x: number; y: number }[],
): KomaDialogue[] {
  if (!Array.isArray(rawDialogues)) return [];
  const bounds = getPolygonBounds(coords);
  return rawDialogues.map((d, idx) => {
    const defaultX = Math.min(
      85,
      Math.max(15, bounds.left + bounds.width * (idx % 2 === 0 ? 0.28 : 0.72)),
    );
    const defaultY = Math.min(
      86,
      Math.max(14, bounds.top + Math.min(bounds.height * 0.34, 12) + idx * 9),
    );
    const x = typeof d.x === 'number' && Number.isFinite(d.x) ? d.x : Number(defaultX.toFixed(1));
    const y = typeof d.y === 'number' && Number.isFinite(d.y) ? d.y : Number(defaultY.toFixed(1));
    return {
      ...d,
      x,
      y,
      tailX:
        typeof d.tailX === 'number' && Number.isFinite(d.tailX)
          ? d.tailX
          : Number(Math.min(92, Math.max(8, x + (idx % 2 === 0 ? 7 : -7))).toFixed(1)),
      tailY:
        typeof d.tailY === 'number' && Number.isFinite(d.tailY)
          ? d.tailY
          : Number(Math.min(92, y + 9).toFixed(1)),
      fontSize: typeof d.fontSize === 'number' && d.fontSize > 0 ? d.fontSize : 2.35,
      width: typeof d.width === 'number' && d.width >= 10 ? d.width : 20,
    };
  });
}

function hydrateSfx(rawSfx: KomaSfx[] | undefined, coords: { x: number; y: number }[]): KomaSfx[] {
  if (!Array.isArray(rawSfx)) return [];
  const bounds = getPolygonBounds(coords);
  return rawSfx.map((s, idx) => ({
    ...s,
    x:
      typeof s.x === 'number' && Number.isFinite(s.x)
        ? s.x
        : Number(Math.min(86, Math.max(14, bounds.left + bounds.width * 0.74)).toFixed(1)),
    y:
      typeof s.y === 'number' && Number.isFinite(s.y)
        ? s.y
        : Number(
            Math.min(88, Math.max(12, bounds.top + bounds.height * 0.78 - idx * 6)).toFixed(1),
          ),
    rotation: typeof s.rotation === 'number' && Number.isFinite(s.rotation) ? s.rotation : -8,
    fontSize: typeof s.fontSize === 'number' && s.fontSize > 0 ? s.fontSize : 4.2,
  }));
}

export function buildKomasForLayout(
  layoutId: KomaLayoutId,
  existingKomas: Koma[] = [],
  pageId = 'page',
): Koma[] {
  const preset = KOMA_LAYOUT_PRESETS[layoutId] ?? KOMA_LAYOUT_PRESETS['4_panel_classic'];
  return preset.panels.map((coords, idx) => {
    const prev = existingKomas[idx];
    return {
      id: prev?.id || `${pageId}-koma-${idx + 1}`,
      panelIndex: idx + 1,
      state: prev?.state ?? 'VACIO',
      polygonCoords: coords,
      cameraAngle: prev?.cameraAngle || (idx === 0 ? 'Plano General / Establishing' : 'Plano Medio'),
      taggedHandles: Array.isArray(prev?.taggedHandles) ? prev.taggedHandles : [],
      actionPrompt: prev?.actionPrompt ?? '',
      nemuSketchUrl: prev?.nemuSketchUrl,
      inkRenderUrl: prev?.inkRenderUrl,
      screentonePreset: (prev?.screentonePreset as ScreentonePreset) || 'none',
      speedlinePreset: (prev?.speedlinePreset as SpeedlinePreset) || 'none',
      dialogues: hydrateDialogues(prev?.dialogues, coords),
      sfxItems: hydrateSfx(prev?.sfxItems, coords),
    };
  });
}

export function createInitialStudioProject(pageId = 'page-1'): StudioProjectRecord {
  return {
    id: createId('proj'),
    name: 'Manga sin título',
    author: 'Autor',
    pageCount: 100,
    paperType: 'white',
    trimFormat: 'tankobon_b6',
    readingDirection: 'rtl',
    colorMode: 'bw',
    bindingType: 'rustica_pegada',
    characters: [],
    pages: [
      {
        id: pageId,
        base64: '',
        prompt: '',
        artStyle: 'Classic Shonen',
        castIds: [],
        layoutTemplate: '4_panel_classic',
        chapterBeat: '',
        layersVisibility: { ...DEFAULT_LAYERS_VISIBILITY },
        layerOpacity: { ...DEFAULT_LAYER_OPACITY },
        komas: buildKomasForLayout('4_panel_classic', [], pageId),
      },
    ],
    cover: {
      frontBase64: '',
      backBase64: '',
      fullWrapBase64: '',
      prompt: '',
      spineWidthInches: computeSpineInches(100, 'white'),
      isbn: '978-9945-0000-0-0',
      includeIsbn: true,
      spineTitle: '',
      backSynopsis: '',
    },
  };
}

function sanitizeReferenceViews(raw: unknown): ReferenceViews | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const turnaround = typeof obj.turnaround === 'string' && obj.turnaround ? obj.turnaround : undefined;
  const front = typeof obj.front === 'string' && obj.front ? obj.front : undefined;
  const detail = typeof obj.detail === 'string' && obj.detail ? obj.detail : undefined;
  if (!turnaround && !front && !detail) return undefined;
  return { turnaround, front, detail };
}

export function hydrateProjectShape(parsed: Partial<StudioProjectRecord>): StudioProjectRecord {
  const paperType = parsed.paperType === 'cream' ? 'cream' : 'white';
  const pageCount =
    typeof parsed.pageCount === 'number' && parsed.pageCount > 0 ? parsed.pageCount : 100;
  const trimFormat: TrimFormatId =
    parsed.trimFormat && parsed.trimFormat in PRINT_PRESETS
      ? parsed.trimFormat
      : 'tankobon_b6';
  const colorMode: ColorMode = parsed.colorMode === 'color' ? 'color' : 'bw';
  const bindingType: BindingType =
    parsed.bindingType === 'tapa_dura' || parsed.bindingType === 'grapa'
      ? parsed.bindingType
      : 'rustica_pegada';
  const volumeSlug =
    typeof parsed.volumeSlug === 'string' && parsed.volumeSlug.trim()
      ? parsed.volumeSlug.trim()
      : undefined;

  const characters: StudioCharacterRecord[] = Array.isArray(parsed.characters)
    ? parsed.characters.map((c, idx) => {
        const refViews = sanitizeReferenceViews(
          (c as StudioCharacterRecord).referenceViews,
        );
        return {
          id: typeof c.id === 'string' && c.id ? c.id : `char-${idx + 1}`,
          entityType: (c.entityType as SetteiEntityType) || 'character',
          tagHandle: normalizeTagHandle(c.tagHandle || '', c.name || `Settei${idx + 1}`),
          name: typeof c.name === 'string' ? c.name : 'Sin nombre',
          appearance: typeof c.appearance === 'string' ? c.appearance : '',
          clothing: typeof c.clothing === 'string' ? c.clothing : '',
          role: typeof c.role === 'string' ? c.role : 'Protagonista',
          visualAnchors: Array.isArray(c.visualAnchors)
            ? c.visualAnchors.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
            : [],
          seedLocked: Boolean(c.seedLocked),
          characterSeed: typeof c.characterSeed === 'string' ? c.characterSeed : undefined,
          referenceMediaId: c.referenceMediaId,
          referenceBase64: c.referenceBase64 || refViews?.front || refViews?.turnaround,
          activeInCanon:
            typeof (c as StudioCharacterRecord).activeInCanon === 'boolean'
              ? (c as StudioCharacterRecord).activeInCanon
              : true,
          ...(refViews ? { referenceViews: refViews } : {}),
        };
      })
    : [];

  const rawPages =
    Array.isArray(parsed.pages) && parsed.pages.length > 0
      ? parsed.pages
      : createInitialStudioProject().pages;

  const pages: Page[] = rawPages.map((p, idx) => {
    const pid = typeof p.id === 'string' && p.id ? p.id : `page-${idx + 1}`;
    const layoutTemplate: KomaLayoutId =
      p.layoutTemplate && p.layoutTemplate in KOMA_LAYOUT_PRESETS
        ? p.layoutTemplate
        : '4_panel_classic';
    const existingKomas = Array.isArray(p.komas) && p.komas.length > 0 ? p.komas : [];
    const komas =
      existingKomas.length > 0
        ? existingKomas.map((k, kIdx) => {
            const poly =
              Array.isArray(k.polygonCoords) && k.polygonCoords.length >= 3
                ? k.polygonCoords
                : KOMA_LAYOUT_PRESETS[layoutTemplate].panels[kIdx] ??
                  KOMA_LAYOUT_PRESETS['4_panel_classic'].panels[0];
            return {
              ...k,
              id: k.id || `${pid}-koma-${kIdx + 1}`,
              panelIndex: k.panelIndex || kIdx + 1,
              state: (k.state as KomaState) || 'VACIO',
              polygonCoords: poly,
              cameraAngle: k.cameraAngle || 'Plano Medio',
              taggedHandles: Array.isArray(k.taggedHandles) ? k.taggedHandles : [],
              actionPrompt: k.actionPrompt ?? '',
              screentonePreset: (k.screentonePreset as ScreentonePreset) || 'none',
              speedlinePreset: (k.speedlinePreset as SpeedlinePreset) || 'none',
              dialogues: hydrateDialogues(k.dialogues, poly),
              sfxItems: hydrateSfx(k.sfxItems, poly),
            };
          })
        : buildKomasForLayout(layoutTemplate, [], pid);

    const mergedVisibility: LayersVisibility = {
      ...DEFAULT_LAYERS_VISIBILITY,
      ...(p.layersVisibility ?? {}),
    };

    return {
      id: pid,
      base64: typeof p.base64 === 'string' ? p.base64 : '',
      prompt: typeof p.prompt === 'string' ? p.prompt : '',
      artStyle: typeof p.artStyle === 'string' ? p.artStyle : 'Classic Shonen',
      castIds: Array.isArray(p.castIds) ? p.castIds : [],
      layoutTemplate,
      chapterBeat: typeof p.chapterBeat === 'string' ? p.chapterBeat : '',
      layersVisibility: mergedVisibility,
      layerOpacity: {
        L0_nemu:
          typeof p.layerOpacity?.L0_nemu === 'number'
            ? p.layerOpacity.L0_nemu
            : DEFAULT_LAYER_OPACITY.L0_nemu,
        L1_tones:
          typeof p.layerOpacity?.L1_tones === 'number'
            ? p.layerOpacity.L1_tones
            : DEFAULT_LAYER_OPACITY.L1_tones,
      },
      komas,
    };
  });

  return {
    id: typeof parsed.id === 'string' && parsed.id ? parsed.id : createId('proj'),
    name: parsed.name || 'Manga sin título',
    author: typeof parsed.author === 'string' ? parsed.author : 'Autor',
    pageCount,
    paperType,
    trimFormat,
    readingDirection: parsed.readingDirection === 'ltr' ? 'ltr' : 'rtl',
    colorMode,
    bindingType,
    ...(volumeSlug ? { volumeSlug } : {}),
    characters,
    pages,
    cover: {
      frontBase64: parsed.cover?.frontBase64 ?? '',
      backBase64: parsed.cover?.backBase64 ?? '',
      fullWrapBase64: parsed.cover?.fullWrapBase64 ?? '',
      prompt: parsed.cover?.prompt ?? '',
      spineWidthInches: computeSpineInches(pageCount, paperType),
      isbn: typeof parsed.cover?.isbn === 'string' ? parsed.cover.isbn : '978-9945-0000-0-0',
      includeIsbn:
        typeof parsed.cover?.includeIsbn === 'boolean' ? parsed.cover.includeIsbn : true,
      spineTitle: typeof parsed.cover?.spineTitle === 'string' ? parsed.cover.spineTitle : '',
      backSynopsis: typeof parsed.cover?.backSynopsis === 'string' ? parsed.cover.backSynopsis : '',
    },
  };
}

function stripHeavyProjectImages(project: StudioProjectRecord): StudioProjectRecord {
  return {
    ...project,
    characters: project.characters.map((c) => ({
      ...c,
      referenceBase64: undefined,
      referenceViews: undefined,
    })),
    pages: project.pages.map((p) => ({
      ...p,
      base64: '',
      komas: (p.komas ?? []).map((k) => ({
        ...k,
        inkRenderUrl: undefined,
        nemuSketchUrl: undefined,
      })),
    })),
    cover: {
      ...project.cover,
      frontBase64: '',
      backBase64: '',
      fullWrapBase64: undefined,
    },
  };
}

function readLocalProject(): StudioProjectRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STUDIO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudioProjectRecord>;
    if (!parsed || typeof parsed.name !== 'string') return null;
    return hydrateProjectShape(parsed);
  } catch {
    return null;
  }
}

function writeLocalProject(project: StudioProjectRecord): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(project));
  } catch {
    try {
      window.localStorage.setItem(
        STUDIO_STORAGE_KEY,
        JSON.stringify(stripHeavyProjectImages(project)),
      );
    } catch {
      // Ignore storage quota overflow gracefully.
    }
  }
}

export function readUserProjectsFromLocal(email: string): StudioProjectRecord[] {
  if (typeof window === 'undefined' || !email.trim()) return [];
  try {
    const raw = window.localStorage.getItem(getUserProjectsStorageKey(email));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Partial<StudioProjectRecord> => Boolean(item && typeof item === 'object'))
      .map((item) => hydrateProjectShape(item));
  } catch {
    return [];
  }
}

export function writeUserProjectsToLocal(email: string, projects: StudioProjectRecord[]): void {
  if (typeof window === 'undefined' || !email.trim()) return;
  const key = getUserProjectsStorageKey(email);
  try {
    window.localStorage.setItem(key, JSON.stringify(projects));
  } catch {
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify(projects.map((p) => stripHeavyProjectImages(p))),
      );
    } catch {
      // Ignore storage quota overflow gracefully.
    }
  }
}

export function upsertUserProjectInLocal(
  email: string,
  project: StudioProjectRecord,
): StudioProjectRecord[] {
  const existing = readUserProjectsFromLocal(email);
  const normalized = hydrateProjectShape(project);
  const filtered = existing.filter((p) => {
    if (normalized.id && p.id === normalized.id) return false;
    if (normalized.volumeSlug && p.volumeSlug === normalized.volumeSlug) return false;
    return true;
  });
  const next = [normalized, ...filtered].slice(0, 25);
  writeUserProjectsToLocal(email, next);
  return next;
}

export function migrateGuestProjectToLocalProfile(
  email: string,
  displayName?: string,
): StudioProjectRecord[] {
  const existing = readUserProjectsFromLocal(email);
  const guestProject = readLocalProject();
  if (!guestProject) {
    return existing;
  }
  const hasMeaningfulEdits =
    guestProject.name !== 'Manga sin título' ||
    guestProject.characters.length > 0 ||
    guestProject.pages.length > 1 ||
    Boolean(guestProject.cover.frontBase64 || guestProject.cover.fullWrapBase64);

  if (!hasMeaningfulEdits && existing.length > 0) {
    return existing;
  }

  const migrated: StudioProjectRecord = {
    ...guestProject,
    author:
      guestProject.author === 'Autor' && displayName?.trim()
        ? displayName.trim()
        : guestProject.author,
  };
  writeLocalProject(migrated);
  return upsertUserProjectInLocal(email, migrated);
}

function readSupabaseMetaCache(projectId: string): SupabaseProjectMetaCache | null {
  if (typeof window === 'undefined' || !projectId) return null;
  try {
    const raw = window.localStorage.getItem(`${SUPABASE_META_CACHE_PREFIX}${projectId}`);
    if (!raw) return null;
    return JSON.parse(raw) as SupabaseProjectMetaCache;
  } catch {
    return null;
  }
}

function writeSupabaseMetaCache(projectId: string, project: StudioProjectRecord): void {
  if (typeof window === 'undefined' || !projectId) return;
  const charMeta: SupabaseProjectMetaCache['characters'] = {};
  for (const c of project.characters) {
    charMeta[c.tagHandle || c.id] = {
      activeInCanon: c.activeInCanon !== false,
      referenceViews: c.referenceViews,
      referenceBase64: c.referenceBase64,
    };
  }
  const payload: SupabaseProjectMetaCache = {
    colorMode: project.colorMode,
    bindingType: project.bindingType,
    volumeSlug: project.volumeSlug,
    spineTitle: project.cover.spineTitle,
    backSynopsis: project.cover.backSynopsis,
    frontBase64: project.cover.frontBase64,
    backBase64: project.cover.backBase64,
    fullWrapBase64: project.cover.fullWrapBase64,
    characters: charMeta,
  };
  try {
    window.localStorage.setItem(`${SUPABASE_META_CACHE_PREFIX}${projectId}`, JSON.stringify(payload));
  } catch {
    // Ignore quota errors on local cache mirror.
  }
}

function isUuid(val?: string): boolean {
  return Boolean(
    val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val),
  );
}

function toStableUuid(raw: string | undefined, fallbackPrefix: string): string {
  if (isUuid(raw)) return raw!;
  const source = (raw || '').trim();
  if (!source) return createId(fallbackPrefix);
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let h3 = 0x85ebca6b;
  let h4 = 0xc2b2ae35;
  for (let i = 0; i < source.length; i++) {
    const ch = source.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (ch + i), 0x01000193) >>> 0;
    h3 = Math.imul(h3 ^ (ch * 31), 0x01000193) >>> 0;
    h4 = Math.imul(h4 ^ (ch + 17 * i), 0x01000193) >>> 0;
  }
  const hex =
    h1.toString(16).padStart(8, '0') +
    h2.toString(16).padStart(8, '0') +
    h3.toString(16).padStart(8, '0') +
    h4.toString(16).padStart(8, '0');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function isProjectWorthMigrating(project: StudioProjectRecord | null): project is StudioProjectRecord {
  if (!project) return false;
  return (
    project.name !== 'Manga sin título' ||
    project.characters.length > 0 ||
    project.pages.length > 1 ||
    Boolean(project.cover.frontBase64 || project.cover.fullWrapBase64 || project.cover.prompt)
  );
}

function mapMangaRowToProject(
  row: Record<string, unknown>,
  setteiRows: Array<Record<string, unknown>>,
  pageRows: Array<Record<string, unknown>>,
  fallbackAuthor: string,
): StudioProjectRecord {
  const settings = (row.settings && typeof row.settings === 'object'
    ? row.settings
    : {}) as Record<string, unknown>;
  const meta = readSupabaseMetaCache(String(row.id));

  const characters: StudioCharacterRecord[] = setteiRows.map((item, idx) => {
    const rawCat = String(item.category || 'character');
    const entityType: SetteiEntityType =
      rawCat === 'prop' || rawCat === 'location' || rawCat === 'lore_rule'
        ? rawCat
        : 'character';
    const refUrl =
      typeof item.reference_image_url === 'string' && item.reference_image_url
        ? item.reference_image_url
        : undefined;
    const anchors = Array.isArray(item.visual_anchors)
      ? item.visual_anchors.filter((a): a is string => typeof a === 'string')
      : [];
    const name = String(item.name || `Settei ${idx + 1}`);
    const tagHandle = normalizeTagHandle('', name);
    const cachedChar = meta?.characters?.[tagHandle] || meta?.characters?.[String(item.id)];
    return {
      id: String(item.id),
      entityType,
      tagHandle,
      name,
      appearance: String(item.description || ''),
      clothing: '',
      role: entityType === 'character' ? 'Protagonista' : entityType,
      visualAnchors: anchors,
      seedLocked: Boolean(item.seed),
      characterSeed: typeof item.seed === 'string' ? item.seed : undefined,
      referenceBase64: refUrl || cachedChar?.referenceBase64,
      activeInCanon: typeof item.is_active === 'boolean' ? item.is_active : true,
      ...(cachedChar?.referenceViews ? { referenceViews: cachedChar.referenceViews } : {}),
    };
  });

  const pages: Page[] = pageRows.map((pg, idx) => {
    const layoutData = (pg.layout_data && typeof pg.layout_data === 'object'
      ? pg.layout_data
      : {}) as Record<string, unknown>;
    const layoutTemplate: KomaLayoutId =
      typeof layoutData.layoutTemplate === 'string' && layoutData.layoutTemplate in KOMA_LAYOUT_PRESETS
        ? (layoutData.layoutTemplate as KomaLayoutId)
        : '4_panel_classic';
    const rawKomas = Array.isArray(layoutData.komas) ? (layoutData.komas as Koma[]) : [];
    const komas =
      rawKomas.length > 0
        ? rawKomas
        : buildKomasForLayout(layoutTemplate, [], String(pg.id || `page-${idx + 1}`));

    return {
      id: String(pg.id || `page-${idx + 1}`),
      base64: typeof pg.final_image_url === 'string' ? pg.final_image_url : '',
      prompt: typeof layoutData.prompt === 'string' ? layoutData.prompt : '',
      artStyle: typeof layoutData.artStyle === 'string' ? layoutData.artStyle : 'Classic Shonen',
      castIds: Array.isArray(layoutData.castIds) ? (layoutData.castIds as string[]) : [],
      layoutTemplate,
      chapterBeat: typeof layoutData.chapterBeat === 'string' ? layoutData.chapterBeat : '',
      layersVisibility:
        layoutData.layersVisibility && typeof layoutData.layersVisibility === 'object'
          ? (layoutData.layersVisibility as LayersVisibility)
          : { ...DEFAULT_LAYERS_VISIBILITY },
      layerOpacity:
        layoutData.layerOpacity && typeof layoutData.layerOpacity === 'object'
          ? (layoutData.layerOpacity as { L0_nemu: number; L1_tones: number })
          : { ...DEFAULT_LAYER_OPACITY },
      komas,
    };
  });

  const frontUrl = typeof row.cover_url === 'string' ? row.cover_url : '';
  const backUrl = typeof row.back_cover_url === 'string' ? row.back_cover_url : '';
  const fullWrapUrl =
    typeof settings.fullWrapUrl === 'string' && settings.fullWrapUrl
      ? settings.fullWrapUrl
      : frontUrl;

  return hydrateProjectShape({
    id: String(row.id),
    name: String(row.title || 'Manga sin título'),
    author: typeof settings.author === 'string' && settings.author ? settings.author : fallbackAuthor,
    pageCount: typeof settings.pageCount === 'number' ? settings.pageCount : 100,
    paperType: settings.paperType === 'cream' ? 'cream' : 'white',
    trimFormat: (row.format as TrimFormatId) || 'tankobon_b6',
    readingDirection: settings.readingDirection === 'ltr' ? 'ltr' : 'rtl',
    colorMode: row.color_mode === 'color' ? 'color' : 'bw',
    bindingType:
      settings.bindingType === 'tapa_dura' || settings.bindingType === 'grapa'
        ? settings.bindingType
        : 'rustica_pegada',
    volumeSlug: typeof settings.volumeSlug === 'string' ? settings.volumeSlug : meta?.volumeSlug,
    characters,
    pages: pages.length > 0 ? pages : createInitialStudioProject(createId('page')).pages,
    cover: {
      frontBase64: frontUrl || meta?.frontBase64 || '',
      backBase64: backUrl || meta?.backBase64 || '',
      fullWrapBase64: fullWrapUrl || meta?.fullWrapBase64 || '',
      prompt: typeof settings.coverPrompt === 'string' ? settings.coverPrompt : '',
      spineWidthInches:
        typeof settings.spineWidthInches === 'number' ? settings.spineWidthInches : 0.2252,
      isbn: typeof settings.isbn === 'string' ? settings.isbn : '978-9945-0000-0-0',
      includeIsbn: typeof settings.includeIsbn === 'boolean' ? settings.includeIsbn : true,
      spineTitle: typeof settings.spineTitle === 'string' ? settings.spineTitle : meta?.spineTitle || '',
      backSynopsis:
        typeof settings.backSynopsis === 'string' ? settings.backSynopsis : meta?.backSynopsis || '',
    },
  });
}

/**
 * Loads the user's project list from Supabase (`public.mangas`) when signed in,
 * or from the local Beta profile / guest storage.
 */
export async function loadUserProjectList(): Promise<StudioProjectRecord[]> {
  const supabase = getSupabaseBrowserClient();

  if (supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.id) {
        const fallbackAuthor =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.display_name ||
          session.user.email?.split('@')[0] ||
          'Autor';

        const { data: mangaRows } = await supabase
          .from('mangas')
          .select('*')
          .eq('user_id', session.user.id)
          .order('updated_at', { ascending: false })
          .limit(20);

        if (Array.isArray(mangaRows) && mangaRows.length > 0) {
          return mangaRows.map((row) =>
            mapMangaRowToProject(row as Record<string, unknown>, [], [], fallbackAuthor),
          );
        }
      }
    } catch {
      // Fall back cleanly to local profile list.
    }
  }

  const localSession = getLocalUserSession();
  if (localSession) {
    const list = readUserProjectsFromLocal(localSession.email);
    if (list.length > 0) return list;
  }

  const local = readLocalProject();
  return local ? [local] : [];
}

/**
 * Loads the active studio project from Supabase (`mangas`, `settei_items`,
 * `manga_pages`) when configured + signed in, migrating guest work if the cloud
 * workspace is empty, and degrading cleanly to localStorage in Guest mode.
 */
export async function loadStudioProject(): Promise<{
  project: StudioProjectRecord;
  mode: StorageMode;
}> {
  const supabase = getSupabaseBrowserClient();

  if (supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.id) {
        const fallbackAuthor =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.display_name ||
          session.user.email?.split('@')[0] ||
          'Autor';

        const { data: mangaRows } = await supabase
          .from('mangas')
          .select('*')
          .eq('user_id', session.user.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        const mangaRow = mangaRows?.[0] as Record<string, unknown> | undefined;
        if (mangaRow && typeof mangaRow.id === 'string') {
          const [{ data: setteiRows }, { data: pageRows }] = await Promise.all([
            supabase
              .from('settei_items')
              .select('*')
              .eq('manga_id', mangaRow.id)
              .order('created_at', { ascending: true }),
            supabase
              .from('manga_pages')
              .select('*')
              .eq('manga_id', mangaRow.id)
              .order('page_number', { ascending: true }),
          ]);

          const mapped = mapMangaRowToProject(
            mangaRow,
            (setteiRows ?? []) as Array<Record<string, unknown>>,
            (pageRows ?? []) as Array<Record<string, unknown>>,
            fallbackAuthor,
          );
          writeLocalProject(mapped);
          return { project: mapped, mode: 'supabase' };
        }

        // Guest -> Signed-in migration when cloud account has no mangas yet
        const guestLocal = readLocalProject();
        if (isProjectWorthMigrating(guestLocal)) {
          const migrated: StudioProjectRecord = {
            ...guestLocal,
            id: isUuid(guestLocal.id) ? guestLocal.id : createId('proj'),
          };
          const savedMode = await saveStudioProject(migrated);
          return { project: migrated, mode: savedMode };
        }
      }
    } catch {
      // Fall back cleanly to localStorage if Supabase network/session fails.
    }
  }

  const localSession = getLocalUserSession();
  if (localSession) {
    const profileProjects = readUserProjectsFromLocal(localSession.email);
    if (profileProjects[0]) {
      writeLocalProject(profileProjects[0]);
      return { project: profileProjects[0], mode: 'local' };
    }
    const migratedList = migrateGuestProjectToLocalProfile(
      localSession.email,
      localSession.displayName,
    );
    if (migratedList[0]) {
      return { project: migratedList[0], mode: 'local' };
    }
  }

  const local = readLocalProject();
  if (local) {
    return { project: local, mode: 'local' };
  }
  return { project: createInitialStudioProject(createId('page')), mode: 'local' };
}

/**
 * Persists the project locally and synchronizes to Supabase (`mangas`,
 * `settei_items`, `manga_pages`) + public Storage bucket (`manga-assets`)
 * when an authenticated session is active.
 */
export async function saveStudioProject(project: StudioProjectRecord | Project): Promise<StorageMode> {
  const normalized = hydrateProjectShape(project);
  writeLocalProject(normalized);

  const localSession = getLocalUserSession();
  if (localSession) {
    upsertUserProjectInLocal(localSession.email, normalized);
  }

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return 'local';

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) return 'local';

    const userId = session.user.id;
    const mangaId = toStableUuid(normalized.id || normalized.volumeSlug, 'manga');
    writeSupabaseMetaCache(mangaId, normalized);

    // Upload cover assets to public `manga-assets` bucket under `{user_id}/{manga_id}/...`
    const [frontCoverUrl, backCoverUrl, fullWrapUrl] = await Promise.all([
      uploadMangaAssetToStorage(
        supabase,
        userId,
        mangaId,
        'covers/front',
        normalized.cover.frontBase64,
      ),
      uploadMangaAssetToStorage(
        supabase,
        userId,
        mangaId,
        'covers/back',
        normalized.cover.backBase64,
      ),
      uploadMangaAssetToStorage(
        supabase,
        userId,
        mangaId,
        'covers/full_wrap',
        normalized.cover.fullWrapBase64,
      ),
    ]);

    const { error: mangaErr } = await supabase.from('mangas').upsert({
      id: mangaId,
      user_id: userId,
      title: normalized.name || 'Manga sin título',
      genre: normalized.pages[0]?.artStyle || 'Shonen',
      format: normalized.trimFormat || 'tankobon_b6',
      color_mode: normalized.colorMode || 'bw',
      cover_url: frontCoverUrl || fullWrapUrl || null,
      back_cover_url: backCoverUrl || null,
      settings: {
        author: normalized.author || 'Autor',
        pageCount: normalized.pageCount,
        paperType: normalized.paperType,
        readingDirection: normalized.readingDirection || 'rtl',
        bindingType: normalized.bindingType || 'rustica_pegada',
        volumeSlug: normalized.volumeSlug || null,
        spineWidthInches: Number(normalized.cover.spineWidthInches.toFixed(4)),
        isbn: normalized.cover.isbn || null,
        includeIsbn: normalized.cover.includeIsbn !== false,
        spineTitle: normalized.cover.spineTitle || '',
        backSynopsis: normalized.cover.backSynopsis || '',
        coverPrompt: normalized.cover.prompt || '',
        fullWrapUrl: fullWrapUrl || null,
      },
      updated_at: new Date().toISOString(),
    });

    if (mangaErr) return 'local';

    // Sync Visual Bible (`public.settei_items`) + upload reference images
    if (normalized.characters.length > 0) {
      const setteiPayload = await Promise.all(
        normalized.characters.map(async (c, idx) => {
          const itemId = toStableUuid(c.id || `${mangaId}:settei:${c.tagHandle || idx}`, 'settei');
          const refUrl = await uploadMangaAssetToStorage(
            supabase,
            userId,
            mangaId,
            `settei/${itemId}`,
            c.referenceBase64 || c.referenceViews?.front || c.referenceViews?.turnaround,
          );
          const category =
            c.entityType === 'prop' || c.entityType === 'location' || c.entityType === 'lore_rule'
              ? c.entityType
              : 'character';

          return {
            id: itemId,
            manga_id: mangaId,
            user_id: userId,
            category,
            name: c.name || 'Sin nombre',
            description: [c.appearance, c.clothing].filter(Boolean).join(' · '),
            visual_anchors: c.visualAnchors ?? [],
            seed: c.characterSeed || null,
            reference_image_url: refUrl,
            is_active: c.activeInCanon !== false,
          };
        }),
      );

      await supabase.from('settei_items').upsert(setteiPayload);
    }

    // Sync Pages & Vector Komas (`public.manga_pages`) + upload sketches & final ink renders
    for (let i = 0; i < normalized.pages.length; i += 1) {
      const pg = normalized.pages[i];
      const pageId = toStableUuid(pg.id || `${mangaId}:page:${i + 1}`, 'page');
      const komasWithUrls = await Promise.all(
        (pg.komas ?? []).map(async (k, kIdx) => {
          const komaKey = `pages/p${i + 1}_k${k.panelIndex || kIdx + 1}`;
          const [sketchUrl, inkUrl] = await Promise.all([
            uploadMangaAssetToStorage(supabase, userId, mangaId, `${komaKey}_sketch`, k.nemuSketchUrl),
            uploadMangaAssetToStorage(supabase, userId, mangaId, `${komaKey}_ink`, k.inkRenderUrl),
          ]);
          return {
            ...k,
            nemuSketchUrl: sketchUrl || (k.nemuSketchUrl?.startsWith('http') ? k.nemuSketchUrl : undefined),
            inkRenderUrl: inkUrl || (k.inkRenderUrl?.startsWith('http') ? k.inkRenderUrl : undefined),
          };
        }),
      );

      const pageFinalUrl =
        (await uploadMangaAssetToStorage(supabase, userId, mangaId, `pages/p${i + 1}_final`, pg.base64)) ||
        komasWithUrls.find((k) => k.inkRenderUrl)?.inkRenderUrl ||
        null;
      const pageSketchUrl = komasWithUrls.find((k) => k.nemuSketchUrl)?.nemuSketchUrl || null;

      await supabase.from('manga_pages').upsert({
        id: pageId,
        manga_id: mangaId,
        user_id: userId,
        page_number: i + 1,
        layout_data: {
          layoutTemplate: pg.layoutTemplate || '4_panel_classic',
          artStyle: pg.artStyle || 'Classic Shonen',
          prompt: pg.prompt || '',
          chapterBeat: pg.chapterBeat || '',
          castIds: pg.castIds ?? [],
          layersVisibility: pg.layersVisibility ?? DEFAULT_LAYERS_VISIBILITY,
          layerOpacity: pg.layerOpacity ?? DEFAULT_LAYER_OPACITY,
          komas: komasWithUrls,
        },
        sketch_url: pageSketchUrl,
        final_image_url: pageFinalUrl,
        updated_at: new Date().toISOString(),
      });
    }

    return 'supabase';
  } catch {
    return 'local';
  }
}
