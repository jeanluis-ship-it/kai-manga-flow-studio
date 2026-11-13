/**
 * MANGAI STUDIO — MANGA IMAGE ROUTER v5.0 (Stitch Genkō Edition)
 * Motor Multi-Proveedor de Viñetas (Koma) y Páginas de Manga con Anclas Settei (@Personaje),
 * Ángulos de Cámara y Plumillas Tradicionales (G-Pen, Maru-Pen, Kabura, Pincel Beta).
 */

window.KAIMangaImageRouter = {
  STYLE_PRESETS: {
    'Classic Shonen': {
      label: 'Classic Shonen (Jump / Murata)',
      tokens: 'authentic black and white Japanese shonen manga art, crisp G-pen sumi ink lineart, dynamic speedlines, halftone screentone shading, high contrast monochrome ink, no text, no watermark'
    },
    'Dark Seinen': {
      label: 'Dark Seinen (Miura / Inoue)',
      tokens: 'gritty dark seinen manga art, heavy crosshatching, deep chiaroscuro black ink shadows, raw expressive pen strokes, monochrome ink, no text, no watermark'
    },
    'Modern Shojo': {
      label: 'Modern Shojo (Maru-Pen & Tramas)',
      tokens: 'delicate modern shojo manga art, ultra-thin Maru-pen lineart, soft gradient halftone screentones, expressive luminous eyes, monochrome ink, no text, no watermark'
    },
    'Retro Gekiga': {
      label: 'Retro Gekiga (90s Otomo / Tezuka)',
      tokens: '1990s vintage gekiga manga art, organic fude brush ink strokes, realistic anatomical proportions, cinematic perspective, monochrome ink, no text, no watermark'
    },
    'Cyberpunk Manga': {
      label: 'Cyberpunk Manga (Blame! / Ronin Zero)',
      tokens: 'cyberpunk seinen manga art, stark black and white architectural megastructures, pure black sumi ink and screentones, Tsutomu Nihei style, no text, no watermark'
    },
    'Taíno Ancestral Ink': {
      label: 'Taíno Ancestral Ink (Edición Caribe)',
      tokens: 'epic Caribbean Taino fantasy seinen manga illustration, high-contrast black sumi ink wash, glowing ancestral Zemi petroglyph energy, dramatic tropical storm chiaroscuro, screentone shading, monochrome black and white manga, no text'
    }
  },

  PEN_NIBS: {
    'g_pen': {
      label: 'G-Pen Héroe',
      sub: 'Activa',
      tokens: 'bold expressive G-Pen sumi ink linework with dynamic thick-to-thin line weight'
    },
    'maru_pen': {
      label: 'Maru-Pen Detalle',
      sub: '0.15mm',
      tokens: 'ultra-fine 0.15mm Maru-Pen intricate crosshatching and micro-detail ink lines'
    },
    'kabura_pen': {
      label: 'Kabura Fondo',
      sub: '0.4mm',
      tokens: 'uniform 0.4mm Kabura-Pen architectural background and rigid structural manga linework'
    },
    'pincel_beta': {
      label: 'Pincel Beta Negro',
      sub: 'Beta',
      tokens: 'heavy solid black Sumi brush (Beta) shadows and dramatic dry-brush ink strokes'
    }
  },

  CAMERA_ANGLES: {
    'low_angle': {
      label: 'Contrapicado Dramático (Low Angle)',
      tokens: 'dramatic low-angle heroic perspective looking up'
    },
    'wide_establishing': {
      label: 'Gran Plano General (Establishing Shot)',
      tokens: 'wide panoramic establishing shot with detailed environment architecture'
    },
    'extreme_closeup': {
      label: 'Primerísimo Plano (Close-Up Ojos/Rostro)',
      tokens: 'intense extreme close-up on face and eyes with dramatic emotion'
    },
    'high_angle': {
      label: 'Picado Medio (High Angle)',
      tokens: 'cinematic high-angle overhead shot looking down'
    },
    'dynamic_diagonal': {
      label: 'Acción Diagonal (Dutch Angle Shonen)',
      tokens: 'dynamic tilted Dutch-angle action shot with intense motion foreshortening'
    }
  },

  PAGE_LAYOUTS: {
    'koma_single': {
      label: 'Viñeta Individual (Koma)',
      prompt_hint: 'Single manga comic panel illustration (1 focused frame, no internal panel subdivisions)'
    },
    'splash_page_1': {
      label: '1 Splash Page (Página Completa)',
      prompt_hint: 'Full-page single vertical manga splash illustration (1 single full-bleed frame)'
    },
    'kishotenketsu_4': {
      label: '4 Viñetas Seinen (Koma-wari 4)',
      prompt_hint: 'Single focused manga panel illustration for a 4-panel seinen page'
    },
    'cinematic_3': {
      label: '3 Viñetas (Widescreen Cinematográfico)',
      prompt_hint: 'Wide cinematic manga panel illustration'
    },
    'duel_2': {
      label: '2 Viñetas (Impacto / Duelo)',
      prompt_hint: 'Large half-page manga impact panel illustration'
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
   * Construye el Prompt Maestro colocando PRIMERO las Anclas Settei (@Personajes),
   * el Ángulo de Cámara, la Plumilla Sumi y la Escena.
   */
  buildMasterPrompt({
    scenePrompt,
    styleName = 'Taíno Ancestral Ink',
    layoutId = 'koma_single',
    cameraAngle = 'low_angle',
    penNib = 'g_pen',
    castCharacters = [],
    isCover = false
  }) {
    const styleObj = this.STYLE_PRESETS[styleName] || this.STYLE_PRESETS['Taíno Ancestral Ink'];
    const camObj = this.CAMERA_ANGLES[cameraAngle] || this.CAMERA_ANGLES['low_angle'];
    const nibObj = this.PEN_NIBS[penNib] || this.PEN_NIBS['g_pen'];

    const castLockString = castCharacters.length > 0
      ? 'MAIN CHARACTER(S): ' +
        castCharacters.map(c => {
          const anchors = Array.isArray(c.anchors) && c.anchors.length ? `, visual anchors: ${c.anchors.join(', ')}` : '';
          return `${c.name} (${c.appearance || ''}, wearing ${c.clothing || 'signature outfit'}${anchors})`;
        }).join(' AND ') + '. '
      : '';

    if (isCover) {
      return `High-contrast manga tankobon book cover illustration. ${castLockString}CAMERA: ${camObj.tokens}. SCENE: ${scenePrompt}. Masterpiece manga cover art, crisp Sumi ink lines with dramatic crimson and gold accents, no watermark.`;
    }

    return `Single manga panel illustration. ${castLockString}CAMERA ANGLE: ${camObj.tokens}. SCENE ACTION: ${scenePrompt}. INK & PEN TECHNIQUE: ${nibObj.tokens}, ${styleObj.tokens}`;
  },

  /**
   * Genera UNA sola imagen de alta resolución por clic (Evita bloqueos por peticiones simultáneas)
   */
  async generateImage({
    prompt,
    styleName,
    layoutId = 'koma_single',
    cameraAngle = 'low_angle',
    penNib = 'g_pen',
    castCharacters = [],
    seed = 101,
    width = 768,
    height = 768,
    isCover = false,
    isRawPrompt = false
  }) {
    const cfg = this.getConfig();
    const masterPrompt = isRawPrompt
      ? prompt
      : this.buildMasterPrompt({
          scenePrompt: prompt,
          styleName,
          layoutId,
          cameraAngle,
          penNib,
          castCharacters,
          isCover
        });

    const castSeedOffset = castCharacters.reduce((acc, c) => acc + (Number(c.seed) || 100), 0);
    const deterministicSeed = Number(seed) + castSeedOffset;

    // 1. Llamar al Proxy Serverless en Vercel (/api/generate)
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

    // 2. Fallback directo (1 sola imagen por clic)
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
