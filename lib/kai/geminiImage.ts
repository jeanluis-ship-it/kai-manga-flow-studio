import {
  extractSeedFromText,
  generateFreeImageFallback,
  synthesizeLocalMangaArtwork,
} from './freeImageFallback';
import { generateGeminiSketch } from './geminiSketch';
import { KAI_IMAGE_MODEL_DEFAULT } from './studioCanvas';

export type ImagePart = { text: string } | { inlineData: { mimeType: string; data: string } };

export interface GenerateImageResultPayload {
  image: string;
  mimeType: string;
  model: string;
  renderKind: 'illustration' | 'vector-sketch' | 'fallback-raster';
  fallbackUsed?: boolean;
  provider?: string;
}

export class ImageServiceError extends Error {
  constructor(message: string, readonly status: number, readonly retryAfter?: string) {
    super(message);
  }
}

export interface GenerateGeminiImageOptions {
  seed?: string | number;
}

export async function generateGeminiImage(
  apiKey: string,
  parts: ImagePart[],
  aspectRatio: string,
  allowLite = true,
  options?: GenerateGeminiImageOptions,
): Promise<GenerateImageResultPayload> {
  const cleanKey = (apiKey || '').trim();
  const promptText = parts
    .filter((part): part is { text: string } => 'text' in part && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n');
  const resolvedSeed = options?.seed ?? extractSeedFromText(promptText);
  const preferredFallback = (process.env.IMAGE_FALLBACK_PROVIDER || '').trim().toLowerCase();

  const primary = process.env.GEMINI_CANVAS_IMAGE_MODEL?.trim() || KAI_IMAGE_MODEL_DEFAULT;
  const secondary = 'gemini-2.5-flash-image';
  const lite = 'gemini-3.1-flash-lite-image';
  const models = Array.from(
    new Set(
      allowLite && parts.length <= 2
        ? [primary, secondary, lite]
        : [primary, secondary],
    ),
  );

  // Tier 1: Official Gemini Image models when an API key is available and fallback-only mode is not forced
  if (cleanKey && preferredFallback !== 'pollinations' && preferredFallback !== 'local' && preferredFallback !== 'custom') {
    const body = JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio } },
    });

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cleanKey },
            body,
            signal: AbortSignal.timeout(42_000),
          },
        );

        if (!response.ok) {
          if (response.status === 429 || response.status === 404 || response.status >= 500) {
            continue;
          }
          // Even on 400/401/403 from a stale key, continue to Tier 2/3 so Beta flow never deadlocks.
          break;
        }

        const result = (await response.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{
                inlineData?: { mimeType?: string; data?: string };
                inline_data?: { mime_type?: string; data?: string };
              }>;
            };
          }>;
        };

        for (const part of result.candidates?.[0]?.content?.parts || []) {
          const data = part.inlineData?.data || part.inline_data?.data;
          const mimeType = part.inlineData?.mimeType || part.inline_data?.mime_type || 'image/png';
          if (data && /^image\/(png|jpeg|webp)$/.test(mimeType)) {
            return {
              image: `data:${mimeType};base64,${data}`,
              mimeType,
              model,
              renderKind: 'illustration',
              fallbackUsed: false,
            };
          }
        }
      } catch {
        // Network / timeout error on this Gemini model; try next model or degrade to Tier 2.
      }
    }
  }

  // Tier 2: Free / configurable raster fallback (custom / HuggingFace / Cloudflare / Pollinations Flux)
  const freeFallback = await generateFreeImageFallback({
    prompt: promptText,
    aspectRatio,
    seed: resolvedSeed,
  });
  if (freeFallback) {
    return freeFallback;
  }

  // Tier 3a: Vector sketch fallback via Gemini text model if API key is present
  if (cleanKey) {
    try {
      const sketch = await generateGeminiSketch(cleanKey, parts, aspectRatio, AbortSignal.timeout(18_000));
      return {
        ...sketch,
        fallbackUsed: true,
      };
    } catch (error) {
      console.warn('Gemini sketch unavailable', error instanceof Error ? error.name : 'Error');
    }
  }

  // Tier 3b: Guaranteed local crisp PNG synthesis via sharp (zero-failure safety net)
  return synthesizeLocalMangaArtwork({
    prompt: promptText,
    aspectRatio,
    seed: resolvedSeed,
  });
}

export function imageErrorResponse(error: unknown) {
  if (error instanceof ImageServiceError) {
    return Response.json(
      { error: error.message },
      {
        status: error.status,
        headers: error.retryAfter ? { 'Retry-After': error.retryAfter } : undefined,
      },
    );
  }
  const timedOut = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name);
  return Response.json(
    {
      error: timedOut
        ? 'La ilustración tardó más de lo previsto. Puedes reintentarlo.'
        : 'No se pudo conectar con el servicio de ilustración.',
    },
    { status: timedOut ? 504 : 502 },
  );
}
