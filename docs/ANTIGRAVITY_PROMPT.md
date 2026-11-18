# Instrucción inicial sugerida para Google Antigravity

Abre el repositorio raíz de MANGAI y pega esta instrucción al agente:

> Trabajamos en **MANGAI Studio**, una plataforma de creación de manga desde el lore hasta el tomo impreso. Lee primero `README.md`, `docs/ARQUITECTURA.md`, `docs/ROADMAP.md` y `.agent/rules/mangai.md`. **No rediseñes la landing actual ni pierdas sus animaciones**; conservar el home es prioridad. Trabaja por cambios pequeños y verificables. En el Studio React, simplifica UX: idea → universo → personaje → imagen con referencia → aprobación de canon. Evita exponer secretos y nunca uses la API de OpenAI directamente desde el navegador. Antes de dar por terminado un cambio, ejecuta `npm run typecheck`, `npm test` y `npm run build`. Muéstrame resumen de archivos modificados y pasos para probar. No afirmes que una integración está operativa si requiere credenciales o servicios no configurados.

## Primeras solicitudes recomendadas

1. «Implementa onboarding conversacional paso a paso con datos guardados en el proyecto sin modificar la landing».
2. «Desarrolla sistema de versiones de personajes: referencia frontal aprobada y vistas lateral/expresiones derivadas desde OpenAI Images Edit».
3. «Conecta un login de Supabase y almacenamiento privado de imágenes antes de hacer el Studio público».
4. «Implementa una galería visual de personajes por proyecto con estados: draft → review → approved».
