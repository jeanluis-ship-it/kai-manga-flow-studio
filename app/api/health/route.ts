import { NextRequest, NextResponse } from 'next/server';

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
  const hfConfigured = Boolean(process.env.HF_API_TOKEN);
  const tokenEnforced = process.env.ENFORCE_STUDIO_TOKEN === 'true' && Boolean(process.env.STUDIO_ACCESS_TOKEN);

  return NextResponse.json({
    ok: true,
    service: 'mangai-studio',
    imageApiConfigured: true,
    requiresAccessToken: tokenEnforced,
    providers: {
      gemini: geminiConfigured,
      openai: openaiConfigured,
      huggingface: hfConfigured,
      builtInMangaEngine: true,
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
        detail: '⚠️ Bloqueado por Plan Gratis de Google (HTTP 429 — cuota 0 para imágenes, requiere Tier 1)',
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

async function testHuggingFace(token: string): Promise<EngineCheckStatus> {
  if (!token) return { configured: false, ok: false, detail: 'No configurado (Opcional 100% gratis en huggingface.co)' };
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
      return { configured: true, ok: true, code: 200, detail: '✅ FLUX.1-schnell HD conectado y listo (sin marca de agua)' };
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

async function testOpenAI(apiKey: string): Promise<EngineCheckStatus> {
  if (!apiKey) return { configured: false, ok: false, detail: 'No configurado.' };
  try {
    const resp = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(6_000),
    });
    if (resp.ok) {
      return { configured: true, ok: true, code: 200, detail: '✅ Clave OpenAI válida y conectada' };
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

  const customApiKey = String(body.customApiKey ?? '').trim().slice(0, 260);
  const preferredModel = String(body.preferredModel ?? '').trim().slice(0, 80);

  const isLocalHost = req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1';
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
      hfStatus.ok ? 'HuggingFace FLUX.1-schnell' : '',
      openaiStatus.ok ? 'OpenAI GPT-Image' : '',
    ].filter(Boolean);
    summary = `Motor oficial listo: ${activeNames.join(' + ')}. Ya no usará Pollinations.`;
    recommendation = 'Ya puedes pulsar "Refresh Lock", "Generate Full Wrap" o "Generate High-Res Ink".';
  } else if (geminiImageStatus.code === 429) {
    summary = 'Por eso salió pollinations.ai: Google bloqueó las imágenes en el Plan Gratis (HTTP 429).';
    recommendation =
      'Elige una solución: (A) Crea un token 100% gratis (sin tarjeta) en huggingface.co/settings/tokens con permiso "Make calls to Inference Providers", pégalo abajo en 🔑 Pegar llave propia y selecciona FLUX.1 Schnell HD; o (B) Activa Facturación Tier 1 en aistudio.google.com/apikey para desbloquear Nano Banana Pro.';
  } else {
    summary = 'Ningún motor oficial de imagen tiene cuota o clave válida todavía (usando respaldo Pollinations).';
    recommendation =
      'Pega un token gratuito hf_... de HuggingFace (sin tarjeta) o una clave Gemini Tier 1 / OpenAI sk-... abajo para probar al instante.';
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
