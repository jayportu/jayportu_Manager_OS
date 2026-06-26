# Benchmark — MavelPoint · Fase 2

- **Fecha:** 2026-06-25 · **Método:** Playwright read-only sobre `www.mavelpoint.com/es/` (cookies rechazadas)
- **Qué es:** plataforma EPK / "link-in-bio" para DJs y artistas de música electrónica. Competidor directo de DROP en el press kit público.
- **Modelo:** **freemium** ("Únete gratis", sin página de precios) — vs suscripción de DROP.
- **Arquitectura:** marketing en `www.mavelpoint.com/es/` · app en subdominio aparte `app.mavelpoint.com`. Multi-idioma (EN/ES/DE/FR/NL).
- **Cobertura:** landing, página pública de artista (EPK: overview/gallery/events), feature "Local Circuit", responsive móvil. **Interior (dashboard/editor/onboarding) = requiere login** (ver nota al final).
- Screenshots: `design-audit/mavelpoint/`.

---

## Lenguaje visual de MavelPoint

| Dimensión | Observado |
|---|---|
| **Color base** | Dark navy uniforme (~`#0E1117`), cards elevadas un punto más claro (~`#1A1F2B`) |
| **Acento** | **Verde lima/chartreuse** (~`#C2F73A`), usado con moderación: CTAs, tab activo, números, highlights. Más tintes (magenta/rojo/azul) desde las fotos |
| **Bordes** | Finos, 1px, bajo contraste (~`#252B38`) — definen sin pesar |
| **Radius** | Redondeado ~12–16px en cards; pills (rounded-full) en tabs y botones |
| **Sombras** | Elevación sutil + glows suaves alrededor del acento |
| **Tipografía** | Grotesk **bold** para títulos (limpia, no condensada) + sans regular en cuerpo + eyebrows mono/uppercase. Usan punto final en nombres ("Anna Tur.", "Local Circuit.") — mismo gesto que "DROP." |
| **Iconografía** | Line icons finos (social, features) |
| **Imagery** | **Foto-forward**: retratos con luz de color, grids B&W de galería, thumbnails de video prominentes |
| **Motion** | Scroll-reveal suave (secciones que entran con fade/slide) |
| **Identidad** | Gráfico de **red de nodos conectados** (Local Circuit) = comunidad/conexión |

**Estructura del EPK público (Anna Tur):** header con nombre grande + redes + foto con luz de color → tabs (Resumen/Galería/Eventos) → bio + tags → Vídeos → Tracks & Live Sets → Eventos destacados → Próximos eventos → Galería → Artículos de prensa → Rider técnico (fotos de CDJs). **Casi el mismo contenido que el press kit de DROP**, pero foto-forward y dark.

---

## Clasificación de hallazgos

### 1) Ideas que podemos **adoptar**
- **Dark con jerarquía de elevación** (escala de superficies), no "negro plano".
- **Cards redondeadas elevadas + borde sutil de bajo contraste** (vs el 2px duro de DROP).
- **Acento con moderación** — ellos verde, nosotros naranjo. Valida tu regla "no abuses del naranjo".
- **Tabs tipo pill** para la navegación del press kit.
- **Press kit foto-forward / media-rich**: videos y tracks embebidos con protagonismo.
- **Scroll-reveal sutil** en marketing.
- **Eyebrows mono/uppercase** (DROP ya lo hace — reforzarlo).

### 2) Ideas que debemos **adaptar**
- Su grotesk bold → DROP **mantiene Anton** (más carácter) pero adopta su **aire/espaciado generoso**.
- El **gráfico de red/nodos** → reinterpretar como **ondas/frecuencias/puntos conectados** con identidad DROP (Fase 6).
- La idea de **"directorio vivo / descubrimiento"** → adaptar el concepto, no el modelo freemium.

### 3) Ideas que **no conviene** usar
- **Verde lima** como color (no es DROP; DROP es naranjo).
- **Exceso de glow/suavidad** que diluye carácter (DROP apunta a brutalist-**premium**, más afilado).
- **Multi-idioma** ahora (DROP enfocado LATAM/español).
- Densidad excesiva de secciones de marketing.

### 4) Funciones que **DROP ya resuelve mejor**
- **CRM real** con scoring automático + pipeline (MavelPoint es EPK/vitrina; DROP es OS de gestión).
- **Calendario con $** (cobrado/pendiente) — gestión de carrera, no solo showcase.
- **Growth tracking** (followers/posts/ads).
- **Smart Match** estructurado + presencia **● LIVE**.
- **Tech rider como stage-plot editable** (no solo fotos de gear).

### 5) Oportunidades para **diferenciarnos**
- Posicionamiento **"el DJ en control / OS de gestión"**: DROP hace el trabajo, no solo se ve bonito.
- **Carácter tipográfico fuerte** (Anton brutalist-premium) vs grotesk genérico.
- **Naranjo energético + dark** = identidad propia, distinta del verde frío.
- **Datos/score/pipeline visibles** = utilidad como estética.

---

## Tabla comparativa · DROP vs MavelPoint (entregable #3)

| Dimensión | DROP (hoy) | MavelPoint | Implicación para el rebrand |
|---|---|---|---|
| Tema base | Cream claro + sidebar oscuro (híbrido) | Dark navy uniforme | **Unificar a dark con elevación** |
| Acento | Naranjo `#FF5C00` | Verde lima | **Mantener naranjo** (identidad) |
| Bordes | 2px ink duros | 1px sutil bajo contraste | **Suavizar** |
| Radius | 0 (brutalist) | ~12–16px | **Radius leve** en app (10–14px) |
| Tipografía | Anton + Inter + Mono | Grotesk bold + sans | **Mantener Anton** + más aire |
| Cards | Blancas, 2px, sin sombra | Elevadas, redondeadas, glow sutil | **Elevación por luz, no por borde** |
| Imagery | Document-like, texto-forward | Foto-forward, media-rich | **Más protagonismo a foto/media** |
| Motion | Mínimo (strobe del logo) | Scroll-reveal suave | **Microinteracciones sutiles** |
| Producto | OS de gestión (CRM/cal/growth) | EPK / link-in-bio | **DROP hace más → mostrarlo** |
| Modelo | Suscripción $9.990 | Freemium | (negocio, no diseño) |

**Síntesis:** MavelPoint valida la dirección **dark + acento moderado + elevación + foto-forward**. DROP debe tomar ese marco pero **reinterpretarlo con su naranjo, su Anton y su carácter más afilado**, y apoyarse en su ventaja real: es un **OS de trabajo**, no solo una vitrina. No copiamos color, tipografía, copys, íconos ni layouts: tomamos **patrones**.

---

## Interior de la app (`app.mavelpoint.com`) — auditado

> Cuenta de prueba creada por Jaime (Jaime navegó registro/términos; yo completé el onboarding con datos ficticios, sin tocar pago/clave). Screenshots `mp-10`…`mp-25`.

**Onboarding:** multi-paso (Rol → Nombre → Información/Ubicación), layout split **foto a la izquierda / formulario a la derecha**, dark, acentos verdes, barra de progreso. Modal de aceptación de Términos con check + CTA verde. Limpio y guiado.

**IA interna (sidebar):** Panel · Perfil (General/Biografía/Redes sociales) · Galería (Imágenes/Videos/Inbox "próximamente") · Música (tracks & live sets) · Calendario (eventos) · Artículos de prensa · Local Circuit · MavelTree/Enlaces · Ver y Compartir · Preferencias · Soporte.

**Lo más relevante para el rebrand del *interior* de DROP:**
- **Dashboard calmado y anti-fatiga:** dark uniforme, muchísimo aire, card "Mi semana" + "Acciones rápidas" en tiles. Acento verde **solo** en activo/CTAs. Es el contraste exacto con el dashboard cream + "arcoíris de KPI cards" de DROP.
- **Editor de perfil por tarjetas + "Editar" inline** (Información general, Ubicación, Géneros, Rango de BPM) en vez de un formulario largo único → menos abrumador. **Adoptable** para `/perfil` y el editor de press kit de DROP.
- **Portada de perfil con patrón de ondas de sonido** (líneas de frecuencia verdes) → identidad sonora ya aplicada. **Valida la Fase 6** (ondas/frecuencias) de DROP.
- **Estados vacíos ilustrados** (tracks, códigos de industria): ilustración + copy cálido + CTA. Muy por encima de los recuadros vacíos del press kit de DROP.
- **Perfil público vs "Perfil de Industria" + códigos de acceso:** su gating a la industria/bookers. DROP ya gatea el contacto a bookers (concepto comparable; DROP lo resuelve server-side, más simple para el DJ).
- **MavelTree:** link-in-bio auto-actualizable integrado (feature que DROP no tiene como tal; el press kit de DROP cumple rol parecido).

**Adoptar (suma del interior):** dashboard dark calmado con jerarquía de elevación · editor por tarjetas con edición inline · estados vacíos ilustrados · portada/acentos con ondas de sonido.
**DROP ya gana (confirmado por dentro):** MavelPoint no tiene CRM con scoring, ni calendario con $ cobrado/pendiente, ni growth tracking. Es una **vitrina muy pulida**; DROP es un **OS de gestión**. El rebrand debe darle a ese OS el mismo nivel de calma visual que la vitrina de MavelPoint, sin perder la utilidad.
