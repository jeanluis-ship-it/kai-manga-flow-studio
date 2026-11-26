import { NextRequest, NextResponse } from 'next/server';
const FALLBACK_MODEL_NAME = 'FLUX.1 [schnell]';
import {
  KAI_IMAGE_MODEL_DEFAULT,
  KAI_TEXT_MODEL_DEFAULT,
} from '@/lib/kai/studioCanvas';

export const runtime = 'nodejs';
export const maxDuration = 30;

export interface EngineCheckStatus {
  configured: boolean;
  ok: boolean;
  code?: number;
  detail: string;
}

export interface HealthDiagnosticsResponse {
  ok: boolean;
  source: 'local' | 'vercel';
  summary: string;
  recommendation: string;
  fallbackReady: boolean;
  fallbackProvider: string;
  geminiTextStatus: EngineCheckStatus;
  fluxImageStatus: EngineCheckStatus;
}

export async function GET() {
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const tokenEnforced =
    process.env.ENFORCE_STUDIO_TOKEN === 'true' && Boolean(process.env.STUDIO_ACCESS_TOKEN);
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const fallbackProvider = process.env.CLOUDFLARE_WORKERS_AI_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID ? 'Cloudflare FLUX' : FALLBACK_MODEL_NAME;

  return NextResponse.json({
    ok: true,
    service: 'mangai-studio',
    imageApiConfigured: true,
    fallbackReady: true,
    fallbackProvider: FALLBACK_MODEL_NAME,
    requiresAccessToken: tokenEnforced,
    models: {
      text: KAI_TEXT_MODEL_DEFAULT,
      image: KAI_IMAGE_MODEL_DEFAULT,
      fallbackImage: FALLBACK_MODEL_NAME,
    },
    providers: {
      gemini: geminiConfigured,
      fallback: fallbackProvider,
      supabase: supabaseConfigured,
    },
  });
}

async function testGeminiText(apiKey: string): Promise<EngineCheckStatus> {
  if (!apiKey) return { configured: false, ok: false, detail: 'Sin GEMINI_API_KEY configurada.' };
  const model = (process.env.GEMINI_KAI_MODEL || KAI_TEXT_MODEL_DEFAULT).trim();
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 4 },
        }),
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (resp.ok) {
      return { configured: true, ok: true, code: resp.status, detail: `Activo (${model})` };
    }
    return {
      configured: true,
      ok: false,
      code: resp.status,
      detail: `Respuesta HTTP ${resp.status} (${model})`,
    };
  } catch {
    return { configured: true, ok: false, detail: 'Tiempo de espera agotado' };
  }
}

async function checkFluxQueue(): Promise<EngineCheckStatus> {
  try {
    const response = await fetch('https://black-forest-labs-flux-2-klein-4b.hf.space/gradio_api/info', { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    const ready = response.ok && Boolean((await response.json()).named_endpoints?.['/infer']);
    return { configured: true, ok: ready, code: response.status, detail: ready ? 'Cola FLUX accesible' : 'Cola FLUX no disponible' };
  } catch {
    return { configured: true, ok: false, detail: 'Sin respuesta de la cola FLUX' };
  }
}

export async function POST(req: NextRequest) {
  const isLocalHost = req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1';
  const headerKey = (req.headers.get('x-mangai-llave') || '').trim();
  const apiKey = (/^AIza/i.test(headerKey) ? headerKey : '') || (process.env.GEMINI_API_KEY || '').trim();

  const [geminiTextStatus, fluxImageStatus] = await Promise.all([
    testGeminiText(apiKey),
    checkFluxQueue(),
  ]);

  const liveGeminiOk = geminiTextStatus.ok && fluxImageStatus.ok;
  return NextResponse.json({
    ok: true,
    source: isLocalHost ? 'local' : 'vercel',
    fallbackReady: true,
    fallbackProvider: FALLBACK_MODEL_NAME,
    summary: liveGeminiOk
      ? `Servicios accesibles: ${KAI_TEXT_MODEL_DEFAULT} + ${KAI_IMAGE_MODEL_DEFAULT}.`
      : `Consulta el estado individual de KAI y FLUX.`,
    recommendation: liveGeminiOk
      ? 'Listo para generar personajes, portadas, viñetas y mejoras de boceto.'
      : 'Revisa la conexión del servicio indicado.',
    geminiTextStatus,
    fluxImageStatus,
  } satisfies HealthDiagnosticsResponse);
}
