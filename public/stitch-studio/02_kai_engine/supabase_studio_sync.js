/**
 * ============================================================================
 * MANGAI / KAI STUDIO — SUPABASE ORM & SYNC ENGINE (v6.1 SQL Schema Adapter)
 * ============================================================================
 * Conecta el estado en vivo del Estudio con el esquema exacto de PostgreSQL:
 *   - ENUM subscription_tier: 'trial' | 'starter' | 'pro' | 'master'
 *   - ENUM workflow_stage: '01_config_settei' .. '06_tankobon_print'
 *   - ENUM koma_state: 'VACIO' | 'NEMU' | 'PEN_IRE' | 'TONE_FX' | 'SHIAGE' | 'LOCKED'
 *   - ENUM production_route: 'manual' | 'ia'
 *   - TABLAS: public.profiles, public.projects, public.settei_bibles,
 *             public.pages, public.komas (con JSONB layers L0..L6)
 * ============================================================================
 */

window.KAISupabaseSync = {
  STAGE_MAP: {
    'biblia-settei': '01_config_settei',
    'guion-koso': '02_koso_guion',
    'tablero-nemu': '03_nemu_ritmo',
    'lienzo-genko': '04_shitagaki_pen_ire',
    'empaque-tankobon': '06_tankobon_print',
    'empaque-3d': '06_tankobon_print'
  },

  FSM_TO_ENUM: {
    S0_KOMA_VACIO: 'VACIO',
    S1_KOMA_NEMU: 'NEMU',
    S2_KOMA_PEN_IRE: 'PEN_IRE',
    S3_KOMA_TONE_FX: 'TONE_FX',
    S4_KOMA_SHIAGE: 'SHIAGE',
    S5_KOMA_LOCKED: 'LOCKED',
    VACIO: 'VACIO',
    NEMU: 'NEMU',
    PEN_IRE: 'PEN_IRE',
    TONE_FX: 'TONE_FX',
    SHIAGE: 'SHIAGE',
    LOCKED: 'LOCKED'
  },

  uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  /**
   * Construye el payload relacional exacto para las 5 tablas de Supabase
   * (profiles, projects, settei_bibles, pages, komas)
   */
  buildRelationalPayload(studioState) {
    const userId = localStorage.getItem('kai_sb_user_id') || '00000000-0000-4000-8000-000000000001';
    const projectId = localStorage.getItem('kai_sb_project_id') || this.uuidv4();
    const pageId = localStorage.getItem('kai_sb_page_id') || this.uuidv4();
    localStorage.setItem('kai_sb_project_id', projectId);
    localStorage.setItem('kai_sb_page_id', pageId);

    // 1. public.profiles
    const profileRow = {
      id: userId,
      display_name: 'Mangaka Studio',
      tier: 'pro',
      render_credits: 50
    };

    // 2. public.projects
    const spineMm = Number(((studioState.tankobonPages / 2) * studioState.paperThicknessMm).toFixed(2));
    const projectRow = {
      id: projectId,
      user_id: userId,
      title: studioState.projectTitle || 'Nuevo Manga',
      synopsis: 'Obra creada en MANGAI / KAI Studio',
      reading_direction: 'rtl',
      current_stage: this.STAGE_MAP[studioState.activeStage] || '04_shitagaki_pen_ire',
      paper_thickness_mm: Number(studioState.paperThicknessMm) || 0.12,
      bleed_mm: 3.5,
      target_dpi: 600,
      isbn: '978-4-08-882001-9',
      cover_data: {
        front_cover_url: studioState.coverImage || null,
        spine_width_mm: spineMm,
        planned_pages: studioState.tankobonPages || 192
      }
    };

    // 3. public.settei_bibles
    const setteiRows = (studioState.characters || []).map((c) => {
      const anchorsStr = Array.isArray(c.visual_anchors)
        ? c.visual_anchors.join(', ')
        : Array.isArray(c.anchors)
        ? c.anchors.join(', ')
        : String(c.visual_anchors || '');
      return {
        id: c.supabase_uuid || this.uuidv4(),
        project_id: projectId,
        character_name: c.handle || '@' + (c.character_name || c.name || 'Personaje'),
        entity_type: c.entity_type || 'character',
        visual_anchors: anchorsStr,
        turnaround_sheet_url: c.turnaround_sheet_url || c.portraitUrl || null,
        style_preset: {
          preset_name: c.style_preset || 'Taíno Ancestral Ink',
          seed_lock: Number(c.seed) || 1001,
          pen_nib: studioState.activePenNib || 'g_pen'
        },
        base_prompt_token: `${c.name || 'Personaje'} (${c.appearance || ''}, ${anchorsStr})`
      };
    });

    // 4. public.pages
    const allLocked = (studioState.komas || []).every(
      (k) => this.FSM_TO_ENUM[k.fsmState] === 'LOCKED' || Boolean(k.locked)
    );
    const warnings = [];
    if ((studioState.komas || []).length > 7) {
      warnings.push('Exceso de densidad: >7 viñetas en la página');
    }
    if (!studioState.gateD5MarginsValid) {
      warnings.push('Gate D5: Texto en globo L5 cercano al margen Naiwaku');
    }

    const pageRow = {
      id: pageId,
      project_id: projectId,
      page_number: 4,
      is_double_spread: false,
      script_data: {
        N1_chapter: 'Cap. 01',
        N2_page: 'Pág. 04',
        gate_d3_approved: Boolean(studioState.gateD3Approved)
      },
      preflight_status: {
        valid: warnings.length === 0,
        warnings
      },
      is_approved: allLocked
    };

    // 5. public.komas (con la Pila de 7 Capas L0..L6 exacta del SQL)
    const defaultGeometries = [
      { x: 0, y: 0, w: 520, h: 140, aspect_ratio: '16:5' },
      { x: 0, y: 148, w: 382, h: 330, aspect_ratio: '3:4' },
      { x: 390, y: 148, w: 130, h: 330, aspect_ratio: '2:5' },
      { x: 0, y: 486, w: 520, h: 250, aspect_ratio: '16:7' }
    ];

    const komaRows = (studioState.komas || []).map((k, idx) => {
      const stateEnum = k.locked ? 'LOCKED' : this.FSM_TO_ENUM[k.fsmState] || 'VACIO';
      const routeEnum = (k.route || 'ia').toLowerCase() === 'manual' ? 'manual' : 'ia';
      return {
        id: k.supabase_uuid || this.uuidv4(),
        page_id: pageId,
        panel_index: idx + 1,
        state: stateEnum,
        route: routeEnum,
        geometry: defaultGeometries[idx] || defaultGeometries[0],
        camera_angle: k.cameraAngle || 'low_angle',
        action_prompt: k.prompt || '',
        layers: {
          L0_nemu_draft: k.roughSketchDataUrl ? 'base64_sketch_mask_present' : null,
          L1_screentones_beta: k.screentone && k.screentone !== 'none' ? `${k.screentone}_60L` : null,
          L2_ink_art: studioState.customImages?.[idx] ? 'rendered_ink_layer_present' : null,
          L3_panel_borders_fx: { border_mm: 0.8, inverted_fx: Boolean(k.inverted) },
          L4_sfx_kakimoji: k.sfx ? [{ text: k.sfx, style: 'headline-xl-sumi' }] : [],
          L5_text_balloons: k.dialogue
            ? [{ text: k.dialogue, zone: 'top_right_reserved', within_naiwaku: studioState.gateD5MarginsValid }]
            : [],
          L6_ui_guides: { visible_on_screen: Boolean(studioState.guidesVisible), exclude_on_export: true }
        },
        referenced_settei_ids: [],
        consistency_score: Number(k.consistencyScore) || 100.0,
        last_compiled_prompt: k.prompt || ''
      };
    });

    return {
      profile: profileRow,
      project: projectRow,
      settei_bibles: setteiRows,
      page: pageRow,
      komas: komaRows
    };
  },

  /**
   * Sincroniza en vivo con Supabase vía REST API si el usuario configuró SUPABASE_URL y SUPABASE_ANON_KEY,
   * o descarga el archivo JSONB/SQL listo para importar.
   */
  async syncOrExportProject(studioState) {
    const payload = this.buildRelationalPayload(studioState);
    const sbUrl = (localStorage.getItem('kai_supabase_url') || '').trim().replace(/\/$/, '');
    const sbKey = (localStorage.getItem('kai_supabase_anon_key') || '').trim();

    if (sbUrl && sbKey) {
      try {
        const headers = {
          apikey: sbKey,
          Authorization: `Bearer ${sbKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal'
        };

        await fetch(`${sbUrl}/rest/v1/projects`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload.project)
        });

        if (payload.settei_bibles.length > 0) {
          await fetch(`${sbUrl}/rest/v1/settei_bibles`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload.settei_bibles)
          });
        }

        await fetch(`${sbUrl}/rest/v1/pages`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload.page)
        });

        await fetch(`${sbUrl}/rest/v1/komas`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload.komas)
        });

        return {
          ok: true,
          mode: 'cloud_supabase',
          message: `☁️ Sincronizado en Supabase (${payload.komas.length} Komas, ${payload.settei_bibles.length} Settei)`
        };
      } catch (err) {
        console.warn('[KAISupabaseSync] Cloud sync fallback to JSON export:', err);
      }
    }

    // Exportar instantáneamente el paquete relacional JSONB compatible con las tablas de Supabase
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `supabase_snapshot_${(studioState.projectTitle || 'manga').toLowerCase().replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    return {
      ok: true,
      mode: 'jsonb_snapshot',
      message: '📦 Snapshot relacional Supabase (projects, settei_bibles, pages, komas L0–L6) exportado'
    };
  }
};
