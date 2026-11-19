import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import {
  KaiDualOutputSchema,
  KaiScriptRequestSchema,
  type KaiDualOutput,
  type KaiScriptRequest,
  type KomaLayoutId,
} from '@/lib/kai/schema';
import { checkQuota } from '@/lib/plans/quotas';
import { getServerQuotaContext } from '@/lib/plans/serverAuth';

export const runtime = 'nodejs';
export const maxDuration = 45;

const SYSTEM_PROMPT = `Eres KAI Sensei, director editorial de manga japonés y guionista senior en MANGAI Studio.
Tu tarea es responder al autor en español con mentoría editorial clara y al mismo tiempo estructurar las páginas de manga en JSON estricto (Dual JSON Output).

REGLAS OBLIGATORIAS:
1. Devuelve ÚNICAMENTE un objeto JSON válido que cumpla exactamente este esquema:
{
  "reply": "Respuesta directa de mentoría editorial en español explicando ritmo, encuadres y gancho narrativo.",
  "script_pages": [
    {
      "page_number": 1,
      "suggested_layout": "3_panel_dramatic" | "4_panel_classic" | "5_panel_action" | "splash_spread",
      "chapter_beat": "Resumen breve del golpe dramático de la página",
      "komas": [
        {
          "panel_index": 1,
          "camera_angle": "Plano General / Establishing" | "Plano Medio" | "Primer Plano Rostro" | "Primer Plano Ojos" | "Contrapicado Dramático" | "Picado / Cenital" | "Detalle de Acción",
          "tagged_handles": ["@Personaje"],
          "action_prompt": "Descripción visual detallada para el motor de tinta manga B/N sin globos de texto dentro del arte",
          "dialogues": [
            { "speaker": "Nombre", "style": "normal" | "shout" | "whisper" | "thought" | "narrator" | "system", "text": "Diálogo breve en español" }
          ],
          "sfx": "ZAAA..."
        }
      ]
    }
  ]
}
2. Usa los tag_handle EXACTOS del Settei activo cuando aparezcan esos personajes/objetos/escenarios.
3. Ajusta el número de viñetas al layout sugerido (3_panel_dramatic=3, 4_panel_classic=4, 5_panel_action=5, splash_spread=1).
4. Mantén diálogos concisos (máximo 18 palabras por globo) para lectura fluida en Tankōbon.`;

function buildUserMessage(req: KaiScriptRequest): string {
  const setteiLines =
    req.activeSettei.length > 0
      ? req.activeSettei
          .map(
            (s) =>
              `- ${s.tag_handle} (${s.name}${s.entity_type ? `, ${s.entity_type}` : ''}): anclas visuales [${s.visual_anchors.join(', ') || 'sin anclas'}]`,
          )
          .join('\n')
      : '- (Sin entidades en Settei aún; usa un protagonista coherente con la escena)';

  return [
    `IDEA DEL AUTOR: ${req.userPrompt}`,
    `PÁGINAS A ESTRUCTURAR: ${req.targetPages}`,
    `DIRECCIÓN DE LECTURA: ${req.readingDirection === 'rtl' ? 'Derecha a Izquierda (Manga RTL)' : 'Izquierda a Derecha (LTR)'}`,
    `SETTEI ACTIVO:\n${setteiLines}`,
    'Devuelve únicamente el JSON estricto sin bloques markdown.',
  ].join('\n\n');
}

function extractJsonObject(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('JSON inválido');
  }
}

async function tryGeminiScript(req: KaiScriptRequest): Promise<KaiDualOutput | null> {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return null;

  let candidateModels = ['gemini-3.8-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];
  try {
    const listResp = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(4_500),
    });
    if (listResp.ok) {
      const listData = (await listResp.json()) as {
        models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
      };
      const liveText = (listData.models ?? [])
        .filter((m) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
        .map((m) => (m.name ?? '').replace(/^models\//, ''))
        .filter(
          (n) =>
            (n.includes('flash') || n.includes('pro')) &&
            !n.includes('image') &&
            !n.includes('tts') &&
            !n.includes('audio') &&
            !n.includes('embedding'),
        );
      if (liveText.length > 0) {
        candidateModels = Array.from(new Set([...liveText.slice(0, 2), ...candidateModels])).slice(0, 3);
      }
    }
  } catch {
    // Use defaults.
  }

  for (const model of candidateModels) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: buildUserMessage(req) }] }],
            generationConfig: {
              temperature: 0.65,
              responseMimeType: 'application/json',
            },
          }),
          signal: AbortSignal.timeout(14_000),
        },
      );
      if (!resp.ok) continue;
      const data = (await resp.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      if (!text) continue;
      const parsed = KaiDualOutputSchema.safeParse(extractJsonObject(text));
      if (parsed.success) return parsed.data;
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

async function tryOpenAiScript(req: KaiScriptRequest): Promise<KaiDualOutput | null> {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) return null;

  try {
    const client = new OpenAI({ apiKey, timeout: 18_000, maxRetries: 0 });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
      temperature: 0.65,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserMessage(req) },
      ],
    });
    const text = completion.choices[0]?.message?.content ?? '';
    if (!text) return null;
    const parsed = KaiDualOutputSchema.safeParse(extractJsonObject(text));
    if (parsed.success) return parsed.data;
  } catch {
    // Fall back cleanly.
  }

  return null;
}

function buildFallbackDualOutput(req: KaiScriptRequest): KaiDualOutput {
  const primary = req.activeSettei[0];
  const secondary = req.activeSettei[1];
  const primaryHandle = primary?.tag_handle || '@Protagonista';
  const primaryName = primary?.name || 'Protagonista';
  const primaryAnchors =
    primary?.visual_anchors && primary.visual_anchors.length > 0
      ? ` Conservar anclas visuales: ${primary.visual_anchors.join(', ')}.`
      : '';
  const secondaryHandle = secondary?.tag_handle;
  const secondaryName = secondary?.name;

  const isActionScene = /batalla|combate|lucha|ataque|espada|corre|persecuci|explosi|guerra/i.test(
    req.userPrompt,
  );
  const isSplash = /splash|impacto|revelaci|doble|climax|clímax/i.test(req.userPrompt);

  const pages: KaiDualOutput['script_pages'] = [];
  for (let p = 1; p <= req.targetPages; p++) {
    const layout: KomaLayoutId =
      isSplash && p === req.targetPages
        ? 'splash_spread'
        : isActionScene
        ? '5_panel_action'
        : p % 2 === 1
        ? '4_panel_classic'
        : '3_panel_dramatic';

    if (layout === 'splash_spread') {
      pages.push({
        page_number: p,
        suggested_layout: 'splash_spread',
        chapter_beat: `Página ${p}: Impacto visual central — ${req.userPrompt.slice(0, 90)}`,
        komas: [
          {
            panel_index: 1,
            camera_angle: 'Contrapicado Dramático',
            tagged_handles: secondaryHandle ? [primaryHandle, secondaryHandle] : [primaryHandle],
            action_prompt: `Página splash de alto impacto en tinta manga B/N y tramas 60L: ${req.userPrompt}. ${primaryName} domina el centro con iluminación dramática.${primaryAnchors}`,
            dialogues: [
              {
                speaker: primaryName,
                style: 'shout',
                text: '¡Este es el momento que lo cambia todo!',
              },
            ],
            sfx: 'DOOOON!!',
          },
        ],
      });
    } else if (layout === '5_panel_action') {
      pages.push({
        page_number: p,
        suggested_layout: '5_panel_action',
        chapter_beat: `Página ${p}: Secuencia de acción diagonal — ${req.userPrompt.slice(0, 80)}`,
        komas: [
          {
            panel_index: 1,
            camera_angle: 'Plano General / Establishing',
            tagged_handles: [primaryHandle],
            action_prompt: `Panorámica atmosférica inicial presentando el entorno de la escena: ${req.userPrompt}. Sombras profundas con plumilla G-Pen.${primaryAnchors}`,
            dialogues: [
              {
                speaker: 'Narrador',
                style: 'narrator',
                text: 'El silencio duró apenas un latido antes del choque.',
              },
            ],
            sfx: 'ZAAA...',
          },
          {
            panel_index: 2,
            camera_angle: 'Plano Medio',
            tagged_handles: [primaryHandle],
            action_prompt: `${primaryName} adopta postura tensa en diagonal derecha, líneas de velocidad sutiles y contraste alto en tinta negra.${primaryAnchors}`,
            dialogues: [
              {
                speaker: primaryName,
                style: 'normal',
                text: 'No podemos retroceder ahora.',
              },
            ],
          },
          {
            panel_index: 3,
            camera_angle: 'Primer Plano Ojos',
            tagged_handles: secondaryHandle ? [secondaryHandle] : [primaryHandle],
            action_prompt: `Corte diagonal izquierdo con primer plano intenso a la mirada de ${secondaryName || primaryName}, brillo blanco en las pupilas y trama dramática.`,
            dialogues: [
              {
                speaker: secondaryName || primaryName,
                style: 'whisper',
                text: 'Ahí vienen...',
              },
            ],
            sfx: 'KSHH!',
          },
          {
            panel_index: 4,
            camera_angle: 'Detalle de Acción',
            tagged_handles: [primaryHandle],
            action_prompt: `Franja estrecha horizontal enfocada en el movimiento rápido de manos/pasos arrancando la acción descrita en: ${req.userPrompt}.${primaryAnchors}`,
            dialogues: [],
            sfx: 'SHUUU!',
          },
          {
            panel_index: 5,
            camera_angle: 'Contrapicado Dramático',
            tagged_handles: secondaryHandle ? [primaryHandle, secondaryHandle] : [primaryHandle],
            action_prompt: `Gran viñeta de remate inferior con composición épica culminando: ${req.userPrompt}. Líneas cinéticas y alto contraste sumi ink.${primaryAnchors}`,
            dialogues: [
              {
                speaker: primaryName,
                style: 'shout',
                text: '¡Avancen conmigo!',
              },
            ],
            sfx: 'GAAAH!',
          },
        ],
      });
    } else if (layout === '3_panel_dramatic') {
      pages.push({
        page_number: p,
        suggested_layout: '3_panel_dramatic',
        chapter_beat: `Página ${p}: Tensión dramática en 3 actos — ${req.userPrompt.slice(0, 80)}`,
        komas: [
          {
            panel_index: 1,
            camera_angle: 'Plano General / Establishing',
            tagged_handles: [primaryHandle],
            action_prompt: `Encuadre horizontal amplio estableciendo el lugar y el peso emocional de la escena: ${req.userPrompt}.${primaryAnchors}`,
            dialogues: [
              {
                speaker: 'Narrador',
                style: 'narrator',
                text: 'Cada sombra parecía guardar una memoria antigua.',
              },
            ],
          },
          {
            panel_index: 2,
            camera_angle: 'Primer Plano Rostro',
            tagged_handles: [primaryHandle],
            action_prompt: `Plano horizontal intermedio sobre el rostro de ${primaryName} reaccionando a lo que sucede. Tinta limpia y trama suave 60L.${primaryAnchors}`,
            dialogues: [
              {
                speaker: primaryName,
                style: 'thought',
                text: 'Si doy este paso, nada volverá a ser igual.',
              },
            ],
            sfx: 'DOKI...',
          },
          {
            panel_index: 3,
            camera_angle: 'Contrapicado Dramático',
            tagged_handles: secondaryHandle ? [primaryHandle, secondaryHandle] : [primaryHandle],
            action_prompt: `Viñeta inferior dominante con giro visual decisivo de la escena: ${req.userPrompt}.${primaryAnchors}`,
            dialogues: [
              {
                speaker: primaryName,
                style: 'normal',
                text: 'Entonces enfrentémoslo de frente.',
              },
            ],
          },
        ],
      });
    } else {
      pages.push({
        page_number: p,
        suggested_layout: '4_panel_classic',
        chapter_beat: `Página ${p}: Estructura Kishōtenketsu — ${req.userPrompt.slice(0, 80)}`,
        komas: [
          {
            panel_index: 1,
            camera_angle: 'Plano General / Establishing',
            tagged_handles: [primaryHandle],
            action_prompt: `Viñeta panorámica superior (Ki): establece atmósfera, arquitectura y clima para "${req.userPrompt}". Tinta japonesa B/N detallada.${primaryAnchors}`,
            dialogues: [
              {
                speaker: 'Narrador',
                style: 'narrator',
                text: 'Aquella escena marcó el punto de quiebre del capítulo.',
              },
            ],
            sfx: 'ZAWAA...',
          },
          {
            panel_index: 2,
            camera_angle: 'Plano Medio',
            tagged_handles: [primaryHandle],
            action_prompt: `Viñeta media derecha (Shō): ${primaryName} entra en cuadro ejecutando el gesto central de "${req.userPrompt}".${primaryAnchors}`,
            dialogues: [
              {
                speaker: primaryName,
                style: 'normal',
                text: '¿Escuchaste eso?',
              },
            ],
          },
          {
            panel_index: 3,
            camera_angle: 'Primer Plano Rostro',
            tagged_handles: secondaryHandle ? [secondaryHandle] : [primaryHandle],
            action_prompt: `Viñeta media izquierda (Ten): primer plano expresivo de ${secondaryName || primaryName} descubriendo el giro de tensión. Sombras marcadas en tinta.`,
            dialogues: [
              {
                speaker: secondaryName || primaryName,
                style: 'whisper',
                text: 'No estamos solos aquí...',
              },
            ],
            sfx: 'GIKU!',
          },
          {
            panel_index: 4,
            camera_angle: 'Contrapicado Dramático',
            tagged_handles: secondaryHandle ? [primaryHandle, secondaryHandle] : [primaryHandle],
            action_prompt: `Viñeta grande inferior (Ketsu): plano de impacto revelando el horizonte o desenlace inmediato de "${req.userPrompt}".${primaryAnchors}`,
            dialogues: [
              {
                speaker: primaryName,
                style: 'shout',
                text: '¡Tenemos que actuar ya!',
              },
            ],
            sfx: 'DOOON!',
          },
        ],
      });
    }
  }

  return KaiDualOutputSchema.parse({
    reply: `Estructuré tu idea en ${req.targetPages} ${req.targetPages === 1 ? 'página' : 'páginas'} con ritmo de lectura ${req.readingDirection === 'rtl' ? 'manga japonés (derecha a izquierda)' : 'occidental (izquierda a derecha)'}, integrando ${primaryHandle}${secondaryHandle ? ` y ${secondaryHandle}` : ''}. Pulsa «Aplicar al Manuscrito» para cargar las viñetas en estado NEMU y entintar cada panel de forma independiente.`,
    script_pages: pages,
  });
}

export async function POST(req: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 });
  }

  const parsedReq = KaiScriptRequestSchema.safeParse(rawBody);
  if (!parsedReq.success) {
    return NextResponse.json(
      {
        error: 'Solicitud inválida para KAI Sensei.',
        issues: parsedReq.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
  }

  const input = parsedReq.data;

  // Server-side quota validation when user is authenticated in Supabase
  const serverQuota = await getServerQuotaContext();
  if (serverQuota) {
    const pageCheck = checkQuota(
      serverQuota.profile,
      serverQuota.usage,
      'ADD_PAGE',
      input.targetPages,
    );
    if (!pageCheck.allowed) {
      return NextResponse.json(
        {
          code: 'QUOTA_EXCEEDED',
          requiredPlan: pageCheck.requiredPlan || 'starter',
          error: pageCheck.reason || 'Cuota de páginas excedida para tu plan actual.',
        },
        { status: 402 },
      );
    }
  }

  // Try live LLM first when server credentials exist
  const geminiResult = await tryGeminiScript(input);
  if (geminiResult) {
    return NextResponse.json(geminiResult, {
      headers: { 'X-KAI-Mode': 'gemini' },
    });
  }

  const openaiResult = await tryOpenAiScript(input);
  if (openaiResult) {
    return NextResponse.json(openaiResult, {
      headers: { 'X-KAI-Mode': 'openai' },
    });
  }

  // Deterministic editorial fallback validated with Zod
  const fallback = buildFallbackDualOutput(input);
  return NextResponse.json(fallback, {
    headers: { 'X-KAI-Mode': 'fallback' },
  });
}
