import { redirect } from "next/navigation";
import Link from "next/link";
import { getMyBookerAccount } from "@/lib/queries/booker";
import { listMyGigs } from "@/lib/queries/convocatorias";
import { PublishGigForm } from "./publish-form";

export const dynamic = "force-dynamic";

export default async function BookerConvocatoriasPage() {
  const booker = await getMyBookerAccount();
  if (!booker) redirect("/login?next=/booker/convocatorias");
  const gigs = await listMyGigs();

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Convocatorias</h1>
        <p className="text-sm text-fg-muted mt-1">
          Publica una fecha abierta y recibe postulaciones de DJs.
        </p>
      </div>

      {booker.verified_at ? (
        <PublishGigForm defaultCity={booker.city} defaultCountry={booker.country} />
      ) : (
        <div className="border-2 border-dashed border-border p-6 text-sm text-fg-muted">
          Tu cuenta debe estar <b>verificada</b> para publicar convocatorias. Te
          avisaremos cuando esté lista.
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-xs uppercase tracking-widest text-fg-muted font-semibold">
          Mis convocatorias
        </h2>
        {gigs.length === 0 ? (
          <p className="text-sm text-fg-muted">Aún no publicas ninguna.</p>
        ) : (
          gigs.map((g) => (
            <Link
              key={g.id}
              href={`/booker/convocatorias/${g.id}`}
              className="block border-2 border-border p-3 hover:border-accent"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{g.title}</span>
                <span className="text-[11px] font-mono uppercase tracking-wider text-fg-muted">
                  {g.status === "open" ? "abierta" : "cerrada"} · {g.application_count} postulante(s)
                </span>
              </div>
              <div className="text-xs text-fg-muted mt-1">
                {[g.city, g.genre, g.event_date].filter(Boolean).join(" · ")}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
