# Desplegar MANGAI — GitHub + Vercel + Antigravity

## A. Preparar en local o Antigravity

1. Abre la carpeta raíz del repositorio en tu editor o terminal.
2. Ejecuta `npm install` (en Windows PowerShell usa `npm.cmd install`), luego `npm run dev`.
3. Abre `http://localhost:3000` para la landing editorial, `http://localhost:3000/studio` para el taller y `http://localhost:3000/login` para autenticación / perfil local.
4. Copia `.env.example` a `.env.local`; añade tus propias credenciales **SOLO** en `.env.local` (nunca las subas al repositorio).

## B. Variables de Entorno en Vercel

En **Vercel Dashboard → Project → Settings → Environment Variables**, configura según tu despliegue:

### 1. Motor de IA y Respaldo Beta (sin bloqueos 429 / 503)
- `GEMINI_API_KEY`: clave oficial de Google AI Studio (opcional en Beta; también se acepta llave temporal vía cabecera `x-mangai-llave` desde el botón *Llave IA* del Studio).
- `IMAGE_FALLBACK_PROVIDER`: proveedor preferido cuando Gemini no está disponible o alcanza límite `429` (`pollinations` por defecto; admite `custom`, `huggingface`, `cloudflare`, `local`).
- `IMAGE_FALLBACK_URL`: URL personalizada opcional (`POST` JSON `{ prompt, width, height, seed, aspectRatio }`) si deseas conectar tu propio servidor de difusión.
- `POLLINATIONS_API_KEY`: token Bearer opcional para Pollinations.ai (funciona también sin clave usando `pollinations-flux-beta`).
- `HF_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_WORKERS_AI_TOKEN`: credenciales opcionales para respaldo en HuggingFace o Cloudflare Workers AI.

Si Gemini falla con `429`/`404`/`5xx` o no hay cuota de imagen, la tubería degrada automáticamente en 3 niveles (`Gemini` → `Respaldo raster configurable / Pollinations Flux` → `Síntesis local PNG con sharp`) y el chat de KAI responde en `[Modo Guía Beta — sin cuota LLM en vivo]` con un `[PROMPT VISUAL]:` válido.

### 2. Autenticación y Persistencia (Supabase Cloud vs Perfil Local Beta)
- `NEXT_PUBLIC_SUPABASE_URL`: URL pública de tu proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: clave `anon` pública de Supabase.
- Para habilitar **Continuar con Google**, activa el proveedor Google OAuth en Supabase Auth y añade `https://TU-DOMINIO/auth/callback` a las Redirect URLs permitidas.
- Si `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` no están configuradas, `/login` ofrece de forma transparente **Perfil Local en este Dispositivo (Beta)** (guardado por correo en `localStorage`) además del **Modo Invitado**.

### 3. Protección de Demo Privada y Pagos (opcionales)
- `STUDIO_ACCESS_TOKEN` y `ENFORCE_STUDIO_TOKEN=true`: exige código de acceso en `/api/images/generate`.
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_MASTER`, `NEXT_PUBLIC_FOUNDER_CHECKOUT_URL`: configuración opcional de suscripciones.

## C. Conectar con Vercel

1. Vercel Dashboard → **Add New → Project** → importa tu repositorio GitHub.
2. El framework debe reconocerse como **Next.js** en la raíz del proyecto.
3. Añade las variables de entorno anteriores y despliega (vuelve a desplegar tras editar variables).
4. Verifica:
   - `https://TU-DOMINIO/` (landing 3D)
   - `https://TU-DOMINIO/studio` (Studio + KAI)
   - `https://TU-DOMINIO/login` (Auth Cloud / Perfil Local Beta)
   - `https://TU-DOMINIO/api/health` (debe reportar `ok: true` y `fallbackProvider: "pollinations-flux-beta"`)

## D. Seguridad

- Nunca pongas el prefijo `NEXT_PUBLIC_` en `GEMINI_API_KEY`, `POLLINATIONS_API_KEY`, `HF_API_TOKEN`, `CLOUDFLARE_WORKERS_AI_TOKEN`, `STUDIO_ACCESS_TOKEN` o `STRIPE_SECRET_KEY`.
- Valida cuotas y tamaño de archivos en el servidor (`6 MB` máximo para referencias PNG/JPG/WebP).
