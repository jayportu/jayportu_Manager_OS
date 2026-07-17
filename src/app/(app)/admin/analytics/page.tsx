/**
 * Sprint 23.5 — /admin/analytics · Vista de uso real.
 */

import { assertAdmin } from "@/lib/queries/admin";
import { getAnalyticsSnapshot, getConversionFunnel } from "@/lib/queries/analytics";
import {
  SectionHero,
  GlassPanel,
  KpiTile,
  TableShell,
  Th,
  Td,
} from "@/components/hos";

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
      <SectionHero
        kicker="ADMIN · ANALYTICS · ÚLTIMOS 30 DÍAS"
        title="USO REAL"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiTile
          label="BETA ACTIVOS"
          value={snap.activeBetaUsers}
          sub={`de ${snap.totalBetaApproved} aprobados`}
          accent
        />
        <KpiTile
          label="RETENCIÓN D7"
          value={`${d7Pct}%`}
          sub={`${snap.retentionD7.active}/${snap.retentionD7.total} activos`}
        />
        <KpiTile
          label="NPS PROMEDIO"
          value={snap.npsAvg !== null ? snap.npsAvg : "—"}
          sub={`${snap.npsCount} respuestas`}
        />
        <KpiTile
          label="RETENCIÓN D15"
          value={`${d15Pct}%`}
          sub={`${snap.retentionD15.active}/${snap.retentionD15.total} activos`}
        />
      </div>

      {/* Top features */}
      <GlassPanel className="mb-6">
        <h2 className="font-display text-2xl leading-none mb-4">
          TOP FEATURES (POR USERS ÚNICOS)
        </h2>
        {snap.topFeatures.length === 0 && (
          <div className="text-sm text-white/55">
            Aún sin eventos. A medida que los beta users usen la app, este top se llena.
          </div>
        )}
        <div className="space-y-2">
          {snap.topFeatures.map((f) => {
            const widthPct = Math.round((f.uniqueUsers / maxFeatureUsers) * 100);
            return (
              <div key={f.event} className="flex items-center gap-3">
                <div className="w-48 text-sm font-mono shrink-0 truncate text-white/80">
                  {f.event}
                </div>
                <div className="flex-1 h-6 bg-white/[0.08] relative rounded-md overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-[rgb(var(--drop-orange))]"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <div className="w-32 text-right font-mono text-xs text-white/70">
                  {f.uniqueUsers} users · {f.count}
                </div>
              </div>
            );
          })}
        </div>
      </GlassPanel>

      {/* Funnel de conversión (adquisición → activación) */}
      <GlassPanel className="mb-6">
        <h2 className="font-display text-2xl leading-none mb-1">
          FUNNEL DE CONVERSIÓN
        </h2>
        <div className="font-mono text-[10px] text-white/45 mb-4 uppercase tracking-wider">
          Últimos {funnel.windowDays} días · etapas 1-2 = sesiones únicas · 3-6 = cuentas · conteo por actividad en la ventana
        </div>
        <TableShell bare>
          <thead>
            <tr>
              <Th>Etapa</Th>
              <Th align="right">Total</Th>
              <Th align="right">% del paso ant.</Th>
              <Th align="right">% del tope</Th>
            </tr>
          </thead>
          <tbody>
            {funnel.stages.map((s) => (
              <tr key={s.step}>
                <Td>
                  {s.step}{" "}
                  <span className="font-mono text-[10px] text-white/45">
                    ({s.unit})
                  </span>
                </Td>
                <Td align="right" className="font-mono">{s.count}</Td>
                <Td align="right" className="font-mono">{s.pctOfPrev}%</Td>
                <Td align="right" className="font-mono">{s.pctOfTop}%</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>

        <h3 className="font-display text-lg leading-none mt-6 mb-2">
          FUENTES → /beta
        </h3>
        {funnel.betaSources.length === 0 ? (
          <div className="text-sm text-white/55">
            Aún sin tráfico registrado a /beta en la ventana.
          </div>
        ) : (
          <TableShell bare>
            <tbody>
              {funnel.betaSources.map((s) => (
                <tr key={s.source}>
                  <Td className="font-mono">{s.source}</Td>
                  <Td align="right" className="font-mono">
                    {s.sessions} sesiones
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </GlassPanel>

      {/* Funnel */}
      <GlassPanel>
        <h2 className="font-display text-2xl leading-none mb-4">
          FUNNEL ONBOARDING
        </h2>
        <TableShell bare>
          <thead>
            <tr>
              <Th>Paso</Th>
              <Th align="right">Users</Th>
              <Th align="right">%</Th>
            </tr>
          </thead>
          <tbody>
            {snap.onboardingFunnel.map((f) => (
              <tr key={f.step}>
                <Td>{f.step}</Td>
                <Td align="right" className="font-mono">{f.count}</Td>
                <Td align="right" className="font-mono">{f.pct}%</Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      </GlassPanel>
    </div>
  );
}
