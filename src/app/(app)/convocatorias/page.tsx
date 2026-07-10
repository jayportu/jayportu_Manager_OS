import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { listOpenGigs, listMyApplications } from "@/lib/queries/convocatorias";
import { Discover } from "./discover";
import { Ticket } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConvocatoriasPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");
  const [gigs, myApps] = await Promise.all([
    listOpenGigs({ city: profile.city ?? "" }),
    listMyApplications(),
  ]);
  const appliedGigIds = myApps.map((a) => a.open_gig_id);

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Ticket className="w-6 h-6 text-accent" />
          Convocatorias
        </h1>
        <p className="text-sm text-fg-muted mt-1 max-w-xl">
          Fechas abiertas que publican venues y productoras. Postula con tu press kit en un clic.
        </p>
      </div>
      <Discover
        initialGigs={gigs}
        appliedGigIds={appliedGigIds}
        defaultCity={profile.city ?? ""}
      />
    </div>
  );
}
