/**
 * KAI ENGINE v3.0 — Cliente de Orquestación IA (Gemini API + Generador Visual Manga B/N)
 * Soporta ejecución con Gemini API Key real (JSON estructurado) y Fallback Dinámico Local,
 * más renderizado real de viñetas en blanco y negro sin texto superpuesto.
 */

const KAI_SYSTEM_PROMPT_V3 = `Eres KAI v3.0, Director Editorial de KAI Studio (República Dominicana).
Transforma la idea del usuario en un JSON estructurado para maquetar la Página 1 de un manga en formato Tankobon (12.7x19cm) con 4 viñetas (estructura Kishotenketsu: Ki, Sho, Ten, Ketsu).
REGLAS:
1. Tono 90% precisión editorial, 10% sabor dominicano geek ("manito", "demasiado aura", "quedó clean") salvo que pidan tono neutro.
2. En Clean_Art_Prompt_No_Text escribe SIEMPRE en inglés un prompt detallado de manga blanco y negro (high contrast black ink, manga screentones, masterpiece lineart, NO SPEECH BUBBLES, NO TEXT) inyectando los rasgos fijos del protagonista (locked_visual_traits).
3. Máximo 20 palabras en español por diálogo.
Devuelve ÚNICAMENTE un objeto JSON válido con las claves:
{
  "project_title": "Título épico en español",
  "synopsis_es": "Sinopsis de 2 líneas para contraportada",
  "kai_greeting": "Comentario entusiasta de KAI explicando el gancho de la página",
  "options_next": {
    "A": "Ruta A (Acción directa)",
    "B": "Ruta B (Misterio/Tensión)",
    "C": "Ruta C (Lore/Giro inesperado)"
  },
  "character_vault": {
    "char_id": "char_01",
    "name": "Nombre del protagonista",
    "locked_visual_traits": "Rasgos físicos invariables en inglés (edad, peinado, ropa, rasgo único)"
  },
  "panels": [
    {
      "id": 1,
      "stage": "Ki (Introducción)",
      "camera": "Wide Establishing Shot",
      "Clean_Art_Prompt_No_Text": "black and white manga panel, high contrast ink, screentones, NO TEXT...",
      "dialogue_es": "Texto del globo o narrador (máx 20 palabras)",
      "speaker": "Narrador o Personaje",
      "sfx": "¡ZAAAP!"
    }
  ]
}`;

window.KAIEngine = {
  getApiKey() {
    return localStorage.getItem('kai_gemini_api_key') || '';
  },

  setApiKey(key) {
    localStorage.setItem('kai_gemini_api_key', (key || '').trim());
  },

  /**
   * Construye URL de imagen de viñeta en blanco y negro (capa limpia sin globos)
   */
  buildMangaPanelImageUrl(cleanPrompt, seedNum, width = 768, height = 512) {
    const stylePrefix = "authentic Japanese black and white manga panel illustration, heavy sumi ink lineart, halftone screentones, high contrast monochrome, no text, no speech bubbles, ";
    const encoded = encodeURIComponent(stylePrefix + cleanPrompt);
    return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seedNum}&nologo=true`;
  },

  /**
   * Genera el proyecto completo (Guion + Character Vault + 4 Viñetas) usando Gemini API si hay clave,
   * o síntesis estructurada dinámica basada en el input del usuario si aún no ha puesto API key.
   */
  async generateStoryAndPage(ideaText, audienceType, toneMode) {
    const apiKey = this.getApiKey();

    if (apiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: KAI_SYSTEM_PROMPT_V3 }] },
              contents: [{
                role: 'user',
                parts: [{
                  text: `Idea del usuario: "${ideaText}". Público/Enfoque: "${audienceType}". Tono del asistente: "${toneMode}". Genera las 4 viñetas de la Página 1.`
                }]
              }],
              generationConfig: {
                temperature: 0.75,
                responseMimeType: 'application/json'
              }
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            return JSON.parse(rawText);
          }
        }
      } catch (err) {
        console.warn('Fallo en llamada a Gemini API, activando síntesis local:', err);
      }
    }

    // Síntesis Dinámica Instantánea (Zero-Config Fallback) adaptada al texto del usuario
    const cleanIdea = ideaText.trim() || 'Guerrero ancestral despierta poderes en Santo Domingo';
    const words = cleanIdea.split(/\s+/);
    const shortTitle = words.slice(0, 4).join(' ').toUpperCase();
    const isCriollo = toneMode === 'criollo';

    const visualTraits = audienceType.includes('Taíno')
      ? 'young fierce Caribbean Taino warrior, braided dark hair, glowing golden Guanin medallion, ancestral carved armor, sharp eyes'
      : audienceType.includes('Seinen')
      ? 'gritty cyberpunk Dominican protagonist, tactical trenchcoat, cybernetic arm with glowing runes, scar on eyebrow, intense gaze'
      : 'determined young manga protagonist, dynamic spiky dark hair, high-collar battle jacket, glowing energy aura';

    return {
      project_title: `${shortTitle}: EL DESPERTAR`,
      synopsis_es: `${cleanIdea}. Una obra creada en KAI Studio lista para edición impresa en formato físico.`,
      kai_greeting: isCriollo
        ? `¡Esa premisa tiene demasiado aura, manito! Bloqueé la semilla visual para "${cleanIdea}" en el Character Vault y maqueté las 4 viñetas iniciales con estructura Kishōtenketsu.`
        : `Premisa registrada para "${cleanIdea}". He bloqueado los descriptores visuales invariables en el Character Vault y estructurado los 4 paneles de la Página 1.`,
      options_next: {
        A: `Desatar un contraataque devastador en plano contrapicado con líneas de velocidad.`,
        B: `Silencio tenso en primerísimo plano (Extreme Close-Up) antes del choque.`,
        C: `Revelar el origen oculto del poder ancestral mediante un símbolo brillante.`
      },
      character_vault: {
        char_id: 'char_01',
        name: words[0] ? words[0].replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '') : 'Yael',
        locked_visual_traits: visualTraits
      },
      panels: [
        {
          id: 1,
          stage: 'Ki (Introducción)',
          camera: 'Wide Establishing Shot',
          Clean_Art_Prompt_No_Text: `dramatic wide establishing shot, ${cleanIdea}, ${visualTraits}, atmospheric background, heavy rain and shadows, Kentaro Miura and Yusuke Murata manga style`,
          dialogue_es: `Nadie imaginó que aquel día cambiaría el destino de nuestra tierra: ${cleanIdea}.`,
          speaker: 'Narrador',
          sfx: '¡ZUUUUM!'
        },
        {
          id: 2,
          stage: 'Shō (Desarrollo)',
          camera: 'Medium Action Shot',
          Clean_Art_Prompt_No_Text: `medium shot, menacing shadow threat emerging in the dark, dramatic manga crosshatching, tense confrontation, ${visualTraits} standing firm`,
          dialogue_es: `¡Las sombras se están moviendo más rápido de lo normal!`,
          speaker: 'Voz',
          sfx: '¡SHHHK!'
        },
        {
          id: 3,
          stage: 'Ten (Giro / Tensión)',
          camera: 'Extreme Close-Up Eyes',
          Clean_Art_Prompt_No_Text: `extreme close-up on intense eyes glowing with spiritual energy, ${visualTraits}, dramatic manga screentones and speedlines`,
          dialogue_es: `Si quieren apagar nuestra historia, tendrán que pasar por encima de mí.`,
          speaker: 'Protagonista',
          sfx: '¡BZZZT!'
        },
        {
          id: 4,
          stage: 'Ketsu (Clímax de Página)',
          camera: 'Dynamic Low-Angle Slash',
          Clean_Art_Prompt_No_Text: `epic low angle dynamic action pose, ${visualTraits} unleashing blinding ancestral energy slash, explosive manga impact frames, black ink splatters`,
          dialogue_es: `¡Despierta ahora y rompe el silencio!`,
          speaker: 'Protagonista',
          sfx: '¡DOOOOM!'
        }
      ]
    };
  }
};
