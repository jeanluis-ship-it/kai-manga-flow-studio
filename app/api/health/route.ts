import { NextRequest, NextResponse } from 'next/server';

import { cloudflareImageConfig } from '@/lib/cloudflare-images';
import { CLOUDFLARE_IMAGE_MODEL } from '@/lib/prompts';

export const runtime = 'nodejs';
export const maxDuration = 45;

export interface EngineCheckStatus {
  configured: boolean;
  ok: boolean;
  code?: number;
  detail: string;
}

export interface HealthDiagnosticsResponse {
  ok: boolean;
  source: 'local' | 'vercel' | 'vercel-proxy';
  summary: string;
  recommendation: string;
  geminiTextStatus: EngineCheckStatus;
  geminiImageStatus: EngineCheckStatus;
  hfStatus: EngineCheckStatus;
  openaiStatus: EngineCheckStatus;
}

export async function GET() {
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const cloudflareConfigured = Boolean(cloudflareImageConfig());
  const hfConfigured = Boolean(process.env.HF_API_TOKEN);
  const tokenEnforced = process.env.ENFORCE_STUDIO_TOKEN === 'true' && Boolean(process.env.STUDIO_ACCESS_TOKEN);

  return NextResponse.json({
    ok: true,
    service: 'mangai-studio',
    imageApiConfigured: cloudflareConfigured || geminiConfigured || openaiConfigured || hfConfigured || Boolean(process.env.POLLINATIONS_API_KEY),
    requiresAccessToken: tokenEnforced,
    providers: {
      gemini: geminiConfigured,
      cloudflare: cloudflareConfigured,
      openai: openaiConfigured,
      huggingface: hfConfigured,
      builtInMangaEngine: false, // SVG mockups are not AI-generated images
    },
  });
}

async function testGeminiText(apiKey: string): Promise<EngineCheckStatus> {
  if (!apiKey) return { configured: false, ok: false, detail: 'Sin GEMINI_API_KEY configurada.' };
  try {
    const listResp = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(5_000),
    });
    if (!listResp.ok) {
      return {
        configured: true,
        ok: false,
        code: listResp.status,
        detail: listResp.status === 400 || listResp.status === 401 || listResp.status === 403
          ? `❌ Clave rechazada (HTTP ${listResp.status})`
          : `⚠️ Error listando modelos (HTTP ${listResp.status})`,
      };
    }
    const listData = (await listResp.json()) as {
      models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
    };
    const candidates = (listData.models ?? [])
      .filter((m) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
      .map((m) => (m.name ?? '').replace(/^models\//, ''))
      .filter((n) => n.includes('flash') && !n.includes('image') && !n.includes('tts') && !n.includes('audio'));
    const textModel = candidates[0] || 'gemini-3.8-flash';

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${textModel}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 2 },
        }),
        signal: AbortSignal.timeout(7_000),
      },
    );
    if (resp.ok) {
      return { configured: true, ok: true, code: resp.status, detail: `✅ Activo (${textModel} optimiza prompts)` };
    }
    if (resp.status === 429) {
      return { configured: true, ok: false, code: 429, detail: '⚠️ Límite temporal alcanzado (HTTP 429)' };
    }
    if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
      return { configured: true, ok: false, code: resp.status, detail: `❌ Clave rechazada (HTTP ${resp.status})` };
    }
    return { configured: true, ok: false, code: resp.status, detail: `⚠️ Respuesta HTTP ${resp.status} (${textModel})` };
  } catch {
    return { configured: true, ok: false, detail: '⚠️ Tiempo de espera agotado' };
  }
}

async function testGeminiImage(apiKey: string, preferredModel?: string): Promise<EngineCheckStatus> {
  if (!apiKey) return { configured: false, ok: false, detail: 'Sin GEMINI_API_KEY configurada.' };
  const modelId =
    preferredModel && !preferredModel.startsWith('gpt-') && preferredModel !== 'flux-schnell-hf' && !preferredModel.startsWith('imagen-')
      ? preferredModel
      : 'gemini-2.5-flash-image';

  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'minimal black ink dot on white paper' }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (resp.ok) {
      return { configured: true, ok: true, code: resp.status, detail: `✅ Activo con cuota real (${modelId})` };
    }
    if (resp.status === 429) {
      return {
        configured: true,
        ok: false,
        code: 429,
        detail: '⚠️ Google rechazó la generación (HTTP 429): cuota agotada o no disponible para esta clave. Revisa uso y facturación en AI Studio.',
      };
    }
    if (resp.status === 404) {
      // Fallback probe on baseline gemini-2.5-flash-image when alias differs
      if (modelId !== 'gemini-2.5-flash-image') {
        return testGeminiImage(apiKey, 'gemini-2.5-flash-image');
      }
      return { configured: true, ok: false, code: 404, detail: `⚠️ Modelo no disponible en esta llave (${modelId}: 404)` };
    }
    if (resp.status === 401 || resp.status === 403 || resp.status === 400) {
      return { configured: true, ok: false, code: resp.status, detail: `❌ Permiso/clave rechazada (HTTP ${resp.status})` };
    }
    return { configured: true, ok: false, code: resp.status, detail: `⚠️ Error HTTP ${resp.status}` };
  } catch {
    return { configured: true, ok: false, detail: '⚠️ Tiempo de espera agotado probando imagen' };
  }
}

function isValidCustomKey(key: string) {
  return (
    key.length >= 24 &&
    !key.includes('...') &&
    !key.includes('••') &&
    (key.startsWith('AIza') || key.startsWith('sk-') || key.startsWith('hf_'))
  );
}

async function probeDirectFluxSpace(): Promise<EngineCheckStatus> {
  try {
    const resp = await fetch('https://black-forest-labs-flux-1-schnell.hf.space/gradio_api/info', {
      signal: AbortSignal.timeout(5_000),
    });
    if (resp.ok) {
      return {
        configured: false,
        ok: false,
        code: 200,
        detail: 'ℹ️ FLUX Space responde, pero el chequeo /info NO verifica la GPU ni garantiza generar imágenes.',
      };
    }
    return {
      configured: false,
      ok: false,
      code: resp.status,
      detail: `⚠️ Nodo directo FLUX devolvió HTTP ${resp.status}`,
    };
  } catch {
    return {
      configured: false,
      ok: false,
      detail: '⚠️ Nodo directo FLUX temporalmente ocupado',
    };
  }
}

async function testHuggingFace(token: string): Promise<EngineCheckStatus> {
  if (!token) {
    return probeDirectFluxSpace();
  }
  try {
    const whoResp = await fetch('https://huggingface.co/api/whoami-v2', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(6_000),
    });
    if (!whoResp.ok) {
      return { configured: true, ok: false, code: whoResp.status, detail: `❌ Token HuggingFace inválido (HTTP ${whoResp.status})` };
    }
    const infResp = await fetch('https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: 'manga ink portrait',
        parameters: { width: 256, height: 256, num_inference_steps: 1 },
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (infResp.ok) {
      const mime = (infResp.headers.get('content-type') ?? '').split(';')[0].trim();
      if (mime.startsWith('image/')) {
        return { configured: true, ok: true, code: 200, detail: '✅ Hugging Face devolvió una imagen en la prueba.' };
      }
      return { configured: true, ok: false, code: 200, detail: '⚠️ Router HF respondió, pero no devolvió una imagen.' };
    }
    if (infResp.status === 403) {
      return {
        configured: true,
        ok: false,
        code: 403,
        detail: '⚠️ Token válido pero sin permiso "Make calls to Inference Providers" (HTTP 403)',
      };
    }
    return { configured: true, ok: false, code: infResp.status, detail: `⚠️ Router HF devolvió HTTP ${infResp.status}` };
  } catch {
    return { configured: true, ok: false, detail: '⚠️ Tiempo de espera agotado conectando con HuggingFace' };
  }
}

async function testOpenAI(apiKey: string, model = 'gpt-image-2.5-flare'): Promise<EngineCheckStatus> {
  if (!apiKey) return { configured: false, ok: false, detail: 'No configurado.' };
  try {
    const resp = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(6_000),
    });
    if (resp.ok) {
      return { configured: true, ok: true, code: 200, detail: `Acceso al modelo ${model} confirmado. La generación usa saldo de API.` };
    }
    if (resp.status === 401) {
      return { configured: true, ok: false, code: 401, detail: '❌ Clave OpenAI inválida (HTTP 401)' };
    }
    return { configured: true, ok: false, code: resp.status, detail: `⚠️ Estado OpenAI HTTP ${resp.status}` };
  } catch {
    return { configured: true, ok: false, detail: '⚠️ Tiempo de espera agotado conectando con OpenAI' };
  }
}

export async function POST(req: NextRequest) {
  let body: { customApiKey?: string; preferredModel?: string } = {};
  try {
    body = (await req.json()) as { customApiKey?: string; preferredModel?: string };
  } catch {
    body = {};
  }

  const rawCustomKey = String(body.customApiKey ?? '').trim().slice(0, 260);
  const customApiKey = isValidCustomKey(rawCustomKey) ? rawCustomKey : '';
  const preferredModel = String(body.preferredModel ?? '').trim().slice(0, 80);

  const isLocalHost = req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1';
  if (preferredModel.startsWith('gpt-')) {
    const key = customApiKey.startsWith('sk-') ? customApiKey : process.env.OPENAI_API_KEY || '';
    const openaiStatus = await testOpenAI(key, preferredModel);
    const skipped = { configured: false, ok: false, detail: 'Sin comprobar para este modelo.' };
    return NextResponse.json({
      ok: openaiStatus.ok, source: isLocalHost ? 'local' : 'vercel',
      summary: openaiStatus.ok ? 'Modelo de OpenAI accesible.' : 'GPT Imágenes requiere una clave con acceso al modelo.',
      recommendation: key ? openaiStatus.detail : 'Usa una clave personal con saldo en «Llave» o configura OPENAI_API_KEY en el servidor.',
      openaiStatus, geminiTextStatus: skipped, geminiImageStatus: skipped, hfStatus: skipped,
    } satisfies HealthDiagnosticsResponse);
  }
  if (preferredModel === CLOUDFLARE_IMAGE_MODEL) {
    const configured = Boolean(cloudflareImageConfig());
    const unchecked = { configured: false, ok: false, detail: 'Sin comprobar para el modelo seleccionado.' };
    return NextResponse.json({
      ok: false,
      source: isLocalHost ? 'local' : 'vercel',
      summary: configured ? 'Cloudflare Workers AI está configurado.' : 'Cloudflare Workers AI requiere configuración.',
      recommendation: configured
        ? 'Genera una imagen para confirmar el acceso y la cuota.'
        : 'Configura CLOUDFLARE_ACCOUNT_ID y CLOUDFLARE_WORKERS_AI_TOKEN en el servidor.',
      geminiTextStatus: unchecked,
      geminiImageStatus: unchecked,
      hfStatus: unchecked,
      openaiStatus: unchecked,
    } satisfies HealthDiagnosticsResponse);
  }

  const alreadyForwarded = req.headers.get('x-mangai-forwarded') === '1';

  // Forward to Vercel if running locally with zero local env keys and no user-supplied key
  if (
    isLocalHost &&
    !alreadyForwarded &&
    !customApiKey &&
    !process.env.OPENAI_API_KEY &&
    !process.env.GEMINI_API_KEY &&
    !process.env.HF_API_TOKEN
  ) {
    try {
      const relay = await fetch('https://kai-manga-flow-studio.vercel.app/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-mangai-forwarded': '1' },
        body: JSON.stringify({ preferredModel }),
        signal: AbortSignal.timeout(20_000),
      });
      if (relay.ok) {
        const data = (await relay.json()) as HealthDiagnosticsResponse;
        return NextResponse.json({ ...data, source: 'vercel-proxy' });
      }
    } catch {
      // Fall through cleanly to local probe.
    }
  }

  const geminiKey = customApiKey.startsWith('AIza') ? customApiKey : process.env.GEMINI_API_KEY || '';
  const openaiKey = customApiKey.startsWith('sk-') ? customApiKey : process.env.OPENAI_API_KEY || '';
  const hfKey = customApiKey.startsWith('hf_') ? customApiKey : process.env.HF_API_TOKEN || '';

  const [geminiTextStatus, geminiImageStatus, hfStatus, openaiStatus] = await Promise.all([
    testGeminiText(geminiKey),
    testGeminiImage(geminiKey, preferredModel),
    testHuggingFace(hfKey),
    testOpenAI(openaiKey),
  ]);

  const anyOfficialImageReady = geminiImageStatus.ok || hfStatus.ok || openaiStatus.ok;

  let summary = '';
  let recommendation = '';
  if (anyOfficialImageReady) {
    const activeNames = [
      geminiImageStatus.ok ? 'Google Nano Banana' : '',
      hfStatus.ok ? 'FLUX.1-schnell HD Directo' : '',
      openaiStatus.ok ? 'OpenAI GPT-Image' : '',
    ].filter(Boolean);
    summary = `Conexión de proveedor verificada: ${activeNames.join(' + ')}.`;
    recommendation = 'Comprueba la cuota antes de generar. Una clave válida no garantiza crédito o acceso al modelo.';
  } else if (geminiImageStatus.code === 429) {
    summary = 'Google devolvió HTTP 429 y el Space gratuito FLUX no garantiza disponibilidad de GPU.';
    recommendation =
      'Consulta la cuota y facturación de Google AI Studio o configura Hugging Face / OpenAI con permisos y saldo activos.';
  } else {
    summary = 'Ningún motor HD respondió en este momento.';
    recommendation = 'Configura un proveedor con cuota activa; el Space gratuito no garantiza capacidad de generación.';
  }

  const result: HealthDiagnosticsResponse = {
    ok: anyOfficialImageReady,
    source: isLocalHost ? 'local' : 'vercel',
    summary,
    recommendation,
    geminiTextStatus,
    geminiImageStatus,
    hfStatus,
    openaiStatus,
  };

  return NextResponse.json(result);
}
