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
          image: '/landing/assets/mangai-art-12.svg',
        },
        right: {
          title: 'Duelo en la Selva',
          text: 'Perspectiva dramática y contraste de tinta sumi sobre papel Genkō.',
          image: '/landing/assets/mangai-art-19.svg',
        },
      },
      {
        left: {
          title: 'Settei de Personaje · Canon',
          text: 'Expresiones, silueta ceremonial y anclas visuales bloqueadas para el tomo.',
          image: '/landing/assets/mangai-art-21.svg',
        },
        right: {
          title: 'Edición Coleccionista Tankōbon',
          text: 'Maquetación de cubierta conceptual lista para exportación editorial.',
          image: '/landing/assets/mangai-art-22.svg',
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
    ],
  },
];

const STUDIO_BASE64 = ''; // Legacy iframe disabled. Studio is served at /studio.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let currentBook = 0;
let isBookOpen = false;
let spreadIndex = 0;
let isFlipping = false;
let flipTimer = null;

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.remove('show'), 2900);
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
  if (openBookEl) openBookEl.classList.remove('flipping-next', 'flipping-prev');
  if (leaf) leaf.hidden = true;
}

function renderHeroBookViewer() {
  const book = BOOKS[currentBook] || BOOKS[0];
  const spreads = book.spreads || [];
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
      ? 'Pliego ' + (spreadIndex + 1) + ' de ' + spreads.length + ' — Haz clic en los bordes para pasar página'
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
      const targetLeft = shelf.scrollLeft + (cardRect.left - shelfRect.left) - (shelfRect.width - cardRect.width) / 2;
      shelf.scrollTo({ left: Math.max(0, targetLeft), behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  });

  if (spread) {
    const leftNum = $('#leftPageNum');
    const rightNum = $('#rightPageNum');
    const leftVol = $('#leftPageVol');
    const rightVol = $('#rightPageVol');
    const leftImg = $('#leftPageImg');
    const rightImg = $('#rightPageImg');
    const leftTitle = $('#leftPageTitle');
    const rightTitle = $('#rightPageTitle');
    const leftText = $('#leftPageText');
    const rightText = $('#rightPageText');

    if (leftNum) leftNum.textContent = 'PÁG. ' + String(spreadIndex * 2 + 1).padStart(2, '0');
    if (rightNum) rightNum.textContent = 'PÁG. ' + String(spreadIndex * 2 + 2).padStart(2, '0');
    if (leftVol) leftVol.textContent = book.volume;
    if (rightVol) rightVol.textContent = book.volume;
    if (leftImg) {
      leftImg.src = spread.left.image;
      leftImg.alt = spread.left.title + ' — ' + book.title;
    }
    if (rightImg) {
      rightImg.src = spread.right.image;
      rightImg.alt = spread.right.title + ' — ' + book.title;
    }
    if (leftTitle) leftTitle.textContent = spread.left.title;
    if (leftText) leftText.textContent = spread.left.text;
    if (rightTitle) rightTitle.textContent = spread.right.title;
    if (rightText) rightText.textContent = spread.right.text;
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
      spreadIndex === 0 ? 'Cerrar tomo y volver a la estantería' : 'Página anterior'
    );
  }
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
      (activeEl.closest('#mangaOpenBook') || activeEl.closest('#dockOpenControls'))
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
  if (spreadIndex >= book.spreads.length - 1) return;

  isFlipping = true;
  const openBookEl = $('#mangaOpenBook');
  const leaf = $('#turningLeaf');
  if (openBookEl) {
    openBookEl.classList.remove('flipping-prev');
    openBookEl.classList.add('flipping-next');
  }
  if (leaf) leaf.hidden = false;

  const duration = reducedMotion ? 20 : 320;
  flipTimer = setTimeout(() => {
    flipTimer = null;
    spreadIndex += 1;
    isFlipping = false;
    if (openBookEl) openBookEl.classList.remove('flipping-next');
    if (leaf) leaf.hidden = true;
    renderHeroBookViewer();
  }, duration);
}

function prevSpread() {
  if (!isBookOpen || isFlipping) return;
  if (spreadIndex <= 0) {
    closeBook();
    return;
  }

  isFlipping = true;
  const openBookEl = $('#mangaOpenBook');
  const leaf = $('#turningLeaf');
  if (openBookEl) {
    openBookEl.classList.remove('flipping-next');
    openBookEl.classList.add('flipping-prev');
  }
  if (leaf) leaf.hidden = false;

  const duration = reducedMotion ? 20 : 320;
  flipTimer = setTimeout(() => {
    flipTimer = null;
    spreadIndex = Math.max(0, spreadIndex - 1);
    isFlipping = false;
    if (openBookEl) openBookEl.classList.remove('flipping-prev');
    if (leaf) leaf.hidden = true;
    renderHeroBookViewer();
  }, duration);
}

$('#prevBook')?.addEventListener('click', e => {
  e.stopPropagation();
  spin(-1);
});
$('#nextBook')?.addEventListener('click', e => {
  e.stopPropagation();
  spin(1);
});
$('#openActiveBookBtn')?.addEventListener('click', e => {
  e.stopPropagation();
  openBook(currentBook);
});

let didSwipe = false;

$$('.manga-closed-book').forEach((card, i) => {
  card.addEventListener('click', e => {
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

$('#openPageRight')?.addEventListener('click', e => {
  e.stopPropagation();
  if (didSwipe) {
    didSwipe = false;
    return;
  }
  nextSpread();
});
$('#openPageLeft')?.addEventListener('click', e => {
  e.stopPropagation();
  if (didSwipe) {
    didSwipe = false;
    return;
  }
  prevSpread();
});
$('#nextSpreadBtn')?.addEventListener('click', e => {
  e.stopPropagation();
  nextSpread();
});
$('#prevSpreadBtn')?.addEventListener('click', e => {
  e.stopPropagation();
  prevSpread();
});
$('#closeBookBtn')?.addEventListener('click', e => {
  e.stopPropagation();
  closeBook();
});

const heroBookStage = $('#heroBookStage');
if (heroBookStage) {
  heroBookStage.addEventListener('click', e => {
    if (!isBookOpen) return;
    const target = e.target;
    if (
      target instanceof Element &&
      (target.closest('#mangaOpenBook') || target.closest('#mangaiDockControls'))
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
    e => {
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
    { passive: false }
  );

  let downX = null;
  bookStage.addEventListener('pointerdown', e => {
    downX = e.clientX;
    didSwipe = false;
  });
  bookStage.addEventListener('pointerup', e => {
    if (downX != null && Math.abs(e.clientX - downX) > 50) {
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

renderHeroBookViewer();

const modal = $('#modal');
function openModal(i) {
  if (!modal) return;
  const c = BOOKS[i] || BOOKS[0];
  const img = $('#modalArt');
  const fb = $('#modalArtFallback');
  if (fb) {
    fb.hidden = true;
    $('#modalFallbackVol').textContent = c.volume;
    $('#modalFallbackTitle').textContent = c.series;
    $('#modalFallbackGenre').textContent = c.genre.toUpperCase();
  }
  img.hidden = false;
  img.onerror = () => {
    img.hidden = true;
    if (fb) fb.hidden = false;
  };
  img.alt = 'Portada conceptual de ' + c.series;
  img.src = c.art;
  $('#modalTitle').textContent = c.series + ' — ' + c.subtitle;
  $('#modalTag').textContent = c.genre.toUpperCase() + ' · ' + c.volume + ' · OBRA DEMO';
  $('#modalDesc').textContent = c.desc;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = '';
}

$('#modalClose')?.addEventListener('click', closeModal);
$('#modalExplore')?.addEventListener('click', closeModal);
modal?.addEventListener('click', e => {
  if (e.target === modal) closeModal();
});

function startStudio() {
  window.location.assign('/studio');
}
function exitStudio() {
  window.location.assign('/');
}

$$('[data-open-studio]').forEach(b => b.addEventListener('click', startStudio));
$('#backLanding')?.addEventListener('click', exitStudio);

window.addEventListener('keydown', e => {
  const studioOpen = $('#studioScreen')?.classList.contains('show');
  if (e.key === 'Escape') {
    if (studioOpen) exitStudio();
    else if (modal && !modal.hidden) closeModal();
    else if (isBookOpen) closeBook();
    return;
  }
  if ((modal && !modal.hidden) || studioOpen) return;

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
$$('#mobileDropdown a').forEach(a =>
  a.addEventListener('click', () => $('#mobileDropdown')?.classList.remove('show'))
);

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    entries =>
      entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('in-view');
      }),
    { threshold: 0.12 }
  );
  $$('.fadeup, .reveal-card').forEach(e => observer.observe(e));
} else {
  $$('.fadeup, .reveal-card').forEach(e => e.classList.add('in-view'));
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
  folioCards.forEach(card => {
    card.addEventListener('click', () => {
      folioCards.forEach(item => {
        const focused = item === card;
        item.classList.toggle('is-focused', focused);
        item.setAttribute('aria-pressed', focused ? 'true' : 'false');
      });
    });
  });

  const kaiBrushCard = $('#kaiBrushCard');
  const finishButtons = $$('#kaiBrushCard .brush-finish-btn[data-finish]');
  const finishClasses = ['finish-gpen', 'finish-tone', 'finish-crimson'];

  finishButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const finishClass = 'finish-' + btn.dataset.finish;
      if (!finishClasses.includes(finishClass)) return;

      if (kaiBrushCard) {
        kaiBrushCard.classList.remove(...finishClasses);
        kaiBrushCard.classList.add(finishClass);
      }

      finishButtons.forEach(item => {
        const active = item === btn;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    });
  });
}

initSumiStoryFlow();
