# MANGAI Studio — Arquitectura Técnica

> Referencia sincronizada con [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

## Estructura Principal

- **`/` (`public/landing/`):** Landing editorial estática servida mediante rewrite `beforeFiles` en `next.config.ts`. Incluye carrusel 3D, sección KAI (`02 / 05`), vitrina `LA COLECCIÓN` (`03 / 05`) con modal de inspección Tankōbon (`aspect-ratio: 2 / 3`, `object-fit: cover` + fallback), y espacio Z (`04 / 05`) con enlaces profundos hacia `/studio?tab=<slug>`.
- **`/studio` (`app/studio/`):** Aplicación React (Next.js App Router) en español editorial con tema **Genkō Paper & Sumi Ink** por defecto (`#ECEAE4`, `#FFFFFF`, hoja `#FAF8F5` con guías `#00AEEF`) y alternador a **Modo Estudio Oscuro** (`#121316` / `#1A1C20`).
  - `page.tsx`: Orquestador de vistas (`Configuración y Lomo`, `Settei y Personajes`, `Portada Tankōbon`, `Páginas e Interiores`), lectura de `?tab=`, navegación bidireccional hacia `/` y exportación ZIP (`JSZip` en `jszip-lite.ts`).
  - `types.ts`: Contratos `Project`, `Character`, `Page`, `Cover`, `StudioView` y `GeneratingState`.
  - `flow-sdk.ts`: Adaptador cliente hacia `POST /api/images/generate` y descarga de activos.
  - `components/`: `Primitives.tsx`, `ProjectManager.tsx`, `CharacterLibrary.tsx`, `CoverDesigner.tsx`, `PageEditor.tsx`.
- **`/api/images/generate` y `/api/health` (`app/api/`):** Generación server-side (Cloudflare Workers AI, OpenAI, Google Gemini, HuggingFace FLUX.1 Schnell) sin exponer secretos al navegador.

## Decisiones del Sprint 1 (P0)

1. **Iconografía `lucide-react`:** Todas las ligaduras de `Material Symbols Outlined` en `/studio` fueron migradas a componentes SVG de `lucide-react` (`strokeWidth={1.75}`, `gf-icon-shrink`), y los glifos Unicode (`✦`, `✳`, `✕`) de la landing fueron sustituidos por SVGs inline.
2. **Aislamiento de Carga (`GeneratingState`):** Se reemplazó el booleano global `isGenerating` por un mapa granular (`cover`, `bundle`, `pages: Record<string, boolean>`, `komas: Record<string, boolean>`, `characters: Record<string, boolean>`) con helpers `setTaskLoading`, `setPageLoading`, `setKomaLoading` y `setCharacterLoading`.
3. **Deep-Linking (`/studio?tab=`):** Soporta `?tab=project`, `?tab=characters`, `?tab=cover` y `?tab=pages` (más alias `lore`, `panels`, `print`) desde la sección `04 / 05` de la landing.

## Decisiones del Sprint 2 (P1) — Persistencia Supabase, KAI Sensei y Motor Koma-wari

1. **Persistencia Normalizada (`supabase/migrations/001_mangai_studio_schema.sql` + `lib/storage/studioRepository.ts`):**
   - 5 tablas normalizadas con RLS por propietario (`auth.uid()`), índices compuestos y triggers `updated_at`:
     - `profiles` (perfil de mangaka vinculado a `auth.users`)
     - `projects` (metadatos de tomo, dirección `rtl`/`ltr`, papel, lomo KDP y portada)
     - `settei_entities` (Biblia visual con `entity_type`, `tag_handle` único `@Handle`, `visual_anchors`, `seed_locked` y `character_seed`)
     - `pages` (páginas ordenadas por `page_number`, `layout_template` y `chapter_beat`)
     - `komas` (viñetas individuales con máquina de estados `VACIO → NEMU → PEN_IRE → TONE_FX → SHIAGE → LOCKED`, `polygon_coords` JSONB, `camera_angle`, `tagged_handles`, `action_prompt`, `ink_render_url`, `dialogues` y `sfx_items`)
   - `lib/supabase/client.ts` y `lib/storage/studioRepository.ts` sincronizan con Supabase cuando existen `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` y sesión autenticada, y degradan sin fricción a `localStorage` (`Local / Demo`) cuando no están configuradas.
2. **Copiloto KAI Sensei con Salida Dual JSON (`POST /api/kai/script` + `lib/kai/schema.ts` + `app/studio/components/KaiCopilotDrawer.tsx`):**
   - Validación estricta con Zod (`KaiScriptRequestSchema` y `KaiDualOutputSchema`: `reply` + `script_pages[]` con `suggested_layout`, `chapter_beat` y `komas[]`).
   - Invoca LLM server-side (`GEMINI_API_KEY` o `OPENAI_API_KEY`) cuando están disponibles; sin credenciales devuelve una estructura determinista en español con cabecera honesta `X-KAI-Mode: fallback` (mostrada explícitamente en el drawer).
   - El botón **«Aplicar al Manuscrito (Crear Páginas y Viñetas)»** inyecta las páginas y viñetas en estado `NEMU` directamente sobre `Páginas e Interiores`.
3. **Motor Koma-wari y Settei v2 (`app/studio/components/CharacterLibrary.tsx`, `PageEditor.tsx` y `page.tsx`):**
   - **Settei v2:** Pestañas de filtrado (`Todo el Canon`, `Personajes`, `Objetos (Props)`, `Escenarios y Lore`), handles `@Settei` únicos, chips interactivos de **Anclas Visuales** y bloqueo `Seed Bloqueado`.
   - **4 Plantillas Koma-wari:** `3_panel_dramatic`, `4_panel_classic`, `5_panel_action` (corte diagonal central) y `splash_spread`, renderizadas con `clip-path: polygon(...)` y bordes SVG vectoriales (Sumi Ink `#111111` + selección activa Indigo `#4F46E5`).
   - **Inspector Contextual de Viñeta (`Viñeta #N`):** Edita estado (`VACIO`..`LOCKED`), ángulo de cámara, chips `@Settei`, acción, diálogo/SFX y entinta cada viñeta de forma aislada (`generating.komas[komaId]`), avanzando su estado a `PEN_IRE` y exportando también las viñetas entintadas en el paquete ZIP.
