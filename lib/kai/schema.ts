import { z } from 'zod';

export const KomaLayoutEnum = z.enum([
  '3_panel_dramatic',
  '4_panel_classic',
  '5_panel_action',
  'splash_spread',
]);

export type KomaLayoutId = z.infer<typeof KomaLayoutEnum>;

export const DialogueStyleEnum = z.enum([
  'normal',
  'shout',
  'whisper',
  'thought',
  'narrator',
  'system',
]);

export const KaiDualOutputSchema = z.object({
  reply: z.string().min(1),
  script_pages: z
    .array(
      z.object({
        page_number: z.number().int().min(1),
        suggested_layout: KomaLayoutEnum,
        chapter_beat: z.string().min(1),
        komas: z
          .array(
            z.object({
              panel_index: z.number().int().min(1),
              camera_angle: z.string().min(1),
              tagged_handles: z.array(z.string()),
              action_prompt: z.string().min(1),
              dialogues: z.array(
                z.object({
                  speaker: z.string().min(1),
                  style: DialogueStyleEnum,
                  text: z.string().min(1),
                }),
              ),
              sfx: z.string().optional(),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

export type KaiDualOutput = z.infer<typeof KaiDualOutputSchema>;

export const ActiveSetteiItemSchema = z.object({
  tag_handle: z.string().min(1).max(60),
  name: z.string().min(1).max(120),
  entity_type: z.enum(['character', 'prop', 'location', 'lore_rule']).optional(),
  visual_anchors: z.array(z.string().max(120)).default([]),
});

export const KaiScriptRequestSchema = z.object({
  userPrompt: z.string().trim().min(2, 'Describe brevemente la escena o capítulo.').max(3000),
  activeSettei: z.array(ActiveSetteiItemSchema).max(30).default([]),
  targetPages: z.number().int().min(1).max(4).default(1),
  readingDirection: z.enum(['rtl', 'ltr']).default('rtl'),
});

export type KaiScriptRequest = z.infer<typeof KaiScriptRequestSchema>;

export interface PolygonPoint {
  x: number;
  y: number;
}

export interface KomaLayoutPreset {
  id: KomaLayoutId;
  label: string;
  shortLabel: string;
  description: string;
  panels: PolygonPoint[][];
}

/**
 * 4 presets geométricos Koma-wari en coordenadas porcentuales (0..100)
 * sobre hoja Genkō Yōshi 3:4.
 */
export const KOMA_LAYOUT_PRESETS: Record<KomaLayoutId, KomaLayoutPreset> = {
  '3_panel_dramatic': {
    id: '3_panel_dramatic',
    label: '3 Viñetas Dramáticas',
    shortLabel: '3 Dramáticas',
    description: 'Plano panorámico superior, tensión central horizontal y remate de impacto.',
    panels: [
      [
        { x: 4, y: 4 },
        { x: 96, y: 4 },
        { x: 96, y: 31 },
        { x: 4, y: 31 },
      ],
      [
        { x: 4, y: 34 },
        { x: 96, y: 34 },
        { x: 96, y: 61 },
        { x: 4, y: 61 },
      ],
      [
        { x: 4, y: 64 },
        { x: 96, y: 64 },
        { x: 96, y: 96 },
        { x: 4, y: 96 },
      ],
    ],
  },
  '4_panel_classic': {
    id: '4_panel_classic',
    label: '4 Viñetas Clásico',
    shortLabel: '4 Clásico',
    description: 'Ritmo Kishōtenketsu: apertura panorámica, 2 viñetas medias RTL y cierre grande.',
    panels: [
      [
        { x: 4, y: 4 },
        { x: 96, y: 4 },
        { x: 96, y: 29 },
        { x: 4, y: 29 },
      ],
      [
        { x: 52, y: 32 },
        { x: 96, y: 32 },
        { x: 96, y: 62 },
        { x: 52, y: 62 },
      ],
      [
        { x: 4, y: 32 },
        { x: 48, y: 32 },
        { x: 48, y: 62 },
        { x: 4, y: 62 },
      ],
      [
        { x: 4, y: 65 },
        { x: 96, y: 65 },
        { x: 96, y: 96 },
        { x: 4, y: 96 },
      ],
    ],
  },
  '5_panel_action': {
    id: '5_panel_action',
    label: '5 Viñetas Acción Diagonal',
    shortLabel: '5 Acción Diagonal',
    description: 'Corte diagonal dinámico en el núcleo de combate con 5 golpes visuales.',
    panels: [
      [
        { x: 4, y: 4 },
        { x: 96, y: 4 },
        { x: 96, y: 24 },
        { x: 4, y: 24 },
      ],
      [
        { x: 54, y: 27 },
        { x: 96, y: 27 },
        { x: 96, y: 55 },
        { x: 44, y: 55 },
      ],
      [
        { x: 4, y: 27 },
        { x: 50, y: 27 },
        { x: 40, y: 55 },
        { x: 4, y: 55 },
      ],
      [
        { x: 4, y: 58 },
        { x: 96, y: 58 },
        { x: 96, y: 71 },
        { x: 4, y: 71 },
      ],
      [
        { x: 4, y: 74 },
        { x: 96, y: 74 },
        { x: 96, y: 96 },
        { x: 4, y: 96 },
      ],
    ],
  },
  splash_spread: {
    id: 'splash_spread',
    label: 'Página Splash / Impacto',
    shortLabel: 'Splash Impacto',
    description: 'Ilustración de impacto a página completa sin divisiones para giros clave.',
    panels: [
      [
        { x: 4, y: 4 },
        { x: 96, y: 4 },
        { x: 96, y: 96 },
        { x: 4, y: 96 },
      ],
    ],
  },
};

export const KOMA_LAYOUT_LIST: KomaLayoutPreset[] = [
  KOMA_LAYOUT_PRESETS['3_panel_dramatic'],
  KOMA_LAYOUT_PRESETS['4_panel_classic'],
  KOMA_LAYOUT_PRESETS['5_panel_action'],
  KOMA_LAYOUT_PRESETS.splash_spread,
];

export function polygonToClipPath(coords: PolygonPoint[]): string {
  if (!coords || coords.length < 3) return 'inset(0%)';
  return `polygon(${coords.map((pt) => `${pt.x}% ${pt.y}%`).join(', ')})`;
}

export function polygonToSvgPoints(coords: PolygonPoint[]): string {
  return coords.map((pt) => `${pt.x},${pt.y}`).join(' ');
}

export function getPolygonBounds(coords: PolygonPoint[]) {
  if (!coords || coords.length === 0) {
    return { left: 4, top: 4, width: 92, height: 92 };
  }
  const xs = coords.map((p) => p.x);
  const ys = coords.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    left: minX,
    top: minY,
    width: Math.max(10, maxX - minX),
    height: Math.max(10, maxY - minY),
  };
}
