import { NextRequest, NextResponse } from 'next/server';
import {
  KaiCanvasGenerateRequestSchema,
  buildFullCanvasPrompt,
} from '@/lib/kai/studioCanvas';
import { generateGeminiImage, imageErrorResponse } from '@/lib/kai/geminiImage';
import { checkQuota } from '@/lib/plans/quotas';
import { getServerQuotaContext } from '@/lib/plans/serverAuth';

export const runtime = 'nodejs';
export const maxDuration = 60;

function parseSketchInlineData(dataUrl?: string): { mimeType: string; data: string } | null {
  if (!dataUrl) return null;
  const match = dataUrl.trim().match(/^data:(image\/(?:png|jpeg|webp))(?:;[^,]*)?;base64,([\s\S]+)$/i);
  if (!match) return null;
  return {
    mimeType: match[1].toLowerCase(),
    data: match[2].replace(/\s+/g, ''),
  };
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

  const sketchInline = parseSketchInlineData(input.sketchDataUrl);
  const fullPrompt = sketchInline
    ? `Refine and upgrade the attached hand-drawn manga draft while strictly preserving the artist pose, framing, and composition: ${buildFullCanvasPrompt(input.prompt, input.style, input.aspectRatio)}`
    : buildFullCanvasPrompt(input.prompt, input.style, input.aspectRatio);

  try {
    const result = await generateGeminiImage(apiKey, [
      { text: fullPrompt }, ...(sketchInline ? [{ inlineData: sketchInline }] : []),
    ], input.aspectRatio);
    return NextResponse.json({ ...result, promptUsed: fullPrompt });
  } catch (error) {
    return imageErrorResponse(error);
  }
}
