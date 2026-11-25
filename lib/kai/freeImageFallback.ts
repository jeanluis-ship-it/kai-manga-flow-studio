import sharp from 'sharp';

export const FALLBACK_MODEL_NAME = 'pollinations-flux-beta';
export const LOCAL_SYNTH_MODEL_NAME = 'local-manga-synthesizer-beta';

export interface FallbackImageResult {
  image: string;
  mimeType: string;
  model: string;
  renderKind: 'fallback-raster';
  fallbackUsed: true;
  provider?: string;
}

export interface FreeFallbackOptions {
  prompt: string;
  aspectRatio?: string;
  seed?: string | number;
  timeoutMs?: number;
}

const ASPECT_DIMENSION_MAP: Record<string, { width: number; height: number }> = {
  '3:4': { width: 768, height: 1024 },
  '16:9': { width: 1280, height: 720 },
  '1:1': { width: 1024, height: 1024 },
  '9:16': { width: 720, height: 1280 },
  '4:3': { width: 1024, height: 768 },
};

export function mapAspectRatioToDimensions(aspectRatio = '3:4'): { width: number; height: number } {
  return ASPECT_DIMENSION_MAP[aspectRatio] ?? ASPECT_DIMENSION_MAP['3:4'];
}

export function extractSeedFromText(text: string): string | undefined {
  const match = text.match(/SEED-(\d+)/i);
  return match?.[1];
}

export function normalizeSeedNumber(seed?: string | number, prompt = ''): number {
  if (typeof seed === 'number' && Number.isFinite(seed) && seed >= 0) {
    return Math.floor(seed) % 999_999 || 42;
  }
  if (typeof seed === 'string') {
    const digits = seed.replace(/\D+/g, '');
    if (digits) {
      const parsed = Number.parseInt(digits.slice(0, 9), 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed % 999_999 || 42;
      }
    }
  }
  let hash = 2166136261;
  for (let i = 0; i < prompt.length; i++) {
    hash ^= prompt.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (Math.abs(hash) % 999_998) + 1;
}

export function buildConciseFallbackPrompt(rawPrompt: string, maxLength = 700): string {
  const safeMax = Math.min(740, Math.max(120, maxLength));
  const cleaned = rawPrompt
    .replace(/Do not include watermarks or speech bubbles\.?/gi, '')
    .replace(/Strictly respect the attached sketch\/reference images[^.]*\./gi, '')
    .replace(/FORMAT & COMPOSITION \([^)]+\):/gi, '')
    .replace(/CANON IDENTITY & VISUAL ANCHORS:/gi, '')
    .replace(/SUBJECT \/ CHARACTER:/gi, '')
    .replace(/WORLD \/ CONTEXT:/gi, '')
    .replace(/SCENE \/ ART DIRECTION:/gi, '')
    .replace(/ART STYLE:/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const base = cleaned || 'Japanese manga hero illustration, dramatic ink linework, screentones';
  const suffix = /manga|anime|ink/i.test(base)
    ? ', crisp manga ink, clean composition, no text'
    : ', Japanese manga art style, crisp ink lineart, screentones, no text';

  const combined = base.length + suffix.length <= safeMax ? `${base}${suffix}` : base;
  if (combined.length <= safeMax) {
    return combined;
  }
  return combined.slice(0, safeMax).replace(/\s+\S*$/, '').trim() || combined.slice(0, safeMax);
}

export function buildPollinationsUrls(
  prompt: string,
  aspectRatio = '3:4',
  seed?: string | number,
): string[] {
  const { width, height } = mapAspectRatioToDimensions(aspectRatio);
  const seedNum = normalizeSeedNumber(seed, prompt);
  const concise = buildConciseFallbackPrompt(prompt, 700);
  const encoded = encodeURIComponent(concise);
  const query = `width=${width}&height=${height}&seed=${seedNum}&nologo=true&model=flux`;

  return [
    `https://image.pollinations.ai/prompt/${encoded}?${query}`,
    `https://gen.pollinations.ai/image/${encoded}?${query}`,
  ];
}

export async function validateRasterImageResponse(
  response: Response,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (response.status !== 200) {
    return null;
  }
  const rawType = (response.headers.get('content-type') || '').toLowerCase();
  const mimeType = rawType.split(';')[0].trim();
  if (!mimeType.startsWith('image/')) {
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength <= 1024) {
    return null;
  }

  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: mimeType === 'image/jpg' ? 'image/jpeg' : mimeType,
  };
}

function toFallbackResult(
  buffer: Buffer,
  mimeType: string,
  model: string,
  provider: string,
): FallbackImageResult {
  return {
    image: `data:${mimeType};base64,${buffer.toString('base64')}`,
    mimeType,
    model,
    renderKind: 'fallback-raster',
    fallbackUsed: true,
    provider,
  };
}

async function tryCustomFallbackEndpoint(
  prompt: string,
  aspectRatio: string,
  seedNum: number,
  timeoutMs: number,
): Promise<FallbackImageResult | null> {
  const endpointUrl = (process.env.IMAGE_FALLBACK_URL || '').trim();
  if (!endpointUrl) return null;

  const { width, height } = mapAspectRatioToDimensions(aspectRatio);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = (process.env.IMAGE_FALLBACK_TOKEN || '').trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const resp = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt, width, height, seed: seedNum, aspectRatio }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const raster = await validateRasterImageResponse(resp);
    if (raster) {
      return toFallbackResult(raster.buffer, raster.mimeType, 'custom-fallback-beta', 'custom');
    }

    if (resp.status === 200 && (resp.headers.get('content-type') || '').includes('application/json')) {
      const json = (await resp.json().catch(() => ({}))) as {
        image?: string;
        mimeType?: string;
        model?: string;
      };
      if (typeof json.image === 'string' && json.image.startsWith('data:image/')) {
        const b64 = json.image.split(',')[1] || '';
        const buf = Buffer.from(b64, 'base64');
        if (buf.byteLength > 1024) {
          return {
            image: json.image,
            mimeType: json.mimeType || 'image/png',
            model: json.model || 'custom-fallback-beta',
            renderKind: 'fallback-raster',
            fallbackUsed: true,
            provider: 'custom',
          };
        }
      }
    }
  } catch {
    // Fall through cleanly to next provider.
  }
  return null;
}

async function tryHuggingFaceInference(
  prompt: string,
  aspectRatio: string,
  seedNum: number,
  timeoutMs: number,
): Promise<FallbackImageResult | null> {
  const hfToken = (process.env.HF_API_TOKEN || '').trim();
  if (!hfToken) return null;

  const { width, height } = mapAspectRatioToDimensions(aspectRatio);
  const hfModel = (process.env.HF_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell').trim();

  try {
    const resp = await fetch(
      `https://router.huggingface.co/hf-inference/models/${encodeURIComponent(hfModel)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${hfToken}`,
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { width, height, seed: seedNum },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      },
    );
    const raster = await validateRasterImageResponse(resp);
    if (raster) {
      return toFallbackResult(raster.buffer, raster.mimeType, 'huggingface-flux-beta', 'huggingface');
    }
  } catch {
    // Fall through cleanly to next provider.
  }
  return null;
}

async function tryCloudflareWorkersAi(
  prompt: string,
  aspectRatio: string,
  seedNum: number,
  timeoutMs: number,
): Promise<FallbackImageResult | null> {
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  const cfToken = (process.env.CLOUDFLARE_WORKERS_AI_TOKEN || '').trim();
  if (!accountId || !cfToken) return null;

  const { width, height } = mapAspectRatioToDimensions(aspectRatio);
  const cfModel = (
    process.env.CLOUDFLARE_IMAGE_MODEL || '@cf/black-forest-labs/flux-1-schnell'
  ).trim();

  try {
    const resp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${cfModel}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfToken}`,
        },
        body: JSON.stringify({ prompt, width, height, seed: seedNum }),
        signal: AbortSignal.timeout(timeoutMs),
      },
    );

    const raster = await validateRasterImageResponse(resp);
    if (raster) {
      return toFallbackResult(raster.buffer, raster.mimeType, 'cloudflare-flux-beta', 'cloudflare');
    }

    if (resp.status === 200 && (resp.headers.get('content-type') || '').includes('application/json')) {
      const json = (await resp.json().catch(() => ({}))) as { result?: { image?: string } };
      const rawB64 = json.result?.image;
      if (rawB64) {
        const buf = Buffer.from(rawB64, 'base64');
        if (buf.byteLength > 1024) {
          return toFallbackResult(buf, 'image/png', 'cloudflare-flux-beta', 'cloudflare');
        }
      }
    }
  } catch {
    // Fall through cleanly to next provider.
  }
  return null;
}

async function tryPollinationsFlux(
  prompt: string,
  aspectRatio: string,
  seedNum: number,
  timeoutMs: number,
): Promise<FallbackImageResult | null> {
  const urls = buildPollinationsUrls(prompt, aspectRatio, seedNum);
  const apiKey = (process.env.POLLINATIONS_API_KEY || '').trim();
  const headers: Record<string, string> | undefined = apiKey
    ? { Authorization: `Bearer ${apiKey}` }
    : undefined;

  for (const url of urls) {
    try {
      const resp = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const raster = await validateRasterImageResponse(resp);
      if (raster) {
        return toFallbackResult(raster.buffer, raster.mimeType, FALLBACK_MODEL_NAME, 'pollinations');
      }
    } catch {
      // Try next Pollinations endpoint cleanly.
    }
  }
  return null;
}

export async function generateFreeImageFallback(
  options: FreeFallbackOptions,
): Promise<FallbackImageResult | null> {
  const aspectRatio = options.aspectRatio || '3:4';
  const seedNum = normalizeSeedNumber(options.seed, options.prompt);
  const concise = buildConciseFallbackPrompt(options.prompt, 700);
  const timeoutMs = options.timeoutMs ?? 20_000;
  const preferred = (process.env.IMAGE_FALLBACK_PROVIDER || '').trim().toLowerCase();

  if (preferred === 'local') {
    return null;
  }

  const runners: Record<string, () => Promise<FallbackImageResult | null>> = {
    custom: () => tryCustomFallbackEndpoint(concise, aspectRatio, seedNum, timeoutMs),
    huggingface: () => tryHuggingFaceInference(concise, aspectRatio, seedNum, timeoutMs),
    cloudflare: () => tryCloudflareWorkersAi(concise, aspectRatio, seedNum, timeoutMs),
    pollinations: () => tryPollinationsFlux(concise, aspectRatio, seedNum, timeoutMs),
  };

  const order =
    preferred && preferred in runners
      ? [preferred, ...Object.keys(runners).filter((k) => k !== preferred)]
      : ['custom', 'huggingface', 'cloudflare', 'pollinations'];

  for (const key of order) {
    const result = await runners[key]();
    if (result) {
      return result;
    }
  }

  return null;
}

export async function synthesizeLocalMangaArtwork(options: {
  prompt: string;
  aspectRatio?: string;
  seed?: string | number;
}): Promise<FallbackImageResult> {
  const aspectRatio = options.aspectRatio || '3:4';
  const { width, height } = mapAspectRatioToDimensions(aspectRatio);
  const seedNum = normalizeSeedNumber(options.seed, options.prompt);

  const cx = Math.round(width * (0.44 + ((seedNum % 13) / 100)));
  const cy = Math.round(height * (0.38 + ((seedNum % 9) / 100)));
  const maxRadius = Math.hypot(width, height);

  const speedlines: string[] = [];
  const lineCount = 56;
  for (let i = 0; i < lineCount; i++) {
    const angle = (i / lineCount) * Math.PI * 2 + (seedNum % 7) * 0.03;
    const innerR = Math.min(width, height) * (0.2 + ((i * 17 + seedNum) % 9) * 0.015);
    const x1 = (cx + Math.cos(angle) * innerR).toFixed(1);
    const y1 = (cy + Math.sin(angle) * innerR).toFixed(1);
    const x2 = (cx + Math.cos(angle) * maxRadius).toFixed(1);
    const y2 = (cy + Math.sin(angle) * maxRadius).toFixed(1);
    const sw = i % 3 === 0 ? 2.6 : 1.1;
    const op = i % 2 === 0 ? 0.45 : 0.22;
    speedlines.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#111111" stroke-width="${sw}" stroke-opacity="${op}" />`,
    );
  }

  const pad = Math.round(Math.min(width, height) * 0.045);
  const frameW = width - pad * 2;
  const frameH = height - pad * 2;
  const silScale = Math.min(width, height) / 768;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <pattern id="halftone-coarse" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(24)">
      <circle cx="4" cy="4" r="2.1" fill="#111111" fill-opacity="0.16" />
    </pattern>
    <pattern id="halftone-fine" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
      <circle cx="3" cy="3" r="1.25" fill="#111111" fill-opacity="0.11" />
    </pattern>
    <radialGradient id="manga-burst" cx="${Math.round((cx / width) * 100)}%" cy="${Math.round((cy / height) * 100)}%" r="65%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.98" />
      <stop offset="52%" stop-color="#FAF8F5" stop-opacity="0.88" />
      <stop offset="100%" stop-color="#E4DFD3" stop-opacity="0.95" />
    </radialGradient>
    <linearGradient id="ink-horizon" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#111111" stop-opacity="0.06" />
      <stop offset="100%" stop-color="#111111" stop-opacity="0.88" />
    </linearGradient>
    <clipPath id="panel-clip">
      <rect x="${pad}" y="${pad}" width="${frameW}" height="${frameH}" rx="4" />
    </clipPath>
  </defs>

  <rect width="${width}" height="${height}" fill="#FAF8F5" />

  <g clip-path="url(#panel-clip)">
    <rect x="${pad}" y="${pad}" width="${frameW}" height="${frameH}" fill="url(#manga-burst)" />
    <rect x="${pad}" y="${pad}" width="${frameW}" height="${Math.round(frameH * 0.56)}" fill="url(#halftone-fine)" />
    <rect x="${pad}" y="${Math.round(pad + frameH * 0.52)}" width="${frameW}" height="${Math.round(frameH * 0.48)}" fill="url(#halftone-coarse)" />

    <g>${speedlines.join('')}</g>

    <circle cx="${cx}" cy="${cy}" r="${Math.round(135 * silScale)}" fill="#FFFFFF" stroke="#111111" stroke-width="${Math.max(2, Math.round(3 * silScale))}" />
    <circle cx="${cx}" cy="${cy}" r="${Math.round(112 * silScale)}" fill="none" stroke="#E11D48" stroke-width="${Math.max(1.5, Math.round(2 * silScale))}" stroke-dasharray="14 8" />

    <path d="M ${pad} ${Math.round(height * 0.72)} Q ${Math.round(width * 0.34)} ${Math.round(height * 0.6)} ${cx} ${Math.round(height * 0.69)} T ${width - pad} ${Math.round(height * 0.66)} L ${width - pad} ${height - pad} L ${pad} ${height - pad} Z" fill="url(#ink-horizon)" />

    <g transform="translate(${cx}, ${Math.round(cy + 12 * silScale)}) scale(${silScale.toFixed(3)})">
      <path d="M -92 260 C -84 135 -48 64 0 58 C 48 64 84 135 92 260 Z" fill="#111111" />
      <path d="M -56 105 C -96 72 -136 42 -162 20 C -112 52 -66 72 -28 88 Z" fill="#111111" />
      <path d="M 52 102 C 102 68 156 26 196 -14 C 142 38 92 66 36 86 Z" fill="#E11D48" fill-opacity="0.88" />
      <circle cx="0" cy="-18" r="46" fill="#111111" />
      <path d="M -46 -26 C -42 -68 42 -68 46 -26 C 24 -44 -24 -44 -46 -26 Z" fill="#111111" />
      <path d="M -22 -14 L -8 -11 L -20 -6 Z" fill="#FAF8F5" />
      <path d="M 22 -14 L 8 -11 L 20 -6 Z" fill="#FAF8F5" />
      <path d="M -148 168 L 154 74 L 160 84 L -142 178 Z" fill="#FFFFFF" stroke="#111111" stroke-width="3" />
    </g>
  </g>

  <rect x="${pad}" y="${pad}" width="${frameW}" height="${frameH}" fill="none" stroke="#111111" stroke-width="4" rx="4" />
  <rect x="${pad + 8}" y="${pad + 8}" width="${frameW - 16}" height="${frameH - 16}" fill="none" stroke="#111111" stroke-width="1" stroke-opacity="0.35" />

  <g stroke="#111111" stroke-width="1.5" opacity="0.55">
    <path d="M ${pad - 12} ${pad} L ${pad - 4} ${pad} M ${pad} ${pad - 12} L ${pad} ${pad - 4}" />
    <path d="M ${width - pad + 4} ${pad} L ${width - pad + 12} ${pad} M ${width - pad} ${pad - 12} L ${width - pad} ${pad - 4}" />
    <path d="M ${pad - 12} ${height - pad} L ${pad - 4} ${height - pad} M ${pad} ${height - pad + 4} L ${pad} ${height - pad + 12}" />
    <path d="M ${width - pad + 4} ${height - pad} L ${width - pad + 12} ${height - pad} M ${width - pad} ${height - pad + 4} L ${width - pad} ${height - pad + 12}" />
  </g>
</svg>`;

  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 8 }).toBuffer();
  return {
    image: `data:image/png;base64,${png.toString('base64')}`,
    mimeType: 'image/png',
    model: LOCAL_SYNTH_MODEL_NAME,
    renderKind: 'fallback-raster',
    fallbackUsed: true,
    provider: 'local-sharp',
  };
}
