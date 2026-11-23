import { NextRequest, NextResponse } from 'next/server';
import {
  KAI_TEXT_MODEL_DEFAULT,
  KaiChatRequestSchema,
  extractVisualPrompt,
} from '@/lib/kai/studioCanvas';

export const runtime = 'nodejs';
export const maxDuration = 45;

const BASE_SYSTEM_INSTRUCTION = `Eres Kai, director de arte de manga/manhwa y guionista editorial senior en Mangai Studio.
Tu misión es asistir al creador en español, respetando siempre su autoría y el canon aprobado del proyecto.

ÁREAS DE MENTORÍA Y DIRECCIÓN:
- Guiones y estructura dramática por página o capítulo (ganchos, ritmo de lectura y giros).
- Fichas de personaje (settei), vestuario, siluetas, rasgos distintivos y coherencia visual.
- Ritmo de viñetas (koma-wari), ángulos de cámara (contrapicado, picado, plano detalle, plano general), iluminación y atmósfera.
- Prompts visuales listos para producción en el lienzo generador.

REGLA DE PROMPT VISUAL:
- SIEMPRE que el usuario te pida una idea visual, escena, viñeta, personaje, portada o ilustración (o cuando propongas una toma concreta), incluye al final un bloque claramente marcado que comience en su propia línea con:
[PROMPT VISUAL]:
- Dentro de ese bloque escribe un prompt ultra-detallado EN INGLÉS optimizado para generación de imagen: sujeto, pose, expresión facial, ropa/accesorios, entorno, encuadre/lente/ángulo de cámara, iluminación, contraste, atmósfera y sin globos de diálogo salvo indicación explícita.
- No encierres la explicación en español dentro de [PROMPT VISUAL]:; deja la dirección creativa en español arriba y únicamente el prompt en inglés debajo de [PROMPT VISUAL]:.`;

function buildSystemInstruction(activeSettei?: string[]): string {
  if (!activeSettei || activeSettei.length === 0) {
    return BASE_SYSTEM_INSTRUCTION;
  }

  const canonBlock = activeSettei.map((item) => `- ${item}`).join('\n');
  return `${BASE_SYSTEM_INSTRUCTION}

CANON ACTIVO DEL PROYECTO (SETTEI — mantener continuidad estricta):
${canonBlock}`;
}

export async function POST(req: NextRequest) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 });
  }

  const parsed = KaiChatRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Solicitud inválida para el asistente Kai.',
        issues: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Falta GEMINI_API_KEY en las variables de entorno del servidor (.env.local / Vercel).',
      },
      { status: 503 },
    );
  }

  const { userMessage, chatHistory, activeSettei } = parsed.data;
  const model = (process.env.GEMINI_KAI_MODEL || KAI_TEXT_MODEL_DEFAULT).trim();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  try {
    const upstreamRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemInstruction(activeSettei) }],
        },
        contents: [
          ...chatHistory,
          { role: 'user', parts: [{ text: userMessage }] },
        ],
        generationConfig: {
          temperature: 0.8,
        },
      }),
      signal: AbortSignal.timeout(35_000),
    });

    if (!upstreamRes.ok) {
      console.error('Gemini Kai chat upstream error', {
        status: upstreamRes.status,
        model,
      });

      if (upstreamRes.status === 429) {
        return NextResponse.json(
          {
            error:
              'Se alcanzó el límite temporal de solicitudes de Gemini. Intenta de nuevo en unos segundos.',
          },
          { status: 429 },
        );
      }

      return NextResponse.json(
        {
          error:
            'No se pudo obtener respuesta de Kai desde Gemini. Verifica el modelo o la cuota de la API.',
        },
        { status: 502 },
      );
    }

    const data = (await upstreamRes.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const reply = (data.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? '')
      .join('')
      .trim();

    if (!reply) {
      return NextResponse.json(
        { error: 'Gemini devolvió una respuesta vacía para Kai.' },
        { status: 502 },
      );
    }

    const visualPrompt = extractVisualPrompt(reply);
    return NextResponse.json({ reply, visualPrompt, model });
  } catch (err) {
    const isTimeout =
      err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    console.error('Gemini Kai chat request failed', {
      reason: isTimeout ? 'timeout' : 'network_or_parse_error',
      model,
    });
    return NextResponse.json(
      {
        error: isTimeout
          ? 'La consulta a Kai superó el tiempo límite. Intenta con una instrucción más breve.'
          : 'Error de conexión al comunicarse con Gemini para Kai.',
      },
      { status: 502 },
    );
  }
}
