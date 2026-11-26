import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildConciseFallbackPrompt,
  buildPollinationsUrls,
  FALLBACK_MODEL_NAME,
  generateFreeImageFallback,
  mapAspectRatioToDimensions,
  synthesizeLocalMangaArtwork,
} from '../lib/kai/freeImageFallback.ts';

const base = process.cwd();
const load = (p) => readFileSync(join(base, p), 'utf8');

test('freeImageFallback: maps all aspect ratios and builds concise Pollinations URLs', () => {
  assert.deepEqual(mapAspectRatioToDimensions('3:4'), { width: 768, height: 1024 });
  assert.deepEqual(mapAspectRatioToDimensions('16:9'), { width: 1280, height: 720 });
  assert.deepEqual(mapAspectRatioToDimensions('1:1'), { width: 1024, height: 1024 });
  assert.deepEqual(mapAspectRatioToDimensions('9:16'), { width: 720, height: 1280 });
  assert.deepEqual(mapAspectRatioToDimensions('4:3'), { width: 1024, height: 768 });

  const longPrompt = `Anacaona warrior in tropical storm ${'detail '.repeat(180)}`;
  const concise = buildConciseFallbackPrompt(longPrompt);
  assert.ok(concise.length > 20 && concise.length < 750, `Expected <750 chars, got ${concise.length}`);

  const urls = buildPollinationsUrls('Anacaona hero portrait SEED-4291', '3:4', 'SEED-4291');
  assert.equal(urls.length, 2);
  assert.match(urls[0], /^https:\/\/image\.pollinations\.ai\/prompt\//);
  assert.match(urls[1], /^https:\/\/gen\.pollinations\.ai\/image\//);
  assert.match(urls[0], /width=768&height=1024&seed=4291&nologo=true&model=flux/);
});

test('freeImageFallback: synthesizeLocalMangaArtwork produces valid high-res PNG via sharp', async () => {
  const result = await synthesizeLocalMangaArtwork({
    prompt: 'Shonen hero standing on rooftop at dusk',
    aspectRatio: '16:9',
    seed: '777',
  });

  assert.equal(result.mimeType, 'image/png');
  assert.equal(result.renderKind, 'fallback-raster');
  assert.equal(result.fallbackUsed, true);
  assert.ok(result.image.startsWith('data:image/png;base64,'));
  const bytes = Buffer.from(result.image.split(',')[1], 'base64');
  assert.ok(bytes.byteLength > 1024, `Synthesized PNG too small: ${bytes.byteLength}`);
  // Check PNG magic header
  assert.equal(bytes.subarray(0, 4).toString('hex'), '89504e47');
});

test('freeImageFallback: generateFreeImageFallback validates Pollinations HTTP 200 + image/* + >1024 bytes', async () => {
  const originalFetch = globalThis.fetch;
  const fakePng = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(2048, 0xab)]);

  try {
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes('image.pollinations.ai')) {
        return new Response('rate limited', { status: 429, headers: { 'content-type': 'text/plain' } });
      }
      if (url.includes('gen.pollinations.ai')) {
        return new Response(fakePng, { status: 200, headers: { 'content-type': 'image/png' } });
      }
      return new Response('not found', { status: 404 });
    };

    const res = await generateFreeImageFallback({
      prompt: 'Anacaona dramatic ink panel',
      aspectRatio: '3:4',
      seed: 9123,
    });

    assert.ok(res);
    assert.equal(res.model, FALLBACK_MODEL_NAME);
    assert.equal(res.renderKind, 'fallback-raster');
    assert.equal(res.fallbackUsed, true);
    assert.equal(res.mimeType, 'image/png');
    assert.ok(res.image.startsWith('data:image/png;base64,'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Image API & GeminiImage contracts preserve test constraints and unblocked fallback', () => {
  const generateRoute = load('app/api/flux/generate/route.ts');
  const canvasRoute = load('app/api/kai/canvas/route.ts');
  const geminiImage = load('lib/kai/geminiImage.ts');
  const healthRoute = load('app/api/health/route.ts');

  // Repository & sprint4 constraints on generate/route.ts
  assert.match(generateRoute, /STUDIO_ACCESS_TOKEN/);
  assert.match(generateRoute, /generateFluxImage/);
  assert.doesNotMatch(generateRoute, /generateGeminiImage/);
  assert.match(generateRoute, /QUOTA_EXCEEDED/);
  assert.match(generateRoute, /status:\s*402/);
  assert.doesNotMatch(generateRoute, /OpenAI|huggingface|pollinations|cloudflare/i);

  // Unblocked key/seed handling in generate & canvas routes
  assert.match(generateRoute, /x-mangai-access/);
  assert.match(generateRoute, /SEED-\(\\d\+\)/);
  assert.doesNotMatch(generateRoute, /status:\s*503/);
  assert.ok(canvasRoute.includes('@/app/api/flux/generate/route'));
  assert.doesNotMatch(canvasRoute, /status:\s*503/);

  // 3-tier fallback in geminiImage.ts
  assert.match(geminiImage, /gemini-2\.5-flash-image/);
  assert.match(geminiImage, /gemini-3\.1-flash-lite-image/);
  assert.match(geminiImage, /generateFreeImageFallback/);
  assert.match(geminiImage, /generateGeminiSketch/);
  assert.match(geminiImage, /synthesizeLocalMangaArtwork/);

  // Health route fallback readiness
  assert.match(healthRoute, /fallbackProvider/);
  assert.match(healthRoute, /FALLBACK_MODEL_NAME|pollinations-flux-beta/);
});

test('KAI Chat route supports x-mangai-llave and Beta fallback with [PROMPT VISUAL]:', () => {
  const chatRoute = load('app/api/kai/chat/route.ts');

  assert.match(chatRoute, /export const runtime\s*=\s*['"]nodejs['"]/);
  assert.match(chatRoute, /x-mangai-llave/);
  assert.match(chatRoute, /process\.env\.GEMINI_API_KEY/);
  assert.match(chatRoute, /\[Modo Guía Beta — sin cuota LLM en vivo/);
  assert.match(chatRoute, /\[PROMPT VISUAL\]:/);
  assert.match(chatRoute, /status:\s*200/);
});

test('Login page & CSS sync mangai-studio-theme-v1 and offer honest Local Device Profile Beta', () => {
  const loginPage = load('app/login/page.tsx');
  const loginCss = load('app/login/login.css');

  assert.match(loginPage, /signInWithOAuth/);
  assert.match(loginPage, /Continuar con Google/);
  assert.match(loginPage, /mangai-studio-theme-v1/);
  assert.match(loginPage, /data-theme=\{theme\}/);
  assert.match(loginPage, /ml-theme-btn/);
  assert.match(loginPage, /Perfil Local en este Dispositivo \(Beta\)/);
  assert.match(loginPage, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(loginPage, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  assert.match(loginCss, /\[data-theme='dark'\]/);
});

test('studioRepository exports loadUserProjectList and preserves extended Project/Settei/Cover fields', () => {
  const repo = load('lib/storage/studioRepository.ts');

  assert.match(repo, /export async function loadUserProjectList/);
  assert.match(repo, /mangai-local-session-v1/);
  assert.match(repo, /mangai-user-projects-v1:/);
  for (const field of [
    'colorMode',
    'bindingType',
    'volumeSlug',
    'activeInCanon',
    'referenceViews',
    'frontBase64',
    'backBase64',
    'spineTitle',
    'backSynopsis',
  ]) {
    assert.ok(repo.includes(field), `studioRepository.ts must preserve field: ${field}`);
  }
});

test('.env.example and DEPLOY_VERCEL.md document fallback and Supabase env keys', () => {
  const envExample = load('.env.example');
  const deployDoc = load('docs/DEPLOY_VERCEL.md');

  for (const key of [
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_WORKERS_AI_TOKEN',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]) {
    assert.ok(envExample.includes(key), `.env.example missing ${key}`);
    assert.ok(deployDoc.includes(key), `docs/DEPLOY_VERCEL.md missing ${key}`);
  }
});
