import { Megaphone } from "lucide-react";
import { assertAdmin } from "@/lib/queries/admin";
import {
  getEmailCampaigns,
  getCampaignDashboard,
} from "@/lib/queries/email-campaigns";
import { relativeTime } from "@/lib/format";
import { AutoRefresh } from "./auto-refresh";

export const dynamic = "force-dynamic";

function evMeta(t: string): { icon: string; label: string; color: string } {
  switch (t) {
    case "delivered":
      return { icon: "✓", label: "Entregado", color: "#1e9e5a" };
    case "bounced":
      return { icon: "⚠", label: "Rebotó", color: "#FF5C00" };
    case "complained":
      return { icon: "🚫", label: "Queja (spam)", color: "#c0392b" };
    case "opened":
      return { icon: "👁", label: "Abrió", color: "#7A7670" };
    case "clicked":
      return { icon: "🖱", label: "Click", color: "#FF5C00" };
    case "sent":
      return { icon: "➤", label: "Enviado", color: "#7A7670" };
    case "delivery_delayed":
      return { icon: "⏳", label: "Demorado", color: "#7A7670" };
    case "suppressed":
      return { icon: "⛔", label: "Suprimido", color: "#7A7670" };
    default:
      return { icon: "•", label: t, color: "#7A7670" };
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
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-accent" /> Campañas de correo
        </h1>
        <p className="text-sm text-fg-muted mt-3">
          Todavía no hay campañas registradas.
        </p>
      </div>
    );
  }

  const d = await getCampaignDashboard(selected.id);
  const pct = (n: number, base: number) =>
    base > 0 ? Math.round((n / base) * 100) : 0;
  const healthy = d.bounceRate <= 5 && d.complaintRate <= 0.1;

  const kpis: Array<{
    lbl: string;
    num: number;
    sub: string;
    good?: boolean;
    warn?: boolean;
  }> = [
    { lbl: "Enviados", num: d.enviados, sub: `de ${d.total} · ${d.programados} programados` },
    { lbl: "Entregados", num: d.delivered, sub: `${pct(d.delivered, d.enviados)}%`, good: true },
    { lbl: "Rebotados", num: d.bounced, sub: `${d.bounceRate.toFixed(1)}%`, warn: true },
    { lbl: "Quejas", num: d.complained, sub: `${d.complaintRate.toFixed(2)}%`, good: true },
    { lbl: "Aperturas", num: d.opened, sub: `${pct(d.opened, d.delivered)}%` },
    { lbl: "Clicks", num: d.clicked, sub: `${pct(d.clicked, d.delivered)}%` },
  ];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <AutoRefresh seconds={30} />

      {/* Header */}
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-accent" /> Campañas de correo
        </h1>
        <span
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] rounded-full px-3 py-1"
          style={{ color: "#1e7a45", background: "#e8f5ee", border: "1px solid #bfe3cf" }}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: "#1e9e5a" }}
          />{" "}
          En vivo
        </span>
      </div>

      {/* Selector de campañas */}
      <div className="flex gap-2 flex-wrap mb-6">
        {campaigns.map((c) => (
          <a
            key={c.id}
            href={`/admin/email-campaigns?c=${c.slug}`}
            className={`border rounded-md px-4 py-2.5 ${
              c.id === selected.id
                ? "border-ink border-l-[3px] border-l-orange bg-orange/5"
                : "border-border"
            }`}
          >
            <div className="font-semibold text-sm">{c.name}</div>
            <div className="font-mono text-[10px] text-fg-muted uppercase tracking-wider mt-0.5">
              {c.total_recipients} contactos · {c.status}
            </div>
          </a>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
        {kpis.map((k) => (
          <div key={k.lbl} className="border border-border rounded-lg p-4 bg-card">
            <div className="font-mono text-[10px] text-fg-muted uppercase tracking-[0.1em]">
              {k.lbl}
            </div>
            <div
              className="text-3xl font-bold leading-none mt-2 mb-1"
              style={{ color: k.warn && k.num > 0 ? "#FF5C00" : undefined }}
            >
              {k.num}
            </div>
            <div
              className="text-xs"
              style={{ color: k.good ? "#1e9e5a" : "#7A7670" }}
            >
              {k.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Banner de salud */}
      <div
        className="flex items-center gap-2 rounded-md px-4 py-3 text-sm mb-6 border"
        style={{
          background: healthy ? "#e8f5ee" : "#fff4ed",
          borderColor: healthy ? "#bfe3cf" : "#FFD9C2",
        }}
      >
        {healthy ? "✓ " : "⚠ "}
        <span>
          {healthy ? (
            <>
              <b>Entregabilidad sana.</b> Rebote {d.bounceRate.toFixed(1)}% (umbral
              5%) · Quejas {d.complaintRate.toFixed(2)}% (umbral 0.1%). Sin alertas.
            </>
          ) : (
            <>
              <b>Revisar.</b> Rebote {d.bounceRate.toFixed(1)}% / Quejas{" "}
              {d.complaintRate.toFixed(2)}% — sobre el umbral. Considera pausar las
              tandas restantes.
            </>
          )}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Tandas */}
        <div className="border border-border rounded-lg p-5 bg-card">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent mb-4">
            ▸ Progreso por tanda
          </h3>
          <div className="space-y-0">
            {d.tandas.map((t) => (
              <div
                key={t.date}
                className="flex items-center gap-3 py-2 border-t border-border/60 first:border-t-0 text-sm"
              >
                <span style={{ color: t.done ? "#1e9e5a" : "#7A7670" }}>
                  {t.done ? "✓" : "◷"}
                </span>
                <span>{fmtDate(t.date)}</span>
                <span className="ml-auto font-mono text-[11px] text-fg-muted">
                  {t.total} {t.done ? "enviados" : "programados"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Feed en vivo */}
        <div className="border border-border rounded-lg p-5 bg-card">
          <h3 className="font-mono text-[11px] uppercase tracking-[0.15em] text-accent mb-4">
            ▸ Eventos recientes
          </h3>
          {d.feed.length === 0 ? (
            <p className="text-sm text-fg-muted">
              Aún sin eventos. Llegan en vivo a medida que entregan/abren/rebotan.
            </p>
          ) : (
            <div className="space-y-0">
              {d.feed.map((f, i) => {
                const m = evMeta(f.event_type);
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-2 border-t border-border/60 first:border-t-0 text-sm"
                  >
                    <span style={{ color: m.color }}>{m.icon}</span>
                    <div>
                      <div>{m.label}</div>
                      <div className="text-xs text-fg-muted">{f.to_email}</div>
                    </div>
                    <span className="ml-auto font-mono text-[10px] text-fg-muted whitespace-nowrap">
                      {relativeTime(f.occurred_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
