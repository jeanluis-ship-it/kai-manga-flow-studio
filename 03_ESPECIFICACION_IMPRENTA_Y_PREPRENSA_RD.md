# 03. ESPECIFICACIÓN TÉCNICA DE IMPRENTA Y PRE-PRENSA EN REPÚBLICA DOMINICANA

## 1. Reglas Físicas de Encuadernación (Para Cotizar con Imprentas en SD/Santiago)

* **[Seguro] Prohibido ofrecer lomo cuadrado en menos de 48 páginas:**
  * **Formato A — "One-Shot / Fanzine" (16 a 36 páginas):** Encuadernación a caballete (**2 grapas metálicas al centro**). Tiene que ser obligatoriamente **múltiplo de 4 páginas** (16, 20, 24, 28, 32, 36). No lleva texto en el lomo.
  * **Formato B — "Tankōbon Estándar" (64 a 192 páginas):** Encuadernación **Rústica Fresada (Pegado térmico EVA o PUR)**. Tiene que ser múltiplo de 4 (o de 8 según el pliego de la máquina digital Konica Minolta / Xerox Iridesse / HP Indigo de la imprenta local).

---

## 2. Fórmula Matemática para el Generador Automático de Cubiertas (Portada + Lomo + Contraportada)

Para la pestaña **"3. Portada e Imprenta RD"** que pediste en el Turno 10 de tu sesión, el sistema no puede inventar el ancho del lomo: debe calcularlo dinámicamente según el número de páginas y el gramaje del papel:

$$\text{Ancho del Lomo (mm)} = \left(\frac{\text{Total de Páginas}}{2}\right) \times \text{Espesor por Hoja (mm)} + 0.5\text{ mm (pegamento)}$$

### Tabla de Calibres Reales (Papel Ahuesado / Bond Crema 80g–90g):
* **Espesor medio por hoja (Papel Ahuesado/Avena 90g con *bulk* 1.3):** $0.115\text{ mm}$ por hoja.
* **Ejemplo 64 páginas (32 hojas):** $32 \times 0.115 + 0.5 = \mathbf{4.18\text{ mm de lomo}}$.
* **Ejemplo 120 páginas (60 hojas):** $60 \times 0.115 + 0.5 = \mathbf{7.40\text{ mm de lomo}}$.
* **Ejemplo 192 páginas (96 hojas):** $96 \times 0.115 + 0.5 = \mathbf{11.54\text{ mm de lomo}}$.

### Dimensiones Exactas del Lienzo de Cubierta Desplegada (Spread de Imprenta):
Para un Tankōbon de $127\text{ mm} \times 190\text{ mm}$ con sangrado (*bleed*) perimetral de $3\text{ mm}$:
* **Ancho Total del Lienzo (mm):**
  $$\text{Ancho Total} = 3\text{ (sangrado izq)} + 127\text{ (tapa frontal/trasera)} + \text{Lomo} + 127\text{ (tapa opuesta)} + 3\text{ (sangrado der)}$$
  *(Nota: En sentido de lectura oriental RTL, la Portada Principal va a la IZQUIERDA del pliego extendido y la Contraportada va a la DERECHA).*
* **Alto Total del Lienzo (mm):**
  $$\text{Alto Total} = 3\text{ (sangrado sup)} + 190 + 3\text{ (sangrado inf)} = 196\text{ mm}$$

---

## 3. Ficha Técnica Lista para Enviar a Imprentas Locales (Copy-Paste para WhatsApp/Correo)

Usa esta especificación exacta al pedir cotizaciones por escalas (1, 10, 25, 50 y 100 ejemplares):

> **SOLICITUD DE COTIZACIÓN — LÍNEA EDITORIAL MANGA (IMPRESIÓN DIGITAL BAJO DEMANDA)**
>
> * **Producto 1: Formato One-Shot (24 páginas interiores + portada)**
>   * **Tamaño cerrado:** 12.7 cm × 19.0 cm (Tamaño abierto: 25.4 cm × 19.0 cm + 3 mm de sangrado).
>   * **Interior:** 24 páginas en Blanco y Negro (1x1 tinta negra pura K100), papel Bond Ahuesado / Crema de 80g o 90g.
>   * **Portada:** 4x0 (Full color exterior, blanco interior), Cartulina Sulfatada C1S calibre 12 o 300g con Laminado Mate.
>   * **Terminación:** Doblado y engrapado al centro a caballete (2 grapas) y refilado a formato final.
>   * **Escalas a cotizar:** 1 ejemplar (muestra), 10 ejemplares, 25 ejemplares y 50 ejemplares.
>
> * **Producto 2: Formato Tankōbon (64 páginas interiores + portada con lomo)**
>   * **Tamaño cerrado:** 12.7 cm × 19.0 cm.
>   * **Interior:** 64 páginas en Blanco y Negro (1x1), papel Bond Ahuesado / Crema 80g-90g.
>   * **Portada:** 4x0 con lomo calculado (~4.2 mm), Cartulina Sulfatada 300g con Laminado Mate.
>   * **Terminación:** Rústica fresada (pegado térmico al lomo en caliente) y refilado por 3 lados.
>   * **Escalas a cotizar:** 1 ejemplar, 10 ejemplares, 25 ejemplares y 50 ejemplares.
