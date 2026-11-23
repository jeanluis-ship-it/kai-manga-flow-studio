import { NextRequest, NextResponse } from 'next/server';
import {
  KAI_IMAGE_MODEL_DEFAULT,
  KaiCanvasGenerateRequestSchema,
  buildFullCanvasPrompt,
} from '@/lib/kai/studioCanvas';
import { checkQuota } from '@/lib/plans/quotas';
import { getServerQuotaContext } from '@/lib/plans/serverAuth';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface GeminiInlineData {
  mimeType?: string;
  mime_type?: string;
  data?: string;
}

interface GeminiCandidatePart {
  inlineData?: GeminiInlineData;
  inline_data?: GeminiInlineData;
}

function extractInlineImage(parts: GeminiCandidatePart[]): { data: string; mimeType: string } | null {
  for (const part of parts) {
    const inline = part.inlineData ?? part.inline_data;
    if (inline?.data) {
      const mimeType =
        (inline.mimeType || inline.mime_type || 'image/png').trim() || 'image/png';
      return { data: inline.data, mimeType };
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 });
  }

  const parsed = KaiCanvasGenerateRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Solicitud inválida para el lienzo generador.',
        issues: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // Enforce trial expiry on authenticated Supabase accounts without blocking Guest mode.
  const serverQuota = await getServerQuotaContext();
  if (serverQuota) {
    const trialCheck = checkQuota(serverQuota.profile, serverQuota.usage, 'TRIAL_EXPIRED');
    if (!trialCheck.allowed) {
      return NextResponse.json(
        {
          code: 'QUOTA_EXCEEDED',
          requiredPlan: trialCheck.requiredPlan || 'starter',
          error: trialCheck.reason || 'Período Trial expirado.',
        },
        { status: 402 },
      );
    }
  }

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Falta GEMINI_API_KEY en las variables de entorno del servidor (.env.local / Vercel).',
      },
      { status: 503 },
    );
  }

  const fullPrompt = buildFullCanvasPrompt(input.prompt, input.style, input.aspectRatio);
  const model = (process.env.GEMINI_CANVAS_IMAGE_MODEL || KAI_IMAGE_MODEL_DEFAULT).trim();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  try {
    const upstreamRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: fullPrompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: input.aspectRatio,
          },
        },
      }),
      signal: AbortSignal.timeout(50_000),
    });

    if (!upstreamRes.ok) {
      console.error('Gemini Kai canvas upstream error', {
        status: upstreamRes.status,
        model,
      });

      if (upstreamRes.status === 429) {
        return NextResponse.json(
          {
            error:
              'Se alcanzó el límite temporal de generación de imágenes en Gemini. Prueba de nuevo más tarde.',
          },
          { status: 429 },
        );
      }

      return NextResponse.json(
        {
          error:
            'No se pudo generar la ilustración en Gemini. Verifica el modelo o la cuota de imágenes.',
        },
        { status: 502 },
      );
    }

    const data = (await upstreamRes.json()) as {
      candidates?: Array<{
        content?: {
          parts?: GeminiCandidatePart[];
        };
      }>;
    };

    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const imageResult = extractInlineImage(parts);

    if (!imageResult) {
      return NextResponse.json(
        { error: 'No se recibió imagen del modelo.' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      image: `data:${imageResult.mimeType};base64,${imageResult.data}`,
      mimeType: imageResult.mimeType,
      model,
      promptUsed: fullPrompt,
    });
  } catch (err) {
    const isTimeout =
      err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    console.error('Gemini Kai canvas request failed', {
      reason: isTimeout ? 'timeout' : 'network_or_parse_error',
      model,
    });
    return NextResponse.json(
      {
        error: isTimeout
          ? 'La generación de la ilustración superó el tiempo límite. Intenta de nuevo.'
          : 'Error de conexión al generar la ilustración con Gemini.',
      },
      { status: 502 },
    );
  }
}
