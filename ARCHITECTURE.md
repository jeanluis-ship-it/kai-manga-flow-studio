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
2. **Aislamiento de Carga (`GeneratingState`):** Se reemplazó el booleano global `isGenerating` por un mapa granular (`cover`, `bundle`, `pages: Record<string, boolean>`, `characters: Record<string, boolean>`) con helpers `setTaskLoading`, `setPageLoading` y `setCharacterLoading`.
3. **Deep-Linking (`/studio?tab=`):** Soporta `?tab=project`, `?tab=characters`, `?tab=cover` y `?tab=pages` (más alias `lore`, `panels`, `print`) desde la sección `04 / 05` de la landing.
