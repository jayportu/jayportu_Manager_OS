import { notFound, redirect } from "next/navigation";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { getOpenGig, listMyApplications } from "@/lib/queries/convocatorias";
import { ApplyForm } from "./apply-form";

export const dynamic = "force-dynamic";

export default async function GigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getMyProfile();
  if (!profile) redirect("/login");
  const gig = await getOpenGig(id);
  if (!gig || gig.status !== "open") notFound();
  const already = (await listMyApplications()).some((a) => a.open_gig_id === id);

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">{gig.title}</h1>
      <div className="text-xs text-fg-muted mt-1">
        {[gig.organizer_name, gig.city, gig.genre, gig.event_date].filter(Boolean).join(" · ")}
        {gig.budget_clp ? ` · $${gig.budget_clp.toLocaleString("es-CL")}` : ""}
      </div>
      {gig.description && <p className="text-sm mt-4 whitespace-pre-wrap">{gig.description}</p>}
      <div className="mt-6">
        <ApplyForm gigId={gig.id} alreadyApplied={already} />
      </div>
    </div>
  );
}
