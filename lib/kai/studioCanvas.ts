import { z } from 'zod';

export const KAI_TEXT_MODEL_DEFAULT = 'gemini-3-flash-preview';
export const KAI_IMAGE_MODEL_DEFAULT = 'gemini-3.1-flash-image';

export type KaiCanvasStyleId = 'manga_ink' | 'webtoon_color' | 'cover_art' | 'chibi_kai';
export type KaiCanvasAspectRatio = '3:4' | '9:16' | '16:9' | '1:1';

export interface KaiChatHistoryTurn {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export interface KaiCanvasStyleOption {
  id: KaiCanvasStyleId;
  label: string;
  shortLabel: string;
  description: string;
  modifier: string;
}

export interface KaiAspectRatioOption {
  id: KaiCanvasAspectRatio;
  label: string;
  usage: string;
  cssRatio: string;
}

export const KAI_STYLE_MODIFIERS: Record<KaiCanvasStyleId, string> = {
  manga_ink:
    'authentic Japanese manga style, crisp black and white ink lineart, screentones, dramatic shading, high contrast, dynamic action framing',
  webtoon_color:
    'modern dark fantasy manhwa webtoon style, vibrant cel-shaded digital coloring, dramatic rim lighting, Solo Leveling aesthetic, detailed background',
  cover_art:
    'epic manga volume cover illustration, intricate details, cinematic lighting, rich color palette, masterpiece composition',
  chibi_kai:
    'kawaii ninja mascot anime style, clean vector-like cel shading, expressive eyes, dynamic pose',
};

export const KAI_CANVAS_STYLES: readonly KaiCanvasStyleOption[] = [
  {
    id: 'manga_ink',
    label: 'Manga Entintado B/N',
    shortLabel: 'Manga B/N',
    description: 'Tinta sumi, tramas y alto contraste japonés',
    modifier: KAI_STYLE_MODIFIERS.manga_ink,
  },
  {
    id: 'webtoon_color',
    label: 'Manhwa Dark Fantasy Color',
    shortLabel: 'Manhwa Color',
    description: 'Color cel-shaded vibrante y rim lighting dramático',
    modifier: KAI_STYLE_MODIFIERS.webtoon_color,
  },
  {
    id: 'cover_art',
    label: 'Portada de Volumen',
    shortLabel: 'Portada',
    description: 'Ilustración cinematográfica de tapa Tankōbon',
    modifier: KAI_STYLE_MODIFIERS.cover_art,
  },
  {
    id: 'chibi_kai',
    label: 'Mascota Kai',
    shortLabel: 'Mascota Kai',
    description: 'Estilo kawaii ninja con línea limpia y ojos expresivos',
    modifier: KAI_STYLE_MODIFIERS.chibi_kai,
  },
] as const;

export const KAI_ASPECT_RATIOS: readonly KaiAspectRatioOption[] = [
  {
    id: '3:4',
    label: '3:4',
    usage: 'Página KDP',
    cssRatio: '3 / 4',
  },
  {
    id: '9:16',
    label: '9:16',
    usage: 'Webtoon',
    cssRatio: '9 / 16',
  },
  {
    id: '16:9',
    label: '16:9',
    usage: 'Panel Doble',
    cssRatio: '16 / 9',
  },
  {
    id: '1:1',
    label: '1:1',
    usage: 'Avatar',
    cssRatio: '1 / 1',
  },
] as const;

export const KaiChatHistoryTurnSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(16000),
      }),
    )
    .min(1)
    .max(10),
});

export const KaiChatRequestSchema = z.object({
  userMessage: z
    .string()
    .trim()
    .min(1, 'Escribe una idea o instrucción para Kai.')
    .max(4000, 'El mensaje no puede superar 4000 caracteres.'),
  chatHistory: z.array(KaiChatHistoryTurnSchema).max(30).default([]),
  activeSettei: z.array(z.string().trim().min(1).max(1000)).max(20).optional(),
  projectContext: z.string().trim().max(2400).optional(),
});

export const KaiCanvasGenerateRequestSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(2, 'Describe la escena o viñeta antes de generar.')
    .max(3000, 'El prompt del lienzo no puede superar 3000 caracteres.'),
  style: z.enum(['manga_ink', 'webtoon_color', 'cover_art', 'chibi_kai']).default('manga_ink'),
  aspectRatio: z.enum(['3:4', '9:16', '16:9', '1:1']).default('3:4'),
  sketchDataUrl: z.string().max(8_000_000).optional(),
});

export type KaiChatRequest = z.infer<typeof KaiChatRequestSchema>;
export type KaiCanvasGenerateRequest = z.infer<typeof KaiCanvasGenerateRequestSchema>;

export class KaiServiceError extends Error {
  status?: number;
  code?: string;
  requiredPlan?: string;

  constructor(
    message: string,
    options?: { status?: number; code?: string; requiredPlan?: string },
  ) {
    super(message);
    this.name = 'KaiServiceError';
    this.status = options?.status;
    this.code = options?.code;
    this.requiredPlan = options?.requiredPlan;
    Object.setPrototypeOf(this, KaiServiceError.prototype);
  }
}

const VISUAL_PROMPT_HEADER_RE =
  /(?:^|\n)\s*(?:#{1,4}\s*)?(?:\*{1,2}|_{1,2})?\[PROMPT\s+VISUAL\](?:\*{1,2}|_{1,2})?\s*:?\s*(?:\*{1,2}|_{1,2})?\s*([\s\S]+)/i;
const SUBSEQUENT_SECTION_RE =
  /\n\s*(?:#{1,4}\s|(?:\*{1,2}|_{1,2})?\[[^\]\n]{2,40}\](?:\*{1,2}|_{1,2})?\s*:)/;

function stripOuterQuotes(value: string): string {
  let current = value.trim();
  while (
    (current.startsWith('"') && current.endsWith('"')) ||
    (current.startsWith("'") && current.endsWith("'")) ||
    (current.startsWith('“') && current.endsWith('”')) ||
    (current.startsWith('«') && current.endsWith('»'))
  ) {
    current = current.slice(1, -1).trim();
  }
  return current;
}

export function extractVisualPrompt(text: string): string | null {
  if (!text) return null;
  const normalized = text.replace(/\r\n/g, '\n');
  const match = normalized.match(VISUAL_PROMPT_HEADER_RE);
  if (!match?.[1]) return null;

  let block = match[1].trimStart();

  if (block.startsWith('```')) {
    const fenced = block.match(/^```(?:[a-zA-Z0-9_+-]*\n)?([\s\S]*?)\n?```/);
    if (fenced) {
      const inner = stripOuterQuotes(fenced[1]);
      return inner.length > 0 ? inner : null;
    }
    block = block.replace(/^```(?:[a-zA-Z0-9_+-]*\n)?/, '');
  }

  const nextSection = block.match(SUBSEQUENT_SECTION_RE);
  if (nextSection?.index !== undefined) {
    block = block.slice(0, nextSection.index);
  }

  block = block.replace(/\n?```$/, '');
  const cleaned = stripOuterQuotes(block);
  return cleaned.length > 0 ? cleaned : null;
}

export function buildFullCanvasPrompt(
  prompt: string,
  style: KaiCanvasStyleId,
  aspectRatio: KaiCanvasAspectRatio,
): string {
  const modifier = KAI_STYLE_MODIFIERS[style] || KAI_STYLE_MODIFIERS.manga_ink;
  return `${prompt.trim()}, ${modifier}, aspect ratio ${aspectRatio}, ultra detailed, no text bubbles unless requested`;
}

async function postJson<TResponse>(
  url: string,
  payload: unknown,
  fallbackError: string,
): Promise<TResponse> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new KaiServiceError(fallbackError);
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const message =
      typeof data.error === 'string' && data.error.trim().length > 0
        ? data.error
        : fallbackError;
    throw new KaiServiceError(message, {
      status: res.status,
      code: typeof data.code === 'string' ? data.code : undefined,
      requiredPlan: typeof data.requiredPlan === 'string' ? data.requiredPlan : undefined,
    });
  }

  return data as TResponse;
}

export async function askKaiAssistant(
  userMessage: string,
  chatHistory: KaiChatHistoryTurn[] = [],
  options?: { activeSettei?: string[]; projectContext?: string },
): Promise<{ reply: string; visualPrompt: string | null; model: string }> {
  const cleanSettei = options?.activeSettei?.map((s) => s.trim().slice(0, 1000)).filter(Boolean).slice(0, 20);
  const cleanHistory = chatHistory.slice(-30).map((turn) => ({
    role: turn.role,
    parts: turn.parts.slice(0, 10).map((part) => ({ text: part.text.trim().slice(0, 16000) })).filter((part) => part.text),
  })).filter((turn) => turn.parts.length > 0);
  const cleanProjectContext = options?.projectContext?.trim().slice(0, 2400);

  return postJson<{ reply: string; visualPrompt: string | null; model: string }>(
    '/api/kai/chat',
    {
      userMessage,
      chatHistory: cleanHistory,
      ...(cleanSettei && cleanSettei.length > 0 ? { activeSettei: cleanSettei } : {}),
      ...(cleanProjectContext ? { projectContext: cleanProjectContext } : {}),
    },
    'No se pudo conectar con el asistente Kai.',
  );
}

export async function generateMangaPanel(params: {
  prompt: string;
  style?: KaiCanvasStyleId;
  aspectRatio?: KaiCanvasAspectRatio;
  sketchDataUrl?: string;
}): Promise<{ image: string; mimeType: string; model: string; promptUsed: string }> {
  return postJson<{ image: string; mimeType: string; model: string; promptUsed: string }>(
    '/api/kai/canvas',
    {
      prompt: params.prompt,
      style: params.style ?? 'manga_ink',
      aspectRatio: params.aspectRatio ?? '3:4',
      ...(params.sketchDataUrl ? { sketchDataUrl: params.sketchDataUrl } : {}),
    },
    'No se pudo generar la ilustración en el lienzo.',
  );
}
