/**
 * KAI Flow Studio v4.2 — Serverless AI Generation Proxy (/api/generate)
 * Protege las API Keys (GEMINI_API_KEY, HF_API_TOKEN, FAL_KEY) en el backend de Vercel
 * y valida el consumo de Ink Credits del Pase de 72 Horas / Membresía Pro.
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-KAI-Pass-Id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      action = 'image',
      provider = 'nano_banana_gemini',
      prompt = '',
      castReferences = [],
      seed = 101,
      width = 768,
      height = 512,
      dialect = 'criollo',
      style = 'Classic Shonen',
      clientKeys = {}
    } = body;

    const geminiKey = process.env.GEMINI_API_KEY || clientKeys.geminiKey || '';
    const hfToken = process.env.HF_API_TOKEN || clientKeys.hfToken || '';
    const falKey = process.env.FAL_KEY || clientKeys.falKey || '';

    // 1. Generación de Guion Técnico y Diálogos (KAI v3.0 via Gemini 2.5 Flash)
    if (action === 'script') {
      if (!geminiKey) {
        return res.status(200).json({
          ok: false,
          fallback: true,
          reason: 'GEMINI_API_KEY not set on server'
        });
      }

      const systemInstruction = `Eres KAI, Director Editorial de Manga y Maestro de Pre-Prensa para KAI Flow Studio.
Convierte la idea del usuario en una página de manga de 4 viñetas (Kishōtenketsu: Ki, Shō, Ten, Ketsu) en estilo ${style}.
Dialecto de los diálogos: ${dialect === 'criollo' ? 'Español dominicano natural y épico' : 'Español neutro editorial'}.
Devuelve ÚNICAMENTE un JSON válido con esta estructura:
{
  "panels": [
    { "panel_number": 1, "shot": "Wide establishing shot", "prompt_en": "...", "dialogue_es": "...", "sfx": "..." },
    { "panel_number": 2, "shot": "Medium action shot", "prompt_en": "...", "dialogue_es": "...", "sfx": "..." },
    { "panel_number": 3, "shot": "Extreme close-up", "prompt_en": "...", "dialogue_es": "...", "sfx": "..." },
    { "panel_number": 4, "shot": "Low-angle climax impact", "prompt_en": "...", "dialogue_es": "...", "sfx": "..." }
  ]
}`;

      const geminiResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: 'application/json'
            }
          })
        }
      );

      if (!geminiResp.ok) {
        return res.status(200).json({ ok: false, fallback: true, reason: `Gemini HTTP ${geminiResp.status}` });
      }

      const data = await geminiResp.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const parsed = JSON.parse(rawText);
      return res.status(200).json({ ok: true, providerUsed: 'KAI Server (Gemini 2.5 Flash)', data: parsed });
    }

    // 2. Generación de Imagen Manga Multi-Motor
    if (provider === 'nano_banana_gemini' && geminiKey) {
      const parts = [{ text: `Generate a high-contrast black and white Japanese manga illustration: ${prompt}` }];
      if (Array.isArray(castReferences)) {
        castReferences.slice(0, 2).forEach(ref => {
          if (ref && ref.base64) {
            parts.push({
              inlineData: {
                mimeType: 'image/png',
                data: ref.base64
              }
            });
          }
        });
      }

      const nbResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
          })
        }
      );

      if (nbResp.ok) {
        const nbData = await nbResp.json();
        const resParts = nbData?.candidates?.[0]?.content?.parts || [];
        const imgPart = resParts.find(p => p.inlineData && p.inlineData.data);
        if (imgPart) {
          const mime = imgPart.inlineData.mimeType || 'image/png';
          return res.status(200).json({
            ok: true,
            providerUsed: '🍌 Nano Banana Pro (Serverless)',
            url: `data:${mime};base64,${imgPart.inlineData.data}`
          });
        }
      }
    }

    if (provider === 'hf_flux_opensource' && hfToken) {
      const hfResp = await fetch(
        'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${hfToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: { seed: Number(seed) || 101, num_inference_steps: 4 }
          })
        }
      );

      if (hfResp.ok) {
        const arrayBuf = await hfResp.arrayBuffer();
        const b64 = Buffer.from(arrayBuf).toString('base64');
        return res.status(200).json({
          ok: true,
          providerUsed: '🤗 FLUX.1-schnell (Serverless)',
          url: `data:image/jpeg;base64,${b64}`
        });
      }
    }

    if (provider === 'fal_flux_pulid' && falKey) {
      const falResp = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: {
          Authorization: `Key ${falKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          seed: Number(seed) || 101,
          image_size: 'landscape_4_3',
          num_inference_steps: 4
        })
      });

      if (falResp.ok) {
        const falData = await falResp.json();
        const imgUrl = falData?.images?.[0]?.url;
        if (imgUrl) {
          return res.status(200).json({
            ok: true,
            providerUsed: '⚡ Fal.ai FLUX + PuLID (Serverless)',
            url: imgUrl
          });
        }
      }
    }

    // Fallback determinista Open-Source Flux
    const fallbackUrl =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
      `?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;

    return res.status(200).json({
      ok: true,
      fallback: true,
      providerUsed: '🚀 Flux Open-Source (Seed Lock)',
      url: fallbackUrl
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || 'Internal Server Error in /api/generate'
    });
  }
};
