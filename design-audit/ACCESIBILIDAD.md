# Informe de accesibilidad — DROP Dark (WCAG 2.2 AA)

Evaluación de la paleta y patrones del rebrand dark contra WCAG 2.2 nivel AA. Aplica a los mockups y es la guía para la implementación.

## 1. Contraste de color (1.4.3 / 1.4.11)

Paleta v2 sobre fondo `--bg #0B0B0B`:

| Par | Ratio aprox. | Estándar | Resultado |
|---|---|---|---|
| Texto `#F7F7F7` / bg `#0B0B0B` | **18.7:1** | AA 4.5 | ✅ AAA |
| Texto-2 `#B0B0B0` / bg | **9:1** | AA 4.5 | ✅ AAA |
| Texto-3 `#7B7B7B` / bg | **4.7:1** | AA 4.5 | ✅ AA (justo — usar solo en labels/datos, no en párrafos largos) |
| Acento `#E85A0C` / bg | **5.5:1** | AA 4.5 | ✅ AA (texto y large) |
| Ink `#0A0A0A` / botón naranjo `#E85A0C` | **5.5:1** | AA 4.5 | ✅ AA (texto de botón primario) |
| Texto `#F7F7F7` / surface `#161616` | **16:1** | AA 4.5 | ✅ AAA |

**Hallazgo clave:** el naranjo cumple AA en dark; **en el tema cream actual fallaba (~3:1)** como texto. El rebrand *mejora* la accesibilidad del color de marca.
**Watch:** `#7B7B7B` queda al límite (4.7:1) — reservarlo para labels/datos cortos; para body usar `#B0B0B0`. Bordes/`--divider` son no-texto (decorativos), exentos.

## 2. Foco visible (2.4.7 / 2.4.11)

- Todo lo interactivo debe tener **foco visible**: anillo `2px` naranjo + offset. El botón shadcn ya lo trae (`focus-visible:ring`), pero el `ring-offset` está hardcodeado a **cream** → cambiar a token dark (`--bg`) o se ve mal/invisible.
- Targets enfocables: links de nav, tabs, FAQ (`<summary>`), inputs, toggles, cards clickeables.

## 3. Navegación por teclado (2.1.1)

- FAQ usa `<details>/<summary>` → **accesible por teclado nativo** ✅.
- Lightbox de galería: cierra con **ESC** y navega con **flechas ← →** ✅ (en el mock). Falta: foco-trap dentro del lightbox/modal y devolver el foco al thumb al cerrar (implementar en la versión real).
- Tabs de features: hoy son `<button>` (focusables) ✅; agregar `role="tab"`/`aria-selected` + flechas para patrón ARIA tabs completo.

## 4. Movimiento (2.3.3 Animation from Interactions)

- Toda animación (luz del hero, cross-dissolve, scroll-reveal) **respeta `prefers-reduced-motion: reduce`** → se apaga ✅.
- Nada parpadea >3 veces/seg (sin riesgo de fotosensibilidad 2.3.1) ✅.

## 5. Áreas táctiles (2.5.8 Target Size — nuevo en 2.2)

- Mínimo recomendado **24×24 CSS px** (AA) / 44px ideal. Botones del sistema: 38/44/52px de alto ✅ (los de 38 cumplen AA pero **subir a ≥44 en móvil**). Iconos-botón y chips pequeños: verificar ≥24px de área tocable.

## 6. Color no como único indicador (1.4.1)

- Estados de pipeline/score: además del color, hay **texto/número** (Confirmado, 100, etc.) ✅.
- KPIs con acento: el dato + label lo explican, no solo el color ✅.

## 7. Formularios y etiquetas (1.3.1 / 3.3.2 / 4.1.2)

- Todo input lleva `<label>` visible (mono UPPER). En la implementación: asociar `for`/`id`, y mensajes de error con texto claro (qué pasó + cómo arreglarlo), no solo borde rojo.

## 8. Semántica / lectores de pantalla (1.3.1 / 4.1.2)

- Usar landmarks (`<header> <nav> <main> <footer>`), un solo `<h1>` por página, jerarquía de headings correcta.
- Drawer móvil: `role="dialog"` + `aria-modal="true"` + `aria-label` ✅ (ya en el componente actual).
- Iconos decorativos `aria-hidden`; íconos-botón con `aria-label`.
- El `<canvas>` del hero es decorativo → `aria-hidden="true"` (agregar).

## Checklist para implementación
- [ ] `ring-offset` del foco → token dark
- [ ] Botones interactivos ≥44px en móvil
- [ ] Foco-trap + retorno de foco en modal/lightbox
- [ ] `role=tab`/`aria-selected` en feature-tabs
- [ ] `aria-hidden` en canvas y SVG decorativos; `aria-label` en icon-buttons
- [ ] `#7B7B7B` solo en labels (no párrafos)
- [ ] Validar con Lighthouse/axe (chrome-devtools MCP) en el entorno real
