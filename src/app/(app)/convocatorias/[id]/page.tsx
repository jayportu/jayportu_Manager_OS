import { notFound, redirect } from "next/navigation";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { getOpenGig, listMyApplications } from "@/lib/queries/convocatorias";
import { ApplyForm } from "./apply-form";
import { SectionHero } from "@/components/hos";

export const dynamic = "force-dynamic";

export default async function GigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getMyProfile();
  if (!profile) redirect("/login");
  const gig = await getOpenGig(id);
  if (!gig || gig.status !== "open") notFound();
  const already = (await listMyApplications()).some((a) => a.open_gig_id === id);
  const fecha = gig.event_date
    ? new Date(gig.event_date).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })
    : null;
  const meta =
    [gig.organizer_name, gig.city, gig.genre, fecha].filter(Boolean).join(" · ") +
    (gig.budget_clp ? ` · $${gig.budget_clp.toLocaleString("es-CL")}` : "");

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <SectionHero kicker="Negocio · Convocatoria" title={gig.title} sub={meta} />
      {gig.description && (
        <p className="text-sm whitespace-pre-wrap text-white/70">{gig.description}</p>
      )}
      <div className="mt-6">
        <ApplyForm gigId={gig.id} alreadyApplied={already} />
      </div>
    </div>
  );
}
