import creaseCarouselOptions from './crease-carousel/preset.js';
import pinwheelOptions from './pinwheel-gallery/preset.js';

const BOOKS = [
  {
    id: 'anacaona-vol1',
    title: 'AnaCaona: Flor Guerrera',
    series: 'AnaCaona',
    subtitle: 'Flor de guerra',
    volume: 'VOL. I',
    genre: 'Fantasía histórica',
    desc: 'Una leyenda caribeña reimaginada en tinta sumi, memoria ancestral y aventura épica. Quisqueya resiste bajo la tormenta mientras AnaCaona lidera el Areíto con trazos G-Pen a 600 DPI.',
    art: '/landing/assets/mangai-art-06.svg',
    coverArt: pinwheelOptions.items[0]?.imageUrl || '/landing/assets/cover-anacaona.webp',
    studioStyle: 'manga_ink',
    studioPrompt:
      'Taino warrior queen AnaCaona standing defiantly in a moonlit Caribbean rainforest, ceremonial golden ornaments, flowing hair, dramatic sumi ink hatching and dynamic manga framing',
    spreads: [
      {
        left: {
          title: 'Capítulo 1: El Despertar de Quisqueya',
          text: 'Trazos iniciales de entintado y composición atmosférica para el primer acto.',
          image: '/landing/samples/anacaona-vol1/1.webp',
          focalX: creaseCarouselOptions.slots[0]?.left.focalX ?? 50,
          focalY: creaseCarouselOptions.slots[0]?.left.focalY ?? 50,
        },
        right: {
          title: 'Duelo en la Selva',
          text: 'Perspectiva dramática y contraste de tinta sumi sobre papel Genkō.',
          image: '/landing/samples/anacaona-vol1/2.webp',
          focalX: creaseCarouselOptions.slots[0]?.right.focalX ?? 50,
          focalY: creaseCarouselOptions.slots[0]?.right.focalY ?? 50,
        },
      },
      {
        left: {
          title: 'Settei de Personaje · Canon',
          text: 'Expresiones, silueta ceremonial y anclas visuales bloqueadas para el tomo.',
          image: '/landing/samples/anacaona-vol1/3.webp',
        },
        right: {
          title: 'Edición Coleccionista Tankōbon',
          text: 'Maquetación de cubierta conceptual lista para exportación editorial.',
          image: '/landing/samples/anacaona-vol1/4.webp',
        },
      },
      {
        left: {
          title: 'Areíto bajo la Lluvia',
          text: 'Ritmo secuencial en cinco viñetas con líneas cinéticas y tramas tradicionales.',
          image: '/landing/samples/anacaona-vol1/5.webp',
        },
        right: {
          title: 'Juramento de Oro y Coral',
          text: 'Doble página de clímax narrativo asistida por Kai con sangrado KDP.',
          image: '/landing/samples/anacaona-vol1/6.webp',
        },
      },
      {
        left: {
          title: 'Epílogo: Semilla de Fuego',
          text: 'Cierre de capítulo con iluminación dramática y globos vectoriales Fukidashi.',
          image: '/landing/samples/anacaona-vol1/7.webp',
        },
        right: {
          title: 'Ficha Técnica de Imprenta',
          text: 'Revisión Pre-Flight a 300 DPI lista para publicación física y digital.',
          image: '/landing/samples/anacaona-vol1/8.webp',
        },
      },
    ],
  },
  {
    id: 'atlas-sketchbook',
    title: 'Atlas: Mapas del Olvido',
    series: 'Atlas',
    subtitle: 'Los mapas del olvido',
    volume: 'VOL. I',
    genre: 'Fantasía / Misterio',
    desc: 'Cada medianoche, un distrito entero desaparece de los mapas imperiales. Un joven cartógrafo arcano rastrea las coordenadas borradas con una brújula astral de tinta viva.',
    art: '/landing/assets/mangai-art-07.svg',
    coverArt: pinwheelOptions.items[1]?.imageUrl || '/landing/assets/cover-atlas.webp',
    studioStyle: 'webtoon_color',
    studioPrompt:
      'Young arcane cartographer holding a glowing astral compass inside a midnight archive where ancient ink maps float in mid-air, cyan rim lighting and deep slate shadows',
    spreads: [
      {
        left: {
          title: 'Archivo de Cartografía Arcana',
          text: 'Secuencia de viñetas con tramas limpias y profundidad espacial.',
          image: '/landing/samples/atlas-sketchbook/1.webp',
        },
        right: {
          title: 'La Brújula Astral',
          text: 'Encuadre vertical estilizado y ritmo narrativo asistido por Kai.',
          image: '/landing/samples/atlas-sketchbook/2.webp',
        },
      },
      {
        left: {
          title: 'Portada de Cuaderno de Campo',
          text: 'Estudio cromático en azules nocturnos e iluminación de contraste.',
          image: '/landing/samples/atlas-sketchbook/3.webp',
        },
        right: {
          title: 'Horizonte Desaparecido',
          text: 'Escena panorámica de transición entre distritos olvidados.',
          image: '/landing/samples/atlas-sketchbook/4.webp',
        },
      },
      {
        left: {
          title: 'Meridiano de Ceniza',
          text: 'Planos arquitectónicos imposibles generados manteniendo el canon del mundo.',
          image: '/landing/samples/atlas-sketchbook/5.webp',
        },
        right: {
          title: 'El Relojero sin Sombra',
          text: 'Encuentro clave en la torre sumergida con contraluces cian.',
          image: '/landing/samples/atlas-sketchbook/6.webp',
        },
      },
      {
        left: {
          title: 'Índice de Regiones Borradas',
          text: 'Mapa conceptual de lore sincronizado con la Biblia del Universo.',
          image: '/landing/samples/atlas-sketchbook/7.webp',
        },
        right: {
          title: 'Última Coordenada',
          text: 'Gancho final del primer tomo preparado para continuar en Estudio.',
          image: '/landing/samples/atlas-sketchbook/8.webp',
        },
      },
    ],
  },
  {
    id: 'nox-signal-vol2',
    title: 'Nox / Signal',
    series: 'Nox / Signal',
    subtitle: 'La última frecuencia',
    volume: 'VOL. II',
    genre: 'Ciencia ficción',
    desc: 'Una transmisión imposible en 99.4 MHz despierta a los corredores de señal del Distrito Cero. Persecución cibernética en tres puntos de fuga sobre rascacielos empapados en neón.',
    art: '/landing/assets/mangai-art-08.svg',
    coverArt: pinwheelOptions.items[2]?.imageUrl || '/landing/assets/cover-nox.webp',
    studioStyle: 'webtoon_color',
    studioPrompt:
      'Cyberpunk signal runner perched on a rain-soaked neon rooftop overlooking a sleeping megacity, violet holographic frequencies pulsing across the night sky, 3-point perspective',
    spreads: [
      {
        left: {
          title: 'Transmisión en el Distrito Cero',
          text: 'Perspectiva urbana de tres puntos y líneas cinéticas nocturnas.',
          image: '/landing/samples/nox-signal-vol2/1.webp',
        },
        right: {
          title: 'Frecuencia Desconocida · Vol. II',
          text: 'Diseño cromático violeta-magenta para la portada del segundo volumen.',
          image: '/landing/samples/nox-signal-vol2/2.webp',
        },
      },
      {
        left: {
          title: 'Eco en las Antenas',
          text: 'Secuencia de acción en azoteas con ritmo de lectura dinámico.',
          image: '/landing/samples/nox-signal-vol2/3.webp',
        },
        right: {
          title: 'Señal Interceptada',
          text: 'Primer plano con globo de diálogo y composición de alto impacto.',
          image: '/landing/samples/nox-signal-vol2/4.webp',
        },
      },
      {
        left: {
          title: 'Protocolo Fantasma',
          text: 'Infiltración en el núcleo orbital con hologramas en tinta carmesí.',
          image: '/landing/samples/nox-signal-vol2/5.webp',
        },
        right: {
          title: 'Pulso Magnético',
          text: 'Doble splash page con efectos Kakimoji integrados en capa vectorial.',
          image: '/landing/samples/nox-signal-vol2/6.webp',
        },
      },
      {
        left: {
          title: 'Archivo de Personajes · Nox',
          text: 'Hoja de referencia cibernética con visor y proporciones bloqueadas.',
          image: '/landing/samples/nox-signal-vol2/7.webp',
        },
        right: {
          title: 'Fin de Transmisión',
          text: 'Cierre de volumen listo para lectura vertical Webtoon o Tankōbon.',
          image: '/landing/samples/nox-signal-vol2/8.webp',
        },
      },
    ],
  },
  {
    id: 'kuro-vol1',
    title: 'Kuro: Peso del Silencio',
    series: 'Kuro',
    subtitle: 'El peso del silencio',
    volume: 'VOL. I',
    genre: 'Drama / Acción',
    desc: 'Dos hermanos separados por un juramento de sangre se reencuentran bajo un patio de piedra azotado por la lluvia. Entintado monocromo de alto contraste con pausas dramáticas.',
    art: '/landing/assets/mangai-art-09.svg',
    coverArt: pinwheelOptions.items[3]?.imageUrl || '/landing/assets/cover-kuro.webp',
    studioStyle: 'manga_ink',
    studioPrompt:
      'Two estranged brothers facing each other across a rain-swept stone courtyard under a dim lantern, heavy monochrome brush shadows, intense silent manga standoff framing',
    spreads: [
      {
        left: {
          title: 'Los Silencios También Gritan',
          text: 'Composición minimalista en tinta negra y pausas dramáticas entre viñetas.',
          image: '/landing/samples/kuro-vol1/1.webp',
        },
        right: {
          title: 'Lámina de Portada · Kuro',
          text: 'Contraste editorial limpio sobre papel marfil con tipografía bold.',
          image: '/landing/samples/kuro-vol1/2.webp',
        },
      },
      {
        left: {
          title: 'Ficha de Continuidad Visual',
          text: 'Referencias de vestuario y proporciones para mantener consistencia.',
          image: '/landing/samples/kuro-vol1/3.webp',
        },
        right: {
          title: 'Juramento en el Patio',
          text: 'Viñeta clave de diálogo con tramas finas y sombreado intenso.',
          image: '/landing/samples/kuro-vol1/4.webp',
        },
      },
      {
        left: {
          title: 'Bajo la Linterna Rota',
          text: 'Secuencia muda de tensión psicológica trabajada con plumilla G-Pen.',
          image: '/landing/samples/kuro-vol1/5.webp',
        },
        right: {
          title: 'La Carta Sellada',
          text: 'Detalle narrativo de utilería registrado como entidad Settei.',
          image: '/landing/samples/kuro-vol1/6.webp',
        },
      },
      {
        left: {
          title: 'Desenlace en Nieve',
          text: 'Alto contraste blanco y negro puro listo para impresión offset.',
          image: '/landing/samples/kuro-vol1/7.webp',
        },
        right: {
          title: 'Avance del Volumen II',
          text: 'Página final de adelanto editorial generada dentro de MANGAI Studio.',
          image: '/landing/samples/kuro-vol1/8.webp',
        },
      },
    ],
  },
  {
    id: 'eclipse-vol1',
    title: 'Crónicas del Eclipse',
    series: 'Eclipse',
    subtitle: 'El cielo fracturado',
    volume: 'VOL. I',
    genre: 'Fantasía oscura',
    desc: 'Cuando el sol negro fractura la bóveda celeste, los centinelas de la Ciudadela de Ceniza alzan sus hojas reliquia. Fantasía oscura monumental con tramas densas y laca carmesí.',
    art: '/landing/assets/mangai-art-10.svg',
    coverArt: pinwheelOptions.items[4]?.imageUrl || '/landing/assets/cover-eclipse.webp',
    studioStyle: 'cover_art',
    studioPrompt:
      'Lone armored sentinel standing before a fractured crimson solar eclipse tearing open an obsidian sky, swirling embers, monumental dark fantasy manga volume cover composition',
    spreads: [
      {
        left: {
          title: 'Prólogo: El Cielo Fracturado',
          text: 'Apertura dramática preparada para exportación Amazon KDP.',
          image: '/landing/samples/eclipse-vol1/1.webp',
        },
        right: {
          title: 'Panel Doble · Ruptura Carmesí',
          text: 'Líneas cinéticas radiales y foco de tensión sobre la viñeta central.',
          image: '/landing/samples/eclipse-vol1/2.webp',
        },
      },
      {
        left: {
          title: 'La Vigilia del Centinela',
          text: 'Encuadre contrapicado con sombreado geométrico y tramas densas.',
          image: '/landing/samples/eclipse-vol1/3.webp',
        },
        right: {
          title: 'Arte Final de Volumen',
          text: 'Acabado conceptual para contraportada, lomo y tapa frontal.',
          image: '/landing/samples/eclipse-vol1/4.webp',
        },
      },
      {
        left: {
          title: 'Ciudadela de Ceniza',
          text: 'Escenario monumental Dark Fantasy con acentos en laca roja Akai.',
          image: '/landing/samples/eclipse-vol1/5.webp',
        },
        right: {
          title: 'El Pacto de Hierro',
          text: 'Composición diagonal dinámica de cinco viñetas para combate.',
          image: '/landing/samples/eclipse-vol1/6.webp',
        },
      },
      {
        left: {
          title: 'Armamento Ceremonial',
          text: 'Lámina extra de diseño de props y emblemas para el lector.',
          image: '/landing/samples/eclipse-vol1/7.webp',
        },
        right: {
          title: 'Cubierta Integral KDP',
          text: 'Maqueta con lomo, sangrado de 3.5 mm y código EAN-13 vectorial.',
          image: '/landing/samples/eclipse-vol1/8.webp',
        },
      },
    ],
  },
  {
    id: 'akai-ronin-vol1',
    title: 'Akai: Filo Carmesí',
    series: 'Akai',
    subtitle: 'La senda de la tinta roja',
    volume: 'VOL. I',
    genre: 'Seinen / Acción Samurái',
    desc: 'Una katana templada en laca carmesí despierta el linaje prohibido de Akai sobre los puentes de bambú de Edo. Acción samurái de alta velocidad con cortes diagonales Koma-wari.',
    art: '/landing/assets/mangai-art-01.svg',
    coverArt: pinwheelOptions.items[5]?.imageUrl || '/landing/assets/cover-akai.webp',
    studioStyle: 'manga_ink',
    studioPrompt:
      'Lone samurai warrior unsheathing a crimson-lacquered katana amidst falling autumn leaves, stark black sumi ink brushwork with dramatic Akai red slash accents',
    spreads: [
      {
        left: {
          title: 'Acto I: El Sello Carmesí',
          text: 'Apertura en tinta sumi con acento rojo Akai y corte diagonal de acción.',
          image: '/landing/samples/akai-ronin-vol1/1.webp',
        },
        right: {
          title: 'Duelo en el Puente de Bambú',
          text: 'Secuencia cinética de espada con líneas de velocidad de alta precisión.',
          image: '/landing/samples/akai-ronin-vol1/2.webp',
        },
      },
      {
        left: {
          title: 'Settei · Armadura Akai',
          text: 'Diseño canónico de guardamano, haori rasgado y cicatrices del protagonista.',
          image: '/landing/samples/akai-ronin-vol1/3.webp',
        },
        right: {
          title: 'Luna de Sangre sobre Edo',
          text: 'Doble página panorámica preparada para edición coleccionista B6.',
          image: '/landing/samples/akai-ronin-vol1/4.webp',
        },
      },
      {
        left: {
          title: 'Juramento del Herrero',
          text: 'Primeros planos expresivos entintados con plumilla japonesa G-Pen.',
          image: '/landing/samples/akai-ronin-vol1/5.webp',
        },
        right: {
          title: 'Corte Relámpago',
          text: 'Onomatopeyas vectoriales Kakimoji integradas sobre trama dramática.',
          image: '/landing/samples/akai-ronin-vol1/6.webp',
        },
      },
      {
        left: {
          title: 'Epílogo en Nieve Roja',
          text: 'Silueta minimalista cerrando el primer volumen de la saga Akai.',
          image: '/landing/samples/akai-ronin-vol1/7.webp',
        },
        right: {
          title: 'Sobrecubierta Editorial Akai',
          text: 'Arte final de cubierta validado a 300 DPI para tirada impresa.',
          image: '/landing/samples/akai-ronin-vol1/8.webp',
        },
      },
    ],
  },
  {
    id: 'kaze-orbit-vol1',
    title: 'Kaze: Órbita Cero',
    series: 'Kaze',
    subtitle: 'Pilotos del anillo solar',
    volume: 'VOL. I',
    genre: 'Mecha / Sci-Fi',
    desc: 'En los astilleros del Anillo Solar, el chasis experimental Kaze-01 vuelve a encender su reactor esmeralda. Geometría mecánica de precisión y batallas en gravedad cero.',
    art: '/landing/assets/mangai-art-02.svg',
    coverArt: pinwheelOptions.items[6]?.imageUrl || '/landing/assets/cover-kaze.webp',
    studioStyle: 'webtoon_color',
    studioPrompt:
      'Sleek orbital mecha frame launching from a zero-gravity hangar bay with emerald thrusters igniting against Earth curvature, detailed mechanical lineart',
    spreads: [
      {
        left: {
          title: 'Hangar 09 · Despresurización',
          text: 'Geometría mecánica detallada con perspectiva técnica asistida por Kai.',
          image: '/landing/samples/kaze-orbit-vol1/1.webp',
        },
        right: {
          title: 'Ignición en Gravedad Cero',
          text: 'Estela orbital y paneles dinámicos para secuencias de alta velocidad.',
          image: '/landing/samples/kaze-orbit-vol1/2.webp',
        },
      },
      {
        left: {
          title: 'Cabina Neural · Sincronía',
          text: 'Interfaz holográfica e iluminación esmeralda sobre el rostro del piloto.',
          image: '/landing/samples/kaze-orbit-vol1/3.webp',
        },
        right: {
          title: 'Planos del Chasis Kaze-01',
          text: 'Hoja técnica de proporciones mecánicas bloqueada en Settei Hub.',
          image: '/landing/samples/kaze-orbit-vol1/4.webp',
        },
      },
      {
        left: {
          title: 'Escombros del Sector Siete',
          text: 'Maniobra evasiva entre estaciones abandonadas en doble página.',
          image: '/landing/samples/kaze-orbit-vol1/5.webp',
        },
        right: {
          title: 'Impacto de Riel',
          text: 'Contraste extremo de luces y sombras con tramas metálicas.',
          image: '/landing/samples/kaze-orbit-vol1/6.webp',
        },
      },
      {
        left: {
          title: 'Reentrada Atmosférica',
          text: 'Clímax ardiente rumbo a la superficie terrestre.',
          image: '/landing/samples/kaze-orbit-vol1/7.webp',
        },
        right: {
          title: 'Catálogo de Unidades',
          text: 'Apéndice ilustrado incluido al final del tomo coleccionista.',
          image: '/landing/samples/kaze-orbit-vol1/8.webp',
        },
      },
    ],
  },
  {
    id: 'yokai-archive-vol1',
    title: 'Yōkai: Archivo Nocturno',
    series: 'Yōkai',
    subtitle: 'Detectives del crepúsculo',
    volume: 'VOL. I',
    genre: 'Fantasía Sobrenatural',
    desc: 'Una librería oculta en los callejones de Kioto custodia los contratos sellados de cien espíritus antiguos. Detectives del crepúsculo, talismanes Ofuda y caligrafía sumi.',
    art: '/landing/assets/mangai-art-03.svg',
    coverArt: pinwheelOptions.items[7]?.imageUrl || '/landing/assets/cover-yokai.webp',
    studioStyle: 'webtoon_color',
    studioPrompt:
      'Mystical lantern-lit Kyoto alley at midnight where paper talismans swirl around a young exorcist detective, supernatural violet spirit silhouettes',
    spreads: [
      {
        left: {
          title: 'La Librería de las Doce Lunas',
          text: 'Ambientación tradicional japonesa con pergaminos y linternas flotantes.',
          image: '/landing/samples/yokai-archive-vol1/1.webp',
        },
        right: {
          title: 'El Zorro de Tinta',
          text: 'Aparición sobrenatural renderizada con degradados de semitono.',
          image: '/landing/samples/yokai-archive-vol1/2.webp',
        },
      },
      {
        left: {
          title: 'Talismán de Contención',
          text: 'Composición vertical de conjuro con caligrafía integrada.',
          image: '/landing/samples/yokai-archive-vol1/3.webp',
        },
        right: {
          title: 'Bestiario Ilustrado',
          text: 'Fichas canónicas de criaturas registradas para mantener continuidad.',
          image: '/landing/samples/yokai-archive-vol1/4.webp',
        },
      },
      {
        left: {
          title: 'Tren de Medianoche',
          text: 'Misterio en vagón solitario con juegos de reflejos en las ventanas.',
          image: '/landing/samples/yokai-archive-vol1/5.webp',
        },
        right: {
          title: 'Ruptura del Velo',
          text: 'Clímax visual en doble pliego con espirales de tinta y papel.',
          image: '/landing/samples/yokai-archive-vol1/6.webp',
        },
      },
      {
        left: {
          title: 'Sello Archivado · Caso 01',
          text: 'Resolución del primer expediente lista para lectura digital.',
          image: '/landing/samples/yokai-archive-vol1/7.webp',
        },
        right: {
          title: 'Cubierta de Edición Nocturna',
          text: 'Diseño editorial con reserva UV conceptual y lomo numerado.',
          image: '/landing/samples/yokai-archive-vol1/8.webp',
        },
      },
    ],
  },
  {
    id: 'sensei-ink-vol1',
    title: 'Sensei: Tinta Viva',
    series: 'Sensei',
    subtitle: 'Crónicas del taller',
    volume: 'ED. ESPECIAL',
    genre: 'Slice of Life / Arte',
    desc: 'El viaje íntimo de una autora independiente desde las madrugadas frente al papel Genkō hasta ver su primer Tankōbon B6 en las estanterías de Tokio.',
    art: '/landing/assets/mangai-art-04.svg',
    coverArt: pinwheelOptions.items[8]?.imageUrl || '/landing/assets/cover-sensei.webp',
    studioStyle: 'manga_ink',
    studioPrompt:
      'Warm sunlit mangaka studio desk covered with Genko manuscript paper, G-pen nibs, ink bottles, and character sketches coming alive in delicate sumi lines',
    spreads: [
      {
        left: {
          title: 'Mesa de Trabajo · 03:00 AM',
          text: 'Homenaje al oficio del manga sobre papel Genkō de 135 kg.',
          image: '/landing/samples/sensei-ink-vol1/1.webp',
        },
        right: {
          title: 'Del Boceto Nemu al Entintado',
          text: 'Comparativa real del flujo de capas L0 a L6 dentro del Estudio.',
          image: '/landing/samples/sensei-ink-vol1/2.webp',
        },
      },
      {
        left: {
          title: 'Correcciones Editoriales',
          text: 'Diálogo cálido de mentoría creativa y ritmo de página.',
          image: '/landing/samples/sensei-ink-vol1/3.webp',
        },
        right: {
          title: 'El Primer Tomo Impreso',
          text: 'Escena emotiva en librería con detalle de estanterías.',
          image: '/landing/samples/sensei-ink-vol1/4.webp',
        },
      },
      {
        left: {
          title: 'Estudio de Manos y Expresiones',
          text: 'Láminas de referencia anatómica y gestual para la protagonista.',
          image: '/landing/samples/sensei-ink-vol1/5.webp',
        },
        right: {
          title: 'Lluvia sobre Tokio',
          text: 'Paisaje urbano contemplativo con tramas suaves al 20%.',
          image: '/landing/samples/sensei-ink-vol1/6.webp',
        },
      },
      {
        left: {
          title: 'Notas de la Autora',
          text: 'Extras de cierre de tomo maquetados con plantillas MANGAI.',
          image: '/landing/samples/sensei-ink-vol1/7.webp',
        },
        right: {
          title: 'Colofón Editorial',
          text: 'Créditos e ISBN EAN-13 listos para distribución global.',
          image: '/landing/samples/sensei-ink-vol1/8.webp',
        },
      },
    ],
  },
  {
    id: 'huracan-vol2',
    title: 'Hijos del Huracán',
    series: 'Huracán',
    subtitle: 'Navegantes del arco',
    volume: 'VOL. II',
    genre: 'Aventura Épica',
    desc: 'Flotas de vela solar cruzan un archipiélago celeste suspendido entre tormentas eternas. Cartografía naval bloqueada en Settei y batallas aéreas a doble página.',
    art: '/landing/assets/mangai-art-05.svg',
    coverArt: pinwheelOptions.items[9]?.imageUrl || '/landing/assets/cover-hijos-del-huracan.webp',
    studioStyle: 'cover_art',
    studioPrompt:
      'Skyship fleet with billowing solar sails carving through towering storm clouds above floating tropical islands, dynamic wide-angle shonen adventure cover art',
    spreads: [
      {
        left: {
          title: 'Zarpar hacia el Ojo Celeste',
          text: 'Gran angular épico de aventura con nubes volumétricas y velámenes.',
          image: '/landing/samples/huracan-vol2/1.webp',
        },
        right: {
          title: 'Abordaje en la Corriente Alta',
          text: 'Acción acrobática entre cubiertas con perspectiva dinámica.',
          image: '/landing/samples/huracan-vol2/2.webp',
        },
      },
      {
        left: {
          title: 'Carta Náutica del Archipiélago',
          text: 'Doble mapa ilustrado de islas flotantes y rutas de viento.',
          image: '/landing/samples/huracan-vol2/3.webp',
        },
        right: {
          title: 'La Capitana del Alisio',
          text: 'Retrato heroico con emblemas y vestuario fijados en el canon.',
          image: '/landing/samples/huracan-vol2/4.webp',
        },
      },
      {
        left: {
          title: 'Tormenta de Relámpagos Rojos',
          text: 'Contraste dramático de tinta negra y destellos carmesí.',
          image: '/landing/samples/huracan-vol2/5.webp',
        },
        right: {
          title: 'El Faro Ancestral',
          text: 'Descubrimiento de ruinas colosales al cierre del capítulo.',
          image: '/landing/samples/huracan-vol2/6.webp',
        },
      },
      {
        left: {
          title: 'Tripulación Completa · Settei',
          text: 'Comparativa de alturas y equipo de navegación del escuadrón.',
          image: '/landing/samples/huracan-vol2/7.webp',
        },
        right: {
          title: 'Próximo Destino · Vol. III',
          text: 'Ilustración de cierre lista para exportar a KDP y Webtoon.',
          image: '/landing/samples/huracan-vol2/8.webp',
        },
      },
    ],
  },
];

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let currentBook = 0;
let isBookOpen = false;
let spreadIndex = 0;
let isFlipping = false;

let autoplayTimer = null;

// Pinwheel 3D rotor state
const PANEL_COUNT = BOOKS.length;
const STEP_RAD = (Math.PI * 2) / PANEL_COUNT;
let rotorAngle = reducedMotion ? 0 : -Math.PI * 0.85;
let targetRotorAngle = 0;
let pointerTiltX = 0;
let pointerTiltY = 0;
let targetPointerTiltX = 0;
let targetPointerTiltY = 0;
let pinwheelRafId = null;
let isDraggingPinwheel = false;
let dragStartX = 0;
let dragStartAngle = 0;
let dragMovedPx = 0;
let cachedStageWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
let cachedStageRect = null;

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function refreshStageMetrics() {
  const stage = $('#bookStage');
  if (!stage) return;
  cachedStageRect = stage.getBoundingClientRect();
  cachedStageWidth = cachedStageRect.width || window.innerWidth;
}

function normalizeSignedAngle(rad) {
  let a = (rad + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
}

function applyHeroPresetsConfig() {
  const openBookEl = $('#mangaOpenBook');
  const stageEl = $('#bookStage');
  if (stageEl) {
    stageEl.style.setProperty('--pinwheel-perspective', `${pinwheelOptions.perspectivePx}px`);
    stageEl.style.setProperty('--pinwheel-corners', `${pinwheelOptions.corners}px`);
    stageEl.setAttribute(
      'aria-label',
      isBookOpen ? creaseCarouselOptions.ariaLabel : pinwheelOptions.ariaLabel,
    );
  }
  if (!openBookEl) return;
  const tiltDeg = ((creaseCarouselOptions.curl / 100) * 5.6).toFixed(2);
  openBookEl.style.setProperty('--crease-radius', `${creaseCarouselOptions.cornerRadius}px`);
  openBookEl.style.setProperty('--crease-duration', `${creaseCarouselOptions.duration}s`);
  openBookEl.style.setProperty('--crease-curl', String(creaseCarouselOptions.curl));
  openBookEl.style.setProperty('--crease-tilt', `${tiltDeg}deg`);
  openBookEl.style.setProperty(
    'aspect-ratio',
    `${creaseCarouselOptions.cardWidth} / ${creaseCarouselOptions.cardHeight}`,
  );

  $$('.manga-closed-book').forEach((card, i) => {
    const item = pinwheelOptions.items[i];
    const img = card.querySelector('.book-cover-img');
    if (item && img) {
      img.style.objectPosition = `${item.focalX}% ${item.focalY}%`;
    }
  });
  refreshStageMetrics();
}

function renderPinwheelFrame() {
  pinwheelRafId = null;
  if (isBookOpen) return;

  const shelf = $('#mangaShelf');
  const stage = $('#bookStage');
  if (!shelf || !stage) return;

  const angleDiff = targetRotorAngle - rotorAngle;
  const tiltDiffX = targetPointerTiltX - pointerTiltX;
  const tiltDiffY = targetPointerTiltY - pointerTiltY;

  const damping = isDraggingPinwheel ? 0.36 : reducedMotion ? 1 : 0.11;
  rotorAngle += angleDiff * damping;
  pointerTiltX += tiltDiffX * 0.12;
  pointerTiltY += tiltDiffY * 0.12;

  const stageWidth = cachedStageWidth || window.innerWidth;
  const compact = stageWidth < 760;
  const hubOffset = pinwheelOptions.hub * (compact ? 0.25 : 1.25);
  const radiusX = Math.min(430, Math.max(92, stageWidth * (compact ? 0.27 : 0.35))) + hubOffset;
  const radiusZ = Math.min(255, Math.max(85, stageWidth * (compact ? 0.18 : 0.21)));
  const pullPx = pinwheelOptions.pull * (compact ? 0.95 : 1.45);
  const leanFactor = pinwheelOptions.lean * (compact ? 0.24 : 0.4);
  const bendFactor = pinwheelOptions.bend * 0.56;
  const shadeRatio = pinwheelOptions.shade / 100;

  shelf.style.transform = `rotateX(${(-3.5 + pointerTiltY).toFixed(2)}deg) rotateY(${pointerTiltX.toFixed(2)}deg)`;

  const cards = $$('.manga-closed-book');
  cards.forEach((card, i) => {
    const theta = normalizeSignedAngle(i * STEP_RAD + rotorAngle);
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const depth01 = (cosT + 1) * 0.5;
    const frontness = Math.max(0, cosT);
    const focusCurve = Math.pow(frontness, 3.4);

    const x = sinT * radiusX;
    const z = cosT * radiusZ + focusCurve * pullPx - radiusZ * 0.32;
    const y = (1 - cosT) * leanFactor - focusCurve * 12;
    const rotY = sinT * -40 * (1 - focusCurve * 0.75);
    const rotZ = sinT * bendFactor * (1 - focusCurve * 0.86);
    const scale = (compact ? 0.68 : 0.72) + depth01 * 0.28 + focusCurve * 0.1;
    const brightness = (1 - (1 - depth01) * shadeRatio * 1.18).toFixed(3);
    const opacity = (0.34 + depth01 * 0.66).toFixed(3);

    card.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${rotY.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
    card.style.filter = `brightness(${brightness})`;
    card.style.opacity = opacity;
    card.style.zIndex = String(Math.round(200 + z));
  });

  if (
    Math.abs(angleDiff) > 0.0008 ||
    Math.abs(tiltDiffX) > 0.01 ||
    Math.abs(tiltDiffY) > 0.01
  ) {
    schedulePinwheelFrame();
  } else {
    rotorAngle = targetRotorAngle;
  }
}

function schedulePinwheelFrame() {
  if (pinwheelRafId !== null || isBookOpen) return;
  pinwheelRafId = window.requestAnimationFrame(renderPinwheelFrame);
}

function syncTargetRotorToBook(index) {
  const desired = -index * STEP_RAD;
  const delta = normalizeSignedAngle(desired - targetRotorAngle);
  targetRotorAngle += delta;
  if (reducedMotion) {
    rotorAngle = targetRotorAngle;
  }
  schedulePinwheelFrame();
}

function getActiveSpreads(book) {
  const opening = {
    left: { title: book.title, text: book.desc, image: book.coverArt },
    right: { title: book.genre, text: book.subtitle, image: book.spreads[0].left.image },
  };
  const closing = {
    left: { title: 'Colofón', text: book.title, image: book.spreads.at(-1).right.image },
    right: { title: 'Continuar en el Studio', text: 'Pulsa Abrir Tomo para trabajar en esta obra.', image: book.coverArt },
  };
  return [opening, ...book.spreads, closing];
}

function populatePageSide(prefix, pageData, pageNumber, book) {
  if (!pageData) return;
  const numEl = $(`#${prefix}Num`);
  const volEl = $(`#${prefix}Vol`);
  const imgEl = $(`#${prefix}Img`);
  const titleEl = $(`#${prefix}Title`);
  const textEl = $(`#${prefix}Text`);

  if (numEl) numEl.textContent = 'PÁG. ' + String(pageNumber).padStart(2, '0');
  if (volEl) volEl.textContent = book.volume;
  if (imgEl) {
    const inside = imgEl.parentElement;
    const story = book.spreads[Math.floor((pageNumber - 1) / 2) - 1];
    inside.classList.toggle('story-half', Boolean(story));
    inside.classList.toggle('story-right', pageNumber % 2 === 0);
    if (story) inside.style.setProperty('--panorama', `url("${story.left.image}")`);
    else inside.style.removeProperty('--panorama');
    imgEl.src = pageData.image;
    imgEl.alt = prefix.startsWith('leaf') ? '' : `${pageData.title} — ${book.title}`;
    imgEl.style.objectPosition = 'center center';
  }
  if (titleEl) titleEl.textContent = pageData.title;
  if (textEl) textEl.textContent = pageData.text;
}

function wrapIndex(i) {
  return ((i % BOOKS.length) + BOOKS.length) % BOOKS.length;
}

function buildStudioDeepLink(book, tab = 'kai', overrides = {}) {
  const b = book || BOOKS[0];
  const style = overrides.style || b.studioStyle;
  const prompt = overrides.prompt || b.studioPrompt;
  const baseUrl = tab === 'kai' ? '/studio?tab=kai' : `/studio?tab=${encodeURIComponent(tab)}`;
  return (
    baseUrl +
    '&volume=' + encodeURIComponent(b.id) +
    '&title=' + encodeURIComponent(b.title) +
    '&style=' + encodeURIComponent(style) +
    '&prompt=' + encodeURIComponent(prompt)
  );
}

function buildKaiDeepLink(book) {
  return buildStudioDeepLink(book, 'kai');
}

function clearTurningLeaf() {
  const book = BOOKS[currentBook] || BOOKS[0];
  const spreads = getActiveSpreads(book);
  const nextIdx = (spreadIndex + 1) % Math.max(1, spreads.length);
  const standbySpread = spreads[nextIdx] || spreads[0];
  if (!standbySpread) return;

  populatePageSide('leafFront', standbySpread.left, nextIdx * 2 + 1, book);
  populatePageSide('leafBack', standbySpread.right, nextIdx * 2 + 2, book);
}

function cancelFlip() {
  cancelAnimationFrame(settleFrame);
  turn = null;
  $('#turningLeaf').style.removeProperty('transform');
  isFlipping = false;
  const openBookEl = $('#mangaOpenBook');
  const leaf = $('#turningLeaf');
  const shadow = $('#creaseCastShadow');
  if (openBookEl) openBookEl.classList.remove('flipping-next', 'flipping-prev');
  if (leaf) leaf.hidden = true;
  if (shadow) shadow.hidden = true;
  clearTurningLeaf();
}

function populateInspectionModal(bookIndex = currentBook) {
  const book = BOOKS[wrapIndex(bookIndex)] || BOOKS[0];
  const spreads = getActiveSpreads(book);
  const coverSrc = book.coverArt || book.art;

  const modalArt = $('#modalArt');
  const modalArtFallback = $('#modalArtFallback');
  const modalFallbackVol = $('#modalFallbackVol');
  const modalFallbackTitle = $('#modalFallbackTitle');
  const modalFallbackGenre = $('#modalFallbackGenre');
  const modalTag = $('#modalTag');
  const modalVolumeChip = $('#modalVolumeChip');
  const modalGenreChip = $('#modalGenreChip');
  const modalTitle = $('#modalTitle');
  const modalSubtitle = $('#modalSubtitle');
  const modalDesc = $('#modalDesc');
  const modalStudioBtn = $('#modalStudioBtn');

  if (modalArt) {
    modalArt.hidden = false;
    modalArt.src = coverSrc;
    modalArt.alt = `Portada oficial: ${book.title} (${book.volume})`;
  }
  if (modalArtFallback) modalArtFallback.hidden = true;
  if (modalFallbackVol) modalFallbackVol.textContent = book.volume;
  if (modalFallbackTitle) modalFallbackTitle.textContent = book.title;
  if (modalFallbackGenre) modalFallbackGenre.textContent = book.genre.toUpperCase();

  if (modalTag) {
    modalTag.textContent = `MANGAI ORIGINALS · ${book.volume} · ${book.genre.toUpperCase()}`;
  }
  if (modalVolumeChip) modalVolumeChip.textContent = book.volume;
  if (modalGenreChip) modalGenreChip.textContent = book.genre;
  if (modalTitle) modalTitle.textContent = book.title;
  if (modalSubtitle) {
    modalSubtitle.textContent = `Serie ${book.series} · ${book.subtitle} · ${spreads.length} pliegos (${spreads.length * 2} páginas Genkō)`;
  }
  if (modalDesc) modalDesc.textContent = book.desc;
  if (modalStudioBtn) modalStudioBtn.href = buildKaiDeepLink(book);
}

function openInspectionModal(bookIndex = currentBook) {
  const modal = $('#modal');
  if (!modal) return;
  populateInspectionModal(bookIndex);
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  $('#modalClose')?.focus?.({ preventScroll: true });
}

function paintStack(container, spreads, side) {
  container.replaceChildren(...spreads.map((spread, index) => {
    const image = document.createElement('img');
    image.alt = '';
    image.src = spread[side].image;
    image.style.setProperty('--depth', index + 1);
    image.style.zIndex = String(spreads.length - index);
    return image;
  }));
}

function renderHeroBookViewer() {
  const book = BOOKS[currentBook] || BOOKS[0];
  const spreads = getActiveSpreads(book);
  spreadIndex = Math.max(0, Math.min(spreadIndex, Math.max(0, spreads.length - 1)));
  const spread = spreads[spreadIndex] || spreads[0];

  const heroGenre = $('#heroGenre');
  const heroBookTitle = $('#heroBookTitle');
  const heroBookSubtitle = $('#heroBookSubtitle');
  const heroIndex = $('#heroIndex');
  const editWithKaiBtn = $('#editWithKaiBtn');

  const stageEl = $('#bookStage');

  if (heroGenre) heroGenre.textContent = book.genre.toUpperCase();
  if (heroBookTitle) heroBookTitle.textContent = book.title;
  if (heroBookSubtitle) {
    heroBookSubtitle.textContent = isBookOpen
      ? 'Pliego ' + (spreadIndex + 1) + ' de ' + spreads.length + ' — Haz clic en las páginas o salta al siguiente tomo en 3D'
      : 'Gira la rueda Pinwheel 3D o haz clic en el tomo frontal para abrir sus pliegos con efecto Crease';
  }
  if (heroIndex) {
    heroIndex.textContent = isBookOpen
      ? String(spreadIndex + 1).padStart(2, '0') + ' / ' + String(spreads.length).padStart(2, '0')
      : String(currentBook + 1).padStart(2, '0') + ' / ' + String(BOOKS.length).padStart(2, '0');
  }
  if (editWithKaiBtn) {
    editWithKaiBtn.href = buildKaiDeepLink(book);
  }

  populateInspectionModal(currentBook);

  if (stageEl) {
    stageEl.setAttribute(
      'aria-label',
      isBookOpen ? creaseCarouselOptions.ariaLabel : pinwheelOptions.ariaLabel,
    );
  }

  const shelf = $('#mangaShelf');
  const openBookEl = $('#mangaOpenBook');
  const dockClosed = $('#dockClosedControls');
  const dockOpen = $('#dockOpenControls');

  if (openBookEl) {
    if (isBookOpen) {
      paintStack(openBookEl.querySelector('.page-stack-left'), spreads.slice(0, spreadIndex).reverse(), 'left');
      paintStack(openBookEl.querySelector('.page-stack-right'), spreads.slice(spreadIndex + 1), 'right');
    }
    const maxIdx = Math.max(1, spreads.length - 1);
    const ratio = spreadIndex / maxIdx;
    const leftStackPx = Math.round(8 + ratio * 10);
    const rightStackPx = Math.round(18 - ratio * 10);
    openBookEl.style.setProperty('--left-stack-px', `${leftStackPx}px`);
    openBookEl.style.setProperty('--right-stack-px', `${rightStackPx}px`);
  }

  const action = $('#openActiveBookBtn');
  if (isBookOpen && action.parentElement !== dockOpen) dockOpen.append(action);
  else if (!isBookOpen && action.parentElement !== dockClosed) dockClosed.insertBefore(action, $('#inspectActiveBookBtn'));
  action.title = isBookOpen ? 'Continuar este tomo en el Studio' : 'Hojear este tomo';
  if (shelf) shelf.hidden = isBookOpen;
  if (openBookEl) openBookEl.hidden = !isBookOpen;
  if (dockClosed) dockClosed.hidden = isBookOpen;
  if (dockOpen) dockOpen.hidden = !isBookOpen;

  $$('.manga-closed-book').forEach((card, i) => {
    const idx = Number(card.dataset.book ?? i);
    const active = idx === currentBook;
    const item = BOOKS[idx] || BOOKS[i];
    card.classList.toggle('is-active', active);
    card.setAttribute('aria-current', active ? 'true' : 'false');
    if (item) {
      card.setAttribute('aria-label', (active ? 'Abrir tomo: ' : 'Seleccionar tomo: ') + item.title);
    }
  });

  if (!isBookOpen) {
    renderPinwheelFrame();
  }

  if (isBookOpen && spread) {
    populatePageSide('leftPage', spread.left, spreadIndex * 2 + 1, book);
    populatePageSide('rightPage', spread.right, spreadIndex * 2 + 2, book);
  }
  if (isBookOpen && !isFlipping) {
    clearTurningLeaf();
  }

  const atLastSpread = spreadIndex >= spreads.length - 1;
  const nextSpreadBtn = $('#nextSpreadBtn');
  const openPageLeft = $('#openPageLeft');
  const openPageRight = $('#openPageRight');
  if (nextSpreadBtn) nextSpreadBtn.disabled = atLastSpread;
  if (openPageRight) openPageRight.setAttribute('aria-disabled', atLastSpread ? 'true' : 'false');
  if (openPageLeft) {
    openPageLeft.setAttribute(
      'aria-label',
      spreadIndex === 0 ? 'Cerrar tomo y volver al Pinwheel 3D' : 'Página anterior',
    );
  }

}

function prepareTurn(targetIdx) {
  if (!isBookOpen || isFlipping) return;
  const book = BOOKS[currentBook] || BOOKS[0];
  const spreads = getActiveSpreads(book);
  if (targetIdx < 0 || targetIdx >= spreads.length || targetIdx === spreadIndex) return;

  const goingForward = targetIdx > spreadIndex;
  const currentSpread = spreads[spreadIndex];
  const destinationSpread = spreads[targetIdx];
  if (!currentSpread || !destinationSpread) return;

  isFlipping = true;
  const openBookEl = $('#mangaOpenBook');
  const leaf = $('#turningLeaf');
  const shadow = $('#creaseCastShadow');

  if (goingForward) {
    populatePageSide('leafFront', currentSpread.right, spreadIndex * 2 + 2, book);
    populatePageSide('leafBack', destinationSpread.left, targetIdx * 2 + 1, book);
    populatePageSide('rightPage', destinationSpread.right, targetIdx * 2 + 2, book);
  } else {
    populatePageSide('leafFront', currentSpread.left, spreadIndex * 2 + 1, book);
    populatePageSide('leafBack', destinationSpread.right, targetIdx * 2 + 2, book);
    populatePageSide('leftPage', destinationSpread.left, targetIdx * 2 + 1, book);
  }

  if (openBookEl) {
    openBookEl.classList.remove('flipping-next', 'flipping-prev');
    openBookEl.classList.add(goingForward ? 'flipping-next' : 'flipping-prev');
  }
  if (leaf) leaf.hidden = false;
  if (shadow) shadow.hidden = false;

  turn = { targetIdx, sign: goingForward ? -1 : 1, progress: 0 };
  paintTurn(0);
}

let turn = null;
let settleFrame = 0;

function paintTurn(progress) {
  turn.progress = progress;
  const angle = 180 * progress;
  const shade = Math.abs(Math.sin(angle * Math.PI / 180));
  $('#turningLeaf').style.transform = `rotateY(${turn.sign * angle}deg)`;
  $('#mangaOpenBook').style.setProperty('--fold-shade', shade.toFixed(3));
}

function settleTurn(destination) {
  if (!turn) return;
  const start = turn.progress;
  const time = performance.now();
  const duration = reducedMotion ? 0 : 270 + 480 * Math.abs(destination - start);
  function tick(now) {
    const t = duration ? Math.min(1, (now - time) / duration) : 1;
    // Critically damped spring with a normalized endpoint.
    const spring = (1 - (1 + 7*t) * Math.exp(-7*t)) / (1 - 8*Math.exp(-7));
    paintTurn(start + (destination - start) * spring);
    if (t < 1) { settleFrame = requestAnimationFrame(tick); return; }
    if (destination) spreadIndex = turn.targetIdx;
    cancelFlip();
    renderHeroBookViewer();
  }
  settleFrame = requestAnimationFrame(tick);
}

function transitionToSpread(targetIdx) {
  if (isFlipping) return;
  prepareTurn(targetIdx);
  settleTurn(1);
}

function selectBook(index) {
  cancelFlip();
  currentBook = wrapIndex(index);
  syncTargetRotorToBook(currentBook);
  renderHeroBookViewer();
}

function spin(d) {
  if (isBookOpen) return;
  selectBook(currentBook + d);
}

function openBook(index = currentBook) {
  const activeEl = document.activeElement;
  const moveFocus = Boolean(activeEl && activeEl.matches && activeEl.matches(':focus-visible'));
  cancelFlip();
  currentBook = wrapIndex(index);
  syncTargetRotorToBook(currentBook);
  spreadIndex = 0;
  const active = document.querySelector('.manga-closed-book.is-active');
  const oldRect = active.getBoundingClientRect();
  const shelf = $('#mangaShelf');
  isBookOpen = true;
  renderHeroBookViewer();
  if (!reducedMotion) {
    shelf.hidden = false;
    shelf.inert = true;
    shelf.classList.add('retiring-shelf');
    active.style.visibility = 'hidden';
    const fade = shelf.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250 });
    fade.finished.then(() => {
      shelf.classList.remove('retiring-shelf');
      shelf.inert = false;
      shelf.hidden = isBookOpen;
      active.style.visibility = '';
    }).catch(() => {});
    const book = $('#mangaOpenBook');
    const cover = document.createElement('img');
    cover.className = 'opening-jacket';
    cover.alt = '';
    cover.src = BOOKS[currentBook].coverArt;
    book.append(cover);
    const rect = cover.getBoundingClientRect();
    const dx = oldRect.left - rect.left, dy = oldRect.top - rect.top;
    cover.animate([
      { transform: `translate(${dx}px,${dy}px) scale(${oldRect.width/rect.width},${oldRect.height/rect.height})` },
      { transform: 'rotateY(0deg)', offset: .4 },
      { transform: 'rotateY(-179deg)' },
    ], { duration: 700, easing: 'cubic-bezier(.22,.65,.28,1)' }).finished.finally(() => cover.remove());
  }
  if (moveFocus) {
    $('#closeBookBtn')?.focus?.({ preventScroll: true });
  }
}

function closeBook() {
  if (!isBookOpen) return;
  const activeEl = document.activeElement;
  const restoreFocus = Boolean(
    activeEl &&
      activeEl.matches &&
      activeEl.matches(':focus-visible') &&
      activeEl.closest &&
      (activeEl.closest('#mangaOpenBook') || activeEl.closest('#dockOpenControls')),
  );
  cancelFlip();
  isBookOpen = false;
  syncTargetRotorToBook(currentBook);
  renderHeroBookViewer();
  if (restoreFocus) {
    $('#openActiveBookBtn')?.focus?.({ preventScroll: true });
  }
}

function nextSpread() {
  if (!isBookOpen || isFlipping) return;
  const book = BOOKS[currentBook] || BOOKS[0];
  const spreads = getActiveSpreads(book);
  if (spreadIndex >= spreads.length - 1) return;
  transitionToSpread(spreadIndex + 1);
}

function prevSpread() {
  if (!isBookOpen || isFlipping) return;
  if (spreadIndex <= 0) {
    closeBook();
    return;
  }
  transitionToSpread(spreadIndex - 1);
}

function setupCreaseAutoplay() {
  if (!creaseCarouselOptions.autoplay || reducedMotion) return;
  const clearAuto = () => {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  };
  const startAuto = () => {
    clearAuto();
    autoplayTimer = setInterval(() => {
      if (isFlipping) return;
      if (isBookOpen) {
        const spreads = getActiveSpreads(BOOKS[currentBook] || BOOKS[0]);
        const nextIdx = (spreadIndex + 1) % spreads.length;
        transitionToSpread(nextIdx);
      } else {
        spin(1);
      }
    }, creaseCarouselOptions.intervalMs);
  };
  const stage = $('#heroBookStage');
  stage?.addEventListener('pointerenter', clearAuto);
  stage?.addEventListener('pointerleave', startAuto);
  stage?.addEventListener('focusin', clearAuto);
  stage?.addEventListener('focusout', startAuto);
  startAuto();
}

$('#prevBook')?.addEventListener('click', (e) => {
  e.stopPropagation();
  spin(-1);
});
$('#nextBook')?.addEventListener('click', (e) => {
  e.stopPropagation();
  spin(1);
});
$('#openActiveBookBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (isBookOpen) window.location.assign(buildStudioDeepLink(BOOKS[currentBook], 'koma'));
  else openBook(currentBook);
});
$('#inspectActiveBookBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  openInspectionModal(currentBook);
});
$('#inspectOpenBookBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  openInspectionModal(currentBook);
});
let didSwipe = false;

$$('.manga-closed-book').forEach((card, i) => {
  card.addEventListener('click', (e) => {
    e.stopPropagation();
    if (didSwipe) {
      didSwipe = false;
      return;
    }
    const idx = Number(card.dataset.book ?? i);
    if (idx === currentBook) {
      openBook(idx);
    } else {
      selectBook(idx);
    }
  });
});

$('#openPageRight')?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (didSwipe) {
    didSwipe = false;
    return;
  }
  nextSpread();
});
$('#openPageLeft')?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (didSwipe) {
    didSwipe = false;
    return;
  }
  prevSpread();
});
$('#nextSpreadBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  nextSpread();
});
$('#prevSpreadBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  prevSpread();
});
$('#closeBookBtn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  closeBook();
});

document.addEventListener('click', (event) => {
  if (!isBookOpen || !$('#modal').hidden || !(event.target instanceof Element)) return;
  if (!event.target.closest('#mangaOpenBook, #mangaiDockControls, #modal')) closeBook();
});

const bookStage = $('#bookStage');
let wheelCooldown = 0;
if (bookStage) {
  bookStage.addEventListener(
    'wheel',
    (e) => {
      const horizontalIntent = Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.1;
      if (!horizontalIntent) return;
      e.preventDefault();
      const now = performance.now();
      if (now - wheelCooldown < Math.max(90, 260 - pinwheelOptions.scrollResponse)) return;
      wheelCooldown = now;
      const dir = Math.sign(e.deltaX);
      if (dir === 0) return;
      if (isBookOpen) {
        if (dir > 0) nextSpread();
        else prevSpread();
      } else {
        spin(dir);
      }
    },
    { passive: false },
  );

  let gesture = null;
  const sheet = $('#mangaOpenBook');
  bookStage.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    if (isBookOpen && !isFlipping && e.target.closest('.manga-page')) {
      gesture = { id: e.pointerId, x: e.clientX, y: e.clientY,
        direction: e.target.closest('.page-right') ? 1 : -1, width: sheet.clientWidth / 2 };
    }
    didSwipe = false;
    refreshStageMetrics();
    if (!isBookOpen && e.button === 0) {
      isDraggingPinwheel = true;
      dragStartX = e.clientX;
      dragStartAngle = targetRotorAngle;
      dragMovedPx = 0;
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (gesture?.id === e.pointerId && isBookOpen) {
      const dx = (gesture.x - e.clientX) * gesture.direction;
      if (!turn && Math.abs(e.clientY - gesture.y) > Math.max(10, Math.abs(dx))) { gesture = null; return; }
      if (!turn && dx > 5) {
        prepareTurn(spreadIndex + gesture.direction);
        if (turn) sheet.setPointerCapture(e.pointerId);
      }
      if (turn) {
        didSwipe = true;
        if (!reducedMotion) paintTurn(Math.min(1, Math.max(0, dx / gesture.width)));
      }
      return;
    }
    if (!isBookOpen && !reducedMotion && cachedStageRect) {
      const rect = cachedStageRect;
      if (
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom &&
        e.clientX >= rect.left &&
        e.clientX <= rect.right
      ) {
        const nx = (e.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
        const ny = (e.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
        targetPointerTiltX = nx * pinwheelOptions.pointerSpin * 1.1;
        targetPointerTiltY = -ny * pinwheelOptions.pointerSpin * 0.75;
        schedulePinwheelFrame();
      }
    }

    if (!isDraggingPinwheel || isBookOpen) return;
    const dx = e.clientX - dragStartX;
    dragMovedPx = Math.max(dragMovedPx, Math.abs(dx));
    const spinSensitivity = 0.0022 + pinwheelOptions.pointerSpin * 0.00042;
    targetRotorAngle = dragStartAngle + dx * spinSensitivity;
    const nearestIdx = wrapIndex(Math.round(-targetRotorAngle / STEP_RAD));
    if (nearestIdx !== currentBook) {
      currentBook = nearestIdx;
      renderHeroBookViewer();
    }
    schedulePinwheelFrame();
  });

  const finishPointerInteraction = (e) => {
    if (isDraggingPinwheel) {
      isDraggingPinwheel = false;
      if (dragMovedPx > 14) {
        didSwipe = true;
        setTimeout(() => {
          didSwipe = false;
        }, 80);
        const snappedIndex = wrapIndex(Math.round(-targetRotorAngle / STEP_RAD));
        selectBook(snappedIndex);
      } else {
        syncTargetRotorToBook(currentBook);
      }

      return;
    }

    if (gesture?.id !== e.pointerId) return;
    if (turn && didSwipe) {
      const distance = (gesture.x - e.clientX) * gesture.direction;
      settleTurn(e.type !== 'pointercancel' && distance > gesture.width * .24 ? 1 : 0);
    }
    gesture = null;
  };

  window.addEventListener('pointerup', finishPointerInteraction);
  window.addEventListener('pointercancel', finishPointerInteraction);
  bookStage.addEventListener('pointerleave', () => {
    targetPointerTiltX = 0;
    targetPointerTiltY = 0;
    schedulePinwheelFrame();
  });
}

window.addEventListener(
  'resize',
  () => {
    refreshStageMetrics();
    if (!isBookOpen) schedulePinwheelFrame();
  },
  { passive: true },
);

applyHeroPresetsConfig();
renderHeroBookViewer();
schedulePinwheelFrame();
setupCreaseAutoplay();

const modal = $('#modal');
const modalArtImg = $('#modalArt');
modalArtImg?.addEventListener('error', () => {
  modalArtImg.hidden = true;
  const fallback = $('#modalArtFallback');
  if (fallback) fallback.hidden = false;
});

function closeModal() {
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = '';
}

$('#modalClose')?.addEventListener('click', closeModal);
$('#modalExplore')?.addEventListener('click', closeModal);
$('#modalOpenSpreadsBtn')?.addEventListener('click', () => {
  closeModal();
  openBook(currentBook);
});
modal?.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

function startStudio() {
  window.location.assign('/studio');
}

$$('[data-open-studio]').forEach((b) => b.addEventListener('click', startStudio));

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (modal && !modal.hidden) closeModal();
    else if (isBookOpen) closeBook();
    return;
  }
  if (modal && !modal.hidden) return;

  const activeEl = document.activeElement;
  const inHero = Boolean(activeEl && activeEl.closest && activeEl.closest('.hero'));

  if (e.key === 'ArrowRight' && (isBookOpen || inHero)) {
    e.preventDefault();
    if (isBookOpen) nextSpread();
    else spin(1);
  } else if (e.key === 'ArrowLeft' && (isBookOpen || inHero)) {
    e.preventDefault();
    if (isBookOpen) prevSpread();
    else spin(-1);
  } else if ((e.key === 'Enter' || e.key === ' ') && !isBookOpen && inHero) {
    if (!(e.target instanceof Element && e.target.closest('button, a, input, textarea, select'))) {
      e.preventDefault();
      openBook(currentBook);
    }
  }
});

const menuToggle = $('#menuToggle');
const mobileDropdown = $('#mobileDropdown');
function setMobileMenuOpen(open) {
  if (!mobileDropdown || !menuToggle) return;
  mobileDropdown.classList.toggle('show', open);
  menuToggle.setAttribute('aria-expanded', String(open));
}

menuToggle?.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = mobileDropdown?.classList.contains('show');
  setMobileMenuOpen(!isOpen);
});
$$('#mobileDropdown a, #mobileDropdown button').forEach((el) =>
  el.addEventListener('click', () => setMobileMenuOpen(false)),
);
document.addEventListener('click', (e) => {
  if (!mobileDropdown?.classList.contains('show')) return;
  if (e.target instanceof Element && !e.target.closest('#top')) {
    setMobileMenuOpen(false);
  }
});

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add('in-view');
      }),
    { threshold: 0.12 },
  );
  $$('.fadeup, .reveal-card').forEach((e) => observer.observe(e));
} else {
  $$('.fadeup, .reveal-card').forEach((e) => e.classList.add('in-view'));
}

if (location.hash === '#studio') startStudio();

function initSumiStoryFlow() {
  const storyFlow = $('#storyFlow');
  if (!storyFlow) return;

  const inkFill = $('#sumiInkFill');
  const cloudTop = $('#ukiyoCloudTop');
  const cloudBottom = $('#ukiyoCloudBottom');
  const waves = $('#suminagashiWaves');
  const watermark = $('.hero-watermark');

  // Cache layout metrics outside scroll handler to avoid layout thrashing on scroll
  let storyFlowTopDoc = 0;
  let storyFlowHeight = 1;
  let viewportHeight = window.innerHeight || 800;
  let scrollRafId = null;

  function cacheScrollMetrics() {
    viewportHeight = window.innerHeight || 800;
    const rect = storyFlow.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset || 0;
    storyFlowTopDoc = rect.top + scrollY;
    storyFlowHeight = Math.max(1, rect.height);
  }

  function updateStoryScroll() {
    scrollRafId = null;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const relativeTop = storyFlowTopDoc - scrollY;
    const totalScrollable = Math.max(1, storyFlowHeight - viewportHeight);
    const progress = Math.min(1, Math.max(0, -relativeTop / totalScrollable));

    if (inkFill) {
      const scaleY = reducedMotion ? 1 : Math.min(1, Math.max(0.04, progress * 1.04));
      inkFill.style.transform = `scaleY(${scaleY.toFixed(3)})`;
    }

    if (!reducedMotion) {
      if (watermark) {
        const drift = Math.min(75, Math.max(-75, scrollY * 0.1));
        watermark.style.transform = `translate3d(${drift.toFixed(1)}px, 0, 0)`;
      }
      if (cloudTop) {
        cloudTop.style.transform = `translate3d(0, ${(progress * -70).toFixed(1)}px, 0)`;
      }
      if (cloudBottom) {
        cloudBottom.style.transform = `translate3d(0, ${(progress * 50).toFixed(1)}px, 0)`;
      }
      if (waves) {
        waves.style.transform = `translate3d(0, ${(progress * -35).toFixed(1)}px, 0)`;
      }
    }
  }

  function scheduleStoryScroll() {
    if (scrollRafId !== null) return;
    scrollRafId = window.requestAnimationFrame(updateStoryScroll);
  }

  cacheScrollMetrics();
  window.addEventListener('scroll', scheduleStoryScroll, { passive: true });
  window.addEventListener(
    'resize',
    () => {
      cacheScrollMetrics();
      scheduleStoryScroll();
    },
    { passive: true },
  );
  updateStoryScroll();

  const folioCards = $$('#collectionFanStack .folio-card');
  const collectionStudioLink = $('#collectionStudioLink');
  const updateCollectionStudioLink = (card) => {
    if (!collectionStudioLink || !card) return;
    const volId = card.dataset.volume || BOOKS[0].id;
    const matched = BOOKS.find((b) => b.id === volId) || BOOKS[0];
    collectionStudioLink.href = buildStudioDeepLink(matched, 'koma');
  };
  const initialFolio = folioCards.find((item) => item.classList.contains('is-focused')) || folioCards[0];
  if (initialFolio) updateCollectionStudioLink(initialFolio);

  folioCards.forEach((card) => {
    card.addEventListener('click', () => {
      folioCards.forEach((item) => {
        const focused = item === card;
        item.classList.toggle('is-focused', focused);
        item.setAttribute('aria-pressed', focused ? 'true' : 'false');
      });
      updateCollectionStudioLink(card);
    });
  });

  const kaiBrushCard = $('#kaiBrushCard');
  const kaiBrushStudioLink = $('#kaiBrushStudioLink');
  const finishButtons = $$('#kaiBrushCard .brush-finish-btn[data-finish]');
  const finishClasses = ['finish-gpen', 'finish-tone', 'finish-crimson'];
  const finishStudioMap = {
    gpen: {
      style: 'manga_ink',
      prompt: `${BOOKS[0].studioPrompt}, pure black and white G-Pen sumi lineart`,
    },
    tone: {
      style: 'manga_ink',
      prompt: `${BOOKS[0].studioPrompt}, classic Japanese manga screentone halftone shading`,
    },
    crimson: {
      style: 'cover_art',
      prompt: `${BOOKS[0].studioPrompt}, dramatic crimson sumi ink accent lighting`,
    },
  };
  if (kaiBrushStudioLink) {
    kaiBrushStudioLink.href = buildStudioDeepLink(BOOKS[0], 'kai', finishStudioMap.crimson);
  }

  finishButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const finishKey = btn.dataset.finish;
      const finishClass = 'finish-' + finishKey;
      if (!finishClasses.includes(finishClass)) return;

      if (kaiBrushCard) {
        kaiBrushCard.classList.remove(...finishClasses);
        kaiBrushCard.classList.add(finishClass);
      }
      if (kaiBrushStudioLink && finishStudioMap[finishKey]) {
        kaiBrushStudioLink.href = buildStudioDeepLink(BOOKS[0], 'kai', finishStudioMap[finishKey]);
      }

      finishButtons.forEach((item) => {
        const active = item === btn;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    });
  });
}

function syncLandingAuthLink() {
  const navAuth = $('#navAuthLink');
  const mobileAuth = $('#mobileAuthLink');
  if (!navAuth && !mobileAuth) return;

  let signedInLabel = '';
  try {
    const rawLocal = window.localStorage?.getItem('mangai-local-session-v1');
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed && (parsed.displayName || parsed.email)) {
        signedInLabel = (parsed.displayName || parsed.email).trim().slice(0, 18);
      }
    }
  } catch {
    // Ignore storage access errors.
  }

  if (!signedInLabel && typeof document !== 'undefined' && /sb-[a-z0-9]+-auth-token/i.test(document.cookie || '')) {
    signedInLabel = 'Mi Cuenta';
  }

  if (signedInLabel) {
    if (navAuth) {
      navAuth.textContent = signedInLabel;
      navAuth.href = '/studio';
      navAuth.classList.add('is-signed-in');
      navAuth.setAttribute('title', 'Sesión activa · Ir al Estudio');
    }
    if (mobileAuth) {
      mobileAuth.textContent = `${signedInLabel} · Estudio`;
      mobileAuth.href = '/studio';
    }
  }
}

initSumiStoryFlow();
syncLandingAuthLink();
