# Vista "Cobros" — seguimiento de pagos de gigs

**Fecha:** 2026-07-02
**Estado:** aprobado (diseño)
**Contexto:** el DJ necesita hacer seguimiento de lo que le deben y lo que le pagaron, **cruzando meses**. El resumen financiero actual de `/calendario` solo aparece si hay gigs tipo `show` con monto **en el mes en curso**, así que un gig de un mes pasado pendiente de cobro (o recién pagado) nunca se ve. Además todos los eventos del usuario están clasificados como `otro` (vienen del sync de Google), por lo que el módulo financiero —hoy gateado a `type = 'show'`— los ignora por completo.

## Problema

Hoy no existe forma de responder "¿quién me debe y hace cuánto?" ni "¿cuánto llevo cobrado?" a lo largo del tiempo. Dos causas concretas en el código:

1. **Gate por tipo:** `getFinanceKpis()` y el export CSV filtran `type = 'show'`. Los eventos reales del usuario son `otro`.
2. **Gate por mes:** `getFinanceKpis()` filtra `start_at` dentro del mes actual (tz Santiago). Un cobro pendiente de otro mes desaparece del resumen.

## Objetivo

Una vista de **Cobros** dentro de `/calendario` (tercera pestaña junto a Lista / Mes) enfocada 100% en seguimiento de plata, **sin límite de mes** y contando **cualquier evento con datos financieros**, sin importar el `type`.

## Decisiones de diseño (aprobadas)

- **Qué cuenta:** cualquier `calendar_event` con `amount_clp > 0` **o** `payment_status != 'none'`. Sin filtro por `type`.
- **Dónde vive:** pestaña "Cobros" en `/calendario` (patrón del toggle Lista/Mes ya existente vía `?view=cobros`). No agrega ítem al sidebar.
- **Alcance temporal:** todo (all-time) por defecto, con filtro Todo / Este año / Este mes.
- **Consistencia:** de paso se quita el gate `type = 'show'` en `getFinanceKpis()` (resumen del mes en vista Lista) y en el export CSV, para que todo el módulo financiero sea coherente ("cualquier evento con plata"). No se toca el gate por mes de `getFinanceKpis()` — ese sigue siendo el pulso del mes en la vista Lista; el cruce entre meses es responsabilidad de Cobros.
- **Parcial:** `amount_clp` guarda el monto total del gig. No se agrega un campo de "monto parcial pagado" (YAGNI). Un gig `partial` cuenta su monto completo como "por cobrar", marcado visualmente como parcial. Mismo criterio que el KPI actual.

## Alcance

### Dentro
- Nueva query `getCobros(range)` en `src/lib/queries/calendar-events.ts`.
- Nuevo componente de vista `CobrosView` renderizado en `page.tsx` cuando `view === 'cobros'`.
- Tercer botón en el toggle de vista (`view-toggle.tsx`).
- Acción "Marcar pagado" de un click (reutiliza `updateEventFinanceAction`).
- Quitar gate `type = 'show'` en `getFinanceKpis()` y en `/api/export/finance`.

### Fuera (futuro)
- Campo de monto parcial pagado.
- Recordatorios automáticos a venues.
- Cambios en el sidebar / dashboard.

## Diseño técnico

### Query: `getCobros`

```ts
export type CobrosRange = "all" | "year" | "month";

export interface CobrosResult {
  porCobrar: CalendarEventRow[];   // pending + partial, orden start_at ASC (más viejo primero)
  cobrado: CalendarEventRow[];     // paid, orden start_at DESC (más reciente primero)
  totalPorCobrar: number;          // suma amount_clp de porCobrar
  totalCobrado: number;            // suma amount_clp de cobrado
  venuesDeben: number;             // porCobrar.length
}

export async function getCobros(range: CobrosRange = "all"): Promise<CobrosResult>
```

- Filtra por `user_id`.
- **Sin** filtro `type`.
- Trae filas con `amount_clp > 0` OR `payment_status != 'none'` (usar `.or("amount_clp.gt.0,payment_status.neq.none")`).
- `range`: `all` sin filtro de fecha; `year`/`month` acotan `start_at` con los helpers de tz existentes (`santiagoMonthStartUtcISO`, etc.). Para `year` se agrega un helper análogo o se calcula inline (año Santiago).
- Separa por `payment_status`: `paid` → cobrado; `pending`/`partial` → porCobrar; `none` con monto → tratado como porCobrar (tiene plata registrada pero sin estado; se muestra como pendiente sin badge de estado).

> Decisión de borde: un evento con `amount_clp > 0` y `payment_status = 'none'` se agrupa en **Por cobrar** (hay plata registrada que aún no se marca cobrada). Se muestra sin la etiqueta de estado de pago.

### Vista: `CobrosView` (server component)

Recibe `range` (de `searchParams`) y llama `getCobros(range)`. Renderiza:

1. **Header de 3 KPIs** (mismo lenguaje brutalist que el KPI actual): POR COBRAR (naranjo/warning), COBRADO (accent), venues que deben.
2. **Selector de rango** (Todo / Este año / Este mes) como links con `?view=cobros&range=...`.
3. **Sección POR COBRAR:** lista de filas, orden más antiguo primero. Cada fila:
   - Fecha, título, venue, monto, estado (pendiente/parcial).
   - **Aging:** si `start_at < now`, mostrar "hace N días" (calculado en tz Santiago). Si es futuro, no.
   - Acciones: **✓ Marcar pagado** (client, un click) + **$** (`FinanceEditDialog` existente).
4. **Sección COBRADO:** `<details>` colapsable, orden más reciente primero. Fecha, monto, venue (+ `paid_at` si existe).
5. **Empty state** si no hay nada con plata: mensaje + tip de cargar monto vía botón $.

Reutiliza helpers de formato (`formatClp`, tz Santiago para día/mes) — extraer `formatClp` a un módulo compartido o duplicar el helper local (decisión menor a resolver en el plan).

### Acción "Marcar pagado"

Componente client pequeño (`mark-paid-button.tsx`) que llama:

```ts
updateEventFinanceAction(eventId, { payment_status: "paid" })
```

`updateEventFinanceAction` ya setea `paid_at = now()` al pasar a `paid` y revalida `/calendario`. No requiere cambios en la acción. Guard `assertBetaActive()` ya incluido.

### Toggle de vista

`view-toggle.tsx`: agregar tercer botón "Cobros" → `?view=cobros`. En `page.tsx`, ampliar el parse de `view` para aceptar `"cobros"` y, cuando aplique, renderizar `<CobrosView range={...} />` en vez de las secciones Lista/Mes. El resumen del mes (KPIs actuales) y las secciones Próximos/Pasados solo se muestran en `view === 'lista'`.

### Cambios de consistencia (quitar gate de tipo)

- `getFinanceKpis()`: quitar `.eq("type", "show")`. Sigue acotado al mes actual.
- `src/app/api/export/finance/route.ts`: quitar `.eq("type", "show")`. El CSV pasa a incluir cualquier evento con datos financieros en el rango.

## Riesgos / consideraciones

- **RLS:** todas las queries filtran por `user_id` (patrón existente en `calendar-events.ts`); sin exposición cross-user.
- **Cambio de comportamiento del CSV / KPI del mes:** ahora incluirán eventos `otro` con plata. Es el efecto buscado y coherente con la decisión; no rompe nada porque antes simplemente no aparecían.
- **Performance:** `getCobros("all")` puede traer muchas filas para usuarios con mucha historia. El límite práctico actual (usuarios beta) es bajo; se puede paginar/limitar en el futuro si hace falta. No optimizar ahora (YAGNI).
- **tz:** usar siempre America/Santiago para día/mes/aging, consistente con el fix documentado en `EventRow`.

## Verificación

- Con eventos `otro` que tengan monto + estado pendiente en meses pasados → aparecen en POR COBRAR con aging correcto.
- "Marcar pagado" mueve la fila a COBRADO y setea `paid_at`.
- Filtro de rango acota correctamente (mes/año en tz Santiago).
- El resumen del mes en Lista y el Export CSV ahora incluyen eventos `otro` con plata.
- Empty state cuando no hay nada financiero.
