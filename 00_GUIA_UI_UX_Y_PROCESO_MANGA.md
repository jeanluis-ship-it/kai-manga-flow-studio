# 📐 Blueprint Operativo: Investigación de Manga y Diseño UI/UX (KAI Flow Studio)

> **Propósito:** Guía de enfoque para tu fase de investigación del proceso de Manga y bocetado de pantallas (UI/UX), diseñada para que cada boceto que me pases se convierta directamente en código funcional sin retrabajo.

---

## 1. Lo que SÍ debes investigar del Proceso Editorial de Manga (Japón / Webtoon)

En el proceso profesional japonés (*Mangaka + Editor*), el 80% del éxito de un capítulo se decide **antes** de entintar. Cuando investigues y hagas tus borradores, concéntrate en estas **5 etapas reales** (porque cada una equivale a una pantalla o herramienta de tu UI/UX):

| Etapa Tradicional (Japón) | Qué hace el Mangaka | Qué significa para tu UI/UX |
| :--- | :--- | :--- |
| **1. Settei (設定) / Character Sheet** | Hoja de diseño fijo del personaje: rostro en 3 ángulos, altura, vestimenta y objetos clave (ej. el Guanín de Alo). | **Pantalla de Personajes:** Cómo el usuario bloquea la cara, ropa y *expresiones clave* (ira, calma, sorpresa) sin tener que describirlas desde cero en cada página. |
| **2. Plot / Kōsei (構成)** | Escaleta de ritmo por página (Ki-Shō-Ten-Ketsu: Introducción, Desarrollo, Giro, Clímax). | **Vista de Guion / Escaleta:** Una vista rápida donde ves qué ocurre en la Página 1, 2, 3, 4 y 5 de un vistazo antes de dibujar. |
| **3. Name / Nemu (ネーム)** | El *Storyboard* rápido: división de viñetas (*Koma-wari*), posición de cámara y dónde van los globos de texto para guiar el ojo del lector. | **Editor de Composición (Layout):** La herramienta más importante de tu UX. Cómo elige el usuario la plantilla de viñetas (Splash Page, 3 paneles, 4 paneles dinámicos, diagonal) y el ángulo de cámara (*plano contrapicado, primer plano de ojos, plano general*). |
| **4. Genkō (原稿) / Entintado y Tramas** | Pluma G-Pen, sombras negras (*Beta*), líneas cinéticas (*Speedlines*) y tramas grises (*Screentones*). | **Selector de Estilo y Generación:** Controles visuales simples (botones con miniatura visual en lugar de textos largos) para elegir el nivel de sombra, líneas de acción y atmósfera. |
| **5. Shashoku (写植) / Globos y SFX** | Tipografía, globos de diálogo (habla normal, grito puntiagudo, pensamiento en nube, narración cuadrada) y onomatopeyas (*DOOOM / ドン*). | **Capa de Edición sobre la Página:** Arrastrar globos, cambiar la cola del globo apuntando al personaje que habla y colocar onomatopeyas sin tapar la cara del personaje. |

---

## 2. Qué traer en tus Bocetos de UI/UX (Checklist de Entregables)

Cuando termines tus borradores y me pases las imágenes o capturas de referencia, te sugiero cubrir estos **4 bloques visuales**:

### A. Estructura de la Pantalla Principal (El "Espacio de Trabajo")
* ¿Dónde quieres la barra de navegación (izquierda fija tipo Figma/Clip Studio, o arriba minimalista)?
* ¿Cuánto espacio debe ocupar la **Hoja de Manga** en el centro (ej. 70% de la pantalla limpia) frente a los controles?
* ¿Prefieres un flujo **por pasos** (Paso 1 → Paso 2 → Paso 3) o un **lienzo único tipo estudio** donde los personajes están siempre visibles en una barra lateral para arrastrarlos a la página?

### B. Cómo se Conecta el Personaje a la Viñeta (La Interacción Clave)
* Boceta cómo te resulta más natural meter a **Alo** en una escena:
  * *Opción 1:* Arrastrar la tarjeta de Alo (*Drag & Drop*) y soltarla encima de la página/viñeta.
  * *Opción 2:* Hacer clic en la viñeta y elegir en un menú flotante: `Personaje: Alo` + `Expresión: Desafiante` + `Plano: Contrapicado`.

### C. Sistema de Viñetas y Globos de Diálogo
* ¿Quieres que la página sea **una sola ilustración completa** o prefieres **plantillas de viñetas reales con bordes negros editables** donde puedas regenerar **solo la Viñeta 2** si el rostro salió mal sin perder las Viñetas 1 y 3?
* ¿Qué tipos de globos necesitas a un clic? (`Diálogo normal`, `Grito/Impacto`, `Pensamiento`, `Caja de Narrador`, `Onomatopeya/SFX`).

### D. Referencias Visuales (Moodboard de UI)
* Puedes pasarme:
  1. **Dibujos hechos a mano** (en papel o iPad/tablet, fotografiadas con el móvil) mostrando dónde quieres cada botón.
  2. **Capturas de pantalla** de otras apps que te gusten (Canva, Figma, Clip Studio Paint, Midjourney, Webtoon) marcando con flechas qué parte quieres copiar o adaptar.

---

## 3. Estado Actual de tu Infraestructura (Lista para cuando regreses con los bocetos)

Mientras haces tu investigación y bocetos, tu base técnica ya está asegurada y desplegada:
* **App en Vivo (Vercel):** `https://kai-manga-flow-studio.vercel.app`
* **Repositorio Conectado (GitHub):** `https://github.com/jeanluis-ship-it/kai-manga-flow-studio`
* **Motor Serverless Activo:** `/api/generate` conectado con tu `GEMINI_API_KEY` en Vercel y auto-conexión de personajes en `index.html`.
