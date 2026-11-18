import {
  ANACAONA_CHARACTER_PRESET,
  ANACAONA_COVER_PROMPT_PRESET,
  ANACAONA_PAGE_1_SCRIPT_PRESET,
} from './prompts';

export type CharacterStatus = 'draft' | 'approved';
export type PaperType = 'cream' | 'white';

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
  referenceImage?: string;
}

export interface MangaPage {
  id: string;
  pageNumber: number;
  artStyle: string;
  prompt: string;
  castIds: string[];
  image?: string;
  modelUsed?: string;
}

export interface MangaProject {
  id: string;
  title: string;
  author?: string;
  premise: string;
  genre: string;
  world: string;
  worldRules: string;
  worldLocked: boolean;
  paperType?: PaperType;
  totalPages?: number;
  paperThicknessMm?: number;
  coverPrompt?: string;
  coverWrapImage?: string;
  selectedModel?: string;
  characters: MangaCharacter[];
  pages?: MangaPage[];
  version: 1;
  updatedAt: string;
}

export function defaultPages(castIds: string[] = []): MangaPage[] {
  return [
    {
      id: 'page-1',
      pageNumber: 1,
      artStyle: 'Dark Seinen',
      prompt: ANACAONA_PAGE_1_SCRIPT_PRESET,
      castIds,
      image: '',
      modelUsed: '',
    },
  ];
}

export const exampleProject: MangaProject = {
  id: 'anacaona-vol-1',
  version: 1,
  updatedAt: '2026-11-17',
  title: 'Anacaona: Flor de Guerra',
  author: 'Studio MANGAI',
  premise:
    'En una isla caribeña ancestral, Anacaona percibe el silencio repentino de la selva antes de avistar las primeras velas en el horizonte.',
  genre: 'Fantasía Histórica Caribeña',
  world:
    'Quisqueya en vísperas del choque de mundos: selvas densas, costas escarpadas, sabiduría taína y honor cacicazgo.',
  worldRules:
    'Estética seinen en blanco y negro de alto contraste para páginas interiores; color editorial cálido caribeño solo para la cubierta.',
  worldLocked: true,
  paperType: 'cream',
  totalPages: 100,
  paperThicknessMm: 0.12,
  coverPrompt: ANACAONA_COVER_PROMPT_PRESET,
  coverWrapImage: '',
  selectedModel: 'gemini-3-pro-image',
  characters: [
    {
      id: 'anacaona',
      name: ANACAONA_CHARACTER_PRESET.name,
      role: ANACAONA_CHARACTER_PRESET.role,
      age: ANACAONA_CHARACTER_PRESET.age,
      appearance: ANACAONA_CHARACTER_PRESET.appearance,
      personality: 'Serena, perspicaz, valiente y protectora de su pueblo.',
      motivation: 'Advertir al poblado antes de la llegada de los navíos extranjeros.',
      wardrobe: ANACAONA_CHARACTER_PRESET.wardrobe,
      visualStyle: ANACAONA_CHARACTER_PRESET.visualStyle,
      status: 'approved',
      canonLocked: true,
      referenceImage: '',
    },
  ],
  pages: defaultPages(['anacaona']),
};

export function blankCharacter(): MangaCharacter {
  return {
    id: crypto.randomUUID(),
    name: '',
    role: 'Protagonist',
    age: '',
    appearance: '',
    personality: '',
    motivation: '',
    wardrobe: '',
    visualStyle: 'Dark Seinen',
    status: 'draft',
    canonLocked: false,
    referenceImage: '',
  };
}
