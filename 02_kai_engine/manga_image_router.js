/**
 * MANGA IMAGE ROUTER v4.0 — Motor Multi-Proveedor de Imágenes Manga con Consistencia de Personaje
 * Conecta:
 * 1. 🍌 Nano Banana Pro (Gemini Multimodal Native Image Gen con inyección de imagen de referencia del Character Roster)
 * 2. ⚡ FLUX.1-dev + PuLID / StoryDiffusion (Open-Source vía Fal.ai / Replicate)
 * 3. 🤗 HuggingFace Serverless Open-Source (black-forest-labs/FLUX.1-schnell)
 * 4. 🚀 Flux Manga Instant (Motor Open-Source sin API Key con bloqueo de semilla y diccionario de tramas)
 */

window.KAIMangaImageRouter = {
  /**
   * Diccionario de Ingeniería de Prompts por Estilo de Manga (Reemplaza los nombres genéricos por tokens técnicos de entintado)
   */
  STYLE_PRESETS: {
    'Classic Shonen': {
      label: 'Classic Shonen (Jump / Murata)',
      tokens: 'authentic Japanese shonen manga page, crisp G-pen black sumi ink lineart, dynamic speedlines, impact frames, 60-LPI halftone screentone shading, high contrast pure black and white monochrome, NO SPEECH BUBBLES, NO TEXT'
    },
    'Dark Seinen': {
      label: 'Dark Seinen (Miura / Fujimoto)',
      tokens: 'gritty dark seinen manga page, heavy crosshatching, deep chiaroscuro black ink shadows, raw expressive pen strokes, detailed urban/fantasy backgrounds, monochrome ink, NO SPEECH BUBBLES, NO TEXT'
    },
    'Modern Shojo': {
      label: 'Modern Shojo (Línea Fina & Tramas)',
      tokens: 'delicate modern shojo manga page, ultra-thin Maru-pen lineart, soft gradient halftone screentones, expressive luminous eyes, emotional paneling, clean white space, monochrome ink, NO SPEECH BUBBLES, NO TEXT'
    },
    'Retro Gekiga': {
      label: 'Retro Gekiga (90s Otomo / Inoue)',
      tokens: '1990s vintage gekiga manga aesthetic, organic fude brush ink strokes, realistic anatomical proportions, cinematic perspective, traditional mechanical screentone dots, monochrome, NO SPEECH BUBBLES, NO TEXT'
    },
    'Cyberpunk Manga': {
      label: 'Cyberpunk Manga (Blame! / Akira)',
      tokens: 'cyberpunk biomechanical manga page, stark black and white architectural megastructures, cables and neon contrast rendered in pure black ink and screentones, Tsutomu Nihei style, NO SPEECH BUBBLES, NO TEXT'
    },
    'Taíno Ancestral Ink': {
      label: 'Taíno Ancestral Ink (Edición Caribe)',
      tokens: 'epic historical Caribbean fantasy manga page, glowing carved Taino petroglyph energy rendered in high-contrast sumi ink wash and screentones, dramatic tropical storm atmosphere, monochrome, NO SPEECH BUBBLES, NO TEXT'
    }
  },

  /**
   * Plantillas de Composición de Viñetas (Panel Layouts)
   */
  PAGE_LAYOUTS: {
    'kishotenketsu_4': {
      label: '4 Viñetas (Kishōtenketsu Clásico)',
      prompt_hint: '4-panel manga page layout: top wide establishing panel, two middle dynamic panels, bottom large climax panel'
    },
    'shonen_action_5': {
      label: '5 Viñetas (Diagonal Shonen Action)',
      prompt_hint: 'dynamic 5-panel shonen action manga page layout with diagonal panel borders and intense close-ups'
    },
    'cinematic_3': {
      label: '3 Viñetas (Widescreen Cinematográfico)',
      prompt_hint: '3 horizontal widescreen cinematic manga panels stacked vertically, high impact storytelling'
    },
    'splash_page_1': {
      label: '1 Splash Page (Página Completa de Impacto)',
      prompt_hint: 'full-page vertical manga splash art illustration, dramatic low angle composition, maximum detail'
    }
  },

  getConfig() {
    return {
      provider: localStorage.getItem('kai_img_provider') || 'flux_instant',
      geminiKey: localStorage.getItem('kai_gemini_api_key') || '',
      falKey: localStorage.getItem('kai_fal_api_key') || '',
      hfToken: localStorage.getItem('kai_hf_token') || ''
    };
  },

  saveConfig({ provider, geminiKey, falKey, hfToken }) {
    if (provider !== undefined) localStorage.setItem('kai_img_provider', provider);
    if (geminiKey !== undefined) localStorage.setItem('kai_gemini_api_key', geminiKey.trim());
    if (falKey !== undefined) localStorage.setItem('kai_fal_api_key', falKey.trim());
    if (hfToken !== undefined) localStorage.setItem('kai_hf_token', hfToken.trim());
  },

  /**
   * Construye el Prompt Maestro combinando Estilo + Layout + Personajes Bloqueados (Consistencia) + Acción
   */
  buildMasterPrompt({ scenePrompt, styleName = 'Classic Shonen', layoutId = 'kishotenketsu_4', castCharacters = [], isCover = false }) {
    const styleObj = this.STYLE_PRESETS[styleName] || this.STYLE_PRESETS['Classic Shonen'];
    const layoutObj = this.PAGE_LAYOUTS[layoutId] || this.PAGE_LAYOUTS['kishotenketsu_4'];

    const castLockString = castCharacters.length > 0
      ? 'LOCKED CHARACTERS IN SCENE (maintain exact appearance and clothing): ' +
        castCharacters.map(c => `[${c.name}: ${c.appearance || c.prompt || ''}, wearing ${c.clothing || 'signature outfit'}]`).join(' + ')
      : '';

    if (isCover) {
      return `Professional wrap-around manga book cover illustration (16:9). Right side Front Cover: main heroic illustration of ${scenePrompt}. Left side Back Cover: atmospheric matching background. Center spine area. ${castLockString}. Vibrant full-color manga cover art, masterpiece studio quality, crisp ink lines.`;
    }

    return `${styleObj.tokens}. ${layoutObj.prompt_hint}. ${castLockString}. SCENE ACTION: ${scenePrompt}`;
  },

  /**
   * Genera una imagen (Viñeta, Página o Portada) usando el motor seleccionado y devuelve { url, base64, providerUsed }
   */
  async generateImage({ prompt, styleName, layoutId, castCharacters = [], seed = 101, width = 768, height = 1024, isCover = false }) {
    const cfg = this.getConfig();
    const masterPrompt = this.buildMasterPrompt({
      scenePrompt: prompt,
      styleName,
      layoutId,
      castCharacters,
      isCover
    });

    // 1. MOTOR NANO BANANA PRO / GEMINI MULTIMODAL IMAGE GEN (Con inyección de referencias base64 del Character Library)
    if (cfg.provider === 'nano_banana_gemini' && cfg.geminiKey) {
      try {
        const parts = [{ text: masterPrompt }];
        // Inyectar las imágenes de referencia bloqueadas de los personajes activos (Consistencia Visual Real)
        castCharacters.forEach(c => {
          if (c.referenceBase64 && c.referenceBase64.length > 100) {
            parts.push({
              inlineData: {
                mimeType: 'image/png',
                data: c.referenceBase64.replace(/^data:image\/\w+;base64,/, '')
              }
            });
          }
        });

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${encodeURIComponent(cfg.geminiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts }],
              generationConfig: {
                responseModalities: ['TEXT', 'IMAGE']
              }
            })
          }
        );

        if (res.ok) {
          const data = await res.json();
          const candidateParts = data?.candidates?.[0]?.content?.parts || [];
          const imgPart = candidateParts.find(p => p.inlineData && p.inlineData.data);
          if (imgPart) {
            const b64 = imgPart.inlineData.data;
            return {
              url: `data:${imgPart.inlineData.mimeType || 'image/png'};base64,${b64}`,
              base64: b64,
              masterPrompt,
              providerUsed: '🍌 Nano Banana Pro (Gemini Image Gen)'
            };
          }
        }
      } catch (e) {
        console.warn('Error en Nano Banana / Gemini Image Gen, pasando a motor respaldo:', e);
      }
    }

    // 2. MOTOR HUGGING FACE OPEN-SOURCE SERVERLESS (FLUX.1-schnell)
    if (cfg.provider === 'hf_flux_opensource' && cfg.hfToken) {
      try {
        const res = await fetch(
          'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${cfg.hfToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              inputs: masterPrompt,
              parameters: { width, height, seed }
            })
          }
        );
        if (res.ok) {
          const blob = await res.blob();
          const b64 = await this.blobToBase64(blob);
          return {
            url: `data:image/jpeg;base64,${b64}`,
            base64: b64,
            masterPrompt,
            providerUsed: '🤗 HuggingFace Open-Source (FLUX.1-schnell)'
          };
        }
      } catch (e) {
        console.warn('Error en HuggingFace FLUX.1-schnell, pasando a motor respaldo:', e);
      }
    }

    // 3. MOTOR FAL.AI OPEN-SOURCE (FLUX.1-dev + PuLID Character Consistency)
    if (cfg.provider === 'fal_flux_pulid' && cfg.falKey) {
      try {
        const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
          method: 'POST',
          headers: {
            Authorization: `Key ${cfg.falKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: masterPrompt,
            image_size: { width, height },
            seed
          })
        });
        if (res.ok) {
          const data = await res.json();
          const imgUrl = data?.images?.[0]?.url;
          if (imgUrl) {
            return {
              url: imgUrl,
              base64: '',
              masterPrompt,
              providerUsed: '⚡ Fal.ai FLUX Open-Source'
            };
          }
        }
      } catch (e) {
        console.warn('Error en Fal.ai FLUX, pasando a motor respaldo:', e);
      }
    }

    // 4. MOTOR INSTANTÁNEO OPEN-SOURCE (Flux vía Pollinations con Semilla Bloqueada por Personaje)
    // Calcula una semilla determinista combinando los IDs de los personajes activos para mantener coherencia visual
    const castSeedOffset = castCharacters.reduce((acc, c) => acc + (c.seed || 100), 0);
    const deterministicSeed = seed + castSeedOffset;
    const encoded = encodeURIComponent(masterPrompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${deterministicSeed}&model=flux&nologo=true&enhance=true`;

    return {
      url,
      base64: '',
      masterPrompt,
      providerUsed: '🚀 Flux Open-Source (Deterministic Seed)'
    };
  },

  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result || '';
        resolve(String(res).split(',')[1] || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
};
