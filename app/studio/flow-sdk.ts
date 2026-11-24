import { splitDataUrl, toDataImageSrc } from './types';
import { KAI_IMAGE_MODEL_DEFAULT } from '@/lib/kai/studioCanvas';

export type AspectRatio = '1:1' | '3:4' | '4:3' | '16:9' | '9:16';
export type ImageMode = 'sheet' | 'cover_wrap' | 'panel' | 'portrait' | 'sketch_refine';

export interface GenerateImageParams {
  prompt: string;
  modelDisplayName?: string;
  aspectRatio?: AspectRatio;
  referenceImageMediaIds?: string[];
  referenceImagesBase64?: string[];
  mode?: ImageMode;
  name?: string;
  details?: string;
  style?: string;
  notes?: string;
  canon?: string;
  useHdModel?: boolean;
  renderPriority?: boolean;
}

export class QuotaExceededError extends Error {
  code: string;
  requiredPlan?: string;

  constructor(message: string, requiredPlan?: string) {
    super(message);
    this.name = 'QuotaExceededError';
    this.code = 'QUOTA_EXCEEDED';
    this.requiredPlan = requiredPlan;
  }
}

export interface GenerateImageResult {
  base64: string;
  dataUrl: string;
  mimeType: string;
  mediaId: string;
  model: string;
}

export interface DownloadParams {
  base64: string;
  mimeType?: string;
  filename: string;
}

const ALLOWED_REFERENCE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_REFERENCE_BYTES = 6 * 1024 * 1024;
const MAX_ATTACHED_REFERENCES = 4;

const mediaStore = new Map<string, string>();

function createMediaId(): string {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `media-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function resolveMode(mode?: ImageMode, aspectRatio?: AspectRatio): ImageMode {
  if (mode) return mode;
  if (aspectRatio === '1:1') return 'sheet';
  if (aspectRatio === '16:9') return 'cover_wrap';
  return 'panel';
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const clean = base64.replace(/\s+/g, '');
  if (!clean) {
    return new Uint8Array(new ArrayBuffer(0));
  }
  if (typeof atob === 'function') {
    const binary = atob(clean);
    const buffer = new ArrayBuffer(binary.length);
    const out = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i) & 0xff;
    }
    return out;
  }
  const nodeBuf = Buffer.from(clean, 'base64');
  const buffer = new ArrayBuffer(nodeBuf.byteLength);
  const out = new Uint8Array(buffer);
  out.set(nodeBuf);
  return out;
}

function dataUrlToReferenceFile(rawReference: string, index: number): File | null {
  const dataUrl = toDataImageSrc(rawReference);
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;

  const { mimeType, base64 } = splitDataUrl(dataUrl);
  if (!base64 || !ALLOWED_REFERENCE_MIME.has(mimeType)) {
    return null;
  }

  try {
    const bytes = base64ToBytes(base64);
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_REFERENCE_BYTES) {
      return null;
    }
    const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png';
    return new File([bytes], `reference-${index + 1}.${ext}`, { type: mimeType });
  } catch {
    return null;
  }
}

function readOptionalStudioAccessToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.sessionStorage?.getItem('mangai-studio-access')?.trim() ?? '';
  } catch {
    return '';
  }
}

/**
 * Unified MANGAI Studio SDK backed exclusively by `gemini-3.1-flash-image-preview`
 * through `/api/images/generate`.
 */
export const Flow = {
  media: {
    get(mediaId: string): string | undefined {
      return mediaStore.get(mediaId);
    },
    has(mediaId: string): boolean {
      return mediaStore.has(mediaId);
    },
    set(mediaId: string, dataUrl: string): void {
      const normalized = toDataImageSrc(dataUrl);
      if (mediaId && normalized) {
        mediaStore.set(mediaId, normalized);
      }
    },
  },

  generate: {
    async image(params: GenerateImageParams): Promise<GenerateImageResult> {
      const aspectRatio: AspectRatio = params.aspectRatio ?? '3:4';
      const mode = resolveMode(params.mode, aspectRatio);
      const preferredModel = KAI_IMAGE_MODEL_DEFAULT;
      const notes = (params.notes ?? params.prompt ?? '').trim();
      const name = (params.name ?? '').trim();

      const formData = new FormData();
      formData.set('mode', mode);
      formData.set('aspectRatio', aspectRatio);
      formData.set('preferredModel', preferredModel);
      if (params.useHdModel) formData.set('useHdModel', 'true');
      if (params.renderPriority) formData.set('renderPriority', 'true');
      if (name) formData.set('name', name);
      if (params.details?.trim()) formData.set('details', params.details.trim());
      if (params.style?.trim()) formData.set('style', params.style.trim());
      if (params.canon?.trim()) formData.set('canon', params.canon.trim());
      if (notes) formData.set('notes', notes);

      const candidateUrls: string[] = [];
      const seen = new Set<string>();

      for (const rawBase64 of params.referenceImagesBase64 ?? []) {
        const normalized = toDataImageSrc(rawBase64);
        if (normalized && !seen.has(normalized)) {
          seen.add(normalized);
          candidateUrls.push(normalized);
        }
      }

      for (const mediaId of params.referenceImageMediaIds ?? []) {
        const stored = mediaStore.get(mediaId);
        if (stored && !seen.has(stored)) {
          seen.add(stored);
          candidateUrls.push(stored);
        }
      }

      let attached = 0;
      for (const refUrl of candidateUrls) {
        if (attached >= MAX_ATTACHED_REFERENCES) break;
        const file = dataUrlToReferenceFile(refUrl, attached);
        if (file) {
          formData.append('references', file);
          attached += 1;
        }
      }

      const accessToken = readOptionalStudioAccessToken();
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers['x-mangai-access'] = accessToken;
      }

      const resp = await fetch('/api/images/generate', {
        method: 'POST',
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        body: formData,
      });

      const rawText = await resp.text();
      let payload: {
        image?: string;
        model?: string;
        error?: string;
        code?: string;
        requiredPlan?: string;
      } = {};
      try {
        payload = rawText
          ? (JSON.parse(rawText) as {
              image?: string;
              model?: string;
              error?: string;
              code?: string;
              requiredPlan?: string;
            })
          : {};
      } catch {
        throw new Error(`Respuesta inválida del generador de imágenes (HTTP ${resp.status}).`);
      }

      if (resp.status === 402 || payload.code === 'QUOTA_EXCEEDED') {
        throw new QuotaExceededError(
          payload.error || 'Cuota excedida para tu plan actual.',
          payload.requiredPlan,
        );
      }

      if (!resp.ok || !payload.image) {
        throw new Error(payload.error || `Error generando imagen con Gemini (HTTP ${resp.status}).`);
      }

      const { mimeType, base64 } = splitDataUrl(payload.image);
      if (!base64) {
        throw new Error('El modelo devolvió datos de imagen vacíos.');
      }

      const dataUrl = `data:${mimeType};base64,${base64}`;
      const mediaId = createMediaId();
      mediaStore.set(mediaId, dataUrl);

      return {
        base64,
        dataUrl,
        mimeType,
        mediaId,
        model: payload.model || preferredModel,
      };
    },
  },

  async download(params: DownloadParams): Promise<void> {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const raw = params.base64.trim();
    if (!raw) {
      throw new Error('Cannot download an empty asset.');
    }

    const { mimeType: parsedMime, base64 } = splitDataUrl(raw);
    const resolvedMime = raw.startsWith('data:')
      ? parsedMime
      : params.mimeType?.trim() || parsedMime || 'application/octet-stream';

    const bytes = base64ToBytes(base64);
    const blob = new Blob([bytes], { type: resolvedMime });
    const objectUrl = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = params.filename?.trim() || 'mangai-asset';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  },
};
