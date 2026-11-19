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

## Decisiones del Sprint 3 — Globos Fukidashi, Pila Estricta de 7 Capas (`L0–L6`) y Pre-Prensa

1. **Pila Determinista de 7 Capas (`L0` a `L6`) en `app/studio/components/PageEditor.tsx` y `app/studio/types.ts`:**
   - `L6_guides` (`z-index: 70`, **No imprimible**): Guías técnicas `#00AEEF` de sangrado (*Bleed*), corte (*Trim*), área segura (*Naiwaku*) y zona del lomo (*Gutter*) sincronizadas con el formato activo y dirección de lectura.
   - `L5_balloons` (`z-index: 60`, imprimible): `components/studio/FukidashiLayer.tsx` con 6 estilos vectoriales auténticos (`normal`, `shout`, `whisper`, `thought`, `narrator`, `system`), arrastre por puntero (`x`, `y`), manija orientable de cola (`tailX`, `tailY`), edición inline por doble clic y validación automática de *Naiwaku*.
   - `L4_sfx` (`z-index: 50`, imprimible): `components/studio/KakimojiLayer.tsx` con onomatopeyas arrastrables y contorno blanco (`paint-order: stroke`).
   - `L3_borders_fx` (`z-index: 40`, imprimible): Marcos Sumi Ink (`0.8mm`) y overlays cinéticos recortados por polígono (`ryusen` y `shuchusen`).
   - `L2_ink` (`z-index: 30`, imprimible): Arte entintado en blanco y negro (`inkRenderUrl`) recortado dentro del `clip-path` de cada viñeta.
   - `L1_tones` (`z-index: 20`, imprimible): Tramas semitono SVG (`dots_15`, `dots_30`, `dots_60`, `gradient`, `beta_black`) con slider de opacidad individual (default `100%`).
   - `L0_nemu` (`z-index: 10`, **No imprimible**): Boceto guía azul no-foto `#00AEEF` con slider de opacidad individual (default `40%`).
   - Panel `L6 → L0` integrado en la mitad inferior del Inspector Derecho con toggles `Eye`/`EyeOff` sincronizados con `pages.layersVisibility` y marca explícita `"No imprimible"` en `L6` y `L0`.
2. **3 Presets de Formato Editorial (`lib/print/presets.ts` + `ProjectManager.tsx`):**
   - `tankobon_b6` (Default): `128 × 182 mm`, bleed `3.0 mm`, `600 DPI` interiores (`1583 × 2220 px`), `300 DPI` cubierta.
   - `b4_canva_pro` (Canva Bridge B4 Pro): lienzo exacto **`2150 × 3035 px`**, bleed `3.5 mm`, listo para Canva sin reescalado.
   - `kdp_6x9` (Amazon KDP Paperback): `6.0" × 9.0"`, bleed `0.125"` (`1838 × 2775 px`).
3. **ISBN-13 Editable y Código EAN-13 SVG Puro (`lib/print/ean13.ts` + `CoverDesigner.tsx`):**
   - Validación de 13 dígitos y dígito verificador, auto-formateo, interruptor `Incluir caja de código de barras ISBN` (ON/OFF), código EAN-13 SVG en el cuadrante inferior derecho de la contraportada, y campos en vivo de título en lomo, autor y sinopsis.
4. **Motor de Aplanado Pre-Prensa (`L1 → L5`) y Semáforo Pre-Flight (`lib/export/buildPrintBundle.ts` + `PreflightModal.tsx`):**
   - Aplana estrictamente **`L1_tones + L2_ink + L3_borders_fx + L4_sfx + L5_balloons`** a PNG de alta resolución (2150×3035 px en `b4_canva_pro`), garantizando la exclusión total de `L0_nemu` y `L6_guides` tanto en el ZIP como en la impresión directa (`@media print`).
   - Genera `README_IMPRENTA.txt`, `print_manifest.json` y archivo dinámico `${slugify(title)}_${trimFormat}_PRINT_BUNDLE.zip` tras mostrar los 4 checks del Semáforo Pre-Flight.
