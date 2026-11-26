import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const base = process.cwd();
const load = (p) => readFileSync(join(base, p), 'utf8');

test('Landing SVGs: all 93 mangai-art SVGs exist, exceed 2.5 KB, and have unique SHA-256 hashes', () => {
  const hashes = new Set();

  for (let i = 1; i <= 93; i += 1) {
    const num = String(i).padStart(2, '0');
    const relPath = `public/landing/assets/mangai-art-${num}.svg`;
    const fullPath = join(base, relPath);

    assert.ok(existsSync(fullPath), `${relPath} must exist`);
    const size = statSync(fullPath).size;
    assert.ok(size > 2560, `${relPath} must be > 2.5 KB (got ${size} B)`);

    const content = readFileSync(fullPath, 'utf8');
    assert.match(content, /^<svg\b[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, `${relPath} must start with valid <svg>`);
    assert.match(content, /<\/svg>\s*$/, `${relPath} must close cleanly with </svg>`);

    const digest = createHash('sha256').update(content).digest('hex');
    assert.ok(!hashes.has(digest), `${relPath} duplicates another SVG hash`);
    hashes.add(digest);
  }

  assert.equal(hashes.size, 93, 'All 93 manga SVGs must have unique content hashes');
});

test('Landing SVGs: AnaCaona and Hijos del Huracán series preserve visual continuity', () => {
  const anacaonaCover = load('public/landing/assets/mangai-art-06.svg');
  const anacaonaSettei = load('public/landing/assets/mangai-art-21.svg');
  const anacaonaWrap = load('public/landing/assets/mangai-art-22.svg');
  const huracanCover = load('public/landing/assets/mangai-art-05.svg');
  const huracanChart = load('public/landing/assets/mangai-art-13.svg');

  assert.ok(anacaonaCover.includes('ANACAONA'), 'mangai-art-06.svg must depict AnaCaona cover');
  assert.ok(anacaonaSettei.includes('SETTEI CANON'), 'mangai-art-21.svg must depict AnaCaona Settei turnaround');
  assert.ok(anacaonaWrap.includes('EAN-13'), 'mangai-art-22.svg must depict AnaCaona Tankōbon wrap');
  assert.ok(huracanCover.includes('HURACÁN'), 'mangai-art-05.svg must depict Hijos del Huracán cover');
  assert.ok(huracanChart.includes('ARCHIPIÉLAGO'), 'mangai-art-13.svg must depict Archipelago nautical chart');
});

test('Landing Book Viewer: zero 1px GIF placeholders, 80 distinct spread page images across 10 tomes, and real modal metadata', () => {
  const html = load('public/landing/index.html');
  const css = load('public/landing/landing.css');
  const js = load('public/landing/landing.js');

  assert.doesNotMatch(html, /data:image\/gif;base64/i, 'index.html must not use 1px GIF placeholders in turningLeaf or viewer');
  assert.doesNotMatch(js, /data:image\/gif;base64|BLANK_LEAF_PIXEL/i, 'landing.js must not use 1px GIF placeholders');
  assert.doesNotMatch(html, /<h3 id="modalTitle">Título<\/h3>/i, 'Inspection modal must not contain generic "Título" placeholder');

  const spreadImgMatches = [...js.matchAll(/image:\s*['"](\/landing\/assets\/mangai-art-\d+\.svg)['"]/g)].map((m) => m[1]);
  assert.equal(spreadImgMatches.length, 80, 'BOOKS must define 80 page images across 10 tomes (4 spreads × 2 pages each)');
  const uniqueSpreadImgs = new Set(spreadImgMatches);
  assert.equal(uniqueSpreadImgs.size, 80, 'All 80 spread page slots across the 10 tomes must use distinct art SVGs');

  assert.match(css, /\.mangai-stage-center\s*\{[^}]*overflow\s*:\s*visible/i);
  assert.match(css, /\.manga-open-book\s*\{[^}]*overflow\s*:\s*visible/i);
  assert.match(css, /\.manga-open-book\s*\{[^}]*width\s*:\s*min\(\s*920px\s*,\s*calc\(\s*100vw\s*-\s*56px\s*\)\s*\)/i);
  assert.match(css, /\.manga-panel-art\s*\{[^}]*object-fit\s*:\s*contain/i);
  assert.match(css, /\.manga-panel-art\s*\{[^}]*background\s*:\s*#faf7f0/i);

  assert.match(css, /@keyframes\s+flipPageNext\s*\{[\s\S]*?50%[\s\S]*?rotateY\(-180deg\)/i);
  assert.match(css, /@keyframes\s+flipPagePrev\s*\{[\s\S]*?50%[\s\S]*?rotateY\(180deg\)/i);

  assert.ok(js.includes('--left-stack-px'), 'landing.js must dynamically update left page stack thickness');
  assert.ok(js.includes('--right-stack-px'), 'landing.js must dynamically update right page stack thickness');
  assert.ok(js.includes('openInspectionModal'), 'landing.js must wire openInspectionModal with real cover and metadata');
});

test('Landing Otaku & Kawaii KAI Redesign + Studio Project Deep-Links', () => {
  const html = load('public/landing/index.html');
  const css = load('public/landing/landing.css');
  const js = load('public/landing/landing.js');

  for (const token of [
    'kai-chibi-mascot',
    'kai-chibi-stamp',
    'ネーム → ペン入れ → 仕上げ',
    '原稿用紙 GENKŌ',
    '相棒カイ',
    'openBookPagesBtn',
    'kaiBrushStudioLink',
    'collectionStudioLink',
    'modalStudioBtn',
  ]) {
    assert.ok(html.includes(token), `index.html must include ${token}`);
  }

  const reducedMotionIdx = css.search(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i);
  assert.ok(reducedMotionIdx !== -1);
  for (const selector of [
    '.kai-sensei-bar',
    '.kai-chibi-mascot',
    '.tategaki-tag',
    '.genko-tombo-corners',
    '.kai-inline-studio-link',
  ]) {
    const idx = css.indexOf(selector);
    assert.ok(idx !== -1 && idx < reducedMotionIdx, `landing.css must define ${selector} before reduced-motion`);
  }

  assert.ok(js.includes('buildStudioDeepLink'), 'landing.js must define buildStudioDeepLink');
  assert.ok(js.includes("window.location.assign('/studio')"), 'landing.js must keep startStudio navigation');
});

test('Landing Pass 2: header auth link, dedicated KAI rain panel SVG, and zero duplicate Page 02 in DOM', () => {
  const html = load('public/landing/index.html');
  const css = load('public/landing/landing.css');
  const js = load('public/landing/landing.js');

  assert.match(html, /id=["']navAuthLink["'][^>]*href=["']\/login["'][^>]*>Iniciar Sesión/i);
  assert.match(html, /id=["']mobileAuthLink["'][^>]*href=["']\/login["']/i);
  assert.ok(css.includes('.nav-auth-link'), 'landing.css must style .nav-auth-link');
  assert.ok(js.includes('syncLandingAuthLink'), 'landing.js must define syncLandingAuthLink');

  const panelPath = join(base, 'public/landing/assets/anacaona-lluvia.webp');
  assert.ok(existsSync(panelPath), 'Dedicated KAI rain panel SVG must exist');
  assert.ok(statSync(panelPath).size > 2560, 'Dedicated KAI rain panel SVG must be > 2.5 KB');
  assert.match(html, /src=["']\/landing\/assets\/anacaona-lluvia\.webp["']/i);

  const dueloMatches = html.match(/Duelo en la Selva/g) || [];
  assert.equal(dueloMatches.length, 1, 'Duelo en la Selva must appear once in initial DOM (no duplicate inside hidden turningLeaf)');
  assert.ok(js.includes('clearTurningLeaf'), 'landing.js must refresh turningLeaf after flip');
});
