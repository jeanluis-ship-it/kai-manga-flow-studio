export const GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-image';
export const GEMINI_TEXT_MODEL = 'gemini-3.1-flash-lite';

export const AI_MODELS = [
  {
    id: GEMINI_IMAGE_MODEL,
    label: 'Gemini 3.1 Flash Image (Oficial)',
    provider: 'google',
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
      'Produce a wide 16:9 unified manga paperback wrap-around book cover (spread layout). RIGHT HALF = Front Cover featuring the main character illustration and dramatic atmosphere. CENTER STRIP = narrow vertical spine divider band. LEFT HALF = Back Cover with cohesive environmental background and clean space at bottom-left for synopsis and ISBN barcode. Vibrant editorial illustration.',
  },
  {
    id: 'panel',
    label: '3:4 Interior Manga Panel',
    instruction:
      'Produce an authentic Japanese manga interior illustration with crisp Sumi G-Pen ink linework, dynamic halftone screentones, high-contrast chiaroscuro shadows, and expressive dramatic framing. No speech bubbles, no watermarks.',
  },
  {
    id: 'sketch_refine',
    label: 'Drawing Tablet Nemu Sketch Refinement',
    instruction:
      'Use the attached hand-drawn digital sketch (Nemu draft) as the primary structural blueprint. Preserve the artist composition, character pose, camera angle, and silhouettes while upgrading and cleaning the draft into publication-grade Japanese manga lineart, refined anatomy, expressive ink weights, and clean screentones. No speech bubbles, no watermarks.',
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
