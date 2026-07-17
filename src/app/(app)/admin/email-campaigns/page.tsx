import { Megaphone } from "lucide-react";
import { assertAdmin } from "@/lib/queries/admin";
import {
  getEmailCampaigns,
  getCampaignDashboard,
} from "@/lib/queries/email-campaigns";
import { relativeTime } from "@/lib/format";
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
import { AutoRefresh } from "./auto-refresh";

export const dynamic = "force-dynamic";

type EvTone = "up" | "warn" | "down" | "info" | "neutral";

function evMeta(t: string): { icon: string; label: string; tone: EvTone } {
  switch (t) {
    case "delivered":
      return { icon: "✓", label: "Entregado", tone: "up" };
    case "bounced":
      return { icon: "⚠", label: "Rebotó", tone: "down" };
    case "complained":
      return { icon: "🚫", label: "Queja (spam)", tone: "down" };
    case "opened":
      return { icon: "👁", label: "Abrió", tone: "info" };
    case "clicked":
      return { icon: "🖱", label: "Click", tone: "info" };
    case "sent":
      return { icon: "➤", label: "Enviado", tone: "up" };
    case "delivery_delayed":
      return { icon: "⏳", label: "Demorado", tone: "warn" };
    case "suppressed":
      return { icon: "⛔", label: "Suprimido", tone: "neutral" };
    default:
      return { icon: "•", label: t, tone: "neutral" };
  }
}

function fmtDate(d: string): string {
  return new Date(`${d}T12:00:00`).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
  });
}

export default async function EmailCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  await assertAdmin();
  const sp = await searchParams;
  const campaigns = await getEmailCampaigns();
  const selected = campaigns.find((c) => c.slug === sp.c) ?? campaigns[0];

  if (!selected) {
    return (
      <div className="p-6 md:p-10 max-w-6xl mx-auto">
        <SectionHero kicker="Admin · Correo" title="Campañas" />
        <EmptyState
          icon={Megaphone}
          title="Sin campañas"
          sub="Todavía no hay campañas registradas."
        />
      </div>
    );
  }

  const d = await getCampaignDashboard(selected.id);
  const pct = (n: number, base: number) =>
    base > 0 ? Math.round((n / base) * 100) : 0;
  const healthy = d.bounceRate <= 5 && d.complaintRate <= 0.1;

  const kpis: Array<{
    label: string;
    value: number;
    sub?: string;
    delta?: string;
    tone?: "up" | "down" | "flat";
  }> = [
    {
      label: "Enviados",
      value: d.enviados,
      sub: `de ${d.total} · ${d.programados} programados`,
    },
    {
      label: "Entregados",
      value: d.delivered,
      delta: `${pct(d.delivered, d.enviados)}%`,
      tone: "up",
    },
    {
      label: "Rebotados",
      value: d.bounced,
      delta: `${d.bounceRate.toFixed(1)}%`,
      tone: d.bounced > 0 ? "down" : "flat",
    },
    {
      label: "Quejas",
      value: d.complained,
      delta: `${d.complaintRate.toFixed(2)}%`,
      tone: d.complained > 0 ? "down" : "flat",
    },
    {
      label: "Aperturas",
      value: d.opened,
      sub: `${pct(d.opened, d.delivered)}%`,
    },
    {
      label: "Clicks",
      value: d.clicked,
      sub: `${pct(d.clicked, d.delivered)}%`,
    },
  ];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <AutoRefresh seconds={30} />

      {/* Header */}
      <SectionHero
        kicker="Admin · Correo"
        title="Campañas"
        actions={
          <Badge tone="up">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-current animate-pulse"
            />{" "}
            En vivo
          </Badge>
        }
      />

      {/* Selector de campañas */}
      <div className="flex gap-2 flex-wrap mb-6">
        {campaigns.map((c) => (
          <a key={c.id} href={`/admin/email-campaigns?c=${c.slug}`}>
            <ClayChip active={c.id === selected.id}>
              {c.name} · {c.total_recipients} · {c.status}
            </ClayChip>
          </a>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
        {kpis.map((k) => (
          <KpiTile
            key={k.label}
            label={k.label}
            value={k.value}
            sub={k.sub}
            delta={k.delta}
            tone={k.tone}
          />
        ))}
      </div>

      {/* Banner de salud */}
      <div className="mb-6">
        <Alert
          tone={healthy ? "success" : "danger"}
          title={healthy ? "Entregabilidad sana" : "Revisar"}
        >
          {healthy ? (
            <>
              Rebote {d.bounceRate.toFixed(1)}% (umbral 5%) · Quejas{" "}
              {d.complaintRate.toFixed(2)}% (umbral 0.1%). Sin alertas.
            </>
          ) : (
            <>
              Rebote {d.bounceRate.toFixed(1)}% / Quejas{" "}
              {d.complaintRate.toFixed(2)}% — sobre el umbral. Considera pausar
              las tandas restantes.
            </>
          )}
        </Alert>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Tandas */}
        <GlassPanel>
          <MonoLabel className="mb-4 block">Progreso por tanda</MonoLabel>
          <div className="space-y-0">
            {d.tandas.map((t) => (
              <div
                key={t.date}
                className="flex items-center gap-3 py-2 border-t border-white/[0.06] first:border-t-0 text-sm"
              >
                <span className={t.done ? "text-success" : "text-white/40"}>
                  {t.done ? "✓" : "◷"}
                </span>
                <span>{fmtDate(t.date)}</span>
                <span className="ml-auto font-mono text-[11px] text-white/40">
                  {t.total} {t.done ? "enviados" : "programados"}
                </span>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Feed en vivo */}
        <GlassPanel>
          <MonoLabel className="mb-4 block">Eventos recientes</MonoLabel>
          {d.feed.length === 0 ? (
            <p className="text-sm text-white/50">
              Aún sin eventos. Llegan en vivo a medida que
              entregan/abren/rebotan.
            </p>
          ) : (
            <div className="space-y-0">
              {d.feed.map((f, i) => {
                const m = evMeta(f.event_type);
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-2 border-t border-white/[0.06] first:border-t-0 text-sm"
                  >
                    <div className="min-w-0">
                      <Badge tone={m.tone}>
                        {m.icon} {m.label}
                      </Badge>
                      <div className="text-xs text-white/50 mt-1 truncate">
                        {f.to_email}
                      </div>
                    </div>
                    <span className="ml-auto font-mono text-[10px] text-white/40 whitespace-nowrap">
                      {relativeTime(f.occurred_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
