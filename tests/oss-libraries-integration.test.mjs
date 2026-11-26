import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const base = process.cwd();
const load = (p) => readFileSync(join(base, p), 'utf8');

test('OSS Integration: package.json includes perfect-freehand, konva, react-konva, react-pageflip, and jspdf', () => {
  const pkg = JSON.parse(load('package.json'));
  for (const dep of ['perfect-freehand', 'konva', 'react-konva', 'react-pageflip', 'jspdf']) {
    assert.ok(pkg.dependencies?.[dep], `Missing dependency ${dep} in package.json`);
  }
});

test('OSS Integration: DrawingTabletWorkbench uses perfect-freehand getStroke for Japanese G-Pen tapering', () => {
  const src = load('app/studio/components/DrawingTabletWorkbench.tsx');
  assert.match(src, /from\s+['"]perfect-freehand['"]/);
  assert.match(src, /getStroke\(/);
  assert.match(src, /getSvgPathFromStroke/);
  assert.match(src, /simulatePressure/);
});

test('OSS Integration: KonvaKomaCanvas uses react-konva with clipFunc polygon clipping and is dynamically loaded in PageEditor', () => {
  assert.ok(existsSync(join(base, 'app/studio/components/KonvaKomaCanvas.tsx')));
  const konvaSrc = load('app/studio/components/KonvaKomaCanvas.tsx');
  assert.match(konvaSrc, /from\s+['"]react-konva['"]/);
  assert.match(konvaSrc, /clipFunc/);
  assert.match(konvaSrc, /Stage/);
  assert.match(konvaSrc, /draggable/);

  const editorSrc = load('app/studio/components/PageEditor.tsx');
  assert.match(editorSrc, /import\(['"]\.\/KonvaKomaCanvas['"]\)/);
  assert.match(editorSrc, /ssr:\s*false/);
  assert.match(editorSrc, /<KonvaKomaCanvas/);
});

test('OSS Integration: MangaFlipbookViewer uses react-pageflip HTMLFlipBook with SSR disabled', () => {
  assert.ok(existsSync(join(base, 'app/studio/components/MangaFlipbookViewer.tsx')));
  assert.ok(existsSync(join(base, 'app/studio/components/MangaFlipbookViewer.css')));
  const flipSrc = load('app/studio/components/MangaFlipbookViewer.tsx');
  assert.match(flipSrc, /from\s+['"]react-pageflip['"]/);
  assert.match(flipSrc, /<HTMLFlipBook/);
  assert.match(flipSrc, /forwardRef/);

  const studioSrc = load('app/studio/page.tsx');
  assert.match(studioSrc, /import\(['"]\.\/components\/MangaFlipbookViewer['"]\)/);
  assert.match(studioSrc, /<MangaFlipbookViewer/);
});

test('OSS Integration: buildPrintPdf uses jsPDF with preset trim + bleed dimensions and is wired to Studio & PreflightModal', () => {
  assert.ok(existsSync(join(base, 'lib/export/buildPrintPdf.ts')));
  const pdfSrc = load('lib/export/buildPrintPdf.ts');
  assert.match(pdfSrc, /from\s+['"]jspdf['"]/);
  assert.match(pdfSrc, /new jsPDF\(/);
  assert.match(pdfSrc, /trimWidthMm\s*\+\s*preset\.bleedMm\s*\*\s*2/);
  assert.match(pdfSrc, /renderPrintablePageToPngBase64/);

  const studioSrc = load('app/studio/page.tsx');
  assert.match(studioSrc, /buildPrintPdf/);
  assert.match(studioSrc, /application\/pdf/);

  const modalSrc = load('app/studio/components/PreflightModal.tsx');
  assert.match(modalSrc, /Exportar PDF KDP/);
});

test('OSS Integration: Pollinations.ai fallback remains intact for Gemini rate/quota errors', () => {
  const fallbackSrc = load('lib/kai/freeImageFallback.ts');
  const geminiSrc = load('lib/kai/geminiImage.ts');
  assert.match(fallbackSrc, /image\.pollinations\.ai/);
  assert.match(geminiSrc, /generateFreeImageFallback/);
});
