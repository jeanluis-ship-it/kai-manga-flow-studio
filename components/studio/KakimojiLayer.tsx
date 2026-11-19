'use client';

import React, { useRef, useState } from 'react';
import type { Koma, KomaSfx } from '@/app/studio/types';

export interface KakimojiLayerProps {
  komas: Koma[];
  onUpdateSfx: (komaId: string, sfxId: string, patch: Partial<KomaSfx>) => void;
  onSelectKoma: (komaId: string) => void;
}

/**
 * Layer L4 (z-index: 50) — Draggable Graphic Onomatopoeia (Kakimoji / SFX)
 * rendered with crisp white stroke contour (`paint-order: stroke`).
 */
export const KakimojiLayer: React.FC<KakimojiLayerProps> = ({
  komas,
  onUpdateSfx,
  onSelectKoma,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    komaId: string;
    sfxId: string;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    const dxPct = ((e.clientX - dragging.startClientX) / rect.width) * 100;
    const dyPct = ((e.clientY - dragging.startClientY) / rect.height) * 100;

    onUpdateSfx(dragging.komaId, dragging.sfxId, {
      x: Number(Math.min(95, Math.max(5, dragging.originX + dxPct)).toFixed(2)),
      y: Number(Math.min(95, Math.max(5, dragging.originY + dyPct)).toFixed(2)),
    });
  };

  const allSfx = komas.flatMap((koma) =>
    koma.sfxItems.map((sfx) => ({ koma, sfx })),
  );

  return (
    <div
      ref={containerRef}
      className="gf-layer-l4-sfx"
      onPointerMove={handlePointerMove}
      onPointerUp={() => setDragging(null)}
      onPointerCancel={() => setDragging(null)}
    >
      {allSfx.map(({ koma, sfx }) => {
        const x = typeof sfx.x === 'number' ? sfx.x : 74;
        const y = typeof sfx.y === 'number' ? sfx.y : 76;
        const rotation = typeof sfx.rotation === 'number' ? sfx.rotation : -8;

        return (
          <div
            key={sfx.id}
            className="gf-kakimoji-item"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
              onSelectKoma(koma.id);
              setDragging({
                komaId: koma.id,
                sfxId: sfx.id,
                startClientX: e.clientX,
                startClientY: e.clientY,
                originX: x,
                originY: y,
              });
            }}
            title="Arrastra para mover la onomatopeya (Capa L4)"
          >
            <svg
              viewBox="0 0 220 68"
              className="gf-kakimoji-svg"
              aria-label={`SFX ${sfx.text}`}
            >
              <text
                x="110"
                y="46"
                textAnchor="middle"
                fill="#111111"
                stroke="#FFFFFF"
                strokeWidth="9"
                strokeLinejoin="round"
                style={{
                  paintOrder: 'stroke',
                  fontWeight: 900,
                  fontSize: '30px',
                  fontStyle: 'italic',
                  letterSpacing: '0.04em',
                }}
              >
                {sfx.text}
              </text>
            </svg>
          </div>
        );
      })}
    </div>
  );
};
