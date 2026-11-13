/**
 * MANGA IMAGE ROUTER v4.4 — Motor Multi-Proveedor de Páginas de Manga con Conexión Directa de Personajes
 * Prioriza en los primeros tokens del prompt:
 * 1. Personajes conectados del Character Roster (Appearance + Signature Clothing + Seed Lock / Base64)
 * 2. Acción de la escena escrita por el autor
 * 3. Composición (1 Splash Page vs Viñetas) y Estilo de Entintado Manga B&W
 */

window.KAIMangaImageRouter = {
  STYLE_PRESETS: {
    'Classic Shonen': {
      label: 'Classic Shonen (Jump / Murata)',
      tokens: 'authentic black and white Japanese shonen manga art, crisp G-pen sumi ink lineart, dynamic speedlines, halftone screentone shading, high contrast monochrome ink, no text, no watermark'
    },
    'Dark Seinen': {
      label: 'Dark Seinen (Miura / Fujimoto)',
      tokens: 'gritty dark seinen manga art, heavy crosshatching, deep chiaroscuro black ink shadows, raw expressive pen strokes, monochrome ink, no text, no watermark'
    },
    'Modern Shojo': {
      label: 'Modern Shojo (Línea Fina & Tramas)',
      tokens: 'delicate modern shojo manga art, ultra-thin Maru-pen lineart, soft gradient halftone screentones, expressive luminous eyes, monochrome ink, no text, no watermark'
    },
    'Retro Gekiga': {
      label: 'Retro Gekiga (90s Otomo / Inoue)',
      tokens: '1990s vintage gekiga manga art, organic fude brush ink strokes, realistic anatomical proportions, cinematic perspective, monochrome ink, no text, no watermark'
    },
    'Cyberpunk Manga': {
      label: 'Cyberpunk Manga (Blame! / Akira)',
      tokens: 'cyberpunk biomechanical manga art, stark black and white architectural megastructures, pure black ink and screentones, Tsutomu Nihei style, no text, no watermark'
    },
    'Taíno Ancestral Ink': {
      label: 'Taíno Ancestral Ink (Edición Caribe)',
      tokens: 'epic Caribbean Taino fantasy manga illustration, high-contrast black sumi ink wash, glowing ancestral Zemi petroglyph energy, dramatic tropical storm chiaroscuro, screentone shading, monochrome black and white manga, no text'
    }
  },

  PAGE_LAYOUTS: {
    'splash_page_1': {
      label: '1 Splash Page (Página de Impacto)',
      prompt_hint: 'Full-page single vertical manga splash illustration (1 single full-bleed frame, NO multiple panels)'
    },
    'kishotenketsu_4': {
      label: '4 Viñetas (Kishōtenketsu Clásico)',
      prompt_hint: 'Full vertical manga page divided into 4 sequential comic panels with black panel borders (top establishing panel, two middle action panels, bottom climax panel)'
    },
    'shonen_action_5': {
      label: '5 Viñetas (Diagonal Shonen Action)',
      prompt_hint: 'Full vertical manga page with 5 dynamic diagonal action panels, intense close-ups and speedlines'
    },
    'cinematic_3': {
      label: '3 Viñetas (Widescreen Cinematográfico)',
      prompt_hint: 'Full vertical manga page divided into 3 horizontal widescreen cinematic panels stacked vertically'
    }
  },

  getConfig() {
    return {
      provider: localStorage.getItem('kai_img_provider') || 'nano_banana_gemini',
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
   * Construye el Prompt Maestro colocando PRIMERO al personaje conectado y la escena
   * para que el generador de imágenes nunca ignore los rasgos del Character Roster.
   */
  buildMasterPrompt({ scenePrompt, styleName = 'Taíno Ancestral Ink', layoutId = 'splash_page_1', castCharacters = [], isCover = false }) {
    const styleObj = this.STYLE_PRESETS[styleName] || this.STYLE_PRESETS['Classic Shonen'];
    const layoutObj = this.PAGE_LAYOUTS[layoutId] || this.PAGE_LAYOUTS['splash_page_1'];

    const castLockString = castCharacters.length > 0
      ? 'MAIN CHARACTER(S): ' +
        castCharacters.map(c => `${c.name} (${c.appearance || ''}, wearing ${c.clothing || 'signature outfit'})`).join(' AND ') + '. '
      : '';

    if (isCover) {
      return `Wrap-around manga book cover illustration (16:9). ${castLockString}SCENE: ${scenePrompt}. Vibrant full-color manga cover art, masterpiece studio quality, crisp ink lines.`;
    }

    return `${layoutObj.prompt_hint}. ${castLockString}SCENE: ${scenePrompt}. STYLE: ${styleObj.tokens}`;
  },

  /**
   * Genera UNA sola imagen de alta resolución por petición (Evita el bloqueo de 4 imágenes simultáneas)
   */
  async generateImage({ prompt, styleName, layoutId, castCharacters = [], seed = 101, width = 768, height = 1152, isCover = false, isRawPrompt = false }) {
    const cfg = this.getConfig();
    const masterPrompt = isRawPrompt
      ? prompt
      : this.buildMasterPrompt({
          scenePrompt: prompt,
          styleName,
          layoutId,
          castCharacters,
          isCover
        });

    const castSeedOffset = castCharacters.reduce((acc, c) => acc + (Number(c.seed) || 100), 0);
    const deterministicSeed = Number(seed) + castSeedOffset;

    // 1. Llamar primero al Proxy Serverless en Vercel (/api/generate)
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      try {
        const castReferences = castCharacters
          .filter(c => c.referenceBase64 && c.referenceBase64.length > 100 && !c.referenceBase64.startsWith('http'))
          .map(c => ({
            name: c.name,
            base64: c.referenceBase64.replace(/^data:image\/\w+;base64,/, '')
          }));

        const srvResp = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'image',
            provider: cfg.provider,
            prompt: masterPrompt,
            castReferences,
            seed: deterministicSeed,
            width,
            height,
            clientKeys: {
              geminiKey: cfg.geminiKey,
              hfToken: cfg.hfToken,
              falKey: cfg.falKey
            }
          })
        });

        if (srvResp.ok) {
          const srvData = await srvResp.json();
          if (srvData && srvData.ok && srvData.url) {
            return {
              url: srvData.url,
              base64: srvData.url.startsWith('data:') ? srvData.url.split(',')[1] : '',
              masterPrompt,
              providerUsed: srvData.providerUsed || 'Serverless AI Engine',
              notice: srvData.notice || ''
            };
          }
        }
      } catch (e) {
        console.warn('Fallback local en generateImage:', e);
      }
    }

    // 2. Fallback directo (1 sola imagen por clic para no activar rate-limit)
    const encoded = encodeURIComponent(masterPrompt.slice(0, 900));
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${deterministicSeed}&model=flux&nologo=true`;

    return {
      url,
      base64: '',
      masterPrompt,
      providerUsed: '🚀 Flux Open-Source (Seed Lock)'
    };
  }
};
