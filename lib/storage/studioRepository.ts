import { getPolygonBounds, KOMA_LAYOUT_PRESETS, type KomaLayoutId } from '@/lib/kai/schema';
import { computeSpineInches, PRINT_PRESETS, type TrimFormatId } from '@/lib/print/presets';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
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

function isProjectWorthMigrating(project: StudioProjectRecord | null): project is StudioProjectRecord {
  if (!project) return false;
  return (
    project.name !== 'Manga sin título' ||
    project.characters.length > 0 ||
    project.pages.length > 1 ||
    Boolean(project.cover.frontBase64 || project.cover.fullWrapBase64 || project.cover.prompt)
  );
}

function mapSupabaseEntity(
  e: Record<string, unknown>,
  metaCache: SupabaseProjectMetaCache | null,
): StudioCharacterRecord {
  const turnaround = (e.turnaround_urls ?? {}) as Record<string, unknown>;
  const tagHandle = String(e.tag_handle || '');
  const cachedChar = metaCache?.characters?.[tagHandle] || metaCache?.characters?.[String(e.id || '')];
  const refViews = sanitizeReferenceViews({
    turnaround:
      typeof turnaround.turnaround === 'string'
        ? turnaround.turnaround
        : cachedChar?.referenceViews?.turnaround,
    front:
      typeof turnaround.front === 'string'
        ? turnaround.front
        : cachedChar?.referenceViews?.front,
    detail:
      typeof turnaround.detail === 'string'
        ? turnaround.detail
        : cachedChar?.referenceViews?.detail,
  });

  const activeInCanon =
    typeof turnaround.activeInCanon === 'boolean'
      ? turnaround.activeInCanon
      : typeof cachedChar?.activeInCanon === 'boolean'
      ? cachedChar.activeInCanon
      : true;

  return {
    id: String(e.id),
    entityType: (e.entity_type as SetteiEntityType) || 'character',
    tagHandle,
    name: String(e.name || 'Sin nombre'),
    appearance: String(e.role_or_summary || ''),
    clothing: '',
    role: e.entity_type === 'character' ? 'Protagonista' : String(e.entity_type || 'character'),
    visualAnchors: Array.isArray(e.visual_anchors) ? (e.visual_anchors as string[]) : [],
    seedLocked: Boolean(e.seed_locked),
    characterSeed: typeof e.character_seed === 'string' ? e.character_seed : undefined,
    referenceBase64:
      (typeof turnaround.front === 'string' && turnaround.front) ||
      cachedChar?.referenceBase64 ||
      undefined,
    activeInCanon,
    ...(refViews ? { referenceViews: refViews } : {}),
  };
}

/**
 * Loads the user's project list from Supabase (when signed in) or from the
 * local Beta profile / guest storage.
 */
export async function loadUserProjectList(): Promise<StudioProjectRecord[]> {
  const supabase = getSupabaseBrowserClient();

  if (supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user?.id) {
        const { data: projects } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', session.user.id)
          .order('updated_at', { ascending: false })
          .limit(20);

        if (Array.isArray(projects) && projects.length > 0) {
          return projects.map((row) => {
            const meta = readSupabaseMetaCache(row.id);
            return hydrateProjectShape({
              id: row.id,
              name: row.title,
              author: session.user.user_metadata?.display_name || 'Autor',
              pageCount: row.target_page_count,
              paperType: row.paper_type === 'cream' ? 'cream' : 'white',
              trimFormat: (row.trim_format as TrimFormatId) || 'tankobon_b6',
              readingDirection: row.reading_direction === 'ltr' ? 'ltr' : 'rtl',
              colorMode: meta?.colorMode,
              bindingType: meta?.bindingType,
              volumeSlug: meta?.volumeSlug,
              characters: [],
              pages: createInitialStudioProject(createId('page')).pages,
              cover: {
                frontBase64: meta?.frontBase64 || row.cover_image_url || '',
                backBase64: meta?.backBase64 || row.cover_image_url || '',
                fullWrapBase64: meta?.fullWrapBase64 || row.cover_image_url || '',
                prompt: row.cover_prompt || '',
                spineWidthInches: Number(row.spine_width_in) || 0.2252,
                isbn: row.isbn || '978-9945-0000-0-0',
                includeIsbn: Boolean(row.isbn ?? true),
                spineTitle: meta?.spineTitle || '',
                backSynopsis: typeof row.synopsis === 'string' ? row.synopsis : meta?.backSynopsis || '',
              },
            });
          });
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
 * Loads the active studio project from Supabase when configured + signed in,
 * migrating guest work if the cloud workspace is empty, and degrading cleanly
 * to local profile / localStorage in Beta/Guest mode.
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
        const { data: projects } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', session.user.id)
          .order('updated_at', { ascending: false })
          .limit(1);

        const row = projects?.[0];
        if (row) {
          const metaCache = readSupabaseMetaCache(row.id);
          const [{ data: entities }, { data: pageRows }] = await Promise.all([
            supabase.from('settei_entities').select('*').eq('project_id', row.id),
            supabase
              .from('pages')
              .select('*')
              .eq('project_id', row.id)
              .order('page_number', { ascending: true }),
          ]);

          const pageIds = (pageRows ?? []).map((p) => p.id);
          const { data: komaRows } =
            pageIds.length > 0
              ? await supabase
                  .from('komas')
                  .select('*')
                  .in('page_id', pageIds)
                  .order('panel_index', { ascending: true })
              : { data: [] };

          const komasByPage = new Map<string, Koma[]>();
          for (const k of komaRows ?? []) {
            const list = komasByPage.get(k.page_id) ?? [];
            list.push({
              id: k.id,
              panelIndex: k.panel_index,
              state: (k.state as KomaState) || 'VACIO',
              polygonCoords: Array.isArray(k.polygon_coords) ? k.polygon_coords : [],
              cameraAngle: k.camera_angle || 'Plano Medio',
              taggedHandles: Array.isArray(k.tagged_handles) ? k.tagged_handles : [],
              actionPrompt: k.action_prompt || '',
              nemuSketchUrl: k.nemu_sketch_url || undefined,
              inkRenderUrl: k.ink_render_url || undefined,
              screentonePreset: k.screentone_preset || undefined,
              dialogues: Array.isArray(k.dialogues) ? k.dialogues : [],
              sfxItems: Array.isArray(k.sfx_items) ? k.sfx_items : [],
            });
            komasByPage.set(k.page_id, list);
          }

          const mapped = hydrateProjectShape({
            id: row.id,
            name: row.title,
            author:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.display_name ||
              'Autor',
            pageCount: row.target_page_count,
            paperType: row.paper_type === 'cream' ? 'cream' : 'white',
            trimFormat: (row.trim_format as TrimFormatId) || 'tankobon_b6',
            readingDirection: row.reading_direction === 'ltr' ? 'ltr' : 'rtl',
            colorMode: metaCache?.colorMode,
            bindingType: metaCache?.bindingType,
            volumeSlug: metaCache?.volumeSlug,
            characters: (entities ?? []).map((e) =>
              mapSupabaseEntity(e as Record<string, unknown>, metaCache),
            ),
            pages: (pageRows ?? []).map((pg) => ({
              id: pg.id,
              base64: '',
              prompt: pg.chapter_beat || '',
              artStyle: row.style_preset || 'Classic Shonen',
              castIds: [],
              layoutTemplate: (pg.layout_template as KomaLayoutId) || '4_panel_classic',
              chapterBeat: pg.chapter_beat || '',
              layersVisibility:
                pg.layers_visibility && typeof pg.layers_visibility === 'object'
                  ? (pg.layers_visibility as LayersVisibility)
                  : { ...DEFAULT_LAYERS_VISIBILITY },
              komas: komasByPage.get(pg.id) ?? [],
            })),
            cover: {
              frontBase64: metaCache?.frontBase64 || row.cover_image_url || '',
              backBase64: metaCache?.backBase64 || row.cover_image_url || '',
              fullWrapBase64: metaCache?.fullWrapBase64 || row.cover_image_url || '',
              prompt: row.cover_prompt || '',
              spineWidthInches: Number(row.spine_width_in) || 0.2252,
              isbn: row.isbn || '978-9945-0000-0-0',
              includeIsbn: Boolean(row.isbn ?? true),
              spineTitle: metaCache?.spineTitle || '',
              backSynopsis: typeof row.synopsis === 'string' ? row.synopsis : metaCache?.backSynopsis || '',
            },
          });

          writeLocalProject(mapped);
          return { project: mapped, mode: 'supabase' };
        }

        // Guest -> Signed-in migration when cloud account has no projects yet
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
 * Persists the project locally (and per local user profile when active),
 * and synchronizes to Supabase when an authenticated session is active.
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

    const projectId = isUuid(normalized.id) ? normalized.id! : createId('proj');
    writeSupabaseMetaCache(projectId, normalized);

    await supabase.from('profiles').upsert({
      id: session.user.id,
      display_name: normalized.author || session.user.email || 'Mangaka',
    });

    const { error: projErr } = await supabase.from('projects').upsert({
      id: projectId,
      user_id: session.user.id,
      title: normalized.name || 'Sin Título',
      synopsis: normalized.cover.backSynopsis || null,
      reading_direction: normalized.readingDirection || 'rtl',
      trim_format: normalized.trimFormat || 'tankobon_b6',
      target_page_count: normalized.pageCount,
      paper_type: normalized.paperType === 'cream' ? 'cream' : 'white_standard',
      spine_width_in: Number(normalized.cover.spineWidthInches.toFixed(4)),
      isbn: normalized.cover.includeIsbn === false ? null : normalized.cover.isbn || null,
      cover_prompt: normalized.cover.prompt || null,
      cover_image_url: normalized.cover.fullWrapBase64?.startsWith('http')
        ? normalized.cover.fullWrapBase64
        : normalized.cover.frontBase64?.startsWith('http')
        ? normalized.cover.frontBase64
        : null,
    });
    if (projErr) return 'local';

    if (normalized.characters.length > 0) {
      await supabase.from('settei_entities').upsert(
        normalized.characters.map((c, idx) => {
          const turnaroundUrls: Record<string, unknown> = {
            activeInCanon: c.activeInCanon !== false,
          };
          if (c.referenceBase64 && c.referenceBase64.startsWith('http')) {
            turnaroundUrls.front = c.referenceBase64;
          }
          if (c.referenceViews?.turnaround?.startsWith('http')) {
            turnaroundUrls.turnaround = c.referenceViews.turnaround;
          }
          if (c.referenceViews?.front?.startsWith('http')) {
            turnaroundUrls.front = c.referenceViews.front;
          }
          if (c.referenceViews?.detail?.startsWith('http')) {
            turnaroundUrls.detail = c.referenceViews.detail;
          }

          return {
            id: isUuid(c.id) ? c.id : createId('ent'),
            project_id: projectId,
            entity_type: c.entityType || 'character',
            tag_handle: normalizeTagHandle(c.tagHandle || '', c.name || `Settei${idx + 1}`),
            name: c.name || 'Sin nombre',
            role_or_summary: [c.appearance, c.clothing].filter(Boolean).join(' · ') || null,
            visual_anchors: c.visualAnchors ?? [],
            seed_locked: Boolean(c.seedLocked),
            character_seed: c.characterSeed || null,
            turnaround_urls: turnaroundUrls,
          };
        }),
        { onConflict: 'project_id,tag_handle' },
      );
    }

    for (let i = 0; i < normalized.pages.length; i++) {
      const pg = normalized.pages[i];
      const pageUuid = isUuid(pg.id) ? pg.id : createId('page');
      const { data: savedPage } = await supabase
        .from('pages')
        .upsert(
          {
            id: pageUuid,
            project_id: projectId,
            page_number: i + 1,
            layout_template: pg.layoutTemplate || '4_panel_classic',
            chapter_beat: pg.chapterBeat || pg.prompt || null,
            layers_visibility: pg.layersVisibility ?? DEFAULT_LAYERS_VISIBILITY,
            status: (pg.komas ?? []).some((k) => k.inkRenderUrl) ? 'inked' : 'draft',
          },
          { onConflict: 'project_id,page_number' },
        )
        .select('id')
        .single();

      const resolvedPageId = savedPage?.id || pageUuid;
      const komas = pg.komas ?? [];
      if (komas.length > 0) {
        await supabase.from('komas').upsert(
          komas.map((k, kIdx) => ({
            id: isUuid(k.id) ? k.id : createId('koma'),
            page_id: resolvedPageId,
            panel_index: k.panelIndex || kIdx + 1,
            state: k.state || 'VACIO',
            polygon_coords: k.polygonCoords,
            camera_angle: k.cameraAngle || 'Plano Medio',
            tagged_handles: k.taggedHandles ?? [],
            action_prompt: k.actionPrompt || null,
            ink_render_url: k.inkRenderUrl?.startsWith('http') ? k.inkRenderUrl : null,
            screentone_preset: k.screentonePreset || 'none',
            dialogues: k.dialogues ?? [],
            sfx_items: k.sfxItems ?? [],
          })),
          { onConflict: 'page_id,panel_index' },
        );
      }
    }

    return 'supabase';
  } catch {
    return 'local';
  }
}
