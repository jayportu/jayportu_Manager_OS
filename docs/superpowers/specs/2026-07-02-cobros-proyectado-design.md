# Cobros — ingresos futuros proyectados + fix del botón de cobro

**Fecha:** 2026-07-02
**Estado:** aprobado (diseño)
**Contexto:** continuación de la vista Cobros (`docs/superpowers/specs/2026-07-02-cobros-view-design.md`, ya en prod). Dos mejoras pedidas por el usuario tras usarla:
1. El botón `$` (editar cobro) es icon-only y no comunica qué hace sin presionarlo.
2. Falta un resumen de **ingresos futuros proyectados** (lo que va a ganar de gigs aún no tocados), con desglose por mes — cierra la pregunta original "¿dónde veo las fechas de lo que voy a ganar?".

## Objetivo

- **A. Botón de cobro legible:** el trigger de `FinanceEditDialog` pasa a botón con etiqueta visible `$ Cobro`, en el estilo de los otros botones de acción (Pagado / Tracklist / Evento). Es un componente compartido → mejora también la vista Lista.
- **B. Ingresos futuros proyectados:** en el header de la vista Cobros, un KPI **PROYECTADO** (suma de fees de gigs con fecha ≥ hoy y monto, sin importar estado de pago) + una tira **por mes** (JUL $X · 2, AGO $Y · 1, …), respetando el filtro de rango.

## Decisiones de diseño (aprobadas)

- **Qué proyecta:** todos los gigs con `start_at ≥ hoy (Santiago)` y `amount_clp > 0`, **sin importar `payment_status`**. Responde "cuánto tengo agendado por ganar".
- **Formato:** KPI total (monto + nº de gigs) **+ desglose por mes** ascendente.
- **Relación con "Por cobrar" (opción A, aditiva):** "Por cobrar" se mantiene EXACTAMENTE como está (todo lo no pagado, pasado y futuro). "Proyectado" es una **lente adicional por fecha**; hay solape natural (un gig futuro pendiente cuenta en Por cobrar Y en Proyectado). No se re-particiona nada. Las etiquetas comunican la diferencia: *Por cobrar = lo que me deben · Proyectado = lo que viene, por mes*.
- **Rango:** "Proyectado" respeta el filtro Todo / Este año / Este mes (la porción futura dentro de la ventana ya traída por la query).
- **Etiqueta del botón:** `Cobro` (describe lo que edita: monto + estado + documento). El tooltip actual "Editar info de cobro" se mantiene.

## Alcance

### Dentro
- Fix del trigger de `FinanceEditDialog` (`finance-edit.tsx`): icon-only → icono + texto "Cobro", estilo de botón etiquetado.
- `projectFuture(rows, now?)` puro en `src/lib/calendar/cobros.ts` + tipos `ProyectadoResult` / `ProyectadoMes` / `CobrosData`.
- `getCobros` compone y devuelve también `proyectado` (calculado sobre las mismas filas ya traídas).
- `CobrosView`: KPI PROYECTADO + tira por mes.

### Fuera (YAGNI)
- No se toca la semántica de "Por cobrar" ni "Cobrado".
- No hay proyección por gig futuro más allá de lo que ya muestra la lista Por cobrar.
- Sin recordatorios/alertas de gigs próximos.
- Sin migración (mismas columnas).

## Diseño técnico

### A. Botón de cobro (`src/app/(app)/calendario/finance-edit.tsx`)

El trigger actual es un cuadrito `p-1.5` con solo `<DollarSign className="w-3.5 h-3.5" />` y `title="Editar info de cobro"`. Se cambia a un botón etiquetado consistente con `MarkPaidButton` / los links Tracklist·Evento:

```tsx
<button
  type="button"
  onClick={() => { setError(null); setOpen(true); }}
  className={`inline-flex items-center justify-center gap-1.5 h-8 px-3 border-2 border-border font-mono text-[10px] font-bold uppercase tracking-wider transition-colors ${
    hasFinanceInfo
      ? "bg-orange text-ink hover:bg-ink hover:text-orange"
      : "bg-cream hover:bg-ink hover:text-orange"
  }`}
  title="Editar info de cobro"
>
  <DollarSign className="w-3 h-3" aria-hidden="true" /> Cobro
</button>
```

> El `onClick` conserva la lógica actual del trigger (setear estado + abrir). Se preserva el estado visual `hasFinanceInfo` (naranjo si ya tiene monto/estado, crema si no). El cambio es solo de presentación: agrega label y adopta el tamaño `h-8 px-3` de los botones vecinos, para que la columna de acciones quede pareja en Lista y en Cobros.

### B. Lógica pura (`src/lib/calendar/cobros.ts`)

```ts
export interface ProyectadoMes {
  key: string;        // "YYYY-MM"
  monthLabel: string; // "jul 26"
  total: number;
  count: number;
}

export interface ProyectadoResult {
  total: number;
  count: number;
  byMonth: ProyectadoMes[]; // meses futuros, ascendente
}

/** Vista completa de Cobros = buckets de cobro + proyección futura. */
export interface CobrosData extends CobrosResult {
  proyectado: ProyectadoResult;
}

/**
 * Suma los fees de gigs con fecha ≥ hoy (Santiago) y monto > 0, sin importar
 * payment_status ("lo que tengo agendado por ganar"), agrupado por mes.
 */
export function projectFuture(rows: CalendarEventRow[], now: Date = new Date()): ProyectadoResult {
  const today = santiagoToday(now); // "YYYY-MM-DD"
  const futuros = rows.filter(
    (r) => (r.amount_clp ?? 0) > 0 && santiagoDay(r.start_at) >= today
  );
  const map = new Map<string, { total: number; count: number }>();
  for (const r of futuros) {
    const key = santiagoDay(r.start_at).slice(0, 7); // "YYYY-MM"
    const cur = map.get(key) ?? { total: 0, count: 0 };
    cur.total += r.amount_clp ?? 0;
    cur.count += 1;
    map.set(key, cur);
  }
  const byMonth: ProyectadoMes[] = [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([key, v]) => ({
      key,
      monthLabel: new Date(`${key}-01T12:00:00Z`).toLocaleDateString("es-CL", {
        month: "short",
        year: "2-digit",
        timeZone: "America/Santiago",
      }),
      total: v.total,
      count: v.count,
    }));
  return {
    total: futuros.reduce((s, r) => s + (r.amount_clp ?? 0), 0),
    count: futuros.length,
    byMonth,
  };
}
```

> Comparación `santiagoDay(start_at) >= today` sobre strings "YYYY-MM-DD" (lexicográfica = cronológica). Un gig de hoy cuenta como proyectado. `T12:00:00Z` en el label evita cruce de día por tz.

### B. Query (`src/lib/queries/calendar-events.ts`)

`getCobros` no cambia su filtro ni su ventana; solo compone la proyección desde las mismas filas y amplía el tipo de retorno:

```ts
export async function getCobros(range: CobrosRange = "all"): Promise<CobrosData> {
  // ... fetch idéntico al actual ...
  const rows = (data || []) as CalendarEventRow[];
  return { ...groupCobros(rows), proyectado: projectFuture(rows) };
}
```

En el import de `@/lib/calendar/cobros` se agrega `projectFuture` y el tipo `CobrosData` (reemplaza `CobrosResult` como tipo de retorno). El path de error también devuelve `proyectado` vacío: `{ total: 0, count: 0, byMonth: [] }`.

### B. Vista (`src/app/(app)/calendario/cobros-view.tsx`)

- Destructurar `proyectado` de `getCobros(range)`.
- **KPI grid** pasa de 3 a 4 celdas: `grid grid-cols-2 md:grid-cols-4` → POR COBRAR · COBRADO · **PROYECTADO** · RANGO. En mobile queda 2×2.
  - Celda PROYECTADO: label "— PROYECTADO", monto `formatClp(proyectado.total)` (o "—" si 0), subtítulo `{proyectado.count} {count===1?"gig por venir":"gigs por venir"}`. Color de acento neutro (p. ej. `text-fg` / borde superior `border-t-accent`), distinto del warning de Por cobrar.
- **Tira por mes** (solo si `proyectado.byMonth.length > 0`), full-width bajo el grid: label mono "— PROYECTADO POR MES" + chips, uno por mes: `MONTHLABEL $TOTAL · N`. Estilo brutalist (border-2, font-mono), scroll horizontal si no caben (`overflow-x-auto`).
- El estado vacío (`nothing`) no cambia: si no hay gigs con plata, tampoco hay proyectado (todo gig futuro con monto cae en porCobrar o cobrado, así que `nothing` sigue implicando proyectado 0).

## Riesgos / consideraciones

- **Doble conteo visible:** por diseño (opción A), un gig futuro pendiente aparece en Por cobrar y en Proyectado. Mitigación: etiquetas claras; no son buckets excluyentes sino lentes. Aceptado por el usuario.
- **Rango + proyección:** con rango "Este mes", Proyectado solo cubre lo que viene del mes; la tira por mes tendrá a lo más 1 mes. Consistente y predecible.
- **RLS/tz:** sin queries nuevas (reusa `getCobros`, ya scoped a `user_id`); fechas vía helpers Santiago existentes.
- **Componente compartido (botón):** el cambio del trigger afecta Lista y Cobros; verificar que la columna de acciones se vea bien en ambos (el `h-8 px-3` lo alinea con los botones vecinos).

## Verificación

- `npm run build` limpio (typecheck + ESLint Vercel).
- Preview (sesión logueada): con gigs futuros con monto → KPI PROYECTADO y tira por mes correctos; el mismo gig futuro pendiente aparece también en Por cobrar (solape esperado). Cambiar rango recorta la proyección. El botón muestra "$ Cobro" legible en Lista y Cobros y sigue abriendo el editor.
