import type { DialogueStyle, KomaDialogue } from '@/app/studio/types';

export interface BalloonGeometry {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  tailX: number;
  tailY: number;
  lines: string[];
  fontSize: number;
  lineHeight: number;
}

export function wrapBalloonText(text: string, maxCharsPerLine = 15): string[] {
  const clean = (text || '').trim();
  if (!clean) return ['...'];
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + ' ' + word).length <= maxCharsPerLine) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 6);
}

/**
 * Computes normalized SVG coordinates in a 100 x 138 reference viewBox
 * (or scaled cleanly onto any aspect ratio using 0..100 X and 0..100 Y percentages).
 * All returned coordinates are in 0..100 percentage space (with aspectFactor = height / width).
 */
export function computeBalloonGeometry(
  dialogue: KomaDialogue,
  aspectFactor = 1.4,
): BalloonGeometry {
  const cx = typeof dialogue.x === 'number' ? dialogue.x : 50;
  const cy = typeof dialogue.y === 'number' ? dialogue.y : 25;
  const fontSize = dialogue.fontSize && dialogue.fontSize > 0 ? dialogue.fontSize : 2.35;
  const lines = wrapBalloonText(dialogue.text, dialogue.style === 'narrator' ? 20 : 15);
  const longest = Math.max(5, ...lines.map((l) => l.length));

  // Width/height in 0..100 X / 0..100 Y space
  const baseRx = Math.min(24, Math.max(7.5, longest * fontSize * 0.34 + 3.2));
  const rx = dialogue.width ? Math.max(baseRx, dialogue.width / 2) : baseRx;
  const lineHeight = (fontSize * 1.32) / aspectFactor;
  const ry = Math.min(18, Math.max(4.6, (lines.length * lineHeight) / 2 + 2.6));

  const tailX = typeof dialogue.tailX === 'number' ? dialogue.tailX : cx + 6;
  const tailY = typeof dialogue.tailY === 'number' ? dialogue.tailY : cy + ry + 5;

  return { cx, cy, rx, ry, tailX, tailY, lines, fontSize, lineHeight };
}

/** Builds a spiky radial starburst polygon for `shout` balloons */
export function buildShoutPath(cx: number, cy: number, rx: number, ry: number): string {
  const spikes = 16;
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (Math.PI * 2 * i) / (spikes * 2);
    const isOuter = i % 2 === 0;
    const jitter = isOuter ? 1.2 + ((i * 7) % 3) * 0.08 : 0.86;
    const px = cx + Math.cos(angle) * rx * jitter;
    const py = cy + Math.sin(angle) * ry * jitter;
    pts.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(2)} ${py.toFixed(2)}`);
  }
  pts.push('Z');
  return pts.join(' ');
}

/** Builds a scalloped fluffy cloud path for `thought` balloons */
export function buildThoughtPath(cx: number, cy: number, rx: number, ry: number): string {
  const bumps = 10;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < bumps; i++) {
    const angle = (Math.PI * 2 * i) / bumps;
    points.push({
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
    });
  }
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < bumps; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % bumps];
    const midAngle = (Math.PI * 2 * (i + 0.5)) / bumps;
    const ctrlX = cx + Math.cos(midAngle) * rx * 1.28;
    const ctrlY = cy + Math.sin(midAngle) * ry * 1.28;
    d += ` Q ${ctrlX.toFixed(2)} ${ctrlY.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return `${d} Z`;
}

/** Builds a polygonal pointer tail from the ellipse perimeter toward (tailX, tailY) */
export function buildTailPoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tailX: number,
  tailY: number,
): string {
  const angle = Math.atan2(tailY - cy, tailX - cx);
  const spread = 0.24;
  const base1X = cx + Math.cos(angle - spread) * rx * 0.85;
  const base1Y = cy + Math.sin(angle - spread) * ry * 0.85;
  const base2X = cx + Math.cos(angle + spread) * rx * 0.85;
  const base2Y = cy + Math.sin(angle + spread) * ry * 0.85;
  return `${base1X.toFixed(2)},${base1Y.toFixed(2)} ${tailX.toFixed(2)},${tailY.toFixed(2)} ${base2X.toFixed(2)},${base2Y.toFixed(2)}`;
}

/** Builds 3 shrinking trailing circles for `thought` balloons */
export function buildThoughtBubbles(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  tailX: number,
  tailY: number,
): Array<{ x: number; y: number; r: number }> {
  const angle = Math.atan2(tailY - cy, tailX - cx);
  const startX = cx + Math.cos(angle) * rx * 0.96;
  const startY = cy + Math.sin(angle) * ry * 0.96;
  return [
    {
      x: startX + (tailX - startX) * 0.25,
      y: startY + (tailY - startY) * 0.25,
      r: 1.55,
    },
    {
      x: startX + (tailX - startX) * 0.62,
      y: startY + (tailY - startY) * 0.62,
      r: 1.1,
    },
    {
      x: tailX,
      y: tailY,
      r: 0.72,
    },
  ];
}

export function styleHasTail(style: DialogueStyle): boolean {
  return style === 'normal' || style === 'thought' || style === 'shout';
}
