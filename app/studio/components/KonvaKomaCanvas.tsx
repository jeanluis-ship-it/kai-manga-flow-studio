'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Circle,
  Group,
  Image as KonvaImage,
  Layer,
  Line,
  Stage,
  Text as KonvaText,
} from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { getPolygonBounds, type PolygonPoint } from '@/lib/kai/schema';
import { toDataImageSrc, type Koma } from '../types';

export interface KonvaKomaCanvasProps {
  komas: Koma[];
  selectedKomaId: string | null;
  showInk: boolean;
  showBorders: boolean;
  isDrawingVector: boolean;
  isEditingVertices: boolean;
  draftPoints: PolygonPoint[];
  cursorPoint: PolygonPoint | null;
  isNearFirstVertex: boolean;
  snapPoint: (rawPctX: number, rawPctY: number) => PolygonPoint;
  onSelectKoma: (komaId: string) => void;
  onAddDraftPoint: (pt: PolygonPoint) => void;
  onCursorMove: (pt: PolygonPoint | null) => void;
  onCloseDraftPolygon: () => void;
  onMoveVertex: (komaId: string, vertexIdx: number, nextPt: PolygonPoint) => void;
}

function useLoadedImage(src: string): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }
    let active = true;
    const img = new window.Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (active) setImage(img);
    };
    img.onerror = () => {
      if (active) setImage(null);
    };
    img.src = src;
    return () => {
      active = false;
    };
  }, [src]);

  return image;
}

const ClippedKomaImage: React.FC<{
  koma: Koma;
  stageW: number;
  stageH: number;
}> = ({ koma, stageW, stageH }) => {
  const src = toDataImageSrc(koma.inkRenderUrl);
  const img = useLoadedImage(src);

  if (!img || koma.polygonCoords.length < 3 || stageW <= 0 || stageH <= 0) {
    return null;
  }

  const bounds = getPolygonBounds(koma.polygonCoords);
  const bx = (bounds.left / 100) * stageW;
  const by = (bounds.top / 100) * stageH;
  const bw = (bounds.width / 100) * stageW;
  const bh = (bounds.height / 100) * stageH;

  const scale = Math.max(bw / Math.max(1, img.width), bh / Math.max(1, img.height));
  const drawW = img.width * scale;
  const drawH = img.height * scale;
  const dx = bx + (bw - drawW) / 2;
  const dy = by + (bh - drawH) / 2;

  return (
    <Group
      clipFunc={(ctx) => {
        ctx.beginPath();
        koma.polygonCoords.forEach((pt, idx) => {
          const px = (pt.x / 100) * stageW;
          const py = (pt.y / 100) * stageH;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
      }}
    >
      <KonvaImage image={img} x={dx} y={dy} width={drawW} height={drawH} listening={false} />
    </Group>
  );
};

export const KonvaKomaCanvas: React.FC<KonvaKomaCanvasProps> = ({
  komas,
  selectedKomaId,
  showInk,
  showBorders,
  isDrawingVector,
  isEditingVertices,
  draftPoints,
  cursorPoint,
  isNearFirstVertex,
  snapPoint,
  onSelectKoma,
  onAddDraftPoint,
  onCursorMove,
  onCloseDraftPolygon,
  onMoveVertex,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    };

    updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateSize);
      observer.observe(el);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const toStageCoords = (pts: PolygonPoint[]): number[] => {
    const flat: number[] = [];
    for (const pt of pts) {
      flat.push((pt.x / 100) * size.width, (pt.y / 100) * size.height);
    }
    return flat;
  };

  const pointerToSnappedPct = (evt: KonvaEventObject<MouseEvent>): PolygonPoint | null => {
    const stage = evt.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos || size.width <= 0 || size.height <= 0) return null;
    const rawX = (pos.x / size.width) * 100;
    const rawY = (pos.y / size.height) * 100;
    return snapPoint(rawX, rawY);
  };

  const handleStageClick = (evt: KonvaEventObject<MouseEvent>) => {
    if (!isDrawingVector) return;
    const pt = pointerToSnappedPct(evt);
    if (!pt) return;

    if (draftPoints.length >= 3) {
      const first = draftPoints[0];
      if (Math.hypot(pt.x - first.x, pt.y - first.y) <= 3.5) {
        onCloseDraftPolygon();
        return;
      }
    }

    const last = draftPoints[draftPoints.length - 1];
    if (last && Math.hypot(pt.x - last.x, pt.y - last.y) < 0.8) {
      return;
    }

    onAddDraftPoint(pt);
  };

  const handleStageDblClick = () => {
    if (!isDrawingVector) return;
    if (draftPoints.length >= 3) {
      onCloseDraftPolygon();
    }
  };

  const handleStageMouseMove = (evt: KonvaEventObject<MouseEvent>) => {
    if (!isDrawingVector) return;
    const pt = pointerToSnappedPct(evt);
    onCursorMove(pt);
  };

  const selectedKoma = komas.find((k) => k.id === selectedKomaId) ?? null;
  const interactive = isDrawingVector || isEditingVertices;

  return (
    <div
      ref={containerRef}
      className={`gf-konva-stage-host ${isDrawingVector ? 'is-drawing' : ''}`}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: interactive ? 82 : 29,
        pointerEvents: interactive ? 'auto' : 'none',
        cursor: isDrawingVector ? 'crosshair' : 'default',
      }}
      aria-label="Motor vectorial Konva de viñetas y recorte poligonal"
    >
      {size.width > 0 && size.height > 0 && (
        <Stage
          width={size.width}
          height={size.height}
          onClick={handleStageClick}
          onDblClick={handleStageDblClick}
          onMouseMove={handleStageMouseMove}
          onMouseLeave={() => {
            if (isDrawingVector) onCursorMove(null);
          }}
        >
          {/* Layer 1: Hardware-accelerated Polygon Clipped Panel Artwork */}
          <Layer listening={false}>
            {showInk &&
              komas.map((koma) => (
                <ClippedKomaImage
                  key={`konva-clip-${koma.id}`}
                  koma={koma}
                  stageW={size.width}
                  stageH={size.height}
                />
              ))}

            {showBorders &&
              komas.map((koma) => {
                const isSelected = koma.id === selectedKomaId;
                return (
                  <Line
                    key={`konva-border-${koma.id}`}
                    points={toStageCoords(koma.polygonCoords)}
                    closed
                    stroke={isSelected ? '#4F46E5' : '#111111'}
                    strokeWidth={isSelected ? 2.5 : 1.8}
                    lineJoin="miter"
                  />
                );
              })}
          </Layer>

          {/* Layer 2: Interactive Point-by-Point Polygon Builder & Vertex Editor */}
          {interactive && (
            <Layer>
              {/* Allow clicking any existing koma when editing vertices */}
              {!isDrawingVector &&
                isEditingVertices &&
                komas.map((koma) => (
                  <Line
                    key={`konva-hit-${koma.id}`}
                    points={toStageCoords(koma.polygonCoords)}
                    closed
                    fill={
                      koma.id === selectedKomaId
                        ? 'rgba(79, 70, 229, 0.08)'
                        : 'rgba(17, 17, 17, 0.02)'
                    }
                    stroke={koma.id === selectedKomaId ? '#4F46E5' : 'transparent'}
                    strokeWidth={2}
                    dash={[6, 4]}
                    onClick={() => onSelectKoma(koma.id)}
                  />
                ))}

              {/* Active point-by-point drawing preview */}
              {isDrawingVector && draftPoints.length >= 3 && (
                <Line
                  points={toStageCoords(draftPoints)}
                  closed
                  fill="rgba(79, 70, 229, 0.16)"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  listening={false}
                />
              )}

              {isDrawingVector && draftPoints.length >= 2 && (
                <Line
                  points={toStageCoords(draftPoints)}
                  stroke="#4F46E5"
                  strokeWidth={2.2}
                  listening={false}
                />
              )}

              {isDrawingVector && draftPoints.length >= 1 && cursorPoint && (
                <>
                  <Line
                    points={toStageCoords([draftPoints[draftPoints.length - 1], cursorPoint])}
                    stroke="#00AEEF"
                    strokeWidth={2}
                    dash={[6, 4]}
                    listening={false}
                  />
                  {draftPoints.length >= 2 && (
                    <Line
                      points={toStageCoords([cursorPoint, draftPoints[0]])}
                      stroke="rgba(79, 70, 229, 0.5)"
                      strokeWidth={1.5}
                      dash={[4, 5]}
                      listening={false}
                    />
                  )}
                </>
              )}

              {isDrawingVector &&
                draftPoints.map((pt, idx) => {
                  const isFirst = idx === 0;
                  const canClose = isFirst && draftPoints.length >= 3;
                  const px = (pt.x / 100) * size.width;
                  const py = (pt.y / 100) * size.height;
                  return (
                    <Group key={`konva-draft-pt-${idx}`}>
                      {isFirst && (
                        <Circle
                          x={px}
                          y={py}
                          radius={isNearFirstVertex ? 11 : 8}
                          fill="rgba(79, 70, 229, 0.18)"
                          stroke="#4F46E5"
                          strokeWidth={1.5}
                          listening={false}
                        />
                      )}
                      <Circle
                        x={px}
                        y={py}
                        radius={isFirst ? 6 : 5}
                        fill={
                          canClose && isNearFirstVertex
                            ? '#E11D48'
                            : isFirst
                            ? '#4F46E5'
                            : '#00AEEF'
                        }
                        stroke="#FFFFFF"
                        strokeWidth={2}
                        onClick={(evt) => {
                          if (canClose) {
                            evt.cancelBubble = true;
                            onCloseDraftPolygon();
                          }
                        }}
                      />
                    </Group>
                  );
                })}

              {isDrawingVector && cursorPoint && (
                <KonvaText
                  x={Math.min(size.width - 72, (cursorPoint.x / 100) * size.width + 10)}
                  y={Math.max(8, (cursorPoint.y / 100) * size.height - 18)}
                  text={`${cursorPoint.x}, ${cursorPoint.y}`}
                  fontSize={11}
                  fontStyle="bold"
                  fill="#4F46E5"
                  listening={false}
                />
              )}

              {/* Draggable Vertex Handles for Selected Koma */}
              {!isDrawingVector &&
                isEditingVertices &&
                selectedKoma &&
                selectedKoma.polygonCoords.map((pt, idx) => {
                  const px = (pt.x / 100) * size.width;
                  const py = (pt.y / 100) * size.height;
                  return (
                    <Group key={`konva-vertex-${selectedKoma.id}-${idx}`}>
                      <Circle
                        x={px}
                        y={py}
                        radius={7}
                        fill="#4F46E5"
                        stroke="#FFFFFF"
                        strokeWidth={2.2}
                        draggable
                        onDragMove={(evt) => {
                          const node = evt.target;
                          const rawX = (node.x() / size.width) * 100;
                          const rawY = (node.y() / size.height) * 100;
                          const snapped = snapPoint(rawX, rawY);
                          node.x((snapped.x / 100) * size.width);
                          node.y((snapped.y / 100) * size.height);
                          onMoveVertex(selectedKoma.id, idx, snapped);
                        }}
                      />
                      <KonvaText
                        x={Math.min(size.width - 28, px + 9)}
                        y={Math.max(6, py - 14)}
                        text={`V${idx + 1}`}
                        fontSize={10}
                        fontStyle="bold"
                        fill="#4F46E5"
                        listening={false}
                      />
                    </Group>
                  );
                })}
            </Layer>
          )}
        </Stage>
      )}
    </div>
  );
};

export default KonvaKomaCanvas;
