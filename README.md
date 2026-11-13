[MANGAI_README.md](https://github.com/user-attachments/files/34818391/MANGAI_README.md)
# MANGAI Studio · Web Experience + Creator Studio

**Versión 0.4 — noviembre 2026.** Repositorio inicial preparado para **GitHub → Vercel → Google Antigravity**.

Incluye la **landing v0.3 aprobada**, con carrusel 3D, KAI, colección y transiciones, y un nuevo **Creator Studio en Next.js/React** para gestionar lore, personajes, canon y generar imágenes con OpenAI.

## 1. Inicio en tu computadora o Antigravity

Requisitos: Node.js 20.9+ y npm. Abre **esta carpeta raíz** `mangai-studio/` como proyecto en Antigravity.

```bash
npm install
cp .env.example .env.local   # Windows PowerShell: Copy-Item .env.example .env.local
npm run dev
```

Abre `http://localhost:3000` (landing), `http://localhost:3000/studio` (Studio). `http://localhost:3000/api/health` muestra estado básico.

La landing se puede probar sin claves. El Studio guarda **solo datos JSON en localStorage**. Para generar imágenes, agrega a `.env.local`:

```env
OPENAI_API_KEY=sk-...        # Tu propia clave de OpenAI API
OPENAI_IMAGE_MODEL=gpt-image-2.5-flare
STUDIO_ACCESS_TOKEN=un-codigo-largo-privado-que-tu-elijas
```

Reinicia el servidor después de cambiar variables. En `/studio` → **Generar imágenes** escribe el mismo código `STUDIO_ACCESS_TOKEN` en el campo de acceso, elige un personaje y genera. **Nunca ingreses la clave `OPENAI_API_KEY` en el navegador**.

> La API de OpenAI requiere una cuenta con facturación configurada y puede requerir verificación de organización. Los planes de ChatGPT y la facturación de API son independientes. Cada generación puede generar cargos.

## 2. Estructura

```text
mangai-studio/
├── app/
│   ├── layout.tsx                  # Layout de Next.js
│   ├── globals.css
│   ├── studio/
│   │   ├── page.tsx                # Creator Studio React + KAI guiado
│   │   └── studio.css              # UI del estudio
│   └── api/
│       ├── health/route.ts          # Comprobación de configuración
│       └── images/generate/route.ts # OpenAI Images; clave en servidor
├── lib/
│   ├── schema.ts                   # Datos del universo y personajes
│   ├── storage.ts                  # Guardado / exportación local
│   └── prompts.ts                  # Modos de imagen y estilos
├── public/
│   ├── landing/
│   │   ├── index.html              # LANDING ORIGINAL, conservada
│   │   ├── landing.css             # Estilos de la landing
│   │   ├── landing.js              # Movimiento 3D y animaciones
│   │   └── assets/                 # Portadas SVG y capturas
│   └── legacy/
│       └── creator-studio-v02.html # Respaldo del prototipo anterior
├── docs/
│   ├── ARQUITECTURA.md
│   ├── DEPLOY_VERCEL.md
│   ├── ANTIGRAVITY_PROMPT.md
│   └── ROADMAP.md
├── .agent/rules/mangai.md          # Reglas del proyecto para agentes
├── .github/workflows/ci.yml       # Validación automatizada
├── .env.example                    # Nombres de secretos, sin valores
├── next.config.ts                  # / → landing HTML; /studio → React
└── package.json
```

## 3. Lo que funciona

- Landing editorial original, carrusel 3D, KAI animado, vitrina horizontal, mosaico, responsive y CTA a `/studio`.
- Studio simplificado con Settei Hub, fichas de personajes, bloqueo del canon y un checklist de identidad.
- KAI guiado **mediante sugerencias predefinidas**, aún no conversacional real.
- Generación de retratos, hojas de personaje, expresiones y viñetas con API de OpenAI.
- Subir PNG/JPG/WebP como referencia; alternativa de reutilizar la última imagen generada como referencia.
- Descargar ilustración PNG y exportar/importar fichas y lore en formato JSON.
- Ruta del servidor con contraseña temporal, comprobación de tamaño/tipo y clave API oculta.

## 4. Límites de esta versión (importantes)

- **No** hay cuentas de usuario ni base de datos multiusuario: el JSON queda en el navegador y las imágenes únicamente en la sesión actual (descárgalas).
- **No** hay IA conversacional conectada a KAI todavía; KAI es una interfaz de orientación narrativa.
- **No** garantiza consistencia facial al 100%: las referencias y la aprobación del canon aumentan la continuidad, pero cada salida exige revisión editorial.
- **No** hay pagos, market, editor de páginas, exportación PDF de imprenta ni publicación directa en Amazon.
- `STUDIO_ACCESS_TOKEN` es un bloqueo de **demo privada**, **no** una solución segura de autenticación para miles de usuarios. Antes de hacer el Studio público, implementar login (p. ej., Supabase Auth), autorización por proyecto, rate limiting por usuario/IP, colas, cuotas y almacenamiento privado.
- Vercel puede tener límites de duración/cuerpo en funciones según el plan; si una operación tarda demasiado, migrar el procesamiento a un job de fondo. Revisa `maxDuration`.

## 5. Calidad

```bash
npm run typecheck
npm test
npm run build
```

## 6. Dónde editar cada cosa

| Quiero cambiar… | Editar… |
|---|---|
| Carrusel/animaciones del home | `public/landing/landing.js` |
| Tipografía, espacios y colores del home | `public/landing/landing.css` |
| Texto y contenido del home | `public/landing/index.html` |
| Portadas del home | `public/landing/assets/` y `landing.js` |
| Pantallas, navegación y componentes del Studio | `app/studio/page.tsx` |
| Estilos del Studio | `app/studio/studio.css` |
| Fichas de personajes y lore | `lib/schema.ts` |
| Estilos y modos del motor de imágenes | `lib/prompts.ts` |
| Prompt / integración de API OpenAI | `app/api/images/generate/route.ts` |

**Ver detalles del despliegue en [`docs/DEPLOY_VERCEL.md`](docs/DEPLOY_VERCEL.md).**
