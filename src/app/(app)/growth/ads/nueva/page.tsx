import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLatestSnapshotsByPlatform } from "@/lib/queries/growth";
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
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Campañas
      </Link>

      <div className="border-2 border-border bg-bg-panel p-6 mb-6">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — NUEVA CAMPAÑA · {defaultPaid ? "PAGADA" : "ORGÁNICA"}
        </div>
        <h1 className="font-display text-4xl leading-none mt-2">
          REGISTRAR CAMPAÑA<span className="text-orange">.</span>
        </h1>
        <p className="text-sm text-fg-muted mt-2 max-w-xl">
          Define objetivo, plataformas y plazo. DROP toma snapshot inicial automático
          para calcular crecimiento.
        </p>
      </div>

      <NewGrowthCampaignForm baselines={baselines} defaultPaid={defaultPaid} />
    </div>
  );
}
