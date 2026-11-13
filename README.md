# MANGAI / KAI Manga Flow Studio

Aplicación editorial original + nueva experiencia de prueba en una rama de desarrollo.

## Páginas

| Ruta | Estado | Propósito |
| --- | --- | --- |
| `/` | Existente / sin modificar | Studio avanzado original (Settei, Nemu, Genkō y Tankōbon) |
| `/experience/` | Nueva, prueba | Landing editorial con carrusel 3D CSS, KAI, colección y Z-Space |
| `/creator/` | Nueva, prueba | Recorrido simplificado de idea → universo → personaje → imagen → canon |
| `/api/openai-image` | Nuevo, privado | Imagen OpenAI desde texto o referencias visuales, solo desde servidor |
| `/api/generate` | Existente | Gemini/FLUX, no se reemplaza |
| `/api/checkout` | Existente | Monetización antigua; **no apta para lanzamiento público sin auditoría** |

## Tecnologías

Repositorio actual: HTML, CSS y JavaScript estático + funciones serverless de Vercel. **No es Next.js**. Evitar migración automática o sustitución de `index.html`. Los demos anteriores de MANGAI no deben sobrescribir los sistemas reales que ya funcionan.

## Desarrollo y publicación

1. Trabaja sobre la rama `feat/mangai-landing-openai-studio-v06` en Antigravity.
2. La aplicación se sirve como proyecto estático con funciones `api/*.js` en Vercel.
3. Abre el preview de Vercel para la rama y visita `/experience/`, `/creator/` y `/`.
4. Configura **en Vercel → Project Settings → Environment Variables**, con destino **Preview**, no en GitHub: `OPENAI_API_KEY`, `MANGAI_STUDIO_ACCESS_TOKEN` y, opcionalmente, `OPENAI_IMAGE_MODEL` (valor por defecto `gpt-image-2.5-flare`). Los secretos no deben enviarse por chat ni registrarse en logs.
5. Visita `/api/openai-image` (GET) en el dominio Preview: debe mostrar `configured: true`. Es una comprobación **sin consumo de API**; si aparece `false`, revisa variables y haz redeploy de Preview.
6. Prueba `/api/openai-image` desde Creator con un código privado largo antes de generar una sola imagen de baja calidad. Revisa cuota y consumo.
7. Mantén el gasto API limitado y monitoreado. El token compartido es **solo para desarrollo interno**, no un sistema de usuarios real.
8. Revisa el pull request y despliega primero un entorno Preview. No fusionar hasta validar el resultado.

## Alcance de v0.6

- La landing en `/experience/` **ya recupera el código original de la v0.3 aprobada** (portadas, animaciones y scroll); únicamente se redirigieron los botones del Studio hacia `/creator/`. La raíz pública sigue intacta.
- El Creator guarda texto en `localStorage`, referencias en memoria, y permite descargar la imagen. No existen cuentas, base de datos, almacenamiento de imágenes persistente ni pagos validados para esta ruta.
- El canon es un JSON exportable. La consistencia se favorece reusando descripción y referencias; no se garantiza identidad idéntica entre generaciones.
- El Studio avanzado tiene una opción OpenAI en su selector de motores. Los motores actuales permanecen.
- El motor de OpenAI usa una clave exclusivamente del servidor. Las solicitudes requieren el código `MANGAI_STUDIO_ACCESS_TOKEN`, ingresado por el usuario y conservado únicamente en memoria de sesión del navegador.

## Pruebas

```bash
node --check api/openai-image.js
node --check api/generate.js
node --check 02_kai_engine/manga_image_router.js
node --check 02_kai_engine/stitch_studio_controller.js
```

Antes de publicar, comprobar `/experience`, `/creator`, `/`, movilidad, políticas de API, tiempos de espera, errores 401 y 503 y costos reales de OpenAI. La API se prueba con una clave válida en un entorno privado.

Consulta `docs/ANTIGRAVITY_IMPLEMENTATION.md` para las instrucciones de trabajo y `docs/SECURITY_AND_RELEASE.md` para el checklist.
