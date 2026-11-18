# Mangai / KAI Studio — Arquitectura Técnica y Especificación del Sistema

> **Fuente:** Arquitectura UX + IA (Tablero Miro)  
> **Propósito:** Documento maestro de referencia para el desarrollo de la plataforma SaaS de creación de manga profesional asistida por inteligencia artificial.

---

## 1. Visión General del Sistema

**Mangai / KAI Studio** es un entorno de producción editorial que fusiona el flujo tradicional de creación de manga japonés (*Nemu*, *Pen-ire*, *Tone*, *Shiage*) con un motor de generación de IA consistente (**KAI**) y herramientas de preprensa listas para publicación impresa (*Tankōbon*) y digital.

### Stack Tecnológico Recomendado
* **Frontend & Editor:** Next.js (App Router), TypeScript, Tailwind CSS.
* **Motor de Lienzo (Canvas):** HTML5 Canvas / Konva.js o Fabric.js con soporte para capas independientes, máscaras de recorte (*clipping masks*) y trazos vectoriales/rasterizados.
* **Backend & Base de Datos:** Supabase (PostgreSQL, Auth, Storage para *Settei* y páginas, Edge Functions).
* **Orquestación IA (KAI Middleware):** Pipeline de compilación de prompts multimodales + modelos de generación (Standard Trial/Starter, Nano Banana 2 HD Pro/Master) + postprocesamiento de imagen (binarización y tramas).

---

## 2. Design System y Tokens Semánticos (Frame 0)

La interfaz debe respetar estrictamente el código de colores del ecosistema para guiar visualmente al usuario entre sus acciones, la asistencia de IA y las validaciones técnicas:

| Rol en el Ecosistema | Color Semántico | Uso en UI / Tailwind Token |
| :--- | :--- | :--- |
| **Acción del Mangaka** | Azul Cian (`#06B6D4`) | Herramientas de dibujo, cursores activos, selección de viñetas, inputs creativos. |
| **Interfaz / Canvas** | Blanco / Neutro (`#FFFFFF` / `#F8FAFC`) | Espacio de trabajo, paneles laterales, modales, lienzo de página. |
| **KAI / Motor IA** | Violeta (`#8B5CF6`) | Botones de generación, chat mentor de guion, indicadores de renderizado y filtros 3D/manga. |
| **Supabase / Estado** | Verde (`#10B981`) | Sincronización en la nube, perfiles *Settei* activos, control de versiones y medidor de cuotas. |
| **Validación / Alertas** | Ámbar (`#F59E0B`) | Advertencias de *Pre-flight* (sangrado, resolución, exceso de viñetas, texto fuera de margen). |

---

## 3. Modelo de Datos y Pipeline de IA (`Settei → KAI Render Engine`)

### 3.1. Entidad `Settei` (Supabase)
Fuente única de identidad visual para mantener la consistencia de personajes, escenarios y estilos a lo largo de toda la obra:
```json
{
  "character_id": "uuid",
  "character_name": "string",
  "visual_anchors": ["string"],
  "turnaround_sheet_url": "string",
  "style_preset": "string"
}
```

### 3.2. Flujo de Generación en Bucle (Render Loop)
Cada vez que se solicita asistencia de IA en una viñeta, el sistema ejecuta este pipeline secuencial:

1. **Inyección de Settei:** Recupera `character_name`, `visual_anchors`, `turnaround_sheet_url` y `style_preset` desde Supabase.
2. **Captura de `CANVAS STATE`:** Extrae del lienzo activo:
   * `panel_aspect_ratio` (proporción de la viñeta).
   * `camera_angle` (plano y ángulo definido en el inspector).
   * `rough_sketch_mask` (boceto rápido del usuario en capa `L0` como guía estructural).
   * `bubble_reserved_zone` (máscara de exclusión donde irán los globos de diálogo para evitar dibujar detalles críticos ahí).
3. **KAI Middleware:** Combina el nivel narrativo (`N1` + `N2` + acción del guion) con los datos del *Settei* y del *Canvas State* para compilar automáticamente el prompt técnico.
4. **Render Engine:** Ejecuta la generación según el plan del usuario (*Standard Trial/Starter* o *Nano Banana 2 HD* con prioridad *Pro/Master*).
5. **Postprocesador:** Aplica binarización (blanco y negro puro), generación de tramas (*screentones*) e integración con el lienzo.
6. **Control de Consistencia (Validation Gate):** Compara el resultado con la identidad visual del *Settei*. Si detecta desviaciones, corrige la variación y reinyecta referencias automáticamente antes de permitir aceptar la viñeta.

---

## 4. Máquina de Estados de Viñeta (`Koma State Machine`)

Cada viñeta (*Koma*) dentro de una página opera como una máquina de estados finitos con un **Inspector Contextual** que adapta las herramientas disponibles según la fase (`S0` a `S5`):

```text
[KOMA VACÍO] (Marco, plano, diálogo/boceto)
      │
      ▼
[KOMA NEMU] (Blue Draft en L0 + globo fantasma)
      │
      ├─────────────────────────┐
      ▼ (Ruta Manual)           ▼ (Ruta IA)
[G-Pen / Maru-Pen]      [Boceto + @Personaje + KAI]
      │                         │
      └────────────┬────────────┘
                   ▼
           [KOMA PEN-IRE] (Tinta B/N + Clipping Mask en L2)
                   │
                   ▼
           [KOMA TONE FX] (Tramas en L1 + FX cinéticos en L3)
                   │
                   ▼
            [KOMA SHIAGE] (Diálogos en L5 + SFX definitivos en L4)
                   │
                   ▼
            [KOMA LOCKED] (Edición protegida / Lista para preprensa)
```

### Reglas del Inspector por Estado
* **S0:** Configuración de cámara, plano y texto del guion.
* **S1:** Selector de ruta (Manual vs. Asistida por IA).
* **S2:** Herramientas de entintado e *Inpainting* correctivo.
* **S3:** Aplicación de tramas (*screentones*) y efectos de velocidad.
* **S4:** Edición vectorial de globos de texto y onomatopeyas (*Kakimoji*).
* **S5:** Candado de bloqueo (`KOMA LOCKED`) que protege la viñeta contra ediciones accidentales.

---

## 5. Jerarquía de Capas y Preprensa (`Tankōbon`)

### 5.1. Pila de Capas Estricta (Arriba → Abajo)
El motor del editor debe mantener exactamente estas 7 capas por página:

* **`L6` — UI Guides Overlay:** Guías de margen, corte y zonas seguras. *Solo visible en pantalla; excluir siempre al exportar.*
* **`L5` — Text and Balloons:** Globos de diálogo y textos editables (vectoriales).
* **`L4` — SFX Kakimoji:** Onomatopeyas gráficas.
* **`L3` — Panel Borders and Kinetic FX:** Marcos de viñetas y líneas cinéticas/velocidad.
* **`L2` — Ink and Art:** Arte final entintado (manual o generado por IA).
* **`L1` — Screentones and Beta:** Tramas de semitonos y rellenos negros (*Beta*) situados debajo de la tinta.
* **`L0` — Nemu Blue Draft:** Boceto estructural en azul no fotográfico. *No imprimible; ocultar siempre al exportar.*

### 5.2. Motor de Exportación y Pre-flight
Antes de generar el paquete final de publicación, el sistema ejecuta las siguientes validaciones:
1. **Reglas de Capas:** Aplana `L1` a `L5` y excluye automáticamente `L0` y `L6`.
2. **Pre-flight Técnico:**
   * Verifica resolución de salida en **300 dpi** o **600 dpi**.
   * Valida el sangrado (*bleed*) de **3.5 mm** y marcas de corte japonesas (*Nawaku*).
   * Comprueba que ningún globo de texto (`L5`) invada los márgenes de seguridad.
3. **Cálculo de Cubierta (Tankōbon):**
   * Calcula automáticamente el ancho del lomo: $\text{Grosor del lomo} = \left(\frac{\text{Total de páginas}}{2}\right) \times \text{Grosor del papel}$.
   * Genera plantilla unificada de portada, lomo, contraportada y código ISBN.
4. **Formatos de Salida:** Exportación simultánea a **PDF/X** (imprenta) e imágenes optimizadas para el **lector web**.

---

## 6. Flujo de Trabajo End-to-End (Service Blueprint)

La navegación principal de la aplicación guía al creador a través de **6 etapas secuenciales**, coordinando las acciones del usuario, la interfaz y el motor backend:

| Etapa | Acción del Mangaka | Interfaz (UI) | Motor (KAI / Supabase) | Validación de Negocio |
| :--- | :--- | :--- | :--- | :--- |
| **01. Configuración y Settei** | Crea proyecto (Tankōbon A5 / Vertical Scroll) y define fichas de personajes y escenarios. | Selector de dimensiones, planes (Trial/Starter/Pro/Master) y *Settei Hub*. | Valida cuotas, extrae identidad visual, genera `character_id` y token `@Personaje`. | — |
| **02. Kōsō y Guion** | Estructura el capítulo con ayuda de KAI, define ritmo, escenas y *cliffhangers*. | Editor de guion + Chat KAI (página, viñeta, cámara, acción, diálogo). | KAI mantiene memoria conversacional y compila JSON estructurado (`script_pages[]`). | Alerta de densidad si hay más de **4–7 viñetas** por página. |
| **03. Nemu y Ritmo** | Revisa *spreads* (doble página), elige *Koma-wari* (distribución) y dibuja bocetos rápidos. | Modo Nemu + guía `L0`, presets de retícula (3/4/5 viñetas) y cortes diagonales. | Genera `auto-nemu` desde `script_pages[]` y guarda coordenadas SVG de viñetas. | **Gate:** ¿Ritmo Nemu aprobado? |
| **04. Shitagaki y Pen-ire** | Selecciona viñeta, refina boceto azul y entinta (manual o invocando `@Personaje`). | Canvas con *bleed* de 3mm, *Safe Area*, herramientas de tinta e inspector IA. | Renderiza con *Settei* + máscara, aplica *clipping mask* y filtro 3D a manga. | — |
| **05. Beta, Tone y Shiage** | Aplica negros, tramas, líneas cinéticas, globos de diálogo y SFX. | Selector de tramas (10–80%), FX radial/paralelo, globos vectoriales y *Kakimoji*. | Ejecuta *Auto-Tone*, sincroniza texto con guion y verifica márgenes de lectura. | **Gate:** ¿Textos dentro de márgenes? |
| **06. Tankōbon y Print** | Revisa empaque editorial, portada, lomo, contraportada e ISBN. | Estudio de cubierta 2D/3D y checklist visual de *Pre-flight*. | Calcula lomo, genera archivos PDF/X + paquete web y marca obra como Publicada. | Validación final 300/600 dpi y bleed 3.5mm. |