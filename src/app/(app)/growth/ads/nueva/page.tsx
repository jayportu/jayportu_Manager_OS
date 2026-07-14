import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLatestSnapshotsByPlatform } from "@/lib/queries/growth";
import { SectionHero } from "@/components/hos";
import { NewGrowthCampaignForm } from "./new-growth-form";

interface PageProps {
  searchParams: Promise<{ paid?: string }>;
}

export default async function NuevaGrowthCampaignPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const defaultPaid = sp.paid === "1";
  const snapshots = await getLatestSnapshotsByPlatform();
  const baselines: Record<string, number> = {};
  for (const [platform, snap] of Object.entries(snapshots)) {
    if (snap?.followers) baselines[platform] = snap.followers;
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <Link
        href="/growth/ads"
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Campañas
      </Link>

      <SectionHero
        kicker={`Growth · Nueva campaña · ${defaultPaid ? "Pagada" : "Orgánica"}`}
        title="Registrar campaña"
        sub="Define objetivo, plataformas y plazo. DROP toma snapshot inicial automático para calcular crecimiento."
      />

      <NewGrowthCampaignForm baselines={baselines} defaultPaid={defaultPaid} />
    </div>
  );
}
