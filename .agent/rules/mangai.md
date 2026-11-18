# MANGAI Agent Rules

- Preservar estética, copy, transiciones y movimientos de `public/landing/`. No reescribir la landing sin una solicitud explícita.
- El código de producto vive en `app/studio`, `lib` y `app/api`. Usar TypeScript estricto.
- Nunca colocar secretos en archivos `NEXT_PUBLIC_*`, HTML, JavaScript del browser o GitHub.
- KAI debe guiar al creador en español y conservar la autoría del usuario. No cambiar canon aprobado sin desbloqueo explícito.
- Imágenes de OpenAI: usar solo rutas server-side; soportar referencia visual en ediciones; documentar límites de consistencia.
- Mantener una UX clara para usuarios sin conocimientos técnicos. Evitar formularios enormes y opciones innecesarias.
- Cada cambio significativo requiere `npm run typecheck`, `npm test`, `npm run build`.
- Los módulos no construidos (auth, storage, Tankōbon, marketplace, KAI conversacional) deben etiquetarse honestamente como roadmap.
