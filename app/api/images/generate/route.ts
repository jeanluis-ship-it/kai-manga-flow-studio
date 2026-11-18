import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';
import { timingSafeEqual } from 'node:crypto';
import { IMAGE_MODES } from '@/lib/prompts';

export const runtime = 'nodejs';
export const maxDuration = 120;
const MAX_FILE_BYTES = 6 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

const safeCompare = (received: string, expected: string) => {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
};

const read = (form: FormData, name: string, max = 1600) => String(form.get(name) ?? '').trim().slice(0, max);

function buildCompactPrompt(opts: {
  name: string;
  details: string;
  style: string;
  modeInstruction: string;
  notes: string;
  canon: string;
}) {
  const parts = [
    'Japanese manga illustration, crisp black ink linework, screentones, dramatic contrast, no speech bubbles, no text, no watermark',
    `Character ${opts.name}: ${opts.details}`,
    opts.style ? `Style: ${opts.style}` : '',
    opts.modeInstruction,
    opts.notes ? `Scene: ${opts.notes}` : '',
    opts.canon ? `Context: ${opts.canon}` : '',
  ].filter(Boolean);
  return parts.join('. ').replace(/\s+/g, ' ').trim().slice(0, 720);
}

async function generateWithGemini(opts: {
  apiKey: string;
  prompt: string;
  ref: File | null;
  modeId: string;
}): Promise<{ image: string; model: string } | { compiledPrompt: string | null }> {
  const headers = {
    'Content-Type': 'application/json',
    'x-goog-api-key': opts.apiKey,
  };

  // 1. Primary Gemini image generation endpoint (supports optional inline reference image)
  try {
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [{ text: opts.prompt }];
    if (opts.ref) {
      const refB64 = Buffer.from(await opts.ref.arrayBuffer()).toString('base64');
      parts.push({ inlineData: { mimeType: opts.ref.type, data: refB64 } });
    }
    const flashImgResp = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (flashImgResp.ok) {
      const data = (await flashImgResp.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              inlineData?: { mimeType?: string; data?: string };
              inline_data?: { mimeType?: string; mime_type?: string; data?: string };
            }>;
          };
        }>;
      };
      const outParts = data.candidates?.[0]?.content?.parts ?? [];
      for (const part of outParts) {
        const inline = part.inlineData ?? part.inline_data;
        const b64 = inline?.data;
        if (b64) {
          const mime =
            (part.inlineData?.mimeType || part.inline_data?.mimeType || part.inline_data?.mime_type || 'image/png').trim();
          return { image: `data:${mime};base64,${b64}`, model: 'gemini-2.0-flash-exp-image-generation' };
        }
      }
    }
  } catch {
    // Fall through to Imagen fallback and prompt compiler.
  }

  // 2. Fallback to Imagen 3 image generation
  try {
    const imagenResp = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          instances: [{ prompt: opts.prompt }],
          parameters: { sampleCount: 1, aspectRatio: '3:4' },
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (imagenResp.ok) {
      const data = (await imagenResp.json()) as {
        predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
      };
      const prediction = data.predictions?.[0];
      if (prediction?.bytesBase64Encoded) {
        const mime = prediction.mimeType || 'image/png';
        return { image: `data:${mime};base64,${prediction.bytesBase64Encoded}`, model: 'imagen-3.0-generate-002' };
      }
    }
  } catch {
    // Fall through to Gemini prompt compiler + Flux proxy.
  }

  // 3. Quota/429 or image endpoint unavailable: compile crisp English manga prompt via gemini-2.0-flash
  try {
    const compileResp = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: [
                    'Rewrite the following manga character & scene brief into one concise English image-generation prompt (max 450 characters).',
                    'Preserve character visual anchors, ink/screentone manga style, framing, and lighting. Exclude speech bubbles, text, watermarks.',
                    'Return ONLY the prompt text, nothing else.',
                    opts.prompt,
                  ].join('\n\n'),
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.4, maxOutputTokens: 180 },
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (compileResp.ok) {
      const data = (await compileResp.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const compiled = data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 680);
      if (compiled) return { compiledPrompt: compiled };
    }
  } catch {
    // Ignore compiler failures and fall back to deterministic compact prompt.
  }

  return { compiledPrompt: null };
}

export async function POST(req: NextRequest) {
  if (!process.env.STUDIO_ACCESS_TOKEN) {
    return NextResponse.json({ error: 'API no configurada. Añade STUDIO_ACCESS_TOKEN en el servidor.' }, { status: 503 });
  }
  if (!safeCompare(req.headers.get('x-mangai-access') ?? '', process.env.STUDIO_ACCESS_TOKEN)) {
    return NextResponse.json({ error: 'Código de acceso incorrecto.' }, { status: 401 });
  }
  const type = req.headers.get('content-type') ?? '';
  if (!type.startsWith('multipart/form-data')) {
    return NextResponse.json({ error: 'Formato de solicitud inválido.' }, { status: 400 });
  }

  try {
    const form = await req.formData();
    const name = read(form, 'name', 120);
    const details = read(form, 'details', 1600);
    const style = read(form, 'style', 200);
    const canon = read(form, 'canon', 1800);
    const notes = read(form, 'notes', 1000);
    const mode = read(form, 'mode', 50);
    const modeData = IMAGE_MODES.find((m) => m.id === mode) ?? IMAGE_MODES[0];
    if (!name || !details) {
      return NextResponse.json({ error: 'Completa nombre y apariencia antes de generar.' }, { status: 400 });
    }

    const prompt = [
      'Create an ORIGINAL professional Japanese manga illustration for a user-owned original story.',
      `CHARACTER: ${name}.`,
      `CANON IDENTITY, preserve across iterations: ${details}.`,
      `STYLE: ${style}.`,
      `WORLD/CONTEXT: ${canon}.`,
      `COMPOSITION: ${modeData.instruction}`,
      `USER DIRECTION: ${notes}.`,
      'Keep the facial proportions, scars, hairstyle, anatomy, accessories and costume consistent with the approved description and the reference image when provided.',
      'Make the character clearly recognizable in future views. Do not include watermarks, logos, speech bubbles, or lettering.',
    ].join('\n');

    const file = form.get('reference');
    const ref = file instanceof File && file.size > 0 ? file : null;
    if (ref && (ref.size > MAX_FILE_BYTES || !ALLOWED_MIME.has(ref.type))) {
      return NextResponse.json({ error: 'La referencia debe ser PNG/JPG/WebP y pesar menos de 6 MB.' }, { status: 400 });
    }

    let compactPrompt = buildCompactPrompt({
      name,
      details,
      style,
      modeInstruction: modeData.instruction,
      notes,
      canon,
    });

    // Branch A: OpenAI Images API
    if (process.env.OPENAI_API_KEY) {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 110_000 });
      // Fast for new drafts; precise edits can use OPENAI_IMAGE_MODEL=gpt-image-2.5-sunburst.
      const model = (process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare') as 'gpt-image-2.5-flare';
      const params = { model, prompt, size: '1024x1536' as const, quality: 'medium' as const, output_format: 'png' as const };
      const result = ref
        ? await client.images.edit({
            ...params,
            image: await toFile(Buffer.from(await ref.arrayBuffer()), ref.name || 'reference.png', { type: ref.type }),
          })
        : await client.images.generate(params);
      const b64 = result.data?.[0]?.b64_json;
      if (!b64) return NextResponse.json({ error: 'El modelo no devolvió una imagen.' }, { status: 502 });
      return NextResponse.json({ image: `data:image/png;base64,${b64}`, mode: modeData.id, model });
    }
    // Branch B: Google Gemini image endpoints + prompt compilation fallback
    else if (process.env.GEMINI_API_KEY) {
      const geminiResult = await generateWithGemini({
        apiKey: process.env.GEMINI_API_KEY,
        prompt,
        ref,
        modeId: modeData.id,
      });
      if ('image' in geminiResult) {
        return NextResponse.json({
          image: geminiResult.image,
          mode: modeData.id,
          model: geminiResult.model,
        });
      }
      if (geminiResult.compiledPrompt) {
        compactPrompt = geminiResult.compiledPrompt;
      }
    }

    // Branch C: Server-side Flux fallback proxy
    const fluxUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(compactPrompt)}?width=768&height=1152&nologo=true&model=flux`;
    const fluxResp = await fetch(fluxUrl, { signal: AbortSignal.timeout(25_000) });
    const rawMime = (fluxResp.headers.get('content-type') ?? 'image/jpeg').split(';')[0].trim();
    const mime = rawMime.startsWith('image/') ? rawMime : '';
    const arrayBuffer = await fluxResp.arrayBuffer();
    if (!fluxResp.ok || !mime || arrayBuffer.byteLength <= 2000) {
      return NextResponse.json(
        { error: 'El proxy visual no devolvió una imagen válida. Intenta de nuevo o configura una clave de API.' },
        { status: 502 },
      );
    }
    const b64 = Buffer.from(arrayBuffer).toString('base64');
    return NextResponse.json({
      image: `data:${mime};base64,${b64}`,
      mode: modeData.id,
      model: 'flux-server-proxy',
    });
  } catch (err: unknown) {
    // Do not expose upstream request objects, keys or internal error contents to browsers.
    const status = typeof err === 'object' && err !== null && 'status' in err ? Number((err as { status?: number }).status) : 500;
    if (status === 429) return NextResponse.json({ error: 'Se alcanzó un límite temporal de la API. Prueba más tarde.' }, { status: 429 });
    if (status === 400) return NextResponse.json({ error: 'La API rechazó el prompt o la imagen de referencia.' }, { status: 400 });
    console.error('MANGAI image generation failed', err instanceof Error ? err.message : 'Unknown error');
    return NextResponse.json({ error: 'No se pudo generar la imagen. Revisa la configuración y vuelve a intentarlo.' }, { status: 502 });
  }
}
