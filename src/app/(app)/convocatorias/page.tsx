import { redirect } from "next/navigation";
import Link from "next/link";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { listOpenGigs, listMyApplications } from "@/lib/queries/convocatorias";
import { Discover } from "./discover";
import { ArrowRight, Ticket } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConvocatoriasPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");
  const [gigs, myApps] = await Promise.all([
    listOpenGigs({}),
    listMyApplications(),
  ]);
  const appliedGigIds = myApps.map((a) => a.open_gig_id);

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Ticket className="w-6 h-6 text-accent" />
            Convocatorias
          </h1>
          <p className="text-sm text-fg-muted mt-1 max-w-xl">
            Fechas abiertas que publican venues y productoras. Postula con tu press kit en un clic.
          </p>
        </div>
        <Link
          href="/convocatorias/mis-postulaciones"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-border font-mono text-[10px] font-bold uppercase tracking-wider hover:border-accent hover:text-accent transition-colors shrink-0"
        >
          Mis postulaciones
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <Discover
        initialGigs={gigs}
        appliedGigIds={appliedGigIds}
        defaultCity={profile.city ?? ""}
      />
    </div>
  );
}
