import creaseCarouselOptions from './crease-carousel/preset.js';

const BOOKS = [
  {
    id: 'anacaona-vol1',
    title: 'AnaCaona: Flor Guerrera',
    series: 'AnaCaona',
    subtitle: 'Flor de guerra',
    volume: 'VOL. I',
    genre: 'Fantasía histórica',
    desc: 'Una leyenda caribeña reimaginada en tinta, memoria y aventura.',
    kind: 'ana',
    art: '/landing/assets/mangai-art-01.svg',
    coverArt: '/landing/assets/mangai-art-06.svg',
    coverBg: 'linear-gradient(135deg, #1e1b2e 0%, #3b1d4a 100%)',
    accentColor: '#f59e0b',
    studioStyle: 'manga_ink',
    studioPrompt:
      'Taino warrior queen AnaCaona standing defiantly in a moonlit Caribbean rainforest, ceremonial golden ornaments, flowing hair, dramatic sumi ink hatching and dynamic manga framing',
    spreads: [
      {
        left: {
          title: 'Capítulo 1: El Despertar de Quisqueya',
          text: 'Trazos iniciales de entintado y composición atmosférica para el primer acto.',
          image: creaseCarouselOptions.slots[0]?.left.imageUrl || '/landing/assets/mangai-art-12.svg',
          focalX: creaseCarouselOptions.slots[0]?.left.focalX ?? 50,
          focalY: creaseCarouselOptions.slots[0]?.left.focalY ?? 50,
        },
        right: {
          title: 'Duelo en la Selva',
          text: 'Perspectiva dramática y contraste de tinta sumi sobre papel Genkō.',
          image: creaseCarouselOptions.slots[0]?.right.imageUrl || '/landing/assets/mangai-art-19.svg',
          focalX: creaseCarouselOptions.slots[0]?.right.focalX ?? 50,
          focalY: creaseCarouselOptions.slots[0]?.right.focalY ?? 50,
        },
      },
      {
        left: {
          title: 'Settei de Personaje · Canon',
          text: 'Expresiones, silueta ceremonial y anclas visuales bloqueadas para el tomo.',
          image: creaseCarouselOptions.slots[1]?.left.imageUrl || '/landing/assets/mangai-art-21.svg',
          focalX: creaseCarouselOptions.slots[1]?.left.focalX ?? 50,
          focalY: creaseCarouselOptions.slots[1]?.left.focalY ?? 50,
        },
        right: {
          title: 'Edición Coleccionista Tankōbon',
          text: 'Maquetación de cubierta conceptual lista para exportación editorial.',
          image: creaseCarouselOptions.slots[1]?.right.imageUrl || '/landing/assets/mangai-art-22.svg',
          focalX: creaseCarouselOptions.slots[1]?.right.focalX ?? 50,
          focalY: creaseCarouselOptions.slots[1]?.right.focalY ?? 50,
        },
      },
      {
        left: {
          title: 'Areíto bajo la Lluvia',
          text: 'Ritmo secuencial en cinco viñetas con líneas cinéticas y tramas tradicionales.',
          image: creaseCarouselOptions.slots[2]?.left.imageUrl || '/landing/assets/mangai-art-14.svg',
          focalX: creaseCarouselOptions.slots[2]?.left.focalX ?? 50,
          focalY: creaseCarouselOptions.slots[2]?.left.focalY ?? 50,
        },
        right: {
          title: 'Juramento de Oro y Coral',
          text: 'Doble página de clímax narrativo asistida por Kai con sangrado KDP.',
          image: creaseCarouselOptions.slots[2]?.right.imageUrl || '/landing/assets/mangai-art-20.svg',
          focalX: creaseCarouselOptions.slots[2]?.right.focalX ?? 50,
          focalY: creaseCarouselOptions.slots[2]?.right.focalY ?? 50,
        },
      },
      {
        left: {
          title: ' Epílogo: Semilla de Fuego',
          text: 'Cierre de capítulo con iluminación dramática y globos vectoriales Fukidashi.',
          image: creaseCarouselOptions.slots[6]?.left.imageUrl || '/landing/assets/mangai-art-06.svg',
          focalX: creaseCarouselOptions.slots[6]?.left.focalX ?? 50,
          focalY: creaseCarouselOptions.slots[6]?.left.focalY ?? 50,
        },
        right: {
          title: 'Ficha Técnica de Imprenta',
          text: 'Revisión Pre-Flight a 300 DPI lista para publicación física y digital.',
          image: '/landing/assets/mangai-art-11.svg',
          focalX: 50,
          focalY: 50,
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
    desc: 'Cada noche, un reino desaparece de los mapas de la ciudad.',
    kind: 'atlas',
    art: '/landing/assets/mangai-art-02.svg',
    coverArt: '/landing/assets/mangai-art-07.svg',
    coverBg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    accentColor: '#38bdf8',
    studioStyle: 'webtoon_color',
    studioPrompt:
      'Young arcane cartographer holding a glowing astral compass inside a midnight archive where ancient ink maps float in mid-air, cyan rim lighting and deep slate shadows',
    spreads: [
      {
        left: {
          title: 'Archivo de Cartografía Arcana',
          text: 'Secuencia de viñetas con tramas limpias y profundidad espacial.',
          image: '/landing/assets/mangai-art-14.svg',
        },
        right: {
          title: 'La Brújula Astral',
          text: 'Encuadre vertical estilizado y ritmo narrativo asistido por Kai.',
          image: '/landing/assets/mangai-art-20.svg',
        },
      },
      {
        left: {
          title: 'Portada de Cuaderno de Campo',
          text: 'Estudio cromático en azules nocturnos e iluminación de contraste.',
          image: '/landing/assets/mangai-art-13.svg',
        },
        right: {
          title: 'Horizonte Desaparecido',
          text: 'Escena panorámica de transición entre distritos olvidados.',
          image: '/landing/assets/mangai-art-16.svg',
        },
      },
      {
        left: {
          title: 'Meridiano de Ceniza',
          text: 'Planos arquitectónicos imposibles generados manteniendo el canon del mundo.',
          image: '/landing/assets/mangai-art-18.svg',
        },
        right: {
          title: 'El Relojero sin Sombra',
          text: 'Encuentro clave en la torre sumergida con contraluces cian.',
          image: '/landing/assets/mangai-art-15.svg',
        },
      },
      {
        left: {
          title: 'Índice de Regiones Borradas',
          text: 'Mapa conceptual de lore sincronizado con la Biblia del Universo.',
          image: '/landing/assets/mangai-art-07.svg',
        },
        right: {
          title: 'Última Coordenada',
          text: 'Gancho final del primer tomo preparado para continuar en Estudio.',
          image: '/landing/assets/mangai-art-22.svg',
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
    desc: 'Una señal imposible transforma una ciudad dormida.',
    kind: 'nox',
    art: '/landing/assets/mangai-art-03.svg',
    coverArt: '/landing/assets/mangai-art-08.svg',
    coverBg: 'linear-gradient(135deg, #1b1526 0%, #3b2442 100%)',
    accentColor: '#c084fc',
    studioStyle: 'webtoon_color',
    studioPrompt:
      'Cyberpunk signal runner perched on a rain-soaked neon rooftop overlooking a sleeping megacity, violet holographic frequencies pulsing across the night sky, 3-point perspective',
    spreads: [
      {
        left: {
          title: 'Transmisión en el Distrito Cero',
          text: 'Perspectiva urbana de tres puntos y líneas cinéticas nocturnas.',
          image: '/landing/assets/mangai-art-16.svg',
        },
        right: {
          title: 'Frecuencia Desconocida · Vol. II',
          text: 'Diseño cromático violeta-magenta para la portada del segundo volumen.',
          image: '/landing/assets/mangai-art-15.svg',
        },
      },
      {
        left: {
          title: 'Eco en las Antenas',
          text: 'Secuencia de acción en azoteas con ritmo de lectura dinámico.',
          image: '/landing/assets/mangai-art-18.svg',
        },
        right: {
          title: 'Señal Interceptada',
          text: 'Primer plano con globo de diálogo y composición de alto impacto.',
          image: '/landing/assets/mangai-art-19.svg',
        },
      },
      {
        left: {
          title: 'Protocolo Fantasma',
          text: 'Infiltración en el núcleo orbital con hologramas en tinta carmesí.',
          image: '/landing/assets/mangai-art-08.svg',
        },
        right: {
          title: 'Pulso Magnético',
          text: 'Doble splash page con efectos Kakimoji integrados en capa vectorial.',
          image: '/landing/assets/mangai-art-20.svg',
        },
      },
      {
        left: {
          title: 'Archivo de Personajes · Nox',
          text: 'Hoja de referencia cibernética con visor y proporciones bloqueadas.',
          image: '/landing/assets/mangai-art-21.svg',
        },
        right: {
          title: 'Fin de Transmisión',
          text: 'Cierre de volumen listo para lectura vertical Webtoon o Tankōbon.',
          image: '/landing/assets/mangai-art-03.svg',
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
    desc: 'Dos hermanos descubren el precio de guardar un secreto.',
    kind: 'kuro',
    art: '/landing/assets/mangai-art-04.svg',
    coverArt: '/landing/assets/mangai-art-09.svg',
    coverBg: 'linear-gradient(135deg, #141923 0%, #273449 100%)',
    accentColor: '#94a3b8',
    studioStyle: 'manga_ink',
    studioPrompt:
      'Two estranged brothers facing each other across a rain-swept stone courtyard under a dim lantern, heavy monochrome brush shadows, intense silent manga standoff framing',
    spreads: [
      {
        left: {
          title: 'Los Silencios También Gritan',
          text: 'Composición minimalista en tinta negra y pausas dramáticas entre viñetas.',
          image: '/landing/assets/mangai-art-18.svg',
        },
        right: {
          title: 'Lámina de Portada · Kuro',
          text: 'Contraste editorial limpio sobre papel marfil con tipografía bold.',
          image: '/landing/assets/mangai-art-17.svg',
        },
      },
      {
        left: {
          title: 'Ficha de Continuidad Visual',
          text: 'Referencias de vestuario y proporciones para mantener consistencia.',
          image: '/landing/assets/mangai-art-21.svg',
        },
        right: {
          title: 'Juramento en el Patio',
          text: 'Viñeta clave de diálogo con tramas finas y sombreado intenso.',
          image: '/landing/assets/mangai-art-12.svg',
        },
      },
      {
        left: {
          title: 'Bajo la Linterna Rota',
          text: 'Secuencia muda de tensión psicológica trabajada con plumilla G-Pen.',
          image: '/landing/assets/mangai-art-09.svg',
        },
        right: {
          title: 'La Carta Sellada',
          text: 'Detalle narrativo de utilería registrado como entidad Settei.',
          image: '/landing/assets/mangai-art-14.svg',
        },
      },
      {
        left: {
          title: 'Desenlace en Nieve',
          text: 'Alto contraste blanco y negro puro listo para impresión offset.',
          image: '/landing/assets/mangai-art-04.svg',
        },
        right: {
          title: 'Avance del Volumen II',
          text: 'Página final de adelanto editorial generada dentro de MANGAI Studio.',
          image: '/landing/assets/mangai-art-19.svg',
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
    desc: 'Donde termina la noche, comienza una nueva guerra.',
    kind: 'eclipse',
    art: '/landing/assets/mangai-art-05.svg',
    coverArt: '/landing/assets/mangai-art-10.svg',
    coverBg: 'linear-gradient(135deg, #2b0909 0%, #5c1414 100%)',
    accentColor: '#ef4444',
    studioStyle: 'cover_art',
    studioPrompt:
      'Lone armored sentinel standing before a fractured crimson solar eclipse tearing open an obsidian sky, swirling embers, monumental dark fantasy manga volume cover composition',
    spreads: [
      {
        left: {
          title: 'Prólogo: El Cielo Fracturado',
          text: 'Apertura dramática preparada para exportación Amazon KDP.',
          image: '/landing/assets/mangai-art-19.svg',
        },
        right: {
          title: 'Panel Doble · Ruptura Carmesí',
          text: 'Líneas cinéticas radiales y foco de tensión sobre la viñeta central.',
          image: '/landing/assets/mangai-art-20.svg',
        },
      },
      {
        left: {
          title: 'La Vigilia del Centinela',
          text: 'Encuadre contrapicado con sombreado geométrico y tramas densas.',
          image: '/landing/assets/mangai-art-14.svg',
        },
        right: {
          title: 'Arte Final de Volumen',
          text: 'Acabado conceptual para contraportada, lomo y tapa frontal.',
          image: '/landing/assets/mangai-art-22.svg',
        },
      },
      {
        left: {
          title: 'Ciudadela de Ceniza',
          text: 'Escenario monumental Dark Fantasy con acentos en laca roja Akai.',
          image: '/landing/assets/mangai-art-10.svg',
        },
        right: {
          title: 'El Pacto de Hierro',
          text: 'Composición diagonal dinámica de cinco viñetas para combate.',
          image: '/landing/assets/mangai-art-16.svg',
        },
      },
      {
        left: {
          title: 'Armamento Ceremonial',
          text: 'Lámina extra de diseño de props y emblemas para el lector.',
          image: '/landing/assets/mangai-art-21.svg',
        },
        right: {
          title: 'Cubierta Integral KDP',
          text: 'Maqueta con lomo, sangrado de 3.5 mm y código EAN-13 vectorial.',
          image: '/landing/assets/mangai-art-05.svg',
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
let flipTimer = null;
let autoplayTimer = null;

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function applyCreaseCarouselConfig() {
  const openBookEl = $('#mangaOpenBook');
  const stageEl = $('#bookStage');
  if (stageEl && creaseCarouselOptions.ariaLabel) {
    stageEl.setAttribute('aria-label', creaseCarouselOptions.ariaLabel);
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
}

function getActiveSpreads(book) {
  const list = book.spreads || [];
  return list.slice(0, creaseCarouselOptions.cardCount || list.length);
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
    imgEl.src = pageData.image;
    imgEl.alt = prefix.startsWith('leaf') ? '' : `${pageData.title} — ${book.title}`;
    const fx = pageData.focalX ?? 50;
    const fy = pageData.focalY ?? 50;
    imgEl.style.objectPosition = `${fx}% ${fy}%`;
  }
  if (titleEl) titleEl.textContent = pageData.title;
  if (textEl) textEl.textContent = pageData.text;
}

function wrapIndex(i) {
  return (i + BOOKS.length) % BOOKS.length;
}

function buildKaiDeepLink(book) {
  return (
    '/studio?tab=kai' +
    '&volume=' + encodeURIComponent(book.id) +
    '&title=' + encodeURIComponent(book.title) +
    '&style=' + encodeURIComponent(book.studioStyle) +
    '&prompt=' + encodeURIComponent(book.studioPrompt)
  );
}

function cancelFlip() {
  if (flipTimer) {
    clearTimeout(flipTimer);
    flipTimer = null;
  }
  isFlipping = false;
  const openBookEl = $('#mangaOpenBook');
  const leaf = $('#turningLeaf');
  const shadow = $('#creaseCastShadow');
  if (openBookEl) openBookEl.classList.remove('flipping-next', 'flipping-prev');
  if (leaf) leaf.hidden = true;
  if (shadow) shadow.hidden = true;
}

function renderCreaseDots(spreadsCount) {
  const dotsEl = $('#creaseDots');
  if (!dotsEl) return;

  if (!creaseCarouselOptions.showDots) {
    dotsEl.hidden = true;
    return;
  }

  dotsEl.hidden = false;
  const total = isBookOpen ? spreadsCount : BOOKS.length;
  const activeIdx = isBookOpen ? spreadIndex : currentBook;

  dotsEl.innerHTML = '';
  for (let i = 0; i < total; i += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'crease-dot' + (i === activeIdx ? ' is-active' : '');
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', i === activeIdx ? 'true' : 'false');
    btn.setAttribute(
      'aria-label',
      isBookOpen
        ? `Ir al pliego ${i + 1} de ${total}`
        : `Seleccionar tomo ${BOOKS[i]?.title || i + 1}`,
    );
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isBookOpen) {
        jumpToSpread(i);
      } else if (i === currentBook) {
        openBook(i);
      } else {
        selectBook(i);
      }
    });
    dotsEl.appendChild(btn);
  }
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

  if (heroGenre) heroGenre.textContent = 'MANGAI ORIGINALS · ' + book.genre.toUpperCase();
  if (heroBookTitle) heroBookTitle.textContent = book.title;
  if (heroBookSubtitle) {
    heroBookSubtitle.textContent = isBookOpen
      ? 'Pliego ' + (spreadIndex + 1) + ' de ' + spreads.length + ' — Haz clic o desliza los bordes para curvar la hoja en 3D'
      : 'Haz clic en el tomo activo para abrirlo y explorar sus páginas en 3D';
  }
  if (heroIndex) {
    heroIndex.textContent = isBookOpen
      ? String(spreadIndex + 1).padStart(2, '0') + ' / ' + String(spreads.length).padStart(2, '0')
      : String(currentBook + 1).padStart(2, '0') + ' / ' + String(BOOKS.length).padStart(2, '0');
  }
  if (editWithKaiBtn) {
    editWithKaiBtn.href = buildKaiDeepLink(book);
  }

  const shelf = $('#mangaShelf');
  const openBookEl = $('#mangaOpenBook');
  const dockClosed = $('#dockClosedControls');
  const dockOpen = $('#dockOpenControls');

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
    if (active && !isBookOpen && shelf && shelf.scrollWidth > shelf.clientWidth) {
      const cardRect = card.getBoundingClientRect();
      const shelfRect = shelf.getBoundingClientRect();
      const targetLeft =
        shelf.scrollLeft + (cardRect.left - shelfRect.left) - (shelfRect.width - cardRect.width) / 2;
      shelf.scrollTo({ left: Math.max(0, targetLeft), behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  });

  if (spread) {
    populatePageSide('leftPage', spread.left, spreadIndex * 2 + 1, book);
    populatePageSide('rightPage', spread.right, spreadIndex * 2 + 2, book);
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
      spreadIndex === 0 ? 'Cerrar tomo y volver a la estantería' : 'Página anterior',
    );
  }

  renderCreaseDots(spreads.length);
}

function transitionToSpread(targetIdx) {
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
    // Leaf lifts from the right carrying current right page on front, destination left page on back.
    populatePageSide('leafFront', currentSpread.right, spreadIndex * 2 + 2, book);
    populatePageSide('leafBack', destinationSpread.left, targetIdx * 2 + 1, book);
    // Expose destination right page underneath immediately as the leaf peels away.
    populatePageSide('rightPage', destinationSpread.right, targetIdx * 2 + 2, book);
  } else {
    // Leaf lifts from the left carrying current left page on front, destination right page on back.
    populatePageSide('leafFront', currentSpread.left, spreadIndex * 2 + 1, book);
    populatePageSide('leafBack', destinationSpread.right, targetIdx * 2 + 2, book);
    // Expose destination left page underneath immediately as the leaf peels away.
    populatePageSide('leftPage', destinationSpread.left, targetIdx * 2 + 1, book);
  }

  if (openBookEl) {
    openBookEl.classList.remove('flipping-next', 'flipping-prev');
    openBookEl.classList.add(goingForward ? 'flipping-next' : 'flipping-prev');
  }
  if (leaf) leaf.hidden = false;
  if (shadow) shadow.hidden = false;

  const duration = reducedMotion ? 20 : creaseCarouselOptions.durationMs;
  flipTimer = setTimeout(() => {
    flipTimer = null;
    spreadIndex = targetIdx;
    isFlipping = false;
    if (openBookEl) openBookEl.classList.remove('flipping-next', 'flipping-prev');
    if (leaf) leaf.hidden = true;
    if (shadow) shadow.hidden = true;
    renderHeroBookViewer();
  }, duration);
}

function jumpToSpread(targetIdx) {
  transitionToSpread(targetIdx);
}

function selectBook(index) {
  cancelFlip();
  currentBook = wrapIndex(index);
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
  spreadIndex = 0;
  isBookOpen = true;
  renderHeroBookViewer();
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
  openBook(currentBook);
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

const heroBookStage = $('#heroBookStage');
if (heroBookStage) {
  heroBookStage.addEventListener('click', (e) => {
    if (!isBookOpen) return;
    const target = e.target;
    if (
      target instanceof Element &&
      (target.closest('#mangaOpenBook') ||
        target.closest('#mangaiDockControls') ||
        target.closest('#creaseDots'))
    ) {
      return;
    }
    closeBook();
  });
}

const bookStage = $('#bookStage');
if (bookStage) {
  bookStage.addEventListener(
    'wheel',
    (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.4) {
        e.preventDefault();
        const dir = Math.sign(e.deltaX);
        if (isBookOpen) {
          if (dir > 0) nextSpread();
          else if (dir < 0) prevSpread();
        } else {
          spin(dir);
        }
      }
    },
    { passive: false },
  );

  let downX = null;
  bookStage.addEventListener('pointerdown', (e) => {
    downX = e.clientX;
    didSwipe = false;
  });
  bookStage.addEventListener('pointerup', (e) => {
    if (downX != null && Math.abs(e.clientX - downX) > 44) {
      didSwipe = true;
      setTimeout(() => {
        didSwipe = false;
      }, 60);
      const forward = e.clientX < downX;
      if (isBookOpen) {
        if (forward) nextSpread();
        else prevSpread();
      } else {
        spin(forward ? 1 : -1);
      }
    }
    downX = null;
  });
}

applyCreaseCarouselConfig();
renderHeroBookViewer();
setupCreaseAutoplay();

const modal = $('#modal');
function closeModal() {
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = '';
}

$('#modalClose')?.addEventListener('click', closeModal);
$('#modalExplore')?.addEventListener('click', closeModal);
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

$('#menuToggle')?.addEventListener('click', () => {
  const m = $('#mobileDropdown');
  if (!m) return;
  const on = m.classList.toggle('show');
  $('#menuToggle').setAttribute('aria-expanded', String(on));
});
$$('#mobileDropdown a').forEach((a) =>
  a.addEventListener('click', () => $('#mobileDropdown')?.classList.remove('show')),
);

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

function trackHeroWatermark() {
  if (reducedMotion) return;
  const hero = $('.hero');
  const watermark = $('.hero-watermark');
  if (hero && watermark) {
    const h = hero.getBoundingClientRect();
    watermark.style.setProperty('--drift', `${Math.min(75, Math.max(-75, -h.top * 0.1))}px`);
  }
}
window.addEventListener('scroll', trackHeroWatermark, { passive: true });
trackHeroWatermark();

if (location.hash === '#studio') startStudio();

function initSumiStoryFlow() {
  const storyFlow = $('#storyFlow');
  if (!storyFlow) return;

  const inkFill = $('#sumiInkFill');
  const cloudTop = $('#ukiyoCloudTop');
  const cloudBottom = $('#ukiyoCloudBottom');
  const waves = $('#suminagashiWaves');
  let scrollRafId = null;

  function updateStoryScroll() {
    scrollRafId = null;
    const rect = storyFlow.getBoundingClientRect();
    const totalHeight = rect.height - window.innerHeight;
    const progress =
      totalHeight > 0
        ? Math.min(1, Math.max(0, -rect.top / totalHeight))
        : rect.top <= 0
          ? 1
          : 0;

    if (inkFill) {
      inkFill.style.height = reducedMotion
        ? '100%'
        : `${Math.min(100, Math.max(4, progress * 108)).toFixed(2)}%`;
    }

    if (!reducedMotion) {
      if (cloudTop) {
        cloudTop.style.transform = `translateY(${(progress * -70).toFixed(1)}px)`;
      }
      if (cloudBottom) {
        cloudBottom.style.transform = `translateY(${(progress * 50).toFixed(1)}px)`;
      }
      if (waves) {
        waves.style.transform = `translateY(${(progress * -35).toFixed(1)}px)`;
      }
    }
  }

  function scheduleStoryScroll() {
    if (scrollRafId !== null) return;
    scrollRafId = window.requestAnimationFrame(updateStoryScroll);
  }

  window.addEventListener('scroll', scheduleStoryScroll, { passive: true });
  window.addEventListener('resize', scheduleStoryScroll, { passive: true });
  updateStoryScroll();

  const folioCards = $$('#collectionFanStack .folio-card');
  folioCards.forEach((card) => {
    card.addEventListener('click', () => {
      folioCards.forEach((item) => {
        const focused = item === card;
        item.classList.toggle('is-focused', focused);
        item.setAttribute('aria-pressed', focused ? 'true' : 'false');
      });
    });
  });

  const kaiBrushCard = $('#kaiBrushCard');
  const finishButtons = $$('#kaiBrushCard .brush-finish-btn[data-finish]');
  const finishClasses = ['finish-gpen', 'finish-tone', 'finish-crimson'];

  finishButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const finishClass = 'finish-' + btn.dataset.finish;
      if (!finishClasses.includes(finishClass)) return;

      if (kaiBrushCard) {
        kaiBrushCard.classList.remove(...finishClasses);
        kaiBrushCard.classList.add(finishClass);
      }

      finishButtons.forEach((item) => {
        const active = item === btn;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    });
  });
}

initSumiStoryFlow();
