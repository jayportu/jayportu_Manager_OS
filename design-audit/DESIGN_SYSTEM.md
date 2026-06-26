# DROP Dark — Mini Design System

Sistema de diseño del rebrand dark de DROP. La **referencia visual viva** son los mockups en `http://localhost:8088/` (o `design-audit/*.html`). Este doc es la fuente de los tokens y reglas para implementarlo.

Dirección: **Dark Premium (base) + acentos Energy** · paleta neutra `#0B0B0B`/`#F7F7F7`/`#7B7B7B` + acento `#E85A0C`.

---

## 1. Tokens de color

```css
/* Superficies (elevación por luz, no por borde) */
--bg:        #0B0B0B;   /* fondo app / página */
--bg-2:      #121212;   /* topbar, zonas recesadas */
--surface:   #161616;   /* cards, paneles */
--surface-2: #1F1F1F;   /* hover / elevación superior */

/* Bordes */
--border:        #2A2A2A;   /* sutil (default) */
--border-strong: #3A3A3A;   /* inputs, divisores marcados */
--divider:       #1B1B1B;   /* líneas finas */

/* Texto */
--text:   #F7F7F7;   /* primario */
--text-2: #B0B0B0;   /* secundario / body largo */
--text-3: #7B7B7B;   /* terciario / labels mono */

/* Acento (naranjo) */
--orange:      #E85A0C;
--orange-hover:#F2742A;
--orange-soft: rgba(232,90,12,.12);   /* fondos suaves, chips */

/* Estados semánticos (≠ acento) */
--success: #70C98B;
--warning: #F5B84B;
--error:   #F06464;
--info:    #6EA8FE;
```

> **Decisión de marca abierta:** en los mockups el acento es `#E85A0C`. El naranjo histórico de marca es `#FF5C00`. Hay que confirmar cuál es el canónico para dark (ver [[drop_brand_identity]]). Lo demás del sistema no cambia.

**Reglas del acento:** solo en acción primaria, estado activo, foco, líneas/indicadores, 1 dato clave por vista, y glow de impacto (hero/press kit/landing). **Nunca** como superficie grande de fondo.

## 2. Tipografía

| Rol | Fuente | Uso |
|---|---|---|
| Display / headings | **Anton** | Titulares, números KPI, nombres |
| Body | **Inter** | Texto, descripciones, UI |
| Mono / data | **Space Mono** | Labels (UPPER + tracking .08–.12em), tags, tickers, datos |
| **Logo** | **Satoshi Black** + punto naranjo | Solo el wordmark "DROP." (ver [[drop_brand_identity]]) |

Escala (clamp para responsive): hero `clamp(48px,8vw,104px)` · H1 `40px` · H2 `26–32px` · body `14–15px` · label mono `10px`. `line-height` display `.9–.98`, body `1.5–1.65`. `text-wrap:balance` en titulares.

## 3. Espaciado · radios · sombras

- **Espaciado** (escala 4px): 4 · 8 · 12 · 14 · 18 · 24 · 30 · gap de grillas 14–16. Layout con `flex/grid` + `gap` (no márgenes sueltos).
- **Radios:** `--r-sm 8px` · `--r 12px` · `--r-lg 16–18px` · pills `9999px`. (Suaviza el brutalist 0px sin perder carácter.)
- **Sombras / elevación:** `--sh-card: 0 4px 16px -8px rgba(0,0,0,.6)`. Glow de acento (impacto): `0 24px 60px -22px rgba(232,90,12,.5)`.
- **Bordes:** 1px (no 2px). Sutiles; la jerarquía la da la **elevación de superficie**, no el borde.

## 4. Componentes (specs)

- **Botón** — `font-mono 11px UPPER tracking .07em`, `radius 10px`, `height 38/44/52`. Variantes: **primary** (bg `--orange`, texto `#0a0a0a`), **secondary** (transparente, borde `--border-strong`, hover borde naranjo), **ghost** (sin borde), **danger** (`--error`). Estados: hover, **focus-visible (anillo naranjo)**, disabled (.4 opacity), loading (spinner). *Un solo primario* (se elimina la ambigüedad negro/naranjo del sistema actual).
- **Card / KPI** — `--surface` + borde `--border` + `--sh-card`, radius `--r`. KPI **unificada**: número grande Anton + label mono; acento solo en 1–2 métricas clave (línea superior naranja + número naranjo). Sin "arcoíris".
- **Inputs / select / textarea** — bg `--bg-2`, borde `--border-strong`, radius `--r-sm`; focus borde `--orange` + ring `--orange-soft`. Label mono UPPER arriba.
- **Tabs** — pill (activo bg naranjo) o subrayado naranjo. Para navegación de secciones (press kit) y feature-tabs del landing.
- **Badges / chips** — pill, mono 10px UPPER. Estado con color semántico + **texto** (no solo color). Score: naranjo (alto) / verde (medio).
- **Toggle** — track `--surface-2` → `--orange` activo; knob blanco→ink.
- **Modal** — overlay `rgba(0,0,0,.7)` + blur; card `--surface`, radius `--r-lg`; header con título Anton + X; footer con acciones (cancelar ghost / guardar primary). Guardar → **toast** de éxito.
- **Toast** — esquina inferior; borde-izq color semántico; auto-dismiss ~2.6s.
- **Tabla** — header mono UPPER `--text-3`; filas separadas por `--divider` (no doble borde); hover `--surface-2`. En móvil → tarjetas.
- **Lightbox (galería)** — abre desde el thumb (FLIP), X + flechas + contador; cierra volviendo a su lugar.
- **Estados vacíos** — borde dashed `--border-strong` + ícono + copy + CTA.
- **Sidebar** — `#0A0A0A`, borde-der naranjo, bloque manifiesto, ítems mono UPPER (activo = bloque naranjo o, en minimal, texto naranjo + borde-izq). Móvil → drawer (hamburguesa) con `aria-modal`.

## 5. Motion

- **Principio:** solo `transform`/`opacity` (GPU). **Nada de `filter:blur` ni `mix-blend-mode` animados** (causan tirones — lección de esta sesión).
- **Luz del hero:** `<canvas>` a baja resolución + `requestAnimationFrame` (1 capa, barato a cualquier tamaño/Retina).
- **Titular:** cross-dissolve entre dos capas apiladas (`inline-grid`).
- **Scroll-reveal:** `IntersectionObserver` → clase `.in` (opacity+translateY).
- **Siempre** respetar `@media (prefers-reduced-motion: reduce)` (apagar animaciones).

## 6. Responsive

- Breakpoint app: **920px** (sidebar → hamburguesa drawer). Landing: **820px**.
- KPIs: 4-col → 2-col (móvil). Paneles: 2-col → 1-col. Tablas → tarjetas.
- Unidades relativas, `max-width:100%` en media, contenido ancho con `overflow-x:auto` propio (el body nunca scrollea horizontal).

## 7. Accesibilidad (resumen — detalle en [ACCESIBILIDAD.md](ACCESIBILIDAD.md))

- Contraste AA: el dark **mejora** el naranjo (≈5.5:1 sobre `#0B0B0B` vs ≈3:1 sobre cream).
- Foco visible (anillo naranjo) en todo lo interactivo; el `ring-offset` debe ser token dark (no cream).
- Áreas táctiles ≥44px en móvil (hoy hay botones de 38px → subir).
- Color nunca como único indicador (acompañar con texto/ícono).
