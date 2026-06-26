# Auditoría UX/UI — DROP · Fase 1

- **Fecha:** 2026-06-25
- **Rama:** `design/drop-dark-rebranding` (cero cambios en prod)
- **Entorno:** local `localhost:3010` (mismo código que main) · navegación read-only con Playwright
- **Método:** recorrido en vivo (Playwright, desktop 1440 + móvil 393) + lectura de código (tokens y componentes)
- **Cobertura:** 5 perfiles · 30+ pantallas
  - **No registrado / público:** landing, beta, login, signup DJ, signup booker, forgot-password, directorio `/dj`, `/dj/ciudad/*`, `/dj/genero/*`, press kit público `/p/*`, eventos, terms, privacy
  - **DJ / artista (autenticado):** dashboard, perfil, press-kit (editor), calendario, CRM, CRM detalle, campañas, growth, configuración
  - **Booker:** auditado por **código fuente** (tu cuenta es DJ+admin → `/booker/*` redirige a `/dashboard`; además el booker está en pausa por estrategia)
  - **Admin:** backoffice (usuarios), pulso, beta-requests, tráfico

> Screenshots en `design-audit/screenshots/` con prefijo `d__` (desktop) y `m__` (móvil).

---

## Resumen ejecutivo

**La tesis del rebrand está confirmada y es más simple de lo que parece:** DROP hoy es un **híbrido de sidebar oscuro + contenido cream brillante**. La fatiga visual no viene del brutalismo en sí (que en el marketing funciona y da personalidad), sino de **trabajar largo rato sobre superficies cream (#F4EFE7) cruzadas por bordes negros 2px**, con un sidebar oscuro al lado que crea un contraste duro permanente.

Tres hechos que orientan todo el rebranding:

1. **El dark ya está en el ADN de DROP.** El sidebar es oscuro (`bg-ink`), el hero del press kit es oscuro, el footer es oscuro, el CTA de login es negro. El dark no se "impone": se **extiende** lo que ya existe.
2. **El sidebar ya es una paleta dark hecha a mano** — con hex sueltos (`#161616`, `#2a2a2a`, `#aaa`, `#555`, `#666`). El rebrand **formaliza en tokens** ese dark improvisado.
3. **El theming está partido.** Los 6 primitivos shadcn usan CSS variables; el grueso de la app usa **tokens hex fijos** (`bg`, `fg`, `border-ink`, `bg-white`, `bg-cream`, `bg-orange`). Por eso el dark **no es "activar `.dark`"** — hay que migrar esos tokens a CSS-variable-driven. Ese es el verdadero trabajo técnico.

La arquitectura de información es **sólida** (header → KPIs → contenido, navegación clara, buenos estados vacíos). Lo que cansa y se ve inconsistente es el **tratamiento de color, superficies y bordes**. Eso es justo lo que un design system dark bien tokenizado arregla de raíz.

---

## Hallazgos por gravedad

### 🔴 CRÍTICO

**C1 · Tokens de color hardcodeados (bloquea el dark theming)**
`tailwind.config.ts` + componentes usan hex fijos: `Card` = `border-2 border-ink bg-white`; botones = `bg-ink text-orange`; fondos `bg-cream`, etc. Solo los primitivos shadcn leen CSS vars.
→ *Por qué importa:* sin pasar estos tokens a CSS variables, el dark exige reescribir clases pantalla por pantalla. **Es el bloqueante #1 del rebranding** y define el plan de migración.
→ *Recomendación:* introducir escala de tokens semánticos (`--surface-1/2/3`, `--text-1/2/3`, `--border-subtle/strong`, `--accent`) y reapuntar los tokens Tailwind existentes a esas vars, **sin renombrar clases** (preserva toda la app).

**C2 · Fatiga visual estructural (motivo del encargo)**
Todas las superficies de trabajo `(app)` son cream brillante + bordes 2px ink, junto a un sidebar oscuro. Rutas: `/dashboard`, `/perfil`, `/crm`, `/calendario`, `/press-kit`, `/growth`, `/configuracion`.
→ *Por qué importa:* contraste duro permanente + "boxiness" del doble borde = cansancio en sesiones largas (que es donde el DJ vive el "OS").
→ *Recomendación:* invertir a superficies oscuras con **jerarquía de elevación** (no "negro plano"), bordes finos de bajo contraste, y naranjo reservado a acción/acento.

### 🟠 ALTO

**A1 · "Arcoíris" de KPI cards inconsistente**
Las tarjetas de stats usan fondos llenos distintos según pantalla: dashboard (negro/naranjo/blanco/naranjo), calendario (verde/blanco/naranjo/negro), CRM (blanco/naranjo/blanco/negro)… pero en **admin son todas blancas y uniformes**. Rutas: `/dashboard`, `/calendario`, `/crm` vs `/admin`.
→ *Por qué importa:* dos sistemas visuales distintos para el mismo componente; sobreuso de color saturado como superficie grande (rompe "no abusar del naranjo").
→ *Recomendación:* un solo patrón — card oscura elevada con **número grande + acento de color en el dato**, no en todo el fondo.

**A2 · Botón primario ambiguo (dos "primarios")**
`button.tsx` define `default` (negro + texto naranjo) **y** `orange` (naranjo + texto negro), usados indistintamente: login/calendario usan negro, CRM usa naranjo.
→ *Por qué importa:* el usuario no aprende a reconocer "la acción principal".
→ *Recomendación:* **un** primario inequívoco; el otro pasa a secundario fuerte con regla de uso.

**A3 · 404 sin marca + `/signup` DJ roto**
`/signup` (DJ) devuelve el **404 crudo de Next.js** (cream, "This page could not be found", sin nav ni marca). No redirige a `/beta` ni explica el acceso por invitación.
→ *Por qué importa:* rompe el embudo de adquisición de DJs y la marca en un punto de entrada real.
→ *Recomendación:* página 404 con identidad DROP + `/signup` → redirect a `/beta` (o mensaje "acceso por invitación").

**A4 · Directorio público a medio llenar**
Muchos DJs sin foto → dominan tarjetas de **iniciales sobre negro**. Rutas: `/dj`, `/dj/ciudad/*`, `/dj/genero/*`.
→ *Por qué importa:* es la cara pública + SEO; se ve incompleto y pierde gancho ante bookers.
→ *Recomendación:* placeholder más rico (patrón de ondas/gradiente por género), incentivar foto en onboarding, y orden que priorice perfiles completos (ya existe Smart Match → reusar señal de completitud).

### 🟡 MEDIO

**M1 · Títulos de página con casing inconsistente** — mezcla Anton ALL-CAPS ("AGENDA.", "05 CONTACTOS.", "O SEGUIDORES.") con sentence case ("Perfil", "Configuración"). Unificar a un solo patrón de page-title.

**M2 · Estados vacíos rotos en press kit** — la sección MÚSICA muestra recuadros vacíos con borde que parecen error (`/p/*`, `/press-kit`), mientras growth/eventos/dashboard tienen buenos estados vacíos con borde dashed + CTA. Unificar al patrón bueno.

**M3 · Densidad de bordes 2px en tablas/listas** — en CRM, admin y calendario el doble borde por fila/celda genera ruido. Pasar a separadores finos de bajo contraste + hover de fila.

**M4 · Grises ad-hoc en el dark del sidebar** — `#161616`, `#2a2a2a`, `#aaa`, `#555`, `#666`, `#333` sin escala de tokens (`sidebar.tsx`, `mobile-menu.tsx`). Sistematizar en la escala dark.

**M5 · Superficies naranjas grandes** — bloque "EL DJ EN CONTROL" del sidebar, KPI cards naranjas, card "MODO ACTUAL · PDF propio". Reducir a acento/borde/línea.

### 🔵 BAJO

**B1 · Botón FEEDBACK flotante** se solapa con contenido y toasts en la esquina inferior derecha (global). *(El círculo "N" de las capturas es el indicador de Next.js en dev, no es UI real.)*

**B2 · Toast "Sincronizando…"** tapa el botón feedback en `/calendario`.

**B3 · `/suscripcion` y `/cuenta-suspendida`** redirigen a `/login` en vez de un estado/mensaje público (verificar si es intencional).

**B4 · Scrollbar y `::selection`** hardcodeados a cream/ink en `globals.css` → adaptar al dark.

### 💡 OPORTUNIDAD

- **O1 · El sidebar oscuro es el puente:** extender su lenguaje (superficie ink + acento naranjo + grises sistematizados) a todo el contenido = rebrand coherente, "menos invento".
- **O2 · Dark nativo, no impuesto:** ya usas dark para impacto (hero press kit, footer, login) → el "Dark Premium" se sentirá propio.
- **O3 · Identidad sonora ya empezada:** press kit con stage-plot, calendario de disponibilidad, tags de género, badge ● LIVE → base para recursos propios (ondas, frecuencias, indicadores de disponibilidad) de Fase 6.
- **O4 · Sistema acotado = alto apalancamiento:** pocos primitivos + componentes con CVA → tokenizar bien cambia toda la app de una.
- **O5 · Buena base de a11y:** focus ring visible ya implementado y drawer móvil con `aria-modal`/ESC/scroll-lock. Construir sobre eso.

---

## Inventario del design system actual

**Primitivos shadcn (`src/components/ui/`):** `button`, `card`, `input`, `label`, `select-native`, `textarea` (6). El resto son componentes a medida (sidebar, topbar, mobile-menu, cards de dominio, calendars, toggles).

**Tokens (hoy):**
- Color: cream `#F4EFE7` / ink `#0A0A0A` / orange `#FF5C00` + semánticos (success `#1F8A5C`, warning `#C77A00`, danger `#C53030`, info `#2B5BA8`). **Hex fijos**, salvo los shadcn-vars en HSL.
- Tipografía: **Anton** (display) · **Inter** (body) · **Space Mono** (labels/data).
- Radius: `--radius: 0` (brutalist). Bordes: 2px ink por defecto.
- Animaciones: `logo-strobe`, `ticker-scroll`, `blink`, accordion.

**Estado de theming:** mixto → **migrar tokens fijos a CSS variables es el trabajo central** (ver C1).

---

## Qué mantener / rediseñar / reducir

| Mantener | Rediseñar | Reducir / Eliminar |
|---|---|---|
| Arquitectura de info (header→KPIs→contenido) | Superficies cream → dark con elevación | Superficies naranjas grandes |
| Anton (display) + Mono (data) | KPI cards → un patrón único | Doble borde 2px redundante en tablas |
| Sistema de tags / labels mono | Botón primario → uno solo | Exceso de uppercase mono en cuerpo |
| Sidebar oscuro + drawer móvil | Grises del sidebar → tokens | |
| Estados vacíos dashed + CTA | Títulos de página → un casing | |
| Focus ring accesible | 404 branded + `/signup`→`/beta` | |
| El "punto naranjo" del wordmark | `::selection`/scrollbar al dark | |

---

## Accesibilidad (preliminar — informe completo en Fase 10)

- ✅ **Focus visible** implementado en botones (`focus-visible:ring-2 ring-orange`).
- ✅ **Drawer móvil** con `role=dialog`, `aria-modal`, ESC, scroll-lock, cierre por backdrop.
- ⚠️ **Naranjo como texto:** `#FF5C00` sobre cream/blanco ≈ 3.0:1 → **no cumple AA** para texto normal (se usa en CardTitle, links). En dark sobre ink mejora; revisar tono de acento para texto.
- ⚠️ **`ring-offset-cream` hardcodeado** → en superficies dark el offset del focus quedará mal; tokenizar.
- ⚠️ **Mono uppercase 8–10px** para labels: legibilidad reducida; subir tamaño mínimo / reducir tracking.
- ✅ **Color no es único indicador** en estados de pipeline y scores (hay texto/número).

---

## Anexo · pantallas capturadas

Desktop (`d__`) y móvil (`m__`) en `design-audit/screenshots/`:
`01-landing` · `02-beta` · `03-login` · `04-signup-dj` (404) · `05-signup-booker` · `06-forgot-password` · `07-directory` · `08-suscripcion` (→login) · `09-eventos` · `10-terms` · `11-privacy` · `12-cuenta-suspendida` (→login) · `13-presskit-publico` · `14-dj-ciudad` · `15-dj-genero` · `20-dashboard` · `21-perfil` · `22-presskit-editor` · `24-calendario` · `25-crm` · `25b-crm-detalle` · `26-campanas` · `28-growth` · `32-configuracion` · `50-admin` · `51-admin-pulso` · `52-admin-beta-requests` · `53-admin-trafico` · `menu-open` (móvil)
