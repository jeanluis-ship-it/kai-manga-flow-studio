import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.cwd();
const load = (p) => readFileSync(join(base, p), 'utf8');

test('Studio Shell: KAI docked never blocked/dimmed by .gf-modal-backdrop and preserves L0-L6 & no .gf-kai-backdrop', () => {
  const css = load('app/studio/studio.css');
  assert.match(css, /\.gf-kai-docked\s*\{/);
  assert.doesNotMatch(css, /\.gf-kai-backdrop\s*\{/);
  assert.match(css, /\.gf-sidebar-right\.gf-sidebar-right-docked\s*\{[\s\S]*?z-index:\s*130;/);
  assert.match(css, /\.manga-grid:not\(\.is-right-collapsed\)\s*~\s*\.gf-modal-backdrop\s*\{[\s\S]*?right:\s*368px;/);
  assert.match(css, /\.gf-canvas-shell\s+\.gf-modal-backdrop/);

  // Preserve L0-L6 z-indexes 10..70
  assert.match(css, /\.gf-layer-l0\s*\{\s*z-index:\s*10;/);
  assert.match(css, /\.gf-layer-l6\s*\{[\s\S]*?z-index:\s*70;/);
});

test('Studio Shell: page.tsx keeps KAI open, listens to cross-worker contracts, and supports Llave IA & Beta local session', () => {
  const page = load('app/studio/page.tsx');
  assert.doesNotMatch(page, /Kai \+ Lienzo IA/);
  assert.match(page, /Tabla de Dibujo/);
  assert.match(page, /<DrawingTabletWorkbench/);
  assert.match(page, /<KaiCopilotDrawer/);

  // Always opens docked KAI on view select
  assert.match(page, /const handleSelectView[\s\S]*?setRightPanelCollapsed\(false\)/);

  // Cross-worker event contracts
  assert.match(page, /window\.addEventListener\(['"]mangai-kai-ask['"]/);
  assert.match(page, /window\.addEventListener\(['"]mangai-koma-sketch-bridge['"]/);
  assert.match(page, /mangai-pending-koma-sketch/);

  // Llave IA + Beta local session + per-user project persistence + volume deep-link
  assert.match(page, /mangai-google-key-v1/);
  assert.match(page, /Llave IA/);
  assert.match(page, /mangai-local-session-v1/);
  assert.match(page, /mangai-user-projects-v1:/);
  assert.match(page, /getSeedProjectForVolume/);
  assert.match(page, /isStarterBlankProject/);
});

test('Studio Shell: KaiCopilotDrawer supports 4. Viñetas pipeline, Settei draft/autofill bridge, and activeInCanon filter', () => {
  const kai = load('app/studio/components/KaiCopilotDrawer.tsx');
  assert.match(kai, /'4\. Viñetas'/);
  assert.match(kai, /window\.addEventListener\(['"]mangai-settei-draft['"]/);
  assert.match(kai, /Editando Ficha Settei:/);
  assert.match(kai, /Rellenar Ficha Settei Abierta/);
  assert.match(kai, /new CustomEvent\(['"]mangai-settei-autofill['"]/);

  // Per-section 1-click actions
  assert.match(kai, /Autocompletar Obra \(Título \+ Sinopsis\)/);
  assert.match(kai, /Aplicar Prompt a Portada/);
  assert.match(kai, /Generar Portada 16:9/);
  assert.match(kai, /c\.activeInCanon !== false/);
  assert.match(kai, /characterSeed/);
  assert.match(kai, /project\.colorMode/);
});

test('Studio Shell: types.ts & presets.ts implement ColorMode, BindingType, backward-compatible spine, and computePrintBudget', () => {
  const types = load('app/studio/types.ts');
  assert.match(
    types,
    /export type StudioView\s*=\s*'project'\s*\|\s*'characters'\s*\|\s*'cover'\s*\|\s*'pages'\s*\|\s*'drawing_tablet'/,
  );
  assert.match(types, /export type ColorMode\s*=\s*'bw'\s*\|\s*'color'/);
  assert.match(types, /export type BindingType\s*=\s*'rustica_pegada'\s*\|\s*'tapa_dura'\s*\|\s*'grapa'/);
  assert.match(types, /activeInCanon\?:\s*boolean/);
  assert.match(types, /referenceViews\?:/);
  assert.match(types, /volumeSlug\?:\s*string/);

  const presets = load('lib/print/presets.ts');
  assert.match(presets, /export function computeSpineInches\(/);
  assert.match(presets, /export function computePrintBudget\(/);
  assert.match(presets, /suggestedPvpUsd/);
  assert.match(presets, /unitWeightGrams/);
  assert.match(presets, /tankobon_b6/);
  assert.match(presets, /b4_canva_pro/);
  assert.match(presets, /kdp_6x9/);
});

test('Studio Shell: ProjectManager supports ColorMode, BindingType, live copies budget, and KAI bridge', () => {
  assert.ok(existsSync(join(base, 'app/studio/components/ProjectManager.css')));
  const pm = load('app/studio/components/ProjectManager.tsx');
  assert.match(pm, /import\s+['"]\.\/ProjectManager\.css['"]/);
  assert.match(pm, /Blanco y Negro/);
  assert.match(pm, /Rústica Pegada/);
  assert.match(pm, /Tapa Dura/);
  assert.match(pm, /Grapa/);
  assert.match(pm, /computePrintBudget/);
  assert.match(pm, /\[1,\s*10,\s*50,\s*100,\s*500\]/);
  assert.match(pm, /Asistir Obra y Sinopsis con KAI/);
  assert.match(pm, /mangai-kai-ask/);
});

test('Studio Shell: CoverDesigner supports Full Wrap / Front / Back tabs, #00AEEF guides toggle, uploads, and Canvas PNG export', () => {
  assert.ok(existsSync(join(base, 'app/studio/components/CoverDesigner.css')));
  const cover = load('app/studio/components/CoverDesigner.tsx');
  assert.match(cover, /import\s+['"]\.\/CoverDesigner\.css['"]/);
  assert.match(cover, /Full Wrap 16:9/);
  assert.match(cover, /Portada Frontal/);
  assert.match(cover, /Contraportada \+ EAN-13/);
  assert.match(cover, /Guías de Corte \/ Sangrado/);
  assert.match(cover, /Diseñar Portada con KAI/);
  assert.match(cover, /mangai-kai-ask/);
  assert.match(cover, /document\.createElement\(['"]canvas['"]\)/);
  assert.match(cover, /cover_\$\{slugifyFilename\(project\.name\)\}\.png/);
  assert.doesNotMatch(cover, /window\.print\(\)/);
});

test('Studio Shell: seedProjects.ts provides AnaCaona, Hijos del Huracán, and all 10 landing volumes', () => {
  assert.ok(existsSync(join(base, 'lib/storage/seedProjects.ts')));
  const seed = load('lib/storage/seedProjects.ts');
  for (const id of [
    'anacaona-vol1',
    'huracan-vol2',
    'atlas-sketchbook',
    'nox-signal-vol2',
    'kuro-vol1',
    'eclipse-vol1',
    'akai-ronin-vol1',
    'kaze-orbit-vol1',
    'yokai-archive-vol1',
    'sensei-ink-vol1',
  ]) {
    assert.ok(seed.includes(id), `Missing landing volume seed: ${id}`);
  }
  assert.match(seed, /AnaCaona: Flor Guerrera/);
  assert.match(seed, /Hijos del Huracán/);
  assert.match(seed, /\/landing\/assets\/mangai-art-/);
  assert.match(seed, /export function getSeedProjectForVolume/);
  assert.match(seed, /export function isStarterBlankProject/);
});
