# DROP — Auditoría integral 2026-07 · Fase 3: UX/UI y sistema visual

- **Fecha:** 2026-07-05
- **Premisa:** DROP ya tiene un rediseño dark aprobado y en producción (PR #167) con sistema documentado en `design-audit/TOKENS_DARK.md`, `design-audit/DESIGN_SYSTEM.md` y `docs/redesign/`. **Esta fase no propone una identidad nueva: valida la existente, detecta dónde el producto real se desvía de ella y define el gap a cerrar.** Evidencia: capturas de `docs/drop-audit/screenshots/before/`.

---

## 1. Diagnóstico UX (como visitante y a nivel de código)

### Lo que funciona bien (conservar)
- **Propuesta de valor clara en <5 segundos**: "TU CARRERA VIVE EN DROP — El sistema operativo del DJ independiente. CRM, calendario con tus ingresos, press kit y growth". Sub-métricas honestas (15 días gratis · 0% comisión · 1 app). No parece plantilla genérica de IA: tipografía display contundente, dirección de arte propia, copy con voz.
- **Identidad diferenciada y pertinente al nicho**: dark + naranjo + mono-labels transmite cabina/backstage sin clichés (no hay neones ni parlantes stock). El selector de roles ("Empezamos con los DJs… el resto de la crew viene en camino") comunica visión sin vender lo que no existe.
- **Press kit público**: la mejor pieza del producto. Jerarquía correcta (nombre → verificación → géneros/ciudad → confiabilidad → fechas → disponibilidad → contacto), gating de contacto a bookers que crea el loop de registro, calendario de disponibilidad legible.
- **Estados vacíos con intención** (`/eventos`: mensaje + CTA al directorio; búsqueda sin resultados correcta).
- **Anti-enumeración y recuperación de contraseña bien resueltas** (mensaje idéntico, CTA de recuperación junto al error).
- **Responsive sin overflow horizontal** en las páginas públicas auditadas (3 viewports).

### Dónde el producto real se desvía del sistema (el gap)
| ID | Problema | Impacto UX | Evidencia |
|---|---|---|---|
| U-1 | **Fallback de avatar roto**: monograma toma "(" de sufijos de país → "A(", "G(", "L(". En el directorio 11/17 cards son fallback, así que el defecto domina la vista más importante para bookers. | Primera impresión del catálogo (confianza) | `desktop--dj-directorio.png` |
| U-2 | **Embed SoundCloud sin fallback**: URL muerta → caja vacía grande en el press kit. Contradice la regla del sistema "estados vacíos = dashed + ícono + copy + CTA". | Percepción profesional del press kit (core del producto) | `desktop--presskit-demo.png` |
| U-3 | **Errores de auth crudos**: "captcha protection: request disallowed…" en inglés técnico. `translateSupabaseError` no cubre casos captcha. | Confianza en el momento más frágil (login) | `desktop--login-error.png` |
| U-4 | Métrica "SHOWS: –" en la franja destacada del press kit: un guion en el bloque héroe se lee como dato roto, no como cero. Regla del sistema: "estados no dependen solo del color" → aquí falta el equivalente para *ausencia de dato* (ocultar la celda o copy "Primeros shows en agenda"). | Credibilidad de los stats | `desktop--presskit-demo.png` |
| U-5 | Input fecha del booking form en formato del navegador (`mm/dd/yyyy` en en-US). Audiencia LATAM. | Fricción/errores en el form que genera negocio | `desktop--presskit-demo.png` |
| U-6 | Landing 100% dependiente de scroll-reveal JS: sin JS (o en crawlers que no ejecutan IO) las secciones quedan `opacity:0`. Riesgo SEO/percepción "página vacía". Mitigable con `.in` por defecto vía `noscript`/reveal server-side del primer viewport. | SEO + robustez | `desktop--home.png` (captura full-page en negro) |
| U-7 | Dos fuentes de tokens divergen: `TOKENS_DARK.md` (naranjo `#FF7A1A`, bg `#090B10`, azulados) vs `DESIGN_SYSTEM.md` (naranjo `#E85A0C`, bg `#0B0B0B`, neutros — lo que está en prod). Ambos se declaran "definitivos". **Decisión de marca abierta que bloquea consistencia futura.** | Deuda de diseño; cada feature nueva elige al azar | ambos docs |
| U-8 | Onboarding de booker: `/signup/booker` existe y funciona, pero desde la landing el rol BOOKER aparece "PRÓXIMAMENTE" mientras el footer ofrece "SOY BOOKER". Mensajes contradictorios sobre si un booker puede entrar hoy. | Pérdida del segundo lado del marketplace | `desktop--home-post-scroll.png` + footer |
| U-9 | Directorio: sin paginación visible ni orden explicable (¿qué criterio ordena? disponibilidad/verificación no se explican). Con 17 DJs no duele; con 200 sí. | Escalabilidad del descubrimiento | `desktop--dj-directorio.png` |

### Deuda UX en la app privada (por código; runtime bloqueado — ver Fase 2)
- Formularios gigantes de una sola pantalla (`profile-form.tsx` 774 líneas, `contact-form.tsx` 553): sin agrupación por pasos/secciones colapsables, alta carga cognitiva.
- Feedback tras acciones: convive `alert()` nativo residual con toasts (QA-0611 cerró la mayoría; verificar los restantes en runtime).
- Áreas táctiles: el sistema pide ≥44px en móvil; botones actuales 38px (ya anotado en `ACCESIBILIDAD.md`, sin implementar).

## 2. Sistema visual DROP — consolidación (no reinvención)

**Principios (ya aprobados, se ratifican):** dark premium como base; un solo acento (naranjo) para acción/identidad, nunca superficie; elevación por luz, no por borde; labels mono UPPER como voz técnica "de rider"; datos como protagonistas (Anton para números); estados siempre con texto además de color; `prefers-reduced-motion` respetado.

**Paleta / tipografía / espaciado / radios / sombras / componentes / motion / responsive:** especificados en `design-audit/DESIGN_SYSTEM.md` (fuente única recomendada) — botón/inputs/cards/KPI/tabs/badges/modal/toast/tabla/lightbox/empty/sidebar ya tienen spec. **Acción requerida: resolver U-7** eligiendo canónico (recomendación: mantener lo que está en prod — `#E85A0C` sobre neutros `#0B0B0B` — y marcar `TOKENS_DARK.md` como superseded, porque cambiar la paleta viva de prod es más riesgo que beneficio hoy).

**Piezas que el sistema aún no define (propuesta nueva, alineada):**
1. **Monograma de marca como recurso** (arregla U-1 elevándolo): fallback de avatar = 1–2 iniciales *bien extraídas* (ignorar contenido entre paréntesis y emojis), Anton, punto naranjo final — mismo lenguaje del logo "DROP.". Convierte el defecto en firma visual.
2. **Empty-media**: patrón para embeds fallidos (SoundCloud/YouTube caídos): superficie `--surface` + ícono + "Set no disponible" + link externo si existe. Nunca iframe vacío (U-2).
3. **Skeletons**: shimmer sobrio sobre `--surface-2` para directorio, dashboard y press kit (hoy no hay patrón definido).
4. **Iconografía**: estandarizar en lucide-react (ya instalada), stroke 1.5–2, tamaño 16/20; prohibir mezclar sets.
5. **Copy de errores**: tabla canónica es-CL en `auth-errors.ts` cubriendo captcha/rate-limit/red (U-3), tono directo sin tecnicismos.

## 3. Priorización UX (entra al plan maestro de Fase 6)

1. **U-1 monograma** (S, alto impacto visual, riesgo nulo)
2. **U-2 fallback de embeds** (S/M)
3. **U-3 errores de auth traducidos** (S)
4. **U-4 stats "–" del press kit** (S)
5. **U-6 reveal sin JS** (S, cuidado de no romper animación actual)
6. **U-5 fecha localizada** (S)
7. **U-8 coherencia mensaje booker** (decisión de producto: ¿beta booker abierta o no? — requiere tu definición, no se toca sin ella)
8. **U-7 tokens canónicos** (decisión tuya; documentación, no código)
9. **U-9 orden/paginación del directorio** (M, post-beta)

Las mejoras dentro de la app logueada (formularios largos, táctiles 44px) quedan condicionadas a desbloquear el runtime autenticado (Fase 2 §7).
