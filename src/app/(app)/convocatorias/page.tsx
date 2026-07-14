import { redirect } from "next/navigation";
import Link from "next/link";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { listOpenGigs, listMyApplications } from "@/lib/queries/convocatorias";
import { Discover } from "./discover";
import { ArrowRight } from "lucide-react";
import { SectionHero } from "@/components/hos";
import { Button } from "@/components/ui/button";

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
      <SectionHero
        kicker="Negocio · Convocatorias"
        title="Convocatorias"
        sub="Fechas abiertas que publican venues y productoras. Postula con tu press kit en un clic."
        actions={
          <Button asChild variant="clay" size="sm">
            <Link href="/convocatorias/mis-postulaciones">
              Mis postulaciones
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        }
      />
      <Discover
        initialGigs={gigs}
        appliedGigIds={appliedGigIds}
        defaultCity={profile.city ?? ""}
      />
    </div>
  );
}
