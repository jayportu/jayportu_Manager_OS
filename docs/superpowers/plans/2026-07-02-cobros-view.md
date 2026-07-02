# Vista "Cobros" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una pestaña "Cobros" en `/calendario` que muestre seguimiento de pagos (por cobrar / cobrado) cruzando meses y contando cualquier evento con plata, no solo `type='show'`.

**Architecture:** Lógica pura de agrupación/aging aislada en `src/lib/calendar/cobros.ts`; una query server-only `getCobros(range)` en `calendar-events.ts` que la compone; un server component `CobrosView` renderizado desde `page.tsx` cuando `view === 'cobros'`; un botón client "Marcar pagado" que reutiliza la action `updateEventFinanceAction` existente. De paso se quita el gate `type='show'` del KPI del mes y del export CSV.

**Tech Stack:** Next.js App Router (React server components), TypeScript, Supabase (PostgREST via `@supabase/supabase-js`), Tailwind. Estilo brutalist Type Beat existente.

## Global Constraints

- **Sin framework de tests unitarios en el repo.** No inventar `vitest`/`jest`/`pytest`. La verificación por tarea es `npm run build` (typecheck + ESLint estricto de Vercel — el gate real antes de push). La verificación funcional es vía preview del dev server (`next dev -p 3010`).
- **ESLint estricto:** nada de imports sin usar, `any` innecesario, ni variables muertas — rompen el build de Vercel aunque `tsc` no se queje.
- **Timezone:** toda fecha/día/aging en `America/Santiago` usando los helpers de `src/lib/tz.ts` y `src/lib/format.ts`. Nunca la fecha UTC del server.
- **Tono/UI:** copy en tuteo chileno; estilo brutalist (border-2, sin border-radius, font-mono para labels, font-display para números).
- **RLS:** toda query filtra por `user_id` (patrón de `calendar-events.ts`).
- **Naranjo de marca:** usar tokens/clases existentes (`text-orange`, `bg-orange`, `text-warning`, `text-accent`, `border-success`), no hex hardcodeado.

---

### Task 1: Helpers puros — `formatClp` compartido + módulo `cobros.ts`

**Files:**
- Modify: `src/lib/format.ts` (agregar `formatClp` al final, antes del cierre de archivo)
- Create: `src/lib/calendar/cobros.ts`

**Interfaces:**
- Produces:
  - `formatClp(n: number | null | undefined): string`
  - `type CobrosRange = "all" | "year" | "month"`
  - `interface CobrosResult { porCobrar: CalendarEventRow[]; cobrado: CalendarEventRow[]; totalPorCobrar: number; totalCobrado: number; venuesDeben: number }`
  - `groupCobros(rows: CalendarEventRow[]): CobrosResult`
  - `daysOverdue(startISO: string, now?: Date): number | null`

- [ ] **Step 1: Agregar `formatClp` a `src/lib/format.ts`**

Agregar esta función al final del archivo (después de `isSupabaseStorageUrl`):

```ts
/** Monto en CLP: 420000 → "$420.000". null/undefined → "—". */
export function formatClp(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-CL")}`;
}
```

- [ ] **Step 2: Crear `src/lib/calendar/cobros.ts`**

```ts
/**
 * Lógica pura de la vista Cobros (agrupación + aging). Sin server-only ni
 * acceso a datos: solo transforma filas ya traídas. Aislado para poder
 * razonarlo y reusarlo sin arrastrar Supabase.
 */
import type { CalendarEventRow } from "@/lib/calendar/types";
import { santiagoDay, santiagoToday } from "@/lib/tz";

export type CobrosRange = "all" | "year" | "month";

export interface CobrosResult {
  /** Pendiente + parcial + (con monto pero estado 'none'). Orden: más viejo primero. */
  porCobrar: CalendarEventRow[];
  /** Pagados. Orden: más reciente primero. */
  cobrado: CalendarEventRow[];
  totalPorCobrar: number;
  totalCobrado: number;
  venuesDeben: number;
}

export function groupCobros(rows: CalendarEventRow[]): CobrosResult {
  const cobrado = rows.filter((r) => r.payment_status === "paid");
  // Todo lo que NO está pagado y llegó hasta acá tiene plata registrada
  // (la query filtra amount_clp>0 OR payment_status!='none').
  const porCobrar = rows.filter((r) => r.payment_status !== "paid");
  const sum = (list: CalendarEventRow[]) =>
    list.reduce((s, r) => s + (r.amount_clp ?? 0), 0);
  const byStartAsc = (a: CalendarEventRow, b: CalendarEventRow) =>
    a.start_at < b.start_at ? -1 : a.start_at > b.start_at ? 1 : 0;
  const byStartDesc = (a: CalendarEventRow, b: CalendarEventRow) =>
    a.start_at < b.start_at ? 1 : a.start_at > b.start_at ? -1 : 0;
  return {
    porCobrar: [...porCobrar].sort(byStartAsc),
    cobrado: [...cobrado].sort(byStartDesc),
    totalPorCobrar: sum(porCobrar),
    totalCobrado: sum(cobrado),
    venuesDeben: porCobrar.length,
  };
}

/**
 * Días vencidos en días-calendario de Santiago. `null` si el evento es hoy o
 * futuro (no está "vencido"). Compara medianoches de Santiago para evitar el
 * drift por horas/DST.
 */
export function daysOverdue(startISO: string, now: Date = new Date()): number | null {
  const start = Date.parse(`${santiagoDay(startISO)}T00:00:00Z`);
  const today = Date.parse(`${santiagoToday(now)}T00:00:00Z`);
  if (Number.isNaN(start) || start >= today) return null;
  return Math.round((today - start) / 86_400_000);
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: compila sin errores de tipo ni ESLint. (`formatClp`, `groupCobros`, `daysOverdue` exportados y sin usar todavía — no rompe: son exports públicos, ESLint no marca exports sin uso interno.)

- [ ] **Step 4: Sanity-check de la lógica pura (razonamiento)**

Verificar mentalmente contra estos casos (se validan de verdad en el preview de la Task 7):
- `groupCobros`: fila `paid` → `cobrado`; `pending`/`partial`/`none` → `porCobrar`. `totalPorCobrar` suma solo montos de `porCobrar`. `porCobrar` ordenado ASC (más viejo arriba), `cobrado` DESC.
- `daysOverdue("<ayer>")` → `1`; `daysOverdue("<hoy>")` → `null`; `daysOverdue("<mañana>")` → `null`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/calendar/cobros.ts
git commit -m "feat · cobros: helpers puros (formatClp, groupCobros, daysOverdue)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Query `getCobros` + destapar gate de tipo en `getFinanceKpis`

**Files:**
- Modify: `src/lib/queries/calendar-events.ts`

**Interfaces:**
- Consumes: `groupCobros`, `CobrosRange`, `CobrosResult` (Task 1); `santiagoMonthStartUtcISO`, `santiagoNextMonthStartUtcISO`, `santiagoToUtcISO` (`@/lib/tz`, ya existen).
- Produces: `getCobros(range?: CobrosRange): Promise<CobrosResult>`

- [ ] **Step 1: Agregar imports de tz y cobros al tope de `calendar-events.ts`**

El archivo ya importa de `@/lib/tz` (línea 3: `santiagoMonthStartUtcISO, santiagoNextMonthStartUtcISO`). Ampliar esa línea a:

```ts
import {
  santiagoMonthStartUtcISO,
  santiagoNextMonthStartUtcISO,
  santiagoToUtcISO,
} from "@/lib/tz";
```

Y agregar debajo de los imports de tipos existentes:

```ts
import {
  groupCobros,
  type CobrosRange,
  type CobrosResult,
} from "@/lib/calendar/cobros";
```

- [ ] **Step 2: Quitar el gate `type='show'` de `getFinanceKpis`**

En `getFinanceKpis` (dentro del `.from("calendar_events").select(...)`), eliminar la línea `.eq("type", "show")`. El bloque queda:

```ts
  const { data } = await supabase
    .from("calendar_events")
    .select("amount_clp, payment_status")
    .eq("user_id", user.id)
    .gte("start_at", monthStartIso)
    .lt("start_at", nextMonthIso);
```

(El resto de `getFinanceKpis` no cambia: sigue acotado al mes actual.)

- [ ] **Step 3: Agregar `getCobros` al final de `calendar-events.ts`**

```ts
/**
 * Vista Cobros — seguimiento de pagos SIN límite de mes y SIN filtrar por
 * `type`: trae cualquier evento con plata (monto registrado o estado de pago
 * distinto de 'none') y lo agrupa en por-cobrar / cobrado.
 */
export async function getCobros(range: CobrosRange = "all"): Promise<CobrosResult> {
  const { supabase, user } = await getUserOrThrow();
  let q = supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", user.id)
    // Con plata: monto > 0 O algún estado de cobro distinto de 'none'.
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
    };
  }
  return groupCobros((data || []) as CalendarEventRow[]);
}
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: compila sin errores. `getCobros` exportado (usado en Task 6).

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries/calendar-events.ts
git commit -m "feat · cobros: query getCobros + KPI del mes deja de filtrar type=show

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Export CSV cuenta cualquier evento con plata

**Files:**
- Modify: `src/app/api/export/finance/route.ts:57`

**Interfaces:**
- (Sin nuevas interfaces. Cambio de comportamiento del endpoint existente.)

- [ ] **Step 1: Quitar el gate `type='show'` del query del CSV**

En `route.ts`, dentro del builder del query, eliminar la línea `.eq("type", "show")`. Queda:

```ts
  let q = supabase
    .from("calendar_events")
    .select("*, contacts(name)")
    .eq("user_id", user.id)
    .order("start_at", { ascending: true });
```

El filtro `finance` de más abajo (líneas 72-76, `amount_clp != null || payment_status !== 'none'`) ya deja fuera los eventos sin datos financieros, así que el CSV solo incluye lo que tiene plata — ahora sin importar el tipo.

- [ ] **Step 2: Actualizar el comentario de encabezado del archivo**

En el JSDoc del tope (líneas 1-15), cambiar la frase "todos los gigs (calendar_events tipo 'show')" por:

```
 * Devuelve un CSV con todos los eventos (calendar_events, cualquier tipo) que
 * tienen algún monto registrado o un payment_status distinto de 'none'.
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: compila sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/export/finance/route.ts
git commit -m "feat · cobros: export CSV incluye cualquier evento con plata (no solo shows)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Botón "Cobros" en el toggle de vista

**Files:**
- Modify: `src/app/(app)/calendario/view-toggle.tsx`

**Interfaces:**
- Produces: `CalendarViewToggle` acepta `current: "lista" | "mes" | "cobros"`.

- [ ] **Step 1: Ampliar el toggle con la pestaña Cobros**

Reemplazar el contenido completo de `view-toggle.tsx` por:

```tsx
import Link from "next/link";
import { List, CalendarDays, Wallet } from "lucide-react";

/**
 * Toggle Lista / Mes / Cobros del calendario (SSR, vía URL param `view`).
 * Estilo brutalist consistente con el resto de la app (border-2, sin radius).
 */
export function CalendarViewToggle({
  current,
}: {
  current: "lista" | "mes" | "cobros";
}) {
  const base =
    "inline-flex items-center gap-1.5 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.06em] transition-colors";
  const on = "bg-orange text-ink";
  const off = "text-fg-muted hover:text-fg";
  return (
    <div className="inline-flex border-2 border-border bg-bg-panel">
      <Link
        href="/calendario"
        className={`${base} ${current === "lista" ? on : off}`}
        aria-current={current === "lista" ? "page" : undefined}
      >
        <List className="w-3.5 h-3.5" aria-hidden="true" /> Lista
      </Link>
      <Link
        href="/calendario?view=mes"
        className={`${base} border-l-2 border-border ${current === "mes" ? on : off}`}
        aria-current={current === "mes" ? "page" : undefined}
      >
        <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" /> Mes
      </Link>
      <Link
        href="/calendario?view=cobros"
        className={`${base} border-l-2 border-border ${current === "cobros" ? on : off}`}
        aria-current={current === "cobros" ? "page" : undefined}
      >
        <Wallet className="w-3.5 h-3.5" aria-hidden="true" /> Cobros
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: falla con un error de tipo en `page.tsx` NO — `page.tsx` pasa `current={view}` donde `view` hoy es `"lista" | "mes"`, que sigue siendo asignable a `"lista" | "mes" | "cobros"`. Debe compilar OK.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/calendario/view-toggle.tsx"
git commit -m "feat · cobros: pestaña Cobros en el toggle del calendario

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Botón client "Marcar pagado"

**Files:**
- Create: `src/app/(app)/calendario/mark-paid-button.tsx`

**Interfaces:**
- Consumes: `updateEventFinanceAction(eventId, { payment_status: "paid" })` de `./actions` (existe; setea `paid_at=now()` y revalida `/calendario` automáticamente). `Result` = `{ ok: true; data } | { ok: false; error: string }`.
- Produces: `MarkPaidButton({ eventId }: { eventId: string })`

- [ ] **Step 1: Crear `mark-paid-button.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { updateEventFinanceAction } from "./actions";

/**
 * Marca un gig como pagado de un click. Reutiliza updateEventFinanceAction,
 * que setea paid_at=now() al pasar a 'paid' y revalida /calendario.
 */
export function MarkPaidButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await updateEventFinanceAction(eventId, {
        payment_status: "paid",
      });
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        title="Marcar como pagado"
        className="inline-flex items-center justify-center gap-1.5 h-8 px-3 border-2 border-success bg-success text-white dark:text-ink hover:opacity-90 font-mono text-[10px] font-bold uppercase tracking-wider transition-opacity disabled:opacity-50"
      >
        <Check className="w-3 h-3" aria-hidden="true" />
        {isPending ? "..." : "Pagado"}
      </button>
      {error && (
        <span className="font-mono text-[9px] text-danger">{error}</span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: compila sin errores. (Componente aún no usado — un archivo nuevo con export sin importar no rompe el build de Next.)

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/calendario/mark-paid-button.tsx"
git commit -m "feat · cobros: botón Marcar pagado (un click)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Server component `CobrosView`

**Files:**
- Create: `src/app/(app)/calendario/cobros-view.tsx`

**Interfaces:**
- Consumes: `getCobros` (Task 2), `daysOverdue` + `CobrosRange` (Task 1), `formatClp`/`shortDate`/`dateTime` (`@/lib/format`), `PAYMENT_STATUS_LABELS` + `CalendarEventRow` (`@/lib/calendar/types`), `FinanceEditDialog` (`./finance-edit`, existe), `MarkPaidButton` (Task 5), `Card` (`@/components/ui/card`).
- Produces: `CobrosView({ range }: { range: CobrosRange })` (async server component).

- [ ] **Step 1: Crear `cobros-view.tsx`**

```tsx
import Link from "next/link";
import { Wallet } from "lucide-react";
import { getCobros } from "@/lib/queries/calendar-events";
import { daysOverdue, type CobrosRange } from "@/lib/calendar/cobros";
import { formatClp, shortDate, dateTime } from "@/lib/format";
import {
  PAYMENT_STATUS_LABELS,
  type CalendarEventRow,
} from "@/lib/calendar/types";
import { Card } from "@/components/ui/card";
import { FinanceEditDialog } from "./finance-edit";
import { MarkPaidButton } from "./mark-paid-button";

const RANGES: { key: CobrosRange; label: string }[] = [
  { key: "all", label: "Todo" },
  { key: "year", label: "Este año" },
  { key: "month", label: "Este mes" },
];

export async function CobrosView({ range }: { range: CobrosRange }) {
  const { porCobrar, cobrado, totalPorCobrar, totalCobrado, venuesDeben } =
    await getCobros(range);
  const nothing = porCobrar.length === 0 && cobrado.length === 0;

  return (
    <div>
      {/* KPIs + selector de rango */}
      <div className="grid grid-cols-2 md:grid-cols-3 border-2 border-border mb-5">
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
        <div className="bg-bg-panel p-4 col-span-2 md:col-span-1 border-t-2 border-border md:border-t-0">
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

      {nothing && (
        <Card className="p-10 text-center">
          <Wallet className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
          <h3 className="font-semibold mb-1">Sin cobros en este rango</h3>
          <p className="text-sm text-fg-muted max-w-md mx-auto">
            Cárgale un monto a tus gigs con el botón $ (en la vista Lista) y
            aparecerán acá para hacerles seguimiento de pago.
          </p>
        </Card>
      )}

      {porCobrar.length > 0 && (
        <section className="mb-8">
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-warning mb-3">
            — POR COBRAR ({porCobrar.length})
          </h2>
          <ul className="space-y-2">
            {porCobrar.map((ev) => (
              <CobroRow key={ev.id} ev={ev} />
            ))}
          </ul>
        </section>
      )}

      {cobrado.length > 0 && (
        <section className="mb-8">
          <details open={porCobrar.length === 0}>
            <summary className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-success mb-3 cursor-pointer">
              — COBRADO ({cobrado.length})
            </summary>
            <ul className="space-y-2 mt-3">
              {cobrado.map((ev) => (
                <CobradoRow key={ev.id} ev={ev} />
              ))}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}

function CobroRow({ ev }: { ev: CalendarEventRow }) {
  const overdue = daysOverdue(ev.start_at);
  const status = ev.payment_status;
  const tint =
    status === "partial" ? "border-info bg-info/5" : "border-warning bg-warning/5";
  return (
    <li className={`border-2 ${tint} px-4 py-3`}>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{ev.title}</span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 border-2 border-border bg-cream">
              {formatClp(ev.amount_clp)}
              {status !== "none" ? ` · ${PAYMENT_STATUS_LABELS[status]}` : ""}
            </span>
            {overdue !== null && (
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-warning">
                hace {overdue} {overdue === 1 ? "día" : "días"}
              </span>
            )}
          </div>
          <div className="font-mono text-[11px] text-fg-muted mt-1">
            {ev.all_day ? shortDate(ev.start_at) : dateTime(ev.start_at)}
            {ev.location ? ` · ${ev.location}` : ""}
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <MarkPaidButton eventId={ev.id} />
          <FinanceEditDialog
            eventId={ev.id}
            title={ev.title}
            current={{
              amount_clp: ev.amount_clp,
              payment_status: ev.payment_status,
              document_type: ev.document_type,
            }}
          />
        </div>
      </div>
    </li>
  );
}

function CobradoRow({ ev }: { ev: CalendarEventRow }) {
  return (
    <li className="border-2 border-success bg-success/5 px-4 py-3">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{ev.title}</span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 border-2 border-border bg-success text-white dark:text-ink">
              {formatClp(ev.amount_clp)}
            </span>
          </div>
          <div className="font-mono text-[11px] text-fg-muted mt-1">
            {ev.all_day ? shortDate(ev.start_at) : dateTime(ev.start_at)}
            {ev.location ? ` · ${ev.location}` : ""}
            {ev.paid_at ? ` · pagado ${shortDate(ev.paid_at)}` : ""}
          </div>
        </div>
        <FinanceEditDialog
          eventId={ev.id}
          title={ev.title}
          current={{
            amount_clp: ev.amount_clp,
            payment_status: ev.payment_status,
            document_type: ev.document_type,
          }}
        />
      </div>
    </li>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: compila sin errores. (Aún no montado en `page.tsx` — export sin uso no rompe.)

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/calendario/cobros-view.tsx"
git commit -m "feat · cobros: CobrosView (por cobrar con aging + cobrado colapsable)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Cablear `CobrosView` en `page.tsx` + verificación e2e

**Files:**
- Modify: `src/app/(app)/calendario/page.tsx`

**Interfaces:**
- Consumes: `CobrosView` (Task 6), `formatClp` compartido (Task 1).

- [ ] **Step 1: Ajustar imports de `page.tsx`**

Agregar `formatClp` a la línea de import de `@/lib/format` (línea 18), y agregar el import de `CobrosView`. La línea 18 pasa a:

```ts
import { dateTime, shortDate, relativeTime, formatClp } from "@/lib/format";
```

Y agregar junto a los otros imports locales (después de `import { MonthView, resolveMonth } from "./month-view";`):

```ts
import { CobrosView } from "./cobros-view";
import type { CobrosRange } from "@/lib/calendar/cobros";
```

- [ ] **Step 2: Borrar el `formatClp` local de `page.tsx`**

Eliminar la función local (líneas ~34-37):

```ts
function formatClp(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-CL")}`;
}
```

(Ahora viene de `@/lib/format`. `EventRow` la sigue usando vía el import de módulo.)

- [ ] **Step 3: Ampliar el parse de `view` y agregar `range` en `searchParams`**

En la interfaz `PageProps` (líneas 25-32), agregar `range?: string;` al objeto de `searchParams`.

Reemplazar la línea `const view = sp.view === "mes" ? "mes" : "lista";` (línea 60) por:

```ts
  const view =
    sp.view === "mes" ? "mes" : sp.view === "cobros" ? "cobros" : "lista";
  const range: CobrosRange =
    sp.range === "year" ? "year" : sp.range === "month" ? "month" : "all";
```

- [ ] **Step 4: Gatear el panel de KPIs del mes a `view === "lista"` y montar `CobrosView`**

Cambiar la condición de apertura del bloque de KPIs (línea 142) de:

```tsx
      {kpis.totalGigs > 0 && (
```

a:

```tsx
      {view === "lista" && kpis.totalGigs > 0 && (
```

Y agregar el render de Cobros. Justo después del bloque de `{sp.synced && (...)}` (línea 208, antes de `{view === "mes" && <MonthView .../>}`), insertar:

```tsx
      {view === "cobros" && <CobrosView range={range} />}
```

- [ ] **Step 5: Verificar build**

Run: `npm run build`
Expected: compila sin errores de tipo ni ESLint. En particular, `formatClp` ya no está duplicada y `view` tipa como `"lista" | "mes" | "cobros"`.

- [ ] **Step 6: Levantar dev server y verificar render de la pestaña**

Usar el flujo de preview del harness:
1. `preview_start` con el server de Next (`next dev -p 3010`; crear `.claude/launch.json` con `runtimeExecutable: "npm"`, `runtimeArgs: ["run","dev"]`, `port: 3010` si no existe).
2. Navegar a `/calendario?view=cobros` (con la sesión del usuario ya logueada en el browser de preview).
3. `preview_console_logs` nivel error + `preview_snapshot`: confirmar que la vista Cobros renderiza sin errores de runtime, se ven las 3 KPIs (POR COBRAR / COBRADO / RANGO) y el toggle muestra la pestaña "Cobros" activa.

Expected: sin errores en consola; estructura visible.

- [ ] **Step 7: Verificación funcional (con un gig real)**

En el preview, con la sesión del usuario:
1. Ir a `/calendario` (Lista), elegir un evento y con el botón **$** cargarle un monto y estado **Pendiente**. Guardar.
2. Ir a la pestaña **Cobros** → confirmar que ese gig aparece en **POR COBRAR** con su monto y, si la fecha ya pasó, el "hace N días".
3. Click en **Pagado** → confirmar (`preview_snapshot` / `router.refresh`) que la fila desaparece de POR COBRAR y aparece en **COBRADO** con "pagado <fecha>".
4. Probar el selector **Este mes / Este año / Todo** → confirmar que acota.
5. `preview_screenshot` de la pestaña Cobros para adjuntar como prueba.

Expected: el gig fluye pendiente → pagado; los totales y el rango responden. (Si se usó un evento real solo para probar, dejarlo en el estado que corresponda a la realidad del usuario.)

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/calendario/page.tsx"
git commit -m "feat · cobros: montar pestaña Cobros en /calendario + usar formatClp compartido

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Notas de cierre

- **Migraciones:** ninguna. Se usan columnas existentes (`amount_clp`, `payment_status`, `document_type`, `paid_at`).
- **Deploy:** al terminar, `npm run build` local OK → push de la rama `feat/cobros-view` → PR → merge (cuenta `jayportu`). Sin paso de migración previo.
- **Fuera de alcance (confirmado en spec):** monto parcial pagado, recordatorios automáticos a venues, cambios en sidebar/dashboard.
