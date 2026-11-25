import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.cwd();
const load = (p) => readFileSync(join(base, p), 'utf8');

test('Hero 3D Book Viewer: index.html preserves hero section, data-open-studio, and Paper 3D book markup', () => {
  const html = load('public/landing/index.html');

  assert.match(
    html,
    /<section\b[^>]*\bclass=["'][^"']*\bhero\b[^"']*["'][^>]*\bid=["']inicio["'][^>]*>/i,
    'index.html must preserve <section class="hero" id="inicio">',
  );
  assert.ok(html.includes('data-open-studio'), 'index.html must preserve data-open-studio CTA triggers');

  for (const sectionId of ['kai', 'coleccion', 'planes-mangai', 'empezar', 'modal']) {
    assert.match(
      html,
      new RegExp(`\\bid=["']${sectionId}["']`, 'i'),
      `index.html must preserve section/element #${sectionId}`,
    );
  }

  const requiredClasses = [
    'mangai-hero-stage',
    'mangai-shelf',
    'manga-closed-book',
    'book-spine-crease',
    'book-elastic-band',
    'manga-open-book',
    'page-stack-left',
    'page-stack-right',
    'page-gutter-shadow-left',
    'page-gutter-shadow-right',
    'turning-leaf',
    'dock-btn',
    'dock-btn-kai',
  ];

  for (const cls of requiredClasses) {
    assert.match(
      html,
      new RegExp(`\\bclass=["'][^"']*\\b${cls}\\b`, 'i'),
      `index.html is missing required class .${cls}`,
    );
  }

  assert.match(
    html,
    /<a\b[^>]*\bhref=["']\/studio\?tab=kai["'][^>]*>[\s\S]{0,160}?Editar en Estudio con Kai/i,
    'index.html must include "Editar en Estudio con Kai" link pointing to /studio?tab=kai',
  );
});

test('Hero 3D Book Viewer: zero unsplash.com URLs or leaked secrets; uses local /landing/assets/mangai-art- SVGs', () => {
  const html = load('public/landing/index.html');
  const js = load('public/landing/landing.js');

  for (const [name, source] of [
    ['public/landing/index.html', html],
    ['public/landing/landing.js', js],
  ]) {
    assert.doesNotMatch(source, /unsplash\.com/i, `${name} must not contain external unsplash.com URLs`);
    assert.doesNotMatch(
      source,
      /OPENAI_API_KEY|GEMINI_API_KEY|NEXT_PUBLIC_GEMINI|VITE_GEMINI|sk-proj-/i,
      `${name} must not contain credentials or API key patterns`,
    );
    assert.ok(
      source.includes('/landing/assets/mangai-art-'),
      `${name} must reference local /landing/assets/mangai-art- assets`,
    );
  }
});

test('Hero 3D Book Viewer: landing.css preserves --cream:#f4f0e7 and defines 3D Paper physics, circular dock buttons, and [hidden] protection', () => {
  const css = load('public/landing/landing.css');

  assert.match(css, /--cream\s*:\s*#f4f0e7/i, 'landing.css must preserve --cream:#f4f0e7');

  for (const selector of [
    '.book-spine-crease',
    '.book-elastic-band',
    '.page-stack-left',
    '.page-stack-right',
    '.dock-btn',
    '.dock-btn-kai',
  ]) {
    assert.ok(css.includes(selector), `landing.css must define ${selector}`);
  }

  assert.match(
    css,
    /\.dock-btn(?:\s*,\s*[^{]+)?\s*\{[^}]*border-radius\s*:\s*(?:50%|100%|999px)/i,
    'landing.css must style .dock-btn as a circular button',
  );
  assert.ok(css.includes('rotateY(-180deg)'), 'landing.css must define rotateY(-180deg) forward flip');
  assert.ok(css.includes('rotateY(180deg)'), 'landing.css must define rotateY(180deg) backward flip');
  assert.match(css, /@keyframes\s+bookPopOpen\b/, 'landing.css must define @keyframes bookPopOpen');
  assert.match(
    css,
    /\[hidden\][^{]*\{[^}]*display\s*:\s*none/i,
    'landing.css must protect [hidden] elements with display:none',
  );
  assert.match(
    css,
    /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i,
    'landing.css must keep prefers-reduced-motion media query',
  );
});

test('Hero 3D Book Viewer: landing.js implements spread opening/closing, page flips, Kai deep-link updates, and Studio navigation', () => {
  const js = load('public/landing/landing.js');

  assert.ok(
    js.includes("window.location.assign('/studio')"),
    "landing.js must preserve window.location.assign('/studio')",
  );
  assert.doesNotMatch(
    js,
    /#heroDesc|#heroName/,
    'landing.js must not reference removed #heroDesc or #heroName selectors',
  );

  for (const token of [
    'mangaShelf',
    'mangaOpenBook',
    'turningLeaf',
    'openBook',
    'closeBook',
    'spreads',
    'spreadIndex',
    'flipping-next',
    'flipping-prev',
    'openPageLeft',
    'prevSpreadBtn',
    'editWithKaiBtn',
  ]) {
    assert.ok(js.includes(token), `landing.js must implement ${token}`);
  }

  assert.match(
    js,
    /(?:spreadIndex\s*(?:===?|<=)\s*0[\s\S]{0,180}closeBook\s*\(|spreadIndex\s*>\s*0[\s\S]*?else[\s\S]{0,140}closeBook\s*\()/,
    'landing.js must close the open book when navigating back from the first spread',
  );
  assert.ok(
    js.includes('/studio?tab=kai'),
    'landing.js must update #editWithKaiBtn href with /studio?tab=kai deep-link',
  );
  assert.match(
    js,
    /volume[\s\S]*title[\s\S]*style[\s\S]*prompt/,
    'landing.js must serialize volume, title, style, and prompt query parameters',
  );
});

test('Studio Deep-Link: KaiSplitStudio.tsx parses URLSearchParams to preload volume in Kai + Lienzo IA', () => {
  const ui = load('app/studio/components/KaiSplitStudio.tsx');

  assert.match(ui, /typeof\s+window\s*!==\s*['"]undefined['"]/);
  assert.match(ui, /new\s+URLSearchParams\(\s*window\.location\.search\s*\)/);

  for (const param of ['volume', 'title', 'style', 'prompt']) {
    assert.match(
      ui,
      new RegExp(`params\\.get\\(['"]${param}['"]\\)`),
      `KaiSplitStudio.tsx must read "${param}" from URLSearchParams`,
    );
  }

  for (const styleId of ['manga_ink', 'webtoon_color', 'cover_art', 'chibi_kai']) {
    assert.ok(ui.includes(styleId), `KaiSplitStudio.tsx must validate incoming style "${styleId}"`);
  }

  assert.match(ui, /setStyle\(/);
  assert.match(ui, /setCanvasPrompt\(/);
  assert.match(ui, /setPromptFlash\(\s*true\s*\)/);
  assert.match(ui, /clearTimeout/);
  assert.match(ui, /isWelcome/);
  assert.match(ui, /\[PROMPT VISUAL\]:/);
});

test('Crease Carousel 0.1.0-prototype.1: preset validates contract, normalizes 1280x720 curl:60, and wires double-sided 3D leaf', async () => {
  const { default: runtimeOptions } = await import('../public/landing/crease-carousel/preset.js');
  const html = load('public/landing/index.html');
  const css = load('public/landing/landing.css');

  assert.equal(runtimeOptions.templateId, 'crease-carousel');
  assert.equal(runtimeOptions.cardCount, 4);
  assert.equal(runtimeOptions.cardWidth, 1280);
  assert.equal(runtimeOptions.cardHeight, 720);
  assert.equal(runtimeOptions.cornerRadius, 12);
  assert.equal(runtimeOptions.curl, 60);
  assert.equal(runtimeOptions.duration, 0.9);
  assert.equal(runtimeOptions.showDots, true);
  assert.equal(runtimeOptions.slots.length, 8);

  for (const slot of runtimeOptions.slots) {
    assert.match(slot.left.imageUrl, /^\/landing\/assets\/mangai-art-\d+\.svg$/);
    assert.match(slot.right.imageUrl, /^\/landing\/assets\/mangai-art-\d+\.svg$/);
  }

  for (const cls of ['crease-spine-fold', 'crease-cast-shadow', 'leaf-face-front', 'leaf-face-back', 'crease-dots']) {
    assert.match(html, new RegExp(`\\bclass=["'][^"']*\\b${cls}\\b`, 'i'), `index.html missing .${cls}`);
    assert.ok(css.includes(`.${cls}`), `landing.css missing .${cls}`);
  }
});

test('Pinwheel Gallery 0.1.0-prototype.1: preset validates 10-panel rotor physics and connects to 10 Hero manga volumes', async () => {
  const { default: pinwheel } = await import('../public/landing/pinwheel-gallery/preset.js');
  const html = load('public/landing/index.html');
  const css = load('public/landing/landing.css');
  const js = load('public/landing/landing.js');

  assert.equal(pinwheel.templateId, 'pinwheel-gallery');
  assert.equal(pinwheel.imageCount, 10);
  assert.equal(pinwheel.panels, 10);
  assert.equal(pinwheel.hub, 24);
  assert.equal(pinwheel.bend, 30);
  assert.equal(pinwheel.corners, 12);
  assert.equal(pinwheel.shade, 35);
  assert.equal(pinwheel.pull, 70);
  assert.equal(pinwheel.lean, 50);
  assert.equal(pinwheel.pointerSpin, 6);
  assert.equal(pinwheel.items.length, 10);

  for (const item of pinwheel.items) {
    assert.match(item.imageUrl, /^\/landing\/assets\/cover-[a-z-]+\.webp$/);
  }

  const closedBooks = html.match(/class=["'][^"']*\bmanga-closed-book\b/g) || [];
  assert.equal(closedBooks.length, 10, 'Hero Pinwheel must render 10 .manga-closed-book panels');
  assert.match(html, /\bclass=["'][^"']*\bpinwheel-hub-ring\b/i);
  assert.ok(css.includes('.pinwheel-hub-ring'));
  assert.ok(js.includes('switchOpenBookTo'));
});
