/**
 * MANGAI Studio v5.1 — Serverless Multi-Engine AI Image & Script Proxy (/api/generate)
 * Soporta selección explícita de motor para pruebas ("Test Bench") o cascada automática:
 *   - auto: Cascada inteligente (Gemini 2.0 Flash Image -> Imagen 3 -> HF FLUX.1 -> Fal FLUX -> Flux Server Proxy)
 *   - gemini_flash_image: Google AI Studio (gemini-2.0-flash-exp-image-generation) con GEMINI_API_KEY
 *   - imagen_3: Google Imagen 3.0 (imagen-3.0-generate-002) con GEMINI_API_KEY
 *   - hf_flux: HuggingFace Serverless (black-forest-labs/FLUX.1-schnell) con HF_API_TOKEN
 *   - fal_flux: Fal.ai (fal-ai/flux/schnell) con FAL_KEY
 *   - flux_proxy: Descarga server-side en base64 (evita bloqueos CORS / rate-limit del navegador)
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
      service: 'MANGAI Studio Serverless Multi-Engine Proxy v5.1',
      configuredKeys: {
        GEMINI_API_KEY: geminiKey.length > 5,
        HF_API_TOKEN: hfToken.length > 5,
        FAL_KEY: falKey.length > 5
      },
      availableEngines: [
        { id: 'auto', name: 'Auto-Cascada Inteligente KAI', ready: true },
        { id: 'gemini_flash_image', name: 'Gemini 2.0 Flash Image (Nano Banana)', ready: geminiKey.length > 5 },
        { id: 'imagen_3', name: 'Google Imagen 3.0 HD', ready: geminiKey.length > 5 },
        { id: 'hf_flux', name: 'HuggingFace FLUX.1-schnell', ready: hfToken.length > 5 },
        { id: 'fal_flux', name: 'Fal.ai FLUX Schnell', ready: falKey.length > 5 },
        { id: 'flux_proxy', name: 'Flux Server-Side Proxy (Sin Llave)', ready: true }
      ]
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed. Use GET or POST.' });
  }

  const startTime = Date.now();

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      action = 'image',
      engine = 'auto',
      provider = 'auto',
      prompt = '',
      castReferences = [],
      seed = 101,
      width = 768,
      height = 1024,
      clientKeys = {}
    } = body;

    const selectedEngine = (engine && engine !== 'auto' ? engine : provider) || 'auto';
    const activeGeminiKey = (clientKeys.geminiKey || '').trim() || geminiKey;
    const activeHfToken = (clientKeys.hfToken || '').trim() || hfToken;
    const activeFalKey = (clientKeys.falKey || '').trim() || falKey;

    // 1. DIAGNÓSTICO EN VIVO DE LLAVES Y MOTORES
    if (action === 'diagnostics') {
      const report = {
        ok: true,
        serverKeys: {
          GEMINI_API_KEY: Boolean(activeGeminiKey),
          HF_API_TOKEN: Boolean(activeHfToken),
          FAL_KEY: Boolean(activeFalKey)
        },
        geminiTextCompiler: 'not_tested',
        geminiFlashImage: 'not_tested'
      };

      if (activeGeminiKey) {
        try {
          const pingResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(activeGeminiKey)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: 'Reply with OK' }] }]
              })
            }
          );
          report.geminiTextCompiler = pingResp.ok ? 'active_ok' : `http_${pingResp.status}`;
        } catch (err) {
          report.geminiTextCompiler = `error: ${err.message}`;
        }
      }
      return res.status(200).json(report);
    }

    // 2. COMPILACIÓN TÉCNICA DEL PROMPT EN INGLÉS MANGA (Vía Gemini Texto si hay llave)
    let optimizedPrompt = prompt;
    const diagnosticsLog = [];

    if (activeGeminiKey && prompt.length > 5) {
      try {
        const compilerModels = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
        for (const cModel of compilerModels) {
          const compilerResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${cModel}:generateContent?key=${encodeURIComponent(activeGeminiKey)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: {
                  parts: [{
                    text: 'You are an expert Japanese manga prompt engineer. Convert the user scene description into a vivid English image generation prompt under 360 characters. Put character traits first, then camera angle and dynamic action, then "authentic black and white Japanese manga panel illustration, crisp Sumi G-pen ink linework, halftone screentones, high contrast monochrome, masterpiece, no text, no speech bubbles, no watermark". Output ONLY the raw English prompt.'
                  }]
                },
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
              })
            }
          );
          if (compilerResp.ok) {
            const cData = await compilerResp.json();
            const compiledText = cData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (compiledText && compiledText.length > 15) {
              optimizedPrompt = compiledText;
              diagnosticsLog.push(`Prompt compilado con ${cModel}`);
              break;
            }
          }
        }
      } catch (e) {
        diagnosticsLog.push(`Compilador texto omitido: ${e.message}`);
      }
    }

    // Helper para intentar Gemini Flash Image (Nano Banana)
    async function tryGeminiFlashImage() {
      if (!activeGeminiKey) {
        diagnosticsLog.push('Gemini Flash Image: Sin GEMINI_API_KEY');
        return null;
      }
      const parts = [
        {
          text: `Generate a high-contrast black and white Japanese manga illustration (pure monochrome sumi ink and screentones, no text, no speech bubbles): ${optimizedPrompt}`
        }
      ];
      if (Array.isArray(castReferences)) {
        castReferences.slice(0, 2).forEach((ref) => {
          if (ref && ref.base64) {
            parts.push({
              inlineData: { mimeType: 'image/png', data: ref.base64 }
            });
          }
        });
      }

      const flashImgModels = [
        'gemini-2.0-flash-exp-image-generation',
        'gemini-2.0-flash-preview-image-generation',
        'gemini-2.5-flash-image'
      ];

      for (const modelId of flashImgModels) {
        try {
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(activeGeminiKey)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts }],
                generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
              })
            }
          );

          if (resp.ok) {
            const data = await resp.json();
            const resParts = data?.candidates?.[0]?.content?.parts || [];
            const imgPart = resParts.find((p) => p.inlineData && p.inlineData.data);
            if (imgPart) {
              const mime = imgPart.inlineData.mimeType || 'image/png';
              return {
                ok: true,
                providerUsed: `🍌 Gemini Flash Image (${modelId})`,
                engineId: 'gemini_flash_image',
                latencyMs: Date.now() - startTime,
                compiledPrompt: optimizedPrompt,
                diagnosticsLog,
                url: `data:${mime};base64,${imgPart.inlineData.data}`
              };
            }
          } else {
            diagnosticsLog.push(`${modelId}: HTTP ${resp.status}`);
          }
        } catch (err) {
          diagnosticsLog.push(`${modelId}: ${err.message}`);
        }
      }
      return null;
    }

    // Helper para intentar Google Imagen 3.0
    async function tryGoogleImagen3() {
      if (!activeGeminiKey) {
        diagnosticsLog.push('Imagen 3.0: Sin GEMINI_API_KEY');
        return null;
      }
      try {
        const aspectRatio = width > height ? '4:3' : width === height ? '1:1' : '3:4';
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${encodeURIComponent(activeGeminiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              instances: [{ prompt: optimizedPrompt }],
              parameters: {
                sampleCount: 1,
                aspectRatio,
                outputOptions: { mimeType: 'image/jpeg' }
              }
            })
          }
        );

        if (resp.ok) {
          const data = await resp.json();
          const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
          if (b64) {
            return {
              ok: true,
              providerUsed: '🎨 Google Imagen 3.0 HD',
              engineId: 'imagen_3',
              latencyMs: Date.now() - startTime,
              compiledPrompt: optimizedPrompt,
              diagnosticsLog,
              url: `data:image/jpeg;base64,${b64}`
            };
          }
        } else {
          diagnosticsLog.push(`imagen-3.0-generate-002: HTTP ${resp.status}`);
        }
      } catch (err) {
        diagnosticsLog.push(`imagen-3.0: ${err.message}`);
      }
      return null;
    }

    // Helper para intentar HuggingFace FLUX.1-schnell
    async function tryHuggingFaceFlux() {
      if (!activeHfToken) {
        diagnosticsLog.push('HuggingFace FLUX: Sin HF_API_TOKEN');
        return null;
      }
      const hfEndpoints = [
        'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
        'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell'
      ];
      for (const endpoint of hfEndpoints) {
        try {
          const hfResp = await fetch(endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${activeHfToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              inputs: optimizedPrompt,
              parameters: { seed: Number(seed) || 101, num_inference_steps: 4 }
            })
          });
          if (hfResp.ok) {
            const arrayBuf = await hfResp.arrayBuffer();
            const b64 = Buffer.from(arrayBuf).toString('base64');
            return {
              ok: true,
              providerUsed: '🤗 HuggingFace FLUX.1-schnell',
              engineId: 'hf_flux',
              latencyMs: Date.now() - startTime,
              compiledPrompt: optimizedPrompt,
              diagnosticsLog,
              url: `data:image/jpeg;base64,${b64}`
            };
          } else {
            diagnosticsLog.push(`HF FLUX: HTTP ${hfResp.status}`);
          }
        } catch (err) {
          diagnosticsLog.push(`HF FLUX: ${err.message}`);
        }
      }
      return null;
    }

    // Helper para intentar Fal.ai FLUX Schnell
    async function tryFalFlux() {
      if (!activeFalKey) {
        diagnosticsLog.push('Fal.ai FLUX: Sin FAL_KEY');
        return null;
      }
      try {
        const falResp = await fetch('https://fal.run/fal-ai/flux/schnell', {
          method: 'POST',
          headers: {
            Authorization: `Key ${activeFalKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: optimizedPrompt,
            seed: Number(seed) || 101,
            image_size: width > height ? 'landscape_4_3' : 'portrait_4_3',
            num_inference_steps: 4
          })
        });
        if (falResp.ok) {
          const falData = await falResp.json();
          const imgUrl = falData?.images?.[0]?.url;
          if (imgUrl) {
            return {
              ok: true,
              providerUsed: '⚡ Fal.ai FLUX Schnell',
              engineId: 'fal_flux',
              latencyMs: Date.now() - startTime,
              compiledPrompt: optimizedPrompt,
              diagnosticsLog,
              url: imgUrl
            };
          }
        } else {
          diagnosticsLog.push(`Fal.ai: HTTP ${falResp.status}`);
        }
      } catch (err) {
        diagnosticsLog.push(`Fal.ai: ${err.message}`);
      }
      return null;
    }

    // Helper para descargar imagen desde Flux Open Proxy EN EL SERVIDOR (devuelve Base64 limpio sin marca de agua ni rate limit de navegador)
    async function tryServerSideFluxProxy() {
      const w = Math.min(1024, Math.max(384, Number(width) || 768));
      const h = Math.min(1024, Math.max(384, Number(height) || 768));
      const targetUrl =
        `https://image.pollinations.ai/prompt/${encodeURIComponent(optimizedPrompt)}` +
        `?width=${w}&height=${h}&seed=${Number(seed) || 101}&nologo=true&model=flux`;

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 9500);
        const proxyResp = await fetch(targetUrl, {
          method: 'GET',
          headers: { 'User-Agent': 'MANGAI-Studio-Serverless/5.1' },
          signal: controller.signal
        });
        clearTimeout(timer);

        if (proxyResp.ok) {
          const contentType = proxyResp.headers.get('content-type') || 'image/jpeg';
          const arrayBuf = await proxyResp.arrayBuffer();
          if (arrayBuf.byteLength > 2500) {
            const b64 = Buffer.from(arrayBuf).toString('base64');
            return {
              ok: true,
              providerUsed: activeGeminiKey
                ? '✨ Gemini Prompt Compiler + Flux Server Proxy'
                : '🌐 Flux Server-Side Proxy (Base64)',
              engineId: 'flux_proxy',
              latencyMs: Date.now() - startTime,
              compiledPrompt: optimizedPrompt,
              diagnosticsLog,
              url: `data:${contentType};base64,${b64}`
            };
          }
        } else {
          diagnosticsLog.push(`Flux Proxy: HTTP ${proxyResp.status}`);
        }
      } catch (err) {
        diagnosticsLog.push(`Flux Proxy timeout/error: ${err.message}`);
      }
      return null;
    }

    // 3. EJECUCIÓN SEGÚN EL MOTOR SELECCIONADO EN EL INSPECTOR
    let result = null;

    if (selectedEngine === 'gemini_flash_image' || selectedEngine === 'nano_banana_gemini') {
      result = (await tryGeminiFlashImage()) || (await tryGoogleImagen3()) || (await tryServerSideFluxProxy());
    } else if (selectedEngine === 'imagen_3') {
      result = (await tryGoogleImagen3()) || (await tryGeminiFlashImage()) || (await tryServerSideFluxProxy());
    } else if (selectedEngine === 'hf_flux') {
      result = (await tryHuggingFaceFlux()) || (await tryGeminiFlashImage()) || (await tryServerSideFluxProxy());
    } else if (selectedEngine === 'fal_flux') {
      result = (await tryFalFlux()) || (await tryGeminiFlashImage()) || (await tryServerSideFluxProxy());
    } else if (selectedEngine === 'flux_proxy') {
      result = (await tryServerSideFluxProxy()) || (await tryGeminiFlashImage());
    } else {
      // Modo 'auto' (Cascada completa ordenada por velocidad y calidad)
      result =
        (await tryGeminiFlashImage()) ||
        (await tryGoogleImagen3()) ||
        (await tryHuggingFaceFlux()) ||
        (await tryFalFlux()) ||
        (await tryServerSideFluxProxy());
    }

    if (result) {
      return res.status(200).json(result);
    }

    // Si todos los motores externos dieron timeout o límite de cuota, notificar al cliente para renderizar el Boceto Shitagaki Local
    return res.status(200).json({
      ok: false,
      fallbackToLocalCanvas: true,
      compiledPrompt: optimizedPrompt,
      diagnosticsLog,
      latencyMs: Date.now() - startTime,
      notice: 'Los motores remotos están saturados o requieren activar cuota de imagen. Se generó un Boceto Técnico Shitagaki local.'
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || 'Internal Server Error in /api/generate'
    });
  }
};
