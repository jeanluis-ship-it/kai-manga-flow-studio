'use client';

import React, { useRef, useState } from 'react';
import {
  buildShoutPath,
  buildTailPoints,
  buildThoughtBubbles,
  buildThoughtPath,
  computeBalloonGeometry,
  styleHasTail,
} from '@/lib/print/fukidashiGeometry';
import { isBalloonInsideNaiwaku, type PrintPresetSpec } from '@/lib/print/presets';
import type { Koma, KomaDialogue } from '@/app/studio/types';

export interface FukidashiLayerProps {
  komas: Koma[];
  preset: PrintPresetSpec;
  selectedDialogueId: string | null;
  onSelectDialogue: (komaId: string, dialogueId: string) => void;
  onUpdateDialogue: (
    komaId: string,
    dialogueId: string,
    patch: Partial<KomaDialogue>,
  ) => void;
}

type DragState =
  | {
      mode: 'move';
      komaId: string;
      dialogueId: string;
      startClientX: number;
      startClientY: number;
      originX: number;
      originY: number;
      originTailX: number;
      originTailY: number;
    }
  | {
      mode: 'tail';
      komaId: string;
      dialogueId: string;
    };

function clampPct(val: number, min = 3, max = 97): number {
  return Number(Math.min(max, Math.max(min, val)).toFixed(2));
}

/**
 * Layer L5 (z-index: 60) — Interactive SVG Fukidashi Speech Balloons.
 * Supports 6 authentic manga styles, pointer dragging, orientable tail handle,
 * inline double-click text editing, and real-time Naiwaku safe-area validation.
 */
export const FukidashiLayer: React.FC<FukidashiLayerProps> = ({
  komas,
  preset,
  selectedDialogueId,
  onSelectDialogue,
  onUpdateDialogue,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [editing, setEditing] = useState<{
    komaId: string;
    dialogueId: string;
    x: number;
    y: number;
    text: string;
  } | null>(null);

  const aspectFactor = preset.exportHeightPx / preset.exportWidthPx;

  const clientToPct = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 50, y: 50 };
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    if (drag.mode === 'move') {
      const dxPct = ((e.clientX - drag.startClientX) / rect.width) * 100;
      const dyPct = ((e.clientY - drag.startClientY) / rect.height) * 100;
      const nextX = clampPct(drag.originX + dxPct, 4, 96);
      const nextY = clampPct(drag.originY + dyPct, 4, 96);
      const appliedDx = nextX - drag.originX;
      const appliedDy = nextY - drag.originY;

      onUpdateDialogue(drag.komaId, drag.dialogueId, {
        x: nextX,
        y: nextY,
        tailX: clampPct(drag.originTailX + appliedDx, 2, 98),
        tailY: clampPct(drag.originTailY + appliedDy, 2, 98),
      });
    } else if (drag.mode === 'tail') {
      const pt = clientToPct(e.clientX, e.clientY);
      onUpdateDialogue(drag.komaId, drag.dialogueId, {
        tailX: clampPct(pt.x, 2, 98),
        tailY: clampPct(pt.y, 2, 98),
      });
    }
  };

  const handlePointerUp = () => {
    if (drag) setDrag(null);
  };

  const commitInlineEdit = () => {
    if (!editing) return;
    onUpdateDialogue(editing.komaId, editing.dialogueId, {
      text: editing.text.trim() || '...',
    });
    setEditing(null);
  };

  const allItems = komas.flatMap((koma) =>
    koma.dialogues.map((dialogue) => ({ koma, dialogue })),
  );

  return (
    <div
      ref={containerRef}
      className="gf-layer-l5-fukidashi"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="gf-fukidashi-svg"
        aria-label="Capa L5 de globos de diálogo Fukidashi"
      >
        {allItems.map(({ koma, dialogue }) => {
          const geom = computeBalloonGeometry(dialogue, aspectFactor);
          const isSelected = selectedDialogueId === dialogue.id;
          const insideSafe = isBalloonInsideNaiwaku(
            { x: geom.cx, y: geom.cy, width: geom.rx * 2, text: dialogue.text },
            preset,
          );
          const strokeColor = !insideSafe
            ? '#E11D48'
            : isSelected
            ? '#4F46E5'
            : '#111111';
          const fillColor =
            dialogue.style === 'narrator'
              ? '#FAF8F5'
              : dialogue.style === 'system'
              ? '#FFFFFF'
              : '#FFFFFF';

          const startMove = (e: React.PointerEvent) => {
            e.stopPropagation();
            (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
            onSelectDialogue(koma.id, dialogue.id);
            setDrag({
              mode: 'move',
              komaId: koma.id,
              dialogueId: dialogue.id,
              startClientX: e.clientX,
              startClientY: e.clientY,
              originX: geom.cx,
              originY: geom.cy,
              originTailX: geom.tailX,
              originTailY: geom.tailY,
            });
          };

          const startTailDrag = (e: React.PointerEvent) => {
            e.stopPropagation();
            (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
            onSelectDialogue(koma.id, dialogue.id);
            setDrag({
              mode: 'tail',
              komaId: koma.id,
              dialogueId: dialogue.id,
            });
          };

          const startInlineEdit = (e: React.MouseEvent) => {
            e.stopPropagation();
            onSelectDialogue(koma.id, dialogue.id);
            setEditing({
              komaId: koma.id,
              dialogueId: dialogue.id,
              x: geom.cx,
              y: geom.cy,
              text: dialogue.text,
            });
          };

          return (
            <g
              key={dialogue.id}
              className={`gf-fukidashi-group ${isSelected ? 'is-selected' : ''} ${
                !insideSafe ? 'is-out-of-bounds' : ''
              }`}
              onPointerDown={startMove}
              onDoubleClick={startInlineEdit}
              style={{ cursor: 'grab' }}
            >
              {/* Tail / Thought trail behind main bubble */}
              {(dialogue.style === 'normal' || dialogue.style === 'shout') && (
                <polygon
                  points={buildTailPoints(
                    geom.cx,
                    geom.cy,
                    geom.rx,
                    geom.ry,
                    geom.tailX,
                    geom.tailY,
                  )}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth="0.5"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {dialogue.style === 'thought' &&
                buildThoughtBubbles(
                  geom.cx,
                  geom.cy,
                  geom.rx,
                  geom.ry,
                  geom.tailX,
                  geom.tailY,
                ).map((b, idx) => (
                  <ellipse
                    key={idx}
                    cx={b.x}
                    cy={b.y}
                    rx={b.r}
                    ry={b.r / aspectFactor}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth="0.45"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}

              {/* Main Balloon Shape (6 authentic manga styles) */}
              {dialogue.style === 'normal' && (
                <ellipse
                  cx={geom.cx}
                  cy={geom.cy}
                  rx={geom.rx}
                  ry={geom.ry}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth="0.55"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {dialogue.style === 'whisper' && (
                <ellipse
                  cx={geom.cx}
                  cy={geom.cy}
                  rx={geom.rx}
                  ry={geom.ry}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {dialogue.style === 'shout' && (
                <path
                  d={buildShoutPath(geom.cx, geom.cy, geom.rx, geom.ry)}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth="0.6"
                  strokeLinejoin="miter"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {dialogue.style === 'thought' && (
                <path
                  d={buildThoughtPath(geom.cx, geom.cy, geom.rx, geom.ry)}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth="0.5"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {dialogue.style === 'narrator' && (
                <rect
                  x={geom.cx - geom.rx}
                  y={geom.cy - geom.ry}
                  width={geom.rx * 2}
                  height={geom.ry * 2}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth="0.55"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {dialogue.style === 'system' && (
                <>
                  <rect
                    x={geom.cx - geom.rx}
                    y={geom.cy - geom.ry}
                    width={geom.rx * 2}
                    height={geom.ry * 2}
                    fill="#111111"
                    fillOpacity="0.92"
                    stroke={strokeColor === '#111111' ? '#4F46E5' : strokeColor}
                    strokeWidth="0.6"
                    vectorEffect="non-scaling-stroke"
                  />
                  <rect
                    x={geom.cx - geom.rx + 0.9}
                    y={geom.cy - geom.ry + 0.7}
                    width={Math.max(2, geom.rx * 2 - 1.8)}
                    height={Math.max(2, geom.ry * 2 - 1.4)}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="0.35"
                    strokeDasharray="2 1"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              )}

              {/* Cover inner tail seam for normal/shout */}
              {dialogue.style === 'normal' && (
                <ellipse
                  cx={geom.cx}
                  cy={geom.cy}
                  rx={Math.max(1, geom.rx - 0.5)}
                  ry={Math.max(1, geom.ry - 0.4)}
                  fill={fillColor}
                />
              )}

              {/* Warning halo if crossing Naiwaku safe margin */}
              {!insideSafe && (
                <rect
                  x={geom.cx - geom.rx - 1}
                  y={geom.cy - geom.ry - 0.9}
                  width={geom.rx * 2 + 2}
                  height={geom.ry * 2 + 1.8}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="0.55"
                  strokeDasharray="3 2"
                  vectorEffect="non-scaling-stroke"
                />
              )}

              {/* Tail Control Handle when selected */}
              {isSelected && styleHasTail(dialogue.style) && (
                <g onPointerDown={startTailDrag} style={{ cursor: 'crosshair' }}>
                  <line
                    x1={geom.cx}
                    y1={geom.cy}
                    x2={geom.tailX}
                    y2={geom.tailY}
                    stroke="#4F46E5"
                    strokeWidth="0.3"
                    strokeDasharray="2 2"
                    vectorEffect="non-scaling-stroke"
                  />
                  <ellipse
                    cx={geom.tailX}
                    cy={geom.tailY}
                    rx="1.5"
                    ry={1.5 / aspectFactor}
                    fill="#4F46E5"
                    stroke="#FFFFFF"
                    strokeWidth="0.4"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Crisp HTML text overlay aligned to SVG coordinates (avoids SVG non-uniform aspect text distortion) */}
      {allItems.map(({ koma, dialogue }) => {
        const geom = computeBalloonGeometry(dialogue, aspectFactor);
        const isSelected = selectedDialogueId === dialogue.id;
        const insideSafe = isBalloonInsideNaiwaku(
          { x: geom.cx, y: geom.cy, width: geom.rx * 2, text: dialogue.text },
          preset,
        );
        const isEditingThis = editing?.dialogueId === dialogue.id;

        return (
          <div
            key={`${dialogue.id}-text`}
            className={`gf-fukidashi-text-box style-${dialogue.style} ${
              isSelected ? 'is-selected' : ''
            }`}
            style={{
              left: `${geom.cx}%`,
              top: `${geom.cy}%`,
              width: `${geom.rx * 1.82}%`,
              fontSize: `${Math.max(9, Math.round(geom.fontSize * 4.5))}px`,
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onSelectDialogue(koma.id, dialogue.id);
              setEditing({
                komaId: koma.id,
                dialogueId: dialogue.id,
                x: geom.cx,
                y: geom.cy,
                text: dialogue.text,
              });
            }}
          >
            {isEditingThis ? (
              <textarea
                autoFocus
                className="gf-fukidashi-inline-input"
                value={editing.text}
                onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                onBlur={commitInlineEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    commitInlineEdit();
                  } else if (e.key === 'Escape') {
                    setEditing(null);
                  }
                }}
                rows={2}
              />
            ) : (
              <span>{dialogue.text}</span>
            )}
            {!insideSafe && (
              <span
                className="gf-naiwaku-warn-pill"
                title="Globo fuera del área segura Naiwaku (riesgo de corte en imprenta)"
              >
                ⚠ NAIWAKU
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
