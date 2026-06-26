# DROP Dark — Tokens definitivos (Fase 4 + 6)

Dirección elegida: **A · Dark Premium (base) + acentos de B · Energy** (ondas/glow/línea naranja reservados a momentos de impacto).

Estos tokens son **semánticos** y están pensados para migrarse a `globals.css` como CSS variables, reapuntando los tokens Tailwind existentes (`bg`, `fg`, `border`, `accent`…) sin renombrar clases (ver C1 de la auditoría).

```css
:root {
  /* ---- Superficies (jerarquía de elevación, base A) ---- */
  --drop-bg:            #090B10;  /* fondo app */
  --drop-bg-2:          #10131B;  /* topbar / zonas recesadas */
  --drop-surface:       #161A23;  /* cards, paneles */
  --drop-surface-2:     #1C212C;  /* hover / elevación superior */

  /* ---- Bordes ---- */
  --drop-border:        #262C38;  /* sutil (default) */
  --drop-border-strong: #353C49;  /* inputs, divisores marcados */
  --drop-border-accent: rgba(255,122,26,.50); /* acento B (impacto) */
  --drop-divider:       #1B202A;  /* líneas finas */

  /* ---- Texto ---- */
  --drop-text:          #F4F5F7;  /* primario */
  --drop-text-2:        #A8AFBD;  /* secundario */
  --drop-text-3:        #737B8C;  /* terciario / labels */
  --drop-text-disabled: #515867;

  /* ---- Naranjo (acento único) ---- */
  --drop-orange:        #FF7A1A;  /* ligero brillo del brand #FF5C00 para legibilidad en dark */
  --drop-orange-hover:  #FF8F3A;
  --drop-orange-active: #E8660D;
  --drop-orange-soft:   rgba(255,122,26,.12);
  --drop-orange-glow:   rgba(255,92,0,.18);   /* acento B: glow de hero/impacto */

  /* ---- Estados (calibrados para dark) ---- */
  --drop-success:       #70C98B;
  --drop-warning:       #F5B84B;
  --drop-error:         #F06464;
  --drop-info:          #6EA8FE;

  /* ---- Radios (suaviza el brutalist 0px) ---- */
  --drop-radius-sm: 8px;
  --drop-radius:    12px;
  --drop-radius-lg: 16px;
  --drop-radius-full: 9999px;

  /* ---- Sombra / elevación (por luz, no por borde) ---- */
  --drop-shadow-sm:   0 1px 2px rgba(0,0,0,.4);
  --drop-shadow-card: 0 4px 16px -8px rgba(0,0,0,.6);
  --drop-glow:        0 8px 30px -12px rgba(255,92,0,.18); /* acento B */

  /* ---- Tipografía (sin cambio de stack) ---- */
  --drop-font-display: 'Anton', Impact, system-ui, sans-serif;
  --drop-font-sans:    'Inter', system-ui, sans-serif;
  --drop-font-mono:    'Space Mono', ui-monospace, monospace;
}
```

## Reglas de uso

- **Elevación por luz, no por borde:** las cards suben con `--drop-surface`/`--drop-surface-2` + `--drop-shadow-card`, no con bordes gruesos. Borde solo sutil (`--drop-border`).
- **Naranjo = acción/identidad, nunca superficie grande.** Permitido en: CTA primario, estado activo, foco, líneas finas, 1 dato clave por vista, glow de impacto. Prohibido: fondos llenos extensos (mata la regla y la calma).
- **Acentos de B (glow `--drop-glow`, `--drop-border-accent`, ondas) solo en momentos de impacto:** hero del dashboard, press kit, landing. En superficies de trabajo densas (CRM, tablas, formularios) → base A pura.
- **Estados no dependen solo del color:** siempre acompañar con texto/ícono (score muestra número; pipeline muestra etiqueta).

## Contraste (gana el dark)

- `--drop-orange #FF7A1A` sobre `--drop-bg #090B10` ≈ **6.5:1** → cumple AA texto normal. *(El mismo naranjo sobre cream fallaba ~3:1 — ver auditoría A11y.)*
- `--drop-text #F4F5F7` sobre `--drop-bg` ≈ **17:1**; `--drop-text-2` ≈ **8:1**; `--drop-text-3` ≈ **4.7:1** (AA). `--drop-text-disabled` es decorativo (no contenido esencial).

## Nota de marca

El naranjo de acento en dark es **#FF7A1A** (brillo +). El brand histórico **#FF5C00** se mantiene para superficies claras/marketing si decides conservar un modo claro. Decisión abierta — la marco para tu visto bueno.
