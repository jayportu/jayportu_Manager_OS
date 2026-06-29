/**
 * Sprint 23.5 — /admin/analytics · Vista de uso real.
 */

import { assertAdmin } from "@/lib/queries/admin";
import { getAnalyticsSnapshot, getConversionFunnel } from "@/lib/queries/analytics";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await assertAdmin();
  const snap = await getAnalyticsSnapshot();
  const funnel = await getConversionFunnel(30);

  const d7Pct =
    snap.retentionD7.total > 0
      ? Math.round((snap.retentionD7.active / snap.retentionD7.total) * 100)
      : 0;
  const d15Pct =
    snap.retentionD15.total > 0
      ? Math.round((snap.retentionD15.active / snap.retentionD15.total) * 100)
      : 0;

  const maxFeatureUsers = Math.max(
    1,
    ...snap.topFeatures.map((f) => f.uniqueUsers)
  );

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="mb-6 border-2 border-border bg-bg-panel p-6">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — ADMIN · ANALYTICS · ÚLTIMOS 30 DÍAS
        </div>
        <h1 className="font-display text-4xl md:text-5xl leading-none mt-2">
          USO REAL<span className="text-orange">.</span>
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-2 border-border mb-6">
        <div className="bg-orange p-4 border-r-2 border-border">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em]">
            — BETA ACTIVOS
          </div>
          <div className="font-display text-4xl leading-none mt-2">
            {snap.activeBetaUsers}
          </div>
          <div className="font-mono text-[10px] mt-2 opacity-90">
            de {snap.totalBetaApproved} aprobados
          </div>
        </div>
        <div className="bg-bg-panel p-4 border-r-2 border-border">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em]">
            — RETENCIÓN D7
          </div>
          <div className="font-display text-4xl leading-none mt-2">
            {d7Pct}%
          </div>
          <div className="font-mono text-[10px] mt-2 text-fg-muted">
            {snap.retentionD7.active}/{snap.retentionD7.total} activos
          </div>
        </div>
        <div className="bg-bg-panel p-4 border-r-2 border-border">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em]">
            — NPS PROMEDIO
          </div>
          <div className="font-display text-4xl leading-none mt-2">
            {snap.npsAvg !== null ? snap.npsAvg : "—"}
          </div>
          <div className="font-mono text-[10px] mt-2 text-fg-muted">
            {snap.npsCount} respuestas
          </div>
        </div>
        <div className="bg-ink text-white p-4">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em]">
            — RETENCIÓN D15
          </div>
          <div className="font-display text-4xl leading-none mt-2">
            {d15Pct}%
          </div>
          <div className="font-mono text-[10px] mt-2 opacity-80">
            {snap.retentionD15.active}/{snap.retentionD15.total} activos
          </div>
        </div>
      </div>

      {/* Top features */}
      <div className="border-2 border-border bg-bg-panel p-6 mb-6">
        <h2 className="font-display text-2xl leading-none mb-4">
          TOP FEATURES (POR USERS ÚNICOS)
        </h2>
        {snap.topFeatures.length === 0 && (
          <div className="text-sm text-fg-muted">
            Aún sin eventos. A medida que los beta users usen la app, este top se llena.
          </div>
        )}
        <div className="space-y-2">
          {snap.topFeatures.map((f) => {
            const widthPct = Math.round((f.uniqueUsers / maxFeatureUsers) * 100);
            return (
              <div key={f.event} className="flex items-center gap-3">
                <div className="w-48 text-sm font-mono shrink-0 truncate">
                  {f.event}
                </div>
                <div className="flex-1 h-6 bg-cream border-2 border-border relative">
                  <div
                    className="absolute top-0 left-0 h-full bg-orange"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <div className="w-32 text-right font-mono text-xs">
                  {f.uniqueUsers} users · {f.count}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Funnel de conversión (adquisición → activación) */}
      <div className="border-2 border-border bg-bg-panel p-6 mb-6">
        <h2 className="font-display text-2xl leading-none mb-1">
          FUNNEL DE CONVERSIÓN
        </h2>
        <div className="font-mono text-[10px] text-fg-muted mb-4 uppercase tracking-wider">
          Últimos {funnel.windowDays} días · etapas 1-2 = sesiones únicas · 3-6 = cuentas · conteo por actividad en la ventana
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-border font-mono text-[10px] uppercase tracking-wider">
              <th className="text-left py-2">Etapa</th>
              <th className="text-right py-2 w-20">Total</th>
              <th className="text-right py-2 w-28">% del paso ant.</th>
              <th className="text-right py-2 w-24">% del tope</th>
            </tr>
          </thead>
          <tbody>
            {funnel.stages.map((s) => (
              <tr key={s.step} className="border-b border-border/10">
                <td className="py-2.5">
                  {s.step}{" "}
                  <span className="font-mono text-[10px] text-fg-muted">
                    ({s.unit})
                  </span>
                </td>
                <td className="py-2.5 text-right font-mono">{s.count}</td>
                <td className="py-2.5 text-right font-mono">{s.pctOfPrev}%</td>
                <td className="py-2.5 text-right font-mono">{s.pctOfTop}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="font-display text-lg leading-none mt-6 mb-2">
          FUENTES → /beta
        </h3>
        {funnel.betaSources.length === 0 ? (
          <div className="text-sm text-fg-muted">
            Aún sin tráfico registrado a /beta en la ventana.
          </div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {funnel.betaSources.map((s) => (
                <tr key={s.source} className="border-b border-border/10">
                  <td className="py-2 font-mono">{s.source}</td>
                  <td className="py-2 text-right font-mono">
                    {s.sessions} sesiones
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Funnel */}
      <div className="border-2 border-border bg-bg-panel p-6">
        <h2 className="font-display text-2xl leading-none mb-4">
          FUNNEL ONBOARDING
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-border font-mono text-[10px] uppercase tracking-wider">
              <th className="text-left py-2">Paso</th>
              <th className="text-right py-2 w-24">Users</th>
              <th className="text-right py-2 w-24">%</th>
            </tr>
          </thead>
          <tbody>
            {snap.onboardingFunnel.map((f) => (
              <tr key={f.step} className="border-b border-border/10">
                <td className="py-2.5">{f.step}</td>
                <td className="py-2.5 text-right font-mono">{f.count}</td>
                <td className="py-2.5 text-right font-mono">{f.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
