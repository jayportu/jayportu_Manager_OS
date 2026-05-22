import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLatestSnapshotsByPlatform } from "@/lib/queries/growth";
import { NewGrowthCampaignForm } from "./new-growth-form";

export default async function NuevaGrowthCampaignPage() {
  const snapshots = await getLatestSnapshotsByPlatform();
  const baselines: Record<string, number> = {};
  for (const [platform, snap] of Object.entries(snapshots)) {
    if (snap?.followers) baselines[platform] = snap.followers;
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <Link
        href="/growth/campanas"
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Campañas
      </Link>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
        Nueva campaña de Growth
      </h1>
      <p className="text-sm text-fg-muted mb-7">
        Define objetivo, plataformas y plazo. Después vas registrando los
        posts que publicas para hacer tracking.
      </p>
      <NewGrowthCampaignForm baselines={baselines} />
    </div>
  );
}
