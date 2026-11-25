import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.cwd();
const load = (p) => readFileSync(join(base, p), 'utf8');

function assertBalancedBraces(css, filename) {
  let depth = 0;
  for (const ch of css) {
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    assert.ok(depth >= 0, `Unmatched closing brace in ${filename}`);
  }
  assert.equal(depth, 0, `Unclosed brace(s) in ${filename}`);
}

test('Settei Bridge helper defines exact cross-worker event names and helpers', () => {
  const path = 'lib/kai/setteiBridge.ts';
  assert.ok(existsSync(join(base, path)), 'lib/kai/setteiBridge.ts must exist');
  const src = load(path);

  for (const token of [
    'mangai-settei-draft',
    'mangai-settei-autofill',
    'mangai-kai-ask',
    'mangai-koma-sketch-bridge',
    'mangai-pending-koma-sketch',
    'dispatchSetteiDraft',
    'dispatchKaiAsk',
    'mergeSetteiAutofill',
    'buildSetteiKaiPrompt',
    'readPendingKomaSketch',
    'clearPendingKomaSketch',
  ]) {
    assert.ok(src.includes(token), `Missing token ${token} in ${path}`);
  }
});

test('Settei Visual Bible: non-blocking workspace drawer, CRUD tabs, activeInCanon, and reference views', () => {
  const tsx = load('app/studio/components/CharacterLibrary.tsx');
  const cssPath = 'app/studio/components/CharacterLibrary.css';
  assert.ok(existsSync(join(base, cssPath)), 'CharacterLibrary.css must exist');
  const css = load(cssPath);

  assert.match(tsx, /import\s+['"]\.\/CharacterLibrary\.css['"]/);
  assert.match(tsx, /type SetteiCharacter\s*=\s*Character\s*&/);
  assert.match(tsx, /activeInCanon\?:\s*boolean/);
  assert.match(tsx, /referenceViews\?:\s*SetteiReferenceViews/);

  // Non-blocking editor contract: NO modal backdrop in CharacterLibrary
  assert.doesNotMatch(tsx, /gf-modal-backdrop/, 'CharacterLibrary must NOT render gf-modal-backdrop');
  assert.match(tsx, /gf-settei-workspace-drawer/, 'Must render workspace-scoped drawer');
  assert.match(css, /\.gf-settei-workspace-drawer\s*\{/);
  assert.match(css, /--gf-/);
  assertBalancedBraces(css, cssPath);

  // All 4 tabs + all 4 entity types
  for (const label of [
    'Todo el Canon',
    'Personajes',
    'Objetos (Props)',
    'Escenarios y Lore',
    'location',
    'lore_rule',
  ]) {
    assert.ok(tsx.includes(label), `Missing Settei category/tab ${label}`);
  }

  // Canon activation toggle, seed lock, anchors, reference views, upload & KAI autofill
  for (const token of [
    'activeInCanon',
    'Activo en Canon',
    'Pausado en Canon',
    'seedLocked',
    'characterSeed',
    'visualAnchors',
    'turnaround',
    'front',
    'detail',
    'Subir Imagen de Referencia',
    'Fijar Consistencia',
    'Flow.generate.image',
    'referenceImagesBase64',
    'Autocompletar / Redactar con KAI',
    'SETTEI_AUTOFILL_EVENT',
    'dispatchSetteiDraft',
    'dispatchKaiAsk',
  ]) {
    assert.ok(tsx.includes(token), `Missing Settei feature token ${token}`);
  }
});

test('Drawing Tablet: preserves stylus pressure contract, adds 100% fullscreen, minimalist UI, and Koma bridge', () => {
  const tsx = load('app/studio/components/DrawingTabletWorkbench.tsx');
  const css = load('app/studio/components/DrawingTabletWorkbench.css');

  // Preserve kai-split-studio.test.mjs requirements
  for (const required of [
    'e.pointerType',
    "=== 'pen'",
    'getCoalescedEvents',
    'penOnlyMode',
    'sketch_refine',
  ]) {
    assert.ok(tsx.includes(required), `Missing preserved tablet token: ${required}`);
  }

  // Fullscreen & Escape exit
  assert.match(tsx, /isFullscreen/);
  assert.match(tsx, /Maximize2/);
  assert.match(tsx, /Minimize2/);
  assert.match(tsx, /e\.key === 'Escape'/);
  assert.match(tsx, /Ampliar 100%/);

  assert.match(css, /\.gf-tablet-wrap\.is-fullscreen\s*\{/);
  assert.match(css, /position:\s*fixed;/);
  assert.match(css, /z-index:\s*160;/);
  assert.match(css, /width:\s*100vw;/);
  assert.match(css, /height:\s*100vh;/);
  assert.match(css, /\[data-theme='dark'\]/);
  assert.match(css, /\[data-theme='light'\]/);
  assertBalancedBraces(css, 'app/studio/components/DrawingTabletWorkbench.css');

  // Minimalist toolbar + Ajustes popover + Koma bridge
  for (const token of [
    'Lápiz',
    'G-Pen',
    'Tinta',
    'Borrador',
    'Grosor',
    'Importar Boceto',
    'Mejorar con KAI',
    'Ajustes',
    'Estabilizador',
    'Rechazo Palma',
    'Limpiar Lienzo',
    'KOMA_SKETCH_BRIDGE_EVENT',
    'readPendingKomaSketch',
  ]) {
    assert.ok(tsx.includes(token), `Missing DrawingTablet feature token: ${token}`);
  }
});
