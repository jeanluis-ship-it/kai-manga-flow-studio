-- ============================================================================
-- MANGAI / KAI STUDIO — SUPABASE POSTGRESQL SCHEMA (Miro Architecture v6.0)
-- ============================================================================
-- Entidades:
--   1. settei_characters (Identidad visual, visual_anchors[], turnaround_sheet_url, style_preset)
--   2. manga_projects (Dimensiones Tankōbon B6/A5, dirección RTL/LTR, cuotas de plan)
--   3. manga_pages (script_pages[], ritmo Nemu D3, validación Naiwaku D5, pila L0..L6)
--   4. koma_states (Máquina de estados S0..S5, canvas_state, ruta manual/IA, consistencia)
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Proyectos Editoriales
create table if not exists public.manga_projects (
  project_id uuid primary key default gen_random_uuid(),
  title text not null default 'Nuevo Manga',
  format_spec text not null default 'Tankobon_B6_128x182mm',
  reading_direction text not null default 'RTL' check (reading_direction in ('RTL', 'LTR', 'VERTICAL_SCROLL')),
  plan_tier text not null default 'PRO' check (plan_tier in ('TRIAL', 'STARTER', 'PRO', 'MASTER')),
  total_pages integer not null default 192,
  paper_thickness_mm numeric(5,3) not null default 0.120,
  spine_width_mm numeric(6,2) generated always as ((total_pages / 2.0) * paper_thickness_mm) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Entidad Settei (3.1 Modelo de Datos de Identidad Visual)
create table if not exists public.settei_characters (
  character_id uuid primary key default gen_random_uuid(),
  project_id uuid references public.manga_projects(project_id) on delete cascade,
  character_name text not null,
  handle text not null,
  visual_anchors text[] not null default '{}',
  turnaround_sheet_url text not null default '',
  style_preset text not null default 'Classic Shonen',
  seed_lock integer not null default 1001,
  appearance_prompt text not null default '',
  created_at timestamptz not null default now()
);

-- 3. Páginas y Validaciones de Gate (D3 Nemu & D5 Márgenes Naiwaku)
create table if not exists public.manga_pages (
  page_id uuid primary key default gen_random_uuid(),
  project_id uuid references public.manga_projects(project_id) on delete cascade,
  page_number integer not null default 1,
  koma_count integer not null default 4,
  density_warning boolean generated always as (koma_count > 7) stored,
  gate_d3_nemu_approved boolean not null default false,
  gate_d5_margins_valid boolean not null default true,
  dpi_resolution integer not null default 600 check (dpi_resolution in (300, 600)),
  bleed_mm numeric(4,2) not null default 3.50,
  created_at timestamptz not null default now()
);

-- 4. Máquina de Estados de Viñeta (Koma State Machine S0 -> S5)
create table if not exists public.koma_states (
  koma_id uuid primary key default gen_random_uuid(),
  page_id uuid references public.manga_pages(page_id) on delete cascade,
  koma_index integer not null,
  fsm_state text not null default 'S0_KOMA_VACIO' check (
    fsm_state in (
      'S0_KOMA_VACIO',
      'S1_KOMA_NEMU',
      'S2_KOMA_PEN_IRE',
      'S3_KOMA_TONE_FX',
      'S4_KOMA_SHIAGE',
      'S5_KOMA_LOCKED'
    )
  ),
  production_route text not null default 'IA' check (production_route in ('MANUAL', 'IA')),
  panel_aspect_ratio text not null default '4:3',
  camera_angle text not null default 'low_angle',
  rough_sketch_mask text default '',
  bubble_reserved_zone text not null default 'top_right_25pct',
  compiled_kai_prompt text default '',
  ink_layer_l2_url text default '',
  screentone_layer_l1 text default 'none',
  dialogue_layer_l5 text default '',
  sfx_layer_l4 text default '',
  consistency_score numeric(4,2) default 1.00,
  is_locked boolean not null default false,
  updated_at timestamptz not null default now()
);
