import { assertAdmin } from "@/lib/queries/admin";
import { getSiteTraffic } from "@/lib/queries/site-analytics";
import Link from "next/link";
import { LiveRefresher } from "./live-refresher";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ d?: string }>;
}

const RANGES = [7, 30];

function fmtDur(sec: number): string {
  if (sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("es-CL", {
      timeZone: "America/Santiago",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default async function TraficoPage({ searchParams }: PageProps) {
  await assertAdmin();
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.d)) ? Number(sp.d) : 7;
  const t = await getSiteTraffic(days);

  const maxDay = Math.max(1, ...t.byDay.map((d) => d.views));
  const regPct = t.sessions > 0 ? Math.round((t.registeredSessions / t.sessions) * 100) : 0;
  const convPct =
    t.funnel.anonSessions > 0
      ? Math.round((t.funnel.newAccounts / t.funnel.anonSessions) * 100)
      : 0;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <LiveRefresher intervalSec={15} />
      <div className="mb-6 border-2 border-ink bg-bg-panel p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
            — ADMIN · TRÁFICO
          </div>
          <LiveBadge />
        </div>
        <h1 className="font-display text-4xl md:text-5xl leading-none mt-2">
          TRÁFICO<span className="text-orange">.</span>
        </h1>
        <p className="text-sm text-fg-muted mt-2 max-w-xl">
          Tráfico propio del sitio (registrados vs anónimos + conversión). El
          tráfico anónimo general también está en Vercel Web Analytics.
        </p>
        <div className="mt-4 flex gap-1.5">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/trafico?d=${r}`}
              className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] px-3 py-1.5 border-2 transition-colors ${
                days === r
                  ? "bg-ink text-orange border-ink"
                  : "border-ink text-ink hover:bg-ink hover:text-orange"
              }`}
            >
              {r} días
            </Link>
          ))}
        </div>
      </div>

      {t.totalViews === 0 ? (
        <div className="border-2 border-dashed border-ink/40 bg-cream p-10 text-center text-sm text-fg-muted">
          Aún sin tráfico registrado en este rango. Empieza a contar desde que se
          desplegó el tracker — dale unas horas (y comparte el link).
        </div>
      ) : (
        <>
          {t.partial && (
            <div className="border-2 border-warning bg-warning/10 p-3 mb-5 font-mono text-[11px] text-ink">
              ⚠ Datos parciales: el rango supera el tope de eventos que se leen de
              una vez, así que los totales están sesgados hacia lo más reciente.
            </div>
          )}
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 border-2 border-ink mb-5">
            <Kpi label="Visitas" value={t.totalViews} sub={`${t.sessions} sesiones`} />
            <Kpi label="Anónimas" value={t.anonSessions} sub="sesiones sin cuenta" highlight />
            <Kpi label="Registrados" value={t.registeredSessions} sub={`${regPct}% de sesiones`} />
            <Kpi label="Estadía prom." value={fmtDur(t.avgDurationSec)} sub={`${t.multiPageSessions} ses. +1 pág`} />
          </div>

          {/* Embudo */}
          <div className="border-2 border-ink bg-bg-panel p-5 mb-5">
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted mb-3">
              — Embudo de conversión ({days}d)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FunnelStep n="01" label="Visitas anónimas" value={t.funnel.anonSessions} />
              <FunnelStep n="02" label="Solicitudes de invitación" value={t.funnel.betaRequests} />
              <FunnelStep n="03" label="Cuentas creadas" value={t.funnel.newAccounts} accent />
            </div>
            <p className="font-mono text-[11px] text-fg-subtle mt-3">
              {"// "}Conversión visita anónima → cuenta: <b className="text-ink">{convPct}%</b>
            </p>
          </div>

          {/* Visitas por día */}
          <div className="border-2 border-ink bg-bg-panel p-5 mb-5">
            <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted mb-3">
              — Visitas por día
            </h2>
            <div className="flex items-end gap-[3px] h-28">
              {t.byDay.map((d) => (
                <div
                  key={d.day}
                  title={`${d.day}: ${d.views}`}
                  className="flex-1 bg-orange/80 hover:bg-orange transition-colors"
                  style={{ height: `${Math.max(2, (d.views / maxDay) * 100)}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between font-mono text-[9px] text-fg-subtle mt-1.5">
              <span>{t.byDay[0]?.day.slice(5)}</span>
              <span>{t.byDay[t.byDay.length - 1]?.day.slice(5)}</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mb-5">
            {/* Páginas top */}
            <div className="border-2 border-ink bg-bg-panel p-5">
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted mb-3">
                — Páginas más vistas
              </h2>
              <div className="space-y-1.5">
                {t.topPaths.map((p) => (
                  <div key={p.path} className="flex justify-between text-[12px]">
                    <span className="font-mono truncate mr-2">{p.path}</span>
                    <span className="font-mono text-fg-muted">{p.views}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* De dónde llegan */}
            <div className="border-2 border-ink bg-bg-panel p-5">
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted mb-3">
                — De dónde llegan
              </h2>
              <div className="space-y-1.5">
                {t.topReferrers.map((r) => (
                  <div key={r.source} className="flex justify-between text-[12px]">
                    <span className="font-mono uppercase mr-2">{r.source}</span>
                    <span className="font-mono text-fg-muted">{r.views}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tiempo real */}
          <div className="border-2 border-ink bg-bg-panel p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted">
                — Últimas visitas (tiempo real)
              </h2>
              <LiveBadge />
            </div>
            <div className="divide-y divide-ink/10">
              {t.recent.map((r, i) => (
                <div key={`${r.created_at}-${r.path}-${i}`} className="flex items-center gap-3 py-1.5 text-[12px]">
                  <span className="font-mono text-fg-subtle w-12 shrink-0">{fmtTime(r.created_at)}</span>
                  <span
                    className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border shrink-0 ${
                      r.is_registered
                        ? "border-success/40 text-success"
                        : "border-ink/20 text-fg-muted"
                    }`}
                  >
                    {r.is_registered ? "registrado" : "anónimo"}
                  </span>
                  <span className="font-mono truncate">{r.path}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Indicador pulsante "EN VIVO" (puro CSS). El refresco lo hace LiveRefresher. */
function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-success">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      En vivo
    </span>
  );
}

function Kpi({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: number | string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-4 border-r-2 border-ink last:border-r-0 ${highlight ? "bg-orange" : "bg-bg-panel"}`}>
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em]">— {label}</div>
      <div className="font-display text-4xl leading-none mt-2">{value}</div>
      {sub && <div className="font-mono text-[9px] text-fg-muted mt-1">{sub}</div>}
    </div>
  );
}

function FunnelStep({
  n,
  label,
  value,
  accent,
}: {
  n: string;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="border-2 border-ink p-3">
      <div className={`font-display text-3xl leading-none ${accent ? "text-orange" : "text-ink"}`}>
        {value}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted mt-1">
        {n} · {label}
      </div>
    </div>
  );
}
