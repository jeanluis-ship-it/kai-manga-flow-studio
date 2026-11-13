# Mangai / KAI Studio — Arquitectura Técnica y Especificación del Sistema (Miro Board v6.0)

> **Fuente:** Arquitectura Completa del Tablero en Miro (5 Frames: Tankōbon Preprensa, Settei → KAI Render Engine, Koma State Machine, Service Blueprint y Frame 0 Leyenda).

---

## 1. Frame 0 · Leyenda y Tokens Semánticos del Ecosistema

| Rol en el Ecosistema | Color Semántico | Hex | Implementación en MANGAI Studio |
| :--- | :--- | :--- | :--- |
| **Acción del Mangaka** | Azul Cian | `#06B6D4` | Selección de Koma, trazo manual en capa `L0` (*Nemu_Blue_Draft*), cursores e inputs creativos. |
| **Interfaz / Canvas** | Blanco / Neutro | `#FFFFFF` / `#F8FAFC` | Paneles laterales, modales y mesa de corte. |
| **KAI / Motor IA** | Violeta | `#8B5CF6` | Compilador KAI Middleware (`N1+N2`), selector de motores IA, postprocesador y control de consistencia. |
| **Supabase / Estado** | Verde | `#10B981` | Entidades `Settei` sincronizadas, `character_id`, `visual_anchors` y Komas aprobadas (`KOMA_LOCKED`). |
| **Validación / Alertas** | Ámbar | `#F59E0B` | Gates de validación (`D3: ¿Ritmo Nemu aprobado?`, `D5: ¿Textos dentro de Naiwaku?`, alerta >7 viñetas). |

---

## 2. Pipeline `SETTEI → KAI → RENDER ENGINE → POSTPROCESADOR` (En Bucle)

1. **SETTEI (Supabase / Persistencia):** `character_id`, `character_name`, `visual_anchors[]`, `turnaround_sheet_url`, `style_preset`.
2. **CANVAS STATE:** `panel_aspect_ratio`, `camera_angle`, `rough_sketch_mask` (capturado del lienzo `L0`), y `bubble_reserved_zone` (zona reservada para globos `L5`).
3. **KAI MIDDLEWARE:** Compila `N1 (Capítulo) + N2 (Página) + Acción del Guion + Settei + Canvas State`.
4. **RENDER ENGINE:** Ejecuta en `Standard Trial/Starter`, `Nano Banana 2 HD (Pro/Master)` o el motor seleccionado en el banco de pruebas.
5. **POSTPROCESADOR:** Aplica binarización de luminancia (línea pura B/N) + tramas semitono (*screentones*) e integra en capa `L2` / `L1`.
6. **CONTROL DE CONSISTENCIA:** Compara la viñeta generada contra las `visual_anchors` del *Settei* con opción de **Aceptar Viñeta** o **Reintentar con Reinyección de Referencia**.

---

## 3. Máquina de Estados de Viñeta (`KOMA STATE MACHINE · S0 → S5`)

* **`S0 · KOMA_VACIO`:** Marco, proporción (`panel_aspect_ratio`), ángulo de cámara, guion y zona reservada de globo (`bubble_reserved_zone`).
* **`S1 · KOMA_NEMU`:** Boceto azul en `L0` + globo fantasma + bifurcación:
  * **Ruta Manual:** Dibujo directo con `G-Pen` / `Maru-Pen` sobre el lienzo.
  * **Ruta IA:** Boceto `L0` + `@Personaje` + `KAI Middleware`.
* **`S2 · KOMA_PEN_IRE`:** Arte entintado B/N en `L2` + *clipping mask* + binarización postprocesada.
* **`S3 · KOMA_TONE_FX`:** Tramas (`15%`, `30%`, `60%`, `Degradado`) en `L1` + líneas cinéticas en `L3`.
* **`S4 · KOMA_SHIAGE`:** Diálogos definitivos en `L5` + onomatopeyas (`Kakimoji`) en `L4` + validación `D5` (Naiwaku).
* **`S5 · KOMA_LOCKED`:** Viñeta protegida con candado (`#10B981`) lista para preprensa.

---

## 4. Pila Estricta de 7 Capas (`L6` → `L0`) y Preprensa `Tankōbon`

1. **`L6 · UI_Guides_Overlay`** *(Amarillo — Solo pantalla; se oculta automáticamente al exportar)*
2. **`L5 · Text_and_Balloons`** *(Imprimible — Globos y textos vectoriales)*
3. **`L4 · SFX_Kakimoji`** *(Imprimible — Onomatopeyas)*
4. **`L3 · Panel_Borders_and_Kinetic_FX`** *(Imprimible — Marcos 0.8mm + líneas de velocidad)*
5. **`L2 · Ink_and_Art`** *(Imprimible — Arte final manual o IA)*
6. **`L1 · Screentones_and_Beta`** *(Imprimible — Tramas y rellenos negros bajo tinta)*
7. **`L0 · Nemu_Blue_Draft`** *(Amarillo — Boceto azul no imprimible; se oculta automáticamente al exportar)*

### Fórmula de Lomo Mecánico
$$\text{Grosor del lomo (mm)} = \left(\frac{\text{Total de páginas}}{2}\right) \times \text{Grosor del papel (mm)}$$
