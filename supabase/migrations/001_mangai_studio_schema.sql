-- Extensiones necesarias
create extension if not exists "pgcrypto";

-- Enums del flujo editorial de Manga
do $$ begin
  create type manga_plan_tier as enum ('trial', 'starter', 'pro', 'master');
exception when duplicate_object then null; end $$;

do $$ begin
  create type manga_trim_format as enum ('tankobon_b6', 'kdp_6x9', 'b4_canva_pro', 'webtoon_vertical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type settei_entity_type as enum ('character', 'prop', 'location', 'lore_rule');
exception when duplicate_object then null; end $$;

do $$ begin
  create type koma_state as enum ('VACIO', 'NEMU', 'PEN_IRE', 'TONE_FX', 'SHIAGE', 'LOCKED');
exception when duplicate_object then null; end $$;

-- 1. Perfiles y Cuotas de Plan
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  plan_tier manga_plan_tier not null default 'trial',
  max_projects int not null default 1,
  max_pages int not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Proyectos / Tomos de Manga
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Sin Título',
  synopsis text,
  trim_format manga_trim_format not null default 'tankobon_b6',
  reading_direction text not null default 'rtl' check (reading_direction in ('rtl', 'ltr')),
  target_page_count int not null default 100,
  paper_type text not null default 'white_standard',
  spine_width_in numeric(6,4) not null default 0.2252,
  style_preset text not null default 'taino_ancestral_ink',
  cover_prompt text,
  cover_image_url text,
  isbn text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Biblia del Mundo y Personajes (Settei Hub)
create table if not exists public.settei_entities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  entity_type settei_entity_type not null default 'character',
  tag_handle text not null,              -- ej. "@Alo", "@AnaCaona"
  name text not null,
  role_or_summary text,
  visual_anchors jsonb not null default '[]'::jsonb, -- ej. ["Medallón Guanín", "Capa Oscura"]
  seed_locked boolean not null default false,
  character_seed text,
  turnaround_urls jsonb not null default '{}'::jsonb, -- { front, side, three_quarter, expressions }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, tag_handle)
);

-- 4. Páginas del Manuscrito (Genkō Yōshi)
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  page_number int not null,
  layout_template text not null default '4_panel_classic',
  chapter_beat text,
  layers_visibility jsonb not null default '{"L0_nemu":true,"L1_tones":true,"L2_ink":true,"L3_borders_fx":true,"L4_sfx":true,"L5_balloons":true,"L6_guides":true}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'nemu_ok', 'inked', 'print_ready')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, page_number)
);

-- 5. Viñetas Individuales (Komas + Máquina de Estados)
create table if not exists public.komas (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  panel_index int not null,
  state koma_state not null default 'VACIO',
  polygon_coords jsonb not null,         -- Coordenadas porcentuales SVG [{x,y}, ...]
  camera_angle text default 'plano_medio',
  tagged_handles text[] not null default '{}', -- ["@Alo", "@AnaCaona"]
  action_prompt text,
  nemu_sketch_url text,
  ink_render_url text,
  screentone_preset text,                -- ej. "30_60L", "60_shadow", "gradient_sky"
  dialogues jsonb not null default '[]'::jsonb, -- [{ id, speaker, style, text, x, y }]
  sfx_items jsonb not null default '[]'::jsonb, -- [{ id, text, x, y, rotation }]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, panel_index)
);

-- Índices para consultas rápidas del estudio
create index if not exists idx_projects_user on public.projects(user_id);
create index if not exists idx_settei_project on public.settei_entities(project_id);
create index if not exists idx_pages_project_num on public.pages(project_id, page_number);
create index if not exists idx_komas_page_idx on public.komas(page_id, panel_index);

-- Trigger automático de updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists trg_projects_updated on public.projects;
create trigger trg_projects_updated before update on public.projects for each row execute function public.set_updated_at();

drop trigger if exists trg_settei_updated on public.settei_entities;
create trigger trg_settei_updated before update on public.settei_entities for each row execute function public.set_updated_at();

drop trigger if exists trg_pages_updated on public.pages;
create trigger trg_pages_updated before update on public.pages for each row execute function public.set_updated_at();

drop trigger if exists trg_komas_updated on public.komas;
create trigger trg_komas_updated before update on public.komas for each row execute function public.set_updated_at();

-- Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.settei_entities enable row level security;
alter table public.pages enable row level security;
alter table public.komas enable row level security;

drop policy if exists "profiles_self_access" on public.profiles;
create policy "profiles_self_access" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "projects_owner_access" on public.projects;
create policy "projects_owner_access" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "settei_owner_access" on public.settei_entities;
create policy "settei_owner_access" on public.settei_entities
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

drop policy if exists "pages_owner_access" on public.pages;
create policy "pages_owner_access" on public.pages
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

drop policy if exists "komas_owner_access" on public.komas;
create policy "komas_owner_access" on public.komas
  for all using (
    exists (
      select 1 from public.pages pg
      join public.projects p on p.id = pg.project_id
      where pg.id = page_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.pages pg
      join public.projects p on p.id = pg.project_id
      where pg.id = page_id and p.user_id = auth.uid()
    )
  );
