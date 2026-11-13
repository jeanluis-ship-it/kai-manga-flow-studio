# Prompt de trabajo — Google Antigravity

Actúa como lead engineer y diseñador UX/UI del proyecto MANGAI Creator Studio.

Trabaja directamente con el repositorio GitHub `jeanluis-ship-it/kai-manga-flow-studio`. Usa la rama `feat/mangai-landing-openai-studio-v06` y revisa el Pull Request de integración. No borres ni reescribas `index.html`.

## Estado

- Arquitectura real: HTML/CSS/JS estático con funciones serverless de Vercel.
- `/` = Studio avanzado existente.
- `/experience/` = landing nueva de prueba (no necesariamente igual a la landing conceptual anterior).
- `/creator/` = Studio simplificado de prueba.
- `/api/openai-image` = endpoint protegido de imagen y edición con referencias.
- `02_kai_engine/manga_image_router.js` = motor existente al que se añadió OpenAI.
- `api/generate.js` = mantener motores Gemini/FLUX actuales.

## Tu primera tarea

1. Clona y ejecuta el repo, identifica servidor estático apropiado con `/api` funcional (Vercel local para funciones).
2. Ejecuta `node --check` en los archivos JS actualizados.
3. Prueba `/experience/` en desktop y móvil y contrasta visualmente contra la referencia MANGAI landing v0.3 aprobada. Conserva intención: crema editorial, carrusel 3D de tomos, transición KAI negro/violeta, vitrina horizontal, Z-Space y CTA.
4. Prueba `/creator/`: idea, canon, personaje, referencias, generación, descarga y exportación de JSON. Evita paneles técnicos innecesarios.
5. Verifica que Studio original siga generando con motores existentes; prueba OpenAI separado.
6. Añade pruebas de API con mocks para ausencia de secreto, 401, tamaño, referencia inválida, respuesta 429 y modo edición multipart.
7. Implementa posteriormente autenticación real y almacenamiento seguro (Supabase ya está documentado en el repo) para una futura beta.
8. Presenta cambios como diff, resultados de pruebas, vista previa y riesgos. No fusionar ni publicar producción automáticamente.

## Seguridad y alcance

No leer ni exponer secretos, no guardar códigos privados en archivos, no usar localStorage para llaves de proveedores, no activar pagos ni omitir validación de facturación. Si Vercel pide autorización de equipo, usar el flujo oficial de acceso.
