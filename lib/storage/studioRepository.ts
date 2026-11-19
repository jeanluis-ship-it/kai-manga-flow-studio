import { KOMA_LAYOUT_PRESETS, type KomaLayoutId } from '@/lib/kai/schema';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  normalizeTagHandle,
  type Character,
  type Koma,
  type KomaState,
  type Page,
  type Project,
  type SetteiEntityType,
} from '@/app/studio/types';

export const STUDIO_STORAGE_KEY = 'mangai-flow-studio-v1';

export type StorageMode = 'supabase' | 'local';

function createId(prefix: string): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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
      screentonePreset: prev?.screentonePreset,
      dialogues: Array.isArray(prev?.dialogues) ? prev.dialogues : [],
      sfxItems: Array.isArray(prev?.sfxItems) ? prev.sfxItems : [],
    };
  });
}

export function createInitialStudioProject(pageId = 'page-1'): Project {
  return {
    id: createId('proj'),
    name: 'Manga sin título',
    author: 'Autor',
    pageCount: 100,
    paperType: 'white',
    readingDirection: 'rtl',
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
        komas: buildKomasForLayout('4_panel_classic', [], pageId),
      },
    ],
    cover: {
      frontBase64: '',
      backBase64: '',
      fullWrapBase64: '',
      prompt: '',
      spineWidthInches: 0.2252,
    },
  };
}

function hydrateProjectShape(parsed: Partial<Project>): Project {
  const paperType = parsed.paperType === 'cream' ? 'cream' : 'white';
  const pageCount =
    typeof parsed.pageCount === 'number' && parsed.pageCount > 0 ? parsed.pageCount : 100;
  const multi = paperType === 'white' ? 0.002252 : 0.0025;

  const characters: Character[] = Array.isArray(parsed.characters)
    ? parsed.characters.map((c, idx) => ({
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
        referenceBase64: c.referenceBase64,
      }))
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
        ? existingKomas.map((k, kIdx) => ({
            ...k,
            id: k.id || `${pid}-koma-${kIdx + 1}`,
            panelIndex: k.panelIndex || kIdx + 1,
            state: (k.state as KomaState) || 'VACIO',
            polygonCoords:
              Array.isArray(k.polygonCoords) && k.polygonCoords.length >= 3
                ? k.polygonCoords
                : KOMA_LAYOUT_PRESETS[layoutTemplate].panels[kIdx] ??
                  KOMA_LAYOUT_PRESETS['4_panel_classic'].panels[0],
            cameraAngle: k.cameraAngle || 'Plano Medio',
            taggedHandles: Array.isArray(k.taggedHandles) ? k.taggedHandles : [],
            actionPrompt: k.actionPrompt ?? '',
            dialogues: Array.isArray(k.dialogues) ? k.dialogues : [],
            sfxItems: Array.isArray(k.sfxItems) ? k.sfxItems : [],
          }))
        : buildKomasForLayout(layoutTemplate, [], pid);

    return {
      id: pid,
      base64: typeof p.base64 === 'string' ? p.base64 : '',
      prompt: typeof p.prompt === 'string' ? p.prompt : '',
      artStyle: typeof p.artStyle === 'string' ? p.artStyle : 'Classic Shonen',
      castIds: Array.isArray(p.castIds) ? p.castIds : [],
      layoutTemplate,
      chapterBeat: typeof p.chapterBeat === 'string' ? p.chapterBeat : '',
      komas,
    };
  });

  return {
    id: typeof parsed.id === 'string' && parsed.id ? parsed.id : createId('proj'),
    name: parsed.name || 'Manga sin título',
    author: typeof parsed.author === 'string' ? parsed.author : 'Autor',
    pageCount,
    paperType,
    readingDirection: parsed.readingDirection === 'ltr' ? 'ltr' : 'rtl',
    characters,
    pages,
    cover: {
      frontBase64: parsed.cover?.frontBase64 ?? '',
      backBase64: parsed.cover?.backBase64 ?? '',
      fullWrapBase64: parsed.cover?.fullWrapBase64 ?? '',
      prompt: parsed.cover?.prompt ?? '',
      spineWidthInches:
        typeof parsed.cover?.spineWidthInches === 'number'
          ? parsed.cover.spineWidthInches
          : Math.max(0.1, pageCount * multi),
    },
  };
}

function readLocalProject(): Project | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STUDIO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Project>;
    if (!parsed || typeof parsed.name !== 'string') return null;
    return hydrateProjectShape(parsed);
  } catch {
    return null;
  }
}

function writeLocalProject(project: Project): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(project));
  } catch {
    try {
      const lightweight: Project = {
        ...project,
        characters: project.characters.map((c) => ({ ...c, referenceBase64: undefined })),
        pages: project.pages.map((p) => ({
          ...p,
          base64: '',
          komas: (p.komas ?? []).map((k) => ({ ...k, inkRenderUrl: undefined, nemuSketchUrl: undefined })),
        })),
        cover: { ...project.cover, frontBase64: '', backBase64: '', fullWrapBase64: undefined },
      };
      window.localStorage.setItem(STUDIO_STORAGE_KEY, JSON.stringify(lightweight));
    } catch {
      // Ignore storage quota overflow gracefully.
    }
  }
}

function isUuid(val?: string): boolean {
  return Boolean(
    val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val),
  );
}

/**
 * Loads the active studio project from Supabase when configured + signed in,
 * degrading cleanly to localStorage in guest/demo mode.
 */
export async function loadStudioProject(): Promise<{ project: Project; mode: StorageMode }> {
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
            author: session.user.user_metadata?.display_name || 'Autor',
            pageCount: row.target_page_count,
            paperType: row.paper_type === 'cream' ? 'cream' : 'white',
            readingDirection: row.reading_direction === 'ltr' ? 'ltr' : 'rtl',
            characters: (entities ?? []).map((e) => ({
              id: e.id,
              entityType: e.entity_type,
              tagHandle: e.tag_handle,
              name: e.name,
              appearance: e.role_or_summary || '',
              clothing: '',
              role: e.entity_type === 'character' ? 'Protagonista' : e.entity_type,
              visualAnchors: Array.isArray(e.visual_anchors) ? e.visual_anchors : [],
              seedLocked: Boolean(e.seed_locked),
              characterSeed: e.character_seed || undefined,
              referenceBase64: e.turnaround_urls?.front || undefined,
            })),
            pages: (pageRows ?? []).map((pg) => ({
              id: pg.id,
              base64: '',
              prompt: pg.chapter_beat || '',
              artStyle: row.style_preset || 'Classic Shonen',
              castIds: [],
              layoutTemplate: (pg.layout_template as KomaLayoutId) || '4_panel_classic',
              chapterBeat: pg.chapter_beat || '',
              komas: komasByPage.get(pg.id) ?? [],
            })),
            cover: {
              frontBase64: row.cover_image_url || '',
              backBase64: row.cover_image_url || '',
              fullWrapBase64: row.cover_image_url || '',
              prompt: row.cover_prompt || '',
              spineWidthInches: Number(row.spine_width_in) || 0.2252,
            },
          });

          writeLocalProject(mapped);
          return { project: mapped, mode: 'supabase' };
        }
      }
    } catch {
      // Fall back cleanly to localStorage if Supabase network/session fails.
    }
  }

  const local = readLocalProject();
  if (local) {
    return { project: local, mode: 'local' };
  }
  return { project: createInitialStudioProject(createId('page')), mode: 'local' };
}

/**
 * Persists the project locally and synchronizes to Supabase when an authenticated
 * session is active.
 */
export async function saveStudioProject(project: Project): Promise<StorageMode> {
  writeLocalProject(project);

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return 'local';

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) return 'local';

    const projectId = isUuid(project.id) ? project.id! : createId('proj');

    await supabase.from('profiles').upsert({
      id: session.user.id,
      display_name: project.author || session.user.email || 'Mangaka',
    });

    const { error: projErr } = await supabase.from('projects').upsert({
      id: projectId,
      user_id: session.user.id,
      title: project.name || 'Sin Título',
      reading_direction: project.readingDirection || 'rtl',
      target_page_count: project.pageCount,
      paper_type: project.paperType === 'cream' ? 'cream' : 'white_standard',
      spine_width_in: Number(project.cover.spineWidthInches.toFixed(4)),
      cover_prompt: project.cover.prompt || null,
      cover_image_url: project.cover.fullWrapBase64?.startsWith('http')
        ? project.cover.fullWrapBase64
        : null,
    });
    if (projErr) return 'local';

    if (project.characters.length > 0) {
      await supabase.from('settei_entities').upsert(
        project.characters.map((c, idx) => ({
          id: isUuid(c.id) ? c.id : createId('ent'),
          project_id: projectId,
          entity_type: c.entityType || 'character',
          tag_handle: normalizeTagHandle(c.tagHandle || '', c.name || `Settei${idx + 1}`),
          name: c.name || 'Sin nombre',
          role_or_summary: [c.appearance, c.clothing].filter(Boolean).join(' · ') || null,
          visual_anchors: c.visualAnchors ?? [],
          seed_locked: Boolean(c.seedLocked),
          character_seed: c.characterSeed || null,
          turnaround_urls:
            c.referenceBase64 && c.referenceBase64.startsWith('http')
              ? { front: c.referenceBase64 }
              : {},
        })),
        { onConflict: 'project_id,tag_handle' },
      );
    }

    for (let i = 0; i < project.pages.length; i++) {
      const pg = project.pages[i];
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
