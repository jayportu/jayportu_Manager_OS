import { assertAdmin } from "@/lib/queries/admin";
import { getSiteTraffic } from "@/lib/queries/site-analytics";
import Link from "next/link";
import {
  SectionHero,
  GlassPanel,
  MonoLabel,
  KpiTile,
  Badge,
  Alert,
  EmptyState,
  ClayChip,
} from "@/components/hos";
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

      <SectionHero
        kicker="Admin · Tráfico"
        title="TRÁFICO"
        sub="Tráfico propio del sitio (registrados vs anónimos + conversión). El tráfico anónimo general también está en Vercel Web Analytics."
        actions={
          <>
            <LiveBadge />
            {RANGES.map((r) => (
              <Link key={r} href={`/admin/trafico?d=${r}`}>
                <ClayChip active={days === r}>{r} días</ClayChip>
              </Link>
            ))}
          </>
        }
      />

      {t.totalViews === 0 ? (
        <EmptyState
          title="Aún sin tráfico registrado en este rango."
          sub="Empieza a contar desde que se desplegó el tracker — dale unas horas (y comparte el link)."
        />
      ) : (
        <>
          {t.partial && (
            <div className="mb-5">
              <Alert tone="warn" title="Datos parciales">
                el rango supera el tope de eventos que se leen de una vez, así que
                los totales están sesgados hacia lo más reciente.
              </Alert>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <KpiTile label="Visitas" value={t.totalViews} sub={`${t.sessions} sesiones`} />
            <KpiTile label="Anónimas" value={t.anonSessions} sub="sesiones sin cuenta" accent />
            <KpiTile label="Registrados" value={t.registeredSessions} sub={`${regPct}% de sesiones`} />
            <KpiTile label="Estadía prom." value={fmtDur(t.avgDurationSec)} sub={`${t.multiPageSessions} ses. +1 pág`} />
          </div>

          {/* Embudo */}
          <GlassPanel className="mb-5">
            <div className="mb-3">
              <MonoLabel>Embudo de conversión ({days}d)</MonoLabel>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FunnelStep n="01" label="Visitas anónimas" value={t.funnel.anonSessions} />
              <FunnelStep n="02" label="Solicitudes de invitación" value={t.funnel.betaRequests} />
              <FunnelStep n="03" label="Cuentas creadas" value={t.funnel.newAccounts} accent />
            </div>
            <p className="font-mono text-[11px] text-white/45 mt-3">
              {"// "}Conversión visita anónima → cuenta: <b className="text-white">{convPct}%</b>
            </p>
          </GlassPanel>

          {/* Visitas por día */}
          <GlassPanel className="mb-5">
            <div className="mb-3">
              <MonoLabel>Visitas por día</MonoLabel>
            </div>
            <div className="flex items-end gap-[3px] h-28">
              {t.byDay.map((d) => (
                <div
                  key={d.day}
                  title={`${d.day}: ${d.views}`}
                  className="flex-1 bg-[rgb(var(--drop-orange))]/80 hover:bg-[rgb(var(--drop-orange))] transition-colors"
                  style={{ height: `${Math.max(2, (d.views / maxDay) * 100)}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between font-mono text-[9px] text-white/35 mt-1.5">
              <span>{t.byDay[0]?.day.slice(5)}</span>
              <span>{t.byDay[t.byDay.length - 1]?.day.slice(5)}</span>
            </div>
          </GlassPanel>

          <div className="grid md:grid-cols-2 gap-5 mb-5">
            {/* Páginas top */}
            <GlassPanel>
              <div className="mb-3">
                <MonoLabel>Páginas más vistas</MonoLabel>
              </div>
              <div className="space-y-1.5">
                {t.topPaths.map((p) => (
                  <div key={p.path} className="flex justify-between text-[12px]">
                    <span className="font-mono truncate mr-2 text-white/75">{p.path}</span>
                    <span className="font-mono text-white/45">{p.views}</span>
                  </div>
                ))}
              </div>
            </GlassPanel>
            {/* De dónde llegan */}
            <GlassPanel>
              <div className="mb-3">
                <MonoLabel>De dónde llegan</MonoLabel>
              </div>
              <div className="space-y-1.5">
                {t.topReferrers.map((r) => (
                  <div key={r.source} className="flex justify-between text-[12px]">
                    <span className="font-mono uppercase mr-2 text-white/75">{r.source}</span>
                    <span className="font-mono text-white/45">{r.views}</span>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>

          {/* Tiempo real */}
          <GlassPanel>
            <div className="flex items-center justify-between gap-3 mb-3">
              <MonoLabel>Últimas visitas (tiempo real)</MonoLabel>
              <LiveBadge />
            </div>
            <div className="divide-y divide-white/[0.06]">
              {t.recent.map((r, i) => (
                <div key={`${r.created_at}-${r.path}-${i}`} className="flex items-center gap-3 py-1.5 text-[12px]">
                  <span className="font-mono text-white/35 w-12 shrink-0">{fmtTime(r.created_at)}</span>
                  <span className="shrink-0">
                    <Badge tone={r.is_registered ? "up" : "neutral"}>
                      {r.is_registered ? "registrado" : "anónimo"}
                    </Badge>
                  </span>
                  <span className="font-mono truncate text-white/75">{r.path}</span>
                </div>
              ))}
            </div>
          </GlassPanel>
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
    <div className="rounded-xl border border-white/10 p-3">
      <div className={`font-display text-3xl leading-none ${accent ? "text-[rgb(var(--drop-orange))]" : "text-white"}`}>
        {value}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-white/45 mt-1">
        {n} · {label}
      </div>
    </div>
  );
}
