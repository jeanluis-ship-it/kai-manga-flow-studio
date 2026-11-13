/**
 * KAI Flow Studio v4.3 — Serverless AI Generation Proxy (/api/generate)
 * Protege las API Keys (GEMINI_API_KEY, HF_API_TOKEN, FAL_KEY) en el backend de Vercel
 * y soporta Gemini 3.8 Flash + Nano Banana 2.1 / Nano Banana Pro (gemini-nano-banana-2.1 / gemini-3-pro-image).
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-KAI-Pass-Id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const hfToken = (process.env.HF_API_TOKEN || '').trim();
  const falKey = (process.env.FAL_KEY || '').trim();

  // Healthcheck GET /api/generate para verificar qué llaves están activas en Vercel (sin exponer su valor)
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'KAI Flow Studio Serverless AI Proxy v4.3',
      configuredKeys: {
        GEMINI_API_KEY: geminiKey.length > 5,
        HF_API_TOKEN: hfToken.length > 5,
        FAL_KEY: falKey.length > 5,
        STRIPE_SECRET_KEY: Boolean((process.env.STRIPE_SECRET_KEY || '').trim())
      }
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed. Use GET or POST.' });
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

    const activeGeminiKey = geminiKey || (clientKeys.geminiKey || '').trim();
    const activeHfToken = hfToken || (clientKeys.hfToken || '').trim();
    const activeFalKey = falKey || (clientKeys.falKey || '').trim();

    // 1. Generación de Guion Técnico y Diálogos (KAI v3.0 via Gemini 3.8 Flash + fallback)
    if (action === 'script') {
      if (!activeGeminiKey) {
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
    { "panel_number": 4, "shot": "Low-angle climax impact", "prompt_en": "...", "sfx": "..." }
  ]
}`;

      const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'];
      for (const modelName of candidateModels) {
        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(activeGeminiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json'
              }
            })
          }
        );

        if (geminiResp.ok) {
          const data = await geminiResp.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          const parsed = JSON.parse(rawText);
          return res.status(200).json({
            ok: true,
            providerUsed: `KAI Server (${modelName})`,
            data: parsed
          });
        }
      }

      return res.status(200).json({ ok: false, fallback: true, reason: 'No matching Gemini text model responded 200' });
    }

    // 2. Generación de Imagen Manga con Nano Banana 2.1 / Nano Banana Pro
    if (provider === 'nano_banana_gemini' && activeGeminiKey) {
      const parts = [{ text: `Generate a high-contrast black and white Japanese manga illustration: ${prompt}` }];
      if (Array.isArray(castReferences)) {
        castReferences.slice(0, 4).forEach(ref => {
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

      const imageModels = [
        'gemini-nano-banana-2.1',
        'gemini-3-pro-image',
        'gemini-3.1-flash-lite-image',
        'gemini-2.0-flash-exp-image-generation'
      ];

      for (const imgModel of imageModels) {
        const nbResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${imgModel}:generateContent?key=${encodeURIComponent(activeGeminiKey)}`,
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
              providerUsed: `🍌 Nano Banana (${imgModel} · Serverless)`,
              url: `data:${mime};base64,${imgPart.inlineData.data}`
            });
          }
        }
      }
    }

    // 3. HuggingFace Open-Source Serverless (FLUX.1-schnell)
    if (provider === 'hf_flux_opensource' && activeHfToken) {
      const hfResp = await fetch(
        'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeHfToken}`,
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

    // 4. Fal.ai FLUX + PuLID
    if (provider === 'fal_flux_pulid' && activeFalKey) {
      const falResp = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: {
          Authorization: `Key ${activeFalKey}`,
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
