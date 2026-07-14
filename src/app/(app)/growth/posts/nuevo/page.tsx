import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listGrowthCampaigns } from "@/lib/queries/growth";
import { SectionHero } from "@/components/hos";
import { PostForm } from "../post-form";

interface PageProps {
  searchParams: Promise<{ campaign?: string }>;
}

export default async function NuevoPostPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const campaigns = await listGrowthCampaigns({ limit: 50 });

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <Link
        href="/growth/posts"
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Posts
      </Link>
      <SectionHero kicker="Growth · Contenido" title="Nuevo post" />
      <PostForm
        campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))}
        defaultCampaignId={sp.campaign}
      />
    </div>
  );
}
