# Desplegar MANGAI — GitHub + Vercel + Antigravity

## A. Preparar en local o Antigravity

1. Abre la carpeta raíz del repositorio en tu editor o terminal.
2. Ejecuta `npm install` (en Windows PowerShell usa `npm.cmd install`), luego `npm run dev`.
3. Abre `http://localhost:3000` para la landing editorial, `http://localhost:3000/studio` para el taller y `http://localhost:3000/login` para autenticación / perfil local.
4. Copia `.env.example` a `.env.local`; añade tus propias credenciales **SOLO** en `.env.local` (nunca las subas al repositorio).

## B. Variables de Entorno en Vercel

En **Vercel Dashboard → Project → Settings → Environment Variables**, configura según tu despliegue:

### 1. Generación FLUX y asistente KAI

- Las pantallas creativas envían texto y referencias a `POST /api/flux/generate`. El servidor usa el Space público FLUX.2 Klein 4B. Las solicitudes de texto pueden pasar automáticamente al Space FLUX.1 Schnell.
- `HF_API_TOKEN` permite usar la cuota autenticada de Hugging Face Spaces.
- Configura `CLOUDFLARE_ACCOUNT_ID` y `CLOUDFLARE_WORKERS_AI_TOKEN` para activar un segundo proveedor FLUX.2 que también procesa referencias. Usa un token con permiso de inferencia de Workers AI y una cuenta con cuota disponible.
- `GEMINI_API_KEY` habilita el asistente de texto. Las imágenes se generan mediante FLUX.

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
   - `https://TU-DOMINIO/api/health` (debe reportar `ok: true` y `models.image: "FLUX.2 [klein] 4B"`)

## D. Seguridad

- Nunca pongas el prefijo `NEXT_PUBLIC_` en `GEMINI_API_KEY`, `POLLINATIONS_API_KEY`, `HF_API_TOKEN`, `CLOUDFLARE_WORKERS_AI_TOKEN`, `STUDIO_ACCESS_TOKEN` o `STRIPE_SECRET_KEY`.
- Valida cuotas y tamaño de archivos en el servidor (`6 MB` máximo para referencias PNG/JPG/WebP).
