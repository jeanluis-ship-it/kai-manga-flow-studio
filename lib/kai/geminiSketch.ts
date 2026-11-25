import sharp from 'sharp';
import { z } from 'zod';
import { KAI_TEXT_MODEL_DEFAULT } from './studioCanvas';

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
const ink = z.string().regex(/^(?:none|#[0-9a-f]{6})$/i);
const strokesSchema = z.object({
  paths: z.array(z.object({
    d: z.string().max(3200).regex(/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s+-]+$/),
    fill: ink, stroke: ink, width: z.number().min(0).max(16),
  })).min(3).max(160),
});

export async function generateGeminiSketch(apiKey: string, parts: Part[], ratio: string, signal: AbortSignal) {
  const [a, b] = ratio.split(':').map(Number);
  const width = Math.round(256 * a / Math.max(a, b));
  const height = Math.round(256 * b / Math.max(a, b));
  const model = process.env.GEMINI_KAI_MODEL?.trim() || KAI_TEXT_MODEL_DEFAULT;
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: `Draw an original Japanese manga storyboard sketch on white paper in a ${width} by ${height} coordinate space using actual SVG path geometry. Read the user's scene and reference images and depict their subjects, composition, expressions, clothing and setting. Make a clear attractive silhouette with smooth curves, black ink shadows, white negative space and a few gray screentones. Use 18 to 36 concise expressive paths in painter order. Exclude text. Output JSON with a paths array. Each path has d (SVG path commands), stroke and fill (six-digit hex or none), width (numeric stroke width 0 to 16). Do not emit XML, Markdown or explanations.` }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 6500, temperature: 0.45,
        responseSchema: { type: 'OBJECT', properties: { paths: { type: 'ARRAY', items: {
          type: 'OBJECT', properties: { d: { type: 'STRING' }, stroke: { type: 'STRING' }, fill: { type: 'STRING' }, width: { type: 'NUMBER' } },
          required: ['d','stroke','fill','width'],
        } } }, required: ['paths'] },
      },
    }),
  });
  if (!response.ok) throw new Error('Boceto Gemini HTTP ' + response.status);
  const data = await response.json();
  const json = data.candidates?.[0]?.content?.parts?.filter((part: {thought?: boolean}) => !part.thought).map((part: { text?: string }) => part.text ?? '').join('');
  const drawing = strokesSchema.parse(JSON.parse(json || '{}'));
  const elements = drawing.paths.map((p) => `<path d="${p.d}" fill="${p.fill}" stroke="${p.stroke}" stroke-width="${p.width}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width * 3}" height="${height * 3}"><rect width="100%" height="100%" fill="white"/>${elements}</svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return { image: 'data:image/png;base64,' + png.toString('base64'), mimeType: 'image/png', model, renderKind: 'vector-sketch' as const };
}
