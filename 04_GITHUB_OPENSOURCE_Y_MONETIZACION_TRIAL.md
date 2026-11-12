# 04. STACK OPEN-SOURCE (GITHUB) & ARQUITECTURA DE MONETIZACIÓN (TRIAL PAGADO 3 DÍAS)

## 1. Auditoría Crítica del "Trial de 3 Días" y del Código Abierto en GitHub

* **[Seguro] El peligro del "Trial Gratis con Tarjeta" en IA Generativa:** Si das 3 días gratis con generación ilimitada (aunque pidas tarjeta), los usuarios intensivos generarán 100 páginas en 48 horas, descargarán los PDFs, cancelarán al día 3 y te dejarán una factura de GPU de US$ 15–25 por usuario más disputas/contracargos.
* **[Seguro] Solución — El "Trial Pagado Micro-Ticket (US$ 2.99 / RD$ 175 por 3 Días con Tope de Tinta)":**
  * Cobras **US$ 2.99 (RD$ 175)** de entrada inmediata (no reembolsable, porque cubre tu costo exacto de servidor GPU durante esos 3 días: ~40 generaciones de viñetas + 2 personajes en el Vault).
  * Si el usuario no cancela antes de las 72 horas, pasa automáticamente al **Plan Mensual Mangaka Pro (US$ 19.99 / RD$ 1,190 al mes)** con 250 créditos de viñetas/mes y descuento en imprenta.
  * **Resultado financiero:** Tu Riesgo de Cómputo (GPU Burn Risk) baja a **CERO**, filtras a los curiosos sin tarjeta y garantizas flujo de caja desde el minuto 1.

---

## 2. Repositorios Open-Source de GitHub (Base Tecnológica para No Empezar de Cero)

En lugar de programar desde cero el lienzo o el motor de consistencia, nuestra arquitectura en GitHub debe apalancarse en estos **5 repositorios open-source probados**:

| Capa del Producto | Repositorio Open-Source en GitHub | Qué Resuelve Exactamente | Licencia / Uso en KAI Studio |
| :--- | :--- | :--- | :--- |
| **1. Lienzo y Editor Web de Viñetas** | `jbilcke-hf/ai-comic-factory` (Next.js + Tailwind + Canvas) | Grilla de páginas de cómic/manga, globos de diálogo vectoriales arrastrables, exportación a PDF e integración con APIs de LLM e imagen. | **Base ideal para hacer Fork del Frontend** (`03_web_studio_app`). |
| **2. Consistencia Secuencial de Personajes** | `HVision-NKU/StoryDiffusion` & `ToTheBeginning/PuLID` | Mantiene el mismo rostro y ropa de múltiples personajes a lo largo de varias viñetas consecutivas sin entrenar un LoRA lento por usuario. | **Motor de inferencia en Backend GPU** (vía Replicate / Fal.ai / RunPod Serverless). |
| **3. Control de Poses y Paneles Manga B/N** | `jianzongwu/DiffSensei` (o `lllyasviel/ControlNet`) | Generación nativa de paneles manga en blanco y negro con control de posición de personajes mediante cajas delimitadoras (*bounding boxes*) y gestos. | **Pipeline especializado de entintado y composición manga**. |
| **4. Detección, Limpieza y Tipografía Manga** | `zyddnys/manga-image-translator` / `dmMaze/BallonsTranslator` | Algoritmos de maquetación automática de texto vertical/horizontal dentro de bocadillos de manga sin pisar el dibujo. | **Módulo de auto-ajuste tipográfico** en español/japonés. |
| **5. Orquestación por Nodos (API Backend)** | `comfyanonymous/ComfyUI` (con `ComfyUI-Manager`) | Permite armar el flujo completo (*Prompt -> PuLID Character -> Manga Lineart -> Screentone Halftone -> Upscale 300 DPI*) y exportarlo como un simple endpoint JSON. | **Cerebro gráfico detrás de KAI Studio**. |

---

## 3. Estructura de Planes, Membresías y Embudo de Conversión (Unit Economics Blindados)

| Escalón del Embudo | Precio | Qué Recibe el Usuario (Límites Duros de GPU) | Costo para Ti (GPU + Pasarela) | Tu Ganancia Neta |
| :--- | :--- | :--- | :--- | :--- |
| **Escalón 0: Demo Instantánea (Sin Tarjeta)** | **US$ 0** | • Diseño de 1 Personaje + 1 Página (4 viñetas) en pantalla.<br>• **Con marca de agua** y sin descarga en alta resolución. | US$ 0.08 | Captación viral (El usuario ve que funciona en 90 segundos). |
| **Escalón 1: Trial "Pase de Estudio 72 Horas"** | **US$ 2.99 (RD$ 175)** *(Pago único de entrada)* | • 3 días de acceso completo al Lienzo y a KAI.<br>• Límite duro: **40 generaciones de viñetas** (1 capítulo corto de 8–10 págs).<br>• Descarga digital PDF limpia.<br>• Si no cancela en 72h -> Pasa a Membresía Pro. | US$ 0.85 GPU + US$ 0.38 Stripe/Azul = **US$ 1.23** | **+US$ 1.76 limpio** desde la prueba (Cero pérdidas por abusadores). |
| **Escalón 2: Membresía "Mangaka Club" (Mensual)** | **US$ 19.99 / mes (RD$ 1,190)** | • **250 créditos de viñetas al mes** (~50 páginas terminadas).<br>• Hasta 10 personajes fijos en el *Character Vault*.<br>• Generador de Cubierta (Portada + Lomo + Contraportada) desbloqueado.<br>• **15% de descuento** en impresiones físicas en RD. | ~US$ 4.50 GPU + US$ 0.90 pasarela = **US$ 5.40** | **+US$ 14.59 / mes (73% Margen SaaS)**. |
| **Escalón 3: Upsell Físico (Checkout de Imprenta RD)** | **RD$ 1,850** (24p Fanzine)<br>**RD$ 3,600** (64p Tankōbon) | • Impresión física real bajo demanda y envío a domicilio en Santo Domingo / Provincias.<br>• *Disponible tanto para suscriptores como para compra directa por proyecto.* | RD$ 450 – RD$ 850 (Imprenta local) | **+RD$ 1,300 a RD$ 2,400 por pedido físico**. |

---

## 4. Reglas Anti-Fuga para la Pasarela de Pago (Stripe / LemonSqueezy / Azul RD)

1. **Pre-autorización transparente en el Trial de 3 Días:** En la pantalla de pago se muestra claro: *"Hoy pagas solo US$ 2.99 (RD$ 175) para desbloquear tus 40 créditos de tinta e imprimir tu primer capítulo. Si te encanta, en 3 días continúa tu membresía Mangaka Pro por US$ 19.99/mes. Cancela con 1 clic en tu perfil."*
2. **Desbloqueo Inmediato por Compra Física (Bypass de Espera):** Si un usuario en el Trial de 3 días quiere mandar a imprimir su tomo físico el mismo Día 1, el botón **"Imprimir mi Tomo Ahora"** cobra el tomo físico de inmediato sin esperar a que terminen los 3 días.
3. **Recarga de "Botes de Tinta" (Top-Ups):** Si un miembro mensual gasta sus 250 viñetas antes de fin de mes, no se le bloquea el estudio; se le vende un **"Bote de Tinta Extra" (100 viñetas por US$ 6.99)** con 75% de margen.
