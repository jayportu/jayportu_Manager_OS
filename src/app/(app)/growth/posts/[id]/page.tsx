import { getContentPost, listGrowthCampaigns } from "@/lib/queries/growth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Posts
      </Link>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-7">
        Editar post
      </h1>
      <PostForm
        initial={post}
        campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
