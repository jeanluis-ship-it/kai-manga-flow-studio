import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const base = process.cwd();
const load = (p) => readFileSync(join(base, p), 'utf8');

test('preserves the animated landing and asset folders', () => {
  assert.ok(existsSync(join(base, 'public/landing/index.html')));
  assert.ok(existsSync(join(base, 'public/landing/landing.js')));
  assert.ok(load('public/landing/index.html').includes('data-open-studio'));
  assert.ok(load('public/landing/landing.js').includes("window.location.assign('/studio')"));
});

test('never puts API credentials in public assets', () => {
  assert.doesNotMatch(load('public/landing/landing.js'), /OPENAI_API_KEY|GEMINI_API_KEY|sk-proj-/);
  assert.doesNotMatch(load('public/landing/index.html'), /OPENAI_API_KEY|GEMINI_API_KEY|sk-proj-/);
});

test('Image and script APIs route to FLUX and Gemini respectively', () => {
  const imgApi = load('app/api/flux/generate/route.ts');
  const scriptApi = load('app/api/kai/script/route.ts');

  assert.match(imgApi, /STUDIO_ACCESS_TOKEN/);
  assert.match(imgApi, /generateFluxImage/);
  assert.doesNotMatch(imgApi, /generateGeminiImage/);
  assert.doesNotMatch(imgApi, /OpenAI|huggingface|pollinations|cloudflare/i);

  assert.match(scriptApi, /GEMINI_API_KEY/);
  assert.match(scriptApi, /KAI_TEXT_MODEL_DEFAULT/);
  assert.doesNotMatch(scriptApi, /OpenAI/i);
});
