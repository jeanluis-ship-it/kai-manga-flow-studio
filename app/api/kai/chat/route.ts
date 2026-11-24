import { NextRequest, NextResponse } from 'next/server';
import {
  KAI_TEXT_MODEL_DEFAULT,
  KaiChatRequestSchema,
  extractVisualPrompt,
} from '@/lib/kai/studioCanvas';

export const runtime = 'nodejs';
export const maxDuration = 45;

const BASE_SYSTEM_INSTRUCTION = `Eres Kai, director de arte de manga/manhwa y guionista editorial senior integrado directamente en el proyecto activo de MANGAI Studio.
Tu misión es asistir al creador paso a paso en español (Configuración de Obra -> Settei y Personajes -> Portada Tankōbon -> Páginas e Interiores -> Tabla de Dibujo Digital), respetando su autoría y el canon aprobado.

ÁREAS DE MENTORÍA Y DIRECCIÓN CONECTADAS AL PROYECTO:
- Configuración y Lomo: títulos con fuerza comercial, sinopsis de contraportada, formato editorial y tono.
- Settei y Personajes: fichas canónicas (@handles), siluetas, vestuario y anclas visuales inmutables.
- Portada Tankōbon: composición envolvente 16:9 (contraportada, lomo y portada frontal).
- Páginas e Interiores: ritmo Koma-wari, ángulos de cámara, diálogos breves e impacto de viñetas.
- Tabla de Dibujo Digital: cómo pulir, entintar (G-Pen / Maru-Pen) y mejorar los bocetos Nemu dibujados con lápiz digital.

REGLA DE PROMPT VISUAL:
- SIEMPRE que propongas o refines un personaje, portada, viñeta o mejora de boceto de la Tabla de Dibujo, incluye al final en su propia línea:
[PROMPT VISUAL]:
- Debajo de [PROMPT VISUAL]: escribe ÚNICAMENTE un prompt detallado EN INGLÉS optimizado para gemini-3.1-flash-image-preview (sujeto, pose, expresión, vestuario/anclas visuales, ángulo de cámara, iluminación, acabado de tinta/color, sin globos de texto).`;

function buildSystemInstruction(activeSettei?: string[], projectContext?: string): string {
  const blocks = [BASE_SYSTEM_INSTRUCTION];
  if (projectContext) {
    blocks.push(`ESTADO ACTUAL DEL PROYECTO EN ESTUDIO:\n${projectContext}`);
  }
  if (activeSettei && activeSettei.length > 0) {
    blocks.push(
      `CANON ACTIVO DEL PROYECTO (SETTEI — mantener continuidad estricta):\n${activeSettei.map((item) => `- ${item}`).join('\n')}`,
    );
  }
  return blocks.join('\n\n');
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

  const { userMessage, chatHistory, activeSettei, projectContext } = parsed.data;
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
          parts: [{ text: buildSystemInstruction(activeSettei, projectContext) }],
        },
        contents: [
          ...chatHistory,
          { role: 'user', parts: [{ text: userMessage }] },
        ],
        generationConfig: {
          temperature: 0.75,
        },
      }),
      signal: AbortSignal.timeout(35_000),
    });

    if (!upstreamRes.ok) {
      if (upstreamRes.status === 429) {
        return NextResponse.json(
          {
            error:
              'Se alcanzó el límite temporal de solicitudes de Gemini 3 Flash. Intenta de nuevo en unos segundos.',
          },
          { status: 429 },
        );
      }

      return NextResponse.json(
        {
          error:
            'No se pudo obtener respuesta de Kai desde Gemini 3 Flash. Verifica la cuota de la API.',
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
        { error: 'Gemini 3 Flash devolvió una respuesta vacía para Kai.' },
        { status: 502 },
      );
    }

    const visualPrompt = extractVisualPrompt(reply);
    return NextResponse.json({ reply, visualPrompt, model });
  } catch (err) {
    const isTimeout =
      err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return NextResponse.json(
      {
        error: isTimeout
          ? 'La consulta a Kai superó el tiempo límite. Intenta con una instrucción más breve.'
          : 'Error de conexión al comunicarse con Gemini 3 Flash.',
      },
      { status: 502 },
    );
  }
}
