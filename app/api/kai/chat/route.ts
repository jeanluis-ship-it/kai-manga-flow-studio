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
- Debajo de [PROMPT VISUAL]: escribe ÚNICAMENTE un prompt detallado EN INGLÉS optimizado para gemini-3.1-flash-image (sujeto, pose, expresión, vestuario/anclas visuales, ángulo de cámara, iluminación, acabado de tinta/color, sin globos de texto).`;

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

function resolveGeminiApiKey(req: NextRequest): string {
  const headerKey = (req.headers.get('x-mangai-llave') || '').trim();
  if (/^AIza[0-9A-Za-z_-]{6,}$/i.test(headerKey)) {
    return headerKey;
  }
  return (process.env.GEMINI_API_KEY || '').trim();
}

function sanitizeHandle(raw: string): string {
  const clean = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '');
  return `@${clean || 'Protagonista'}`;
}

function extractProjectTitle(projectContext?: string): string {
  if (!projectContext) return 'tu manga en curso';
  const match = projectContext.match(/(?:Obra|Título|Proyecto)\s*:\s*([^\n|]+)/i);
  return match?.[1]?.trim() || 'tu manga en curso';
}

function buildKaiBetaFallbackReply(params: {
  userMessage: string;
  projectContext?: string;
  activeSettei?: string[];
  reason?: string;
}): string {
  const { userMessage, projectContext, activeSettei, reason } = params;
  const combined = `${userMessage}\n${projectContext || ''}`.toLowerCase();
  const title = extractProjectTitle(projectContext);
  const firstSettei = activeSettei?.[0] || '';
  const handleMatch = firstSettei.match(/@[A-Za-z0-9_]+/);
  const activeHandle = handleMatch?.[0] || '@Protagonista';
  const setteiSummary =
    activeSettei && activeSettei.length > 0
      ? `Canon detectado: ${activeSettei.slice(0, 3).join(' · ')}.`
      : 'Aún no hay fichas Settei activas en esta escena; conviene fijar al menos 2 anclas visuales por personaje.';

  const headerNote = reason
    ? `[Modo Guía Beta — sin cuota LLM en vivo (${reason})]`
    : '[Modo Guía Beta — sin cuota LLM en vivo]';

  if (/settei|ficha|personaje|objeto|prop|escenario|lore|autocompletar/.test(combined)) {
    const inferredName =
      userMessage.match(/(?:llamad[oa]|nombre|para)\s+["']?([A-ZÁÉÍÓÚÑ][a-záéíóúñA-Z0-9_-]{2,24})/)?.[1] ||
      'Kaelen';
    const handle = sanitizeHandle(inferredName);
    return `${headerNote}
Propuesta editorial para tu ficha Settei en **${title}**:

Nombre: ${inferredName}
Tag: ${handle}
Rasgos: Silueta atlética y expresiva, mirada decidida, cicatriz o marca distintiva en el rostro, cabello con mechón asimétrico fácil de reconocer en planos abiertos.
Vestuario: Abrigo o túnica funcional con pliegues marcados para tinta G-Pen, cinturón utilitario y emblema único en el pecho.
Anclas Visuales: Emblema en el pecho, Mechón frontal asimétrico, Brazalete ritual

${setteiSummary} Pulsa **Rellenar Ficha Settei Abierta** o **Fijar Consistencia** para generar su hoja de referencia.

[PROMPT VISUAL]:
Japanese manga character turnaround sheet of ${inferredName}, crisp black Sumi G-Pen ink lineart on clean white paper, front three-quarter and side profile views, distinctive asymmetrical hair, ceremonial emblem on chest, expressive determined eyes, high contrast screentones, no speech bubbles, no text`;
  }

  if (/portada|cover|wrap|lomo|contraportada|isbn/.test(combined)) {
    return `${headerNote}
Dirección de portada Tankōbon para **${title}**:
- **Portada Frontal (mitad derecha 16:9):** Ubica a ${activeHandle} en contrapicado heroico ocupando el 65% de altura, dejando el tercio superior despejado para el título.
- **Lomo (franja central):** Mantén fondo oscuro continuo y tipografía vertical de alto contraste.
- **Contraportada (mitad izquierda):** Extiende la atmósfera/paisaje con área limpia abajo a la izquierda para sinopsis y código EAN-13.
${setteiSummary}

[PROMPT VISUAL]:
Wide 16:9 Japanese manga paperback full wrap book cover illustration for "${title}", right half dramatic low-angle hero portrait with wind-swept hair and crimson accent, center continuous dark spine band, left half atmospheric misty landscape with clean bottom-left negative space for synopsis and barcode, detailed cel shading and crisp manga ink linework, no text`;
  }

  if (/tablet|dibujo|boceto|nemu|entint|g-pen|maru-pen|trazo/.test(combined)) {
    return `${headerNote}
Guía de acabado en **Tabla de Dibujo** para **${title}**:
1. Mantén los trazos principales en **G-Pen** (grosor variable para silueta y primer plano) y reserva **Maru-Pen** para ojos, pliegues y detalles faciales.
2. Conserva el espacio blanco de respiro detrás del sujeto para que la lectura RTL sea inmediata.
3. ${setteiSummary}

[PROMPT VISUAL]:
Upgrade and ink a hand-drawn Japanese manga draft featuring ${activeHandle} in "${title}", clean Sumi G-Pen outer contours, delicate Maru-Pen facial details, dynamic 30% halftone screentones, crisp white paper negative space, publication-ready black and white manga artwork, no speech bubbles`;
  }

  if (/obra|t[ií]tulo|sinopsis|lomo|presupuesto/.test(combined)) {
    return `${headerNote}
Sugerencia editorial para **${title}**:
- **Gancho de Sinopsis:** En un mundo fracturado por antiguas promesas, ${activeHandle} descubre que el precio de proteger su territorio es despertar el sello que todos temen. Entre alianzas frágiles y tinta ancestral, cada decisión definirá el destino del volumen.
- **Ritmo del Tomo:** Arranca la página 1 con un plano general atmosférico y cierra la última viñeta con una pregunta visual clara antes del giro del capítulo.

[PROMPT VISUAL]:
Atmospheric Japanese manga opening splash illustration for "${title}", dramatic coastal cliff at dawn with sweeping clouds and lone silhouette of ${activeHandle}, crisp Sumi ink linework, deep black shadows and halftone screentones, cinematic manga framing, no text bubbles`;
  }

  return `${headerNote}
Dirección narrativa y de viñetas (Koma-wari) para **${title}**:
- **Foco de tu consulta:** "${userMessage.slice(0, 180)}"
- **Ritmo sugerido (RTL):** Abre con un plano medio estableciendo el entorno, corta en diagonal hacia un primer plano emocional de ${activeHandle} y remata con líneas cinéticas *shūchūsen* para maximizar el impacto.
- ${setteiSummary}

[PROMPT VISUAL]:
Dynamic Japanese manga interior panel depicting ${userMessage.slice(0, 180)}, featuring ${activeHandle}, crisp Sumi G-Pen black and white ink lineart, dramatic chiaroscuro shadows, halftone screentones and subtle speedlines, expressive camera angle, no speech bubbles, no watermarks`;
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

  const { userMessage, chatHistory, activeSettei, projectContext } = parsed.data;
  const apiKey = resolveGeminiApiKey(req);

  if (!apiKey) {
    const reply = buildKaiBetaFallbackReply({
      userMessage,
      projectContext,
      activeSettei,
      reason: 'sin GEMINI_API_KEY',
    });
    return NextResponse.json(
      {
        reply,
        visualPrompt: extractVisualPrompt(reply),
        model: 'kai-beta-guide',
        fallbackUsed: true,
      },
      { status: 200, headers: { 'X-KAI-Mode': 'beta-fallback' } },
    );
  }

  let model = (process.env.GEMINI_KAI_MODEL || KAI_TEXT_MODEL_DEFAULT).trim();
  const endpoint = (id: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(id)}:generateContent`;

  try {
    const request: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: buildSystemInstruction(activeSettei, projectContext) }],
        },
        contents: [...chatHistory, { role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 2800,
        },
      }),
    };

    let upstreamRes = await fetch(endpoint(model), {
      ...request,
      signal: AbortSignal.timeout(22_000),
    });
    if (
      [404, 500, 502, 503, 504].includes(upstreamRes.status) &&
      model !== 'gemini-3-flash-preview'
    ) {
      model = 'gemini-3-flash-preview';
      upstreamRes = await fetch(endpoint(model), {
        ...request,
        signal: AbortSignal.timeout(17_000),
      });
    }

    if (!upstreamRes.ok) {
      const reply = buildKaiBetaFallbackReply({
        userMessage,
        projectContext,
        activeSettei,
        reason: `HTTP ${upstreamRes.status}`,
      });
      return NextResponse.json(
        {
          reply,
          visualPrompt: extractVisualPrompt(reply),
          model: 'kai-beta-guide',
          fallbackUsed: true,
        },
        { status: 200, headers: { 'X-KAI-Mode': 'beta-fallback' } },
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
      const fallbackReply = buildKaiBetaFallbackReply({
        userMessage,
        projectContext,
        activeSettei,
        reason: 'respuesta vacía',
      });
      return NextResponse.json(
        {
          reply: fallbackReply,
          visualPrompt: extractVisualPrompt(fallbackReply),
          model: 'kai-beta-guide',
          fallbackUsed: true,
        },
        { status: 200, headers: { 'X-KAI-Mode': 'beta-fallback' } },
      );
    }

    const visualPrompt = extractVisualPrompt(reply);
    return NextResponse.json({ reply, visualPrompt, model, fallbackUsed: false });
  } catch {
    const reply = buildKaiBetaFallbackReply({
      userMessage,
      projectContext,
      activeSettei,
      reason: 'conexión/timeout',
    });
    return NextResponse.json(
      {
        reply,
        visualPrompt: extractVisualPrompt(reply),
        model: 'kai-beta-guide',
        fallbackUsed: true,
      },
      { status: 200, headers: { 'X-KAI-Mode': 'beta-fallback' } },
    );
  }
}
