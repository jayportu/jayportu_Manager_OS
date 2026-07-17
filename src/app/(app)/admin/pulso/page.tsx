import { assertAdmin } from "@/lib/queries/admin";
import { getPulso, getBookerFunnel } from "@/lib/queries/pulso";
import Link from "next/link";
import {
  SectionHero,
  GlassPanel,
  MonoLabel,
  ClayChip,
  KpiTile,
} from "@/components/hos";

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
  const [p, bf] = await Promise.all([getPulso(days), getBookerFunnel(days)]);

  const funnel = [
    { n: "01", label: "Aprobados", value: p.approved, of: null as number | null },
    { n: "02", label: "Registrados", value: p.registered, of: p.approved },
    { n: "03", label: "Perfil completo", value: p.onboarded, of: p.registered },
    { n: "04", label: "Con evento público", value: p.withEvent, of: p.onboarded, accent: true },
  ];

  const bookerFunnel = [
    { n: "01", label: "Registrados", value: bf.registered, of: null as number | null },
    { n: "02", label: "Verificados", value: bf.verified, of: bf.registered },
    { n: "03", label: "Envió solicitud", value: bf.withRequest, of: bf.registered },
    { n: "04", label: "Publicó convocatoria", value: bf.withGig, of: bf.verified, accent: true },
  ];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <SectionHero
        kicker="ADMIN · PULSO DE BETA"
        title="PULSO"
        actions={
          <>
            {RANGES.map((r) => (
              <Link key={r} href={`/admin/pulso?d=${r}`}>
                <ClayChip active={days === r}>{r} días</ClayChip>
              </Link>
            ))}
          </>
        }
      />
      <p className="mb-6 max-w-2xl text-sm text-white/55">
        Qué pasa con DJs y bookers <b>después</b> de llegar. (El lado tráfico→cuenta
        está en <Link href="/admin/trafico" className="underline">Tráfico</Link>.)
      </p>

      {/* Embudo de oferta */}
      <GlassPanel className="mb-5">
        <div className="mb-3">
          <MonoLabel>Embudo de oferta (DJs · acumulado)</MonoLabel>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {funnel.map((s) => (
            <div
              key={s.n}
              className="hos-clay rounded-2xl p-3"
              style={s.accent ? { background: "rgb(var(--drop-orange))", color: "rgb(var(--drop-ink))" } : undefined}
            >
              <div className={`font-display text-3xl leading-none ${s.accent ? "" : "text-white/90"}`}>{s.value}</div>
              <div className={`font-mono text-[10px] uppercase tracking-wider mt-1 ${s.accent ? "opacity-70" : "text-white/45"}`}>{s.n} · {s.label}</div>
              {s.of != null && (
                <div className={`font-mono text-[10px] mt-0.5 ${s.accent ? "opacity-60" : "text-white/40"}`}>{pct(s.value, s.of)} del paso anterior</div>
              )}
            </div>
          ))}
        </div>
        <p className="font-mono text-[11px] text-white/40 mt-3">
          {"// "}Conversión registrado → perfil completo: <b className="text-white/90">{pct(p.onboarded, p.registered)}</b>
          {" · "}«Aprobados» = solicitudes en beta_requests (los correos de campaña enviados son un número aparte, ~705 ola 1 + ~809 ola 2).
        </p>
      </GlassPanel>

      {/* Embudo de bookers (F2c) */}
      <GlassPanel className="mb-5">
        <div className="mb-3">
          <MonoLabel>Embudo de bookers (demanda · acumulado)</MonoLabel>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {bookerFunnel.map((s) => (
            <div
              key={s.n}
              className="hos-clay rounded-2xl p-3"
              style={s.accent ? { background: "rgb(var(--drop-orange))", color: "rgb(var(--drop-ink))" } : undefined}
            >
              <div className={`font-display text-3xl leading-none ${s.accent ? "" : "text-white/90"}`}>{s.value}</div>
              <div className={`font-mono text-[10px] uppercase tracking-wider mt-1 ${s.accent ? "opacity-70" : "text-white/45"}`}>{s.n} · {s.label}</div>
              {s.of != null && (
                <div className={`font-mono text-[10px] mt-0.5 ${s.accent ? "opacity-60" : "text-white/40"}`}>{pct(s.value, s.of)} de registrados</div>
              )}
            </div>
          ))}
        </div>
        <p className="font-mono text-[11px] text-white/40 mt-3">
          {"// "}Verificación: <b className="text-white/90">{pct(bf.verified, bf.registered)}</b> de los registrados
          {bf.verifyPending > 0 && (
            <> · <b className="text-orange">{bf.verifyPending}</b> pendientes en <Link href="/admin/bookers" className="underline">la cola</Link></>
          )}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          <KpiTile label="Visitas /bookers" value={bf.visitsLanding} sub={`${days}d`} />
          <KpiTile label="Visitas signup" value={bf.visitsSignup} sub={`${days}d`} />
          <KpiTile label="Altas" value={bf.evSignup} sub={`${days}d · evento`} />
          <KpiTile label="Verificados" value={bf.evVerified} sub={`${days}d · evento`} />
          <KpiTile label="Contactos" value={bf.evContact} sub={`${days}d · a DJs`} />
          <KpiTile label="Convocatorias" value={bf.evGig} sub={`${days}d · creadas`} />
        </div>
      </GlassPanel>

      {/* Esta semana / ventana */}
      <GlassPanel>
        <div className="mb-3">
          <MonoLabel>Movimiento ({days} días)</MonoLabel>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile label="DJs nuevos" value={p.newDjs} />
          <KpiTile label="Completaron perfil" value={p.newOnboarded} accent />
          <KpiTile label="Bookers nuevos" value={p.newBookers} />
          <KpiTile label="Solicitudes" value={p.bookings} sub="bookings recibidos" />
          <KpiTile label="Pitches" value={p.pitches} sub="a venues" />
          <KpiTile label="Favoritos" value={p.favorites} sub="guardados" />
          <KpiTile label="RSVPs" value={p.rsvps} sub="de fans a eventos" />
          <KpiTile label="Bookers (total)" value={p.bookers} sub={`${p.publicEvents} eventos públicos`} />
        </div>
      </GlassPanel>
    </div>
  );
}
