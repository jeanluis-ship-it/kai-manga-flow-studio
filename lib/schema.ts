export type CharacterStatus = 'draft' | 'approved';
export type KomaState = 'VACIO' | 'NEMU' | 'PEN_IRE' | 'TONE_FX' | 'SHIAGE' | 'LOCKED';
export type ProductionRoute = 'manual' | 'ia';

export const KOMA_STATES: { id: KomaState; label: string; step: string }[] = [
  { id: 'VACIO', label: 'Vacío', step: 'S0' },
  { id: 'NEMU', label: 'Nemu (Borrador)', step: 'S1' },
  { id: 'PEN_IRE', label: 'Pen-ire (Tinta)', step: 'S2' },
  { id: 'TONE_FX', label: 'Tramas y FX', step: 'S3' },
  { id: 'SHIAGE', label: 'Shiage (Rotulado)', step: 'S4' },
  { id: 'LOCKED', label: 'Bloqueada', step: 'S5' },
];

export interface KomaPanel {
  id: string;
  panelIndex: number;
  state: KomaState;
  route: ProductionRoute;
  cameraAngle: string;
  actionPrompt: string;
  dialogueL5: string;
  sfxL4: string;
  screentoneL1: string;
}

export interface MangaCharacter {
  id: string;
  name: string;
  role: string;
  age: string;
  appearance: string;
  personality: string;
  motivation: string;
  wardrobe: string;
  visualStyle: string;
  status: CharacterStatus;
  canonLocked: boolean;
}
export interface MangaProject {
  id: string;
  title: string;
  premise: string;
  genre: string;
  world: string;
  worldRules: string;
  worldLocked: boolean;
  characters: MangaCharacter[];
  komas?: KomaPanel[];
  totalPages?: number;
  paperThicknessMm?: number;
  version: 1;
  updatedAt: string;
}

export function defaultKomas(): KomaPanel[] {
  return [
    {
      id: 'koma-1',
      panelIndex: 1,
      state: 'NEMU',
      route: 'ia',
      cameraAngle: 'Plano general cenital',
      actionPrompt: 'Vista del puerto nocturno bajo la niebla; las linternas dibujan líneas sobre los mapas húmedos.',
      dialogueL5: 'Cada noche, la costa cambia de lugar.',
      sfxL4: 'ザワ… (Zawa…)',
      screentoneL1: '60L_suave',
    },
    {
      id: 'koma-2',
      panelIndex: 2,
      state: 'PEN_IRE',
      route: 'ia',
      cameraAngle: 'Plano medio contrapicado',
      actionPrompt: 'Mira sostiene un pergamino iluminado; el viento agita su cabello corto y deja ver la cicatriz sobre su ceja.',
      dialogueL5: 'Este trazado no existía ayer.',
      sfxL4: 'バッ (Ba!)',
      screentoneL1: '60L_dramatico',
    },
    {
      id: 'koma-3',
      panelIndex: 3,
      state: 'VACIO',
      route: 'manual',
      cameraAngle: 'Primerísimo plano',
      actionPrompt: 'Detalle de los ojos ámbar de Mira reflejando líneas doradas en el mapa.',
      dialogueL5: '',
      sfxL4: 'ドキッ (Doki!)',
      screentoneL1: 'none',
    },
    {
      id: 'koma-4',
      panelIndex: 4,
      state: 'VACIO',
      route: 'ia',
      cameraAngle: 'Plano americano tres cuartos',
      actionPrompt: 'Ren aparece entre las sombras del muelle con su gabardina geométrica y guantes negros.',
      dialogueL5: 'Guarda ese mapa antes de que la ciudad te cobre el precio.',
      sfxL4: 'コツン (Kotsun)',
      screentoneL1: '60L_dramatico',
    },
  ];
}

export const exampleProject: MangaProject = {
  id: 'demo-project', version: 1, updatedAt: '2026-11-13',
  title: 'Los mapas del olvido',
  premise: 'Una joven cartógrafa descubre que los mapas de su ciudad cambian cada noche.',
  genre: 'Fantasía y misterio',
  world: 'Una ciudad portuaria donde los mapas revelan territorios borrados de la memoria.',
  worldRules: 'Solo los cartógrafos pueden leer los mapas cambiantes; cada territorio revelado exige un recuerdo a cambio.',
  worldLocked: false,
  totalPages: 192,
  paperThicknessMm: 0.12,
  komas: defaultKomas(),
  characters: [
    { id: 'mira', name: 'Mira', role: 'Protagonista', age: '19', appearance: 'Cabello negro corto y ondulado, ojos ámbar, pequeña cicatriz sobre la ceja izquierda.', personality: 'Curiosa, impulsiva, leal.', motivation: 'Encontrar a su hermano desaparecido.', wardrobe: 'Chaqueta azul oscuro, bolso de cuero lleno de mapas.', visualStyle: 'Manga en tinta blanco y negro, tramas finas y contraste dramático.', status: 'approved', canonLocked: true },
    { id: 'ren', name: 'Ren', role: 'Rival', age: '22', appearance: 'Cabello blanco recogido, ojos grises, guantes negros.', personality: 'Meticuloso, reservado.', motivation: 'Proteger el secreto de los mapas.', wardrobe: 'Gabardina larga con símbolos geométricos.', visualStyle: 'Manga en tinta blanco y negro, tramas finas y contraste dramático.', status: 'draft', canonLocked: false },
  ],
};
export function blankCharacter(): MangaCharacter {
  return { id: crypto.randomUUID(), name: 'Nuevo personaje', role:'Secundario', age:'', appearance:'', personality:'', motivation:'', wardrobe:'', visualStyle:'Manga blanco y negro, entintado profesional, sombreado con screentones.', status:'draft', canonLocked:false };
}
