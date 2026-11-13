# Kit de Prompts Maestros para Google Stitch (Beta) — Modo Web (`Mangai / KAI Studio`)

En **Google Stitch** (con el selector en **`Web`** y **`Balanced`** o **`High Quality`**, tal como se ve en tu captura), el secreto para obtener pantallas profesionales y exportables a Figma/código es **no pedir 10 pantallas de golpe en un párrafo vago**, sino enviar un **Prompt Fundacional (Pantalla Principal del Estudio + Sistema de Diseño)** y luego encadenar los **Prompts de Vistas Secundarias** dentro de la misma sesión para que Stitch mantenga exactamente los mismos colores, tipografía y barra de navegación.

> **Consejo clave para Stitch:** Aunque tu app sea en español, los modelos internos de layout de Stitch entienden con mayor precisión la jerarquía espacial cuando la estructura técnica está en inglés o bilingüe, indicando explícitamente que los textos visibles de la interfaz (*labels*) estén en español. Por eso te incluyo la **Versión A (Óptima Bilingüe para Stitch: estructura técnica precisa + textos UI en español)** y la **Versión B (100% en Español)**.

---

## PASO 1: El Prompt Fundacional (Copia y pega este primero en la caja de Stitch)

Este primer prompt genera la **Cabina Principal del Mangaka Solitario (Lienzo *Genkō Yōshi* + Barra de Herramientas Tradicionales + Inspector de Viñeta con IA + Pila de 6 Capas)** y fija el sistema de diseño para todo el proyecto.

### Opción A — Prompt Maestro Optimizado para Stitch (Recomendado: Estructura técnica en inglés + Textos de UI en español)

```text
Design a desktop responsive web application UI (1440x900) for "MANGAI / KAI STUDIO", an AI-assisted and traditional Japanese manga creation studio built for solo mangakas.

AESTHETIC & COLOR PALETTE ("Clean Genkō Paper & Sumi Ink"):
- Workspace Desk Background: Warm cutting-mat gray (#ECEAE4)
- Manga Page Canvas: Ivory 135kg manuscript paper (#FAF8F5) with crisp cyan non-photo blue print guides (#00AEEF) for Bleed (3mm), Trim line, and Safe Area (Naiwaku), plus millimeter ruler ticks along the edges
- Panels & Sidebars: Crisp white (#FFFFFF) with subtle 1px borders (#E2E0D8) and deep Sumi ink typography (#111111)
- Accents: Indigo AI accent (#6366F1) for KAI Assistant & "@Personaje" chips, Crimson Hanko seal (#E11D48) for primary actions, and Guanin Gold (#D97706) for Pro badges.
- Typography: Space Grotesk for bold headers, Inter for dense studio controls, JetBrains Mono for DPI/coordinates. All visible UI labels must be in Spanish.

LAYOUT ARCHITECTURE (5-Zone Studio Shell):
1. TOP HEADER BAR (height 52px):
   - Left: Brand logo "MANGAI STUDIO", project breadcrumb "AnaCaona: Vol. I > Cap. 01 > Pág. 04", and green badge "Guardado".
   - Center (Segmented View Switcher Pill with 5 stages): "1. Biblia Settei" | "2. Guion Kōsō" | "3. Tablero Nemu" | "4. Lienzo Genkō" (Active) | "5. Empaque Tankōbon".
   - Right: Page quota badge "14 / 100 págs (Plan Pro)", gold button "Gestionar Plan", cyan toggle switch "Guías Genkō (#00AEEF): ON", and primary crimson button "Exportar Imprenta".

2. LEFT SEMANTIC TOOL DOCK (width 68px, vertical icon toolbar with tooltips):
   - Tool 1: Selector de Viñeta (V)
   - Tool 2: Katana Panel Slicer (diagonal knife icon to split comic panels)
   - Tool 3: Lápiz Azul No-Foto (Shitagaki blue sketch pencil)
   - Tool 4: Plumas de Entintado (Pen-ire active flyout showing 4 traditional nibs: "G-Pen Héroe", "Maru-Pen Detalle", "Kabura Fondo", "Pincel Beta Negro")
   - Tool 5: Aplicador de Tramas (Screentones halftone pattern icon)
   - Tool 6: Líneas Cinéticas FX (Speed & impact lines generator)
   - Tool 7: Globos Fukidashi (Speech balloons: Normal, Grito, Pensamiento, Sistema RPG)
   - Tool 8: Sellos Kakimoji (Manga SFX katakana/onomatopoeia stamps)

3. CENTER STAGE WORKSPACE (fluid width):
   - Displays a centered B6 Tankōbon manga page on a Genkō Yōshi sheet with cyan print margins (#00AEEF).
   - Inside the page, show a dynamic 4-panel manga layout (Koma-wari) with one diagonal action panel selected in active Indigo/Cyan highlight (#6366F1).
   - The active panel (State S2: Pen-ire & Ink) shows high-contrast black-and-white manga lineart of a warrior character with a golden guanin medallion, speech balloon with Spanish dialogue, and a floating mini-toolbar above the panel: "Regenerar Pose IA", "Invertir Lienzo", "Aplicar Trama 30%", "Bloquear Viñeta (S5)".

4. RIGHT CONTEXTUAL INSPECTOR (width 320px, split into Top & Bottom sections):
   - TOP SECTION ("Inspector de Viñeta Activa - Koma #2"):
     * State stepper pill showing current panel progress: [S1 Nemu Azul] -> [S2 Pen-ire IA (Activo)] -> [S3 Tramas] -> [S4 Globos] -> [S5 Listo].
     * Character Reference Selector ("Anclas Settei"): Active pill chips "@Alo (Seed Fijado ✓)" and "@Anacaona" with tiny character avatar thumbnails and locked visual traits ("Medallón Guanín", "Capa Oscura").
     * Camera & Angle selector: "Contrapicado Dramático (Low Angle)".
     * AI Co-pilot Box ("KAI Sensei + Nano Banana 2 HD"): Prompt input with button "Generar / Refinar Entintado" and a secondary button "Convertir Fondo 3D a Línea (LT)".
     * Screentone Quick Swatches: 4 visual halftone dot pattern squares (15% 60L, 30% 60L, 60% Sombra, Degradado Cielo).
   - BOTTOM SECTION ("Pila Fija de 6 Capas"):
     * Clean locked layer stack from top to bottom with eye toggles and opacity sliders:
       6. Guías Genkō (#00AEEF) [No imprimible]
       5. Globos Fukidashi y Texto
       4. Onomatopeyas (Kakimoji SFX)
       3. Marcos de Viñeta (0.8mm) y Líneas FX
       2. Tinta y Arte (G-Pen / Render IA)
       1. Tramas (Screentones) y Negros Beta
       0. Boceto Azul (Shitagaki Draft) [40% Opacidad]

5. BOTTOM STATUS STRIP (height 32px):
   - Displays: "Formato: Tankōbon B6 (128x182mm) | Sangrado: 3mm | Resolución: 600 DPI Monocromo | Zoom: 125% | Motor: Nano Banana 2 HD".
```

---

### Opción B — El mismo Prompt Maestro 100% en Español (Por si prefieres redactarlo directo en español)

```text
Diseña la interfaz de una aplicación web de escritorio (1440x900) llamada "MANGAI / KAI STUDIO", un estudio profesional de creación de manga tradicional y asistido por IA para mangakas solitarios.

ESTÉTICA Y PALETA DE COLORES ("Papel Genkō Limpio y Tinta Sumi"):
- Fondo de la mesa de trabajo: Gris cálido de mesa de corte (#ECEAE4).
- Hoja de Manga Central: Blanco marfil de papel manuscrito de 135kg (#FAF8F5) con guías técnicas en azul cian no-fotográfico (#00AEEF) para Sangrado (Bleed 3mm), Línea de corte (Trim) y Área Segura (Naiwaku), con reglas milimétricas en los bordes.
- Paneles laterales y barra superior: Blanco puro (#FFFFFF) con bordes finos de 1px (#E2E0D8) y textos en negro tinta Sumi (#111111).
- Acentos: Índigo IA (#6366F1) para el asistente KAI y chips "@Personaje", Rojo Sello Hanko (#E11D48) para botones principales, y Dorado Guanín (#D97706) para insignias Pro.

ESTRUCTURA DE PANTALLA (5 Zonas de Estudio):
1. BARRA SUPERIOR (52px de alto):
   - Izquierda: Logo "MANGAI STUDIO", ruta "AnaCaona: Vol. I > Cap. 01 > Pág. 04" e indicador verde "Guardado".
   - Centro (Selector de 5 Etapas): "1. Biblia Settei" | "2. Guion Kōsō" | "3. Tablero Nemu" | "4. Lienzo Genkō" (Activo) | "5. Empaque Tankōbon".
   - Derecha: Contador "14 / 100 págs (Plan Pro)", botón "Gestionar Plan", interruptor cian "Guías Genkō: ON" y botón primario rojo "Exportar Imprenta".

2. BARRA IZQUIERDA DE HERRAMIENTAS DE MANGAKA (68px de ancho):
   - Iconos verticales: 1) Selector de Viñeta, 2) Cuchilla Katana (cortador diagonal de viñetas), 3) Lápiz Azul No-Foto (Boceto Shitagaki), 4) Plumas de Entintado (con submenú mostrando G-Pen, Maru-Pen, Kabura-Pen y Pincel Beta), 5) Aplicador de Tramas (Screentones), 6) Generador de Líneas de Impacto/Velocidad, 7) Globos de Diálogo Fukidashi, 8) Sellos de Onomatopeyas (Kakimoji SFX).

3. LIENZO CENTRAL (Hoja Genkō Yōshi):
   - Página de manga formato Tankōbon B6 centrada con sus 3 márgenes azules (#00AEEF).
   - Dentro de la hoja, muestra una página dividida en 4 viñetas dinámicas (una de ellas con corte diagonal seleccionada con borde índigo).
   - La viñeta activa muestra arte entintado en blanco y negro de alto contraste, un globo de diálogo manga y una barra flotante rápida encima con: "Regenerar Pose IA", "Invertir Lienzo", "Trama 30%" y "Bloquear Viñeta".

4. INSPECTOR CONTEXTUAL DERECHO (320px de ancho, dividido en 2 bloques):
   - MITAD SUPERIOR ("Inspector de Viñeta #2"):
     * Barra de estado de la viñeta: [S1 Nemu] -> [S2 Entintado IA (Activo)] -> [S3 Tramas] -> [S4 Globos] -> [S5 Cerrado].
     * Chips de personajes vinculados desde la Biblia Settei: "@Alo (Seed Fijado ✓)" con etiquetas de rasgos ("Medallón Guanín", "Capa Oscura").
     * Selector de cámara: "Contrapicado Dramático".
     * Caja de Asistente KAI + Nano Banana 2 HD con botón "Generar / Refinar Línea" y botón "Fondo a Línea (LT)".
     * Muestra de 4 tramas semitono (15%, 30%, 60% y Degradado).
   - MITAD INFERIOR ("Pila Fija de 6 Capas"):
     * Lista ordenada de capas con icono de ojo y opacidad: 6) Guías Azules, 5) Globos y Texto, 4) SFX Kakimoji, 3) Marcos 0.8mm y FX, 2) Tinta y Arte, 1) Tramas y Negros Beta, 0) Boceto Azul (40%).

5. BARRA INFERIOR DE ESTADO (32px de alto):
   - Texto monoespaciado: "Formato: Tankōbon B6 (128x182mm) | Sangrado: 3mm | 600 DPI Monocromo | Zoom: 125% | Motor: Nano Banana 2 HD".
```

---

## PASO 2: Prompts de Seguimiento en Stitch (Para generar las otras 4 Pantallas manteniendo el mismo estilo)

Una vez que Stitch te genere la pantalla principal con el Prompt del Paso 1, **no abras un proyecto nuevo**. Usa el chat de seguimiento de esa misma sesión en Stitch y pega estos prompts uno por uno para crear el ecosistema completo:

### 2.1 Prompt para generar la Vista 1: Biblia del Mundo y Personajes (*Settei Hub*)
```text
Keep the exact same top header bar, color palette, and typography, but switch the active tab in the top navigation to "1. Biblia Settei".
In the center workspace, design the "Settei Character & World Bible Hub":
- Top filter tabs: "Personajes (Settei)" (Active), "Objetos y Armas (Props)", "Escenarios y Lore".
- A 3-column grid of Character Reference Cards. Show the main card for "@Alo" featuring: a main manga portrait, 3 small turnaround thumbnails (Frontal, Perfil, Expresiones), a green badge "Character Seed Bloqueado ✓", and visual anchor chips ("Medallón Guanín Dorado", "Capa Oscura", "Estilo Seinen Alto Contraste").
- In the right inspector panel (320px), show the "Editor de Ficha Settei" with a Turnaround Sheet generator and a button "Vincular @Alo al Capítulo 1".
```

### 2.2 Prompt para generar la Vista 2 y 3: Guion Técnico (*Kōsō*) + Tablero *Nemu* (Doble Página)
```text
Keep the exact same studio header and design system, and switch the active tab to "3. Tablero Nemu".
Design a split-screen Storyboard & Script workspace:
- Left Panel (340px - "Guion Técnico Kōsō"): Collapsible page blocks (Página 01, Página 02, Página 03, Página 04) showing numbered panel rows with camera angle badges ("Close-up", "Contrapicado"), character tags ("@Alo"), and dialogue lines with green checkmarks indicating they are placed on the board.
- Center Workspace ("Vista Spread de Doble Página"): Show 3 pairs of facing manga pages (Right-to-Left Japanese reading order, paired 01-02, 03-04, 05-06) with rough blue Nemu sketches inside the panels and a dashed cyan eye-tracking flow curve (1 -> 2 -> 3 -> 4) connecting the speech balloons across each spread.
- Right Panel (300px - "KAI Sensei Co-Pilot"): Chat assistant with a Kawaii ninja sensei avatar giving pacing feedback in Spanish and a button "Aprobar Nemu y Abrir en Lienzo Genkō".
```

### 2.3 Prompt para generar la Vista 5: Empaque *Tankōbon* + Modal de Planes
```text
Keep the exact same studio header and design system, and switch the active tab to "5. Empaque Tankōbon".
- Center Workspace: Show a full print-ready Tankōbon Book Cover Spread template laid flat (Solapa Izquierda + Contraportada con caja ISBN + Lomo dinámico de 11.5mm calculado para 192 páginas + Portada principal + Solapa Derecha) with cyan 5mm bleed guides, plus a 3D preview toggle of the printed manga volume.
- Right Panel (320px - "Semáforo Pre-Imprenta"): Show a Pre-Flight checklist in Spanish with green checkmarks ("600 DPI Verificado", "Capas de Boceto Azul Ocultas", "Globos dentro del Área Segura Naiwaku") and two export buttons: "Descargar PDF Imprenta (CMYK + Marcas de Corte)" and "Exportar Webtoon".
```
