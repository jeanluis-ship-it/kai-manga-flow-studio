-- ============================================================================
-- MANGAI / KAI STUDIO — Esquema de Base de Datos en Supabase (PostgreSQL)
-- Basado en ARCHITECTURE.md (Settei, Koma State Machine, Tankōbon Preprensa)
-- ============================================================================

-- Habilitar extensión para generación de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. ENUMS (Estados estrictos y niveles de plan)
-- ----------------------------------------------------------------------------

-- Niveles de suscripción para el Render Engine (Trial/Starter vs Pro/Master)
DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM ('trial', 'starter', 'pro', 'master');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Etapas del Service Blueprint (01 a 06)
DO $$ BEGIN
  CREATE TYPE workflow_stage AS ENUM (
    '01_config_settei',
    '02_koso_guion',
    '03_nemu_ritmo',
    '04_shitagaki_pen_ire',
    '05_beta_tone_shiage',
    '06_tankobon_print'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Estados de la Koma State Machine
DO $$ BEGIN
  CREATE TYPE koma_state AS ENUM (
    'VACIO',      -- Marco y plano definidos
    'NEMU',       -- Blue Draft + globo fantasma
    'PEN_IRE',    -- Tinta B/N + clipping mask
    'TONE_FX',    -- Tramas + FX cinéticos
    'SHIAGE',     -- Diálogo y SFX definitivos
    'LOCKED'      -- Edición protegida para preprensa
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ruta de producción elegida por viñeta
DO $$ BEGIN
  CREATE TYPE production_route AS ENUM ('manual', 'ia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 2. TABLA: PROFILES (Cuotas y planes de usuario)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  tier subscription_tier NOT NULL DEFAULT 'trial',
  render_credits INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger automático para crear el perfil con 50 créditos al registrarse en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, tier, render_credits)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Mangaka'),
    'trial',
    50
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. TABLA: PROJECTS (Tankōbon / Obra Editorial)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  synopsis TEXT,
  reading_direction TEXT NOT NULL DEFAULT 'rtl' CHECK (reading_direction IN ('rtl', 'ltr')),
  current_stage workflow_stage NOT NULL DEFAULT '01_config_settei',

  -- Parámetros de Tankōbon y Preprensa
  paper_thickness_mm NUMERIC(4,3) NOT NULL DEFAULT 0.120,
  bleed_mm NUMERIC(3,1) NOT NULL DEFAULT 3.5, -- Sangrado estándar 3.5mm
  target_dpi INTEGER NOT NULL DEFAULT 600 CHECK (target_dpi IN (300, 600)), -- 300/600 dpi
  isbn TEXT,
  cover_data JSONB DEFAULT '{}'::jsonb, -- Portada, lomo y contraportada

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. TABLA: SETTEI_BIBLES (Identidad visual y consistencia)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settei_bibles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  character_name TEXT NOT NULL, -- Nombre y tag @Personaje
  entity_type TEXT NOT NULL DEFAULT 'character' CHECK (entity_type IN ('character', 'prop', 'environment')), -- Fichas de personajes, props, escenarios
  visual_anchors TEXT NOT NULL, -- Rasgos fijos para KAI Middleware
  turnaround_sheet_url TEXT, -- Hoja de referencia de vistas
  style_preset JSONB DEFAULT '{}'::jsonb, -- Configuración de trazo y tramas
  base_prompt_token TEXT, -- Extractor de identidad / prompt base
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. TABLA: PAGES (Páginas y control de densidad)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  is_double_spread BOOLEAN NOT NULL DEFAULT FALSE, -- Soporte doble página
  script_data JSONB DEFAULT '{}'::jsonb, -- Estructura N1 + N2 del guion
  preflight_status JSONB DEFAULT '{"valid": false, "warnings": []}'::jsonb, -- Alertas de densidad (4-7 viñetas) y márgenes
  is_approved BOOLEAN NOT NULL DEFAULT FALSE, -- Todas las viñetas en KOMA LOCKED
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, page_number)
);

-- ----------------------------------------------------------------------------
-- 6. TABLA: KOMAS (Viñetas, Máquina de Estados y Pila de 7 Capas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.komas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  panel_index INTEGER NOT NULL, -- Orden de lectura en la página

  -- Estado y Ruta
  state koma_state NOT NULL DEFAULT 'VACIO',
  route production_route, -- 'manual' (G-Pen/Maru-Pen) o 'ia' (@Personaje + KAI)

  -- Geometría y Canvas State para KAI Middleware
  geometry JSONB NOT NULL DEFAULT '{"x":0,"y":0,"w":520,"h":180,"aspect_ratio":"4:3"}'::jsonb, -- Coordenadas del polígono/marco, aspect_ratio
  camera_angle TEXT, -- Plano/ángulo de cámara
  action_prompt TEXT, -- Acción específica del guion

  -- Pila de 7 Capas (L0 a L6)
  layers JSONB NOT NULL DEFAULT '{
    "L0_nemu_draft": null,
    "L1_screentones_beta": null,
    "L2_ink_art": null,
    "L3_panel_borders_fx": null,
    "L4_sfx_kakimoji": [],
    "L5_text_balloons": [],
    "L6_ui_guides": {}
  }'::jsonb,

  -- Control de Consistencia IA
  referenced_settei_ids UUID[] DEFAULT '{}',
  consistency_score NUMERIC(4,2),
  last_compiled_prompt TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(page_id, panel_index)
);

-- ----------------------------------------------------------------------------
-- 7. FUNCIÓN DE CÁLCULO DE LOMO (Tankōbon Preprensa)
-- Fórmula: (páginas / 2) * grosor del papel
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_spine_width(p_project_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_page_count INTEGER;
  v_thickness NUMERIC;
BEGIN
  SELECT COUNT(*) INTO v_page_count FROM public.pages WHERE project_id = p_project_id;
  SELECT paper_thickness_mm INTO v_thickness FROM public.projects WHERE id = p_project_id;

  -- Si aún hay pocas páginas creadas en borrador, usa el mínimo editorial o el conteo real
  RETURN ROUND((GREATEST(v_page_count, 1) / 2.0) * COALESCE(v_thickness, 0.120), 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- ----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) - Seguridad por usuario
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settei_bibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.komas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
CREATE POLICY "Users manage own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users manage own projects" ON public.projects;
CREATE POLICY "Users manage own projects" ON public.projects
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage project settei" ON public.settei_bibles;
CREATE POLICY "Users manage project settei" ON public.settei_bibles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = settei_bibles.project_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users manage project pages" ON public.pages;
CREATE POLICY "Users manage project pages" ON public.pages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.projects WHERE id = pages.project_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users manage page komas" ON public.komas;
CREATE POLICY "Users manage page komas" ON public.komas
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pages p
      JOIN public.projects pr ON pr.id = p.project_id
      WHERE p.id = komas.page_id AND pr.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 9. TRIGGERS (Actualización automática de timestamps)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_modtime ON public.profiles;
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_projects_modtime ON public.projects;
CREATE TRIGGER update_projects_modtime BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_settei_modtime ON public.settei_bibles;
CREATE TRIGGER update_settei_modtime BEFORE UPDATE ON public.settei_bibles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_pages_modtime ON public.pages;
CREATE TRIGGER update_pages_modtime BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

DROP TRIGGER IF EXISTS update_komas_modtime ON public.komas;
CREATE TRIGGER update_komas_modtime BEFORE UPDATE ON public.komas FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
