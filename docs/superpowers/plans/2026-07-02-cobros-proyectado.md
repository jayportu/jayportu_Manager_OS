# Cobros — ingresos futuros proyectados + fix botón de cobro · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aclarar el botón de cobro (icon-only → `$ Cobro`) y agregar a la vista Cobros un KPI "Proyectado" (fees de gigs futuros con monto) con desglose por mes.

**Architecture:** Lógica pura nueva (`projectFuture`) en `src/lib/calendar/cobros.ts`; `getCobros` compone la proyección desde las mismas filas ya traídas (sin query nueva); `CobrosView` agrega un KPI y una tira por mes; el trigger compartido `FinanceEditDialog` gana etiqueta visible (se aclara también en la vista Lista).

**Tech Stack:** Next.js App Router (RSC), TypeScript, Supabase, Tailwind, estilo brutalist Type Beat.

## Global Constraints

- **Sin framework de tests unitarios.** No inventar `vitest`/`jest`. Verificación por tarea: `npm run build` (typecheck + ESLint estricto de Vercel: sin imports/vars sin usar, sin `any` innecesario).
- **Timezone:** fechas/día/mes en America/Santiago vía helpers de `src/lib/tz.ts` (`santiagoToday`, `santiagoDay`). Nunca UTC del server.
- **Tono/UI:** copy en tuteo chileno; brutalist (border-2, sin radius, `font-mono` para labels, `font-display` para números; tokens `text-orange`/`text-warning`/`text-accent`/`text-fg`, sin hex hardcodeado).
- **RLS:** sin queries nuevas; se reusa `getCobros`, ya scoped a `user_id`.
- **Opción A (aditiva):** NO se cambia la semántica de "Por cobrar" ni "Cobrado". "Proyectado" es una lente adicional por fecha; el solape con Por cobrar es esperado.
- **Sin migración.**

---

### Task 1: Botón de cobro legible

**Files:**
- Modify: `src/app/(app)/calendario/finance-edit.tsx:73-88` (solo el `<button>` trigger)

**Interfaces:**
- (Sin cambios de interfaz. `FinanceEditDialog` mantiene sus props; el `onClick` conserva `stopPropagation`/`preventDefault`/`setOpen(true)` idénticos.)

- [ ] **Step 1: Reemplazar el `<button>` trigger**

Buscar exactamente este bloque (líneas 73-88):

```tsx
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        className={`p-1.5 border-2 border-border transition-colors ${
          hasFinanceInfo
            ? "bg-orange text-ink hover:bg-ink hover:text-orange"
            : "bg-cream hover:bg-ink hover:text-orange"
        }`}
        title="Editar info de cobro"
      >
        <DollarSign className="w-3.5 h-3.5" />
      </button>
```

Reemplazarlo por (mismo `onClick`, mismo `title`, mismo estado `hasFinanceInfo`; solo cambia el estilo a botón etiquetado + se agrega el texto "Cobro"):

```tsx
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
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

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: compila sin errores. (`DollarSign` ya importado; no se tocan imports.)

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/calendario/finance-edit.tsx"
git commit -m "feat · cobros: botón de cobro con etiqueta visible (\$ Cobro)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Datos de proyección — `projectFuture` + `getCobros`

**Files:**
- Modify: `src/lib/calendar/cobros.ts` (agregar tipos + `projectFuture` al final)
- Modify: `src/lib/queries/calendar-events.ts` (import + tipo de retorno + composición en `getCobros`)

**Interfaces:**
- Consumes: `santiagoToday`, `santiagoDay` (`@/lib/tz`, ya importados en cobros.ts); `CalendarEventRow` (ya importado); `groupCobros`/`CobrosResult` (Task existente).
- Produces:
  - `interface ProyectadoMes { key: string; monthLabel: string; total: number; count: number }`
  - `interface ProyectadoResult { total: number; count: number; byMonth: ProyectadoMes[] }`
  - `interface CobrosData extends CobrosResult { proyectado: ProyectadoResult }`
  - `function projectFuture(rows: CalendarEventRow[], now?: Date): ProyectadoResult`
  - `getCobros(range?: CobrosRange): Promise<CobrosData>` (tipo de retorno ampliado)

- [ ] **Step 1: Agregar tipos + `projectFuture` al final de `src/lib/calendar/cobros.ts`**

```ts
export interface ProyectadoMes {
  key: string; // "YYYY-MM"
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
export function projectFuture(
  rows: CalendarEventRow[],
  now: Date = new Date()
): ProyectadoResult {
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

- [ ] **Step 2: Ampliar el import de cobros en `src/lib/queries/calendar-events.ts`**

El archivo ya importa de `@/lib/calendar/cobros`:

```ts
import {
  groupCobros,
  type CobrosRange,
  type CobrosResult,
} from "@/lib/calendar/cobros";
```

Cambiarlo a (agrega `projectFuture` y `CobrosData`; `CobrosResult` ya no se usa directo como retorno pero sigue siendo la base de `CobrosData` — quítalo del import si ESLint lo marca sin usar):

```ts
import {
  groupCobros,
  projectFuture,
  type CobrosRange,
  type CobrosData,
} from "@/lib/calendar/cobros";
```

- [ ] **Step 3: Cambiar el retorno de `getCobros`**

En `getCobros`, cambiar la firma de `Promise<CobrosResult>` a `Promise<CobrosData>`. En el path de error, agregar `proyectado` vacío. En el path de éxito, componer con `projectFuture`. El cuerpo (query + windowing) NO cambia. Resultado:

```ts
export async function getCobros(range: CobrosRange = "all"): Promise<CobrosData> {
  const { supabase, user } = await getUserOrThrow();
  let q = supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", user.id)
    .or("amount_clp.gt.0,payment_status.neq.none");

  if (range === "month") {
    q = q
      .gte("start_at", santiagoMonthStartUtcISO())
      .lt("start_at", santiagoNextMonthStartUtcISO());
  } else if (range === "year") {
    const year = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Santiago",
      year: "numeric",
    }).format(new Date());
    q = q
      .gte("start_at", santiagoToUtcISO(`${year}-01-01`, "00:00:00"))
      .lt("start_at", santiagoToUtcISO(`${Number(year) + 1}-01-01`, "00:00:00"));
  }

  const { data, error } = await q.limit(2000);
  if (error) {
    console.error("getCobros error:", error.message);
    return {
      porCobrar: [],
      cobrado: [],
      totalPorCobrar: 0,
      totalCobrado: 0,
      venuesDeben: 0,
      proyectado: { total: 0, count: 0, byMonth: [] },
    };
  }
  const rows = (data || []) as CalendarEventRow[];
  return { ...groupCobros(rows), proyectado: projectFuture(rows) };
}
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: compila sin errores. Vigilar que `CobrosResult` no quede importado sin usar en `calendar-events.ts` (si el linter lo marca, quitarlo del import — `CobrosData` ya lo extiende).

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendar/cobros.ts src/lib/queries/calendar-events.ts
git commit -m "feat · cobros: projectFuture + getCobros devuelve proyección futura

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Vista — KPI PROYECTADO + tira por mes

**Files:**
- Modify: `src/app/(app)/calendario/cobros-view.tsx`

**Interfaces:**
- Consumes: `getCobros(range): Promise<CobrosData>` (Task 2) — ahora incluye `proyectado`.

- [ ] **Step 1: Destructurar `proyectado`**

En `CobrosView`, cambiar la línea de destructuring:

```tsx
  const { porCobrar, cobrado, totalPorCobrar, totalCobrado, venuesDeben } =
    await getCobros(range);
```

por:

```tsx
  const { porCobrar, cobrado, totalPorCobrar, totalCobrado, venuesDeben, proyectado } =
    await getCobros(range);
```

- [ ] **Step 2: Ampliar el KPI grid a 4 columnas e insertar la celda PROYECTADO**

Reemplazar el `<div className="grid grid-cols-2 md:grid-cols-3 border-2 border-border mb-5"> ... </div>` completo por este bloque (POR COBRAR y COBRADO quedan igual; se agrega PROYECTADO; RANGO deja de tener `col-span-2`):

```tsx
      <div className="grid grid-cols-2 md:grid-cols-4 border-2 border-border mb-5">
        <div className="bg-bg-panel p-4 border-t-2 border-t-warning border-r-2 border-border">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-warning">
            — POR COBRAR
          </div>
          <div className="font-display text-3xl leading-none mt-2 text-warning">
            {totalPorCobrar > 0 ? formatClp(totalPorCobrar) : "—"}
          </div>
          <div className="font-mono text-[10px] mt-2 text-warning">
            {venuesDeben} {venuesDeben === 1 ? "gig debe" : "gigs deben"}
          </div>
        </div>
        <div className="bg-bg-panel p-4 md:border-r-2 border-border">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted">
            — COBRADO
          </div>
          <div className="font-display text-3xl leading-none mt-2 text-accent">
            {formatClp(totalCobrado)}
          </div>
          <div className="font-mono text-[10px] mt-2 text-fg-muted">
            {cobrado.length} {cobrado.length === 1 ? "gig" : "gigs"}
          </div>
        </div>
        <div className="bg-bg-panel p-4 border-t-2 border-border md:border-t-0 md:border-r-2">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted">
            — PROYECTADO
          </div>
          <div className="font-display text-3xl leading-none mt-2 text-fg">
            {proyectado.total > 0 ? formatClp(proyectado.total) : "—"}
          </div>
          <div className="font-mono text-[10px] mt-2 text-fg-muted">
            {proyectado.count}{" "}
            {proyectado.count === 1 ? "gig por venir" : "gigs por venir"}
          </div>
        </div>
        <div className="bg-bg-panel p-4 border-t-2 border-border md:border-t-0">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted">
            — RANGO
          </div>
          <div className="mt-2 flex gap-1 flex-wrap">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/calendario?view=cobros&range=${r.key}`}
                className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-1 border-2 border-border transition-colors ${
                  range === r.key
                    ? "bg-orange text-ink"
                    : "bg-bg-panel text-fg-muted hover:text-fg"
                }`}
                aria-current={range === r.key ? "page" : undefined}
              >
                {r.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
```

- [ ] **Step 3: Insertar la tira "PROYECTADO POR MES" después del grid**

Justo después del `</div>` de cierre del grid de KPIs (y antes del bloque `{nothing && (...)}`), agregar:

```tsx
      {proyectado.byMonth.length > 0 && (
        <div className="border-2 border-border bg-bg-panel p-4 mb-5">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted mb-2">
            — PROYECTADO POR MES
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {proyectado.byMonth.map((m) => (
              <div
                key={m.key}
                className="shrink-0 border-2 border-border px-3 py-2"
              >
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-orange">
                  {m.monthLabel}
                </div>
                <div className="font-display text-xl leading-none mt-1 text-fg">
                  {formatClp(m.total)}
                </div>
                <div className="font-mono text-[9px] text-fg-muted mt-1">
                  {m.count} {m.count === 1 ? "gig" : "gigs"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: compila sin errores de tipo ni ESLint.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/calendario/cobros-view.tsx"
git commit -m "feat · cobros: KPI Proyectado + desglose por mes en la vista Cobros

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 6: Verificación en preview (la corre el controller — requiere sesión logueada)**

1. `preview_start` (`jay-manager-os`, ya en `.claude/launch.json`).
2. Con sesión iniciada, ir a `/calendario?view=cobros`.
3. Con un gig de fecha futura y monto cargado (cualquier estado): confirmar KPI **PROYECTADO** con el total + nº, y la tira **PROYECTADO POR MES** con el/los meses correctos. El mismo gig futuro pendiente debe seguir apareciendo en **Por cobrar** (solape esperado, opción A).
4. Confirmar que el botón de cobro ahora dice **"$ Cobro"** y sigue abriendo el editor, tanto en Cobros como en Lista.
5. Cambiar el rango (Este mes / año) → la proyección se recorta.
6. `preview_screenshot` como evidencia.

---

## Notas de cierre

- **Migraciones:** ninguna.
- **Deploy:** `npm run build` local OK → push `feat/cobros-proyectado` → PR → merge (cuenta `jayportu`).
- **Fuera de alcance:** semántica de Por cobrar/Cobrado (intacta), recordatorios de gigs próximos, proyección por gig individual.
