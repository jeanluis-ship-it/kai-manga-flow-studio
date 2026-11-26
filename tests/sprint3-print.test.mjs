import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const base = process.cwd();
const load = (p) => readFileSync(join(base, p), 'utf8');

test('Sprint 3: strict 7-layer stack (L0-L6) and z-index contract exist', () => {
  const types = load('app/studio/types.ts');
  for (const key of [
    'L6_guides',
    'L5_balloons',
    'L4_sfx',
    'L3_borders_fx',
    'L2_ink',
    'L1_tones',
    'L0_nemu',
  ]) {
    assert.ok(types.includes(key), `Missing layer key ${key}`);
  }
  const css = load('app/studio/studio.css');
  assert.match(css, /\.gf-layer-l0\s*\{\s*z-index:\s*10;/);
  assert.match(css, /\.gf-layer-l1\s*\{\s*z-index:\s*20;/);
  assert.match(css, /\.gf-layer-l2\s*\{[\s\S]*?z-index:\s*30;/);
  assert.match(css, /\.gf-layer-l3\s*\{\s*z-index:\s*40;/);
  assert.match(css, /\.gf-layer-l4-sfx\s*\{[\s\S]*?z-index:\s*50;/);
  assert.match(css, /\.gf-layer-l5-fukidashi\s*\{[\s\S]*?z-index:\s*60;/);
  assert.match(css, /\.gf-layer-l6\s*\{[\s\S]*?z-index:\s*70;/);
});

test('Sprint 3: pre-press flattener explicitly excludes L0_nemu and L6_guides and exports Canva B4 2150x3035', () => {
  assert.ok(existsSync(join(base, 'lib/export/buildPrintBundle.ts')));
  assert.ok(existsSync(join(base, 'components/studio/FukidashiLayer.tsx')));
  const bundler = load('lib/export/buildPrintBundle.ts');
  assert.match(bundler, /L0_nemu:\s*false/);
  assert.match(bundler, /L6_guides:\s*false/);
  assert.match(bundler, /README_IMPRENTA\.txt/);
  assert.match(bundler, /_PRINT_BUNDLE\.zip/);

  const presets = load('lib/print/presets.ts');
  assert.match(presets, /tankobon_b6/);
  assert.match(presets, /b4_canva_pro/);
  assert.match(presets, /exportWidthPx:\s*2150/);
  assert.match(presets, /exportHeightPx:\s*3035/);
  assert.match(presets, /bleedMm:\s*3\.5/);
  assert.match(presets, /kdp_6x9/);
});

test('Sprint 3: EAN-13 pure SVG barcode encoder exists with full L/G/R parity tables and editable CoverDesigner wiring', () => {
  const ean = load('lib/print/ean13.ts');
  assert.match(ean, /L_CODES/);
  assert.match(ean, /G_CODES/);
  assert.match(ean, /R_CODES/);
  assert.match(ean, /computeEan13CheckDigit/);

  const cover = load('app/studio/components/CoverDesigner.tsx');
  const coverCss = load('app/studio/components/CoverDesigner.css');
  assert.match(cover, /PRINT_PRESET_LIST/);
  assert.match(cover, /ISBN-13 Editable/);
  assert.match(cover, /formatIsbn13/);
  assert.match(coverCss, /var\(--genko-/);

  const fukidashi = load('components/studio/FukidashiLayer.tsx');
  assert.match(fukidashi, /AlertTriangle/);
  assert.doesNotMatch(fukidashi, /⚠/);
});
