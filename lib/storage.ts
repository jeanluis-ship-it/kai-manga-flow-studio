import { defaultPages, exampleProject, type MangaProject } from './schema';

const KEY = 'mangai-project-v2';

export function loadProject(): MangaProject {
  if (typeof window === 'undefined') return exampleProject;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return exampleProject;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return exampleProject;
    const p = parsed as Partial<MangaProject>;
    if (p.version !== 1 || !Array.isArray(p.characters) || typeof p.title !== 'string') {
      return exampleProject;
    }
    return {
      ...exampleProject,
      ...p,
      pages: p.pages && p.pages.length > 0 ? p.pages : defaultPages(p.characters[0] ? [p.characters[0].id] : []),
    };
  } catch {
    return exampleProject;
  }
}

export function saveProject(project: MangaProject) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(project));
  } catch {
    // If base64 images exceed localStorage quota (~5MB), persist metadata cleanly without failing.
    try {
      const lightweight: MangaProject = {
        ...project,
        coverWrapImage: '',
        characters: project.characters.map((c) => ({ ...c, referenceImage: '' })),
        pages: (project.pages ?? []).map((pg) => ({ ...pg, image: '' })),
      };
      window.localStorage.setItem(KEY, JSON.stringify(lightweight));
    } catch {
      /* Storage might be disabled; JSON export remains available. */
    }
  }
}

export function exportProject(project: MangaProject) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mangai-${(project.title || project.id).toLowerCase().replace(/[^a-z0-9-]+/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildKdpBundleSnapshot(project: MangaProject) {
  const totalPages = Math.max(24, Number(project.totalPages) || 100);
  const paperType = project.paperType === 'white' ? 'white' : 'cream';
  const multi = paperType === 'white' ? 0.002252 : 0.0025;
  const spineWidthInches = Number(Math.max(0.1, totalPages * multi).toFixed(3));
  const paperThicknessMm = Number(project.paperThicknessMm) || (paperType === 'white' ? 0.1 : 0.12);
  const spineWidthMm = Number(((totalPages / 2) * paperThicknessMm).toFixed(2));
  const pages = project.pages && project.pages.length > 0 ? project.pages : defaultPages();

  return {
    schema_version: '01_supabase_settei_schema.sql',
    exported_at: new Date().toISOString(),
    kdp_print_spec: {
      trim_size: '6x9 in / B6 Tankobon',
      bleed_in: 0.125,
      bleed_mm: 3.5,
      target_dpi: 600,
      paper_type: paperType,
      total_pages: totalPages,
      spine_width_in: spineWidthInches,
      spine_width_mm: spineWidthMm,
    },
    project: {
      id: project.id,
      title: project.title,
      author: project.author || 'Studio MANGAI',
      genre: project.genre,
      synopsis: project.premise,
      world: project.world,
      world_rules: project.worldRules,
      preferred_model: project.selectedModel || 'gemini-3-pro-image',
      cover_prompt: project.coverPrompt || '',
      has_cover_wrap: Boolean(project.coverWrapImage),
    },
    settei_bibles: project.characters.map((c) => ({
      id: c.id,
      character_name: c.name,
      role: c.role,
      visual_anchors: c.appearance,
      wardrobe: c.wardrobe,
      visual_style: c.visualStyle,
      canon_locked: c.canonLocked,
      has_reference_sheet: Boolean(c.referenceImage),
    })),
    pages: pages.map((pg) => ({
      id: pg.id,
      page_number: pg.pageNumber,
      art_style: pg.artStyle,
      cast_ids: pg.castIds,
      prompt: pg.prompt,
      model_used: pg.modelUsed || '',
      ink_ready: Boolean(pg.image),
    })),
  };
}

export function exportKdpBundleSnapshot(project: MangaProject) {
  const snapshot = buildKdpBundleSnapshot(project);
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(project.title || 'manga').replace(/\s+/g, '_')}_KDP_BUNDLE.json`;
  a.click();
  URL.revokeObjectURL(url);
}
