import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const base = process.cwd();
const load = (p) => readFileSync(join(base, p), 'utf8');

test('Koma Vectors: PageEditor.tsx and PageEditor.css exist and wire Light/Dark --gf-* tokens', () => {
  assert.ok(existsSync(join(base, 'app/studio/components/PageEditor.tsx')));
  assert.ok(existsSync(join(base, 'app/studio/components/PageEditor.css')));

  const tsx = load('app/studio/components/PageEditor.tsx');
  const css = load('app/studio/components/PageEditor.css');

  assert.match(tsx, /^['"]use client['"];/);
  assert.match(tsx, /import\s+['"]\.\/PageEditor\.css['"]/);
  assert.match(css, /var\(--gf-/);
  assert.match(css, /\.gf-studio-root\[data-theme='dark'\]/);
  assert.match(css, /\.gf-vector-overlay/);
  assert.match(css, /\.gf-draft-flow-bar/);

  // Balanced braces check in PageEditor.css
  const opens = (css.match(/\{/g) || []).length;
  const closes = (css.match(/\}/g) || []).length;
  assert.equal(opens, closes, 'PageEditor.css must have balanced curly braces');
});

test('Koma Vectors: preserves 4 geometric templates, 7-layer stack L0..L6, and flattener compatibility', () => {
  const tsx = load('app/studio/components/PageEditor.tsx');

  assert.match(tsx, /KOMA_LAYOUT_LIST/);
  assert.match(tsx, /renderPrintablePageToPngBase64/);
  for (const layerClass of [
    'gf-layer-l0',
    'gf-layer-l1',
    'gf-layer-l2',
    'gf-layer-l3',
    'gf-layer-l6',
  ]) {
    assert.ok(tsx.includes(layerClass), `Missing layer class ${layerClass}`);
  }
  assert.match(tsx, /<KakimojiLayer/);
  assert.match(tsx, /<FukidashiLayer/);
});

test('Koma Vectors: implements interactive point-by-point Vector Panel Builder and Vertex Editing', () => {
  const tsx = load('app/studio/components/PageEditor.tsx');

  for (const label of [
    '+ Trazar Viñeta Vectorial',
    'Cerrar Viñeta',
    'Editar Vértices',
    '+ Vértice',
    'Eliminar Viñeta',
    'Lienzo Vacío',
  ]) {
    assert.ok(tsx.includes(label), `Missing Vector Panel Builder control: ${label}`);
  }

  // Coordinate clamping (2..98), 1-decimal rounding, and keyboard shortcuts
  assert.match(tsx, /Math\.min\(98,\s*Math\.max\(2,/);
  assert.match(tsx, /splitLongestPolygonEdge/);
  assert.match(tsx, /e\.key\s*===\s*['"]Enter['"]/);
  assert.match(tsx, /e\.key\s*===\s*['"]Backspace['"]/);
  assert.match(tsx, /e\.key\s*===\s*['"]Escape['"]/);
  assert.match(tsx, /state:\s*['"]VACIO['"]/);
  assert.match(tsx, /panelIndex:\s*komas\.length\s*\+\s*1/);
  assert.match(tsx, /onDoubleClick=\{handleVectorCanvasDoubleClick\}/);
});

test('Koma Vectors: implements L0 -> L2 KAI Draft Flow and cross-worker event contracts', () => {
  const tsx = load('app/studio/components/PageEditor.tsx');

  for (const label of [
    'Flujo Borrador → Arte Final (KAI)',
    'Bocetar en Tabla de Dibujo',
    'Subir Boceto L0',
    'Transformar Borrador → Arte Final con KAI',
  ]) {
    assert.ok(tsx.includes(label), `Missing L0->L2 flow UI: ${label}`);
  }

  // Cross-worker event contracts
  assert.match(tsx, /sessionStorage\.setItem\(\s*['"]mangai-pending-koma-sketch['"]/);
  assert.match(tsx, /new CustomEvent\(\s*['"]mangai-koma-sketch-bridge['"]/);
  assert.match(tsx, /new CustomEvent\(\s*['"]mangai-kai-ask['"]/);
  assert.match(tsx, /mode:\s*['"]script['"]/);

  // KAI sketch_refine call attaching L0 nemuSketchUrl + active @Settei refs, anchors & seed
  assert.match(tsx, /Flow\.generate\.image/);
  assert.match(tsx, /mode:\s*['"]sketch_refine['"]/);
  assert.match(tsx, /aspectRatio:\s*['"]3:4['"]/);
  assert.match(tsx, /nemuSketchUrl/);
  assert.match(tsx, /activeInCanon/);
  assert.match(tsx, /visualAnchors/);
  assert.match(tsx, /characterSeed/);
  assert.match(tsx, /inkRenderUrl:\s*result\.dataUrl/);
  assert.match(tsx, /state:\s*nextState/);
});
