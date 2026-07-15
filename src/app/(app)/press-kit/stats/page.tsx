import { getMyProfile } from "@/lib/queries/dj-profile";
import {
  getPresskitDaily,
  getPresskitSources,
  listBookings,
} from "@/lib/queries/presskit";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import {
  PRESSKIT_EVENT_LABELS,
  BOOKING_STATUS_LABELS,
  type BookingStatus,
} from "@/types/database";
import {
  SectionHero,
  GlassPanel,
  MonoLabel,
  KpiTile,
  Badge,
  ClayChip,
} from "@/components/hos";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ d?: string }>;
}

const RANGES = [7, 30, 90];

/* Estado del booking → tono del Badge. */
const BOOKING_TONE: Record<
  BookingStatus,
  "up" | "warn" | "down" | "info" | "neutral"
> = {
  nuevo: "info",
  leido: "neutral",
  respondido: "neutral",
  cotizado: "warn",
  contraofertado: "warn",
  agendado: "up",
  rechazado: "down",
};

/**
 * Día YYYY-MM-DD en hora de Chile, `offset` días-calendario atrás.
 * M7: NO restamos ms fijos (86400000) sobre el instante actual — en el cambio
 * de hora chileno un día dura 23h/25h y eso corría el bucket un día. Tomamos la
 * fecha-calendario de HOY en Chile y caminamos días hacia atrás sobre un Date
 * anclado a mediodía UTC (inmune al DST porque solo leemos la parte de fecha).
 */
function santiagoDay(offset: number): string {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Santiago",
  });
  const [y, m, d] = today.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() - offset);
  return base.toISOString().slice(0, 10);
}

function hostOf(ref: string): string {
  try {
    return new URL(ref).hostname.replace(/^www\./, "");
  } catch {
    return ref;
  }
}

export default async function PressKitStatsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.d)) ? Number(sp.d) : 30;

  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  const [daily, sources, bookings] = await Promise.all([
    getPresskitDaily(days),
    getPresskitSources(days),
    listBookings(),
  ]);

  // M6: un único set de días-calendario (hora de Chile, de hoy hacia atrás).
  // El RPC trae una ventana MÓVIL (now() - p_days días) que incluye un día
  // borde parcial → si los KPIs sumaran TODO el RPC y el chart solo estos días,
  // la suma de barras no cuadraría con el KPI de Visitas. Alineamos ambos a la
  // misma ventana de días completos.
  const windowDays = Array.from({ length: days }, (_, i) =>
    santiagoDay(days - 1 - i)
  );
  const windowSet = new Set(windowDays);
  const dailyInWindow = daily.filter((r) => windowSet.has(r.day));

  // Totales por evento (sobre la MISMA ventana que el chart)
  const byEvent: Record<string, number> = {};
  for (const r of dailyInWindow) byEvent[r.event] = (byEvent[r.event] || 0) + r.n;
  const views = byEvent.view || 0;
  const clicks = Object.entries(byEvent)
    .filter(([k]) => k.startsWith("click_"))
    .reduce((a, [, v]) => a + v, 0);
  const formOpens = byEvent.form_open || 0;
  const formSubmits = byEvent.form_submit || 0;
  // M8: la conversión no puede pasar de 100% (gaps de tracking podrían dar
  // submits>views) → clamp para no mostrar "150%".
  const conv = views > 0 ? Math.min(100, Math.round((formSubmits / views) * 100)) : 0;

  // Serie de visitas por día (rellena ceros), misma ventana
  const viewsByDay = new Map<string, number>();
  for (const r of dailyInWindow) {
    if (r.event === "view") viewsByDay.set(r.day, (viewsByDay.get(r.day) || 0) + r.n);
  }
  const series = windowDays.map((day) => ({ day, n: viewsByDay.get(day) || 0 }));
  const maxDay = Math.max(1, ...series.map((s) => s.n));
  const peak = series.reduce((a, b) => (b.n > a.n ? b : a), series[0]);

  // Canales (click_*)
  const channels = Object.entries(byEvent)
    .filter(([k]) => k.startsWith("click_"))
    .sort((a, b) => b[1] - a[1]);
  const maxChannel = Math.max(1, ...channels.map(([, v]) => v));

  // Orígenes
  const refMap = new Map<string, number>();
  const countryMap = new Map<string, number>();
  const utmMap = new Map<string, number>();
  for (const s of sources) {
    if (s.dimension === "referrer") {
      const h = hostOf(s.value);
      refMap.set(h, (refMap.get(h) || 0) + s.n);
    } else if (s.dimension === "country") {
      countryMap.set(s.value, (countryMap.get(s.value) || 0) + s.n);
    } else if (s.dimension === "utm_source") {
      utmMap.set(s.value, (utmMap.get(s.value) || 0) + s.n);
    }
  }
  const topN = (m: Map<string, number>, n = 5) =>
    Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n);

  // Solicitudes en el rango
  const sinceTs = Date.now() - days * 86400000;
  const rangeBookings = bookings.filter(
    (b) => new Date(b.created_at).getTime() >= sinceTs
  );
  const bookingsByStatus = new Map<string, number>();
  for (const b of rangeBookings)
    bookingsByStatus.set(b.status, (bookingsByStatus.get(b.status) || 0) + 1);

  const noData = dailyInWindow.length === 0 && rangeBookings.length === 0;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <Link
        href="/press-kit"
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50 hover:text-white"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Volver al press kit
      </Link>

      <SectionHero
        kicker="Press kit · Estadísticas"
        title="Stats"
        sub="Cómo rinde tu press kit público: quién lo ve, qué tocan y cuántos terminan escribiéndote."
      />

      {/* Selector de rango */}
      <div className="mb-5 flex items-center gap-1.5">
        {RANGES.map((r) => (
          <Link key={r} href={`/press-kit/stats?d=${r}`}>
            <ClayChip active={days === r}>{r} días</ClayChip>
          </Link>
        ))}
      </div>

      {noData ? (
        <GlassPanel className="text-center py-10">
          <Eye className="w-10 h-10 mx-auto text-white/40 mb-3" />
          <h3 className="font-semibold mb-1">Sin datos en este rango</h3>
          <p className="text-sm text-white/50 max-w-md mx-auto">
            Comparte tu link público para empezar a recibir visitas. Cuando
            alguien lo abra, vas a ver acá de dónde llega y qué mira.
          </p>
        </GlassPanel>
      ) : (
        <>
          {/* KPIs */}
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiTile label="Visitas" value={views} />
            <KpiTile label="Clicks" value={clicks} />
            <KpiTile label="Solicitudes" value={formSubmits} accent />
            <KpiTile label="Conversión" value={`${conv}%`} sub="envíos / visitas" />
          </div>

          {/* Embudo */}
          <GlassPanel className="mb-5">
            <MonoLabel>Embudo</MonoLabel>
            <div className="mt-3 space-y-2.5">
              <FunnelBar label="Visitas" value={views} base={views} />
              <FunnelBar
                label="Abrió formulario"
                value={formOpens}
                base={views}
                pct={views > 0 ? Math.min(100, Math.round((formOpens / views) * 100)) : 0}
              />
              <FunnelBar
                label="Envió formulario"
                value={formSubmits}
                base={views}
                pct={views > 0 ? Math.min(100, Math.round((formSubmits / views) * 100)) : 0}
              />
            </div>
          </GlassPanel>

          {/* Visitas por día */}
          <GlassPanel className="mb-5">
            <div className="flex items-end justify-between mb-3">
              <MonoLabel>Visitas por día</MonoLabel>
              {peak && peak.n > 0 && (
                <span className="font-mono text-[10px] text-white/40">
                  pico {peak.n} · {peak.day.slice(5)}
                </span>
              )}
            </div>
            <div className="flex items-end gap-[2px] h-28">
              {series.map((s) => (
                <div
                  key={s.day}
                  title={`${s.day}: ${s.n}`}
                  className="flex-1 rounded-t-sm bg-orange/80 hover:bg-orange transition-colors"
                  style={{ height: `${Math.max(2, (s.n / maxDay) * 100)}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between font-mono text-[9px] text-white/40 mt-1.5">
              <span>{series[0]?.day.slice(5)}</span>
              <span>{series[series.length - 1]?.day.slice(5)}</span>
            </div>
          </GlassPanel>

          <div className="grid md:grid-cols-2 gap-5 mb-5">
            {/* Por canal */}
            <GlassPanel>
              <MonoLabel>Por canal</MonoLabel>
              {channels.length === 0 ? (
                <p className="text-sm text-white/50 mt-3">Aún sin clicks.</p>
              ) : (
                <div className="mt-3 space-y-2.5">
                  {channels.map(([event, n]) => (
                    <div key={event}>
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="text-white/60">
                          {PRESSKIT_EVENT_LABELS[
                            event as keyof typeof PRESSKIT_EVENT_LABELS
                          ] || event}
                        </span>
                        <span className="font-mono text-white/45">{n}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-white/35"
                          style={{ width: `${(n / maxChannel) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassPanel>

            {/* De dónde llegan */}
            <GlassPanel>
              <MonoLabel>De dónde llegan</MonoLabel>
              <div className="mt-3">
                <SourceList title="Sitios" rows={topN(refMap)} empty="Tráfico directo" />
                <SourceList title="Países" rows={topN(countryMap)} />
                {utmMap.size > 0 && <SourceList title="Campañas (UTM)" rows={topN(utmMap)} />}
              </div>
            </GlassPanel>
          </div>

          {/* Solicitudes */}
          <GlassPanel>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <MonoLabel>Solicitudes ({rangeBookings.length})</MonoLabel>
              <Link
                href="/press-kit"
                className="font-mono text-[10px] font-bold uppercase tracking-wider text-orange hover:underline"
              >
                Ver bandeja →
              </Link>
            </div>
            {rangeBookings.length === 0 ? (
              <p className="text-sm text-white/50">
                Sin solicitudes en este rango.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Array.from(bookingsByStatus.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, n]) => (
                    <Badge
                      key={status}
                      tone={BOOKING_TONE[status as BookingStatus] ?? "neutral"}
                    >
                      {BOOKING_STATUS_LABELS[status as BookingStatus] || status}{" "}
                      <span className="font-bold">{n}</span>
                    </Badge>
                  ))}
              </div>
            )}
          </GlassPanel>
        </>
      )}
    </div>
  );
}

function FunnelBar({
  label,
  value,
  base,
  pct,
}: {
  label: string;
  value: number;
  base: number;
  pct?: number;
}) {
  // M8: clamp a [0,100] — si value>base (gaps de tracking) la barra desbordaba.
  const width = base > 0 ? Math.min(100, Math.max(2, (value / base) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-[12px] mb-1">
        <span className="text-white/60">{label}</span>
        <span className="font-mono text-white/45">
          {value}
          {pct !== undefined && <span className="text-white/35"> · {pct}%</span>}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-orange" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function SourceList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: [string, number][];
  empty?: string;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-white/40 mb-1">
        {title}
      </div>
      {rows.length === 0 ? (
        <div className="text-[12px] text-white/50">{empty || "—"}</div>
      ) : (
        <div className="space-y-0.5">
          {rows.map(([value, n]) => (
            <div key={value} className="flex justify-between text-[12px]">
              <span className="truncate mr-2 text-white/60">{value}</span>
              <span className="font-mono text-white/45">{n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
