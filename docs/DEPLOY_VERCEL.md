# Desplegar MANGAI — GitHub + Vercel + Antigravity

## A. Preparar en Antigravity

1. Descomprime el ZIP y abre la carpeta `mangai-studio` completa.
2. En el terminal de Antigravity ejecuta `npm install`, luego `npm run dev`.
3. Abre `http://localhost:3000` para el home y `http://localhost:3000/studio` para el taller.
4. Verifica que el carrusel, los enlaces y la ficha de personajes funcionen.
5. Copia `.env.example` a `.env.local`; añade tus propias credenciales SOLO en ese archivo.

## B. Subir a GitHub

En la terminal en la raíz del proyecto:

```bash
git init
git add .
git commit -m "MANGAI v0.4: landing + creator studio + OpenAI images"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

Crea previamente un repositorio vacío en GitHub y sustituye la URL. Si ya hay un repo existente, clónalo y copia este código en la rama apropiada, revisando cambios antes del merge. **Nunca subas `.env.local`**.

## C. Conectar con Vercel

1. Vercel Dashboard → **Add New → Project** → importa tu repositorio GitHub.
2. El framework debe reconocerse como **Next.js** y el Root Directory será la raíz `mangai-studio`.
3. En Project → Settings → **Environment Variables** agrega `OPENAI_API_KEY`, `OPENAI_IMAGE_MODEL` y `STUDIO_ACCESS_TOKEN`.
4. Despliega. Si agregas o cambias variables después, **vuelve a desplegar**.
5. Comprueba `https://TU-DOMINIO/`, `/studio` y `/api/health`.
6. Prueba una generación desde una cuenta privada; la facturación de OpenAI debe estar habilitada.

**Nota:** la app Next.js es un proyecto nuevo. Si tu dominio actual pertenece a otra web, primero crea un proyecto de *staging* en Vercel. No cambies el dominio de producción hasta haber validado todo. La landing v0.3 está preservada.

## D. Seguridad antes de permitir acceso al público

- No usar el token compartido como login público. Implementar **autenticación y autorización por usuario**.
- Limitar número de solicitudes y coste por usuario; guardar métricas y presupuestos.
- Guardar imágenes y referencias en almacenamiento privado; no en localStorage.
- Validar permisos de archivos y cifrar credenciales.
- Añadir sistema de moderación, avisos legales y gestión de derechos de contenido.
- No exponer `OPENAI_API_KEY` ni ponerle prefijo `NEXT_PUBLIC_`.

## E. Integración con motores de imagen

El endpoint `POST /api/images/generate` acepta un `multipart/form-data` con atributos canónicos y referencia opcional. El servidor elige la acción:
- Sin imagen: `client.images.generate(...)`
- Con imagen: `client.images.edit(...)`

Modelo inicial: `gpt-image-2.5-flare` (iteración). Para edición detallada, configure `OPENAI_IMAGE_MODEL=gpt-image-2.5-sunburst` y pruebe el consumo y resultados. No utilizar el retirado `gpt-image-1`.

Documentación oficial: https://developers.openai.com/api/docs/guides/image-generation
