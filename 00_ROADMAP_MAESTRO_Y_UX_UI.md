# 00. ROADMAP MAESTRO DE EJECUCIÓN ASÍNCRONA (DE PUNTA A PUNTA)

## 1. Diagnóstico Operativo: Cómo Evitar que un Proyecto "De Medio Tiempo" Muera

* **[Seguro] El enemigo #1 de un proyecto que no se toca todos los días es la pérdida de contexto:** Si intentas diseñar y programar todo a la vez en sesiones sueltas, cada vez que vuelvas tras 5 días sin tocarlo gastarás toda tu energía recordando dónde te quedaste.
* **[Seguro] Regla de Micro-Hitos Cerrados:** Dividimos la construcción de **KAI Studio** en **5 Bloques Independientes**. No pasamos al siguiente hasta que el anterior tenga un archivo funcional terminado dentro de esta carpeta.

---

## 2. Estructura Oficial de la Carpeta del Proyecto

```text
Proyecto Manga Online/
├── 00_ROADMAP_MAESTRO_Y_UX_UI.md              <-- Mapa de control y estado actual (ESTÁS AQUÍ)
├── 01_AUDITORIA_Y_MODELO_NEGOCIO_RD.md        <-- Unit economics, precios RD$ y paquetes físicos
├── 02_ARQUITECTURA_TECNICA_Y_PROMPT_KAI_V3.md <-- Pipeline IA + System Prompt KAI v3.0
├── 03_ESPECIFICACION_IMPRENTA_Y_PREPRENSA_RD.md <-- Fórmulas de lomo y ficha para imprentas
├── 01_ux_ui_system/
│   └── DESIGN_SYSTEM_TOKON_UX.md              <-- Flujo de usuario, wireframes y estética Tōkon
├── 02_kai_engine/                             <-- (Fase 2) Prompts modulares, esquemas JSON y pruebas API
├── 03_web_studio_app/                         <-- (Fase 3) Frontend interactivo (Home + Canvas + Cubiertas)
└── 04_preprensa_tomo_cero/                    <-- (Fase 4) Archivos reales del "Tomo Cero" para imprenta RD
```

---

## 3. Ruta Paso a Paso (5 Fases de Punta a Punta)

| Fase | Nombre del Módulo | Entregable Tangible en Carpeta | Tiempo Estimado por Sesión | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **FASE 0** | **Cimientos: Negocio, Cerebro KAI v3 y Pre-Prensa** | Documentos base `01`, `02` y `03` | Completado | ✅ **LISTO** |
| **FASE 1** | **UX/UI & Sistema de Diseño "Tōkon + Ninja Kawaii"** | Mapa de experiencia "Dopamina en 90s", componentes visuales y estados del asistente en `01_ux_ui_system/` | 1 sesión (45 min) | 🔄 **EN CURSO (Hito Actual)** |
| **FASE 2** | **Prototipo Web Funcional: Pantalla 1 (Home + Onboarding Visual)** | App web local en `03_web_studio_app/` con selector de enfoque, avatar Ninja Kawaii y generación de Ficha de Personaje | 1–2 sesiones | ⏳ Pendiente |
| **FASE 3** | **El Lienzo de Viñetas y Compositor Vectorial (Pantalla 2)** | Lienzo blanco con grilla de paneles, globos de diálogo editables en SVG y checklist progresivo desbloqueable | 2 sesiones | ⏳ Pendiente |
| **FASE 4** | **Maquetador de Cubierta + Calculadora Imprenta RD (Pantalla 3)** | Generador de Portada + Lomo dinámico (según páginas) + Contraportada con código de barras y cotizador local | 1 sesión | ⏳ Pendiente |
| **FASE 5** | **Producción del "Tomo Cero" Físico (*Anacaona* / *Apagón*)** | PDF/X de 24 páginas a 300 DPI con sangrado de 3mm listo para llevar a imprenta en Santo Domingo | 1 sesión | ⏳ Pendiente |
