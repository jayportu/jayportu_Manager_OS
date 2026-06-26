# Handoff — terminar el rebrand dark (pasada mecánica)

Estado: **PR #167** (`design/drop-dark-rebranding`) tiene la base lista. Falta aplicar el MISMO patrón al resto de pantallas. Es mecánico (no hay decisiones de diseño nuevas). Patrón de referencia ya migrado: **`dashboard/page.tsx`** y **`crm/page.tsx`**.

## Ya hecho (en el PR)
- **Tokens** → CSS variables (`globals.css :root` + `:root[data-theme="dark"]`); `tailwind.config.ts` con `rgb(var/<alpha>)`. Light idéntico.
- **Flag**: cookie `drop-theme=dark` (script inline en `layout.tsx`). Sin cookie = light.
- **Global**: `bg-white → bg-bg-panel` en todo `src/`. `Card` a tokens.
- **Pantallas dark**: dashboard, CRM.

## Receta por pantalla (copiar de dashboard/CRM)

Para cada `page.tsx`/componente de la pantalla:

1. **KPI / stat cards** con fondo lleno (`bg-orange`, `bg-ink`, `bg-success`, `bg-danger`) → unificar:
   `bg-bg-panel` + (para la métrica de acento) `border-t-2 border-t-accent` + valor `text-accent`. Labels `text-fg-muted`. Sin fondos llenos de color. Adiós "arcoíris".
2. **Avatares / monogramas** `bg-ink text-cream border-2 border-ink` → `bg-bg-subtle text-fg border border-border`.
3. **Badges / tags / chips** `bg-cream text-ink` → `bg-bg-subtle text-fg`.
4. **Texto de contenido** `text-ink` → `text-fg`.
   **EXCEPCIÓN:** si el `text-ink` va sobre `bg-orange`/`bg-accent` (texto oscuro sobre naranjo = correcto) → **déjalo**. Regla: `text-ink` sobre naranjo se queda; en cualquier otra superficie → `text-fg`.
5. **Bordes** `border-ink` (en cards/divisores) → `border-border`.
6. **`text-cream`/`text-white` sobre superficies oscuras** (heroes `bg-ink`, etc.): en dark `text-cream` se vuelve oscuro → cámbialo a `text-fg` (o `text-white` si debe ser claro en ambos temas).
7. **Sidebar/topbar**: el sidebar usa hex inline (#0A0A0A, #161616…) → ya se ve dark; no urge tocar (opcional: pasar esos grises a tokens).

### Atajos seguros (sed)
```bash
# Por archivo o por carpeta de pantalla:
sed -i '' -e 's/bg-cream text-ink/bg-bg-subtle text-fg/g' \
          -e 's/bg-ink text-cream border-2 border-ink/bg-bg-subtle text-fg border border-border/g' \
          <archivo>
```
`text-ink → text-fg` NO se puede a ciegas (rompe el texto sobre naranjo). Revisar caso a caso con:
`grep -n 'text-ink' <archivo>` y dejar solo los que van sobre `bg-orange`/`bg-accent`.

## Pantallas pendientes (con sus hotspots probables)
- **(app):** `calendario/page.tsx` (KPIs cobrado/pendiente — arcoíris verde/naranjo/negro), `press-kit/page.tsx` (card "MODO ACTUAL" naranja-soft), `perfil/page.tsx` (formulario largo + progreso), `growth/page.tsx` (cards plataformas), `plantillas`, `lugares`, `descubrir`, `gmail`, `configuracion`.
- **admin/**: ~12 vistas (métricas + tablas) — mismo patrón de KPIs + tablas.
- **públicas:** `page.tsx` (landing — o reemplazar por el mock nuevo), `dj/page.tsx` + `dj/ciudad|genero`, `p/[slug]` (press kit público — **decisión de producto: ¿también dark?** es el activo compartible del DJ), `beta`, `login`, `signup`, `eventos`, `terms`, `privacy`.
- **Arreglos de la auditoría (aprovechar):** 404 branded + `/signup`→`/beta`.

## QA por pantalla
1. `npm run dev`, cookie `drop-theme=dark`.
2. Navegar la pantalla; buscar **texto invisible** (oscuro sobre oscuro) y **superficies que quedaron blancas**.
3. Responsive (móvil) + foco visible.
4. **`npm run build`** verde antes de push (ESLint estricto de Vercel — [[vercel_build_lesson_drop]]).
5. Correr build SOLO con el dev server apagado (compiten por `.next`).

## Flip final (Fase 3)
Cuando todas las pantallas estén QA-OK en dark: hacer dark el default (quitar el gate de cookie o invertirlo), o mantener light como tema opcional. Aplicar el checklist de [ACCESIBILIDAD.md](ACCESIBILIDAD.md) (ring-offset, targets ≥44, foco-trap modal, aria). Migrar `tailwind`/`globals` ANTES del código que los usa. NO mergear a main hasta este QA + tu visto bueno.
```
