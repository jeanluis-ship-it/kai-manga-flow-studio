import { NextRequest, NextResponse } from 'next/server';
import { FALLBACK_MODEL_NAME } from '@/lib/kai/freeImageFallback';
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
  geminiImageStatus: EngineCheckStatus;
}

export async function GET() {
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const tokenEnforced =
    process.env.ENFORCE_STUDIO_TOKEN === 'true' && Boolean(process.env.STUDIO_ACCESS_TOKEN);
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const fallbackProvider = process.env.IMAGE_FALLBACK_PROVIDER?.trim() || FALLBACK_MODEL_NAME;

  return NextResponse.json({
    ok: true,
    service: 'mangai-studio',
    imageApiConfigured: geminiConfigured,
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

async function testGeminiImage(apiKey: string): Promise<EngineCheckStatus> {
  if (!apiKey) return { configured: false, ok: false, detail: 'Sin GEMINI_API_KEY configurada.' };
  const model = (process.env.GEMINI_CANVAS_IMAGE_MODEL || KAI_IMAGE_MODEL_DEFAULT).trim();
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'minimal black ink dot on white paper' }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
        signal: AbortSignal.timeout(15_000),
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
    return { configured: true, ok: false, detail: 'Tiempo de espera agotado probando imagen' };
  }
}

export async function POST(req: NextRequest) {
  const isLocalHost = req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1';
  const headerKey = (req.headers.get('x-mangai-llave') || '').trim();
  const apiKey = (/^AIza/i.test(headerKey) ? headerKey : '') || (process.env.GEMINI_API_KEY || '').trim();

  const [geminiTextStatus, geminiImageStatus] = await Promise.all([
    testGeminiText(apiKey),
    testGeminiImage(apiKey),
  ]);

  const liveGeminiOk = geminiTextStatus.ok && geminiImageStatus.ok;
  return NextResponse.json({
    ok: true,
    source: isLocalHost ? 'local' : 'vercel',
    fallbackReady: true,
    fallbackProvider: FALLBACK_MODEL_NAME,
    summary: liveGeminiOk
      ? `Motores oficiales verificados: ${KAI_TEXT_MODEL_DEFAULT} + ${KAI_IMAGE_MODEL_DEFAULT}.`
      : `Respaldo Beta activo (${FALLBACK_MODEL_NAME} + Modo Guía KAI). Gemini en vivo sin cuota o sin llave.`,
    recommendation: liveGeminiOk
      ? 'Listo para generar personajes, portadas, viñetas y mejoras de boceto.'
      : 'Puedes trabajar normalmente con el respaldo Beta o configurar GEMINI_API_KEY / Llave IA.',
    geminiTextStatus,
    geminiImageStatus,
  } satisfies HealthDiagnosticsResponse);
}
