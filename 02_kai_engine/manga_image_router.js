/**
 * ============================================================================
 * MANGAI STUDIO — MANGA IMAGE ROUTER v5.1 (Blank-First & Multi-Engine Edition)
 * ============================================================================
 * - Soporta 7 modos/motores seleccionables en tiempo real para pruebas ("Test Bench")
 * - Incluye generador de Lienzo Virgen Genkō (#FAF8F5 + Guías #00AEEF) para iniciar desde cero
 * - Conecta con /api/generate en Vercel y devuelve métricas reales de latencia y proveedor
 * ============================================================================
 */

window.KAIMangaImageRouter = {
  ENGINES: [
    {
      id: 'auto',
      label: '⚡ Auto-Cascada KAI (Recomendado)',
      badge: 'Auto Multi-Motor'
    },
    {
      id: 'gemini_flash_image',
      label: '🍌 Gemini 2.0 Flash Image (Google AI Studio)',
      badge: 'Gemini Flash Image'
    },
    {
      id: 'imagen_3',
      label: '🎨 Google Imagen 3.0 HD (imagen-3.0-generate-002)',
      badge: 'Google Imagen 3.0'
    },
    {
      id: 'hf_flux',
      label: '🤗 HuggingFace FLUX.1-schnell (HF Token)',
      badge: 'HF FLUX.1-schnell'
    },
    {
      id: 'fal_flux',
      label: '🚀 Fal.ai FLUX Schnell / PuLID (FAL Key)',
      badge: 'Fal.ai FLUX'
    },
    {
      id: 'flux_proxy',
      label: '🌐 Flux Server Proxy (Sin Llave · Base64)',
      badge: 'Flux Server Proxy'
    },
    {
      id: 'shitagaki_local',
      label: '📐 Boceto Shitagaki Local (0ms · Prueba de Layout)',
      badge: 'Shitagaki Local 0ms'
    }
  ],

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
    'Taíno Ancestral Ink': {
      label: 'Taíno Ancestral Ink (Seinen Alto Contraste)',
      tokens: 'epic high-contrast seinen manga illustration, crisp black sumi ink linework, dramatic chiaroscuro shadows, halftone screentone shading, monochrome black and white manga, no text, no speech bubbles'
    }
  },

  PEN_NIBS: {
    g_pen: {
      label: 'G-Pen Héroe',
      sub: 'Activa',
      tokens: 'bold expressive G-Pen sumi ink linework with dynamic thick-to-thin line weight'
    },
    maru_pen: {
      label: 'Maru-Pen Detalle',
      sub: '0.15mm',
      tokens: 'ultra-fine 0.15mm Maru-Pen intricate crosshatching and micro-detail ink lines'
    },
    kabura_pen: {
      label: 'Kabura Fondo',
      sub: '0.4mm',
      tokens: 'uniform 0.4mm Kabura-Pen architectural background and rigid structural manga linework'
    },
    pincel_beta: {
      label: 'Pincel Beta Negro',
      sub: 'Beta',
      tokens: 'heavy solid black Sumi brush (Beta) shadows and dramatic dry-brush ink strokes'
    }
  },

  CAMERA_ANGLES: {
    low_angle: {
      label: 'Contrapicado Dramático (Low Angle)',
      tokens: 'dramatic low-angle heroic perspective looking up'
    },
    wide_establishing: {
      label: 'Gran Plano General (Establishing)',
      tokens: 'wide panoramic establishing shot with detailed environment architecture'
    },
    extreme_closeup: {
      label: 'Primer Plano Emocional',
      tokens: 'intense extreme close-up on face and eyes with dramatic emotion'
    },
    high_angle: {
      label: 'Plano Picado Cenital',
      tokens: 'cinematic high-angle overhead shot looking down'
    },
    dynamic_diagonal: {
      label: 'Plano Holandés (Inclinado FX)',
      tokens: 'dynamic tilted Dutch-angle action shot with intense motion foreshortening'
    }
  },

  getConfig() {
    return {
      engine: localStorage.getItem('kai_img_engine') || 'auto',
      provider: localStorage.getItem('kai_img_engine') || 'auto',
      geminiApiKey: localStorage.getItem('kai_gemini_api_key') || '',
      geminiKey: localStorage.getItem('kai_gemini_api_key') || '',
      falKey: localStorage.getItem('kai_fal_api_key') || '',
      hfToken: localStorage.getItem('kai_hf_token') || ''
    };
  },

  saveConfig({ engine, provider, geminiApiKey, geminiKey, falKey, hfToken }) {
    const chosenEngine = engine || provider;
    if (chosenEngine !== undefined) localStorage.setItem('kai_img_engine', chosenEngine);
    const gKey = geminiApiKey !== undefined ? geminiApiKey : geminiKey;
    if (gKey !== undefined) localStorage.setItem('kai_gemini_api_key', gKey.trim());
    if (falKey !== undefined) localStorage.setItem('kai_fal_api_key', falKey.trim());
    if (hfToken !== undefined) localStorage.setItem('kai_hf_token', hfToken.trim());
  },

  /**
   * Genera un lienzo virgen Genkō en blanco (#FAF8F5) con guías técnicas #00AEEF
   * para que cada viñeta inicie 100% limpia desde cero.
   */
  renderBlankGenkoKoma({ komaIndex = 0, width = 640, height = 420, subtitle = '' }) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Fondo Papel Genkō Marfil (#FAF8F5)
    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(0, 0, width, height);

    // Retícula técnica sutil en Azul No-Foto Shitagaki (#00AEEF)
    ctx.strokeStyle = 'rgba(0, 174, 239, 0.14)';
    ctx.lineWidth = 1;
    const step = 32;
    for (let x = step; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = step; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Cruz central de encuadre (Center Crosshair)
    ctx.strokeStyle = 'rgba(0, 174, 239, 0.32)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 16);
    ctx.lineTo(width / 2, height - 16);
    ctx.moveTo(16, height / 2);
    ctx.lineTo(width - 16, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Marco interior seguro
    ctx.strokeStyle = 'rgba(0, 174, 239, 0.25)';
    ctx.strokeRect(12, 12, width - 24, height - 24);

    // Etiqueta central limpia de Koma en blanco
    ctx.fillStyle = '#006288';
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`KOMA #${komaIndex + 1} · LIENZO EN BLANCO`, width / 2, height / 2 - 8);

    ctx.fillStyle = '#5c3f40';
    ctx.font = '400 11px "Inter", sans-serif';
    ctx.fillText(
      subtitle || 'Selecciona la viñeta y escribe tu escena en el Inspector Derecho',
      width / 2,
      height / 2 + 14
    );

    return canvas.toDataURL('image/png');
  },

  /**
   * Renderiza un Boceto Técnico Shitagaki / Sumi local instantáneo (0ms)
   * útil para probar composición, ángulo de cámara y anclas antes o durante pruebas de motores.
   */
  renderOfflineDraftCanvas({
    komaIndex = 0,
    penNib = 'g_pen',
    cameraAngle = 'low_angle',
    actionPrompt = '',
    characters = [],
    seed = 101,
    width = 640,
    height = 480
  }) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Papel Genkō
    ctx.fillStyle = '#FAF8F5';
    ctx.fillRect(0, 0, width, height);

    // Líneas cinéticas radiales Sumi (Speedlines de acción manga)
    const cx = width * 0.5;
    const cy = cameraAngle === 'low_angle' ? height * 0.35 : height * 0.5;
    ctx.strokeStyle = 'rgba(27, 28, 24, 0.16)';
    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * Math.PI * 2;
      const innerR = Math.min(width, height) * 0.24;
      const outerR = Math.max(width, height) * 0.95;
      ctx.lineWidth = (i % 3 === 0) ? 2.2 : 0.9;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR);
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
      ctx.stroke();
    }

    // Silueta dramática de encuadre según ángulo de cámara
    ctx.fillStyle = '#1b1c18';
    ctx.beginPath();
    ctx.arc(cx, cy - 22, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 68, cy + 115);
    ctx.lineTo(cx - 38, cy + 16);
    ctx.lineTo(cx + 38, cy + 16);
    ctx.lineTo(cx + 74, cy + 115);
    ctx.closePath();
    ctx.fill();

    // Trazo azul Shitagaki de construcción anatómica
    ctx.strokeStyle = 'rgba(0, 174, 239, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy - 22, 42, 0, Math.PI * 2);
    ctx.moveTo(cx - 85, cy - 22);
    ctx.lineTo(cx + 85, cy - 22);
    ctx.moveTo(cx, cy - 80);
    ctx.lineTo(cx, cy + 110);
    ctx.stroke();

    // Caja inferior con metadatos del prompt y motor
    ctx.fillStyle = 'rgba(27, 28, 24, 0.92)';
    ctx.fillRect(14, height - 88, width - 28, 74);

    ctx.fillStyle = '#82cfff';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    const charNames = (characters || []).map((c) => c.handle || c.name).join(', ') || 'Sin @Personaje';
    ctx.fillText(
      `BOCETO SHITAGAKI [KOMA #${komaIndex + 1}] · ${penNib.toUpperCase()} · ${charNames} · SEED #${seed}`,
      26,
      height - 64
    );

    ctx.fillStyle = '#fbf9f3';
    ctx.font = '400 12px "Inter", sans-serif';
    const cleanText = (actionPrompt || 'Escena en construcción').slice(0, 72);
    const cleanText2 = (actionPrompt || '').slice(72, 144);
    ctx.fillText(cleanText, 26, height - 42);
    if (cleanText2) {
      ctx.fillText(cleanText2, 26, height - 24);
    }

    return canvas.toDataURL('image/png');
  },

  buildMasterPrompt({
    scenePrompt,
    styleName = 'Taíno Ancestral Ink',
    cameraAngle = 'low_angle',
    penNib = 'g_pen',
    castCharacters = [],
    isCover = false
  }) {
    const styleObj = this.STYLE_PRESETS[styleName] || this.STYLE_PRESETS['Taíno Ancestral Ink'];
    const camObj = this.CAMERA_ANGLES[cameraAngle] || this.CAMERA_ANGLES.low_angle;
    const nibObj = this.PEN_NIBS[penNib] || this.PEN_NIBS.g_pen;

    const castLockString =
      castCharacters.length > 0
        ? 'MAIN CHARACTER(S): ' +
          castCharacters
            .map((c) => {
              const anchors =
                Array.isArray(c.anchors) && c.anchors.length
                  ? `, visual anchors: ${c.anchors.join(', ')}`
                  : '';
              return `${c.name} (${c.appearance || ''}, wearing ${c.clothing || 'signature outfit'}${anchors})`;
            })
            .join(' AND ') +
          '. '
        : '';

    if (isCover) {
      return `High-contrast Japanese manga tankobon book cover illustration. ${castLockString}CAMERA: ${camObj.tokens}. SCENE: ${scenePrompt}. Masterpiece manga cover art, crisp Sumi ink lines with dramatic crimson and gold accents, no text, no watermark.`;
    }

    return `Single focused Japanese manga panel illustration. ${castLockString}CAMERA ANGLE: ${camObj.tokens}. SCENE ACTION: ${scenePrompt}. INK & PEN TECHNIQUE: ${nibObj.tokens}, ${styleObj.tokens}`;
  },

  async runDiagnostics() {
    const cfg = this.getConfig();
    try {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'diagnostics',
          clientKeys: {
            geminiKey: cfg.geminiApiKey,
            hfToken: cfg.hfToken,
            falKey: cfg.falKey
          }
        })
      });
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {}
    return { ok: false };
  },

  async generateImage(options = {}) {
    const cfg = this.getConfig();
    const chosenEngine = options.engine || cfg.engine || 'auto';
    const rawScenePrompt = options.actionPrompt || options.prompt || 'Escena dramática de manga en tinta Sumi';
    const castList = options.characters || options.castCharacters || (options.character ? [options.character] : []);
    const isCover = options.mode === 'cover' || Boolean(options.isCover);
    const cameraAngle = options.cameraAngle || 'low_angle';
    const penNib = options.penNib || 'g_pen';
    const komaIndex = Number(options.komaIndex) || 0;
    const width = Number(options.width) || 768;
    const height = Number(options.height) || 768;
    const seed = Number(options.seed) || Math.floor(1000 + Math.random() * 9000);

    // Si el usuario eligió explícitamente el Boceto Técnico Shitagaki Local (0ms)
    if (chosenEngine === 'shitagaki_local') {
      const draftUrl = this.renderOfflineDraftCanvas({
        komaIndex,
        penNib,
        cameraAngle,
        actionPrompt: rawScenePrompt,
        characters: castList,
        seed,
        width,
        height
      });
      return {
        url: draftUrl,
        provider: '📐 Boceto Shitagaki Local (0ms)',
        providerUsed: '📐 Boceto Shitagaki Local (0ms)',
        latencyMs: 4,
        compiledPrompt: rawScenePrompt
      };
    }

    const masterPrompt = this.buildMasterPrompt({
      scenePrompt: rawScenePrompt,
      styleName: options.styleName || 'Taíno Ancestral Ink',
      cameraAngle,
      penNib,
      castCharacters: castList,
      isCover
    });

    const t0 = Date.now();

    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      try {
        const srvResp = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'image',
            engine: chosenEngine,
            prompt: masterPrompt,
            seed,
            width,
            height,
            clientKeys: {
              geminiKey: cfg.geminiApiKey,
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
              provider: srvData.providerUsed || 'Serverless AI Engine',
              providerUsed: srvData.providerUsed || 'Serverless AI Engine',
              latencyMs: srvData.latencyMs || (Date.now() - t0),
              compiledPrompt: srvData.compiledPrompt || masterPrompt,
              diagnosticsLog: srvData.diagnosticsLog || []
            };
          }
        }
      } catch (err) {
        console.warn('[KAIMangaImageRouter] Error calling /api/generate:', err);
      }
    }

    // Fallback seguro en cliente: Boceto Técnico Shitagaki Local (sin marcas de agua ni errores de terceros)
    const fallbackUrl = this.renderOfflineDraftCanvas({
      komaIndex,
      penNib,
      cameraAngle,
      actionPrompt: rawScenePrompt,
      characters: castList,
      seed,
      width,
      height
    });

    return {
      url: fallbackUrl,
      provider: '📐 Boceto Shitagaki Local (Fallback Seguro)',
      providerUsed: '📐 Boceto Shitagaki Local (Fallback Seguro)',
      latencyMs: Date.now() - t0,
      compiledPrompt: masterPrompt
    };
  }
};
