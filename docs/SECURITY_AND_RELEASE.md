# Revisión previa a una beta pública

- [ ] Vercel autorizado para el equipo propietario y Preview desplegado sin tocar producción.
- [ ] OPENAI_API_KEY configurado solo en Vercel.
- [ ] MANGAI_STUDIO_ACCESS_TOKEN aleatorio, largo y separado por entorno.
- [ ] Comprobar que 401 no genera imágenes ni cargos.
- [ ] Tests de generación y edición de 1–2 referencias con límite de 1 MB por referencia.
- [ ] Límites reales por usuario, IP y costos, en almacenamiento duradero.
- [ ] Autenticación de usuarios, permisos por proyecto y aislamiento de documentos.
- [ ] Persistencia de imágenes en Blob/Supabase con control de acceso.
- [ ] Revisar `api/generate.js`: hoy admite claves pasadas por cliente y fallback a servicios externos.
- [ ] Revisar `api/checkout.js`: los pases de prueba pueden emitirse sin compra verificada; no usar para cobro público.
- [ ] Políticas de copyright, permisos de referencias, privacidad y contenido generado por IA.
- [ ] Comparar visualmente `/experience/` con la landing v0.3 diseñada y aprobada.
- [ ] Pruebas móviles, accesibilidad, descarga y aprobación de canon.
- [ ] No pasar a producción sin aprobación explícita y verificaciones de presupuesto API.

Esta iteración es **MVP privado en rama de desarrollo**, no solución comercial lista para venta.
