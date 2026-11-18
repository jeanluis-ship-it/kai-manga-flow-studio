export const AI_MODELS = [
  {
    id: 'gemini-3-pro-image',
    label: '🍌 Nano Banana Pro (Calidad Estudio / Video)',
    provider: 'google',
  },
  {
    id: 'gemini-nano-banana-2.1',
    label: '🍌 Nano Banana 2.1 (Consistencia Multi-Vista)',
    provider: 'google',
  },
  {
    id: 'gemini-3.1-flash-lite-image',
    label: '⚡ Nano Banana 2 Lite (Boceto Rápido)',
    provider: 'google',
  },
  {
    id: 'imagen-3.0-generate-002',
    label: '🎨 Google Imagen 3.0 HD',
    provider: 'google',
  },
  {
    id: 'gpt-image-2.5-flare',
    label: '✨ OpenAI GPT-Image 2.5 Flare',
    provider: 'openai',
  },
] as const;

export type AIModelId = (typeof AI_MODELS)[number]['id'];

export const MANGA_STYLES = [
  'Classic Shonen',
  'Dark Seinen',
  'Modern Shojo',
  'Retro Gekiga',
  'Cyberpunk Manga',
  'Manga blanco y negro con tramas y entintado profesional',
  'Concept art a color para portada de tankōbon',
] as const;

export const IMAGE_MODES = [
  {
    id: 'sheet',
    label: 'Character Turnaround Sheet',
    instruction:
      'Produce an editorial manga character turnaround reference sheet on a clean plain white background showing front view, three-quarter view, side profile, back view, and facial close-up. Crisp ink linework, identical proportions across views. No speech bubbles, no text labels, no watermarks.',
  },
  {
    id: 'cover_wrap',
    label: '16:9 Paperback Full Wrap',
    instruction:
      'Produce a wide 16:9 unified manga paperback wrap-around book cover (spread layout). RIGHT HALF = Front Cover featuring the main character illustration, dramatic atmosphere and stylized title ANACAONA. CENTER STRIP = narrow vertical spine divider band. LEFT HALF = Back Cover with cohesive environmental background, atmospheric composition, and space at bottom-left for a synopsis box and ISBN barcode. Vibrant editorial fantasy illustration.',
  },
  {
    id: 'panel',
    label: '3:4 Interior Manga Page',
    instruction:
      'Produce a complete black-and-white Japanese manga comic page divided dynamically into sequential story panels following the exact scene layout and panel numbers described. Crisp Sumi G-Pen ink linework, authentic halftone screentones, high-contrast chiaroscuro shadows, expressive dramatic framing, clean Japanese-style speech balloons containing the Spanish dialogue clearly legible when specified. No watermarks.',
  },
  {
    id: 'portrait',
    label: 'Retrato',
    instruction:
      'Produce a single clear character concept portrait, mid-torso framing, clean background, crisp manga ink. No typography.',
  },
] as const;

export const ANACAONA_CHARACTER_PRESET = {
  name: 'Anacaona',
  role: 'Protagonista · Heroína Taína',
  age: '21',
  appearance:
    'Mujer joven adulta de rasgos indígenas caribeños, piel cobriza cálida, rostro ovalado, pómulos marcados y ojos almendrados color ámbar oscuro. Cabello negro, largo y lacio hasta la cintura, con dos pequeñas trenzas enmarcando el rostro. Cejas pobladas, labios definidos y mirada firme y expresiva. Complexión atlética y ágil. Mantener los mismos rasgos, tono de piel y peinado en todas las escenas.',
  wardrobe:
    'Vestimenta de fantasía inspirada en la cultura taína: conjunto de algodón color marfil, con una pieza superior sin mangas y falda hasta las rodillas con aberturas laterales para facilitar el movimiento. Cinturón tejido con patrones geométricos en rojo terracota. Collar con una piedra verde central, pequeños pendientes de oro y brazaletes tejidos. Pies descalzos. Paleta constante: marfil, terracota, verde jade y dorado envejecido.',
  visualStyle: 'Dark Seinen',
};

export const ANACAONA_COVER_PROMPT_PRESET =
  'Cubierta completa para el manga "ANACAONA: FLOR DE GUERRA — VOL. I". Una ilustración continua que conecta contraportada a la izquierda, lomo en el centro y portada frontal a la derecha en un paisaje de bosque tropical caribeño antiguo al amanecer sobre un acantilado costero con nubes épicas. En la portada (derecha): Anacaona de pie, mirando con determinación, con su túnica marfil, cinturón rojo terracota y collar verde jade, sosteniendo una pequeña flor roja en la mano.';

export const ANACAONA_PAGE_1_SCRIPT_PRESET = `Página 1 de "ANACAONA: FLOR DE GUERRA". Manga de fantasía histórica caribeña. Blanco y negro, tinta detallada, negros profundos, tramas y luz dramática.
Página vertical con cinco viñetas. Lectura de derecha a izquierda y de arriba abajo.
VIÑETA 1 — Panorámica horizontal superior. Amanece sobre una costa caribeña. Selva espesa, montañas y neblina sobre el agua. Caja de narración: "Aquella mañana, el bosque dejó de cantar."
VIÑETA 2 — Centro, derecha. Anacaona camina descalza entre las raíces de una enorme ceiba. Lleva una pequeña flor en la mano. Su cabello largo y su capa se mueven suavemente con la brisa.
VIÑETA 3 — Centro, izquierda. Primer plano de su rostro. Se detiene y levanta la mirada al escuchar una bandada de aves salir bruscamente de los árboles. Anacaona en un pequeño globo: "¿Qué ocurre...?"
VIÑETA 4 — Franja horizontal estrecha. Detalle de su mano soltando la flor mientras empieza a correr. Los pétalos quedan suspendidos sobre las raíces. Líneas de movimiento discretas.
VIÑETA 5 — Viñeta grande inferior. Vista desde detrás de Anacaona, que acaba de llegar a un acantilado. En el horizonte aparecen tres barcos de grandes velas, pequeños pero claramente reconocibles entre la bruma. Anacaona: "Tengo que avisar al poblado."`;
