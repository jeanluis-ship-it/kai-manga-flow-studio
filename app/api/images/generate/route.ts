import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { KAI_IMAGE_MODEL_DEFAULT } from '@/lib/kai/studioCanvas';
import { IMAGE_MODES } from '@/lib/prompts';
import { checkQuota } from '@/lib/plans/quotas';
import { getServerQuotaContext } from '@/lib/plans/serverAuth';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_BYTES = 6 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const VALID_ASPECTS = new Set(['1:1', '3:4', '4:3', '16:9', '9:16']);

interface GeminiInlineData {
  mimeType?: string;
  mime_type?: string;
  data?: string;
}

interface GeminiPart {
  inlineData?: GeminiInlineData;
  inline_data?: GeminiInlineData;
}

const safeCompare = (received: string, expected: string) => {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
};

const read = (form: FormData, name: string, max = 2600) =>
  String(form.get(name) ?? '').trim().slice(0, max);

function extractInlineImage(parts: GeminiPart[]): { data: string; mimeType: string } | null {
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
  const enforceToken =
    process.env.ENFORCE_STUDIO_TOKEN === 'true' && Boolean(process.env.STUDIO_ACCESS_TOKEN);
  if (enforceToken && process.env.STUDIO_ACCESS_TOKEN) {
    if (!safeCompare(req.headers.get('x-mangai-access') ?? '', process.env.STUDIO_ACCESS_TOKEN)) {
      return NextResponse.json({ error: 'Código de acceso incorrecto.' }, { status: 401 });
    }
  }

  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Formato de solicitud inválido.' }, { status: 400 });
  }

  try {
    const form = await req.formData();
    const useHdModel = read(form, 'useHdModel', 16) === 'true';
    const renderPriority = read(form, 'renderPriority', 16) === 'true';

    // Server-side quota validation for authenticated Supabase users (HTTP 402)
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
      if (useHdModel) {
        const hdCheck = checkQuota(serverQuota.profile, serverQuota.usage, 'USE_HD_MODEL');
        if (!hdCheck.allowed) {
          return NextResponse.json(
            {
              code: 'QUOTA_EXCEEDED',
              requiredPlan: 'pro',
              error:
                hdCheck.reason ||
                'El modo Gemini 3.1 Flash Image HD requiere Plan Pro o Master.',
            },
            { status: 402 },
          );
        }
      }
      if (renderPriority) {
        const prioCheck = checkQuota(
          serverQuota.profile,
          serverQuota.usage,
          'USE_RENDER_PRIORITY',
        );
        if (!prioCheck.allowed) {
          return NextResponse.json(
            {
              code: 'QUOTA_EXCEEDED',
              requiredPlan: 'master',
              error: prioCheck.reason || 'Prioridad de Render requiere Plan Master.',
            },
            { status: 402 },
          );
        }
      }
    }

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    const isLocalHost =
      req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1';
    const alreadyForwarded = req.headers.get('x-mangai-forwarded') === '1';

    if (!apiKey && isLocalHost && !alreadyForwarded) {
      try {
        const relayResp = await fetch(
          'https://kai-manga-flow-studio.vercel.app/api/images/generate',
          {
            method: 'POST',
            headers: { 'x-mangai-forwarded': '1' },
            body: form,
            signal: AbortSignal.timeout(50_000),
          },
        );
        if (relayResp.ok) {
          const relayData = (await relayResp.json()) as {
            image?: string;
            model?: string;
            mode?: string;
          };
          if (relayData?.image) {
            return NextResponse.json({
              ...relayData,
              model: relayData.model || KAI_IMAGE_MODEL_DEFAULT,
            });
          }
        }
      } catch {
        // Fall through to missing key diagnostic below.
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Falta GEMINI_API_KEY en el servidor (.env.local / Vercel) para usar gemini-3.1-flash-image-preview.',
        },
        { status: 503 },
      );
    }

    const name = read(form, 'name', 120);
    const details = read(form, 'details', 2200);
    const style = read(form, 'style', 200);
    const canon = read(form, 'canon', 1800);
    const notes = read(form, 'notes', 2600);
    const mode = read(form, 'mode', 50);
    const rawAspect = read(form, 'aspectRatio', 16);
    const aspectRatio = VALID_ASPECTS.has(rawAspect)
      ? rawAspect
      : mode === 'cover_wrap'
      ? '16:9'
      : mode === 'sheet'
      ? '1:1'
      : '3:4';

    const modeData = IMAGE_MODES.find((m) => m.id === mode) ?? IMAGE_MODES[0];
    if (!name && !notes) {
      return NextResponse.json(
        { error: 'Completa la descripción o personaje antes de generar.' },
        { status: 400 },
      );
    }

    const rawRefs = [...form.getAll('references'), form.get('reference')];
    const encodedRefs: Array<{ mimeType: string; data: string }> = [];
    for (const item of rawRefs) {
      if (item instanceof File && item.size > 0) {
        if (item.size > MAX_FILE_BYTES || !ALLOWED_MIME.has(item.type)) {
          return NextResponse.json(
            { error: 'La referencia o boceto debe ser PNG/JPG/WebP menor a 6 MB.' },
            { status: 400 },
          );
        }
        if (encodedRefs.length < 4) {
          const data = Buffer.from(await item.arrayBuffer()).toString('base64');
          encodedRefs.push({ mimeType: item.type, data });
        }
      }
    }

    const prompt = [
      mode === 'sketch_refine' && encodedRefs.length > 0
        ? 'Transform and refine the attached hand-drawn digital manga draft into finished publication-grade manga artwork while preserving exact composition, pose, and framing.'
        : 'Create an ORIGINAL professional Japanese manga artwork for a creator story.',
      name ? `SUBJECT / CHARACTER: ${name}.` : '',
      details ? `CANON IDENTITY & VISUAL ANCHORS: ${details}.` : '',
      style ? `ART STYLE: ${style}.` : '',
      canon ? `WORLD / CONTEXT: ${canon}.` : '',
      `FORMAT & COMPOSITION (${aspectRatio}): ${modeData.instruction}`,
      notes ? `SCENE / ART DIRECTION: ${notes}.` : '',
      encodedRefs.length > 0
        ? 'Strictly respect the attached sketch/reference images for character consistency and layout.'
        : '',
      'Do not include watermarks or speech bubbles.',
    ]
      .filter(Boolean)
      .join('\n');

    const model = (process.env.GEMINI_CANVAS_IMAGE_MODEL || KAI_IMAGE_MODEL_DEFAULT).trim();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const requestParts: Array<{
      text?: string;
      inlineData?: { mimeType: string; data: string };
    }> = [{ text: prompt }];
    for (const ref of encodedRefs) {
      requestParts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
    }

    const upstreamRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: requestParts }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio },
        },
      }),
      signal: AbortSignal.timeout(52_000),
    });

    if (!upstreamRes.ok) {
      if (upstreamRes.status === 429) {
        return NextResponse.json(
          {
            error:
              'Se alcanzó el límite temporal de generación de imágenes en Gemini 3.1 Flash Image. Intenta en unos segundos.',
          },
          { status: 429 },
        );
      }
      return NextResponse.json(
        {
          error: `Gemini (${model}) devolvió HTTP ${upstreamRes.status} al generar la ilustración.`,
        },
        { status: 502 },
      );
    }

    const data = (await upstreamRes.json()) as {
      candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
    };
    const outParts = data.candidates?.[0]?.content?.parts ?? [];
    const hit = extractInlineImage(outParts);
    if (!hit) {
      return NextResponse.json(
        { error: 'Gemini no devolvió datos de imagen para esta descripción.' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      image: `data:${hit.mimeType};base64,${hit.data}`,
      mode: modeData.id,
      model,
      providerStatus: 'official-ai',
    });
  } catch (err) {
    const isTimeout =
      err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return NextResponse.json(
      {
        error: isTimeout
          ? 'La generación con Gemini 3.1 Flash Image superó el tiempo límite. Intenta nuevamente.'
          : 'Error de conexión al generar la imagen con Gemini.',
      },
      { status: 502 },
    );
  }
}
