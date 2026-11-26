import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { KAI_STYLE_MODIFIERS, KaiCanvasGenerateRequestSchema } from '@/lib/kai/studioCanvas';
import { ImageServiceError, imageErrorResponse } from '@/lib/kai/geminiImage';
import { generateFluxImage } from '@/lib/kai/fluxImage';
import { IMAGE_MODES } from '@/lib/prompts';
import { checkQuota } from '@/lib/plans/quotas';
import { getServerQuotaContext } from '@/lib/plans/serverAuth';

export const runtime = 'nodejs';
export const maxDuration = 180;

const MAX_FILE_BYTES = 6 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const VALID_ASPECTS = new Set(['1:1', '3:4', '4:3', '16:9', '9:16', 'B6']);

const safeCompare = (received: string, expected: string) => {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
};

const read = (form: FormData, name: string, max = 2600) =>
  String(form.get(name) ?? '').trim().slice(0, max);

function extractSeed(formSeed: string, ...texts: string[]): string | undefined {
  if (formSeed) {
    const clean = formSeed.replace(/[^0-9]/g, '');
    if (clean) return clean;
  }
  for (const txt of texts) {
    const match = txt.match(/SEED-(\d+)/i);
    if (match?.[1]) return match[1];
  }
  return undefined;
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
  try {
    let form: FormData;
    if (contentType.startsWith('application/json')) {
      const raw = await req.json().catch(() => null);
      const parsed = KaiCanvasGenerateRequestSchema.safeParse(raw);
      if (!parsed.success) throw new ImageServiceError('Revisa la escena, el formato y la referencia.', 400);
      const input = parsed.data;
      form = new FormData();
      form.set('notes', input.prompt);
      form.set('style', KAI_STYLE_MODIFIERS[input.style]);
      form.set('aspectRatio', input.aspectRatio);
      form.set('mode', input.aspectRatio === '16:9' ? 'cover_wrap' : input.aspectRatio === '1:1' ? 'portrait' : 'panel');
      if (typeof raw.seed === 'number' || typeof raw.seed === 'string') form.set('seed', String(raw.seed));
      const ref = input.referenceImage ?? input.sketchDataUrl;
      if (ref) {
        const match = /^data:(image\/(?:png|jpeg|webp));base64,([a-z0-9+/=]+)$/i.exec(ref);
        if (!match) throw new ImageServiceError('Referencia inválida. Usa PNG, JPEG o WebP.', 400);
        form.append('reference', new Blob([new Uint8Array(Buffer.from(match[2], 'base64'))], { type: match[1] }), 'referencia');
      }
    } else if (contentType.startsWith('multipart/form-data')) {
      form = await req.formData();
    } else {
      throw new ImageServiceError('Envía JSON o un formulario con tu escena.', 400);
    }
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
                'El modo de alta resolución requiere Plan Pro o Master.',
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



    const name = read(form, 'name', 120);
    const details = read(form, 'details', 2200);
    const style = read(form, 'style', 200);
    const canon = read(form, 'canon', 1800);
    const notes = read(form, 'prompt', 3000) || read(form, 'notes', 3000);
    const mode = read(form, 'mode', 50);
    const rawSeed = read(form, 'seed', 64);
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

    const rawRefs = [...form.getAll('references'), form.get('reference'), form.get('referenceImage')];
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

    const seed = extractSeed(rawSeed, notes, details, canon);
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

    const result = await generateFluxImage(prompt, encodedRefs, aspectRatio, seed, req.signal);
    return NextResponse.json({ ...result, mode: modeData.id, promptUsed: prompt });
  } catch (error) {
    return imageErrorResponse(error);
  }
}
