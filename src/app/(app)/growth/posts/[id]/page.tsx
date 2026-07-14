import { getContentPost, listGrowthCampaigns } from "@/lib/queries/growth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionHero } from "@/components/hos";
import { PostForm } from "../post-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: PageProps) {
  const { id } = await params;
  const [post, campaigns] = await Promise.all([
    getContentPost(id),
    listGrowthCampaigns({ limit: 50 }),
  ]);
  if (!post) notFound();

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <Link
        href="/growth/posts"
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Posts
      </Link>
      <SectionHero kicker="Growth · Contenido" title="Editar post" />
      <PostForm
        initial={post}
        campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
