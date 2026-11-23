import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const base = process.cwd();
const load = (p) => readFileSync(join(base, p), 'utf8');

test('Sumi Ink Story Flow: index.html orders #inicio -> #storyFlow -> #kai -> #coleccion -> #planes-mangai -> #empezar and preserves Hero 3D', () => {
  const html = load('public/landing/index.html');

  const inicioMatch = html.match(/<section\b[^>]*\bid=["']inicio["'][^>]*>/i);
  const storyFlowMatch = html.match(/<div\b[^>]*\bid=["']storyFlow["'][^>]*>/i);
  const kaiMatch = html.match(/<section\b[^>]*\bid=["']kai["'][^>]*>/i);
  const coleccionMatch = html.match(/<section\b[^>]*\bid=["']coleccion["'][^>]*>/i);
  const planesMatch = html.match(/<section\b[^>]*\bid=["']planes-mangai["'][^>]*>/i);
  const empezarMatch = html.match(/<section\b[^>]*\bid=["']empezar["'][^>]*>/i);

  assert.ok(inicioMatch && inicioMatch.index !== undefined, 'index.html must preserve #inicio section');
  assert.ok(storyFlowMatch && storyFlowMatch.index !== undefined, 'index.html must include #storyFlow container');
  assert.ok(kaiMatch && kaiMatch.index !== undefined, 'index.html must include Act 1 #kai section');
  assert.ok(coleccionMatch && coleccionMatch.index !== undefined, 'index.html must include Act 2 #coleccion section');
  assert.ok(planesMatch && planesMatch.index !== undefined, 'index.html must include Act 3 #planes-mangai section');
  assert.ok(empezarMatch && empezarMatch.index !== undefined, 'index.html must include Act 4 #empezar section');

  const inicioCloseIdx = html.indexOf('</section>', inicioMatch.index);
  assert.ok(inicioCloseIdx !== -1 && inicioCloseIdx < storyFlowMatch.index, '#inicio must close before #storyFlow begins');
  assert.ok(storyFlowMatch.index < kaiMatch.index, '#storyFlow must wrap before #kai');
  assert.ok(kaiMatch.index < coleccionMatch.index, '#kai must appear before #coleccion');
  assert.ok(coleccionMatch.index < planesMatch.index, '#coleccion must appear before #planes-mangai');
  assert.ok(planesMatch.index < empezarMatch.index, '#planes-mangai must appear before #empezar');

  for (const cls of [
    'mangai-hero-stage',
    'mangai-shelf',
    'manga-closed-book',
    'manga-open-book',
    'dock-btn',
    'dock-btn-kai',
  ]) {
    assert.match(
      html,
      new RegExp(`\\bclass=["'][^"']*\\b${cls}\\b`, 'i'),
      `index.html must preserve Hero 3D class .${cls}`,
    );
  }

  assert.match(html, /\bclass=["'][^"']*\bsuminagashi-waves\b/i, 'index.html must include .suminagashi-waves SVG');
  assert.match(html, /\bclass=["'][^"']*\bsumi-ink-stream-track\b/i, 'index.html must include .sumi-ink-stream-track');
  assert.match(html, /\bid=["']sumiInkFill["']/, 'index.html must include #sumiInkFill');
  assert.match(html, /\bclass=["'][^"']*\bsumi-ink-droplet\b/i, 'index.html must include .sumi-ink-droplet');
  assert.match(html, /\bclass=["'][^"']*\bukiyo-cloud-svg\b/i, 'index.html must include .ukiyo-cloud-svg');
  assert.match(html, /\bclass=["'][^"']*\bkai-chat-preview\b/i, 'index.html must include .kai-chat-preview');
  assert.match(
    html,
    /<img\b[^>]*\bsrc=["']\/landing\/assets\/mangai-art-06\.svg["'][^>]*>/i,
    'index.html must reference local /landing/assets/mangai-art-06.svg inside Kai brush preview',
  );

  for (const finish of ['gpen', 'tone', 'crimson']) {
    assert.match(
      html,
      new RegExp(`<button\\b[^>]*\\bdata-finish=["']${finish}["']`, 'i'),
      `index.html must include finish button data-finish="${finish}"`,
    );
  }

  assert.match(html, /\bclass=["'][^"']*\bcollection-fan-stack\b/i, 'index.html must include .collection-fan-stack');
  for (const folioCls of ['folio-back', 'folio-mid', 'folio-front']) {
    assert.match(
      html,
      new RegExp(`\\bclass=["'][^"']*\\b${folioCls}\\b`, 'i'),
      `index.html must include .${folioCls} inside .collection-fan-stack`,
    );
  }
  assert.ok(html.includes('300 DPI'), 'index.html must include 300 DPI KDP badge copy');

  const planCards = html.match(/\bclass=["'][^"']*\bmanga-plan-card\b[^"']*["']/g) || [];
  assert.equal(planCards.length, 3, 'index.html must include exactly 3 .manga-plan-card items');
  for (const planToken of ['Mangaka Aprendiz', '$0', 'Creador Pro', '$19', 'Sello Editorial', '$49']) {
    assert.ok(html.includes(planToken), `index.html must include pricing copy "${planToken}"`);
  }

  assert.match(html, /\bclass=["'][^"']*\bfinal-cta-scroll\b/i, 'index.html must include .final-cta-scroll');
  assert.ok(html.includes('道心静'), 'index.html must include 道心静 kanji watermark');
  assert.match(
    html,
    /<a\b(?=[^>]*\bid=["']finalStudioCta["'])(?=[^>]*\bhref=["']\/studio\?tab=kai["'])[^>]*>/i,
    'index.html must include #finalStudioCta anchor linking to /studio?tab=kai',
  );
  assert.match(html, /<footer\b[^>]*\bclass=["'][^"']*\bstory-footer\b/i, 'index.html must include .story-footer');
});

test('Sumi Ink Story Flow: zero unsplash.com URLs or leaked secrets in landing HTML and JS', () => {
  const html = load('public/landing/index.html');
  const js = load('public/landing/landing.js');

  for (const [name, source] of [
    ['public/landing/index.html', html],
    ['public/landing/landing.js', js],
  ]) {
    assert.doesNotMatch(source, /unsplash\.com/i, `${name} must not contain external unsplash.com URLs`);
    assert.doesNotMatch(
      source,
      /OPENAI_API_KEY|GEMINI_API_KEY|NEXT_PUBLIC_GEMINI|VITE_GEMINI|sk-proj-|AIza[0-9A-Za-z_-]{20,}/i,
      `${name} must not contain API keys or credentials`,
    );
  }
});

test('Sumi Ink Story Flow: landing.css preserves --cream:#f4f0e7, balanced braces, and defines all Sumi story selectors before reduced-motion', () => {
  const css = load('public/landing/landing.css');

  assert.match(css, /--cream\s*:\s*#f4f0e7/i, 'landing.css must preserve --cream:#f4f0e7');

  const openBraces = (css.match(/\{/g) || []).length;
  const closeBraces = (css.match(/\}/g) || []).length;
  assert.equal(openBraces, closeBraces, 'landing.css must have balanced curly braces');

  const requiredSelectors = [
    '.mangai-story-flow',
    '.suminagashi-waves',
    '.sumi-ink-stream-track',
    '.sumi-ink-stream-fill',
    '.sumi-ink-droplet',
    '@keyframes sumiDropPulse',
    '.story-stage',
    '.ukiyo-cloud-svg',
    '.story-grid',
    '.reveal-card',
    '.hanko-seal',
    '.benefit-bullets',
    '.brush-panel-card',
    '.kai-chat-preview',
    '.finish-gpen',
    '.finish-tone',
    '.finish-crimson',
    '.brush-finish-btn',
    '.collection-fan-stack',
    '.folio-card',
    '.folio-back',
    '.folio-mid',
    '.folio-front',
    '.folio-card.is-focused',
    '.pricing-cards-grid',
    '.manga-plan-card',
    '.manga-plan-card.is-featured',
    '.btn-ink-primary',
    '.btn-ink-secondary',
    '.final-cta-scroll',
    '.kanji-watermark',
    '.story-footer',
  ];

  const reducedMotionIdx = css.search(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i);
  assert.ok(reducedMotionIdx !== -1, 'landing.css must include @media(prefers-reduced-motion:reduce)');

  for (const selector of requiredSelectors) {
    const idx = css.indexOf(selector);
    assert.ok(idx !== -1, `landing.css must define ${selector}`);
    assert.ok(
      idx < reducedMotionIdx,
      `landing.css must define ${selector} before @media(prefers-reduced-motion:reduce)`,
    );
  }

  const reducedMotionBlock = css.slice(reducedMotionIdx);
  assert.match(
    reducedMotionBlock,
    /\.reveal-card\s*\{[^}]*opacity\s*:\s*1/i,
    'landing.css reduced-motion query must reveal .reveal-card with opacity:1',
  );
});

test('Sumi Ink Story Flow: landing.js wires initSumiStoryFlow, scroll thread, parallax, interactive fan, brush finishes, and Studio navigation', () => {
  const js = load('public/landing/landing.js');

  for (const token of [
    'initSumiStoryFlow',
    '#sumiInkFill',
    '#ukiyoCloudTop',
    '#ukiyoCloudBottom',
    '#suminagashiWaves',
    '#collectionFanStack',
    '.folio-card',
    '#kaiBrushCard',
    '.brush-finish-btn',
    "window.location.assign('/studio')",
  ]) {
    assert.ok(js.includes(token), `landing.js must wire ${token}`);
  }

  assert.doesNotMatch(
    js,
    /#workList|#zscene|#kaiCanvas|#inkCanvas|#ecosistema/,
    'landing.js must not query removed legacy section selectors',
  );
});
