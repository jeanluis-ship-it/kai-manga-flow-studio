import { KAI_IMAGE_MODEL_DEFAULT } from './studioCanvas';

type ImagePart = { text: string } | { inlineData: { mimeType: string; data: string } };

export class ImageServiceError extends Error {
  constructor(message: string, readonly status: number, readonly retryAfter?: string) {
    super(message);
  }
}

interface GeminiFailure {
  error?: {
    details?: Array<{
      violations?: Array<{ quotaDimensions?: { model?: string }; quotaId?: string; quotaValue?: string }>;
      retryDelay?: string;
    }>;
  };
}

export async function generateGeminiImage(apiKey: string, parts: ImagePart[], aspectRatio: string, allowLite = true) {
  const primary = process.env.GEMINI_CANVAS_IMAGE_MODEL?.trim() || KAI_IMAGE_MODEL_DEFAULT;
  const lite = 'gemini-3.1-flash-lite-image';
  const models = allowLite && parts.length <= 2 && primary !== lite ? [primary, lite] : [primary];
  const signal = AbortSignal.timeout(52_000);
  const body = JSON.stringify({
    contents: [{ role: 'user', parts }],
    generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio } },
  });

  for (const model of models) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body, signal },
    );
    if (!response.ok) {
      const details: GeminiFailure = await response.json().catch(() => ({}));
      const violations = details.error?.details?.flatMap((d) => d.violations || []) || [];
      const modelLimit = violations.length > 0 && violations.every((v) => v.quotaDimensions?.model);
      if (model !== models.at(-1) && (response.status === 404 || response.status === 503 || (response.status === 429 && modelLimit))) continue;
      if (response.status === 429) {
        const shortLimit = violations.length > 0 && violations.every((v) => /minute|second/i.test(v.quotaId || '') && v.quotaValue !== '0');
        const retry = response.headers.get('retry-after') || details.error?.details?.find((d) => d.retryDelay)?.retryDelay?.replace(/s$/, '');
        const seconds = Math.ceil(Number(retry));
        if (shortLimit && seconds > 0 && Number.isFinite(seconds)) {
          throw new ImageServiceError(`El servicio está ocupado. Podrás volver a generar en ${seconds} s.`, 429, String(seconds));
        }
        throw new ImageServiceError('El proveedor no tiene cuota de imágenes disponible para este proyecto. Puedes seguir editando y usando el chat.', 429);
      }
      throw new ImageServiceError('El servicio de ilustración no pudo completar esta solicitud.', 502);
    }

    const result = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{
      inlineData?: { mimeType?: string; data?: string };
      inline_data?: { mime_type?: string; data?: string };
    }> } }> };
    for (const part of result.candidates?.[0]?.content?.parts || []) {
      const data = part.inlineData?.data || part.inline_data?.data;
      const mimeType = part.inlineData?.mimeType || part.inline_data?.mime_type || 'image/png';
      if (data && /^image\/(png|jpeg|webp)$/.test(mimeType)) {
        return { image: `data:${mimeType};base64,${data}`, mimeType, model };
      }
    }
    throw new ImageServiceError('El proveedor terminó sin entregar una imagen. Revisa la descripción o la referencia.', 502);
  }
  throw new ImageServiceError('El servicio de ilustración está temporalmente indisponible.', 503);
}

export function imageErrorResponse(error: unknown) {
  if (error instanceof ImageServiceError) {
    return Response.json({ error: error.message }, {
      status: error.status,
      headers: error.retryAfter ? { 'Retry-After': error.retryAfter } : undefined,
    });
  }
  const timedOut = error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name);
  return Response.json({ error: timedOut ? 'La ilustración tardó más de lo previsto. Puedes reintentarlo.' : 'No se pudo conectar con el servicio de ilustración.' }, { status: timedOut ? 504 : 502 });
}
