/**
 * KAI Flow Studio v4.4 — Serverless AI Generation Proxy (/api/generate)
 * 1. Usa tu GEMINI_API_KEY activa (gemini-3.5-flash-lite / gemini-3.8-flash) para fusionar los rasgos
 *    del personaje (Character Roster) + Layout (1 Splash Page o Viñetas) + Escena en un Prompt Visual exacto.
 * 2. Ejecuta la generación de imagen en 🍌 Nano Banana (si la cuenta tiene Tier 1 de imágenes),
 *    🤗 HuggingFace FLUX.1-schnell, ⚡ Fal.ai PuLID, o descarga la página completa en 1 sola petición
 *    desde el servidor para evitar el bloqueo "Free limit reached (1 image every 45s)" del navegador.
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

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'KAI Flow Studio Serverless AI Proxy v4.4',
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
      height = 1152,
      dialect = 'criollo',
      style = 'Classic Shonen',
      clientKeys = {}
    } = body;

    const activeGeminiKey = geminiKey || (clientKeys.geminiKey || '').trim();
    const activeHfToken = hfToken || (clientKeys.hfToken || '').trim();
    const activeFalKey = falKey || (clientKeys.falKey || '').trim();

    // 1. MODO GUION / DIÁLOGOS OPCIONALES
    if (action === 'script') {
      if (!activeGeminiKey) {
        return res.status(200).json({ ok: false, fallback: true, reason: 'GEMINI_API_KEY not set' });
      }

      const systemInstruction = `Eres KAI, Director Editorial de Manga para KAI Flow Studio.
Convierte la escena del usuario en 4 diálogos breves de manga (máximo 12 palabras por globo) en español (${dialect === 'criollo' ? 'sabor dominicano épico pero limpio' : 'español neutro'}).
NUNCA repitas las instrucciones de cámara en inglés dentro del diálogo.
Devuelve ÚNICAMENTE JSON válido:
{
  "panels": [
    { "panel_number": 1, "dialogue_es": "...", "sfx": "..." },
    { "panel_number": 2, "dialogue_es": "...", "sfx": "..." },
    { "panel_number": 3, "dialogue_es": "...", "sfx": "..." },
    { "panel_number": 4, "dialogue_es": "...", "sfx": "..." }
  ]
}`;

      const textModels = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash'];
      for (const modelName of textModels) {
        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(activeGeminiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemInstruction }] },
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' }
            })
          }
        );

        if (geminiResp.ok) {
          const data = await geminiResp.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
          return res.status(200).json({
            ok: true,
            providerUsed: `KAI Server (${modelName})`,
            data: JSON.parse(rawText)
          });
        }
      }

      return res.status(200).json({ ok: false, fallback: true });
    }

    // 2. MODO IMAGEN DE PÁGINA COMPLETA O PERSONAJE
    // Paso 2A: Usar Gemini (que SÍ está activo gratis en tu llave) para sintetizar un prompt visual perfecto (<420 chars)
    let optimizedPrompt = prompt;
    if (activeGeminiKey) {
      try {
        const compilerResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(activeGeminiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{
                  text: 'You are an expert manga prompt engineer. Condense the user input into a single, vivid English image generation prompt under 380 characters. Put the main character physical traits and outfit FIRST, then the exact action/pose and setting, then "black and white Japanese manga ink illustration, high contrast sumi ink, screentones, masterpiece, no text, no speech bubbles". Output ONLY the raw English prompt.'
                }]
              },
              contents: [{ role: 'user', parts: [{ text: prompt }] }]
            })
          }
        );
        if (compilerResp.ok) {
          const cData = await compilerResp.json();
          const compiledText = cData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (compiledText && compiledText.length > 20) {
            optimizedPrompt = compiledText;
          }
        }
      } catch (e) {
        // continúa con prompt original si falla la síntesis
      }
    }

    // Paso 2B: Intentar 🍌 Nano Banana (si la llave tiene cuota de imagen habilitada en Google AI Studio)
    let nanoBananaQuotaError = false;
    if (provider === 'nano_banana_gemini' && activeGeminiKey) {
      const parts = [{ text: `Generate a high-contrast black and white Japanese manga page illustration (no text, no speech bubbles): ${optimizedPrompt}` }];
      if (Array.isArray(castReferences)) {
        castReferences.slice(0, 3).forEach(ref => {
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

      const imageModels = ['gemini-nano-banana-2.1', 'gemini-2.5-flash-image', 'gemini-3-pro-image'];
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

        if (nbResp.status === 429) {
          nanoBananaQuotaError = true;
          break;
        }

        if (nbResp.ok) {
          const nbData = await nbResp.json();
          const resParts = nbData?.candidates?.[0]?.content?.parts || [];
          const imgPart = resParts.find(p => p.inlineData && p.inlineData.data);
          if (imgPart) {
            const mime = imgPart.inlineData.mimeType || 'image/png';
            return res.status(200).json({
              ok: true,
              providerUsed: `🍌 Nano Banana (${imgModel})`,
              compiledPrompt: optimizedPrompt,
              url: `data:${mime};base64,${imgPart.inlineData.data}`
            });
          }
        }
      }
    }

    // Paso 2C: Intentar HuggingFace Open-Source Serverless (FLUX.1-schnell)
    if (activeHfToken) {
      const hfResp = await fetch(
        'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeHfToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: optimizedPrompt,
            parameters: { seed: Number(seed) || 101, num_inference_steps: 4 }
          })
        }
      );

      if (hfResp.ok) {
        const arrayBuf = await hfResp.arrayBuffer();
        const b64 = Buffer.from(arrayBuf).toString('base64');
        return res.status(200).json({
          ok: true,
          providerUsed: '🤗 HuggingFace FLUX.1-schnell (Serverless)',
          compiledPrompt: optimizedPrompt,
          url: `data:image/jpeg;base64,${b64}`
        });
      }
    }

    // Paso 2D: Intentar Fal.ai FLUX + PuLID
    if (activeFalKey) {
      const falResp = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        headers: {
          Authorization: `Key ${activeFalKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: optimizedPrompt,
          seed: Number(seed) || 101,
          image_size: 'portrait_4_3',
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
            compiledPrompt: optimizedPrompt,
            url: imgUrl
          });
        }
      }
    }

    // Paso 2E: Renderizado Unificado de 1 Sola Imagen (Optimizado por tu Gemini 3.5 Flash)
    const singleImageUrl =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(optimizedPrompt)}` +
      `?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;

    return res.status(200).json({
      ok: true,
      fallback: true,
      providerUsed: activeGeminiKey
        ? '✨ Gemini 3.5 Prompt Compiler + Flux Single-Page Ink'
        : '🚀 Flux Open-Source Single-Page',
      compiledPrompt: optimizedPrompt,
      notice: nanoBananaQuotaError
        ? 'Tu GEMINI_API_KEY está en el plan gratuito de Google AI Studio (que permite texto pero bloquea generación de imágenes con error 429). Por eso Gemini compiló el prompt de tu personaje y renderizó la página en 1 sola imagen con Flux.'
        : '',
      url: singleImageUrl
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || 'Internal Server Error in /api/generate'
    });
  }
};
