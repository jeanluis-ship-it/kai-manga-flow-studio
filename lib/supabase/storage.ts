import type { SupabaseClient } from '@supabase/supabase-js';

export const MANGA_ASSETS_BUCKET = 'manga-assets';

// In-memory cache to avoid re-uploading the exact same data URL on every debounced autosave
const uploadedAssetCache = new Map<string, string>();

function hashStringShort(input: string): string {
  let h = 2166136261;
  const step = Math.max(1, Math.floor(input.length / 256));
  for (let i = 0; i < input.length; i += step) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${input.length.toString(36)}-${(h >>> 0).toString(16)}`;
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string; mime: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const base64 = match[2];
  const ext =
    mime.includes('jpeg') || mime.includes('jpg')
      ? 'jpg'
      : mime.includes('webp')
      ? 'webp'
      : mime.includes('svg')
      ? 'svg'
      : 'png';

  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { blob: new Blob([bytes], { type: mime }), ext, mime };
  } catch {
    return null;
  }
}

/**
 * Ensures an image value (data URL or existing HTTP URL) is uploaded to the
 * public `manga-assets` bucket at `{userId}/{mangaId}/{assetPath}.{ext}` and
 * returns its public URL. If already an HTTP(S) URL, returns it unchanged.
 */
export async function uploadMangaAssetToStorage(
  supabase: SupabaseClient,
  userId: string,
  mangaId: string,
  assetKey: string,
  imageSource: string | undefined | null,
): Promise<string | null> {
  if (!imageSource || typeof imageSource !== 'string') return null;
  const trimmed = imageSource.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (!trimmed.startsWith('data:image/')) {
    return null;
  }

  const cacheKey = `${userId}/${mangaId}/${assetKey}:${hashStringShort(trimmed)}`;
  const cached = uploadedAssetCache.get(cacheKey);
  if (cached) return cached;

  const decoded = dataUrlToBlob(trimmed);
  if (!decoded) return null;

  const cleanAssetKey = assetKey.replace(/[^a-zA-Z0-9/_-]/g, '_');
  const storagePath = `${userId}/${mangaId}/${cleanAssetKey}.${decoded.ext}`;

  try {
    const { error } = await supabase.storage
      .from(MANGA_ASSETS_BUCKET)
      .upload(storagePath, decoded.blob, {
        contentType: decoded.mime,
        upsert: true,
        cacheControl: '3600',
      });

    if (error) {
      return null;
    }

    const { data } = supabase.storage.from(MANGA_ASSETS_BUCKET).getPublicUrl(storagePath);
    if (data?.publicUrl) {
      uploadedAssetCache.set(cacheKey, data.publicUrl);
      return data.publicUrl;
    }
    return null;
  } catch {
    return null;
  }
}
