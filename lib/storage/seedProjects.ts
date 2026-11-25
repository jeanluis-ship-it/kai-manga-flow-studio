import { KOMA_LAYOUT_PRESETS, getPolygonBounds } from '@/lib/kai/schema';
import { computeSpineInches, type TrimFormatId } from '@/lib/print/presets';
import {
  DEFAULT_LAYERS_VISIBILITY,
  DEFAULT_LAYER_OPACITY,
  type BindingType,
  type Character,
  type ColorMode,
  type Koma,
  type Page,
  type PaperType,
  type Project,
} from '@/app/studio/types';

interface VolumeSeedPreset {
  volumeSlug: string;
  name: string;
  author: string;
  pageCount: number;
  paperType: PaperType;
  colorMode: ColorMode;
  bindingType: BindingType;
  trimFormat: TrimFormatId;
  readingDirection: 'rtl' | 'ltr';
  isbn: string;
  spineTitle: string;
  backSynopsis: string;
  coverPrompt: string;
  frontArt: string;
  backArt: string;
  wrapArt: string;
  characters: Character[];
  pages: Array<{
    artStyle: string;
    layoutTemplate: keyof typeof KOMA_LAYOUT_PRESETS;
    chapterBeat: string;
    panels: Array<{
      cameraAngle: string;
      taggedHandles: string[];
      actionPrompt: string;
      inkRenderUrl?: string;
      dialogues: Array<{ speaker: string; style: 'normal' | 'shout' | 'whisper' | 'thought' | 'narrator' | 'system'; text: string }>;
      sfx?: string;
    }>;
  }>;
}

function buildSeedPages(preset: VolumeSeedPreset): Page[] {
  return preset.pages.map((pg, pIdx) => {
    const pageId = `${preset.volumeSlug}-page-${pIdx + 1}`;
    const layout = KOMA_LAYOUT_PRESETS[pg.layoutTemplate] ?? KOMA_LAYOUT_PRESETS['4_panel_classic'];

    const komas: Koma[] = layout.panels.map((coords, kIdx) => {
      const src = pg.panels[kIdx];
      const b = getPolygonBounds(coords);
      return {
        id: `${pageId}-koma-${kIdx + 1}`,
        panelIndex: kIdx + 1,
        state: src?.inkRenderUrl ? 'TONE_FX' : 'NEMU',
        polygonCoords: coords,
        cameraAngle: src?.cameraAngle || 'Plano Medio',
        taggedHandles: src?.taggedHandles ?? [],
        actionPrompt: src?.actionPrompt || '',
        inkRenderUrl: src?.inkRenderUrl,
        screentonePreset: kIdx === 0 ? 'dots_15' : 'none',
        speedlinePreset: pg.layoutTemplate === '5_panel_action' && kIdx === 1 ? 'ryusen' : 'none',
        dialogues: (src?.dialogues ?? []).map((d, dIdx) => {
          const x = Number(
            Math.min(82, Math.max(18, b.left + b.width * (dIdx % 2 === 0 ? 0.3 : 0.7))).toFixed(1),
          );
          const y = Number(
            Math.min(84, Math.max(15, b.top + Math.min(b.height * 0.32, 10) + dIdx * 8)).toFixed(1),
          );
          return {
            id: `${pageId}-d-${kIdx}-${dIdx}`,
            speaker: d.speaker,
            style: d.style,
            text: d.text,
            x,
            y,
            tailX: Number(Math.min(88, Math.max(12, x + 6)).toFixed(1)),
            tailY: Number(Math.min(88, y + 7).toFixed(1)),
            fontSize: 2.35,
            width: 21,
          };
        }),
        sfxItems: src?.sfx
          ? [
              {
                id: `${pageId}-sfx-${kIdx}`,
                text: src.sfx,
                x: Number(Math.min(84, Math.max(16, b.left + b.width * 0.72)).toFixed(1)),
                y: Number(Math.min(86, Math.max(14, b.top + b.height * 0.76)).toFixed(1)),
                rotation: -8,
                fontSize: 4.1,
              },
            ]
          : [],
      };
    });

    return {
      id: pageId,
      base64: '',
      prompt: pg.chapterBeat,
      artStyle: pg.artStyle,
      castIds: preset.characters.map((c) => c.id),
      layoutTemplate: pg.layoutTemplate,
      chapterBeat: pg.chapterBeat,
      layersVisibility: { ...DEFAULT_LAYERS_VISIBILITY },
      layerOpacity: { ...DEFAULT_LAYER_OPACITY },
      komas,
    };
  });
}

const VOLUME_PRESETS: Record<string, VolumeSeedPreset> = {
  'anacaona-vol1': {
    volumeSlug: 'anacaona-vol1',
    name: 'AnaCaona: Flor Guerrera',
    author: 'MANGAI Editorial · Caribe',
    pageCount: 144,
    paperType: 'cream',
    colorMode: 'bw',
    bindingType: 'rustica_pegada',
    trimFormat: 'tankobon_b6',
    readingDirection: 'rtl',
    isbn: '978-9945-1001-1-8',
    spineTitle: 'ANACAONA · VOL. I',
    backSynopsis:
      'Bajo la tormenta de Quisqueya, la cacica poeta AnaCaona empuña el guanín sagrado para defender su cacicazgo en tinta sumi y acero.',
    coverPrompt:
      'Taino warrior queen AnaCaona standing defiantly in a moonlit Caribbean rainforest, ceremonial golden guanin medallion, hibiscus flower, dramatic sumi ink and crimson accents',
    frontArt: '/landing/assets/mangai-art-06.svg',
    backArt: '/landing/assets/mangai-art-11.svg',
    wrapArt: '/landing/assets/mangai-art-22.svg',
    characters: [
      {
        id: 'anacaona-char-1',
        entityType: 'character',
        tagHandle: '@AnaCaona',
        name: 'AnaCaona',
        appearance:
          'Guerrera y poeta taína de mirada indomable, cabello largo azabache trenzado con flor de cayena, rasgos afilados en estilo seinen.',
        clothing:
          'Atavío ceremonial con bandolera tejida, brazaletes de algodón y colgante dorado Guanín al pecho.',
        role: 'Protagonista · Cacica de Jaragua',
        activeInCanon: true,
        visualAnchors: ['Flor de cayena en el oído izquierdo', 'Colgante Guanín solar', 'Tatuaje geométrico taíno en hombro'],
        seedLocked: true,
        characterSeed: 'SEED-149201',
        referenceBase64: '/landing/assets/mangai-art-21.svg',
        referenceViews: {
          turnaround: '/landing/assets/mangai-art-21.svg',
          front: '/landing/assets/mangai-art-06.svg',
        },
      },
      {
        id: 'anacaona-prop-1',
        entityType: 'prop',
        tagHandle: '@GuaninSolar',
        name: 'Guanín Ceremonial',
        appearance: 'Disco ceremonial de oro y cobre grabado con espirales taínas de cohoba.',
        clothing: 'Suspendido en cordón trenzado de fibra de cabuya.',
        role: 'Reliquia de Mando',
        activeInCanon: true,
        visualAnchors: ['Espirales concéntricas grabadas', 'Brillo metálico entre sombras'],
        seedLocked: true,
        characterSeed: 'SEED-149202',
        referenceBase64: '/landing/assets/mangai-art-12.svg',
      },
      {
        id: 'anacaona-loc-1',
        entityType: 'location',
        tagHandle: '@SelvaQuisqueya',
        name: 'Selva de Jaragua',
        appearance: 'Bosque tropical nocturno azotado por lluvia monzónica, ceibas colosales y niebla.',
        clothing: '',
        role: 'Escenario Acto I',
        activeInCanon: true,
        visualAnchors: ['Ceibas gigantes con raíces tabulares', 'Lluvia oblicua en tramas G-Pen'],
        seedLocked: true,
        characterSeed: 'SEED-149203',
        referenceBase64: '/landing/assets/mangai-art-14.svg',
      },
      {
        id: 'anacaona-lore-1',
        entityType: 'lore_rule',
        tagHandle: '@JuramentoAreito',
        name: 'Cantos del Areíto',
        appearance: 'Cada verso cantado en el batey despierta la memoria ancestral de los cemíes.',
        clothing: '',
        role: 'Regla de Universo',
        activeInCanon: true,
        visualAnchors: ['Caligrafía de humo luminoso sobre tinta negra'],
        seedLocked: true,
        characterSeed: 'SEED-149204',
      },
    ],
    pages: [
      {
        artStyle: 'Dark Seinen',
        layoutTemplate: '4_panel_classic',
        chapterBeat: 'Capítulo 1: El Despertar de Quisqueya bajo la tormenta nocturna.',
        panels: [
          {
            cameraAngle: 'Plano General / Establishing',
            taggedHandles: ['@SelvaQuisqueya', '@AnaCaona'],
            actionPrompt: 'Panorámica nocturna de ceibas gigantes bajo lluvia intensa; silueta de @AnaCaona en la cima del barranco.',
            inkRenderUrl: '/landing/assets/mangai-art-12.svg',
            dialogues: [
              { speaker: 'Narrador', style: 'narrator', text: 'Esa noche, la lluvia no borró los cantos del batey.' },
            ],
            sfx: 'ゴゴゴ…',
          },
          {
            cameraAngle: 'Primer Plano Emocional',
            taggedHandles: ['@AnaCaona', '@GuaninSolar'],
            actionPrompt: 'Primer plano de @AnaCaona sosteniendo el @GuaninSolar mientras el viento agita su cabello.',
            inkRenderUrl: '/landing/assets/mangai-art-19.svg',
            dialogues: [
              { speaker: '@AnaCaona', style: 'normal', text: 'Mientras el oro recuerde nuestro nombre, Jaragua no caerá.' },
            ],
          },
          {
            cameraAngle: 'Detalle / Inserto',
            taggedHandles: ['@GuaninSolar', '@JuramentoAreito'],
            actionPrompt: 'Inserto dramático del colgante @GuaninSolar destellando entre gotas de lluvia.',
            inkRenderUrl: '/landing/assets/mangai-art-14.svg',
            dialogues: [],
            sfx: 'キラン!',
          },
          {
            cameraAngle: 'Contrapicado Heroico',
            taggedHandles: ['@AnaCaona'],
            actionPrompt: 'Contrapicado de @AnaCaona avanzando entre la bruma hacia el consejo nocturno.',
            inkRenderUrl: '/landing/assets/mangai-art-20.svg',
            dialogues: [
              { speaker: '@AnaCaona', style: 'shout', text: '¡Enciendan las antorchas del areíto!' },
            ],
            sfx: 'ドン!!',
          },
        ],
      },
    ],
  },
  'huracan-vol2': {
    volumeSlug: 'huracan-vol2',
    name: 'Hijos del Huracán',
    author: 'Estudio Alisio',
    pageCount: 168,
    paperType: 'white',
    colorMode: 'color',
    bindingType: 'rustica_pegada',
    trimFormat: 'b4_canva_pro',
    readingDirection: 'rtl',
    isbn: '978-9945-2002-2-4',
    spineTitle: 'HIJOS DEL HURACÁN · VOL. II',
    backSynopsis:
      'Flotas de vela solar cruzan el archipiélago suspendido entre tormentas eternas rumbo al Ojo Celeste.',
    coverPrompt:
      'Skyship fleet with billowing solar sails carving through towering storm clouds above floating tropical islands, vibrant shonen adventure color cover',
    frontArt: '/landing/assets/mangai-art-05.svg',
    backArt: '/landing/assets/mangai-art-22.svg',
    wrapArt: '/landing/assets/mangai-art-05.svg',
    characters: [
      {
        id: 'huracan-char-1',
        entityType: 'character',
        tagHandle: '@CapitanaAlisio',
        name: 'Capitana Alisio',
        appearance: 'Navegante intrépida de ojos ámbar, gafas de vuelo en la frente y sonrisa desafiante.',
        clothing: 'Abrigo azul cobalto de capitán aéreo, guantes de cuero y brújula barométrica.',
        role: 'Protagonista · Capitana del Alisio',
        activeInCanon: true,
        visualAnchors: ['Gafas de bronce en frente', 'Bufanda carmesí al viento', 'Brújula en muñeca derecha'],
        seedLocked: true,
        characterSeed: 'SEED-882201',
        referenceBase64: '/landing/assets/mangai-art-06.svg',
        referenceViews: {
          front: '/landing/assets/mangai-art-06.svg',
          turnaround: '/landing/assets/mangai-art-21.svg',
        },
      },
      {
        id: 'huracan-prop-1',
        entityType: 'prop',
        tagHandle: '@VeleroSolar',
        name: 'Bergantín Vela Solar',
        appearance: 'Navío aéreo de casco ligero con velas translúcidas doradas que capturan relámpagos.',
        clothing: '',
        role: 'Nave Principal',
        activeInCanon: true,
        visualAnchors: ['Velas hexagonales doradas', 'Timón de latón suspendido'],
        seedLocked: true,
        characterSeed: 'SEED-882202',
        referenceBase64: '/landing/assets/mangai-art-05.svg',
      },
      {
        id: 'huracan-loc-1',
        entityType: 'location',
        tagHandle: '@ArchipielagoTormenta',
        name: 'Archipiélago del Ojo Celeste',
        appearance: 'Islas tropicales flotantes rodeadas por murallas de cumulonimbos y rayos rojos.',
        clothing: '',
        role: 'Escenario Principal',
        activeInCanon: true,
        visualAnchors: ['Cascadas cayendo al vacío', 'Anillo de tormentas en el horizonte'],
        seedLocked: true,
        characterSeed: 'SEED-882203',
        referenceBase64: '/landing/assets/mangai-art-13.svg',
      },
    ],
    pages: [
      {
        artStyle: 'Classic Shonen',
        layoutTemplate: '5_panel_action',
        chapterBeat: 'Zarpar hacia el Ojo Celeste cortando la corriente de relámpagos.',
        panels: [
          {
            cameraAngle: 'Plano General / Establishing',
            taggedHandles: ['@VeleroSolar', '@ArchipielagoTormenta'],
            actionPrompt: 'El @VeleroSolar despliega sus velas doradas entre las islas del @ArchipielagoTormenta.',
            inkRenderUrl: '/landing/assets/mangai-art-05.svg',
            dialogues: [
              { speaker: 'Narrador', style: 'narrator', text: 'A tres mil metros sobre el mar de nubes, el viento cambia de dueño.' },
            ],
            sfx: 'ザアア!',
          },
          {
            cameraAngle: 'Plano Holandés (Acción)',
            taggedHandles: ['@CapitanaAlisio', '@VeleroSolar'],
            actionPrompt: '@CapitanaAlisio salta a la proa con el timón bloqueado mientras un rayo rasga el cielo.',
            inkRenderUrl: '/landing/assets/mangai-art-20.svg',
            dialogues: [
              { speaker: '@CapitanaAlisio', style: 'shout', text: '¡Desplieguen el foque solar, entramos por la brecha!' },
            ],
            sfx: 'バリバリ!!',
          },
          {
            cameraAngle: 'Detalle / Inserto',
            taggedHandles: ['@ArchipielagoTormenta'],
            actionPrompt: 'Carta náutica abierta vibrando con rutas trazadas sobre el huracán.',
            inkRenderUrl: '/landing/assets/mangai-art-13.svg',
            dialogues: [],
          },
          {
            cameraAngle: 'Primer Plano Emocional',
            taggedHandles: ['@CapitanaAlisio'],
            actionPrompt: 'Rostro decidido de @CapitanaAlisio ajustándose las gafas de vuelo.',
            inkRenderUrl: '/landing/assets/mangai-art-19.svg',
            dialogues: [
              { speaker: '@CapitanaAlisio', style: 'normal', text: 'Nadie nos dijo que el horizonte fuera tranquilo.' },
            ],
          },
          {
            cameraAngle: 'Doble Página Splash',
            taggedHandles: ['@VeleroSolar'],
            actionPrompt: 'El navío emerge victorioso frente al faro ancestral sobre las nubes.',
            inkRenderUrl: '/landing/assets/mangai-art-16.svg',
            dialogues: [],
            sfx: 'ドォォン!',
          },
        ],
      },
    ],
  },
};

const DYNAMIC_LANDING_METADATA: Record<
  string,
  {
    name: string;
    genre: string;
    desc: string;
    art: string;
    coverArt: string;
    spreadArt: [string, string, string, string];
    prompt: string;
    heroName: string;
    heroHandle: string;
    colorMode: ColorMode;
    artStyle: string;
  }
> = {
  'atlas-sketchbook': {
    name: 'Atlas: Mapas del Olvido',
    genre: 'Fantasía / Misterio',
    desc: 'Cada noche, un reino desaparece de los mapas de la ciudad.',
    art: '/landing/assets/mangai-art-02.svg',
    coverArt: '/landing/assets/mangai-art-07.svg',
    spreadArt: ['/landing/assets/mangai-art-14.svg', '/landing/assets/mangai-art-20.svg', '/landing/assets/mangai-art-13.svg', '/landing/assets/mangai-art-16.svg'],
    prompt: 'Young arcane cartographer holding a glowing astral compass inside a midnight archive where ancient ink maps float in mid-air',
    heroName: 'Atlas Kurosawa',
    heroHandle: '@Atlas',
    colorMode: 'color',
    artStyle: 'Dark Seinen',
  },
  'nox-signal-vol2': {
    name: 'Nox / Signal',
    genre: 'Ciencia ficción',
    desc: 'Una señal imposible transforma una ciudad dormida.',
    art: '/landing/assets/mangai-art-03.svg',
    coverArt: '/landing/assets/mangai-art-08.svg',
    spreadArt: ['/landing/assets/mangai-art-16.svg', '/landing/assets/mangai-art-15.svg', '/landing/assets/mangai-art-18.svg', '/landing/assets/mangai-art-19.svg'],
    prompt: 'Cyberpunk signal runner perched on a rain-soaked neon rooftop overlooking a sleeping megacity, violet holographic frequencies',
    heroName: 'Nox',
    heroHandle: '@NoxSignal',
    colorMode: 'color',
    artStyle: 'Cyberpunk Manga',
  },
  'kuro-vol1': {
    name: 'Kuro: Peso del Silencio',
    genre: 'Drama / Acción',
    desc: 'Dos hermanos descubren el precio de guardar un secreto.',
    art: '/landing/assets/mangai-art-04.svg',
    coverArt: '/landing/assets/mangai-art-09.svg',
    spreadArt: ['/landing/assets/mangai-art-18.svg', '/landing/assets/mangai-art-17.svg', '/landing/assets/mangai-art-21.svg', '/landing/assets/mangai-art-12.svg'],
    prompt: 'Two estranged brothers facing each other across a rain-swept stone courtyard under a dim lantern, heavy monochrome brush shadows',
    heroName: 'Kuro',
    heroHandle: '@Kuro',
    colorMode: 'bw',
    artStyle: 'Retro Gekiga',
  },
  'eclipse-vol1': {
    name: 'Crónicas del Eclipse',
    genre: 'Fantasía oscura',
    desc: 'Donde termina la noche, comienza una nueva guerra.',
    art: '/landing/assets/mangai-art-05.svg',
    coverArt: '/landing/assets/mangai-art-10.svg',
    spreadArt: ['/landing/assets/mangai-art-19.svg', '/landing/assets/mangai-art-20.svg', '/landing/assets/mangai-art-14.svg', '/landing/assets/mangai-art-22.svg'],
    prompt: 'Lone armored sentinel standing before a fractured crimson solar eclipse tearing open an obsidian sky',
    heroName: 'Vespera',
    heroHandle: '@CentinelaEclipse',
    colorMode: 'color',
    artStyle: 'Dark Seinen',
  },
  'akai-ronin-vol1': {
    name: 'Akai: Filo Carmesí',
    genre: 'Seinen / Acción Samurái',
    desc: 'Una espada forjada en laca carmesí despierta el linaje prohibido de Akai.',
    art: '/landing/assets/mangai-art-06.svg',
    coverArt: '/landing/assets/mangai-art-01.svg',
    spreadArt: ['/landing/assets/mangai-art-01.svg', '/landing/assets/mangai-art-19.svg', '/landing/assets/mangai-art-12.svg', '/landing/assets/mangai-art-20.svg'],
    prompt: 'Lone samurai warrior unsheathing a crimson-lacquered katana amidst falling autumn leaves, stark black sumi ink brushwork',
    heroName: 'Akai',
    heroHandle: '@AkaiRonin',
    colorMode: 'bw',
    artStyle: 'Dark Seinen',
  },
  'kaze-orbit-vol1': {
    name: 'Kaze: Órbita Cero',
    genre: 'Mecha / Sci-Fi',
    desc: 'En los astilleros orbitales, un chasis antiguo vuelve a encender su reactor.',
    art: '/landing/assets/mangai-art-07.svg',
    coverArt: '/landing/assets/mangai-art-02.svg',
    spreadArt: ['/landing/assets/mangai-art-02.svg', '/landing/assets/mangai-art-16.svg', '/landing/assets/mangai-art-15.svg', '/landing/assets/mangai-art-13.svg'],
    prompt: 'Sleek orbital mecha frame launching from a zero-gravity hangar bay with emerald thrusters igniting against Earth curvature',
    heroName: 'Kaze-01',
    heroHandle: '@PilotoKaze',
    colorMode: 'color',
    artStyle: 'Cyberpunk Manga',
  },
  'yokai-archive-vol1': {
    name: 'Yōkai: Archivo Nocturno',
    genre: 'Fantasía Sobrenatural',
    desc: 'Una librería de Kioto custodia los contratos de cien espíritus antiguos.',
    art: '/landing/assets/mangai-art-08.svg',
    coverArt: '/landing/assets/mangai-art-03.svg',
    spreadArt: ['/landing/assets/mangai-art-03.svg', '/landing/assets/mangai-art-15.svg', '/landing/assets/mangai-art-19.svg', '/landing/assets/mangai-art-16.svg'],
    prompt: 'Mystical lantern-lit Kyoto alley at midnight where paper talismans swirl around a young exorcist detective',
    heroName: 'Renji',
    heroHandle: '@RenjiYokai',
    colorMode: 'color',
    artStyle: 'Modern Shojo',
  },
  'sensei-ink-vol1': {
    name: 'Sensei: Tinta Viva',
    genre: 'Slice of Life / Arte',
    desc: 'El viaje íntimo de una autora independiente hasta publicar su primer Tankōbon.',
    art: '/landing/assets/mangai-art-09.svg',
    coverArt: '/landing/assets/mangai-art-04.svg',
    spreadArt: ['/landing/assets/mangai-art-04.svg', '/landing/assets/mangai-art-17.svg', '/landing/assets/mangai-art-12.svg', '/landing/assets/mangai-art-22.svg'],
    prompt: 'Warm sunlit mangaka studio desk covered with Genko manuscript paper, G-pen nibs, ink bottles, and character sketches',
    heroName: 'Hana',
    heroHandle: '@HanaSensei',
    colorMode: 'bw',
    artStyle: 'Modern Shojo',
  },
};

function buildDynamicPreset(slug: string): VolumeSeedPreset | null {
  const meta = DYNAMIC_LANDING_METADATA[slug];
  if (!meta) return null;

  return {
    volumeSlug: slug,
    name: meta.name,
    author: 'MANGAI Editorial',
    pageCount: 120,
    paperType: meta.colorMode === 'bw' ? 'cream' : 'white',
    colorMode: meta.colorMode,
    bindingType: 'rustica_pegada',
    trimFormat: 'tankobon_b6',
    readingDirection: 'rtl',
    isbn: '978-9945-3000-0-1',
    spineTitle: meta.name.toUpperCase(),
    backSynopsis: meta.desc,
    coverPrompt: meta.prompt,
    frontArt: meta.coverArt,
    backArt: meta.art,
    wrapArt: meta.coverArt,
    characters: [
      {
        id: `${slug}-char-1`,
        entityType: 'character',
        tagHandle: meta.heroHandle,
        name: meta.heroName,
        appearance: `${meta.heroName} (${meta.genre}): diseño principal optimizado para continuidad visual.`,
        clothing: 'Atuendo distintivo acorde al universo de la obra.',
        role: 'Protagonista',
        activeInCanon: true,
        visualAnchors: ['Silueta característica', 'Emblema del tomo'],
        seedLocked: true,
        characterSeed: `SEED-${Math.abs(slug.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 900000 + 100000}`,
        referenceBase64: meta.art,
      },
      {
        id: `${slug}-loc-1`,
        entityType: 'location',
        tagHandle: '@EscenarioPrincipal',
        name: `Escenario · ${meta.name}`,
        appearance: meta.desc,
        clothing: '',
        role: 'Escenario',
        activeInCanon: true,
        visualAnchors: ['Iluminación atmosférica del tomo'],
        seedLocked: false,
        referenceBase64: meta.spreadArt[0],
      },
    ],
    pages: [
      {
        artStyle: meta.artStyle,
        layoutTemplate: '4_panel_classic',
        chapterBeat: `Acto I de ${meta.name}: ${meta.desc}`,
        panels: [
          {
            cameraAngle: 'Plano General / Establishing',
            taggedHandles: [meta.heroHandle, '@EscenarioPrincipal'],
            actionPrompt: `Escena de apertura de ${meta.name}: ${meta.prompt}`,
            inkRenderUrl: meta.spreadArt[0],
            dialogues: [
              { speaker: 'Narrador', style: 'narrator', text: meta.desc },
            ],
          },
          {
            cameraAngle: 'Plano Medio',
            taggedHandles: [meta.heroHandle],
            actionPrompt: `${meta.heroHandle} entra en cuadro en tensión dramática.`,
            inkRenderUrl: meta.spreadArt[1],
            dialogues: [
              { speaker: meta.heroHandle, style: 'normal', text: 'Todo comienza aquí.' },
            ],
          },
          {
            cameraAngle: 'Detalle / Inserto',
            taggedHandles: ['@EscenarioPrincipal'],
            actionPrompt: 'Detalle clave de atmósfera y utilería del universo.',
            inkRenderUrl: meta.spreadArt[2],
            dialogues: [],
            sfx: 'ザッ!',
          },
          {
            cameraAngle: 'Contrapicado Heroico',
            taggedHandles: [meta.heroHandle],
            actionPrompt: `Cierre de página con ${meta.heroHandle} tomando decisión.`,
            inkRenderUrl: meta.spreadArt[3],
            dialogues: [
              { speaker: meta.heroHandle, style: 'shout', text: '¡Adelante!' },
            ],
            sfx: 'ドン!',
          },
        ],
      },
    ],
  };
}

export const LANDING_VOLUME_IDS = [
  'anacaona-vol1',
  'huracan-vol2',
  ...Object.keys(DYNAMIC_LANDING_METADATA),
] as const;

export function getSeedProjectForVolume(volumeSlug: string): Project | null {
  const cleanSlug = (volumeSlug || '').trim().toLowerCase();
  if (!cleanSlug) return null;
  const preset = VOLUME_PRESETS[cleanSlug] ?? buildDynamicPreset(cleanSlug);
  if (!preset) return null;

  return {
    id: `vol-${preset.volumeSlug}`,
    volumeSlug: preset.volumeSlug,
    name: preset.name,
    author: preset.author,
    pageCount: preset.pageCount,
    paperType: preset.paperType,
    colorMode: preset.colorMode,
    bindingType: preset.bindingType,
    trimFormat: preset.trimFormat,
    readingDirection: preset.readingDirection,
    characters: preset.characters.map((c) => ({ ...c })),
    pages: buildSeedPages(preset),
    cover: {
      frontBase64: preset.frontArt,
      backBase64: preset.backArt,
      fullWrapBase64: preset.wrapArt,
      prompt: preset.coverPrompt,
      spineWidthInches: computeSpineInches(
        preset.pageCount,
        preset.paperType,
        preset.colorMode,
        preset.bindingType,
      ),
      isbn: preset.isbn,
      includeIsbn: true,
      spineTitle: preset.spineTitle,
      backSynopsis: preset.backSynopsis,
    },
  };
}

export function isStarterBlankProject(project: Project): boolean {
  const defaultTitle =
    !project.name ||
    project.name === 'Manga sin título' ||
    project.name.startsWith('Nuevo Tomo');
  const hasChars = project.characters.length > 0;
  const hasCover = Boolean(
    project.cover.fullWrapBase64 || project.cover.frontBase64 || project.cover.backBase64,
  );
  const hasPageArt = project.pages.some(
    (p) =>
      Boolean(p.base64) ||
      Boolean(p.prompt?.trim()) ||
      Boolean(p.chapterBeat?.trim()) ||
      (p.komas ?? []).some(
        (k) => Boolean(k.inkRenderUrl) || Boolean(k.nemuSketchUrl) || Boolean(k.actionPrompt?.trim()),
      ),
  );
  return defaultTitle && !hasChars && !hasCover && !hasPageArt;
}
