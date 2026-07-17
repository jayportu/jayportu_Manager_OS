import { notFound } from "next/navigation";
import { getMyGig, listApplicationsForGig } from "@/lib/queries/convocatorias";
import { Applicants } from "./applicants";
import { GlassPanel, MonoLabel } from "@/components/hos";

export const dynamic = "force-dynamic";

export default async function GigDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gig = await getMyGig(id);
  if (!gig) notFound();
  const applications = await listApplicationsForGig(id);
  const fecha = gig.event_date
    ? new Date(gig.event_date).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })
    : null;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <GlassPanel>
        <MonoLabel className="block">Convocatoria</MonoLabel>
        <h1 className="mt-1.5 font-display text-3xl md:text-4xl leading-[0.95] tracking-tight text-white">
          {gig.title}
        </h1>
        <div className="text-xs text-white/40 mt-2 font-mono uppercase tracking-wider">
          {[gig.city, gig.genre, fecha, gig.status === "open" ? "abierta" : "cerrada"]
            .filter(Boolean)
            .join(" · ")}
        </div>
        {gig.description && (
          <p className="text-sm mt-3 whitespace-pre-wrap text-white/70">{gig.description}</p>
        )}
      </GlassPanel>
      <Applicants gigId={gig.id} gigStatus={gig.status} initialApplications={applications} />
    </div>
  );
}
