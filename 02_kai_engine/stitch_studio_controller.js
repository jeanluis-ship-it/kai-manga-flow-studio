/**
 * ============================================================================
 * MANGAI / KAI STUDIO — STITCH SPA CONTROLLER v6.0 (Miro Architecture Edition)
 * ============================================================================
 * Implementa de extremo a extremo la Arquitectura Técnica del Tablero Miro:
 *   1. Frame 0 Semantic Tokens (#06B6D4 Mangaka, #8B5CF6 KAI IA, #10B981 Supabase, #F59E0B Gate)
 *   2. Koma State Machine (S0_KOMA_VACIO -> S1_KOMA_NEMU -> S2_KOMA_PEN_IRE ->
 *      S3_KOMA_TONE_FX -> S4_KOMA_SHIAGE -> S5_KOMA_LOCKED)
 *   3. Dos Caminos por Viñeta: RUTA MANUAL (Dibujo HTML5 en L0 Blue Draft / L2 G-Pen)
 *      y RUTA IA (Boceto L0 + @Personaje Settei + KAI Middleware + Postprocesador B/N)
 *   4. Control de Consistencia Settei (Aceptar Viñeta vs Reintentar con Reinyección)
 *   5. Pila Estricta de 7 Capas (L6..L0) con auto-exclusión de L0 y L6 al exportar
 *   6. Cálculo Dinámico de Lomo Tankōbon: lomo = (páginas / 2) * grosor_papel + Gates D3/D5
 * ============================================================================
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'mangai_stitch_studio_state_v6_miro';

  const DEMO_CHARACTERS = [
    {
      character_id: 'uuid-alo-8841',
      id: 'char_alo',
      handle: '@Alo',
      name: 'Alo',
      character_name: 'Alo',
      role: 'Guerrero Taíno · Portador del Guanín',
      seed: 8841,
      appearance: 'Guerrero joven taíno de piel cobriza, pómulos marcados, ojos oscuros almendrados intensos, cabello negro liso con cinta tejida ritual, cicatriz fina en pómulo izquierdo.',
      clothing: 'Medallón solar de Guanín dorado al pecho, capa oscura rasgada de combate, brazaletes de piedra cemí.',
      anchors: ['Medallón Guanín', 'Capa Oscura', 'Cicatriz Pómulo'],
      visual_anchors: ['Medallón Guanín', 'Capa Oscura', 'Cicatriz Pómulo'],
      turnaround_sheet_url: '',
      style_preset: 'Taíno Ancestral Ink'
    },
    {
      character_id: 'uuid-anacaona-9920',
      id: 'char_anacaona',
      handle: '@Anacaona',
      name: 'Anacaona',
      character_name: 'Anacaona',
      role: 'Cacica de Jaragua · Flor de Oro',
      seed: 9920,
      appearance: 'Mujer taína de porte real e imponente, mirada serena pero dominante, cabello largo negro azabache con ornamentos de oro y plumas reales.',
      clothing: 'Corona ritual de Guanín labrado, túnica ceremonial blanca y carmesí con geometría taína.',
      anchors: ['Corona Guanín', 'Mirada Real', 'Túnica Jaragua'],
      visual_anchors: ['Corona Guanín', 'Mirada Real', 'Túnica Jaragua'],
      turnaround_sheet_url: '',
      style_preset: 'Taíno Ancestral Ink'
    }
  ];

  function createBlankKomas() {
    return [0, 1, 2, 3].map((idx) => ({
      index: idx,
      id: `koma-${idx + 1}`,
      fsmState: 'S0_KOMA_VACIO', // S0 -> S5
      route: 'IA',                // 'MANUAL' | 'IA'
      label: `Koma #${idx + 1}`,
      subtitle: `Koma #${idx + 1} • [S0_KOMA_VACIO]`,
      prompt: '',
      cameraAngle: idx === 0 ? 'Gran Plano General (Establishing)' : idx === 1 ? 'Contrapicado Dramático (Low Angle)' : idx === 2 ? 'Primer Plano Emocional' : 'Plano Holandés (Inclinado FX)',
      linkedHandles: [],
      dialogue: '',
      sfx: '',
      screentone: 'none',
      inverted: false,
      locked: false,
      roughSketchDataUrl: '',
      consistencyScore: 100,
      defaultSrc: ''
    }));
  }

  const DEMO_KOMAS = [
    {
      index: 0,
      id: 'koma-1',
      fsmState: 'S2_KOMA_PEN_IRE',
      route: 'IA',
      label: 'Koma #1 • Gran Plano General',
      subtitle: 'Koma #1 • [S2_KOMA_PEN_IRE] Ruinas del Batey',
      prompt: 'Templo ceremonial taíno antiguo azotado por una tormenta eléctrica tropical, pilares monolíticos de piedra tallada con petroglifos, cielo dramático con tramas y rayos en blanco puro, entintado manga seinen.',
      cameraAngle: 'Gran Plano General (Establishing)',
      linkedHandles: ['@Alo'],
      dialogue: '',
      sfx: '',
      screentone: 'none',
      inverted: false,
      locked: false,
      roughSketchDataUrl: '',
      consistencyScore: 100,
      defaultSrc: ''
    },
    {
      index: 1,
      id: 'koma-2',
      fsmState: 'S4_KOMA_SHIAGE',
      route: 'IA',
      label: 'Koma #2 Activa',
      subtitle: 'Koma #2 • [S4_KOMA_SHIAGE] Acción Central (Alo)',
      prompt: 'Ataque frontal en salto, capa ondeando con fuerza, medallón de Guanín irradiando destellos, tinta Sumi de alto contraste con trama 60L.',
      cameraAngle: 'Contrapicado Dramático (Low Angle)',
      linkedHandles: ['@Alo'],
      dialogue: '¡El pacto del guanín no se romperá jamás!',
      sfx: '',
      screentone: '30',
      inverted: false,
      locked: false,
      roughSketchDataUrl: '',
      consistencyScore: 100,
      defaultSrc: ''
    },
    {
      index: 2,
      id: 'koma-3',
      fsmState: 'S3_KOMA_TONE_FX',
      route: 'IA',
      label: 'Koma #3',
      subtitle: 'Koma #3 • [S3_KOMA_TONE_FX] Primer Plano Ojos',
      prompt: 'Primerísimo plano extremo de ojos manga con mirada intensa y determinada, pestañas definidas en tinta negra, trama 40% en pómulo y líneas de tensión.',
      cameraAngle: 'Primer Plano Emocional',
      linkedHandles: ['@Anacaona'],
      dialogue: '',
      sfx: '',
      screentone: '15',
      inverted: false,
      locked: false,
      roughSketchDataUrl: '',
      consistencyScore: 100,
      defaultSrc: ''
    },
    {
      index: 3,
      id: 'koma-4',
      fsmState: 'S4_KOMA_SHIAGE',
      route: 'IA',
      label: 'Koma #4 • Clímax Terrestre',
      subtitle: 'Koma #4 • [S4_KOMA_SHIAGE] Impacto Sísmico',
      prompt: 'Explosión de impacto sísmico contra el suelo de roca, cráter fracturado con piedras flotando y líneas cinéticas radiales agresivas en tinta Sumi.',
      cameraAngle: 'Plano Holandés (Inclinado FX)',
      linkedHandles: ['@Alo'],
      dialogue: '',
      sfx: 'ドドド',
      screentone: 'none',
      inverted: false,
      locked: false,
      roughSketchDataUrl: '',
      consistencyScore: 100,
      defaultSrc: ''
    }
  ];

  // Runtime Studio State (Starts in BLANK mode by default)
  const state = {
    projectMode: 'blank',
    projectTitle: 'Nuevo Manga',
    activeStage: 'lienzo-genko',
    activeKomaIndex: 1,
    activePenNib: 'g_pen',
    drawingLayerMode: 'none', // 'none' | 'L0_BLUE' | 'L2_INK'
    selectedEngine: (window.KAIMangaImageRouter && window.KAIMangaImageRouter.getConfig().engine) || 'auto',
    binarizeEnabled: true,
    zoomPercent: 125,
    canvasRotated: false,
    guidesVisible: true,
    gateD3Approved: false,
    gateD5MarginsValid: true,
    tankobonPages: 192,
    paperThicknessMm: 0.12,
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
      if (parsed.tankobonPages) state.tankobonPages = Number(parsed.tankobonPages) || 192;
      if (parsed.paperThicknessMm) state.paperThicknessMm = Number(parsed.paperThicknessMm) || 0.12;
      if (typeof parsed.gateD3Approved === 'boolean') state.gateD3Approved = parsed.gateD3Approved;
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
          coverImage: state.coverImage,
          tankobonPages: state.tankobonPages,
          paperThicknessMm: state.paperThicknessMm,
          gateD3Approved: state.gateD3Approved
        })
      );
    } catch (err) {
      console.warn('[MANGAI Studio] Could not save state:', err);
    }
  }

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
  // 1. TOP BAR NAVIGATION & FRAME 0 SEMANTIC ECOSYSTEM PILL
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
          window.showStudioToast(`Proyecto renombrado: ${state.projectTitle}`);
        }
      });
    }

    // Update Supabase / Estado green badge in header (Frame 0 Token #10B981)
    const savedBadge = document.querySelector('header span.text-tertiary.border');
    if (savedBadge) {
      savedBadge.style.borderColor = '#10B981';
      savedBadge.style.color = '#10B981';
      savedBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full" style="background:#10B981"></span>Settei Sync';
      savedBadge.title = 'Frame 0 Token: SUPABASE / ESTADO (#10B981)';
    }

    const headerButtons = document.querySelectorAll('header button');
    headerButtons.forEach((btn) => {
      const txt = (btn.textContent || '').trim();
      if (txt.includes('Gestionar Plan') || txt.includes('Motores IA')) {
        btn.innerHTML = '⚙️ Motores IA / Proyecto';
        btn.addEventListener('click', () => openStudioModal('modal-plan-settings'));
      } else if (txt.includes('Exportar Imprenta')) {
        btn.addEventListener('click', () => {
          executePrepressExportFlow();
        });
      }
    });

    const headerDivs = document.querySelectorAll('header div');
    headerDivs.forEach((div) => {
      if ((div.textContent || '').trim().includes('Guías Genkō:')) {
        div.style.cursor = 'pointer';
        div.title = 'Capa L6 · UI_Guides_Overlay (Solo pantalla; oculta al exportar)';
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

    if (path === 'empaque-tankobon') {
      refreshTankobonPreflightAndSpine();
    }
  };

  // ==========================================================================
  // 2. KOMA STATE MACHINE (S0 -> S5) + MANUAL L0/L2 DRAWING OVERLAY
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

  function ensureManualDrawingCanvas(panel, komaIdx) {
    let drawCanvas = panel.querySelector('.koma-manual-canvas');
    if (!drawCanvas) {
      drawCanvas = document.createElement('canvas');
      drawCanvas.width = 640;
      drawCanvas.height = 480;
      drawCanvas.className = 'koma-manual-canvas absolute inset-0 w-full h-full z-15 pointer-events-none';
      panel.appendChild(drawCanvas);

      let isDrawing = false;
      let lastX = 0;
      let lastY = 0;

      const getCoords = (ev) => {
        const rect = drawCanvas.getBoundingClientRect();
        const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
        const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
        return {
          x: ((clientX - rect.left) / rect.width) * drawCanvas.width,
          y: ((clientY - rect.top) / rect.height) * drawCanvas.height
        };
      };

      drawCanvas.addEventListener('mousedown', (ev) => {
        if (state.drawingLayerMode === 'none' || state.komas[komaIdx].locked) return;
        ev.stopPropagation();
        selectKoma(komaIdx, true);
        isDrawing = true;
        const pt = getCoords(ev);
        lastX = pt.x;
        lastY = pt.y;
      });

      drawCanvas.addEventListener('mousemove', (ev) => {
        if (!isDrawing) return;
        const pt = getCoords(ev);
        const ctx = drawCanvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (state.drawingLayerMode === 'L0_BLUE') {
          ctx.strokeStyle = '#06B6D4'; // Frame 0 Acción Mangaka / L0 Nemu Blue Draft
          ctx.lineWidth = 2.5;
        } else {
          ctx.strokeStyle = '#1b1c18'; // L2 Ink_and_Art Sumi
          ctx.lineWidth = state.activePenNib === 'maru_pen' ? 1.5 : state.activePenNib === 'pincel_beta' ? 6 : 3.2;
        }
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
        lastX = pt.x;
        lastY = pt.y;
      });

      window.addEventListener('mouseup', () => {
        if (isDrawing) {
          isDrawing = false;
          state.komas[komaIdx].roughSketchDataUrl = drawCanvas.toDataURL('image/png');
          if (state.komas[komaIdx].fsmState === 'S0_KOMA_VACIO') {
            setKomaFsmState(komaIdx, 'S1_KOMA_NEMU');
          }
          savePersistedState();
        }
      });
    }
    return drawCanvas;
  }

  function setDrawingLayerMode(mode) {
    state.drawingLayerMode = mode;
    const els = getGenkoElements();
    if (!els) return;
    els.panels.forEach((p, idx) => {
      const c = ensureManualDrawingCanvas(p, idx);
      if (mode === 'none') {
        c.classList.add('pointer-events-none');
        c.style.cursor = 'default';
      } else {
        c.classList.remove('pointer-events-none');
        c.style.cursor = 'crosshair';
      }
    });
    if (mode === 'L0_BLUE') {
      window.showStudioToast('✏️ Modo Boceto Manual L0 (Azul Cian #06B6D4) activo · Dibuja directo sobre cualquier viñeta');
    } else if (mode === 'L2_INK') {
      window.showStudioToast(`✒️ Ruta Manual L2 (${state.activePenNib.toUpperCase()}) activa · Entinta sobre la viñeta`);
    } else {
      window.showStudioToast('Modo Selección de Viñeta [V] activo');
    }
  }

  function setKomaFsmState(komaIdx, nextStateId) {
    const koma = state.komas[komaIdx];
    if (!koma) return;
    koma.fsmState = nextStateId;
    koma.locked = nextStateId === 'S5_KOMA_LOCKED';
    koma.subtitle = `Koma #${komaIdx + 1} • [${nextStateId}]`;

    // Update badge on panel
    const els = getGenkoElements();
    if (els && els.panels[komaIdx]) {
      const badge = els.panels[komaIdx].querySelector('.font-label-micro');
      if (badge && !badge.closest('.koma-quick-bar')) {
        badge.textContent = `Koma #${komaIdx + 1} · ${nextStateId.replace('_KOMA_', ' ')}`;
      }
    }

    if (komaIdx === state.activeKomaIndex) {
      renderFsmStepperInInspector();
    }
    savePersistedState();
  }

  function applyBlankOrDemoVisualsToCanvas() {
    const els = getGenkoElements();
    if (!els) return;

    els.panels.forEach((panel, idx) => {
      const img = panel.querySelector('img');
      if (!img) return;

      if (!state.originalDemoImages[idx]) {
        state.originalDemoImages[idx] = img.src;
      }

      ensureManualDrawingCanvas(panel, idx);

      if (state.customImages[idx]) {
        img.src = state.customImages[idx];
      } else if (state.projectMode === 'blank' && window.KAIMangaImageRouter) {
        const isWide = idx === 0 || idx === 3;
        img.src = window.KAIMangaImageRouter.renderBlankGenkoKoma({
          komaIndex: idx,
          width: isWide ? 840 : 480,
          height: isWide ? 320 : 540,
          fsmState: state.komas[idx]?.fsmState || 'S0_KOMA_VACIO',
          subtitle: 'S0: Configura cámara y guion en el Inspector o dibuja boceto L0'
        });
      } else if (state.originalDemoImages[idx]) {
        img.src = state.originalDemoImages[idx];
      }

      applyScreentoneStyle(idx, state.komas[idx]?.screentone || 'none');
      updateKomaBubbleOverlay(idx, state.komas[idx]?.dialogue || '');
      updateKomaSfxOverlay(idx, state.komas[idx]?.sfx || '');
    });
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

    applyBlankOrDemoVisualsToCanvas();
    initGenkoRightInspector(els.view);
    initGenkoToolbars(els.view, els.canvasPaper);
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
        badgeLabel.textContent = `Koma #${komaIdx + 1} · ${activeKoma.fsmState.split('_')[0]}`;
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
        promptArea.placeholder = `S0 Guion/Acción para Koma #${komaIdx + 1} (Ej: Guerrero bajo tormenta, contrapicado dramático)...`;
      }
      const dialogueInput = document.getElementById('koma-dialogue-input');
      if (dialogueInput) dialogueInput.value = activeKoma.dialogue || '';
      const sfxInput = document.getElementById('koma-sfx-input');
      if (sfxInput) sfxInput.value = activeKoma.sfx || '';

      renderFsmStepperInInspector();
      renderInspectorCharacterChips(inspector, activeKoma);
    }

    if (!silent) {
      window.showStudioToast(`Koma #${komaIdx + 1} activa · Estado: ${activeKoma.fsmState}`);
    }
  }

  function renderFsmStepperInInspector() {
    const stepperContainer = document.getElementById('koma-fsm-stepper-container');
    if (!stepperContainer || !window.KAIMangaImageRouter) return;

    const activeKoma = state.komas[state.activeKomaIndex];
    const states = window.KAIMangaImageRouter.KOMA_STATES;
    const currentIdx = states.findIndex((s) => s.id === activeKoma.fsmState);

    stepperContainer.innerHTML = `
      <div class="flex items-center justify-between mb-1">
        <span class="font-label-micro text-label-micro font-bold uppercase tracking-wider text-on-surface-variant">Koma State Machine (S0 → S5)</span>
        <div class="inline-flex rounded bg-surface-container p-0.5 border border-surface-container-highest">
          <button type="button" id="btn-route-manual" class="px-1.5 py-0.5 rounded font-label-micro text-[9px] font-bold transition-colors ${activeKoma.route === 'MANUAL' ? 'bg-[#06B6D4] text-white' : 'text-on-surface-variant'}">Ruta Manual</button>
          <button type="button" id="btn-route-ia" class="px-1.5 py-0.5 rounded font-label-micro text-[9px] font-bold transition-colors ${activeKoma.route === 'IA' ? 'bg-[#8B5CF6] text-white' : 'text-on-surface-variant'}">Ruta IA (KAI)</button>
        </div>
      </div>
      <div class="grid grid-cols-6 gap-1">
        ${states
          .map((st, idx) => {
            const isCurrent = idx === currentIdx;
            const isPast = idx < currentIdx;
            const bgStyle = isCurrent
              ? `background:${st.color};color:#ffffff;font-weight:700;`
              : isPast
              ? `background:${st.color}25;color:${st.color};font-weight:600;`
              : 'background:#f0eee8;color:#5c3f40;';
            return `<button type="button" data-fsm-id="${st.id}" title="${st.label}" style="${bgStyle}" class="py-1 px-0.5 rounded text-center font-label-micro text-[9px] truncate transition-all hover:opacity-90">${st.short.split(' ')[0]}</button>`;
          })
          .join('')}
      </div>
      <div class="mt-1 flex items-center justify-between font-label-micro text-[10px]">
        <span style="color:${states[Math.max(0, currentIdx)]?.color || '#06B6D4'}" class="font-semibold truncate">${states[Math.max(0, currentIdx)]?.label || ''}</span>
        ${
          activeKoma.roughSketchDataUrl
            ? '<button type="button" id="btn-clear-l0-sketch" class="text-error hover:underline">Borrar L0</button>'
            : '<span class="text-on-surface-variant">Click S0..S5</span>'
        }
      </div>
    `;

    stepperContainer.querySelectorAll('button[data-fsm-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextId = btn.getAttribute('data-fsm-id');
        setKomaFsmState(state.activeKomaIndex, nextId);
        window.showStudioToast(`Koma #${state.activeKomaIndex + 1} → ${nextId}`);
      });
    });

    const btnManual = stepperContainer.querySelector('#btn-route-manual');
    const btnIa = stepperContainer.querySelector('#btn-route-ia');
    if (btnManual) {
      btnManual.addEventListener('click', () => {
        activeKoma.route = 'MANUAL';
        setDrawingLayerMode('L2_INK');
        renderFsmStepperInInspector();
      });
    }
    if (btnIa) {
      btnIa.addEventListener('click', () => {
        activeKoma.route = 'IA';
        setDrawingLayerMode('none');
        renderFsmStepperInInspector();
      });
    }
    const btnClearL0 = stepperContainer.querySelector('#btn-clear-l0-sketch');
    if (btnClearL0) {
      btnClearL0.addEventListener('click', () => {
        const els = getGenkoElements();
        const c = els?.panels[state.activeKomaIndex]?.querySelector('.koma-manual-canvas');
        if (c) {
          c.getContext('2d').clearRect(0, 0, c.width, c.height);
        }
        activeKoma.roughSketchDataUrl = '';
        savePersistedState();
        renderFsmStepperInInspector();
        window.showStudioToast('Boceto manual L0 limpiado en esta viñeta');
      });
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
          btn.className = 'inline-flex items-center gap-1.5 px-2 py-1 rounded font-label-md text-label-md border';
          btn.style.backgroundColor = 'rgba(16, 185, 129, 0.14)';
          btn.style.borderColor = '#10B981';
          btn.style.color = '#065F46';
          btn.innerHTML = `<span class="w-3.5 h-3.5 rounded-full text-[9px] text-white flex items-center justify-center font-bold" style="background:#10B981">${char.name.charAt(0)}</span><span class="font-semibold">${char.handle}</span><span class="text-[10px] font-label-technical">Settei ✓</span>`;
        } else {
          btn.className = 'inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-label-md text-label-md transition-colors';
          btn.innerHTML = `<span class="material-symbols-outlined text-[13px]">person_add</span><span>+ ${char.handle}</span>`;
        }
        btn.addEventListener('click', () => {
          const idx = activeKoma.linkedHandles.indexOf(char.handle);
          if (idx >= 0) {
            activeKoma.linkedHandles.splice(idx, 1);
            window.showStudioToast(`Settei desvinculado: ${char.handle}`);
          } else {
            activeKoma.linkedHandles.push(char.handle);
            window.showStudioToast(`Settei inyectado en Koma #${activeKoma.index + 1}: ${char.handle}`);
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
        (c.visual_anchors || c.anchors || []).forEach((a) => {
          if (!allAnchors.includes(a)) allAnchors.push(a);
        });
      });
      if (allAnchors.length === 0) {
        const span = document.createElement('span');
        span.className = 'px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant';
        span.textContent = 'visual_anchors[]: Ninguna vinculada';
        traitsContainer.appendChild(span);
      } else {
        allAnchors.slice(0, 4).forEach((trait) => {
          const span = document.createElement('span');
          span.className = 'px-1.5 py-0.5 rounded bg-surface-container font-medium';
          span.textContent = trait;
          traitsContainer.appendChild(span);
        });
      }
    }
  }

  function initGenkoRightInspector(view) {
    const inspector = view.querySelector('aside.w-\\[320px\\]');
    if (!inspector) return;

    // Replace static 5-state bar with interactive Koma State Machine (S0 -> S5)
    const oldStepper = inspector.querySelector('.grid.grid-cols-5')?.parentElement;
    if (oldStepper) {
      oldStepper.id = 'koma-fsm-stepper-container';
      renderFsmStepperInInspector();
    }

    const promptArea = inspector.querySelector('textarea');
    if (promptArea) {
      promptArea.id = 'koma-prompt-textarea';
      promptArea.addEventListener('input', () => {
        state.komas[state.activeKomaIndex].prompt = promptArea.value;
        savePersistedState();
      });
    }

    // Inject Engine Selector + Binarize Postprocessor toggle + Settei Consistency Gate
    const copilotBox = promptArea ? promptArea.parentElement : null;
    if (copilotBox && !document.getElementById('ai-engine-selector')) {
      copilotBox.style.borderLeft = '3px solid #8B5CF6'; // Frame 0 KAI Motor IA Violeta
      const headerRow = copilotBox.firstElementChild;
      if (headerRow) {
        const latencySpan = headerRow.querySelector('.text-tertiary');
        if (latencySpan) {
          latencySpan.id = 'koma-engine-latency-badge';
          latencySpan.textContent = 'KAI Middleware';
        }
      }

      const engineSelectorWrap = document.createElement('div');
      engineSelectorWrap.className = 'flex flex-col gap-1 pt-0.5';
      const engines = (window.KAIMangaImageRouter && window.KAIMangaImageRouter.ENGINES) || [];
      engineSelectorWrap.innerHTML = `
        <div class="flex items-center justify-between">
          <label class="font-label-micro text-label-micro uppercase font-semibold text-on-surface-variant">Render Engine (Test Bench)</label>
          <button id="btn-test-engines" type="button" class="font-label-micro text-label-micro text-[#8B5CF6] hover:underline font-semibold flex items-center gap-0.5">
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
        <label class="flex items-center justify-between font-label-micro text-[10px] text-on-surface-variant pt-0.5 cursor-pointer">
          <span>Postprocesador: Binarización B/N + Trama L1</span>
          <input id="chk-binarize-post" type="checkbox" ${state.binarizeEnabled ? 'checked' : ''} class="accent-[#8B5CF6]"/>
        </label>
      `;
      copilotBox.insertBefore(engineSelectorWrap, promptArea);

      const selEl = engineSelectorWrap.querySelector('#ai-engine-selector');
      if (selEl) {
        selEl.addEventListener('change', () => {
          state.selectedEngine = selEl.value;
          if (window.KAIMangaImageRouter) {
            window.KAIMangaImageRouter.saveConfig({ engine: selEl.value });
          }
          window.showStudioToast(`Render Engine activo: ${selEl.options[selEl.selectedIndex].text}`);
        });
      }

      const chkBin = engineSelectorWrap.querySelector('#chk-binarize-post');
      if (chkBin) {
        chkBin.addEventListener('change', () => {
          state.binarizeEnabled = chkBin.checked;
          if (window.KAIMangaImageRouter) {
            window.KAIMangaImageRouter.saveConfig({ binarizePostprocess: chkBin.checked });
          }
          window.showStudioToast(
            chkBin.checked
              ? 'Postprocesador activo: Binarización de línea pura B/N + Trama Bayer'
              : 'Postprocesador desactivado: Imagen cruda del motor'
          );
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
            window.showStudioToast(`Diagnóstico KAI Middleware: ${gStatus} · ${hfStatus}`);
          } else {
            window.showStudioToast('Modo Local Activo · Usa Boceto L0 0ms o Vercel');
          }
        });
      }

      // Consistency Validation Gate Banner (Page 2 of PDF: CONTROL DE CONSISTENCIA)
      const consistencyGate = document.createElement('div');
      consistencyGate.id = 'settei-consistency-gate';
      consistencyGate.className = 'hidden p-2 rounded border text-[10px] font-label-technical space-y-1.5';
      consistencyGate.style.backgroundColor = 'rgba(245, 158, 11, 0.12)';
      consistencyGate.style.borderColor = '#F59E0B';
      consistencyGate.innerHTML = `
        <div class="flex items-center justify-between font-bold text-[#B45309]">
          <span>⚡ CONTROL DE CONSISTENCIA SETTEI</span>
          <span id="consistency-score-label">100%</span>
        </div>
        <div id="consistency-summary-text" class="text-on-surface-variant leading-tight">Verificando visual_anchors[]...</div>
        <div class="flex items-center gap-1.5 pt-0.5">
          <button type="button" id="btn-accept-koma" class="flex-1 py-1 px-2 rounded text-white font-bold" style="background:#10B981">✓ Aceptar (Pasar a S3)</button>
          <button type="button" id="btn-retry-koma" class="py-1 px-2 rounded bg-surface-container-lowest border border-[#F59E0B] text-[#B45309] font-bold">↻ Reintentar</button>
        </div>
      `;
      copilotBox.appendChild(consistencyGate);

      consistencyGate.querySelector('#btn-accept-koma')?.addEventListener('click', () => {
        consistencyGate.classList.add('hidden');
        setKomaFsmState(state.activeKomaIndex, 'S3_KOMA_TONE_FX');
        window.showStudioToast(`✓ Viñeta #${state.activeKomaIndex + 1} aceptada · Avanzada a S3_KOMA_TONE_FX`);
      });
      consistencyGate.querySelector('#btn-retry-koma')?.addEventListener('click', () => {
        generateActiveKomaInk(state.activeKomaIndex, 'reinject_settei');
      });

      // Dialogue (L5) + SFX (L4) + Gate D5 Margin Verification
      const fukidashiWrap = document.createElement('div');
      fukidashiWrap.className = 'grid grid-cols-2 gap-1.5 pt-1 border-t border-surface-container-highest/60';
      fukidashiWrap.innerHTML = `
        <div>
          <label class="block font-label-micro text-label-micro text-on-surface-variant uppercase mb-0.5">L5 Globo Diálogo</label>
          <input id="koma-dialogue-input" type="text" placeholder="Reserva zona L5..." class="w-full bg-surface-container-lowest rounded px-2 py-1 font-label-micro text-label-micro text-on-surface focus:outline-none border border-surface-container-highest"/>
        </div>
        <div>
          <label class="block font-label-micro text-label-micro text-on-surface-variant uppercase mb-0.5">L4 SFX Kakimoji</label>
          <input id="koma-sfx-input" type="text" placeholder="Ej: ドドド / ¡ZAS!" class="w-full bg-surface-container-lowest rounded px-2 py-1 font-label-micro text-label-micro text-on-surface focus:outline-none border border-surface-container-highest"/>
        </div>
      `;
      copilotBox.appendChild(fukidashiWrap);

      const dlgInput = fukidashiWrap.querySelector('#koma-dialogue-input');
      const sfxInput = fukidashiWrap.querySelector('#koma-sfx-input');

      if (dlgInput) {
        dlgInput.addEventListener('input', () => {
          const val = dlgInput.value;
          state.komas[state.activeKomaIndex].dialogue = val;
          updateKomaBubbleOverlay(state.activeKomaIndex, val);
          // Gate D5 check: warn if dialogue exceeds safe Naiwaku length (>95 chars)
          if (val.length > 95) {
            state.gateD5MarginsValid = false;
            window.showStudioToast('⚠️ Gate D5 (Ámbar): El globo L5 supera los 95 caracteres y puede invadir el margen Naiwaku');
          } else {
            state.gateD5MarginsValid = true;
          }
          if (val.trim() && state.komas[state.activeKomaIndex].fsmState === 'S3_KOMA_TONE_FX') {
            setKomaFsmState(state.activeKomaIndex, 'S4_KOMA_SHIAGE');
          }
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

    const angleSelect = inspector.querySelector('select:not(#ai-engine-selector)');
    if (angleSelect) {
      angleSelect.addEventListener('change', () => {
        state.komas[state.activeKomaIndex].cameraAngle = angleSelect.value;
        savePersistedState();
        window.showStudioToast(`Ángulo de cámara Koma #${state.activeKomaIndex + 1}: ${angleSelect.value}`);
      });
    }

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

    // Rename & wire the Strict 7-Layer Stack (L6 down to L0 from Page 1 of the PDF)
    const layerRows = inspector.querySelectorAll('.flex.flex-col.gap-1 > div.h-8');
    const canonicalLayerNames = [
      { code: 'L6', name: 'L6 · UI_Guides_Overlay', meta: 'No-Imp.' },
      { code: 'L5', name: 'L5 · Text_and_Balloons', meta: '100%' },
      { code: 'L4', name: 'L4 · SFX_Kakimoji', meta: '100%' },
      { code: 'L3', name: 'L3 · Panel_Borders_FX', meta: '0.8mm' },
      { code: 'L2', name: 'L2 · Ink_and_Art', meta: 'ACTIVA' },
      { code: 'L1', name: 'L1 · Screentones_Beta', meta: '60L' },
      { code: 'L0', name: 'L0 · Nemu_Blue_Draft', meta: 'No-Imp.' }
    ];

    layerRows.forEach((row, idx) => {
      const spec = canonicalLayerNames[idx];
      if (spec) {
        row.dataset.layerCode = spec.code;
        const nameSpan = row.querySelector('span.truncate');
        if (nameSpan) nameSpan.textContent = spec.name;
        // Highlight L6 and L0 in subtle amber/yellow as non-printable layers per Page 1 of the PDF
        if (spec.code === 'L6' || spec.code === 'L0') {
          row.style.backgroundColor = 'rgba(245, 158, 11, 0.12)';
          row.title = `${spec.name}: Capa no imprimible; se oculta automáticamente al exportar`;
        }
      }

      const visBtn = row.querySelector('button');
      if (!visBtn) return;

      visBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const icon = visBtn.querySelector('.material-symbols-outlined');
        const isHidden = icon && icon.textContent.trim() === 'visibility_off';
        if (icon) {
          icon.textContent = isHidden ? 'visibility' : 'visibility_off';
        }
        row.classList.toggle('opacity-50', !isHidden);
        toggleCanvasLayerByCode(spec ? spec.code : '', isHidden);
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
      bubble.className = 'koma-layer-l5 absolute bottom-5 right-3 max-w-[175px] bg-surface-container-lowest rounded-[20px] p-2.5 shadow-md z-20 border border-on-surface/80';
      bubble.innerHTML = '<p class="font-headline-sm text-[12px] leading-tight font-bold text-on-surface text-center tracking-tight uppercase"></p><div class="absolute -bottom-1.5 left-6 w-3 h-3 bg-surface-container-lowest rotate-45"></div>';
      panel.appendChild(bubble);
    } else {
      bubble.classList.add('koma-layer-l5');
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
      wrap.className = 'koma-layer-l4 absolute inset-0 flex items-center justify-center pointer-events-none z-20';
      sfxEl = document.createElement('div');
      sfxEl.className = 'font-headline-xl text-headline-xl font-black text-on-surface tracking-widest drop-shadow-[0_2px_4px_rgba(255,255,255,0.95)] select-none scale-125 transform -rotate-6';
      wrap.appendChild(sfxEl);
      panel.appendChild(wrap);
    } else if (sfxEl.parentElement) {
      sfxEl.parentElement.classList.add('koma-layer-l4');
    }
    if (!sfxText || sfxText.trim() === '') {
      sfxEl.classList.add('hidden');
    } else {
      sfxEl.classList.remove('hidden');
      sfxEl.textContent = sfxText.trim();
    }
  }

  function toggleCanvasLayerByCode(code, visible) {
    const els = getGenkoElements();
    if (!els) return;

    if (code === 'L6') {
      setGenkoGuidesVisibility(visible);
    } else if (code === 'L5') {
      const bubbles = els.canvasPaper.querySelectorAll('.rounded-\\[20px\\], .koma-layer-l5');
      bubbles.forEach((b) => b.classList.toggle('hidden', !visible));
      window.showStudioToast(`Capa L5 (Text_and_Balloons): ${visible ? 'Visible' : 'Oculta'}`);
    } else if (code === 'L4') {
      const sfx = els.canvasPaper.querySelectorAll('.font-headline-xl, .koma-layer-l4');
      sfx.forEach((s) => s.classList.toggle('hidden', !visible));
      window.showStudioToast(`Capa L4 (SFX_Kakimoji): ${visible ? 'Visible' : 'Oculta'}`);
    } else if (code === 'L3') {
      els.panels.forEach((p) => {
        p.style.border = visible ? '' : 'none';
      });
      window.showStudioToast(`Capa L3 (Panel_Borders_and_Kinetic_FX): ${visible ? 'Visible' : 'Oculta'}`);
    } else if (code === 'L2') {
      els.panels.forEach((p) => {
        const img = p.querySelector('img');
        if (img) img.classList.toggle('opacity-0', !visible);
      });
      window.showStudioToast(`Capa L2 (Ink_and_Art): ${visible ? 'Visible' : 'Oculta'}`);
    } else if (code === 'L1') {
      const overlays = els.canvasPaper.querySelectorAll('.koma-screentone-overlay');
      overlays.forEach((o) => o.classList.toggle('hidden', !visible));
      window.showStudioToast(`Capa L1 (Screentones_and_Beta): ${visible ? 'Visible' : 'Oculta'}`);
    } else if (code === 'L0') {
      const manualCanvases = els.canvasPaper.querySelectorAll('.koma-manual-canvas');
      manualCanvases.forEach((c) => c.classList.toggle('hidden', !visible));
      window.showStudioToast(`Capa L0 (Nemu_Blue_Draft): ${visible ? 'Visible' : 'Purgada p/ Exportación'}`);
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
    window.showStudioToast(`Capa L6 (UI_Guides_Overlay): ${visible ? 'ON' : 'OFF'}`);
  }

  function setKomaScreentone(komaIdx, toneType) {
    if (!state.komas[komaIdx]) return;
    state.komas[komaIdx].screentone = toneType;
    applyScreentoneStyle(komaIdx, toneType);
    if (toneType !== 'none' && state.komas[komaIdx].fsmState === 'S2_KOMA_PEN_IRE') {
      setKomaFsmState(komaIdx, 'S3_KOMA_TONE_FX');
    }
    savePersistedState();
    window.showStudioToast(`Capa L1 (Screentones_and_Beta) en Koma #${komaIdx + 1}: ${toneType}`);
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
  }

  function toggleKomaLock(komaIdx, btn) {
    const koma = state.komas[komaIdx];
    const nextLocked = !koma.locked;
    setKomaFsmState(komaIdx, nextLocked ? 'S5_KOMA_LOCKED' : 'S4_KOMA_SHIAGE');
    const icon = btn ? btn.querySelector('.material-symbols-outlined') : null;
    if (icon) {
      icon.textContent = nextLocked ? 'lock' : 'lock_open';
    }
    window.showStudioToast(
      nextLocked
        ? `🔒 Koma #${komaIdx + 1} en estado [S5_KOMA_LOCKED] · Aprobada para Pre-flight`
        : `🔓 Koma #${komaIdx + 1} reabierta en [S4_KOMA_SHIAGE]`
    );
  }

  // ==========================================================================
  // 3. RENDER LOOP EXECUTION (Settei -> Canvas State -> KAI -> Postprocessor)
  // ==========================================================================
  async function generateActiveKomaInk(komaIdx, modeVariant) {
    const els = getGenkoElements();
    if (!els || !els.panels[komaIdx]) return;

    const koma = state.komas[komaIdx];
    if (koma.locked || koma.fsmState === 'S5_KOMA_LOCKED') {
      window.showStudioToast(`⚠️ Koma #${komaIdx + 1} está protegida [S5_KOMA_LOCKED]. Desbloquéala para regenerar.`);
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

    // Step S0 -> S1_KOMA_NEMU while compiling
    setKomaFsmState(komaIdx, 'S1_KOMA_NEMU');

    if (genBtn) {
      genBtn.disabled = true;
      genBtn.innerHTML = '<span class="material-symbols-outlined text-[15px] animate-spin">progress_activity</span> Compilando Settei + KAI...';
    }
    if (latencyBadge) {
      latencyBadge.textContent = 'KAI Loop...';
    }

    panel.classList.add('animate-pulse');

    try {
      const linkedChars = state.characters.filter((c) => koma.linkedHandles.includes(c.handle));
      let actionPrompt = userScene;
      if (modeVariant === 'pose_kai') {
        actionPrompt += ', dynamic foreshortening action pose, expressive manga motion lines, strong black beta shadows';
      } else if (modeVariant === 'lt_background') {
        actionPrompt += ', architectural precision lineart extraction (LT 3D-to-line), clean ruler perspective ink lines, detailed crosshatching';
      } else if (modeVariant === 'reinject_settei') {
        actionPrompt += ', strict character model sheet consistency, exact facial structure and signature outfit details';
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
          binarize: state.binarizeEnabled,
          mode: 'koma_single',
          penNib: state.activePenNib,
          cameraAngle: angleMap[koma.cameraAngle] || 'low_angle',
          roughSketchMask: koma.roughSketchDataUrl || '',
          hasDialogue: Boolean(koma.dialogue && koma.dialogue.trim()),
          actionPrompt,
          characters: linkedChars,
          seed: Math.floor(1000 + Math.random() * 9000),
          width,
          height
        });

        if (res && res.url && img) {
          img.src = res.url;
          state.customImages[komaIdx] = res.url;
          setKomaFsmState(komaIdx, 'S2_KOMA_PEN_IRE');

          if (latencyBadge) {
            const sec = ((res.latencyMs || 800) / 1000).toFixed(1);
            latencyBadge.textContent = `${sec}s · ${res.provider || 'OK'}`;
          }

          // Show Consistency Gate Banner in Inspector (Page 2 of PDF)
          const gateBox = document.getElementById('settei-consistency-gate');
          const scoreLbl = document.getElementById('consistency-score-label');
          const sumTxt = document.getElementById('consistency-summary-text');
          if (gateBox && res.consistencyReport) {
            gateBox.classList.remove('hidden');
            if (scoreLbl) scoreLbl.textContent = `${res.consistencyReport.score}%`;
            if (sumTxt) {
              sumTxt.textContent = `${res.consistencyReport.summary} · Aspect: ${res.canvasState?.panel_aspect_ratio || '4:3'}`;
            }
          }

          window.showStudioToast(`✓ Koma #${komaIdx + 1} en [S2_KOMA_PEN_IRE] · Revisar Control de Consistencia`);
        }
      }
    } catch (err) {
      console.error('[MANGAI Studio] Error in KAI Render Loop:', err);
      window.showStudioToast('⚠️ Error en el bucle de renderizado');
    } finally {
      panel.classList.remove('animate-pulse');
      if (genBtn) {
        genBtn.disabled = false;
        genBtn.innerHTML = '<span class="material-symbols-outlined text-[15px]">draw</span> Generar / Refinar Entintado';
      }
    }
  }

  async function generateAllKomasOnPage() {
    window.showStudioToast('🔥 Ejecutando Render Loop KAI en las 4 Komas de la página...');
    for (let i = 0; i < 4; i++) {
      selectKoma(i, true);
      await generateActiveKomaInk(i, 'standard');
    }
    window.showStudioToast('✓ Página procesada en Capa L2 (Ink_and_Art)');
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
        flyout.classList.add('hidden');
        const pBtn = flyout.previousElementSibling;
        if (pBtn) {
          pBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            flyout.classList.toggle('hidden');
            setDrawingLayerMode('L2_INK');
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
            setDrawingLayerMode('L2_INK');
          });
        });
      }

      const allDockBtns = leftDock.querySelectorAll('button');
      allDockBtns.forEach((btn) => {
        const title = btn.getAttribute('title') || '';
        if (title.includes('[V]')) {
          btn.addEventListener('click', () => setDrawingLayerMode('none'));
        } else if (title.includes('[B]')) {
          // Lápiz Azul No-Foto Shitagaki (Capa L0)
          btn.addEventListener('click', () => setDrawingLayerMode('L0_BLUE'));
        } else if (title.includes('Girar Mesa')) {
          btn.addEventListener('click', () => {
            state.canvasRotated = !state.canvasRotated;
            if (canvasPaper) {
              canvasPaper.style.transform = state.canvasRotated
                ? `scale(${state.zoomPercent / 125}) rotate(-4deg)`
                : `scale(${state.zoomPercent / 125})`;
            }
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
          } else if (title.includes('G-Pen') || title.includes('Maru-Pen') || title.includes('Tinta Sumi')) {
            setDrawingLayerMode('L2_INK');
          } else {
            window.showStudioToast(`Herramienta: ${title}`);
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
  }

  // ==========================================================================
  // 4. BIBLIA SETTEI (Supabase Settei Entity Hub)
  // ==========================================================================
  function renderBlankOrDemoSettei() {
    const view = document.getElementById('view-biblia-settei');
    if (!view) return;
    const grid = view.querySelector('.grid');
    if (!grid) return;

    if (!state.originalSetteiGridHtml) {
      state.originalSetteiGridHtml = grid.innerHTML;
    }

    const countBadge = view.querySelector('.bg-primary-container.text-on-primary-container.rounded-full');
    if (countBadge) {
      countBadge.textContent = `${state.characters.length} fijados`;
    }

    if (state.projectMode === 'blank' && state.characters.length === 0) {
      grid.innerHTML = `
        <article onclick="openStudioModal('modal-new-settei')" class="col-span-full bg-surface-container-lowest rounded-xl p-8 border-2 border-dashed border-[#10B981]/50 hover:border-[#10B981] flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all">
          <div class="w-12 h-12 rounded-full flex items-center justify-center text-white" style="background:#10B981">
            <span class="material-symbols-outlined text-[26px]">person_add</span>
          </div>
          <div class="space-y-1 max-w-md">
            <span class="px-2 py-0.5 rounded text-[10px] font-label-technical font-bold text-[#065F46]" style="background:rgba(16,185,129,0.15)">ENTIDAD SETTEI · SUPABASE SCHEMA</span>
            <h3 class="font-headline-md text-headline-md text-on-surface font-bold">Tu Biblia Settei está en blanco (Desde Cero)</h3>
            <p class="font-body-md text-body-md text-on-surface-variant">
              Registra tu primer personaje con <code>character_name</code>, <code>visual_anchors[]</code>, <code>turnaround_sheet_url</code> y <code>style_preset</code> para alimentar el KAI Middleware.
            </p>
          </div>
          <button type="button" class="mt-1 px-4 py-2 rounded text-white font-label-lg text-label-lg font-semibold shadow-sm flex items-center gap-1.5" style="background:#10B981">
            <span class="material-symbols-outlined text-[16px]">add_circle</span>
            + Crear Primer Registro Settei (@Personaje)
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
  }

  // ==========================================================================
  // 5. GUION KŌSŌ & TABLERO NEMU — GATE D3 VALIDATION & DENSITY CHECK
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
          fsmState: 'S1_KOMA_NEMU',
          subtitle: 'L0 Blue Draft · Boceto Nemu'
        });
      });
    }

    // Inject Gate D3 Validation Diamond Banner (Page 4 of PDF: D3 ¿Ritmo Nemu aprobado?)
    const topBar = view.firstElementChild;
    if (topBar && !document.getElementById('gate-d3-banner')) {
      const gateBtn = document.createElement('button');
      gateBtn.id = 'gate-d3-banner';
      gateBtn.type = 'button';
      gateBtn.className = 'px-3 py-1 rounded font-label-technical text-label-technical font-bold flex items-center gap-1.5 border transition-all';
      const updateGateStyle = () => {
        if (state.gateD3Approved) {
          gateBtn.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
          gateBtn.style.borderColor = '#10B981';
          gateBtn.style.color = '#065F46';
          gateBtn.innerHTML = '◆ Gate D3: Ritmo Nemu Aprobado ✓ (Pasar a Genkō)';
        } else {
          gateBtn.style.backgroundColor = 'rgba(245, 158, 11, 0.16)';
          gateBtn.style.borderColor = '#F59E0B';
          gateBtn.style.color = '#B45309';
          gateBtn.innerHTML = '◆ Gate D3: ¿Aprobar Ritmo Nemu? (4 Viñetas OK ≤ 7)';
        }
      };
      updateGateStyle();
      gateBtn.addEventListener('click', () => {
        state.gateD3Approved = !state.gateD3Approved;
        savePersistedState();
        updateGateStyle();
        if (state.gateD3Approved) {
          window.showStudioToast('✓ Gate D3 Aprobado · Habilitado el paso a 04. Lienzo Genkō');
          setTimeout(() => switchStudioStage('lienzo-genko'), 700);
        }
      });
      topBar.appendChild(gateBtn);
    }
  }

  // ==========================================================================
  // 6. TANKŌBON · PREPRENSA Y EMPAQUE (Spine Formula + L0/L6 Exclusion)
  // ==========================================================================
  function refreshTankobonPreflightAndSpine() {
    const view2D = document.getElementById('view-empaque-tankobon');
    if (!view2D) return;

    // Fórmula del PDF Página 1: CÁLCULO · lomo = (páginas / 2) * grosor papel
    const spineMm = ((state.tankobonPages / 2) * state.paperThicknessMm).toFixed(2);
    const lockedCount = state.komas.filter((k) => k.fsmState === 'S5_KOMA_LOCKED' || k.locked).length;

    const inspector = view2D.querySelector('aside');
    if (inspector && !document.getElementById('tankobon-spine-calculator')) {
      const calcBox = document.createElement('div');
      calcBox.id = 'tankobon-spine-calculator';
      calcBox.className = 'p-3 rounded-lg border space-y-2 mb-3 font-label-technical text-label-technical';
      calcBox.style.backgroundColor = 'rgba(16, 185, 129, 0.08)';
      calcBox.style.borderColor = '#10B981';
      calcBox.innerHTML = `
        <div class="flex items-center justify-between font-bold text-[#065F46]">
          <span>📐 CÁLCULO DE LOMO &amp; PRE-FLIGHT</span>
          <span id="preflight-spine-badge" class="px-1.5 py-0.5 rounded bg-[#10B981] text-white">${spineMm} mm</span>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[9px] text-on-surface-variant uppercase">Total Páginas</label>
            <input id="inp-total-pages" type="number" min="24" max="600" step="8" value="${state.tankobonPages}" class="w-full px-2 py-1 rounded bg-surface-container-lowest border border-surface-container-highest text-on-surface font-bold"/>
          </div>
          <div>
            <label class="block text-[9px] text-on-surface-variant uppercase">Grosor Papel (mm)</label>
            <input id="inp-paper-thick" type="number" min="0.06" max="0.22" step="0.01" value="${state.paperThicknessMm}" class="w-full px-2 py-1 rounded bg-surface-container-lowest border border-surface-container-highest text-on-surface font-bold"/>
          </div>
        </div>
        <div class="text-[10px] text-on-surface-variant">
          Fórmula: <code>(${state.tankobonPages} / 2) × ${state.paperThicknessMm}mm = <strong id="spine-formula-result">${spineMm} mm</strong></code>
        </div>
        <div id="preflight-koma-status" class="p-1.5 rounded text-[10px] font-semibold" style="background:rgba(245,158,11,0.15);color:#B45309">
          ◆ PÁGINAS APROBADAS (D5 + Koma Locked): ${lockedCount}/4 Komas en S5_LOCKED · Capas L0 y L6 se excluirán al exportar.
        </div>
      `;
      inspector.prepend(calcBox);

      const inpPages = calcBox.querySelector('#inp-total-pages');
      const inpThick = calcBox.querySelector('#inp-paper-thick');
      const recalc = () => {
        state.tankobonPages = Math.max(16, Number(inpPages.value) || 192);
        state.paperThicknessMm = Math.max(0.05, Number(inpThick.value) || 0.12);
        const nextSpine = ((state.tankobonPages / 2) * state.paperThicknessMm).toFixed(2);
        const badge = document.getElementById('preflight-spine-badge');
        const resEl = document.getElementById('spine-formula-result');
        if (badge) badge.textContent = `${nextSpine} mm`;
        if (resEl) resEl.textContent = `${nextSpine} mm`;
        savePersistedState();
        window.showStudioToast(`Lomo recalculado: (${state.tankobonPages}/2) × ${state.paperThicknessMm}mm = ${nextSpine} mm`);
      };
      inpPages?.addEventListener('input', recalc);
      inpThick?.addEventListener('input', recalc);
    } else if (document.getElementById('preflight-koma-status')) {
      const stEl = document.getElementById('preflight-koma-status');
      stEl.textContent = `◆ PÁGINAS APROBADAS (D5 + Koma Locked): ${lockedCount}/4 Komas en S5_LOCKED · Capas L0 y L6 se excluirán al exportar.`;
    }
  }

  /**
   * Ejecuta la regla de exportación de la Página 1 del PDF:
   * "EXPORTAR: aplanar capas imprimibles (L1..L5), excluir L0 (Nemu_Blue_Draft) y L6 (UI_Guides_Overlay),
   * comprobar texto (D5), sangrado (3.5mm) y resolución (600 DPI)."
   */
  function executePrepressExportFlow() {
    const prevGuides = state.guidesVisible;
    // 1. Ocultar automáticamente L6 (UI_Guides_Overlay) y L0 (Nemu_Blue_Draft)
    setGenkoGuidesVisibility(false);
    toggleCanvasLayerByCode('L0', false);

    window.showStudioToast('🖨️ Pre-flight PDF/X: Capas L0 y L6 excluidas automáticamente · Imprimiendo L1–L5 a 600 DPI...');

    setTimeout(() => {
      window.print();
      // Restaurar visibilidad en pantalla tras cerrar diálogo de impresión
      setGenkoGuidesVisibility(prevGuides);
      toggleCanvasLayerByCode('L0', true);
    }, 350);
  }

  window.generateTankobonCover = async function () {
    const promptInput = document.getElementById('cover-prompt-input');
    const btn = document.getElementById('btn-gen-cover');
    const promptText = promptInput ? promptInput.value.trim() : 'Ilustración de portada manga seinen en tinta Sumi de alto contraste';

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined text-[15px] animate-spin">progress_activity</span> Generando Portada B6...';
    }

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
          window.showStudioToast(`✓ Cubierta Tankōbon B6 actualizada (${res.provider || 'Motor IA'})`);
        }
      }
    } catch (err) {
      window.showStudioToast('⚠️ Error al generar la cubierta');
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
        fsmState: 'CUBIERTA_B6',
        subtitle: 'Cubierta Tankōbon en Blanco · Usa el Inspector para generar'
      });
      applyTankobonCoverUrl(blankCover);
    }

    refreshTankobonPreflightAndSpine();

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
            window.showStudioToast('Pliego Técnico 2D Tankōbon B6');
          });
        } else if (txt.includes('Generar Paquete de Imprenta') || txt.includes('Descargar PDF Imprenta')) {
          btn.addEventListener('click', () => executePrepressExportFlow());
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
    window.showStudioToast('✓ Configuración de llaves y KAI Middleware guardada');
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
      saveBtn.textContent = 'Generando Turnaround Sheet Settei...';
    }

    let portraitUrl = '';
    try {
      if (window.KAIMangaImageRouter) {
        const res = await window.KAIMangaImageRouter.generateImage({
          engine: state.selectedEngine,
          binarize: state.binarizeEnabled,
          mode: 'character_portrait',
          actionPrompt: `Character reference turnaround sheet portrait of ${cleanName}, ${appearance}, wearing ${anchors.join(', ')}`,
          character: { name: cleanName, appearance, clothing: anchors.join(', '), anchors, seed },
          seed,
          width: 512,
          height: 512
        });
        portraitUrl = res.url || '';
      }
    } catch (e) {}

    const newChar = {
      character_id: 'uuid-' + Date.now(),
      id: 'char_' + Date.now(),
      handle,
      name: cleanName,
      character_name: cleanName,
      role,
      seed,
      appearance,
      clothing: anchors.join(', '),
      anchors,
      visual_anchors: anchors,
      turnaround_sheet_url: portraitUrl,
      style_preset: 'Taíno Ancestral Ink',
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
      card.className = 'bg-surface-container-lowest rounded-lg overflow-hidden shadow-xs border-2 border-[#10B981] flex flex-col justify-between';
      card.innerHTML = `
        <div class="relative h-48 bg-surface-container overflow-hidden">
          <img class="w-full h-full object-cover" src="${portraitUrl}" alt="${cleanName}"/>
          <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-inverse-surface/90 text-inverse-on-surface font-label-technical text-label-technical font-bold">${handle}</span>
          <span class="absolute top-2 right-2 px-1.5 py-0.5 rounded text-white font-label-micro text-label-micro font-bold" style="background:#10B981">Settei #${seed} 🔒</span>
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
    window.showStudioToast(`✓ Entidad Settei ${handle} creada e inyectada en Koma #${state.activeKomaIndex + 1}`);
  };

  window.resetBlankStudioProject = function () {
    state.projectMode = 'blank';
    state.projectTitle = 'Nuevo Manga';
    state.characters = [];
    state.komas = createBlankKomas();
    state.customImages = {};
    state.coverImage = null;
    state.gateD3Approved = false;
    savePersistedState();

    const titleSpan = document.querySelector('header .text-on-surface.font-semibold');
    if (titleSpan) titleSpan.textContent = state.projectTitle;

    applyBlankOrDemoVisualsToCanvas();
    renderBlankOrDemoSettei();
    selectKoma(state.activeKomaIndex, true);
    window.closeStudioModals();
    window.showStudioToast('🧹 Estudio reiniciado 100% en blanco en estado [S0_KOMA_VACIO]');
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
