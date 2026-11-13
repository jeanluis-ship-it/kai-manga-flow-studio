/**
 * ============================================================================
 * MANGAI STUDIO — STITCH SPA INTERACTIVE CONTROLLER (v5.1 Blank-First Edition)
 * ============================================================================
 * - Inicia POR DEFECTO 100% EN BLANCO ("Desde Cero") en las 5 etapas del estudio
 * - Incluye Selector de Motor de Imagen IA en vivo ("Test Bench") dentro del Inspector
 * - Incluye Diagnóstico de Llaves y Latencia (/api/generate) para pruebas de motores
 * - Permite alternar en cualquier momento entre "🧹 En Blanco" y "🎬 Demo AnaCaona"
 * ============================================================================
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'mangai_stitch_studio_state_v5_1_blank';

  // Demo Roster (Solo se carga si el usuario pulsa explícitamente "🎬 Demo AnaCaona")
  const DEMO_CHARACTERS = [
    {
      id: 'char_alo',
      handle: '@Alo',
      name: 'Alo',
      role: 'Guerrero Taíno · Portador del Guanín',
      seed: 8841,
      appearance: 'Guerrero joven taíno de piel cobriza, pómulos marcados, ojos oscuros almendrados intensos, cabello negro liso con cinta tejida ritual, cicatriz fina en pómulo izquierdo.',
      clothing: 'Medallón solar de Guanín dorado al pecho, capa oscura rasgada de combate, brazaletes de piedra cemí.',
      anchors: ['Medallón Guanín', 'Capa Oscura', 'Cicatriz Pómulo']
    },
    {
      id: 'char_anacaona',
      handle: '@Anacaona',
      name: 'Anacaona',
      role: 'Cacica de Jaragua · Flor de Oro',
      seed: 9920,
      appearance: 'Mujer taína de porte real e imponente, mirada serena pero dominante, cabello largo negro azabache con ornamentos de oro y plumas reales.',
      clothing: 'Corona ritual de Guanín labrado, túnica ceremonial blanca y carmesí con geometría taína.',
      anchors: ['Corona Guanín', 'Mirada Real', 'Túnica Jaragua']
    }
  ];

  // Estado Inicial POR DEFECTO: 100% EN BLANCO ("Desde Cero")
  function createBlankKomas() {
    return [
      {
        index: 0,
        id: 'koma-1',
        label: 'Koma #1 • Plano Establecimiento',
        subtitle: 'Koma #1 • Viñeta Superior (En Blanco)',
        prompt: '',
        cameraAngle: 'Gran Plano General (Establishing)',
        linkedHandles: [],
        dialogue: '',
        sfx: '',
        screentone: 'none',
        inverted: false,
        locked: false,
        defaultSrc: ''
      },
      {
        index: 1,
        id: 'koma-2',
        label: 'Koma #2 Activa',
        subtitle: 'Koma #2 • Viñeta Central Izquierda (En Blanco)',
        prompt: '',
        cameraAngle: 'Contrapicado Dramático (Low Angle)',
        linkedHandles: [],
        dialogue: '',
        sfx: '',
        screentone: 'none',
        inverted: false,
        locked: false,
        defaultSrc: ''
      },
      {
        index: 2,
        id: 'koma-3',
        label: 'Koma #3',
        subtitle: 'Koma #3 • Viñeta Central Derecha (En Blanco)',
        prompt: '',
        cameraAngle: 'Primer Plano Emocional',
        linkedHandles: [],
        dialogue: '',
        sfx: '',
        screentone: 'none',
        inverted: false,
        locked: false,
        defaultSrc: ''
      },
      {
        index: 3,
        id: 'koma-4',
        label: 'Koma #4 • Viñeta Inferior',
        subtitle: 'Koma #4 • Clímax de Página (En Blanco)',
        prompt: '',
        cameraAngle: 'Plano Holandés (Inclinado FX)',
        linkedHandles: [],
        dialogue: '',
        sfx: '',
        screentone: 'none',
        inverted: false,
        locked: false,
        defaultSrc: ''
      }
    ];
  }

  const DEMO_KOMAS = [
    {
      index: 0,
      id: 'koma-1',
      label: 'Koma #1 • Gran Plano General',
      subtitle: 'Koma #1 • Ruinas del Batey (Tormenta)',
      prompt: 'Templo ceremonial taíno antiguo azotado por una tormenta eléctrica tropical, pilares monolíticos de piedra tallada con petroglifos, cielo dramático con tramas y rayos en blanco puro, entintado manga seinen.',
      cameraAngle: 'Gran Plano General (Establishing)',
      linkedHandles: ['@Alo'],
      dialogue: '',
      sfx: '',
      screentone: 'none',
      inverted: false,
      locked: false,
      defaultSrc: ''
    },
    {
      index: 1,
      id: 'koma-2',
      label: 'Koma #2 Activa',
      subtitle: 'Koma #2 • Acción Central (Alo)',
      prompt: 'Ataque frontal en salto, capa ondeando con fuerza, medallón de Guanín irradiando destellos, tinta Sumi de alto contraste con trama 60L.',
      cameraAngle: 'Contrapicado Dramático (Low Angle)',
      linkedHandles: ['@Alo'],
      dialogue: '¡El pacto del guanín no se romperá jamás!',
      sfx: '',
      screentone: '30',
      inverted: false,
      locked: false,
      defaultSrc: ''
    },
    {
      index: 2,
      id: 'koma-3',
      label: 'Koma #3',
      subtitle: 'Koma #3 • Primer Plano Ojos (Tensión)',
      prompt: 'Primerísimo plano extremo de ojos manga con mirada intensa y determinada, pestañas definidas en tinta negra, trama 40% en pómulo y líneas de tensión.',
      cameraAngle: 'Primer Plano Emocional',
      linkedHandles: ['@Anacaona'],
      dialogue: '',
      sfx: '',
      screentone: '15',
      inverted: false,
      locked: false,
      defaultSrc: ''
    },
    {
      index: 3,
      id: 'koma-4',
      label: 'Koma #4 • Clímax Terrestre',
      subtitle: 'Koma #4 • Impacto Sísmico (Clímax)',
      prompt: 'Explosión de impacto sísmico contra el suelo de roca, cráter fracturado con piedras flotando y líneas cinéticas radiales agresivas en tinta Sumi.',
      cameraAngle: 'Plano Holandés (Inclinado FX)',
      linkedHandles: ['@Alo'],
      dialogue: '',
      sfx: 'ドドド',
      screentone: 'none',
      inverted: false,
      locked: false,
      defaultSrc: ''
    }
  ];

  // Runtime Studio State (Starts in BLANK mode by default!)
  const state = {
    projectMode: 'blank', // 'blank' | 'demo'
    projectTitle: 'Nuevo Manga',
    activeStage: 'lienzo-genko',
    activeKomaIndex: 1,
    activePenNib: 'g_pen',
    selectedEngine: (window.KAIMangaImageRouter && window.KAIMangaImageRouter.getConfig().engine) || 'auto',
    zoomPercent: 125,
    canvasRotated: false,
    guidesVisible: true,
    characters: [],
    komas: createBlankKomas(),
    customImages: {},
    coverImage: null,
    originalDemoImages: [],
    originalSetteiGridHtml: ''
  };

  function loadPersistedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.projectMode) state.projectMode = parsed.projectMode;
      if (parsed.projectTitle) state.projectTitle = parsed.projectTitle;
      if (Array.isArray(parsed.characters)) state.characters = parsed.characters;
      if (Array.isArray(parsed.komas) && parsed.komas.length === 4) state.komas = parsed.komas;
      if (parsed.customImages && typeof parsed.customImages === 'object') state.customImages = parsed.customImages;
      if (parsed.coverImage) state.coverImage = parsed.coverImage;
    } catch (err) {
      console.warn('[MANGAI Studio] Could not load persisted state:', err);
    }
  }

  function savePersistedState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          projectMode: state.projectMode,
          projectTitle: state.projectTitle,
          characters: state.characters,
          komas: state.komas,
          customImages: state.customImages,
          coverImage: state.coverImage
        })
      );
    } catch (err) {
      console.warn('[MANGAI Studio] Could not save state:', err);
    }
  }

  // Toast helper
  window.showStudioToast = function (message) {
    const toast = document.getElementById('studio-toast');
    const textEl = document.getElementById('studio-toast-text');
    if (!toast || !textEl) return;
    textEl.textContent = message;
    toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');
    clearTimeout(window.__studioToastTimer);
    window.__studioToastTimer = setTimeout(() => {
      toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-2');
      toast.classList.remove('opacity-100', 'translate-y-0');
    }, 3400);
  };

  // ==========================================================================
  // 1. TOP BAR NAVIGATION & PROJECT TITLE (EDITABLE)
  // ==========================================================================
  function initTopNavigation() {
    const navLinks = document.querySelectorAll('header nav a[data-path]');
    navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const path = link.getAttribute('data-path');
        switchStudioStage(path);
      });
    });

    // Make top-left project title reflect blank project & editable on click
    const titleSpan = document.querySelector('header .text-on-surface.font-semibold');
    if (titleSpan) {
      titleSpan.textContent = state.projectTitle;
      titleSpan.style.cursor = 'pointer';
      titleSpan.title = 'Haz clic para cambiar el título de tu Manga';
      titleSpan.addEventListener('click', () => {
        const nextTitle = prompt('Título de tu proyecto de Manga:', state.projectTitle);
        if (nextTitle && nextTitle.trim()) {
          state.projectTitle = nextTitle.trim();
          titleSpan.textContent = state.projectTitle;
          savePersistedState();
          window.showStudioToast(`Título del proyecto actualizado: ${state.projectTitle}`);
        }
      });
    }

    // Header buttons: Gestionar Plan, Guías Genkō: ON, Exportar Imprenta
    const headerButtons = document.querySelectorAll('header button');
    headerButtons.forEach((btn) => {
      const txt = (btn.textContent || '').trim();
      if (txt.includes('Gestionar Plan')) {
        btn.innerHTML = '⚙️ Motores IA / Proyecto';
        btn.addEventListener('click', () => openStudioModal('modal-plan-settings'));
      } else if (txt.includes('Exportar Imprenta')) {
        btn.addEventListener('click', () => {
          switchStudioStage('empaque-tankobon');
          window.showStudioToast('Modo Pre-Imprenta Tankōbon B6 activado');
        });
      }
    });

    // Guías Genkō pill in header
    const headerDivs = document.querySelectorAll('header div');
    headerDivs.forEach((div) => {
      if ((div.textContent || '').trim() === 'Guías Genkō: ON' || (div.textContent || '').trim() === 'Guías Genkō: OFF') {
        div.style.cursor = 'pointer';
        div.title = 'Alternar Guías Cian No-Foto (#00AEEF)';
        div.addEventListener('click', () => {
          toggleGenkoGuides();
        });
      }
    });
  }

  window.switchStudioStage = function (path) {
    state.activeStage = path;
    const views = {
      'biblia-settei': document.getElementById('view-biblia-settei'),
      'guion-koso': document.getElementById('view-guion-koso'),
      'tablero-nemu': document.getElementById('view-guion-koso'),
      'lienzo-genko': document.getElementById('view-lienzo-genko'),
      'empaque-tankobon': document.getElementById('view-empaque-tankobon'),
      'empaque-3d': document.getElementById('view-empaque-3d')
    };

    Object.values(views).forEach((el) => {
      if (el) el.classList.add('hidden');
    });

    const targetView = views[path] || views['lienzo-genko'];
    if (targetView) {
      targetView.classList.remove('hidden');
    }

    const navLinks = document.querySelectorAll('header nav a[data-path]');
    navLinks.forEach((link) => {
      const linkPath = link.getAttribute('data-path');
      if (linkPath === path) {
        link.className = 'px-space-md py-1 rounded transition-colors bg-inverse-surface text-inverse-on-surface font-semibold shadow-sm font-label-lg text-label-lg';
        link.setAttribute('aria-current', 'page');
      } else {
        link.className = 'px-space-md py-1 rounded text-on-surface-variant font-label-lg text-label-lg transition-colors hover:text-on-surface';
        link.removeAttribute('aria-current');
      }
    });

    if (path === 'guion-koso' || path === 'tablero-nemu') {
      const viewKoso = document.getElementById('view-guion-koso');
      if (viewKoso) {
        const panes = viewKoso.querySelectorAll('aside, section');
        if (path === 'guion-koso' && panes[0]) {
          panes[0].classList.add('ring-2', 'ring-secondary');
          setTimeout(() => panes[0].classList.remove('ring-2', 'ring-secondary'), 1200);
          window.showStudioToast('2. Guion Kōsō · Escribe tus bloques narrativos desde cero');
        } else if (path === 'tablero-nemu' && panes[1]) {
          panes[1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          window.showStudioToast('3. Tablero Nemu · Spread Doble Página B6 (Lectura Oriental RTL ←)');
        }
      }
    } else {
      const stageNames = {
        'biblia-settei': '1. Biblia Settei · Crea tus personajes con "+ Nuevo Personaje"',
        'lienzo-genko': '4. Lienzo Genkō · Selecciona una Koma en blanco y prueba los motores IA',
        'empaque-tankobon': '5. Empaque Tankōbon · Pliego Técnico y Portada B6'
      };
      if (stageNames[path]) {
        window.showStudioToast(stageNames[path]);
      }
    }
  };

  // ==========================================================================
  // 2. LIENZO GENKŌ — BLANK KOMAS BY DEFAULT + ENGINE TEST BENCH
  // ==========================================================================
  function getGenkoElements() {
    const view = document.getElementById('view-lienzo-genko');
    if (!view) return null;

    const canvasPaper = view.querySelector('.bg-\\[\\#FAF8F5\\]');
    if (!canvasPaper) return null;

    const komaWari = canvasPaper.querySelector('.flex.flex-col.gap-2.z-0');
    if (!komaWari) return null;

    const topPanel = komaWari.children[0];
    const middleRow = komaWari.children[1];
    const midLeftPanel = middleRow ? middleRow.children[0] : null;
    const midRightPanel = middleRow ? middleRow.children[1] : null;
    const bottomPanel = komaWari.children[2];

    const panels = [topPanel, midLeftPanel, midRightPanel, bottomPanel].filter(Boolean);
    return {
      view,
      canvasPaper,
      komaWari,
      panels
    };
  }

  function applyBlankOrDemoVisualsToCanvas() {
    const els = getGenkoElements();
    if (!els) return;

    els.panels.forEach((panel, idx) => {
      const img = panel.querySelector('img');
      if (!img) return;

      // Save original Stitch demo image URL once
      if (!state.originalDemoImages[idx]) {
        state.originalDemoImages[idx] = img.src;
      }

      if (state.customImages[idx]) {
        img.src = state.customImages[idx];
      } else if (state.projectMode === 'blank' && window.KAIMangaImageRouter) {
        const isWide = idx === 0 || idx === 3;
        img.src = window.KAIMangaImageRouter.renderBlankGenkoKoma({
          komaIndex: idx,
          width: isWide ? 840 : 480,
          height: isWide ? 320 : 540,
          subtitle: 'Lienzo Virgen · Escribe un prompt en el Inspector y pulsa Generar'
        });
      } else if (state.originalDemoImages[idx]) {
        img.src = state.originalDemoImages[idx];
      }

      applyScreentoneStyle(idx, state.komas[idx]?.screentone || 'none');
    });

    // Update speech bubble visibility & text
    const bubbleBox = els.canvasPaper.querySelector('.rounded-\\[20px\\]');
    const bubbleP = bubbleBox ? bubbleBox.querySelector('p') : null;
    const activeDialogue = state.komas[1]?.dialogue || '';
    if (bubbleBox && bubbleP) {
      if (activeDialogue.trim() === '') {
        bubbleBox.classList.add('hidden');
      } else {
        bubbleBox.classList.remove('hidden');
        bubbleP.textContent = activeDialogue;
      }
    }

    // Update Kakimoji SFX visibility & text
    const sfxEl = els.canvasPaper.querySelector('.font-headline-xl');
    const activeSfx = state.komas[3]?.sfx || '';
    if (sfxEl) {
      if (activeSfx.trim() === '') {
        sfxEl.classList.add('hidden');
      } else {
        sfxEl.classList.remove('hidden');
        sfxEl.textContent = activeSfx;
      }
    }
  }

  function initGenkoCanvas() {
    const els = getGenkoElements();
    if (!els) return;

    els.panels.forEach((panel, idx) => {
      panel.dataset.komaIndex = String(idx);
      panel.style.cursor = 'pointer';

      let toneOverlay = panel.querySelector('.koma-screentone-overlay');
      if (!toneOverlay) {
        toneOverlay = document.createElement('div');
        toneOverlay.className = 'koma-screentone-overlay absolute inset-0 pointer-events-none z-10 transition-opacity duration-200';
        panel.appendChild(toneOverlay);
      }

      panel.addEventListener('click', (e) => {
        if (e.target.closest('.koma-quick-bar button')) return;
        selectKoma(idx);
      });
    });

    // Floating quick-action bar
    const quickBar = els.view.querySelector('.bg-inverse-surface\\/90');
    if (quickBar) {
      quickBar.classList.add('koma-quick-bar');
      const quickBtns = quickBar.querySelectorAll('button');
      quickBtns.forEach((btn) => {
        const label = (btn.textContent || '').trim();
        if (label.includes('Pose KAI')) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            generateActiveKomaInk(state.activeKomaIndex, 'pose_kai');
          });
        } else if (label.includes('Invertir')) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleKomaInvert(state.activeKomaIndex);
          });
        } else if (label.includes('60L 30%')) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const current = state.komas[state.activeKomaIndex].screentone;
            const next = current === '30' ? 'none' : '30';
            setKomaScreentone(state.activeKomaIndex, next);
          });
        } else if (btn.querySelector('.material-symbols-outlined')?.textContent.includes('lock')) {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleKomaLock(state.activeKomaIndex, btn);
          });
        }
      });
    }

    // Apply blank or demo visuals
    applyBlankOrDemoVisualsToCanvas();

    // Wire Right Inspector controls (including the new AI Engine Selector & Test Bench)
    initGenkoRightInspector(els.view);

    // Wire Top HUD bar & Left Tool Dock
    initGenkoToolbars(els.view, els.canvasPaper);

    // Select Koma #2 initially and sync Inspector
    selectKoma(state.activeKomaIndex, true);
  }

  function selectKoma(komaIdx, silent) {
    const els = getGenkoElements();
    if (!els || !els.panels[komaIdx]) return;

    state.activeKomaIndex = komaIdx;
    const activeKoma = state.komas[komaIdx];

    els.panels.forEach((panel, i) => {
      if (i === komaIdx) {
        panel.classList.add('ring-2', 'ring-secondary', 'ring-offset-2', 'ring-offset-background', 'shadow-lg');
      } else {
        panel.classList.remove('ring-2', 'ring-secondary', 'ring-offset-2', 'ring-offset-background', 'shadow-lg');
      }
    });

    const quickBar = els.view.querySelector('.koma-quick-bar');
    if (quickBar && els.panels[komaIdx]) {
      els.panels[komaIdx].appendChild(quickBar);
      const badgeLabel = quickBar.querySelector('.text-secondary-fixed');
      if (badgeLabel) {
        badgeLabel.textContent = `Koma #${komaIdx + 1} Activa`;
      }
    }

    const inspector = els.view.querySelector('aside.w-\\[320px\\]');
    if (inspector) {
      const subtitleEl = inspector.querySelector('.text-secondary.font-semibold');
      if (subtitleEl) {
        subtitleEl.textContent = activeKoma.subtitle;
      }
      const promptArea = document.getElementById('koma-prompt-textarea') || inspector.querySelector('textarea');
      if (promptArea) {
        promptArea.value = activeKoma.prompt || '';
        promptArea.placeholder = `Describe desde cero la escena de la Koma #${komaIdx + 1} (Ej: Samurái bajo la lluvia en contrapicado, tinta G-Pen de alto contraste)...`;
      }
      const dialogueInput = document.getElementById('koma-dialogue-input');
      if (dialogueInput) {
        dialogueInput.value = activeKoma.dialogue || '';
      }
      const sfxInput = document.getElementById('koma-sfx-input');
      if (sfxInput) {
        sfxInput.value = activeKoma.sfx || '';
      }
      const angleSelect = inspector.querySelector('select:not(#ai-engine-selector)');
      if (angleSelect) {
        Array.from(angleSelect.options).forEach((opt) => {
          if (opt.textContent.trim() === activeKoma.cameraAngle) {
            angleSelect.value = opt.value;
          }
        });
      }
      renderInspectorCharacterChips(inspector, activeKoma);
    }

    if (!silent) {
      window.showStudioToast(`Seleccionada Koma #${komaIdx + 1} · Lista para entintar`);
    }
  }

  function renderInspectorCharacterChips(inspector, activeKoma) {
    const chipContainer = inspector.querySelector('.flex.flex-wrap.gap-1\\.5');
    const traitsContainer = chipContainer ? chipContainer.nextElementSibling : null;
    if (!chipContainer) return;

    chipContainer.innerHTML = '';

    if (state.characters.length === 0) {
      const addCharBtn = document.createElement('button');
      addCharBtn.type = 'button';
      addCharBtn.className = 'inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container-low hover:bg-secondary-fixed text-secondary font-label-md text-label-md font-semibold border border-dashed border-secondary/40 transition-colors';
      addCharBtn.innerHTML = '<span class="material-symbols-outlined text-[14px]">person_add</span><span>+ Crear 1er Personaje (@Settei)</span>';
      addCharBtn.addEventListener('click', () => openStudioModal('modal-new-settei'));
      chipContainer.appendChild(addCharBtn);
    } else {
      state.characters.forEach((char) => {
        const isLinked = activeKoma.linkedHandles.includes(char.handle);
        const btn = document.createElement('button');
        btn.type = 'button';
        if (isLinked) {
          btn.className = 'inline-flex items-center gap-1.5 bg-secondary-fixed/60 px-2 py-1 rounded text-on-secondary-fixed-variant font-label-md text-label-md border border-secondary/30';
          btn.innerHTML = `<span class="w-3.5 h-3.5 rounded-full bg-secondary text-[9px] text-on-secondary flex items-center justify-center font-bold">${char.name.charAt(0)}</span><span class="font-semibold">${char.handle}</span><span class="text-[10px] text-secondary font-label-technical">Seed #${char.seed} ✓</span>`;
        } else {
          btn.className = 'inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-label-md text-label-md transition-colors';
          btn.innerHTML = `<span class="material-symbols-outlined text-[13px]">person_add</span><span>+ ${char.handle}</span>`;
        }
        btn.addEventListener('click', () => {
          const idx = activeKoma.linkedHandles.indexOf(char.handle);
          if (idx >= 0) {
            activeKoma.linkedHandles.splice(idx, 1);
            window.showStudioToast(`Ancla Settei desvinculada: ${char.handle}`);
          } else {
            activeKoma.linkedHandles.push(char.handle);
            window.showStudioToast(`Ancla Settei vinculada a Koma #${activeKoma.index + 1}: ${char.handle}`);
          }
          savePersistedState();
          renderInspectorCharacterChips(inspector, activeKoma);
        });
        chipContainer.appendChild(btn);
      });
    }

    if (traitsContainer) {
      traitsContainer.innerHTML = '';
      const activeChars = state.characters.filter((c) => activeKoma.linkedHandles.includes(c.handle));
      const allAnchors = [];
      activeChars.forEach((c) => {
        (c.anchors || []).forEach((a) => {
          if (!allAnchors.includes(a)) allAnchors.push(a);
        });
      });
      if (allAnchors.length === 0) {
        const span = document.createElement('span');
        span.className = 'px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant';
        span.textContent = 'Sin anclas vinculadas (Escena / Personaje Libre)';
        traitsContainer.appendChild(span);
      } else {
        allAnchors.slice(0, 4).forEach((trait) => {
          const span = document.createElement('span');
          span.className = 'px-1.5 py-0.5 rounded bg-surface-container';
          span.textContent = trait;
          traitsContainer.appendChild(span);
        });
      }
    }
  }

  function initGenkoRightInspector(view) {
    const inspector = view.querySelector('aside.w-\\[320px\\]');
    if (!inspector) return;

    const promptArea = inspector.querySelector('textarea');
    if (promptArea) {
      promptArea.id = 'koma-prompt-textarea';
      promptArea.addEventListener('input', () => {
        state.komas[state.activeKomaIndex].prompt = promptArea.value;
        savePersistedState();
      });
    }

    // Inject the AI Image Engine Selector & Live Test Bench inside the AI Co-pilot Box
    const copilotBox = promptArea ? promptArea.parentElement : null;
    if (copilotBox && !document.getElementById('ai-engine-selector')) {
      const headerRow = copilotBox.firstElementChild;
      if (headerRow) {
        const latencySpan = headerRow.querySelector('.text-tertiary');
        if (latencySpan) {
          latencySpan.id = 'koma-engine-latency-badge';
          latencySpan.textContent = 'Listo p/ Prueba';
        }
      }

      const engineSelectorWrap = document.createElement('div');
      engineSelectorWrap.className = 'flex flex-col gap-1 pt-0.5';
      const engines = (window.KAIMangaImageRouter && window.KAIMangaImageRouter.ENGINES) || [];
      engineSelectorWrap.innerHTML = `
        <div class="flex items-center justify-between">
          <label class="font-label-micro text-label-micro uppercase font-semibold text-on-surface-variant">Motor de Imagen (Pruebas)</label>
          <button id="btn-test-engines" type="button" class="font-label-micro text-label-micro text-secondary hover:underline font-semibold flex items-center gap-0.5">
            <span class="material-symbols-outlined text-[12px]">bolt</span>Diagnosticar API
          </button>
        </div>
        <select id="ai-engine-selector" class="w-full bg-surface-container-lowest border border-surface-container-highest text-on-surface font-label-technical text-label-technical rounded px-2 py-1 focus:outline-none focus:border-secondary">
          ${engines
            .map(
              (e) =>
                `<option value="${e.id}" ${e.id === state.selectedEngine ? 'selected' : ''}>${e.label}</option>`
            )
            .join('')}
        </select>
      `;
      copilotBox.insertBefore(engineSelectorWrap, promptArea);

      const selEl = engineSelectorWrap.querySelector('#ai-engine-selector');
      if (selEl) {
        selEl.addEventListener('change', () => {
          state.selectedEngine = selEl.value;
          if (window.KAIMangaImageRouter) {
            window.KAIMangaImageRouter.saveConfig({ engine: selEl.value });
          }
          window.showStudioToast(`Motor de prueba activo: ${selEl.options[selEl.selectedIndex].text}`);
        });
      }

      const diagBtn = engineSelectorWrap.querySelector('#btn-test-engines');
      if (diagBtn) {
        diagBtn.addEventListener('click', async () => {
          diagBtn.textContent = 'Probando /api/generate...';
          const rep = window.KAIMangaImageRouter ? await window.KAIMangaImageRouter.runDiagnostics() : { ok: false };
          diagBtn.innerHTML = '<span class="material-symbols-outlined text-[12px]">bolt</span>Diagnosticar API';
          if (rep && rep.ok) {
            const gStatus = rep.serverKeys?.GEMINI_API_KEY ? `GEMINI_API_KEY ✓ (${rep.geminiTextCompiler})` : 'GEMINI_API_KEY ✗';
            const hfStatus = rep.serverKeys?.HF_API_TOKEN ? 'HF_TOKEN ✓' : 'HF_TOKEN opcional';
            window.showStudioToast(`Diagnóstico Vercel: ${gStatus} · ${hfStatus}`);
          } else {
            window.showStudioToast('Modo Local Activo · Usa el motor Shitagaki 0ms o despliega en Vercel');
          }
        });
      }

      // Inject Quick Dialogue (Fukidashi) & Onomatopoeia (SFX) inputs so blank Komas can add bubbles easily
      const fukidashiWrap = document.createElement('div');
      fukidashiWrap.className = 'grid grid-cols-2 gap-1.5 pt-1 border-t border-surface-container-highest/60';
      fukidashiWrap.innerHTML = `
        <div>
          <label class="block font-label-micro text-label-micro text-on-surface-variant uppercase mb-0.5">Globo Diálogo</label>
          <input id="koma-dialogue-input" type="text" placeholder="Sin diálogo..." class="w-full bg-surface-container-lowest rounded px-2 py-1 font-label-micro text-label-micro text-on-surface focus:outline-none border border-surface-container-highest"/>
        </div>
        <div>
          <label class="block font-label-micro text-label-micro text-on-surface-variant uppercase mb-0.5">Onomatopeya SFX</label>
          <input id="koma-sfx-input" type="text" placeholder="Ej: ドドド / ¡ZAS!" class="w-full bg-surface-container-lowest rounded px-2 py-1 font-label-micro text-label-micro text-on-surface focus:outline-none border border-surface-container-highest"/>
        </div>
      `;
      copilotBox.appendChild(fukidashiWrap);

      const dlgInput = fukidashiWrap.querySelector('#koma-dialogue-input');
      const sfxInput = fukidashiWrap.querySelector('#koma-sfx-input');

      if (dlgInput) {
        dlgInput.addEventListener('input', () => {
          state.komas[state.activeKomaIndex].dialogue = dlgInput.value;
          updateKomaBubbleOverlay(state.activeKomaIndex, dlgInput.value);
          savePersistedState();
        });
      }
      if (sfxInput) {
        sfxInput.addEventListener('input', () => {
          state.komas[state.activeKomaIndex].sfx = sfxInput.value;
          updateKomaSfxOverlay(state.activeKomaIndex, sfxInput.value);
          savePersistedState();
        });
      }
    }

    // Camera angle selector
    const angleSelect = inspector.querySelector('select:not(#ai-engine-selector)');
    if (angleSelect) {
      angleSelect.addEventListener('change', () => {
        state.komas[state.activeKomaIndex].cameraAngle = angleSelect.value;
        savePersistedState();
        window.showStudioToast(`Ángulo de cámara Koma #${state.activeKomaIndex + 1}: ${angleSelect.value}`);
      });
    }

    // Action buttons inside Inspector
    const buttons = inspector.querySelectorAll('button');
    buttons.forEach((btn) => {
      const txt = (btn.textContent || '').trim();
      if (txt.includes('Generar / Refinar Entintado')) {
        btn.id = 'btn-generate-active-koma';
        btn.addEventListener('click', () => {
          generateActiveKomaInk(state.activeKomaIndex, 'standard');
        });
      } else if (txt.includes('Convertir Fondo 3D a Línea')) {
        btn.addEventListener('click', () => {
          generateActiveKomaInk(state.activeKomaIndex, 'lt_background');
        });
      } else if (txt.includes('15% 60L')) {
        btn.addEventListener('click', () => setKomaScreentone(state.activeKomaIndex, '15'));
      } else if (txt.includes('30% 60L')) {
        btn.addEventListener('click', () => setKomaScreentone(state.activeKomaIndex, '30'));
      } else if (txt.includes('60% Sombra')) {
        btn.addEventListener('click', () => setKomaScreentone(state.activeKomaIndex, '60'));
      } else if (txt.includes('Degradado')) {
        btn.addEventListener('click', () => setKomaScreentone(state.activeKomaIndex, 'gradient'));
      }
    });

    // 7-Layer visibility toggles
    const layerRows = inspector.querySelectorAll('.flex.flex-col.gap-1 > div.h-8');
    layerRows.forEach((row) => {
      const visBtn = row.querySelector('button');
      const layerLabel = row.textContent || '';
      if (!visBtn) return;

      visBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const icon = visBtn.querySelector('.material-symbols-outlined');
        const isHidden = icon && icon.textContent.trim() === 'visibility_off';
        if (icon) {
          icon.textContent = isHidden ? 'visibility' : 'visibility_off';
        }
        row.classList.toggle('opacity-50', !isHidden);
        toggleCanvasLayerByLabel(layerLabel, isHidden);
      });
    });

    renderInspectorCharacterChips(inspector, state.komas[state.activeKomaIndex]);
  }

  function updateKomaBubbleOverlay(komaIdx, text) {
    const els = getGenkoElements();
    if (!els || !els.panels[komaIdx]) return;
    const panel = els.panels[komaIdx];
    let bubble = panel.querySelector('.rounded-\\[20px\\]');
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.className = 'absolute bottom-5 right-3 max-w-[175px] bg-surface-container-lowest rounded-[20px] p-2.5 shadow-md z-20 border border-on-surface/80';
      bubble.innerHTML = '<p class="font-headline-sm text-[12px] leading-tight font-bold text-on-surface text-center tracking-tight uppercase"></p><div class="absolute -bottom-1.5 left-6 w-3 h-3 bg-surface-container-lowest rotate-45"></div>';
      panel.appendChild(bubble);
    }
    const p = bubble.querySelector('p');
    if (!text || text.trim() === '') {
      bubble.classList.add('hidden');
    } else {
      bubble.classList.remove('hidden');
      if (p) p.textContent = text.trim();
    }
  }

  function updateKomaSfxOverlay(komaIdx, sfxText) {
    const els = getGenkoElements();
    if (!els || !els.panels[komaIdx]) return;
    const panel = els.panels[komaIdx];
    let sfxEl = panel.querySelector('.font-headline-xl');
    if (!sfxEl) {
      const wrap = document.createElement('div');
      wrap.className = 'absolute inset-0 flex items-center justify-center pointer-events-none z-20';
      sfxEl = document.createElement('div');
      sfxEl.className = 'font-headline-xl text-headline-xl font-black text-on-surface tracking-widest drop-shadow-[0_2px_4px_rgba(255,255,255,0.95)] select-none scale-125 transform -rotate-6';
      wrap.appendChild(sfxEl);
      panel.appendChild(wrap);
    }
    if (!sfxText || sfxText.trim() === '') {
      sfxEl.classList.add('hidden');
    } else {
      sfxEl.classList.remove('hidden');
      sfxEl.textContent = sfxText.trim();
    }
  }

  function toggleCanvasLayerByLabel(label, visible) {
    const els = getGenkoElements();
    if (!els) return;

    if (label.includes('Guías Genkō')) {
      setGenkoGuidesVisibility(visible);
    } else if (label.includes('Globos Fukidashi')) {
      const bubbles = els.canvasPaper.querySelectorAll('.rounded-\\[20px\\]');
      bubbles.forEach((b) => b.classList.toggle('hidden', !visible));
      window.showStudioToast(`Capa Globos Fukidashi: ${visible ? 'Visible' : 'Oculta'}`);
    } else if (label.includes('Onomatopeyas')) {
      const sfx = els.canvasPaper.querySelectorAll('.font-headline-xl');
      sfx.forEach((s) => s.classList.toggle('hidden', !visible));
      window.showStudioToast(`Capa Onomatopeyas (SFX): ${visible ? 'Visible' : 'Oculta'}`);
    } else if (label.includes('Marcos Koma')) {
      els.panels.forEach((p) => {
        p.style.border = visible ? '' : 'none';
      });
      window.showStudioToast(`Capa Marcos Koma: ${visible ? 'Visible' : 'Oculta'}`);
    } else if (label.includes('Tinta Sumi')) {
      els.panels.forEach((p) => {
        const img = p.querySelector('img');
        if (img) img.classList.toggle('opacity-0', !visible);
      });
      window.showStudioToast(`Capa Tinta Sumi · G-Pen: ${visible ? 'Visible' : 'Oculta'}`);
    } else if (label.includes('Tramas')) {
      const overlays = els.canvasPaper.querySelectorAll('.koma-screentone-overlay');
      overlays.forEach((o) => o.classList.toggle('hidden', !visible));
      window.showStudioToast(`Capa Tramas Screentone: ${visible ? 'Visible' : 'Oculta'}`);
    } else if (label.includes('Boceto Azul')) {
      els.panels.forEach((p) => {
        const img = p.querySelector('img');
        if (img) {
          img.style.filter = !visible ? '' : 'sepia(35%) hue-rotate(170deg) saturate(160%)';
        }
      });
      window.showStudioToast(`Capa Boceto Azul (Shitagaki #00AEEF): ${visible ? 'Modo Trazo Azul Activo' : 'Purgado p/ Imprenta'}`);
    }
  }

  function toggleGenkoGuides() {
    setGenkoGuidesVisibility(!state.guidesVisible);
  }

  function setGenkoGuidesVisibility(visible) {
    state.guidesVisible = visible;
    const els = getGenkoElements();
    if (els) {
      const guideEls = els.canvasPaper.querySelectorAll('[class*="border-tertiary-container"], [class*="bg-tertiary-container"], [class*="text-tertiary-container"]');
      guideEls.forEach((el) => {
        el.classList.toggle('opacity-0', !visible);
      });
    }
    const headerDivs = document.querySelectorAll('header span.text-tertiary');
    headerDivs.forEach((sp) => {
      if ((sp.textContent || '').includes('Guías Genkō:')) {
        sp.textContent = `Guías Genkō: ${visible ? 'ON' : 'OFF'}`;
      }
    });
    window.showStudioToast(`Guías Genkō (#00AEEF Tonbo & Naiwaku): ${visible ? 'ON' : 'OFF'}`);
  }

  function setKomaScreentone(komaIdx, toneType) {
    if (!state.komas[komaIdx]) return;
    state.komas[komaIdx].screentone = toneType;
    applyScreentoneStyle(komaIdx, toneType);
    savePersistedState();
    const labels = {
      none: 'Sin trama adicional',
      '15': 'Trama 15% 60L aplicada',
      '30': 'Trama 30% 60L aplicada',
      '60': 'Trama 60% Sombra densa aplicada',
      gradient: 'Trama Degradado dramático aplicada'
    };
    window.showStudioToast(`Koma #${komaIdx + 1}: ${labels[toneType] || toneType}`);
  }

  function applyScreentoneStyle(komaIdx, toneType) {
    const els = getGenkoElements();
    if (!els || !els.panels[komaIdx]) return;
    const overlay = els.panels[komaIdx].querySelector('.koma-screentone-overlay');
    if (!overlay) return;

    if (!toneType || toneType === 'none') {
      overlay.style.backgroundImage = 'none';
      overlay.style.opacity = '0';
    } else if (toneType === '15') {
      overlay.style.backgroundImage = 'radial-gradient(rgba(27,28,24,0.35) 1px, transparent 1px)';
      overlay.style.backgroundSize = '5px 5px';
      overlay.style.opacity = '0.45';
    } else if (toneType === '30') {
      overlay.style.backgroundImage = 'radial-gradient(rgba(27,28,24,0.55) 1.35px, transparent 1.35px)';
      overlay.style.backgroundSize = '5px 5px';
      overlay.style.opacity = '0.55';
    } else if (toneType === '60') {
      overlay.style.backgroundImage = 'radial-gradient(rgba(27,28,24,0.8) 1.8px, transparent 1.8px)';
      overlay.style.backgroundSize = '4px 4px';
      overlay.style.opacity = '0.68';
    } else if (toneType === 'gradient') {
      overlay.style.backgroundImage = 'linear-gradient(180deg, rgba(27,28,24,0.55) 0%, rgba(27,28,24,0.15) 55%, transparent 100%)';
      overlay.style.backgroundSize = '100% 100%';
      overlay.style.opacity = '0.75';
    }
  }

  function toggleKomaInvert(komaIdx) {
    const els = getGenkoElements();
    if (!els || !els.panels[komaIdx]) return;
    const img = els.panels[komaIdx].querySelector('img');
    if (!img) return;
    state.komas[komaIdx].inverted = !state.komas[komaIdx].inverted;
    img.style.filter = state.komas[komaIdx].inverted ? 'invert(1) contrast(1.15)' : '';
    savePersistedState();
    window.showStudioToast(`Koma #${komaIdx + 1}: Inversión Negativa ${state.komas[komaIdx].inverted ? 'ACTIVA' : 'DESACTIVADA'}`);
  }

  function toggleKomaLock(komaIdx, btn) {
    state.komas[komaIdx].locked = !state.komas[komaIdx].locked;
    const icon = btn ? btn.querySelector('.material-symbols-outlined') : null;
    if (icon) {
      icon.textContent = state.komas[komaIdx].locked ? 'lock' : 'lock_open';
    }
    window.showStudioToast(`Koma #${komaIdx + 1}: ${state.komas[komaIdx].locked ? 'Bloqueada' : 'Desbloqueada'}`);
  }

  // ==========================================================================
  // 3. AI GENERATION ENGINE EXECUTION & TEST METRICS
  // ==========================================================================
  async function generateActiveKomaInk(komaIdx, modeVariant) {
    const els = getGenkoElements();
    if (!els || !els.panels[komaIdx]) return;

    const koma = state.komas[komaIdx];
    if (koma.locked) {
      window.showStudioToast(`⚠️ Koma #${komaIdx + 1} está bloqueada. Desbloquéala primero.`);
      return;
    }

    const promptArea = document.getElementById('koma-prompt-textarea');
    if (promptArea && promptArea.value.trim()) {
      koma.prompt = promptArea.value.trim();
    }

    const userScene = (koma.prompt || '').trim() || `Escena dramática de manga seinen para Koma #${komaIdx + 1}, entintado G-Pen de alto contraste`;

    const panel = els.panels[komaIdx];
    const img = panel.querySelector('img');
    const genBtn = document.getElementById('btn-generate-active-koma');
    const latencyBadge = document.getElementById('koma-engine-latency-badge');

    if (genBtn) {
      genBtn.disabled = true;
      genBtn.innerHTML = '<span class="material-symbols-outlined text-[15px] animate-spin">progress_activity</span> Generando con Motor IA...';
    }
    if (latencyBadge) {
      latencyBadge.textContent = 'Renderizando...';
    }

    panel.classList.add('animate-pulse');
    window.showStudioToast(`Generando Koma #${komaIdx + 1} con motor [${state.selectedEngine}]...`);

    try {
      const linkedChars = state.characters.filter((c) => koma.linkedHandles.includes(c.handle));
      let actionPrompt = userScene;
      if (modeVariant === 'pose_kai') {
        actionPrompt += ', dynamic foreshortening action pose, expressive manga motion lines, strong black beta shadows';
      } else if (modeVariant === 'lt_background') {
        actionPrompt += ', architectural precision lineart extraction (LT 3D-to-line), clean ruler perspective ink lines, detailed crosshatching';
      }

      const angleMap = {
        'Contrapicado Dramático (Low Angle)': 'low_angle',
        'Gran Plano General (Establishing)': 'wide_establishing',
        'Primer Plano Emocional': 'extreme_closeup',
        'Plano Picado Cenital': 'high_angle',
        'Plano Holandés (Inclinado FX)': 'dynamic_diagonal'
      };

      const isWidePanel = komaIdx === 0 || komaIdx === 3;
      const width = isWidePanel ? 896 : 640;
      const height = isWidePanel ? 448 : 768;

      if (window.KAIMangaImageRouter) {
        const res = await window.KAIMangaImageRouter.generateImage({
          komaIndex: komaIdx,
          engine: state.selectedEngine,
          mode: 'koma_single',
          penNib: state.activePenNib,
          cameraAngle: angleMap[koma.cameraAngle] || 'low_angle',
          actionPrompt,
          characters: linkedChars,
          seed: Math.floor(1000 + Math.random() * 9000),
          width,
          height
        });

        if (res && res.url && img) {
          img.src = res.url;
          state.customImages[komaIdx] = res.url;
          koma.subtitle = `Koma #${komaIdx + 1} • Entintada (${res.provider || state.selectedEngine})`;
          savePersistedState();

          if (latencyBadge) {
            const sec = ((res.latencyMs || 800) / 1000).toFixed(1);
            latencyBadge.textContent = `${sec}s · ${res.provider || 'OK'}`;
          }
          window.showStudioToast(`✓ Koma #${komaIdx + 1} generada por ${res.provider || 'Motor IA'}`);
        }
      }
    } catch (err) {
      console.error('[MANGAI Studio] Error generating Koma ink:', err);
      window.showStudioToast('⚠️ Error en prueba de motor IA');
    } finally {
      panel.classList.remove('animate-pulse');
      if (genBtn) {
        genBtn.disabled = false;
        genBtn.innerHTML = '<span class="material-symbols-outlined text-[15px]">draw</span> Generar / Refinar Entintado';
      }
    }
  }

  async function generateAllKomasOnPage() {
    window.showStudioToast('🔥 Probando generación en serie de las 4 Komas...');
    for (let i = 0; i < 4; i++) {
      selectKoma(i, true);
      await generateActiveKomaInk(i, 'standard');
    }
    window.showStudioToast('✓ Las 4 viñetas de la página han sido procesadas');
  }

  function initGenkoToolbars(view, canvasPaper) {
    const topSubBar = view.firstElementChild;
    if (topSubBar) {
      const btns = topSubBar.querySelectorAll('button');
      btns.forEach((btn) => {
        const txt = (btn.textContent || '').trim();
        const icon = btn.querySelector('.material-symbols-outlined')?.textContent.trim();
        if (txt.includes('Entintar Todo (KAI)')) {
          btn.addEventListener('click', () => generateAllKomasOnPage());
        } else if (txt.includes('Doble Pliego')) {
          btn.addEventListener('click', () => switchStudioStage('tablero-nemu'));
        } else if (icon === 'zoom_in') {
          btn.addEventListener('click', () => updateCanvasZoom(state.zoomPercent + 15));
        } else if (icon === 'zoom_out') {
          btn.addEventListener('click', () => updateCanvasZoom(state.zoomPercent - 15));
        }
      });
    }

    const leftDock = view.querySelector('aside.w-\\[68px\\]');
    if (leftDock) {
      const flyout = leftDock.querySelector('.w-44');
      if (flyout) {
        flyout.classList.add('hidden'); // Start clean with flyout closed until clicked
        const pBtn = flyout.previousElementSibling;
        if (pBtn) {
          pBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            flyout.classList.toggle('hidden');
          });
        }
        const nibBtns = flyout.querySelectorAll('button');
        const nibKeys = ['g_pen', 'maru_pen', 'kabura_pen', 'pincel_beta'];
        nibBtns.forEach((nb, idx) => {
          nb.addEventListener('click', (e) => {
            e.stopPropagation();
            state.activePenNib = nibKeys[idx] || 'g_pen';
            nibBtns.forEach((b) => b.classList.remove('bg-surface-container', 'font-semibold'));
            nb.classList.add('bg-surface-container', 'font-semibold');
            flyout.classList.add('hidden');
            window.showStudioToast(`Plumilla seleccionada: ${nb.textContent.trim().replace(/\s+/g, ' ')}`);
          });
        });
      }

      if (canvasPaper && flyout) {
        canvasPaper.addEventListener('click', () => {
          flyout.classList.add('hidden');
        });
      }

      const allDockBtns = leftDock.querySelectorAll('button');
      allDockBtns.forEach((btn) => {
        const title = btn.getAttribute('title') || '';
        if (title.includes('Girar Mesa')) {
          btn.addEventListener('click', () => {
            state.canvasRotated = !state.canvasRotated;
            if (canvasPaper) {
              canvasPaper.style.transform = state.canvasRotated
                ? `scale(${state.zoomPercent / 125}) rotate(-4deg)`
                : `scale(${state.zoomPercent / 125})`;
            }
            window.showStudioToast(state.canvasRotated ? 'Mesa inclinada (-4°)' : 'Mesa centrada (0°)');
          });
        } else if (title.startsWith('[') && !title.includes('[P]')) {
          btn.addEventListener('click', () => {
            window.showStudioToast(`Herramienta activa: ${title}`);
          });
        }
      });
    }

    const bottomPill = view.querySelector('.rounded-full.shadow-lg');
    if (bottomPill) {
      const pillBtns = bottomPill.querySelectorAll('button');
      pillBtns.forEach((btn) => {
        const txt = (btn.textContent || '').trim();
        if (txt.includes('Ajustar al Centro')) {
          btn.addEventListener('click', () => {
            state.canvasRotated = false;
            updateCanvasZoom(125);
          });
        } else if (txt.includes('Retícula Koma')) {
          btn.addEventListener('click', () => {
            toggleGenkoGuides();
            btn.innerHTML = `<span class="material-symbols-outlined text-[15px]">grid_4x4</span> Retícula Koma: ${state.guidesVisible ? 'ON' : 'OFF'}`;
          });
        }
      });
    }

    const globalLeftRail = document.querySelector('body > aside.fixed.left-0');
    if (globalLeftRail) {
      const railBtns = globalLeftRail.querySelectorAll('button');
      railBtns.forEach((btn) => {
        const title = btn.getAttribute('title') || '';
        btn.addEventListener('click', () => {
          if (title.includes('Configuración')) {
            openStudioModal('modal-plan-settings');
          } else if (title.includes('Asistente KAI')) {
            switchStudioStage('lienzo-genko');
            generateActiveKomaInk(state.activeKomaIndex, 'pose_kai');
          } else {
            railBtns.forEach((b) => {
              b.classList.remove('bg-inverse-surface', 'text-inverse-on-surface');
              b.classList.add('text-on-surface-variant');
            });
            btn.classList.add('bg-inverse-surface', 'text-inverse-on-surface');
            btn.classList.remove('text-on-surface-variant');
            window.showStudioToast(`Herramienta rápida: ${title}`);
          }
        });
      });
    }
  }

  function updateCanvasZoom(nextZoom) {
    state.zoomPercent = Math.max(70, Math.min(185, nextZoom));
    const els = getGenkoElements();
    if (els && els.canvasPaper) {
      const scale = (state.zoomPercent / 125).toFixed(2);
      els.canvasPaper.style.transform = state.canvasRotated
        ? `scale(${scale}) rotate(-4deg)`
        : `scale(${scale})`;
    }
    const view = document.getElementById('view-lienzo-genko');
    if (view) {
      const zoomBadge = view.querySelector('.px-1.font-semibold.text-on-surface');
      if (zoomBadge) zoomBadge.textContent = `${state.zoomPercent}%`;
    }
    window.showStudioToast(`Zoom de Mesa Genkō: ${state.zoomPercent}%`);
  }

  // ==========================================================================
  // 4. BIBLIA SETTEI — BLANK CHARACTER ROSTER BY DEFAULT
  // ==========================================================================
  function renderBlankOrDemoSettei() {
    const view = document.getElementById('view-biblia-settei');
    if (!view) return;
    const grid = view.querySelector('.grid');
    if (!grid) return;

    if (!state.originalSetteiGridHtml) {
      state.originalSetteiGridHtml = grid.innerHTML;
    }

    // Update badge counter in Settei top bar
    const countBadge = view.querySelector('.bg-primary-container.text-on-primary-container.rounded-full');
    if (countBadge) {
      countBadge.textContent = `${state.characters.length} fijados`;
    }

    if (state.projectMode === 'blank' && state.characters.length === 0) {
      grid.innerHTML = `
        <article onclick="openStudioModal('modal-new-settei')" class="col-span-full bg-surface-container-lowest rounded-xl p-8 border-2 border-dashed border-secondary/40 hover:border-secondary flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all">
          <div class="w-12 h-12 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant flex items-center justify-center">
            <span class="material-symbols-outlined text-[26px]">person_add</span>
          </div>
          <div class="space-y-1 max-w-md">
            <h3 class="font-headline-md text-headline-md text-on-surface font-bold">Tu Biblia Settei está en blanco (Desde Cero)</h3>
            <p class="font-body-md text-body-md text-on-surface-variant">
              Crea tu primer personaje para generar su Hoja de Modelo con IA y bloquear su Seed numérico en todas las viñetas.
            </p>
          </div>
          <button type="button" class="mt-1 px-4 py-2 rounded bg-primary-container text-on-primary-container font-label-lg text-label-lg font-semibold shadow-sm flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[16px]">add_circle</span>
            + Crear Primer Personaje (@Settei)
          </button>
        </article>
      `;
    } else if (state.projectMode === 'demo' && state.characters.length <= 2) {
      grid.innerHTML = state.originalSetteiGridHtml;
    }
  }

  function initBibliaSettei() {
    const view = document.getElementById('view-biblia-settei');
    if (!view) return;

    renderBlankOrDemoSettei();

    const btns = view.querySelectorAll('button');
    btns.forEach((btn) => {
      const txt = (btn.textContent || '').trim();
      if (txt.includes('Nuevo Personaje')) {
        btn.addEventListener('click', () => openStudioModal('modal-new-settei'));
      } else if (txt.includes('Vincular a Koma') || txt.includes('Enviar a Lienzo')) {
        btn.addEventListener('click', () => switchStudioStage('lienzo-genko'));
      }
    });

    const searchInput = view.querySelector('input[type="text"]');
    const grid = view.querySelector('.grid');
    if (searchInput && grid) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        Array.from(grid.children).forEach((card) => {
          const text = (card.textContent || '').toLowerCase();
          card.classList.toggle('hidden', q !== '' && !text.includes(q));
        });
      });
    }
  }

  // ==========================================================================
  // 5. GUION KŌSŌ & TABLERO NEMU — BLANK SPREAD IN BLANK MODE
  // ==========================================================================
  function initGuionKosoAndNemu() {
    const view = document.getElementById('view-guion-koso');
    if (!view) return;

    if (state.projectMode === 'blank' && window.KAIMangaImageRouter) {
      const nemuImgs = view.querySelectorAll('img');
      nemuImgs.forEach((img, idx) => {
        img.src = window.KAIMangaImageRouter.renderBlankGenkoKoma({
          komaIndex: idx,
          width: 480,
          height: 300,
          subtitle: 'Boceto Nemu en Blanco'
        });
      });
    }

    const btns = view.querySelectorAll('button');
    btns.forEach((btn) => {
      const txt = (btn.textContent || '').trim();
      if (txt.includes('Auto-Dividir Koma') || txt.includes('Generar Nemu')) {
        btn.addEventListener('click', () => {
          window.showStudioToast('✨ KAI Sensei: Estructura de viñetas lista para pasar al Lienzo Genkō');
        });
      } else if (txt.includes('Lienzo Genkō') || txt.includes('Pasar a Entintado')) {
        btn.addEventListener('click', () => switchStudioStage('lienzo-genko'));
      }
    });
  }

  // ==========================================================================
  // 6. EMPAQUE TANKŌBON — BLANK COVER IN BLANK MODE + 3D SWITCHER
  // ==========================================================================
  window.rotate3DBook = function (viewAngle) {
    const book = document.getElementById('tankobon-3d-object');
    if (!book) return;
    const transforms = {
      front: 'rotateY(0deg) rotateX(0deg) scale(1.04)',
      spine: 'rotateY(-75deg) rotateX(4deg) scale(1.05)',
      back: 'rotateY(-180deg) rotateX(0deg) scale(1.02)',
      iso: 'rotateY(-26deg) rotateX(10deg) scale(1.05)'
    };
    book.style.transform = transforms[viewAngle] || transforms.iso;
    window.showStudioToast(`Vista 3D Tankōbon B6: ${viewAngle.toUpperCase()}`);
  };

  window.generateTankobonCover = async function () {
    const promptInput = document.getElementById('cover-prompt-input');
    const btn = document.getElementById('btn-gen-cover');
    const promptText = promptInput ? promptInput.value.trim() : 'Ilustración de portada manga seinen en tinta Sumi de alto contraste';

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined text-[15px] animate-spin">progress_activity</span> Generando Portada B6...';
    }
    window.showStudioToast(`Generando portada Tankōbon B6 con motor [${state.selectedEngine}]...`);

    try {
      if (window.KAIMangaImageRouter) {
        const res = await window.KAIMangaImageRouter.generateImage({
          engine: state.selectedEngine,
          mode: 'cover',
          actionPrompt: promptText,
          characters: state.characters.slice(0, 2),
          seed: Math.floor(1000 + Math.random() * 9000),
          width: 768,
          height: 1080
        });
        if (res && res.url) {
          state.coverImage = res.url;
          savePersistedState();
          applyTankobonCoverUrl(res.url);
          window.showStudioToast(`✓ Portada B6 generada (${res.provider || 'Motor IA'})`);
        }
      }
    } catch (err) {
      console.error('[MANGAI Studio] Cover generation error:', err);
      window.showStudioToast('⚠️ Error al generar la portada');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined text-[15px]">brush</span> Regenerar Portada con IA';
      }
    }
  };

  function applyTankobonCoverUrl(url) {
    const view2D = document.getElementById('view-empaque-tankobon');
    const view3D = document.getElementById('view-empaque-3d');
    [view2D, view3D].filter(Boolean).forEach((view) => {
      const imgs = view.querySelectorAll('img');
      imgs.forEach((img) => {
        img.src = url;
      });
    });
  }

  function initEmpaqueTankobon() {
    const view2D = document.getElementById('view-empaque-tankobon');
    const view3D = document.getElementById('view-empaque-3d');

    if (state.coverImage) {
      applyTankobonCoverUrl(state.coverImage);
    } else if (state.projectMode === 'blank' && window.KAIMangaImageRouter) {
      const blankCover = window.KAIMangaImageRouter.renderBlankGenkoKoma({
        komaIndex: 0,
        width: 600,
        height: 860,
        subtitle: 'Portada Tankōbon B6 en Blanco'
      });
      applyTankobonCoverUrl(blankCover);
    }

    [view2D, view3D].filter(Boolean).forEach((view) => {
      const btns = view.querySelectorAll('button');
      btns.forEach((btn) => {
        const txt = (btn.textContent || '').trim();
        if (txt.includes('Maqueta 3D')) {
          btn.addEventListener('click', () => {
            if (view3D) {
              switchStudioStage('empaque-3d');
              window.showStudioToast('Simulador 3D Tankōbon B6 360° Activado');
            }
          });
        } else if (txt.includes('Pliego Plano 2D')) {
          btn.addEventListener('click', () => {
            switchStudioStage('empaque-tankobon');
            window.showStudioToast('Pliego Técnico 2D Tankōbon B6 (419.5 × 182 mm)');
          });
        } else if (txt.includes('Faja Obi')) {
          btn.addEventListener('click', () => {
            window.showStudioToast('Faja promocional japonesa (Obi 帯) alternada');
          });
        } else if (txt.includes('Generar Paquete de Imprenta') || txt.includes('Descargar PDF Imprenta')) {
          btn.addEventListener('click', () => {
            window.print();
          });
        }
      });
    });
  }

  // ==========================================================================
  // 7. MODALS: NUEVO PERSONAJE SETTEI, PLAN SETTINGS, EN BLANCO / DEMO
  // ==========================================================================
  window.openStudioModal = function (modalId) {
    const backdrop = document.getElementById('studio-modal-backdrop');
    const modalNew = document.getElementById('modal-new-settei');
    const modalPlan = document.getElementById('modal-plan-settings');
    if (!backdrop) return;

    if (modalNew) modalNew.classList.add('hidden');
    if (modalPlan) modalPlan.classList.add('hidden');

    const target = document.getElementById(modalId);
    if (target) {
      target.classList.remove('hidden');
      backdrop.classList.remove('hidden');
      backdrop.classList.add('flex');
    }

    if (modalId === 'modal-plan-settings' && window.KAIMangaImageRouter) {
      const cfg = window.KAIMangaImageRouter.getConfig();
      const gInput = document.getElementById('cfg-gemini-key');
      const hfInput = document.getElementById('cfg-hf-token');
      if (gInput) gInput.value = cfg.geminiApiKey || '';
      if (hfInput) hfInput.value = cfg.hfToken || '';
    }
  };

  window.closeStudioModals = function () {
    const backdrop = document.getElementById('studio-modal-backdrop');
    if (backdrop) {
      backdrop.classList.add('hidden');
      backdrop.classList.remove('flex');
    }
  };

  window.saveStudioApiSettings = function () {
    const gInput = document.getElementById('cfg-gemini-key');
    const hfInput = document.getElementById('cfg-hf-token');
    if (window.KAIMangaImageRouter) {
      window.KAIMangaImageRouter.saveConfig({
        engine: state.selectedEngine,
        geminiApiKey: gInput ? gInput.value.trim() : '',
        hfToken: hfInput ? hfInput.value.trim() : ''
      });
    }
    window.closeStudioModals();
    window.showStudioToast('✓ Configuración de llaves y motores IA guardada');
  };

  window.createNewSetteiCharacter = async function () {
    const nameInput = document.getElementById('new-char-name');
    const roleInput = document.getElementById('new-char-role');
    const appInput = document.getElementById('new-char-appearance');
    const anchorsInput = document.getElementById('new-char-anchors');
    const saveBtn = document.getElementById('btn-save-new-char');

    const rawName = (nameInput?.value || '').trim() || 'Protagonista';
    const cleanName = rawName.replace(/^@/, '');
    const handle = '@' + cleanName;
    const role = (roleInput?.value || '').trim() || 'Protagonista · Settei';
    const appearance = (appInput?.value || '').trim() || 'Personaje manga seinen en tinta Sumi de alto contraste.';
    const anchors = (anchorsInput?.value || 'Trazo G-Pen, Rasgo Distintivo')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const seed = Math.floor(1000 + Math.random() * 9000);

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Generando Retrato Settei con IA...';
    }

    let portraitUrl = '';
    try {
      if (window.KAIMangaImageRouter) {
        const res = await window.KAIMangaImageRouter.generateImage({
          engine: state.selectedEngine,
          mode: 'character_portrait',
          actionPrompt: `Character reference sheet portrait of ${cleanName}, ${appearance}, wearing ${anchors.join(', ')}`,
          character: { name: cleanName, appearance, clothing: anchors.join(', '), anchors, seed },
          seed,
          width: 512,
          height: 512
        });
        portraitUrl = res.url || '';
      }
    } catch (e) {}

    const newChar = {
      id: 'char_' + Date.now(),
      handle,
      name: cleanName,
      role,
      seed,
      appearance,
      clothing: anchors.join(', '),
      anchors,
      portraitUrl
    };
    state.characters.push(newChar);
    savePersistedState();

    const viewSettei = document.getElementById('view-biblia-settei');
    const grid = viewSettei ? viewSettei.querySelector('.grid') : null;
    if (grid) {
      if (state.characters.length === 1 && state.projectMode === 'blank') {
        grid.innerHTML = '';
      }
      const card = document.createElement('article');
      card.className = 'bg-surface-container-lowest rounded-lg overflow-hidden shadow-xs border border-surface-container-highest flex flex-col justify-between ring-2 ring-secondary';
      card.innerHTML = `
        <div class="relative h-48 bg-surface-container overflow-hidden">
          <img class="w-full h-full object-cover" src="${portraitUrl}" alt="${cleanName}"/>
          <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-inverse-surface/90 text-inverse-on-surface font-label-technical text-label-technical font-bold">${handle}</span>
          <span class="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-micro text-label-micro font-bold">Seed #${seed} 🔒</span>
        </div>
        <div class="p-space-sm space-y-2">
          <div>
            <h3 class="font-headline-sm text-headline-sm text-on-surface font-bold">${cleanName}</h3>
            <p class="font-label-technical text-label-technical text-on-surface-variant">${role}</p>
          </div>
          <p class="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">${appearance}</p>
          <div class="flex flex-wrap gap-1 pt-1">
            ${anchors.map((a) => `<span class="px-1.5 py-0.5 rounded bg-surface-container font-label-micro text-label-micro">${a}</span>`).join('')}
          </div>
        </div>
      `;
      grid.prepend(card);
    }

    const countBadge = viewSettei ? viewSettei.querySelector('.bg-primary-container.text-on-primary-container.rounded-full') : null;
    if (countBadge) {
      countBadge.textContent = `${state.characters.length} fijados`;
    }

    const genkoView = document.getElementById('view-lienzo-genko');
    const inspector = genkoView ? genkoView.querySelector('aside.w-\\[320px\\]') : null;
    if (inspector) {
      // Automatically link the new character to the active Koma
      if (!state.komas[state.activeKomaIndex].linkedHandles.includes(handle)) {
        state.komas[state.activeKomaIndex].linkedHandles.push(handle);
      }
      renderInspectorCharacterChips(inspector, state.komas[state.activeKomaIndex]);
    }

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">auto_awesome</span> Generar &amp; Fijar Seed Settei';
    }
    window.closeStudioModals();
    window.showStudioToast(`✓ Personaje ${handle} (Seed #${seed}) creado y vinculado a Koma #${state.activeKomaIndex + 1}`);
  };

  window.resetBlankStudioProject = function () {
    state.projectMode = 'blank';
    state.projectTitle = 'Nuevo Manga';
    state.characters = [];
    state.komas = createBlankKomas();
    state.customImages = {};
    state.coverImage = null;
    savePersistedState();

    const titleSpan = document.querySelector('header .text-on-surface.font-semibold');
    if (titleSpan) titleSpan.textContent = state.projectTitle;

    applyBlankOrDemoVisualsToCanvas();
    renderBlankOrDemoSettei();
    selectKoma(state.activeKomaIndex, true);
    window.closeStudioModals();
    window.showStudioToast('🧹 Estudio reiniciado 100% en blanco (Desde Cero)');
  };

  window.restoreDemoProject = function () {
    state.projectMode = 'demo';
    state.projectTitle = 'AnaCaona';
    state.characters = JSON.parse(JSON.stringify(DEMO_CHARACTERS));
    state.komas = JSON.parse(JSON.stringify(DEMO_KOMAS));
    state.customImages = {};
    state.coverImage = null;
    savePersistedState();
    window.location.reload();
  };

  function initStudio() {
    loadPersistedState();
    initTopNavigation();
    initGenkoCanvas();
    initBibliaSettei();
    initGuionKosoAndNemu();
    initEmpaqueTankobon();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStudio);
  } else {
    initStudio();
  }
})();
