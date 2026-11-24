// Crease Carousel configuration contract (package 0.1.0-prototype.1 compatible).

const SLOT_COUNT = 8;

function clampNumber(value, min, max, fallback) {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, n));
}

function isSupportedImageUrl(value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (value.startsWith('/')) return true;
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === 'http:' ||
      parsed.protocol === 'https:' ||
      parsed.protocol === 'file:'
    );
  } catch {
    return false;
  }
}

function normalizeStringArray(arr, length, fallbackFn) {
  const source = Array.isArray(arr) ? arr : [];
  return Array.from({ length }, (_, idx) =>
    typeof source[idx] === 'string' ? source[idx] : fallbackFn(idx),
  );
}

function normalizeUrlArray(arr, length) {
  const source = Array.isArray(arr) ? arr : [];
  return Array.from({ length }, (_, idx) => {
    const candidate = source[idx];
    return isSupportedImageUrl(candidate) ? candidate : '';
  });
}

function normalizeFocalArray(arr, length) {
  const source = Array.isArray(arr) ? arr : [];
  return Array.from({ length }, (_, idx) => clampNumber(source[idx], 0, 100, 50));
}

export const configurationContract = {
  templateId: 'crease-carousel',
  version: '0.1.0-prototype.1',
  schemaVersion: 1,

  normalize(raw = {}) {
    return {
      schemaVersion: 1,
      cardCount: Math.round(clampNumber(raw.cardCount, 1, SLOT_COUNT, 4)),
      cardWidth: Math.round(clampNumber(raw.cardWidth, 320, 3840, 1280)),
      cardHeight: Math.round(clampNumber(raw.cardHeight, 240, 2160, 720)),
      cornerRadius: Math.round(clampNumber(raw.cornerRadius, 0, 64, 12)),
      curl: Math.round(clampNumber(raw.curl, 0, 100, 60)),
      duration: Number(clampNumber(raw.duration, 0.15, 3, 0.9).toFixed(2)),
      autoplay: Boolean(raw.autoplay),
      interval: Number(clampNumber(raw.interval, 1, 30, 4)),
      showDots: raw.showDots !== undefined ? Boolean(raw.showDots) : true,
      mediaIds: normalizeStringArray(raw.mediaIds, SLOT_COUNT, () => ''),
      rightMediaIds: normalizeStringArray(raw.rightMediaIds, SLOT_COUNT, () => ''),
      rightImageUrls: normalizeUrlArray(raw.rightImageUrls, SLOT_COUNT),
      rightImageAlt: normalizeStringArray(
        raw.rightImageAlt,
        SLOT_COUNT,
        (i) => `Right page ${i + 1}`,
      ),
      rightFocalX: normalizeFocalArray(raw.rightFocalX, SLOT_COUNT),
      rightFocalY: normalizeFocalArray(raw.rightFocalY, SLOT_COUNT),
      imageUrls: normalizeUrlArray(raw.imageUrls, SLOT_COUNT),
      imageAlt: normalizeStringArray(
        raw.imageAlt,
        SLOT_COUNT,
        (i) => `Left page ${i + 1}`,
      ),
      focalX: normalizeFocalArray(raw.focalX, SLOT_COUNT),
      focalY: normalizeFocalArray(raw.focalY, SLOT_COUNT),
      ariaLabel:
        typeof raw.ariaLabel === 'string' && raw.ariaLabel.trim().length > 0
          ? raw.ariaLabel
          : 'Image carousel',
    };
  },

  toRuntimeOptions(configured) {
    const safe = this.normalize(configured);
    return {
      templateId: this.templateId,
      version: this.version,
      schemaVersion: safe.schemaVersion,
      cardCount: safe.cardCount,
      cardWidth: safe.cardWidth,
      cardHeight: safe.cardHeight,
      aspectRatio: `${safe.cardWidth} / ${safe.cardHeight}`,
      cornerRadius: safe.cornerRadius,
      curl: safe.curl,
      duration: safe.duration,
      durationMs: Math.round(safe.duration * 1000),
      autoplay: safe.autoplay,
      interval: safe.interval,
      intervalMs: Math.round(safe.interval * 1000),
      showDots: safe.showDots,
      ariaLabel: safe.ariaLabel,
      slots: Array.from({ length: SLOT_COUNT }, (_, idx) => ({
        index: idx,
        left: {
          mediaId: safe.mediaIds[idx] || '',
          imageUrl: safe.imageUrls[idx] || '',
          alt: safe.imageAlt[idx] || `Left page ${idx + 1}`,
          focalX: safe.focalX[idx] ?? 50,
          focalY: safe.focalY[idx] ?? 50,
        },
        right: {
          mediaId: safe.rightMediaIds[idx] || '',
          imageUrl: safe.rightImageUrls[idx] || '',
          alt: safe.rightImageAlt[idx] || `Right page ${idx + 1}`,
          focalX: safe.rightFocalX[idx] ?? 50,
          focalY: safe.rightFocalY[idx] ?? 50,
        },
      })),
    };
  },
};
