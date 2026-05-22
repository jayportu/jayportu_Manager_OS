import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listGrowthCampaigns } from "@/lib/queries/growth";
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
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Posts
      </Link>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-7">
        Nuevo post
      </h1>
      <PostForm
        campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))}
        defaultCampaignId={sp.campaign}
      />
    </div>
  );
}
