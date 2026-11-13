/**
 * ============================================================================
 * MANGAI STUDIO — STITCH SPA INTERACTIVE CONTROLLER (v5.0 Genkō Edition)
 * ============================================================================
 * Connects the 5 Google Stitch screens into a live, interactive Manga Studio:
 *   1. Biblia Settei (Hub de Personajes y Lore)
 *   2. Guion Kōsō (Editor de Guion Técnico con Chips @Personaje)
 *   3. Tablero Nemu (Spread Doble Página RTL Lectura Oriental)
 *   4. Lienzo Genkō (Cabina Principal B6 600 DPI + Koma Inspector + 7 Capas)
 *   5. Empaque Tankōbon y Pre-Imprenta (Pliego B6 + Simulador 3D + Semáforo)
 * ============================================================================
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'mangai_stitch_studio_state_v5';

  // Default Settei Character Roster (AnaCaona Universe)
  const DEFAULT_CHARACTERS = [
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
    },
    {
      id: 'char_guabancex',
      handle: '@Guabancex',
      name: 'Guabancex',
      role: 'Espíritu de la Tormenta · Señora de Juracán',
      seed: 4412,
      appearance: 'Entidad mítica envuelta en espirales de viento y relámpagos negros, ojos brillantes blancos, brazos tatuados con petroglifos de huracán.',
      clothing: 'Manto de nubes tormentosas con achurado denso Sumi y máscara ritual de piedra.',
      anchors: ['Espirales Juracán', 'Ojos Relámpago', 'Tinta Beta Negra']
    },
    {
      id: 'char_caonabo',
      handle: '@Caonabo',
      name: 'Caonabo',
      role: 'Cacique de Maguana · Señor de la Casa de Oro',
      seed: 7310,
      appearance: 'Guerrero colosal de complexión musculosa, expresión feroz, pintura de guerra negra jagua en rostro y hombros.',
      clothing: 'Pectoral pesado de oro macizo, macana de combate de madera negra.',
      anchors: ['Pectoral Maguana', 'Macana Real', 'Pintura Jagua']
    }
  ];

  // Default 4 Komas state for Page 04 (Lienzo Genkō)
  const DEFAULT_KOMAS = [
    {
      index: 0,
      id: 'koma-1',
      label: 'Koma #1 • Gran Plano General',
      subtitle: 'Koma #1 • Ruinas del Batey (Tormenta)',
      prompt: 'Templo ceremonial taíno antiguo azotado por una tormenta eléctrica tropical, pilares monolíticos de piedra tallada con petroglifos, cielo dramático con tramas y rayos en blanco puro, entintado manga seinen.',
      cameraAngle: 'Gran Plano General (Establishing)',
      linkedHandles: ['@Guabancex'],
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
      linkedHandles: ['@Alo', '@Caonabo'],
      dialogue: '',
      sfx: 'ドドド',
      screentone: 'none',
      inverted: false,
      locked: false,
      defaultSrc: ''
    }
  ];

  // Runtime Studio State
  const state = {
    activeStage: 'lienzo-genko',
    activeKomaIndex: 1, // Koma #2 selected by default as in Stitch design
    activePenNib: 'g_pen',
    zoomPercent: 125,
    canvasRotated: false,
    guidesVisible: true,
    gridVisible: true,
    characters: JSON.parse(JSON.stringify(DEFAULT_CHARACTERS)),
    komas: JSON.parse(JSON.stringify(DEFAULT_KOMAS)),
    customImages: {}, // komaIndex -> dataUrl
    coverImage: null
  };

  // Load saved state if present
  function loadPersistedState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.characters) && parsed.characters.length) {
        state.characters = parsed.characters;
      }
      if (Array.isArray(parsed.komas) && parsed.komas.length === 4) {
        state.komas = parsed.komas;
      }
      if (parsed.customImages && typeof parsed.customImages === 'object') {
        state.customImages = parsed.customImages;
      }
      if (parsed.coverImage) {
        state.coverImage = parsed.coverImage;
      }
    } catch (err) {
      console.warn('[MANGAI Studio] Could not load persisted state:', err);
    }
  }

  function savePersistedState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          characters: state.characters,
          komas: state.komas,
          customImages: state.customImages,
          coverImage: state.coverImage
        })
      );
    } catch (err) {
      console.warn('[MANGAI Studio] Could not save state (quota):', err);
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
    }, 3000);
  };

  // ==========================================================================
  // 1. TOP BAR NAVIGATION (5 STAGES)
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

    // Header buttons: Gestionar Plan, Guías Genkō: ON, Exportar Imprenta
    const headerButtons = document.querySelectorAll('header button');
    headerButtons.forEach((btn) => {
      const txt = (btn.textContent || '').trim();
      if (txt.includes('Gestionar Plan')) {
        btn.addEventListener('click', () => openStudioModal('modal-plan-settings'));
      } else if (txt.includes('Exportar Imprenta')) {
        btn.addEventListener('click', () => {
          switchStudioStage('empaque-tankobon');
          window.showStudioToast('Modo Pre-Imprenta Tankōbon B6 activado · Listo para exportar PDF CMYK');
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
      'tablero-nemu': document.getElementById('view-guion-koso'), // Shared Kōsō + Nemu dual view
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

    // Update top nav active classes
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

    // If switching between 2. Guion Kōsō and 3. Tablero Nemu inside the combined view, highlight the relevant pane
    if (path === 'guion-koso' || path === 'tablero-nemu') {
      const viewKoso = document.getElementById('view-guion-koso');
      if (viewKoso) {
        const panes = viewKoso.querySelectorAll('aside, section');
        if (path === 'guion-koso' && panes[0]) {
          panes[0].classList.add('ring-2', 'ring-secondary');
          setTimeout(() => panes[0].classList.remove('ring-2', 'ring-secondary'), 1200);
          window.showStudioToast('2. Guion Kōsō · Editor de bloques narrativos y chips @Personaje');
        } else if (path === 'tablero-nemu' && panes[1]) {
          panes[1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          window.showStudioToast('3. Tablero Nemu · Spread Doble Página B6 (Lectura Oriental RTL ←)');
        }
      }
    } else {
      const stageNames = {
        'biblia-settei': '1. Biblia Settei · Hub de Personajes, Seeds y Lore',
        'lienzo-genko': '4. Lienzo Genkō · Cabina Principal de Entintado B6 (600 DPI)',
        'empaque-tankobon': '5. Empaque Tankōbon · Pliego Completo y Semáforo Pre-Imprenta'
      };
      if (stageNames[path]) {
        window.showStudioToast(stageNames[path]);
      }
    }
  };

  // ==========================================================================
  // 2. LIENZO GENKŌ — KOMA SELECTION, AI INKING, SCREENTONES & LAYER STACK
  // ==========================================================================
  function getGenkoElements() {
    const view = document.getElementById('view-lienzo-genko');
    if (!view) return null;

    // Locate the B6 paper canvas
    const canvasPaper = view.querySelector('.bg-\\[\\#FAF8F5\\]');
    if (!canvasPaper) return null;

    // Locate the 4 Koma containers inside KOMA-WARI
    const komaWari = canvasPaper.querySelector('.flex.flex-col.gap-2.z-0');
    if (!komaWari) return null;

    const topPanel = komaWari.children[0]; // Koma #1
    const middleRow = komaWari.children[1];
    const midLeftPanel = middleRow ? middleRow.children[0] : null; // Koma #2
    const midRightPanel = middleRow ? middleRow.children[1] : null; // Koma #3
    const bottomPanel = komaWari.children[2]; // Koma #4

    const panels = [topPanel, midLeftPanel, midRightPanel, bottomPanel].filter(Boolean);
    return {
      view,
      canvasPaper,
      komaWari,
      panels
    };
  }

  function initGenkoCanvas() {
    const els = getGenkoElements();
    if (!els) return;

    // Save default image URLs and attach click listeners to all 4 Komas
    els.panels.forEach((panel, idx) => {
      panel.dataset.komaIndex = String(idx);
      panel.style.cursor = 'pointer';
      const img = panel.querySelector('img');
      if (img && !state.komas[idx].defaultSrc) {
        state.komas[idx].defaultSrc = img.src;
      }
      // Restore custom image if persisted
      if (img && state.customImages[idx]) {
        img.src = state.customImages[idx];
      }

      // Create a dedicated screentone overlay div inside each panel
      let toneOverlay = panel.querySelector('.koma-screentone-overlay');
      if (!toneOverlay) {
        toneOverlay = document.createElement('div');
        toneOverlay.className = 'koma-screentone-overlay absolute inset-0 pointer-events-none z-10 transition-opacity duration-200';
        panel.appendChild(toneOverlay);
      }
      applyScreentoneStyle(idx, state.komas[idx].screentone);

      panel.addEventListener('click', (e) => {
        // Ignore clicks on quick-action buttons inside the floating bar
        if (e.target.closest('.koma-quick-bar button')) return;
        selectKoma(idx);
      });
    });

    // Tag the floating mini quick-action bar in Koma #2 so we can move it to whichever Koma is selected
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

    // Make speech bubbles & SFX editable on double click
    const speechBubbleText = els.canvasPaper.querySelector('.rounded-\\[20px\\] p');
    if (speechBubbleText) {
      speechBubbleText.parentElement.title = 'Doble clic para editar el diálogo del globo (Fukidashi)';
      speechBubbleText.parentElement.style.cursor = 'text';
      speechBubbleText.parentElement.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const nextText = prompt('Editar diálogo del globo (Fukidashi):', speechBubbleText.textContent.trim());
        if (nextText !== null && nextText.trim() !== '') {
          speechBubbleText.textContent = nextText.trim();
          state.komas[1].dialogue = nextText.trim();
          savePersistedState();
          window.showStudioToast('Diálogo Fukidashi actualizado');
        }
      });
    }

    const sfxEl = els.canvasPaper.querySelector('.font-headline-xl');
    if (sfxEl) {
      sfxEl.parentElement.classList.remove('pointer-events-none');
      sfxEl.style.cursor = 'pointer';
      sfxEl.title = 'Doble clic para cambiar la Onomatopeya (Kakimoji SFX)';
      sfxEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const nextSfx = prompt('Editar Onomatopeya Kakimoji (Ej: ドドド, ゴゴゴ, ザッ, ¡BOOM!):', sfxEl.textContent.trim());
        if (nextSfx !== null && nextSfx.trim() !== '') {
          sfxEl.textContent = nextSfx.trim();
          state.komas[3].sfx = nextSfx.trim();
          savePersistedState();
          window.showStudioToast('Onomatopeya Kakimoji actualizada: ' + nextSfx.trim());
        }
      });
    }

    // Wire Right Inspector controls in #view-lienzo-genko
    initGenkoRightInspector(els.view);

    // Wire Top HUD bar & Left Tool Dock in #view-lienzo-genko
    initGenkoToolbars(els.view, els.canvasPaper);
  }

  function selectKoma(komaIdx) {
    const els = getGenkoElements();
    if (!els || !els.panels[komaIdx]) return;

    state.activeKomaIndex = komaIdx;
    const activeKoma = state.komas[komaIdx];

    // Update ring highlight on panels
    els.panels.forEach((panel, i) => {
      if (i === komaIdx) {
        panel.classList.add('ring-2', 'ring-secondary', 'ring-offset-2', 'ring-offset-background', 'shadow-lg');
      } else {
        panel.classList.remove('ring-2', 'ring-secondary', 'ring-offset-2', 'ring-offset-background', 'shadow-lg');
      }
    });

    // Move floating quick-action bar to the active Koma
    const quickBar = els.view.querySelector('.koma-quick-bar');
    if (quickBar && els.panels[komaIdx]) {
      els.panels[komaIdx].appendChild(quickBar);
      const badgeLabel = quickBar.querySelector('.text-secondary-fixed');
      if (badgeLabel) {
        badgeLabel.textContent = `Koma #${komaIdx + 1} Activa`;
      }
    }

    // Sync Right Inspector header, prompt, camera angle, and linked character chips
    const inspector = els.view.querySelector('aside.w-\\[320px\\]');
    if (inspector) {
      const subtitleEl = inspector.querySelector('.text-secondary.font-semibold');
      if (subtitleEl) {
        subtitleEl.textContent = activeKoma.subtitle;
      }
      const promptArea = inspector.querySelector('textarea');
      if (promptArea) {
        promptArea.value = activeKoma.prompt;
      }
      const angleSelect = inspector.querySelector('select');
      if (angleSelect) {
        Array.from(angleSelect.options).forEach((opt) => {
          if (opt.textContent.trim() === activeKoma.cameraAngle) {
            angleSelect.value = opt.value;
          }
        });
      }
      renderInspectorCharacterChips(inspector, activeKoma);
    }

    window.showStudioToast(`Seleccionada Koma #${komaIdx + 1} · ${activeKoma.subtitle}`);
  }

  function renderInspectorCharacterChips(inspector, activeKoma) {
    const chipContainer = inspector.querySelector('.flex.flex-wrap.gap-1\\.5');
    const traitsContainer = chipContainer ? chipContainer.nextElementSibling : null;
    if (!chipContainer) return;

    chipContainer.innerHTML = '';
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
          window.showStudioToast(`Ancla Settei vinculada a Koma #${activeKoma.index + 1}: ${char.handle} (Seed #${char.seed})`);
        }
        savePersistedState();
        renderInspectorCharacterChips(inspector, activeKoma);
      });
      chipContainer.appendChild(btn);
    });

    // Update locked traits badges below chips
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
        allAnchors.push('Sin Anclas Personaje (Fondo Libre)');
      }
      allAnchors.slice(0, 4).forEach((trait) => {
        const span = document.createElement('span');
        span.className = 'px-1.5 py-0.5 rounded bg-surface-container';
        span.textContent = trait;
        traitsContainer.appendChild(span);
      });
    }
  }

  function initGenkoRightInspector(view) {
    const inspector = view.querySelector('aside.w-\\[320px\\]');
    if (!inspector) return;

    // Prompt textarea live update
    const promptArea = inspector.querySelector('textarea');
    if (promptArea) {
      promptArea.addEventListener('input', () => {
        state.komas[state.activeKomaIndex].prompt = promptArea.value;
        savePersistedState();
      });
    }

    // Camera angle selector
    const angleSelect = inspector.querySelector('select');
    if (angleSelect) {
      angleSelect.addEventListener('change', () => {
        state.komas[state.activeKomaIndex].cameraAngle = angleSelect.value;
        savePersistedState();
        window.showStudioToast(`Ángulo de cámara Koma #${state.activeKomaIndex + 1}: ${angleSelect.value}`);
      });
    }

    // AI Co-pilot buttons ("Generar / Refinar Entintado" & "Convertir Fondo 3D a Línea (LT)")
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

    // 7-Layer visibility toggles ("Capas Genkō")
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

    // Render initial linked character chips for Koma #2
    renderInspectorCharacterChips(inspector, state.komas[state.activeKomaIndex]);
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
    // Update top header indicator
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
    window.showStudioToast(`Koma #${komaIdx + 1}: Efecto Flash / Inversión Negativa ${state.komas[komaIdx].inverted ? 'ACTIVO' : 'DESACTIVADO'}`);
  }

  function toggleKomaLock(komaIdx, btn) {
    state.komas[komaIdx].locked = !state.komas[komaIdx].locked;
    const icon = btn ? btn.querySelector('.material-symbols-outlined') : null;
    if (icon) {
      icon.textContent = state.komas[komaIdx].locked ? 'lock' : 'lock_open';
    }
    window.showStudioToast(`Koma #${komaIdx + 1}: ${state.komas[komaIdx].locked ? 'Bloqueada contra edición accidental' : 'Desbloqueada'}`);
  }

  // ==========================================================================
  // 3. AI GENERATION ENGINE CONNECTION (/api/generate via KAIMangaImageRouter)
  // ==========================================================================
  async function generateActiveKomaInk(komaIdx, modeVariant) {
    const els = getGenkoElements();
    if (!els || !els.panels[komaIdx]) return;

    const koma = state.komas[komaIdx];
    if (koma.locked) {
      window.showStudioToast(`⚠️ Koma #${komaIdx + 1} está bloqueada. Desbloquéala primero.`);
      return;
    }

    const panel = els.panels[komaIdx];
    const img = panel.querySelector('img');
    const genBtn = document.getElementById('btn-generate-active-koma');

    if (genBtn) {
      genBtn.disabled = true;
      genBtn.innerHTML = '<span class="material-symbols-outlined text-[15px] animate-spin">progress_activity</span> Entintando con KAI Sensei...';
    }

    panel.classList.add('animate-pulse');
    window.showStudioToast(`Entintando Koma #${komaIdx + 1} con Nano Banana 2 HD (${state.activePenNib.toUpperCase()})...`);

    try {
      const linkedChars = state.characters.filter((c) => koma.linkedHandles.includes(c.handle));
      let actionPrompt = koma.prompt;
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
      const width = isWidePanel ? 960 : 640;
      const height = isWidePanel ? 420 : 768;

      if (window.KAIMangaImageRouter) {
        const res = await window.KAIMangaImageRouter.generateImage({
          mode: 'koma_single',
          artStyle: 'taino_ancestral',
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
          savePersistedState();
          window.showStudioToast(`✓ Koma #${komaIdx + 1} entintada (${res.provider || 'KAI Engine'})`);
        }
      }
    } catch (err) {
      console.error('[MANGAI Studio] Error generating Koma ink:', err);
      window.showStudioToast('⚠️ Error al conectar con el motor de entintado');
    } finally {
      panel.classList.remove('animate-pulse');
      if (genBtn) {
        genBtn.disabled = false;
        genBtn.innerHTML = '<span class="material-symbols-outlined text-[15px]">draw</span> Generar / Refinar Entintado';
      }
    }
  }

  async function generateAllKomasOnPage() {
    window.showStudioToast('🔥 Entintando las 4 viñetas de la Página 04 en secuencia...');
    for (let i = 0; i < 4; i++) {
      selectKoma(i);
      await generateActiveKomaInk(i, 'standard');
    }
    window.showStudioToast('✓ Página 04 (4/4 Komas) entintada en calidad B6 600 DPI');
  }

  function initGenkoToolbars(view, canvasPaper) {
    // Top sub-bar buttons: Individual, Doble Pliego, Zoom Out, Zoom In, Entintar Todo (KAI)
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

    // Left Tool Dock (68px) + Plumillas Flyout
    const leftDock = view.querySelector('aside.w-\\[68px\\]');
    if (leftDock) {
      const flyout = leftDock.querySelector('.w-44');
      if (flyout) {
        // Hide flyout after initial view or toggle when clicking [P]
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
            window.showStudioToast(`Plumilla activa: ${nb.textContent.trim().replace(/\s+/g, ' ')}`);
          });
        });
      }

      // Close flyout when clicking canvas
      if (canvasPaper && flyout) {
        canvasPaper.addEventListener('click', () => {
          flyout.classList.add('hidden');
        });
      }

      // Rotate table & Undo/Redo buttons
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
            window.showStudioToast(state.canvasRotated ? 'Mesa de dibujo inclinada (-4° ergonómico)' : 'Mesa de dibujo centrada (0°)');
          });
        } else if (title.startsWith('[')) {
          btn.addEventListener('click', () => {
            if (!title.includes('[P]')) {
              window.showStudioToast(`Herramienta activa: ${title}`);
            }
          });
        }
      });
    }

    // Bottom floating pill toolbar ("Reglas: 1mm", "Retícula Koma: ON", "Ajustar al Centro")
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

    // Far-left global quick tool rail
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
  // 4. BIBLIA SETTEI — CHARACTER CARDS, SEARCH, & + NUEVO PERSONAJE MODAL
  // ==========================================================================
  function initBibliaSettei() {
    const view = document.getElementById('view-biblia-settei');
    if (!view) return;

    // "+ Nuevo Personaje" button
    const btns = view.querySelectorAll('button');
    btns.forEach((btn) => {
      const txt = (btn.textContent || '').trim();
      if (txt.includes('Nuevo Personaje')) {
        btn.addEventListener('click', () => openStudioModal('modal-new-settei'));
      } else if (txt.includes('Vincular a Koma') || txt.includes('Enviar a Lienzo')) {
        btn.addEventListener('click', () => {
          switchStudioStage('lienzo-genko');
        });
      }
    });

    // Search input filtering Settei cards
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

    // Clicking any Settei card highlights it and syncs the Settei Right Inspector
    if (grid) {
      Array.from(grid.children).forEach((card) => {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
          Array.from(grid.children).forEach((c) => c.classList.remove('ring-2', 'ring-secondary'));
          card.classList.add('ring-2', 'ring-secondary');
          const titleEl = card.querySelector('h3, .font-headline-sm, .font-bold');
          const charName = titleEl ? titleEl.textContent.trim() : 'Ficha Settei';
          window.showStudioToast(`Ficha Settei activa: ${charName}`);
        });
      });
    }
  }

  // ==========================================================================
  // 5. GUION KŌSŌ & TABLERO NEMU — SCRIPT TO GENKŌ SYNC
  // ==========================================================================
  function initGuionKosoAndNemu() {
    const view = document.getElementById('view-guion-koso');
    if (!view) return;

    const btns = view.querySelectorAll('button');
    btns.forEach((btn) => {
      const txt = (btn.textContent || '').trim();
      if (txt.includes('Auto-Dividir Koma') || txt.includes('Generar Nemu')) {
        btn.addEventListener('click', () => {
          window.showStudioToast('✨ KAI Sensei: Koma-wari (4 viñetas RTL) sincronizado con el Tablero Nemu');
        });
      } else if (txt.includes('Lienzo Genkō') || txt.includes('Pasar a Entintado')) {
        btn.addEventListener('click', () => {
          switchStudioStage('lienzo-genko');
        });
      }
    });
  }

  // ==========================================================================
  // 6. EMPAQUE TANKŌBON — 3D BOOK ROTATION, OBI STRIP & AI COVER GENERATOR
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
    const view = document.getElementById('view-empaque-tankobon');
    if (!view) return;

    const promptText = promptInput ? promptInput.value.trim() : 'Heroína taína Anacaona empuñando el medallón de Guanín dorado';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined text-[15px] animate-spin">progress_activity</span> Generando Portada B6...';
    }
    window.showStudioToast('Generando ilustración de portada Tankōbon B6 con IA...');

    try {
      if (window.KAIMangaImageRouter) {
        const res = await window.KAIMangaImageRouter.generateImage({
          mode: 'cover',
          artStyle: 'taino_ancestral',
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
          window.showStudioToast('✓ Portada Tankōbon B6 y Maqueta 3D actualizadas');
        }
      }
    } catch (err) {
      console.error('[MANGAI Studio] Cover generation error:', err);
      window.showStudioToast('⚠️ Error al regenerar la portada');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined text-[15px]">brush</span> Regenerar Portada con IA';
      }
    }
  };

  function applyTankobonCoverUrl(url) {
    const view = document.getElementById('view-empaque-tankobon');
    if (!view || !url) return;
    const imgs = view.querySelectorAll('img');
    imgs.forEach((img) => {
      img.src = url;
    });
  }

  function initEmpaqueTankobon() {
    const view2D = document.getElementById('view-empaque-tankobon');
    const view3D = document.getElementById('view-empaque-3d');

    if (state.coverImage) {
      applyTankobonCoverUrl(state.coverImage);
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
        geminiApiKey: gInput ? gInput.value.trim() : '',
        hfToken: hfInput ? hfInput.value.trim() : ''
      });
    }
    window.closeStudioModals();
    window.showStudioToast('✓ Configuración de llaves y motor IA guardada');
  };

  window.createNewSetteiCharacter = async function () {
    const nameInput = document.getElementById('new-char-name');
    const roleInput = document.getElementById('new-char-role');
    const appInput = document.getElementById('new-char-appearance');
    const anchorsInput = document.getElementById('new-char-anchors');
    const saveBtn = document.getElementById('btn-save-new-char');

    const rawName = (nameInput?.value || '').trim() || 'Guarionex';
    const cleanName = rawName.replace(/^@/, '');
    const handle = '@' + cleanName;
    const role = (roleInput?.value || '').trim() || 'Guerrero Cacicazgo · Settei';
    const appearance = (appInput?.value || '').trim() || 'Personaje manga seinen de rasgos taínos marcados, alto contraste en tinta Sumi.';
    const anchors = (anchorsInput?.value || 'Amuleto Cemí, Tinta G-Pen')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const seed = Math.floor(1000 + Math.random() * 9000);

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Generando Hoja Settei...';
    }

    let portraitUrl = '';
    try {
      if (window.KAIMangaImageRouter) {
        const res = await window.KAIMangaImageRouter.generateImage({
          mode: 'character_portrait',
          artStyle: 'taino_ancestral',
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
      anchors
    };
    state.characters.push(newChar);
    savePersistedState();

    // Append visual card to Biblia Settei grid
    const viewSettei = document.getElementById('view-biblia-settei');
    const grid = viewSettei ? viewSettei.querySelector('.grid') : null;
    if (grid) {
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

    // Refresh inspector chips in Lienzo Genkō
    const genkoView = document.getElementById('view-lienzo-genko');
    const inspector = genkoView ? genkoView.querySelector('aside.w-\\[320px\\]') : null;
    if (inspector) {
      renderInspectorCharacterChips(inspector, state.komas[state.activeKomaIndex]);
    }

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">auto_awesome</span> Generar &amp; Fijar Seed Settei';
    }
    window.closeStudioModals();
    window.showStudioToast(`✓ Personaje ${handle} (Seed #${seed}) añadido a la Biblia Settei`);
  };

  window.resetBlankStudioProject = function () {
    state.komas.forEach((k, idx) => {
      k.prompt = '';
      k.dialogue = '';
      k.sfx = '';
      k.screentone = 'none';
      k.linkedHandles = [];
      applyScreentoneStyle(idx, 'none');
    });
    state.customImages = {};
    localStorage.removeItem(STORAGE_KEY);

    const els = getGenkoElements();
    if (els) {
      els.panels.forEach((panel, idx) => {
        const img = panel.querySelector('img');
        if (img && window.KAIMangaImageRouter) {
          img.src = window.KAIMangaImageRouter.renderOfflineDraftCanvas({
            mode: 'koma_single',
            penNib: state.activePenNib,
            actionPrompt: `Lienzo Koma #${idx + 1} en blanco · Escribe tu instrucción en el Inspector y pulsa Generar`,
            characters: [],
            seed: 100 + idx,
            width: 640,
            height: 480
          });
        }
      });
      const bubbleP = els.canvasPaper.querySelector('.rounded-\\[20px\\] p');
      if (bubbleP) bubbleP.textContent = '...';
      const sfxEl = els.canvasPaper.querySelector('.font-headline-xl');
      if (sfxEl) sfxEl.textContent = '';
    }

    selectKoma(state.activeKomaIndex);
    window.closeStudioModals();
    window.showStudioToast('🧹 Proyecto en blanco listo para tu propio manga');
  };

  window.restoreDemoProject = function () {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  // ==========================================================================
  // INITIALIZE ON DOM READY
  // ==========================================================================
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
