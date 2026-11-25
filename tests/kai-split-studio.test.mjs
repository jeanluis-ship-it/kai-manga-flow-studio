import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const base = process.cwd();
const load = (p) => readFileSync(join(base, p), 'utf8');

const REQUIRED_SPLIT_FILES = [
  'lib/kai/studioCanvas.ts',
  'app/api/kai/chat/route.ts',
  'app/api/kai/canvas/route.ts',
  'app/studio/components/KaiSplitStudio.tsx',
  'app/studio/components/KaiSplitStudio.css',
];

test('Kai Split Studio: all required backend, API, and UI files exist', () => {
  for (const filePath of REQUIRED_SPLIT_FILES) {
    assert.ok(existsSync(join(base, filePath)), `Missing required file: ${filePath}`);
  }
});

test('Kai Split Studio: zero client-side API key exposure or Vite leftovers', () => {
  const filesToScan = [
    ...REQUIRED_SPLIT_FILES,
    'app/studio/types.ts',
    'app/studio/page.tsx',
  ];

  for (const filePath of filesToScan) {
    const content = load(filePath);
    assert.doesNotMatch(
      content,
      /NEXT_PUBLIC_GEMINI_API_KEY|VITE_GEMINI_API_KEY|import\.meta\.env|\?key=/,
      `Forbidden secret or Vite pattern found in ${filePath}`,
    );
  }

  for (const clientFile of [
    'lib/kai/studioCanvas.ts',
    'app/studio/components/KaiSplitStudio.tsx',
    'app/studio/page.tsx',
  ]) {
    const content = load(clientFile);
    assert.doesNotMatch(
      content,
      /GEMINI_API_KEY|generativelanguage\.googleapis\.com/,
      `Server credential or direct Google endpoint leaked into client file ${clientFile}`,
    );
  }
});

test('Kai Split Studio: server routes read GEMINI_API_KEY and send x-goog-api-key header', () => {
  const chatRoute = load('app/api/kai/chat/route.ts');
  const imageBackend = load('lib/kai/geminiImage.ts');
  const canvasRoute = load('app/api/kai/canvas/route.ts') + imageBackend;

  for (const [name, source] of [
    ['app/api/kai/chat/route.ts', chatRoute],
    ['app/api/kai/canvas/route.ts', canvasRoute],
  ]) {
    assert.match(source, /export const runtime\s*=\s*['"]nodejs['"]/, `${name} must run on nodejs`);
    assert.match(source, /process\.env\.GEMINI_API_KEY/, `${name} must read process.env.GEMINI_API_KEY`);
    assert.match(source, /['"]x-goog-api-key['"]/, `${name} must pass x-goog-api-key header`);
    assert.match(source, /generativelanguage\.googleapis\.com\/v1beta\/models\//, `${name} must target Gemini v1beta endpoint`);
  }

  assert.match(chatRoute, /KaiChatRequestSchema/);
  assert.match(chatRoute, /KAI_TEXT_MODEL_DEFAULT/);
  assert.match(chatRoute, /extractVisualPrompt/);

  assert.match(canvasRoute, /KaiCanvasGenerateRequestSchema/);
  assert.match(canvasRoute, /KAI_IMAGE_MODEL_DEFAULT/);
  assert.match(canvasRoute, /buildFullCanvasPrompt/);
  assert.match(canvasRoute, /responseModalities:\s*\[\s*['"]IMAGE['"]\s*\]/);
  assert.match(canvasRoute, /inlineData/);
  assert.match(canvasRoute, /inline_data/);
});

test('Kai Split Studio: studioCanvas contract defines exact models, 4 styles, and 4 aspect ratios', () => {
  const contract = load('lib/kai/studioCanvas.ts');

  assert.match(contract, /KAI_TEXT_MODEL_DEFAULT\s*=\s*['"]gemini-3-flash-preview['"]/);
  assert.match(contract, /KAI_IMAGE_MODEL_DEFAULT\s*=\s*['"]gemini-3\.1-flash-image['"]/);

  const expectedStyles = [
    ['manga_ink', 'Manga Entintado B/N'],
    ['webtoon_color', 'Manhwa Dark Fantasy Color'],
    ['cover_art', 'Portada de Volumen'],
    ['chibi_kai', 'Mascota Kai'],
  ];
  for (const [id, label] of expectedStyles) {
    assert.ok(contract.includes(id), `Missing style id: ${id}`);
    assert.ok(contract.includes(label), `Missing Spanish style label: ${label}`);
  }

  const expectedRatios = [
    ['3:4', 'Página KDP'],
    ['9:16', 'Webtoon'],
    ['16:9', 'Panel Doble'],
    ['1:1', 'Avatar'],
  ];
  for (const [ratio, usage] of expectedRatios) {
    assert.ok(contract.includes(`'${ratio}'`) || contract.includes(`"${ratio}"`), `Missing aspect ratio: ${ratio}`);
    assert.ok(contract.includes(usage), `Missing Spanish aspect ratio usage label: ${usage}`);
  }

  for (const symbol of [
    'KaiChatHistoryTurnSchema',
    'KaiChatRequestSchema',
    'KaiCanvasGenerateRequestSchema',
    'KaiServiceError',
    'extractVisualPrompt',
    'buildFullCanvasPrompt',
    'askKaiAssistant',
    'generateMangaPanel',
  ]) {
    assert.ok(contract.includes(symbol), `Missing exported symbol ${symbol}`);
  }
});

test('Kai Split Studio: UI component provides Enviar al Lienzo, generation, and download integration', () => {
  const ui = load('app/studio/components/KaiSplitStudio.tsx');
  const css = load('app/studio/components/KaiSplitStudio.css');

  assert.match(ui, /^['"]use client['"];/);
  assert.match(ui, /import\s+['"]\.\/KaiSplitStudio\.css['"]/);
  assert.match(ui, /export const KaiSplitStudio/);
  assert.match(ui, /askKaiAssistant/);
  assert.match(ui, /generateMangaPanel/);
  assert.match(ui, /extractVisualPrompt/);
  assert.match(ui, /Enviar al Lienzo/);
  assert.match(ui, /Generar Ilustración/);
  assert.match(ui, /Descargar Imagen/);
  assert.match(ui, /Flow\.download/);
  assert.match(ui, /kai-canvas-prompt/);

  assert.match(css, /--gf-/);
  assert.match(css, /@media\s*\(\s*max-width:\s*1024px\s*\)/);
});

test('Studio Workbench: 5-step nav removes Kai+Lienzo tab, adds Drawing Tablet, and docks KAI without opaque backdrop', () => {
  const types = load('app/studio/types.ts');
  const page = load('app/studio/page.tsx');
  const css = load('app/studio/studio.css');
  const kaiDocked = load('app/studio/components/KaiCopilotDrawer.tsx');
  const tablet = load('app/studio/components/DrawingTabletWorkbench.tsx');

  assert.match(
    types,
    /export type StudioView\s*=\s*'project'\s*\|\s*'characters'\s*\|\s*'cover'\s*\|\s*'pages'\s*\|\s*'drawing_tablet'/,
  );

  assert.doesNotMatch(page, /Kai \+ Lienzo IA/, 'Sidebar must not display disconnected Kai + Lienzo IA tab');
  assert.match(page, /Tabla de Dibujo/, 'Sidebar must include Tabla de Dibujo module');
  assert.match(page, /<DrawingTabletWorkbench/);
  assert.match(page, /<KaiCopilotDrawer/);

  // Non-opaque docked KAI workspace requirement
  assert.doesNotMatch(css, /\.gf-kai-backdrop\s*\{/, 'KAI must not render an opaque full-screen backdrop');
  assert.match(css, /\.gf-kai-docked\s*\{/);
  assert.match(kaiDocked, /STEP_PIPELINE/);
  assert.match(kaiDocked, /KAI_TEXT_MODEL_DEFAULT/);
  assert.match(kaiDocked, /KAI_IMAGE_MODEL_DEFAULT/);

  // Digital drawing tablet hardware pressure & KAI sketch refinement
  assert.match(tablet, /e\.pointerType/);
  assert.match(tablet, /=== 'pen'/);
  assert.match(tablet, /getCoalescedEvents/);
  assert.match(tablet, /penOnlyMode/);
  assert.match(tablet, /sketch_refine/);
});
