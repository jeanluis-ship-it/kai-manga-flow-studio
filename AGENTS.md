# MANGAI — Reglas para agentes y Antigravity

1. Prioridad absoluta: **conservar** el Studio existente en `index.html` y los motores de `02_kai_engine/`.
2. La landing nueva está deliberadamente en `experience/` y el modo sencillo en `creator/`. No moverlas a la raíz ni sobrescribir funcionalidades sin revisión.
3. Fuente de verdad: leer `00_ARQUITECTURA_MANGAI_KAI_STUDIO.md`, `00_GUIA_UI_UX_Y_PROCESO_MANGA.md`, `00_ROADMAP_MAESTRO_Y_UX_UI.md`, luego `README.md`.
4. Cualquier trabajo nuevo debe seguir la secuencia: Idea → Settei → Personaje → KAI → Nemu → Genkō → Tankōbon.
5. Para edición visual, conservar rasgos aprobados del personaje, y siempre permitir revisar, rechazar y aprobar versiones.
6. Mantener `OPENAI_API_KEY` solo en funciones del servidor. Nunca imprimirla, pasarla a cliente ni versionar `.env.local`.
7. Bloquear generación costosa por defecto. El código compartido de Studio es solo protección interna temporal. Para acceso público implementar usuarios, control de gasto, cuotas y rate limiting persistente.
8. La página de pago existente `api/checkout.js` debe auditarse antes de activar cobros reales: sus pases de demostración no prueban un pago.
9. Hacer cambios pequeños en rama de desarrollo, probar rutas y errores y abrir PR sin fusionar automáticamente.
10. Mantener accesibilidad móvil y respeto por `prefers-reduced-motion`.
