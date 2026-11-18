import { defaultKomas, exampleProject, type MangaProject } from './schema';

const KEY = 'mangai-project-v1';

export function loadProject(): MangaProject {
  if (typeof window === 'undefined') return exampleProject;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return exampleProject;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return exampleProject;
    const p = parsed as Partial<MangaProject>;
    if (p.version !== 1 || !Array.isArray(p.characters) || typeof p.title !== 'string') return exampleProject;
    return p as MangaProject;
  } catch {
    return exampleProject;
  }
}

export function saveProject(project: MangaProject) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(project));
  } catch {
    /* Storage might be disabled; JSON export remains available. */
  }
}

export function exportProject(project: MangaProject) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mangai-${project.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildSupabaseSnapshot(project: MangaProject) {
  const userId = '00000000-0000-4000-8000-000000000001';
  const pageId = `${project.id}-page-01`;
  const komas = project.komas && project.komas.length > 0 ? project.komas : defaultKomas();
  const totalPages = Number.isFinite(project.totalPages) && (project.totalPages ?? 0) > 0 ? Number(project.totalPages) : 192;
  const paperThicknessMm =
    Number.isFinite(project.paperThicknessMm) && (project.paperThicknessMm ?? 0) > 0
      ? Number(project.paperThicknessMm)
      : 0.12;
  const spineWidthMm = Number(((totalPages / 2) * paperThicknessMm).toFixed(2));
  const lockedCount = komas.filter((k) => k.state === 'LOCKED').length;
  const allLocked = komas.length > 0 && lockedCount === komas.length;

  return {
    schema_version: '01_supabase_settei_schema.sql',
    exported_at: new Date().toISOString(),
    profiles: [
      {
        id: userId,
        display_name: 'Mangaka Studio',
        tier: 'pro',
        render_credits: 50,
      },
    ],
    projects: [
      {
        id: project.id,
        user_id: userId,
        title: project.title,
        synopsis: project.premise,
        genre: project.genre,
        reading_direction: 'rtl',
        current_stage: allLocked ? '06_tankobon_print' : '04_shitagaki_pen_ire',
        paper_thickness_mm: paperThicknessMm,
        bleed_mm: 3.5,
        target_dpi: 600,
        cover_data: {
          planned_pages: totalPages,
          spine_width_mm: spineWidthMm,
        },
      },
    ],
    settei_bibles: project.characters.map((c) => ({
      id: c.id,
      project_id: project.id,
      character_name: c.name,
      entity_type: 'character',
      visual_anchors: c.appearance,
      style_preset: {
        visual_style: c.visualStyle,
        canon_locked: c.canonLocked,
        status: c.status,
      },
      base_prompt_token: `${c.name} (${c.role}, ${c.age}): ${c.appearance}. Vestuario: ${c.wardrobe}`,
    })),
    pages: [
      {
        id: pageId,
        project_id: project.id,
        page_number: 1,
        is_double_spread: false,
        script_data: {
          title: project.title,
          world: project.world,
          world_rules: project.worldRules,
        },
        preflight_status: {
          valid: komas.length >= 4 && komas.length <= 7,
          locked_komas: lockedCount,
          total_komas: komas.length,
          spine_width_mm: spineWidthMm,
          bleed_mm: 3.5,
          target_dpi: 600,
        },
        is_approved: allLocked,
      },
    ],
    komas: komas.map((k) => ({
      id: k.id,
      page_id: pageId,
      panel_index: k.panelIndex,
      state: k.state,
      route: k.route,
      camera_angle: k.cameraAngle,
      action_prompt: k.actionPrompt,
      layers: {
        L0_nemu_draft: k.state !== 'VACIO' ? { state: k.state, active: true } : null,
        L1_screentones_beta: k.screentoneL1 && k.screentoneL1 !== 'none' ? k.screentoneL1 : null,
        L2_ink_art: ['PEN_IRE', 'TONE_FX', 'SHIAGE', 'LOCKED'].includes(k.state)
          ? { route: k.route, inked: true }
          : null,
        L3_panel_borders_fx: { border_mm: 0.8, camera_angle: k.cameraAngle },
        L4_sfx_kakimoji: k.sfxL4.trim() ? [{ text: k.sfxL4.trim(), style: 'headline-xl-sumi' }] : [],
        L5_text_balloons: k.dialogueL5.trim()
          ? [{ text: k.dialogueL5.trim(), zone: 'top_right_reserved', within_naiwaku: true }]
          : [],
        L6_ui_guides: { visible_on_screen: true, exclude_on_export: true },
      },
    })),
  };
}

export function exportSupabaseSnapshot(project: MangaProject) {
  const snapshot = buildSupabaseSnapshot(project);
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mangai-supabase-snapshot-${project.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
