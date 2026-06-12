import { assertAdmin } from "@/lib/queries/admin";
import { getPulso } from "@/lib/queries/pulso";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ d?: string }>;
}

const RANGES = [7, 30];

function pct(a: number, b: number): string {
  if (b <= 0) return "—";
  return `${Math.round((a / b) * 100)}%`;
}

export default async function PulsoPage({ searchParams }: PageProps) {
  await assertAdmin();
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.d)) ? Number(sp.d) : 7;
  const p = await getPulso(days);

  const funnel = [
    { n: "01", label: "Aprobados", value: p.approved, of: null as number | null },
    { n: "02", label: "Registrados", value: p.registered, of: p.approved },
    { n: "03", label: "Perfil completo", value: p.onboarded, of: p.registered },
    { n: "04", label: "Con evento público", value: p.withEvent, of: p.onboarded, accent: true },
  ];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="mb-6 border-2 border-ink bg-white p-6">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — ADMIN · PULSO DE BETA
        </div>
        <h1 className="font-display text-4xl md:text-5xl leading-none mt-2">
          PULSO<span className="text-orange">.</span>
        </h1>
        <p className="text-sm text-fg-muted mt-2 max-w-2xl">
          Qué pasa con DJs y bookers <b>después</b> de llegar. (El lado tráfico→cuenta
          está en <Link href="/admin/trafico" className="underline">Tráfico</Link>.)
        </p>
        <div className="mt-4 flex gap-1.5">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/pulso?d=${r}`}
              className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] px-3 py-1.5 border-2 transition-colors ${
                days === r ? "bg-ink text-orange border-ink" : "border-ink text-ink hover:bg-ink hover:text-orange"
              }`}
            >
              {r} días
            </Link>
          ))}
        </div>
      </div>

      {/* Embudo de oferta */}
      <div className="border-2 border-ink bg-white p-5 mb-5">
        <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted mb-3">
          — Embudo de oferta (DJs · acumulado)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {funnel.map((s) => (
            <div key={s.n} className="border-2 border-ink p-3">
              <div className={`font-display text-3xl leading-none ${s.accent ? "text-orange" : "text-ink"}`}>{s.value}</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted mt-1">{s.n} · {s.label}</div>
              {s.of != null && (
                <div className="font-mono text-[10px] text-fg-subtle mt-0.5">{pct(s.value, s.of)} del paso anterior</div>
              )}
            </div>
          ))}
        </div>
        <p className="font-mono text-[11px] text-fg-subtle mt-3">
          {"// "}Conversión registrado → perfil completo: <b className="text-ink">{pct(p.onboarded, p.registered)}</b>
          {" · "}«Aprobados» = solicitudes en beta_requests (los correos de campaña enviados son un número aparte, ~705 ola 1 + ~809 ola 2).
        </p>
      </div>

      {/* Esta semana / ventana */}
      <div className="border-2 border-ink bg-white p-5 mb-5">
        <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted mb-3">
          — Movimiento ({days} días)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 border-2 border-ink">
          <Kpi label="DJs nuevos" value={p.newDjs} />
          <Kpi label="Completaron perfil" value={p.newOnboarded} highlight />
          <Kpi label="Bookers nuevos" value={p.newBookers} />
          <Kpi label="Solicitudes" value={p.bookings} sub="bookings recibidos" />
          <Kpi label="Pitches" value={p.pitches} sub="a venues" />
          <Kpi label="Favoritos" value={p.favorites} sub="guardados" />
          <Kpi label="RSVPs" value={p.rsvps} sub="de fans a eventos" />
          <Kpi label="Bookers (total)" value={p.bookers} sub={`${p.publicEvents} eventos públicos`} />
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, highlight }: { label: string; value: number; sub?: string; highlight?: boolean }) {
  return (
    <div className={`p-4 border-r-2 border-b-2 border-ink ${highlight ? "bg-orange" : "bg-white"}`}>
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em]">— {label}</div>
      <div className="font-display text-3xl leading-none mt-2">{value}</div>
      {sub && <div className="font-mono text-[9px] text-fg-muted mt-1">{sub}</div>}
    </div>
  );
}
