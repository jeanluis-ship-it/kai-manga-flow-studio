import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';
import { timingSafeEqual } from 'node:crypto';
import { IMAGE_MODES } from '@/lib/prompts';

export const runtime = 'nodejs';
export const maxDuration = 120;
const MAX_FILE_BYTES = 6 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

const GEMINI_IMAGE_MODELS = [
  'gemini-nano-banana-2.1',
  'gemini-3.1-flash-lite-image',
  'gemini-3-pro-image',
] as const;

const GEMINI_TEXT_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'] as const;

const safeCompare = (received: string, expected: string) => {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
};

const read = (form: FormData, name: string, max = 1600) => String(form.get(name) ?? '').trim().slice(0, max);

const escapeXml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

function buildCompactPrompt(opts: {
  name: string;
  details: string;
  style: string;
  modeInstruction: string;
  notes: string;
  canon: string;
}) {
  const parts = [
    'Japanese manga illustration, crisp black sumi ink linework, halftone screentones, dramatic contrast, no speech bubbles, no text, no watermark',
    `Character ${opts.name}: ${opts.details}`,
    opts.style ? `Style: ${opts.style}` : '',
    opts.modeInstruction,
    opts.notes ? `Scene: ${opts.notes}` : '',
    opts.canon ? `Context: ${opts.canon}` : '',
  ].filter(Boolean);
  return parts.join('. ').replace(/\s+/g, ' ').trim().slice(0, 720);
}

function buildMangaSvgFallback(opts: {
  name: string;
  details: string;
  style: string;
  modeId: string;
  notes: string;
}) {
  const w = 768;
  const h = 1152;
  const safeName = escapeXml(opts.name.slice(0, 36));
  const safeStyle = escapeXml((opts.style || 'Manga B/N Sumi Ink').slice(0, 48));
  const safeDetails = escapeXml((opts.notes || opts.details).slice(0, 90));
  const safeDetails2 = escapeXml((opts.notes || opts.details).slice(90, 180));

  // Build radial manga speedlines centered behind character silhouette
  const cx = w / 2;
  const cy = opts.modeId === 'panel' ? 470 : 420;
  const rays: string[] = [];
  for (let i = 0; i < 64; i++) {
    const angle = (i / 64) * Math.PI * 2;
    const innerR = i % 2 === 0 ? 155 : 210;
    const outerR = 720;
    const x1 = Math.round(cx + Math.cos(angle) * innerR);
    const y1 = Math.round(cy + Math.sin(angle) * innerR);
    const x2 = Math.round(cx + Math.cos(angle) * outerR);
    const y2 = Math.round(cy + Math.sin(angle) * outerR);
    const strokeW = i % 4 === 0 ? 2.5 : 1;
    rays.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1b1c18" stroke-opacity="0.22" stroke-width="${strokeW}"/>`);
  }

  const figureGroup =
    opts.modeId === 'sheet'
      ? `
        <!-- Front / 3/4 / Side Editorial Character Turnaround Silhouettes -->
        <g fill="#1b1c18">
          <circle cx="210" cy="360" r="48"/>
          <path d="M148 690 L165 425 L255 425 L272 690 Z"/>
          <circle cx="384" cy="350" r="52"/>
          <path d="M312 720 L334 420 L434 420 L456 720 Z"/>
          <circle cx="562" cy="360" r="46"/>
          <path d="M510 690 L526 425 L598 425 L614 690 Z"/>
        </g>`
      : opts.modeId === 'expression'
      ? `
        <!-- Six-Expression Manga Matrix -->
        <g stroke="#1b1c18" stroke-width="5" fill="#faf8f5">
          <rect x="86" y="210" width="275" height="210" rx="6"/>
          <rect x="407" y="210" width="275" height="210" rx="6"/>
          <rect x="86" y="455" width="275" height="210" rx="6"/>
          <rect x="407" y="455" width="275" height="210" rx="6"/>
        </g>
        <g fill="#1b1c18">
          <circle cx="223" cy="300" r="42"/><path d="M175 405 L271 405 L254 348 L192 348 Z"/>
          <circle cx="544" cy="300" r="42"/><path d="M496 405 L592 405 L575 348 L513 348 Z"/>
          <circle cx="223" cy="545" r="42"/><path d="M175 650 L271 650 L254 593 L192 593 Z"/>
          <circle cx="544" cy="545" r="42"/><path d="M496 650 L592 650 L575 593 L513 593 Z"/>
        </g>`
      : `
        <!-- Dramatic Manga Hero Composition Silhouette -->
        <g>
          <circle cx="${cx}" cy="340" r="92" fill="#1b1c18"/>
          <path d="M250 860 L292 462 Q384 432 476 462 L518 860 Z" fill="#1b1c18"/>
          <path d="M312 315 Q384 265 456 315" stroke="#faf8f5" stroke-width="6" fill="none"/>
          <circle cx="352" cy="336" r="7" fill="#faf8f5"/>
          <circle cx="416" cy="336" r="7" fill="#faf8f5"/>
          <path d="M335 462 L384 535 L433 462" stroke="#faf8f5" stroke-width="5" fill="none"/>
        </g>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <pattern id="screentone60L" width="8" height="8" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="4" r="1.35" fill="#1b1c18" fill-opacity="0.22"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="#faf8f5"/>
  <rect x="34" y="34" width="${w - 68}" height="${h - 68}" fill="url(#screentone60L)" stroke="#1b1c18" stroke-width="7"/>
  ${rays.join('\n  ')}
  ${figureGroup}
  <rect x="64" y="902" width="${w - 128}" height="176" rx="10" fill="#1b1c18"/>
  <text x="90" y="942" font-family="monospace" font-size="22" font-weight="700" fill="#f59e0b">MANGAI STUDIO · BOCETO B/N (${escapeXml(opts.modeId.toUpperCase())})</text>
  <text x="90" y="982" font-family="sans-serif" font-size="28" font-weight="800" fill="#ffffff">${safeName} — ${safeStyle}</text>
  <text x="90" y="1020" font-family="sans-serif" font-size="18" fill="#d4d4d8">${safeDetails}</text>
  <text x="90" y="1048" font-family="sans-serif" font-size="18" fill="#d4d4d8">${safeDetails2}</text>
</svg>`;

  const b64 = Buffer.from(svg, 'utf8').toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}

async function generateWithGemini(opts: {
  apiKey: string;
  prompt: string;
  ref: File | null;
}): Promise<{ image: string; model: string } | { compiledPrompt: string | null }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-goog-api-key': opts.apiKey,
  };

  let refBase64 = '';
  let refMime = '';
  if (opts.ref) {
    refBase64 = Buffer.from(await opts.ref.arrayBuffer()).toString('base64');
    refMime = opts.ref.type;
  }

  // 1. Try current Nano Banana image models via :generateContent
  for (const modelId of GEMINI_IMAGE_MODELS) {
    try {
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [{ text: opts.prompt }];
      if (refBase64 && refMime) {
        parts.push({ inlineData: { mimeType: refMime, data: refBase64 } });
      }
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: { aspectRatio: '3:4', imageSize: '1K' },
          },
        }),
        signal: AbortSignal.timeout(25_000),
      });

      if (resp.ok) {
        const data = (await resp.json()) as {
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
          if (inline?.data) {
            const mime =
              (part.inlineData?.mimeType || part.inline_data?.mimeType || part.inline_data?.mime_type || 'image/png').trim();
            return { image: `data:${mime};base64,${inline.data}`, model: modelId };
          }
        }
      }
    } catch {
      // Try next model or endpoint.
    }
  }

  // 2. Try Interactions API (/v1beta/interactions) for Nano Banana 2.1
  for (const modelId of GEMINI_IMAGE_MODELS.slice(0, 2)) {
    try {
      const inputParts: Array<{ type: string; text?: string; data?: string; mime_type?: string }> = [
        { type: 'text', text: opts.prompt },
      ];
      if (refBase64 && refMime) {
        inputParts.push({ type: 'image', data: refBase64, mime_type: refMime });
      }
      const intResp = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        headers: {
          ...headers,
          'Api-Revision': '2026-05-20',
        },
        body: JSON.stringify({
          model: modelId,
          input: inputParts,
          response_modalities: ['IMAGE'],
        }),
        signal: AbortSignal.timeout(25_000),
      });
      if (intResp.ok) {
        const intData = (await intResp.json()) as {
          outputs?: Array<{ type?: string; data?: string; mime_type?: string }>;
          steps?: Array<{ content?: Array<{ type?: string; data?: string; mime_type?: string }> }>;
        };
        const stepContents = intData.steps?.flatMap((s) => s.content ?? []) ?? [];
        const allItems = [...(intData.outputs ?? []), ...stepContents];
        const imgItem = allItems.find((item) => item.type === 'image' && item.data);
        if (imgItem?.data) {
          return {
            image: `data:${imgItem.mime_type || 'image/png'};base64,${imgItem.data}`,
            model: modelId,
          };
        }
      }
    } catch {
      // Fall through to Imagen 3 and Gemini text prompt compiler.
    }
  }

  // 3. Try Imagen 3.0 fallback
  try {
    const imagenResp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        instances: [{ prompt: opts.prompt }],
        parameters: { sampleCount: 1, aspectRatio: '3:4' },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (imagenResp.ok) {
      const data = (await imagenResp.json()) as {
        predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
      };
      const prediction = data.predictions?.[0];
      if (prediction?.bytesBase64Encoded) {
        return {
          image: `data:${prediction.mimeType || 'image/png'};base64,${prediction.bytesBase64Encoded}`,
          model: 'imagen-3.0-generate-002',
        };
      }
    }
  } catch {
    // Fall through to Gemini prompt compiler.
  }

  // 4. Prompt compilation using current Gemini text models (gemini-3.8-flash / gemini-3.5-flash-lite)
  for (const textModel of GEMINI_TEXT_MODELS) {
    try {
      const compileResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${textModel}:generateContent`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: 'Convert the manga character description and scene into a concise English image prompt under 360 characters. Include character physical traits, outfit, pose, camera framing, and "authentic black and white Japanese manga illustration, crisp sumi G-pen ink, halftone screentones, no text, no watermark". Return ONLY the raw prompt.',
                },
              ],
            },
            contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
          }),
          signal: AbortSignal.timeout(12_000),
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
      // Try next text model.
    }
  }

  return { compiledPrompt: null };
}

export async function POST(req: NextRequest) {
  const enforceToken = process.env.ENFORCE_STUDIO_TOKEN === 'true' && Boolean(process.env.STUDIO_ACCESS_TOKEN);
  if (enforceToken && process.env.STUDIO_ACCESS_TOKEN) {
    if (!safeCompare(req.headers.get('x-mangai-access') ?? '', process.env.STUDIO_ACCESS_TOKEN)) {
      return NextResponse.json({ error: 'Código de acceso incorrecto.' }, { status: 401 });
    }
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

    // Branch A: OpenAI Images API (when OPENAI_API_KEY is configured)
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
      if (b64) {
        return NextResponse.json({ image: `data:image/png;base64,${b64}`, mode: modeData.id, model });
      }
    }

    // Branch B: Google Gemini current models (gemini-nano-banana-2.1, gemini-3.1-flash-lite-image, gemini-3.8-flash)
    let compiledWithGemini = false;
    if (process.env.GEMINI_API_KEY) {
      const geminiResult = await generateWithGemini({
        apiKey: process.env.GEMINI_API_KEY,
        prompt,
        ref,
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
        compiledWithGemini = true;
      }
    }

    // Branch C: Server-side Flux proxy (free image fallback converted to base64)
    try {
      const seed = Math.floor(100 + Math.random() * 8999);
      const fluxUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(compactPrompt)}?width=768&height=1152&seed=${seed}&nologo=true&model=flux`;
      const fluxResp = await fetch(fluxUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MANGAI-Studio/0.4' },
        signal: AbortSignal.timeout(22_000),
      });
      const rawMime = (fluxResp.headers.get('content-type') ?? 'image/jpeg').split(';')[0].trim();
      const mime = rawMime.startsWith('image/') ? rawMime : '';
      const arrayBuffer = await fluxResp.arrayBuffer();
      if (fluxResp.ok && mime && arrayBuffer.byteLength > 2500) {
        const b64 = Buffer.from(arrayBuffer).toString('base64');
        return NextResponse.json({
          image: `data:${mime};base64,${b64}`,
          mode: modeData.id,
          model: compiledWithGemini ? 'gemini-3.8-flash + flux-proxy' : 'flux-server-proxy',
        });
      }
    } catch {
      // Fall through cleanly to built-in SVG Sumi ink generator.
    }

    // Branch D: Built-in Manga B/N Vector Ink Fallback (never leaves the user stuck on 502)
    const fallbackSvg = buildMangaSvgFallback({
      name,
      details,
      style,
      modeId: modeData.id,
      notes,
    });
    return NextResponse.json({
      image: fallbackSvg,
      mode: modeData.id,
      model: compiledWithGemini ? 'gemini-3.8-flash + mangai-draft-svg' : 'mangai-draft-svg',
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
