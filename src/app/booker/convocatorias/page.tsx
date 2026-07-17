import { redirect } from "next/navigation";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { getMyBookerAccount } from "@/lib/queries/booker";
import { listMyGigs } from "@/lib/queries/convocatorias";
import { PublishGigForm } from "./publish-form";
import { SectionHero, MonoLabel, Badge, Alert, EmptyState } from "@/components/hos";

export const dynamic = "force-dynamic";

export default async function BookerConvocatoriasPage() {
  const booker = await getMyBookerAccount();
  if (!booker) redirect("/login?next=/booker/convocatorias");
  const gigs = await listMyGigs();

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <SectionHero
        kicker="Booker · Convocatorias"
        title="Convocatorias"
        sub="Publica una fecha abierta y recibe postulaciones de DJs."
      />

      {booker.verified_at ? (
        <PublishGigForm defaultCity={booker.city} defaultCountry={booker.country} />
      ) : (
        <Alert tone="info">
          Tu cuenta está <b>en revisión</b>. Apenas quede verificada te avisamos
          por email y vas a poder publicar convocatorias. Mientras tanto puedes{" "}
          <a href="/booker/buscar" className="text-orange underline hover:no-underline">
            buscar y contactar DJs
          </a>
          .
        </Alert>
      )}

      <div className="space-y-3">
        <MonoLabel className="block">Mis convocatorias</MonoLabel>
        {gigs.length === 0 ? (
          <EmptyState icon={Megaphone} title="Aún no publicas ninguna." />
        ) : (
          gigs.map((g) => (
            <Link
              key={g.id}
              href={`/booker/convocatorias/${g.id}`}
              className="group block hos-glass hos-sweep-card rounded-2xl p-4 transition-colors hover:border-white/30"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-white">{g.title}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <Badge tone={g.status === "open" ? "up" : "neutral"}>
                    {g.status === "open" ? "abierta" : "cerrada"}
                  </Badge>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                    {g.application_count} postulante(s)
                  </span>
                </span>
              </div>
              <div className="text-xs text-white/50 mt-1.5">
                {[g.city, g.genre, g.event_date].filter(Boolean).join(" · ")}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
