// Pinwheel Gallery configuration contract (package 0.1.0-prototype.1 compatible).

const MAX_SLOTS = 10;

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

function normalizeFocalArray(arr, length, defaultFocal) {
  const source = Array.isArray(arr) ? arr : [];
  return Array.from({ length }, (_, idx) => clampNumber(source[idx], 0, 100, defaultFocal));
}

export const configurationContract = {
  templateId: 'pinwheel-gallery',
  version: '0.1.0-prototype.1',
  schemaVersion: 1,

  normalize(raw = {}) {
    const count = Math.round(clampNumber(raw.imageCount, 3, MAX_SLOTS, MAX_SLOTS));
    return {
      imageCount: count,
      panels: Math.round(clampNumber(raw.panels, 3, MAX_SLOTS, count)),
      panelWidth: Math.round(clampNumber(raw.panelWidth, 140, 960, 340)),
      panelHeight: Math.round(clampNumber(raw.panelHeight, 140, 960, 280)),
      hub: Math.round(clampNumber(raw.hub, 0, 100, 24)),
      bend: Math.round(clampNumber(raw.bend, 0, 90, 30)),
      corners: Math.round(clampNumber(raw.corners, 0, 48, 12)),
      shade: Math.round(clampNumber(raw.shade, 0, 100, 35)),
      perspective: Math.round(clampNumber(raw.perspective, 10, 100, 50)),
      entranceTime: Number(clampNumber(raw.entranceTime, 0, 10, 3.6).toFixed(1)),
      scrollResponse: Math.round(clampNumber(raw.scrollResponse, 0, 200, 100)),
      pull: Math.round(clampNumber(raw.pull, 0, 100, 70)),
      lean: Math.round(clampNumber(raw.lean, 0, 100, 50)),
      pointerSpin: Math.round(clampNumber(raw.pointerSpin, 0, 20, 6)),
      mediaIds: normalizeStringArray(raw.mediaIds, MAX_SLOTS, () => ''),
      imageUrls: normalizeUrlArray(raw.imageUrls, MAX_SLOTS),
      imageAlt: normalizeStringArray(raw.imageAlt, MAX_SLOTS, (i) => `Image ${i + 1}`),
      focalX: normalizeFocalArray(raw.focalX, MAX_SLOTS, 50),
      focalY: normalizeFocalArray(raw.focalY, MAX_SLOTS, 40),
      ariaLabel:
        typeof raw.ariaLabel === 'string' && raw.ariaLabel.trim().length > 0
          ? raw.ariaLabel
          : 'Pinwheel gallery',
    };
  },

  toRuntimeOptions(configured) {
    const safe = this.normalize(configured);
    const perspectivePx = Math.round(2400 - (safe.perspective / 100) * 1100);
    return {
      templateId: this.templateId,
      version: this.version,
      schemaVersion: this.schemaVersion,
      imageCount: safe.imageCount,
      panels: safe.panels,
      panelWidth: safe.panelWidth,
      panelHeight: safe.panelHeight,
      hub: safe.hub,
      bend: safe.bend,
      corners: safe.corners,
      shade: safe.shade,
      perspective: safe.perspective,
      perspectivePx,
      entranceTime: safe.entranceTime,
      entranceDurationMs: Math.round(safe.entranceTime * 1000),
      scrollResponse: safe.scrollResponse,
      pull: safe.pull,
      lean: safe.lean,
      pointerSpin: safe.pointerSpin,
      ariaLabel: safe.ariaLabel,
      items: Array.from({ length: safe.panels }, (_, idx) => ({
        index: idx,
        mediaId: safe.mediaIds[idx] || '',
        imageUrl: safe.imageUrls[idx] || '',
        alt: safe.imageAlt[idx] || `Image ${idx + 1}`,
        focalX: safe.focalX[idx] ?? 50,
        focalY: safe.focalY[idx] ?? 40,
      })),
    };
  },
};
