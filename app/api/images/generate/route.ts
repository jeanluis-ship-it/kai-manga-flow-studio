import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';
import { timingSafeEqual } from 'node:crypto';
import { IMAGE_MODES } from '@/lib/prompts';

export const runtime = 'nodejs';
export const maxDuration = 120;
const MAX_FILE_BYTES = 6 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const VALID_ASPECTS = new Set(['1:1', '3:4', '4:3', '16:9', '9:16']);

const DEFAULT_GEMINI_IMAGE_MODELS = [
  'gemini-3-pro-image',
  'gemini-nano-banana-2.1',
  'gemini-3.1-flash-lite-image',
  'gemini-3-pro-image-preview',
  'gemini-2.5-flash-image',
  'gemini-2.5-flash-image-preview',
  'gemini-2.0-flash-exp-image-generation',
];

const GEMINI_TEXT_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'] as const;

const safeCompare = (received: string, expected: string) => {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
};

const read = (form: FormData, name: string, max = 2600) => String(form.get(name) ?? '').trim().slice(0, max);

const escapeXml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

function aspectToFluxDimensions(aspectRatio: string) {
  if (aspectRatio === '16:9') return { width: 1280, height: 720 };
  if (aspectRatio === '1:1') return { width: 1024, height: 1024 };
  return { width: 768, height: 1024 };
}

function buildCompactPrompt(opts: {
  name: string;
  details: string;
  style: string;
  modeId: string;
  modeInstruction: string;
  notes: string;
  canon: string;
}) {
  const stylePrefix =
    opts.modeId === 'cover_wrap'
      ? 'Vibrant illustrated manga book wrap cover art, front and back continuous landscape'
      : 'Authentic high-contrast black and white Japanese manga illustration, crisp G-Pen sumi ink, halftone screentones';
  const parts = [
    stylePrefix,
    opts.name ? `Character ${opts.name}: ${opts.details}` : '',
    opts.style ? `Style: ${opts.style}` : '',
    opts.modeInstruction,
    opts.notes ? `Scene: ${opts.notes}` : '',
    opts.canon ? `Context: ${opts.canon}` : '',
  ].filter(Boolean);
  return parts.join('. ').replace(/\s+/g, ' ').trim().slice(0, 820);
}

function buildMangaSvgFallback(opts: {
  name: string;
  details: string;
  style: string;
  modeId: string;
  aspectRatio: string;
  notes: string;
}) {
  const dims = aspectToFluxDimensions(opts.aspectRatio);
  const w = dims.width;
  const h = dims.height;
  const safeName = escapeXml((opts.name || 'Manga').slice(0, 36));
  const safeStyle = escapeXml((opts.style || 'Dark Seinen').slice(0, 48));
  const rawDesc = (opts.notes || opts.details || '').replace(/\s+/g, ' ');
  const safeDetails = escapeXml(rawDesc.slice(0, 88));
  const safeDetails2 = escapeXml(rawDesc.slice(88, 176));

  const cx = w / 2;
  const cy = Math.round(h * 0.42);
  const rays: string[] = [];
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2;
    const x1 = Math.round(cx + Math.cos(angle) * 120);
    const y1 = Math.round(cy + Math.sin(angle) * 120);
    const x2 = Math.round(cx + Math.cos(angle) * Math.max(w, h));
    const y2 = Math.round(cy + Math.sin(angle) * Math.max(w, h));
    rays.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#17141b" stroke-opacity="0.14" stroke-width="${i % 3 === 0 ? 2 : 1}"/>`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <pattern id="tone60L" width="8" height="8" patternUnits="userSpaceOnUse">
      <circle cx="4" cy="4" r="1.2" fill="#17141b" fill-opacity="0.18"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="#f4f0e7"/>
  <rect x="28" y="28" width="${w - 56}" height="${h - 56}" fill="url(#tone60L)" stroke="#17141b" stroke-width="6"/>
  ${rays.join('\n  ')}
  <circle cx="${cx}" cy="${Math.round(h * 0.36)}" r="${Math.round(Math.min(w, h) * 0.11)}" fill="#17141b"/>
  <path d="M${cx - 95} ${Math.round(h * 0.72)} L${cx - 58} ${Math.round(h * 0.48)} L${cx + 58} ${Math.round(h * 0.48)} L${cx + 95} ${Math.round(h * 0.72)} Z" fill="#17141b"/>
  <rect x="48" y="${h - 165}" width="${w - 96}" height="122" rx="10" fill="#17141b"/>
  <text x="72" y="${h - 128}" font-family="monospace" font-size="18" font-weight="700" fill="#d84e56">MANGAI STUDIO · COMPOSICIÓN (${escapeXml(opts.modeId.toUpperCase())} · ${escapeXml(opts.aspectRatio)})</text>
  <text x="72" y="${h - 96}" font-family="sans-serif" font-size="24" font-weight="800" fill="#f4f0e7">${safeName} — ${safeStyle}</text>
  <text x="72" y="${h - 68}" font-family="sans-serif" font-size="15" fill="#d9d3c8">${safeDetails}</text>
  <text x="72" y="${h - 48}" font-family="sans-serif" font-size="15" fill="#d9d3c8">${safeDetails2}</text>
</svg>`;

  const b64 = Buffer.from(svg, 'utf8').toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}

async function discoverGeminiModels(apiKey: string): Promise<{ imageModels: string[]; textModels: string[] }> {
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(4_500) },
    );
    if (!resp.ok) return { imageModels: [], textModels: [] };
    const data = (await resp.json()) as {
      models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
    };
    const all = (data.models ?? [])
      .map((m) => (m.name ?? '').replace(/^models\//, ''))
      .filter(Boolean);
    const imageModels = all.filter(
      (n) => n.includes('image') || n.includes('banana') || n.includes('imagen'),
    );
    const textModels = all.filter(
      (n) => (n.includes('flash') || n.includes('gemini-3') || n.includes('gemini-4')) && !n.includes('image') && !n.includes('tts'),
    );
    return { imageModels, textModels };
  } catch {
    return { imageModels: [], textModels: [] };
  }
}

async function generateWithGemini(opts: {
  apiKey: string;
  prompt: string;
  aspectRatio: string;
  preferredModel: string;
  refs: File[];
}): Promise<{ image: string; model: string } | { compiledPrompt: string | null; diagnostics: string[] }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-goog-api-key': opts.apiKey,
  };
  const diagnostics: string[] = [];

  const encodedRefs: Array<{ mimeType: string; data: string }> = [];
  for (const ref of opts.refs.slice(0, 4)) {
    const data = Buffer.from(await ref.arrayBuffer()).toString('base64');
    encodedRefs.push({ mimeType: ref.type, data });
  }

  // Discover live available models on this key first (prevents wasted 404/timeout loops on Vercel)
  const { imageModels: discoveredImageModels, textModels: discoveredTextModels } = await discoverGeminiModels(opts.apiKey);

  const tryGenerateContentModel = async (modelId: string) => {
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [{ text: opts.prompt }];
    for (const r of encodedRefs) {
      parts.push({ inlineData: { mimeType: r.mimeType, data: r.data } });
    }
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspectRatio: opts.aspectRatio || '3:4' },
        },
      }),
      signal: AbortSignal.timeout(18_000),
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
          return { image: `data:${mime};base64,${inline.data}`, model: modelId, stopLoop: false };
        }
      }
    } else {
      diagnostics.push(`${modelId}:HTTP_${resp.status}`);
      if (resp.status === 429 || resp.status === 403) {
        return { image: '', model: '', stopLoop: true };
      }
    }
    return null;
  };

  // Helper to invoke Imagen :predict endpoint
  const tryImagenPredict = async (imagenModel: string) => {
    try {
      const imagenResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${imagenModel}:predict`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          instances: [{ prompt: opts.prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: opts.aspectRatio === '16:9' || opts.aspectRatio === '1:1' ? opts.aspectRatio : '3:4',
          },
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (imagenResp.ok) {
        const data = (await imagenResp.json()) as {
          predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>;
        };
        const prediction = data.predictions?.[0];
        if (prediction?.bytesBase64Encoded) {
          return {
            image: `data:${prediction.mimeType || 'image/png'};base64,${prediction.bytesBase64Encoded}`,
            model: imagenModel,
          };
        }
      } else {
        diagnostics.push(`${imagenModel}:HTTP_${imagenResp.status}`);
      }
    } catch {
      diagnostics.push(`${imagenModel}:TIMEOUT`);
    }
    return null;
  };

  // Prioritize discovered models + user's preferred model (at most 2 generateContent attempts to stay well below Vercel timeout)
  const preferredClean = opts.preferredModel && !opts.preferredModel.startsWith('gpt-') ? opts.preferredModel : '';
  const liveImagen =
    (preferredClean.startsWith('imagen-') ? preferredClean : '') ||
    discoveredImageModels.find((m) => m.startsWith('imagen-'));

  // If user explicitly chose an Imagen model, try it FIRST before generateContent models can hit 429
  if (preferredClean.startsWith('imagen-') && liveImagen) {
    const imagenHit = await tryImagenPredict(liveImagen);
    if (imagenHit) return imagenHit;
  }

  const liveCandidates = Array.from(
    new Set([
      ...(preferredClean && !preferredClean.startsWith('imagen-') ? [preferredClean] : []),
      ...discoveredImageModels.filter((m) => !m.startsWith('imagen-')),
      ...DEFAULT_GEMINI_IMAGE_MODELS.slice(0, 2),
    ]),
  ).slice(0, 2);

  for (const modelId of liveCandidates) {
    try {
      const hit = await tryGenerateContentModel(modelId);
      if (hit?.image) return { image: hit.image, model: hit.model };
      if (hit?.stopLoop) break;
    } catch {
      diagnostics.push(`${modelId}:TIMEOUT`);
    }
  }

  // Otherwise try 1 Imagen predict model if discovered and not already aborted with 429/403
  if (!preferredClean.startsWith('imagen-') && liveImagen && !diagnostics.some((d) => d.includes('HTTP_429') || d.includes('HTTP_403'))) {
    const imagenHit = await tryImagenPredict(liveImagen);
    if (imagenHit) return imagenHit;
  }

  // Compile prompt via first live text model for crisp fallback
  const textModelToUse = discoveredTextModels[0] || GEMINI_TEXT_MODELS[0];
  try {
    const compileResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${textModelToUse}:generateContent`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: 'Convert the manga instructions and character description into a single vivid English image generation prompt under 420 characters. Preserve character visual traits first, camera layout/panels, and manga ink style. Return ONLY the English prompt.',
              },
            ],
          },
          contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
        }),
        signal: AbortSignal.timeout(6_000),
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
        .slice(0, 720);
      if (compiled) return { compiledPrompt: compiled, diagnostics };
    }
  } catch {
    // Try no further loops to keep latency crisp.
  }

  return { compiledPrompt: null, diagnostics };
}

function isValidCustomKey(key: string) {
  return (
    key.length >= 24 &&
    !key.includes('...') &&
    !key.includes('••') &&
    (key.startsWith('AIza') || key.startsWith('sk-') || key.startsWith('hf_'))
  );
}

async function generateWithGradioFluxSpace(opts: {
  prompt: string;
  aspectRatio: string;
  hfToken?: string;
}): Promise<{ image: string; model: string } | { diagnostic: string }> {
  const dims = aspectToFluxDimensions(opts.aspectRatio);
  const baseUrl = 'https://black-forest-labs-flux-1-schnell.hf.space';
  const authHeader: Record<string, string> = opts.hfToken ? { Authorization: `Bearer ${opts.hfToken}` } : {};

  try {
    const postResp = await fetch(`${baseUrl}/gradio_api/call/infer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({
        data: [opts.prompt, 0, true, dims.width, dims.height, 4],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!postResp.ok) {
      return { diagnostic: `flux-space-init:HTTP_${postResp.status}` };
    }
    const { event_id } = (await postResp.json()) as { event_id?: string };
    if (!event_id) {
      return { diagnostic: 'flux-space:NO_EVENT_ID' };
    }

    const sseResp = await fetch(`${baseUrl}/gradio_api/call/infer/${encodeURIComponent(event_id)}`, {
      headers: authHeader,
      signal: AbortSignal.timeout(25_000),
    });
    if (!sseResp.ok) {
      return { diagnostic: `flux-space-sse:HTTP_${sseResp.status}` };
    }

    const sseText = await sseResp.text();
    const lines = sseText.split(/\r?\n/);
    let imageUrl = '';
    let isCompleteEvent = false;

    for (const line of lines) {
      if (line.startsWith('event:')) {
        isCompleteEvent = line.includes('complete');
        if (line.includes('error')) {
          return { diagnostic: 'flux-space:SSE_ERROR' };
        }
      } else if (isCompleteEvent && line.startsWith('data:')) {
        try {
          const parsed = JSON.parse(line.slice(5).trim()) as Array<{ url?: string }>;
          if (Array.isArray(parsed) && parsed[0]?.url) {
            imageUrl = parsed[0].url;
            break;
          }
        } catch {
          // Ignore malformed line and keep scanning.
        }
      }
    }

    if (!imageUrl) {
      return { diagnostic: 'flux-space:NO_IMAGE_URL' };
    }

    const imgResp = await fetch(imageUrl, {
      headers: authHeader,
      signal: AbortSignal.timeout(12_000),
    });
    if (!imgResp.ok) {
      return { diagnostic: `flux-space-file:HTTP_${imgResp.status}` };
    }

    const rawMime = (imgResp.headers.get('content-type') ?? 'image/webp').split(';')[0].trim();
    const mime = rawMime.startsWith('image/') ? rawMime : 'image/webp';
    const arr = await imgResp.arrayBuffer();
    if (arr.byteLength < 2000) {
      return { diagnostic: 'flux-space-file:EMPTY' };
    }

    return {
      image: `data:${mime};base64,${Buffer.from(arr).toString('base64')}`,
      model: 'flux.1-schnell-hd (Directo Sin Clave)',
    };
  } catch {
    return { diagnostic: 'flux-space:TIMEOUT' };
  }
}

async function generateWithHuggingFace(opts: {
  token: string;
  prompt: string;
  aspectRatio: string;
}): Promise<{ image: string; model: string } | { diagnostic: string }> {
  const dims = aspectToFluxDimensions(opts.aspectRatio);
  try {
    const resp = await fetch('https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: opts.prompt,
        parameters: {
          width: dims.width,
          height: dims.height,
          num_inference_steps: 4,
        },
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (resp.ok) {
      const rawMime = (resp.headers.get('content-type') ?? 'image/jpeg').split(';')[0].trim();
      const mime = rawMime.startsWith('image/') ? rawMime : 'image/jpeg';
      const arr = await resp.arrayBuffer();
      if (arr.byteLength > 2000) {
        return {
          image: `data:${mime};base64,${Buffer.from(arr).toString('base64')}`,
          model: 'flux.1-schnell (HuggingFace HD)',
        };
      }
      return { diagnostic: 'hf-flux-schnell:EMPTY_IMAGE' };
    }

    return { diagnostic: `hf-flux-schnell:HTTP_${resp.status}` };
  } catch {
    return { diagnostic: 'hf-flux-schnell:TIMEOUT' };
  }
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

    const rawCustomKey = read(form, 'customApiKey', 260);
    const customApiKey = isValidCustomKey(rawCustomKey) ? rawCustomKey : '';
    const preferredModel = read(form, 'preferredModel', 80);

    const activeGeminiKey = customApiKey.startsWith('AIza') ? customApiKey : process.env.GEMINI_API_KEY || '';
    const activeOpenaiKey = customApiKey.startsWith('sk-') ? customApiKey : process.env.OPENAI_API_KEY || '';
    const activeHfKey = customApiKey.startsWith('hf_') ? customApiKey : process.env.HF_API_TOKEN || '';

    // Localhost -> Vercel Bridge: only when no local/custom keys exist and user didn't pick keyless direct FLUX
    const isLocalHost =
      req.nextUrl.hostname === 'localhost' || req.nextUrl.hostname === '127.0.0.1';
    const alreadyForwarded = req.headers.get('x-mangai-forwarded') === '1';
    if (
      isLocalHost &&
      !alreadyForwarded &&
      preferredModel !== 'flux-schnell-hf' &&
      !customApiKey &&
      !process.env.OPENAI_API_KEY &&
      !process.env.GEMINI_API_KEY &&
      !process.env.HF_API_TOKEN
    ) {
      try {
        const relayResp = await fetch('https://kai-manga-flow-studio.vercel.app/api/images/generate', {
          method: 'POST',
          headers: { 'x-mangai-forwarded': '1' },
          body: form,
          signal: AbortSignal.timeout(45_000),
        });
        if (relayResp.ok) {
          const relayData = (await relayResp.json()) as {
            image?: string;
            model?: string;
            mode?: string;
            providerStatus?: string;
            diagnosticReason?: string;
            note?: string;
          };
          if (relayData?.image) {
            return NextResponse.json({
              ...relayData,
              model: `${relayData.model || 'vercel-gemini'} (vía Vercel)`,
            });
          }
        }
      } catch {
        // Fall through cleanly to local fallback chain.
      }
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
      return NextResponse.json({ error: 'Completa la descripción o personaje antes de generar.' }, { status: 400 });
    }

    const prompt = [
      'Create an ORIGINAL professional Japanese manga artwork for a creator story.',
      name ? `CHARACTER: ${name}.` : '',
      details ? `CANON IDENTITY, preserve across iterations: ${details}.` : '',
      style ? `STYLE: ${style}.` : '',
      canon ? `WORLD/CONTEXT: ${canon}.` : '',
      `FORMAT & COMPOSITION (${aspectRatio}): ${modeData.instruction}`,
      notes ? `SCENE / PANEL DIRECTION: ${notes}.` : '',
      'Maintain facial proportions, skin tone, hair, scars, accessories and signature wardrobe consistent with the approved description and attached character sheet reference image(s). Do not include watermarks.',
    ]
      .filter(Boolean)
      .join('\n');

    const rawRefs = [...form.getAll('references'), form.get('reference')];
    const refs: File[] = [];
    for (const item of rawRefs) {
      if (item instanceof File && item.size > 0) {
        if (item.size > MAX_FILE_BYTES || !ALLOWED_MIME.has(item.type)) {
          return NextResponse.json({ error: 'La referencia debe ser PNG/JPG/WebP y pesar menos de 6 MB.' }, { status: 400 });
        }
        refs.push(item);
      }
    }
    const primaryRef = refs[0] ?? null;

    let compactPrompt = buildCompactPrompt({
      name: name || 'Protagonista',
      details,
      style,
      modeId: modeData.id,
      modeInstruction: modeData.instruction,
      notes,
      canon,
    });

    // Branch A: OpenAI Images API (when OPENAI_API_KEY or sk-... key is configured and chosen or default)
    if (activeOpenaiKey && (!preferredModel || preferredModel.startsWith('gpt-') || customApiKey.startsWith('sk-') || (!activeGeminiKey && !activeHfKey))) {
      const client = new OpenAI({ apiKey: activeOpenaiKey, timeout: 110_000 });
      // Fast for new drafts; precise edits can use OPENAI_IMAGE_MODEL=gpt-image-2.5-sunburst.
      const model = (preferredModel.startsWith('gpt-') ? preferredModel : process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare') as 'gpt-image-2.5-flare';
      const size =
        aspectRatio === '16:9'
          ? ('1536x1024' as const)
          : aspectRatio === '1:1'
          ? ('1024x1024' as const)
          : ('1024x1536' as const);
      const params = { model, prompt, size, quality: 'medium' as const, output_format: 'png' as const };
      const result = primaryRef
        ? await client.images.edit({
            ...params,
            image: await toFile(Buffer.from(await primaryRef.arrayBuffer()), primaryRef.name || 'reference.png', { type: primaryRef.type }),
          })
        : await client.images.generate(params);
      const b64 = result.data?.[0]?.b64_json;
      if (b64) {
        return NextResponse.json({
          image: `data:image/png;base64,${b64}`,
          mode: modeData.id,
          model,
          providerStatus: 'official-ai',
        });
      }
    }

    const diagnostics: string[] = [];

    // Fast-path Branch B2 if user explicitly selected FLUX.1 Schnell HD or pasted an hf_ token
    if (preferredModel === 'flux-schnell-hf' || customApiKey.startsWith('hf_')) {
      if (activeHfKey) {
        const hfRes = await generateWithHuggingFace({ token: activeHfKey, prompt: compactPrompt, aspectRatio });
        if ('image' in hfRes) {
          return NextResponse.json({
            image: hfRes.image,
            mode: modeData.id,
            model: hfRes.model,
            providerStatus: 'official-ai',
          });
        }
        diagnostics.push(hfRes.diagnostic);
      }

      const directFlux = await generateWithGradioFluxSpace({
        prompt: compactPrompt,
        aspectRatio,
        hfToken: activeHfKey || undefined,
      });
      if ('image' in directFlux) {
        return NextResponse.json({
          image: directFlux.image,
          mode: modeData.id,
          model: directFlux.model,
          providerStatus: 'official-ai',
          note: diagnostics.length > 0 ? diagnostics.slice(0, 2).join(', ') : undefined,
        });
      }
      diagnostics.push(directFlux.diagnostic);
    }

    // Branch B: Google Gemini Models with Auto-Discovery & Reference Sheets
    let compiledWithGemini = false;
    if (activeGeminiKey && preferredModel !== 'flux-schnell-hf') {
      const geminiResult = await generateWithGemini({
        apiKey: activeGeminiKey,
        prompt,
        aspectRatio,
        preferredModel,
        refs,
      });
      if ('image' in geminiResult) {
        return NextResponse.json({
          image: geminiResult.image,
          mode: modeData.id,
          model: geminiResult.model,
          providerStatus: 'official-ai',
        });
      }
      if (geminiResult.compiledPrompt) {
        compactPrompt = geminiResult.compiledPrompt;
        compiledWithGemini = true;
      }
      diagnostics.push(...geminiResult.diagnostics);
    }

    // Fallback Branch B2: HuggingFace Inference Router (when HF_API_TOKEN is configured and Gemini fell through)
    if (activeHfKey && preferredModel !== 'flux-schnell-hf' && !customApiKey.startsWith('hf_')) {
      const hfRes = await generateWithHuggingFace({ token: activeHfKey, prompt: compactPrompt, aspectRatio });
      if ('image' in hfRes) {
        return NextResponse.json({
          image: hfRes.image,
          mode: modeData.id,
          model: hfRes.model,
          providerStatus: 'official-ai',
        });
      }
      diagnostics.push(hfRes.diagnostic);
    }

    // Branch B3: Direct Watermark-Free FLUX.1-schnell Space (keyless upgrade over Pollinations when Google Tier is 429)
    if (preferredModel !== 'flux-schnell-hf') {
      const directFlux = await generateWithGradioFluxSpace({
        prompt: compactPrompt,
        aspectRatio,
        hfToken: activeHfKey || undefined,
      });
      if ('image' in directFlux) {
        return NextResponse.json({
          image: directFlux.image,
          mode: modeData.id,
          model: compiledWithGemini ? 'gemini-prompt + flux.1-schnell-hd' : directFlux.model,
          providerStatus: 'official-ai',
          note: diagnostics.length > 0 ? diagnostics.slice(0, 2).join(', ') : undefined,
        });
      }
      diagnostics.push(directFlux.diagnostic);
    }

    const hasGemini429 = diagnostics.some((d) => d.includes('HTTP_429'));
    let diagnosticReason = '';
    if (hasGemini429) {
      diagnosticReason =
        'Google está en Plan Gratis (HTTP 429) y el nodo directo estuvo ocupado; se usó respaldo temporal.';
    } else if (diagnostics.length > 0) {
      diagnosticReason = `Motor directo temporalmente ocupado (${diagnostics.slice(0, 2).join(', ')}).`;
    } else {
      diagnosticReason = 'Usando motor de respaldo.';
    }

    // Branch C: Server-side Flux proxy with exact aspect ratio dimensions
    try {
      const dims = aspectToFluxDimensions(aspectRatio);
      const seed = Math.floor(100 + Math.random() * 8999);
      const fluxUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(compactPrompt)}?width=${dims.width}&height=${dims.height}&seed=${seed}&nologo=true&model=flux`;
      const fluxResp = await fetch(fluxUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MANGAI-Studio/0.4' },
        signal: AbortSignal.timeout(12_000),
      });
      const rawMime = (fluxResp.headers.get('content-type') ?? 'image/jpeg').split(';')[0].trim();
      const mime = rawMime.startsWith('image/') ? rawMime : '';
      const arrayBuffer = await fluxResp.arrayBuffer();
      if (fluxResp.ok && mime && arrayBuffer.byteLength > 2500) {
        const b64 = Buffer.from(arrayBuffer).toString('base64');
        return NextResponse.json({
          image: `data:${mime};base64,${b64}`,
          mode: modeData.id,
          model: compiledWithGemini ? 'gemini-prompt + flux-proxy' : 'flux-server-proxy',
          providerStatus: 'free-fallback',
          diagnosticReason: diagnosticReason || undefined,
          note: diagnostics.length > 0 ? diagnostics.slice(0, 2).join(', ') : undefined,
        });
      }
    } catch {
      // Fall through cleanly to SVG composition draft.
    }

    // Branch D: Built-in SVG Draft Composition
    const fallbackSvg = buildMangaSvgFallback({
      name: name || 'Manga',
      details,
      style,
      modeId: modeData.id,
      aspectRatio,
      notes,
    });
    return NextResponse.json({
      image: fallbackSvg,
      mode: modeData.id,
      model: 'mangai-draft-svg',
      providerStatus: 'free-fallback',
      diagnosticReason: diagnosticReason || undefined,
      note: diagnostics.length > 0 ? diagnostics.join(', ') : undefined,
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
